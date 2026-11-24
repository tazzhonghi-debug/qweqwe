import { useEffect, useState } from 'react';
import { PackageOpen, Play, RotateCcw } from 'lucide-react';
import { Participant } from '../../types/game';
import { sound } from '../../utils/sound';

interface GachaGameProps {
  participants: Participant[];
  winnerCount: number;
  isRunning: boolean;
  onStart: () => void;
  onComplete: (winners: Participant[]) => void;
}

type GachaPhase = 'IDLE' | 'SHAKING' | 'DROPPED' | 'OPENED';

function pickWeightedRandom(pool: Participant[]): Participant {
  const totalWeight = pool.reduce((sum, p) => sum + Math.max(1, p.weight), 0);
  let r = Math.random() * totalWeight;
  for (const p of pool) {
    r -= Math.max(1, p.weight);
    if (r <= 0) return p;
  }
  return pool[pool.length - 1];
}

export function GachaGame({
  participants,
  winnerCount,
  isRunning,
  onStart,
  onComplete,
}: GachaGameProps) {
  const [phase, setPhase] = useState<GachaPhase>('IDLE');
  const [dialRotation, setDialRotation] = useState(0);
  const [remainingPool, setRemainingPool] = useState<Participant[]>(participants);
  const [currentCapsuleWinner, setCurrentCapsuleWinner] = useState<Participant | null>(null);
  const [revealedWinners, setRevealedWinners] = useState<Participant[]>([]);

  const targetCount = Math.min(winnerCount, participants.length);

  useEffect(() => {
    if (!isRunning) {
      setRemainingPool(participants);
      setRevealedWinners([]);
      setCurrentCapsuleWinner(null);
      setPhase('IDLE');
    }
  }, [participants, winnerCount, isRunning]);

  const handleCrank = () => {
    if (phase !== 'IDLE' && phase !== 'OPENED') return;
    if (participants.length < 2) return;

    const activePool = revealedWinners.length === 0 ? participants : remainingPool;
    if (activePool.length === 0) return;

    if (revealedWinners.length === 0) {
      onStart();
    }

    setPhase('SHAKING');
    setDialRotation((prev) => prev + 180);
    sound.playCapsuleDrop();

    const chosen = pickWeightedRandom(activePool);
    setCurrentCapsuleWinner(chosen);
    setRemainingPool(activePool.filter((p) => p.id !== chosen.id));

    setTimeout(() => {
      setPhase('DROPPED');
    }, 520);
  };

  const handleOpenCapsule = () => {
    if (phase !== 'DROPPED' || !currentCapsuleWinner) return;
    sound.playFlip();
    setPhase('OPENED');

    const nextRevealed = [...revealedWinners, currentCapsuleWinner];
    setRevealedWinners(nextRevealed);

    if (nextRevealed.length >= targetCount) {
      setTimeout(() => {
        onComplete(nextRevealed);
      }, 650);
    }
  };

  const handleDrawAllRemaining = () => {
    if (participants.length < 2) return;
    if (revealedWinners.length === 0) {
      onStart();
    }
    let pool = revealedWinners.length === 0 ? [...participants] : [...remainingPool];
    const picked = [...revealedWinners];

    while (picked.length < targetCount && pool.length > 0) {
      const chosen = pickWeightedRandom(pool);
      picked.push(chosen);
      pool = pool.filter((p) => p.id !== chosen.id);
    }

    sound.playCapsuleDrop();
    setPhase('OPENED');
    setCurrentCapsuleWinner(picked[picked.length - 1]);
    setRevealedWinners(picked);
    setRemainingPool(pool);

    setTimeout(() => {
      onComplete(picked);
    }, 500);
  };

  const handleReset = () => {
    setPhase('IDLE');
    setCurrentCapsuleWinner(null);
    setRevealedWinners([]);
    setRemainingPool(participants);
  };

  // Dome decorative capsules reflecting participant colors
  const domeCapsules = participants.slice(0, 14);

  return (
    <div className="bg-[#161B22] text-white rounded-2xl p-6 sm:p-8 flex flex-col items-center gap-6 border border-[#252D38]">
      {/* Top Status */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        <span className="text-sm text-[#94A3B8] tabular-nums">
          {revealedWinners.length > 0
            ? `뽑은 캡슐: ${revealedWinners.length} / ${targetCount}개`
            : `총 ${participants.length}명의 캡슐이 기계 안에 있습니다`}
        </span>

        {revealedWinners.length > 0 && revealedWinners.length < targetCount && (
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#232A34] hover:bg-[#2E3744] text-[#CBD5E1] flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            처음부터
          </button>
        )}
      </div>

      {/* Capsule Dispenser Machine */}
      <div className="relative flex flex-col items-center w-full max-w-[340px]">
        {/* Top Cap */}
        <div className="w-40 h-5 bg-[#E04F33] rounded-t-2xl border-2 border-[#FF785E]/40" />

        {/* Glass Dome */}
        <div
          className={`relative w-64 h-52 bg-[#1E2631] border-4 border-[#334155] rounded-t-[80px] rounded-b-2xl overflow-hidden flex flex-wrap items-end justify-center gap-2 p-4 ${
            phase === 'SHAKING' ? 'animate-capsule-shake' : ''
          }`}
        >
          {/* Subtle glass reflection */}
          <div
            aria-hidden="true"
            className="absolute top-3 left-5 w-16 h-24 rounded-full bg-white/[0.04] -rotate-12 pointer-events-none"
          />

          {domeCapsules.length === 0 ? (
            <span className="text-xs text-[#64748B] self-center">
              참가자를 추가하세요
            </span>
          ) : (
            domeCapsules.map((p, i) => (
              <div
                key={p.id}
                className="w-10 h-10 rounded-full border-2 border-white/80 overflow-hidden shadow-md transition-transform duration-300"
                style={{
                  transform: `rotate(${(i * 37) % 360}deg) translateY(${
                    phase === 'SHAKING' ? (i % 2 === 0 ? -12 : -5) : 0
                  }px)`,
                }}
                title={p.name}
              >
                <div className="w-full h-1/2" style={{ backgroundColor: p.color }} />
                <div className="w-full h-1/2 bg-[#F8FAFC]" />
              </div>
            ))
          )}
        </div>

        {/* Dispenser Body */}
        <div className="w-72 bg-[#232A34] border-x-4 border-b-4 border-[#334155] rounded-b-3xl p-5 flex flex-col items-center gap-5">
          {/* Mechanical Rotary Dial */}
          <button
            type="button"
            disabled={
              participants.length < 2 ||
              phase === 'SHAKING' ||
              phase === 'DROPPED' ||
              revealedWinners.length >= targetCount
            }
            onClick={handleCrank}
            aria-label="캡슐 다이얼 돌리기"
            className="relative w-20 h-20 rounded-full bg-[#161B22] border-4 border-[#475569] hover:border-[#E04F33] disabled:opacity-50 flex items-center justify-center transition-colors cursor-pointer group"
          >
            <div
              className="w-14 h-4 bg-[#E04F33] rounded-full transition-transform duration-500 shadow"
              style={{ transform: `rotate(${dialRotation}deg)` }}
            />
            <div className="absolute w-5 h-5 rounded-full bg-white border-2 border-[#161B22]" />
          </button>

          {/* Drop Tray */}
          <div className="w-full min-h-[108px] bg-[#0F1318] border-2 border-[#334155] rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
            {phase === 'IDLE' && (
              <span className="text-xs text-[#64748B]">
                다이얼이나 버튼을 눌러 캡슐을 뽑으세요
              </span>
            )}

            {phase === 'SHAKING' && (
              <span className="text-sm font-semibold text-[#F59E0B]">
                캡슐이 굴러 나오는 중...
              </span>
            )}

            {phase === 'DROPPED' && currentCapsuleWinner && (
              <button
                type="button"
                onClick={handleOpenCapsule}
                className="flex flex-col items-center gap-2 cursor-pointer group"
              >
                <div className="w-14 h-14 rounded-full border-[3px] border-white overflow-hidden shadow-lg group-hover:scale-105 transition-transform">
                  <div
                    className="w-full h-1/2"
                    style={{ backgroundColor: currentCapsuleWinner.color }}
                  />
                  <div className="w-full h-1/2 bg-white" />
                </div>
                <span className="text-xs font-semibold text-[#E04F33]">
                  캡슐을 눌러 열어보세요
                </span>
              </button>
            )}

            {phase === 'OPENED' && currentCapsuleWinner && (
              <div className="flex flex-col items-center gap-1.5">
                <span className="text-xs text-[#94A3B8]">캡슐 개봉 결과</span>
                <div className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#232A34] border border-white/15">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: currentCapsuleWinner.color }}
                  />
                  <span className="font-display text-lg font-bold text-white">
                    {currentCapsuleWinner.name}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Revealed List for Multi-draw */}
      {revealedWinners.length > 0 && (
        <div className="w-full flex flex-wrap items-center justify-center gap-2">
          {revealedWinners.map((w, idx) => (
            <span
              key={`${w.id}-${idx}`}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#232A34] text-xs font-semibold text-white"
            >
              <span className="text-[#94A3B8] tabular-nums">#{idx + 1}</span>
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: w.color }}
              />
              {w.name}
            </span>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {phase === 'DROPPED' ? (
          <button
            type="button"
            onClick={handleOpenCapsule}
            className="min-w-[200px] h-12 px-7 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-display text-base font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <PackageOpen className="w-4 h-4" />
            캡슐 열기
          </button>
        ) : (
          <button
            type="button"
            disabled={
              participants.length < 2 ||
              phase === 'SHAKING' ||
              revealedWinners.length >= targetCount
            }
            onClick={handleCrank}
            className="min-w-[200px] h-12 px-7 rounded-xl bg-[#E04F33] hover:bg-[#C94127] disabled:opacity-40 text-white font-display text-base font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            {phase === 'SHAKING'
              ? '뽑는 중...'
              : revealedWinners.length > 0
              ? '다음 캡슐 뽑기'
              : '캡슐 뽑기'}
          </button>
        )}

        {targetCount > 1 && revealedWinners.length < targetCount && phase !== 'SHAKING' && (
          <button
            type="button"
            disabled={participants.length < 2}
            onClick={handleDrawAllRemaining}
            className="h-12 px-5 rounded-xl bg-[#232A34] hover:bg-[#2E3744] text-sm font-semibold text-[#CBD5E1] transition-colors cursor-pointer"
          >
            남은 {targetCount - revealedWinners.length}개 한 번에 뽑기
          </button>
        )}
      </div>
    </div>
  );
}
