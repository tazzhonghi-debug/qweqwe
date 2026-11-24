import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Play, RefreshCw, Shuffle } from 'lucide-react';
import { Participant } from '../../types/game';
import { sound } from '../../utils/sound';

interface LadderGameProps {
  participants: Participant[];
  winnerCount: number;
  isRunning: boolean;
  onStart: () => void;
  onComplete: (winners: Participant[], prizeMap?: Record<string, string>) => void;
}

interface Rung {
  row: number; // 0 .. ROWS - 1
  col: number; // connects col and col + 1
}

interface Point {
  x: number;
  y: number;
}

const ROWS = 10;

function generateRungs(cols: number): Rung[] {
  if (cols < 2) return [];
  const rungs: Rung[] = [];
  for (let r = 0; r < ROWS; r++) {
    let c = 0;
    while (c < cols - 1) {
      if (Math.random() < 0.45) {
        rungs.push({ row: r, col: c });
        c += 2; // Ensure no adjacent rungs on same row
      } else {
        c += 1;
      }
    }
  }
  // Ensure at least one rung per adjacent pair across the board
  for (let c = 0; c < cols - 1; c++) {
    const hasOne = rungs.some((rg) => rg.col === c);
    if (!hasOne) {
      const candidateRows = Array.from({ length: ROWS }, (_, i) => i).filter(
        (r) => !rungs.some((rg) => rg.row === r && (rg.col === c - 1 || rg.col === c + 1))
      );
      if (candidateRows.length > 0) {
        const chosenRow = candidateRows[Math.floor(Math.random() * candidateRows.length)];
        rungs.push({ row: chosenRow, col: c });
      }
    }
  }
  return rungs;
}

export function LadderGame({
  participants,
  winnerCount,
  isRunning,
  onStart,
  onComplete,
}: LadderGameProps) {
  const activePlayers = useMemo(() => participants.slice(0, 12), [participants]);
  const cols = activePlayers.length;

  const [rungs, setRungs] = useState<Rung[]>(() => generateRungs(Math.max(2, cols)));
  const [outcomes, setOutcomes] = useState<string[]>([]);
  const [activePaths, setActivePaths] = useState<Record<number, Point[]>>({});
  const [finishedMap, setFinishedMap] = useState<Record<number, number>>({}); // startCol -> endCol
  const animRef = useRef<number | null>(null);

  const buildDefaultOutcomes = useCallback(
    (count: number, winNum: number): string[] => {
      const safeWin = Math.min(winNum, count);
      const list: string[] = Array.from({ length: count }, (_, i) =>
        i < safeWin ? '당첨' : '통과'
      );
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      return list;
    },
    []
  );

  useEffect(() => {
    setRungs(generateRungs(cols));
    setOutcomes(buildDefaultOutcomes(cols, winnerCount));
    setActivePaths({});
    setFinishedMap({});
  }, [cols, winnerCount, buildDefaultOutcomes]);

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  const svgWidth = Math.max(560, cols * 84);
  const svgHeight = 360;
  const padX = 48;
  const topY = 26;
  const bottomY = svgHeight - 26;
  const colGap = cols > 1 ? (svgWidth - padX * 2) / (cols - 1) : 0;
  const rowGap = (bottomY - topY) / (ROWS + 1);

  const getColX = (c: number) => padX + c * colGap;
  const getRowY = (r: number) => topY + (r + 1) * rowGap;

  const computePath = useCallback(
    (startCol: number): { points: Point[]; endCol: number } => {
      const pts: Point[] = [{ x: getColX(startCol), y: topY }];
      let currCol = startCol;

      for (let r = 0; r < ROWS; r++) {
        const y = getRowY(r);
        pts.push({ x: getColX(currCol), y });

        const rightRung = rungs.find((rg) => rg.row === r && rg.col === currCol);
        const leftRung = rungs.find((rg) => rg.row === r && rg.col === currCol - 1);

        if (rightRung) {
          currCol += 1;
          pts.push({ x: getColX(currCol), y });
        } else if (leftRung) {
          currCol -= 1;
          pts.push({ x: getColX(currCol), y });
        }
      }

      pts.push({ x: getColX(currCol), y: bottomY });
      return { points: pts, endCol: currCol };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rungs, cols, colGap, rowGap]
  );

  const regenerateBoard = () => {
    if (isRunning) return;
    setRungs(generateRungs(cols));
    setActivePaths({});
    setFinishedMap({});
  };

  const shuffleOutcomes = () => {
    if (isRunning) return;
    setOutcomes((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setActivePaths({});
    setFinishedMap({});
  };

  const animatePaths = (startCols: number[], notifyWinnerModal: boolean) => {
    if (isRunning || cols < 2) return;
    onStart();

    const computed = startCols.map((sc) => ({
      startCol: sc,
      ...computePath(sc),
    }));

    const duration = startCols.length === 1 ? 1500 : 2100;
    const startTime = performance.now();
    let lastSoundStep = -1;

    const frame = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1);
      const nextPaths: Record<number, Point[]> = {};

      computed.forEach(({ startCol, points }) => {
        // Compute total polyline length
        let totalLen = 0;
        const segLens: number[] = [];
        for (let i = 0; i < points.length - 1; i++) {
          const dx = points[i + 1].x - points[i].x;
          const dy = points[i + 1].y - points[i].y;
          const len = Math.hypot(dx, dy);
          segLens.push(len);
          totalLen += len;
        }

        const targetLen = totalLen * t;
        let acc = 0;
        const partial: Point[] = [points[0]];

        for (let i = 0; i < segLens.length; i++) {
          const seg = segLens[i];
          if (acc + seg <= targetLen) {
            partial.push(points[i + 1]);
            acc += seg;
          } else {
            const remain = (targetLen - acc) / (seg || 1);
            partial.push({
              x: points[i].x + (points[i + 1].x - points[i].x) * remain,
              y: points[i].y + (points[i + 1].y - points[i].y) * remain,
            });
            break;
          }
        }

        nextPaths[startCol] = partial;
      });

      const stepBucket = Math.floor(t * 10);
      if (stepBucket > lastSoundStep && t < 1) {
        lastSoundStep = stepBucket;
        sound.playStep(stepBucket);
      }

      setActivePaths((prev) => ({ ...prev, ...nextPaths }));

      if (t < 1) {
        animRef.current = requestAnimationFrame(frame);
      } else {
        const nextFinished: Record<number, number> = {};
        computed.forEach(({ startCol, endCol }) => {
          nextFinished[startCol] = endCol;
        });
        setFinishedMap((prev) => ({ ...prev, ...nextFinished }));

        if (notifyWinnerModal) {
          const prizeMap: Record<string, string> = {};
          const winners: Participant[] = [];

          computed.forEach(({ startCol, endCol }) => {
            const p = activePlayers[startCol];
            const label = outcomes[endCol] || '결과';
            prizeMap[p.id] = label;
            if (label.includes('당첨')) {
              winners.push(p);
            }
          });

          const finalWinners =
            winners.length > 0 ? winners : computed.map((c) => activePlayers[c.startCol]);

          setTimeout(() => {
            onComplete(finalWinners, prizeMap);
          }, 350);
        } else {
          // Single-person trace completes cleanly without popping modal until full draw,
          // or we still unlock running state via onComplete if desired. Let's pass empty?
          // Wait: better to unlock isRunning cleanly by passing a subtle single reveal or callback!
          const c = computed[0];
          const p = activePlayers[c.startCol];
          const label = outcomes[c.endCol] || '결과';
          setTimeout(() => {
            onComplete([p], { [p.id]: label });
          }, 300);
        }
      }
    };

    animRef.current = requestAnimationFrame(frame);
  };

  if (cols < 2) {
    return (
      <div className="bg-[#161B22] text-white rounded-2xl p-12 text-center border border-[#252D38]">
        <p className="text-sm text-[#94A3B8]">
          사다리 타기를 진행하려면 참가자를 2명 이상 추가해 주세요.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#161B22] text-white rounded-2xl p-5 sm:p-7 flex flex-col gap-5 border border-[#252D38]">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs sm:text-sm text-[#94A3B8]">
          {participants.length > 12
            ? '최대 12명까지 표시됩니다 · 상단 이름을 눌러 개별 확인하거나 전체 추첨하세요'
            : '상단 이름을 눌러 개별 추적하거나, 전체 추첨으로 한 번에 확인하세요'}
        </p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={isRunning}
            onClick={shuffleOutcomes}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#232A34] hover:bg-[#2E3744] text-[#CBD5E1] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <Shuffle className="w-3.5 h-3.5" />
            결과 섞기
          </button>
          <button
            type="button"
            disabled={isRunning}
            onClick={regenerateBoard}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#232A34] hover:bg-[#2E3744] text-[#CBD5E1] transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새 사다리
          </button>
        </div>
      </div>

      {/* Ladder Interactive Board */}
      <div className="w-full overflow-x-auto pb-2">
        <div style={{ minWidth: `${svgWidth}px` }} className="mx-auto flex flex-col">
          {/* Top Participant Buttons */}
          <div
            className="grid gap-1 px-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {activePlayers.map((p, idx) => {
              const traced = finishedMap[idx] !== undefined;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={isRunning}
                  onClick={() => animatePaths([idx], false)}
                  className="flex flex-col items-center gap-1 p-1.5 rounded-lg hover:bg-[#232A34] transition-colors cursor-pointer disabled:cursor-not-allowed"
                >
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: p.color }}
                  />
                  <span className="text-xs font-semibold text-white truncate max-w-full">
                    {p.name}
                  </span>
                  {traced && (
                    <span className="text-[11px] font-medium text-[#10B981]">
                      → {outcomes[finishedMap[idx]]}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Ladder SVG */}
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[320px] sm:h-[360px] select-none"
          >
            {/* Vertical rails */}
            {activePlayers.map((p, c) => (
              <line
                key={`rail-${p.id}`}
                x1={getColX(c)}
                y1={topY}
                x2={getColX(c)}
                y2={bottomY}
                stroke="#334155"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}

            {/* Horizontal rungs */}
            {rungs.map((rg, idx) => (
              <line
                key={`rung-${idx}`}
                x1={getColX(rg.col)}
                y1={getRowY(rg.row)}
                x2={getColX(rg.col + 1)}
                y2={getRowY(rg.row)}
                stroke="#475569"
                strokeWidth="4"
                strokeLinecap="round"
              />
            ))}

            {/* Animated traced paths */}
            {Object.entries(activePaths).map(([colStr, pts]) => {
              const colIdx = Number(colStr);
              const player = activePlayers[colIdx];
              if (!player || pts.length < 2) return null;
              const pointsAttr = pts.map((pt) => `${pt.x},${pt.y}`).join(' ');
              const head = pts[pts.length - 1];
              return (
                <g key={`trace-${colIdx}`}>
                  <polyline
                    points={pointsAttr}
                    fill="none"
                    stroke={player.color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle cx={head.x} cy={head.y} r="6.5" fill={player.color} stroke="#FFFFFF" strokeWidth="2" />
                </g>
              );
            })}
          </svg>

          {/* Bottom Editable Outcomes */}
          <div
            className="grid gap-1.5 px-3"
            style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
          >
            {outcomes.map((label, idx) => {
              const isWinLabel = label.includes('당첨');
              return (
                <input
                  key={`outcome-${idx}`}
                  type="text"
                  disabled={isRunning}
                  value={label}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOutcomes((prev) => prev.map((item, i) => (i === idx ? val : item)));
                  }}
                  aria-label={`${idx + 1}번 결과 항목`}
                  className={`h-9 px-1.5 text-center text-xs font-bold rounded-lg border transition-colors focus:outline-none ${
                    isWinLabel
                      ? 'bg-[#E04F33]/20 border-[#E04F33] text-[#FF8C75]'
                      : 'bg-[#232A34] border-[#333D4B] text-[#CBD5E1] focus:border-white'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Primary Action */}
      <div className="flex justify-center pt-1">
        <button
          type="button"
          disabled={isRunning}
          onClick={() =>
            animatePaths(
              activePlayers.map((_, i) => i),
              true
            )
          }
          className="w-full sm:w-auto min-w-[220px] h-12 px-8 rounded-xl bg-[#E04F33] hover:bg-[#C94127] disabled:opacity-40 text-white font-display text-base font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer"
        >
          <Play className="w-4 h-4 fill-current" />
          {isRunning ? '사다리 타는 중...' : '전체 결과 확인하기'}
        </button>
      </div>
    </div>
  );
}
