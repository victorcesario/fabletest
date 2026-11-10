import { JOBS } from './jobs.js';

// ---------------------------------------------------------------------------
// Fix-It Run — a technician's journey: drive -> diagnose -> repair -> review.
// Everything is drawn on one 800x500 canvas; no runtime dependencies.
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 500;
const JOBS_PER_DAY = 3;
const LANES = [300, 400, 500];
const VAN_Y = 400;
const REPAIR_STEPS = ['Remove the panel', 'Replace the part', 'Run a test cycle'];
const BEST_KEY = 'fix-it-run-best';

const game = {
  state: 'title', // title | briefing | drive | diagnose | repair | result | dayEnd
  t: 0, // seconds in current state
  jobIndex: 0,
  jobs: [],
  dayEarnings: 0,
  dayStars: 0,
  best: readBest(),
  buttons: [], // rebuilt every frame: {x,y,w,h,onClick}
  drive: null,
  diag: null,
  repair: null,
  result: null,
};

function readBest() {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0; } catch { return 0; }
}
function saveBest(v) {
  try { localStorage.setItem(BEST_KEY, String(v)); } catch { /* storage unavailable */ }
}

const job = () => game.jobs[game.jobIndex];
const rand = (a, b) => a + Math.random() * (b - a);
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function setState(s) {
  game.state = s;
  game.t = 0;
}

// ----------------------------- flow ----------------------------------------

function startDay() {
  game.jobs = [...JOBS].sort(() => Math.random() - 0.5).slice(0, JOBS_PER_DAY);
  game.jobIndex = 0;
  game.dayEarnings = 0;
  game.dayStars = 0;
  setState('briefing');
}

function startDrive() {
  const level = game.jobIndex;
  const maxSpeed = 400 + level * 50;
  const distance = 6000 + level * 1500;
  game.drive = {
    lane: 1,
    x: LANES[1],
    speed: 150,
    maxSpeed,
    distance,
    travelled: 0,
    elapsed: 0,
    allowed: Math.ceil(distance / (maxSpeed * 0.72)),
    nextSpawn: 400,
    items: [], // {type, lane, y}
    hits: 0,
    boxes: 0,
    flash: 0,
    scroll: 0,
    scenery: Array.from({ length: 10 }, (_, i) => ({
      y: i * 60, side: i % 2, kind: pick(['tree', 'tree', 'house']), off: rand(20, 150), hue: rand(0, 360),
    })),
  };
  setState('drive');
}

function startDiagnose() {
  game.diag = { wrong: [], solved: false, shake: 0 };
  setState('diagnose');
}

function startRepair() {
  game.repair = { step: 0, misses: 0, pos: 0, dir: 1, zone: 0, zoneW: 0, feedback: '', feedbackT: 0, done: false };
  newRepairZone();
  setState('repair');
}

function newRepairZone() {
  const r = game.repair;
  r.zoneW = Math.max(0.1, 0.24 - game.jobIndex * 0.03 - r.step * 0.025);
  r.zone = rand(0.1, 0.9 - r.zoneW);
  r.pos = 0;
  r.dir = 1;
}

function finishJob() {
  const d = game.drive;
  const late = d.elapsed - d.allowed;
  let stars = 5;
  const notes = [];
  if (late <= 0) notes.push(['Arrived on time', true]);
  else { stars -= late > d.allowed * 0.5 ? 2 : 1; notes.push([`Arrived ${Math.ceil(late)}s late`, false]); }
  if (game.diag.wrong.length === 0) notes.push(['Diagnosed right the first time', true]);
  else { stars -= game.diag.wrong.length; notes.push([`${game.diag.wrong.length} wrong diagnosis`, false]); }
  if (game.repair.misses === 0) notes.push(['Clean, careful repair', true]);
  else { stars -= game.repair.misses * 0.5; notes.push([`${game.repair.misses} slip(s) during repair`, false]); }
  if (d.hits >= 3) { stars -= 0.5; notes.push(['Van arrived dented', false]); }
  stars = clamp(Math.round(stars * 2) / 2, 1, 5);
  const tip = Math.round(stars * 10);
  const bonus = d.boxes * 5;
  const pay = 80 + tip + bonus;
  game.result = { stars, notes, tip, bonus, pay };
  game.dayEarnings += pay;
  game.dayStars += stars;
  setState('result');
}

function nextJob() {
  if (game.jobIndex + 1 < game.jobs.length) {
    game.jobIndex++;
    setState('briefing');
  } else {
    if (game.dayEarnings > game.best) { game.best = game.dayEarnings; saveBest(game.best); }
    setState('dayEnd');
  }
}

// ----------------------------- input ---------------------------------------

function steer(dir) {
  const d = game.drive;
  d.lane = clamp(d.lane + dir, 0, 2);
}

function chooseOption(i) {
  const g = game.diag;
  if (g.solved || g.wrong.includes(i)) return;
  if (i === job().answer) { g.solved = true; game.t = 0; }
  else { g.wrong.push(i); g.shake = 0.4; }
}

function repairTap() {
  const r = game.repair;
  if (r.done) return;
  if (r.pos >= r.zone && r.pos <= r.zone + r.zoneW) {
    r.step++;
    r.feedback = 'Nice!';
    if (r.step >= REPAIR_STEPS.length) { r.done = true; r.feedback = 'Fixed!'; game.t = 0; } else newRepairZone();
  } else {
    r.misses++;
    r.feedback = 'Oops — slipped!';
  }
  r.feedbackT = 0.8;
}

function primaryAction() {
  switch (game.state) {
    case 'title': startDay(); break;
    case 'briefing': startDrive(); break;
    case 'repair': repairTap(); break;
    case 'result': if (game.t > 0.4) nextJob(); break;
    case 'dayEnd': if (game.t > 0.4) startDay(); break;
  }
}

window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const k = e.key.toLowerCase();
  if ([' ', 'arrowleft', 'arrowright', 'arrowup', 'arrowdown'].includes(k)) e.preventDefault();
  if (game.state === 'drive') {
    if (k === 'arrowleft' || k === 'a') steer(-1);
    if (k === 'arrowright' || k === 'd') steer(1);
  } else if (game.state === 'diagnose') {
    if (['1', '2', '3'].includes(k)) chooseOption(Number(k) - 1);
  } else if (k === ' ' || k === 'enter') {
    primaryAction();
  }
});

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * W;
  const y = ((e.clientY - rect.top) / rect.height) * H;
  for (const b of game.buttons) {
    if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) { b.onClick(); return; }
  }
  if (game.state === 'drive') steer(x < game.drive.x ? -1 : 1);
  else if (game.state === 'repair') repairTap();
});

// ----------------------------- update --------------------------------------

function update(dt) {
  game.t += dt;
  if (game.state === 'drive') updateDrive(dt);
  else if (game.state === 'diagnose') {
    const g = game.diag;
    g.shake = Math.max(0, g.shake - dt);
    if (g.solved && game.t > 1.1) startRepair();
  } else if (game.state === 'repair') {
    const r = game.repair;
    r.feedbackT = Math.max(0, r.feedbackT - dt);
    if (r.done) { if (game.t > 1.3) finishJob(); return; }
    const speed = 0.9 + game.jobIndex * 0.22 + r.step * 0.15;
    r.pos += r.dir * speed * dt;
    if (r.pos > 1) { r.pos = 1; r.dir = -1; }
    if (r.pos < 0) { r.pos = 0; r.dir = 1; }
  }
}

function updateDrive(dt) {
  const d = game.drive;
  d.elapsed += dt;
  d.flash = Math.max(0, d.flash - dt);
  d.speed = Math.min(d.maxSpeed, d.speed + 130 * dt);
  d.x += (LANES[d.lane] - d.x) * Math.min(1, dt * 14);
  const move = d.speed * dt;
  d.travelled += move;
  d.scroll = (d.scroll + move) % 60;

  for (const s of d.scenery) {
    s.y += move;
    if (s.y > H + 60) { s.y -= 600; s.kind = pick(['tree', 'tree', 'house']); s.off = rand(20, 150); s.hue = rand(0, 360); }
  }

  // Spawn rows of obstacles, always leaving at least one lane open.
  d.nextSpawn -= move;
  const remaining = d.distance - d.travelled;
  if (d.nextSpawn <= 0 && remaining > 700) {
    d.nextSpawn = rand(210, 300) - game.jobIndex * 15;
    const lanes = [0, 1, 2].sort(() => Math.random() - 0.5);
    const count = Math.random() < 0.3 + game.jobIndex * 0.12 ? 2 : 1;
    for (let i = 0; i < count; i++) d.items.push({ type: pick(['car', 'car', 'cone', 'pothole']), lane: lanes[i], y: -80, hue: rand(0, 360) });
    if (Math.random() < 0.3) d.items.push({ type: 'box', lane: lanes[2], y: -80 });
  }

  for (const it of d.items) {
    it.y += move;
    if (!it.gone && it.lane === d.lane && Math.abs(it.y - VAN_Y) < 58 && Math.abs(LANES[it.lane] - d.x) < 50) {
      it.gone = true;
      if (it.type === 'box') d.boxes++;
      else { d.hits++; d.speed = 70; d.flash = 0.45; }
    }
  }
  d.items = d.items.filter((it) => !it.gone && it.y < H + 100);

  if (d.travelled >= d.distance) startDiagnose();
}

// ----------------------------- drawing helpers -----------------------------

function rr(x, y, w, h, r, fill, stroke) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke(); }
}

function text(str, x, y, size = 18, color = '#fff', align = 'center', weight = '600') {
  ctx.font = `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(str, x, y);
}

function wrapText(str, x, y, maxW, size, color, lineH) {
  ctx.font = `600 ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  const lines = [];
  let line = '';
  for (const word of str.split(' ')) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = word; } else line = test;
  }
  lines.push(line);
  lines.forEach((l, i) => text(l, x, y + i * lineH, size, color, 'left'));
  return lines.length;
}

function button(label, x, y, w, h, onClick, opts = {}) {
  const { fill = '#fca311', color = '#14213d', disabled = false, size = 18 } = opts;
  rr(x, y + 4, w, h, 12, 'rgba(0,0,0,0.25)');
  rr(x, y, w, h, 12, disabled ? '#9aa3b2' : fill);
  text(label, x + w / 2, y + h / 2 + 1, size, disabled ? '#5b6475' : color, 'center', '700');
  if (!disabled) game.buttons.push({ x, y, w, h, onClick });
}

function stars(cx, y, value, size = 34) {
  for (let i = 0; i < 5; i++) {
    const x = cx + (i - 2) * (size + 6);
    text('★', x, y, size, '#3b4a6b');
    const fillAmt = clamp(value - i, 0, 1);
    if (fillAmt > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x - size / 2, y - size, size * fillAmt, size * 2);
      ctx.clip();
      text('★', x, y, size, '#fca311');
      ctx.restore();
    }
  }
}

function drawVan(x, y, tilt = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  rr(-20, -36, 44, 78, 8, 'rgba(0,0,0,0.25)');
  rr(-22, -40, 44, 78, 8, '#ffffff', '#c9d1dc');
  rr(-18, -34, 36, 16, 4, '#5dade2'); // windshield
  rr(-22, -6, 44, 12, 0, '#fca311'); // brand stripe
  ctx.save();
  ctx.translate(0, 20);
  ctx.rotate(-0.7);
  rr(-2.5, -11, 5, 22, 2, '#14213d'); // wrench logo
  ctx.beginPath(); ctx.arc(0, -11, 5, 0, Math.PI * 2); ctx.fillStyle = '#14213d'; ctx.fill();
  ctx.restore();
  rr(-16, -43, 8, 4, 2, '#ffe66d');
  rr(8, -43, 8, 4, 2, '#ffe66d');
  ctx.restore();
}

function drawCar(x, y, hue) {
  rr(-20 + x, -34 + y, 40, 70, 9, `hsl(${hue} 65% 50%)`, `hsl(${hue} 65% 35%)`);
  rr(-15 + x, -22 + y, 30, 14, 4, '#2c3e50');
  rr(-15 + x, 12 + y, 30, 12, 4, '#2c3e50');
}

function drawPerson(x, y, shirt, skin = '#f1c27d', hat = null) {
  rr(x - 14, y - 60, 28, 44, 8, shirt); // torso
  rr(x - 12, y - 18, 10, 30, 4, '#34495e');
  rr(x + 2, y - 18, 10, 30, 4, '#34495e');
  ctx.beginPath(); ctx.arc(x, y - 74, 14, 0, Math.PI * 2); ctx.fillStyle = skin; ctx.fill();
  if (hat) {
    ctx.beginPath(); ctx.arc(x, y - 78, 14.5, Math.PI, 0); ctx.fillStyle = hat; ctx.fill();
    rr(x - 4, y - 81, 24, 5, 2, hat);
  }
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(x - 5, y - 75, 1.8, 0, Math.PI * 2); ctx.arc(x + 5, y - 75, 1.8, 0, Math.PI * 2); ctx.fill();
}

function drawAppliance(type, x, y, fixed) {
  // x,y = bottom-centre of the appliance
  const body = '#eef1f5';
  const edge = '#aab3c0';
  const lamp = fixed ? '#2ecc71' : '#e74c3c';
  if (type === 'fridge') {
    rr(x - 50, y - 200, 100, 200, 8, body, edge);
    ctx.strokeStyle = edge; ctx.beginPath(); ctx.moveTo(x - 50, y - 130); ctx.lineTo(x + 50, y - 130); ctx.stroke();
    rr(x - 40, y - 180, 6, 36, 3, edge); rr(x - 40, y - 118, 6, 60, 3, edge);
    ctx.beginPath(); ctx.arc(x + 34, y - 186, 5, 0, Math.PI * 2); ctx.fillStyle = lamp; ctx.fill();
    return;
  }
  const h = type === 'oven' ? 130 : 120;
  rr(x - 60, y - h, 120, h, 8, body, edge);
  rr(x - 60, y - h, 120, 24, 8, '#d5dbe3', edge);
  ctx.beginPath(); ctx.arc(x + 46, y - h + 12, 5, 0, Math.PI * 2); ctx.fillStyle = lamp; ctx.fill();
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x - 46 + i * 16, y - h + 12, 4, 0, Math.PI * 2); ctx.fillStyle = '#7f8c9b'; ctx.fill(); }
  if (type === 'washer' || type === 'dryer') {
    ctx.beginPath(); ctx.arc(x, y - 48, 34, 0, Math.PI * 2); ctx.fillStyle = '#7f8c9b'; ctx.fill();
    ctx.beginPath(); ctx.arc(x, y - 48, 26, 0, Math.PI * 2); ctx.fillStyle = type === 'washer' ? '#5dade2' : '#34495e'; ctx.fill();
    if (fixed) {
      ctx.save(); ctx.translate(x, y - 48); ctx.rotate(game.t * 6);
      ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 16, 0, Math.PI); ctx.stroke();
      ctx.restore();
    }
  } else if (type === 'oven') {
    rr(x - 46, y - 92, 92, 70, 6, fixed ? '#f39c12' : '#2c3e50', edge);
    rr(x - 40, y - 100, 80, 5, 2, edge);
  } else { // dishwasher
    rr(x - 50, y - 86, 100, 76, 6, '#dfe5ec', edge);
    rr(x - 34, y - 80, 68, 6, 3, edge);
  }
}

function drawRoom() {
  ctx.fillStyle = '#f6e7cf'; ctx.fillRect(0, 0, W, 330);
  ctx.fillStyle = '#c99b6b'; ctx.fillRect(0, 330, W, H - 330);
  ctx.fillStyle = '#b3855a'; ctx.fillRect(0, 330, W, 8);
  // window
  rr(600, 60, 130, 110, 6, '#aee1f9', '#fff');
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(665, 60); ctx.lineTo(665, 170); ctx.moveTo(600, 115); ctx.lineTo(730, 115); ctx.stroke();
  // counter
  rr(20, 250, 180, 80, 4, '#8d6e53'); rr(14, 240, 192, 14, 4, '#e8e2d9');
}

function hud(title) {
  rr(0, 0, W, 40, 0, 'rgba(20,33,61,0.92)');
  text(`Job ${game.jobIndex + 1}/${game.jobs.length}`, 16, 21, 16, '#fca311', 'left', '700');
  text(title, W / 2, 21, 16, '#fff');
  text(`$${game.dayEarnings}`, W - 16, 21, 16, '#2ecc71', 'right', '700');
}

// ----------------------------- scenes --------------------------------------

function drawTitle() {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#1d3461'); g.addColorStop(1, '#14213d');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#2b2f3a'; ctx.fillRect(0, 380, W, 120);
  ctx.fillStyle = '#fff';
  for (let i = -1; i < 10; i++) ctx.fillRect(i * 100 - ((game.t * 160) % 100) + 100, 436, 50, 6);
  // house
  rr(590, 280, 140, 100, 4, '#e9c46a');
  ctx.beginPath(); ctx.moveTo(575, 284); ctx.lineTo(660, 220); ctx.lineTo(745, 284); ctx.closePath(); ctx.fillStyle = '#c0392b'; ctx.fill();
  rr(645, 325, 30, 55, 3, '#7b4b2a'); rr(605, 305, 28, 28, 3, '#aee1f9', '#fff');
  // side-view van
  const vx = 150 + Math.sin(game.t * 2) * 8;
  const vy = 418 + Math.sin(game.t * 18) * 1.2;
  rr(vx - 80, vy - 64, 150, 60, 10, '#fff', '#c9d1dc');
  rr(vx + 24, vy - 56, 38, 24, 5, '#5dade2');
  rr(vx - 80, vy - 30, 150, 10, 0, '#fca311');
  text('FIX-IT', vx - 25, vy - 44, 15, '#14213d', 'center', '800');
  for (const wx of [vx - 48, vx + 40]) {
    ctx.beginPath(); ctx.arc(wx, vy - 2, 14, 0, Math.PI * 2); ctx.fillStyle = '#222'; ctx.fill();
    ctx.beginPath(); ctx.arc(wx, vy - 2, 6, 0, Math.PI * 2); ctx.fillStyle = '#bbb'; ctx.fill();
  }
  text('FIX-IT RUN', W / 2, 90, 64, '#fca311', 'center', '900');
  text("A technician's journey: drive · diagnose · repair", W / 2, 145, 20, '#e5e9f0');
  button('Start the day  ▶', W / 2 - 120, 190, 240, 56, startDay, { size: 22 });
  if (game.best) text(`Best day: $${game.best}`, W / 2, 272, 16, '#9fb3d1');
}

function drawBriefing() {
  const j = job();
  ctx.fillStyle = '#14213d'; ctx.fillRect(0, 0, W, H);
  hud('New service call');
  rr(150, 70, 500, 340, 16, '#fff');
  rr(150, 70, 500, 56, 16, '#fca311'); ctx.fillStyle = '#fca311'; ctx.fillRect(150, 100, 500, 26);
  text('WORK ORDER', 400, 99, 22, '#14213d', 'center', '800');
  const rows = [['Customer', j.customer], ['Appliance', j.name], ['Arrive within', `${Math.ceil((6000 + game.jobIndex * 1500) / ((400 + game.jobIndex * 50) * 0.72))} seconds`]];
  rows.forEach(([k, v], i) => {
    text(k, 190, 160 + i * 38, 16, '#7a8599', 'left');
    text(v, 610, 160 + i * 38, 18, '#14213d', 'right', '700');
  });
  text('Complaint', 190, 276, 16, '#7a8599', 'left');
  wrapText(`“${j.symptom}”`, 190, 302, 420, 16, '#14213d', 22);
  button('Hit the road  ▶', 290, 348, 220, 48, startDrive);
}

function drawDrive() {
  const d = game.drive;
  ctx.fillStyle = '#6ab04c'; ctx.fillRect(0, 0, W, H);
  for (const s of d.scenery) {
    const x = s.side ? 550 + s.off + 20 : 250 - s.off - 20;
    if (s.kind === 'tree') {
      ctx.beginPath(); ctx.arc(x, s.y, 22, 0, Math.PI * 2); ctx.fillStyle = '#2e7d32'; ctx.fill();
      ctx.beginPath(); ctx.arc(x - 5, s.y - 5, 12, 0, Math.PI * 2); ctx.fillStyle = '#43a047'; ctx.fill();
    } else {
      rr(x - 28, s.y - 24, 56, 48, 4, `hsl(${s.hue} 45% 55%)`);
      rr(x - 28, s.y - 3, 56, 6, 0, `hsl(${s.hue} 45% 40%)`);
    }
  }
  ctx.fillStyle = '#3a3f4b'; ctx.fillRect(250, 0, 300, H);
  ctx.fillStyle = '#fff'; ctx.fillRect(254, 0, 4, H); ctx.fillRect(542, 0, 4, H);
  ctx.fillStyle = '#f5d76e';
  for (let y = -60 + d.scroll; y < H; y += 60) { ctx.fillRect(348, y, 4, 30); ctx.fillRect(448, y, 4, 30); }

  // destination house rolls into view at the end of the trip
  const remaining = d.distance - d.travelled;
  if (remaining < 600) {
    const hy = VAN_Y - 90 - remaining;
    rr(250, hy - 6, 300, 12, 0, '#fff');
    rr(560, hy - 60, 120, 100, 6, '#e9c46a'); rr(560, hy - 60, 120, 40, 6, '#c0392b');
    text('🏠 ' + job().customer, 620, hy + 60, 14, '#14213d');
  }

  for (const it of d.items) {
    const x = LANES[it.lane];
    if (it.type === 'car') drawCar(x, it.y, it.hue);
    else if (it.type === 'cone') {
      ctx.beginPath(); ctx.moveTo(x, it.y - 22); ctx.lineTo(x + 16, it.y + 18); ctx.lineTo(x - 16, it.y + 18); ctx.closePath();
      ctx.fillStyle = '#ff7f11'; ctx.fill();
      rr(x - 9, it.y - 2, 18, 6, 0, '#fff'); rr(x - 20, it.y + 16, 40, 6, 2, '#d35400');
    } else if (it.type === 'pothole') {
      ctx.beginPath(); ctx.ellipse(x, it.y, 30, 20, 0, 0, Math.PI * 2); ctx.fillStyle = '#1e2128'; ctx.fill();
      ctx.beginPath(); ctx.ellipse(x + 3, it.y + 2, 20, 12, 0, 0, Math.PI * 2); ctx.fillStyle = '#0d0f13'; ctx.fill();
    } else {
      rr(x - 18, it.y - 18, 36, 36, 5, '#c98f52', '#8a5a2b');
      text('🔧', x, it.y + 1, 18);
    }
  }

  const shake = d.flash > 0 ? Math.sin(game.t * 60) * 4 : 0;
  drawVan(d.x + shake, VAN_Y, (LANES[d.lane] - d.x) * 0.004);
  if (d.flash > 0) { ctx.fillStyle = `rgba(231,76,60,${d.flash * 0.6})`; ctx.fillRect(0, 0, W, H); }

  hud(`Driving to ${job().customer}`);
  // progress + timer panel
  rr(16, 54, 214, 96, 12, 'rgba(20,33,61,0.88)');
  const left = d.allowed - d.elapsed;
  text('Appointment window', 30, 74, 13, '#9fb3d1', 'left');
  text(left >= 0 ? `${left.toFixed(1)}s` : `LATE +${(-left).toFixed(0)}s`, 30, 98, 24, left >= 5 ? '#2ecc71' : left >= 0 ? '#fca311' : '#e74c3c', 'left', '800');
  rr(30, 122, 186, 12, 6, '#3b4a6b');
  rr(30, 122, Math.max(12, 186 * clamp(d.travelled / d.distance, 0, 1)), 12, 6, '#fca311');
  rr(570, 54, 214, 60, 12, 'rgba(20,33,61,0.88)');
  text(`🔧 Parts: ${d.boxes}`, 584, 74, 15, '#fff', 'left');
  text(`💥 Bumps: ${d.hits}`, 584, 97, 15, d.hits ? '#e74c3c' : '#fff', 'left');
  if (game.t < 2.5) text('← →  switch lanes · dodge traffic · grab parts', W / 2, 470, 16, '#fff');
}

function drawDiagnose() {
  const j = job();
  const g = game.diag;
  drawRoom();
  drawAppliance(j.appliance, 300, 332, false);
  drawPerson(450, 388, '#9b59b6', '#e0ac69');
  drawPerson(140, 400, '#1f6feb', '#f1c27d', '#fca311');
  rr(70, 396, 34, 22, 4, '#c0392b'); rr(80, 390, 14, 8, 3, '#922b21'); // toolbox
  hud(`${j.customer}'s home — diagnose the ${j.name.toLowerCase()}`);

  // speech bubble
  rr(400, 190, 380, 96, 14, '#fff', '#14213d');
  ctx.beginPath(); ctx.moveTo(450, 284); ctx.lineTo(456, 306); ctx.lineTo(480, 284); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
  text(j.customer, 416, 208, 13, '#7a8599', 'left', '700');
  wrapText(j.symptom, 416, 232, 350, 16, '#14213d', 21);

  if (g.solved) {
    rr(250, 430, 300, 50, 12, '#2ecc71');
    text(`✔ It's the ${j.options[j.answer].toLowerCase()}!`, 400, 456, 18, '#fff', 'center', '700');
    return;
  }
  const ox = g.shake > 0 ? Math.sin(game.t * 50) * 5 : 0;
  text('What needs replacing?', 400 + ox, 418, 15, '#14213d', 'center', '700');
  j.options.forEach((opt, i) => {
    const bad = g.wrong.includes(i);
    button(`${i + 1}. ${opt}`, 34 + i * 248 + ox, 436, 236, 46, () => chooseOption(i), { disabled: bad, size: 16, fill: '#14213d', color: '#fff' });
  });
}

function drawRepair() {
  const j = job();
  const r = game.repair;
  drawRoom();
  drawAppliance(j.appliance, 300, 332, r.done);
  drawPerson(450, 388, r.done ? '#2ecc71' : '#9b59b6', '#e0ac69');
  // technician crouched at the appliance with a moving wrench
  drawPerson(205, 372, '#1f6feb', '#f1c27d', '#fca311');
  ctx.save();
  ctx.translate(232, 322);
  ctx.rotate(r.done ? -0.6 : Math.sin(game.t * 9) * 0.5);
  rr(0, -3, 34, 6, 3, '#7f8c9b');
  ctx.beginPath(); ctx.arc(36, 0, 7, 0.6, Math.PI * 2 - 0.6); ctx.strokeStyle = '#7f8c9b'; ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
  hud(`Repairing the ${j.name.toLowerCase()} — new ${j.options[j.answer].toLowerCase()}`);

  // step checklist
  rr(560, 200, 220, 110, 12, 'rgba(20,33,61,0.9)');
  REPAIR_STEPS.forEach((s, i) => {
    const done = i < r.step;
    text(`${done ? '✔' : i === r.step ? '▶' : '○'}  ${s}`, 576, 224 + i * 31, 15, done ? '#2ecc71' : i === r.step ? '#fca311' : '#9fb3d1', 'left');
  });

  // timing bar
  const bx = 150, by = 432, bw = 500, bh = 30;
  rr(bx - 10, by - 34, bw + 20, bh + 54, 14, 'rgba(20,33,61,0.9)');
  text(r.done ? 'Appliance is running again!' : 'Press SPACE / tap when the marker is in the green zone', 400, by - 16, 14, '#fff');
  rr(bx, by, bw, bh, 8, '#3b4a6b');
  if (!r.done) {
    rr(bx + r.zone * bw, by, r.zoneW * bw, bh, 6, '#2ecc71');
    rr(bx + r.pos * bw - 4, by - 5, 8, bh + 10, 4, '#fff');
  } else rr(bx, by, bw, bh, 8, '#2ecc71');
  if (r.feedbackT > 0) {
    const good = !r.feedback.startsWith('Oops');
    text(r.feedback, 300, 110 - (0.8 - r.feedbackT) * 30, 28, good ? '#27ae60' : '#e74c3c', 'center', '800');
  }
}

function drawResult() {
  const res = game.result;
  ctx.fillStyle = '#14213d'; ctx.fillRect(0, 0, W, H);
  hud('Job complete');
  rr(170, 60, 460, 410, 16, '#fff');
  text(`${job().customer}'s review`, 400, 92, 20, '#14213d', 'center', '800');
  stars(400, 138, clamp(game.t * 6, 0, res.stars), 40);
  res.notes.forEach(([n, good], i) => text(`${good ? '✔' : '✘'}  ${n}`, 220, 196 + i * 28, 16, good ? '#27ae60' : '#c0392b', 'left'));
  const y = 196 + res.notes.length * 28 + 10;
  ctx.strokeStyle = '#dde3ec'; ctx.beginPath(); ctx.moveTo(210, y); ctx.lineTo(590, y); ctx.stroke();
  const lines = [['Service fee', 80], ['Tip', res.tip], ['Parts bonus', res.bonus]];
  lines.forEach(([k, v], i) => { text(k, 220, y + 22 + i * 24, 15, '#7a8599', 'left'); text(`$${v}`, 580, y + 22 + i * 24, 15, '#14213d', 'right', '700'); });
  text('Total', 220, y + 100, 18, '#14213d', 'left', '800');
  text(`$${res.pay}`, 580, y + 100, 22, '#27ae60', 'right', '800');
  const last = game.jobIndex + 1 >= game.jobs.length;
  button(last ? 'End the day  ▶' : 'Next call  ▶', 300, 412, 200, 46, nextJob);
}

function drawDayEnd() {
  ctx.fillStyle = '#14213d'; ctx.fillRect(0, 0, W, H);
  text('Day complete!', W / 2, 90, 48, '#fca311', 'center', '900');
  const avg = game.dayStars / game.jobs.length;
  stars(W / 2, 170, clamp(game.t * 5, 0, avg), 48);
  text(`Average rating ${avg.toFixed(1)} over ${game.jobs.length} happy homes`, W / 2, 225, 18, '#e5e9f0');
  text(`$${game.dayEarnings}`, W / 2, 290, 64, '#2ecc71', 'center', '900');
  text(game.dayEarnings >= game.best ? '★ New best day! ★' : `Best day: $${game.best}`, W / 2, 345, 18, '#9fb3d1');
  button('Start a new day  ▶', W / 2 - 130, 390, 260, 56, startDay, { size: 22 });
}

const SCENES = { title: drawTitle, briefing: drawBriefing, drive: drawDrive, diagnose: drawDiagnose, repair: drawRepair, result: drawResult, dayEnd: drawDayEnd };

// ----------------------------- main loop -----------------------------------

let lastTime = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  update(dt);
  game.buttons = [];
  ctx.clearRect(0, 0, W, H);
  SCENES[game.state]();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Exposed for debugging in the browser console.
window.__game = game;
