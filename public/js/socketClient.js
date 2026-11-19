/**
 * Socket.IO Real-Time Client Wrapper
 * Manages WebSocket connection, events, and room synchronization.
 */

class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventListeners = new Map();
  }

  connect(customUrl) {
    if (this.socket && this.socket.connected) return;

    const serverUrl = customUrl || 
                      window.QUIZ_SERVER_URL || 
                      localStorage.getItem('QUIZ_SERVER_URL') || 
                      window.location.origin;

    console.log(`Connecting to Quiz Server at: ${serverUrl}`);

    this.socket = io(serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    this.socket.on('connect', () => {
      this.connected = true;
      console.log('⚡ Connected to Quiz Server with socket id:', this.socket.id);
      this.emitInternal('connect', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.connected = false;
      console.warn('⚠️ Disconnected from Quiz Server:', reason);
      this.emitInternal('disconnect', reason);
    });

    // Pass-through server events to app listeners
    const serverEvents = [
      'room:players_update',
      'room:bots_added',
      'game:starting',
      'question:start',
      'answer:confirmed',
      'question:response_update',
      'question:results',
      'player:question_result',
      'game:leaderboard_view',
      'game:finished',
      'game:kicked',
      'host:disconnected',
      'error'
    ];

    serverEvents.forEach(evt => {
      this.socket.on(evt, (data) => {
        this.emitInternal(evt, data);
      });
    });
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  emitInternal(event, data) {
    const cbs = this.eventListeners.get(event) || [];
    cbs.forEach(cb => {
      try {
        cb(data);
      } catch (err) {
        console.error(`Error in listener for ${event}:`, err);
      }
    });
  }

  emit(event, data, callback) {
    if (!this.socket) this.connect();
    this.socket.emit(event, data, callback);
  }

  // Convenience methods
  registerHost(roomPin, hostSecret) {
    this.emit('host:register', { roomPin, hostSecret });
  }

  joinRoom(roomPin, playerName, avatar, callback) {
    this.emit('player:join', { roomPin, playerName, avatar }, callback);
  }

  startQuiz(roomPin) {
    this.emit('quiz:start', { roomPin });
  }

  submitAnswer(roomPin, playerId, answerIndex, timeRemaining, callback) {
    this.emit('quiz:submit_answer', { roomPin, playerId, answerIndex, timeRemaining }, callback);
  }

  showLeaderboard(roomPin) {
    this.emit('quiz:show_leaderboard', { roomPin });
  }

  nextQuestion(roomPin) {
    this.emit('quiz:next_question', { roomPin });
  }

  addBots(roomPin, count = 3) {
    this.emit('room:add_bots', { roomPin, count });
  }

  removeBots(roomPin) {
    this.emit('room:remove_bots', { roomPin });
  }

  kickPlayer(roomPin, playerId) {
    this.emit('room:kick_player', { roomPin, playerId });
  }
}

const socketClient = new SocketClient();
