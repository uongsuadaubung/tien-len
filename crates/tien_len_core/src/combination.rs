use crate::card::Card;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CombinationType {
    Single,
    Pair,
    Triple,
    FourOfAKind,
    Straight,
    ThreePairsSequential,
    FourPairsSequential,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Combination {
    #[serde(rename = "type")]
    pub combo_type: CombinationType,
    pub length: usize,
    pub cards: Vec<Card>, // Sorted in ascending order
    pub highest_card: Card,
}

impl Combination {
    pub fn new(combo_type: CombinationType, cards: Vec<Card>) -> Self {
        let mut sorted_cards = cards;
        sorted_cards.sort();
        let highest_card = sorted_cards.last().cloned().expect("Combination must not be empty");
        let length = sorted_cards.len();
        Self {
            combo_type,
            length,
            cards: sorted_cards,
            highest_card,
        }
    }

    pub fn is_chop(&self) -> bool {
        matches!(
            self.combo_type,
            CombinationType::ThreePairsSequential
                | CombinationType::FourOfAKind
                | CombinationType::FourPairsSequential
        )
    }
}

/// Nhận diện tổ hợp bài hợp lệ từ một tập hợp lá bài
pub fn identify_combination(cards: &[Card]) -> Option<Combination> {
    if cards.is_empty() {
        return None;
    }

    let mut sorted = cards.to_vec();
    sorted.sort();
    let n = sorted.len();

    // 1 lá: Đơn (Single)
    if n == 1 {
        return Some(Combination::new(CombinationType::Single, sorted));
    }

    // 2 lá: Đôi (Pair)
    if n == 2 && sorted[0].rank == sorted[1].rank {
        return Some(Combination::new(CombinationType::Pair, sorted));
    }

    // 3 lá: Ba lá cùng bậc hoặc Sảnh 3 lá
    if n == 3 {
        if sorted[0].rank == sorted[1].rank && sorted[1].rank == sorted[2].rank {
            return Some(Combination::new(CombinationType::Triple, sorted));
        }
        if is_valid_straight(&sorted) {
            return Some(Combination::new(CombinationType::Straight, sorted));
        }
    }

    // 4 lá: Tứ quý, hoặc Sảnh 4 lá
    if n == 4 {
        if sorted[0].rank == sorted[1].rank
            && sorted[1].rank == sorted[2].rank
            && sorted[2].rank == sorted[3].rank
        {
            return Some(Combination::new(CombinationType::FourOfAKind, sorted));
        }
        if is_valid_straight(&sorted) {
            return Some(Combination::new(CombinationType::Straight, sorted));
        }
    }

    // Sảnh từ 5 đến 12 lá
    if n >= 5 && n <= 12 && is_valid_straight(&sorted) {
        return Some(Combination::new(CombinationType::Straight, sorted));
    }

    // 6 lá: Có thể là 3 đôi thông
    if n == 6 && is_valid_sequential_pairs(&sorted, 3) {
        return Some(Combination::new(
            CombinationType::ThreePairsSequential,
            sorted,
        ));
    }

    // 8 lá: Có thể là 4 đôi thông
    if n == 8 && is_valid_sequential_pairs(&sorted, 4) {
        return Some(Combination::new(
            CombinationType::FourPairsSequential,
            sorted,
        ));
    }

    None
}

/// Sảnh không được chứa lá Heo (rank 15 / 2) và phải liên tiếp từ 3 đến A (3..=14)
fn is_valid_straight(sorted: &[Card]) -> bool {
    if sorted.len() < 3 || sorted.len() > 12 {
        return false;
    }
    // Heo không được tham gia sảnh
    if sorted.iter().any(|c| c.is_two()) {
        return false;
    }
    for i in 0..sorted.len() - 1 {
        if sorted[i + 1].rank != sorted[i].rank + 1 {
            return false;
        }
    }
    true
}

/// Kiểm tra n đôi thông liên tiếp
fn is_valid_sequential_pairs(sorted: &[Card], pair_count: usize) -> bool {
    if sorted.len() != pair_count * 2 {
        return false;
    }
    // Heo không được tham gia đôi thông
    if sorted.iter().any(|c| c.is_two()) {
        return false;
    }
    for i in 0..pair_count {
        let first = &sorted[i * 2];
        let second = &sorted[i * 2 + 1];
        if first.rank != second.rank {
            return false;
        }
        if i > 0 {
            let prev_rank = sorted[(i - 1) * 2].rank;
            if first.rank != prev_rank + 1 {
                return false;
            }
        }
    }
    true
}

/// Thẩm định xem bài candidate có đè (beat) được bài target hay không theo luật chuẩn
pub fn can_beat(candidate: &Combination, target: &Combination) -> bool {
    // 1. Cùng loại và cùng số lượng lá
    if candidate.combo_type == target.combo_type && candidate.length == target.length {
        return candidate.highest_card > target.highest_card;
    }

    // 2. Chặt đặc biệt (Tứ quý chặt heo/3 đôi thông, 3 đôi thông chặt 1 heo...)
    can_chop_standard(candidate, target)
}

/// Kiểm tra luật chặt đặc biệt trong Tiến Lên Miền Nam với cờ cấu hình luật
pub fn can_chop(
    candidate: &Combination,
    target: &Combination,
    allow_three_pairs_cut_two: bool,
    allow_four_of_a_kind_cut_pairs_of_twos: bool,
) -> bool {
    match target.combo_type {
        // Chặt 1 con Heo (Single Two)
        CombinationType::Single if target.highest_card.is_two() => match candidate.combo_type {
            CombinationType::ThreePairsSequential => allow_three_pairs_cut_two,
            CombinationType::FourOfAKind | CombinationType::FourPairsSequential => true,
            _ => false,
        },

        // Chặt Đôi Heo (Pair of Twos)
        CombinationType::Pair if target.highest_card.is_two() => match candidate.combo_type {
            CombinationType::FourOfAKind => allow_four_of_a_kind_cut_pairs_of_twos,
            CombinationType::FourPairsSequential => true,
            _ => false,
        },

        // Chặt 3 Đôi Thông
        CombinationType::ThreePairsSequential => match candidate.combo_type {
            CombinationType::ThreePairsSequential => {
                candidate.highest_card > target.highest_card
            }
            CombinationType::FourOfAKind | CombinationType::FourPairsSequential => true,
            _ => false,
        },

        // Chặt Tứ Quý
        CombinationType::FourOfAKind => match candidate.combo_type {
            CombinationType::FourOfAKind => candidate.highest_card > target.highest_card,
            CombinationType::FourPairsSequential => true,
            _ => false,
        },

        // Chặt 4 Đôi Thông
        CombinationType::FourPairsSequential => match candidate.combo_type {
            CombinationType::FourPairsSequential => {
                candidate.highest_card > target.highest_card
            }
            _ => false,
        },

        _ => false,
    }
}

pub fn can_chop_standard(candidate: &Combination, target: &Combination) -> bool {
    can_chop(candidate, target, true, true)
}
