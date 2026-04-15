#!/usr/bin/env node
// Claude Code Status Line
// Usage: echo '<json>' | node statusline-command.js [--theme <name>] [modules...]
// Available modules: context, rateLimits, cost, model, workspace
// Available themes: dark, light  (add custom themes to THEMES below)
// Default (no args): all modules in order, dark theme

const { execFileSync } = require('child_process');

// ── Theme Registry ──────────────────────────────────────────────────────────

const THEMES = {
  dark: {
    default: {
      bg: '#2B2B3D',
      fg: '#A0A0B8',
    },
    progress: {
      unfilledBgFactor: 0.3,
      unfilledFg: '#A0A0B8',
      thresholds: [
        { max: 50, bg: '#A3BE8C', fg: '#E0E0E0' },
        { max: 80, bg: '#EBCB8B', fg: '#E0E0E0' },
        { max: 100, bg: '#BF616A', fg: '#E0E0E0' },
      ],
    },
  },
  light: {
    default: {
      bg: '#F2F2F6',
      fg: '#54546B',
    },
    progress: {
      unfilledBgFactor: 0.5,
      unfilledFg: '#9898AB',
      thresholds: [
        { max: 50, bg: '#799C5F', fg: '#F8F8F8' },
        { max: 80, bg: '#C59D45', fg: '#F8F8F8' },
        { max: 100, bg: '#A64C55', fg: '#F8F8F8' },
      ],
    },
  }
};

let THEME = THEMES.dark;

// ── ANSI Helpers ─────────────────────────────────────────────────────────────

const RESET = '\x1b[0m';

function hexToRgb(hex) {
  if (!hex || hex[0] !== '#' || hex.length < 7) return [128, 128, 128];
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16)
  ];
}

function esc(code, hex) {
  const [r, g, b] = hexToRgb(hex);
  return `\x1b[${code};2;${r};${g};${b}m`;
}

const bg = hex => esc(48, hex);
const fg = hex => esc(38, hex);

function clampByte(v) {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}

function scaleHex(hex, factor) {
  const [r, g, b] = hexToRgb(hex);
  return '#' + clampByte(r * factor) + clampByte(g * factor) + clampByte(b * factor);
}

// ── Display Width ────────────────────────────────────────────────────────────

function isWide(cp) {
  return cp >= 0x1100 && (
    cp <= 0x115F || cp === 0x2329 || cp === 0x232A ||
    (cp >= 0x2E80 && cp <= 0xA4CF && cp !== 0x303F) || // CJK Radicals / Ideographs
    (cp >= 0xAC00 && cp <= 0xD7A3) ||                 // Hangul Syllables
    (cp >= 0xF900 && cp <= 0xFAFF) ||                 // CJK Compatibility Ideographs
    (cp >= 0xFE10 && cp <= 0xFE19) ||                 // Vertical Forms
    (cp >= 0xFE30 && cp <= 0xFE6F) ||                 // CJK Compatibility Forms
    (cp >= 0xFF01 && cp <= 0xFF60) ||                 // Fullwidth Forms
    (cp >= 0xFFE0 && cp <= 0xFFE6) ||
    (cp >= 0x1F300 && cp <= 0x1F9FF) ||               // Misc Symbols and Pictographs (Emoji)
    (cp >= 0x20000 && cp <= 0x2FFFD) ||               // SIP
    (cp >= 0x30000 && cp <= 0x3FFFD)                  // TIP
  );
}

function strWidth(s) {
  let w = 0;
  for (const ch of s.replace(/\x1b\[[0-9;]*m/g, '')) {
    w += isWide(ch.codePointAt(0)) ? 2 : 1;
  }
  return w;
}

// ── Progress Renderers ───────────────────────────────────────────────────────

function pill(text) {
  return bg(THEME.default.bg) + fg(THEME.default.fg) + ' ' + text + ' ' + RESET;
}

function getThreshold(pct) {
  for (const t of THEME.progress.thresholds) {
    if (pct <= t.max) return t;
  }
  return THEME.progress.thresholds[THEME.progress.thresholds.length - 1];
}

function progressBar(pct, text) {
  const innerWidth = strWidth(text);
  if (innerWidth === 0) return '';
  const totalWidth = innerWidth + 2;
  const filled = Math.max(0, Math.round(totalWidth * (pct / 100)));
  const t = getThreshold(pct);
  const dark = scaleHex(t.bg, THEME.progress.unfilledBgFactor);

  let result = '', pos = 0;
  const cell = (ch, w) => {
    const inFilled = pos < filled;
    result += (inFilled ? bg(t.bg) + fg(t.fg) : bg(dark) + fg(THEME.progress.unfilledFg)) + ch;
    pos += w;
  };

  cell(' ', 1);
  for (const ch of text) {
    const w = isWide(ch.codePointAt(0)) ? 2 : 1;
    cell(ch, w);
  }
  cell(' ', 1);
  return result + RESET;
}

// ── Formatters ───────────────────────────────────────────────────────────────

const FMT_UNITS = [
  [1e12, 't'], [1e9, 'b'], [1e6, 'm'], [1e3, 'k'],
];

function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  const abs = Math.abs(n);
  const trim = s => s.endsWith('.0') ? s.slice(0, -2) : s;
  for (let i = 0; i < FMT_UNITS.length; i++) {
    const [div, unit] = FMT_UNITS[i];
    if (Number(abs.toFixed(1)) >= div) {
      const v = n / div;
      const s = v.toFixed(1);
      if (Number(s) >= 1000 && i > 0) return trim((v / 1000).toFixed(1)) + FMT_UNITS[i - 1][1];
      return trim(s) + unit;
    }
  }
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtCost(n) {
  if (n == null || isNaN(n)) return '$0.00';
  const abs = Math.abs(n);
  for (let i = 0; i < FMT_UNITS.length; i++) {
    const [div, unit] = FMT_UNITS[i];
    if (Number(abs.toFixed(2)) >= div) {
      const v = n / div;
      const s = v.toFixed(2);
      if (Number(s) >= 1000 && i > 0) return '$' + (v / 1000).toFixed(2) + FMT_UNITS[i - 1][1];
      return '$' + s + unit;
    }
  }
  return '$' + n.toFixed(2);
}

function fmtDuration(ms) {
  if (ms == null || isNaN(ms) || ms < 0) return '';
  const t = Math.floor(ms / 1000);
  const s = t % 60;
  const m = Math.floor(t / 60) % 60;
  const h = Math.floor(t / 3600) % 24;

  const totalDays = Math.floor(t / 86400);
  const y = Math.floor(totalDays / 365);
  const remDays = totalDays % 365;
  const M = Math.floor(remDays / 30);
  const d = remDays % 30;

  if (y > 0) return y + 'y' + M + 'M';
  if (M > 0) return M + 'M' + d + 'd';
  if (totalDays > 0) return totalDays + 'd' + h + 'h';
  if (h > 0) return h + 'h' + m + 'm';
  if (m > 0) return m + 'm' + s + 's';
  return s + 's';
}

function truncMid(s, max) {
  if (!s || s.length <= max) return s;
  const half = Math.floor((max - 3) / 2);
  return s.slice(0, half) + '...' + s.slice(-(max - 3 - half));
}

function fmtReset(secs) {
  if (secs == null || isNaN(secs) || secs < 0) return '';
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (d > 0) return '\u27F3' + d + 'd';
  if (h > 0) return '\u27F3' + h + 'h';
  if (m > 0) return '\u27F3' + m + 'm';
  return '\u27F3' + s + 's';
}

// ── Module Renderers ─────────────────────────────────────────────────────────

function renderModel(data) {
  const model = data.model || {};
  const cwSize = (data.context_window && data.context_window.context_window_size) || 200000;
  const suffix = '(' + fmtNum(cwSize) + ')';
  const maxName = 20;
  const name = truncMid(model.display_name, maxName) || 'unknown';
  return pill(name + suffix);
}

function renderContext(data) {
  const cw = data.context_window || {};
  const used = cw.used_percentage;
  if (used == null) return '';
  const pct = Math.round(used);
  const tokens = (cw.total_input_tokens != null || cw.total_output_tokens != null)
    ? ' \u2191' + fmtNum(cw.total_input_tokens || 0) + ' \u2193' + fmtNum(cw.total_output_tokens || 0)
    : '';
  return progressBar(pct, pct + '%' + tokens);
}

function renderRateLimits(data) {
  const rl = data.rate_limits || {};
  const now = Math.floor(Date.now() / 1000);
  const renderLimit = (pct, resetsAt, label) =>
    progressBar(pct, label + ':' + pct + '% ' + fmtReset(resetsAt - now));

  const parts = [];
  for (const [key, label] of [['five_hour', '5h'], ['seven_day', 'w']]) {
    const limit = rl[key];
    if (limit?.used_percentage != null) {
      parts.push(renderLimit(Math.round(limit.used_percentage), limit.resets_at, label));
    }
  }
  return parts.join(' ');
}

function renderWorkspace(data) {
  const ws = data.workspace || {};
  const cwd = ws.current_dir || data.cwd || '';

  if (!cwd) return pill(truncMid('no workspace', 20));

  let branch = ws.git_worktree || '';
  if (!branch) {
    try {
      branch = execFileSync('git', ['-C', cwd, '--no-optional-locks', 'rev-parse', '--abbrev-ref', 'HEAD'], {
        encoding: 'utf8',
        timeout: 500,
        stdio: ['pipe', 'pipe', 'pipe'],
      }).trim();
      if (branch === 'HEAD') branch = '';
    } catch (e) { branch = ''; }
  }

  const dirLabel = truncMid(cwd.split(/[/\\]/).filter(Boolean).pop() || cwd, 20);
  const branchLabel = branch ? truncMid(branch, 20) : '';

  return pill(branchLabel ? dirLabel + ' > ' + branchLabel : dirLabel);
}

function renderCost(data) {
  const costObj = data.cost || {};
  const cost = costObj.total_cost_usd;
  const dur = costObj.total_duration_ms;
  if (cost == null && dur == null) return '';
  const parts = [];
  if (cost != null) parts.push(fmtCost(cost));
  if (dur != null) parts.push(fmtDuration(dur));
  return pill(parts.join(' '));
}

// ── Main ─────────────────────────────────────────────────────────────────────

const ALL_MODULES = ['context', 'rateLimits', 'cost', 'model', 'workspace'];
const RENDERERS = {
  context: renderContext,
  rateLimits: renderRateLimits,
  cost: renderCost,
  model: renderModel,
  workspace: renderWorkspace,
};

function main() {
  let argv = process.argv.slice(2);

  const ti = argv.indexOf('--theme');
  if (ti !== -1 && ti + 1 < argv.length) {
    const themeName = argv[ti + 1].toLowerCase();
    if (THEMES[themeName]) THEME = THEMES[themeName];
    argv = argv.filter((_, i) => i !== ti && i !== ti + 1);
  }

  const resolve = name => ALL_MODULES.find(m => m.toLowerCase() === name.toLowerCase());
  const modules = argv.flatMap(a => a.split(',')).map(resolve).filter(Boolean);
  const active = modules.length > 0 ? modules : ALL_MODULES;

  const chunks = [];
  process.stdin.on('data', chunk => chunks.push(chunk));
  process.stdin.on('end', () => {
    const input = Buffer.concat(chunks).toString('utf8');
    if (!input.trim()) process.exit(0);

    let data;
    try {
      data = JSON.parse(input);
    } catch {
      process.stderr.write('statusline: invalid JSON\n');
      process.exit(1);
    }

    const parts = active
      .map(m => RENDERERS[m] && RENDERERS[m](data))
      .filter(Boolean);

    process.stdout.write(parts.join('  ') + '\x1b[K\n');
  });
}

main();
