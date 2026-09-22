use crate::card::{sort_cards, Card};
use crate::combination::{can_beat, can_chop, identify_combination, Combination, CombinationType};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QuickSelectCandidate {
    pub cards: Vec<Card>,
    pub combination: Combination,
    pub is_chop: bool,
}

fn get_combinations<T: Clone>(arr: &[T], k: usize) -> Vec<Vec<T>> {
    if k == 0 {
        return vec![Vec::new()];
    }
    if k > arr.len() {
        return Vec::new();
    }
    if k == arr.len() {
        return vec![arr.to_vec()];
    }
    if k == 1 {
        return arr.iter().map(|item| vec![item.clone()]).collect();
    }

    let mut results = Vec::new();
    let mut current = Vec::with_capacity(k);
    fn backtrack<T: Clone>(
        arr: &[T],
        k: usize,
        start: usize,
        current: &mut Vec<T>,
        results: &mut Vec<Vec<T>>,
    ) {
        if current.len() == k {
            results.push(current.clone());
            return;
        }
        for i in start..arr.len() {
            current.push(arr[i].clone());
            backtrack(arr, k, i + 1, current, results);
            current.pop();
        }
    }
    backtrack(arr, k, 0, &mut current, &mut results);
    results
}

fn cartesian_product<T: Clone>(arrays: &[Vec<T>]) -> Vec<Vec<T>> {
    if arrays.is_empty() {
        return Vec::new();
    }
    let mut result = vec![Vec::new()];
    for arr in arrays {
        let mut next = Vec::new();
        for r in &result {
            for item in arr {
                let mut row = r.clone();
                row.push(item.clone());
                next.push(row);
            }
        }
        result = next;
    }
    result
}

/// Sinh toàn bộ các tập con lá bài có thể tạo thành nước đi hợp lệ
pub fn generate_candidate_moves(hand: &[Card]) -> Vec<Vec<Card>> {
    let mut sorted = hand.to_vec();
    sort_cards(&mut sorted);
    let mut candidates = Vec::new();

    // 1. Gom nhóm lá bài theo Rank
    let mut rank_map: BTreeMap<u8, Vec<Card>> = BTreeMap::new();
    for c in sorted {
        rank_map.entry(c.rank).or_default().push(c);
    }

    // 2. Nhóm cùng Bậc (Đơn k=1, Đôi k=2, Sám k=3, Tứ Quý k=4)
    for cards in rank_map.values() {
        for k in 1..=cards.len() {
            for subset in get_combinations(cards, k) {
                candidates.push(subset);
            }
        }
    }

    // 3. Sảnh (Độ dài từ 3 đến 12, rank <= 14)
    let non_two_ranks: Vec<u8> = rank_map.keys().copied().filter(|&r| r <= 14).collect();
    for i in 0..non_two_ranks.len() {
        let mut consecutive_ranks = vec![non_two_ranks[i]];
        for &next_rank in non_two_ranks.iter().skip(i + 1) {
            if next_rank == *consecutive_ranks.last().unwrap() + 1 {
                consecutive_ranks.push(next_rank);
                if consecutive_ranks.len() >= 3 {
                    let rank_card_lists: Vec<Vec<Card>> = consecutive_ranks
                        .iter()
                        .map(|r| rank_map[r].clone())
                        .collect();
                    let straight_subsets = cartesian_product(&rank_card_lists);
                    candidates.extend(straight_subsets);
                }
            } else {
                break;
            }
        }
    }

    // 4. Đôi Thông (Từ 3 đôi thông trở lên, rank <= 14)
    let pair_ranks: Vec<u8> = rank_map
        .iter()
        .filter(|(r, cards)| **r <= 14 && cards.len() >= 2)
        .map(|(&r, _)| r)
        .collect();

    for i in 0..pair_ranks.len() {
        let mut consecutive_pair_ranks = vec![pair_ranks[i]];
        for &next_pair_rank in pair_ranks.iter().skip(i + 1) {
            if next_pair_rank == *consecutive_pair_ranks.last().unwrap() + 1 {
                consecutive_pair_ranks.push(next_pair_rank);
                if consecutive_pair_ranks.len() >= 3 {
                    let pair_choices: Vec<Vec<Vec<Card>>> = consecutive_pair_ranks
                        .iter()
                        .map(|r| get_combinations(&rank_map[r], 2))
                        .collect();
                    let seq_pair_subsets = cartesian_product(&pair_choices);
                    for pairs in seq_pair_subsets {
                        let flat_cards: Vec<Card> = pairs.into_iter().flatten().collect();
                        candidates.push(flat_cards);
                    }
                }
            } else {
                break;
            }
        }
    }

    candidates
}

/// Tìm kiếm toàn bộ các tổ hợp hợp lệ để đè bài trên bàn (hoặc mở màn)
/// và sắp xếp theo thứ tự "Vừa khít nhất" (Tối ưu từ nhỏ đến lớn)
pub fn get_sorted_quick_select_candidates(
    hand: &[Card],
    target: Option<&Combination>,
    is_lead_move: bool,
    is_first_move_of_game: bool,
    first_move_required_card_id: Option<&str>,
    prohibit_ending_with_two: bool,
) -> Vec<QuickSelectCandidate> {
    if hand.is_empty() {
        return Vec::new();
    }

    let raw_candidates = generate_candidate_moves(hand);
    let mut valid_candidates = Vec::new();

    for cards in raw_candidates {
        let is_finishing = cards.len() == hand.len();

        // 1. Ràng buộc luật cấm đánh 2 cuối cùng
        if prohibit_ending_with_two && is_finishing && cards.iter().any(|c| c.is_two()) {
            continue;
        }

        // 2. Ràng buộc ván đầu tiên phải chứa lá mở màn
        if is_first_move_of_game
            && let Some(req_id) = first_move_required_card_id {
                let norm_req = req_id.replace('_', "-");
                if !cards.iter().any(|c| {
                    c.id.eq_ignore_ascii_case(req_id)
                        || c.id.replace('_', "-").eq_ignore_ascii_case(&norm_req)
                }) {
                    continue;
                }
            }

        // 3. Nhận diện tổ hợp
        let combo = match identify_combination(&cards) {
            Some(c) => c,
            None => continue,
        };

        // 4. Thẩm định đè bài / chặt heo nếu không phải lead move
        if is_lead_move || target.is_none() {
            valid_candidates.push(QuickSelectCandidate {
                cards,
                combination: combo,
                is_chop: false,
            });
        } else if let Some(target_combo) = target {
            let beats = can_beat(&combo, target_combo);
            let chops = can_chop(&combo, target_combo, true, true);

            if beats || chops {
                let is_chop_candidate = if combo.combo_type == target_combo.combo_type {
                    combo.combo_type == CombinationType::ThreePairsSequential
                        || combo.combo_type == CombinationType::FourPairsSequential
                } else {
                    chops
                };
                valid_candidates.push(QuickSelectCandidate {
                    cards,
                    combination: combo,
                    is_chop: is_chop_candidate,
                });
            }
        }
    }

    // 5. Sắp xếp thứ tự các tổ hợp từ "Vừa khít nhất" (nhỏ nhất) đến lớn nhất
    valid_candidates.sort_by(|a, b| {
        // 1. Ưu tiên đè bài thường trước chặt (tiết kiệm Hàng quý)
        if a.is_chop != b.is_chop {
            return if a.is_chop {
                std::cmp::Ordering::Greater
            } else {
                std::cmp::Ordering::Less
            };
        }

        // 2. Cùng kiểu tổ hợp và cùng số lượng lá: so sánh quân bài cao nhất (nhỏ xếp trước)
        if a.combination.combo_type == b.combination.combo_type
            && a.combination.length == b.combination.length
        {
            return a.combination.highest_card.cmp(&b.combination.highest_card);
        }

        // 3. Ưu tiên: Rác nhỏ -> Đôi nhỏ -> Sám -> Sảnh ngắn/nhỏ -> Hàng
        let type_weight = |t: CombinationType| match t {
            CombinationType::Single => 1,
            CombinationType::Pair => 2,
            CombinationType::Triple => 3,
            CombinationType::Straight => 4,
            CombinationType::ThreePairsSequential => 5,
            CombinationType::FourOfAKind => 6,
            CombinationType::FourPairsSequential => 7,
            CombinationType::FivePairsSequential => 8,
        };

        let w_a = type_weight(a.combination.combo_type);
        let w_b = type_weight(b.combination.combo_type);
        if w_a != w_b {
            return w_a.cmp(&w_b);
        }

        // Nếu cùng kiểu (ví dụ cùng là Sảnh nhưng khác độ dài khi lead): sảnh ngắn trước
        if a.combination.length != b.combination.length {
            return a.combination.length.cmp(&b.combination.length);
        }

        a.combination.highest_card.cmp(&b.combination.highest_card)
    });

    valid_candidates
}
