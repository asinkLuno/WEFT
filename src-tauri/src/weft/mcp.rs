use super::dao::{self, Dao};
use serde_json::{json, Value};
use std::{
    error::Error,
    io::{self, BufRead, Write},
    path::Path,
};

pub fn run() -> Result<(), Box<dyn Error>> {
    let stdin = io::stdin();
    let mut stdout = io::stdout().lock();
    let mut dao: Option<Dao> = None;
    for line in stdin.lock().lines() {
        let line = line?;
        if line.trim().is_empty() {
            continue;
        }
        let request: Value = serde_json::from_str(&line)?;
        let Some(id) = request.get("id").cloned() else {
            continue;
        };
        let method = request.get("method").and_then(Value::as_str).unwrap_or("");
        let response = match method {
            "initialize" => ok(
                id,
                json!({
                    "protocolVersion": "2025-06-18",
                    "capabilities": { "tools": {} },
                    "serverInfo": { "name": "weft", "version": env!("CARGO_PKG_VERSION") }
                }),
            ),
            "ping" => ok(id, json!({})),
            "tools/list" => ok(id, json!({ "tools": tools() })),
            "tools/call" => {
                let params = request.get("params").cloned().unwrap_or_default();
                match call_tool(&params, &mut dao) {
                    Ok(value) => ok(
                        id,
                        json!({ "content": [{ "type": "text", "text": serde_json::to_string_pretty(&value)? }] }),
                    ),
                    Err(message) => ok(
                        id,
                        json!({ "isError": true, "content": [{ "type": "text", "text": message }] }),
                    ),
                }
            }
            _ => json!({
                "jsonrpc": "2.0",
                "id": id,
                "error": { "code": -32601, "message": format!("Method not found: {method}") }
            }),
        };
        serde_json::to_writer(&mut stdout, &response)?;
        stdout.write_all(b"\n")?;
        stdout.flush()?;
    }
    Ok(())
}

fn ok(id: Value, result: Value) -> Value {
    json!({ "jsonrpc": "2.0", "id": id, "result": result })
}

fn tools() -> Value {
    json!([
        {
            "name": "load_story",
            "description": "加载并验证一个 WEFT YAML 故事文件",
            "inputSchema": {
                "type": "object",
                "properties": { "path": { "type": "string" } },
                "required": ["path"]
            }
        },
        {
            "name": "get_story",
            "description": "返回已加载故事的元信息",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "list_moai",
            "description": "返回已加载故事的全部 Moai",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_timeline",
            "description": "返回按分组解析的 Drift 时间线",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_narratives",
            "description": "返回已解析的叙事大纲",
            "inputSchema": { "type": "object", "properties": {} }
        }
    ])
}

fn call_tool(params: &Value, dao: &mut Option<Dao>) -> Result<Value, String> {
    let name = params.get("name").and_then(Value::as_str).unwrap_or("");
    let arguments = params.get("arguments").cloned().unwrap_or_default();
    if name == "load_story" {
        let path = arguments
            .get("path")
            .and_then(Value::as_str)
            .ok_or_else(|| "load_story 需要 path".to_owned())?;
        let loaded = dao::load(Path::new(path)).map_err(|error| error.to_string())?;
        let result = json!({
            "title": loaded.story.title,
            "moai_count": loaded.moai.len(),
            "drift_count": loaded.drift.values().map(Vec::len).sum::<usize>()
        });
        *dao = Some(loaded);
        return Ok(result);
    }
    let dao = dao
        .as_ref()
        .ok_or_else(|| "尚未加载故事，请先调用 load_story".to_owned())?;
    match name {
        "get_story" => serde_json::to_value(&dao.story),
        "list_moai" => serde_json::to_value(&dao.moai),
        "get_timeline" => serde_json::to_value(&dao.drift),
        "get_narratives" => serde_json::to_value(&dao.narrative),
        _ => return Err(format!("未知工具: {name}")),
    }
    .map_err(|error| error.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn lists_rust_mcp_tools() {
        let tools = tools();
        assert!(tools
            .as_array()
            .unwrap()
            .iter()
            .any(|tool| tool["name"] == "load_story"));
    }
}
