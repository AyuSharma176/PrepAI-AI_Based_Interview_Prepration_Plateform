/* ── Game state ─────────────────────────────────── */
const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

const HUMAN = 'X';
const AI    = 'O';

let cells   = Array(9).fill(null);
let active  = true;   // false while AI is thinking or game over
let score   = { X: 0, O: 0, D: 0 };

/* ── DOM refs ───────────────────────────────────── */
const boardEl        = document.getElementById('board');
const turnBanner     = document.getElementById('turn-banner');
const currentTurnTxt = document.getElementById('current-turn-text');
const resultEl       = document.getElementById('game-result');
const resultText     = document.getElementById('result-text');
const restartBtn     = document.getElementById('restart');
const scoreXEl       = document.getElementById('score-x-num');
const scoreOEl       = document.getElementById('score-o-num');
const scoreDEl       = document.getElementById('score-d-num');
const scoreBoxX      = document.getElementById('score-x');
const scoreBoxO      = document.getElementById('score-o');

/* Status panel */
const dot         = document.getElementById('dot');
const statusLabel = document.getElementById('status-label');
const progressBar = document.getElementById('progress-bar');
const readyMsg    = document.getElementById('ready-msg');
const continueBtn = document.getElementById('continue-btn');

/* ── Render board ───────────────────────────────── */
function renderBoard(winCells = []) {
  boardEl.innerHTML = '';
  cells.forEach((val, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell' +
      (val ? ' filled' : '') +
      (val === HUMAN ? ' x-cell' : val === AI ? ' o-cell' : '') +
      (winCells.includes(idx) ? ' win-cell' : '');
    cell.textContent = val || '';
    if (!val && active) cell.addEventListener('click', () => handleHumanClick(idx));
    boardEl.appendChild(cell);
  });
}

/* ── Human move ─────────────────────────────────── */
function handleHumanClick(idx) {
  if (!active || cells[idx]) return;

  cells[idx] = HUMAN;
  const winLine = getWinLine(HUMAN);
  if (endGame(winLine, HUMAN)) return;

  // Hand off to AI
  active = false;
  updateTurnUI(false);
  renderBoard();
  setTimeout(aiMove, 420);
}

/* ── AI move (minimax) ──────────────────────────── */
function aiMove() {
  const best = bestMove();
  cells[best] = AI;
  const winLine = getWinLine(AI);
  active = true;
  if (endGame(winLine, AI)) return;
  updateTurnUI(true);
  renderBoard();
}

function bestMove() {
  // If board is empty pick a random corner/centre for variety
  const empty = cells.map((v,i) => v === null ? i : -1).filter(i => i !== -1);
  if (empty.length === 9) return [0,2,4,6,8][Math.floor(Math.random()*5)];

  let bestScore = -Infinity;
  let move = empty[0];
  for (const idx of empty) {
    cells[idx] = AI;
    const s = minimax(cells, 0, false);
    cells[idx] = null;
    if (s > bestScore) { bestScore = s; move = idx; }
  }
  return move;
}

function minimax(board, depth, isMaximising) {
  if (getWinLine(AI))    return 10 - depth;
  if (getWinLine(HUMAN)) return depth - 10;
  const empty = board.filter(v => v === null);
  if (!empty.length) return 0;

  if (isMaximising) {
    let best = -Infinity;
    board.forEach((v, i) => {
      if (v !== null) return;
      board[i] = AI;
      best = Math.max(best, minimax(board, depth + 1, false));
      board[i] = null;
    });
    return best;
  } else {
    let best = Infinity;
    board.forEach((v, i) => {
      if (v !== null) return;
      board[i] = HUMAN;
      best = Math.min(best, minimax(board, depth + 1, true));
      board[i] = null;
    });
    return best;
  }
}

/* ── Win / draw detection ───────────────────────── */
function getWinLine(player) {
  return WIN_PATTERNS.find(p => p.every(i => cells[i] === player)) || null;
}

function endGame(winLine, player) {
  if (winLine) {
    renderBoard(winLine);
    score[player]++;
    updateScore();
    const msg = player === HUMAN ? '🎉 You win!' : '🤖 AI wins!';
    showResult(msg);
    active = false;
    return true;
  }
  if (cells.every(c => c)) {
    renderBoard();
    score.D++;
    updateScore();
    showResult("It's a draw!");
    active = false;
    return true;
  }
  return false;
}

/* ── UI helpers ─────────────────────────────────── */
function updateTurnUI(isHumanTurn = true) {
  if (isHumanTurn) {
    currentTurnTxt.textContent = 'Your turn';
    currentTurnTxt.className   = 'x-color';
  } else {
    currentTurnTxt.textContent = 'AI thinking…';
    currentTurnTxt.className   = 'o-color';
  }
  scoreBoxX.classList.toggle('active-turn', isHumanTurn);
  scoreBoxO.classList.toggle('active-turn', !isHumanTurn);
}

function updateScore() {
  scoreXEl.textContent = score.X;
  scoreOEl.textContent = score.O;
  scoreDEl.textContent = score.D;
}

function showResult(msg) {
  resultText.textContent = msg;
  resultEl.classList.remove('hidden');
  turnBanner.style.opacity = '0.3';
}

/* ── Restart ────────────────────────────────────── */
restartBtn.addEventListener('click', () => {
  cells  = Array(9).fill(null);
  active = true;
  resultEl.classList.add('hidden');
  turnBanner.style.opacity = '1';
  updateTurnUI(true);
  renderBoard();
});

/* ── Init ───────────────────────────────────────── */
updateTurnUI(true);
renderBoard();

/* ── Backend readiness polling via /health ──────── */
let elapsed = 0;
const POLL_INTERVAL    = 3000;
const FAKE_FILL_PER_TICK = 3;

function advanceProgress() {
  elapsed = Math.min(elapsed + FAKE_FILL_PER_TICK, 90);
  progressBar.style.width = elapsed + '%';
}

function onReady() {
  progressBar.style.width = '100%';
  dot.classList.remove('dot--spinning');
  dot.classList.add('dot--ready');
  statusLabel.textContent = 'Server is awake!';
  readyMsg.classList.remove('hidden');
  continueBtn.classList.remove('hidden');
}

function pollHealth() {
  advanceProgress();
  fetch('/health', { cache: 'no-store' })
    .then(res => res.ok ? res.json() : Promise.reject(new Error(res.status)))
    .then(data => {
      if (data.status === 'ok') { onReady(); }
      else { setTimeout(pollHealth, POLL_INTERVAL); }
    })
    .catch(() => setTimeout(pollHealth, POLL_INTERVAL));
}

setTimeout(pollHealth, 1500);

continueBtn.addEventListener('click', () => {
  window.location.href = '/home';
});

