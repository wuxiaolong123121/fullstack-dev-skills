# Hooks 配方 (Hooks Recipes)

## 概述

本文档提供常用的 Hook 配置配方，帮助用户快速实现常见的自动化场景。

## 会话持久化配方

### 配置目标
在会话结束时保存状态，在下次会话开始时恢复。

### 配置文件

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-start.js",
            "timeout": 10000
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
            "command": "node .claude/hooks/session-end.js",
            "timeout": 10000
          }
        ]
      }
    ]
  }
}
```

### session-start.js

```javascript
const fs = require('fs');
const path = require('path');

const stateFile = path.join(process.cwd(), '.claude', 'session-state.json');

try {
  if (fs.existsSync(stateFile)) {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    
    console.log(JSON.stringify({
      type: 'context',
      content: `## 恢复上次会话

### 上次任务
${state.lastTask || '无'}

### 进度
${state.progress || '无'}

### 待处理
${state.pending || '无'}
`
    }));
  }
} catch (error) {
  console.error('Session restore failed:', error.message);
}
```

### session-end.js

```javascript
const fs = require('fs');
const path = require('path');

const stateFile = path.join(process.cwd(), '.claude', 'session-state.json');
const stateDir = path.dirname(stateFile);

if (!fs.existsSync(stateDir)) {
  fs.mkdirSync(stateDir, { recursive: true });
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const data = input ? JSON.parse(input) : {};
    
    const state = {
      lastTask: data.currentTask || '',
      progress: data.progress || '',
      pending: data.pending || '',
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Session save failed:', error.message);
  }
});
```

## 自动压缩配方

### 配置目标
在上下文接近限制时，自动建议压缩策略。

### 配置文件

```json
{
  "hooks": {
    "PreCompact": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/pre-compact.js"
          }
        ]
      }
    ]
  }
}
```

### pre-compact.js

```javascript
const fs = require('fs');
const path = require('path');

const backupDir = path.join(process.cwd(), '.claude', 'backups');

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const backupFile = path.join(backupDir, `context-${timestamp}.json`);

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    fs.writeFileSync(backupFile, input);
    
    console.log(JSON.stringify({
      type: 'suggestion',
      content: `## 压缩建议

已备份当前上下文到: ${backupFile}

### 建议压缩策略:
1. 保留最近的对话历史
2. 摘要化早期讨论
3. 提取关键决策点
4. 保留代码片段引用
`
    }));
  } catch (error) {
    console.error('Backup failed:', error.message);
  }
});
```

## 模式提取配方

### 配置目标
在会话结束时自动提取可复用的模式。

### 配置文件

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/extract-patterns.js"
          }
        ]
      }
    ]
  }
}
```

### extract-patterns.js

```javascript
const fs = require('fs');
const path = require('path');

const patternsDir = path.join(process.cwd(), '.claude', 'patterns');

if (!fs.existsSync(patternsDir)) {
  fs.mkdirSync(patternsDir, { recursive: true });
}

let input = '';
process.stdin.on('data', chunk => input += chunk);
process.stdin.on('end', () => {
  try {
    const session = input ? JSON.parse(input) : {};
    
    // 提取模式
    const patterns = {
      timestamp: new Date().toISOString(),
      patterns: extractPatterns(session)
    };
    
    const patternFile = path.join(patternsDir, `pattern-${Date.now()}.json`);
    fs.writeFileSync(patternFile, JSON.stringify(patterns, null, 2));
    
  } catch (error) {
    console.error('Pattern extraction failed:', error.message);
  }
});

function extractPatterns(session) {
  // 简单的模式提取逻辑
  const patterns = [];
  
  if (session.tools) {
    const toolUsage = {};
    session.tools.forEach(tool => {
      toolUsage[tool] = (toolUsage[tool] || 0) + 1;
    });
    patterns.push({ type: 'tool-usage', data: toolUsage });
  }
  
  return patterns;
}
```

## 文件变更监控配方

### 配置目标
监控文件写入操作，自动执行后续处理。

### 配置文件

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/file-change.js"
          }
        ]
      }
    ]
  }
}
```

### file-change.js

```javascript
const toolName = process.env.CLAUDE_TOOL_NAME;
const toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');

if (toolInput.file_path) {
  const ext = toolInput.file_path.split('.').pop();
  
  switch (ext) {
    case 'ts':
    case 'tsx':
      console.log(JSON.stringify({
        type: 'suggestion',
        content: 'TypeScript 文件已修改，建议运行类型检查。'
      }));
      break;
      
    case 'py':
      console.log(JSON.stringify({
        type: 'suggestion',
        content: 'Python 文件已修改，建议运行 lint 检查。'
      }));
      break;
      
    case 'go':
      console.log(JSON.stringify({
        type: 'suggestion',
        content: 'Go 文件已修改，建议运行 go fmt 和 go vet。'
      }));
      break;
  }
}
```

## Git 集成配方

### 配置目标
在文件修改后自动提示 Git 操作。

### 配置文件

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/git-suggest.js"
          }
        ]
      }
    ]
  }
}
```

### git-suggest.js

```javascript
const { execSync } = require('child_process');

try {
  const status = execSync('git status --short', { encoding: 'utf8' });
  
  if (status.trim()) {
    const lines = status.trim().split('\n');
    const modified = lines.filter(l => l.startsWith(' M') || l.startsWith('M ')).length;
    const added = lines.filter(l => l.startsWith('A ') || l.startsWith('??')).length;
    
    console.log(JSON.stringify({
      type: 'info',
      content: `## Git 状态

- 已修改: ${modified} 个文件
- 新增: ${added} 个文件

建议: 考虑提交这些更改
`
    }));
  }
} catch (error) {
  // Git 不可用或不在 Git 仓库中
}
```

## 测试运行配方

### 配置目标
在测试文件修改后自动运行相关测试。

### 配置文件

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/auto-test.js",
            "timeout": 60000
          }
        ]
      }
    ]
  }
}
```

### auto-test.js

```javascript
const { execSync } = require('child_process');
const toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');

if (toolInput.file_path && toolInput.file_path.includes('.test.')) {
  try {
    const result = execSync('npm test -- --findRelatedTests ' + toolInput.file_path, {
      encoding: 'utf8',
      timeout: 30000
    });
    
    console.log(JSON.stringify({
      type: 'result',
      content: `## 测试结果\n\n\`\`\`\n${result}\n\`\`\``
    }));
  } catch (error) {
    console.log(JSON.stringify({
      type: 'error',
      content: `## 测试失败\n\n\`\`\`\n${error.stdout || error.message}\n\`\`\``
    }));
  }
}
```

## 日志记录配方

### 配置目标
记录所有工具使用情况，用于分析和优化。

### 配置文件

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": ".*",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/log-tool.js"
          }
        ]
      }
    ]
  }
}
```

### log-tool.js

```javascript
const fs = require('fs');
const path = require('path');

const logDir = path.join(process.cwd(), '.claude', 'logs');

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFile = path.join(logDir, 'tool-usage.log');
const timestamp = new Date().toISOString();
const toolName = process.env.CLAUDE_TOOL_NAME;
const sessionId = process.env.CLAUDE_SESSION_ID;

const logEntry = `${timestamp} | ${sessionId} | ${toolName}\n`;

fs.appendFileSync(logFile, logEntry);
```

## 组合配方

### 完整开发工作流

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/session-start.js"
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
            "command": "node .claude/hooks/session-end.js"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/file-change.js"
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
            "command": "node .claude/hooks/extract-patterns.js"
          }
        ]
      }
    ]
  }
}
```

## 最佳实践

### 1. 渐进式启用
- 先启用单个 Hook 测试
- 确认正常后再添加更多

### 2. 错误处理
- 所有脚本都应有 try-catch
- 不应阻塞主流程

### 3. 性能考虑
- 设置合理的超时时间
- 避免耗时操作

### 4. 调试
- 使用 console.log 输出调试信息
- 检查环境变量是否正确

## 相关参考

- [Hooks 系统概述](./hooks-overview.md)
- [Hook 实现脚本](./scripts-hooks-impl.md)
- [会话管理命令](./command-sessions.md)
