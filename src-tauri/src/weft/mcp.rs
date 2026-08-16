use super::{
    dao::{self, Dao},
    errors::{ErrorPayload, WeftError},
};
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
                    Err(payload) => {
                        let text = serde_json::to_string_pretty(&payload)?;
                        ok(
                            id,
                            json!({ "isError": true, "content": [{ "type": "text", "text": text }] }),
                        )
                    }
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
            "description": "Load and validate a WEFT YAML story file",
            "inputSchema": {
                "type": "object",
                "properties": { "path": { "type": "string" } },
                "required": ["path"]
            }
        },
        {
            "name": "get_story",
            "description": "Return metadata of the loaded story",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "list_moai",
            "description": "Return all Moai of the loaded story",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_timeline",
            "description": "Return the Drift timeline grouped by category",
            "inputSchema": { "type": "object", "properties": {} }
        },
        {
            "name": "get_narratives",
            "description": "Return resolved narrative outlines",
            "inputSchema": { "type": "object", "properties": {} }
        }
    ])
}

fn call_tool(params: &Value, dao: &mut Option<Dao>) -> Result<Value, ErrorPayload> {
    let name = params.get("name").and_then(Value::as_str).unwrap_or("");
    let arguments = params.get("arguments").cloned().unwrap_or_default();
    if name == "load_story" {
        let path = arguments
            .get("path")
            .and_then(Value::as_str)
            .ok_or_else(|| WeftError::Schema("load_story requires path".into()).payload(None))?;
        let loaded =
            dao::load(Path::new(path)).map_err(|error| error.payload(Some(Path::new(path))))?;
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
        .ok_or_else(|| WeftError::StoryNotLoaded.payload(None))?;
    match name {
        "get_story" => serde_json::to_value(&dao.story),
        "list_moai" => serde_json::to_value(&dao.moai),
        "get_timeline" => serde_json::to_value(&dao.drift),
        "get_narratives" => serde_json::to_value(&dao.narrative),
        _ => return Err(WeftError::Schema(format!("unknown tool: {name}")).payload(None)),
    }
    .map_err(|error| {
        WeftError::Plugin(format!("failed to serialize result: {error}")).payload(None)
    })
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

    #[test]
    fn load_story_error_is_structured() {
        let mut dao = None;
        let params = json!({
            "name": "load_story",
            "arguments": { "path": "/definitely/missing/story.yml" }
        });
        let payload = call_tool(&params, &mut dao).unwrap_err();
        assert_eq!(payload.code, "FILE_NOT_FOUND");
        assert_eq!(payload.stage, "io");
        assert!(payload.source.is_some());
    }

    #[test]
    fn call_before_load_reports_story_not_loaded() {
        let mut dao = None;
        let params = json!({"name": "get_story", "arguments": {}});
        let payload = call_tool(&params, &mut dao).unwrap_err();
        assert_eq!(payload.code, "STORY_NOT_LOADED");
    }
}
