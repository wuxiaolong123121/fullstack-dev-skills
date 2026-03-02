# 命令系统概述 (Commands System Overview)

## 概述

命令系统是 everything-claude-code 项目的交互入口，提供丰富的斜杠命令用于触发各种开发工作流。每个命令针对特定场景优化，提高开发效率和代码质量。

## 命令架构

```
命令系统
├── 规划类命令
│   ├── /plan - 功能规划与任务分解
│   └── /multi-plan - 多任务并行规划
├── 开发类命令
│   ├── /tdd - 测试驱动开发工作流
│   └── /skill-create - 技能创建向导
├── 测试类命令
│   └── /e2e - 端到端测试执行
├── 质量类命令
│   ├── /code-review - 代码审查
│   └── /build-fix - 构建错误修复
├── 管理类命令
│   ├── /sessions - 会话管理
│   ├── /checkpoint - 检查点创建
│   └── /verify - 验证与确认
└── 辅助类命令
    ├── /learn - 学习模式
    └── /pm2 - 进程管理
```

## 命令列表

### 核心命令 (12个)

| 命令 | 功能描述 | 使用场景 |
|-----|---------|---------|
| `/plan` | 功能规划与任务分解 | 新功能开发、复杂任务 |
| `/tdd` | 测试驱动开发工作流 | 功能开发、Bug修复 |
| `/e2e` | 端到端测试执行 | 功能测试、回归测试 |
| `/build-fix` | 构建错误诊断修复 | 编译失败、依赖问题 |
| `/code-review` | 代码审查与建议 | 代码提交、合并请求 |
| `/checkpoint` | 创建工作检查点 | 重要节点、版本发布 |
| `/verify` | 验证与确认检查 | 功能验收、质量检查 |
| `/learn` | 学习与分析模式 | 技术学习、代码理解 |
| `/multi-plan` | 多任务并行规划 | 并行开发、资源协调 |
| `/multi-execute` | 多代理并行执行 | 批量处理、并行任务 |
| `/sessions` | 会话管理与恢复 | 状态保存、工作恢复 |
| `/skill-create` | 技能创建向导 | 新技能开发、模板生成 |

### 扩展命令 (19个)

| 命令 | 功能描述 | 使用场景 |
|-----|---------|---------|
| `/pm2` | 进程管理集成 | 服务部署、进程监控 |
| `/deploy` | 部署流程执行 | 应用部署、环境切换 |
| `/migrate` | 数据库迁移 | 数据库变更、版本升级 |
| `/seed` | 数据填充 | 测试数据、初始数据 |
| `/docs` | 文档生成 | API文档、项目文档 |
| `/refactor` | 代码重构 | 代码优化、技术债务 |
| `/perf` | 性能分析 | 性能优化、瓶颈定位 |
| `/security` | 安全扫描 | 漏洞检测、安全审计 |
| `/test-unit` | 单元测试 | 函数测试、模块测试 |
| `/test-integration` | 集成测试 | API测试、数据库测试 |
| `/test-coverage` | 覆盖率报告 | 测试覆盖率分析 |
| `/lint` | 代码检查 | 代码规范、风格检查 |
| `/format` | 代码格式化 | 代码美化、格式统一 |
| `/deps` | 依赖管理 | 依赖更新、版本检查 |
| `/env` | 环境配置 | 环境变量、配置管理 |
| `/log` | 日志分析 | 日志查看、问题排查 |
| `/cache` | 缓存管理 | 缓存清理、缓存优化 |
| `/hook` | 钩子管理 | Git钩子、自动化脚本 |
| `/config` | 配置管理 | 项目配置、工具配置 |

## 命令使用模式

### 1. 独立命令
```
/plan 实现用户登录功能
```
单独使用一个命令完成特定任务。

### 2. 命令组合
```
/tdd && /code-review && /e2e
```
按顺序执行多个命令，形成完整工作流。

### 3. 命令管道
```
/plan | /tdd | /verify
```
前一个命令的输出作为后一个命令的输入。

### 4. 条件执行
```
/build-fix && /test-unit || /notify "构建失败"
```
根据前一个命令的执行结果决定后续操作。

## 命令参数

### 通用参数

| 参数 | 简写 | 描述 | 示例 |
|-----|------|------|------|
| `--help` | `-h` | 显示帮助信息 | `/plan --help` |
| `--verbose` | `-v` | 详细输出模式 | `/tdd -v` |
| `--dry-run` | `-d` | 模拟执行，不实际修改 | `/deploy --dry-run` |
| `--config` | `-c` | 指定配置文件 | `/build -c custom.json` |
| `--output` | `-o` | 指定输出格式 | `/review -o json` |

### 命令特定参数

#### /plan 参数
```
/plan [功能描述] [选项]

选项:
  --epic        创建 Epic 级别规划
  --sprint      创建 Sprint 级别规划
  --tasks       输出任务列表
  --estimate    包含工时估算
```

#### /tdd 参数
```
/tdd [功能描述] [选项]

选项:
  --watch       监视模式，文件变化自动重跑
  --coverage    生成覆盖率报告
  --debug       调试模式
  --parallel    并行执行测试
```

#### /e2e 参数
```
/e2e [测试范围] [选项]

选项:
  --headed      显示浏览器窗口
  --debug       调试模式
  --trace       记录执行轨迹
  --video       录制视频
  --screenshot  失败时截图
```

## 命令输出格式

### 标准输出结构
```
┌─────────────────────────────────────┐
│ 命令: /plan                         │
│ 执行时间: 2024-01-15 10:30:00       │
│ 状态: ✅ 成功                       │
├─────────────────────────────────────┤
│                                     │
│ [命令输出内容]                       │
│                                     │
├─────────────────────────────────────┤
│ 耗时: 2.5s                          │
│ 下一步建议: /tdd 开始实现            │
└─────────────────────────────────────┘
```

### JSON 输出格式
```json
{
  "command": "/plan",
  "timestamp": "2024-01-15T10:30:00Z",
  "status": "success",
  "duration": 2.5,
  "result": {
    "tasks": [...],
    "estimates": {...}
  },
  "suggestions": ["/tdd"]
}
```

## 命令配置

### 命令别名配置
```json
{
  "aliases": {
    "p": "/plan",
    "t": "/tdd",
    "r": "/code-review",
    "b": "/build-fix"
  }
}
```

### 命令默认参数
```json
{
  "defaults": {
    "/tdd": {
      "coverage": true,
      "parallel": true
    },
    "/e2e": {
      "screenshot": true,
      "trace": true
    }
  }
}
```

### 命令钩子配置
```json
{
  "hooks": {
    "before:/deploy": ["/test-unit", "/build"],
    "after:/code-review": ["/format"],
    "error:/build": ["/build-fix"]
  }
}
```

## 工作流示例

### 功能开发工作流
```
1. /plan 实现用户认证功能
   ↓
2. /tdd 实现登录功能
   ↓
3. /code-review
   ↓
4. /e2e --headed
   ↓
5. /checkpoint v1.0.0-auth
```

### Bug 修复工作流
```
1. /learn 分析问题代码
   ↓
2. /tdd --debug 重现 Bug
   ↓
3. /build-fix
   ↓
4. /verify
   ↓
5. /code-review
```

### 发布工作流
```
1. /test-coverage
   ↓
2. /security
   ↓
3. /docs
   ↓
4. /deploy --dry-run
   ↓
5. /deploy --production
```

## 最佳实践

### 1. 命令选择
- 根据任务类型选择合适的命令
- 了解命令参数以充分利用功能
- 使用命令组合构建完整工作流

### 2. 命令配置
- 配置常用命令别名提高效率
- 设置合理的默认参数
- 使用钩子自动化工作流

### 3. 输出处理
- 仔细阅读命令输出
- 关注错误和警告信息
- 遵循下一步建议

## 相关参考

- [规划命令](./command-plan.md)
- [TDD命令](./command-tdd.md)
- [E2E命令](./command-e2e.md)
- [多代理执行命令](./command-multi-execute.md)
- [会话管理命令](./command-sessions.md)
- [技能创建命令](./command-skill-create.md)
