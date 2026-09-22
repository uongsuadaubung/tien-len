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

#[test]
fn test_simulate_single_table_rules_and_settlement() {
    use std::collections::HashMap;
    use tien_len_core::simulation::{simulate_single_table, TableGroupInput};

    let mut bots = HashMap::new();
    let bot_ids = vec!["bot1".to_string(), "bot2".to_string(), "bot3".to_string(), "bot4".to_string()];
    for (i, id) in bot_ids.iter().enumerate() {
        bots.insert(
            id.clone(),
            SimulatedBotConfig {
                id: id.clone(),
                name: format!("Bot {}", i + 1),
                avatar: "🤖".into(),
                elo: 1000 + (i as u32) * 100,
                mcts_simulations: 0,
            },
        );
    }

    let table = TableGroupInput {
        table_id: "tbl_test_1".into(),
        bet_amount: 2000,
        bot_ids: bot_ids.clone(),
        tier_num: 1,
    };

    let result = simulate_single_table(&table, &bots, 42, 1700000000);
    assert_eq!(result.table_id, "tbl_test_1");
    assert_eq!(result.bet_amount, 2000);
    assert_eq!(result.bot_results.len(), 4);

    let mut ranks: Vec<u32> = result.bot_results.iter().map(|r| r.rank).collect();
    ranks.sort();
    assert_eq!(ranks, vec![1, 2, 3, 4]);

    // Zero-sum invariant
    let sum_coins: i64 = result.bot_results.iter().map(|r| r.delta_coins).sum();
    assert_eq!(sum_coins, 0, "Sum of delta_coins must be exactly zero");

    // Elo rating direction
    let r1 = result.bot_results.iter().find(|r| r.rank == 1).unwrap();
    let r4 = result.bot_results.iter().find(|r| r.rank == 4).unwrap();
    assert!(r1.delta_elo > 0, "Winner must gain Elo");
    assert!(r4.delta_elo < 0, "Loser must lose Elo");
}

#[test]
fn test_simulate_single_table_skipped_when_underfilled() {
    use std::collections::HashMap;
    use tien_len_core::simulation::{simulate_single_table, TableGroupInput};

    let bots = HashMap::new();
    let table = TableGroupInput {
        table_id: "tbl_skip".into(),
        bet_amount: 1000,
        bot_ids: vec!["b1".into(), "b2".into()],
        tier_num: 1,
    };

    let result = simulate_single_table(&table, &bots, 123, 1700000000);
    assert!(result.id.contains("_skipped"));
    assert_eq!(result.bot_results.len(), 0);
}

#[test]
fn test_simulate_tables_batch() {
    use std::collections::HashMap;
    use tien_len_core::simulation::{simulate_tables_batch, TableGroupInput};

    let mut bots = HashMap::new();
    for i in 1..=20 {
        let id = format!("bot_{}", i);
        bots.insert(
            id.clone(),
            SimulatedBotConfig {
                id: id.clone(),
                name: format!("Bot {}", i),
                avatar: "🤖".into(),
                elo: 1000,
                mcts_simulations: 0,
            },
        );
    }

    let tables: Vec<TableGroupInput> = (0..5)
        .map(|i| TableGroupInput {
            table_id: format!("table_{}", i),
            bet_amount: 1000 * (i as i64 + 1),
            bot_ids: vec![
                format!("bot_{}", i * 4 + 1),
                format!("bot_{}", i * 4 + 2),
                format!("bot_{}", i * 4 + 3),
                format!("bot_{}", i * 4 + 4),
            ],
            tier_num: 1,
        })
        .collect();

    let batch = simulate_tables_batch(&tables, &bots, 9999, 1700000000);
    assert_eq!(batch.table_results.len(), 5);
    for tbl in &batch.table_results {
        assert_eq!(tbl.bot_results.len(), 4);
    }
}
