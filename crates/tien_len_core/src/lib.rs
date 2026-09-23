#![allow(clippy::too_many_arguments)]
#![allow(clippy::large_enum_variant)]

pub mod card;
pub mod combination;
pub mod rules;
pub mod player;
pub mod state;
pub mod engine;
pub mod hand_sorter;
pub mod quick_response;
pub mod elo;
pub mod ai;
pub mod simulation;
pub mod wasm_api;

pub use card::{create_deck, sort_cards, Card, Suit};
pub use combination::{
    can_beat, can_chop, identify_combination, Combination, CombinationType,
};
pub use rules::{ChoppingRules, CongRules, GameFlowRules, GameRules, GameSettlementRule, TableRules};
pub use player::{
    clone_player, mask_opponent_hands, reset_players_for_new_game, update_players_hand,
    MatchPlayer,
};
pub use state::{InstantWinType, MatchState, PlayedMove, PlayerRanking, PlayingTurnState};
pub use engine::{
    calculate_chop_penalty, calculate_rotten_penalty, check_instant_win, pass_turn, play_move,
    start_new_game, validate_move,
};
pub use hand_sorter::{
    cycle_hand_groupings, get_available_smart_variants, sort_smart_groups, SmartCardGroup,
    partition_hand, HandPartition,
};
