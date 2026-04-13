#!/usr/bin/env node
// Claude Code Statusline
// Reads JSON from stdin, outputs formatted status bar to stdout.
//
// Usage: node statusline-command.js [item ...]
//   Items: context, usage, model, branch
//   No args = show all in default order
//
// Output examples:
//   22%/200k | 5h:45% ↻2h w:70% ↻4d | glm-5.1 | main


const { execSync } = require('child_process');

let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', c => buf += c);
process.stdin.on('end', () => {
  let d;
  try { d = JSON.parse(buf); } catch { console.log('--'); return; }

  const R = '\x1b[0m';
  const clr = p => p < 50 ? '\x1b[38;2;74;222;128m' : p <= 80 ? '\x1b[38;2;251;191;36m' : '\x1b[38;2;244;63;94m';
  const fmtSize = v => v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + 'm' : Math.round(v / 1e3) + 'k';
  const pct = p => clr(p) + Math.round(p) + '%' + R;
  const fmtCountdown = ts => {
    if (!ts) return '';
    const target = typeof ts === 'number' ? (ts < 1e12 ? ts * 1000 : ts) : new Date(ts).getTime();
    const diff = Math.max(0, (target - Date.now()) / 1000 | 0);
    for (const [s, u] of [[86400, 'd'], [3600, 'h'], [60, 'm'], [1, 's']])
      if (diff >= s) return ' \u21BB' + (diff / s | 0) + u;
    return '';
  };

  // Parse item order from CLI args, default to all
  const ALL = ['context', 'usage', 'model', 'branch'];
  const items = process.argv.length > 2 ? process.argv.slice(2) : ALL;

  const parts = [];

  // --- Builders ---

  // Context usage percentage with size tag
  const buildContext = () => {
    const cw = d.context_window || {};
    const total = cw.context_window_size;
    const sizeTag = total ? '/' + fmtSize(total) : '';
    let used = cw.used_percentage;
    const hasHistory = (cw.total_output_tokens || 0) > 0;
    if (used == null && total && (cw.total_input_tokens > 0 || hasHistory)) used = (cw.total_input_tokens / total) * 100;
    if (used == null && cw.remaining_percentage != null) used = 100 - cw.remaining_percentage;
    return used != null && isFinite(used) ? pct(used) + sizeTag : '--' + sizeTag;
  };

  // Rate limits (5h / 7d)
  const buildUsage = () => {
    const rl = d.rate_limits || {};
    const rlParts = [];
    for (const [label, key] of [['5h', 'five_hour'], ['w', 'seven_day']]) {
      const limit = rl[key] || {};
      if (limit.used_percentage != null) rlParts.push(label + ':' + pct(limit.used_percentage) + fmtCountdown(limit.resets_at));
    }
    return rlParts.length ? rlParts.join(' ') : null;
  };

  // Model display name
  const buildModel = () => {
    const name = d.model?.display_name || d.model?.id || '';
    return name || null;
  };

  // Git branch
  const buildBranch = () => {
    const cwd = d.workspace?.current_dir || '';
    if (!cwd) return null;
    try {
      return execSync('git -c core.fileMode=false --no-optional-locks rev-parse --abbrev-ref HEAD',
        { cwd, timeout: 2000, encoding: 'utf8', windowsHide: true }).trim() || null;
    } catch {}
  };

  // --- Map item names to builders ---
  const builders = { context: buildContext, usage: buildUsage, model: buildModel, branch: buildBranch };

  // --- Build output in configured order ---
  for (const item of items) {
    if (builders[item]) {
      const result = builders[item]();
      if (result) parts.push(result);
    }
  }

  console.log(parts.join(' | '));
});
