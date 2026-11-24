import { useCallback, useEffect, useRef, useState } from 'react';
import { FastForward, Flag, Play, RotateCcw } from 'lucide-react';
import { Participant } from '../../types/game';
import { sound } from '../../utils/sound';

interface PinballGameProps {
  participants: Participant[];
  winnerCount: number;
  isRunning: boolean;
  onStart: () => void;
  onComplete: (winners: Participant[], prizeMap?: Record<string, string>) => void;
}

interface Marble {
  participant: Participant;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  finished: boolean;
  finishOrder: number;
  stallFrames: number;
}

interface Peg {
  x: number;
  y: number;
  r: number;
}

const ARENA_W = 640;
const ARENA_H = 500;
const FINISH_Y = 466;

export function PinballGame({
  participants,
  winnerCount,
  isRunning,
  onStart,
  onComplete,
}: PinballGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animRef = useRef<number | null>(null);
  const marblesRef = useRef<Marble[]>([]);
  const finishedListRef = useRef<Participant[]>([]);
  const spinnerAngleRef = useRef<number>(0);

  const [lastPlaceWins, setLastPlaceWins] = useState(false);
  const [speed2x, setSpeed2x] = useState(false);
  const [finishedOrder, setFinishedOrder] = useState<Participant[]>([]);
  const [hasFinishedRace, setHasFinishedRace] = useState(false);

  const pegs: Peg[] = (() => {
    const list: Peg[] = [];
    const rows = 7;
    const startY = 92;
    const rowStep = 44;
    for (let r = 0; r < rows; r++) {
      const y = startY + r * rowStep;
      const isOffset = r % 2 === 1;
      const cols = isOffset ? 8 : 9;
      const spacing = 58;
      const offsetX = (ARENA_W - (cols - 1) * spacing) / 2;
      for (let c = 0; c < cols; c++) {
        // Leave space for rotating spinners on row 3
        const x = offsetX + c * spacing;
        if (r === 3 && (Math.abs(x - 210) < 42 || Math.abs(x - 430) < 42)) {
          continue;
        }
        list.push({ x, y, r: 5.5 });
      }
    }
    return list;
  })();

  const createInitialMarbles = useCallback((): Marble[] => {
    const count = participants.length;
    const spreadW = Math.min(460, Math.max(180, count * 36));
    const startX = (ARENA_W - spreadW) / 2;

    // Shuffle horizontal drop order fairly
    const shuffled = [...participants];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    return shuffled.map((p, idx) => {
      const ratio = count > 1 ? idx / (count - 1) : 0.5;
      return {
        participant: p,
        x: startX + ratio * spreadW + (Math.random() - 0.5) * 14,
        y: 26 + (idx % 2) * 14,
        vx: (Math.random() - 0.5) * 1.4,
        vy: Math.random() * 0.5,
        radius: count > 16 ? 10 : 12.5,
        finished: false,
        finishOrder: 0,
        stallFrames: 0,
      };
    });
  }, [participants]);

  const drawArena = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== ARENA_W * dpr) {
      canvas.width = ARENA_W * dpr;
      canvas.height = ARENA_H * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, ARENA_W, ARENA_H);

    // Arena Background
    ctx.fillStyle = '#0F1318';
    ctx.fillRect(0, 0, ARENA_W, ARENA_H);

    // Subtle vertical lane grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.035)';
    ctx.lineWidth = 1;
    for (let gx = 80; gx < ARENA_W; gx += 80) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, ARENA_H);
      ctx.stroke();
    }

    // Side funnel walls at bottom
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(14, 385);
    ctx.lineTo(220, FINISH_Y);
    ctx.moveTo(ARENA_W - 14, 385);
    ctx.lineTo(ARENA_W - 220, FINISH_Y);
    ctx.stroke();

    // Finish line gate
    ctx.strokeStyle = '#E04F33';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(220, FINISH_Y);
    ctx.lineTo(ARENA_W - 220, FINISH_Y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#94A3B8';
    ctx.font = '600 11px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('결승선', ARENA_W / 2, FINISH_Y + 20);

    // Rotating Windmill Bumpers
    const spinners = [
      { x: 210, y: 224, dir: 1 },
      { x: 430, y: 224, dir: -1 },
    ];
    for (const sp of spinners) {
      ctx.save();
      ctx.translate(sp.x, sp.y);
      ctx.rotate(spinnerAngleRef.current * sp.dir);
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-32, 0);
      ctx.lineTo(32, 0);
      ctx.moveTo(0, -32);
      ctx.lineTo(0, 32);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, 6, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
      ctx.restore();
    }

    // Pegs
    for (const peg of pegs) {
      ctx.beginPath();
      ctx.arc(peg.x, peg.y, peg.r, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(peg.x - 1.5, peg.y - 1.5, 2, 0, Math.PI * 2);
      ctx.fillStyle = '#94A3B8';
      ctx.fill();
    }

    // Marbles
    for (const m of marblesRef.current) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.radius, 0, Math.PI * 2);
      ctx.fillStyle = m.participant.color;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = m.finished ? '#FDE047' : '#FFFFFF';
      ctx.stroke();

      ctx.fillStyle = '#FFFFFF';
      ctx.font = `700 ${m.radius > 11 ? 10 : 8}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const label = m.participant.name.slice(0, 2);
      ctx.fillText(label, m.x, m.y + 0.5);
      ctx.restore();
    }

    ctx.restore();
  }, [pegs]);

  useEffect(() => {
    marblesRef.current = createInitialMarbles();
    finishedListRef.current = [];
    setFinishedOrder([]);
    setHasFinishedRace(false);
    drawArena();
  }, [createInitialMarbles, drawArena]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const stepPhysics = useCallback(() => {
    const marbles = marblesRef.current;
    const gravity = 0.24;
    const bounce = 0.72;
    const friction = 0.996;
    let soundCooldown = 0;

    spinnerAngleRef.current += 0.045;

    const spinners = [
      { x: 210, y: 224, dir: 1 },
      { x: 430, y: 224, dir: -1 },
    ];

    for (const m of marbles) {
      if (m.finished) continue;

      m.vy += gravity;
      m.vx *= friction;
      m.vy *= friction;

      // Speed cap
      const maxSpeed = 11;
      const spd = Math.hypot(m.vx, m.vy);
      if (spd > maxSpeed) {
        m.vx = (m.vx / spd) * maxSpeed;
        m.vy = (m.vy / spd) * maxSpeed;
      }

      m.x += m.vx;
      m.y += m.vy;

      // Anti-stall nudge
      if (Math.hypot(m.vx, m.vy) < 0.25) {
        m.stallFrames++;
        if (m.stallFrames > 20) {
          m.vx += (Math.random() - 0.5) * 2.2;
          m.vy -= 1.2;
          m.stallFrames = 0;
        }
      } else {
        m.stallFrames = 0;
      }

      // Arena side walls
      if (m.x - m.radius < 14) {
        m.x = 14 + m.radius;
        m.vx = Math.abs(m.vx) * bounce;
      } else if (m.x + m.radius > ARENA_W - 14) {
        m.x = ARENA_W - 14 - m.radius;
        m.vx = -Math.abs(m.vx) * bounce;
      }

      // Bottom funnel walls (left: (14,385)->(220,466), right: (626,385)->(420,466))
      if (m.y > 375 && m.y < FINISH_Y + 5) {
        const progress = (m.y - 385) / (FINISH_Y - 385);
        if (progress >= 0) {
          const leftWallX = 14 + progress * (220 - 14);
          const rightWallX = ARENA_W - 14 - progress * (220 - 14);
          if (m.x - m.radius < leftWallX) {
            m.x = leftWallX + m.radius;
            m.vx = Math.abs(m.vx) * 0.65 + 1.1;
          }
          if (m.x + m.radius > rightWallX) {
            m.x = rightWallX - m.radius;
            m.vx = -Math.abs(m.vx) * 0.65 - 1.1;
          }
        }
      }

      // Peg collisions
      for (const peg of pegs) {
        const dx = m.x - peg.x;
        const dy = m.y - peg.y;
        const dist = Math.hypot(dx, dy);
        const minDist = m.radius + peg.r;
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = minDist - dist;
          m.x += nx * overlap;
          m.y += ny * overlap;

          const dot = m.vx * nx + m.vy * ny;
          if (dot < 0) {
            m.vx = (m.vx - 2 * dot * nx) * bounce + (Math.random() - 0.5) * 0.35;
            m.vy = (m.vy - 2 * dot * ny) * bounce;
            if (soundCooldown === 0 && Math.abs(dot) > 1.8) {
              sound.playBounce(Math.abs(dot));
              soundCooldown = 1;
            }
          }
        }
      }

      // Rotating Spinner bumper collisions (4 blades modeled as circle hubs + rotating points)
      for (const sp of spinners) {
        const angleBase = spinnerAngleRef.current * sp.dir;
        for (let b = 0; b < 4; b++) {
          const bladeAngle = angleBase + (b * Math.PI) / 2;
          for (const rDist of [12, 24, 32]) {
            const bx = sp.x + Math.cos(bladeAngle) * rDist;
            const by = sp.y + Math.sin(bladeAngle) * rDist;
            const dx = m.x - bx;
            const dy = m.y - by;
            const dist = Math.hypot(dx, dy);
            const minDist = m.radius + 4;
            if (dist < minDist && dist > 0.001) {
              const nx = dx / dist;
              const ny = dy / dist;
              m.x += nx * (minDist - dist);
              m.y += ny * (minDist - dist);
              m.vx = nx * 3.8 + sp.dir * -Math.sin(bladeAngle) * 2.2;
              m.vy = ny * 3.8 + sp.dir * Math.cos(bladeAngle) * 2.2;
            }
          }
        }
      }

      // Check finish line
      if (m.y >= FINISH_Y) {
        m.finished = true;
        m.y = FINISH_Y + 8;
        m.vx = 0;
        m.vy = 0;
        finishedListRef.current = [...finishedListRef.current, m.participant];
        m.finishOrder = finishedListRef.current.length;
        setFinishedOrder([...finishedListRef.current]);
        sound.playStep(m.finishOrder);
      }
    }

    // Marble-to-marble collisions
    for (let i = 0; i < marbles.length; i++) {
      for (let j = i + 1; j < marbles.length; j++) {
        const a = marbles[i];
        const b = marbles[j];
        if (a.finished || b.finished) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy);
        const minDist = a.radius + b.radius;
        if (dist < minDist && dist > 0.001) {
          const nx = dx / dist;
          const ny = dy / dist;
          const overlap = (minDist - dist) * 0.5;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          const dvx = a.vx - b.vx;
          const dvy = a.vy - b.vy;
          const impact = dvx * nx + dvy * ny;
          if (impact > 0) {
            const impulse = impact * 0.85;
            a.vx -= impulse * nx;
            a.vy -= impulse * ny;
            b.vx += impulse * nx;
            b.vy += impulse * ny;
          }
        }
      }
    }
  }, [pegs]);

  const startRace = () => {
    if (isRunning || participants.length < 2) return;
    marblesRef.current = createInitialMarbles();
    finishedListRef.current = [];
    setFinishedOrder([]);
    setHasFinishedRace(false);
    onStart();

    const targetWinCount = Math.min(winnerCount, participants.length);

    const loop = () => {
      const subSteps = speed2x ? 2 : 1;
      for (let s = 0; s < subSteps; s++) {
        stepPhysics();
      }
      drawArena();

      const doneCount = finishedListRef.current.length;
      const shouldStop = lastPlaceWins
        ? doneCount >= participants.length
        : doneCount >= targetWinCount;

      if (!shouldStop && doneCount < participants.length) {
        animRef.current = requestAnimationFrame(loop);
      } else {
        setHasFinishedRace(true);
        const ordered = finishedListRef.current;
        const winners = lastPlaceWins
          ? ordered.slice(-targetWinCount).reverse()
          : ordered.slice(0, targetWinCount);

        const prizeMap: Record<string, string> = {};
        winners.forEach((w, idx) => {
          prizeMap[w.id] = lastPlaceWins
            ? `꼴찌 당첨 (${ordered.length - idx}등)`
            : `${idx + 1}등 통과`;
        });

        setTimeout(() => {
          onComplete(winners, prizeMap);
        }, 450);
      }
    };

    animRef.current = requestAnimationFrame(loop);
  };

  const resetRace = () => {
    if (isRunning) return;
    marblesRef.current = createInitialMarbles();
    finishedListRef.current = [];
    setFinishedOrder([]);
    setHasFinishedRace(false);
    drawArena();
  };

  return (
    <div className="bg-[#161B22] text-white rounded-2xl p-5 sm:p-7 flex flex-col gap-5 border border-[#252D38]">
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#232A34] rounded-lg">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setLastPlaceWins(false)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
              !lastPlaceWins ? 'bg-[#E04F33] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            1등 당첨 (선착순)
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setLastPlaceWins(true)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap ${
              lastPlaceWins ? 'bg-[#E04F33] text-white' : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            꼴찌 당첨 (최후)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSpeed2x(!speed2x)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
              speed2x
                ? 'bg-[#F59E0B] text-[#161615] font-semibold'
                : 'bg-[#232A34] text-[#CBD5E1] hover:bg-[#2E3744]'
            }`}
          >
            <FastForward className="w-3.5 h-3.5" />
            {speed2x ? '2배속 켜짐' : '1배속'}
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={resetRace}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#232A34] hover:bg-[#2E3744] text-[#CBD5E1] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            재배치
          </button>
        </div>
      </div>

      {/* Arena Canvas */}
      <div className="w-full flex justify-center">
        <canvas
          ref={canvasRef}
          className="w-full max-w-[640px] aspect-[640/500] rounded-xl border border-[#2A3340]"
        />
      </div>

      {/* Live Standings */}
      {finishedOrder.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-[#232A34] rounded-xl">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#94A3B8] mr-1">
            <Flag className="w-3.5 h-3.5" />
            통과 순서:
          </span>
          {finishedOrder.map((p, idx) => (
            <span
              key={`${p.id}-${idx}`}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#161B22] text-xs font-medium text-white tabular-nums"
            >
              <span className="text-[#94A3B8]">{idx + 1}.</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: p.color }}
              />
              {p.name}
            </span>
          ))}
        </div>
      )}

      {/* Primary Action */}
      <div className="flex justify-center">
        <button
          type="button"
          disabled={isRunning || participants.length < 2}
          onClick={startRace}
          className="w-full sm:w-auto min-w-[220px] h-12 px-8 rounded-xl bg-[#E04F33] hover:bg-[#C94127] disabled:opacity-40 text-white font-display text-base font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          {isRunning
            ? '레이스 진행 중...'
            : hasFinishedRace
            ? '다시 레이스 시작'
            : '구슬 떨어뜨리기'}
        </button>
      </div>
    </div>
  );
}
