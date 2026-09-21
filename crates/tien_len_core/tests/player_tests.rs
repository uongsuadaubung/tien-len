use tien_len_core::card::{Card, Suit};
use tien_len_core::player::{mask_opponent_hands, update_players_hand, MatchPlayer};

#[test]
fn test_update_players_hand_single_source() {
    let mut p1 = MatchPlayer::new("p1", "Player 1", "avatar1.png", 1000, false);
    p1.hand = vec![
        Card::new(3, Suit::Spades),
        Card::new(3, Suit::Clubs),
        Card::new(4, Suit::Hearts),
    ];
    p1.card_count = 3;

    let players = vec![p1];
    let cards_to_play = vec![Card::new(3, Suit::Spades), Card::new(3, Suit::Clubs)];

    let updated = update_players_hand(&players, "p1", &cards_to_play, false);

    assert_eq!(updated[0].hand.len(), 1);
    assert_eq!(updated[0].card_count, 1);
    assert_eq!(updated[0].hand[0], Card::new(4, Suit::Hearts));
    assert_eq!(updated[0].played_cards.len(), 2);
    assert!(updated[0].has_played_first_card);
    assert!(!updated[0].is_passed_current_round);
}

#[test]
fn test_mask_opponent_hands() {
    let mut p1 = MatchPlayer::new("p1", "Player 1", "a1.png", 1000, false);
    p1.hand = vec![Card::new(3, Suit::Spades)];
    p1.card_count = 1;

    let mut p2 = MatchPlayer::new("p2", "Player 2", "a2.png", 1000, true);
    p2.hand = vec![Card::new(10, Suit::Hearts), Card::new(15, Suit::Hearts)];
    p2.card_count = 2;

    let players = vec![p1, p2];
    let masked = mask_opponent_hands(&players, "p1");

    assert_eq!(masked[0].hand.len(), 1);
    assert_eq!(masked[1].hand.len(), 0);
    assert_eq!(masked[1].card_count, 2);
}
