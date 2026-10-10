use saphyr::{LoadableYamlNode, MarkedYamlOwned};
use serde::Serialize;

/// 一条校验问题。`code` 是 i18n key（前端按 `problems.<code>` 取文案），
/// 后端不产生面向用户的句子。
#[derive(Serialize)]
pub struct Problem {
    pub code: &'static str,
    pub line: usize, // 1-based
    pub col: usize,  // 1-based
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// 校验一份故事文件，一次收全所有问题。
/// 纯函数：不碰文件系统、不依赖 Tauri，将来编辑器里做行内校验直接调。
pub fn validate(src: &str) -> Vec<Problem> {
    // 语法不过就到此为止：后面的结构、引用规则一概不跑——没有语法树它们无从谈起，
    // 混着报也只会让作者去改错地方。下一层要用的文档就是这个 `_docs`。
    let _docs = match MarkedYamlOwned::load_from_str(src) {
        Ok(docs) => docs,
        Err(e) => {
            return vec![Problem {
                code: "parse.syntax",
                line: e.marker().line(),
                col: e.marker().col() + 1, // saphyr 的列是 0-based
                // 解析器自己的英文原因：无法翻译，也不值得穷举映射，原样带给前端。
                detail: Some(e.info().to_owned()),
            }];
        }
    };

    Vec::new()
}
