// ==========================================
// LUDO ONLINE MULTIPLAYER - WORKING VERSION
// ==========================================

var firebaseConfig = {
  apiKey: "AIzaSyDcQHzGzmXJHdml7j-Ry-tVVAil-KSCyQ4",
  authDomain: "ludo-party-online-65b84.firebaseapp.com",
  databaseURL: "https://ludo-party-online-65b84-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludo-party-online-65b84",
  storageBucket: "ludo-party-online-65b84.firebasestorage.app",
  messagingSenderId: "405003352009",
  appId: "1:405003352009:web:9683f995ab60e5f0f2da18"
};

var database = null;
var playerId = null;
var playerName = null;
var roomId = null;
var myColor = null;
var onlineMode = false;
var betAmount = 0;

// Init Firebase
function initializeFirebase() {
    console.log("🔄 Initializing...");
    
    if (typeof firebase === 'undefined') {
        console.log("⏳ Waiting for Firebase...");
        setTimeout(initializeFirebase, 1000);
        return;
    }
    
    try {
        if (!firebase.apps || firebase.apps.length === 0) {
            firebase.initializeApp(firebaseConfig);
        }
        
        database = firebase.database();
        
        playerId = localStorage.getItem('uid');
        if (!playerId) {
            playerId = 'user_' + Date.now() + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('uid', playerId);
        }
        
        playerName = localStorage.getItem('uname') || 'Player' + Math.floor(Math.random() * 9999);
        localStorage.setItem('uname', playerName);
        
        console.log("✅ Firebase Ready");
        console.log("👤 User:", playerId);
        
        showToast("Connected!");
        
        overridePlayButton();
        
    } catch (error) {
        console.error("❌ Error:", error);
    }
}

// Override Play Button
function overridePlayButton() {
    var originalPlay = window.playGame;
    
    window.playGame = function() {
        if (!database) {
            console.log("Database not ready");
            if (originalPlay) originalPlay();
            return;
        }
        
        betAmount = currentBet || 100;
        
        if (appState.balance < betAmount) {
            showToast("Insufficient Balance!");
            return;
        }
        
        appState.balance -= betAmount;
        saveState();
        
        startMatchmaking();
    };
}

// Start Matchmaking
function startMatchmaking() {
    console.log("🔍 Finding opponent...");
    
    showScreen('screen-matchmaking');
    document.getElementById('matchmaking-entry').innerText = betAmount;
    document.getElementById('opponent-name-text').innerText = "Searching...";
    document.getElementById('timer').innerText = "30";
    
    startAvatarAnimation();
    
    var queuePath = 'queue_' + betAmount;
    var queueRef = database.ref(queuePath);
    var mySlot = queueRef.child(playerId);
    
    mySlot.set({
        name: playerName,
        time: Date.now()
    });
    
    var matchFound = false;
    
    queueRef.on('value', function(snapshot) {
        if (matchFound) return;
        
        var players = snapshot.val();
        if (!players) return;
        
        var playerIds = Object.keys(players);
        console.log("👥 Players:", playerIds.length);
        
        if (playerIds.length >= 2) {
            playerIds.sort();
            var p1 = playerIds[0];
            var p2 = playerIds[1];
            
            if (p1 === playerId || p2 === playerId) {
                matchFound = true;
                
                var opponentId = p1 === playerId ? p2 : p1;
                var opponentName = players[opponentId].name;
                
                console.log("✅ Match found:", opponentName);
                
                stopAvatarAnimation();
                document.getElementById('opponent-name-text').innerText = opponentName;
                showToast("Match Found!");
                
                queueRef.off();
                mySlot.remove();
                
                setTimeout(function() {
                    createGameRoom(p1, p2);
                }, 2000);
            }
        }
    });
    
    // Timer
    var timeLeft = 30;
    var timer = setInterval(function() {
        timeLeft--;
        document.getElementById('timer').innerText = timeLeft < 10 ? '0' + timeLeft : timeLeft;
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            
            if (!matchFound) {
                stopAvatarAnimation();
                queueRef.off();
                mySlot.remove();
                playWithAI();
            }
        }
    }, 1000);
    
    // Cancel Button
    document.getElementById('cancelBtn').onclick = function() {
        clearInterval(timer);
        stopAvatarAnimation();
        queueRef.off();
        mySlot.remove();
        
        appState.balance += betAmount;
        saveState();
        showToast("Cancelled!");
        goToWalletDashboard();
    };
}

// Create Game Room
function createGameRoom(player1, player2) {
    roomId = 'game_' + Date.now();
    myColor = player1 === playerId ? 'yellow' : 'red';
    
    console.log("🏠 Room:", roomId, "Color:", myColor);
    
    var roomRef = database.ref('games/' + roomId);
    
    roomRef.set({
        turn: 'yellow',
        dice: 0,
        board: {
            yellow: [-1, -1, -1, -1],
            red: [-1, -1, -1, -1]
        },
        winner: null,
        bet: betAmount,
        prize: Math.floor(betAmount * 1.9)
    });
    
    startOnlineGame();
}

// Start Online Game
function startOnlineGame() {
    console.log("🎮 Starting game...");
    
    onlineMode = true;
    gameMode = 'online';
    players = ['yellow', 'red'];
    
    boardState = {
        yellow: [
            {id: 0, pos: -1, status: 'base', justSpawned: false},
            {id: 1, pos: -1, status: 'base', justSpawned: false},
            {id: 2, pos: -1, status: 'base', justSpawned: false},
            {id: 3, pos: -1, status: 'base', justSpawned: false}
        ],
        red: [
            {id: 0, pos: -1, status: 'base', justSpawned: false},
            {id: 1, pos: -1, status: 'base', justSpawned: false},
            {id: 2, pos: -1, status: 'base', justSpawned: false},
            {id: 3, pos: -1, status: 'base', justSpawned: false}
        ]
    };
    
    showScreen('game-screen');
    initBoard();
    createPlayerHubs();
    drawTokens();
    
    var roomRef = database.ref('games/' + roomId);
    
    roomRef.on('value', function(snapshot) {
        var data = snapshot.val();
        
        if (!data) {
            handleDisconnect();
            return;
        }
        
        updateGameState(data);
    });
}

// Update Game State
function updateGameState(data) {
    if (!onlineMode) return;
    
    if (data.winner) {
        handleWinner(data.winner, data.prize);
        return;
    }
    
    // Sync board
    ['yellow', 'red'].forEach(function(color) {
        for (var i = 0; i < 4; i++) {
            var pos = data.board[color][i];
            boardState[color][i].pos = pos;
            boardState[color][i].status = pos === -1 ? 'base' : pos >= 56 ? 'finished' : 'track';
        }
    });
    
    drawTokens();
    
    // Update dice
    if (data.dice > 0) {
        diceValue = data.dice;
        var diceEl = document.getElementById('dice-' + data.turn);
        if (diceEl) {
            diceEl.innerHTML = createDiceSVG(data.dice, data.turn);
        }
    }
    
    // Update turn
    playerTurnIndex = data.turn === 'yellow' ? 0 : 1;
    updateTurnUI();
    
    var myDice = document.getElementById('dice-' + myColor);
    if (myDice) {
        myDice.style.pointerEvents = (data.turn === myColor && data.dice === 0) ? 'auto' : 'none';
    }
}

// Override Roll
var originalHandleRoll = window.handleRoll;

window.handleRoll = function(color) {
    if (!onlineMode) {
        if (originalHandleRoll) originalHandleRoll(color);
        return;
    }
    
    if (color !== myColor) return;
    
    var dice = Math.floor(Math.random() * 6) + 1;
    
    database.ref('games/' + roomId).update({
        dice: dice
    });
    
    playSound('roll');
    
    setTimeout(function() {
        checkMovableTokens(dice);
    }, 500);
};

// Check Movable Tokens
function checkMovableTokens(dice) {
    var tokens = boardState[myColor];
    var movable = tokens.filter(function(token) {
        if (token.status === 'finished') return false;
        if (token.status === 'base') return dice === 6;
        return token.pos + dice <= 56;
    });
    
    if (movable.length === 0) {
        showMessage("No moves!");
        setTimeout(function() {
            var nextTurn = myColor === 'yellow' ? 'red' : 'yellow';
            database.ref('games/' + roomId).update({
                turn: nextTurn,
                dice: 0
            });
        }, 1000);
    } else if (movable.length === 1) {
        moveOnlineToken(movable[0].id);
    } else {
        highlightMovableTokens(myColor, movable);
    }
}

// Override Token Click
var originalHandleTokenClick = window.handleTokenClick;

window.handleTokenClick = function(color, tokenId) {
    if (!onlineMode) {
        if (originalHandleTokenClick) originalHandleTokenClick(color, tokenId);
        return;
    }
    
    if (color !== myColor) return;
    
    var el = document.getElementById('anim-group-' + color + '-' + tokenId);
    if (!el || !el.classList.contains('token-highlight')) return;
    
    moveOnlineToken(tokenId);
};

// Move Token Online
function moveOnlineToken(tokenId) {
    clearHighlights();
    
    database.ref('games/' + roomId).once('value').then(function(snapshot) {
        var data = snapshot.val();
        var board = JSON.parse(JSON.stringify(data.board));
        
        var oldPos = board[myColor][tokenId];
        var newPos;
        
        if (oldPos === -1 && diceValue === 6) {
            newPos = 0;
        } else {
            newPos = Math.min(oldPos + diceValue, 56);
        }
        
        board[myColor][tokenId] = newPos;
        
        var won = board[myColor].every(function(p) {
            return p === 56;
        });
        
        var nextTurn = myColor;
        if (diceValue !== 6 && !won) {
            nextTurn = myColor === 'yellow' ? 'red' : 'yellow';
        }
        
        database.ref('games/' + roomId).update({
            board: board,
            turn: nextTurn,
            dice: 0,
            winner: won ? myColor : null
        });
        
        playSound('move');
    });
}

// Clear Highlights
function clearHighlights() {
    document.querySelectorAll('.token-highlight').forEach(function(el) {
        el.classList.remove('token-highlight');
    });
}

// Handle Winner
function handleWinner(winner, prize) {
    console.log("🏆 Winner:", winner);
    
    onlineMode = false;
    
    database.ref('games/' + roomId).off();
    database.ref('games/' + roomId).remove();
    
    if (winner === myColor) {
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

// Handle Disconnect
function handleDisconnect() {
    onlineMode = false;
    
    database.ref('games/' + roomId).off();
    
    appState.balance += betAmount;
    saveState();
    
    showToast("Opponent left! Refunded.");
    
    setTimeout(function() {
        goToWalletDashboard();
    }, 2000);
}

// Play with AI
function playWithAI() {
    var aiNames = ["Rayhan", "Faruk", "Arman", "Rahul"];
    var aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
    
    document.getElementById('opponent-name-text').innerText = aiName;
    showToast("Playing with AI");
    
    setTimeout(function() {
        onlineMode = false;
        window.startGame('vsAI', 2);
        showScreen('game-screen');
    }, 2000);
}

// Avatar Animation
function startAvatarAnimation() {
    window.avatarInterval = setInterval(function() {
        var img = document.getElementById('random-avatar-img');
        if (img) {
            var seed = Math.random().toString(36).substring(7);
            img.setAttribute('href', 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + seed);
        }
    }, 333);
}

function stopAvatarAnimation() {
    if (window.avatarInterval) {
        clearInterval(window.avatarInterval);
    }
}

// Override Finish Game Session
var originalFinishGameSession = window.finishGameSession;

window.finishGameSession = function() {
    if (onlineMode) {
        document.getElementById('win-modal').style.display = 'none';
        goToWalletDashboard();
    } else if (originalFinishGameSession) {
        originalFinishGameSession();
    }
};

// Initialize on Load
window.addEventListener('load', function() {
    console.log("🎮 Loading online module...");
    setTimeout(initializeFirebase, 2000);
});

console.log("✅ Online module loaded!");