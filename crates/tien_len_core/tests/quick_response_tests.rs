use tien_len_core::card::parse_cards;
use tien_len_core::combination::{identify_combination, CombinationType};
use tien_len_core::quick_response::get_sorted_quick_select_candidates;

#[test]
fn test_quick_response_single_beat_and_sort() {
    let target_cards = parse_cards("8S");
    let target = identify_combination(&target_cards).unwrap();
    let hand = parse_cards("9S 10D AS 2H");

    let candidates = get_sorted_quick_select_candidates(
        &hand,
        Some(&target),
        false,
        false,
        None,
        true,
    );

    assert_eq!(candidates.len(), 4);
    assert_eq!(candidates[0].cards[0].code, "9S");
    assert_eq!(candidates[1].cards[0].code, "10D");
    assert_eq!(candidates[2].cards[0].code, "AS");
    assert_eq!(candidates[3].cards[0].code, "2H");
}

#[test]
fn test_quick_response_pair_beat() {
    let target_cards = parse_cards("5S 5D");
    let target = identify_combination(&target_cards).unwrap();
    let hand = parse_cards("6S 6H QS QD 9S 2S 2D");

    let candidates = get_sorted_quick_select_candidates(
        &hand,
        Some(&target),
        false,
        false,
        None,
        true,
    );

    assert_eq!(candidates.len(), 3);
    assert_eq!(candidates[0].cards[0].rank, 6);
    assert_eq!(candidates[1].cards[0].rank, 12); // Q
    assert_eq!(candidates[2].cards[0].rank, 15); // 2
}

#[test]
fn test_quick_response_chop_precedence() {
    let target_cards = parse_cards("2S");
    let target = identify_combination(&target_cards).unwrap();
    let hand = parse_cards("2H 4S 4D 5S 5D 6S 6D");

    let candidates = get_sorted_quick_select_candidates(
        &hand,
        Some(&target),
        false,
        false,
        None,
        true,
    );

    // candidates[0] should be 2H (regular beat, is_chop: false)
    assert!(!candidates[0].is_chop);
    assert_eq!(candidates[0].cards[0].code, "2H");

    // candidates[1] should be 3-pair sequence (chop, is_chop: true)
    assert!(candidates[1].is_chop);
    assert_eq!(candidates[1].combination.combo_type, CombinationType::ThreePairsSequential);
}

#[test]
fn test_quick_response_lead_move_first_game() {
    let hand = parse_cards("3S 4S 5D 9H 9D");

    let candidates = get_sorted_quick_select_candidates(
        &hand,
        None,
        true,
        true,
        Some("3-spades"),
        true,
    );

    assert!(!candidates.is_empty());
    // Every candidate must include 3S
    for cand in &candidates {
        assert!(cand.cards.iter().any(|c| c.rank == 3 && c.suit == tien_len_core::card::Suit::Spades));
    }
    // First candidate is single 3S
    assert_eq!(candidates[0].cards.len(), 1);
    assert_eq!(candidates[0].cards[0].code, "3S");
}
