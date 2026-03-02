# 安全扫描集成 (Security Scan Integration)

## 概述

安全扫描集成模块提供自动化的安全漏洞检测能力，集成 AgentShield 和多种安全扫描工具，帮助开发团队在开发过程中及时发现和修复安全问题。

## 核心功能

### 1. 静态代码分析 (SAST)
- 源代码安全漏洞扫描
- 敏感数据泄露检测
- 不安全编码模式识别

### 2. 依赖漏洞扫描 (SCA)
- 第三方库漏洞检测
- 许可证合规检查
- 过时依赖提醒

### 3. 动态安全测试 (DAST)
- 运行时漏洞检测
- API 安全测试
- 渗透测试辅助

### 4. 安全配置检查
- 安全头配置验证
- 加密配置审计
- 权限配置检查

## 支持的扫描工具

### 内置工具

| 工具 | 类型 | 描述 | 适用语言 |
|-----|------|------|---------|
| ESLint Security | SAST | JavaScript 安全规则 | JS/TS |
| Bandit | SAST | Python 安全扫描 | Python |
| Semgrep | SAST | 多语言静态分析 | 多语言 |
| npm audit | SCA | Node.js 依赖扫描 | JS/TS |
| Safety | SCA | Python 依赖扫描 | Python |
| OWASP ZAP | DAST | 动态安全测试 | Web |
| Trivy | 容器 | 容器镜像扫描 | Docker |

## 使用方式

### 命令行调用
```bash
# 快速扫描
/security-scan

# 完整扫描
/security-scan --full

# 指定类型
/security-scan --type sast,sca

# 指定目录
/security-scan --target ./src
```

### 配置文件
```json
{
  "securityScan": {
    "enabled": true,
    "scanners": {
      "sast": {
        "enabled": true,
        "tools": ["semgrep", "eslint-security"],
        "rules": ["owasp-top-10", "cwe-top-25"]
      },
      "sca": {
        "enabled": true,
        "tools": ["npm-audit", "snyk"],
        "severity": ["critical", "high"]
      },
      "dast": {
        "enabled": false,
        "tools": ["zap"],
        "targetUrl": "http://localhost:3000"
      }
    },
    "output": {
      "format": "json",
      "file": "security-report.json"
    }
  }
}
```

## 扫描报告格式

### 标准报告
```json
{
  "scanId": "scan_20240115_001",
  "timestamp": "2024-01-15T10:00:00Z",
  "duration": 45.2,
  "summary": {
    "total": 15,
    "critical": 2,
    "high": 5,
    "medium": 6,
    "low": 2
  },
  "findings": [
    {
      "id": "FIND-001",
      "title": "SQL Injection Vulnerability",
      "severity": "critical",
      "type": "sast",
      "location": {
        "file": "src/db/queries.js",
        "line": 45,
        "column": 10
      },
      "description": "User input directly concatenated into SQL query",
      "cwe": "CWE-89",
      "owasp": "A03:2021",
      "recommendation": "Use parameterized queries or prepared statements",
      "references": [
        "https://owasp.org/www-community/attacks/SQL_Injection"
      ]
    }
  ]
}
```

### Markdown 报告
```markdown
## 安全扫描报告

### 扫描概览
- **扫描时间**: 2024-01-15 10:00:00
- **扫描类型**: SAST + SCA
- **扫描范围**: ./src
- **总耗时**: 45.2s

### 漏洞统计
| 严重程度 | 数量 | 占比 |
|---------|------|------|
| 🔴 严重 | 2 | 13% |
| 🟠 高危 | 5 | 33% |
| 🟡 中危 | 6 | 40% |
| 🟢 低危 | 2 | 14% |
| **总计** | **15** | 100% |

### 漏洞详情

#### 🔴 FIND-001: SQL 注入漏洞
- **类型**: SAST
- **位置**: src/db/queries.js:45
- **CWE**: CWE-89
- **OWASP**: A03:2021 - 注入攻击
- **描述**: 用户输入直接拼接到 SQL 查询中
- **修复建议**: 使用参数化查询或预处理语句

#### 🟠 FIND-002: XSS 漏洞
- **类型**: SAST
- **位置**: src/components/UserProfile.tsx:78
- **CWE**: CWE-79
- **OWASP**: A03:2021 - 跨站脚本
- **描述**: 用户输入未转义直接渲染到页面
- **修复建议**: 使用 DOMPurify 或 React 自动转义

### 依赖漏洞

| 包名 | 版本 | 漏洞 | 严重程度 | 修复版本 |
|-----|------|------|---------|---------|
| lodash | 4.17.15 | CVE-2020-8203 | 高 | 4.17.21 |
| axios | 0.19.0 | CVE-2020-28168 | 中 | 0.21.1 |

### 修复优先级
1. [P0] FIND-001: SQL 注入漏洞
2. [P0] FIND-003: 命令注入漏洞
3. [P1] FIND-002: XSS 漏洞
4. [P1] 更新 lodash 到 4.17.21
```

## 漏洞检测规则

### SQL 注入检测
```javascript
// 检测模式
const sqlInjectionPatterns = [
  /`SELECT.*\$\{.*\}/,                    // 模板字符串拼接
  /"SELECT.*"\s*\+\s*\w+/,                // 字符串拼接
  /query\s*\(\s*['"`].*\$\{.*\}.*['"`]\s*\)/, // query 函数拼接
];

// 危险代码示例
const query = `SELECT * FROM users WHERE id = ${userId}`;
const query = "SELECT * FROM users WHERE name = '" + userName + "'";

// 安全代码示例
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);
```

### XSS 检测
```javascript
// 检测模式
const xssPatterns = [
  /\.innerHTML\s*=\s*[^;]*\+/,            // innerHTML 拼接
  /document\.write\s*\(/,                  // document.write
  /dangerouslySetInnerHTML/,               // React 危险设置
];

// 危险代码示例
element.innerHTML = userInput;
<div dangerouslySetInnerHTML={{__html: userInput}} />

// 安全代码示例
element.textContent = userInput;
<div>{userInput}</div>  // React 自动转义
```

### 敏感数据泄露检测
```javascript
// 检测模式
const sensitivePatterns = [
  /password\s*[:=]\s*['"][^'"]+['"]/,      // 硬编码密码
  /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/,   // 硬编码 API Key
  /secret\s*[:=]\s*['"][^'"]+['"]/,        // 硬编码密钥
  /private[_-]?key\s*[:=]\s*['"]/,         // 硬编码私钥
];

// 危险代码示例
const password = "mySecretPassword123";
const apiKey = "sk-abc123xyz";

// 安全代码示例
const password = process.env.PASSWORD;
const apiKey = config.get('apiKey');
```

## CI/CD 集成

### GitHub Actions
```yaml
name: Security Scan

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run SAST Scan
        run: |
          npm install -g semgrep
          semgrep --config auto --json > sast-report.json
          
      - name: Run SCA Scan
        run: |
          npm audit --json > sca-report.json
          
      - name: Upload Reports
        uses: actions/upload-artifact@v3
        with:
          name: security-reports
          path: |
            sast-report.json
            sca-report.json
            
      - name: Check Vulnerabilities
        run: |
          # 如果发现严重漏洞则失败
          if grep -q '"severity":"critical"' sast-report.json; then
            echo "发现严重安全漏洞!"
            exit 1
          fi
```

### GitLab CI
```yaml
security-scan:
  stage: test
  image: node:18
  script:
    - npm ci
    - npm audit --audit-level=high
    - npx semgrep --config auto
  artifacts:
    reports:
      sast: gl-sast-report.json
  rules:
    - if: $CI_PIPELINE_SOURCE == "merge_request_event"
```

## 安全修复指南

### SQL 注入修复
```javascript
// 修复前
app.get('/users', (req, res) => {
  const query = `SELECT * FROM users WHERE id = ${req.query.id}`;
  db.query(query, (err, result) => {
    res.json(result);
  });
});

// 修复后
app.get('/users', (req, res) => {
  const query = 'SELECT * FROM users WHERE id = ?';
  db.query(query, [req.query.id], (err, result) => {
    res.json(result);
  });
});
```

### XSS 修复
```javascript
// 修复前
function renderComment(comment) {
  return `<div class="comment">${comment}</div>`;
}

// 修复后
import DOMPurify from 'dompurify';

function renderComment(comment) {
  const sanitized = DOMPurify.sanitize(comment);
  return `<div class="comment">${sanitized}</div>`;
}
```

### 敏感数据修复
```javascript
// 修复前
const config = {
  database: {
    password: 'hardcoded_password_123'
  }
};

// 修复后
const config = {
  database: {
    password: process.env.DB_PASSWORD
  }
};
```

## 最佳实践

### 1. 扫描频率
- 每次代码提交时运行快速扫描
- 每日运行完整扫描
- 发布前运行全面安全审计

### 2. 漏洞处理
- 严重漏洞立即修复
- 高危漏洞 24 小时内修复
- 中低危漏洞纳入迭代计划

### 3. 安全意识
- 定期进行安全培训
- 建立安全编码规范
- 代码审查关注安全问题

### 4. 持续改进
- 定期更新扫描规则
- 分析误报并优化规则
- 跟踪修复效率指标

## 相关参考

- [安全审查代理](./agent-security-reviewer.md)
- [代码审查代理](./agent-code-reviewer.md)
- [命令系统概述](./commands-overview.md)
