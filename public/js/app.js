/**
 * Main Application Controller for CreateMyTest Multiplayer Quiz
 */

class QuizApp {
  constructor() {
    this.role = null; // 'host' or 'player'
    this.roomPin = null;
    this.hostSecret = null;
    this.player = null;
    this.activeQuiz = null;
    this.currentQuestion = null;
    this.timerInterval = null;
    this.timeRemaining = 0;
    this.selectedAnswer = null;
    this.isAnswerLocked = false;
    this.cachedQuizzes = [];
    this.lastLeaderboard = [];
    this.lastPodium = null;

    // Confetti state
    this.confettiCanvas = null;
    this.confettiCtx = null;
    this.confettiParticles = [];
    this.confettiAnimId = null;
  }

  init() {
    console.log("🚀 Initializing CreateMyTest Web App...");
    socketClient.connect();
    this.setupSocketListeners();
    this.renderHeroAvatar();
    this.renderModalAvatarPicker();
    this.loadAvailableQuizzes();
    this.initConfetti();

    // Check URL parameters for direct room join (e.g. ?pin=123456)
    const urlParams = new URLSearchParams(window.location.search);
    const pinParam = urlParams.get('pin');
    if (pinParam && /^[0-9]{6}$/.test(pinParam)) {
      document.getElementById('quickPinInput').value = pinParam;
      document.getElementById('modalPinInput').value = pinParam;
    }

    // Keyboard controls (A/B/C/D or 1/2/3/4 for answering; Space for host advance)
    window.addEventListener('keydown', (e) => {
      // Don't capture when typing in inputs/textareas
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;

      const key = e.key.toLowerCase();
      if (this.role === 'player' && document.getElementById('view-arena').classList.contains('active')) {
        if (key === '1' || key === 'a') this.submitStudentAnswer(0);
        else if (key === '2' || key === 'b') this.submitStudentAnswer(1);
        else if (key === '3' || key === 'c') this.submitStudentAnswer(2);
        else if (key === '4' || key === 'd') this.submitStudentAnswer(3);
      } else if (this.role === 'host') {
        if (key === ' ' || key === 'arrowright') {
          if (document.getElementById('view-results').classList.contains('active')) {
            this.hostShowLeaderboard();
          } else if (document.getElementById('view-leaderboard').classList.contains('active')) {
            this.hostNextQuestion();
          }
        }
      }
    });
  }

  // ======================== VIEW MANAGEMENT ========================

  showView(viewId) {
    document.querySelectorAll('.view-panel').forEach(panel => {
      panel.style.display = 'none';
      panel.classList.remove('active');
    });

    const target = document.getElementById(viewId);
    if (target) {
      target.style.display = 'block';
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  showHome() {
    this.stopConfetti();
    this.showView('view-home');
  }

  scrollToSection(id) {
    this.showView('view-home');
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 50);
  }

  toggleSound() {
    const isMuted = soundManager.toggleMute();
    const btn = document.getElementById('btnSoundToggle');
    if (btn) {
      btn.innerText = isMuted ? '🔇 Sound Off' : '🔊 Sound On';
      btn.classList.toggle('btn-pink', isMuted);
    }
  }

  // ======================== AVATAR & HERO RENDERING ========================

  renderHeroAvatar() {
    const heroContainer = document.getElementById('heroAvatarSvg');
    if (heroContainer) {
      // Cheeky scholar avatar from screenshot
      heroContainer.innerHTML = getAvatarSvg('avatar-1');
    }
  }

  renderModalAvatarPicker() {
    const picker = document.getElementById('modalAvatarPicker');
    if (!picker) return;

    picker.innerHTML = AVATARS.map((av, idx) => `
      <div class="avatar-option ${idx === 0 ? 'selected' : ''}" 
           style="width: 52px; height: 52px; cursor: pointer; border: 3px solid ${idx === 0 ? '#18181B' : 'transparent'}; border-radius: 14px; padding: 2px; transition: transform 0.1s;"
           onclick="app.selectAvatar('${av.id}', this)">
        ${av.svg}
      </div>
    `).join('');
  }

  selectAvatar(avatarId, element) {
    document.getElementById('selectedAvatarId').value = avatarId;
    document.querySelectorAll('#modalAvatarPicker .avatar-option').forEach(el => {
      el.style.borderColor = 'transparent';
      el.style.transform = 'scale(1)';
    });
    if (element) {
      element.style.borderColor = '#18181B';
      element.style.transform = 'scale(1.1)';
    }
    soundManager.playClick();
  }

  // ======================== QUIZZES DATA & HOSTING ========================

  async loadAvailableQuizzes() {
    try {
      const res = await fetch('/api/quizzes');
      const data = await res.json();
      if (data.success && data.quizzes) {
        this.cachedQuizzes = data.quizzes;
        this.renderQuizzesGrid(data.quizzes);
      }
    } catch (err) {
      console.error("Failed to fetch quizzes:", err);
    }
  }

  renderQuizzesGrid(quizzes) {
    const grid = document.getElementById('quizzesGrid');
    if (!grid) return;

    grid.innerHTML = quizzes.map(q => `
      <div class="neo-card quiz-pack-card neo-card-hover">
        <div class="quiz-pack-top">
          <div>
            <span class="badge-tag" style="background:${q.badgeColor || '#FF5B89'}; color:#fff;">
              ${q.category || 'Networking'}
            </span>
            <h3 class="quiz-pack-title">${q.title}</h3>
          </div>
          <span class="badge-tag badge-free">${q.questions ? q.questions.length : 0} Qs</span>
        </div>

        <p style="font-size: 14px; color: var(--text-muted); font-weight: 600; line-height: 1.45;">
          ${q.description || 'Interactive multiplayer challenge.'}
        </p>

        <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
          <span style="font-size: 12px; font-weight: 800; color: #64748B;">
            ⚡ ${q.difficulty || 'Medium'}
          </span>
          <button class="btn btn-pink btn-sm" onclick="app.hostQuizById('${q.id}')">
            Host Game ➔
          </button>
        </div>
      </div>
    `).join('');
  }

  filterOrStartQuizType(type) {
    soundManager.playClick();
    this.openAiModal(type);
  }

  async hostQuizById(quizId) {
    soundManager.playClick();
    try {
      const res = await fetch('/api/rooms/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quizId })
      });
      const data = await res.json();
      if (data.success) {
        this.enterHostLobby(data.roomPin, data.hostSecret, data.quiz);
      } else {
        alert("Failed to create room: " + data.error);
      }
    } catch (err) {
      console.error("Error creating room:", err);
      alert("Error contacting quiz server.");
    }
  }

  async enterHostLobby(roomPin, hostSecret, quiz) {
    this.role = 'host';
    this.roomPin = roomPin;
    this.hostSecret = hostSecret;
    this.activeQuiz = quiz;

    // Register host socket
    socketClient.registerHost(roomPin, hostSecret);

    // Update UI elements
    document.getElementById('hostPinDisplay').innerText = roomPin;
    document.getElementById('hostQuizTitle').innerText = quiz.title;
    document.getElementById('hostJoinUrl').innerText = window.location.origin;

    // Detect LAN IP so mobile phones can connect
    let mobileBaseUrl = window.location.origin;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      try {
        const netRes = await fetch('/api/network-info');
        const netData = await netRes.json();
        if (netData.success && netData.localIp && netData.localIp !== 'localhost') {
          mobileBaseUrl = netData.lanUrl;
        }
      } catch (err) {
        console.warn('Could not fetch network info:', err);
      }
    }

    const hostMobileEl = document.getElementById('hostMobileUrl');
    if (hostMobileEl) {
      hostMobileEl.innerText = mobileBaseUrl;
    }

    // Generate scannable QR Code
    const qrImg = document.getElementById('hostQrCodeImg');
    if (qrImg) {
      const fullJoinUrl = `${mobileBaseUrl}?pin=${roomPin}`;
      qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(fullJoinUrl)}`;
    }

    this.showView('view-host-lobby');
  }

  // ======================== MODALS & AI GENERATOR ========================

  openAiModal(preferredType = 'mixed') {
    soundManager.playClick();
    const modal = document.getElementById('modalAi');
    if (modal) modal.classList.add('active');
    const typeSelect = document.getElementById('aiQuizType');
    if (typeSelect && preferredType) typeSelect.value = preferredType;
  }

  openJoinModal() {
    soundManager.playClick();
    const modal = document.getElementById('modalJoin');
    if (modal) modal.classList.add('active');
  }

  closeModals() {
    soundManager.playClick();
    document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
  }

  loadAiSample(sampleKey) {
    soundManager.playClick();
    const samples = {
      osi: {
        title: "OSI 7-Layer Model Master Quiz",
        text: `The Open Systems Interconnection (OSI) model describes seven distinct layers for network communications. Layer 1 is the Physical layer which transmits raw bits over physical mediums like copper cables and fiber optics. Layer 2 is the Data Link layer which handles framing, MAC physical addressing, and local network switching. Layer 3 is the Network layer where IP operates to route packets across multiple interconnected networks. Layer 4 is the Transport layer where TCP and UDP handle host-to-host process communication, flow control, and segmentation. Layer 5 is the Session layer which maintains dialogues between applications. Layer 6 is the Presentation layer which translates, compresses, and encrypts data formats. Layer 7 is the Application layer which interfaces directly with end-user software protocols like HTTP, DNS, and SSH. Port 80 is used for unencrypted HTTP web traffic. Port 443 is used for encrypted HTTPS secure communications.`
      },
      tcp: {
        title: "TCP 3-Way Handshake & Reliability",
        text: `TCP stands for Transmission Control Protocol and operates as a connection-oriented reliable protocol at Layer 4. The classic TCP Three-Way Handshake begins when a client sends a SYN packet to initialize sequence numbers. The server responds with a SYN-ACK packet acknowledging the client's sequence number and proposing its own. Finally, the client replies with an ACK packet to establish the full-duplex connection. Unlike UDP, TCP implements sliding window flow control and packet retransmission to guarantee in-order delivery. UDP stands for User Datagram Protocol and operates as connectionless and unreliable, making it ideal for low-latency streaming and real-time multiplayer gaming.`
      },
      dns: {
        title: "DNS Architecture & HTTP/3 QUIC",
        text: `DNS stands for Domain Name System and translates human-readable hostnames into numeric IP addresses. Port 53 is used for DNS queries and responses over UDP and TCP. An A record maps a hostname to a 32-bit IPv4 address, while an AAAA record maps to a 128-bit IPv6 address. HTTP/3 is the latest version of the Hypertext Transfer Protocol and operates over the QUIC transport protocol rather than TCP. QUIC runs over UDP and eliminates head-of-line blocking while enabling faster zero-round-trip (0-RTT) connection resumption.`
      }
    };

    const s = samples[sampleKey];
    if (s) {
      document.getElementById('aiQuizTitle').value = s.title;
      document.getElementById('aiQuizText').value = s.text;
    }
  }

  async handleAiGenerate(e) {
    e.preventDefault();
    soundManager.playClick();
    const submitBtn = document.getElementById('btnAiSubmit');
    submitBtn.innerText = 'Analyzing Document...';
    submitBtn.disabled = true;

    const title = document.getElementById('aiQuizTitle').value;
    const text = document.getElementById('aiQuizText').value;
    const difficulty = document.getElementById('aiQuizDifficulty').value;
    const type = document.getElementById('aiQuizType').value;

    try {
      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, text, difficulty, type })
      });
      const data = await res.json();
      if (data.success && data.quiz) {
        this.closeModals();
        // Immediately host the freshly generated quiz!
        await this.hostQuizById(data.quiz.id);
        this.loadAvailableQuizzes(); // refresh list
      } else {
        alert("AI Generation failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("AI Error:", err);
      alert("Failed to connect to AI generation engine.");
    } finally {
      submitBtn.innerText = '✨ Generate & Host Quiz';
      submitBtn.disabled = false;
    }
  }

  // ======================== PLAYER JOIN FLOW ========================

  handleQuickJoin(e) {
    e.preventDefault();
    soundManager.playClick();
    const pin = document.getElementById('quickPinInput').value;
    const name = document.getElementById('quickNameInput').value;
    this.joinGame(pin, name, 'avatar-1');
  }

  handleModalJoin(e) {
    e.preventDefault();
    soundManager.playClick();
    const pin = document.getElementById('modalPinInput').value;
    const name = document.getElementById('modalNameInput').value;
    const avatar = document.getElementById('selectedAvatarId').value;
    this.joinGame(pin, name, avatar);
  }

  setJoinLoadingState(isLoading) {
    const qBtn = document.getElementById('btnQuickJoin');
    const mBtn = document.querySelector('#modalJoin button[type="submit"]');
    if (qBtn) {
      qBtn.disabled = isLoading;
      qBtn.innerText = isLoading ? '⏳ Joining...' : 'Join Game ➔';
    }
    if (mBtn) {
      mBtn.disabled = isLoading;
      mBtn.innerText = isLoading ? '⏳ Joining...' : 'Join Arena ➔';
    }
  }

  async joinGame(pin, playerName, avatar) {
    const cleanPin = String(pin || '').replace(/\D/g, '').trim();
    const cleanName = String(playerName || '').trim();

    if (!cleanPin || cleanPin.length !== 6) {
      alert("Please enter a valid 6-digit Quiz PIN (e.g. 416791).");
      return;
    }

    if (!cleanName) {
      alert("Please enter a nickname to join.");
      return;
    }

    this.setJoinLoadingState(true);

    try {
      // 1. Verify room exists via REST API first (handles fast 404 feedback)
      const res = await fetch(`/api/rooms/${cleanPin}`);
      const data = await res.json();

      if (!data.success) {
        this.setJoinLoadingState(false);
        alert(`❌ ${data.error || 'Quiz room not found!'}\n\nMake sure the host has created the game and check the 6-digit code.`);
        return;
      }

      // 2. Connect and join via Socket.IO
      await socketClient.joinRoom(cleanPin, cleanName, avatar, (joinRes) => {
        this.setJoinLoadingState(false);
        if (joinRes && joinRes.success) {
          this.role = 'player';
          this.roomPin = cleanPin;
          this.player = joinRes.player;

          this.closeModals();

          // Update player lobby UI
          document.getElementById('playerLobbyPinDisplay').innerText = cleanPin;
          document.getElementById('playerLobbyQuizTitle').innerText = joinRes.quizTitle || "Multiplayer Quiz";
          document.getElementById('playerNicknameDisplay').innerText = joinRes.player.name;
          document.getElementById('playerAvatarPreview').innerHTML = getAvatarSvg(joinRes.player.avatar);

          this.showView('view-player-lobby');
        } else {
          alert(joinRes ? joinRes.error : "Failed to join quiz room.");
        }
      });
    } catch (err) {
      console.warn("REST check failed, attempting direct socket join:", err);
      // Fallback direct socket join attempt
      await socketClient.joinRoom(cleanPin, cleanName, avatar, (joinRes) => {
        this.setJoinLoadingState(false);
        if (joinRes && joinRes.success) {
          this.role = 'player';
          this.roomPin = cleanPin;
          this.player = joinRes.player;
          this.closeModals();
          document.getElementById('playerLobbyPinDisplay').innerText = cleanPin;
          document.getElementById('playerLobbyQuizTitle').innerText = joinRes.quizTitle || "Multiplayer Quiz";
          document.getElementById('playerNicknameDisplay').innerText = joinRes.player.name;
          document.getElementById('playerAvatarPreview').innerHTML = getAvatarSvg(joinRes.player.avatar);
          this.showView('view-player-lobby');
        } else {
          alert(joinRes ? joinRes.error : "Unable to reach quiz server. Please check your connection and refresh.");
        }
      });
    }
  }

  copyRoomLink() {
    soundManager.playClick();
    const link = `${window.location.origin}?pin=${this.roomPin}`;
    navigator.clipboard.writeText(link).then(() => {
      alert(`Copied game invite link: ${link}`);
    }).catch(() => {
      prompt("Copy room link:", link);
    });
  }

  leaveRoom() {
    if (confirm("Are you sure you want to exit the current room?")) {
      window.location.reload();
    }
  }

  // ======================== HOST CONTROLS ========================

  addBotsToRoom(count = 3) {
    soundManager.playClick();
    if (!this.roomPin) return;
    socketClient.addBots(this.roomPin, count);
  }

  removeBotsFromRoom() {
    soundManager.playClick();
    if (!this.roomPin) return;
    socketClient.removeBots(this.roomPin);
  }

  hostStartQuiz() {
    soundManager.playClick();
    if (!this.roomPin) return;
    socketClient.startQuiz(this.roomPin);
  }

  hostForceTimeout() {
    soundManager.playClick();
    // Host can advance early if desired
    if (!this.roomPin) return;
    socketClient.emit('quiz:submit_answer', {
      roomPin: this.roomPin,
      playerId: 'host-force-skip',
      answerIndex: -1,
      timeRemaining: 0
    });
  }

  hostShowLeaderboard() {
    soundManager.playClick();
    if (!this.roomPin) return;
    socketClient.showLeaderboard(this.roomPin);
  }

  hostNextQuestion() {
    soundManager.playClick();
    if (!this.roomPin) return;
    socketClient.nextQuestion(this.roomPin);
  }

  // ======================== SOCKET EVENT LISTENERS ========================

  setupSocketListeners() {
    // Player list updated in lobby
    socketClient.on('room:players_update', (data) => {
      this.updateRoster(data.players);
    });

    // Game starting countdown
    socketClient.on('game:starting', (data) => {
      soundManager.playStart();
      this.showStartingCountdown(data.countdownSeconds || 3);
    });

    // Question broadcast (Simultaneous Broadcast!)
    socketClient.on('question:start', (data) => {
      this.handleQuestionStart(data);
    });

    // Answer lock-in confirmation
    socketClient.on('answer:confirmed', (data) => {
      this.handleAnswerConfirmed(data);
    });

    // Real-time response counter
    socketClient.on('question:response_update', (data) => {
      const counter = document.getElementById('arenaResponseCounter');
      if (counter) {
        counter.innerText = `⚡ ${data.totalResponses} / ${data.totalPlayers} Answered`;
      }
    });

    // Question timed out / completed
    socketClient.on('question:results', (data) => {
      this.handleQuestionResults(data);
    });

    // Private result details for student
    socketClient.on('player:question_result', (data) => {
      this.handlePlayerResultDetails(data);
    });

    // Leaderboard view
    socketClient.on('game:leaderboard_view', (data) => {
      this.handleLeaderboardView(data);
    });

    // Quiz completed / final podium
    socketClient.on('game:finished', (data) => {
      this.handleGameFinished(data);
    });

    // Player kicked
    socketClient.on('game:kicked', (data) => {
      alert(data.message || "You were removed from the room.");
      window.location.reload();
    });

    // Error
    socketClient.on('error', (err) => {
      alert(err.message || "An error occurred.");
    });
  }

  // Update lobby player chips
  updateRoster(players) {
    const roster = document.getElementById('rosterList');
    const badge = document.getElementById('playerCountBadge');
    if (badge) badge.innerText = `${players.length} Joined`;

    if (!roster) return;
    if (players.length === 0) {
      roster.innerHTML = `
        <div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-muted); font-weight: 700;">
          No students joined yet. Share the PIN or click "Add 3 Bots"!
        </div>
      `;
      return;
    }

    roster.innerHTML = players.map(p => `
      <div class="roster-player-chip">
        <div class="player-chip-avatar">${getAvatarSvg(p.avatar)}</div>
        <div class="player-chip-name" title="${p.name}">${p.name}</div>
        ${p.isBot ? `<span class="bot-tag">AI BOT</span>` : ''}
        ${this.role === 'host' ? `
          <button onclick="socketClient.kickPlayer('${this.roomPin}', '${p.id}')" 
                  style="border:none; background:none; color:#EF4444; font-size:11px; cursor:pointer; font-weight:800;" title="Kick player">
            ✕ Kick
          </button>
        ` : ''}
      </div>
    `).join('');
  }

  // Starting 3-second countdown
  showStartingCountdown(seconds) {
    let count = seconds;
    const overlay = document.createElement('div');
    overlay.id = 'countdownOverlay';
    overlay.style.cssText = `
      position: fixed; inset: 0; background: rgba(24, 24, 27, 0.85);
      backdrop-filter: blur(8px); z-index: 9999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      color: #fff; font-family: 'Space Grotesk', sans-serif;
    `;
    overlay.innerHTML = `
      <div style="font-size: 24px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; color: #FDE047;">Get Ready!</div>
      <div id="countdownNumber" style="font-size: 110px; font-weight: 900; margin: 20px 0; text-shadow: 4px 4px 0 #FF5B89;">${count}</div>
      <div style="font-size: 18px; font-weight: 700;">Broadcast starting simultaneously...</div>
    `;
    document.body.appendChild(overlay);

    const intId = setInterval(() => {
      count--;
      soundManager.playTick();
      const numEl = document.getElementById('countdownNumber');
      if (numEl) numEl.innerText = count > 0 ? count : 'GO!';

      if (count <= 0) {
        clearInterval(intId);
        setTimeout(() => {
          overlay.remove();
        }, 500);
      }
    }, 1000);
  }

  // ======================== QUESTION BROADCASTING & TIMEOUT ========================

  handleQuestionStart(data) {
    this.currentQuestion = data;
    this.selectedAnswer = null;
    this.isAnswerLocked = false;
    soundManager.playClick();

    // Show arena view
    this.showView('view-arena');

    // Update progress badges
    document.getElementById('arenaQuestionProgress').innerText = `Question ${data.questionIndex + 1} / ${data.totalQuestions}`;
    document.getElementById('arenaQuestionTypeBadge').innerText = data.type ? data.type.toUpperCase() : 'MULTIPLE CHOICE';
    document.getElementById('arenaQuestionTypeBadge').style.backgroundColor = data.badgeColor || '#FF5B89';
    document.getElementById('arenaResponseCounter').innerText = `⚡ 0 Answered`;

    // Render Question Text
    document.getElementById('arenaQuestionText').innerText = data.question;

    // Toggle Host-only controls
    const hostControls = document.getElementById('hostArenaControls');
    if (hostControls) {
      hostControls.style.display = this.role === 'host' ? 'flex' : 'none';
    }

    // Render Options
    const grid = document.getElementById('arenaOptionsGrid');
    const letters = ['A', 'B', 'C', 'D'];

    grid.innerHTML = data.options.map((opt, idx) => `
      <button class="option-btn" id="optionBtn-${idx}" onclick="app.submitStudentAnswer(${idx})" ${this.role === 'host' ? 'disabled' : ''}>
        <div class="option-key key-${idx}">${letters[idx]}</div>
        <div class="option-label">${opt}</div>
      </button>
    `).join('');

    // Start synchronized timer
    this.startSynchronizedTimer(data.deadline, data.timeLimit);
  }

  startSynchronizedTimer(deadline, totalSeconds) {
    if (this.timerInterval) clearInterval(this.timerInterval);

    const bar = document.getElementById('timerBarFill');
    const clock = document.getElementById('timerClock');

    const update = () => {
      const now = Date.now();
      const diffMs = Math.max(0, deadline - now);
      const remainingSeconds = Math.ceil(diffMs / 1000);
      this.timeRemaining = diffMs / 1000;

      if (clock) clock.innerText = remainingSeconds;

      const pct = Math.max(0, Math.min(100, (diffMs / (totalSeconds * 1000)) * 100));
      if (bar) {
        bar.style.width = `${pct}%`;
        bar.classList.toggle('warning', pct < 50 && pct >= 25);
        bar.classList.toggle('danger', pct < 25);
      }

      // Audio tick under 5 seconds
      if (remainingSeconds <= 5 && remainingSeconds > 0 && Math.floor(diffMs) % 1000 < 100) {
        soundManager.playTick();
      }

      if (diffMs <= 0) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
        if (clock) clock.innerText = '0';
        if (bar) bar.style.width = '0%';
        this.lockAllOptions();
      }
    };

    update();
    this.timerInterval = setInterval(update, 100);
  }

  submitStudentAnswer(answerIndex) {
    if (this.role !== 'player' || this.isAnswerLocked) return;

    this.selectedAnswer = answerIndex;
    this.isAnswerLocked = true;
    soundManager.playClick();

    // Visual selection
    const btn = document.getElementById(`optionBtn-${answerIndex}`);
    if (btn) btn.classList.add('selected');

    this.lockAllOptions();

    // Emit to server
    socketClient.submitAnswer(this.roomPin, this.player.id, answerIndex, this.timeRemaining);
  }

  handleAnswerConfirmed(data) {
    const btn = document.getElementById(`optionBtn-${data.answerIndex}`);
    if (btn) {
      btn.style.boxShadow = '3px 3px 0 #000';
    }
  }

  lockAllOptions() {
    document.querySelectorAll('.option-btn').forEach(btn => {
      btn.disabled = true;
    });
  }

  // ======================== RESULTS & DISTRIBUTION ========================

  handleQuestionResults(data) {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.showView('view-results');
    document.getElementById('resultsQuestionHeadline').innerText = `Correct: "${data.correctAnswerText}"`;
    document.getElementById('explanationText').innerText = data.explanation || "No explanation provided for this question.";

    // Host results buttons
    const hostControls = document.getElementById('hostResultsControls');
    if (hostControls) {
      hostControls.style.display = this.role === 'host' ? 'flex' : 'none';
    }

    // Render distribution chart
    const distContainer = document.getElementById('distributionBars');
    const letters = ['A', 'B', 'C', 'D'];
    const barColors = ['var(--opt-a)', 'var(--opt-b)', 'var(--opt-c)', 'var(--opt-d)'];
    const totalAnswered = Math.max(1, data.totalAnswered || 1);

    if (distContainer) {
      distContainer.innerHTML = [0, 1, 2, 3].map(idx => {
        const count = data.distribution[idx] || 0;
        const heightPct = Math.max(8, Math.round((count / totalAnswered) * 100));
        const isCorrect = idx === data.correctAnswer;

        return `
          <div class="dist-bar-col">
            <span class="dist-count">${count}</span>
            <div class="dist-bar" style="height: ${heightPct}%; background-color: ${barColors[idx]}; border-color: ${isCorrect ? '#15803D' : '#18181B'};"></div>
            <div style="font-weight: 900; font-size: 14px; display:flex; align-items:center; gap:4px;">
              <span>${letters[idx]}</span>
              ${isCorrect ? `<span style="color:#15803D;">✓</span>` : ''}
            </div>
          </div>
        `;
      }).join('');
    }

    this.lastLeaderboard = data.leaderboard || [];
  }

  handlePlayerResultDetails(data) {
    const box = document.getElementById('studentPersonalFeedback');
    if (!box) return;

    box.style.display = 'block';

    if (data.isCorrect) {
      soundManager.playCorrect();
      box.style.backgroundColor = '#DCFCE7';
      box.style.borderColor = '#15803D';
      box.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:26px;">🎉</span>
            <div>
              <strong style="color:#15803D; font-size:18px;">Brilliant! Correct Answer</strong>
              <div style="font-size:13px; font-weight:700; color:#166534;">+${data.pointsEarned} Points • Streak: ${data.streak} 🔥</div>
            </div>
          </div>
          <div style="font-weight:900; font-size:16px; color:#15803D;">
            Rank #${data.currentRank} ${data.rankChange > 0 ? `(▲ +${data.rankChange})` : ''}
          </div>
        </div>
      `;
    } else {
      soundManager.playWrong();
      box.style.backgroundColor = '#FFE4E6';
      box.style.borderColor = '#E11D48';
      box.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:10px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:26px;">❌</span>
            <div>
              <strong style="color:#BE123C; font-size:18px;">Incorrect</strong>
              <div style="font-size:13px; font-weight:700; color:#9F1239;">0 Points this round • Keep going!</div>
            </div>
          </div>
          <div style="font-weight:900; font-size:16px; color:#BE123C;">
            Rank #${data.currentRank}
          </div>
        </div>
      `;
    }
  }

  // ======================== LEADERBOARD ========================

  handleLeaderboardView(data) {
    soundManager.playClick();
    this.showView('view-leaderboard');

    const hostControls = document.getElementById('hostLeaderboardControls');
    if (hostControls) {
      hostControls.style.display = this.role === 'host' ? 'flex' : 'none';
    }

    const nextBtn = document.getElementById('btnLeaderboardNext');
    if (nextBtn) {
      nextBtn.innerText = data.isLastQuestion ? '🏆 View Final Podium' : 'Next Question ➔';
    }

    const list = document.getElementById('leaderboardItems');
    if (!list) return;

    list.innerHTML = data.leaderboard.map(p => `
      <div class="leaderboard-item rank-${p.rank <= 3 ? p.rank : 'other'}">
        <div class="rank-badge">${p.rank}</div>
        <div class="player-info-cell">
          <div class="player-avatar-small">${getAvatarSvg(p.avatar)}</div>
          <div>
            <div style="font-weight: 900; font-size: 16px;">${p.name} ${p.isBot ? '🤖' : ''}</div>
            ${p.streak > 1 ? `<span class="streak-pill">🔥 ${p.streak} Streak</span>` : ''}
          </div>
        </div>
        <div class="player-score-cell">${p.score.toLocaleString()} pts</div>
      </div>
    `).join('');
  }

  // ======================== FINAL PODIUM & CELEBRATION ========================

  handleGameFinished(data) {
    this.lastPodium = data;
    soundManager.playVictory();
    this.startConfetti();
    this.showView('view-podium');

    document.getElementById('podiumQuizTitle').innerText = data.quizTitle || "Quiz Champions";

    const podiumContainer = document.getElementById('podiumDisplay');
    const { first, second, third } = data.podium;

    podiumContainer.innerHTML = `
      <!-- 2nd Place -->
      <div class="podium-slot place-2">
        ${second ? `
          <div style="width: 58px; height: 58px;">${getAvatarSvg(second.avatar)}</div>
          <div style="font-size: 14px; font-weight: 800;">${second.name}</div>
          <div style="font-size: 12px; font-weight: 700; color: var(--text-muted);">${second.score.toLocaleString()} pts</div>
        ` : '<div style="font-size:12px; font-weight:700;">-</div>'}
        <div class="podium-pillar">2</div>
      </div>

      <!-- 1st Place (Winner) -->
      <div class="podium-slot place-1">
        <div style="font-size: 28px;">👑</div>
        ${first ? `
          <div style="width: 72px; height: 72px;">${getAvatarSvg(first.avatar)}</div>
          <div style="font-size: 16px; font-weight: 900; color: #18181B;">${first.name}</div>
          <div style="font-size: 13px; font-weight: 800; color: #854D0E;">${first.score.toLocaleString()} pts</div>
        ` : '<div style="font-size:12px; font-weight:700;">-</div>'}
        <div class="podium-pillar">1</div>
      </div>

      <!-- 3rd Place -->
      <div class="podium-slot place-3">
        ${third ? `
          <div style="width: 52px; height: 52px;">${getAvatarSvg(third.avatar)}</div>
          <div style="font-size: 13px; font-weight: 800;">${third.name}</div>
          <div style="font-size: 11px; font-weight: 700; color: var(--text-muted);">${third.score.toLocaleString()} pts</div>
        ` : '<div style="font-size:12px; font-weight:700;">-</div>'}
        <div class="podium-pillar">3</div>
      </div>
    `;

    // Render full standings table
    const standingsList = document.getElementById('finalStandingsList');
    if (standingsList) {
      standingsList.innerHTML = data.standings.map(p => `
        <div class="leaderboard-item rank-${p.rank <= 3 ? p.rank : 'other'}">
          <div class="rank-badge">${p.rank}</div>
          <div class="player-info-cell">
            <div class="player-avatar-small">${getAvatarSvg(p.avatar)}</div>
            <div>
              <div style="font-weight: 900; font-size: 15px;">${p.name} ${p.isBot ? '🤖' : ''}</div>
              <div style="font-size: 12px; color: var(--text-muted); font-weight: 700;">Highest Streak: ${p.highestStreak}</div>
            </div>
          </div>
          <div class="player-score-cell">${p.score.toLocaleString()} pts</div>
        </div>
      `).join('');
    }
  }

  exportQuizSummary() {
    soundManager.playClick();
    if (!this.lastPodium || !this.lastPodium.standings) {
      alert("No quiz results available to export.");
      return;
    }

    let csv = "Rank,Player Name,Score,Highest Streak,Type\n";
    this.lastPodium.standings.forEach(s => {
      csv += `"${s.rank}","${s.name}","${s.score}","${s.highestStreak}","${s.isBot ? 'Bot' : 'Student'}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `quiz-results-${this.roomPin || 'session'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // ======================== CONFETTI ENGINE ========================

  initConfetti() {
    this.confettiCanvas = document.getElementById('confettiCanvas');
    if (!this.confettiCanvas) return;
    this.confettiCtx = this.confettiCanvas.getContext('2d');

    window.addEventListener('resize', () => {
      if (this.confettiCanvas) {
        this.confettiCanvas.width = window.innerWidth;
        this.confettiCanvas.height = window.innerHeight;
      }
    });
    this.confettiCanvas.width = window.innerWidth;
    this.confettiCanvas.height = window.innerHeight;
  }

  startConfetti() {
    if (!this.confettiCanvas || !this.confettiCtx) return;
    this.confettiParticles = [];
    const colors = ['#FF5B89', '#FFD13B', '#38E54D', '#8B5CF6', '#38BDF8', '#FB923C'];

    for (let i = 0; i < 140; i++) {
      this.confettiParticles.push({
        x: Math.random() * this.confettiCanvas.width,
        y: Math.random() * -this.confettiCanvas.height,
        r: Math.random() * 8 + 4,
        d: Math.random() * 10 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        tilt: Math.floor(Math.random() * 10) - 10,
        tiltAngle: 0,
        tiltAngleIncremental: (Math.random() * 0.07) + 0.05
      });
    }

    const render = () => {
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);

      for (let i = 0; i < this.confettiParticles.length; i++) {
        const p = this.confettiParticles[i];
        p.tiltAngle += p.tiltAngleIncremental;
        p.y += (Math.cos(p.d) + 3 + p.r / 2) / 2;
        p.tilt = Math.sin(p.tiltAngle - (i / 3)) * 15;

        if (p.y > this.confettiCanvas.height) {
          p.x = Math.random() * this.confettiCanvas.width;
          p.y = -20;
        }

        this.confettiCtx.beginPath();
        this.confettiCtx.lineWidth = p.r / 2;
        this.confettiCtx.strokeStyle = p.color;
        this.confettiCtx.moveTo(p.x + p.tilt + (p.r / 4), p.y);
        this.confettiCtx.lineTo(p.x + p.tilt, p.y + p.tilt + (p.r / 4));
        this.confettiCtx.stroke();
      }

      this.confettiAnimId = requestAnimationFrame(render);
    };

    if (this.confettiAnimId) cancelAnimationFrame(this.confettiAnimId);
    render();
  }

  stopConfetti() {
    if (this.confettiAnimId) {
      cancelAnimationFrame(this.confettiAnimId);
      this.confettiAnimId = null;
    }
    if (this.confettiCtx && this.confettiCanvas) {
      this.confettiCtx.clearRect(0, 0, this.confettiCanvas.width, this.confettiCanvas.height);
    }
  }
}

// Instantiate and attach globally
const app = new QuizApp();
window.addEventListener('DOMContentLoaded', () => {
  app.init();
});
