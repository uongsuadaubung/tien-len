use tien_len_core::ai::{decide_bot_move, CardTracker};
use tien_len_core::card::{Card, Suit};
use tien_len_core::engine::{check_instant_win, pass_turn, play_move};
use tien_len_core::player::MatchPlayer;
use tien_len_core::rules::GameRules;
use tien_len_core::state::{InstantWinType, MatchState, PlayingTurnState};

#[test]
fn test_instant_win_scenarios() {
    // 1. Dragon Straight (3 to A = 12 cards)
    let dragon_cards: Vec<Card> = (3..=14)
        .map(|r| Card::new(r, Suit::Spades))
        .collect();
    assert_eq!(
        check_instant_win(&dragon_cards, false),
        Some(InstantWinType::DragonStraight)
    );

    // 2. Four Twos (4 heo)
    let mut four_twos = vec![
        Card::new(15, Suit::Spades),
        Card::new(15, Suit::Clubs),
        Card::new(15, Suit::Diamonds),
        Card::new(15, Suit::Hearts),
    ];
    for r in 3..11 {
        four_twos.push(Card::new(r, Suit::Spades));
    }
    assert_eq!(
        check_instant_win(&four_twos, false),
        Some(InstantWinType::FourTwos)
    );

    // 3. 5 Pairs Sequential (3-3, 4-4, 5-5, 6-6, 7-7)
    let five_pairs = vec![
        Card::new(3, Suit::Spades), Card::new(3, Suit::Hearts),
        Card::new(4, Suit::Spades), Card::new(4, Suit::Hearts),
        Card::new(5, Suit::Spades), Card::new(5, Suit::Hearts),
        Card::new(6, Suit::Spades), Card::new(6, Suit::Hearts),
        Card::new(7, Suit::Spades), Card::new(7, Suit::Hearts),
        Card::new(10, Suit::Spades), Card::new(11, Suit::Clubs),
    ];
    assert_eq!(
        check_instant_win(&five_pairs, false),
        Some(InstantWinType::FivePairsSequential)
    );

    // 4. Same color 13 (all red, not a dragon straight)
    let all_red = vec![
        Card::new(3, Suit::Hearts), Card::new(3, Suit::Diamonds),
        Card::new(4, Suit::Hearts), Card::new(4, Suit::Diamonds),
        Card::new(5, Suit::Hearts), Card::new(5, Suit::Diamonds),
        Card::new(6, Suit::Hearts), Card::new(6, Suit::Diamonds),
        Card::new(7, Suit::Hearts), Card::new(7, Suit::Diamonds),
        Card::new(8, Suit::Hearts), Card::new(8, Suit::Diamonds),
        Card::new(9, Suit::Hearts),
    ];
    assert_eq!(
        check_instant_win(&all_red, false),
        Some(InstantWinType::SameColor13)
    );
}

#[test]
fn test_complete_trick_and_passing_flow() {
    let mut p1 = MatchPlayer::new("p1", "Player 1", "avatar1", 10000, false);
    let mut p2 = MatchPlayer::new("p2", "Player 2", "avatar2", 10000, true);
    let mut p3 = MatchPlayer::new("p3", "Player 3", "avatar3", 10000, true);

    p1.hand = vec![
        Card::new(3, Suit::Spades),
        Card::new(5, Suit::Hearts),
        Card::new(10, Suit::Clubs),
    ];
    p1.card_count = 3;

    p2.hand = vec![
        Card::new(6, Suit::Spades),
        Card::new(8, Suit::Hearts),
    ];
    p2.card_count = 2;

    p3.hand = vec![
        Card::new(7, Suit::Spades),
        Card::new(9, Suit::Hearts),
    ];
    p3.card_count = 2;

    let rules = GameRules::count_cards();
    let initial_common = tien_len_core::state::PlayingCommon {
        game_number: 1,
        round_number: 1,
        players: vec![p1, p2, p3],
        current_turn_player_id: "p1".into(),
        lead_player_id: "p1".into(),
        round_moves: vec![],
        passed_player_ids: vec![],
        rules,
    };

    let state = MatchState::Playing(PlayingTurnState::OpeningFirstMove {
        common: initial_common,
        required_card: Card::new(3, Suit::Spades),
    });

    // P1 plays 3 of Spades
    let state = play_move(&state, "p1", &["3-SPADES"], 100).expect("P1 play 3S");

    // It should now be P2's turn in Follow state
    if let MatchState::Playing(PlayingTurnState::Follow { common, leading_move }) = &state {
        assert_eq!(common.current_turn_player_id, "p2");
        assert_eq!(leading_move.combination.highest_card.rank, 3);
    } else {
        panic!("Expected Follow state after move");
    }

    // P2 plays 6 of Spades (beats 3S)
    let state = play_move(&state, "p2", &["6-SPADES"], 200).expect("P2 play 6S");

    // P3 plays 7 of Spades (beats 6S)
    let state = play_move(&state, "p3", &["7-SPADES"], 300).expect("P3 play 7S");

    // P1 passes
    let state = pass_turn(&state, "p1").expect("P1 pass");

    // P2 passes
    let state = pass_turn(&state, "p2").expect("P2 pass");

    // When both P1 and P2 passed, P3 won the trick and now leads with NormalLead state!
    if let MatchState::Playing(PlayingTurnState::NormalLead { common }) = &state {
        assert_eq!(common.current_turn_player_id, "p3");
        assert_eq!(common.lead_player_id, "p3");
        assert!(common.passed_player_ids.is_empty());
        assert_eq!(common.players.iter().find(|p| p.id == "p3").unwrap().card_count, 1);
    } else {
        panic!("Expected NormalLead state after trick won by P3");
    }
}

#[test]
fn test_chopping_penalty_settlement() {
    let mut p1 = MatchPlayer::new("p1", "Player 1", "avatar1", 10000, false);
    let mut p2 = MatchPlayer::new("p2", "Player 2", "avatar2", 10000, true);

    // P1 has 10 of Spades and 2 of Hearts (Red Two)
    p1.hand = vec![Card::new(10, Suit::Spades), Card::new(15, Suit::Hearts)];
    p1.card_count = 2;

    // P2 has Quad 8s and a 10
    p2.hand = vec![
        Card::new(8, Suit::Spades),
        Card::new(8, Suit::Clubs),
        Card::new(8, Suit::Diamonds),
        Card::new(8, Suit::Hearts),
        Card::new(10, Suit::Clubs),
    ];
    p2.card_count = 5;

    let mut rules = GameRules::count_cards();
    rules.table.bet_amount = 1000;
    rules.game_flow.prohibit_ending_with_two = false;

    let common = tien_len_core::state::PlayingCommon {
        game_number: 1,
        round_number: 1,
        players: vec![p1, p2],
        current_turn_player_id: "p1".into(),
        lead_player_id: "p1".into(),
        round_moves: vec![],
        passed_player_ids: vec![],
        rules,
    };

    let state = MatchState::Playing(PlayingTurnState::NormalLead { common });

    // P1 plays 2 of Hearts
    let state = play_move(&state, "p1", &["15-HEARTS"], 100).expect("P1 plays 2H");

    // P2 chops with Quad 8s!
    let quad_ids = ["8-SPADES", "8-CLUBS", "8-DIAMONDS", "8-HEARTS"];
    let state = play_move(&state, "p2", &quad_ids, 200).expect("P2 chops with quad");

    // Check penalty transfer: Red 2 penalty = 2 * bet = 2000
    // P1 should be deducted 2000, P2 should be credited 2000
    match &state {
        MatchState::Playing(PlayingTurnState::Follow { common, leading_move }) => {
            assert!(leading_move.is_chop);
            assert_eq!(leading_move.penalty_amount, 2000);
            assert_eq!(common.players.iter().find(|p| p.id == "p1").unwrap().score, 8000);
            assert_eq!(common.players.iter().find(|p| p.id == "p2").unwrap().score, 12000);
        }
        _ => panic!("Expected Follow state with chop"),
    }
}

#[test]
fn test_bot_ai_anti_leader_intercept() {
    let p_bot = MatchPlayer::new("bot", "Bot 1", "avatar", 10000, true);
    let mut p_leader = MatchPlayer::new("human", "Human", "avatar", 10000, false);
    p_leader.card_count = 1; // Human has 1 card left!

    let bot_hand = vec![
        Card::new(4, Suit::Spades),
        Card::new(10, Suit::Hearts),
        Card::new(14, Suit::Hearts), // Ace of Hearts
    ];

    let common = tien_len_core::state::PlayingCommon {
        game_number: 2,
        round_number: 1,
        players: vec![p_bot, p_leader],
        current_turn_player_id: "bot".into(),
        lead_player_id: "bot".into(),
        round_moves: vec![],
        passed_player_ids: vec![],
        rules: GameRules::count_cards(),
    };

    let state = PlayingTurnState::NormalLead { common };
    let tracker = CardTracker::new();

    // Bot must intercept: When leader has 1 card, bot must play highest card (Ace) rather than small trash (4S)!
    let decided = decide_bot_move(&bot_hand, &state, "bot", &tracker).expect("Bot decided move");
    assert_eq!(decided.len(), 1);
    assert_eq!(decided[0].rank, 14); // Ace of hearts played to block!
}
