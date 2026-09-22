use tien_len_core::wasm_api::{sanitize_json_surrogates, parse_json_safe};
use serde::Deserialize;

#[derive(Debug, Deserialize, PartialEq, Eq)]
struct TestPayload {
    name: String,
    #[serde(default)]
    avatar: String,
}

#[test]
fn test_sanitize_valid_surrogate_pair_preserved() {
    // \uD83E\uDDD0 là emoji 🧐 (Face with monocle)
    let json = r#"{"name":"Quý sờ tộc","avatar":"\uD83E\uDDD0"}"#;
    let res: TestPayload = parse_json_safe(json).expect("Should parse valid surrogate pair");
    assert_eq!(res.avatar, "🧐");
}

#[test]
fn test_sanitize_lone_leading_surrogate() {
    // \ud83d là lone leading surrogate (không có trailing theo sau)
    let json = r#"{"name":"Santiago\ud83d","avatar":"\ud83d"}"#;
    let res: Result<TestPayload, _> = parse_json_safe(json);
    assert!(res.is_ok(), "parse_json_safe should gracefully recover from lone leading surrogate");
    let payload = res.unwrap();
    assert!(payload.name.contains('\u{FFFD}'));
    assert_eq!(payload.avatar, "\u{FFFD}");
}

#[test]
fn test_sanitize_lone_trailing_surrogate() {
    // \udc00 là lone trailing surrogate (không có leading đi trước)
    let json = r#"{"name":"Santiago\udc00","avatar":"\udc00"}"#;
    let res: Result<TestPayload, _> = parse_json_safe(json);
    assert!(res.is_ok(), "parse_json_safe should gracefully recover from lone trailing surrogate");
    let payload = res.unwrap();
    assert!(payload.name.contains('\u{FFFD}'));
    assert_eq!(payload.avatar, "\u{FFFD}");
}

#[test]
fn test_sanitize_plain_string_zero_alloc() {
    let json = r#"{"name":"Normal Player","avatar":"🤠"}"#;
    let cow = sanitize_json_surrogates(json);
    assert!(matches!(cow, std::borrow::Cow::Borrowed(_)));
}
