# Skill Creator 技能生成工具 (Skill Creator Tool)

## 概述

Skill Creator 是从 Git 历史自动生成 Claude Code 技能文档的工具。它分析代码提交模式，提取可复用的开发知识。

## 安装

```bash
# 本地分析 (内置)
# 使用 /skill-create 命令

# GitHub App (高级功能)
# 安装 GitHub App: https://github.com/apps/skill-creator
```

## 使用方式

### 方式 A: 本地分析 (内置)

```bash
# 分析当前仓库
/skill-create

# 同时生成 instincts
/skill-create --instincts

# 指定输出目录
/skill-create --output ./skills
```

### 方式 B: GitHub App (高级)

适用于大型仓库 (10k+ commits) 和团队共享场景。

```bash
# 在 Issue 中评论
/skill-creator analyze

# 或在推送到默认分支时自动触发
```

## 功能对比

| 功能 | 本地分析 | GitHub App |
|-----|---------|------------|
| 基础分析 | ✅ | ✅ |
| 大型仓库 (>10k commits) | ❌ | ✅ |
| 自动 PR 创建 | ❌ | ✅ |
| 团队共享 | ❌ | ✅ |
| 定期更新 | ❌ | ✅ |
| 安装要求 | 无 | GitHub App |

## 输出内容

### 1. SKILL.md 文件

生成的技能文档包含：

```markdown
# [项目名称] 开发技能

## 概述
[从提交历史提取的项目描述]

## 常用模式

### 模式 1: [模式名称]
[从代码历史提取的开发模式]

### 模式 2: [模式名称]
[从代码历史提取的开发模式]

## 代码规范
[从提交历史提取的编码规范]

## 常见任务
[从提交历史提取的常见开发任务]

## 注意事项
[从提交历史提取的重要提醒]
```

### 2. Instinct 集合

用于持续学习系统：

```json
{
  "instincts": [
    {
      "id": "inst-001",
      "pattern": "使用 useCallback 优化性能",
      "evidence": "在 15 个提交中观察到",
      "confidence": 0.85
    }
  ]
}
```

## 分析流程

```
┌─────────────────────────────────────────────────────┐
│                  Skill Creator 流程                  │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐                                    │
│  │ Git 历史分析 │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │ 提交模式提取 │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │ 代码风格分析 │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │ 知识聚类     │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │ 生成文档     │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │ 输出 SKILL.md│                                    │
│  └─────────────┘                                    │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 分析维度

### 1. 提交模式

| 维度 | 描述 |
|-----|------|
| 功能开发 | 新功能添加模式 |
| Bug 修复 | 问题修复模式 |
| 重构 | 代码重构模式 |
| 文档 | 文档更新模式 |
| 测试 | 测试编写模式 |

### 2. 代码风格

| 维度 | 描述 |
|-----|------|
| 命名约定 | 变量、函数命名风格 |
| 文件组织 | 目录和文件结构 |
| 注释风格 | 注释编写习惯 |
| 代码格式 | 缩进、空格等 |

### 3. 技术栈

| 维度 | 描述 |
|-----|------|
| 框架使用 | 框架特定模式 |
| 库使用 | 第三方库使用方式 |
| 工具链 | 构建和部署工具 |

## 输出示例

### SKILL.md 示例

```markdown
# React Dashboard 开发技能

## 概述

本项目是一个 React 仪表板应用，使用 TypeScript 和 Tailwind CSS。

## 技术栈

- React 18
- TypeScript 5
- Tailwind CSS 3
- React Query
- Zustand

## 常用模式

### 组件结构
```tsx
// 组件定义模式 (在 45 个提交中观察到)
interface Props {
  title: string
  data: DataType[]
}

export function Component({ title, data }: Props) {
  // Hooks
  const [state, setState] = useState()
  
  // 派生数据
  const computed = useMemo(() => ..., [])
  
  // 事件处理
  const handleClick = useCallback(() => ..., [])
  
  // 渲染
  return (
    <div className="...">
      {/* 组件内容 */}
    </div>
  )
}
```

### API 调用
```tsx
// React Query 模式 (在 30 个提交中观察到)
const { data, isLoading, error } = useQuery({
  queryKey: ['resource', id],
  queryFn: () => fetchResource(id),
  staleTime: 5 * 60 * 1000
})
```

### 状态管理
```tsx
// Zustand 模式 (在 20 个提交中观察到)
const useStore = create<Store>((set) => ({
  items: [],
  addItem: (item) => set((state) => ({
    items: [...state.items, item]
  }))
}))
```

## 代码规范

### 命名约定
- 组件: PascalCase
- 函数: camelCase
- 常量: UPPER_SNAKE_CASE
- 文件: kebab-case

### 文件组织
```
src/
├── components/     # React 组件
├── hooks/          # 自定义 Hooks
├── stores/         # Zustand stores
├── api/            # API 调用
└── types/          # TypeScript 类型
```

## 常见任务

### 添加新页面
1. 在 `src/pages/` 创建页面组件
2. 在 `src/api/` 添加 API 调用
3. 在路由配置中注册

### 添加新组件
1. 在 `src/components/` 创建组件
2. 定义 Props 接口
3. 编写单元测试

## 注意事项

- 使用 React Query 管理服务端状态
- 使用 Zustand 管理客户端状态
- 遵循 Tailwind CSS 类名顺序
```

## 命令选项

### /skill-create 选项

| 选项 | 描述 |
|-----|------|
| `--instincts` | 同时生成 instincts 文件 |
| `--output <dir>` | 指定输出目录 |
| `--max-commits <n>` | 限制分析的提交数量 |
| `--since <date>` | 分析指定日期后的提交 |
| `--author <name>` | 分析指定作者的提交 |

## 与持续学习集成

生成的 instincts 可导入到持续学习系统：

```bash
# 导出 instincts
/skill-create --instincts

# 导入到持续学习
/instinct-import ./instincts.json

# 查看学习状态
/instinct-status
```

## 最佳实践

### 1. 定期更新
- 重大功能发布后重新生成
- 定期更新技能文档

### 2. 团队共享
- 将生成的技能纳入版本控制
- 团队成员共同维护

### 3. 手动调整
- 自动生成后进行人工审核
- 补充项目特定信息

### 4. 结合其他工具
- 与 AgentShield 安全扫描结合
- 与代码审查流程结合

## 相关参考

- [项目级配置示例](./example-project-config.md)
- [持续学习 Hook](./hooks-continuous-learning.md)
- [Instinct 状态命令](./command-instinct-status.md)
