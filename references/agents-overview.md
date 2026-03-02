# 代理系统概述 (Agents System Overview)

## 概述

代理系统是 everything-claude-code 项目的核心组件，提供智能化的开发辅助功能。每个代理专注于特定领域，通过专业化分工提高开发效率和代码质量。

## 代理架构

```
代理系统
├── 架构设计层
│   ├── architect - 架构决策与系统设计
│   └── planner - 任务规划与执行策略
├── 代码质量层
│   ├── code-reviewer - 代码审查与最佳实践
│   └── security-reviewer - 安全漏洞检测与修复
├── 测试驱动层
│   ├── tdd-guide - 测试驱动开发指导
│   └── e2e-runner - 端到端测试执行
├── 问题解决层
│   ├── build-error-resolver - 构建错误诊断修复
│   └── refactor-cleaner - 代码重构与清理
├── 文档维护层
│   └── doc-updater - 文档同步与更新
└── 语言专用层
    ├── go-reviewer - Go 代码审查
    ├── go-build-resolver - Go 构建问题解决
    ├── python-reviewer - Python 代码审查
    └── database-reviewer - 数据库设计审查
```

## 代理列表

### 核心代理 (7个)

| 代理名称 | 职责范围 | 触发场景 |
|---------|---------|---------|
| architect | 系统架构设计、技术选型、ADR编写 | 新项目启动、重大重构、技术决策 |
| planner | 任务分解、执行计划、依赖管理 | 复杂任务、多步骤工作流 |
| code-reviewer | 代码质量、最佳实践、改进建议 | 代码提交、合并请求 |
| security-reviewer | 安全漏洞、OWASP检查、权限审计 | 安全审计、漏洞修复 |
| tdd-guide | 测试策略、RED-GREEN-REFACTOR | 测试驱动开发流程 |
| build-error-resolver | 编译错误、依赖冲突、环境问题 | 构建失败、CI/CD错误 |
| e2e-runner | 端到端测试、Playwright集成 | 功能测试、回归测试 |

### 扩展代理 (6个)

| 代理名称 | 职责范围 | 触发场景 |
|---------|---------|---------|
| refactor-cleaner | 代码重构、技术债务清理 | 代码异味、重构需求 |
| doc-updater | 文档同步、API文档生成 | 代码变更、版本发布 |
| go-reviewer | Go语言代码审查 | Go项目开发 |
| go-build-resolver | Go构建问题解决 | Go编译错误 |
| python-reviewer | Python代码审查 | Python项目开发 |
| database-reviewer | 数据库设计审查 | 数据库变更、性能优化 |

## 代理协作模式

### 1. 串行协作
```
architect → planner → code-reviewer → security-reviewer
```
适用于：新功能开发完整流程

### 2. 并行协作
```
┌── code-reviewer ──┐
├── security-reviewer ├──→ 综合报告
└── tdd-guide ───────┘
```
适用于：代码质量全面检查

### 3. 层级协作
```
architect (决策层)
    ├── planner (规划层)
    │   ├── code-reviewer (执行层)
    │   └── tdd-guide (执行层)
    └── security-reviewer (审计层)
```
适用于：大型项目开发

## 代理配置

### 基础配置
```json
{
  "agent": {
    "name": "architect",
    "version": "1.0.0",
    "enabled": true,
    "priority": "high",
    "timeout": 300000,
    "maxRetries": 3
  }
}
```

### 代理链配置
```json
{
  "agentChain": {
    "name": "full-review",
    "agents": ["code-reviewer", "security-reviewer", "tdd-guide"],
    "mode": "parallel",
    "aggregator": "consolidate-reports"
  }
}
```

## 代理输出格式

### 标准输出结构
```markdown
## 代理报告: [代理名称]

### 执行摘要
- 执行时间: [时间戳]
- 处理范围: [文件/模块列表]
- 发现问题: [数量]

### 详细发现
#### 问题 1
- 类型: [错误/警告/建议]
- 位置: [文件:行号]
- 描述: [问题描述]
- 建议: [修复建议]

### 统计数据
- 总计: [数量]
- 按类型: [分类统计]
- 按严重程度: [严重程度统计]

### 下一步建议
1. [建议1]
2. [建议2]
```

## 最佳实践

### 1. 选择合适的代理
- 明确任务目标
- 匹配代理专长
- 考虑协作需求

### 2. 配置代理参数
- 设置合理的超时时间
- 配置适当的重试次数
- 启用/禁用特定检查

### 3. 处理代理输出
- 按严重程度排序问题
- 优先处理高优先级问题
- 跟踪问题修复状态

### 4. 代理组合使用
- 串行用于完整流程
- 并行用于全面检查
- 层级用于大型项目

## 相关参考

- [架构师代理](./agent-architect.md)
- [规划师代理](./agent-planner.md)
- [代码审查代理](./agent-code-reviewer.md)
- [安全审查代理](./agent-security-reviewer.md)
- [TDD指南代理](./agent-tdd-guide.md)
- [构建错误解决代理](./agent-build-resolver.md)
