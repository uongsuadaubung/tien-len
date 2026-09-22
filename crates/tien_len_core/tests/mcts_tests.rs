use std::collections::{HashMap, HashSet};
use tien_len_core::ai::mcts::{evaluate_candidate_moves_mcts, MctsCandidateInput};
use tien_len_core::card::parse_cards;
use tien_len_core::combination::identify_combination;

#[test]
fn test_mcts_evaluates_candidate_moves() {
    let bot_hand = parse_cards("9S 10D AS 2H");
    let cand1_cards = parse_cards("9S");
    let cand1_combo = identify_combination(&cand1_cards).unwrap();
    let cand2_cards = parse_cards("2H");
    let cand2_combo = identify_combination(&cand2_cards).unwrap();

    let candidates = vec![
        MctsCandidateInput {
            cards: cand1_cards,
            combination: cand1_combo,
            is_chop: false,
        },
        MctsCandidateInput {
            cards: cand2_cards,
            combination: cand2_combo,
            is_chop: false,
        },
    ];

    let played_cards = HashSet::new();
    let mut remaining = HashMap::new();
    remaining.insert("opp1".to_string(), 3);
    remaining.insert("opp2".to_string(), 3);

    let evaluations = evaluate_candidate_moves_mcts(
        "bot",
        &bot_hand,
        &candidates,
        &played_cards,
        &remaining,
        15,
        12345,
    );

    assert_eq!(evaluations.len(), 2);
    for ev in &evaluations {
        assert!(ev.win_rate >= 0.0 && ev.win_rate <= 1.0);
        assert_eq!(ev.simulations_count, 15);
    }
}
