import { useCallback, useEffect, useState } from 'react';
import { Eye, Shuffle, Sparkles } from 'lucide-react';
import { Participant } from '../../types/game';
import { sound } from '../../utils/sound';

interface CardFlipGameProps {
  participants: Participant[];
  winnerCount: number;
  isRunning: boolean;
  onStart: () => void;
  onComplete: (winners: Participant[], prizeMap?: Record<string, string>) => void;
}

type CardSubMode = 'names' | 'lucky_draw';

interface CardItem {
  id: string;
  label: string;
  isWin: boolean;
  color: string;
  participant?: Participant;
  flipped: boolean;
  pickedBy?: Participant;
}

export function CardFlipGame({
  participants,
  winnerCount,
  isRunning,
  onStart,
  onComplete,
}: CardFlipGameProps) {
  const [subMode, setSubMode] = useState<CardSubMode>('names');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [turnIndex, setTurnIndex] = useState(0);
  const [roundDone, setRoundDone] = useState(false);

  const targetCount = Math.min(winnerCount, Math.max(1, participants.length));

  const buildDeck = useCallback(
    (mode: CardSubMode) => {
      if (participants.length === 0) {
        setCards([]);
        setTurnIndex(0);
        setRoundDone(false);
        return;
      }

      let deck: CardItem[];
      if (mode === 'names') {
        deck = participants.map((p) => ({
          id: p.id,
          label: p.name,
          isWin: true,
          color: p.color,
          participant: p,
          flipped: false,
        }));
      } else {
        deck = participants.map((_, idx) => {
          const win = idx < targetCount;
          return {
            id: `card-${idx}-${Math.random().toString(36).slice(2, 6)}`,
            label: win ? '당첨' : '통과',
            isWin: win,
            color: win ? '#E04F33' : '#475569',
            flipped: false,
          };
        });
      }

      // Fisher-Yates shuffle
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      setCards(deck);
      setTurnIndex(0);
      setRoundDone(false);
    },
    [participants, targetCount]
  );

  useEffect(() => {
    if (!isRunning) {
      buildDeck(subMode);
    }
  }, [buildDeck, subMode, isRunning]);

  const handleCardClick = (cardIndex: number) => {
    if (roundDone || participants.length < 2) return;
    const targetCard = cards[cardIndex];
    if (!targetCard || targetCard.flipped) return;

    sound.playFlip();

    if (subMode === 'names') {
      const flippedSoFar = cards.filter((c) => c.flipped).length;
      if (flippedSoFar >= targetCount) return;

      const updated = cards.map((c, idx) =>
        idx === cardIndex ? { ...c, flipped: true } : c
      );
      setCards(updated);

      const nowFlipped = updated.filter((c) => c.flipped);
      if (nowFlipped.length >= targetCount) {
        setRoundDone(true);
        const winners = nowFlipped
          .map((c) => c.participant)
          .filter((p): p is Participant => Boolean(p));
        setTimeout(() => {
          onComplete(winners);
        }, 550);
      }
    } else {
      const currentPicker = participants[turnIndex];
      if (!currentPicker) return;

      const updated = cards.map((c, idx) =>
        idx === cardIndex ? { ...c, flipped: true, pickedBy: currentPicker } : c
      );
      setCards(updated);

      const nextTurn = turnIndex + 1;
      setTurnIndex(nextTurn);

      const foundWins = updated.filter((c) => c.flipped && c.isWin);
      if (foundWins.length >= targetCount || nextTurn >= participants.length) {
        setRoundDone(true);
        const winners = foundWins
          .map((c) => c.pickedBy)
          .filter((p): p is Participant => Boolean(p));
        const prizeMap: Record<string, string> = {};
        winners.forEach((w) => {
          prizeMap[w.id] = '당첨 카드 선택';
        });
        setTimeout(() => {
          onComplete(winners, prizeMap);
        }, 550);
      }
    }
  };

  const handleAutoPick = () => {
    if (roundDone || participants.length < 2) return;
    onStart();

    if (subMode === 'names') {
      const unflippedIndices = cards
        .map((c, idx) => (c.flipped ? -1 : idx))
        .filter((idx) => idx !== -1);
      const needed = targetCount - cards.filter((c) => c.flipped).length;

      const chosenIndices: number[] = [];
      for (let i = 0; i < needed && unflippedIndices.length > 0; i++) {
        const pickPos = Math.floor(Math.random() * unflippedIndices.length);
        chosenIndices.push(unflippedIndices[pickPos]);
        unflippedIndices.splice(pickPos, 1);
      }

      chosenIndices.forEach((cardIdx, step) => {
        setTimeout(() => {
          sound.playFlip();
          setCards((prev) => {
            const next = prev.map((c, i) => (i === cardIdx ? { ...c, flipped: true } : c));
            if (step === chosenIndices.length - 1) {
              setRoundDone(true);
              const winners = next
                .filter((c) => c.flipped && c.participant)
                .map((c) => c.participant as Participant);
              setTimeout(() => {
                onComplete(winners);
              }, 500);
            }
            return next;
          });
        }, step * 280);
      });
    } else {
      // Reveal all cards in turn order automatically
      const remainingIndices = cards
        .map((c, idx) => (c.flipped ? -1 : idx))
        .filter((idx) => idx !== -1);

      remainingIndices.forEach((cardIdx, step) => {
        const picker = participants[turnIndex + step];
        if (!picker) return;
        setTimeout(() => {
          sound.playFlip();
          setCards((prev) => {
            const next = prev.map((c, i) =>
              i === cardIdx ? { ...c, flipped: true, pickedBy: picker } : c
            );
            if (step === remainingIndices.length - 1) {
              setRoundDone(true);
              const winners = next
                .filter((c) => c.flipped && c.isWin && c.pickedBy)
                .map((c) => c.pickedBy as Participant);
              const prizeMap: Record<string, string> = {};
              winners.forEach((w) => {
                prizeMap[w.id] = '당첨 카드';
              });
              setTimeout(() => {
                onComplete(winners, prizeMap);
              }, 500);
            }
            return next;
          });
          setTurnIndex((prev) => prev + 1);
        }, step * 220);
      });
    }
  };

  if (participants.length < 2) {
    return (
      <div className="bg-[#161B22] text-white rounded-2xl p-12 text-center border border-[#252D38]">
        <p className="text-sm text-[#94A3B8]">
          카드 뒤집기를 시작하려면 참가자를 2명 이상 추가해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#161B22] text-white rounded-2xl p-5 sm:p-7 flex flex-col gap-6 border border-[#252D38]">
      {/* Mode Switcher & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#232A34] rounded-lg">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setSubMode('names')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subMode === 'names'
                ? 'bg-[#E04F33] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            이름 카드 뽑기
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={() => setSubMode('lucky_draw')}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
              subMode === 'lucky_draw'
                ? 'bg-[#E04F33] text-white'
                : 'text-[#94A3B8] hover:text-white'
            }`}
          >
            당첨/꽝 복불복
          </button>
        </div>

        <button
          type="button"
          disabled={isRunning}
          onClick={() => buildDeck(subMode)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#232A34] hover:bg-[#2E3744] text-[#CBD5E1] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
        >
          <Shuffle className="w-3.5 h-3.5" />
          카드 다시 섞기
        </button>
      </div>

      {/* Turn / Instruction Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#232A34] rounded-xl text-xs sm:text-sm">
        {subMode === 'names' ? (
          <span className="text-[#CBD5E1]">
            원하는 카드를 {targetCount}장 뒤집어 당첨자를 확인하세요 (
            {cards.filter((c) => c.flipped).length} / {targetCount})
          </span>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-[#94A3B8]">현재 선택 차례:</span>
            {participants[turnIndex] ? (
              <span className="inline-flex items-center gap-1.5 font-bold text-white">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: participants[turnIndex].color }}
                />
                {participants[turnIndex].name}
              </span>
            ) : (
              <span className="font-semibold text-[#10B981]">모든 순서 완료</span>
            )}
          </div>
        )}
      </div>

      {/* 3D Flip Card Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
        {cards.map((card, idx) => (
          <button
            key={card.id}
            type="button"
            disabled={card.flipped || roundDone || isRunning}
            onClick={() => handleCardClick(idx)}
            className="perspective-1000 h-28 sm:h-32 w-full text-left cursor-pointer disabled:cursor-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E04F33] rounded-xl"
          >
            <div
              className={`relative w-full h-full transition-transform duration-500 preserve-3d ${
                card.flipped ? 'rotate-y-180' : 'hover:-translate-y-0.5'
              }`}
            >
              {/* Card Back */}
              <div className="absolute inset-0 backface-hidden rounded-xl bg-[#232A34] border-2 border-[#334155] hover:border-[#E04F33] flex flex-col items-center justify-center gap-1.5 p-3">
                <span className="font-mono text-lg font-bold text-[#64748B] tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-[11px] font-medium text-[#94A3B8]">
                  선택하기
                </span>
              </div>

              {/* Card Front */}
              <div
                className={`absolute inset-0 backface-hidden rotate-y-180 rounded-xl border-2 flex flex-col items-center justify-center gap-1 p-3 text-center ${
                  card.isWin
                    ? 'bg-white text-[#161615] border-[#E04F33]'
                    : 'bg-[#1E242C] text-[#94A3B8] border-[#334155]'
                }`}
              >
                {card.pickedBy && (
                  <span className="text-[11px] font-medium text-[#64748B] truncate max-w-full">
                    {card.pickedBy.name}
                  </span>
                )}
                <div className="flex items-center gap-1.5 max-w-full">
                  {card.isWin && (
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: card.color }}
                    />
                  )}
                  <span
                    className={`font-display text-base sm:text-lg font-bold truncate ${
                      card.isWin
                        ? subMode === 'lucky_draw'
                          ? 'text-[#E04F33]'
                          : 'text-[#161615]'
                        : 'text-[#64748B]'
                    }`}
                  >
                    {card.label}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Auto-reveal Action */}
      <div className="flex justify-center">
        <button
          type="button"
          disabled={roundDone || isRunning}
          onClick={handleAutoPick}
          className="w-full sm:w-auto min-w-[220px] h-12 px-8 rounded-xl bg-[#E04F33] hover:bg-[#C94127] disabled:opacity-40 text-white font-display text-base font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          {subMode === 'names' ? (
            <>
              <Sparkles className="w-4 h-4" />
              무작위 {targetCount}장 자동 뽑기
            </>
          ) : (
            <>
              <Eye className="w-4 h-4" />
              전체 카드 한 번에 공개
            </>
          )}
        </button>
      </div>
    </div>
  );
}
