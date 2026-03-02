# MCP 服务器配置参考 (MCP Servers Configuration)

## 概述

Model Context Protocol (MCP) 是一种标准化的协议，用于连接 AI 助手与外部工具和服务。本文档提供常用 MCP 服务器的配置参考。

## 配置位置

MCP 服务器配置通常位于：
- **用户级**: `~/.claude.json` 或 `~/.claude/settings.json`
- **项目级**: `.claude/settings.json` 或 `.mcp.json`

## 配置格式

```json
{
  "mcpServers": {
    "server-name": {
      "command": "npx",
      "args": ["-y", "package-name"],
      "env": {
        "API_KEY": "your-api-key"
      },
      "description": "服务器描述"
    }
  }
}
```

## 开发工具 MCP

### GitHub MCP

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      },
      "description": "GitHub 操作 - PR、Issue、仓库管理"
    }
  }
}
```

**功能**:
- 创建/更新文件
- 搜索仓库和代码
- 管理 Issue 和 PR
- 获取仓库内容

**获取 Token**:
1. 访问 GitHub Settings → Developer settings → Personal access tokens
2. 创建新 Token，选择所需权限
3. 将 Token 设置为环境变量

### Firecrawl MCP

```json
{
  "mcpServers": {
    "firecrawl": {
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": {
        "FIRECRAWL_API_KEY": "fc-xxxxxxxxxxxx"
      },
      "description": "网页抓取和爬虫"
    }
  }
}
```

**功能**:
- 抓取单个网页
- 批量爬取网站
- 提取结构化数据
- 支持 JavaScript 渲染

### Context7 MCP

```json
{
  "mcpServers": {
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"],
      "description": "实时文档查询"
    }
  }
}
```

**功能**:
- 查询最新库文档
- 获取 API 参考
- 代码示例搜索

### Magic UI MCP

```json
{
  "mcpServers": {
    "magic": {
      "command": "npx",
      "args": ["-y", "@magicuidesign/mcp@latest"],
      "description": "Magic UI 组件生成"
    }
  }
}
```

**功能**:
- 生成 UI 组件
- 设计系统支持
- 响应式布局

## 数据库 MCP

### Supabase MCP

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": [
        "-y",
        "@supabase/mcp-server-supabase@latest",
        "--project-ref=your-project-ref"
      ],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "sbp_xxxxxxxxxxxx"
      },
      "description": "Supabase 数据库操作"
    }
  }
}
```

**功能**:
- 数据库查询和操作
- 表管理
- 实时订阅
- 存储管理

**获取凭证**:
1. 项目 Ref: Supabase Dashboard → Project Settings → General
2. Access Token: Supabase Dashboard → Account Settings → Access Tokens

### ClickHouse MCP

```json
{
  "mcpServers": {
    "clickhouse": {
      "type": "http",
      "url": "https://mcp.clickhouse.cloud/mcp",
      "env": {
        "CLICKHOUSE_API_KEY": "your-api-key"
      },
      "description": "ClickHouse 分析查询"
    }
  }
}
```

**功能**:
- 执行分析查询
- 数据探索
- 性能分析

### Memory MCP

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"],
      "description": "跨会话持久化存储"
    }
  }
}
```

**功能**:
- 存储和检索记忆
- 跨会话持久化
- 上下文保持

## 部署平台 MCP

### Vercel MCP

```json
{
  "mcpServers": {
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com",
      "env": {
        "VERCEL_TOKEN": "xxxxxxxxxxx"
      },
      "description": "Vercel 部署和项目管理"
    }
  }
}
```

**功能**:
- 部署管理
- 项目配置
- 环境变量管理
- 日志查看

### Railway MCP

```json
{
  "mcpServers": {
    "railway": {
      "command": "npx",
      "args": ["-y", "@railway/mcp-server"],
      "env": {
        "RAILWAY_TOKEN": "xxxxxxxxxxx"
      },
      "description": "Railway 部署服务"
    }
  }
}
```

**功能**:
- 服务部署
- 数据库管理
- 变量配置

### Cloudflare MCP

```json
{
  "mcpServers": {
    "cloudflare-docs": {
      "type": "http",
      "url": "https://docs.mcp.cloudflare.com/mcp",
      "description": "Cloudflare 文档搜索"
    },
    "cloudflare-workers-builds": {
      "type": "http",
      "url": "https://builds.mcp.cloudflare.com/mcp",
      "description": "Cloudflare Workers 构建"
    },
    "cloudflare-workers-bindings": {
      "type": "http",
      "url": "https://bindings.mcp.cloudflare.com/mcp",
      "description": "Cloudflare Workers 绑定"
    },
    "cloudflare-observability": {
      "type": "http",
      "url": "https://observability.mcp.cloudflare.com/mcp",
      "description": "Cloudflare 可观测性/日志"
    }
  }
}
```

**功能**:
- Workers 部署和管理
- D1 数据库操作
- R2 存储管理
- 日志和监控

## 通用工具 MCP

### Sequential Thinking MCP

```json
{
  "mcpServers": {
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"],
      "description": "链式推理和逐步思考"
    }
  }
}
```

**功能**:
- 复杂问题分解
- 逐步推理
- 思维链记录

### Filesystem MCP

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        "/path/to/your/projects"
      ],
      "description": "文件系统操作"
    }
  }
}
```

**功能**:
- 文件读写
- 目录操作
- 文件搜索

**注意**: 将 `/path/to/your/projects` 替换为实际路径。

## 完整配置示例

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    },
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest", "--project-ref=xxx"]
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@context7/mcp-server"]
    },
    "memory": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-memory"]
    },
    "sequential-thinking": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-sequential-thinking"]
    }
  }
}
```

## 禁用 MCP 服务器

在项目配置中禁用特定服务器：

```json
{
  "disabledMcpServers": ["firecrawl", "railway"]
}
```

## 最佳实践

### 1. 数量控制
- 保持启用的 MCP 服务器数量在 10 个以内
- 过多的 MCP 会占用上下文窗口

### 2. 安全管理
- 使用环境变量存储敏感信息
- 不要在代码中硬编码 API Key
- 定期轮换访问令牌

### 3. 项目隔离
- 项目级配置覆盖用户级配置
- 为不同项目配置不同的 MCP 组合

### 4. 故障排除
- 检查 Node.js 版本 (需要 18+)
- 确认 npx 可用
- 验证 API Key 有效性

## 常见问题

### Q: MCP 服务器无法启动
A: 检查 Node.js 版本，确保 npx 可用：
```bash
node --version  # 应该 >= 18
npx --version
```

### Q: 环境变量不生效
A: 确保环境变量设置在正确的位置：
- 用户级: `~/.claude.json`
- 项目级: `.claude/settings.json`

### Q: 如何调试 MCP 连接
A: 使用 Claude Code 的调试模式：
```bash
claude --mcp-debug
```

## 相关参考

- [Hooks 系统概述](./hooks-overview.md)
- [项目级配置示例](./example-project-config.md)
- [用户级配置示例](./example-user-config.md)
