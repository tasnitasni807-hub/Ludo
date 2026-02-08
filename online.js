// ==========================================
// LUDO ONLINE - NO AUTHENTICATION AT ALL
// Pure Database Solution
// ==========================================

var config = {
  apiKey: "AIzaSyDcQHzGzmXJHdml7j-Ry-tVVAil-KSCyQ4",
  authDomain: "ludo-party-online-65b84.firebaseapp.com",
  databaseURL: "https://ludo-party-online-65b84-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "ludo-party-online-65b84",
  storageBucket: "ludo-party-online-65b84.firebasestorage.app",
  messagingSenderId: "405003352009",
  appId: "1:405003352009:web:9683f995ab60e5f0f2da18"
};

var db = null;
var userId = null;
var userName = null;
var gameRoom = null;
var playerColor = null;
var isOnlineGame = false;
var gameBet = 0;

// ==========================================
// INIT - NO AUTH
// ==========================================
function initOnline() {
    console.log("🔄 Init Firebase...");
    
    if (typeof firebase === 'undefined') {
        console.log("⏳ Waiting...");
        setTimeout(initOnline, 1000);
        return;
    }
    
    try {
        // Init Firebase
        if (!firebase.apps || !firebase.apps.length) {
            firebase.initializeApp(config);
        }
        
        db = firebase.database();
        
        // Generate ID (NO AUTH)
        userId = localStorage.getItem('player_id');
        if (!userId) {
            userId = 'p_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem('player_id', userId);
        }
        
        userName = localStorage.getItem('player_name');
        if (!userName) {
            userName = 'Player' + Math.floor(Math.random() * 10000);
            localStorage.setItem('player_name', userName);
        }
        
        console.log("✅ Firebase OK");
        console.log("👤 ID:", userId);
        
        showToast("Online Ready!");
        
        setupPlay();
        
    } catch (e) {
        console.error("❌ Error:", e);
    }
}

// ==========================================
// OVERRIDE PLAY
// ==========================================
function setupPlay() {
    var oldPlay = window.playGame;
    
    window.playGame = function() {
        if (!db) {
            console.log("No DB");
            if (oldPlay) oldPlay();
            return;
        }
        
        gameBet = currentBet || 100;
        
        if (appState.balance < gameBet) {
            showToast("Low Balance!");
            return;
        }
        
        appState.balance -= gameBet;
        saveState();
        
        findPlayer();
    };
}

// ==========================================
// FIND PLAYER
// ==========================================
function findPlayer() {
    console.log("🔍 Finding...");
    
    showScreen('screen-matchmaking');
    document.getElementById('matchmaking-entry').innerText = gameBet;
    document.getElementById('opponent-name-text').innerText = "Searching...";
    document.getElementById('timer').innerText = "30";
    
    startAnim();
    
    var qRef = db.ref('queue_' + gameBet);
    var myRef = qRef.child(userId);
    
    myRef.set({
        name: userName,
        time: Date.now()
    });
    
    var found = false;
    
    qRef.on('value', function(s) {
        if (found) return;
        
        var d = s.val();
        if (!d) return;
        
        var ids = Object.keys(d);
        console.log("👥", ids.length);
        
        if (ids.length >= 2) {
            ids.sort();
            var p1 = ids[0];
            var p2 = ids[1];
            
            if (p1 === userId || p2 === userId) {
                found = true;
                
                var opp = p1 === userId ? p2 : p1;
                var oppName = d[opp].name;
                
                console.log("✅ Found:", oppName);
                
                stopAnim();
                document.getElementById('opponent-name-text').innerText = oppName;
                showToast("Match!");
                
                qRef.off();
                myRef.remove();
                
                setTimeout(function() {
                    makeRoom(p1, p2);
                }, 2000);
            }
        }
    });
    
    var t = 30;
    var ti = setInterval(function() {
        t--;
        document.getElementById('timer').innerText = t < 10 ? '0' + t : t;
        
        if (t <= 0) {
            clearInterval(ti);
            if (!found) {
                stopAnim();
                qRef.off();
                myRef.remove();
                playBot();
            }
        }
    }, 1000);
    
    document.getElementById('cancelBtn').onclick = function() {
        clearInterval(ti);
        stopAnim();
        qRef.off();
        myRef.remove();
        
        appState.balance += gameBet;
        saveState();
        showToast("Cancelled!");
        goToWalletDashboard();
    };
}

// ==========================================
// MAKE ROOM
// ==========================================
function makeRoom(p1, p2) {
    gameRoom = 'r_' + Date.now();
    playerColor = p1 === userId ? 'yellow' : 'red';
    
    console.log("🏠 Room:", gameRoom);
    
    var rRef = db.ref('rooms/' + gameRoom);
    
    rRef.set({
        turn: 'yellow',
        dice: 0,
        board: {
            yellow: [-1,-1,-1,-1],
            red: [-1,-1,-1,-1]
        },
        winner: null,
        bet: gameBet,
        prize: Math.floor(gameBet * 1.9)
    });
    
    playOnline();
}

// ==========================================
// PLAY ONLINE
// ==========================================
function playOnline() {
    isOnlineGame = true;
    gameMode = 'online';
    players = ['yellow', 'red'];
    
    boardState = {
        yellow: [
            {id:0,pos:-1,status:'base',justSpawned:false},
            {id:1,pos:-1,status:'base',justSpawned:false},
            {id:2,pos:-1,status:'base',justSpawned:false},
            {id:3,pos:-1,status:'base',justSpawned:false}
        ],
        red: [
            {id:0,pos:-1,status:'base',justSpawned:false},
            {id:1,pos:-1,status:'base',justSpawned:false},
            {id:2,pos:-1,status:'base',justSpawned:false},
            {id:3,pos:-1,status:'base',justSpawned:false}
        ]
    };
    
    showScreen('game-screen');
    initBoard();
    createPlayerHubs();
    drawTokens();
    
    var rRef = db.ref('rooms/' + gameRoom);
    
    rRef.on('value', function(s) {
        var d = s.val();
        if (!d) {
            handleLeft();
            return;
        }
        sync(d);
    });
}

// ==========================================
// SYNC
// ==========================================
function sync(d) {
    if (!isOnlineGame) return;
    
    if (d.winner) {
        finish(d.winner, d.prize);
        return;
    }
    
    ['yellow','red'].forEach(function(c) {
        for (var i = 0; i < 4; i++) {
            var p = d.board[c][i];
            boardState[c][i].pos = p;
            boardState[c][i].status = p === -1 ? 'base' : p >= 56 ? 'finished' : 'track';
        }
    });
    
    drawTokens();
    
    if (d.dice > 0) {
        diceValue = d.dice;
        var el = document.getElementById('dice-' + d.turn);
        if (el) el.innerHTML = createDiceSVG(d.dice, d.turn);
    }
    
    playerTurnIndex = d.turn === 'yellow' ? 0 : 1;
    updateTurnUI();
    
    var myD = document.getElementById('dice-' + playerColor);
    if (myD) {
        myD.style.pointerEvents = (d.turn === playerColor && d.dice === 0) ? 'auto' : 'none';
    }
}

// ==========================================
// ROLL
// ==========================================
var oRoll = window.handleRoll;

window.handleRoll = function(c) {
    if (!isOnlineGame) {
        if (oRoll) oRoll(c);
        return;
    }
    
    if (c !== playerColor) return;
    
    var dice = Math.floor(Math.random() * 6) + 1;
    
    db.ref('rooms/' + gameRoom).update({ dice: dice });
    
    playSound('roll');
    
    setTimeout(function() { checkMove(dice); }, 500);
};

// ==========================================
// CHECK MOVE
// ==========================================
function checkMove(dice) {
    var tokens = boardState[playerColor];
    var mov = tokens.filter(function(t) {
        if (t.status === 'finished') return false;
        if (t.status === 'base') return dice === 6;
        return t.pos + dice <= 56;
    });
    
    if (mov.length === 0) {
        showMessage("No moves!");
        setTimeout(function() {
            var next = playerColor === 'yellow' ? 'red' : 'yellow';
            db.ref('rooms/' + gameRoom).update({ turn: next, dice: 0 });
        }, 1000);
    } else if (mov.length === 1) {
        move(mov[0].id);
    } else {
        highlightMovableTokens(playerColor, mov);
    }
}

// ==========================================
// MOVE
// ==========================================
var oClick = window.handleTokenClick;

window.handleTokenClick = function(c, id) {
    if (!isOnlineGame) {
        if (oClick) oClick(c, id);
        return;
    }
    
    if (c !== playerColor) return;
    
    var el = document.getElementById('anim-group-' + c + '-' + id);
    if (!el || !el.classList.contains('token-highlight')) return;
    
    move(id);
};

function move(id) {
    clearHighlights();
    
    db.ref('rooms/' + gameRoom).once('value').then(function(s) {
        var d = s.val();
        var b = JSON.parse(JSON.stringify(d.board));
        
        var old = b[playerColor][id];
        var newP = old === -1 && diceValue === 6 ? 0 : Math.min(old + diceValue, 56);
        
        b[playerColor][id] = newP;
        
        var won = b[playerColor].every(function(p) { return p === 56; });
        var next = (diceValue === 6 || won) ? playerColor : (playerColor === 'yellow' ? 'red' : 'yellow');
        
        db.ref('rooms/' + gameRoom).update({
            board: b,
            turn: next,
            dice: 0,
            winner: won ? playerColor : null
        });
        
        playSound('move');
    });
}

// ==========================================
// FINISH
// ==========================================
function finish(w, prize) {
    isOnlineGame = false;
    
    db.ref('rooms/' + gameRoom).off();
    db.ref('rooms/' + gameRoom).remove();
    
    if (w === playerColor) {
        appState.balance += prize;
        appState.wins++;
        document.getElementById('win-title').innerText = "YOU WON!";
        document.getElementById('win-message').innerText = "+" + prize;
    } else {
        appState.losses++;
        document.getElementById('win-title').innerText = "YOU LOST";
        document.getElementById('win-message').innerText = "Try again";
    }
    
    saveState();
    document.getElementById('win-modal').style.display = 'flex';
}

function handleLeft() {
    isOnlineGame = false;
    db.ref('rooms/' + gameRoom).off();
    
    appState.balance += gameBet;
    saveState();
    
    showToast("Opponent left!");
    setTimeout(function() { goToWalletDashboard(); }, 2000);
}

// ==========================================
// UTILS
// ==========================================
function playBot() {
    var names = ["Rayhan", "Faruk", "Arman"];
    var n = names[Math.floor(Math.random() * names.length)];
    
    document.getElementById('opponent-name-text').innerText = n;
    
    setTimeout(function() {
        isOnlineGame = false;
        window.startGame('vsAI', 2);
        showScreen('game-screen');
    }, 2000);
}

function startAnim() {
    window.av = setInterval(function() {
        var img = document.getElementById('random-avatar-img');
        if (img) {
            img.setAttribute('href', 'https://api.dicebear.com/9.x/avataaars/svg?seed=' + Math.random());
        }
    }, 333);
}

function stopAnim() {
    if (window.av) clearInterval(window.av);
}

function clearHighlights() {
    document.querySelectorAll('.token-highlight').forEach(function(e) {
        e.classList.remove('token-highlight');
    });
}

var oFinish = window.finishGameSession;

window.finishGameSession = function() {
    if (isOnlineGame) {
        document.getElementById('win-modal').style.display = 'none';
        goToWalletDashboard();
    } else if (oFinish) {
        oFinish();
    }
};

// ==========================================
// INIT
// ==========================================
window.addEventListener('load', function() {
    setTimeout(initOnline, 2000);
});

console.log("✅ Online Module Loaded!");
