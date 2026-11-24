import { useState } from 'react';
import { Copy, Check, RotateCcw, Trophy, UserMinus, X } from 'lucide-react';
import { DrawRecord } from '../types/game';

interface WinnerModalProps {
  record: DrawRecord | null;
  onClose: () => void;
  onPlayAgain: () => void;
  onExcludeAndContinue: (winnerIds: string[]) => void;
  canContinueAfterExclude: boolean;
}

export function WinnerModal({
  record,
  onClose,
  onPlayAgain,
  onExcludeAndContinue,
  canContinueAfterExclude,
}: WinnerModalProps) {
  const [copied, setCopied] = useState(false);

  if (!record) return null;

  const handleCopy = async () => {
    const text = `[${record.modeLabel}] 당첨 결과: ${record.winners
      .map((w) => (w.prize ? `${w.name} (${w.prize})` : w.name))
      .join(', ')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard fallback ignored
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="winner-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[2px]"
    >
      <div className="relative w-full max-w-md bg-white border border-[#E4E4E0] rounded-2xl p-6 shadow-xl">
        <button
          type="button"
          onClick={onClose}
          aria-label="창 닫기"
          className="absolute top-4 right-4 p-2 text-[#8E8E88] hover:text-[#161615] rounded-lg cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col items-center text-center pt-2 pb-5">
          <div className="w-12 h-12 rounded-xl bg-[#FEF3C7] text-[#D97706] flex items-center justify-center mb-4">
            <Trophy className="w-6 h-6" />
          </div>

          <p className="text-xs font-medium text-[#666661] mb-1">
            {record.modeLabel} · 총 {record.participantCount}명 중 추첨
          </p>
          <h3
            id="winner-modal-title"
            className="font-display text-2xl font-bold text-[#161615]"
          >
            당첨을 축하합니다
          </h3>
        </div>

        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto mb-6">
          {record.winners.map((winner, idx) => (
            <div
              key={`${winner.id}-${idx}`}
              className="flex items-center justify-between gap-3 px-4 py-3 bg-[#F9F9F7] border border-[#E4E4E0] rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: winner.color }}
                />
                <span className="font-display text-lg font-bold text-[#161615] truncate">
                  {winner.name}
                </span>
              </div>
              {winner.prize && (
                <span className="text-xs font-semibold text-[#E04F33] shrink-0">
                  {winner.prize}
                </span>
              )}
              {!winner.prize && record.winners.length > 1 && (
                <span className="text-xs font-mono text-[#666661] tabular-nums shrink-0">
                  #{idx + 1}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex-1 h-11 px-4 text-sm font-semibold text-[#161615] bg-[#F3F3EF] hover:bg-[#EAEAE3] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-[#059669]" />
                  복사됨
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  결과 복사
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onPlayAgain}
              className="flex-1 h-11 px-4 text-sm font-semibold text-white bg-[#E04F33] hover:bg-[#C94127] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              다시 뽑기
            </button>
          </div>

          {canContinueAfterExclude && (
            <button
              type="button"
              onClick={() => onExcludeAndContinue(record.winners.map((w) => w.id))}
              className="w-full h-10 px-4 text-xs font-semibold text-[#4A4A46] hover:text-[#161615] bg-white border border-[#E4E4E0] hover:bg-[#F9F9F7] rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <UserMinus className="w-3.5 h-3.5" />
              당첨자 명단에서 제외하고 이어서 뽑기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
