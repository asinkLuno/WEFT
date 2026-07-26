#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    if std::env::args().nth(1).as_deref() == Some("mcp") {
        if let Err(error) = weft_lib::run_mcp() {
            eprintln!("WEFT MCP failed: {error}");
            std::process::exit(1);
        }
    } else {
        weft_lib::run();
    }
}
