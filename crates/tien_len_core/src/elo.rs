use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use crate::player::MatchPlayer;

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EloPerformanceMetrics {
    pub remaining_cards: Option<usize>,
    pub chops_count: Option<u32>,
    pub got_chopped_count: Option<u32>,
    pub rotten_count: Option<u32>,
    pub is_burnt: Option<bool>,
    pub caused_burnt_count: Option<u32>,
    pub is_three_spades_win: Option<bool>,
    pub is_instant_win: Option<bool>,
    pub current_streak: Option<u32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EloBreakdownItem {
    pub id: String,
    pub label_key: String,
    pub value: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EloBreakdown {
    pub base: i32,
    pub opponent_scaling: i32,
    pub performance: i32,
    pub streak: i32,
    pub items: Vec<EloBreakdownItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EloDeltaResult {
    pub delta: i32,
    pub new_elo: i32,
    pub breakdown: EloBreakdown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TableEloSettlementResult {
    pub all_elo_deltas: HashMap<String, i32>,
    pub all_elo_breakdowns: HashMap<String, EloBreakdown>,
}

/// Tính toán thay đổi Elo sau một ván xếp hạng theo mô hình Đa Chiều (Multi-Dimensional Elo)
pub fn calculate_elo_delta(
    rank_position: usize,
    player_elo: i32,
    opponents_avg_elo: i32,
    total_players: usize,
    metrics: Option<&EloPerformanceMetrics>,
) -> EloDeltaResult {
    let elo_diff = opponents_avg_elo as f64 - player_elo as f64;
    let scaling = (1.0 + elo_diff / 800.0).clamp(0.6, 1.5);

    let base_delta: i32 = match total_players {
        2 => {
            if rank_position == 1 {
                20
            } else {
                -20
            }
        }
        3 => match rank_position {
            1 => 28,
            2 => 0,
            _ => -28,
        },
        _ => match rank_position {
            1 => 40,
            2 => 15,
            3 => -15,
            _ => -40,
        },
    };

    let scaled_base: i32 = if base_delta >= 0 {
        ((base_delta as f64) * scaling).round() as i32
    } else {
        -(((base_delta.abs() as f64) / scaling).round() as i32)
    };
    let scaling_diff = scaled_base - base_delta;

    let mut items = Vec::new();
    items.push(EloBreakdownItem {
        id: "base".into(),
        label_key: "victory.eloBase".into(),
        value: base_delta,
    });

    if scaling_diff != 0 {
        items.push(EloBreakdownItem {
            id: "scaling".into(),
            label_key: "victory.eloOpponentScaling".into(),
            value: scaling_diff,
        });
    }

    let mut performance_delta: i32 = 0;
    if let Some(m) = metrics {
        // 1. Kháng cự kiên cường / Hiệu số lá bài còn lại (cho người thua)
        if rank_position >= 2 {
            if m.is_burnt.unwrap_or(false) {
                performance_delta -= 8;
                items.push(EloBreakdownItem {
                    id: "burntPenalty".into(),
                    label_key: "victory.eloBurntPenalty".into(),
                    value: -8,
                });
            } else if let Some(remaining) = m.remaining_cards {
                if remaining <= 2 {
                    performance_delta += 4;
                    items.push(EloBreakdownItem {
                        id: "cardMitigation".into(),
                        label_key: "victory.eloCardMitigationHeroic".into(),
                        value: 4,
                    });
                } else if remaining <= 5 {
                    performance_delta += 2;
                    items.push(EloBreakdownItem {
                        id: "cardMitigation".into(),
                        label_key: "victory.eloCardMitigationActive".into(),
                        value: 2,
                    });
                } else if remaining >= 10 {
                    performance_delta -= 3;
                    items.push(EloBreakdownItem {
                        id: "cardOverwhelm".into(),
                        label_key: "victory.eloCardOverwhelmed".into(),
                        value: -3,
                    });
                }
            }
        }

        // 2. Chặt Heo / Chặt Hàng thành công
        if let Some(chops) = m.chops_count {
            if chops > 0 {
                let chop_bonus = 6.min(chops as i32 * 3);
                performance_delta += chop_bonus;
                items.push(EloBreakdownItem {
                    id: "chopsBonus".into(),
                    label_key: "victory.eloChopsBonus".into(),
                    value: chop_bonus,
                });
            }
        }

        // 3. Bị Chặt Heo / Chặt Hàng
        if let Some(got_chopped) = m.got_chopped_count {
            if got_chopped > 0 {
                let chop_penalty = -6.min(got_chopped as i32 * 2);
                performance_delta += chop_penalty;
                items.push(EloBreakdownItem {
                    id: "gotChoppedPenalty".into(),
                    label_key: "victory.eloGotChoppedPenalty".into(),
                    value: chop_penalty,
                });
            }
        }

        // 4. Thối Heo / Thối Hàng cuối ván
        if let Some(rotten) = m.rotten_count {
            if rotten > 0 {
                let rotten_penalty = -6.min(rotten as i32 * 2);
                performance_delta += rotten_penalty;
                items.push(EloBreakdownItem {
                    id: "rottenPenalty".into(),
                    label_key: "victory.eloRottenPenalty".into(),
                    value: rotten_penalty,
                });
            }
        }

        // 5. Ép đối thủ Cóng (chỉ dành cho người về Nhất)
        if rank_position == 1 {
            if let Some(caused_burnt) = m.caused_burnt_count {
                if caused_burnt > 0 {
                    let burn_bonus = 10.min(caused_burnt as i32 * 5);
                    performance_delta += burn_bonus;
                    items.push(EloBreakdownItem {
                        id: "causedBurntBonus".into(),
                        label_key: "victory.eloCausedBurntBonus".into(),
                        value: burn_bonus,
                    });
                }
            }
        }

        // 6. Dứt điểm 3 Bích cuối cùng
        if rank_position == 1 && m.is_three_spades_win.unwrap_or(false) {
            performance_delta += 8;
            items.push(EloBreakdownItem {
                id: "threeSpadesBonus".into(),
                label_key: "victory.eloThreeSpadesBonus".into(),
                value: 8,
            });
        }

        // 7. Tới Trắng tức thì
        if rank_position == 1 && m.is_instant_win.unwrap_or(false) {
            performance_delta += 4;
            items.push(EloBreakdownItem {
                id: "instantWinBonus".into(),
                label_key: "victory.eloInstantWinBonus".into(),
                value: 4,
            });
        }
    }

    // 4. Thưởng Chuỗi Thắng (dành cho người về Nhất)
    let mut streak_delta: i32 = 0;
    if rank_position == 1 {
        if let Some(m) = metrics {
            if let Some(streak) = m.current_streak {
                if streak >= 5 {
                    streak_delta = 6;
                    items.push(EloBreakdownItem {
                        id: "streakBonus".into(),
                        label_key: "victory.eloStreak5Bonus".into(),
                        value: 6,
                    });
                } else if streak >= 3 {
                    streak_delta = 3;
                    items.push(EloBreakdownItem {
                        id: "streakBonus".into(),
                        label_key: "victory.eloStreak3Bonus".into(),
                        value: 3,
                    });
                }
            }
        }
    }

    let total_delta = scaled_base + performance_delta + streak_delta;
    let new_elo = 100.max(player_elo + total_delta);

    EloDeltaResult {
        delta: total_delta,
        new_elo,
        breakdown: EloBreakdown {
            base: base_delta,
            opponent_scaling: scaling_diff,
            performance: performance_delta,
            streak: streak_delta,
            items,
        },
    }
}

/// Kết toán Elo tổng quát cho TOÀN BỘ NGƯỜI CHƠI trên bàn đấu
pub fn compute_table_elo_settlement(
    players: &[MatchPlayer],
    winners: &[MatchPlayer],
    player_elos: &HashMap<String, i32>,
    chops_by_player: &HashMap<String, u32>,
    got_chopped_by_player: &HashMap<String, u32>,
    streaks_by_player: &HashMap<String, u32>,
    is_three_spades_win: bool,
    is_instant_win: bool,
) -> TableEloSettlementResult {
    let total_players = players.len();
    let mut all_elo_deltas = HashMap::new();
    let mut all_elo_breakdowns = HashMap::new();

    // Xếp hạng đầy đủ cho toàn bộ người chơi:
    // Nếu có trong winners: theo thứ tự về đích
    // Nếu chưa có trong winners: xếp theo số lá bài còn lại tăng dần
    let mut ranked_players = players.to_vec();
    ranked_players.sort_by(|a, b| {
        let a_win_idx = winners.iter().position(|w| w.id == a.id);
        let b_win_idx = winners.iter().position(|w| w.id == b.id);
        match (a_win_idx, b_win_idx) {
            (Some(ai), Some(bi)) => ai.cmp(&bi),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => a.hand.len().cmp(&b.hand.len()),
        }
    });

    for (i, p) in ranked_players.iter().enumerate() {
        let rank_position = i + 1;
        let current_elo = *player_elos.get(&p.id).unwrap_or(&1000);

        // Tính Elo trung bình của tất cả đối thủ khác
        let other_players: Vec<&MatchPlayer> =
            players.iter().filter(|other| other.id != p.id).collect();
        let opponents_avg_elo = if !other_players.is_empty() {
            let sum: i64 = other_players
                .iter()
                .map(|other| *player_elos.get(&other.id).unwrap_or(&1000) as i64)
                .sum();
            ((sum as f64) / (other_players.len() as f64)).round() as i32
        } else {
            1000
        };

        let is_burnt = !p.has_played_first_card;
        let remaining_cards = p.hand.len();
        let chops_count = chops_by_player.get(&p.id).copied().unwrap_or(0);
        let got_chopped_count = got_chopped_by_player.get(&p.id).copied().unwrap_or(0);
        let rotten_count = if rank_position >= 2 {
            p.hand.iter().filter(|c| c.is_two()).count() as u32
        } else {
            0
        };
        let caused_burnt_count = if rank_position == 1 {
            players
                .iter()
                .filter(|other| other.id != p.id && !other.has_played_first_card)
                .count() as u32
        } else {
            0
        };
        let is_this_three_spades_win = is_three_spades_win && rank_position == 1;
        let is_this_instant_win = is_instant_win && rank_position == 1;
        let current_streak = streaks_by_player.get(&p.id).copied().unwrap_or(0);

        let metrics = EloPerformanceMetrics {
            remaining_cards: Some(remaining_cards),
            chops_count: Some(chops_count),
            got_chopped_count: Some(got_chopped_count),
            rotten_count: Some(rotten_count),
            is_burnt: Some(is_burnt),
            caused_burnt_count: Some(caused_burnt_count),
            is_three_spades_win: Some(is_this_three_spades_win),
            is_instant_win: Some(is_this_instant_win),
            current_streak: Some(current_streak),
        };

        let res = calculate_elo_delta(
            rank_position,
            current_elo,
            opponents_avg_elo,
            total_players,
            Some(&metrics),
        );

        all_elo_deltas.insert(p.id.clone(), res.delta);
        all_elo_breakdowns.insert(p.id.clone(), res.breakdown);
    }

    TableEloSettlementResult {
        all_elo_deltas,
        all_elo_breakdowns,
    }
}
