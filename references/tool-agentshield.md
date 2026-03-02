# AgentShield 安全审计工具 (AgentShield Security Auditor)

## 概述

AgentShield 是专为 Claude Code 配置设计的安全审计工具，可扫描配置文件中的安全漏洞、错误配置和注入风险。

## 安装

```bash
# 使用 npx 直接运行 (无需安装)
npx ecc-agentshield scan

# 或全局安装
npm install -g ecc-agentshield
```

## 功能特性

- **912 个测试用例**
- **98% 代码覆盖率**
- **102 条静态分析规则**
- 支持 Opus 4.6 深度分析

## 使用方式

### 快速扫描

```bash
# 基础扫描
npx ecc-agentshield scan

# 指定配置目录
npx ecc-agentshield scan --config ~/.claude
```

### 自动修复

```bash
# 自动修复安全问题
npx ecc-agentshield scan --fix
```

### 深度分析

```bash
# 使用 Opus 4.6 进行深度分析
npx ecc-agentshield scan --opus --stream
```

### 初始化安全配置

```bash
# 从头生成安全配置
npx ecc-agentshield init
```

## 扫描范围

### 1. 配置文件安全

| 检查项 | 描述 |
|-------|------|
| 敏感信息泄露 | 检测硬编码的密钥和令牌 |
| 权限配置 | 检查文件和目录权限 |
| 环境变量 | 验证敏感配置使用环境变量 |

### 2. 注入风险

| 检查项 | 描述 |
|-------|------|
| 命令注入 | 检测 Hook 中的命令注入风险 |
| 路径遍历 | 检测文件路径操作风险 |
| 模板注入 | 检测模板渲染风险 |

### 3. MCP 安全

| 检查项 | 描述 |
|-------|------|
| 服务器配置 | 验证 MCP 服务器配置安全 |
| 权限范围 | 检查 MCP 权限设置 |
| 网络暴露 | 检测不必要的网络暴露 |

### 4. Hook 安全

| 检查项 | 描述 |
|-------|------|
| 脚本验证 | 验证 Hook 脚本安全性 |
| 输入验证 | 检查输入数据处理 |
| 错误处理 | 验证错误处理机制 |

## 输出示例

### 扫描报告

```markdown
## AgentShield 安全扫描报告

### 扫描概览
- **扫描时间**: 2024-01-15 10:00:00
- **配置目录**: ~/.claude
- **扫描文件**: 15

### 发现问题

#### 🔴 严重 (2)

**[SHIELD-001] 硬编码 API 密钥**
- **文件**: settings.json:45
- **描述**: 在配置中发现硬编码的 API 密钥
- **建议**: 使用环境变量替代

**[SHIELD-002] 命令注入风险**
- **文件**: hooks.json:23
- **描述**: Hook 命令使用未验证的用户输入
- **建议**: 添加输入验证

#### 🟠 高危 (3)

**[SHIELD-003] 过宽的文件权限**
- **文件**: ~/.claude/settings.json
- **描述**: 配置文件权限为 644，建议设置为 600
- **建议**: `chmod 600 ~/.claude/settings.json`

#### 🟡 中危 (5)

...

### 统计
| 严重程度 | 数量 |
|---------|------|
| 🔴 严重 | 2 |
| 🟠 高危 | 3 |
| 🟡 中危 | 5 |
| 🟢 低危 | 8 |
| **总计** | **18** |

### 修复建议
1. 立即修复严重和高危问题
2. 将敏感信息移至环境变量
3. 更新文件权限
```

## 安全规则

### 规则分类

```
AgentShield 规则
├── 配置安全 (30 条)
│   ├── 敏感信息检测
│   ├── 权限检查
│   └── 加密验证
├── 注入防护 (25 条)
│   ├── 命令注入
│   ├── 路径遍历
│   └── 模板注入
├── MCP 安全 (22 条)
│   ├── 服务器验证
│   ├── 权限范围
│   └── 网络安全
├── Hook 安全 (15 条)
│   ├── 脚本验证
│   ├── 输入验证
│   └── 错误处理
└── 最佳实践 (10 条)
    ├── 版本检查
    ├── 依赖安全
    └── 配置规范
```

### 常见规则

| 规则 ID | 描述 | 严重程度 |
|--------|------|---------|
| SHIELD-001 | 硬编码密钥检测 | 严重 |
| SHIELD-002 | 命令注入风险 | 严重 |
| SHIELD-003 | 文件权限过宽 | 高 |
| SHIELD-004 | 不安全的 HTTP 连接 | 高 |
| SHIELD-005 | 缺少输入验证 | 中 |
| SHIELD-006 | 敏感日志记录 | 中 |
| SHIELD-007 | 过时的依赖版本 | 低 |

## 配置文件

### .agentshield.json

```json
{
  "version": "1.0",
  "rules": {
    "enabled": ["*"],
    "disabled": ["SHIELD-007"]
  },
  "ignore": [
    "**/test/**",
    "**/*.test.js"
  ],
  "output": {
    "format": "markdown",
    "file": "security-report.md"
  }
}
```

## CI/CD 集成

### GitHub Actions

```yaml
name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run AgentShield
        run: npx ecc-agentshield scan
        
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-report.md
```

### GitLab CI

```yaml
security-scan:
  stage: test
  image: node:18
  script:
    - npx ecc-agentshield scan --output json > report.json
  artifacts:
    reports:
      sast: report.json
```

## 最佳实践

### 1. 定期扫描
- 每次配置变更后运行扫描
- 定期进行安全审计
- 集成到 CI/CD 流程

### 2. 修复优先级
1. 严重问题立即修复
2. 高危问题 24 小时内修复
3. 中低危问题纳入迭代

### 3. 安全配置
- 使用环境变量存储敏感信息
- 限制文件权限
- 定期更新依赖

### 4. 团队协作
- 共享安全配置
- 定期安全培训
- 建立安全审查流程

## 相关参考

- [MCP 服务器配置](./mcp-servers-config.md)
- [安全审查代理](./agent-security-reviewer.md)
- [安全扫描技能](./skill-security-scan.md)
