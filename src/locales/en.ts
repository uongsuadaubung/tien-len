import type { LocaleDictionary } from './types';

/**
 * English dictionary (1:1 schema mirrored from vi.ts)
 */
export const en: LocaleDictionary = {
  common: {
    confirm: 'Confirm',
    cancel: 'Cancel',
    close: 'Close',
    save: 'Save',
    back: 'Back',
    retry: 'Retry',
    loading: 'Loading...',
    coins: 'Coins',
    level: 'Level',
    score: 'Score',
    settings: 'Settings',
    exit: 'Exit',
    copy: 'Copy',
    copied: 'Copied!',
    ready: 'Ready',
    notReady: 'Not Ready',
    waiting: 'Waiting...'
  },
  game: {
    playCard: 'Play',
    passTurn: 'Pass',
    quickSelect: 'Quick Match',
    clearSelection: 'Deselect',
    autoSort: 'Sort',
    sortValue: 'By Rank',
    sortCombo: 'By Combo',
    firstMoveInstruction: 'You have 3 of Spades and make the opening move!',
    firstMoveWarning: 'First move: Must include the 3 of Spades ♠',
    turnYourTurn: 'Your Turn',
    turnWaiting: 'Waiting for {name}...',
    chopAlert: '{chopper} chopped {victim} for {amount} Coins!',
    cascadeChopAlert: 'CASCADE CHOP LVL {chain}! {chopper} counter-chopped {victim} for {amount} Coins!',
    victory: 'Victory!',
    defeat: 'Defeated!',
    instantWin: 'Instant Win! ({type})',
    congsAlert: '{name} was Frozen! Penalty: {amount} Coins',
    dealDealing: 'Dealing cards...',
    quickSelectTooltipReady: 'Auto-select cards to {action}',
    quickSelectTooltipEmpty: 'No valid counter cards',
    quickSelectActionLead: 'lead',
    quickSelectActionBeat: 'beat',
    clearSelectionTooltip: 'Lower all selected cards'
  },
  sort: {
    naturalLabel: 'Rank (3 -> 2)',
    naturalDesc: 'Sort in ascending rank order from 3 of Spades to 2 of Hearts',
    smartGroupLabel: 'Smart Combos',
    smartGroupDesc: 'Auto-group Straights, Quads, Pairs, and isolate single trash cards',
    bySuitLabel: 'By Suit (♠ ♣ ♦ ♥)',
    bySuitDesc: 'Group cards of the same suit together for easier inspection',
    twoPreserveLabel: 'Preserve 2s',
    twoPreserveDesc: 'Push all 2s (Pigs) to the end of hand to easily dump low trash'
  },
  header: {
    lobby: 'Lobby',
    rules: 'Rules',
    settings: 'Settings',
    streak: 'Win Streak: {count}',
    loanNotice: 'Loan Debt: {amount} Coins',
    f5Warning: 'Quit Match Warning'
  },
  combinations: {
    single: 'Single Card',
    pair: 'Pair',
    triple: 'Triple',
    straight: 'Straight {length} Cards',
    threePairs: '🔥 3 Consecutive Pairs',
    fourOfAKind: '⚡ Four of a Kind',
    fourPairs: '💥 4 Consecutive Pairs'
  },
  table: {
    roundLead: 'Lead Round',
    freeTurn: 'Free Turn: Play any combination',
    beatRequired: 'Must beat previous combination',
    passedBadge: 'PASSED',
    cardsCount: '{count} cards',
    noCardsLeft: 'No cards',
    tableEmpty: 'Empty table - Waiting for opening lead',
    newRoundLead: 'New Round Started',
    tableEmptyTitle: 'Empty Table',
    leaderPrompt: 'Leader, please play opening combination',
    waitingLeadPrompt: 'Waiting for player to move...',
    chopCascadeTitle: '🔥 CASCADE CHOP (x{chain})!',
    chopSingleTitle: 'GREAT CHOP!'
  },
  bot: {
    passed: 'PASSED',
    congs: 'FROZEN',
    leader: 'LEADER',
    cardsUnit: 'cards'
  },
  victory: {
    titleVictory: 'SPECTACULAR VICTORY!',
    titleDefeat: 'DEFEAT - 4TH PLACE!',
    titleInstantWin: 'INSTANT WIN!',
    rank1: '1ST PLACE',
    rank2: '2ND PLACE',
    rank3: '3RD PLACE',
    rank4: '4TH PLACE',
    congsPenalty: 'Frozen Penalty',
    chopReward: 'Chop Reward',
    coinsEarned: 'Coins Won',
    coinsLost: 'Coins Lost',
    eloChange: 'ELO: {delta}',
    btnRematch: 'Play Again',
    btnBackLobby: 'Return to Lobby',
    statPayout: 'Table Settlement'
  },
  settings: {
    title: 'System Settings',
    language: 'Language (Ngôn Ngữ)',
    langVi: 'Tiếng Việt',
    langEn: 'English',
    soundEffect: 'Sound Effects',
    soundBgm: 'Background Music',
    cardSpeed: 'Dealing & Play Speed',
    speedNormal: 'Normal',
    speedFast: 'Fast',
    aiAssistant: 'AI Strategy Assistant',
    autoSort: 'Auto-Sort on Deal',
    autoBackup: 'Auto Cloud Backup',
    saveSuccess: 'Settings saved successfully!'
  },
  forfeit: {
    title: 'Confirm Forfeit / Leave Table',
    message: 'Game is currently in progress! Leaving now will result in automatic 4th place defeat and forfeiture of your entire bet.',
    confirm: 'Forfeit Match',
    cancel: 'Keep Playing'
  },
  bankruptcy: {
    title: 'OUT OF COINS - BANKRUPT!',
    message: 'You no longer have enough coins to participate in tables.',
    claimRelief: 'Claim Daily Relief (+5,000 Coins)',
    visitBank: 'Take Bank Loan'
  },
  lobby: {
    quickPlay: 'Quick Match',
    ranked: 'Ranked',
    campaign: 'Campaign',
    customRoom: 'Create Room',
    findRoom: 'Find Room',
    betAmount: 'Bet Amount',
    playerCount: 'Players',
    roomCode: 'Room Code',
    joinRoom: 'Join Room',
    leaveRoom: 'Leave Room',
    startGame: 'Start Match',
    roomList: 'Lobby Room List',
    noRoomsFound: 'No suitable rooms found'
  },
  botPhases: {
    opening: 'Opening',
    midGame: 'Mid Game',
    endGame: 'Endgame',
    emergencyRescue: 'Emergency Rescue',
    noValidMoves: 'No Valid Moves'
  },
  errors: {
    invalidMove: 'Invalid move',
    mustInclude3S: 'The opening move of the game must include the 3 of Spades',
    notYourTurn: 'It is not your turn yet',
    roomNotFound: 'Room not found',
    roomFull: 'Room is already full',
    insufficientCoins: 'Insufficient Coins to join this table',
    gameInProgress: 'Game is currently in progress'
  }
};
