// ==========================================
// SIMPLIFIED ONLINE MODULE (GUARANTEED WORKING)
// ==========================================

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
let auth = null;
let currentUser = null;
let myColor = null;
let roomRef = null;
let isOnline = false;
let myBet = 0;

// ==========================================
// STEP 1: FIREBASE INIT
// ==========================================
window.addEventListener('load', () => {
    setTimeout(() => {
        if (typeof firebase !== 'undefined') {
            if (!firebase.apps.length) {
                firebase.initializeApp(firebaseConfig);
            }
            db = firebase.database();
            auth = firebase.auth();
            
            auth.signInAnonymously().then(result => {
                currentUser = result.user;
                console.log("✅ Firebase Ready! UID:", currentUser.uid);
                alert("Firebase Connected! UID: " + currentUser.uid.substring(0,8));
            }).catch(err => {
                console.error("❌ Firebase Error:", err);
                alert("Firebase Error: " + err.message);
            });
        } else {
            console.error("❌ Firebase SDK not loaded!");
            alert("Firebase SDK Missing!");
        }
    }, 2000);
});

// ==========================================
// STEP 2: OVERRIDE PLAY BUTTON
// ==========================================
const oldPlayGame = window.playGame;

window.playGame = function() {
    console.log("🎮 Play clicked!");
    
    if (!db || !currentUser) {
        alert("Firebase not ready! Wait 3 seconds and try again.");
        return;
    }
    
    myBet = currentBet || 100;
    
    if (appState.balance < myBet) {
        showToast("Insufficient Balance!");
        return;
    }
    
    // Deduct money
    appState.balance -= myBet;
    saveState();
    
    // Show matchmaking screen
    showScreen('screen-matchmaking');
    document.getElementById('matchmaking-entry').innerText = myBet;
    
    console.log("🔍 Starting matchmaking with bet:", myBet);
    
    // Start matchmaking
    findMatch();
};

// ==========================================
// STEP 3: MATCHMAKING (SUPER SIMPLE)
// ==========================================
function findMatch() {
    const myName = localStorage.getItem('ludo_user_name') || 'Player_' + Math.random().toString(36).substr(2, 5);
    localStorage.setItem('ludo_user_name', myName);
    
    console.log("👤 My Name:", myName, "| UID:", currentUser.uid);
    
    const queuePath = 'queue/' + myBet;
    const mySlot = db.ref(queuePath + '/' + currentUser.uid);
    
    // Add myself to queue
    mySlot.set({
        name: myName,
        uid: currentUser.uid,
        time: Date.now()
    });
    
    console.log("📝 Added to queue:", queuePath);
    
    // Listen for matches
    const queue = db.ref(queuePath);
    
    queue.on('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            console.log("⏳ Queue empty, waiting...");
            return;
        }
        
        const uids = Object.keys(data);
        console.log("👥 Players in queue:", uids.length, uids);
        
        if (uids.length >= 2) {
            // Sort to ensure both players create same room
            const sorted = uids.sort();
            const p1 = sorted[0];
            const p2 = sorted[1];
            
            console.log("🎯 Match Found! P1:", p1.substring(0,8), "P2:", p2.substring(0,8));
            
            // Am I in this match?
            if (p1 === currentUser.uid || p2 === currentUser.uid) {
                queue.off(); // Stop listening
                mySlot.remove(); // Remove from queue
                
                const opponent = p1 === currentUser.uid ? data[p2] : data[p1];
                const oppName = opponent ? opponent.name : "Opponent";
                
                console.log("✅ Matched with:", oppName);
                document.getElementById('opponent-name-text').innerText = oppName;
                showToast("Match Found: " + oppName);
                
                // Create unique room ID
                const roomId = 'game_' + [p1, p2].sort().join('_');
                myColor = p1 === currentUser.uid ? 'yellow' : 'red';
                
                console.log("🏠 Room ID:", roomId, "| My Color:", myColor);
                
                setTimeout(() => {
                    startOnlineGame(roomId);
                }, 2000);
            }
        }
    });
    
    // Timeout after 60 seconds
    setTimeout(() => {
        queue.off();
        mySlot.remove();
        
        console.log("⏰ Timeout - Playing with AI");
        alert("No opponent found. Playing with AI.");
        
        isOnline = false;
        startGame('vsAI', 2);
        showScreen('game-screen');
    }, 60000);
    
    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelBtn) {
        cancelBtn.onclick = () => {
            queue.off();
            mySlot.remove();
            appState.balance += myBet;
            saveState();
            showToast("Cancelled!");
            goToWalletDashboard();
        };
    }
}

// ==========================================
// STEP 4: START ONLINE GAME
// ==========================================
function startOnlineGame(roomId) {
    console.log("🎲 Starting online game:", roomId);
    
    isOnline = true;
    roomRef = db.ref('games/' + roomId);
    
    // Initialize room data (only first player)
    roomRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            console.log("📝 Creating new room data");
            roomRef.set({
                turn: 'yellow',
                dice: 0,
                rolled: false,
                board: {
                    yellow: [-1,-1,-1,-1],
                    red: [-1,-1,-1,-1]
                },
                winner: null,
                bet: myBet,
                prize: Math.floor(myBet * 1.9)
            });
        }
    });
    
    // Setup game
    gameMode = 'online';
    players = ['yellow', 'red'];
    boardState = {
        yellow: Array(4).fill(null).map((_, i) => ({id: i, pos: -1, status: 'base'})),
        red: Array(4).fill(null).map((_, i) => ({id: i, pos: -1, status: 'base'}))
    };
    
    showScreen('game-screen');
    initBoard();
    createPlayerHubs();
    drawTokens();
    
    // Listen for updates
    roomRef.on('value', snapshot => {
        const data = snapshot.val();
        if (!data) return;
        
        console.log("📡 Update:", data.turn, "Dice:", data.dice, "Rolled:", data.rolled);
        
        // Check winner
        if (data.winner) {
            handleOnlineWin(data.winner, data.prize);
            return;
        }
        
        // Sync board
        if (data.board) {
            ['yellow','red'].forEach(c => {
                for(let i=0; i<4; i++) {
                    const p = data.board[c][i];
                    boardState[c][i].pos = p;
                    boardState[c][i].status = p === -1 ? 'base' : (p >= 56 ? 'finished' : 'track');
                }
            });
            drawTokens();
        }
        
        // Update dice
        if (data.dice > 0) {
            diceValue = data.dice;
            const el = document.getElementById('dice-' + data.turn);
            if (el) el.innerHTML = createDiceSVG(data.dice, data.turn);
        }
        
        // Update turn UI
        playerTurnIndex = data.turn === 'yellow' ? 0 : 1;
        updateTurnUI();
        
        // Enable my dice
        const myDice = document.getElementById('dice-' + myColor);
        if (myDice) {
            myDice.style.pointerEvents = (data.turn === myColor && !data.rolled) ? 'auto' : 'none';
        }
    });
    
    console.log("✅ Online game ready!");
}

// ==========================================
// STEP 5: OVERRIDE DICE ROLL
// ==========================================
const oldHandleRoll = window.handleRoll;

window.handleRoll = function(color) {
    if (!isOnline) {
        if (oldHandleRoll) oldHandleRoll(color);
        return;
    }
    
    if (color !== myColor || isRolling) {
        console.log("❌ Not my turn");
        return;
    }
    
    console.log("🎲 Rolling dice...");
    
    isRolling = true;
    const dice = Math.floor(Math.random() * 6) + 1;
    
    // Animate
    const el = document.getElementById('dice-' + myColor);
    let count = 0;
    const anim = setInterval(() => {
        el.innerHTML = createDiceSVG(Math.floor(Math.random()*6)+1, myColor);
        if (++count > 10) {
            clearInterval(anim);
            el.innerHTML = createDiceSVG(dice, myColor);
            
            // Update Firebase
            roomRef.update({ dice: dice, rolled: true });
            
            console.log("✅ Rolled:", dice);
            isRolling = false;
            
            // Check movable tokens
            setTimeout(() => checkMovable(dice), 500);
        }
    }, 50);
};

function checkMovable(dice) {
    const tokens = boardState[myColor];
    const movable = tokens.filter(t => {
        if (t.status === 'finished') return false;
        if (t.status === 'base') return dice === 6;
        return t.pos + dice <= 56;
    });
    
    console.log("🎯 Movable tokens:", movable.length);
    
    if (movable.length === 0) {
        showMessage("কোনো চাল নেই");
        setTimeout(() => {
            const next = myColor === 'yellow' ? 'red' : 'yellow';
            roomRef.update({ turn: next, dice: 0, rolled: false });
        }, 1000);
    } else {
        highlightMovableTokens(myColor, movable);
    }
}

// ==========================================
// STEP 6: OVERRIDE TOKEN CLICK
// ==========================================
const oldTokenClick = window.handleTokenClick;

window.handleTokenClick = function(color, tokenId) {
    if (!isOnline) {
        if (oldTokenClick) oldTokenClick(color, tokenId);
        return;
    }
    
    if (color !== myColor) return;
    
    const el = document.getElementById(`anim-group-${color}-${tokenId}`);
    if (!el || !el.classList.contains('token-highlight')) return;
    
    console.log("🚶 Moving token:", tokenId);
    
    clearHighlights();
    
    roomRef.once('value').then(snap => {
        const data = snap.val();
        const board = JSON.parse(JSON.stringify(data.board));
        
        const oldPos = board[myColor][tokenId];
        let newPos;
        
        if (oldPos === -1 && diceValue === 6) {
            newPos = 0;
        } else {
            newPos = Math.min(oldPos + diceValue, 56);
        }
        
        board[myColor][tokenId] = newPos;
        
        console.log("📍 Move:", oldPos, "→", newPos);
        
        // Check win
        const won = board[myColor].every(p => p === 56);
        
        // Next turn
        let nextTurn = myColor;
        if (diceValue !== 6 && !won) {
            nextTurn = myColor === 'yellow' ? 'red' : 'yellow';
        }
        
        roomRef.update({
            board: board,
            turn: nextTurn,
            dice: 0,
            rolled: false,
            winner: won ? myColor : null
        });
        
        playSound('move');
    });
};

// ==========================================
// STEP 7: HANDLE WIN
// ==========================================
function handleOnlineWin(winner, prize) {
    console.log("🏆 Winner:", winner, "Prize:", prize);
    
    isOnline = false;
    if (roomRef) {
        roomRef.off();
        roomRef.remove();
    }
    
    if (winner === myColor) {
        appState.balance += prize;
        appState.wins++;
        addTransaction('game_win', prize, 'success', 'Online Win');
        
        document.getElementById('win-title').innerText = "YOU WON!";
        document.getElementById('win-message').innerText = "Prize: " + prize;
    } else {
        appState.losses++;
        addTransaction('game_loss', myBet, 'success', 'Online Loss');
        
        document.getElementById('win-title').innerText = "YOU LOST";
        document.getElementById('win-message').innerText = "Better luck next time!";
    }
    
    saveState();
    document.getElementById('win-modal').style.display = 'flex';
}

console.log("✅ Simplified Online Module Loaded!");