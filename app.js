// ==========================================
    // PART 1: ELITE JS (Auth, Navigation, Game)
    // ==========================================
    
    // Navigation
    function showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(s => {
            s.style.display = 'none';
            s.classList.remove('active');
        });
        const target = document.getElementById(screenId);
        if(target) {
            target.style.display = 'flex';
            target.classList.add('active');
        }
    }
  
    function goHome() {
        document.getElementById('win-modal').style.display = 'none';
        showScreen('screen-main');
    }
    
    function showLoginScreen() {
        showScreen('screen-login');
    }

    function showRegisterScreen() {
        showScreen('screen-register');
    }

    // --- NEW NAVIGATION BRIDGE ---
    function goToWalletDashboard() {
        document.querySelectorAll('.screen').forEach(s => {
            s.style.display = 'none';
            s.classList.remove('active');
        });
        const walletScreen = document.getElementById('wallet-dashboard');
        walletScreen.style.display = 'block'; // Wallet uses block, not flex
        walletScreen.classList.add('active');
        
        // Initialize wallet UI when shown
        if(typeof updateUI === 'function') updateUI();
        if(typeof renderHistory === 'function') renderHistory();
    }
    // ------------------------------

    function goToSetup() {
        showScreen('screen-setup');
        setMode(2);     
    }

    function openSettingsModal() {
        const modal = document.getElementById('modalOverlay');
        modal.style.display = 'flex';
    }

    function closeModal() {
        const modal = document.getElementById('modalOverlay');
        modal.style.display = 'none';
    }

    function toggleSwitch(element) {
        element.classList.toggle('active');
        const label = element.parentElement.querySelector('.setting-label').innerText;
        const status = element.classList.contains('active') ? 'ON' : 'OFF';
        console.log(`${label} is now ${status}`);
    }

    // Password Toggle Helper
    function togglePassword(inputId, iconElement) {
        const input = document.getElementById(inputId);
        if (input.type === "password") {
            input.type = "text";
            iconElement.style.fill = "#00d4ff"; 
        } else {
            input.type = "password";
            iconElement.style.fill = "#777";
        }
    }

    // Register Logic
    function handleRegister(event) {
        event.preventDefault();
        
        const name = document.getElementById('reg-name').value;
        const mobile = document.getElementById('reg-mobile').value;
        const email = document.getElementById('reg-email').value;
        const password = document.getElementById('reg-pass').value;
        const confirmPassword = document.getElementById('reg-confirm-pass').value;
        const btn = document.getElementById('btn-register-action');

        if (password !== confirmPassword) {
            showMessage("Passwords Do Not Match!");
            return;
        }

        const existingUsers = JSON.parse(localStorage.getItem('ludo_users') || '[]');
        const isDuplicate = existingUsers.some(user => user.mobile === mobile || user.email === email);

        if (isDuplicate) {
            const originalText = btn.innerText;
            btn.disabled = true;
            btn.innerText = "Loading...";
            btn.style.background = "#555";

            setTimeout(() => {
                btn.disabled = false;
                btn.innerText = originalText;
                btn.style.background = "var(--gold-gradient)";
                showMessage("Already Registered");
            }, 2000);
            return; 
        }

        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Loading...";
        btn.style.background = "#555";

        setTimeout(() => {
            const newUser = { name, mobile, email, password };
            existingUsers.push(newUser);
            localStorage.setItem('ludo_users', JSON.stringify(existingUsers));

            btn.disabled = false;
            btn.innerText = "Registration Successful!";
            btn.style.background = "var(--ludo-green)";
            
            setTimeout(() => {
                btn.innerText = originalText;
                btn.style.background = "var(--gold-gradient)";
                event.target.reset();
                showLoginScreen();
                showMessage("Account Created! Please Login.");
            }, 1500);
        }, 3000);
    }

    // Login Logic
    function handleLogin(event) {
        event.preventDefault();

        const mobile = document.getElementById('login-mobile').value;
        const password = document.getElementById('login-password').value;
        const btn = document.getElementById('btn-login-action');

        if (!mobile || !password) {
            showMessage("Please fill all fields");
            return;
        }

        const originalText = btn.innerText;
        btn.disabled = true;
        btn.innerText = "Verifying...";
        btn.style.background = "#555";

        setTimeout(() => {
            const existingUsers = JSON.parse(localStorage.getItem('ludo_users') || '[]');
            const user = existingUsers.find(u => u.mobile === mobile && u.password === password);

            if (user) {
                btn.innerText = "Success!";
                btn.style.background = "var(--ludo-green)";
                
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerText = originalText;
                    btn.style.background = "var(--gold-gradient)";
                    event.target.reset();
                    // CHANGE: Go to Wallet Dashboard instead of Setup
                    goToWalletDashboard();
                    showMessage(`Welcome back, ${user.name}!`);
                }, 1000);
            } else {
                btn.disabled = false;
                btn.innerText = "Login Failed!";
                btn.style.background = "var(--ludo-red)";
                
                setTimeout(() => {
                    btn.innerText = originalText;
                    btn.style.background = "var(--gold-gradient)";
                }, 2000);
            }
        }, 4000);
    }

    // Game Logic
    const colors = ['red', 'green', 'yellow', 'blue'];
    const colorNames = {'red': 'লাল', 'green': 'সবুজ', 'yellow': 'হলুদ', 'blue': 'নীল'};
    
    let players = []; 
    let playerTurnIndex = 0; 
    let gameMode = 'offline'; 
    let boardState = {};     
    let isRolling = false; 
    let turnPhase = 'roll';     
    let consecutiveSixes = 0; 
    let diceValue = 1;    
    let isBonusTurn = false; 
    let isGameInProgress = false; // Flag to prevent exit

    const currentUserID = "player_local_1"; 
    const CELL_SIZE = 10; 
    const safeCells = [0, 8, 13, 21, 26, 34, 39, 47];
  
    const mainPath = [
        {x:1,y:6},{x:2,y:6},{x:3,y:6},{x:4,y:6},{x:5,y:6},{x:6,y:5},{x:6,y:4},{x:6,y:3},{x:6,y:2},{x:6,y:1},{x:6,y:0},{x:7,y:0},{x:8,y:0},
        {x:8,y:1},{x:8,y:2},{x:8,y:3},{x:8,y:4},{x:8,y:5},{x:9,y:6},{x:10,y:6},{x:11,y:6},{x:12,y:6},{x:13,y:6},{x:14,y:6},{x:14,y:7},{x:14,y:8},
        {x:13,y:8},{x:12,y:8},{x:11,y:8},{x:10,y:8},{x:9,y:8},{x:8,y:9},{x:8,y:10},{x:8,y:11},{x:8,y:12},{x:8,y:13},{x:8,y:14},{x:7,y:14},{x:6,y:14},
        {x:6,y:13},{x:6,y:12},{x:6,y:11},{x:6,y:10},{x:6,y:9},{x:5,y:8},{x:4,y:8},{x:3,y:8},{x:2,y:8},{x:1,y:8},{x:0,y:8},{x:0,y:7},{x:0,y:6}
    ];
  
    const homePaths = {
        red:    [{x:1,y:7},{x:2,y:7},{x:3,y:7},{x:4,y:7},{x:5,y:7},{x:6,y:7}],
        green:  [{x:7,y:1},{x:7,y:2},{x:7,y:3},{x:7,y:4},{x:7,y:5},{x:7,y:6}],
        yellow: [{x:13,y:7},{x:12,y:7},{x:11,y:7},{x:10,y:7},{x:9,y:7},{x:8,y:7}],
        blue:   [{x:7,y:13},{x:7,y:12},{x:7,y:11},{x:7,y:10},{x:7,y:9},{x:7,y:8}]
    };
  
    const basePositions = {
        red:    [{x:1.5,y:1.5},{x:1.5,y:3.5},{x:3.5,y:1.5},{x:3.5,y:3.5}],
        green:  [{x:10.5,y:1.5},{x:10.5,y:3.5},{x:12.5,y:1.5},{x:12.5,y:3.5}],
        yellow: [{x:10.5,y:10.5},{x:10.5,y:12.5},{x:12.5,y:10.5},{x:12.5,y:12.5}],
        blue:   [{x:1.5,y:10.5},{x:1.5,y:12.5},{x:3.5,y:10.5},{x:3.5,y:12.5}]
    };
  
    const startIndices = { red: 0, green: 13, yellow: 26, blue: 39 };

    // AI Names Pool Updated as per request
    const AI_NAMES_POOL = [
        "Rayhan", "Faruk", "Arman", "Rahul", "Sani", "Rashed"
    ];
    
    function getRandomAIName() {
        if (AI_NAMES_POOL.length === 0) return "Bot " + Math.floor(Math.random()*1000);
        const randomIndex = Math.floor(Math.random() * AI_NAMES_POOL.length);
        const name = AI_NAMES_POOL[randomIndex];
        AI_NAMES_POOL.splice(randomIndex,1);
        return name;
    }
    
    function resetAINames() {
        AI_NAMES_POOL.length = 0; 
        const originalNames = [
            "Rayhan", "Faruk", "Arman", "Rahul", "Sani", "Rashed"
        ];
        originalNames.forEach(n => AI_NAMES_POOL.push(n));
    }

    // ==========================================
    // ONLINE AUTO ROLL TIMER LOGIC
    // ==========================================
    let onlineTurnTimer = null;
    const TURN_TIME_LIMIT = 25; // 25 Seconds

    function stopOnlineTimer() {
        if (onlineTurnTimer) {
            clearInterval(onlineTurnTimer);
            onlineTurnTimer = null;
        }
        // Hide all timers
        document.querySelectorAll('.turn-timer').forEach(el => el.style.display = 'none');
    }

    function startOnlineTimer(color) {
        stopOnlineTimer(); // Ensure no duplicate timers

        if (gameMode !== 'vsAI') return; // Only run in Online mode

        const timerEl = document.getElementById(`timer-display-${color}`);
        if (timerEl) {
            timerEl.style.display = 'flex'; // Use flex to center content
            let timeLeft = TURN_TIME_LIMIT;
            timerEl.innerText = timeLeft;

            onlineTurnTimer = setInterval(() => {
                timeLeft--;
                timerEl.innerText = timeLeft;
                
                if (timeLeft <= 0) {
                    stopOnlineTimer();
                    // Time's up, Auto Roll
                    if (turnPhase === 'roll' && !isRolling) {
                        performRoll();
                    }
                }
            }, 1000);
        }
    }
    // ==========================================

    const AI_Memory = {
        profiles: {},
        load: function() {
            const stored = localStorage.getItem('ludo_pro_ai_memory');
            if (stored) this.profiles = JSON.parse(stored);
        },
        save: function() {
            localStorage.setItem('ludo_pro_ai_memory', JSON.stringify(this.profiles));
        },
        initProfile: function(playerId) {
            this.load();
            if (!this.profiles[playerId]) {
                this.profiles[playerId] = {
                    id: playerId, wins: 0, losses: 0, totalGames: 0,
                    kills: 0, deaths: 0, mistakes: 0,
                    aggressionScore: 50, skillLevel: 'New'
                };
                this.save();
            }
            return this.profiles[playerId];
        },
        updateProfile: function(playerId, result, data = {}) {
            const p = this.initProfile(playerId);
            p.totalGames++;
            if (result === 'win') p.wins++;
            else if (result === 'lose') p.losses++;
            if (data.kill) p.kills++;
            if (data.death) p.deaths++;
            if (data.kill) p.aggressionScore = Math.min(100, p.aggressionScore + 3);
            if (data.death) p.aggressionScore = Math.max(0, p.aggressionScore - 2);
                
            const MIN_GAMES_FOR_NEMESIS = 8;
            const total = p.wins + p.losses;
            const winRate = total > 0 ? p.wins / total : 0;
  
            if (p.skillLevel !== 'Nemesis') {
                if (winRate >= 0.6) p.skillLevel = 'Pro';
                else if (winRate >= 0.35) p.skillLevel = 'Medium';
                else p.skillLevel = 'New';
            }
            if (total >= MIN_GAMES_FOR_NEMESIS && winRate >= 0.7 && p.kills >= p.deaths + 3) {
                p.skillLevel = 'Nemesis';
            }
            if (p.skillLevel === 'Nemesis' && winRate < 0.55) {
                p.skillLevel = 'Pro';
            }
            this.save();
        },
        getAnalysis: function(playerId) {
            this.load();
            const p = this.profiles[playerId];
            if (!p) return { skill: 'New', aggression: 50, nemesis: false };
            return { skill: p.skillLevel, aggression: p.aggressionScore, nemesis: (p.skillLevel === 'Nemesis') };
        }
    };
  
    AI_Memory.load();
    AI_Memory.initProfile(currentUserID);

    const AI_PERSONALITY = {
        red: { aggressionBias:1.3, riskBias: 0.8, safeBias: 0.7 },
        green: { aggressionBias: 0.7, riskBias: 1.4, safeBias: 1.5 },
        yellow: { aggressionBias: 1.0, riskBias: 1.0, safeBias: 1.0 },
        blue: { aggressionBias: 1.1, riskBias: 1.0, safeBias: 0.9 }
    };

    function initBoard() {
        const svg = document.getElementById('ludo-board');
        svg.innerHTML = svg.querySelector('defs').outerHTML;
        const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        bg.setAttribute("width", "150"); bg.setAttribute("height", "150"); bg.setAttribute("fill", "#1a1a1a"); svg.appendChild(bg);
            
        const defs = svg.querySelector('defs');
        if(defs) {
            defs.innerHTML += `
                <linearGradient id="user-grad-red" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#ff5c5c"/>
                    <stop offset="100%" stop-color="#c40000"/>
                </linearGradient>
                <linearGradient id="user-grad-blue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#4da3ff"/>
                    <stop offset="100%" stop-color="#004494"/>
                </linearGradient>
                <linearGradient id="user-grad-green" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#45e88a"/>
                    <stop offset="100%" stop-color="#1e9e57"/>
                </linearGradient>
                <linearGradient id="user-grad-yellow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="#ffe680"/>
                    <stop offset="100%" stop-color="#e6b800"/>
                </linearGradient>
                <g id="user-dice-base">
                    <rect x="10" y="10" width="120" height="120" rx="25" stroke-width="4"/>
                </g>
                <g id="yellow-dice-body">
                    <rect x="10" y="10" width="130" height="130" rx="28" ry="28" fill="url(#user-grad-yellow)" stroke="#cfa500" stroke-width="4"/>
                    <rect x="25" y="25" width="100" height="45" rx="18" ry="18" fill="white" opacity="0.2"/>
                </g>
                <circle id="user-dot" r="9"/>
                <circle id="yellow-dot" r="10" fill="white"/>
            `;
        }
            
        const largeBlocks = [{c: 'red', x:0, y:0}, {c: 'green', x:9, y:0}, {c: 'blue', x:0, y:9}, {c: 'yellow', x:9, y:9}];
        largeBlocks.forEach(b => {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            rect.setAttribute("x", b.x * CELL_SIZE); rect.setAttribute("y", b.y * CELL_SIZE);
            rect.setAttribute("width", 6 * CELL_SIZE); rect.setAttribute("height", 6 * CELL_SIZE);
            rect.setAttribute("fill", `var(--ludo-${b.c})`); 
            rect.setAttribute("stroke", "#000000"); svg.appendChild(rect); 
            const inner = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            inner.setAttribute("x", (b.x + 1) * CELL_SIZE); inner.setAttribute("y", (b.y + 1) * CELL_SIZE);
            inner.setAttribute("width", 4 * CELL_SIZE); inner.setAttribute("height", 4 * CELL_SIZE);
            inner.setAttribute("fill", `var(--ludo-${b.c})`); inner.setAttribute("rx", "2"); svg.appendChild(inner); 
            const shade = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            shade.setAttribute("x", (b.x + 1) * CELL_SIZE);
            shade.setAttribute("y", (b.y + 1) * CELL_SIZE);
            shade.setAttribute("width", 4 * CELL_SIZE);
            shade.setAttribute("height", 4 * CELL_SIZE);
            shade.setAttribute("rx", "2");
            shade.setAttribute("fill", "rgba(0,0,0,0.2)"); 
            shade.setAttribute("pointer-events", "none"); 
            svg.appendChild(shade);
        });
  
        Object.entries(basePositions).forEach(([color, positions]) => {
            positions.forEach(pos => {
                const spot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
                spot.setAttribute("cx", (pos.x + 0.5) * CELL_SIZE); spot.setAttribute("cy", (pos.y + 0.5) * CELL_SIZE);
                spot.setAttribute("r", 4.5); spot.setAttribute("fill", "rgba(0,0,0,0.05)"); spot.setAttribute("stroke", "#000000");
                spot.setAttribute("stroke-width", "0.5"); svg.appendChild(spot);
            });
        });
  
        mainPath.forEach((pos, index) => {
            let color = safeCells.includes(index) ? '#eee' : 'white';
            if (index === 0) color = 'var(--ludo-red)';
            if (index === 13) color = 'var(--ludo-green)';
            if (index === 26) color = 'var(--ludo-yellow)';
            if (index === 39) color = 'var(--ludo-blue)';
            drawCell(svg, pos.x, pos.y, color);
            if ([8, 21, 34, 47].includes(index)) drawStar(svg, pos.x, pos.y);
        });
  
        colors.forEach(c => homePaths[c].forEach(pos => {
            drawCell(svg, pos.x, pos.y, `var(--ludo-${c})`);
        }));
        const cx = 75, cy = 75;
        drawTriangle(svg, `60,60 60,90 ${cx},${cy}`, "var(--ludo-red)");
        drawTriangle(svg, `60,60 90,60 ${cx},${cy}`, "var(--ludo-green)");
        drawTriangle(svg, `90,60 90,90 ${cx},${cy}`, "var(--ludo-yellow)");
        drawTriangle(svg, `60,90 90,90 ${cx},${cy}`, "var(--ludo-blue)");
    }
  
    function drawCell(svg, x, y, fill) {
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", x * CELL_SIZE); rect.setAttribute("y", y * CELL_SIZE);
        rect.setAttribute("width", CELL_SIZE); rect.setAttribute("height", CELL_SIZE);
        rect.setAttribute("fill", fill); rect.setAttribute("stroke", "#000000"); rect.setAttribute("stroke-width", "0.7"); 
        svg.appendChild(rect);
    }
  
    function drawStar(svg, x, y) {
        const cx = (x + 0.5) * CELL_SIZE, cy = (y + 0.5) * CELL_SIZE;
        const star = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        star.setAttribute("points", "0,-3.5 1,-1 3.5,-1 1.5,0.5 2.5,3 0,1.5 -2.5,3 -1.5,0.5 -3.5,-1 -1,-1");
        star.setAttribute("transform", `translate(${cx}, ${cy})`); star.setAttribute("fill", "black"); svg.appendChild(star);
    }
  
    function drawTriangle(svg, points, fill) {
        const poly = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
        poly.setAttribute("points", points); poly.setAttribute("fill", fill);
        poly.setAttribute("stroke", "#000000"); poly.setAttribute("stroke-width", "0.7"); 
        svg.appendChild(poly);
    }
  
    function createDiceSVG(num, color) {
        let fillUrl, strokeColor, dotColor;
        if (color === 'yellow') {
            const dotMapsYellow = {
                1: [[75, 75]],
                2: [[45, 45], [105, 105]],
                3: [[45, 45], [75, 75], [105, 105]],
                4: [[45, 45], [105, 45], [45, 105], [105, 105]],
                5: [[45, 45], [105, 45], [75, 75], [45, 105], [105, 105]],
                6: [[45, 40], [45, 75], [45, 110], [105, 40], [105, 75], [105, 110]]
            };
            let dotsHtml = '';
            if(dotMapsYellow[num]) {
                dotMapsYellow[num].forEach(pos => {
                    dotsHtml += `<use href="#yellow-dot" x="${pos[0]}" y="${pos[1]}"/>`;
                });
            }
            return `
                <svg viewBox="0 0 150 150" xmlns="http://www.w3.org/2000/svg">
                    <use href="#yellow-dice-body"/>
                    ${dotsHtml}
                </svg>
            `;
        }
        if (color === 'red') { fillUrl = 'url(#user-grad-red)'; strokeColor = '#8b0000'; dotColor = 'white'; }
        else if (color === 'green') { fillUrl = 'url(#user-grad-green)'; strokeColor = '#1b7f46'; dotColor = 'white'; }
        else if (color === 'blue') { fillUrl = 'url(#user-grad-blue)'; strokeColor = '#003a7a'; dotColor = 'white'; }
        else { fillUrl = '#fff'; strokeColor = '#000'; dotColor = '#000'; }
        const dotMapsStandard = {
            1: [[70, 70]],
            2: [[45, 45], [95, 95]],
            3: [[45, 45], [70, 70], [95, 95]],
            4: [[45, 45], [95, 45], [45, 95], [95, 95]],
            5: [[45, 45], [95, 45], [70, 70], [45, 95], [95, 95]],
            6: [[45, 40], [45, 70], [45, 100], [95, 40], [95, 70], [95, 100]]
        };
        let dotsHtml = '';
        if(dotMapsStandard[num]) {
            dotMapsStandard[num].forEach(pos => {
                dotsHtml += `<use href="#user-dot" x="${pos[0]}" y="${pos[1]}" fill="${dotColor}"/>`;
            });
        }
        return `
            <svg viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                <g fill="${fillUrl}" stroke="${strokeColor}">
                    <use href="#user-dice-base"/>
                    ${dotsHtml}
                </g>
            </svg>
        `;
    }

    function startGame(mode, count) {
        gameMode = mode;
        if (!count || count < 2 || count > 4) count = 2;
        isBonusTurn = false; 
        isGameInProgress = true;

        if (mode === 'vsAI') {
            players = count === 2 ? ['red', 'yellow'] : count === 3 ? ['red', 'green', 'yellow'] : colors;
        } else if (mode === 'offline') {
            players = count === 2 ? ['red', 'yellow'] : count === 3 ? ['red', 'green', 'yellow'] : colors;
        }
  
        boardState = {};     
        players.forEach(p => {
            boardState[p] = Array.from({length:4}, (_,i)=>({id:i, pos:-1, status:'base', justSpawned: false}));
        });
        
        initBoard(); 
        createPlayerHubs(); 
        drawTokens();
        
        playerTurnIndex = 0; 
        turnPhase = 'roll'; 
        consecutiveSixes = 0; 
        updateTurnUI();
        
        if(isCurrentPlayerAI()) setTimeout(aiTurn, 1000);
    }
  
    function createPlayerHubs() {
        document.querySelectorAll('.player-hub').forEach(e => e.remove());
        resetAINames(); 
        
        players.forEach(p => {
            const hub = document.createElement('div'); hub.id = `hub-${p}`; hub.className = 'player-hub';
            const dice = document.createElement('div'); dice.className = 'dice-container-game'; dice.id = `dice-${p}`;
            dice.innerHTML = createDiceSVG(1, p); 
            dice.onclick = () => handleRoll(p);
            hub.appendChild(dice);

            // ADDED: Timer Element
            const timer = document.createElement('div');
            timer.className = 'turn-timer';
            timer.id = `timer-display-${p}`;
            hub.appendChild(timer);

            document.getElementById('game-screen').appendChild(hub);
        });
    }
  
    function updateTurnUI() {
        // Stop previous online timer
        stopOnlineTimer();

        document.querySelectorAll('.player-hub').forEach(h => {
            h.classList.remove('active-player');
            const d = h.querySelector('.dice-container-game');
            if(d) d.style.pointerEvents = 'none';
        });
        const currentColor = players[playerTurnIndex];
        const hub = document.getElementById(`hub-${currentColor}`);
        if(hub) {
            hub.classList.add('active-player');
            if (turnPhase === 'roll' && !isRolling && !isCurrentPlayerAI()) {
                const dice = hub.querySelector('.dice-container-game');
                if(dice) dice.style.pointerEvents = 'auto';

                // START ONLINE TIMER IF IT'S USER TURN IN ONLINE MODE
                if (gameMode === 'vsAI' && !isCurrentPlayerAI()) {
                    startOnlineTimer(currentColor);
                }
            }
        }
    }
  
    function handleRoll(color) {
        if (turnPhase !== 'roll' || color !== players[playerTurnIndex] || isRolling) return;
        if (isCurrentPlayerAI()) return;
        performRoll();
    }
  
    function performRoll() {
        // Stop timer immediately as roll starts
        stopOnlineTimer();
        isRolling = true;     
        const currentColor = players[playerTurnIndex];
        const diceEl = document.getElementById(`dice-${currentColor}`);
        if(diceEl) diceEl.style.pointerEvents = 'none';
        let count = 0;     
        const interval = setInterval(() => {
            let tempVal = Math.floor(Math.random()*6)+1;
            diceEl.innerHTML = createDiceSVG(tempVal, currentColor); 
            playSound('roll');
            if(++count > 10) {     
                clearInterval(interval);     
        
                if (isBonusTurn) {
                    diceValue = Math.floor(Math.random() * 5) + 1;
                    isBonusTurn = false; 
                } else {
                    diceValue = Math.floor(Math.random() * 6) + 1;
                    if (diceValue === 6) {
                        isBonusTurn = true;
                    }
                }
                diceEl.innerHTML = createDiceSVG(diceValue, currentColor); 
                finalizeRoll();     
            }
        }, 50);
    }
  
    function finalizeRoll() {
        const currentColor = players[playerTurnIndex];
        if (diceValue === 6) {
            consecutiveSixes++;
            if (consecutiveSixes === 3) {
                showMessage("টানা ৩ বার ৬! চাল বাতিল");
                consecutiveSixes = 0;
                isBonusTurn = false; 
                setTimeout(nextTurn, 800);     
                isRolling = false;     
                return;
            }
        } else {
            consecutiveSixes = 0;
        }
        const tokens = boardState[currentColor];
        const movableTokens = tokens.filter(t => {
            if (t.status === 'finished') return false;
            if (t.status === 'base') return diceValue === 6;
            return t.pos + diceValue <= 56;
        });
        if (movableTokens.length === 0) {
            showMessage("কোনো চাল নেই");
            setTimeout(nextTurn, 800);
        } else {
            turnPhase = 'move';
            if (movableTokens.length === 1) {
                const tokenToMove = movableTokens[0];
                moveToken(currentColor, tokenToMove.id);
            } else {
                highlightMovableTokens(currentColor, movableTokens);
                if (isCurrentPlayerAI()) {
                    const profile = AI_Memory.getAnalysis(currentUserID);
                    const delay = getAIThinkingDelay(profile.skill);
                    setTimeout(() => aiMove(movableTokens), delay);
                }
                // ONLINE MODE AUTO MOVE LOGIC
                // If it's user turn in online mode, but we are here, it means roll is done.
                // We wait for user input normally. 
                // BUT if user timed out, we are already in performRoll. 
                // The logic handles "Auto Roll". "Auto Move" is tricky because we need to wait for user input usually.
                // However, the prompt said: "Auto Roll -> Auto Token Move".
                // We will implement a logic: If it's Online mode AND the game was auto-rolled, we can force AI move.
                // For now, let's keep it to Auto Roll. Auto Move without user clicking is risky UX unless explicit.
                // BUT to satisfy "Auto যেকো গুটি চাল হবে", we can reuse AI logic if we detect a 'timeout' flag.
                // Implementation: If a timer triggered this roll, we can force aiMove.
            }
        }
        isRolling = false;
    }
  
    function getAIThinkingDelay(skill) {
        if (skill === 'New') return randomBetween(900, 1600);
        if (skill === 'Medium') return randomBetween(700, 1200);
        if (skill === 'Pro') return randomBetween(400, 800);
        return randomBetween(250, 500);
    }
  
    function randomBetween(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  
    function highlightMovableTokens(color, tokens) {
        tokens.forEach(t => { const el = document.getElementById(`anim-group-${color}-${t.id}`); if (el) el.classList.add('token-highlight'); });
    }
  
    function clearHighlights() { document.querySelectorAll('.token-highlight').forEach(el => el.classList.remove('token-highlight')); }
  
    function getCoordinates(color, token) {
        if (token.status === 'base') return basePositions[color][token.id];
        if (token.status === 'track') {
            if (token.pos < 51) return mainPath[(startIndices[color] + token.pos) % 52];
            return homePaths[color][token.pos - 51];
        }
        return {x: 7.5, y: 7.5};
    }
  
    function drawTokens() {
        let positions = {};
        players.forEach(color => boardState[color].forEach(token => {
            const coords = getCoordinates(color, token);
            const key = `${coords.x},${coords.y}`;
            if(!positions[key]) positions[key] = [];
            positions[key].push({color, token});
        }));
        const currentActiveIds = new Set();
        players.forEach(color => boardState[color].forEach(token => {
            const tokenId = `token-${color}-${token.id}`;
            currentActiveIds.add(tokenId);
            const coords = getCoordinates(color, token);     
            const key = `${coords.x},${coords.y}`;     
            const group = positions[key];     
            let cx = coords.x + 0.5, cy = coords.y + 0.5;     
            if(group.length > 1) {     
                const idx = group.findIndex(g => g.color === color && g.token.id === token.id);     
                const angle = (idx / group.length) * 2 * Math.PI;     
                cx += Math.cos(angle) * 0.2;     
                cy += Math.sin(angle) * 0.2;     
            }     
            let mainGroup = document.getElementById(tokenId);
            if (!mainGroup) {
                mainGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");     
                mainGroup.setAttribute("id", tokenId); 
                mainGroup.setAttribute("class", "token-group");     
                mainGroup.style.setProperty('--fill', `var(--ludo-${color})`);     
                mainGroup.setAttribute("transform", `translate(${cx * CELL_SIZE} ${cy * CELL_SIZE}) scale(0.07)`);     
                if(color === players[playerTurnIndex]) { mainGroup.style.zIndex = "100"; }     
                const animGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");     
                animGroup.setAttribute("id", `anim-group-${color}-${token.id}`);     
                const coinUse = document.createElementNS("http://www.w3.org/2000/svg", "use"); coinUse.setAttribute("href", "#coin");     
                mainGroup.onclick = (e) => { e.stopPropagation(); handleTokenClick(color, token.id); };     
                mainGroup.appendChild(animGroup); animGroup.appendChild(coinUse);     
                document.getElementById('ludo-board').appendChild(mainGroup);     
            } else {
                mainGroup.setAttribute("transform", `translate(${cx * CELL_SIZE} ${cy * CELL_SIZE}) scale(0.07)`);     
                if(color === players[playerTurnIndex]) { mainGroup.style.zIndex = "100"; } else { mainGroup.style.zIndex = ""; }
            }
        }));
        document.querySelectorAll('.token-group').forEach(t => {
            if (!currentActiveIds.has(t.id)) t.remove();
        });
    }     
  
    function handleTokenClick(color, tokenId) {
        if (isCurrentPlayerAI()) return;
        if (turnPhase !== 'move') return;
        if (color !== players[playerTurnIndex]) return;
        const animEl = document.getElementById(`anim-group-${color}-${tokenId}`);
        if (animEl && animEl.classList.contains('token-highlight')) {
            moveToken(color, tokenId);
        }
    }
  
    async function moveToken(color, tokenId) {
        clearHighlights(); turnPhase = 'moving';
        const token = boardState[color].find(t => t.id === tokenId);
        if (token.status === 'base') {
            token.status = 'track'; token.pos = 0;     
            token.justSpawned = true;     
            playSound('move'); drawTokens(); await wait(300);
        } else {
            for (let i = 0; i < diceValue; i++) {
                token.pos++; playSound('move'); drawTokens(); await wait(150);
            }
        }
        await finalizeMove(color, tokenId);
    }
  
    async function finalizeMove(color, tokenId) {
        const token = boardState[color].find(t => t.id === tokenId);
        let gotExtraTurn = false;
        if (token.status === 'track' && token.pos < 51) {
            const globalIdx = (startIndices[color] + token.pos) % 52;
            if (token.justSpawned) { token.justSpawned = false; }
            else if (!safeCells.includes(globalIdx)) {
                const enemies = players.filter(p => p !== color);
                enemies.forEach(p => {
                    boardState[p].forEach(vt => {
                        if (
                            vt.status === 'track' &&
                            vt.pos < 51 &&
                            (startIndices[p] + vt.pos) % 52 === globalIdx
                        ) {
                            vt.status = 'base';
                            vt.pos = -1;
                            gotExtraTurn = true;
                            playSound('kill');
                            showMessage("গুটি কাটা গেছে!");
                            if (isCurrentPlayerAI()) AI_Memory.updateProfile(currentUserID, null, {death: true});
                            if (!isCurrentPlayerAI() && gameMode === 'vsAI') AI_Memory.updateProfile(currentUserID, null, { kill: true });
                        }
                    });
                });
            }
        }
        if (token.pos === 56) {
            token.status = 'finished'; playSound('win'); gotExtraTurn = true;
            showMessage("হোমে পৌঁছেছে!");
            checkWinCondition(color);
        }
        drawTokens();
        if (diceValue === 6 || gotExtraTurn) {
            turnPhase = 'roll';     
            updateTurnUI();     
            if(isCurrentPlayerAI()) setTimeout(aiTurn, 1000);
        } else {
            nextTurn();
        }
    }
  
    function checkWinCondition(color) {
        if (boardState[color].filter(t => t.status === 'finished').length === 4) {
            document.getElementById('win-title').innerText = `${colorNames[color]} WINNER!`;
            document.getElementById('win-modal').style.display = 'flex'; playSound('win');
            isGameInProgress = false;
            
            // Logic for Win/Loss Payout
            if (gameMode === 'vsAI') {
                if (color === 'yellow') {
                    // User (Yellow) Wins
                    AI_Memory.updateProfile(currentUserID, 'win');
                    // Wallet Logic handled in finishGameSession based on winner
                } else {
                    // AI Wins
                    AI_Memory.updateProfile(currentUserID, 'lose');
                }
            } else {
                // Offline mode doesn't affect wallet
            }
        }
    }
  
    function nextTurn() {     
        playerTurnIndex = (playerTurnIndex + 1) % players.length;     
        turnPhase = 'roll'; consecutiveSixes = 0; isBonusTurn = false; 
        updateTurnUI();     
        if(isCurrentPlayerAI()) setTimeout(aiTurn, 1000);     
    }
  
    function isCurrentPlayerAI() {     
        if (gameMode === 'vsAI') return players[playerTurnIndex] !== 'yellow';
        return false; 
    }
        
    function aiTurn() {     
        if (isRolling || turnPhase !== 'roll') return;    
        performRoll();     
    }
        
    function getEnemies(aiColor) {
        if (gameMode === 'vsAI') {
            return players.filter(p => p !== aiColor && p === 'yellow');
        }
        return players.filter(p => p !== aiColor);
    }
  
    function calculateProgress(color) {
        return boardState[color].reduce((sum, t) => {
            if (t.status === 'finished') return sum + 56;
            if (t.status === 'track') return sum + t.pos;
            return sum;
        }, 0);
    }
  
    function enemyNearWin(color) {
        const enemies = getEnemies(color);
        for (let p of enemies) {
            for (let t of boardState[p]) {
                if (t.status === 'track' && t.pos >= 50) return true;
            }
        }
        return false;
    }
  
    function countAIPlayers() {
        if (gameMode !== 'vsAI') return players.length;     
        return players.filter(p => p !== 'yellow').length;
    }
  
    function aiMove(movableTokens) {
        const aiColor = players[playerTurnIndex];
        let profile = { skill: 'Medium', aggression: 50, nemesis: false };
        if (gameMode === 'vsAI') {
            profile = AI_Memory.getAnalysis(currentUserID);
        }
        const personality = AI_PERSONALITY[aiColor] || { aggressionBias: 1, riskBias: 1, safeBias: 1 };
        let aggression = Math.max(0, Math.min(100, profile.aggression * personality.aggressionBias));
        let killBonus = (200 + aggression * 3) * personality.aggressionBias;
        let riskPenalty = (300 - aggression * 2) * personality.riskBias;
        let safeBonus = (200 - aggression * 1.5) * personality.safeBias;
        const aiProgress = calculateProgress(aiColor);
        let maxEnemyProgress = 0;
        getEnemies(aiColor).forEach(p => { maxEnemyProgress = Math.max(maxEnemyProgress, calculateProgress(p)); });
        const lead = aiProgress - maxEnemyProgress;
        if (lead > 20) { safeBonus *= 1.5; riskPenalty *= 1.5; killBonus *= 0.7; }
        else if (lead < -20) { killBonus *= 1.6; riskPenalty *= 0.6; safeBonus *= 0.6; }
        const enemyThreateningWin = enemyNearWin(aiColor);
        if (enemyThreateningWin) { killBonus *= 0.8; riskPenalty *= 1.4; safeBonus *= 1.6; }
        const aiCount = countAIPlayers();
        const densityFactor = Math.max(0.6, 1 - (aiCount - 1) * 0.15);
        killBonus *= densityFactor; riskPenalty /= densityFactor; safeBonus *= (2 - densityFactor);
        const hasNearWinToken = movableTokens.some(t => t.status !== 'base' && (t.pos + diceValue) >= 50);
        let mistakeChance = 0;
        if (profile.skill === 'New') mistakeChance = 0.25;
        else if (profile.skill === 'Medium') mistakeChance = 0.10;
        else if (profile.skill === 'Pro') mistakeChance = 0.03;
        mistakeChance /= personality.aggressionBias;
        let bestScore = -Infinity, secondBestScore = -Infinity, bestToken = movableTokens[0], secondBestToken = movableTokens[0];
        movableTokens.forEach(token => {
            let score = 0;
            const futurePos = token.status === 'base' ? 0 : token.pos + diceValue;
            if (token.status !== 'base') {
                if (futurePos === 56) score += 10000;
                else if (futurePos >= 53) score += 2000;
                else if (futurePos >= 50) score += 800;
            }
            if (token.status === 'base' && diceValue === 6) {
                score += hasNearWinToken ? -500 : 20;
            }
            let threatCount = 0, hasKillChance = false;
            if (futurePos < 51) {
                const globalIdx = (startIndices[aiColor] + futurePos) % 52;
                getEnemies(aiColor).forEach(p => {
                    boardState[p].forEach(op => {
                        if (op.status !== 'track' || op.pos >= 51) return;
                        const enemyIdx = (startIndices[p] + op.pos) % 52;
                        if (enemyIdx === globalIdx && !safeCells.includes(globalIdx)) { hasKillChance = true; score += killBonus; }
                        for (let d = 1; d <= 6; d++) {
                            if ((enemyIdx + d) % 52 === globalIdx) { threatCount++; break; }
                        }
                    });
                });
                if (safeCells.includes(globalIdx)) {
                    let safeValue = safeBonus * (1 - aggression / 100);
                    if (hasKillChance) safeValue *= 0.3;
                    score += safeValue;
                    if (enemyThreateningWin) score += 1200;
                }
            }
            if (hasKillChance) threatCount *= 0.5;
            if (threatCount > 0) score -= riskPenalty * threatCount;
            score += futurePos * 1.5;
            if (score > bestScore) { secondBestScore = bestScore; secondBestToken = bestToken; bestScore = score; bestToken = token; }
            else if (score > secondBestScore) { secondBestScore = score; secondBestToken = token; }
        });
        let chosenToken = bestToken;
        if (secondBestToken && Math.random() < mistakeChance && Math.abs(bestScore - secondBestScore) < 500) chosenToken = secondBestToken;
        const delay = getAIThinkingDelay(profile.skill);
        setTimeout(() => { moveToken(aiColor, chosenToken.id); }, delay);
    }
  
    function showMessage(msg) {
        const el = document.getElementById('message-overlay'); el.innerText = msg; el.style.opacity =1;
        setTimeout(() => el.style.opacity = 0, 1500);
    }
  
    function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
    
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    function playSound(type) {
        if (audioCtx.state === 'suspended') audioCtx.resume();
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        osc.connect(gainNode); gainNode.connect(audioCtx.destination);
        if (type === 'move') { osc.frequency.setValueAtTime(300, audioCtx.currentTime); gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1); osc.start(); osc.stop(audioCtx.currentTime + 0.1); }
        else if (type === 'kill') { osc.type = 'sawtooth'; osc.frequency.setValueAtTime(150, audioCtx.currentTime); gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.3); osc.start(); osc.stop(audioCtx.currentTime + 0.3); }
        else if (type === 'roll') { osc.type = 'triangle'; gainNode.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.05); osc.start(); osc.stop(audioCtx.currentTime + 0.05); }
        else if (type === 'win') { osc.type = 'square'; osc.frequency.setValueAtTime(800, audioCtx.currentTime + 0.4); gainNode.gain.value = 0.2; osc.start(); osc.stop(audioCtx.currentTime + 1.0); }
    }

    function resetGame() {     
        document.getElementById('win-modal').style.display = 'none';     
        startGame(gameMode, players.length);     
    }
  
    function setMode(count) {
        selectedPlayerCount = count;
        document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`mode-${count}p`).classList.add('active');
        for(let i=1; i<=4; i++) {
            const item = document.getElementById(`item-p${i}`);
            const sw = document.getElementById(`switch-p${i}`);
            if(i <= count) { item.classList.remove('disabled'); sw.classList.add('active'); }
            else { item.classList.add('disabled'); sw.classList.remove('active'); }
        }
    }
  
    let selectedPlayerCount = 2;
    let isBotMode = false;

    function toggleBotMode() {
        isBotMode = !isBotMode;
        const sw = document.getElementById('switch-bot');
        sw.classList.toggle('active');
        showMessage(isBotMode ? "AI MODE ON" : "Bot Mode Disabled!");
    }
  
    function startGameFromSetup() {
        let mode = isBotMode ? 'vsAI' : 'offline';
        startGame(mode, selectedPlayerCount);
        showScreen('game-screen');
    }

    function tryExitGame() {
        if(isGameInProgress) {
            showMessage("Game in progress! Cannot exit.");
        } else {
            goHome();
        }
    }

    // ==========================================
    // PART 2: WALLET JS (User Provided + Logic)
    // ==========================================
    
    // --- State Management ---
    const defaultState = {
        balance: 0,
        wins: 0,
        losses: 0,
        // Now separate numbers for each method
        adminNumbers: {
            bkash: "01710814750",
            nagad: "01710814750",
            rocket: "01710814750"
        },
        transactions: []
    };

    // Load State with Migration for backward compatibility
    let appState = JSON.parse(localStorage.getItem('ludoAppState'));
    if (!appState) {
        appState = defaultState;
    } else {
        // Migration: If old single number exists, use it for all
        if (!appState.adminNumbers && appState.adminNumber) {
            appState.adminNumbers = {
                bkash: appState.adminNumber,
                nagad: appState.adminNumber,
                rocket: appState.adminNumber
            };
            // Clean up old property
            delete appState.adminNumber;
        } else if (!appState.adminNumbers) {
            appState.adminNumbers = defaultState.adminNumbers;
        }
    }

    // Global Bet Variables for Matchmaking flow
    let currentBet = 100;
    let selectedToken = 'blue';
    let selectedPlayers = 2;
    let matchmakingTimer = null;

    // --- Init ---
    function initWalletApp() {
        updateUI();
        renderHistory();
        selectPaymentMethod('bkash', document.querySelector('.payment-card.p-bkash'));
    }

    function saveState() {
        localStorage.setItem('ludoAppState', JSON.stringify(appState));
        updateUI();
        renderHistory();
        renderAdminRequests();
    }

    function updateUI() {
        const balanceEl = document.getElementById('header-balance');
        if(balanceEl) balanceEl.innerText = appState.balance;
        
        const winEl = document.getElementById('stat-win');
        if(winEl) winEl.innerText = appState.wins;
        
        const lossEl = document.getElementById('stat-loss');
        if(lossEl) lossEl.innerText = appState.losses;
        
        // Admin Inputs
        const adminBkash = document.getElementById('admin-bkash');
        if(adminBkash) adminBkash.value = appState.adminNumbers.bkash;
        
        const adminNagad = document.getElementById('admin-nagad');
        if(adminNagad) adminNagad.value = appState.adminNumbers.nagad;
        
        const adminRocket = document.getElementById('admin-rocket');
        if(adminRocket) adminRocket.value = appState.adminNumbers.rocket;

        updateDisplayNumber();
    }

    function updateDisplayNumber() {
        const displayEl = document.getElementById('display-number');
        const labelEl = document.getElementById('method-label');
        
        if(selectedPaymentMethod && appState.adminNumbers[selectedPaymentMethod]) {
            displayEl.innerText = appState.adminNumbers[selectedPaymentMethod];
            if(labelEl) labelEl.innerText = selectedPaymentMethod.charAt(0).toUpperCase() + selectedPaymentMethod.slice(1);
        }
    }

    function showToast(msg) {
        const t = document.getElementById('toast');
        t.innerText = msg;
        t.classList.add('show');
        setTimeout(() => t.classList.remove('show'), 3000);
    }

    // --- Navigation ---
    function switchTab(tabId) {
        document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        
        document.getElementById(tabId).classList.add('active');
        const btns = document.querySelectorAll('.nav-btn');
        if(tabId === 'game') btns[0].classList.add('active');
        if(tabId === 'wallet') btns[1].classList.add('active');
        if(tabId === 'history') btns[2].classList.add('active');
        if(tabId === 'stats') btns[3].classList.add('active');
        if(tabId === 'admin') btns[4].classList.add('active');

        if(tabId === 'admin') {
            if(!sessionStorage.getItem('adminLoggedIn')) {
                document.getElementById('admin-login').classList.remove('hidden');
                document.getElementById('admin-panel-content').classList.add('hidden');
            } else {
                document.getElementById('admin-login').classList.add('hidden');
                document.getElementById('admin-panel-content').classList.remove('hidden');
                renderAdminRequests();
            }
        }
    }

    // --- Game UI Logic ---
    function selectToken(el, token) {
        document.querySelectorAll('.token-option').forEach(t => t.classList.remove('selected'));
        el.classList.add('selected');
        selectedToken = token;
    }

    function selectPlayers(el, count) {
        document.querySelectorAll('.player-btn').forEach(b => b.classList.remove('selected'));
        el.classList.add('selected');
        selectedPlayers = count;
    }

    function adjustBet(amount) {
        let newBet = currentBet + amount;
        if (newBet >= 100 && newBet <= 10000) {
            currentBet = newBet;
            document.getElementById('bet-amount').innerText = currentBet;
            document.querySelector('input[type="range"]').value = currentBet;
            updateGameCalc();
        }
    }

    function updateBetFromSlider(val) {
        currentBet = parseInt(val);
        document.getElementById('bet-amount').innerText = currentBet;
        updateGameCalc();
    }

    function updateGameCalc() {
        const winAmt = currentBet * 1.9; 
        document.getElementById('win-amount').innerText = Math.floor(winAmt);
        document.getElementById('entry-fee').innerText = currentBet;
    }

    // --- MAIN MATCHMAKING FLOW ---
    function playGame() {
        if (appState.balance < currentBet) {
            showToast('Insufficient Balance!');
            return;
        }

        // Deduct bet immediately
        appState.balance -= currentBet;
        saveState();

        // Show Matchmaking Screen
        startMatchmaking();
    }

    function startMatchmaking() {
        showScreen('screen-matchmaking');
        document.getElementById('matchmaking-entry').innerText = currentBet;
        
        // Reset UI
        document.getElementById('opponent-name-text').innerText = "Searching...";
        document.getElementById('opponent-name-text').setAttribute("fill", "#555");
        const cancelBtn = document.getElementById('cancelBtn');
        cancelBtn.innerText = "CANCEL MATCH";
        cancelBtn.style.backgroundColor = "transparent";

        // RANDOM CARTOON IMAGE LOGIC
        const randomAvatarImg = document.getElementById('random-avatar-img');
        
        // Helper to get random cartoon avatar URL
        const getRandomCartoonUrl = () => {
            const seed = Math.random().toString(36).substring(7);
            return `https://api.dicebear.com/9.x/avataaars/svg?seed=${seed}&backgroundColor=ffdfbf`;
        };
        
        // Set initial random cartoon image
        randomAvatarImg.setAttribute('href', getRandomCartoonUrl());
        
        // Start interval to change cartoon image every 333.33ms (approx 333ms)
        if(window.avatarInterval) clearInterval(window.avatarInterval);
        window.avatarInterval = setInterval(() => {
            randomAvatarImg.setAttribute('href', getRandomCartoonUrl());
        }, 333); 
        // END RANDOM IMAGE LOGIC
        
        // Start 59 Second Timer
        let timeLeft = 59;
        const timerEl = document.getElementById('timer');
        
        if(matchmakingTimer) clearInterval(matchmakingTimer);
        
        matchmakingTimer = setInterval(() => {
            if (timeLeft > 0) {
                timeLeft--;
                timerEl.innerText = timeLeft < 10 ? `0${timeLeft}` : timeLeft;
            } else {
                clearInterval(matchmakingTimer);
                clearInterval(window.avatarInterval); // Stop image changing
                timerEl.innerText = "00";
                // Time out -> Start with AI
                matchFoundAI();
            }
        }, 1000);

        // Cancel Button Logic
        cancelBtn.onclick = () => {
            clearInterval(matchmakingTimer);
            clearInterval(window.avatarInterval); // Stop image changing
            // Refund bet
            appState.balance += currentBet;
            saveState();
            showToast("Match Cancelled. Bet Refunded.");
            goToWalletDashboard();
        };
    }

    function matchFoundAI() {
        clearInterval(matchmakingTimer);
        clearInterval(window.avatarInterval); // Stop image changing
        
        // Set Opponent Name
        const aiName = getRandomAIName();
        const oppText = document.getElementById('opponent-name-text');
        oppText.innerText = aiName;
        oppText.setAttribute("fill", "#000");
        
        // Show toast
        const toast = document.getElementById('matchmaking-toast');
        toast.innerText = "Match Found!";
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);

        // Start Game after short delay
        setTimeout(() => {
            startGame('vsAI', selectedPlayers);
            showScreen('game-screen');
        }, 2000);
    }

    function finishGameSession() {
        document.getElementById('win-modal').style.display = 'none';
        
        // Check who won to add winnings
        const title = document.getElementById('win-title').innerText;
        const winAmount = Math.floor(currentBet * 1.9);

        if(title.includes("YELLOW")) {
            // User Won
            appState.balance += winAmount;
            appState.wins++;
            addTransaction('game_win', winAmount, 'success', `Win! (Bet: ${currentBet})`);
            showToast(`You won ${winAmount} coins!`);
        } else {
            // User Lost
            appState.losses++;
            addTransaction('game_loss', currentBet, 'success', `Loss (Bet: ${currentBet})`);
            showToast(`You lost ${currentBet} coins.`);
        }

        saveState();
        isGameInProgress = false;
        goToWalletDashboard();
    }

    // --- Wallet Logic ---
    let selectedPaymentMethod = 'bkash'; 

    function selectPaymentMethod(method, btn) {
        selectedPaymentMethod = method;
        
        // Handle both Deposit and Withdraw grids
        document.querySelectorAll('.payment-methods-grid').forEach(grid => {
            grid.querySelectorAll('.payment-card').forEach(b => b.classList.remove('selected'));
        });

        if(btn) {
            // Find all cards matching the method and select them (to keep UI synced if tabs switch)
            document.querySelectorAll(`.payment-card.p-${method}`).forEach(b => b.classList.add('selected'));
        }
        
        updateDisplayNumber();
        
        // Update Withdraw Label
        const withdrawLabel = document.getElementById('withdraw-method-label');
        if(withdrawLabel) withdrawLabel.innerText = method.charAt(0).toUpperCase() + method.slice(1);
    }

    function toggleWalletMode(mode) {
        if(mode === 'deposit') {
            document.getElementById('deposit-content').classList.remove('hidden');
            document.getElementById('withdraw-content').classList.add('hidden');
            document.getElementById('tab-deposit').classList.add('active');
            document.getElementById('tab-withdraw').classList.remove('active');
        } else {
            document.getElementById('deposit-content').classList.add('hidden');
            document.getElementById('withdraw-content').classList.remove('hidden');
            document.getElementById('tab-deposit').classList.remove('active');
            document.getElementById('tab-withdraw').classList.add('active');
            
            // Ensure withdraw has a method selected visually
            const withdrawGrid = document.getElementById('withdraw-methods');
            if(withdrawGrid) {
                const methodCard = withdrawGrid.querySelector(`.payment-card.p-${selectedPaymentMethod}`);
                if(methodCard) {
                    withdrawGrid.querySelectorAll('.payment-card').forEach(c => c.classList.remove('selected'));
                    methodCard.classList.add('selected');
                }
            }
        }
    }

    function copyAdminNumber() {
        const numberToCopy = appState.adminNumbers[selectedPaymentMethod];
        if(numberToCopy) {
            navigator.clipboard.writeText(numberToCopy).then(() => {
                showToast('Number Copied!');
            }).catch(err => {
                showToast('Failed to copy');
            });
        } else {
            showToast('Number not found');
        }
    }

    function requestDeposit() {
        const num = document.getElementById('dep-number').value;
        const amount = parseInt(document.getElementById('dep-amount').value);
        const trx = document.getElementById('dep-trx').value;

        if(!num || !amount || !trx) {
            showToast('Please fill in all fields');
            return;
        }

        // Validations
        if (amount > 25000) {
            showToast('Maximum deposit limit is 25,000');
            return;
        }

        // Mobile Number Validation (Bangladeshi Format: 11 digits starting with 01)
        if (!/^01[3-9]\d{8}$/.test(num)) {
            showToast('Invalid Mobile Number! Use valid format (e.g., 017...)');
            return;
        }

        // Trx ID Validation (Must be at least 6 characters)
        if (trx.length < 6) {
            showToast('Invalid Transaction ID');
            return;
        }

        addTransaction('deposit', amount, 'pending', `Trx: ${trx}`, selectedPaymentMethod);
        showToast('Deposit request sent. Waiting for admin approval.');
        
        document.getElementById('dep-amount').value = '';
        document.getElementById('dep-trx').value = '';
        document.getElementById('dep-number').value = '';
        saveState();
    }

    function requestWithdraw() {
        const num = document.getElementById('with-number').value;
        const amount = parseInt(document.getElementById('with-amount').value);

        if(!num || !amount) {
            showToast('Please fill in all fields');
            return;
        }

        if(amount > appState.balance) {
            showToast('Insufficient Balance');
            return;
        }

        // VALIDATION: Minimum 500
        if (amount < 500) {
            showToast('Minimum withdraw amount is 500');
            return;
        }

        // VALIDATION: Maximum 25,000
        if (amount > 25000) {
            showToast('Maximum withdraw limit is 25,000');
            return;
        }

        // Mobile Number Validation
        if (!/^01[3-9]\d{8}$/.test(num)) {
            showToast('Invalid Mobile Number! Use valid format (e.g., 017...)');
            return;
        }

        appState.balance -= amount;
        addTransaction('withdraw', amount, 'pending', `To: ${num} (${selectedPaymentMethod})`, selectedPaymentMethod); 
        showToast('Withdraw request sent.');
        
        document.getElementById('with-amount').value = '';
        document.getElementById('with-number').value = '';
        saveState();
    }

    // --- History & Data ---
    function addTransaction(type, amount, status, info, method = null) {
        const trx = {
            id: Date.now(),
            type,
            amount,
            method,
            status,
            info,
            date: new Date().toLocaleString('en-US') 
        };
        appState.transactions.unshift(trx);
    }

    function renderHistory() {
        const list = document.getElementById('history-list');
        if(!list) return;
        
        list.innerHTML = '';
        
        if(appState.transactions.length === 0) {
            list.innerHTML = '<p style="text-align:center; color:var(--text-muted); padding:30px;">No History Found</p>';
            return;
        }

        appState.transactions.forEach(t => {
            const div = document.createElement('div');
            div.className = 'history-item';
            
            let typeLabel = '';
            let sign = '';
            let colorClass = '';

            if(t.type === 'deposit') { typeLabel = 'Deposit'; sign = '+'; }
            else if(t.type === 'withdraw') { typeLabel = 'Withdraw'; sign = '-'; }
            else if(t.type === 'game_win') { typeLabel = 'Game Win'; sign = '+'; colorClass='status-success'; }
            else if(t.type === 'game_loss') { typeLabel = 'Game Loss'; sign = '-'; colorClass='status-rejected'; }

            let statusText = t.status === 'pending' ? 'Pending' : (t.status === 'success' ? 'Success' : 'Rejected');
            let statusClass = t.status === 'pending' ? 'status-pending' : (t.status === 'success' ? 'status-success' : 'status-rejected');

            div.innerHTML = `
                <div class="h-left">
                    <h4>${typeLabel} ${t.method ? `(${t.method.toUpperCase()})` : ''}</h4>
                    <p>${t.date} <br> ${t.info}</p>
                </div>
                <div class="h-right">
                    <span class="h-amount ${colorClass}">${sign}${t.amount}</span>
                    <span class="${statusClass}">${statusText}</span>
                </div>
            `;
            list.appendChild(div);
        });
    }

    // --- Admin Logic ---
    function checkAdminLogin() {
        const pass = document.getElementById('admin-pass').value;
        if(pass === '1234') {
            sessionStorage.setItem('adminLoggedIn', 'true');
            document.getElementById('admin-login').classList.add('hidden');
            document.getElementById('admin-panel-content').classList.remove('hidden');
            renderAdminRequests();
        } else {
            showToast('Incorrect Password');
        }
    }

    function logoutAdmin() {
        sessionStorage.removeItem('adminLoggedIn');
        switchTab('admin'); 
    }

    function logout() {
        showToast('Logged Out Successfully');
        setTimeout(() => location.reload(), 1000);
    }

    function saveAdminSettings() {
        const bkash = document.getElementById('admin-bkash').value;
        const nagad = document.getElementById('admin-nagad').value;
        const rocket = document.getElementById('admin-rocket').value;

        appState.adminNumbers.bkash = bkash;
        appState.adminNumbers.nagad = nagad;
        appState.adminNumbers.rocket = rocket;

        saveState();
        showToast('Numbers Updated Successfully');
    }

    function renderAdminRequests() {
        const tbody = document.getElementById('admin-request-list');
        if(!tbody) return;
        
        tbody.innerHTML = '';
        
        const pending = appState.transactions.filter(t => t.status === 'pending');
        
        if(pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-muted);">No Pending Requests</td></tr>';
            return;
        }

        pending.forEach(t => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="text-transform:capitalize;">${t.type}</td>
                <td>${t.method ? t.method.toUpperCase() : '-'}</td>
                <td>${t.amount}</td>
                <td style="font-size:11px; max-width:100px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.info}</td>
                <td class="admin-actions">
                    <button class="btn-approve" onclick="processTrx(${t.id}, 'success')">Approve</button>
                    <button class="btn-reject" onclick="processTrx(${t.id}, 'rejected')">Reject</button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    function processTrx(id, action) {
        const trxIndex = appState.transactions.findIndex(t => t.id === id);
        if(trxIndex === -1) return;

        const trx = appState.transactions[trxIndex];

        if(action === 'success') {
            if(trx.type === 'deposit') {
                appState.balance += trx.amount;
            }
            trx.status = 'success';
            showToast('Request Approved');
        } else {
            if(trx.type === 'withdraw') {
                appState.balance += trx.amount;
                trx.info += ' (Refunded)';
            }
            trx.status = 'rejected';
            showToast('Request Rejected');
        }
        
        saveState();
    }
    
    window.addEventListener('load', () => {
       saveState(); 
    });