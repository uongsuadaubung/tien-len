use tien_len_core::card::{Card, Suit};
use tien_len_core::combination::{identify_combination, CombinationType};
use tien_len_core::player::MatchPlayer;
use tien_len_core::rules::GameRules;
use tien_len_core::state::{MatchState, PlayedMove};

#[test]
fn test_match_state_non_nullable_variants() {
    let rules = GameRules::default();
    let p1 = MatchPlayer::new("p1", "Alice", "a1", 1000, false);
    let p2 = MatchPlayer::new("p2", "Bob", "a2", 1000, true);

    let waiting = MatchState::Waiting {
        game_number: 1,
        players: vec![p1.clone(), p2.clone()],
        rules: rules.clone(),
        last_winner_id: None,
    };

    if let MatchState::Waiting { game_number, .. } = waiting {
        assert_eq!(game_number, 1);
    } else {
        panic!("Expected Waiting state");
    }

    let card3s = Card::new(3, Suit::Spades);
    let combo = identify_combination(&[card3s.clone()]).expect("Valid combo");
    let played_move = PlayedMove::standard("p1", combo, 123456);

    assert_eq!(played_move.player_id, "p1");
    assert_eq!(played_move.combination.combo_type, CombinationType::Single);
}
