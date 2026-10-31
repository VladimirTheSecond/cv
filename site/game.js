// Friday Release: a one-button game. Keep the roadster in the air through every pipeline stage.
(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const touchFirst = window.matchMedia('(pointer: coarse)').matches;

  // Physics runs in world units; the world is at least 400 x 600 units and is scaled to the screen
  const GRAVITY = 1400;
  const THRUST = -430;
  const THRUST_TIME = 0.18;
  const SPEED = 170;
  const GAP = 180;
  const STAGE_WIDTH = 64;
  const STAGE_SPACING = 270;
  const STAGES = ['lint', 'build', 'unit tests', 'security scan', 'docker build',
                  'integration', 'terraform plan', 'terraform apply', 'smoke tests', 'deploy'];

  // Hitbox is a bit smaller than the drawing, so near misses feel fair
  const CAR_HALF_W = 30;
  const CAR_HALF_H = 10;

  // Car geometry in car-local units (nose points to +x, ground is +y)
  const WHEELS = [-23, 19];
  const WHEEL_Y = 4.5;
  const WHEEL_R = 7.5;
  const THRUSTERS = [-11, 5];
  const THRUSTER_Y = 6.5;

  const COLORS = {
    bg: '#070a12',
    body: '#eef2f7',
    bodyShade: '#aab4c3',
    sill: '#1f2937',
    glass: '#3b3426',
    arch: '#05070c',
    taillight: '#ff2d55',
    beam: '#e0f2fe',
    vapor: '#dbeafe',
    tire: '#0f172a',
    rim: '#cbd5e1',
    stage: '#22d3ee',
    passed: '#4ade80',
    failed: '#ff2d55',
    text: '#e8edf4',
    muted: '#94a3b8',
  };
  const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const MONO = 'ui-monospace, SFMono-Regular, Menlo, monospace';

  let dpr = 1;
  let scale = 1;
  let worldW = 400;
  let worldH = 600;
  let state = 'ready'; // ready | playing | failed | released
  let car;
  let stages;
  let stars;
  let puffs = [];
  let spawned;
  let passed;
  let failMessage = '';
  let best = loadBest();
  let wheelAngle = 0;
  let lockedUntil = 0;

  function loadBest() {
    try {
      return Number(localStorage.getItem('friday-release-best')) || 0;
    } catch {
      return 0;
    }
  }

  function saveBest(value) {
    try {
      localStorage.setItem('friday-release-best', String(value));
    } catch {
      // Storage can be blocked (private mode); the game works without it
    }
  }

  function resize() {
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    scale = Math.min(window.innerHeight / 600, window.innerWidth / 400);
    worldW = window.innerWidth / scale;
    worldH = window.innerHeight / scale;
    stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * worldW,
      y: Math.random() * worldH,
      z: 0.2 + Math.random() * 0.8,
    }));
  }

  function reset() {
    car = { x: Math.max(90, worldW * 0.25), y: worldH / 2, vy: 0, thrust: 0 };
    stages = [];
    puffs = [];
    spawned = 0;
    passed = 0;
  }

  function carAngle() {
    return state === 'ready' ? 0 : Math.max(-0.5, Math.min(0.9, car.vy / 700));
  }

  // Cold gas thrusters under the car blow vapour downwards (in the car's own frame)
  function emitPuffs() {
    const angle = carAngle();
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    for (const tx of THRUSTERS) {
      const nozzleX = car.x + tx * cos - THRUSTER_Y * sin;
      const nozzleY = car.y + tx * sin + THRUSTER_Y * cos;
      for (let i = 0; i < 5; i++) {
        const push = 220 + Math.random() * 120;
        puffs.push({
          x: nozzleX + (Math.random() - 0.5) * 3,
          y: nozzleY,
          vx: -sin * push - SPEED * 0.5 + (Math.random() - 0.5) * 40,
          vy: cos * push,
          r: 1.5 + Math.random() * 2,
          life: 0.45 + Math.random() * 0.3,
          age: 0,
        });
      }
    }
  }

  function press() {
    // A frantic tap right after a crash should not restart the game instantly
    if (performance.now() < lockedUntil) return;
    if (state !== 'playing') {
      reset();
      state = 'playing';
      document.body.classList.remove('released');
    }
    car.vy = THRUST;
    car.thrust = THRUST_TIME;
    emitPuffs();
  }

  function finish(result) {
    state = result;
    car.thrust = 0;
    lockedUntil = performance.now() + 600;
    if (passed > best) {
      best = passed;
      saveBest(best);
    }
    if (result === 'released') document.body.classList.add('released');
  }

  function hits(stage) {
    const overlapX = car.x + CAR_HALF_W > stage.x && car.x - CAR_HALF_W < stage.x + STAGE_WIDTH;
    if (!overlapX) return false;
    return car.y - CAR_HALF_H < stage.gapY - GAP / 2 || car.y + CAR_HALF_H > stage.gapY + GAP / 2;
  }

  function update(dt) {
    const drift = state === 'playing' ? SPEED : (reduceMotion ? 0 : 40);
    for (const star of stars) {
      star.x -= drift * star.z * dt;
      if (star.x < 0) {
        star.x += worldW;
        star.y = Math.random() * worldH;
      }
    }

    // Vapour keeps fading in every state, also after a crash
    for (const puff of puffs) {
      puff.age += dt;
      puff.x += puff.vx * dt;
      puff.y += puff.vy * dt;
      puff.r += 16 * dt;
    }
    puffs = puffs.filter((puff) => puff.age < puff.life);

    // Before the launch the car stands still: electric, silent, no vapour
    if (state !== 'playing') return;

    wheelAngle += (SPEED * dt) / WHEEL_R;
    car.thrust = Math.max(0, car.thrust - dt);
    car.vy += GRAVITY * dt;
    car.y += car.vy * dt;

    const lastStage = stages[stages.length - 1];
    if (spawned < STAGES.length && (!lastStage || lastStage.x < worldW - STAGE_SPACING)) {
      const margin = 60 + GAP / 2;
      stages.push({
        x: worldW + 20,
        gapY: margin + Math.random() * (worldH - 2 * margin),
        name: STAGES[spawned],
        passed: false,
        failed: false,
      });
      spawned++;
    }

    for (const stage of stages) {
      stage.x -= SPEED * dt;
      if (!stage.passed && stage.x + STAGE_WIDTH < car.x - CAR_HALF_W) {
        stage.passed = true;
        passed++;
      }
      if (hits(stage)) {
        stage.failed = true;
        failMessage = `Pipeline failed at stage "${stage.name}"`;
        finish('failed');
        return;
      }
    }
    stages = stages.filter((stage) => stage.x + STAGE_WIDTH > -10);

    if (car.y < -30 || car.y > worldH) {
      failMessage = 'The roadster left the cluster. Pipeline failed';
      finish('failed');
      return;
    }

    if (passed === STAGES.length) finish('released');
  }

  function drawStage(stage) {
    const color = stage.failed ? COLORS.failed : stage.passed ? COLORS.passed : COLORS.stage;
    const top = stage.gapY - GAP / 2;
    const bottom = stage.gapY + GAP / 2;

    ctx.save();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(stage.x, -10, STAGE_WIDTH, top + 10);
    ctx.fillRect(stage.x, bottom, STAGE_WIDTH, worldH - bottom + 10);

    ctx.globalAlpha = 1;
    ctx.shadowColor = color;
    ctx.shadowBlur = 16;
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.strokeRect(stage.x, -10, STAGE_WIDTH, top + 10);
    ctx.strokeRect(stage.x, bottom, STAGE_WIDTH, worldH - bottom + 10);

    // Stage name runs vertically along the taller block, so it always fits
    ctx.shadowBlur = 0;
    ctx.font = `600 14px ${MONO}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const inTop = top > worldH - bottom;
    ctx.translate(stage.x + STAGE_WIDTH / 2, inTop ? top - 14 : bottom + 14);
    ctx.rotate(inTop ? -Math.PI / 2 : Math.PI / 2);
    const mark = stage.passed ? '✓ ' : stage.failed ? '✗ ' : '';
    ctx.fillText(mark + stage.name, 0, 0);
    ctx.restore();
  }

  // Two bright cold gas jets pointing down from the underbody
  function drawThrusterBeams(power) {
    const length = 28;
    ctx.save();
    ctx.globalAlpha = power;
    ctx.shadowColor = COLORS.beam;
    ctx.shadowBlur = 14;
    for (const tx of THRUSTERS) {
      const gradient = ctx.createLinearGradient(0, THRUSTER_Y, 0, THRUSTER_Y + length);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.4, COLORS.beam);
      gradient.addColorStop(1, 'rgba(224, 242, 254, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(tx - 1.5, THRUSTER_Y);
      ctx.lineTo(tx + 1.5, THRUSTER_Y);
      ctx.lineTo(tx + 4.5, THRUSTER_Y + length);
      ctx.lineTo(tx - 4.5, THRUSTER_Y + length);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // Side view of the white roadster: long low nose, raked windshield, long fastback, no spoiler
  function drawRoadster(x, y, angle) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    if (car.thrust > 0) drawThrusterBeams(car.thrust / THRUST_TIME);

    // Body silhouette: low pointed nose, one smooth arc over the roof, high cut-off tail
    ctx.shadowColor = COLORS.body;
    ctx.shadowBlur = 14;
    ctx.fillStyle = COLORS.body;
    ctx.beginPath();
    ctx.moveTo(41, 1.5);                                // sharp nose tip
    ctx.quadraticCurveTo(30, -2, 16, -6);               // hood rising to the windshield
    ctx.bezierCurveTo(4, -14, -20, -12, -38, -8);       // windshield, roof and fastback in one arc
    ctx.lineTo(-41, -9);                                // small upswept tail tip
    ctx.lineTo(-40, 2);                                 // cut-off rear face
    ctx.lineTo(-37, 6);
    ctx.lineTo(34.5, 6);                                // underbody
    ctx.closePath();                                    // angled chin back to the nose tip
    ctx.fill();
    ctx.shadowBlur = 0;

    // Dark lower sill along the side
    ctx.fillStyle = COLORS.sill;
    ctx.beginPath();
    ctx.moveTo(34.5, 6);
    ctx.lineTo(32, 4.2);
    ctx.lineTo(-37.5, 2.5);
    ctx.lineTo(-37, 6);
    ctx.closePath();
    ctx.fill();

    // Body crease from the nose to the tail
    ctx.strokeStyle = COLORS.bodyShade;
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(36, 1);
    ctx.lineTo(-39, -2);
    ctx.stroke();

    // Long side window following the roof arc, sharp rear point
    ctx.fillStyle = COLORS.glass;
    ctx.beginPath();
    ctx.moveTo(13, -5.8);
    ctx.quadraticCurveTo(2, -11.5, -6, -10.3);
    ctx.quadraticCurveTo(-18, -9.8, -30, -6.5);
    ctx.lineTo(-14, -4.5);
    ctx.closePath();
    ctx.fill();

    // Thin headlight along the nose and the red light bar on the tail
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#ffffff';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(39.5, 0.8);
    ctx.lineTo(31, -1.2);
    ctx.stroke();
    ctx.shadowColor = COLORS.taillight;
    ctx.fillStyle = COLORS.taillight;
    ctx.fillRect(-41, -6.5, 1.8, 2.5);
    ctx.shadowBlur = 0;

    // Thruster nozzles under the body
    ctx.fillStyle = COLORS.sill;
    for (const tx of THRUSTERS) ctx.fillRect(tx - 2, 5.5, 4, 1.5);

    // Large wheels in dark arches, thin silver spokes
    for (const wx of WHEELS) {
      ctx.fillStyle = COLORS.arch;
      ctx.beginPath();
      ctx.arc(wx, WHEEL_Y, WHEEL_R + 1.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = COLORS.tire;
      ctx.beginPath();
      ctx.arc(wx, WHEEL_Y, WHEEL_R, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = COLORS.rim;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(wx, WHEEL_Y, WHEEL_R - 1.6, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 1.3;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = wheelAngle + (i * Math.PI * 2) / 5;
        ctx.moveTo(wx + Math.cos(a) * 1.2, WHEEL_Y + Math.sin(a) * 1.2);
        ctx.lineTo(wx + Math.cos(a) * (WHEEL_R - 1.6), WHEEL_Y + Math.sin(a) * (WHEEL_R - 1.6));
      }
      ctx.stroke();

      ctx.fillStyle = COLORS.rim;
      ctx.beginPath();
      ctx.arc(wx, WHEEL_Y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  // Shrinks the font when the text is wider than the screen (narrow phones)
  function setFittedFont(text, weight, size) {
    ctx.font = `${weight} ${size}px ${FONT}`;
    const width = ctx.measureText(text).width;
    if (width > worldW - 32) ctx.font = `${weight} ${size * (worldW - 32) / width}px ${FONT}`;
  }

  function centerText(title, hint, color) {
    const y = worldH * 0.28;
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    ctx.fillStyle = color;
    setFittedFont(title, 700, 26);
    ctx.fillText(title, worldW / 2, y);
    ctx.shadowBlur = 0;
    ctx.fillStyle = COLORS.muted;
    setFittedFont(hint, 500, 17);
    ctx.fillText(hint, worldW / 2, y + 36);
    ctx.restore();
  }

  function drawHud() {
    if (state !== 'ready') {
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.font = `600 16px ${MONO}`;
      ctx.fillStyle = COLORS.text;
      ctx.fillText(`stages ${passed}/${STAGES.length}`, 16, 16);
      ctx.fillStyle = COLORS.muted;
      ctx.fillText(`best   ${best}/${STAGES.length}`, 16, 38);
    }

    const action = touchFirst ? 'Tap' : 'Press space';
    if (state === 'ready') {
      centerText('Friday release, we should hurry up!', `${action} to launch the pipeline`, COLORS.text);
    } else if (state === 'failed') {
      centerText(failMessage, `${action} to retry`, COLORS.failed);
    } else if (state === 'released') {
      centerText('Released to production. On a Friday.', `${action} to play again, or check out my CV`, COLORS.passed);
    }
  }

  function draw() {
    ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, worldW, worldH);

    ctx.fillStyle = '#ffffff';
    for (const star of stars) {
      ctx.globalAlpha = 0.3 + star.z * 0.7;
      const size = 0.5 + star.z * 1.5;
      ctx.fillRect(star.x, star.y, size, size);
    }
    ctx.globalAlpha = 1;

    for (const stage of stages) drawStage(stage);

    // Vapour first, so it stays behind the car
    ctx.fillStyle = COLORS.vapor;
    for (const puff of puffs) {
      ctx.globalAlpha = 0.6 * (1 - puff.age / puff.life);
      ctx.beginPath();
      ctx.arc(puff.x, puff.y, puff.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawRoadster(car.x, car.y, carAngle());

    drawHud();
  }

  window.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' && event.code !== 'ArrowUp') return;
    event.preventDefault(); // Space would otherwise scroll the page
    if (!event.repeat) press();
  });

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    press();
  });

  window.addEventListener('resize', () => {
    resize();
    if (state !== 'playing') reset();
  });

  resize();
  reset();

  let last = performance.now();
  function frame(now) {
    // Clamp the step: after a background tab the car must not teleport through a stage
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
