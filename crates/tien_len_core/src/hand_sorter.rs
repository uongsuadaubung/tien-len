use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};

use crate::card::{sort_cards, Card};
use crate::combination::{identify_combination, Combination, CombinationType};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SmartCardGroup {
    pub id: String,
    #[serde(rename = "type")]
    pub group_type: String,
    pub name: String,
    pub cards: Vec<Card>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PartitionStrategy {
    OptimalTurns,
    BigHands,
    MaxStraights,
    MaxPairs,
}

/// Find all candidate combinations present within a hand of cards
pub fn find_all_candidate_combinations(cards: &[Card]) -> Vec<Combination> {
    let mut candidates = Vec::new();
    let mut sorted = cards.to_vec();
    sort_cards(&mut sorted);

    // Group by rank
    let mut rank_map: HashMap<u8, Vec<Card>> = HashMap::new();
    for c in &sorted {
        rank_map.entry(c.rank).or_default().push(c.clone());
    }

    // 1. Quads, Triples, Pairs
    for group in rank_map.values() {
        if group.len() == 4
            && let Some(combo) = identify_combination(group) {
                candidates.push(combo);
            }
        if group.len() >= 3 {
            for i in 0..group.len() - 2 {
                for j in i + 1..group.len() - 1 {
                    for k in j + 1..group.len() {
                        let sub = vec![group[i].clone(), group[j].clone(), group[k].clone()];
                        if let Some(combo) = identify_combination(&sub) {
                            candidates.push(combo);
                        }
                    }
                }
            }
        }
        if group.len() >= 2 {
            for i in 0..group.len() - 1 {
                for j in i + 1..group.len() {
                    let sub = vec![group[i].clone(), group[j].clone()];
                    if let Some(combo) = identify_combination(&sub) {
                        candidates.push(combo);
                    }
                }
            }
        }
    }

    // 2. Straights (length 3..=12, rank < 15)
    let non_twos: Vec<Card> = sorted.iter().filter(|c| !c.is_two()).cloned().collect();
    let mut distinct_ranks: Vec<u8> = non_twos
        .iter()
        .map(|c| c.rank)
        .collect::<HashSet<_>>()
        .into_iter()
        .collect();
    distinct_ranks.sort_unstable();

    for start_idx in 0..distinct_ranks.len() {
        let mut consecutive = vec![distinct_ranks[start_idx]];
        for &next_rank in distinct_ranks.iter().skip(start_idx + 1) {
            if next_rank == *consecutive.last().unwrap() + 1 {
                consecutive.push(next_rank);
                if consecutive.len() >= 3 {
                    // Generate all straight card combinations across the ranks (up to 4 combinations)
                    let mut combos_cards: Vec<Vec<Card>> = vec![Vec::new()];
                    for &r in &consecutive {
                        let rank_cards = rank_map.get(&r).unwrap();
                        let mut new_combos = Vec::new();
                        for existing in combos_cards {
                            for card in rank_cards {
                                let mut clone = existing.clone();
                                clone.push(card.clone());
                                new_combos.push(clone);
                            }
                        }
                        combos_cards = new_combos;
                        if combos_cards.len() > 8 {
                            combos_cards.truncate(8);
                        }
                    }

                    for sc in combos_cards {
                        if let Some(combo) = identify_combination(&sc) {
                            candidates.push(combo);
                        }
                    }
                }
            } else {
                break;
            }
        }
    }

    // 3. Sequential Pairs (3, 4, 5 pairs straight)
    let mut pair_ranks: Vec<u8> = rank_map
        .iter()
        .filter(|(r, g)| **r < 15 && g.len() >= 2)
        .map(|(&r, _)| r)
        .collect();
    pair_ranks.sort_unstable();

    for start_idx in 0..pair_ranks.len() {
        let mut consecutive_pair_cards = Vec::new();
        consecutive_pair_cards.extend_from_slice(&rank_map[&pair_ranks[start_idx]][0..2]);
        let mut last_rank = pair_ranks[start_idx];

        for &cur_rank in pair_ranks.iter().skip(start_idx + 1) {
            if cur_rank == last_rank + 1 {
                consecutive_pair_cards.extend_from_slice(&rank_map[&cur_rank][0..2]);
                last_rank = cur_rank;

                if (consecutive_pair_cards.len() == 6
                    || consecutive_pair_cards.len() == 8
                    || consecutive_pair_cards.len() == 10)
                    && let Some(combo) = identify_combination(&consecutive_pair_cards) {
                        candidates.push(combo);
                    }
            } else {
                break;
            }
        }
    }

    candidates
}

fn evaluate_combination_score(combo: &Combination, strategy: PartitionStrategy) -> i32 {
    match strategy {
        PartitionStrategy::BigHands => match combo.combo_type {
            CombinationType::FivePairsSequential => 1000,
            CombinationType::FourPairsSequential => 800,
            CombinationType::FourOfAKind => 600,
            CombinationType::ThreePairsSequential => 500,
            CombinationType::Triple => 25,
            CombinationType::Pair => 15,
            CombinationType::Straight => 10 + combo.length as i32 * 4,
            _ => 0,
        },
        PartitionStrategy::MaxStraights => match combo.combo_type {
            CombinationType::Straight => 60 + combo.length as i32 * 35,
            CombinationType::FivePairsSequential => 300,
            CombinationType::FourPairsSequential => 200,
            CombinationType::FourOfAKind => 150,
            CombinationType::ThreePairsSequential => 50,
            CombinationType::Triple => 20,
            CombinationType::Pair => 10,
            _ => 0,
        },
        PartitionStrategy::MaxPairs => match combo.combo_type {
            CombinationType::FivePairsSequential => 500,
            CombinationType::FourPairsSequential => 400,
            CombinationType::FourOfAKind => 350,
            CombinationType::ThreePairsSequential => 250,
            CombinationType::Triple => 70,
            CombinationType::Pair => 45,
            CombinationType::Straight => 10 + combo.length as i32 * 6,
            _ => 0,
        },
        PartitionStrategy::OptimalTurns => match combo.combo_type {
            CombinationType::FivePairsSequential => 800,
            CombinationType::FourPairsSequential => 600,
            CombinationType::FourOfAKind => 400,
            CombinationType::ThreePairsSequential => 300,
            CombinationType::Triple => 40,
            CombinationType::Pair => 22,
            CombinationType::Straight => 25 + combo.length as i32 * 12,
            _ => 0,
        },
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HandPartition {
    pub combinations: Vec<Combination>,
    pub trash_cards: Vec<Card>,
    pub total_score: i32,
}

struct CandMeta<'a> {
    mask: u64,
    weight: i32,
    combo: &'a Combination,
}

fn solve_best_partition<'a, F>(
    sorted_cards: &[Card],
    candidates: &'a [Combination],
    calc_weight: F,
    base_trash_score: i32,
) -> HandPartition
where
    F: Fn(&Combination) -> i32,
{
    if sorted_cards.is_empty() {
        return HandPartition {
            combinations: Vec::new(),
            trash_cards: Vec::new(),
            total_score: 0,
        };
    }

    let card_to_bit: HashMap<&str, usize> = sorted_cards
        .iter()
        .enumerate()
        .map(|(i, c)| (c.id.as_str(), i))
        .collect();

    let mut cand_items: Vec<CandMeta<'a>> = Vec::with_capacity(candidates.len());
    for combo in candidates {
        let mut mask = 0u64;
        let mut valid = true;
        for c in &combo.cards {
            if let Some(&bit) = card_to_bit.get(c.id.as_str()) {
                mask |= 1u64 << bit;
            } else {
                valid = false;
                break;
            }
        }
        if valid && mask.count_ones() as usize == combo.cards.len() {
            let weight = calc_weight(combo);
            if weight > 0 {
                cand_items.push(CandMeta { mask, weight, combo });
            }
        }
    }

    cand_items.sort_by(|a, b| b.weight.cmp(&a.weight));

    let full_mask = if sorted_cards.len() >= 64 {
        !0u64
    } else {
        (1u64 << sorted_cards.len()) - 1
    };

    let mut best_gain = 0;
    let mut best_selected = Vec::new();
    let mut selected = Vec::new();

    fn search(
        cand_idx: usize,
        remaining_mask: u64,
        current_gain: i32,
        selected: &mut Vec<usize>,
        candidates: &[CandMeta],
        best_gain: &mut i32,
        best_selected: &mut Vec<usize>,
    ) {
        if current_gain > *best_gain {
            *best_gain = current_gain;
            *best_selected = selected.clone();
        }

        for i in cand_idx..candidates.len() {
            let cand = &candidates[i];
            if (cand.mask & remaining_mask) == cand.mask {
                selected.push(i);
                search(
                    i + 1,
                    remaining_mask & !cand.mask,
                    current_gain + cand.weight,
                    selected,
                    candidates,
                    best_gain,
                    best_selected,
                );
                selected.pop();
            }
        }
    }

    search(
        0,
        full_mask,
        0,
        &mut selected,
        &cand_items,
        &mut best_gain,
        &mut best_selected,
    );

    let chosen_combos: Vec<Combination> = best_selected
        .into_iter()
        .map(|idx| cand_items[idx].combo.clone())
        .collect();

    let mut chosen_mask = 0u64;
    for combo in &chosen_combos {
        for c in &combo.cards {
            if let Some(&bit) = card_to_bit.get(c.id.as_str()) {
                chosen_mask |= 1u64 << bit;
            }
        }
    }

    let trash_cards: Vec<Card> = sorted_cards
        .iter()
        .enumerate()
        .filter(|(i, _)| (chosen_mask & (1u64 << i)) == 0)
        .map(|(_, c)| c.clone())
        .collect();

    HandPartition {
        combinations: chosen_combos,
        trash_cards,
        total_score: base_trash_score + best_gain,
    }
}

pub(crate) fn partition_sorted_hand_by_strategy(
    sorted: &[Card],
    candidates: &[Combination],
    strategy: PartitionStrategy,
) -> HandPartition {
    if sorted.is_empty() {
        return HandPartition {
            combinations: Vec::new(),
            trash_cards: Vec::new(),
            total_score: 0,
        };
    }

    let trash_penalty = if strategy == PartitionStrategy::BigHands {
        -8
    } else {
        -20
    };
    let turns_mult = if strategy == PartitionStrategy::BigHands {
        8
    } else {
        18
    };

    let base_trash_score: i32 = sorted
        .iter()
        .map(|c| if c.is_two() { 10 } else { trash_penalty })
        .sum();

    solve_best_partition(
        sorted,
        candidates,
        |combo| {
            let combo_score = evaluate_combination_score(combo, strategy);
            let mut combo_trash = 0;
            for c in &combo.cards {
                combo_trash += if c.is_two() { 10 } else { trash_penalty };
            }
            let turns_gain = (combo.cards.len() as i32 - 1) * turns_mult;
            combo_score - combo_trash + turns_gain
        },
        base_trash_score,
    )
}

fn partition_hand_by_strategy(cards: &[Card], strategy: PartitionStrategy) -> HandPartition {
    let mut sorted = cards.to_vec();
    sort_cards(&mut sorted);
    if sorted.is_empty() {
        return HandPartition {
            combinations: Vec::new(),
            trash_cards: Vec::new(),
            total_score: 0,
        };
    }
    let candidates = find_all_candidate_combinations(&sorted);
    partition_sorted_hand_by_strategy(&sorted, &candidates, strategy)
}

/// Canonical Hand Partitioning implementation matching TS SSOT with 100x Rust performance
pub fn partition_hand(cards: &[Card], optimality: f64) -> HandPartition {
    let mut sorted = cards.to_vec();
    sort_cards(&mut sorted);

    if sorted.is_empty() {
        return HandPartition {
            combinations: Vec::new(),
            trash_cards: Vec::new(),
            total_score: 0,
        };
    }

    let candidates = find_all_candidate_combinations(&sorted);

    let base_trash_score: i32 = sorted
        .iter()
        .map(|c| if c.is_two() { 10 } else { -15 })
        .sum();

    solve_best_partition(
        &sorted,
        &candidates,
        |combo| {
            let combo_score = match combo.combo_type {
                CombinationType::Straight => 15 + combo.length as i32 * 8,
                CombinationType::FivePairsSequential => 800,
                CombinationType::FourPairsSequential => 600,
                CombinationType::FourOfAKind => 400,
                CombinationType::ThreePairsSequential => 300,
                CombinationType::Triple => 40,
                CombinationType::Pair => 22,
                _ => 0,
            };
            let mut combo_trash = 0;
            for c in &combo.cards {
                combo_trash += if c.is_two() { 10 } else { -15 };
            }
            let turns_gain = ((combo.cards.len() as f64 - 1.0) * 12.0 * optimality) as i32;
            combo_score - combo_trash + turns_gain
        },
        base_trash_score,
    )
}

fn convert_partition_to_groups(partition: &HandPartition) -> Vec<SmartCardGroup> {
    let mut groups = Vec::new();
    let mut straights_and_seqs = Vec::new();
    let mut four_of_a_kinds = Vec::new();
    let mut triples = Vec::new();
    let mut pairs = Vec::new();

    for combo in &partition.combinations {
        match combo.combo_type {
            CombinationType::Straight
            | CombinationType::ThreePairsSequential
            | CombinationType::FourPairsSequential
            | CombinationType::FivePairsSequential => {
                straights_and_seqs.push(combo.clone());
            }
            CombinationType::FourOfAKind => four_of_a_kinds.push(combo.clone()),
            CombinationType::Triple => triples.push(combo.clone()),
            CombinationType::Pair => pairs.push(combo.clone()),
            _ => straights_and_seqs.push(combo.clone()),
        }
    }

    // Sắp xếp nội bộ từng loại tổ hợp tăng dần
    straights_and_seqs.sort_by_key(|c| c.cards.iter().map(|x| x.weight).min().unwrap_or(0));
    four_of_a_kinds.sort_by_key(|c| c.highest_card.weight);
    triples.sort_by_key(|c| c.highest_card.weight);
    pairs.sort_by_key(|c| c.highest_card.weight);

    let mut group_counter = 1;

    for mut combo in straights_and_seqs {
        sort_cards(&mut combo.cards);
        let (group_type, name) = match combo.combo_type {
            CombinationType::ThreePairsSequential => ("THREE_PAIRS_SEQUENTIAL", "3 Đôi Thông".to_string()),
            CombinationType::FourPairsSequential => ("FOUR_PAIRS_SEQUENTIAL", "4 Đôi Thông".to_string()),
            CombinationType::FivePairsSequential => ("FIVE_PAIRS_SEQUENTIAL", "5 Đôi Thông".to_string()),
            _ => ("STRAIGHT", "Sảnh".to_string()),
        };
        groups.push(SmartCardGroup {
            id: format!("combo-{}-{}", group_counter, group_type.to_lowercase()),
            group_type: group_type.into(),
            name,
            cards: combo.cards,
        });
        group_counter += 1;
    }

    for mut combo in four_of_a_kinds {
        sort_cards(&mut combo.cards);
        groups.push(SmartCardGroup {
            id: format!("combo-{}-quad", group_counter),
            group_type: "FOUR_OF_A_KIND".into(),
            name: "Tứ Quý".into(),
            cards: combo.cards,
        });
        group_counter += 1;
    }

    for mut combo in triples {
        sort_cards(&mut combo.cards);
        groups.push(SmartCardGroup {
            id: format!("combo-{}-triple", group_counter),
            group_type: "TRIPLE".into(),
            name: "Sám Cô".into(),
            cards: combo.cards,
        });
        group_counter += 1;
    }

    for mut combo in pairs {
        sort_cards(&mut combo.cards);
        let name = if combo.highest_card.rank == 15 {
            "Đôi Heo".to_string()
        } else {
            "Đôi".to_string()
        };
        groups.push(SmartCardGroup {
            id: format!("combo-{}-pair", group_counter),
            group_type: "PAIR".into(),
            name,
            cards: combo.cards,
        });
        group_counter += 1;
    }

    if !partition.trash_cards.is_empty() {
        let mut trash = partition.trash_cards.clone();
        sort_cards(&mut trash);
        groups.push(SmartCardGroup {
            id: format!("combo-{}-trash", group_counter),
            group_type: "SINGLE".into(),
            name: "Bài Rác".into(),
            cards: trash,
        });
    }

    groups
}

fn get_partition_signature(groups: &[SmartCardGroup]) -> String {
    let mut sigs: Vec<String> = groups
        .iter()
        .map(|g| {
            let mut ids: Vec<&str> = g.cards.iter().map(|c| c.id.as_str()).collect();
            ids.sort_unstable();
            format!("{}:[{}]", g.group_type, ids.join(","))
        })
        .collect();
    sigs.sort_unstable();
    sigs.join("|")
}

/// Lấy tất cả các phương án phân rã bộ thông minh khả thi (đa chiến thuật)
pub fn get_available_smart_variants(cards: &[Card]) -> Vec<Vec<SmartCardGroup>> {
    if cards.is_empty() {
        return Vec::new();
    }

    let mut sorted = cards.to_vec();
    sort_cards(&mut sorted);

    let candidates = find_all_candidate_combinations(&sorted);

    let strategies = [
        PartitionStrategy::OptimalTurns,
        PartitionStrategy::BigHands,
        PartitionStrategy::MaxStraights,
        PartitionStrategy::MaxPairs,
    ];

    let mut variants = Vec::new();
    let mut seen_signatures = HashSet::new();

    for strategy in strategies {
        let partition = partition_sorted_hand_by_strategy(&sorted, &candidates, strategy);
        let groups = convert_partition_to_groups(&partition);
        if groups.is_empty() {
            continue;
        }

        let signature = get_partition_signature(&groups);
        if !seen_signatures.contains(&signature) {
            seen_signatures.insert(signature);
            variants.push(groups);
        }
    }

    if variants.is_empty() {
        variants.push(vec![SmartCardGroup {
            id: "combo-trash".into(),
            group_type: "SINGLE".into(),
            name: "Bài Rác".into(),
            cards: sorted,
        }]);
    }

    variants
}

/// Smart partition of a player's hand into non-overlapping groups by strategy
pub fn sort_smart_groups(cards: &[Card], strategy: PartitionStrategy) -> Vec<SmartCardGroup> {
    if cards.is_empty() {
        return Vec::new();
    }
    let partition = partition_hand_by_strategy(cards, strategy);
    convert_partition_to_groups(&partition)
}

/// Cycle through various sorting groupings (variants) for user UI interaction
pub fn cycle_hand_groupings(cards: &[Card], variant_index: usize) -> Vec<SmartCardGroup> {
    let variants = get_available_smart_variants(cards);
    if variants.is_empty() {
        return Vec::new();
    }
    let safe_idx = variant_index % variants.len();
    variants[safe_idx].clone()
}

