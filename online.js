// ==========================================
// LUDO ONLINE - NO AUTH REQUIRED
// Pure Database Solution
// ==========================================

// 🔴 আপনার Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDcQHzGzmXJHdml7j-Ry-tVVAil-KSCyQ4",
  authDomain: "ludo-party-online-65b84.firebaseapp.com",
  databaseURL: "https://ludo-party-online-65b84-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludo-party-online-65b84",
  storageBucket: "ludo-party-online-65b84.firebasestorage.app",
  messagingSenderId: "405003352009",
  appId: "1:405003352009:web:9683f995ab60e5f0f2da18"
};

let db = null;
let userId = null;
let userName = null;
let currentRoom = null;
let playerColor = null;
let isOnlineMode = false;
let gameBet = 0;

// ==========================================
// INIT - NO AUTHENTICATION
// ==========================================
function initOnlineSystem() {
    console.log("🔄 Initializing Firebase...");
    
    try {
        // Check Firebase loaded
        if (typeof firebase === 'undefined') {
            console.error("❌ Firebase not loaded");
            setTimeout(initOnlineSystem, 1000);
            return;
        }
        
        // Init Firebase
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
            console.log("✅ Firebase initialized");
        }
        
        // Get database reference
        db = firebase.database();
        
        // Generate user ID (no auth needed)
        userId = localStorage.getItem('game_user_id');
        if (!userId) {
            userId = 'player_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
            localStorage.setItem('game_user_id', userId);
        }
        
        userName = localStorage.getItem('game_user_name');
        if (!userName) {
            userName = 'Player' + Math.floor(Math.random() * 10000);
            localStorage.setItem('game_user_name', userName);
        }
        
        console.log("✅ Online ready:", userId, userName);
        
        // Test database connection
        db.ref('.info/connected').on('value', function(snap) {
            if (snap.val() === true) {
                console.log("✅ Database connected!");
                showToast("Online mode ready!");
            } else {
                console.log("⚠️ Database offline");
            }
        });
        
        // Setup play button override
        setupPlayButton();
        
    } catch (error) {
        console.error("❌ Firebase error:", error);
        showToast("Offline mode only");
    }
}

// ==========================================
// OVERRIDE PLAY BUTTON
// ==========================================
function setupPlayButton() {
    const originalPlay = window.playGame;
    
    window.playGame = function() {
        console.log("🎮 Play button clicked");
        
        if (!db) {
            console.log("⚠️ Database not ready, playing offline");
            if (originalPlay) originalPlay();
            return;
        }
        
        gameBet = currentBet || 100;
        
        if (appState.balance < gameBet) {
            showToast("Insufficient Balance!");
            return;
        }
        
        // Deduct bet
        appState.balance -= gameBet;
        saveState();
        
        // Start online matchmaking
        findOnlineMatch();
    };
}

// ==========================================
// FIND MATCH
// ==========================================
function findOnlineMatch() {
    console.log("🔍 Finding match for bet:", gameBet);
    
    // Show matchmaking screen
    showScreen('screen-matchmaking');
    
    const entryEl = document.getElementById('matchmaking-entry');
    if (entryEl) entryEl.innerText = gameBet;
    
    const oppEl = document.getElementById('opponent-name-text');
    if (oppEl) oppEl.innerText = "Searching...";
    
    // Avatar animation
    startRandomAvatar();
    
    // Join queue
    const queueKey = 'queue_' + gameBet;
    const queueRef = db.ref(queueKey);
    const myEntryRef = queueRef.child(userId);
    
    // Add to queue
    myEntryRef.set({
        name: userName,
        time: firebase.database.ServerValue.TIMESTAMP
    }).then(function() {
        console.log("✅ Joined queue");
    }).catch(function(error) {
        console.error("❌ Queue error:", error);
        showToast("Connection error!");
        refundBet();
        return;
    });
    
    // Auto remove on disconnect
    myEntryRef.onDisconnect().remove();
    
    // Listen for players
    let matchFound = false;
    
    queueRef.on('value', function(snapshot) {
        if (matchFound) return;
        
        const data = snapshot.val();
        if (!data) return;
        
        const playerIds = Object.keys(data);
        console.log("👥 Queue players:", playerIds.length);
        
        // Need 2 players
        if (playerIds.length >= 2) {
            // Sort IDs for consistency
            playerIds.sort();
            
            const p1 = playerIds[0];
            const p2 = playerIds[1];
            
            // Am I in first 2?
            if (p1 === userId || p2 === userId) {
                matchFound = true;
                
                const opponentId = p1 === userId ? p2 : p1;
                const opponentName = data[opponentId].name || "Opponent";
                
                console.log("🎯 Match found:", opponentName);
                
                // Stop listening
                queueRef.off();
                
                // Show match found
                stopRandomAvatar();
                if (oppEl) oppEl.innerText = opponentName;
                showToast("Match found!");
                
                // Remove from queue
                myEntryRef.remove();
                
                // Create room
                setTimeout(function() {
                    createGameRoom(p1, p2);
                }, 2000);
            }
        }
    });
    
    // Timer - 30 seconds
    let timeLeft = 30;
    const timerEl = document.getElementById('timer');
    
    const timerInterval = setInterval(function() {
        timeLeft--;
        if (timerEl) timerEl.innerText = timeLeft < 10 ? '0' + timeLeft : timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            
            if (!matchFound) {
                stopRandomAvatar();
                queueRef.off();
                myEntryRef.remove();
                
                console.log("⏰ Timeout - Playing AI");
                playWithAI();
            }
        }
    }, 1000);
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.onclick = function() {
            clearInterval(timerInterval);
            stopRandomAvatar();
            queueRef.off();
            myEntryRef.remove();
            refundBet();
        };
    }
}

// ==========================================
// CREATE ROOM
// ==========================================
function createGameRoom(player1, player2) {
    console.log("🏠 Creating room...");
    
    currentRoom = 'room_' + Date.now();
    playerColor = player1 === userId ? 'yellow' : 'red';
    
    console.log("Room:", currentRoom, "Color:", playerColor);
    
    const roomRef = db.ref('games/' + currentRoom);
    
    const roomData = {
        player1: player1,
        player2: player2,
        turn: 'yellow',
        dice: 0,
        board: {
            yellow: [-1, -1, -1, -1],
            red: [-1, -1, -1, -1]
        },
        winner: null,
        bet: gameBet,
        prize: Math.floor(gameBet * 1.9),
        created: firebase.database.ServerValue.TIMESTAMP
    };
    
    roomRef.set(roomData).then(function() {
        console.log("✅ Room created");
        startOnlineGame();
    }).catch(function(error) {
        console.error("❌ Room error:", error);
        showToast("Failed to create game!");
        refundBet();
    });
    
    // Auto cleanup on disconnect
    roomRef.onDisconnect().remove();
}

// ==========================================
// START GAME
// ==========================================
function startOnlineGame() {
    console.log("🎮 Starting online game");
    
    isOnlineMode = true;
    gameMode = 'online';
    players = ['yellow', 'red'];
    
    // Init board
    boardState = {};
    ['yellow', 'red'].forEach(function(color) {
        boardState[color] = [];
        for (let i = 0; i < 4; i++) {
            boardState[color].push({
                id: i,
                pos: -1,
                status: 'base',
                justSpawned: false
            });
        }
    });
    
    // Show game screen
    showScreen('game-screen');
    initBoard();
    createPlayerHubs();
    drawTokens();
    
    // Listen to room
    const roomRef = db.ref('games/' + currentRoom);
    
    roomRef.on('value', function(snapshot) {
        const data = snapshot.val();
        
        if (!data) {
            console.log("❌ Room deleted");
            handlePlayerLeft();
            return;
        }
        
        updateGame(data);
    });
    
    console.log("✅ Game started");
}

// ==========================================
// UPDATE GAME
// ==========================================
function updateGame(data) {
    if (!isOnlineMode) return;
    
    console.log("📡 Game update");
    
    // Check winner
    if (data.winner) {
        handleWinner(data.winner, data.prize);
        return;
    }
    
    // Sync board
    ['yellow', 'red'].forEach(function(color) {
        for (let i = 0; i < 4; i++) {
            const pos = data.board[color][i];
            boardState[color][i].pos = pos;
            
            if (pos === -1) {
                boardState[color][i].status = 'base';
            } else if (pos >= 56) {
                boardState[color][i].status = 'finished';
            } else {
                boardState[color][i].status = 'track';
            }
        }
    });
    
    drawTokens();
    
    // Update dice
    if (data.dice > 0) {
        diceValue = data.dice;
        const diceEl = document.getElementById('dice-' + data.turn);
        if (diceEl) {
            diceEl.innerHTML = createDiceSVG(data.dice, data.turn);
        }
    }
    
    // Update turn
    playerTurnIndex = data.turn === 'yellow' ? 0 : 1;
    updateTurnUI();
    
    // Enable my dice
    const isMyTurn = data.turn === playerColor;
    const myDice = document.getElementById('dice-' + playerColor);
    
    if (myDice) {
        if (isMyTurn && data.dice === 0) {
            myDice.style.pointerEvents = 'auto';
        } else {
            myDice.style.pointerEvents = 'none';
        }
    }
}

// ==========================================
// ROLL DICE
// ==========================================
const originalRoll = window.handleRoll;

window.handleRoll = function(color) {
    if (!isOnlineMode) {
        if (originalRoll) originalRoll(color);
        return;
    }
    
    if (color !== playerColor) {
        console.log("❌ Not my turn");
        return;
    }
    
    console.log("🎲 Rolling...");
    
    const dice = Math.floor(Math.random() * 6) + 1;
    
    db.ref('games/' + currentRoom).update({
        dice: dice
    });
    
    playSound('roll');
    
    setTimeout(function() {
        checkMoves(dice);
    }, 500);
};

// ==========================================
// CHECK MOVES
// ==========================================
function checkMoves(dice) {
    const myTokens = boardState[playerColor];
    
    const movable = myTokens.filter(function(token) {
        if (token.status === 'finished') return false;
        if (token.status === 'base') return dice === 6;
        return token.pos + dice <= 56;
    });
    
    console.log("Movable:", movable.length);
    
    if (movable.length === 0) {
        showMessage("No moves!");
        
        setTimeout(function() {
            const nextTurn = playerColor === 'yellow' ? 'red' : 'yellow';
            
            db.ref('games/' + currentRoom).update({
                turn: nextTurn,
                dice: 0
            });
        }, 1000);
        
    } else if (movable.length === 1) {
        moveOnlineToken(movable[0].id);
    } else {
        highlightMovableTokens(playerColor, movable);
    }
}

// ==========================================
// MOVE TOKEN
// ==========================================
const originalClick = window.handleTokenClick;

window.handleTokenClick = function(color, tokenId) {
    if (!isOnlineMode) {
        if (originalClick) originalClick(color, tokenId);
        return;
    }
    
    if (color !== playerColor) return;
    
    const el = document.getElementById('anim-group-' + color + '-' + tokenId);
    if (!el || !el.classList.contains('token-highlight')) return;
    
    moveOnlineToken(tokenId);
};

function moveOnlineToken(tokenId) {
    console.log("Moving token:", tokenId);
    
    clearHighlights();
    
    db.ref('games/' + currentRoom).once('value').then(function(snapshot) {
        const data = snapshot.val();
        
        const newBoard = JSON.parse(JSON.stringify(data.board));
        
        const oldPos = newBoard[playerColor][tokenId];
        let newPos;
        
        if (oldPos === -1 && diceValue === 6) {
            newPos = 0;
        } else {
            newPos = Math.min(oldPos + diceValue, 56);
        }
        
        newBoard[playerColor][tokenId] = newPos;
        
        // Check win
        const won = newBoard[playerColor].every(function(p) {
            return p === 56;
        });
        
        // Next turn
        let nextTurn = playerColor;
        
        if (diceValue !== 6 && !won) {
            nextTurn = playerColor === 'yellow' ? 'red' : 'yellow';
        }
        
        // Update database
        db.ref('games/' + currentRoom).update({
            board: newBoard,
            turn: nextTurn,
            dice: 0,
            winner: won ? playerColor : null
        });
        
        playSound('move');
    });
}

// ==========================================
// GAME END
// ==========================================
function handleWinner(winner, prize) {
    console.log("🏆 Winner:", winner);
    
    isOnlineMode = false;
    
    db.ref('games/' + currentRoom).off();
    db.ref('games/' + currentRoom).remove();
    
    if (winner === playerColor) {
        appState.balance += prize;
        appState.wins++;
        
        document.getElementById('win-title').innerText = "YOU WON!";
        document.getElementById('win-message').innerText = "Prize: " + prize + " coins";
    } else {
        appState.losses++;
        
        document.getElementById('win-title').innerText = "YOU LOST";
        document.getElementById('win-message').innerText = "Better luck next time!";
    }
    
    saveState();
    document.getElementById('win-modal').style.display = 'flex';
}

function handlePlayerLeft() {
    isOnlineMode = false;
    
    db.ref('games/' + currentRoom).off();
    
    appState.balance += gameBet;
    saveState();
    
    showToast("Opponent left! Refunded.");
    
    setTimeout(function() {
        goToWalletDashboard();
    }, 2000);
}

// ==========================================
// UTILITIES
// ==========================================
function playWithAI() {
    const aiNames = ["Rayhan", "Faruk", "Arman", "Rahul"];
    const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
    
    document.getElementById('opponent-name-text').innerText = aiName;
    showToast("Playing with AI");
    
    setTimeout(function() {
        isOnlineMode = false;
        startGame('vsAI', 2);
        showScreen('game-screen');
    }, 2000);
}

function refundBet() {
    appState.balance += gameBet;
    saveState();
    showToast("Cancelled! Refunded.");
    goToWalletDashboard();
}

function startRandomAvatar() {
    window.avatarInterval = setInterval(function() {
        const img = document.getElementById('random-avatar-img');
        if (img) {
            const seed = Math.random().toString(36).substring(7);
            img.setAttribute('href', 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + seed);
        }
    }, 333);
}

function stopRandomAvatar() {
    if (window.avatarInterval) {
        clearInterval(window.avatarInterval);
    }
}

const originalFinish = window.finishGameSession;

window.finishGameSession = function() {
    if (isOnlineMode) {
        document.getElementById('win-modal').style.display = 'none';
        goToWalletDashboard();
    } else if (originalFinish) {
        originalFinish();
    }
};

// ==========================================
// AUTO INIT
// ==========================================
window.addEventListener('load', function() {
    console.log("🎮 Loading online module...");
    setTimeout(initOnlineSystem, 2000);
});

console.log("✅ Online module loaded!");
