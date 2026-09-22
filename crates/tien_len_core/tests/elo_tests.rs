use std::collections::HashMap;
use tien_len_core::elo::{calculate_elo_delta, compute_table_elo_settlement, EloPerformanceMetrics};
use tien_len_core::player::MatchPlayer;

#[test]
fn test_elo_delta_basic() {
    let player_elo = 1500;
    let opp_avg = 1500;

    let win_res = calculate_elo_delta(1, player_elo, opp_avg, 4, None);
    assert!(win_res.delta >= 35);
    assert_eq!(win_res.new_elo, player_elo + win_res.delta);

    let second_res = calculate_elo_delta(2, player_elo, opp_avg, 4, None);
    assert!(second_res.delta > 0);

    let third_res = calculate_elo_delta(3, player_elo, opp_avg, 4, None);
    assert!(third_res.delta < 0);

    let last_res = calculate_elo_delta(4, player_elo, opp_avg, 4, None);
    assert!(last_res.delta <= -35);
}

#[test]
fn test_elo_delta_with_metrics() {
    let metrics = EloPerformanceMetrics {
        chops_count: Some(2),
        current_streak: Some(3),
        is_three_spades_win: Some(true),
        ..Default::default()
    };

    let res = calculate_elo_delta(1, 1200, 1400, 4, Some(&metrics));
    // Base is 40, opponents scaling > 1, chops (+6), streak (+3), three spades (+8)
    assert!(res.delta > 50);
}

#[test]
fn test_table_elo_settlement() {
    let p1 = MatchPlayer::new("p1", "Player 1", "", 1000, false);
    let p2 = MatchPlayer::new("p2", "Bot 2", "", 1000, true);
    let p3 = MatchPlayer::new("p3", "Bot 3", "", 1000, true);
    let p4 = MatchPlayer::new("p4", "Bot 4", "", 1000, true);

    let players = vec![p1.clone(), p2.clone(), p3.clone(), p4.clone()];
    let winners = vec![p1.clone(), p2.clone()]; // p1 1st, p2 2nd

    let mut elos = HashMap::new();
    elos.insert("p1".into(), 1200);
    elos.insert("p2".into(), 1200);
    elos.insert("p3".into(), 1200);
    elos.insert("p4".into(), 1200);

    let chops = HashMap::new();
    let got_chopped = HashMap::new();
    let streaks = HashMap::new();

    let settlement = compute_table_elo_settlement(
        &players,
        &winners,
        &elos,
        &chops,
        &got_chopped,
        &streaks,
        false,
        false,
    );

    assert_eq!(settlement.all_elo_deltas.len(), 4);
    assert!(*settlement.all_elo_deltas.get("p1").unwrap() > 0);
    assert!(*settlement.all_elo_deltas.get("p4").unwrap() < 0);
}
