const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const RoomManager = require('./src/game/RoomManager');
const defaultQuizzes = require('./src/data/defaultQuizzes');
const { generateQuizFromText } = require('./src/ai/quizGenerator');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory custom quizzes storage
const customQuizzes = [];

// Initialize RoomManager
const roomManager = new RoomManager(io);

// ======================== REST API ROUTES ========================

// Get all available quizzes (curated + custom)
app.get('/api/quizzes', (req, res) => {
  res.json({
    success: true,
    quizzes: [...defaultQuizzes, ...customQuizzes]
  });
});

// AI Document to Quiz Converter
app.post('/api/quizzes/generate', (req, res) => {
  try {
    const { text, title, difficulty, type } = req.body;
    if (!text || text.trim().length < 15) {
      return res.status(400).json({
        success: false,
        error: "Please provide sufficient text (at least 15 characters) to generate questions."
      });
    }

    const generatedQuiz = generateQuizFromText(text, { title, difficulty, type });
    customQuizzes.unshift(generatedQuiz);

    res.json({
      success: true,
      quiz: generatedQuiz
    });
  } catch (err) {
    console.error("AI Generation error:", err);
    res.status(500).json({ success: false, error: "Failed to parse document: " + err.message });
  }
});

// Create custom quiz manually
app.post('/api/quizzes', (req, res) => {
  try {
    const { title, category, description, questions } = req.body;
    if (!title || !questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Invalid quiz format. Title and at least one question are required."
      });
    }

    const newQuiz = {
      id: "custom-" + Date.now().toString(36),
      title: title.trim(),
      category: category || "Custom",
      description: description || "User created quiz",
      difficulty: "Custom",
      badgeColor: "#FF5B89",
      createdAt: new Date().toISOString(),
      questions: questions
    };

    customQuizzes.unshift(newQuiz);
    res.json({ success: true, quiz: newQuiz });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Create a new multiplayer room
app.post('/api/rooms/create', (req, res) => {
  try {
    const { quizId, customQuizData } = req.body;
    let quizToUse = null;

    if (customQuizData) {
      quizToUse = customQuizData;
    } else if (quizId) {
      quizToUse = [...defaultQuizzes, ...customQuizzes].find(q => q.id === quizId);
    }

    if (!quizToUse) {
      quizToUse = defaultQuizzes[0]; // fallback
    }

    const room = roomManager.createRoom(quizToUse, null, null);

    res.json({
      success: true,
      roomPin: room.id,
      hostSecret: room.hostSecret,
      quiz: room.quiz
    });
  } catch (err) {
    console.error("Room creation error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Check room info by PIN
app.get('/api/rooms/:pin', (req, res) => {
  const room = roomManager.getRoom(req.params.pin);
  if (!room) {
    return res.status(404).json({ success: false, error: "Quiz room not found" });
  }

  res.json({
    success: true,
    roomPin: room.id,
    title: room.quiz.title,
    status: room.status,
    totalPlayers: room.players.length,
    totalQuestions: room.quiz.questions.length
  });
});

// REST endpoint to pre-verify room join
app.post('/api/rooms/join', (req, res) => {
  const { roomPin } = req.body;
  const room = roomManager.getRoom(roomPin);
  if (!room) {
    return res.status(404).json({ success: false, error: "Quiz room not found. Check the 6-digit PIN!" });
  }
  if (room.status === "FINISHED") {
    return res.status(400).json({ success: false, error: "This quiz session has already completed." });
  }

  res.json({
    success: true,
    roomPin: room.id,
    title: room.quiz.title,
    status: room.status,
    totalPlayers: room.players.length
  });
});

// Get local network LAN IP so mobile phones can connect
app.get('/api/network-info', (req, res) => {
  const os = require('os');
  const ifaces = os.networkInterfaces();
  let candidateIp = 'localhost';

  for (const name in ifaces) {
    for (const d of ifaces[name]) {
      if (d.family === 'IPv4' && !d.internal) {
        // Prioritize Wi-Fi or WLAN
        if (name.toLowerCase().includes('wi-fi') || name.toLowerCase().includes('wireless') || name.toLowerCase().includes('wlan')) {
          candidateIp = d.address;
          break;
        } else if (candidateIp === 'localhost') {
          if (!name.toLowerCase().includes('vethernet') && !name.toLowerCase().includes('virtual')) {
            candidateIp = d.address;
          }
        }
      }
    }
  }

  res.json({
    success: true,
    localIp: candidateIp,
    port: PORT,
    lanUrl: `http://${candidateIp}:${PORT}`
  });
});

// Catch-all route to serve the SPA
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ======================== SOCKET.IO REAL-TIME ========================

io.on('connection', (socket) => {
  // Host connects to manage a room
  socket.on('host:register', ({ roomPin, hostSecret }) => {
    const room = roomManager.getRoom(roomPin);
    if (!room) {
      socket.emit('error', { message: 'Room not found' });
      return;
    }

    // Set host socket
    room.hostSocketId = socket.id;
    socket.join(roomPin);
    socket.emit('host:registered', {
      roomPin: roomPin,
      quiz: room.quiz,
      status: room.status,
      players: room.players
    });

    roomManager.broadcastPlayerList(roomPin);
  });

  // Player joins room
  socket.on('player:join', ({ roomPin, playerName, avatar }, callback) => {
    const result = roomManager.joinRoom(roomPin, playerName, avatar, socket.id);
    if (!result.success) {
      if (typeof callback === 'function') callback(result);
      socket.emit('player:join_failed', result);
      return;
    }

    socket.join(roomPin);
    if (typeof callback === 'function') callback(result);
    socket.emit('player:joined', result);
  });

  // Host adds bots
  socket.on('room:add_bots', ({ roomPin, count }) => {
    const bots = roomManager.addBots(roomPin, count || 3);
    socket.emit('room:bots_added', { count: bots.length });
  });

  // Host removes bots
  socket.on('room:remove_bots', ({ roomPin }) => {
    roomManager.removeBots(roomPin);
  });

  // Host kicks a player
  socket.on('room:kick_player', ({ roomPin, playerId }) => {
    roomManager.kickPlayer(roomPin, playerId, socket.id);
  });

  // Host starts the quiz
  socket.on('quiz:start', ({ roomPin }) => {
    const result = roomManager.startQuiz(roomPin, socket.id);
    if (!result.success) {
      socket.emit('error', { message: result.error });
    }
  });

  // Student submits an answer
  socket.on('quiz:submit_answer', ({ roomPin, playerId, answerIndex, timeRemaining }, callback) => {
    let pin = roomPin;
    if (!pin) {
      for (const [rPin, r] of roomManager.rooms.entries()) {
        if (r.players.some(p => p.socketId === socket.id || p.id === playerId)) {
          pin = rPin;
          break;
        }
      }
    }
    const result = roomManager.submitAnswer(pin, playerId || socket.id, answerIndex, timeRemaining);
    if (typeof callback === 'function') callback(result);
  });

  // Host opens leaderboard view
  socket.on('quiz:show_leaderboard', ({ roomPin }) => {
    roomManager.showLeaderboard(roomPin, socket.id);
  });

  // Host advances to next question
  socket.on('quiz:next_question', ({ roomPin }) => {
    roomManager.nextQuestion(roomPin, socket.id);
  });

  // Disconnect handler
  socket.on('disconnect', () => {
    roomManager.handleDisconnect(socket.id);
  });
});

// Start server if not running in a serverless function handler
if (!process.env.VERCEL) {
  server.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Multiplayer Quiz Server running at http://localhost:${PORT}`);
    console.log(`📡 WebSocket Engine active & listening`);
    console.log(`=================================================`);
  });
}

// Export for Vercel / serverless deployments
module.exports = app;
module.exports.server = server;
