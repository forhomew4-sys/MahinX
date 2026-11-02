// --- 1. TELEGRAM WEBAPP INTEGRATION ---
const tg = window.Telegram?.WebApp;
const telegramUser = tg?.initDataUnsafe?.user;

function notifySuccess() {
  if (tg?.isVersionAtLeast?.("6.1")) {
    tg.HapticFeedback.notificationOccurred("success");
  }
}

if (tg) {
  tg.ready();
  tg.expand();
  if (tg.isVersionAtLeast?.("6.1")) {
    tg.setHeaderColor("#080b12");
    tg.setBackgroundColor("#080b12");
  }

  if (telegramUser) {
    document.getElementById("u-name").textContent =
      [telegramUser.first_name, telegramUser.last_name].filter(Boolean).join(" ") || "Player";
    document.getElementById("u-id").textContent = telegramUser.username
      ? `@${telegramUser.username}`
      : `ID: ${telegramUser.id}`;
    document.getElementById("avatar").textContent =
      (telegramUser.first_name || "U").charAt(0).toUpperCase();
  }
}

// --- 2. COINS / POINTS PERSISTENCE ---
const playerKey = telegramUser?.id ?? "guest";
const coinsStorageKey = `mahinx_coins_${playerKey}`;
const pendingCoinsStorageKey = `mahinx_pending_coins_${playerKey}`;
let coins = Number.parseInt(localStorage.getItem(coinsStorageKey) ?? "100", 10);
if (!Number.isSafeInteger(coins) || coins < 0) coins = 100;
let pendingCoins = Number.parseInt(localStorage.getItem(pendingCoinsStorageKey) ?? "0", 10);
if (!Number.isSafeInteger(pendingCoins) || pendingCoins < 0) pendingCoins = 0;

function updateCoins(amount) {
  if (!Number.isSafeInteger(amount) || amount < 0 || !Number.isSafeInteger(coins + amount)) {
    return false;
  }
  coins += amount;
  localStorage.setItem(coinsStorageKey, String(coins));
  document.getElementById("coin-txt").textContent = String(coins);
  return true;
}

function updatePendingCoins(amount) {
  if (!Number.isSafeInteger(amount) || amount <= 0 ||
      !Number.isSafeInteger(pendingCoins + amount)) return;
  pendingCoins += amount;
  localStorage.setItem(pendingCoinsStorageKey, String(pendingCoins));
  renderPendingReward();
}

function renderPendingReward() {
  const claimButton = document.getElementById("claim-reward");
  claimButton.hidden = pendingCoins === 0;
  claimButton.textContent = `Claim game reward (${pendingCoins} coins)`;
}

document.getElementById("claim-reward").addEventListener("click", () => {
  if (pendingCoins === 0 || !updateCoins(pendingCoins)) return;
  pendingCoins = 0;
  localStorage.setItem(pendingCoinsStorageKey, "0");
  renderPendingReward();
  document.getElementById("ad-status").textContent = "গেমের কয়েন আপনার balance-এ যোগ হয়েছে।";
  notifySuccess();
});

document.getElementById("coin-txt").textContent = String(coins);
renderPendingReward();

// --- 3. ADSGRAM INTEGRATION ---
const ADSGRAM_BLOCKS = {
  reward: "57505",
  interstitial: "int-57506"
};
const AdControllers = window.Adsgram
  ? Object.fromEntries(
      Object.entries(ADSGRAM_BLOCKS).map(([format, blockId]) => [
        format,
        window.Adsgram.init({ blockId, debug: false })
      ])
    )
  : {};

document.getElementById("show-ad").addEventListener("click", () => {
  if (!AdControllers.reward) {
    document.getElementById("ad-status").textContent = "Reward ad লোড হয়নি। পরে আবার চেষ্টা করুন।";
    return;
  }
  const adButton = document.getElementById("show-ad");
  adButton.disabled = true;
  document.getElementById("ad-status").textContent = "বিজ্ঞাপন লোড হচ্ছে...";
  AdControllers.reward.show()
    .then(() => {
      updateCoins(100);
      document.getElementById("ad-status").textContent = "সফল! ১০০ কয়েন যোগ হয়েছে।";
      notifySuccess();
    })
    .catch((err) => {
      document.getElementById("ad-status").textContent =
        "বিজ্ঞাপন দেখানো যায়নি। পরে আবার চেষ্টা করুন।";
      console.error(err);
    })
    .finally(() => {
      adButton.disabled = false;
    });
});

const taskStatus = document.getElementById("task-status");
if (tg?.initData && customElements.get("adsgram-task")) {
  const taskAd = document.createElement("adsgram-task");
  taskAd.id = "task-ad";
  taskAd.dataset.blockId = "task-57507";
  taskAd.addEventListener("reward", () => {
    updateCoins(50);
    taskStatus.textContent = "Task সম্পন্ন! ৫০ কয়েন balance-এ যোগ হয়েছে।";
    notifySuccess();
  });
  taskAd.addEventListener("onBannerNotFound", () => {
    taskStatus.textContent = "এখন কোনো Task ad নেই। পরে আবার চেষ্টা করুন।";
  });
  taskAd.addEventListener("onError", (event) => {
    taskStatus.textContent = "Task ad লোড করা যায়নি।";
    console.error("Adsgram task failed:", event.detail);
  });
  document.getElementById("task-ad-slot").appendChild(taskAd);
} else {
  taskStatus.textContent = "Task ad দেখতে Telegram Mini App খুলুন।";
}

let completedRounds = 0;
function finishGameRound() {
  completedRounds++;
  if (completedRounds < 3) return;
  completedRounds = 0;

  if (!AdControllers.interstitial) return;
  AdControllers.interstitial.show().catch((err) => {
    console.error("Adsgram interstitial failed:", err);
  });
}

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
let aiTimer = null;
const tttGrid = document.getElementById("ttt-grid");

function renderTTT() {
  tttGrid.innerHTML = "";
  tttBoard.forEach((val, i) => {
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = `ttt-cell ${val}`;
    cell.textContent = val;
    cell.disabled = val !== "" || !tttActive;
    cell.setAttribute("aria-label", val ? `ঘর ${i + 1}: ${val}` : `ঘর ${i + 1}, খালি`);
    cell.onclick = () => playerMove(i);
    tttGrid.appendChild(cell);
  });
}

function playerMove(i) {
  if (tttBoard[i] !== "" || !tttActive) return;
  tttBoard[i] = "X";
  tttActive = false;

  if (checkWinner("X")) {
    renderTTT();
    document.getElementById("ttt-status").innerText = "আপনি জিতেছেন! (+30 coins — claim করুন)";
    updatePendingCoins(30);
    finishGameRound();
    return;
  }
  if (!tttBoard.includes("")) {
    renderTTT();
    document.getElementById("ttt-status").innerText = "ম্যাচ ড্র হয়েছে!";
    finishGameRound();
    return;
  }

  renderTTT();
  document.getElementById("ttt-status").innerText = "AI move dichhe...";
  aiTimer = setTimeout(aiMove, 350);
}

function aiMove() {
  aiTimer = null;
  if (tttActive) return;

  let bestScore = -Infinity;
  let bestMoves = [];
  tttBoard.forEach((value, index) => {
    if (value !== "") return;
    tttBoard[index] = "O";
    const score = minimax(false, 0);
    tttBoard[index] = "";
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [index];
    } else if (score === bestScore) {
      bestMoves.push(index);
    }
  });
  if (bestMoves.length === 0) return;

  const pick = bestMoves[Math.floor(Math.random() * bestMoves.length)];
  tttBoard[pick] = "O";
  if (checkWinner("O")) {
    renderTTT();
    document.getElementById("ttt-status").innerText = "AI জিতেছে! আবার চেষ্টা করুন।";
    finishGameRound();
    return;
  }
  if (!tttBoard.includes("")) {
    renderTTT();
    document.getElementById("ttt-status").innerText = "ম্যাচ ড্র হয়েছে!";
    finishGameRound();
    return;
  }

  tttActive = true;
  renderTTT();
  document.getElementById("ttt-status").innerText = "আপনার চাল (X)";
}

function minimax(isMaximizing, depth) {
  if (checkWinner("O")) return 10 - depth;
  if (checkWinner("X")) return depth - 10;
  if (!tttBoard.includes("")) return 0;

  let bestScore = isMaximizing ? -Infinity : Infinity;
  tttBoard.forEach((value, index) => {
    if (value !== "") return;
    tttBoard[index] = isMaximizing ? "O" : "X";
    const score = minimax(!isMaximizing, depth + 1);
    tttBoard[index] = "";
    bestScore = isMaximizing
      ? Math.max(bestScore, score)
      : Math.min(bestScore, score);
  });
  return bestScore;
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
  if (aiTimer !== null) {
    clearTimeout(aiTimer);
    aiTimer = null;
  }
  tttBoard = ["", "", "", "", "", "", "", "", ""];
  tttActive = true;
  document.getElementById("ttt-status").innerText = "আপনার চাল (X)";
  renderTTT();
}
renderTTT();

// --- GAME 2: COIN FLIP ---
function flipCoin(choice) {
  const result = Math.random() < 0.5 ? "Head" : "Tail";
  document.getElementById("coin-anim").innerText = "🪙";
  if (choice === result) {
    document.getElementById("coin-status").innerText =
      `ফলাফল: ${result}! সঠিক অনুমান (+20 coins — claim করুন)`;
    updatePendingCoins(20);
  } else {
    document.getElementById("coin-status").innerText =
      `ফলাফল: ${result}! ভুল হয়েছে, আবার চেষ্টা করুন।`;
  }
  finishGameRound();
}

// --- GAME 3: GUESS NUMBER ---
let secretNum = Math.floor(Math.random() * 10) + 1;

function checkGuess() {
  const input = document.getElementById("guess-input");
  const val = Number(input.value);
  if (!Number.isInteger(val) || val < 1 || val > 10) {
    document.getElementById("guess-status").innerText = "1 theke 10 er moddhe number dao!";
    return;
  }
  if (val === secretNum) {
    document.getElementById("guess-status").innerText =
      `সঠিক! সংখ্যাটি ছিল ${secretNum} (+30 coins — claim করুন)`;
    updatePendingCoins(30);
    finishGameRound();
    secretNum = Math.floor(Math.random() * 10) + 1;
    input.value = "";
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
    document.getElementById("dice-status").innerText = "ছক্কা (৬)! (+50 coins — claim করুন)";
    updatePendingCoins(50);
  } else {
    document.getElementById("dice-status").innerText = `উঠেছে: ${num}। ছক্কা এলে bonus পাবেন!`;
  }
  finishGameRound();
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
        updatePendingCoins(earned);
        document.getElementById("tap-status").innerText =
          `সময় শেষ! ${tapCount} বার tap করেছেন (+${earned} coins — claim করুন)`;
        finishGameRound();
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
