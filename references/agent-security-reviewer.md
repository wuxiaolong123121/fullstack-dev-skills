# 安全审查代理 (Security Reviewer Agent)

## 概述

安全审查代理负责安全漏洞检测、安全最佳实践检查和渗透测试辅助。它基于 OWASP Top 10 和常见安全漏洞模式，自动识别代码中的安全隐患。

## 核心职责

### 1. 漏洞检测
- SQL 注入检测
- XSS 跨站脚本检测
- CSRF 跨站请求伪造检测
- 命令注入检测

### 2. 安全审计
- 认证授权检查
- 敏感数据处理检查
- 加密算法评估
- 权限边界审计

### 3. 合规检查
- OWASP Top 10 检查
- 安全编码规范
- 数据保护法规
- 行业安全标准

## OWASP Top 10 检查项

### A01: 访问控制失效
- [ ] 路由级权限验证
- [ ] 资源级访问控制
- [ ] 角色权限分离
- [ ] IDOR 漏洞检查

### A02: 加密失败
- [ ] 敏感数据加密存储
- [ ] 传输层加密 (HTTPS)
- [ ] 加密算法强度
- [ ] 密钥管理安全

### A03: 注入攻击
- [ ] SQL 注入防护
- [ ] NoSQL 注入防护
- [ ] 命令注入防护
- [ ] LDAP 注入防护

### A04: 不安全设计
- [ ] 威胁建模
- [ ] 安全架构审查
- [ ] 业务逻辑漏洞
- [ ] 竞态条件检查

### A05: 安全配置错误
- [ ] 默认账户检查
- [ ] 错误信息泄露
- [ ] 目录遍历防护
- [ ] 调试信息暴露

### A06: 易受攻击组件
- [ ] 依赖版本检查
- [ ] 已知漏洞扫描
- [ ] 许可证合规
- [ ] 组件更新策略

### A07: 身份认证失败
- [ ] 密码强度要求
- [ ] 暴力破解防护
- [ ] 会话管理安全
- [ ] 多因素认证

### A08: 软件完整性失败
- [ ] CI/CD 安全
- [ ] 代码签名验证
- [ ] 第三方库验证
- [ ] 自动更新安全

### A09: 日志监控失败
- [ ] 安全事件日志
- [ ] 异常行为检测
- [ ] 日志完整性保护
- [ ] 告警机制

### A10: 服务端请求伪造
- [ ] URL 白名单
- [ ] 内网访问限制
- [ ] DNS 重绑定防护
- [ ] 协议限制

## 漏洞检测模式

### SQL 注入检测
```javascript
// 危险模式
const query = "SELECT * FROM users WHERE id = " + userId;
const query = `SELECT * FROM users WHERE name = '${userName}'`;

// 安全模式
const query = "SELECT * FROM users WHERE id = ?";
db.query(query, [userId]);
```

### XSS 检测
```javascript
// 危险模式
element.innerHTML = userInput;
document.write(userInput);

// 安全模式
element.textContent = userInput;
element.innerText = userInput;
// 或使用 DOMPurify
element.innerHTML = DOMPurify.sanitize(userInput);
```

### 命令注入检测
```javascript
// 危险模式
exec(`ls ${userInput}`);
spawn('cmd', ['/c', userInput]);

// 安全模式
exec('ls', [sanitize(userInput)]);
// 或使用参数化调用
spawn('ls', ['--dir', validatedPath]);
```

## 安全审查报告模板

```markdown
## 安全审查报告

### 概览
- **审查范围**: [文件/模块列表]
- **审查时间**: [时间戳]
- **审查标准**: OWASP Top 10 2021
- **风险等级**: [高/中/低]

### 漏洞统计
| 严重程度 | 数量 | 类型 |
|---------|------|------|
| 🔴 严重 | [数量] | SQL注入、RCE等 |
| 🟠 高危 | [数量] | XSS、CSRF等 |
| 🟡 中危 | [数量] | 信息泄露等 |
| 🟢 低危 | [数量] | 配置建议等 |

### 详细漏洞

#### 🔴 VULN-001: SQL 注入漏洞
- **类型**: A03:2021 - 注入攻击
- **位置**: `src/api/users.js:45`
- **描述**: 用户输入直接拼接到 SQL 查询中
- **攻击向量**: 
```
GET /api/users?id=1 OR 1=1--
```
- **影响**: 可获取或修改数据库中的所有数据
- **修复建议**:
```javascript
// 使用参数化查询
const query = "SELECT * FROM users WHERE id = ?";
const result = await db.query(query, [userId]);
```
- **参考**: CWE-89, OWASP A03:2021

### 合规检查结果
| 检查项 | 状态 | 说明 |
|-------|------|------|
| OWASP A01 | ✅ 通过 | 访问控制实现完整 |
| OWASP A02 | ⚠️ 警告 | 部分敏感数据未加密 |
| OWASP A03 | ❌ 失败 | 存在 SQL 注入漏洞 |
| ... | ... | ... |

### 修复优先级
1. [P0] VULN-001: SQL 注入漏洞
2. [P1] VULN-002: XSS 漏洞
3. [P2] VULN-003: 敏感数据明文存储
```

## 安全检查清单

### 输入验证
- [ ] 所有用户输入都经过验证
- [ ] 使用白名单验证而非黑名单
- [ ] 验证数据类型、长度、格式
- [ ] 对特殊字符进行转义

### 输出编码
- [ ] HTML 实体编码
- [ ] URL 编码
- [ ] JavaScript 编码
- [ ] CSS 编码

### 认证安全
- [ ] 密码哈希存储 (bcrypt/argon2)
- [ ] 登录失败限制
- [ ] 会话超时设置
- [ ] 安全的密码重置流程

### 授权安全
- [ ] 最小权限原则
- [ ] 资源级权限检查
- [ ] API 端点权限验证
- [ ] 防止越权访问

### 数据安全
- [ ] 敏感数据加密存储
- [ ] 传输使用 HTTPS
- [ ] 安全的密钥管理
- [ ] 数据脱敏处理

### 错误处理
- [ ] 不暴露敏感错误信息
- [ ] 统一错误响应格式
- [ ] 错误日志记录
- [ ] 异常监控告警

## 常见漏洞修复指南

### SQL 注入
```javascript
// 修复方案
// 1. 使用参数化查询
// 2. 使用 ORM 框架
// 3. 输入验证和白名单

// 使用 Sequelize ORM
const user = await User.findOne({
  where: { id: userId }
});
```

### XSS
```javascript
// 修复方案
// 1. 输出编码
// 2. Content-Security-Policy
// 3. HttpOnly Cookie

// 设置 CSP 头
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self'"
  );
  next();
});
```

### CSRF
```javascript
// 修复方案
// 1. CSRF Token
// 2. SameSite Cookie
// 3. 验证 Referer 头

// 使用 csurf 中间件
const csrf = require('csurf');
app.use(csrf({ cookie: true }));
```

## 最佳实践

### 1. 安全开发流程
- 设计阶段进行威胁建模
- 开发阶段遵循安全编码规范
- 测试阶段进行安全测试
- 部署阶段进行安全配置

### 2. 定期安全审计
- 代码提交时自动扫描
- 定期进行渗透测试
- 依赖漏洞定期检查
- 安全配置定期审查

### 3. 安全事件响应
- 建立漏洞报告渠道
- 制定漏洞修复流程
- 记录安全事件日志
- 定期进行安全培训

## 相关参考

- [代理系统概述](./agents-overview.md)
- [代码审查代理](./agent-code-reviewer.md)
- [安全扫描技能](./skill-security-scan.md)
