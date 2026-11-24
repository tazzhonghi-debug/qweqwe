import { GAME_MODES, GameMode } from '../types/game';

interface TopBarProps {
  activeMode: GameMode;
  onSelectMode: (mode: GameMode) => void;
  historyCount: number;
  onOpenHistory: () => void;
}

export function TopBar({
  activeMode,
  onSelectMode,
  historyCount,
  onOpenHistory,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#F6F6F3]/95 backdrop-blur-sm border-b border-[#E4E4E0]">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectMode('wheel')}
          className="font-display text-lg sm:text-xl font-bold tracking-tight text-[#161615] whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E04F33] rounded"
        >
          럭키드로우
        </button>

        {/* Zone 2: 5 concise single-line nav links */}
        <nav
          aria-label="미니게임 선택"
          className="hidden md:flex items-center gap-6 overflow-x-auto"
        >
          {GAME_MODES.map((mode) => {
            const isActive = activeMode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() => onSelectMode(mode.id)}
                className={`relative py-2 text-sm font-medium whitespace-nowrap shrink-0 transition-colors duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E04F33] rounded ${
                  isActive
                    ? 'text-[#161615] font-semibold'
                    : 'text-[#666661] hover:text-[#161615]'
                }`}
              >
                {mode.shortLabel}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-[1px] h-[2px] bg-[#E04F33]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onOpenHistory}
            className="px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#161615] hover:bg-[#2C2C2A] rounded-lg transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E04F33]"
          >
            당첨 기록 ({historyCount})
          </button>
        </div>
      </div>

      {/* Mobile horizontal game tabs */}
      <nav
        aria-label="모바일 미니게임 선택"
        className="md:hidden flex items-center gap-1 px-4 pb-2.5 overflow-x-auto border-t border-[#E4E4E0]/60 pt-2"
      >
        {GAME_MODES.map((mode) => {
          const isActive = activeMode === mode.id;
          return (
            <button
              key={mode.id}
              type="button"
              onClick={() => onSelectMode(mode.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#161615] text-white'
                  : 'text-[#666661] hover:text-[#161615] hover:bg-[#EAEAE5]'
              }`}
            >
              {mode.shortLabel}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
