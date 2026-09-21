use tien_len_core::ai::find_valid_moves;
use tien_len_core::card::{Card, Suit};
use tien_len_core::combination::CombinationType;
use tien_len_core::player::MatchPlayer;
use tien_len_core::rules::GameRules;
use tien_len_core::state::{PlayingCommon, PlayingTurnState};

#[test]
fn test_find_valid_moves_for_lead() {
    let hand = vec![
        Card::new(3, Suit::Spades),
        Card::new(3, Suit::Hearts),
        Card::new(4, Suit::Clubs),
    ];

    let p1 = MatchPlayer::new("p1", "Alice", "a1", 1000, false);
    let common = PlayingCommon {
        game_number: 1,
        round_number: 1,
        players: vec![p1],
        current_turn_player_id: "p1".into(),
        lead_player_id: "p1".into(),
        round_moves: vec![],
        passed_player_ids: vec![],
        rules: GameRules::default(),
    };

    let state = PlayingTurnState::NormalLead { common };
    let moves = find_valid_moves(&hand, &state);

    assert!(moves.iter().any(|c| c.combo_type == CombinationType::Pair));
    assert!(moves.iter().any(|c| c.combo_type == CombinationType::Single));
}
