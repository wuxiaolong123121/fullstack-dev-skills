# 项目级配置示例 (Project Config Example)

## 概述

项目级 CLAUDE.md 配置文件位于项目根目录的 `.claude/` 或 `CLAUDE.md`，用于定义项目特定的 AI 助手行为。

## 文件位置

```
my-project/
├── .claude/
│   ├── settings.json      # 项目设置
│   ├── rules/             # 项目规则
│   └── hooks/             # 项目 Hooks
├── CLAUDE.md              # 项目配置 (可选)
└── ...
```

## CLAUDE.md 结构

```markdown
# 项目名称

## 项目概述
[项目描述和目标]

## 技术栈
[使用的技术和框架]

## 代码规范
[编码标准和约定]

## 常用命令
[开发、测试、部署命令]

## 注意事项
[重要提醒和限制]
```

## 完整示例

```markdown
# SaaS Dashboard 项目

## 项目概述

这是一个 B2B SaaS 仪表板应用，提供数据可视化和分析功能。

## 技术栈

- **前端**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: PostgreSQL (Supabase)
- **认证**: NextAuth.js
- **支付**: Stripe
- **部署**: Vercel

## 代码规范

### 文件组织
```
src/
├── app/              # Next.js App Router
│   ├── (auth)/       # 认证相关页面
│   ├── (dashboard)/  # 仪表板页面
│   └── api/          # API 路由
├── components/       # React 组件
│   ├── ui/           # 基础 UI 组件
│   └── features/     # 功能组件
├── lib/              # 工具函数
├── hooks/            # 自定义 Hooks
└── types/            # TypeScript 类型
```

### 命名约定
- 组件: PascalCase (例如: `UserProfile.tsx`)
- 函数: camelCase (例如: `formatDate.ts`)
- 常量: UPPER_SNAKE_CASE (例如: `API_BASE_URL`)
- 文件: kebab-case 用于目录

### 代码风格
- 使用函数组件和 Hooks
- 优先使用命名导出
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置

## 常用命令

### 开发
```bash
npm run dev          # 启动开发服务器
npm run build        # 构建生产版本
npm run start        # 启动生产服务器
```

### 测试
```bash
npm run test         # 运行单元测试
npm run test:e2e     # 运行 E2E 测试
npm run lint         # 运行 ESLint
npm run typecheck    # TypeScript 类型检查
```

### 数据库
```bash
npx prisma migrate dev    # 创建迁移
npx prisma studio         # 打开数据库 GUI
npx prisma generate       # 生成 Prisma Client
```

## API 规范

### 响应格式
```typescript
// 成功响应
{
  "success": true,
  "data": { ... }
}

// 错误响应
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述"
  }
}
```

### 认证
- 所有 API 路由需要验证 session
- 使用 NextAuth.js 的 `getServerSession`

## 环境变量

```env
# 数据库
DATABASE_URL="postgresql://..."

# NextAuth
NEXTAUTH_SECRET="..."
NEXTAUTH_URL="http://localhost:3000"

# Stripe
STRIPE_SECRET_KEY="..."
STRIPE_WEBHOOK_SECRET="..."

# Supabase
NEXT_PUBLIC_SUPABASE_URL="..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

## 注意事项

### 安全
- 不要在客户端暴露敏感信息
- 使用环境变量存储密钥
- 验证所有用户输入

### 性能
- 使用 Next.js Image 组件
- 实现虚拟滚动处理大列表
- 使用 React Query 缓存数据

### 部署
- 主分支自动部署到生产环境
- PR 预览部署
- 使用 Vercel 环境变量

## 相关文档

- [API 文档](./docs/api.md)
- [组件库](./docs/components.md)
- [数据库 Schema](./prisma/schema.prisma)
```

## settings.json 示例

```json
{
  "project": {
    "name": "saas-dashboard",
    "version": "1.0.0"
  },
  "rules": {
    "include": [
      ".claude/rules/*.md"
    ]
  },
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
    ]
  },
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"]
    }
  },
  "disabledMcpServers": []
}
```

## 项目规则示例

### .claude/rules/coding.md

```markdown
# 编码规则

## TypeScript

- 使用严格模式
- 明确定义所有类型
- 避免使用 any
- 使用 const assertions

## React

- 使用函数组件
- 遵循 Hooks 规则
- 组件拆分原则
- 状态提升

## 样式

- 使用 Tailwind CSS
- 遵循移动优先原则
- 使用 CSS 变量
- 响应式断点
```

### .claude/rules/api.md

```markdown
# API 规则

## 路由设计

- RESTful 风格
- 版本控制
- 错误处理

## 安全

- 认证检查
- 输入验证
- 速率限制
```

## 最佳实践

### 1. 保持简洁
- 只包含项目特定信息
- 避免重复通用规则

### 2. 定期更新
- 技术栈变更时更新
- 添加新的约定

### 3. 团队协作
- 使用版本控制
- 代码审查配置变更

### 4. 文档链接
- 链接到详细文档
- 避免在配置中写过多内容

## 相关参考

- [用户级配置示例](./example-user-config.md)
- [SaaS Next.js 示例](./example-saas-nextjs.md)
- [Hooks 系统概述](./hooks-overview.md)
