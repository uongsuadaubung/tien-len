use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt;

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "UPPERCASE")]
pub enum Suit {
    Spades = 1,
    Clubs = 2,
    Diamonds = 3,
    Hearts = 4,
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
        let id = format!("{}-{}", rank, suit_str);
        Self { id, rank, suit }
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
