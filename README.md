# Claude Code Stat Bar

<div align="center">

 English | [**简体中文**](./README_zh-CN.md)

A minimalist status bar for the Claude Code CLI.

![](https://raw.githubusercontent.com/dyx/cc-stat-bar/main/media/demo-dark.png)
![](https://raw.githubusercontent.com/dyx/cc-stat-bar/main/media/demo-light.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/cc-stat-bar)](https://www.npmjs.com/package/cc-stat-bar)

</div>

**Status bar fields:**
```text
Context usage ↑input tokens ↓output tokens | 5h usage reset countdown weekly usage reset countdown | Cost duration | Model name (context window) | Project > Branch
```
> Note: usage information is only shown for Claude subscribers.

## Requirements

- Node.js 18+
- Git

## Installation and Configuration

### Option 1: `npx` (Recommended)

Just configure Claude Code's `settings.json`. No file download is required:

```json
{
  "statusLine": {
    "type": "command",
    "command": "npx cc-stat-bar"
  }
}
```

> If startup speed matters, install it globally first with `npm install -g cc-stat-bar`, then change `command` to `cc-stat-bar`.

## Uninstall

1. Run this command in Claude Code:

```bash
/statusline delete
```

2. If you installed `cc-stat-bar` globally, you can uninstall it with `npm uninstall -g cc-stat-bar`.

## Advanced Configuration

### Customize displayed modules and order

By default, all information is shown. You can append arguments after the `command` path to choose which modules to display and in what order.

**Available modules:**

- `context`: context usage and token counts
- `rateLimits`: 5-hour / 7-day token usage and reset countdown
- `cost`: accumulated cost and session duration
- `model`: current model name and context window size
- `workspace`: project directory and Git branch

### Theme Switching

Supports both `dark` (default) and `light` themes:

```json
"command": "npx cc-stat-bar --theme light"
```

### Configuration Examples

**Example 1: Show only context and usage**

```json
"command": "npx cc-stat-bar context rateLimits"
```

**Example 2: Custom order + light theme**

```json
"command": "npx cc-stat-bar --theme light model context cost"
```
