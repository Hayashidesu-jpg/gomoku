// ==== 宇宙背景アニメーション(Canvas) ====
// 星が個別にきらめきながらゆっくり漂い、星雲がゆらぎ、たまに流れ星が流れる背景
(function () {
  const canvas = document.getElementById('spaceCanvas');
  const c = canvas.getContext('2d');
  let stars = [];
  let shootingStars = [];
  let frame = 0;

  function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    initStars();
  }

  function initStars() {
    const w = canvas.width, h = canvas.height;
    const count = Math.min(260, Math.floor((w * h) / 5500));
    stars = [];
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 1.4 + 0.3,
        baseAlpha: Math.random() * 0.5 + 0.4,
        twinkleSpeed: Math.random() * 0.02 + 0.006,
        phase: Math.random() * Math.PI * 2,
        driftX: (Math.random() - 0.5) * 0.03,
        driftY: (Math.random() - 0.5) * 0.03
      });
    }
  }

  function spawnShootingStar() {
    const w = canvas.width, h = canvas.height;
    shootingStars.push({
      x: Math.random() * w * 0.6,
      y: Math.random() * h * 0.3,
      len: 80 + Math.random() * 90,
      speed: 9 + Math.random() * 6,
      angle: Math.PI / 4 + (Math.random() - 0.5) * 0.3,
      life: 0,
      maxLife: 45
    });
  }

  function draw() {
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);

    // 背景の下地
    c.fillStyle = '#05040f';
    c.fillRect(0, 0, w, h);

    // ゆっくりゆらめく星雲の光
    const t = frame * 0.004;
    const nebula1 = c.createRadialGradient(w * 0.22, h * 0.25, 0, w * 0.22, h * 0.25, w * 0.55);
    nebula1.addColorStop(0, `rgba(120, 70, 190, ${0.30 + 0.06 * Math.sin(t)})`);
    nebula1.addColorStop(1, 'rgba(120, 70, 190, 0)');
    c.fillStyle = nebula1;
    c.fillRect(0, 0, w, h);

    const nebula2 = c.createRadialGradient(w * 0.8, h * 0.75, 0, w * 0.8, h * 0.75, w * 0.55);
    nebula2.addColorStop(0, `rgba(40, 90, 190, ${0.26 + 0.06 * Math.cos(t)})`);
    nebula2.addColorStop(1, 'rgba(40, 90, 190, 0)');
    c.fillStyle = nebula2;
    c.fillRect(0, 0, w, h);

    // 星(個別にきらめきながらゆっくり漂う)
    stars.forEach(s => {
      s.phase += s.twinkleSpeed;
      s.x += s.driftX;
      s.y += s.driftY;
      if (s.x < 0) s.x = w; else if (s.x > w) s.x = 0;
      if (s.y < 0) s.y = h; else if (s.y > h) s.y = 0;

      const alpha = s.baseAlpha * (0.5 + 0.5 * Math.sin(s.phase));
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      c.fill();
    });

    // 流れ星
    shootingStars.forEach(s => {
      s.life++;
      s.x += Math.cos(s.angle) * s.speed;
      s.y += Math.sin(s.angle) * s.speed;
      const fade = Math.max(1 - s.life / s.maxLife, 0);
      const tailX = s.x - Math.cos(s.angle) * s.len;
      const tailY = s.y - Math.sin(s.angle) * s.len;
      const trail = c.createLinearGradient(s.x, s.y, tailX, tailY);
      trail.addColorStop(0, `rgba(255, 255, 255, ${fade})`);
      trail.addColorStop(1, 'rgba(255, 255, 255, 0)');
      c.strokeStyle = trail;
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(s.x, s.y);
      c.lineTo(tailX, tailY);
      c.stroke();
    });
    shootingStars = shootingStars.filter(s => s.life < s.maxLife);
    if (Math.random() < 0.006) spawnShootingStar();

    frame++;
    requestAnimationFrame(draw);
  }

  window.addEventListener('resize', resize);
  resize();
  draw();
})();

const SIZE = 15; // 15路盤（交点が15x15）
const CELL = 32; // 交点間の間隔（ピクセル）
const PADDING = 20; // 盤の端の余白（交点が盤端でも見切れないように）
const boardEl = document.getElementById('board');
const gridSvg = document.getElementById('gridSvg');
const statusEl = document.getElementById('status');
const resetBtn = document.getElementById('resetBtn');
const winLineSvg = document.getElementById('winLineSvg');
const winLine = document.getElementById('winLine');
const winOverlay = document.getElementById('winOverlay');
const winMessage = document.getElementById('winMessage');
const pvpBtn = document.getElementById('pvpBtn');
const cpuBtn = document.getElementById('cpuBtn');
const cpuLevelSelect = document.getElementById('cpuLevelSelect');
const levelBtns = document.querySelectorAll('.level-btn');

let board = [];
let currentPlayer = 'black'; // 'black' or 'white'
let gameOver = false;
let lastMoveEl = null;
let mode = 'pvp'; // 'pvp' または 'cpu'
let isThinking = false; // CPUが思考中はクリックを無効化
let cpuLevel = 3; // CPUの強さ(1〜6)

// 予約中のタイマー。リセット時に確実に止めるため、IDを保持しておく
let autoResetTimer = null; // 決着後の自動リセット
let cpuTimer = null;       // CPUの着手待ち
let winMsgTimer = null;    // 勝利メッセージの表示待ち

function clearPendingTimers() {
  clearTimeout(autoResetTimer);
  clearTimeout(cpuTimer);
  clearTimeout(winMsgTimer);
  autoResetTimer = cpuTimer = winMsgTimer = null;
}

function initBoard() {
  clearPendingTimers(); // 前の対局のタイマーが新しい対局に影響しないようにする
  board = Array.from({length: SIZE}, () => Array(SIZE).fill(null));
  currentPlayer = 'black';
  gameOver = false;
  isThinking = false;
  lastMoveEl = null;
  updateStatusForTurn();

  const boardPx = (SIZE - 1) * CELL + PADDING * 2;
  boardEl.style.width = boardPx + 'px';
  boardEl.style.height = boardPx + 'px';

  // 石や置いた跡をクリアし、盤の線(gridSvg)だけ残す
  boardEl.querySelectorAll('.stone, .point').forEach(el => el.remove());

  // 碁盤のような格子線を描画
  gridSvg.setAttribute('width', boardPx);
  gridSvg.setAttribute('height', boardPx);
  gridSvg.innerHTML = '';
  for (let i = 0; i < SIZE; i++) {
    const pos = PADDING + i * CELL;
    gridSvg.appendChild(makeLine(pos, PADDING, pos, boardPx - PADDING));
    gridSvg.appendChild(makeLine(PADDING, pos, boardPx - PADDING, pos));
  }
  // 星(星点)を描画。15路盤の慣例的な位置
  const starIdx = [3, 7, 11];
  for (const sy of starIdx) {
    for (const sx of starIdx) {
      gridSvg.appendChild(makeHoshi(PADDING + sx * CELL, PADDING + sy * CELL));
    }
  }

  const winLineSvgSize = boardPx;
  winLineSvg.setAttribute('width', winLineSvgSize);
  winLineSvg.setAttribute('height', winLineSvgSize);
  winLine.classList.remove('draw');
  winLine.setAttribute('x1', 0);
  winLine.setAttribute('y1', 0);
  winLine.setAttribute('x2', 0);
  winLine.setAttribute('y2', 0);
  winOverlay.classList.remove('show');

  // 各交点にクリック用の透明な当たり判定を配置
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const point = document.createElement('div');
      point.className = 'point';
      point.style.left = (PADDING + x * CELL - CELL / 2) + 'px';
      point.style.top = (PADDING + y * CELL - CELL / 2) + 'px';
      point.style.width = CELL + 'px';
      point.style.height = CELL + 'px';
      point.dataset.x = x;
      point.dataset.y = y;
      point.addEventListener('click', onPointClick);
      boardEl.appendChild(point);
    }
  }
}

function makeLine(x1, y1, x2, y2) {
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1);
  line.setAttribute('y1', y1);
  line.setAttribute('x2', x2);
  line.setAttribute('y2', y2);
  return line;
}

function makeHoshi(cx, cy) {
  const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  circle.setAttribute('cx', cx);
  circle.setAttribute('cy', cy);
  circle.setAttribute('r', 3);
  circle.setAttribute('class', 'hoshi');
  return circle;
}

function onPointClick(e) {
  if (gameOver || isThinking) return;
  if (mode === 'cpu' && currentPlayer === 'white') return; // CPUの番はクリック無効
  const x = parseInt(e.currentTarget.dataset.x, 10);
  const y = parseInt(e.currentTarget.dataset.y, 10);
  if (board[y][x] !== null) return;

  makeMove(x, y, currentPlayer);
}

function makeMove(x, y, player) {
  board[y][x] = player;
  placeStone(x, y, player);
  playPlaceSound();

  const winResult = checkWin(x, y, player);
  if (winResult) {
    const winnerName = player === 'black' ? '赤（ハート）' : '青（星）';
    statusEl.textContent = winnerName + 'の勝ちです！';
    gameOver = true;
    drawWinLine(winResult);
    playWinSound();
    showWinMessage(winnerName);
    // 勝利演出が一通り見えたあと、数秒後に自動で盤面をリセットする
    autoResetTimer = setTimeout(initBoard, 4000);
    return;
  }

  if (isBoardFull()) {
    statusEl.textContent = '引き分けです';
    gameOver = true;
    // 引き分けも勝敗時と同様、数秒後に自動で盤面をリセットする
    autoResetTimer = setTimeout(initBoard, 4000);
    return;
  }

  currentPlayer = player === 'black' ? 'white' : 'black';
  updateStatusForTurn();

  // CPUモードで白番になったら、少し間を置いて自動的に着手させる
  if (mode === 'cpu' && currentPlayer === 'white' && !gameOver) {
    isThinking = true;
    statusEl.textContent = 'CPUが考え中…';
    cpuTimer = setTimeout(() => {
      cpuTimer = null;
      isThinking = false;
      cpuMove();
    }, 500);
  }
}

function updateStatusForTurn() {
  if (mode === 'cpu') {
    statusEl.textContent = currentPlayer === 'black' ? 'あなたの番です（赤）' : 'CPUの番です（青）';
  } else {
    statusEl.textContent = (currentPlayer === 'black' ? '赤（ハート）' : '青（星）') + 'の番です';
  }
}

function placeStone(x, y, player) {
  if (lastMoveEl) lastMoveEl.classList.remove('last-move');
  const stone = document.createElement('div');
  stone.className = 'stone ' + player + ' last-move';
  stone.style.left = (PADDING + x * CELL) + 'px';
  stone.style.top = (PADDING + y * CELL) + 'px';
  boardEl.appendChild(stone);
  lastMoveEl = stone;
}

function isBoardFull() {
  return board.every(row => row.every(cell => cell !== null));
}

function checkWin(x, y, player) {
  const directions = [
    [1, 0],  // 横
    [0, 1],  // 縦
    [1, 1],  // 斜め（右下）
    [1, -1]  // 斜め（右上）
  ];

  for (const [dx, dy] of directions) {
    let count = 1;
    let endX = x, endY = y;
    let startX = x, startY = y;

    // 正方向にカウント
    let nx = x + dx, ny = y + dy;
    while (inBounds(nx, ny) && board[ny][nx] === player) {
      count++;
      endX = nx; endY = ny;
      nx += dx; ny += dy;
    }

    // 逆方向にカウント
    nx = x - dx; ny = y - dy;
    while (inBounds(nx, ny) && board[ny][nx] === player) {
      count++;
      startX = nx; startY = ny;
      nx -= dx; ny -= dy;
    }

    if (count >= 5) {
      return { x1: startX, y1: startY, x2: endX, y2: endY };
    }
  }
  return null;
}

function drawWinLine({x1, y1, x2, y2}) {
  winLine.setAttribute('x1', PADDING + x1 * CELL);
  winLine.setAttribute('y1', PADDING + y1 * CELL);
  winLine.setAttribute('x2', PADDING + x2 * CELL);
  winLine.setAttribute('y2', PADDING + y2 * CELL);
  // reflow を挟んでからクラスを付け、アニメーションを毎回再生させる
  void winLine.getBoundingClientRect();
  winLine.classList.add('draw');
}

function inBounds(x, y) {
  return x >= 0 && x < SIZE && y >= 0 && y < SIZE;
}

// ==== CPU AI ====
// 各交点について「自分が置いたときの攻撃力」と「相手に置かれたときの脅威(＝防御価値)」を
// 合算してスコアを付け、最も高い場所に着手する簡易評価型AI

function cpuMove() {
  if (gameOver) return;
  const candidates = getCandidates();

  let scored = candidates.map(({ x, y }) => {
    const offense = evaluatePoint(x, y, 'white'); // 自分(白)が置いた場合の強さ
    const defense = evaluatePoint(x, y, 'black');  // 黒が置いた場合の強さ(＝防ぐ価値)
    return { x, y, offense, defense, score: offense + defense };
  });

  // 即座に勝てる手・相手の五連を防がなければならない手は、レベルに関係なく最優先
  const winMove = scored.find(c => c.offense >= 100000);
  if (winMove) { makeMove(winMove.x, winMove.y, 'white'); return; }
  const blockMove = scored.find(c => c.defense >= 100000);
  if (blockMove) { makeMove(blockMove.x, blockMove.y, 'white'); return; }

  // レベル5以上は「この手を打った後、相手が一番強い返し手を打ったらどうなるか」まで読んでスコアを補正する
  if (cpuLevel >= 5) {
    scored = scored.map(c => {
      board[c.y][c.x] = 'white'; // 仮置き
      let opponentBest = 0;
      for (const oc of getCandidates()) {
        const oScore = evaluatePoint(oc.x, oc.y, 'black');
        if (oScore > opponentBest) opponentBest = oScore;
      }
      board[c.y][c.x] = null; // 元に戻す
      const penaltyWeight = cpuLevel >= 6 ? 0.9 : 0.6;
      return { ...c, score: c.score - opponentBest * penaltyWeight };
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // レベルが低いほど、最善手を無視してランダムな手を選ぶ確率が高くなる(＝手加減)
  const randomnessByLevel = { 1: 0.85, 2: 0.6, 3: 0.35, 4: 0.15, 5: 0.05, 6: 0 };
  const randomness = randomnessByLevel[cpuLevel] ?? 0.35;

  let choice;
  if (Math.random() < randomness) {
    choice = candidates[Math.floor(Math.random() * candidates.length)];
  } else {
    const topScore = scored[0].score;
    const topTier = scored.filter(c => c.score === topScore);
    choice = topTier[Math.floor(Math.random() * topTier.length)];
  }

  makeMove(choice.x, choice.y, 'white');
}

// 既に置かれた石の近く(2マス以内)にある空点だけを候補にして計算量を抑える
function getCandidates() {
  const candidateSet = new Set();
  let hasStone = false;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (board[y][x] === null) continue;
      hasStone = true;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = x + dx, ny = y + dy;
          if (inBounds(nx, ny) && board[ny][nx] === null) {
            candidateSet.add(ny * SIZE + nx);
          }
        }
      }
    }
  }

  if (!hasStone) {
    // 盤面が空なら中央から開始
    const center = Math.floor(SIZE / 2);
    return [{ x: center, y: center }];
  }

  return Array.from(candidateSet).map(v => ({ x: v % SIZE, y: Math.floor(v / SIZE) }));
}

// (x,y)にplayerの石を仮置きしたときの、4方向の並び具合をスコア化する
function evaluatePoint(x, y, player) {
  board[y][x] = player; // 仮置き
  let total = 0;
  const directions = [[1, 0], [0, 1], [1, 1], [1, -1]];
  for (const [dx, dy] of directions) {
    total += lineScore(x, y, dx, dy, player);
  }
  board[y][x] = null; // 元に戻す
  return total;
}

// ある1方向について、(x,y)を通る連続数と、その両端が空いているかを調べてスコアに変換
function lineScore(x, y, dx, dy, player) {
  let count = 1;
  let openEnds = 0;

  let nx = x + dx, ny = y + dy;
  while (inBounds(nx, ny) && board[ny][nx] === player) {
    count++;
    nx += dx; ny += dy;
  }
  if (inBounds(nx, ny) && board[ny][nx] === null) openEnds++;

  nx = x - dx; ny = y - dy;
  while (inBounds(nx, ny) && board[ny][nx] === player) {
    count++;
    nx -= dx; ny -= dy;
  }
  if (inBounds(nx, ny) && board[ny][nx] === null) openEnds++;

  return scoreForPattern(count, openEnds);
}

// 連続数と開いている端の数から、その形の危険度／価値を返す
// (五連はもちろん最優先。四連や三連は「両端が空いているか」で天と地ほど価値が変わる)
function scoreForPattern(count, openEnds) {
  if (count >= 5) return 100000;       // 五連＝勝ち
  if (count === 4) return openEnds === 2 ? 10000 : (openEnds === 1 ? 1000 : 0);
  if (count === 3) return openEnds === 2 ? 1000 : (openEnds === 1 ? 100 : 0);
  if (count === 2) return openEnds === 2 ? 100 : (openEnds === 1 ? 10 : 0);
  return openEnds === 2 ? 10 : 1; // count === 1
}

// 石を置いたときの効果音を合成して再生（小さく高めの「カラン」という音）
let audioCtx = null;
function playPlaceSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = audioCtx.currentTime;

    const echoStart = now;
    const echoOsc = audioCtx.createOscillator();
    const echoGain = audioCtx.createGain();
    echoOsc.type = 'triangle';
    echoOsc.frequency.setValueAtTime(1400, echoStart);
    echoOsc.frequency.exponentialRampToValueAtTime(900, echoStart + 0.09);
    echoGain.gain.setValueAtTime(0.0001, echoStart);
    echoGain.gain.exponentialRampToValueAtTime(0.12, echoStart + 0.01);
    echoGain.gain.exponentialRampToValueAtTime(0.0001, echoStart + 0.15);
    echoOsc.connect(echoGain);
    echoGain.connect(audioCtx.destination);
    echoOsc.start(echoStart);
    echoOsc.stop(echoStart + 0.16);
  } catch (e) {
    // 音声再生に失敗してもゲームは続行できるようにする
    console.warn('音声再生エラー:', e);
  }
}

// 勝利ラインが引かれるのに合わせて鳴らす、上昇アルペジオのファンファーレ音
function playWinSound() {
  try {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const now = audioCtx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.5]; // ド・ミ・ソ・高いド

    notes.forEach((freq, i) => {
      const start = now + i * 0.16;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(start);
      osc.stop(start + 0.45);
    });

    // 最後にキラッとした高音のきらめきを添える
    const sparkleStart = now + notes.length * 0.16 + 0.05;
    const sparkle = audioCtx.createOscillator();
    const sparkleGain = audioCtx.createGain();
    sparkle.type = 'sine';
    sparkle.frequency.setValueAtTime(1568, sparkleStart); // ソ(高)
    sparkleGain.gain.setValueAtTime(0.0001, sparkleStart);
    sparkleGain.gain.exponentialRampToValueAtTime(0.25, sparkleStart + 0.02);
    sparkleGain.gain.exponentialRampToValueAtTime(0.0001, sparkleStart + 0.6);
    sparkle.connect(sparkleGain);
    sparkleGain.connect(audioCtx.destination);
    sparkle.start(sparkleStart);
    sparkle.stop(sparkleStart + 0.65);
  } catch (e) {
    console.warn('音声再生エラー:', e);
  }
}

function showWinMessage(winnerName) {
  winMessage.textContent = winnerName + 'の勝ち！';
  // 直線が引かれる演出が少し見えてからメッセージをポップさせる
  winMsgTimer = setTimeout(() => {
    winMsgTimer = null;
    winOverlay.classList.add('show');
  }, 600);
}

// オーバーレイをクリックすると閉じて盤面を確認できる
winOverlay.addEventListener('click', () => {
  winOverlay.classList.remove('show');
});

resetBtn.addEventListener('click', initBoard);

pvpBtn.addEventListener('click', () => {
  if (mode === 'pvp') return;
  mode = 'pvp';
  pvpBtn.classList.add('active');
  cpuBtn.classList.remove('active');
  cpuLevelSelect.style.display = 'none';
  initBoard();
});

cpuBtn.addEventListener('click', () => {
  if (mode === 'cpu') return;
  mode = 'cpu';
  cpuBtn.classList.add('active');
  pvpBtn.classList.remove('active');
  cpuLevelSelect.style.display = 'flex';
  initBoard();
});

levelBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const level = parseInt(btn.dataset.level, 10);
    if (level === cpuLevel) return;
    cpuLevel = level;
    levelBtns.forEach(b => b.classList.toggle('active', b === btn));
    initBoard();
  });
});

initBoard();