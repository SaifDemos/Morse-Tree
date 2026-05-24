// ── DATA ──
const TREE = {
  '.':  { letter: 'E',
    '.':  { letter: 'I',
      '.':  { letter: 'S', '.': { letter: 'H' }, '-': { letter: 'V' } },
      '-':  { letter: 'U', '.': { letter: 'F' }, '-': { letter: null } }
    },
    '-':  { letter: 'A',
      '.':  { letter: 'R', '.': { letter: 'L' }, '-': { letter: null } },
      '-':  { letter: 'W', '.': { letter: 'P' }, '-': { letter: 'J' } }
    }
  },
  '-':  { letter: 'T',
    '.':  { letter: 'N',
      '.':  { letter: 'D', '.': { letter: 'B' }, '-': { letter: 'X' } },
      '-':  { letter: 'K', '.': { letter: 'C' }, '-': { letter: 'Y' } }
    },
    '-':  { letter: 'M',
      '.':  { letter: 'G', '.': { letter: 'Z' }, '-': { letter: 'Q' } },
      '-':  { letter: 'O', '.': { letter: null }, '-': { letter: null } }
    }
  }
};

const MORSE_MAP = {
  E:'.',T:'-',I:'..',A:'.-',N:'-.',M:'--',S:'...',U:'..-',R:'.-.',W:'.--',
  D:'-..',K:'-.-',G:'--.',O:'---',
  H:'....',V:'...-',F:'..-.',L:'.-..',
  P:'.--.',J:'.---',B:'-...',X:'-..-',C:'-.-.',Y:'-.--',Z:'--..',Q:'--.-',
};

function getNode(path) {
  if (!path) return null;
  let node = TREE;
  for (const ch of path) {
    if (!node[ch]) return null;
    node = node[ch];
  }
  return node;
}

// ── STATE ──
let currentPath = '';
let animId = 0;
let flipped = false;

// ── SVG TREE ──
const SVG_W = 1400;
const svg = document.getElementById('tree-svg');

const COLORS = {
  nodeBg:        '#1a2030',
  nodeBorder:    '#2a3348',
  nodeText:      '#c8cad4',
  activeBg:      '#2a1f06',
  activeBorder:  '#f5a623',
  activeText:    '#f5a623',
  ancestorBg:    '#1a2535',
  ancestorBorder:'#3a4a68',
  edgeDot:       '#2a5a48',
  edgeDash:      '#243560',
  edgeDotHl:     '#4dd9ac',
  edgeDashHl:    '#5b9cf6',
  symDot:        '#4dd9ac',
  symDash:       '#5b9cf6',
  empty:         '#1a2030',
  emptyBorder:   '#222b3a',
  emptyText:     '#2a3a50',
  root:          '#1e2840',
  rootBorder:    '#3a4a68',
};

const R = 18;
const LY = [55, 165, 285, 410, 535];
const ROOT_X = SVG_W / 2;

let nodeMap = {};
let nodeEls = {};

// ── TREE LAYOUT ──
function buildPositions() {
  nodeMap = {};
  nodeMap[''] = { x: ROOT_X, y: LY[0], letter: null, isRoot: true };

  function place(path, x, y, spread) {
    const node = getNode(path);
    if (!node) return;
    nodeMap[path] = { x, y, letter: node.letter };
    const half = spread / 2;
    if (node['.'] !== undefined) place(path + '.', flipped ? x - half : x + half, y + 100, half);
    if (node['-'] !== undefined) place(path + '-', flipped ? x + half : x - half, y + 100, half);
  }

  const spread1 = SVG_W * 0.38;
  place('.', flipped ? ROOT_X - spread1 / 2 : ROOT_X + spread1 / 2, LY[1], spread1 / 2);
  place('-', flipped ? ROOT_X + spread1 / 2 : ROOT_X - spread1 / 2, LY[1], spread1 / 2);
}

function drawEdges() {
  svg.querySelectorAll('.edge-g').forEach(e => e.remove());
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'edge-g');

  function drawEdge(fromPath, toPath, sym) {
    const from = nodeMap[fromPath];
    const to   = nodeMap[toPath];
    if (!from || !to) return;

    const isOnPath = currentPath && currentPath.startsWith(toPath) && toPath.length > 0;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', from.x);
    line.setAttribute('y1', from.y + R);
    line.setAttribute('x2', to.x);
    line.setAttribute('y2', to.y - R);
    line.setAttribute('stroke', isOnPath
      ? (sym === '.' ? COLORS.edgeDotHl : COLORS.edgeDashHl)
      : (sym === '.' ? COLORS.edgeDot   : COLORS.edgeDash));
    line.setAttribute('stroke-width', isOnPath ? '2' : '1');
    g.appendChild(line);

    const mx = (from.x + to.x) / 2 + (sym === '.' ? 14 : -14);
    const my = (from.y + to.y) / 2;
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', mx);
    t.setAttribute('y', my);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('font-size', '17');
    t.setAttribute('font-family', "'Share Tech Mono', monospace");
    t.setAttribute('fill', sym === '.' ? COLORS.symDot : COLORS.symDash);
    t.setAttribute('opacity', isOnPath ? '1' : '0.72');
    t.textContent = sym;
    g.appendChild(t);
  }

  drawEdge('', '.', '.');
  drawEdge('', '-', '-');

  function recurse(path) {
    const node = getNode(path);
    if (!node) return;
    if (node['.'] !== undefined) { drawEdge(path, path + '.', '.'); recurse(path + '.'); }
    if (node['-'] !== undefined) { drawEdge(path, path + '-', '-'); recurse(path + '-'); }
  }
  recurse('.');
  recurse('-');

  svg.insertBefore(g, svg.firstChild);
}

function drawNodes() {
  svg.querySelectorAll('.nodes-g').forEach(e => e.remove());
  nodeEls = {};
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  g.setAttribute('class', 'nodes-g');

  Object.entries(nodeMap).forEach(([path, {x, y, letter, isRoot}]) => {
    const isEmpty = !isRoot && !letter;

    const grp = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    grp.setAttribute('class', 'node-g');
    if (!isRoot) {
      grp.style.cursor = 'pointer';
      grp.addEventListener('click', () => navigateToPath(path));
    }

    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', x);
    circle.setAttribute('cy', y);
    circle.setAttribute('r', isRoot ? 12 : R);
    circle.setAttribute('class', 'node-circle');

    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', x);
    text.setAttribute('y', y);
    text.setAttribute('text-anchor', 'middle');
    text.setAttribute('dominant-baseline', 'central');
    text.setAttribute('font-size', isRoot ? '11' : '14');
    text.setAttribute('class', 'node-text');

    if (isRoot) {
      circle.setAttribute('fill', COLORS.root);
      circle.setAttribute('stroke', COLORS.rootBorder);
      circle.setAttribute('stroke-width', '1');
      text.setAttribute('fill', COLORS.symDash);
      text.textContent = '⊙';
    } else if (isEmpty) {
      circle.setAttribute('fill', COLORS.empty);
      circle.setAttribute('stroke', COLORS.emptyBorder);
      circle.setAttribute('stroke-width', '0.5');
      circle.setAttribute('stroke-dasharray', '3 3');
      text.setAttribute('fill', COLORS.emptyText);
      text.textContent = '·';
    } else {
      circle.setAttribute('fill', COLORS.nodeBg);
      circle.setAttribute('stroke', COLORS.nodeBorder);
      circle.setAttribute('stroke-width', '1');
      text.setAttribute('fill', COLORS.nodeText);
      text.textContent = letter;
    }

    grp.appendChild(circle);
    grp.appendChild(text);
    g.appendChild(grp);
    nodeEls[path] = { circle, text };
  });

  svg.appendChild(g);
}

function updateNodeStyles() {
  Object.entries(nodeEls).forEach(([path, {circle, text}]) => {
    const nd = nodeMap[path];
    if (!nd || nd.isRoot) return;
    const { letter } = nd;
    const isEmpty   = !letter;
    const isActive  = path === currentPath;
    const isAncestor = !isActive && currentPath.length > 0 && currentPath.startsWith(path) && path.length > 0;

    if (isActive) {
      circle.setAttribute('fill',         COLORS.activeBg);
      circle.setAttribute('stroke',       COLORS.activeBorder);
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('r',            R + 3);
      text.setAttribute('fill',      COLORS.activeText);
      text.setAttribute('font-size', '15');
    } else if (isAncestor) {
      circle.setAttribute('fill',         COLORS.ancestorBg);
      circle.setAttribute('stroke',       COLORS.ancestorBorder);
      circle.setAttribute('stroke-width', '1.5');
      circle.setAttribute('r',            R);
      text.setAttribute('fill',      '#a0b0c8');
      text.setAttribute('font-size', '14');
    } else if (isEmpty) {
      circle.setAttribute('fill',         COLORS.empty);
      circle.setAttribute('stroke',       COLORS.emptyBorder);
      circle.setAttribute('stroke-width', '0.5');
      circle.setAttribute('r',            R);
      text.setAttribute('fill', COLORS.emptyText);
    } else {
      circle.setAttribute('fill',         COLORS.nodeBg);
      circle.setAttribute('stroke',       COLORS.nodeBorder);
      circle.setAttribute('stroke-width', '1');
      circle.setAttribute('r',            R);
      text.setAttribute('fill',      COLORS.nodeText);
      text.setAttribute('font-size', '14');
    }
  });
}

function drawLevelLabels() {
  svg.querySelectorAll('.level-lbl').forEach(e => e.remove());
  ['root', '1 symbol', '2 symbols', '3 symbols', '4 symbols'].forEach((lbl, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('x', 8);
    t.setAttribute('y', LY[i]);
    t.setAttribute('dominant-baseline', 'central');
    t.setAttribute('font-size', '10');
    t.setAttribute('font-family', "'Share Tech Mono', monospace");
    t.setAttribute('fill', '#2a3a55');
    t.setAttribute('class', 'level-lbl');
    t.textContent = lbl;
    svg.appendChild(t);
  });
}

// ── UI UPDATES ──
function updateSidebar() {
  const letterEl = document.getElementById('big-letter');
  const morseEl  = document.getElementById('morse-symbols');
  const statusEl = document.getElementById('path-status');

  if (!currentPath) {
    letterEl.textContent = '?';
    letterEl.className   = 'big-letter empty';
    morseEl.innerHTML    = '';
    statusEl.textContent = 'navigate the tree';
    return;
  }

  const node   = getNode(currentPath);
  const letter = node && node.letter;

  letterEl.textContent = letter || '·';
  letterEl.className   = letter ? 'big-letter active' : 'big-letter';

  morseEl.innerHTML = currentPath.split('').map(s =>
    s === '.' ? `<span class="dot-sym">·</span>` : `<span class="dash-sym">−</span>`
  ).join(' ');

  const canDot  = node && node['.'] !== undefined;
  const canDash = node && node['-'] !== undefined;
  statusEl.textContent =
    (!canDot && !canDash) ? 'end of branch' :
    (canDot && canDash)   ? '· or − to continue' :
    canDot                ? '· to continue' : '− to continue';
}

function updateTrail() {
  const trail = document.getElementById('trail');
  if (!currentPath) { trail.innerHTML = '<span class="trail-empty">—</span>'; return; }
  let html = '';
  for (let i = 0; i <= currentPath.length; i++) {
    const p      = currentPath.slice(0, i);
    const node   = getNode(p);
    const letter = i === 0 ? '⊙' : (node && node.letter) || '?';
    if (i > 0) {
      const sym = currentPath[i - 1];
      html += `<span class="trail-step">
        <span class="${sym === '.' ? 'trail-dot-sym' : 'trail-dash-sym'}">${sym === '.' ? '·' : '−'}</span>
        <span class="trail-arrow">→</span>
      </span>`;
    }
    html += `<span class="trail-letter">${letter}</span>`;
  }
  trail.innerHTML = html;
}

// ── ACTIONS ──
function navigate(sym) {
  const newPath = currentPath + sym;
  const node    = getNode(newPath);
  if (node === null || node === undefined) {
    beepError();
    const el = document.getElementById('big-letter');
    el.style.color      = '#E24B4A';
    el.style.textShadow = '0 0 20px rgba(226,75,74,0.6)';
    setTimeout(() => { el.style.color = ''; el.style.textShadow = ''; }, 300);
    return;
  }
  animId++;
  sym === '.' ? beepDot() : beepDash();
  currentPath = newPath;
  refresh();
}

function navigateToPath(path) {
  if (!path) { reset(); return; }
  const myId = ++animId;
  currentPath = '';
  refresh();
  const unit = getUnit();
  (async () => {
    for (const sym of path) {
      if (myId !== animId) break;
      currentPath += sym;
      sym === '.' ? beepDot() : beepDash();
      refresh();
      if (myId !== animId) break;
      await sleep(sym === '.' ? unit : unit * 3);
      if (myId !== animId) break;
      await sleep(unit);
    }
  })();
}

function reset() {
  animId++;
  beepReset();
  currentPath = '';
  refresh();
}

function goBack() {
  if (currentPath.length > 0) {
    animId++;
    beepReset();
    currentPath = currentPath.slice(0, -1);
    refresh();
  }
}

function refresh() {
  drawEdges();
  updateNodeStyles();
  updateSidebar();
  updateTrail();
}

function toggleFlip() {
  flipped = !flipped;
  buildPositions();
  drawEdges();
  drawNodes();
  drawLevelLabels();
  updateNodeStyles();
  document.querySelector('.legend-dot').textContent = flipped ? '· left = dot' : '· right = dot';
  document.querySelector('.legend-dash').textContent = flipped ? '− right = dash' : '− left = dash';
}

// ── AUDIO ──
let audioCtx = null;
let muted = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function beep({ freq = 650, duration = 80, type = 'sine', volume = 0.28, fadeOut = false } = {}) {
  if (muted) return;
  try {
    const ctx  = getAudioCtx();
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    if (fadeOut) gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration / 1000 + 0.02);
  } catch(e) {}
}

function beepDot()   { beep({ freq: 650, duration: 80  }); }
function beepDash()  { beep({ freq: 650, duration: 500 }); }
function beepError() { beep({ freq: 200, duration: 150, type: 'sawtooth', volume: 0.1 }); }
function beepReset() { beep({ freq: 400, duration: 60,  volume: 0.08 }); }

function toggleMute() {
  muted = !muted;
  const btn = document.getElementById('mute-btn');
  btn.textContent  = muted ? '🔇 MUTED' : '🔊 SOUND';
  btn.style.opacity = muted ? '0.5' : '1';
}

// ── TEXT TO MORSE ──
function renderMorseOutput() {
  const val       = document.getElementById('msg-input').value.toUpperCase();
  const container = document.getElementById('morse-output');
  container.innerHTML = val.split('').map((ch, i) => {
    if (ch === ' ') return `<span class="mo-space">&nbsp;</span>`;
    const code = MORSE_MAP[ch];
    if (!code) return '';
    const syms = code.split('').map(s =>
      s === '.' ? `<span style="color:var(--dot-col)">·</span>`
                : `<span style="color:var(--dash-col)">−</span>`
    ).join('');
    return `<span class="mo-char" id="mo-${i}"><span class="mo-letter">${ch}</span><span class="mo-code">${syms}</span></span>`;
  }).join('');
}

function copyMorse() {
  const val = document.getElementById('msg-input').value.toUpperCase();
  const morse = val.split('').map(c => c === ' ' ? ' ' : MORSE_MAP[c] || '').join(' ').replace(/  +/g, '  ').trim();
  if (!morse) return;
  navigator.clipboard.writeText(morse);
  const btn = document.getElementById('copy-morse-btn');
  btn.textContent = '✓ COPIED';
  setTimeout(() => { btn.textContent = '📋 COPY'; }, 1500);
}

function highlightMoChar(idx) {
  document.querySelectorAll('.mo-char').forEach(el => el.classList.remove('active'));
  const el = document.getElementById(`mo-${idx}`);
  if (el) el.classList.add('active');
}

function resetPlayUI() {
  document.getElementById('now-letter').textContent = '—';
  document.getElementById('now-morse').innerHTML    = '';
  document.getElementById('play-status').textContent = '—';
  document.getElementById('char-queue').innerHTML   = '';
  document.querySelectorAll('.mo-char').forEach(el => el.classList.remove('active'));
}

// ── PLAYBACK ENGINE ──
let isPlaying     = false;
let stopRequested = false;
const UNIT_BASE   = 120;

function getUnit() {
  const speed = parseInt(document.getElementById('speed-slider').value);
  return Math.round(UNIT_BASE * [2.5, 1.8, 1.0, 0.6, 0.35][speed - 1]);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function togglePlay() {
  if (isPlaying) { stopRequested = true; return; }

  const val = document.getElementById('msg-input').value.toUpperCase();
  if (!val.trim()) return;

  isPlaying     = true;
  stopRequested = false;

  const btn = document.getElementById('play-btn');
  btn.textContent = '■ STOP';
  btn.classList.add('playing');

  // Build queue of letter chars only
  const letterChars = val.split('').filter(c => MORSE_MAP[c]);
  const queueEl     = document.getElementById('char-queue');
  queueEl.innerHTML = letterChars.map((c, i) => `<span class="cq-item" id="cq-${i}">${c}</span>`).join('');
  document.getElementById('play-status').textContent = 'playing...';

  let qIdx = 0;

  for (let i = 0; i < val.length; i++) {
    if (stopRequested) break;
    const ch = val[i];

    if (ch === ' ') {
      document.getElementById('play-status').textContent = 'word gap';
      currentPath = '';
      refresh();
      await sleep(getUnit() * 7);
      continue;
    }

    const code = MORSE_MAP[ch];
    if (!code) continue;

    // Highlight in morse output and queue
    highlightMoChar(i);
    document.querySelectorAll('.cq-item').forEach((el, idx) => {
      el.classList.toggle('done',    idx < qIdx);
      el.classList.toggle('current', idx === qIdx);
    });

    // Update now-playing panel
    document.getElementById('now-letter').textContent = ch;
    document.getElementById('now-morse').innerHTML = code.split('').map(s =>
      s === '.' ? `<span class="dot-sym">·</span>` : `<span class="dash-sym">−</span>`
    ).join(' ');
    document.getElementById('play-status').textContent = `letter: ${ch}`;

    // Navigate symbol by symbol
    currentPath = '';
    for (let si = 0; si < code.length; si++) {
      if (stopRequested) break;
      const sym = code[si];
      currentPath += sym;
      sym === '.' ? beepDot() : beepDash();
      refresh();
      await sleep(sym === '.' ? getUnit() : getUnit() * 3);
      if (stopRequested) break;
      await sleep(getUnit()); // inter-symbol gap
    }

    if (!stopRequested) await sleep(getUnit() * 2); // inter-letter gap
    qIdx++;
  }

  // Wrap up
  isPlaying = false;
  btn.textContent = '▶ PLAY';
  btn.classList.remove('playing');
  document.getElementById('play-status').textContent = stopRequested ? 'stopped' : 'done ✓';

  if (!stopRequested) {
    setTimeout(() => {
      reset();
      resetPlayUI();
    }, 800);
  }
}

// ── KEYBOARD ──
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  if (e.key === '.' || e.key === 'e' || e.key === 'E') navigate('.');
  else if (e.key === '-' || e.key === 't' || e.key === 'T') navigate('-');
  else if (e.key === 'r' || e.key === 'R' || e.key === 'Escape') reset();
  else if (e.key === 'Backspace') goBack();
  else if (e.key === 'm' || e.key === 'M') toggleMute();
});

document.getElementById('speed-slider').addEventListener('input', function () {
  document.getElementById('speed-label').textContent = this.value;
});

document.getElementById('msg-input').addEventListener('input', () => {
  renderMorseOutput();
  if (!isPlaying) resetPlayUI();
});

// ── INIT ──
buildPositions();
drawEdges();
drawNodes();
drawLevelLabels();
updateSidebar();
updateTrail();
renderMorseOutput();