use tien_len_core::rules::GameRules;
use tien_len_core::simulation::{simulate_match_series, SimulatedBotConfig};

#[test]
fn test_simulate_100_games_performance() {
    let bots = vec![
        SimulatedBotConfig {
            id: "b1".into(),
            name: "Alex (Tier 1 Sắt - 700)".into(),
            avatar: "🤠".into(),
            elo: 700,
            mcts_simulations: 0,
        },
        SimulatedBotConfig {
            id: "b2".into(),
            name: "Rex (Tier 3 Bạc - 1250)".into(),
            avatar: "🧔".into(),
            elo: 1250,
            mcts_simulations: 0,
        },
        SimulatedBotConfig {
            id: "b3".into(),
            name: "Nova (Tier 6 Kim Cương - 2300)".into(),
            avatar: "👑".into(),
            elo: 2300,
            mcts_simulations: 0,
        },
        SimulatedBotConfig {
            id: "b4".into(),
            name: "Alpha Mind (Tier 9 Thách Đấu - 3200)".into(),
            avatar: "🧠".into(),
            elo: 3200,
            mcts_simulations: 0,
        },
    ];

    let rules = GameRules::count_cards();
    let num_games = 100;
    let res = simulate_match_series(num_games, 12345, &rules, &bots, true);

    println!("\n=== SIMULATE 100 GAMES IN RUST NATIVE ===");
    println!("Num games: {}", res.num_games);
    println!("Duration: {:.2} ms ({:.2} ms/game)", res.duration_ms, res.duration_ms / (res.num_games as f64));
    println!("Total turns: {}", res.total_turns);
    println!("Instant wins: {}", res.instant_wins);
    for bot in &bots {
        let wins = res.win_counts.get(&bot.id).copied().unwrap_or(0);
        let rate = res.win_rates.get(&bot.id).copied().unwrap_or(0.0);
        println!("{} {}: {} wins ({:.1}%)", bot.avatar, bot.name, wins, rate * 100.0);
    }
    println!("========================================\n");

    assert_eq!(res.num_games, 100);
    let total_wins: usize = res.win_counts.values().sum();
    assert_eq!(total_wins, 100);

    // 100 games in Rust native must complete in under 500ms (blazing fast!)
    assert!(res.duration_ms < 1000.0);
}
