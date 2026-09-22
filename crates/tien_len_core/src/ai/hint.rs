use serde::{Deserialize, Serialize};

use crate::card::Card;
use crate::combination::Combination;
use crate::quick_response::get_sorted_quick_select_candidates;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum HintType {
    DangerWarning,
    TacticalPass,
    ForcedPass,
    LeadOpening,
    BeatMove,
    WinOpportunity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OptimalHintResult {
    pub action: String, // "PLAY" or "PASS"
    pub cards: Vec<Card>,
    pub hint_type: HintType,
    pub title: String,
    pub message: String,
    pub explanation: String,
    pub details: Option<String>,
}

/// Tính toán gợi ý nước đi tối ưu & phân loại chiến thuật
pub fn compute_optimal_move_hint(
    hand: &[Card],
    leading_combo: Option<&Combination>,
    is_lead_move: bool,
    is_first_move_of_game: bool,
    first_move_required_card_id: Option<&str>,
    prohibit_ending_with_two: bool,
) -> OptimalHintResult {
    if hand.is_empty() {
        return OptimalHintResult {
            action: "PASS".into(),
            cards: Vec::new(),
            hint_type: HintType::ForcedPass,
            title: "Hết Bài".into(),
            message: "Bạn đã đánh hết bài trên tay.".into(),
            explanation: "Không còn lá bài nào để đánh.".into(),
            details: None,
        };
    }

    let candidates = get_sorted_quick_select_candidates(
        hand,
        leading_combo,
        is_lead_move,
        is_first_move_of_game,
        first_move_required_card_id,
        prohibit_ending_with_two,
    );

    // 1. Nếu không phải Lead Move và không có bài đè được
    if !is_lead_move && leading_combo.is_some() && candidates.is_empty() {
        return OptimalHintResult {
            action: "PASS".into(),
            cards: Vec::new(),
            hint_type: HintType::ForcedPass,
            title: "🚫 Tạm Nhường Lượt".into(),
            message: "Bài trên bàn hơi gắt rồi, tạm bấm Bỏ Lượt để bảo toàn quân số nhé!".into(),
            explanation: "Không có bài hợp lệ để đè bài trên bàn.".into(),
            details: None,
        };
    }

    // 2. Cơ hội Về Nhất (đánh hết toàn bộ bài trên tay trong 1 lượt)
    if let Some(finishing) = candidates.iter().find(|c| c.cards.len() == hand.len()) {
        return OptimalHintResult {
            action: "PLAY".into(),
            cards: finishing.cards.clone(),
            hint_type: HintType::WinOpportunity,
            title: "🏆 Cơ Hội Về Nhất!".into(),
            message: "Tung đòn dứt điểm toàn bộ bài trên tay để giành chiến thắng Về Nhất!".into(),
            explanation: "Nước đi này giải phóng toàn bộ số bài còn lại của bạn.".into(),
            details: Some("Dứt điểm ván đấu".into()),
        };
    }

    // 3. Nước đi Mở Màn (Lead Move)
    if is_lead_move || leading_combo.is_none() {
        let best_candidate = &candidates[0];
        return OptimalHintResult {
            action: "PLAY".into(),
            cards: best_candidate.cards.clone(),
            hint_type: HintType::LeadOpening,
            title: "🎯 Nước Mở Vòng Tối Ưu".into(),
            message: "Mở màn bằng tổ hợp nhỏ nhất để giữ quyền chủ động và dọn sạch rác!".into(),
            explanation: "Khởi đầu bằng bộ nhỏ giúp giải phóng rác an toàn.".into(),
            details: None,
        };
    }

    // 4. Đè bài thông thường hoặc Chặt Heo
    let best_candidate = &candidates[0];
    if best_candidate.is_chop {
        OptimalHintResult {
            action: "PLAY".into(),
            cards: best_candidate.cards.clone(),
            hint_type: HintType::DangerWarning,
            title: "⚡ Chặt Hàng Sát Phạt!".into(),
            message: "Tung Hàng chặt đối thủ để cướp Cái và thu tiền phạt!".into(),
            explanation: "Chặt đè đối thủ thành công để chiếm quyền kiểm soát sới bài.".into(),
            details: Some("Chặt đè".into()),
        }
    } else {
        OptimalHintResult {
            action: "PLAY".into(),
            cards: best_candidate.cards.clone(),
            hint_type: HintType::BeatMove,
            title: "⚔️ Đè Bài Vừa Khít".into(),
            message: "Đè bằng bộ vừa khít nhất để tiết kiệm quân lớn cho các lượt sau!".into(),
            explanation: "Lựa chọn tổ hợp nhỏ nhất đủ đè để tối ưu hóa thế bài.".into(),
            details: None,
        }
    }
}
