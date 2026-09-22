use tien_len_core::card::{Card, Suit};
use tien_len_core::combination::{
    can_beat, identify_combination, CombinationType,
};

#[test]
fn test_single_and_pair() {
    let c3s = Card::new(3, Suit::Spades);
    let c3h = Card::new(3, Suit::Hearts);
    let c4s = Card::new(4, Suit::Spades);

    let single = identify_combination(std::slice::from_ref(&c3s)).unwrap();
    assert_eq!(single.combo_type, CombinationType::Single);

    let pair = identify_combination(&[c3s.clone(), c3h.clone()]).unwrap();
    assert_eq!(pair.combo_type, CombinationType::Pair);
    assert_eq!(pair.highest_card, c3h);

    let invalid = identify_combination(&[c3s, c4s]);
    assert!(invalid.is_none());
}

#[test]
fn test_straight_validation() {
    let c3 = Card::new(3, Suit::Spades);
    let c4 = Card::new(4, Suit::Clubs);
    let c5 = Card::new(5, Suit::Hearts);
    let c2 = Card::new(15, Suit::Hearts);

    let straight = identify_combination(&[c3.clone(), c4.clone(), c5.clone()]).unwrap();
    assert_eq!(straight.combo_type, CombinationType::Straight);
    assert_eq!(straight.highest_card, c5);

    // Heo không được nằm trong sảnh
    let invalid_straight = identify_combination(&[c3, c4, c2]);
    assert!(invalid_straight.is_none());
}

#[test]
fn test_chopping_rules() {
    let two_of_hearts = Card::new(15, Suit::Hearts);
    let target_two = identify_combination(&[two_of_hearts]).unwrap();

    // 3 đôi thông chặt 1 heo
    let three_pairs = vec![
        Card::new(3, Suit::Spades), Card::new(3, Suit::Hearts),
        Card::new(4, Suit::Spades), Card::new(4, Suit::Hearts),
        Card::new(5, Suit::Spades), Card::new(5, Suit::Hearts),
    ];
    let combo_3_pairs = identify_combination(&three_pairs).unwrap();
    assert!(can_beat(&combo_3_pairs, &target_two));

    // Tứ quý chặt 1 heo
    let four_of_a_kind = vec![
        Card::new(7, Suit::Spades), Card::new(7, Suit::Clubs),
        Card::new(7, Suit::Diamonds), Card::new(7, Suit::Hearts),
    ];
    let combo_quad = identify_combination(&four_of_a_kind).unwrap();
    assert!(can_beat(&combo_quad, &target_two));

    // Tứ quý chặt 3 đôi thông
    assert!(can_beat(&combo_quad, &combo_3_pairs));
}
