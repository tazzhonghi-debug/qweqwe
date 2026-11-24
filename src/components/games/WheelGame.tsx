import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, Zap } from 'lucide-react';
import { Participant } from '../../types/game';
import { sound } from '../../utils/sound';

interface WheelGameProps {
  participants: Participant[];
  winnerCount: number;
  isRunning: boolean;
  onStart: () => void;
  onComplete: (winners: Participant[]) => void;
}

interface WheelSlice {
  participant: Participant;
  startAngle: number;
  endAngle: number;
  midAngle: number;
}

export function WheelGame({
  participants,
  winnerCount,
  isRunning,
  onStart,
  onComplete,
}: WheelGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rotationRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const flapperKickRef = useRef<number>(0);

  const [fastMode, setFastMode] = useState(false);
  const [currentPointerName, setCurrentPointerName] = useState<string>('');
  const [collectedWinners, setCollectedWinners] = useState<Participant[]>([]);
  const [roundIndex, setRoundIndex] = useState<number>(0);

  // Remaining pool during multi-winner sequential spins
  const [poolIds, setPoolIds] = useState<string[] | null>(null);

  const displayParticipants = useMemo(() => {
    if (poolIds) {
      const set = new Set(poolIds);
      return participants.filter((p) => set.has(p.id));
    }
    return participants;
  }, [participants, poolIds]);

  const slices: WheelSlice[] = useMemo(() => {
    if (displayParticipants.length === 0) return [];
    const totalWeight = displayParticipants.reduce((sum, p) => sum + Math.max(1, p.weight), 0);
    let current = 0;
    return displayParticipants.map((p) => {
      const ratio = Math.max(1, p.weight) / totalWeight;
      const arc = ratio * Math.PI * 2;
      const slice: WheelSlice = {
        participant: p,
        startAngle: current,
        endAngle: current + arc,
        midAngle: current + arc / 2,
      };
      current += arc;
      return slice;
    });
  }, [displayParticipants]);

  const getSliceAtPointer = useCallback(
    (rot: number, currentSlices: WheelSlice[]): WheelSlice | null => {
      if (currentSlices.length === 0) return null;
      // Pointer is at -PI/2 (top 12 o'clock)
      const pointerAngle = ((-Math.PI / 2 - rot) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2);
      for (const s of currentSlices) {
        if (pointerAngle >= s.startAngle && pointerAngle < s.endAngle) {
          return s;
        }
      }
      return currentSlices[currentSlices.length - 1];
    },
    []
  );

  const drawWheel = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 440;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const radius = 194;

    if (slices.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fillStyle = '#252B33';
      ctx.fill();
      ctx.strokeStyle = '#38414C';
      ctx.lineWidth = 6;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '600 15px "Noto Sans KR", sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('참가자를 2명 이상 추가하세요', cx, cy);
      ctx.restore();
      return;
    }

    // Outer subtle drop shadow ring
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 8, 0, Math.PI * 2);
    ctx.fillStyle = '#0B0E12';
    ctx.fill();

    // Draw slices rotated
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotationRef.current);

    for (const slice of slices) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, slice.startAngle, slice.endAngle);
      ctx.closePath();
      ctx.fillStyle = slice.participant.color;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.88)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Label along midAngle
      const arcSpan = slice.endAngle - slice.startAngle;
      if (arcSpan > 0.14) {
        ctx.save();
        ctx.rotate(slice.midAngle);
        ctx.fillStyle = '#FFFFFF';
        const fontSize = slices.length > 14 ? 11 : slices.length > 9 ? 13 : 15;
        ctx.font = `700 ${fontSize}px "Noto Sans KR", sans-serif`;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 3;

        const maxLen = slices.length > 12 ? 7 : 10;
        const raw = slice.participant.name;
        const label = raw.length > maxLen ? `${raw.slice(0, maxLen - 1)}…` : raw;
        ctx.fillText(label, radius - 22, 0);
        ctx.restore();
      }
    }

    // Rim pegs
    for (const slice of slices) {
      const px = Math.cos(slice.startAngle) * (radius - 4);
      const py = Math.sin(slice.startAngle) * (radius - 4);
      ctx.beginPath();
      ctx.arc(px, py, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = '#FFFFFF';
      ctx.fill();
    }

    ctx.restore();

    // Outer metallic bezel
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(cx, cy, 26, 0, Math.PI * 2);
    ctx.fillStyle = '#161615';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#E04F33';
    ctx.fill();

    // Top pointer flapper
    ctx.save();
    ctx.translate(cx, cy - radius - 2);
    ctx.rotate(flapperKickRef.current);
    ctx.beginPath();
    ctx.moveTo(-13, -16);
    ctx.lineTo(13, -16);
    ctx.lineTo(0, 16);
    ctx.closePath();
    ctx.fillStyle = '#E04F33';
    ctx.fill();
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = '#FFFFFF';
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }, [slices]);

  useEffect(() => {
    drawWheel();
  }, [drawWheel]);

  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const spinOnce = useCallback(
    (
      currentPool: Participant[],
      targetCount: number,
      alreadyWon: Participant[],
      stepNum: number
    ) => {
      if (currentPool.length === 0) {
        onComplete(alreadyWon);
        return;
      }

      // Recompute slices for this pool
      const totalWeight = currentPool.reduce((sum, p) => sum + Math.max(1, p.weight), 0);
      let acc = 0;
      const localSlices: WheelSlice[] = currentPool.map((p) => {
        const arc = (Math.max(1, p.weight) / totalWeight) * Math.PI * 2;
        const s: WheelSlice = {
          participant: p,
          startAngle: acc,
          endAngle: acc + arc,
          midAngle: acc + arc / 2,
        };
        acc += arc;
        return s;
      });

      const startRot = rotationRef.current;
      const extraTurns = fastMode ? 5 + Math.random() * 2 : 8 + Math.random() * 4;
      const randomTargetOffset = Math.random() * Math.PI * 2;
      const totalDelta = extraTurns * Math.PI * 2 + randomTargetOffset;
      const duration = fastMode ? 2200 : 4400;
      const startTime = performance.now();

      let lastSliceId: string | null = null;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Quintic ease-out for realistic friction
        const eased = 1 - Math.pow(1 - t, 4.2);
        const currentRot = startRot + totalDelta * eased;
        rotationRef.current = currentRot;

        // Decay flapper kick
        flapperKickRef.current *= 0.82;

        const currentSlice = getSliceAtPointer(currentRot, localSlices);
        if (currentSlice) {
          setCurrentPointerName(currentSlice.participant.name);
          if (lastSliceId && lastSliceId !== currentSlice.participant.id) {
            flapperKickRef.current = -0.38;
            sound.playTick(0.85 + (1 - t) * 0.4);
          }
          lastSliceId = currentSlice.participant.id;
        }

        drawWheel();

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          flapperKickRef.current = 0;
          drawWheel();

          const winningSlice = getSliceAtPointer(rotationRef.current, localSlices);
          const winner = winningSlice ? winningSlice.participant : currentPool[0];
          const nextWon = [...alreadyWon, winner];
          setCollectedWinners(nextWon);

          if (nextWon.length < targetCount && currentPool.length > 1) {
            const nextPool = currentPool.filter((p) => p.id !== winner.id);
            setPoolIds(nextPool.map((p) => p.id));
            setRoundIndex(stepNum + 1);
            setTimeout(() => {
              spinOnce(nextPool, targetCount, nextWon, stepNum + 1);
            }, 650);
          } else {
            setTimeout(() => {
              setPoolIds(null);
              setRoundIndex(0);
              onComplete(nextWon);
            }, 450);
          }
        }
      };

      animFrameRef.current = requestAnimationFrame(animate);
    },
    [drawWheel, fastMode, getSliceAtPointer, onComplete]
  );

  const handleStartSpin = () => {
    if (isRunning || participants.length < 2) return;
    const effectiveCount = Math.min(winnerCount, participants.length);
    setCollectedWinners([]);
    setPoolIds(participants.map((p) => p.id));
    setRoundIndex(1);
    onStart();
    spinOnce(participants, effectiveCount, [], 1);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Stage Canvas Card */}
      <div className="bg-[#161B22] text-white rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-between gap-6 border border-[#252D38]">
        {/* Top live indicator */}
        <div className="w-full flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-[#94A3B8]">
              {isRunning
                ? winnerCount > 1
                  ? `${roundIndex} / ${Math.min(winnerCount, participants.length)}번째 추첨 중`
                  : '룰렛 회전 중'
                : '가중치 비율대로 면적이 배분됩니다'}
            </span>
          </div>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => setFastMode(!fastMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 ${
              fastMode
                ? 'bg-[#E04F33] text-white'
                : 'bg-[#232A34] text-[#CBD5E1] hover:bg-[#2E3744]'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            빠른 회전 {fastMode ? '켜짐' : '꺼짐'}
          </button>
        </div>

        {/* Live pointed name readout */}
        <div className="h-9 flex items-center justify-center">
          {currentPointerName ? (
            <div className="px-4 py-1.5 rounded-lg bg-[#232A34] border border-[#333D4B] font-display text-lg font-bold tracking-tight text-white">
              {currentPointerName}
            </div>
          ) : (
            <span className="text-sm text-[#64748B]">
              시작 버튼을 눌러 룰렛을 돌려보세요
            </span>
          )}
        </div>

        {/* Wheel Canvas */}
        <div className="relative flex items-center justify-center w-full max-w-[440px] aspect-square">
          <canvas
            ref={canvasRef}
            className="w-full h-full max-w-[440px] max-h-[440px]"
          />
        </div>

        {/* Collected multi-winner preview */}
        {collectedWinners.length > 0 && (
          <div className="w-full flex flex-wrap items-center justify-center gap-2 pt-1">
            <span className="text-xs text-[#94A3B8]">확정된 당첨자:</span>
            {collectedWinners.map((w, idx) => (
              <span
                key={`${w.id}-${idx}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#232A34] text-xs font-semibold text-white"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: w.color }}
                />
                {w.name}
              </span>
            ))}
          </div>
        )}

        {/* Primary Action */}
        <button
          type="button"
          disabled={isRunning || participants.length < 2}
          onClick={handleStartSpin}
          className="w-full sm:w-auto min-w-[220px] h-12 px-8 rounded-xl bg-[#E04F33] hover:bg-[#C94127] disabled:opacity-40 text-white font-display text-base font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          {isRunning ? '추첨 진행 중...' : '룰렛 돌리기'}
        </button>
      </div>
    </div>
  );
}
