# Hooks 系统概述 (Hooks System Overview)

## 概述

Hooks 系统是 Claude Code 的自动化触发机制，允许在特定事件发生时自动执行预定义的操作。通过 Hooks，可以实现会话持久化、自动压缩、模式提取等高级功能。

## 架构

```
┌─────────────────────────────────────────────────────┐
│                  Claude Code 核心                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐    ┌─────────────┐                │
│  │  事件触发   │───▶│  Hook 匹配  │                │
│  └─────────────┘    └──────┬──────┘                │
│                            │                        │
│                     ┌──────┴──────┐                 │
│                     │             │                 │
│                     ▼             ▼                 │
│              ┌──────────┐  ┌──────────┐            │
│              │ 执行脚本 │  │ 调用 API │            │
│              └──────────┘  └──────────┘            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 事件类型

### 会话生命周期事件

| 事件 | 触发时机 | 用途 |
|-----|---------|------|
| `SessionStart` | 会话开始时 | 加载上下文、恢复状态 |
| `SessionEnd` | 会话结束时 | 保存状态、清理资源 |
| `Stop` | 对话停止时 | 保存进度、生成摘要 |

### 工具使用事件

| 事件 | 触发时机 | 用途 |
|-----|---------|------|
| `PreToolUse` | 工具调用前 | 验证、日志记录 |
| `PostToolUse` | 工具调用后 | 结果处理、状态更新 |

### 上下文管理事件

| 事件 | 触发时机 | 用途 |
|-----|---------|------|
| `PreCompact` | 压缩前 | 保存关键信息 |
| `PostCompact` | 压缩后 | 验证压缩结果 |
| `ContextUpdate` | 上下文更新时 | 触发相关操作 |

### 用户交互事件

| 事件 | 触发时机 | 用途 |
|-----|---------|------|
| `UserInput` | 用户输入时 | 输入预处理 |
| `AssistantResponse` | 助手响应时 | 响应后处理 |

## 配置格式

### 基础配置结构

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/session-start.js"
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node scripts/session-end.js"
          }
        ]
      }
    ]
  }
}
```

### 完整配置示例

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/session-start.js",
            "timeout": 30000
          }
        ]
      }
    ],
    "SessionEnd": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/session-end.js",
            "timeout": 30000
          }
        ]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/log-tool-use.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/post-write.js"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/evaluate-session.js"
          }
        ]
      }
    ]
  }
}
```

## Hook 类型

### 命令 Hook

执行系统命令或脚本：

```json
{
  "type": "command",
  "command": "node scripts/hook.js",
  "timeout": 30000
}
```

### HTTP Hook

调用外部 API：

```json
{
  "type": "http",
  "url": "https://api.example.com/hook",
  "method": "POST",
  "headers": {
    "Authorization": "Bearer token"
  },
  "body": {
    "event": "{{event}}",
    "data": "{{data}}"
  }
}
```

## 匹配器 (Matcher)

### 工具名称匹配

```json
{
  "matcher": "Write|Edit|Delete"
}
```

### 正则表达式匹配

```json
{
  "matcher": ".*\\.ts$"
}
```

### 条件匹配

```json
{
  "matcher": "",
  "condition": {
    "toolName": "Write",
    "filePath": "src/**/*.ts"
  }
}
```

## 生命周期

```
┌─────────────────────────────────────────────────────┐
│                   会话生命周期                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  SessionStart                                       │
│       │                                             │
│       ▼                                             │
│  ┌─────────┐                                        │
│  │ 用户输入 │◀──────────────────────────┐           │
│  └────┬────┘                            │           │
│       │                                 │           │
│       ▼                                 │           │
│  PreToolUse                              │           │
│       │                                 │           │
│       ▼                                 │           │
│  ┌─────────┐                            │           │
│  │ 工具执行 │                            │           │
│  └────┬────┘                            │           │
│       │                                 │           │
│       ▼                                 │           │
│  PostToolUse                             │           │
│       │                                 │           │
│       ▼                                 │           │
│  ┌─────────┐                            │           │
│  │ 助手响应 │────────────────────────────┘           │
│  └────┬────┘                                        │
│       │                                             │
│       ▼                                             │
│  Stop (可选)                                        │
│       │                                             │
│       ▼                                             │
│  SessionEnd                                         │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 环境变量

Hook 脚本可以访问以下环境变量：

| 变量 | 描述 |
|-----|------|
| `CLAUDE_SESSION_ID` | 当前会话 ID |
| `CLAUDE_PROJECT_DIR` | 项目目录 |
| `CLAUDE_EVENT` | 触发的事件名称 |
| `CLAUDE_TOOL_NAME` | 工具名称 (工具事件) |
| `CLAUDE_TOOL_INPUT` | 工具输入 (JSON) |
| `CLAUDE_TOOL_OUTPUT` | 工具输出 (JSON) |

## 脚本示例

### Session Start Hook

```javascript
// session-start.js
const fs = require('fs');
const path = require('path');

const sessionFile = path.join(process.env.CLAUDE_PROJECT_DIR, '.session-state.json');

if (fs.existsSync(sessionFile)) {
  const state = JSON.parse(fs.readFileSync(sessionFile, 'utf8'));
  console.log(JSON.stringify({
    type: 'restore',
    state: state
  }));
}
```

### Session End Hook

```javascript
// session-end.js
const fs = require('fs');
const path = require('path');

const sessionFile = path.join(process.env.CLAUDE_PROJECT_DIR, '.session-state.json');

// 从 stdin 读取当前状态
let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  const state = JSON.parse(input);
  fs.writeFileSync(sessionFile, JSON.stringify(state, null, 2));
});
```

## 最佳实践

### 1. 错误处理
- 设置合理的超时时间
- 捕获并记录错误
- 不阻塞主流程

### 2. 性能考虑
- 避免耗时操作
- 使用异步处理
- 缓存频繁访问的数据

### 3. 安全考虑
- 验证输入数据
- 限制文件访问范围
- 不暴露敏感信息

### 4. 调试
- 使用日志记录
- 测试独立运行
- 验证环境变量

## 配置位置

- **用户级**: `~/.claude/settings.json`
- **项目级**: `.claude/settings.json`
- **Hook 脚本**: `~/.claude/hooks/` 或 `.claude/hooks/`

## 相关参考

- [Hooks 配方](./hooks-recipes.md)
- [Hook 实现脚本](./scripts-hooks-impl.md)
- [会话管理命令](./command-sessions.md)
