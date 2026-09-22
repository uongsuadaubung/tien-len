use tien_len_core::ai::hint::{compute_optimal_move_hint, HintType};
use tien_len_core::card::{Card, Suit};
use tien_len_core::combination::{Combination, CombinationType};

#[test]
fn test_hint_forced_pass() {
    // Player has 3 Spades, 4 Clubs
    let hand = vec![
        Card::new(3, Suit::Spades),
        Card::new(4, Suit::Clubs),
    ];
    // Table is Pair of Aces
    let leading = Combination {
        combo_type: CombinationType::Pair,
        cards: vec![
            Card::new(14, Suit::Hearts),
            Card::new(14, Suit::Diamonds),
        ],
        highest_card: Card::new(14, Suit::Diamonds),
        length: 2,
    };

    let hint = compute_optimal_move_hint(&hand, Some(&leading), false, false, None, true);
    assert_eq!(hint.action, "PASS");
    assert_eq!(hint.hint_type, HintType::ForcedPass);
}

#[test]
fn test_hint_win_opportunity() {
    // Player has a single 10 of Hearts
    let hand = vec![Card::new(10, Suit::Hearts)];
    let leading = Combination {
        combo_type: CombinationType::Single,
        cards: vec![Card::new(9, Suit::Spades)],
        highest_card: Card::new(9, Suit::Spades),
        length: 1,
    };

    let hint = compute_optimal_move_hint(&hand, Some(&leading), false, false, None, true);
    assert_eq!(hint.action, "PLAY");
    assert_eq!(hint.hint_type, HintType::WinOpportunity);
    assert_eq!(hint.cards.len(), 1);
}

#[test]
fn test_hint_lead_opening() {
    let hand = vec![
        Card::new(3, Suit::Spades),
        Card::new(4, Suit::Spades),
        Card::new(5, Suit::Spades),
        Card::new(10, Suit::Hearts),
        Card::new(12, Suit::Diamonds),
    ];

    let hint = compute_optimal_move_hint(&hand, None, true, false, None, true);
    assert_eq!(hint.action, "PLAY");
    assert_eq!(hint.hint_type, HintType::LeadOpening);
}
