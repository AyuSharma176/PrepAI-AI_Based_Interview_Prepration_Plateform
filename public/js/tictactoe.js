/* ── Game state ─────────────────────────────────── */
const WIN_PATTERNS = [
  [0,1,2],[3,4,5],[6,7,8],
  [0,3,6],[1,4,7],[2,5,8],
  [0,4,8],[2,4,6]
];

let cells       = Array(9).fill(null);
let current     = 'X';
let active      = true;
let score       = { X: 0, O: 0, D: 0 };

/* ── DOM refs ───────────────────────────────────── */
const boardEl      = document.getElementById('board');
const turnBanner   = document.getElementById('turn-banner');
const currentTurn  = document.getElementById('current-turn');
const resultEl     = document.getElementById('game-result');
const resultText   = document.getElementById('result-text');
const restartBtn   = document.getElementById('restart');
const scoreXEl     = document.getElementById('score-x-num');
const scoreOEl     = document.getElementById('score-o-num');
const scoreDEl     = document.getElementById('score-d-num');
const scoreBoxX    = document.getElementById('score-x');
const scoreBoxO    = document.getElementById('score-o');

/* Status panel */
const dot          = document.getElementById('dot');
const statusLabel  = document.getElementById('status-label');
const progressBar  = document.getElementById('progress-bar');
const readyMsg     = document.getElementById('ready-msg');
const continueBtn  = document.getElementById('continue-btn');

/* ── Render board ───────────────────────────────── */
function renderBoard(winCells = []) {
  boardEl.innerHTML = '';
  cells.forEach((val, idx) => {
    const cell = document.createElement('div');
    cell.className = 'cell' +
      (val ? ' filled' : '') +
      (val === 'X' ? ' x-cell' : val === 'O' ? ' o-cell' : '') +
      (winCells.includes(idx) ? ' win-cell' : '');
    cell.textContent = val || '';
    if (!val) cell.addEventListener('click', () => handleClick(idx));
    boardEl.appendChild(cell);
  });
}

/* ── Handle click ───────────────────────────────── */
function handleClick(idx) {
  if (!active || cells[idx]) return;
  cells[idx] = current;

  const winLine = getWinLine(current);
  if (winLine) {
    renderBoard(winLine);
    score[current]++;
    updateScore();
    showResult(`Player ${current} wins! 🎉`);
    active = false;
    return;
  }

  if (cells.every(c => c)) {
    renderBoard();
    score.D++;
    updateScore();
    showResult("It's a draw!");
    active = false;
    return;
  }

  current = current === 'X' ? 'O' : 'X';
  renderBoard();
  updateTurnUI();
}

/* ── Win detection ──────────────────────────────── */
function getWinLine(player) {
  return WIN_PATTERNS.find(p => p.every(i => cells[i] === player)) || null;
}

/* ── UI helpers ─────────────────────────────────── */
function updateTurnUI() {
  currentTurn.textContent = current;
  currentTurn.className = current === 'X' ? 'x-color' : 'o-color';
  scoreBoxX.classList.toggle('active-turn', current === 'X');
  scoreBoxO.classList.toggle('active-turn', current === 'O');
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
  cells   = Array(9).fill(null);
  current = 'X';
  active  = true;
  resultEl.classList.add('hidden');
  turnBanner.style.opacity = '1';
  updateTurnUI();
  renderBoard();
});

/* ── Init ───────────────────────────────────────── */
updateTurnUI();
renderBoard();

/* ── Backend readiness polling via /health ──────────── */
let elapsed = 0;
const POLL_INTERVAL = 3000;   // ms between each /health poll
const FAKE_FILL_PER_TICK = 3; // visual progress % per tick (capped at 90)

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
      if (data.status === 'ok') {
        onReady();
      } else {
        setTimeout(pollHealth, POLL_INTERVAL);
      }
    })
    .catch(() => setTimeout(pollHealth, POLL_INTERVAL));
}

// Begin polling once the page loads
setTimeout(pollHealth, 1500);

continueBtn.addEventListener('click', () => {
  window.location.href = '/home';
});
