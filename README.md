# Claude Code Stat Bar

<div align="center">

English ｜ [**中文**](./README_zh-CN.md)

A minimalist status bar for the Claude Code CLI.

![](./media/demo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)

</div>

**Status bar fields:**
```bash
current context usage/context limit | token usage in the last 5 hours 5h reset countdown weekly token usage weekly reset countdown | current model name | current Git branch
```
> PS: Usage information is displayed only to Claude subscribers.

## Requirements

- Node.js 18+
- Git

## Installation and Setup
### macOS / Linux
1. **Copy the script**

Copy `cc-stat-bar.js` from this project into the Claude config directory: `~/.claude/`

2. **Set permissions**
```bash
chmod +x ~/.claude/cc-stat-bar.js
```

3. **Configure your Claude Code `settings.json`**

Add the following to your Claude Code config file. **Note: replace the `command` path with the actual script path on your machine.**
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/cc-stat-bar.js"
  }
}
```

### Windows
1. **Copy the script**

Copy `cc-stat-bar.js` from this project into the Claude config directory: `C:\Users\YourUsername\.claude\`

2. **Configure your Claude Code `settings.json`**

Add the following to your Claude Code config file. **Note: replace the `command` path with the actual script path on your machine.**
```json
{
  "statusLine": {
    "type": "command",
    "command": "~/.claude/cc-stat-bar.js"
  }
}
```

## Uninstall
1. Run the following command in Claude Code:
```bash
/statusline delete
```

2. Delete the `cc-stat-bar.js` file from the Claude Code configuration directory `.claude`.

## Advanced Configuration (Customize Displayed Modules and Order)

By default, all information is displayed. You can append arguments after the `command` path to choose which modules to show and in what order.

**Available arguments:**
- `context`: context information
- `usage`: token usage information
- `model`: model information
- `branch`: Git branch information

### Examples

**Example 1: Show only context and usage**
```json
"command": "~/.claude/cc-stat-bar.js context usage"
```
> **Result:** `16%/200k | 5h:83% ↻3h w:52% ↻3d`

**Example 2: Change display order**
```json
"command": "~/.claude/cc-stat-bar.js model context usage branch"
```
> **Result:** `Opus 4.6 | 16%/200k | 5h:83% ↻3h w:52% ↻3d | main`
