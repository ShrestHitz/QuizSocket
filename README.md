# CreateMyTest — Real-Time Multiplayer Online Quiz Arena ⚡

A real-time multiplayer quiz web application inspired by retro-modern neo-brutalist aesthetics (bold dark borders, solid offset drop shadows, playful color accents, and cartoon avatar styling).

Built with **Node.js**, **Express**, **Socket.IO**, and **HTML5/CSS3/Web Audio API**.

---

## 🌟 Key Features

1. **Simultaneous Question Broadcasting**
   - Server-authoritative synchronization across all connected student devices and teacher/projector screens.
   - Questions are delivered to all connected sockets at the exact same millisecond.
   - Question payload conceals correct answers client-side to prevent network inspection or tampering.

2. **Real-Time Response Collection & Auto-Advance**
   - Student answers are collected with microsecond timestamps.
   - Host sees live real-time answer counter: `⚡ X / Total Answered`.
   - **Fast-forward auto-advance**: If all active students submit before the timer runs out, the server automatically advances to the results screen without forcing anyone to wait.

3. **Synchronized Timeout Management**
   - Server-side authoritative timer countdown with graceful network latency tolerance.
   - Synchronized visual timer bar transitioning from Green ➔ Yellow ➔ Red.
   - Ticking sound effects under 5 seconds.
   - Unanswered players are safely registered with 0 points when the deadline expires.

4. **Dynamic Live Scoring & Leaderboard**
   - **Speed bonus**: Faster answers score more points (`1000 base + up to 500 speed bonus`).
   - **Streak bonus**: Consecutive correct answers multiply points with a fire streak indicator (`🔥 3 Streak!`).
   - Live rank tracking showing positive or negative rank shifts (`▲ +2 positions`).
   - Detailed answer distribution bar chart showing how many students chose each option (A, B, C, D).
   - Educational explanations provided after each round.

5. **AI Document-to-Quiz Generator (Hero Feature)**
   - Convert notes, lecture slides, protocol summaries, or text into a playable quiz with 1 click.
   - Built-in study note samples:
     - *OSI 7-Layer Model Master Quiz*
     - *TCP 3-Way Handshake & Flow Control*
     - *DNS Architecture & HTTP/3 QUIC*

6. **Instant Bot Player Simulation 🤖**
   - Host can click **"Add 3 Bots"** in the lobby to immediately simulate realistic multiplayer competition (varying response speeds, realistic mistakes, dynamic scores) without needing multiple physical devices!

7. **Full Neo-Brutalist Design System**
   - Thick 3px black borders, hard offset drop shadows (`box-shadow: 4px 4px 0px #18181B`).
   - Tilted badges (`Free`, `AI Powered`, `100% Real-Time`).
   - Playful custom SVG cartoon avatars matching the reference artwork.
   - 4 distinct "Kind of Quizzes" cards: *Multiple Choice*, *Fill in the blank*, *Matching*, and *True/False*.

8. **Web Audio Synthesizer & Confetti Celebration**
   - Pure Web Audio API synthesized sound effects: click, countdown tick, correct chime, wrong buzzer, game fanfare, and winner celebration.
   - 60fps HTML5 Canvas confetti on the 1st, 2nd, 3rd place champion podium.
   - Results export to CSV for grading and class analytics.

---

## 🚀 How to Run

The server is already running on port 3000!

To start manually at any time:
```bash
npm start
```
Open your browser at:
```
http://localhost:3000
```

---

## 🎮 How to Play / Demo

### Method A: Single-Screen Quick Test with AI Bots
1. Open [http://localhost:3000](http://localhost:3000).
2. Choose any quiz (e.g. *Computer Networking Fundamentals*) and click **"Host Game ➔"**.
3. In the host lobby, click **"🤖 Add 3 Bots"**.
4. Click **"🚀 Start Game Now"**.
5. Watch the synchronized countdown, live responses from bots, real-time distribution charts, animated leaderboard, and final podium!

### Method B: True Multiplayer (Multiple Tabs or Devices on LAN)
1. **Host**: Open [http://localhost:3000](http://localhost:3000) and click **"Host Game"** on any quiz. Note the 6-digit Room PIN (e.g. `482910`).
2. **Student(s)**:
   - In another browser tab, private window, or phone on the same Wi-Fi (`http://<your-local-ip>:3000`), enter the 6-digit PIN and choose a nickname & avatar.
   - Click **"Join Game"**.
3. **Host**: Click **"Start Game Now"**.
4. Both Host and Students experience simultaneous synchronized broadcasting, live buzz-in feedback, real-time rank shifts, and celebrations!
