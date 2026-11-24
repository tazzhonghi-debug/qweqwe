import { useState } from 'react';
import { Check, Copy, Trash2, X } from 'lucide-react';
import { DrawRecord } from '../types/game';

interface HistoryDrawerProps {
  isOpen: boolean;
  records: DrawRecord[];
  onClose: () => void;
  onClearHistory: () => void;
}

export function HistoryDrawer({
  isOpen,
  records,
  onClose,
  onClearHistory,
}: HistoryDrawerProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const handleCopyRecord = async (record: DrawRecord) => {
    const text = `[${record.modeLabel}] ${record.winners
      .map((w) => (w.prize ? `${w.name}(${w.prize})` : w.name))
      .join(', ')}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(record.id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[1px]">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="당첨 기록"
        className="w-full max-w-md bg-white h-full border-l border-[#E4E4E0] flex flex-col"
      >
        <div className="px-6 py-4 border-b border-[#E4E4E0] flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-bold text-[#161615]">
              당첨 기록
            </h2>
            <p className="text-xs text-[#666661] tabular-nums">
              총 {records.length}건의 추첨 결과
            </p>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                type="button"
                onClick={onClearHistory}
                className="px-3 py-1.5 text-xs font-medium text-[#666661] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                전체 삭제
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="기록 닫기"
              className="p-2 text-[#666661] hover:text-[#161615] rounded-lg cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-3">
          {records.length === 0 ? (
            <div className="py-16 text-center text-sm text-[#8E8E88]">
              아직 추첨 기록이 없습니다. 미니게임을 실행해 당첨자를 뽑아보세요.
            </div>
          ) : (
            records.map((rec) => (
              <div
                key={rec.id}
                className="p-4 bg-[#F9F9F7] border border-[#E4E4E0] rounded-xl flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2 text-xs text-[#666661]">
                  <span>
                    {rec.modeLabel} · {rec.participantCount}명 참여 · {formatTime(rec.timestamp)}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyRecord(rec)}
                    className="inline-flex items-center gap-1 text-[#4A4A46] hover:text-[#161615] font-medium cursor-pointer"
                  >
                    {copiedId === rec.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#059669]" />
                        복사됨
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        복사
                      </>
                    )}
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  {rec.winners.map((w, idx) => (
                    <div
                      key={`${rec.id}-${w.id}-${idx}`}
                      className="flex items-center gap-1.5"
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: w.color }}
                      />
                      <span className="text-sm font-bold text-[#161615]">
                        {w.name}
                      </span>
                      {w.prize && (
                        <span className="text-xs text-[#E04F33] font-medium">
                          ({w.prize})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
