use tien_len_core::card::{Card, Suit};
use tien_len_core::hand_sorter::{sort_smart_groups, PartitionStrategy};

#[test]
fn test_smart_hand_partition_with_straight_and_pair() {
    let hand = vec![
        Card::new(3, Suit::Spades),
        Card::new(4, Suit::Clubs),
        Card::new(5, Suit::Diamonds),
        Card::new(9, Suit::Hearts),
        Card::new(9, Suit::Spades),
        Card::new(15, Suit::Hearts),
    ];

    let groups = sort_smart_groups(&hand, PartitionStrategy::MaxStraights);

    assert!(groups.iter().any(|g| g.group_type == "STRAIGHT"));
    assert!(groups.iter().any(|g| g.group_type == "PAIR"));
    assert!(groups.iter().any(|g| g.group_type == "SINGLE"));
}
