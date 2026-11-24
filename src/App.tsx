import { useCallback, useEffect, useMemo, useState } from 'react';
import { TopBar } from './components/TopBar';
import { ParticipantPanel } from './components/ParticipantPanel';
import { WinnerModal } from './components/WinnerModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { WheelGame } from './components/games/WheelGame';
import { LadderGame } from './components/games/LadderGame';
import { PinballGame } from './components/games/PinballGame';
import { GachaGame } from './components/games/GachaGame';
import { CardFlipGame } from './components/games/CardFlipGame';
import {
  DrawRecord,
  GAME_COLORS,
  GAME_MODES,
  GameMode,
  Participant,
  PRESET_LISTS,
} from './types/game';
import { sound } from './utils/sound';
import { launchConfetti } from './utils/confetti';

const STORAGE_KEYS = {
  PARTICIPANTS: 'luckydraw_participants_v1',
  HISTORY: 'luckydraw_history_v1',
  SETTINGS: 'luckydraw_settings_v1',
};

function createParticipantsFromNames(names: string[], offset = 0): Participant[] {
  return names.map((name, idx) => ({
    id: `p-${Date.now()}-${offset + idx}-${Math.random().toString(36).slice(2, 6)}`,
    name,
    weight: 1,
    active: true,
    color: GAME_COLORS[(offset + idx) % GAME_COLORS.length],
  }));
}

export default function App() {
  const [activeMode, setActiveMode] = useState<GameMode>('wheel');

  const [participants, setParticipants] = useState<Participant[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PARTICIPANTS);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // ignore storage errors
    }
    return createParticipantsFromNames(PRESET_LISTS[0].names);
  });

  const [history, setHistory] = useState<DrawRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [winnerCount, setWinnerCount] = useState<number>(1);
  const [excludeWinners, setExcludeWinners] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isGameRunning, setIsGameRunning] = useState<boolean>(false);
  const [latestRecord, setLatestRecord] = useState<DrawRecord | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [resetSignal, setResetSignal] = useState<number>(0);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.PARTICIPANTS, JSON.stringify(participants));
    } catch {
      // ignore
    }
  }, [participants]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  const activeParticipants = useMemo(
    () => participants.filter((p) => p.active),
    [participants]
  );

  // Clamp winnerCount safely when active participants shrink
  useEffect(() => {
    const maxAllowed = Math.max(1, activeParticipants.length);
    if (winnerCount > maxAllowed) {
      setWinnerCount(maxAllowed);
    }
  }, [activeParticipants.length, winnerCount]);

  const currentModeInfo = useMemo(
    () => GAME_MODES.find((m) => m.id === activeMode) || GAME_MODES[0],
    [activeMode]
  );

  const handleToggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    sound.setMuted(next);
  };

  const handleAddParticipants = (names: string[]) => {
    setParticipants((prev) => [
      ...prev,
      ...createParticipantsFromNames(names, prev.length),
    ]);
  };

  const handleToggleActive = (id: string) => {
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, active: !p.active } : p))
    );
  };

  const handleUpdateWeight = (id: string, delta: number) => {
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, weight: Math.min(10, Math.max(1, p.weight + delta)) }
          : p
      )
    );
  };

  const handleRemoveParticipant = (id: string) => {
    setParticipants((prev) => prev.filter((p) => p.id !== id));
  };

  const handleShuffleParticipants = () => {
    setParticipants((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
  };

  const handleClearAll = () => {
    setParticipants([]);
  };

  const handleRestoreAllActive = () => {
    setParticipants((prev) => prev.map((p) => ({ ...p, active: true })));
  };

  const handleApplyPreset = (names: string[]) => {
    setParticipants(createParticipantsFromNames(names));
    setResetSignal((s) => s + 1);
  };

  const handleGameComplete = useCallback(
    (winners: Participant[], prizeMap?: Record<string, string>) => {
      setIsGameRunning(false);
      if (winners.length === 0) return;

      sound.playWinFanfare();
      launchConfetti();

      const record: DrawRecord = {
        id: `draw-${Date.now()}`,
        timestamp: Date.now(),
        mode: activeMode,
        modeLabel: currentModeInfo.label,
        participantCount: activeParticipants.length,
        winners: winners.map((w) => ({
          id: w.id,
          name: w.name,
          color: w.color,
          prize: prizeMap ? prizeMap[w.id] : undefined,
        })),
      };

      setHistory((prev) => [record, ...prev].slice(0, 50));
      setLatestRecord(record);

      if (excludeWinners) {
        const winSet = new Set(winners.map((w) => w.id));
        setParticipants((prev) =>
          prev.map((p) => (winSet.has(p.id) ? { ...p, active: false } : p))
        );
      }
    },
    [activeMode, currentModeInfo.label, activeParticipants.length, excludeWinners]
  );

  const handleExcludeAndContinue = (winnerIds: string[]) => {
    const winSet = new Set(winnerIds);
    setParticipants((prev) =>
      prev.map((p) => (winSet.has(p.id) ? { ...p, active: false } : p))
    );
    setLatestRecord(null);
    setResetSignal((s) => s + 1);
  };

  const handlePlayAgain = () => {
    setLatestRecord(null);
    setResetSignal((s) => s + 1);
  };

  const canContinueAfterExclude = useMemo(() => {
    if (!latestRecord || excludeWinners) return false;
    const winIds = new Set(latestRecord.winners.map((w) => w.id));
    const remaining = activeParticipants.filter((p) => !winIds.has(p.id));
    return remaining.length >= 2;
  }, [latestRecord, excludeWinners, activeParticipants]);

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F6F3] text-[#161615]">
      <TopBar
        activeMode={activeMode}
        onSelectMode={(mode) => {
          if (!isGameRunning) {
            setActiveMode(mode);
          }
        }}
        historyCount={history.length}
        onOpenHistory={() => setIsHistoryOpen(true)}
      />

      <main className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Control Panel */}
          <div className="lg:col-span-4 xl:col-span-3">
            <ParticipantPanel
              participants={participants}
              winnerCount={winnerCount}
              excludeWinners={excludeWinners}
              isMuted={isMuted}
              isGameRunning={isGameRunning}
              onAddParticipants={handleAddParticipants}
              onToggleActive={handleToggleActive}
              onUpdateWeight={handleUpdateWeight}
              onRemoveParticipant={handleRemoveParticipant}
              onShuffleParticipants={handleShuffleParticipants}
              onClearAll={handleClearAll}
              onRestoreAllActive={handleRestoreAllActive}
              onApplyPreset={handleApplyPreset}
              onChangeWinnerCount={setWinnerCount}
              onToggleExcludeWinners={() => setExcludeWinners((v) => !v)}
              onToggleMute={handleToggleMute}
            />
          </div>

          {/* Right Main Game Stage */}
          <section className="lg:col-span-8 xl:col-span-9 flex flex-col gap-5">
            {/* Stage Header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 px-1">
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-[#161615]">
                  {currentModeInfo.label}
                </h1>
                <p className="text-sm text-[#666661] mt-1">
                  {currentModeInfo.description}
                </p>
              </div>

              <div className="text-xs font-medium text-[#666661] tabular-nums shrink-0">
                참여 인원 {activeParticipants.length}명 · 당첨 {Math.min(winnerCount, Math.max(1, activeParticipants.length))}명 추첨
              </div>
            </div>

            {/* Active Mini-Game */}
            {activeMode === 'wheel' && (
              <WheelGame
                key={`wheel-${resetSignal}`}
                participants={activeParticipants}
                winnerCount={winnerCount}
                isRunning={isGameRunning}
                onStart={() => setIsGameRunning(true)}
                onComplete={handleGameComplete}
              />
            )}

            {activeMode === 'ladder' && (
              <LadderGame
                key={`ladder-${resetSignal}`}
                participants={activeParticipants}
                winnerCount={winnerCount}
                isRunning={isGameRunning}
                onStart={() => setIsGameRunning(true)}
                onComplete={handleGameComplete}
              />
            )}

            {activeMode === 'pinball' && (
              <PinballGame
                key={`pinball-${resetSignal}`}
                participants={activeParticipants}
                winnerCount={winnerCount}
                isRunning={isGameRunning}
                onStart={() => setIsGameRunning(true)}
                onComplete={handleGameComplete}
              />
            )}

            {activeMode === 'gacha' && (
              <GachaGame
                key={`gacha-${resetSignal}`}
                participants={activeParticipants}
                winnerCount={winnerCount}
                isRunning={isGameRunning}
                onStart={() => setIsGameRunning(true)}
                onComplete={handleGameComplete}
              />
            )}

            {activeMode === 'cards' && (
              <CardFlipGame
                key={`cards-${resetSignal}`}
                participants={activeParticipants}
                winnerCount={winnerCount}
                isRunning={isGameRunning}
                onStart={() => setIsGameRunning(true)}
                onComplete={handleGameComplete}
              />
            )}
          </section>
        </div>
      </main>

      <WinnerModal
        record={latestRecord}
        onClose={() => setLatestRecord(null)}
        onPlayAgain={handlePlayAgain}
        onExcludeAndContinue={handleExcludeAndContinue}
        canContinueAfterExclude={canContinueAfterExclude}
      />

      <HistoryDrawer
        isOpen={isHistoryOpen}
        records={history}
        onClose={() => setIsHistoryOpen(false)}
        onClearHistory={() => setHistory([])}
      />
    </div>
  );
}
