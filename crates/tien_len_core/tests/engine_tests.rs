use tien_len_core::card::{create_deck, deal_cards, Card, Suit};
use tien_len_core::engine::{
    calculate_cong_penalty, calculate_count_cards_settlement, calculate_traditional_settlement,
    calculate_winner_takes_all_settlement, start_new_game,
};
use tien_len_core::player::MatchPlayer;
use tien_len_core::rules::GameRules;
use tien_len_core::state::{MatchState, PlayingTurnState};

#[test]
fn test_start_new_game_deals_13_cards() {
    let p1 = MatchPlayer::new("p1", "Alice", "a1", 10000, false);
    let p2 = MatchPlayer::new("p2", "Bob", "a2", 10000, true);
    let p3 = MatchPlayer::new("p3", "Charlie", "a3", 10000, true);
    let p4 = MatchPlayer::new("p4", "David", "a4", 10000, true);

    let rules = GameRules::default();
    let state = start_new_game(&[p1, p2, p3, p4], &rules, 1, None);

    match state {
        MatchState::Playing(ps) => {
            let common = ps.common();
            assert_eq!(common.players.len(), 4);
            for p in &common.players {
                assert_eq!(p.card_count, 13);
                assert_eq!(p.hand.len(), 13);
            }
            // First game requires 3 of spades
            if let PlayingTurnState::OpeningFirstMove { required_card, .. } = ps {
                assert_eq!(required_card, Card::new(3, Suit::Spades));
            }
        }
        MatchState::InstantWin { .. } => {
            // Valid if initial deal generates an Instant Win
        }
        _ => panic!("Unexpected state"),
    }
}

#[test]
fn test_deal_cards_partitions_equally() {
    let deck = create_deck();
    let hands = deal_cards(&deck, 4);
    assert_eq!(hands.len(), 4);
    for h in &hands {
        assert_eq!(h.len(), 13);
    }
}

#[test]
fn test_calculate_cong_penalty() {
    assert_eq!(calculate_cong_penalty(1000, 1.0), 26000);
    assert_eq!(calculate_cong_penalty(1000, 2.0), 52000);
    assert_eq!(calculate_cong_penalty(1000, 3.0), 78000);
}

#[test]
fn test_count_cards_and_traditional_settlement() {
    let mut p1 = MatchPlayer::new("p1", "Alice", "", 0, false);
    let mut p2 = MatchPlayer::new("p2", "Bob", "", 0, false);
    let mut p3 = MatchPlayer::new("p3", "Charlie", "", 0, false);
    let mut p4 = MatchPlayer::new("p4", "David", "", 0, false);

    p1.hand = vec![];
    p2.hand = vec![Card::new(3, Suit::Spades)];
    p3.hand = vec![Card::new(4, Suit::Spades), Card::new(5, Suit::Spades)];
    p4.hand = vec![Card::new(6, Suit::Spades), Card::new(7, Suit::Spades), Card::new(8, Suit::Spades)];

    let players = vec![p1.clone(), p2.clone(), p3.clone(), p4.clone()];

    // Count cards: p2 loses 1x, p3 loses 2x, p4 loses 3x => total = 6x
    let count_res = calculate_count_cards_settlement(&players, "p1", 1000, 1.0, false, 1.0).unwrap();
    assert_eq!(count_res["p1"], 6000);
    assert_eq!(count_res["p2"], -1000);
    assert_eq!(count_res["p3"], -2000);
    assert_eq!(count_res["p4"], -3000);

    // Traditional 4 players: 3x, 1x, -1x, -3x
    let winners = vec![p1.clone(), p2.clone(), p3.clone(), p4.clone()];
    let trad_res = calculate_traditional_settlement(&players, &winners, 1000, 1.0, false, 1.0).unwrap();
    assert_eq!(trad_res["p1"], 3000);
    assert_eq!(trad_res["p2"], 1000);
    assert_eq!(trad_res["p3"], -1000);
    assert_eq!(trad_res["p4"], -3000);

    // Winner-takes-all: each loser loses base 1000 => total 3000
    let wta_res = calculate_winner_takes_all_settlement(&players, "p1", 1000, 1.0, false, 1.0).unwrap();
    assert_eq!(wta_res["p1"], 3000);
    assert_eq!(wta_res["p2"], -1000);
    assert_eq!(wta_res["p3"], -1000);
    assert_eq!(wta_res["p4"], -1000);
}
