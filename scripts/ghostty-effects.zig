//! Callback trampolines for libghostty-vt's terminal effects.
//!
//! The engine calls an effect through its function table, and a table entry
//! must be a WebAssembly function of the callback's exact C type, which
//! JavaScript cannot make on its own. Each export here has one callback's type
//! and forwards its arguments to the `env` import of the same name, which
//! `runtime.ts` provides. Pointers are addresses in the engine's memory, so
//! they pass through as `u32`.
//!
//! Extends T3 Code's ghostty-write-pty.zig (MIT, Copyright (c) 2026 T3 Tools
//! Inc.; see ../src/terminal/ghostty/LICENSE).

extern "env" fn write_pty(terminal: u32, userdata: u32, data: u32, len: u32) void;
extern "env" fn bell(terminal: u32, userdata: u32) void;
extern "env" fn color_scheme(terminal: u32, userdata: u32, out_scheme: u32) bool;

/// `GhosttyTerminalWritePtyFn`: the terminal's replies to the program.
export fn ghostty_write_pty(terminal: u32, userdata: u32, data: u32, len: u32) void {
    write_pty(terminal, userdata, data, len);
}

/// `GhosttyTerminalBellFn`: a BEL the parser executed.
export fn ghostty_bell(terminal: u32, userdata: u32) void {
    bell(terminal, userdata);
}

/// `GhosttyTerminalColorSchemeFn`: answers `CSI ? 996 n` by filling
/// `out_scheme`, or returns false to leave the query unanswered.
export fn ghostty_color_scheme(terminal: u32, userdata: u32, out_scheme: u32) bool {
    return color_scheme(terminal, userdata, out_scheme);
}
