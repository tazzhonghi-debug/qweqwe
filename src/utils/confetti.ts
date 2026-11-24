import { GAME_COLORS } from '../types/game';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vRot: number;
  alpha: number;
}

export function launchConfetti() {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  canvas.style.zIndex = '9999';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    canvas.remove();
    return;
  }

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.scale(dpr, dpr);

  const particles: Particle[] = [];
  const count = 90;
  const originX = window.innerWidth * 0.5;
  const originY = window.innerHeight * 0.42;

  for (let i = 0; i < count; i++) {
    const angle = (Math.random() * Math.PI * 2);
    const speed = 4 + Math.random() * 11;
    particles.push({
      x: originX + (Math.random() - 0.5) * 80,
      y: originY + (Math.random() - 0.5) * 40,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 4.5,
      size: 6 + Math.random() * 6,
      color: GAME_COLORS[i % GAME_COLORS.length],
      rotation: Math.random() * Math.PI * 2,
      vRot: (Math.random() - 0.5) * 0.25,
      alpha: 1,
    });
  }

  let frame = 0;
  const maxFrames = 110;

  function tick() {
    if (!ctx) return;
    frame++;
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.34;
      p.vx *= 0.985;
      p.rotation += p.vRot;
      if (frame > 65) {
        p.alpha = Math.max(0, 1 - (frame - 65) / (maxFrames - 65));
      }

      ctx.save();
      ctx.globalAlpha = p.alpha;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
      ctx.restore();
    }

    if (frame < maxFrames) {
      requestAnimationFrame(tick);
    } else {
      canvas.remove();
    }
  }

  requestAnimationFrame(tick);
}
