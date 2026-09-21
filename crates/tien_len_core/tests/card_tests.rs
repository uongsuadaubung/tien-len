use tien_len_core::card::{create_deck, Card, Suit};

#[test]
fn test_card_ordering() {
    let c3s = Card::new(3, Suit::Spades);
    let c3c = Card::new(3, Suit::Clubs);
    let c3h = Card::new(3, Suit::Hearts);
    let c4s = Card::new(4, Suit::Spades);
    let c2h = Card::new(15, Suit::Hearts);

    assert!(c3s < c3c);
    assert!(c3c < c3h);
    assert!(c3h < c4s);
    assert!(c4s < c2h);
    assert_eq!(c2h.weight(), 15 * 4 + 4);
}

#[test]
fn test_create_deck() {
    let deck = create_deck();
    assert_eq!(deck.len(), 52);
    assert!(deck.iter().any(|c| c.is_three_of_spades()));
    assert!(deck.iter().any(|c| c.is_two()));
}
