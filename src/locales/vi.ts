/**
 * Từ điển văn bản Tiếng Việt chuẩn (Single Source of Truth cho toàn bộ dự án)
 */
export const vi = {
  common: {
    confirm: 'Xác Nhận',
    cancel: 'Hủy Bỏ',
    close: 'Đóng',
    save: 'Lưu',
    back: 'Quay Lại',
    retry: 'Thử Lại',
    loading: 'Đang Tải...',
    coins: 'Xu',
    level: 'Cấp',
    score: 'Điểm',
    settings: 'Cài Đặt',
    exit: 'Thoát',
    copy: 'Sao Chép',
    copied: 'Đã sao chép!',
    ready: 'Sẵn Sàng',
    notReady: 'Chưa Sẵn Sàng',
    waiting: 'Đang Chờ...'
  },
  game: {
    playCard: 'Đánh Bài',
    passTurn: 'Bỏ Lượt',
    quickSelect: 'Bắt Bài',
    clearSelection: 'Hạ Bài',
    autoSort: 'Xếp Bài',
    sortValue: 'Xếp Điểm',
    sortCombo: 'Xếp Bộ',
    firstMoveInstruction: 'Bạn giữ 3 Bích và đi trước mở màn ván đấu!',
    firstMoveWarning: 'Ván đầu tiên: Bắt buộc chọn tổ hợp có chứa lá 3 Bích ♠',
    turnYourTurn: 'Lượt của bạn',
    turnWaiting: 'Đang chờ {name} đi bài...',
    chopAlert: '{chopper} vừa chặt {victim} phạt {amount} Xu!',
    cascadeChopAlert: 'CHẶT CHỒNG CẤP {chain}! {chopper} chặt đè {victim} phạt {amount} Xu!',
    victory: 'Chiến Thắng!',
    defeat: 'Về Bét!',
    instantWin: 'Tới Trắng! ({type})',
    congsAlert: '{name} bị Cóng! Phạt {amount} Xu',
    dealDealing: 'Đang chia bài...',
    quickSelectTooltipReady: 'Tự động chọn bài để {action}',
    quickSelectTooltipEmpty: 'Không có bài chặn được',
    quickSelectActionLead: 'ra trước',
    quickSelectActionBeat: 'chặn bài',
    clearSelectionTooltip: 'Hạ toàn bộ các lá bài đang chọn xuống'
  },
  sort: {
    naturalLabel: 'Giá Trị (3 -> 2)',
    naturalDesc: 'Sắp xếp tự nhiên theo thứ bậc sức mạnh từ 3 Bích đến 2 Cơ',
    smartGroupLabel: 'Bộ Bài Thông Minh',
    smartGroupDesc: 'Tự động gom Sảnh dài, Tứ Quý, Đôi và tách riêng bài rác lẻ',
    bySuitLabel: 'Đồng Chất (Bích-Chuồn-Rô-Cơ)',
    bySuitDesc: 'Gom nhóm các lá bài cùng chất lại gần nhau để dễ quan sát',
    twoPreserveLabel: 'Bảo Toàn Heo (2)',
    twoPreserveDesc: 'Đẩy toàn bộ các lá Heo (2) về cuối tay bài để dễ tẩu rác nhỏ'
  },
  header: {
    lobby: 'Sảnh Chờ',
    rules: 'Luật Chơi',
    settings: 'Cài Đặt',
    streak: 'Chuỗi Thắng: {count}',
    loanNotice: 'Đang Nợ: {amount} Xu',
    f5Warning: 'Cảnh Báo Rời Bàn'
  },
  combinations: {
    single: 'Lá Rác',
    pair: 'Đôi',
    triple: 'Sám Cô',
    straight: 'Sảnh {length} Lá',
    threePairs: '🔥 3 Đôi Thông',
    fourOfAKind: '⚡ Tứ Quý',
    fourPairs: '💥 4 Đôi Thông'
  },
  table: {
    roundLead: 'Giành Quyền Đi Trước',
    freeTurn: 'Vòng Tự Do: Đánh bất kỳ tổ hợp nào',
    beatRequired: 'Đánh tổ hợp lớn hơn để đè bài',
    passedBadge: 'ĐÃ BỎ LƯỢT',
    cardsCount: '{count} lá',
    noCardsLeft: 'Hết Bài',
    tableEmpty: 'Bàn trống - Chờ nước đi mở màn',
    newRoundLead: 'Vòng Mới Bắt Đầu',
    tableEmptyTitle: 'Bàn Đang Trống',
    leaderPrompt: 'Người cầm Cái hãy đánh bộ bài mở màn',
    waitingLeadPrompt: 'Chờ người chơi ra bài...',
    chopCascadeTitle: '🔥 CHẶT ĐÈ LIÊN HOÀN (x{chain})!',
    chopSingleTitle: 'CHẶT ĐẸP!'
  },
  bot: {
    passed: 'BỎ LƯỢT',
    congs: 'CÓNG BÀI',
    leader: 'CẦM CÁI',
    cardsUnit: 'lá'
  },
  victory: {
    titleVictory: 'CHIẾN THẮNG RỰC RỠ!',
    titleDefeat: 'THẤT BẠI - VỀ BÉT!',
    titleInstantWin: 'TỚI TRẮNG!',
    rank1: 'VỀ NHẤT',
    rank2: 'VỀ NHÌ',
    rank3: 'VỀ BA',
    rank4: 'VỀ BÉT',
    congsPenalty: 'Phạt Cóng (Cháy bài)',
    chopReward: 'Thưởng Chặt Heo',
    coinsEarned: 'Xu Thắng',
    coinsLost: 'Xu Mất',
    eloChange: 'ELO: {delta}',
    btnRematch: 'Chơi Tiếp Ván Mới',
    btnBackLobby: 'Quay Về Sảnh',
    statPayout: 'Tổng Kết Tiền Bàn'
  },
  settings: {
    title: 'Cài Đặt Hệ Thống',
    language: 'Ngôn Ngữ (Language)',
    langVi: 'Tiếng Việt',
    langEn: 'English',
    soundEffect: 'Hiệu Ứng Âm Thanh',
    soundBgm: 'Nhạc Nền',
    cardSpeed: 'Tốc Độ Đánh & Chia Bài',
    speedNormal: 'Bình Thường',
    speedFast: 'Nhanh',
    aiAssistant: 'Trợ Lý Phân Tích AI',
    autoSort: 'Tự Động Xếp Bài Khi Chia',
    autoBackup: 'Tự Động Sao Lưu Lên Mây',
    saveSuccess: 'Đã lưu cài đặt thành công!'
  },
  forfeit: {
    title: 'Xác Nhận Rời Bàn / Đầu Hàng',
    message: 'Ván đấu đang diễn ra! Nếu rời bàn bây giờ, bạn sẽ bị xử thua về Bét và bị trừ toàn bộ tiền cược theo quy định.',
    confirm: 'Chấp Nhận Thoát',
    cancel: 'Tiếp Tục Đấu'
  },
  bankruptcy: {
    title: 'HẾT TIỀN - PHÁ SẢN!',
    message: 'Bạn đã không còn đủ Xu để tiếp tục tham gia các bàn đấu.',
    claimRelief: 'Nhận Cứu Trợ Hằng Ngày (+5.000 Xu)',
    visitBank: 'Vay Vốn Ngân Hàng'
  },
  lobby: {
    quickPlay: 'Chơi Nhanh',
    ranked: 'Xếp Hạng',
    campaign: 'Chiến Dịch',
    customRoom: 'Tạo Phòng',
    findRoom: 'Tìm Phòng',
    betAmount: 'Mức Cược',
    playerCount: 'Số Người Chơi',
    roomCode: 'Mã Phòng',
    joinRoom: 'Vào Phòng',
    leaveRoom: 'Rời Phòng',
    startGame: 'Bắt Đầu Ván Đấu',
    roomList: 'Danh Sách Phòng Sảnh Chờ',
    noRoomsFound: 'Không tìm thấy phòng phù hợp'
  },
  botPhases: {
    opening: 'Khai Cuộc',
    midGame: 'Trung Cuộc',
    endGame: 'Cờ Tàn',
    emergencyRescue: 'Cứu Nguy Khẩn Cấp',
    noValidMoves: 'Không Có Nước Đi'
  },
  errors: {
    invalidMove: 'Nước đi không hợp lệ',
    mustInclude3S: 'Bắt buộc phải đánh có chứa 3 Bích ở lượt đầu tiên',
    notYourTurn: 'Chưa đến lượt của bạn',
    roomNotFound: 'Không tìm thấy phòng chơi',
    roomFull: 'Phòng đã đủ người',
    insufficientCoins: 'Bạn không đủ Xu để tham gia bàn này',
    gameInProgress: 'Ván đấu đang diễn ra'
  }
} as const;
