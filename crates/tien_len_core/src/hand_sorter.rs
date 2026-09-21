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
    for (_rank, group) in &rank_map {
        if group.len() == 4 {
            if let Some(combo) = identify_combination(group) {
                candidates.push(combo);
            }
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
        for next_idx in start_idx + 1..distinct_ranks.len() {
            if distinct_ranks[next_idx] == *consecutive.last().unwrap() + 1 {
                consecutive.push(distinct_ranks[next_idx]);
                if consecutive.len() >= 3 {
                    // Pick cards for each rank
                    let mut sample_cards = Vec::with_capacity(consecutive.len());
                    for &r in &consecutive {
                        if let Some(cards_for_rank) = rank_map.get(&r) {
                            if let Some(first) = cards_for_rank.first() {
                                sample_cards.push(first.clone());
                            }
                        }
                    }
                    if sample_cards.len() == consecutive.len() {
                        if let Some(combo) = identify_combination(&sample_cards) {
                            candidates.push(combo);
                        }
                    }
                }
            } else {
                break;
            }
        }
    }

    // 3. Sequential Pairs (3 and 4 pairs straight)
    let mut pair_ranks: Vec<u8> = rank_map
        .iter()
        .filter(|(&r, g)| r < 15 && g.len() >= 2)
        .map(|(&r, _)| r)
        .collect();
    pair_ranks.sort_unstable();

    for start_idx in 0..pair_ranks.len() {
        let mut consecutive_pair_cards = Vec::new();
        consecutive_pair_cards.extend_from_slice(&rank_map[&pair_ranks[start_idx]][0..2]);
        let mut last_rank = pair_ranks[start_idx];

        for next_idx in start_idx + 1..pair_ranks.len() {
            let cur_rank = pair_ranks[next_idx];
            if cur_rank == last_rank + 1 {
                consecutive_pair_cards.extend_from_slice(&rank_map[&cur_rank][0..2]);
                last_rank = cur_rank;

                if consecutive_pair_cards.len() == 6 || consecutive_pair_cards.len() == 8 {
                    if let Some(combo) = identify_combination(&consecutive_pair_cards) {
                        candidates.push(combo);
                    }
                }
            } else {
                break;
            }
        }
    }

    candidates
}

/// Smart partition of a player's hand into non-overlapping groups
pub fn sort_smart_groups(cards: &[Card], strategy: PartitionStrategy) -> Vec<SmartCardGroup> {
    if cards.is_empty() {
        return Vec::new();
    }

    let mut remaining_cards = cards.to_vec();
    sort_cards(&mut remaining_cards);
    let mut groups = Vec::new();
    let mut group_id_counter = 0;

    // Helper to extract cards from remaining
    let extract_cards = |remaining: &mut Vec<Card>, to_remove: &[Card]| {
        let remove_ids: HashSet<&str> = to_remove.iter().map(|c| c.id.as_str()).collect();
        remaining.retain(|c| !remove_ids.contains(c.id.as_str()));
    };

    match strategy {
        PartitionStrategy::MaxStraights | PartitionStrategy::OptimalTurns => {
            // Find longest straights first
            let mut candidates = find_all_candidate_combinations(&remaining_cards);
            candidates.sort_by(|a, b| b.length.cmp(&a.length));

            for combo in candidates {
                if combo.combo_type == CombinationType::Straight && combo.length >= 3 {
                    // Verify all cards are still in remaining
                    let rem_ids: HashSet<&str> =
                        remaining_cards.iter().map(|c| c.id.as_str()).collect();
                    if combo.cards.iter().all(|c| rem_ids.contains(c.id.as_str())) {
                        extract_cards(&mut remaining_cards, &combo.cards);
                        group_id_counter += 1;
                        groups.push(SmartCardGroup {
                            id: format!("group-{}", group_id_counter),
                            group_type: "STRAIGHT".into(),
                            name: format!("Sảnh {} lá", combo.length),
                            cards: combo.cards,
                        });
                    }
                }
            }
        }
        PartitionStrategy::MaxPairs => {
            // Pairs and quads first
        }
        PartitionStrategy::BigHands => {
            // Check 4 pairs straight, quads, 3 pairs straight first
            let candidates = find_all_candidate_combinations(&remaining_cards);
            for combo in &candidates {
                if combo.combo_type == CombinationType::FourPairsSequential
                    || combo.combo_type == CombinationType::FourOfAKind
                    || combo.combo_type == CombinationType::ThreePairsSequential
                {
                    let rem_ids: HashSet<&str> =
                        remaining_cards.iter().map(|c| c.id.as_str()).collect();
                    if combo.cards.iter().all(|c| rem_ids.contains(c.id.as_str())) {
                        extract_cards(&mut remaining_cards, &combo.cards);
                        group_id_counter += 1;
                        let name = match combo.combo_type {
                            CombinationType::FourPairsSequential => "4 Đôi Thông".into(),
                            CombinationType::FourOfAKind => "Tứ Quý".into(),
                            CombinationType::ThreePairsSequential => "3 Đôi Thông".into(),
                            _ => "Hàng".into(),
                        };
                        groups.push(SmartCardGroup {
                            id: format!("group-{}", group_id_counter),
                            group_type: format!("{:?}", combo.combo_type).to_uppercase(),
                            name,
                            cards: combo.cards.clone(),
                        });
                    }
                }
            }
        }
    }

    // Next pass: Extract quads, triples, pairs from remaining
    let mut rank_map: HashMap<u8, Vec<Card>> = HashMap::new();
    for c in &remaining_cards {
        rank_map.entry(c.rank).or_default().push(c.clone());
    }

    let mut ranks: Vec<u8> = rank_map.keys().copied().collect();
    ranks.sort_unstable();

    for r in ranks {
        let group = &rank_map[&r];
        if group.len() == 4 {
            extract_cards(&mut remaining_cards, group);
            group_id_counter += 1;
            groups.push(SmartCardGroup {
                id: format!("group-{}", group_id_counter),
                group_type: "FOUR_OF_A_KIND".into(),
                name: "Tứ Quý".into(),
                cards: group.clone(),
            });
        } else if group.len() == 3 {
            extract_cards(&mut remaining_cards, group);
            group_id_counter += 1;
            groups.push(SmartCardGroup {
                id: format!("group-{}", group_id_counter),
                group_type: "TRIPLE".into(),
                name: "Sám Cô".into(),
                cards: group.clone(),
            });
        } else if group.len() == 2 {
            extract_cards(&mut remaining_cards, group);
            group_id_counter += 1;
            let name = if r == 15 {
                "Đôi Heo".into()
            } else {
                "Đôi".into()
            };
            groups.push(SmartCardGroup {
                id: format!("group-{}", group_id_counter),
                group_type: "PAIR".into(),
                name,
                cards: group.clone(),
            });
        }
    }

    // Remaining cards are singles (rác)
    for c in remaining_cards {
        group_id_counter += 1;
        let name = if c.is_two() {
            "Heo".into()
        } else {
            "Rác".into()
        };
        groups.push(SmartCardGroup {
            id: format!("group-{}", group_id_counter),
            group_type: "SINGLE".into(),
            name,
            cards: vec![c],
        });
    }

    groups
}

/// Cycle through various sorting groupings (variants) for user UI interaction
pub fn cycle_hand_groupings(cards: &[Card], variant_index: usize) -> Vec<SmartCardGroup> {
    let strategies = [
        PartitionStrategy::OptimalTurns,
        PartitionStrategy::MaxStraights,
        PartitionStrategy::BigHands,
        PartitionStrategy::MaxPairs,
    ];
    let selected_strategy = strategies[variant_index % strategies.len()];
    sort_smart_groups(cards, selected_strategy)
}
