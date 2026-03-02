# [安全编码] 参考
> Reference for: fullstack-dev-skills
> Load when: 编写安全相关代码、处理用户输入、实现认证授权、防止安全漏洞

## 核心特性

### OWASP Top 10 防护

| 漏洞类型 | 风险等级 | 防护策略 |
|---------|---------|---------|
| A01:2021 - 访问控制失效 | 高 | 最小权限原则、RBAC、ABAC |
| A02:2021 - 加密失败 | 高 | TLS、敏感数据加密、密钥管理 |
| A03:2021 - 注入 | 高 | 参数化查询、输入验证、ORM |
| A04:2021 - 不安全设计 | 高 | 威胁建模、安全架构审查 |
| A05:2021 - 安全配置错误 | 中 | 安全默认值、配置审计 |
| A06:2021 - 易受攻击组件 | 中 | 依赖扫描、版本管理 |
| A07:2021 - 身份识别失败 | 高 | MFA、会话管理、密码策略 |
| A08:2021 - 软件完整性失败 | 高 | CI/CD安全、签名验证 |
| A09:2021 - 日志监控失败 | 中 | 安全日志、告警机制 |
| A10:2021 - SSRF | 高 | URL白名单、网络隔离 |

### 安全编码原则

1. **最小权限原则**: 只授予必要的权限
2. **纵深防御**: 多层安全控制
3. **安全默认值**: 默认配置应为最安全
4. **输入验证**: 永远不信任用户输入
5. **输出编码**: 防止注入攻击
6. **失败安全**: 错误时保持安全状态

## 最佳实践

### SQL 注入防护

```python
import sqlite3
from typing import Optional, List, Any

class SecureUserRepository:
    """
    安全的用户数据访问层
    
    使用参数化查询防止SQL注入攻击
    """
    
    def __init__(self, db_path: str) -> None:
        """初始化数据库连接"""
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
    
    def find_user_by_id(self, user_id: str) -> Optional[dict]:
        """
        根据ID安全查询用户
        
        Args:
            user_id: 用户ID（UUID格式）
            
        Returns:
            用户信息字典，不存在则返回None
        """
        query = "SELECT id, username, email FROM users WHERE id = ?"
        cursor = self.conn.execute(query, (user_id,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def search_users(self, username_pattern: str, limit: int = 100) -> List[dict]:
        """
        安全搜索用户
        
        Args:
            username_pattern: 用户名搜索模式
            limit: 返回结果数量限制
            
        Returns:
            匹配的用户列表
        """
        query = """
            SELECT id, username, email, created_at 
            FROM users 
            WHERE username LIKE ? 
            ORDER BY created_at DESC 
            LIMIT ?
        """
        safe_pattern = f"%{self._escape_like(username_pattern)}%"
        cursor = self.conn.execute(query, (safe_pattern, limit))
        return [dict(row) for row in cursor.fetchall()]
    
    def _escape_like(self, value: str) -> str:
        """
        转义LIKE查询中的特殊字符
        
        Args:
            value: 原始值
            
        Returns:
            转义后的安全值
        """
        escape_chars = ['%', '_', '\\']
        for char in escape_chars:
            value = value.replace(char, f'\\{char}')
        return value
```

### XSS 防护

```typescript
import DOMPurify from 'dompurify'

/**
 * XSS防护工具类
 * 
 * 提供输入净化和输出编码功能
 */
export class XSSProtection {
  /**
   * 净化HTML内容
   * 
   * @param dirty - 未净化的HTML字符串
   * @param allowedTags - 允许的HTML标签列表
   * @returns 净化后的安全HTML
   */
  static sanitizeHTML(dirty: string, allowedTags?: string[]): string {
    const config = allowedTags 
      ? { ALLOWED_TAGS: allowedTags }
      : { ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p'] }
    
    return DOMPurify.sanitize(dirty, config)
  }

  /**
   * HTML实体编码
   * 
   * @param text - 需要编码的文本
   * @returns 编码后的安全文本
   */
  static htmlEncode(text: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    }
    
    return text.replace(/[&<>"'/]/g, char => entities[char])
  }

  /**
   * JavaScript字符串编码
   * 
   * @param value - 需要编码的值
   * @returns 编码后的安全字符串
   */
  static jsEncode(value: string): string {
    const replacements: Record<string, string> = {
      '\\': '\\\\',
      "'": "\\'",
      '"': '\\"',
      '\n': '\\n',
      '\r': '\\r',
      '<': '\\x3C',
      '>': '\\x3E',
      '&': '\\x26'
    }
    
    return value.replace(/[\\'"<>&\n\r]/g, char => replacements[char])
  }

  /**
   * URL编码
   * 
   * @param value - 需要编码的URL值
   * @returns 编码后的安全URL
   */
  static urlEncode(value: string): string {
    return encodeURIComponent(value)
  }
}

/**
 * 安全渲染组件示例
 */
export function useSafeRender() {
  /**
   * 安全渲染用户内容
   * 
   * @param content - 用户输入的内容
   * @returns 安全的渲染配置
   */
  const renderUserContent = (content: string) => {
    return {
      __html: XSSProtection.sanitizeHTML(content)
    }
  }

  return { renderUserContent }
}
```

### CSRF 防护

```typescript
import crypto from 'crypto'

/**
 * CSRF防护中间件
 * 
 * 实现双重提交Cookie模式的CSRF防护
 */
export class CSRFProtection {
  private tokenSecret: string
  private tokenExpiry: number

  /**
   * 初始化CSRF防护
   * 
   * @param secret - 签名密钥
   * @param expiry - Token有效期（毫秒）
   */
  constructor(secret: string, expiry: number = 3600000) {
    this.tokenSecret = secret
    this.tokenExpiry = expiry
  }

  /**
   * 生成CSRF Token
   * 
   * @param sessionId - 会话ID
   * @returns CSRF Token和过期时间
   */
  generateToken(sessionId: string): { token: string; expires: number } {
    const timestamp = Date.now()
    const expires = timestamp + this.tokenExpiry
    const payload = `${sessionId}:${timestamp}`
    const signature = this.sign(payload)
    
    return {
      token: `${payload}:${signature}`,
      expires
    }
  }

  /**
   * 验证CSRF Token
   * 
   * @param token - 待验证的Token
   * @param sessionId - 会话ID
   * @returns 验证结果
   */
  validateToken(token: string, sessionId: string): boolean {
    const parts = token.split(':')
    if (parts.length !== 3) return false

    const [tokenSessionId, timestamp, signature] = parts
    const expectedSignature = this.sign(`${tokenSessionId}:${timestamp}`)
    
    if (signature !== expectedSignature) return false
    if (tokenSessionId !== sessionId) return false
    
    const tokenTime = parseInt(timestamp, 10)
    if (Date.now() - tokenTime > this.tokenExpiry) return false
    
    return true
  }

  /**
   * 签名数据
   * 
   * @param data - 待签名数据
   * @returns HMAC签名
   */
  private sign(data: string): string {
    return crypto
      .createHmac('sha256', this.tokenSecret)
      .update(data)
      .digest('hex')
  }
}

/**
 * Express CSRF中间件
 */
export function csrfMiddleware(csrf: CSRFProtection) {
  return (req: any, res: any, next: any) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next()
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf
    const sessionId = req.session?.id

    if (!token || !sessionId || !csrf.validateToken(token, sessionId)) {
      return res.status(403).json({
        code: 403,
        message: 'CSRF验证失败'
      })
    }

    next()
  }
}
```

### 安全认证实现

```typescript
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'

/**
 * 安全认证服务
 * 
 * 提供密码哈希、验证和JWT令牌管理
 */
export class SecureAuthService {
  private jwtSecret: string
  private saltRounds: number = 12
  private tokenExpiry: string = '15m'
  private refreshExpiry: string = '7d'

  /**
   * 初始化认证服务
   * 
   * @param jwtSecret - JWT签名密钥
   */
  constructor(jwtSecret: string) {
    this.jwtSecret = jwtSecret
  }

  /**
   * 安全哈希密码
   * 
   * @param password - 明文密码
   * @returns 哈希后的密码
   */
  async hashPassword(password: string): Promise<string> {
    this.validatePasswordStrength(password)
    return bcrypt.hash(password, this.saltRounds)
  }

  /**
   * 验证密码
   * 
   * @param password - 明文密码
   * @param hash - 存储的哈希值
   * @returns 验证结果
   */
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash)
  }

  /**
   * 生成访问令牌
   * 
   * @param payload - 令牌载荷
   * @returns JWT访问令牌
   */
  generateAccessToken(payload: object): string {
    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.tokenExpiry,
      algorithm: 'HS256'
    })
  }

  /**
   * 生成刷新令牌
   * 
   * @param userId - 用户ID
   * @returns 刷新令牌
   */
  generateRefreshToken(userId: string): string {
    return jwt.sign(
      { userId, type: 'refresh' },
      this.jwtSecret,
      { expiresIn: this.refreshExpiry }
    )
  }

  /**
   * 验证JWT令牌
   * 
   * @param token - JWT令牌
   * @returns 解码后的载荷
   */
  verifyToken(token: string): object | null {
    try {
      return jwt.verify(token, this.jwtSecret, {
        algorithms: ['HS256']
      }) as object
    } catch {
      return null
    }
  }

  /**
   * 验证密码强度
   * 
   * @param password - 待验证密码
   * @throws 密码不符合要求时抛出错误
   */
  private validatePasswordStrength(password: string): void {
    const minLength = 12
    const rules = [
      { test: (p: string) => p.length >= minLength, message: `密码长度至少${minLength}位` },
      { test: (p: string) => /[A-Z]/.test(p), message: '密码需包含大写字母' },
      { test: (p: string) => /[a-z]/.test(p), message: '密码需包含小写字母' },
      { test: (p: string) => /[0-9]/.test(p), message: '密码需包含数字' },
      { test: (p: string) => /[!@#$%^&*]/.test(p), message: '密码需包含特殊字符' }
    ]

    for (const rule of rules) {
      if (!rule.test(password)) {
        throw new Error(rule.message)
      }
    }
  }
}
```

### 敏感数据处理

```python
import os
import hashlib
import secrets
from typing import Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class SensitiveDataHandler:
    """
    敏感数据安全处理器
    
    提供加密、脱敏、安全存储等功能
    """
    
    def __init__(self, encryption_key: Optional[bytes] = None) -> None:
        """
        初始化数据处理器
        
        Args:
            encryption_key: 加密密钥，不提供则自动生成
        """
        self.fernet = Fernet(encryption_key or Fernet.generate_key())
    
    def encrypt(self, plaintext: str) -> str:
        """
        加密敏感数据
        
        Args:
            plaintext: 明文数据
            
        Returns:
            加密后的Base64字符串
        """
        return self.fernet.encrypt(plaintext.encode()).decode()
    
    def decrypt(self, ciphertext: str) -> str:
        """
        解密敏感数据
        
        Args:
            ciphertext: 加密数据
            
        Returns:
            解密后的明文
        """
        return self.fernet.decrypt(ciphertext.encode()).decode()
    
    @staticmethod
    def mask_email(email: str) -> str:
        """
        邮箱脱敏
        
        Args:
            email: 原始邮箱
            
        Returns:
            脱敏后的邮箱（如：a***@example.com）
        """
        if '@' not in email:
            return email
        
        local, domain = email.split('@', 1)
        if len(local) <= 1:
            return f'***@{domain}'
        
        masked = local[0] + '***'
        return f'{masked}@{domain}'
    
    @staticmethod
    def mask_phone(phone: str) -> str:
        """
        手机号脱敏
        
        Args:
            phone: 原始手机号
            
        Returns:
            脱敏后的手机号（如：138****8888）
        """
        if len(phone) < 7:
            return phone
        
        return phone[:3] + '****' + phone[-4:]
    
    @staticmethod
    def mask_id_card(id_card: str) -> str:
        """
        身份证号脱敏
        
        Args:
            id_card: 原始身份证号
            
        Returns:
            脱敏后的身份证号（如：110***********1234）
        """
        if len(id_card) < 8:
            return id_card
        
        return id_card[:3] + '***********' + id_card[-4:]
    
    @staticmethod
    def secure_hash(data: str, salt: Optional[str] = None) -> str:
        """
        安全哈希
        
        Args:
            data: 原始数据
            salt: 盐值，不提供则自动生成
            
        Returns:
            哈希结果（包含盐值）
        """
        if salt is None:
            salt = secrets.token_hex(16)
        
        hash_value = hashlib.pbkdf2_hmac(
            'sha256',
            data.encode(),
            salt.encode(),
            100000
        ).hex()
        
        return f'{salt}:{hash_value}'
    
    @staticmethod
    def verify_hash(data: str, hashed: str) -> bool:
        """
        验证哈希值
        
        Args:
            data: 原始数据
            hashed: 存储的哈希值
            
        Returns:
            验证结果
        """
        try:
            salt, hash_value = hashed.split(':')
            new_hash = hashlib.pbkdf2_hmac(
                'sha256',
                data.encode(),
                salt.encode(),
                100000
            ).hex()
            return secrets.compare_digest(hash_value, new_hash)
        except ValueError:
            return False
```

## Quick Reference

| 安全威胁 | 防护措施 | 代码示例 |
|---------|---------|---------|
| SQL注入 | 参数化查询 | `cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))` |
| XSS | 输出编码 | `DOMPurify.sanitize(userInput)` |
| CSRF | Token验证 | `X-CSRF-Token` Header |
| 密码泄露 | bcrypt哈希 | `bcrypt.hash(password, 12)` |
| 会话劫持 | 安全Cookie | `HttpOnly; Secure; SameSite=Strict` |
| 敏感数据 | 加密存储 | `Fernet.encrypt(data)` |
| 暴力破解 | 速率限制 | `express-rate-limit` |
| 信息泄露 | 错误处理 | 不返回详细错误信息 |

### 安全检查清单

- [ ] 所有用户输入都经过验证和净化
- [ ] 使用参数化查询防止SQL注入
- [ ] 输出进行适当的编码
- [ ] 密码使用强哈希算法存储
- [ ] 敏感数据加密存储
- [ ] 实现CSRF Token验证
- [ ] 使用HTTPS传输
- [ ] 实现适当的访问控制
- [ ] 安全的会话管理
- [ ] 错误信息不泄露敏感信息
