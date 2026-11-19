/**
 * AI Bot Player Manager
 * Simulates real-time multiplayer participants for testing, demos, and solo competitions.
 */

const BOT_PROFILES = [
  { name: "PixelPete", avatar: "avatar-1", accuracy: 0.85, speed: "fast", color: "#FF5B89" },
  { name: "NeuralNina", avatar: "avatar-2", accuracy: 0.90, speed: "moderate", color: "#8B5CF6" },
  { name: "CyberSam", avatar: "avatar-3", accuracy: 0.75, speed: "fast", color: "#38E54D" },
  { name: "ByteBlaster", avatar: "avatar-4", accuracy: 0.70, speed: "slow", color: "#FFB800" },
  { name: "AlgoAlice", avatar: "avatar-5", accuracy: 0.95, speed: "fast", color: "#06B6D4" },
  { name: "RouterRex", avatar: "avatar-6", accuracy: 0.65, speed: "moderate", color: "#EC4899" }
];

class BotManager {
  constructor(roomManager) {
    this.roomManager = roomManager;
    this.botTimers = new Map(); // roomId -> array of timeout handles
  }

  addBotsToRoom(roomId, count = 3) {
    const room = this.roomManager.getRoom(roomId);
    if (!room || room.status !== "LOBBY") return [];

    const existingNames = new Set(room.players.map(p => p.name));
    const availableProfiles = BOT_PROFILES.filter(p => !existingNames.has(p.name));
    const toAdd = availableProfiles.slice(0, count);

    const addedBots = [];

    for (const profile of toAdd) {
      const botId = `bot-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const botPlayer = {
        id: botId,
        socketId: botId,
        name: profile.name,
        avatar: profile.avatar,
        isBot: true,
        accuracy: profile.accuracy,
        speed: profile.speed,
        score: 0,
        streak: 0,
        lastAnswer: null,
        lastPointsEarned: 0,
        connected: true,
        color: profile.color
      };

      room.players.push(botPlayer);
      addedBots.push(botPlayer);
    }

    return addedBots;
  }

  removeBotsFromRoom(roomId) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    this.clearRoomBotTimers(roomId);
    room.players = room.players.filter(p => !p.isBot);
  }

  handleQuestionStart(roomId, question, timeLimit) {
    const room = this.roomManager.getRoom(roomId);
    if (!room) return;

    this.clearRoomBotTimers(roomId);
    const timers = [];

    const botPlayers = room.players.filter(p => p.isBot);

    for (const bot of botPlayers) {
      // Determine bot response delay based on speed setting
      let minDelay = 2000;
      let maxDelay = Math.min((timeLimit - 2) * 1000, 12000);

      if (bot.speed === "fast") {
        minDelay = 1500;
        maxDelay = Math.min(timeLimit * 500, 6000);
      } else if (bot.speed === "slow") {
        minDelay = 4000;
        maxDelay = Math.min((timeLimit - 1) * 1000, 14000);
      }

      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;

      const timerId = setTimeout(() => {
        if (!room || room.status !== "QUESTION_ACTIVE") return;

        // Determine if bot answers correctly
        const isCorrect = Math.random() < bot.accuracy;
        let selectedOption = question.correctAnswer;

        if (!isCorrect) {
          const wrongOptions = question.options
            .map((_, idx) => idx)
            .filter(idx => idx !== question.correctAnswer);
          if (wrongOptions.length > 0) {
            selectedOption = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
          }
        }

        // Calculate time remaining when bot answered
        const timeRemaining = Math.max(0.5, (timeLimit * 1000 - delay) / 1000);

        // Submit answer through roomManager
        this.roomManager.submitAnswer(roomId, bot.id, selectedOption, timeRemaining);
      }, delay);

      timers.push(timerId);
    }

    this.botTimers.set(roomId, timers);
  }

  clearRoomBotTimers(roomId) {
    const timers = this.botTimers.get(roomId);
    if (timers) {
      timers.forEach(t => clearTimeout(t));
      this.botTimers.delete(roomId);
    }
  }
}

module.exports = BotManager;
