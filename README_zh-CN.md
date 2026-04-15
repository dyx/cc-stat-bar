# Claude Code Stat Bar

<div align="center">

 [**English**](./README.md) ｜ 中文

一个极简 Claude Code 命令行状态条。

![](https://raw.githubusercontent.com/dyx/cc-stat-bar/main/media/demo-dark.png)
![](https://raw.githubusercontent.com/dyx/cc-stat-bar/main/media/demo-light.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green.svg)](https://nodejs.org/)
[![npm](https://img.shields.io/npm/v/cc-stat-bar)](https://www.npmjs.com/package/cc-stat-bar)

</div>

**状态条信息说明：**
```
上下文使用比例 ↑输入token ↓输出token | 5h用量 重置倒计时 周用量 重置倒计时 | 费用 时长 | 模型名(上下文窗口) | 项目 > 分支
```
> PS：用量信息只有 Claude 订阅用户才展示

## 运行要求

- Node.js 18+
- Git

## 安装与配置

### 方式一：npx（推荐）

只需配置 Claude Code 的 `settings.json`，无需下载任何文件：
```json
{
  "statusLine": {
    "type": "command",
    "command": "npx cc-stat-bar"
  }
}
```

> 💡 如果对启动速度敏感，可先全局安装：`npm install -g cc-stat-bar`，然后 `command` 改为 `cc-stat-bar`。

## 卸载
1. 在 Claude Code 中执行命令：
```bash
/statusline delete
```

2. 如果全局安装了 `cc-stat-bar`，可执行命令卸载 `npm uninstall -g cc-stat-bar`。

## 高级配置

### 自定义显示模块与顺序

默认展示所有信息。你可以通过在 `command` 路径后追加参数，来定义要展示的模块及其顺序。

**可用模块：**
- `context`：上下文使用比例与 token 计数
- `rateLimits`：5 小时 / 7 天 Token 用量与重置倒计时
- `cost`：累计费用与会话时长
- `model`：当前模型名称与上下文窗口大小
- `workspace`：项目目录与 Git 分支

### 主题切换

支持 `dark`（默认）和 `light` 两种主题：
```json
"command": "npx cc-stat-bar --theme light"
```

### 配置示例

**示例 1：仅展示上下文与用量**
```json
"command": "npx cc-stat-bar context rateLimits"
```

**示例 2：自定义顺序 + 浅色主题**
```json
"command": "npx cc-stat-bar --theme light model context cost"
```