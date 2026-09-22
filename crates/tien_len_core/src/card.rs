use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Suit {
    Spades = 0,
    Clubs = 1,
    Diamonds = 2,
    Hearts = 3,
}

impl Suit {
    pub fn symbol(&self) -> &'static str {
        match self {
            Suit::Spades => "♠",
            Suit::Clubs => "♣",
            Suit::Diamonds => "♦",
            Suit::Hearts => "♥",
        }
    }

    pub fn is_red(&self) -> bool {
        matches!(self, Suit::Diamonds | Suit::Hearts)
    }

    pub fn is_black(&self) -> bool {
        matches!(self, Suit::Spades | Suit::Clubs)
    }
}

impl fmt::Display for Suit {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.symbol())
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Hash, Serialize, Deserialize)]
pub struct Card {
    pub id: String,
    pub rank: u8, // 3..=15 (11=J, 12=Q, 13=K, 14=A, 15=2)
    pub suit: Suit,
    #[serde(default)]
    pub weight: u8,
    #[serde(default)]
    pub code: String,
}

impl Card {
    pub fn new(rank: u8, suit: Suit) -> Self {
        assert!((3..=15).contains(&rank), "Invalid rank: must be 3..=15");
        let suit_str = match suit {
            Suit::Spades => "SPADES",
            Suit::Clubs => "CLUBS",
            Suit::Diamonds => "DIAMONDS",
            Suit::Hearts => "HEARTS",
        };
        let id = format!("{}_{}", rank, suit_str);
        let weight = rank * 4 + (suit as u8);
        let suit_short = match suit {
            Suit::Spades => "S",
            Suit::Clubs => "C",
            Suit::Diamonds => "D",
            Suit::Hearts => "H",
        };
        let rank_str = match rank {
            11 => "J",
            12 => "Q",
            13 => "K",
            14 => "A",
            15 => "2",
            10 => "10",
            9 => "9",
            8 => "8",
            7 => "7",
            6 => "6",
            5 => "5",
            4 => "4",
            3 => "3",
            _ => "?",
        };
        let code = format!("{}{}", rank_str, suit_short);
        Self { id, rank, suit, weight, code }
    }

    #[inline]
    pub fn weight(&self) -> u8 {
        self.rank * 4 + (self.suit as u8)
    }

    #[inline]
    pub fn is_two(&self) -> bool {
        self.rank == 15
    }

    #[inline]
    pub fn is_black_two(&self) -> bool {
        self.is_two() && self.suit.is_black()
    }

    #[inline]
    pub fn is_red_two(&self) -> bool {
        self.is_two() && self.suit.is_red()
    }

    #[inline]
    pub fn is_three_of_spades(&self) -> bool {
        self.rank == 3 && self.suit == Suit::Spades
    }
}

impl PartialOrd for Card {
    fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
        Some(self.cmp(other))
    }
}

impl Ord for Card {
    fn cmp(&self, other: &Self) -> Ordering {
        self.weight().cmp(&other.weight())
    }
}

impl fmt::Display for Card {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let rank_str = match self.rank {
            11 => "J",
            12 => "Q",
            13 => "K",
            14 => "A",
            15 => "2",
            r => return write!(f, "{}{}", r, self.suit.symbol()),
        };
        write!(f, "{}{}", rank_str, self.suit.symbol())
    }
}

pub fn create_deck() -> Vec<Card> {
    let mut deck = Vec::with_capacity(52);
    let suits = [Suit::Spades, Suit::Clubs, Suit::Diamonds, Suit::Hearts];
    for rank in 3..=15 {
        for &suit in &suits {
            deck.push(Card::new(rank, suit));
        }
    }
    deck
}

pub fn sort_cards(cards: &mut [Card]) {
    cards.sort();
}

pub fn parse_card(s: &str) -> Option<Card> {
    let s = s.trim();
    if s.len() < 2 {
        return None;
    }
    let (rank_str, suit_char) = s.split_at(s.len() - 1);
    let suit = match suit_char.to_uppercase().as_str() {
        "S" => Suit::Spades,
        "C" => Suit::Clubs,
        "D" => Suit::Diamonds,
        "H" => Suit::Hearts,
        _ => return None,
    };
    let rank = match rank_str.to_uppercase().as_str() {
        "3" => 3,
        "4" => 4,
        "5" => 5,
        "6" => 6,
        "7" => 7,
        "8" => 8,
        "9" => 9,
        "10" => 10,
        "J" => 11,
        "Q" => 12,
        "K" => 13,
        "A" => 14,
        "2" => 15,
        _ => return None,
    };
    Some(Card::new(rank, suit))
}

pub fn parse_cards(s: &str) -> Vec<Card> {
    s.split_whitespace()
        .filter_map(parse_card)
        .collect()
}

pub fn deal_cards(deck: &[Card], player_count: usize) -> Vec<Vec<Card>> {
    let count = player_count.clamp(2, 4);
    let mut hands = vec![Vec::new(); count];
    let total = count * 13;
    for i in 0..total.min(deck.len()) {
        hands[i % count].push(deck[i].clone());
    }
    for hand in &mut hands {
        sort_cards(hand);
    }
    hands
}

