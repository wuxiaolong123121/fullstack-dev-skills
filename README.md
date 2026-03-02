# FullStack Development Skills

> 全栈开发专家技能集 - 84 个技能， 15 个分类， 9 个工作流

## 项目简介

这是一个全面的技能集，用于全栈开发，涵盖了前端、后端、DevOps、安全、AI Agent 开发和机器学习等领域。基于 jeffallan/claude-skills 项目设计理念，采用渐进式披露架构。

## 特性

- **84 个专业技能** - 涵盖全栈开发各个领域
- **15 个分类** - 语言、框架、基础设施、API、质量、DevOps、安全、数据、平台、专业领域、工具、工作流、AI Agent、自我完善
- **9 个工作流** - 需求分析、架构设计、实现开发、测试验证、部署运维
- **自我完善能力** - 自动检测缺失、评估质量、生成改进建议
- **跨 IDE 支持** - 支持 Cursor、Windsurf、VS Code + Copilot、Claude Desktop

## 技能分类

### 语言专家 (12)
Python Pro, TypeScript Pro, JavaScript Pro, Go Pro, Rust Engineer, SQL Pro, C++ Pro, Swift Expert, Kotlin Specialist, C# Developer, PHP Pro, Java Architect

### 后端框架 (7)
NestJS Expert, Django Expert, FastAPI Expert, Spring Boot Engineer, Laravel Specialist, Rails Expert, .NET Core Expert

### 前端与移动 (6)
React Expert, Next.js Developer, Vue Expert, Angular Architect, React Native Expert, Flutter Expert

### 基础设施与云 (5)
Kubernetes Specialist, Terraform Engineer, Postgres Pro, Cloud Architect, Database Optimizer

### API 与架构 (7)
GraphQL Architect, API Designer, WebSocket Engineer, Microservices Architect, MCP Developer, Architecture Designer, Feature Forge

### 质量与测试 (5)
Test Master, Playwright Expert, Code Reviewer, Code Documenter, TDD Agent Expert

### DevOps 与运维 (5)
DevOps Engineer, Monitoring Expert, SRE Engineer, Chaos Engineer, CLI Developer

### 安全 (2)
Secure Code Guardian, Security Reviewer

### 数据与机器学习 (6)
Pandas Pro, Spark Engineer, ML Pipeline, Prompt Engineer, RAG Architect, Fine-Tuning Expert

### 平台专家 (4)
Salesforce Developer, Shopify Expert, WordPress Pro, Atlassian MCP

### 专业领域 (3)
Legacy Modernizer, Embedded Systems, Game Developer

### 工具角色 (2)
Debugging Wizard, Context Engineering

### 工作流程与组合 (2)
Workflow Commands, Skill Combinations

### AI Agent 开发 (1)
AI Agent Development

### AI Agent 协作 (8)
Agentic Engineering, LLM Collaboration, Code Walkthrough, Vibe Coding, Developer Action Guide, MCP Protocol, Computer Use, Agentic System

### FastCode 代码理解 (8)
Semantic-Structural Representation, Lightning-Fast Navigation, Cost-Efficient Context, Agent Tools, Dialogue Cache, Multi-Repo Reasoning, Streaming Answer, Hybrid Retrieval

### 技能自我完善 (1)
Skill Audit, Quality Evaluation, Improvement Suggestions, GitHub Sync

## 快速开始

### 安装

1. 克隆仓库:
```bash
git clone https://github.com/wuxiaolong123121/fullstack-dev-skills.git
```

### 跨 IDE 使用

本技能集支持多种 IDE，只需将对应的规则文件复制到项目根目录：

| IDE | 规则文件 | 使用方法 |
|-----|---------|---------|
| **Cursor** | `.cursorrules` | 复制到项目根目录，自动生效 |
| **Windsurf** | `.windsurfrules` | 复制到项目根目录，自动生效 |
| **VS Code + Copilot** | `.github/copilot-instructions.md` | 复制到项目 `.github/` 目录 |
| **Claude Desktop** | `.clauderules` | 复制到项目根目录 |
| **Kiro** | `spec.md` | 复制到项目根目录，使用 Spec 模式 |
| **Trae IDE** | `SKILL.md` | 放置在 `.trae/skills/fullstack-dev-skills/` 目录 |

### 自动转换

运行转换脚本自动生成各 IDE 规则文件：

```bash
# 生成所有 IDE 规则文件
node convert.js

# 生成指定 IDE 规则文件
node convert.js cursor
node convert.js windsurf
node convert.js copilot
node convert.js claude
```

### 在 Trae IDE 中使用

将技能目录放置在 `.trae/skills/fullstack-dev-skills/` 目录下。

### 使用方法

在对话中引用技能:

```
使用 fullstack-dev-skills 技能帮我开发一个 REST API
```

## 自我完善

本技能集支持自动自我完善:

```python
from skill_self_improvement import SelfImprovementWorkflow

workflow = SelfImprovementWorkflow(config)
results = workflow.run()
print(workflow.generate_report(results))
```

### 功能

- **技能审计** - 自动检测缺失的技能领域
- **质量评估** - 评估文档完整性和代码质量
- **改进建议** - 生成具体的改进建议
- **GitHub 同步** - 自动同步改进到仓库

## 版本历史

| 版本 | 日期 | 变更 |
|-----|------|------|
| 2.6.0 | 2025-03 | 新增跨 IDE 支持（Cursor、Windsurf、VS Code + Copilot、Claude Desktop） |
| 2.5.0 | 2025-03 | 新增技能自我完善模式 |
| 2.4.0 | 2025-03 | 新增 5 个 FastCode 高级模式 |
| 2.3.0 | 2025-03 | 集成 FastCode 代码理解框架 |
| 2.2.0 | 2025-03 | 新增 MCP 协议、Computer Use、Agentic System |
| 2.1.0 | 2025-03 | 集成 Agentic Engineering Patterns |
| 2.0.0 | 2025-03 | 初始版本 |

## 贡献

欢迎贡献! 请查看 [CONTRIBUTING.md](CONTRIBUTING.md) 了解详情。

## 许可证

[MIT License](LICENSE)

## 致谢

- [jeffallan/claude-skills](https://github.com/jeffallan/claude-skills) - 技能设计理念
- [HKUDS/FastCode](https://github.com/HKUDS/FastCode) - 代码理解框架
- [Simon Willison's Agentic Patterns](https://github.com/lucas-flatwhite/agentic-engineering-patterns-simon-willison) - Agentic 工程模式
