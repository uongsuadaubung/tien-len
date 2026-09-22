use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use crate::card::Card;
use crate::combination::Combination;
use crate::player::MatchPlayer;
use crate::rules::GameRules;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayedMove {
    pub player_id: String,
    pub combination: Combination,
    pub timestamp: u64,
    pub is_chop: bool,
    pub chopped_player_id: Option<String>,
    pub penalty_amount: i64,
    pub is_cascade_chop: bool,
    pub chop_chain_count: u32,
    pub chop_chain_total_amount: i64,
}

impl PlayedMove {
    pub fn standard(player_id: impl Into<String>, combination: Combination, timestamp: u64) -> Self {
        Self {
            player_id: player_id.into(),
            combination,
            timestamp,
            is_chop: false,
            chopped_player_id: None,
            penalty_amount: 0,
            is_cascade_chop: false,
            chop_chain_count: 0,
            chop_chain_total_amount: 0,
        }
    }

    pub fn chop(
        player_id: impl Into<String>,
        combination: Combination,
        chopped_player_id: impl Into<String>,
        penalty_amount: i64,
        is_cascade_chop: bool,
        chop_chain_count: u32,
        chop_chain_total_amount: i64,
        timestamp: u64,
    ) -> Self {
        Self {
            player_id: player_id.into(),
            combination,
            timestamp,
            is_chop: true,
            chopped_player_id: Some(chopped_player_id.into()),
            penalty_amount,
            is_cascade_chop,
            chop_chain_count,
            chop_chain_total_amount,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InstantWinType {
    DragonStraight,
    FourTwos,
    FivePairsSequential,
    SixPairs,
    #[serde(rename = "SAME_COLOR_13")]
    SameColor13,
    FirstRoundFourThrees,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayerRanking {
    pub player_id: String,
    pub name: String,
    pub rank_position: usize, // 1st, 2nd, 3rd, 4th
    pub remaining_cards: usize,
    pub score_change: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PlayingCommon {
    pub game_number: u32,
    pub round_number: u32,
    pub players: Vec<MatchPlayer>,
    pub current_turn_player_id: String,
    pub lead_player_id: String,
    pub round_moves: Vec<PlayedMove>,
    pub passed_player_ids: Vec<String>,
    pub rules: GameRules,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "phase", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum PlayingTurnState {
    OpeningFirstMove {
        #[serde(flatten)]
        common: PlayingCommon,
        required_card: Card,
    },
    NormalLead {
        #[serde(flatten)]
        common: PlayingCommon,
    },
    Follow {
        #[serde(flatten)]
        common: PlayingCommon,
        leading_move: PlayedMove,
    },
}

impl PlayingTurnState {
    pub fn common(&self) -> &PlayingCommon {
        match self {
            PlayingTurnState::OpeningFirstMove { common, .. } => common,
            PlayingTurnState::NormalLead { common } => common,
            PlayingTurnState::Follow { common, .. } => common,
        }
    }

    pub fn common_mut(&mut self) -> &mut PlayingCommon {
        match self {
            PlayingTurnState::OpeningFirstMove { common, .. } => common,
            PlayingTurnState::NormalLead { common } => common,
            PlayingTurnState::Follow { common, .. } => common,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(tag = "status", rename_all = "SCREAMING_SNAKE_CASE")]
pub enum MatchState {
    Waiting {
        game_number: u32,
        players: Vec<MatchPlayer>,
        rules: GameRules,
        last_winner_id: Option<String>,
    },
    Dealing {
        game_number: u32,
        players: Vec<MatchPlayer>,
        dealt_counts: HashMap<String, usize>,
        total_cards_dealt: usize,
        rules: GameRules,
    },
    Playing(PlayingTurnState),
    InstantWin {
        game_number: u32,
        players: Vec<MatchPlayer>,
        winner_id: String,
        win_type: InstantWinType,
        rules: GameRules,
    },
    RoundEnded {
        game_number: u32,
        round_number: u32,
        players: Vec<MatchPlayer>,
        winner_id: String,
        rankings: Vec<PlayerRanking>,
        rules: GameRules,
    },
    GameOver {
        game_number: u32,
        players: Vec<MatchPlayer>,
        final_rankings: Vec<PlayerRanking>,
        rules: GameRules,
    },
}
