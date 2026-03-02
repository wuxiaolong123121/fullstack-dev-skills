# 用户级配置示例 (User Config Example)

## 概述

用户级配置定义了全局的 AI 助手行为，适用于所有项目。这些配置通常位于用户主目录下。

## 配置位置

```
~/.claude/
├── settings.json      # 用户设置
├── CLAUDE.md          # 用户配置 (可选)
├── rules/             # 全局规则
└── hooks/             # 全局 Hooks
```

## settings.json 结构

```json
{
  "version": "1.0",
  "preferences": {
    "language": "zh-CN",
    "outputFormat": "markdown",
    "verbose": false
  },
  "rules": {
    "include": [
      "~/.claude/rules/*.md"
    ]
  },
  "hooks": {
    "SessionStart": [...],
    "SessionEnd": [...]
  },
  "mcpServers": {
    "github": {...},
    "memory": {...}
  }
}
```

## 完整示例

### ~/.claude/settings.json

```json
{
  "version": "1.0",
  "preferences": {
    "language": "zh-CN",
    "defaultModel": "claude-sonnet-4-20250514",
    "fallbackModel": "claude-3-5-haiku-20241022",
    "outputFormat": "markdown",
    "codeStyle": {
      "indentSize": 2,
      "useTabs": false,
      "semi": true,
      "singleQuote": true,
      "trailingComma": "es5"
    }
  },
  "rules": {
    "include": [
      "~/.claude/rules/common/*.md"
    ]
  },
  "hooks": {
    "SessionStart": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node ~/.claude/hooks/session-start.js",
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
            "command": "node ~/.claude/hooks/session-end.js",
            "timeout": 10000
          }
        ]
      }
    ]
  },
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

### ~/.claude/CLAUDE.md

```markdown
# 用户配置

## 偏好设置

### 语言
- 主要使用中文交流
- 代码注释使用英文
- 文档使用中文

### 代码风格
- 使用 2 空格缩进
- 使用单引号
- 不使用分号 (JavaScript/TypeScript)
- 使用尾随逗号

### 输出格式
- 使用 Markdown 格式
- 代码块指定语言
- 表格对齐

## 常用技术栈

### 前端
- React / Next.js
- Vue / Nuxt.js
- TypeScript
- Tailwind CSS

### 后端
- Node.js / Express / NestJS
- Python / FastAPI / Django
- Go / Gin
- PostgreSQL / MongoDB

### DevOps
- Docker / Kubernetes
- GitHub Actions
- Vercel / Railway

## 工作流程

### 开发流程
1. 理解需求
2. 设计方案
3. 编写代码
4. 编写测试
5. 代码审查
6. 部署上线

### 代码审查要点
- 代码可读性
- 性能考虑
- 安全检查
- 测试覆盖

## 注意事项

### 安全
- 不在代码中硬编码密钥
- 使用环境变量
- 验证用户输入

### 性能
- 避免不必要的计算
- 使用缓存
- 懒加载

### 可维护性
- 保持函数简短
- 有意义的命名
- 适当的注释
```

## 全局规则示例

### ~/.claude/rules/common/coding-style.md

```markdown
# 编码风格规则

## 通用原则

- 保持代码简洁
- 遵循 DRY 原则
- 编写可测试的代码
- 有意义的命名

## 格式化

- 使用一致的缩进
- 限制行长度 (80-120 字符)
- 适当的空行分隔

## 注释

- 解释为什么，而不是做什么
- 保持注释更新
- 使用文档注释
```

### ~/.claude/rules/common/security.md

```markdown
# 安全规则

## 认证

- 使用安全的密码存储
- 实现会话管理
- 多因素认证

## 数据保护

- 敏感数据加密
- 安全的传输
- 访问控制

## 输入验证

- 验证所有输入
- 使用参数化查询
- 输出编码
```

## 全局 Hooks 示例

### ~/.claude/hooks/session-start.js

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

const stateDir = path.join(os.homedir(), '.claude', 'state');
const stateFile = path.join(stateDir, 'last-session.json');

// 确保目录存在
if (!fs.existsSync(stateDir)) {
  fs.mkdirSync(stateDir, { recursive: true });
}

// 恢复上次会话状态
if (fs.existsSync(stateFile)) {
  try {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    
    if (state.lastProject) {
      console.log(JSON.stringify({
        type: 'info',
        content: `上次工作项目: ${state.lastProject}`
      }));
    }
  } catch (error) {
    // 忽略错误
  }
}
```

### ~/.claude/hooks/session-end.js

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

const stateDir = path.join(os.homedir(), '.claude', 'state');
const stateFile = path.join(stateDir, 'last-session.json');

if (!fs.existsSync(stateDir)) {
  fs.mkdirSync(stateDir, { recursive: true });
}

const state = {
  lastProject: process.cwd(),
  timestamp: new Date().toISOString()
};

fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
```

## 环境变量配置

### ~/.bashrc 或 ~/.zshrc

```bash
# Claude Code 配置
export GITHUB_TOKEN="ghp_xxxxxxxxxxxx"
export CLAUDE_PACKAGE_MANAGER="pnpm"

# MCP 环境变量
export SUPABASE_ACCESS_TOKEN="sbp_xxxxxxxxxxxx"
export VERCEL_TOKEN="xxxxxxxxxxxx"
```

## 配置优先级

1. **项目级配置** (最高优先级)
   - `.claude/settings.json`
   - `CLAUDE.md`

2. **用户级配置**
   - `~/.claude/settings.json`
   - `~/.claude/CLAUDE.md`

3. **默认配置** (最低优先级)
   - 内置默认值

## 最佳实践

### 1. 分离关注点
- 用户级: 通用偏好和工具
- 项目级: 项目特定配置

### 2. 安全存储
- 使用环境变量存储密钥
- 不在配置文件中硬编码

### 3. 版本控制
- 项目级配置纳入版本控制
- 用户级配置不纳入版本控制

### 4. 定期清理
- 删除不用的 MCP 服务器
- 更新过时的规则

## 相关参考

- [项目级配置示例](./example-project-config.md)
- [MCP 服务器配置](./mcp-servers-config.md)
- [Hooks 系统概述](./hooks-overview.md)
