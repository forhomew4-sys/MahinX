// --- 1. TELEGRAM WEBAPP INTEGRATION ---
const tg = window.Telegram?.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  if (tg.initDataUnsafe && tg.initDataUnsafe.user) {
    const user = tg.initDataUnsafe.user;
    document.getElementById("u-name").innerText = user.first_name + (user.last_name ? ' ' + user.last_name : '');
    document.getElementById("u-id").innerText = user.username ? `@${user.username}` : `ID: ${user.id}`;
    document.getElementById("avatar").innerText = (user.first_name || "U")[0].toUpperCase();
  }
}

// --- 2. COINS / POINTS PERSISTENCE ---
let coins = parseInt(localStorage.getItem("mahinx_coins") || "100");

function updateCoins(amount) {
  coins += amount;
  localStorage.setItem("mahinx_coins", coins);
  document.getElementById("coin-txt").innerText = coins;
}
updateCoins(0);

// --- 3. ADSGRAM INTEGRATION ---
// partner.adsgram.ai theke pawa Block ID eikhane boshate hobe
const ADSGRAM_BLOCK_ID = "YOUR_BLOCK_ID_HERE";

const AdController = window.Adsgram ? window.Adsgram.init({
  blockId: ADSGRAM_BLOCK_ID,
  debug: false
}) : null;

document.getElementById("show-ad").addEventListener("click", () => {
  if (!AdController) {
    alert("Adsgram SDK load hoyni ba Block ID set kora hoyni.");
    return;
  }
  AdController.show()
    .then(() => {
      updateCoins(100);
      alert("Shabash! 100 Coins reward jog hoyeche.");
      if (tg?.HapticFeedback) tg.HapticFeedback.notificationOccurred("success");
    })
    .catch((err) => {
      alert("Ad show kora jaini ba user skip koreche.");
      console.error(err);
    });
});

// --- 4. TAB NAVIGATION ---
function switchGame(gameId, buttonElement) {
  document.querySelectorAll(".game-view").forEach(el => el.classList.remove("active"));
  document.querySelectorAll(".tab-btn").forEach(el => el.classList.remove("active"));
  document.getElementById(`view-${gameId}`).classList.add("active");
  buttonElement.classList.add("active");
}

// --- GAME 1: TIC-TAC-TOE (X vs O) ---
let tttBoard = ["", "", "", "", "", "", "", "", ""];
let tttActive = true;
const tttGrid = document.getElementById("ttt-grid");

function renderTTT() {
  tttGrid.innerHTML = "";
  tttBoard.forEach((val, i) => {
    const cell = document.createElement("div");
    cell.className = `ttt-cell ${val}`;
    cell.innerText = val;
    cell.onclick = () => playerMove(i);
    tttGrid.appendChild(cell);
  });
}

function playerMove(i) {
  if (tttBoard[i] !== "" || !tttActive) return;
  tttBoard[i] = "X";
  renderTTT();

  if (checkWinner("X")) {
    document.getElementById("ttt-status").innerText = "Tumi jite gecho! (+30 coins)";
    updateCoins(30);
    tttActive = false;
    return;
  }
  if (!tttBoard.includes("")) {
    document.getElementById("ttt-status").innerText = "Match Draw hoyeche!";
    tttActive = false;
    return;
  }

  tttActive = false;
  document.getElementById("ttt-status").innerText = "AI move dichhe...";
  setTimeout(aiMove, 350);
}

function aiMove() {
  let emptyCells = tttBoard.map((v, i) => v === "" ? i : null).filter(v => v !== null);
  if (emptyCells.length > 0) {
    let pick = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    tttBoard[pick] = "O";
    renderTTT();
    if (checkWinner("O")) {
      document.getElementById("ttt-status").innerText = "AI jite geche! Abar chesta koro.";
      tttActive = false;
      return;
    }
  }
  tttActive = true;
  document.getElementById("ttt-status").innerText = "Tomar turn (X)";
}

function checkWinner(p) {
  const lines = [
    [0,1,2],[3,4,5],[6,7,8],
    [0,3,6],[1,4,7],[2,5,8],
    [0,4,8],[2,4,6]
  ];
  return lines.some(line => line.every(index => tttBoard[index] === p));
}

function resetTTT() {
  tttBoard = ["", "", "", "", "", "", "", "", ""];
  tttActive = true;
  document.getElementById("ttt-status").innerText = "Tomar turn (X)";
  renderTTT();
}
renderTTT();

// --- GAME 2: COIN FLIP ---
function flipCoin(choice) {
  const result = Math.random() < 0.5 ? "Head" : "Tail";
  document.getElementById("coin-anim").innerText = "🪙";
  if (choice === result) {
    document.getElementById("coin-status").innerText = `Result: ${result}! Sothik guess (+20 coins)`;
    updateCoins(20);
  } else {
    document.getElementById("coin-status").innerText = `Result: ${result}! Vul hoyeche, abar try koro.`;
  }
}

// --- GAME 3: GUESS NUMBER ---
let secretNum = Math.floor(Math.random() * 10) + 1;

function checkGuess() {
  const val = parseInt(document.getElementById("guess-input").value);
  if (!val || val < 1 || val > 10) {
    document.getElementById("guess-status").innerText = "1 theke 10 er moddhe number dao!";
    return;
  }
  if (val === secretNum) {
    document.getElementById("guess-status").innerText = `Correct! Number chilo ${secretNum} (+30 coins)`;
    updateCoins(30);
    secretNum = Math.floor(Math.random() * 10) + 1;
    document.getElementById("guess-input").value = "";
  } else if (val < secretNum) {
    document.getElementById("guess-status").innerText = "Number ti aro boro, abar try koro.";
  } else {
    document.getElementById("guess-status").innerText = "Number ti aro choto, abar try koro.";
  }
}

// --- GAME 4: LUCKY DICE ---
const diceFaces = ["⚀", "⚁", "⚂", "⚃", "⚄", "⚅"];

function rollDice() {
  const num = Math.floor(Math.random() * 6) + 1;
  document.getElementById("dice-face").innerText = diceFaces[num - 1];
  if (num === 6) {
    document.getElementById("dice-status").innerText = "Chhokka (6) utheche! (+50 coins)";
    updateCoins(50);
  } else {
    document.getElementById("dice-status").innerText = `Utheche: ${num}। Chhokka ashle bonus pabe!`;
  }
}

// --- GAME 5: TAP RUSH ---
let tapCount = 0;
let tapTimer = 5;
let tapActive = false;
let tapInterval = null;

function handleTap() {
  if (!tapActive && tapTimer === 5) {
    tapActive = true;
    tapCount = 1;
    document.getElementById("tap-count").innerText = tapCount;
    tapInterval = setInterval(() => {
      tapTimer--;
      document.getElementById("tap-timer").innerText = `Time: ${tapTimer}s`;
      if (tapTimer <= 0) {
        clearInterval(tapInterval);
        tapActive = false;
        let earned = Math.floor(tapCount / 2);
        updateCoins(earned);
        document.getElementById("tap-status").innerText = `Time over! Tumi ${tapCount} ta tap diyecho (+${earned} coins)`;
        setTimeout(() => {
          tapTimer = 5;
          tapCount = 0;
          document.getElementById("tap-timer").innerText = "Time: 5s";
          document.getElementById("tap-count").innerText = "0";
        }, 2500);
      }
    }, 1000);
  } else if (tapActive) {
    tapCount++;
    document.getElementById("tap-count").innerText = tapCount;
  }
}
