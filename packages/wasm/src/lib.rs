use wasm_bindgen::prelude::*;
use similar::{ChangeTag, TextDiff};
use serde_json::Value;

#[wasm_bindgen]
pub fn init_panic_hook() {
    console_error_panic_hook::set_once();
}

// 内部辅助：规范化 JSON 字符串
fn normalize_json(input: &str) -> Option<String> {
    let val: Value = serde_json::from_str(input).ok()?;
    serde_json::to_string_pretty(&val).ok()
}

#[wasm_bindgen]
pub fn compute_diff(old_text: &str, new_text: &str) -> String {
    generate_diff_string(old_text, new_text)
}

#[wasm_bindgen]
pub fn compute_semantic_diff(old_text: &str, new_text: &str) -> String {
    let old_normalized = normalize_json(old_text).unwrap_or(old_text.to_string());
    let new_normalized = normalize_json(new_text).unwrap_or(new_text.to_string());

    generate_diff_string(&old_normalized, &new_normalized)
}

// 抽取公共 Diff 生成逻辑
fn generate_diff_string(old: &str, new: &str) -> String {
    let diff = TextDiff::from_lines(old, new);
    let mut result = String::new();

    for group in diff.grouped_ops(3) {
        for op in group {
            // [FIX]: 使用 iter_changes 代替 iter_inline_changes
            for change in diff.iter_changes(&op) {
                let sign = match change.tag() {
                    ChangeTag::Delete => "-",
                    ChangeTag::Insert => "+",
                    ChangeTag::Equal => " ",
                };
                // [FIX]: change 本身实现了 Display 且通常包含换行符
                // 直接拼接 sign 和 change 内容即可
                result.push_str(&format!("{}{}", sign, change));
            }
        }
    }

    result
}
