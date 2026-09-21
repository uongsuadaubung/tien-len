use tien_len_core::card::{Card, Suit};
use tien_len_core::engine::start_new_game;
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
