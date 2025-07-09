let score = 0;
let lives = 3;
let level = 1;
const MAX_LEVEL = 5; // Maximum level limit
let bullets = [], enemies = [], enemyBullets = [], powerUps = [];
let gameInterval, enemySpawnInterval, powerUpInterval;
let hasDoubleShot = false;
let hasSpeedBoost = false;
let leaderboard = [];
let enemyShootIntervals = []; // Track enemy shooting intervals

// DOM elements
const gameContainer = document.getElementById('game-container');
const ship = document.getElementById('ship');
const scoreDisplay = document.getElementById('score');
const livesDisplay = document.getElementById('lives');
const levelDisplay = document.getElementById('level');
const walletDisplay = document.getElementById('wallet');
const startScreen = document.getElementById('start-screen');
const endScreen = document.getElementById('end-screen');
const connectWalletButton = document.getElementById('connect-wallet');
const switchNetworkButton = document.getElementById('switch-network');
const networkStatusText = document.getElementById('network-status');
const startButton = document.getElementById('start-button');
const restartButton = document.getElementById('restart-button');
const redeemButton = document.getElementById('redeem-button');
const shareScoreButton = document.getElementById('share-score');
const finalScore = document.getElementById('final-score');
const leaderboardList = document.getElementById('leaderboard-list');
const shootSound = null;
const explosionSound = null;
const powerupSound = null;
const nicknameInput = document.getElementById('nickname-input');
const globalTabButton = document.getElementById('global-tab');
const myScoresTabButton = document.getElementById('my-scores-tab');
const myBestScore = document.getElementById('my-best-score');
const bestScoreValue = document.getElementById('best-score-value');

// Load highest score from localStorage
let highScore = parseInt(localStorage.getItem('highScore') || '0');

// Load nickname from localStorage - check on page load
window.playerNickname = localStorage.getItem('playerNickname') || "";
if (window.playerNickname && nicknameInput) {
  nicknameInput.value = window.playerNickname;
}

// Show highest score on page load
if (bestScoreValue) {
  bestScoreValue.textContent = highScore;
}

// Prevent sound errors by sound functions
function playSoundSafely(audioElement) {
  // Disable sound, do nothing
  return;
}

// Nickname functions
nicknameInput.addEventListener('input', function() {
  // Assign entered nickname to global variable
  window.playerNickname = this.value;
  // Save nickname to localStorage
  if (this.value.trim() !== "") {
    localStorage.setItem('playerNickname', this.value);
  }
});

// Global leaderboard data
let globalLeaderboard = [];
let myScores = [];

// Tab functions
globalTabButton.addEventListener('click', function() {
  globalTabButton.classList.add('active');
  myScoresTabButton.classList.remove('active');
  myBestScore.style.display = 'none';
  displayGlobalLeaderboard();
});

myScoresTabButton.addEventListener('click', function() {
  myScoresTabButton.classList.add('active');
  globalTabButton.classList.remove('active');
  myBestScore.style.display = 'block';
  displayMyScores();
});

// Display global leaderboard
function displayGlobalLeaderboard() {
  updateLeaderboardUI(globalLeaderboard);
}

// Display user scores
function displayMyScores() {
  // If wallet is not connected, show warning
  if (!window.ethereum || !window.ethereum.selectedAddress) {
    leaderboardList.innerHTML = "<li class='no-scores'>Please connect your wallet to view your scores</li>";
    return;
  }
  
  // Filter scores by user address
  const userAddress = window.ethereum.selectedAddress.toLowerCase();
  const userScores = globalLeaderboard.filter(entry => 
    entry.player && entry.player.toLowerCase() === userAddress
  );
  
  // User's highest score on blockchain
  let blockchainHighScore = 0;
  
  if (userScores.length === 0) {
    leaderboardList.innerHTML = "<li class='no-scores'>You don't have any blockchain scores yet</li>";
  } else {
    // Find the highest score (on blockchain)
    const bestScore = userScores.reduce((max, entry) => 
      parseInt(entry.score) > parseInt(max.score) ? entry : max, userScores[0]
    );
    blockchainHighScore = parseInt(bestScore.score);
    
    // Display scores as a list
    updateLeaderboardUI(userScores);
  }
  
  // Local highest score
  const localHighScore = parseInt(localStorage.getItem('highScore') || '0');
  
  // Display the larger value
  const displayHighScore = Math.max(localHighScore, blockchainHighScore);
  
  // Display highest score
  document.getElementById('best-score-value').textContent = displayHighScore;
}

// Create nickname popup
function createNicknamePopup() {
  // If existing popup exists, remove it
  const existingPopup = document.getElementById('nickname-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
  
  // Create popup
  const popupDiv = document.createElement('div');
  popupDiv.id = 'nickname-popup';
  popupDiv.style.cssText = 'position: fixed; z-index: 1000; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; justify-content: center; align-items: center;';
  
  const popupContent = document.createElement('div');
  popupContent.style.cssText = 'background: #222; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px; width: 90%;';
  
  const title = document.createElement('h2');
  title.textContent = 'Enter Your Nickname';
  title.style.color = '#ffcc00';
  
  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = 'Your nickname (min 3 characters)';
  input.value = window.playerNickname || '';
  input.style.cssText = 'width: 100%; padding: 10px; margin: 20px 0; border-radius: 5px; border: none; background: #333; color: white;';
  
  const button = document.createElement('button');
  button.textContent = 'Save Nickname';
  button.style.cssText = 'background: #0066ff; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;';
  
  popupContent.appendChild(title);
  popupContent.appendChild(input);
  popupContent.appendChild(button);
  popupDiv.appendChild(popupContent);
  document.body.appendChild(popupDiv);
  
  // Focus on input field
  input.focus();
  
  // Button functionality
  button.addEventListener('click', function() {
    const nickname = input.value.trim();
    
    if (nickname.length < 3) {
      alert('Nickname must be at least 3 characters!');
      return;
    }
    
    // Save nickname
    window.playerNickname = nickname;
    localStorage.setItem('playerNickname', nickname);
    
    // Update other input fields
    if (nicknameInput) {
      nicknameInput.value = nickname;
    }
    
    // Remove popup
    popupDiv.remove();
    
    // Enable start button
    startButton.disabled = false;
  });
  
  // Enter key support
  input.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      button.click();
    }
  });
}

// Check nickname on page load
function checkNicknameOnLoad() {
  // If user has previously saved a nickname
  if (window.playerNickname && window.playerNickname.trim() !== "") {
    // Enable start button
    startButton.disabled = false;
    return true;
  }
  
  // If no nickname, show popup
  createNicknamePopup();
  return false;
}

// Start game function
function startGame() {
  // Check nickname
  if (!window.playerNickname || window.playerNickname.trim() === "") {
    createNicknamePopup();
    return;
  }
  
  score = 0;
  lives = 3;
  level = 1;
  hasDoubleShot = false;
  hasSpeedBoost = false;
  updateStats();
  resetGame();
  
  // Set ship's initial position - centered at the bottom
  ship.style.left = '50%';
  ship.style.bottom = '20px';
  ship.style.top = 'auto'; // Clear top property
  
  startScreen.style.display = 'none';
  endScreen.style.display = 'none';
  gameInterval = setInterval(updateGame, 20);
  enemySpawnInterval = setInterval(spawnEnemy, 1500 / level);
  powerUpInterval = setInterval(spawnPowerUp, 10000);
}

// Reset game
function resetGame() {
  bullets.forEach(b => b.remove());
  enemies.forEach(e => e.remove());
  enemyBullets.forEach(b => b.remove());
  powerUps.forEach(p => p.remove());
  bullets = [];
  enemies = [];
  enemyBullets = [];
  powerUps = [];
  
  // Clear all enemy shooting intervals
  enemyShootIntervals.forEach(interval => clearInterval(interval));
  enemyShootIntervals = [];
  
  clearInterval(gameInterval);
  clearInterval(enemySpawnInterval);
  clearInterval(powerUpInterval);
}

// Mobile touch controls
let touchX = null;
gameContainer.addEventListener('touchstart', (event) => {
  touchX = event.touches[0].clientX;
  fireBullet();
});

gameContainer.addEventListener('touchmove', (event) => {
  event.preventDefault();
  const containerRect = gameContainer.getBoundingClientRect();
  const newX = event.touches[0].clientX - containerRect.left;
  // Only horizontal movement, vertical position remains fixed
  ship.style.left = `${Math.min(gameContainer.offsetWidth - 60, Math.max(30, newX))}px`;
});

// Fire bullet with mouse click
gameContainer.addEventListener('click', fireBullet);

// Mouse controls
gameContainer.addEventListener('mousemove', (event) => {
  const containerRect = gameContainer.getBoundingClientRect();
  const mouseX = event.clientX - containerRect.left;
  const speed = hasSpeedBoost ? 1.5 : 1;
  // Only horizontal movement, vertical position remains fixed
  ship.style.left = `${Math.min(gameContainer.offsetWidth - 60, Math.max(30, mouseX))}px`;
  // Bottom position remains fixed
  ship.style.bottom = '20px';
});

// Keyboard controls
document.addEventListener('keydown', function(e) {
  const speed = hasSpeedBoost ? 15 : 10;
  const shipLeft = parseInt(ship.style.left) || parseInt(gameContainer.offsetWidth / 2);
  
  // Horizontal movement with A/D or left/right arrow keys
  if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
    ship.style.left = `${Math.max(0, shipLeft - speed)}px`;
  } else if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
    ship.style.left = `${Math.min(gameContainer.offsetWidth - 60, shipLeft + speed)}px`;
  }
  
  // Fire bullet with spacebar
  if (e.key === ' ') {
    fireBullet();
  }
});

// Fire bullets (upwards)
function fireBullet() {
  // Sound removed
  const shipRect = ship.getBoundingClientRect();
  const containerRect = gameContainer.getBoundingClientRect();
  const shipCenter = shipRect.left - containerRect.left + shipRect.width / 2;
  
  if (hasDoubleShot) {
    for (let offset = -10; offset <= 10; offset += 20) {
      const bullet = document.createElement('div');
      bullet.classList.add('bullet');
      bullet.style.left = `${shipCenter - 2.5}px`; // 2.5 = half of bullet width
      bullet.style.bottom = `${60 + offset}px`; // Start from sides of ship
      gameContainer.appendChild(bullet);
      bullets.push(bullet);
    }
  } else {
    const bullet = document.createElement('div');
    bullet.classList.add('bullet');
    bullet.style.left = `${shipCenter - 2.5}px`; // 2.5 = half of bullet width
    bullet.style.bottom = '60px'; // Start from top of ship
    gameContainer.appendChild(bullet);
    bullets.push(bullet);
  }
}

// Create different enemy types
function createEnemy(type) {
  const enemy = document.createElement('div');
  enemy.classList.add(type);
  
  return enemy;
}

// Spawn enemies (from top)
function spawnEnemy() {
  // If game is not active, do not spawn enemies
  if (!gameInterval) return;
  
  const type = Math.random();
  
  let enemyType;
  if (type < 0.4) {
    enemyType = 'enemy';
  } else if (type < 0.7) {
    enemyType = 'shooting-enemy';
  } else {
    enemyType = 'kamikaze-enemy';
  }
  
  const enemy = createEnemy(enemyType);
  
  // Enemy starts randomly from the top
  enemy.style.top = '-50px'; // Start outside the screen
  enemy.style.left = `${Math.floor(Math.random() * (gameContainer.offsetWidth - 60))}px`;
  
  // Limit enemy speed (minimum 2, maximum 5)
  const baseSpeed = enemyType === 'kamikaze-enemy' ? 3 : 2;
  // Level-based speed increase
  const levelSpeedBonus = Math.min(level, MAX_LEVEL) * 0.4; 
  enemy.speed = baseSpeed + Math.random() * levelSpeedBonus;
  
  // Set upper speed limit
  enemy.speed = Math.min(enemy.speed, 5);
  
  gameContainer.appendChild(enemy);
  enemies.push(enemy);

  if (enemyType === 'shooting-enemy') {
    // Enemy shooting interval - slightly reduce with level, but not too much
    const shootInterval = setInterval(() => {
      // If game is not active or enemy is gone, stop shooting
      if (!gameInterval || !document.body.contains(enemy)) {
        clearInterval(shootInterval);
        // Remove from interval list
        const index = enemyShootIntervals.indexOf(shootInterval);
        if (index > -1) {
          enemyShootIntervals.splice(index, 1);
        }
        return;
      }
      
      fireEnemyBullet(enemy);
    }, Math.max(1000, 2000 - (level * 100))); // Minimum 1000ms, maximum 2000ms
    
    // Add to interval list
    enemyShootIntervals.push(shootInterval);
  }
}

// Enemy bullet firing (downwards)
function fireEnemyBullet(enemy) {
  // If game is not active, do not create bullet
  if (!gameInterval) return;
  
  const bullet = document.createElement('div');
  bullet.classList.add('enemy-bullet');
  
  const enemyRect = enemy.getBoundingClientRect();
  const containerRect = gameContainer.getBoundingClientRect();
  const enemyCenter = enemyRect.left - containerRect.left + enemyRect.width / 2;
  
  bullet.style.left = `${enemyCenter - 2.5}px`; // 2.5 = half of bullet width
  bullet.style.top = `${enemyRect.bottom - containerRect.top}px`; // Start from bottom of enemy
  
  gameContainer.appendChild(bullet);
  enemyBullets.push(bullet);
}

// Power-up spawning
function spawnPowerUp() {
  const type = Math.random();
  if (type < 0.33) spawnHeart();
  else if (type < 0.66) spawnDoubleShot();
  else spawnSpeedBoost();
}

// Heart power-up
function spawnHeart() {
  const heart = document.createElement('div');
  heart.classList.add('heart');
  heart.style.top = '-30px'; // From top of screen
  heart.style.left = `${Math.floor(Math.random() * (gameContainer.offsetWidth - 50))}px`;
  heart.speed = 2;
  gameContainer.appendChild(heart);
  powerUps.push(heart);
}

// Double shot power-up
function spawnDoubleShot() {
  const doubleShot = document.createElement('div');
  doubleShot.classList.add('double-shot');
  doubleShot.style.top = '-30px'; // From top of screen
  doubleShot.style.left = `${Math.floor(Math.random() * (gameContainer.offsetWidth - 50))}px`;
  doubleShot.speed = 2;
  gameContainer.appendChild(doubleShot);
  powerUps.push(doubleShot);
}

// Speed boost power-up
function spawnSpeedBoost() {
  const speedBoost = document.createElement('div');
  speedBoost.classList.add('speed-boost');
  speedBoost.style.top = '-30px'; // From top of screen
  speedBoost.style.left = `${Math.floor(Math.random() * (gameContainer.offsetWidth - 50))}px`;
  speedBoost.speed = 2;
  gameContainer.appendChild(speedBoost);
  powerUps.push(speedBoost);
}

// Activate double shot
function activateDoubleShot() {
  hasDoubleShot = true;
  setTimeout(() => { hasDoubleShot = false; }, 5000);
}

// Activate speed boost
function activateSpeedBoost() {
  hasSpeedBoost = true;
  setTimeout(() => { hasSpeedBoost = false; }, 5000);
}

// Create explosion effect
function createExplosion(x, y) {
  // Sound removed
  gameContainer.classList.add('shake');
  setTimeout(() => gameContainer.classList.remove('shake'), 200);

  for (let i = 0; i < 10; i++) {
    const particle = document.createElement('div');
    particle.classList.add('particle');
    particle.style.left = `${x + Math.random() * 20 - 10}px`;
    particle.style.top = `${y + Math.random() * 20 - 10}px`;
    const angle = Math.random() * 2 * Math.PI;
    particle.style.setProperty('--dx', `${Math.cos(angle) * 50}px`);
    particle.style.setProperty('--dy', `${Math.sin(angle) * 50}px`);
    gameContainer.appendChild(particle);
    setTimeout(() => particle.remove(), 500);
  }
}

// Update game
function updateGame() {
  // Player bullets move upwards
  bullets.forEach((bullet, i) => {
    const bulletBottom = parseInt(bullet.style.bottom || '0') + 10;
    if (bulletBottom > gameContainer.offsetHeight) {
      bullet.remove();
      bullets.splice(i, 1);
    } else {
      bullet.style.bottom = `${bulletBottom}px`;
    }
  });

  // Enemies move downwards
  enemies.forEach((enemy, i) => {
    const enemyTop = parseInt(enemy.style.top || '0') + enemy.speed;
    if (enemyTop > gameContainer.offsetHeight) {
      enemy.remove();
      enemies.splice(i, 1);
      loseLife();
    } else {
      enemy.style.top = `${enemyTop}px`;

      // Bullet-enemy collision
      bullets.forEach((bullet, j) => {
        if (isCollision(bullet, enemy)) {
          createExplosion(parseInt(enemy.style.left), enemyTop);
          bullet.remove();
          enemy.remove();
          bullets.splice(j, 1);
          enemies.splice(i, 1);
          increaseScore();
        }
      });

      // Enemy-player collision
      if (isCollision(ship, enemy)) {
        const shipRect = ship.getBoundingClientRect();
        const containerRect = gameContainer.getBoundingClientRect();
        const shipX = shipRect.left - containerRect.left + shipRect.width / 2;
        
        createExplosion(shipX, gameContainer.offsetHeight - 40);
        enemy.remove();
        enemies.splice(i, 1);
        loseLife();
      }
    }
  });

  // Enemy bullets move downwards
  enemyBullets.forEach((bullet, i) => {
    const bulletTop = parseInt(bullet.style.top || '0') + 5;
    if (bulletTop > gameContainer.offsetHeight) {
      bullet.remove();
      enemyBullets.splice(i, 1);
    } else {
      bullet.style.top = `${bulletTop}px`;
      if (isCollision(bullet, ship)) {
        bullet.remove();
        enemyBullets.splice(i, 1);
        loseLife();
      }
    }
  });

  // Power-ups move downwards
  powerUps.forEach((powerUp, i) => {
    const powerUpTop = parseInt(powerUp.style.top || '0') + powerUp.speed;
    if (powerUpTop > gameContainer.offsetHeight) {
      powerUp.remove();
      powerUps.splice(i, 1);
    } else {
      powerUp.style.top = `${powerUpTop}px`;

      if (isCollision(ship, powerUp)) {
        // Sound removed
        powerUp.remove();
        powerUps.splice(i, 1);

        if (powerUp.classList.contains('heart')) {
          lives = Math.min(lives + 1, 5);
          updateStats();
        } else if (powerUp.classList.contains('double-shot')) {
          activateDoubleShot();
        } else if (powerUp.classList.contains('speed-boost')) {
          activateSpeedBoost();
        }
      }
    }
  });

  if (lives <= 0) endGame();
}

// Collision detection
function isCollision(obj1, obj2) {
  const r1 = obj1.getBoundingClientRect(), r2 = obj2.getBoundingClientRect();
  return !(r1.top > r2.bottom || r1.bottom < r2.top || r1.right < r2.left || r1.left > r2.right);
}

// Increase score
function increaseScore() {
  score += 10;
  // Level up every 100 points, but check for max level
  if (score % 100 === 0 && level < MAX_LEVEL) {
    level++;
    updateEnemySpawnRate();
  }
  updateStats();
}

// Lose life
function loseLife() {
  lives = Math.max(0, lives - 1);
  updateStats();
}

// Update enemy spawn rate
function updateEnemySpawnRate() {
  clearInterval(enemySpawnInterval);
  
  // Level 1: 2000ms, Level 5: 1000ms - more balanced distribution
  const minSpawnRate = 1000; // Minimum spawn time (ms)
  const maxSpawnRate = 2000; // Maximum spawn time (ms)
  
  // level value will be between 1 and MAX_LEVEL
  const normalizedLevel = Math.min(level, MAX_LEVEL);
  
  // Calculate spawn rate, spawn time decreases with level (faster spawn)
  const spawnRate = maxSpawnRate - ((normalizedLevel - 1) / (MAX_LEVEL - 1)) * (maxSpawnRate - minSpawnRate);
  
  console.log(`Level: ${level}, Spawn Rate: ${spawnRate}ms`);
  
  enemySpawnInterval = setInterval(spawnEnemy, spawnRate);
}

// Update statistics
function updateStats() {
  scoreDisplay.textContent = `Score: ${score}`;
  livesDisplay.textContent = `Lives: ${lives}`;
  levelDisplay.textContent = `Level: ${level}`;
}

// Game over
function endGame() {
  clearInterval(gameInterval);
  clearInterval(enemySpawnInterval);
  clearInterval(powerUpInterval);
  
  // Clear enemy shooting intervals
  enemyShootIntervals.forEach(interval => clearInterval(interval));
  enemyShootIntervals = [];
  
  gameInterval = null; // Indicate game is over
  
  // Show final score
  finalScore.textContent = score;
  
  // Update highest score (if new score is higher)
  if (score > highScore) {
    highScore = score;
    localStorage.setItem('highScore', highScore);
    // Update highest score field
    if (bestScoreValue) {
      bestScoreValue.textContent = highScore;
    }
  }
  
  // Assign nickname to input field (if exists)
  if (window.playerNickname) {
    nicknameInput.value = window.playerNickname;
  }
  
  // Enable/disable share score button
  shareScoreButton.disabled = !window.playerNickname;
  
  // Call fetchLeaderboard function in Blockchain.js
  if (typeof fetchLeaderboard === 'function') {
    fetchLeaderboard();
  }
  
  endScreen.style.display = 'flex';
}

// Update leaderboard UI
function updateLeaderboardUI(leaderboardData) {
  if (!leaderboardList) {
    console.error("Leaderboard list element not found!");
    return;
  }
  
  // Store leaderboard data
  if (leaderboardData) {
    globalLeaderboard = leaderboardData;
  }
  
  leaderboardList.innerHTML = "";

  // Populate leaderboard data
  leaderboardData.forEach((entry, index) => {
    const listItem = document.createElement("li");
    
    // Check address field based on entry format
    const address = entry.player ? 
      (entry.player.substring(0, 6) + "..." + entry.player.substring(entry.player.length - 4)) : 
      "Unknown";
    
    listItem.textContent = `#${index + 1} ${entry.nickname} - ${entry.score} points (${address})`;
    leaderboardList.appendChild(listItem);
  });

  // Show leaderboard
  leaderboardList.parentElement.style.display = "block";
}

// Event listeners for starting and restarting the game
document.addEventListener('DOMContentLoaded', function() {
  startButton.addEventListener('click', startGame);
  restartButton.addEventListener('click', startGame);
  
  // Check nickname on page load
  checkNicknameOnLoad();
  
  // Check leaderboard
  if (typeof fetchLeaderboard === 'function') {
    fetchLeaderboard();
  }
}); 