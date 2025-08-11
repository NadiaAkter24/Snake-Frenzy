document.addEventListener('DOMContentLoaded', () => {
  const startBtn = document.getElementById('start-btn');
  const welcomeScreen = document.getElementById('welcome-screen');
  const gameContainer = document.getElementById('game-container');
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');

  const gameMessage = document.getElementById('game-message');
  const finalMessage = document.getElementById('final-message');
  const tryAgainBtn = document.getElementById('try-again-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const homeBtn = document.getElementById('home-btn');
 const gameoverSound = document.getElementById('gameover-sound');

  // Music toggle buttons
  const musicToggleWelcome = document.getElementById('music-toggle-btn');
  const musicToggleGame = document.getElementById('music-toggle-btn-game');

  const gridSize = 20;
  const tileCount = canvas.width / gridSize;

  let snake = [];
  let velocity = { x: 0, y: 0 };
  let food = { x: 0, y: 0 };

  let score = 0;
  let speed = 5;
  let timeLeft = 60;

  let lastTime = 0;
  let foodTimer = 0;

  let timerInterval = null;
  let animationFrameId = null;

  let isPaused = false;
  let musicOn = true; // music starts ON by default

  // Load audio
  const bgMusic = document.getElementById('bg-music');
  const eatSound = document.getElementById('eat-sound');

  // Start background music immediately
  bgMusic.volume = 0.5;
  bgMusic.play().catch(() => {});

  // Load high score from localStorage or 0 if none
  let highScore = parseInt(localStorage.getItem('highScore')) || 0;
  const highScoreDisplay = document.getElementById('high-score');
  highScoreDisplay.textContent = 'High Score: ' + highScore;

  function spawnFood() {
    food.x = Math.floor(Math.random() * tileCount);
    food.y = Math.floor(Math.random() * tileCount);
    while (snake.some(s => s.x === food.x && s.y === food.y)) {
      food.x = Math.floor(Math.random() * tileCount);
      food.y = Math.floor(Math.random() * tileCount);
    }
  }

  // Helper to draw rounded rectangles
  function drawRoundedRect(x, y, width, height, radius) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  let animationShift = 0; // for smooth shading animation
  let animationTime = 0;  // for apple pulsing animation

  // Draw animated apple instead of static image
  function drawApple(x, y, size, t) {
    ctx.save();
    ctx.translate(x + size / 2, y + size / 2);

    // Pulsing scale between 0.9 and 1.1 based on time
    const scale = 1 + 0.1 * Math.sin(t * 4);
    ctx.scale(scale, scale);

    // Draw apple body (red circle)
    ctx.beginPath();
    ctx.fillStyle = '#d22'; // red
    ctx.shadowColor = 'rgba(255, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
    ctx.fill();

    // Draw apple highlight (white ellipse)
    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.ellipse(-size * 0.1, -size * 0.1, size * 0.15, size * 0.25, Math.PI / 4, 0, Math.PI * 2);
    ctx.fill();

    // Draw stem (brown rectangle)
    ctx.beginPath();
    ctx.fillStyle = '#6b3';
    ctx.fillRect(-size * 0.05, -size * 0.45, size * 0.1, size * 0.15);

    ctx.restore();
  }

  function draw() {
    // Clear canvas
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    animationShift += 0.01;
    if (animationShift > 1) animationShift = 0;

    // Draw snake segments with gradient and animation
    snake.forEach((segment, index) => {
      const x = segment.x * gridSize;
      const y = segment.y * gridSize;

      const shift = Math.sin(animationShift * Math.PI * 2 + index) * 0.2;

      const gradient = ctx.createLinearGradient(
        x + gridSize * shift,
        y + gridSize * shift,
        x + gridSize * (1 - shift),
        y + gridSize * (1 - shift)
      );
      gradient.addColorStop(0, '#32CD32'); // lime green
      gradient.addColorStop(1, '#006400'); // dark green

      ctx.fillStyle = gradient;
      ctx.strokeStyle = '#004d00'; // dark green border
      ctx.lineWidth = 2;

      drawRoundedRect(x, y, gridSize, gridSize, 5);

      // Draw eyes on the head segment
      if (index === 0) {
        const eyeRadius = 3;
        const eyeOffsetX = 5;
        const eyeOffsetY = 6;

        // Left eye white
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Left pupil
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.arc(x + eyeOffsetX, y + eyeOffsetY, eyeRadius / 2, 0, Math.PI * 2);
        ctx.fill();

        // Right eye white
        ctx.beginPath();
        ctx.fillStyle = 'white';
        ctx.arc(x + gridSize - eyeOffsetX, y + eyeOffsetY, eyeRadius, 0, Math.PI * 2);
        ctx.fill();

        // Right pupil
        ctx.beginPath();
        ctx.fillStyle = 'black';
        ctx.arc(x + gridSize - eyeOffsetX, y + eyeOffsetY, eyeRadius / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw animated apple
    drawApple(food.x * gridSize, food.y * gridSize, gridSize, animationTime);
    animationTime += 0.05;  // Increase time for animation
  }

  function update() {
    const head = { x: snake[0].x + velocity.x, y: snake[0].y + velocity.y };

    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) {
      gameOver('You hit the wall!');
      return false;
    }

    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
      gameOver('You bit yourself!');
      return false;
    }

    snake.unshift(head);

    if (head.x === food.x && head.y === food.y) {
      score++;
      document.getElementById('score').textContent = 'Score: ' + score;

      // Check and update high score
      if (score > highScore) {
        highScore = score;
        localStorage.setItem('highScore', highScore);
        highScoreDisplay.textContent = 'High Score: ' + highScore;
      }

      speed += 0.5;
      spawnFood();
      foodTimer = 0;
      if (musicOn) {
        eatSound.currentTime = 0;
        eatSound.play();
      }
    } else {
      snake.pop();
    }

    return true;
  }

  function gameOver(message) {
    cancelAnimationFrame(animationFrameId);
    clearInterval(timerInterval);
    finalMessage.textContent = `${message} Game Over! Your score: ${score}`;
    gameMessage.style.display = 'block';
    tryAgainBtn.focus();
    bgMusic.pause();
    bgMusic.currentTime = 0;
  }

  function gameLoop(currentTime = 0) {
    animationFrameId = window.requestAnimationFrame(gameLoop);
    if (isPaused) return;

    if (!lastTime) lastTime = currentTime;
    const delta = (currentTime - lastTime) / 1000;
    if (delta < 1 / speed) return;

    lastTime = currentTime;
    foodTimer += delta;
    if (foodTimer >= 5) {
      spawnFood();
      foodTimer = 0;
    }

    if (!update()) return;
    draw();
  }

  function startGame() {
    snake = [{ x: 10, y: 10 }];
    velocity = { x: 1, y: 0 };
    score = 0;
    speed = 5;
    timeLeft = 60;
    lastTime = 0;
    foodTimer = 0;
    document.getElementById('score').textContent = 'Score: 0';
    document.getElementById('timer').textContent = 'Time Left: 60';
    spawnFood();

    welcomeScreen.style.display = 'none';
    gameContainer.style.display = 'block';
    gameMessage.style.display = 'none';

    isPaused = false;
    pauseBtn.textContent = 'Pause';

    timerInterval = setInterval(() => {
      if (!isPaused) {
        timeLeft--;
        document.getElementById('timer').textContent = 'Time Left: ' + timeLeft;
        if (timeLeft <= 0) {
          gameOver('Time is up!');
        }
      }
    }, 1000);

    if (musicOn) {
      bgMusic.currentTime = 0;
      bgMusic.play().catch(() => {});
    }

    window.requestAnimationFrame(gameLoop);
  }

  // Movement controls
  window.addEventListener('keydown', e => {
    switch (e.key) {
      case 'ArrowUp':
        if (velocity.y === 1) break;
        velocity = { x: 0, y: -1 };
        break;
      case 'ArrowDown':
        if (velocity.y === -1) break;
        velocity = { x: 0, y: 1 };
        break;
      case 'ArrowLeft':
        if (velocity.x === 1) break;
        velocity = { x: -1, y: 0 };
        break;
      case 'ArrowRight':
        if (velocity.x === -1) break;
        velocity = { x: 1, y: 0 };
        break;
    }
  });

  // Pause / Resume button
  pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
    if (musicOn) {
      if (isPaused) bgMusic.pause();
      else bgMusic.play().catch(() => {});
    }
  });

  // Home button
  homeBtn.addEventListener('click', () => {
    cancelAnimationFrame(animationFrameId);
    clearInterval(timerInterval);
    gameContainer.style.display = 'none';
    welcomeScreen.style.display = 'flex';
    isPaused = false;
    pauseBtn.textContent = 'Pause';
    gameMessage.style.display = 'none';
    bgMusic.pause();
    bgMusic.currentTime = 0;
  });

  // Try again button
  tryAgainBtn.addEventListener('click', () => {
    gameMessage.style.display = 'none';
    startGame();
  });

  // Start button
  startBtn.addEventListener('click', () => {
    startGame();
  });

  // Music toggle function
  function toggleMusic(button) {
    musicOn = !musicOn;
    button.textContent = `Music: ${musicOn ? 'On' : 'Off'}`;
    musicToggleWelcome.textContent = `Music: ${musicOn ? 'On' : 'Off'}`;
    musicToggleGame.textContent = `Music: ${musicOn ? 'On' : 'Off'}`;

    if (musicOn) {
      bgMusic.play().catch(() => {});
    } else {
      bgMusic.pause();
    }
  }

  musicToggleWelcome.addEventListener('click', () => toggleMusic(musicToggleWelcome));
  musicToggleGame.addEventListener('click', () => toggleMusic(musicToggleGame));
});
