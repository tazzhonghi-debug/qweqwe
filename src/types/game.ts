export type GameMode = 'wheel' | 'ladder' | 'pinball' | 'gacha' | 'cards';

export interface Participant {
  id: string;
  name: string;
  weight: number;
  active: boolean;
  color: string;
}

export interface DrawRecord {
  id: string;
  timestamp: number;
  mode: GameMode;
  modeLabel: string;
  winners: {
    id: string;
    name: string;
    prize?: string;
    color: string;
  }[];
  participantCount: number;
}

export const GAME_COLORS = [
  '#E04F33', // Vermilion
  '#2563EB', // Cobalt
  '#0D9488', // Deep Teal
  '#D97706', // Amber
  '#4F46E5', // Indigo
  '#DB2777', // Rose
  '#059669', // Emerald
  '#7C3AED', // Violet
  '#EA580C', // Burnt Orange
  '#0284C7', // Cerulean
  '#B45309', // Ochre
  '#BE185D', // Berry
];

export const GAME_MODES: {
  id: GameMode;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    id: 'wheel',
    label: '행운의 룰렛',
    shortLabel: '룰렛 돌리기',
    description: '가중치 설정이 가능한 원형 룰렛을 돌려 단번에 당첨자를 뽑습니다.',
  },
  {
    id: 'ladder',
    label: '사다리 타기',
    shortLabel: '사다리 타기',
    description: '참가자와 당첨 항목을 연결해 긴장감 있게 경로를 추적합니다.',
  },
  {
    id: 'pinball',
    label: '핀볼 레이스',
    shortLabel: '핀볼 레이스',
    description: '물리 엔진 장애물을 뚫고 결승선을 통과하는 구슬로 승자를 정합니다.',
  },
  {
    id: 'gacha',
    label: '캡슐 뽑기',
    shortLabel: '캡슐 뽑기',
    description: '다이얼을 돌려 굴러 나온 캡슐을 열어 당첨자를 확인합니다.',
  },
  {
    id: 'cards',
    label: '미스터리 카드',
    shortLabel: '카드 뒤집기',
    description: '무작위로 섞인 카드를 직접 뒤집어 당첨과 꽝을 가려냅니다.',
  },
];

export const PRESET_LISTS: { label: string; names: string[] }[] = [
  {
    label: '커피 내기 6인',
    names: ['김민수', '이서연', '박지훈', '최유진', '정현우', '강하은'],
  },
  {
    label: '팀 회식 8인',
    names: ['기획팀 지수', '개발팀 태오', '디자인 민지', '마케팅 준호', '운영팀 수빈', '데이터 도윤', '보안팀 채원', 'PM 시우'],
  },
  {
    label: '경품 번호 1~12',
    names: ['1번', '2번', '3번', '4번', '5번', '6번', '7번', '8번', '9번', '10번', '11번', '12번'],
  },
];
