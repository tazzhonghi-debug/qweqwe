import React, { useState } from 'react';
import {
  Plus,
  Shuffle,
  Trash2,
  Users,
  Volume2,
  VolumeX,
  Check,
  Minus,
  FileText,
  Download,
} from 'lucide-react';
import { Participant, PRESET_LISTS } from '../types/game';

interface ParticipantPanelProps {
  participants: Participant[];
  winnerCount: number;
  excludeWinners: boolean;
  isMuted: boolean;
  isGameRunning: boolean;
  onAddParticipants: (names: string[]) => void;
  onToggleActive: (id: string) => void;
  onUpdateWeight: (id: string, delta: number) => void;
  onRemoveParticipant: (id: string) => void;
  onShuffleParticipants: () => void;
  onClearAll: () => void;
  onRestoreAllActive: () => void;
  onApplyPreset: (names: string[]) => void;
  onChangeWinnerCount: (count: number) => void;
  onToggleExcludeWinners: () => void;
  onToggleMute: () => void;
}

export function ParticipantPanel({
  participants,
  winnerCount,
  excludeWinners,
  isMuted,
  isGameRunning,
  onAddParticipants,
  onToggleActive,
  onUpdateWeight,
  onRemoveParticipant,
  onShuffleParticipants,
  onClearAll,
  onRestoreAllActive,
  onApplyPreset,
  onChangeWinnerCount,
  onToggleExcludeWinners,
  onToggleMute,
}: ParticipantPanelProps) {
  const [singleInput, setSingleInput] = useState('');
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkInput, setBulkInput] = useState('');

  const activeCount = participants.filter((p) => p.active).length;

  const handleSingleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = singleInput
      .split(/[,\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      onAddParticipants(parts);
      setSingleInput('');
    }
  };

  const handleBulkAdd = () => {
    const parts = bulkInput
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (parts.length > 0) {
      onAddParticipants(parts);
      setBulkInput('');
      setBulkMode(false);
    }
  };

  return (
    <aside className="bg-white border border-[#E4E4E0] rounded-xl p-5 flex flex-col gap-5">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-[#E4E4E0]">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-[#161615]" aria-hidden="true" />
          <h2 className="font-display text-base font-bold text-[#161615]">
            참가자 명단
          </h2>
          <span className="text-xs text-[#666661] tabular-nums">
            {activeCount} / {participants.length}명 참여
          </span>
        </div>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? '효과음 켜기' : '효과음 끄기'}
          title={isMuted ? '효과음 켜기' : '효과음 끄기'}
          className="p-2 rounded-lg text-[#666661] hover:text-[#161615] hover:bg-[#F3F3EF] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E04F33]"
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Input form */}
      <div className="flex flex-col gap-2.5">
        {!bulkMode ? (
          <form onSubmit={handleSingleAdd} className="flex items-center gap-2">
            <input
              type="text"
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              disabled={isGameRunning}
              placeholder="이름 입력 (쉼표로 여러 명 가능)"
              className="flex-1 min-w-0 h-10 px-3 text-sm bg-[#F9F9F7] border border-[#E4E4E0] rounded-lg text-[#161615] placeholder:text-[#8E8E88] focus:outline-none focus:border-[#161615] disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isGameRunning || !singleInput.trim()}
              className="h-10 px-4 text-sm font-semibold text-white bg-[#161615] hover:bg-[#2C2C2A] disabled:opacity-40 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              추가
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-2">
            <textarea
              value={bulkInput}
              onChange={(e) => setBulkInput(e.target.value)}
              disabled={isGameRunning}
              rows={4}
              placeholder="줄바꿈 또는 쉼표(,)로 구분하여 여러 명을 한 번에 입력하세요."
              className="w-full p-3 text-sm bg-[#F9F9F7] border border-[#E4E4E0] rounded-lg text-[#161615] placeholder:text-[#8E8E88] focus:outline-none focus:border-[#161615] resize-none"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setBulkMode(false)}
                className="px-3 py-1.5 text-xs font-medium text-[#666661] hover:text-[#161615] rounded-lg cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleBulkAdd}
                disabled={isGameRunning || !bulkInput.trim()}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-[#161615] hover:bg-[#2C2C2A] disabled:opacity-40 rounded-lg cursor-pointer"
              >
                명단에 추가
              </button>
            </div>
          </div>
        )}

        {/* Quick actions & presets */}
        <div className="flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={() => setBulkMode(!bulkMode)}
            disabled={isGameRunning}
            className="inline-flex items-center gap-1 text-[#666661] hover:text-[#161615] font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" />
            {bulkMode ? '한 줄 입력으로 전환' : '여러 명 붙여넣기'}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onShuffleParticipants}
              disabled={isGameRunning || participants.length < 2}
              className="inline-flex items-center gap-1 text-[#666661] hover:text-[#161615] font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              <Shuffle className="w-3.5 h-3.5" />
              섞기
            </button>
            <span aria-hidden="true" className="text-[#D4D4CE]">·</span>
            <button
              type="button"
              onClick={onClearAll}
              disabled={isGameRunning || participants.length === 0}
              className="inline-flex items-center gap-1 text-[#666661] hover:text-[#DC2626] font-medium cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              비우기
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs text-[#8E8E88] mr-1">예시:</span>
          {PRESET_LISTS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              disabled={isGameRunning}
              onClick={() => onApplyPreset(preset.names)}
              className="px-2.5 py-1 text-xs font-medium text-[#4A4A46] bg-[#F3F3EF] hover:bg-[#EAEAE3] rounded-md transition-colors cursor-pointer disabled:opacity-40 whitespace-nowrap"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Draw Rules */}
      <div className="p-3.5 bg-[#F9F9F7] border border-[#E4E4E0] rounded-lg flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#161615]">뽑을 당첨자 수</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isGameRunning || winnerCount <= 1}
              onClick={() => onChangeWinnerCount(Math.max(1, winnerCount - 1))}
              aria-label="당첨자 수 감소"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-[#E4E4E0] text-[#161615] hover:bg-[#F3F3EF] disabled:opacity-40 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="w-8 text-center text-sm font-bold tabular-nums text-[#161615]">
              {winnerCount}명
            </span>
            <button
              type="button"
              disabled={isGameRunning || winnerCount >= Math.max(1, activeCount)}
              onClick={() =>
                onChangeWinnerCount(Math.min(Math.max(1, activeCount), winnerCount + 1))
              }
              aria-label="당첨자 수 증가"
              className="w-7 h-7 flex items-center justify-center rounded-md bg-white border border-[#E4E4E0] text-[#161615] hover:bg-[#F3F3EF] disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <label className="flex items-center justify-between gap-2 cursor-pointer select-none">
          <span className="text-xs font-medium text-[#4A4A46]">
            당첨된 참가자 자동 제외
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={excludeWinners}
            onClick={onToggleExcludeWinners}
            className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors duration-150 cursor-pointer ${
              excludeWinners ? 'bg-[#E04F33]' : 'bg-[#D4D4CE]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-150 mt-0.5 ${
                excludeWinners ? 'translate-x-4.5 ml-0.5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </label>
      </div>

      {/* Participant List */}
      <div className="flex flex-col gap-1.5 max-h-[360px] overflow-y-auto pr-1">
        {participants.length === 0 ? (
          <div className="py-10 text-center text-sm text-[#8E8E88]">
            참가자가 없습니다. 이름을 추가하거나 예시 명단을 불러오세요.
          </div>
        ) : (
          participants.map((p, index) => (
            <div
              key={p.id}
              className={`group flex items-center justify-between gap-2 px-3 py-2 rounded-lg border transition-colors ${
                p.active
                  ? 'bg-white border-[#E4E4E0]'
                  : 'bg-[#F6F6F3] border-transparent opacity-55'
              }`}
            >
              <button
                type="button"
                disabled={isGameRunning}
                onClick={() => onToggleActive(p.id)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer disabled:cursor-not-allowed"
              >
                <span
                  className={`w-4 h-4 rounded flex items-center justify-center shrink-0 border ${
                    p.active
                      ? 'border-transparent text-white'
                      : 'border-[#C8C8C2] bg-white'
                  }`}
                  style={p.active ? { backgroundColor: p.color } : undefined}
                >
                  {p.active && <Check className="w-3 h-3 stroke-[3]" />}
                </span>
                <span className="text-xs font-mono text-[#8E8E88] tabular-nums w-5 shrink-0">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span
                  className={`text-sm font-medium truncate ${
                    p.active ? 'text-[#161615]' : 'line-through text-[#8E8E88]'
                  }`}
                >
                  {p.name}
                </span>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center bg-[#F6F6F3] rounded-md px-1 py-0.5">
                  <button
                    type="button"
                    disabled={isGameRunning || p.weight <= 1}
                    onClick={() => onUpdateWeight(p.id, -1)}
                    aria-label={`${p.name} 가중치 감소`}
                    className="w-5 h-5 flex items-center justify-center text-xs text-[#666661] hover:text-[#161615] disabled:opacity-30 cursor-pointer"
                  >
                    -
                  </button>
                  <span
                    title="추첨 가중치 (룰렛·가챠 적용)"
                    className="px-1 text-[11px] font-mono tabular-nums text-[#4A4A46]"
                  >
                    {p.weight}x
                  </span>
                  <button
                    type="button"
                    disabled={isGameRunning || p.weight >= 10}
                    onClick={() => onUpdateWeight(p.id, 1)}
                    aria-label={`${p.name} 가중치 증가`}
                    className="w-5 h-5 flex items-center justify-center text-xs text-[#666661] hover:text-[#161615] disabled:opacity-30 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isGameRunning}
                  onClick={() => onRemoveParticipant(p.id)}
                  aria-label={`${p.name} 삭제`}
                  className="p-1 text-[#8E8E88] hover:text-[#DC2626] rounded cursor-pointer disabled:opacity-30"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {activeCount < participants.length && (
        <button
          type="button"
          disabled={isGameRunning}
          onClick={onRestoreAllActive}
          className="w-full py-2 text-xs font-semibold text-[#161615] bg-[#F3F3EF] hover:bg-[#EAEAE3] rounded-lg transition-colors cursor-pointer disabled:opacity-40"
        >
          제외된 참가자 모두 복원 ({participants.length - activeCount}명)
        </button>
      )}

      <div className="pt-2 border-t border-[#E4E4E0]">
        <a
          href="/luckydraw.html"
          download="luckydraw.html"
          className="w-full py-2 px-3 text-xs font-medium text-[#4A4A46] hover:text-[#161615] bg-[#F9F9F7] hover:bg-[#F3F3EF] border border-[#E4E4E0] rounded-lg transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <Download className="w-3.5 h-3.5" />
          단일 HTML 파일로 저장
        </a>
      </div>
    </aside>
  );
}
