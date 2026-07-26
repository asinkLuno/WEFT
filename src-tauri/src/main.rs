#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    #[cfg(target_os = "linux")]
    if std::env::var_os("WEBKIT_DISABLE_COMPOSITING_MODE").is_none() {
        // WebKitGTK otherwise tries EGL/Zink first and can fail to create a
        // surface on VMs, containers, or machines with incomplete Mesa
        // drivers. WEFT does not require WebGL, so software compositing is the
        // reliable default; users may override this variable explicitly.
        std::env::set_var("WEBKIT_DISABLE_COMPOSITING_MODE", "1");
    }
    #[cfg(target_os = "linux")]
    if std::env::var_os("LIBGL_ALWAYS_SOFTWARE").is_none() {
        std::env::set_var("LIBGL_ALWAYS_SOFTWARE", "1");
    }

    if std::env::args().nth(1).as_deref() == Some("mcp") {
        if let Err(error) = weft_lib::run_mcp() {
            eprintln!("WEFT MCP failed: {error}");
            std::process::exit(1);
        }
    } else {
        weft_lib::run();
    }
}
