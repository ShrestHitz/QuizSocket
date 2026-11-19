/**
 * Real-Time Multiplayer Quiz Room Manager
 * Handles room lifecycle, synchronized timers, response aggregation, and live scoring.
 */

const BotManager = require('./BotManager');

class RoomManager {
  constructor(io) {
    this.io = io;
    this.rooms = new Map(); // roomId -> Room object
    this.botManager = new BotManager(this);
  }

  // Generate unique 6-digit room PIN
  generateRoomPin() {
    let pin;
    let attempts = 0;
    do {
      pin = Math.floor(100000 + Math.random() * 900000).toString();
      attempts++;
    } while (this.rooms.has(pin) && attempts < 100);
    return pin;
  }

  createRoom(quiz, hostSocketId, hostSecret) {
    const pin = this.generateRoomPin();
    const room = {
      id: pin,
      hostSocketId: hostSocketId,
      hostSecret: hostSecret || Math.random().toString(36).substring(2, 10),
      quiz: {
        id: quiz.id || "custom-quiz",
        title: quiz.title || "Multiplayer Networking Quiz",
        category: quiz.category || "General",
        description: quiz.description || "",
        questions: quiz.questions || []
      },
      status: "LOBBY", // LOBBY, STARTING, QUESTION_ACTIVE, QUESTION_RESULTS, LEADERBOARD, FINISHED
      currentQuestionIndex: -1,
      players: [],
      responses: {}, // playerId -> { answerIndex, isCorrect, pointsEarned, timeRemaining }
      questionTimer: null,
      questionDeadline: null,
      questionStartTime: null,
      previousRankings: new Map(), // playerId -> previous rank
      createdAt: Date.now()
    };

    this.rooms.set(pin, room);
    return room;
  }

  getRoom(roomId) {
    if (!roomId) return null;
    const cleanId = String(roomId).replace(/\D/g, '').trim();
    return this.rooms.get(cleanId);
  }

  joinRoom(roomId, playerName, avatar, socketId) {
    const cleanId = String(roomId || '').replace(/\D/g, '').trim();
    const room = this.rooms.get(cleanId);
    if (!room) {
      return { success: false, error: "Quiz room not found. Check the 6-digit PIN!" };
    }

    if (room.status === "FINISHED") {
      return { success: false, error: "This quiz session has already completed." };
    }

    // Check if player already exists by socketId or name (allow reconnect)
    let player = room.players.find(p => p.socketId === socketId || p.name.toLowerCase() === playerName.toLowerCase().trim());

    if (player) {
      // Reconnecting player
      player.socketId = socketId;
      player.connected = true;
      if (avatar) player.avatar = avatar;
    } else {
      // New player
      const cleanName = playerName.trim().substring(0, 18) || "Player";
      player = {
        id: `player-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        socketId: socketId,
        name: cleanName,
        avatar: avatar || "avatar-1",
        score: 0,
        streak: 0,
        highestStreak: 0,
        lastAnswer: null,
        lastPointsEarned: 0,
        isBot: false,
        connected: true,
        joinedAt: Date.now()
      };
      room.players.push(player);
    }

    // Notify room of updated player list
    this.broadcastPlayerList(roomId);

    return {
      success: true,
      roomPin: roomId,
      player: player,
      quizTitle: room.quiz.title,
      roomStatus: room.status,
      currentQuestionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length
    };
  }

  broadcastPlayerList(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    const playerList = room.players.map(p => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      score: p.score,
      streak: p.streak,
      isBot: p.isBot,
      connected: p.connected
    }));

    this.io.to(roomId).emit("room:players_update", {
      players: playerList,
      totalPlayers: playerList.length,
      roomStatus: room.status
    });
  }

  addBots(roomId, count = 3) {
    const room = this.rooms.get(roomId);
    if (!room) return [];

    const bots = this.botManager.addBotsToRoom(roomId, count);
    this.broadcastPlayerList(roomId);
    return bots;
  }

  removeBots(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    this.botManager.removeBotsFromRoom(roomId);
    this.broadcastPlayerList(roomId);
  }

  kickPlayer(roomId, playerId, hostSocketId) {
    const room = this.rooms.get(roomId);
    if (!room || room.hostSocketId !== hostSocketId) return false;

    const playerIndex = room.players.findIndex(p => p.id === playerId);
    if (playerIndex !== -1) {
      const player = room.players[playerIndex];
      room.players.splice(playerIndex, 1);
      
      // Notify the kicked player if connected
      if (player.socketId) {
        this.io.to(player.socketId).emit("game:kicked", { message: "You were removed from the quiz by the host." });
      }

      this.broadcastPlayerList(roomId);
      return true;
    }
    return false;
  }

  startQuiz(roomId, hostSocketId) {
    const room = this.rooms.get(roomId);
    if (!room || room.hostSocketId !== hostSocketId) {
      return { success: false, error: "Unauthorized or invalid room." };
    }

    if (room.players.length === 0) {
      return { success: false, error: "Cannot start quiz with 0 players! Add some players or bots." };
    }

    room.status = "STARTING";
    room.currentQuestionIndex = -1;

    // Snapshot initial rankings
    this.updateRankings(room);

    // Broadcast countdown to all participants
    this.io.to(roomId).emit("game:starting", {
      countdownSeconds: 3,
      totalQuestions: room.quiz.questions.length,
      quizTitle: room.quiz.title
    });

    // Schedule question 1 after 3-second countdown
    setTimeout(() => {
      this.broadcastNextQuestion(roomId);
    }, 3200);

    return { success: true };
  }

  broadcastNextQuestion(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    // Clear any previous timer
    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }

    room.currentQuestionIndex++;

    // Check if we reached the end of the quiz
    if (room.currentQuestionIndex >= room.quiz.questions.length) {
      this.finishQuiz(roomId);
      return;
    }

    const question = room.quiz.questions[room.currentQuestionIndex];
    room.status = "QUESTION_ACTIVE";
    room.responses = {};

    // Reset round-specific player fields
    for (const player of room.players) {
      player.lastAnswer = null;
      player.lastPointsEarned = 0;
    }

    const timeLimit = question.timeLimit || 20;
    const now = Date.now();
    room.questionStartTime = now;
    room.questionDeadline = now + timeLimit * 1000;

    // Public payload sent to players (omits correctAnswer for integrity)
    const publicQuestion = {
      questionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length,
      id: question.id,
      type: question.type || "multiple-choice",
      question: question.question,
      options: question.options,
      timeLimit: timeLimit,
      deadline: room.questionDeadline,
      badgeColor: question.badgeColor || room.quiz.badgeColor || "#FF5B89"
    };

    // Broadcast to room
    this.io.to(roomId).emit("question:start", publicQuestion);

    // Also trigger bots if any
    this.botManager.handleQuestionStart(roomId, question, timeLimit);

    // Set server-authoritative timer for timeout management
    room.questionTimer = setTimeout(() => {
      this.onQuestionTimeout(roomId);
    }, (timeLimit * 1000) + 300); // 300ms buffer for network transit
  }

  submitAnswer(roomId, playerId, answerIndex, clientTimeRemaining) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "QUESTION_ACTIVE") {
      return { success: false, error: "Question is not currently active." };
    }

    const player = room.players.find(p => p.id === playerId || p.socketId === playerId);
    if (!player) {
      return { success: false, error: "Player not found." };
    }

    // Prevent duplicate responses
    if (room.responses[player.id]) {
      return { success: false, error: "Answer already submitted for this question." };
    }

    const question = room.quiz.questions[room.currentQuestionIndex];
    const now = Date.now();

    // Calculate authoritative server time remaining
    const serverTimeRemaining = Math.max(0, (room.questionDeadline - now) / 1000);
    const timeUsed = (now - room.questionStartTime) / 1000;

    const isCorrect = answerIndex === question.correctAnswer;
    let pointsEarned = 0;

    if (isCorrect) {
      const basePoints = 1000;
      // Speed factor: scale up to +500 points for answering instantly
      const speedBonus = Math.round(500 * Math.max(0, serverTimeRemaining / question.timeLimit));
      // Streak bonus: +50 per existing streak, capped at +250
      const streakBonus = Math.min(250, player.streak * 50);

      pointsEarned = basePoints + speedBonus + streakBonus;
      player.streak++;
      if (player.streak > player.highestStreak) {
        player.highestStreak = player.streak;
      }
    } else {
      player.streak = 0;
    }

    player.score += pointsEarned;
    player.lastAnswer = answerIndex;
    player.lastPointsEarned = pointsEarned;

    // Record response
    room.responses[player.id] = {
      playerId: player.id,
      playerName: player.name,
      answerIndex: answerIndex,
      isCorrect: isCorrect,
      pointsEarned: pointsEarned,
      timeRemaining: serverTimeRemaining,
      timeUsed: timeUsed,
      submittedAt: now
    };

    // Send instant confirmation to player socket if human
    if (!player.isBot && player.socketId) {
      this.io.to(player.socketId).emit("answer:confirmed", {
        answerIndex: answerIndex,
        isLockedIn: true
      });
    }

    // Broadcast response stats to host / room
    const totalResponses = Object.keys(room.responses).length;
    const activePlayersCount = room.players.filter(p => p.connected).length;

    this.io.to(roomId).emit("question:response_update", {
      totalResponses: totalResponses,
      totalPlayers: activePlayersCount,
      latestPlayerName: player.name
    });

    // If ALL connected players have submitted, immediately conclude the question
    if (totalResponses >= activePlayersCount && activePlayersCount > 0) {
      if (room.questionTimer) {
        clearTimeout(room.questionTimer);
        room.questionTimer = null;
      }
      // Small 400ms pause so the UI displays completion smoothly
      setTimeout(() => {
        this.onQuestionTimeout(roomId);
      }, 400);
    }

    return { success: true };
  }

  onQuestionTimeout(roomId) {
    const room = this.rooms.get(roomId);
    if (!room || room.status !== "QUESTION_ACTIVE") return;

    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }

    room.status = "QUESTION_RESULTS";
    const question = room.quiz.questions[room.currentQuestionIndex];

    // Compute answer distribution stats
    const distribution = {};
    question.options.forEach((_, idx) => {
      distribution[idx] = 0;
    });

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    for (const player of room.players) {
      const resp = room.responses[player.id];
      if (resp) {
        if (distribution[resp.answerIndex] !== undefined) {
          distribution[resp.answerIndex]++;
        }
        if (resp.isCorrect) correctCount++;
        else incorrectCount++;
      } else {
        unansweredCount++;
        player.streak = 0;
        player.lastPointsEarned = 0;
      }
    }

    // Calculate leaderboard & rank changes
    const previousRanks = new Map(this.getCurrentRankings(room));
    this.updateRankings(room);
    const currentRanks = this.getCurrentRankings(room);

    const leaderboard = room.players
      .map(p => {
        const prevRank = previousRanks.get(p.id) || room.players.length;
        const currRank = currentRanks.get(p.id) || 1;
        const rankChange = prevRank - currRank; // positive means moved up!

        return {
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          streak: p.streak,
          lastPointsEarned: p.lastPointsEarned,
          rank: currRank,
          rankChange: rankChange, // +1, 0, -2 etc.
          isBot: p.isBot
        };
      })
      .sort((a, b) => b.score - a.score);

    // Broadcast results to all participants
    this.io.to(roomId).emit("question:results", {
      questionIndex: room.currentQuestionIndex,
      correctAnswer: question.correctAnswer,
      correctAnswerText: question.options[question.correctAnswer],
      explanation: question.explanation || "",
      distribution: distribution,
      totalAnswered: Object.keys(room.responses).length,
      totalPlayers: room.players.length,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      unansweredCount: unansweredCount,
      leaderboard: leaderboard.slice(0, 10), // Top 10
      isLastQuestion: room.currentQuestionIndex >= room.quiz.questions.length - 1
    });

    // Send private result details to each player
    for (const player of room.players) {
      if (player.socketId && !player.isBot) {
        const resp = room.responses[player.id];
        const playerRank = currentRanks.get(player.id) || 1;
        const prevRank = previousRanks.get(player.id) || playerRank;

        this.io.to(player.socketId).emit("player:question_result", {
          answered: !!resp,
          selectedAnswer: resp ? resp.answerIndex : null,
          isCorrect: resp ? resp.isCorrect : false,
          pointsEarned: player.lastPointsEarned,
          newScore: player.score,
          streak: player.streak,
          currentRank: playerRank,
          rankChange: prevRank - playerRank
        });
      }
    }
  }

  showLeaderboard(roomId, hostSocketId) {
    const room = this.rooms.get(roomId);
    if (!room || (hostSocketId && room.hostSocketId !== hostSocketId)) {
      return { success: false, error: "Unauthorized" };
    }

    room.status = "LEADERBOARD";
    const currentRanks = this.getCurrentRankings(room);

    const leaderboard = room.players
      .map(p => ({
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        streak: p.streak,
        highestStreak: p.highestStreak,
        rank: currentRanks.get(p.id) || 1,
        isBot: p.isBot
      }))
      .sort((a, b) => b.score - a.score);

    this.io.to(roomId).emit("game:leaderboard_view", {
      questionIndex: room.currentQuestionIndex,
      totalQuestions: room.quiz.questions.length,
      leaderboard: leaderboard,
      isLastQuestion: room.currentQuestionIndex >= room.quiz.questions.length - 1
    });

    return { success: true };
  }

  nextQuestion(roomId, hostSocketId) {
    const room = this.rooms.get(roomId);
    if (!room || (hostSocketId && room.hostSocketId !== hostSocketId)) {
      return { success: false, error: "Unauthorized" };
    }

    if (room.currentQuestionIndex >= room.quiz.questions.length - 1) {
      this.finishQuiz(roomId);
    } else {
      this.broadcastNextQuestion(roomId);
    }

    return { success: true };
  }

  finishQuiz(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.status = "FINISHED";
    if (room.questionTimer) {
      clearTimeout(room.questionTimer);
      room.questionTimer = null;
    }
    this.botManager.clearRoomBotTimers(roomId);

    // Final sorted standings
    const standings = [...room.players]
      .sort((a, b) => b.score - a.score)
      .map((p, index) => ({
        rank: index + 1,
        id: p.id,
        name: p.name,
        avatar: p.avatar,
        score: p.score,
        highestStreak: p.highestStreak || p.streak,
        isBot: p.isBot
      }));

    const podium = {
      first: standings[0] || null,
      second: standings[1] || null,
      third: standings[2] || null
    };

    this.io.to(roomId).emit("game:finished", {
      podium: podium,
      standings: standings,
      totalQuestions: room.quiz.questions.length,
      quizTitle: room.quiz.title
    });
  }

  updateRankings(room) {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const map = new Map();
    sorted.forEach((p, idx) => map.set(p.id, idx + 1));
    room.previousRankings = map;
  }

  getCurrentRankings(room) {
    const sorted = [...room.players].sort((a, b) => b.score - a.score);
    const map = new Map();
    sorted.forEach((p, idx) => map.set(p.id, idx + 1));
    return map;
  }

  handleDisconnect(socketId) {
    for (const [roomId, room] of this.rooms.entries()) {
      // Check if it's the host
      if (room.hostSocketId === socketId) {
        // Host disconnected
        this.io.to(roomId).emit("host:disconnected", {
          message: "The host temporarily disconnected. The room will stay open for reconnection."
        });
      }

      // Check if it's a player
      const player = room.players.find(p => p.socketId === socketId);
      if (player) {
        player.connected = false;
        this.broadcastPlayerList(roomId);
        break;
      }
    }
  }
}

module.exports = RoomManager;
