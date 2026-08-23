export interface ShopItem {
  id: string;
  name: string;
  category: 'CARD_BACK' | 'TABLE_FELT' | 'AVATAR_FRAME' | 'TITLE';
  price: number;
  icon: string;
  previewClass?: string;
  description: string;
  isUnlockedByDefault?: boolean;
}

export const SHOP_ITEMS: ShopItem[] = [
  // 1. LƯNG BÀI (CARD BACKS)
  {
    id: 'card_back_classic',
    name: 'Lưng Bài Cổ Điển',
    category: 'CARD_BACK',
    price: 0,
    icon: '🎴',
    description: 'Họa tiết caro truyền thống sang trọng.',
    isUnlockedByDefault: true
  },
  {
    id: 'card_back_dragon_gold',
    name: 'Rồng Vàng Hoàng Gia',
    category: 'CARD_BACK',
    price: 50000,
    icon: '🐉',
    description: 'Họa tiết rồng vàng uốn lượn mạ vàng 24K quyền lực.'
  },
  {
    id: 'card_back_cyberpunk',
    name: 'Cyberpunk Neon Sài Gòn',
    category: 'CARD_BACK',
    price: 120000,
    icon: '🌆',
    description: 'Hiệu ứng ánh sáng neon điện tử tương lai rực rỡ.'
  },
  {
    id: 'card_back_flame_infinity',
    name: 'Hỏa Diệm Vô Cực',
    category: 'CARD_BACK',
    price: 300000,
    icon: '🔥',
    description: 'Ngọn lửa thần bài bùng cháy tỏa hào quang uy lực.'
  },

  // 2. THẢM BÀN SÒNG BẠC (TABLE FELT)
  {
    id: 'felt_traditional_emerald',
    name: 'Nỉ Ngọc Bích Truyền Thống',
    category: 'TABLE_FELT',
    price: 0,
    icon: '🟢',
    description: 'Màu xanh lục ngọc bích chuẩn sới bạc truyền thống.',
    isUnlockedByDefault: true
  },
  {
    id: 'felt_las_vegas_red',
    name: 'Nỉ Nhung Đỏ Las Vegas',
    category: 'TABLE_FELT',
    price: 40000,
    icon: '🔴',
    description: 'Màu đỏ rượu vang nhung mềm phong cách Casino Las Vegas.'
  },
  {
    id: 'felt_royal_ebony',
    name: 'Gỗ Mun Hoàng Gia Nẹp Vàng',
    category: 'TABLE_FELT',
    price: 100000,
    icon: '👑',
    description: 'Mặt bàn gỗ mun viền nẹp vàng 24K đắt giá quý tộc.'
  },
  {
    id: 'felt_cosmic_space',
    name: 'Kính Không Gian Vũ Trụ',
    category: 'TABLE_FELT',
    price: 250000,
    icon: '🌌',
    description: 'Không gian huyền ảo vô cực với bụi sao lấp lánh.'
  },

  // 3. KHUNG AVATAR (AVATAR FRAMES)
  {
    id: 'frame_none',
    name: 'Khung Cơ Bản',
    category: 'AVATAR_FRAME',
    price: 0,
    icon: '⭕',
    description: 'Viền avatar cơ bản đơn giản.',
    isUnlockedByDefault: true
  },
  {
    id: 'frame_gold_radiance',
    name: 'Hào Quang Hoàng Kim',
    category: 'AVATAR_FRAME',
    price: 60000,
    icon: '✨',
    description: 'Hào quang vàng rực rỡ tỏa sáng quanh avatar.'
  },
  {
    id: 'frame_flaming_dragon',
    name: 'Hỏa Long Cuồng Nộ',
    category: 'AVATAR_FRAME',
    price: 150000,
    icon: '🐲',
    description: 'Khung rồng lửa cuộn trào bao quanh avatar.'
  },

  // 4. DANH HIỆU VIP (TITLES)
  {
    id: 'title_novice',
    name: 'Tân Thủ Cầu May',
    category: 'TITLE',
    price: 0,
    icon: '🍀',
    description: 'Danh hiệu cho người mới bước vào sòng.',
    isUnlockedByDefault: true
  },
  {
    id: 'title_pig_hunter',
    name: 'Đệ Nhất Săn Heo',
    category: 'TITLE',
    price: 50000,
    icon: '🏹',
    description: 'Chuyên gia rình rập chém heo đối thủ không trượt phát nào.'
  },
  {
    id: 'title_underground_boss',
    name: 'Trùm Thế Giới Ngầm',
    category: 'TITLE',
    price: 200000,
    icon: '🎩',
    description: 'Bá chủ các bàn cược lớn tại sòng bạc ngầm.'
  }
];
