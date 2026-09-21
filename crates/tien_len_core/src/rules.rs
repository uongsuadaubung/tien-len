use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GameSettlementRule {
    Traditional,
    CountCards,
    WinnerTakesAll,
}

impl Default for GameSettlementRule {
    fn default() -> Self {
        GameSettlementRule::CountCards
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChoppingRules {
    pub allow_four_pairs_cut_anytime: bool,
    pub allow_three_pairs_cut_two: bool,
    pub allow_four_of_a_kind_cut_pairs_of_twos: bool,
    pub multiplier: f64,
    pub cascade_multiplier: bool,
}

impl Default for ChoppingRules {
    fn default() -> Self {
        Self {
            allow_four_pairs_cut_anytime: true,
            allow_three_pairs_cut_two: true,
            allow_four_of_a_kind_cut_pairs_of_twos: true,
            multiplier: 1.0,
            cascade_multiplier: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CongRules {
    pub enabled: bool,
    pub penalty_cards: u32,
    pub multiplier: f64,
}

impl Default for CongRules {
    fn default() -> Self {
        Self {
            enabled: true,
            penalty_cards: 26,
            multiplier: 1.0,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstantWinRules {
    pub enabled: bool,
    pub payout_multiplier: u32,
}

impl Default for InstantWinRules {
    fn default() -> Self {
        Self {
            enabled: true,
            payout_multiplier: 26,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameFlowRules {
    pub first_game_require_three_of_spades: bool,
    pub winner_leads_next_game: bool,
    pub prohibit_ending_with_two: bool,
    pub three_spades_ending_bonus: bool,
}

impl Default for GameFlowRules {
    fn default() -> Self {
        Self {
            first_game_require_three_of_spades: true,
            winner_leads_next_game: true,
            prohibit_ending_with_two: true,
            three_spades_ending_bonus: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableRules {
    pub player_count: u8,
    pub bet_amount: i64,
    pub sound_enabled: bool,
}

impl Default for TableRules {
    fn default() -> Self {
        Self {
            player_count: 4,
            bet_amount: 1000,
            sound_enabled: true,
        }
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct GameRules {
    pub settlement_rule: GameSettlementRule,
    pub chopping: ChoppingRules,
    pub cong: CongRules,
    pub instant_win: InstantWinRules,
    pub game_flow: GameFlowRules,
    pub table: TableRules,
}

impl GameRules {
    pub fn traditional() -> Self {
        Self {
            settlement_rule: GameSettlementRule::Traditional,
            ..Default::default()
        }
    }

    pub fn count_cards() -> Self {
        Self {
            settlement_rule: GameSettlementRule::CountCards,
            ..Default::default()
        }
    }

    pub fn winner_takes_all() -> Self {
        Self {
            settlement_rule: GameSettlementRule::WinnerTakesAll,
            ..Default::default()
        }
    }

    pub fn solo_1v1() -> Self {
        let mut rules = Self::count_cards();
        rules.table.player_count = 2;
        rules
    }
}
