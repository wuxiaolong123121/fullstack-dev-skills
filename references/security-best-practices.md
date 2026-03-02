# 安全最佳实践参考

## OWASP Top 10 防护

### 1. 注入攻击防护

```typescript
import { escape } from 'sqlstring'

function safeQuery(userId: string) {
  const sql = `SELECT * FROM users WHERE id = ${escape(userId)}`
  return db.query(sql)
}

function safeQueryPrisma(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId }
  })
}
```

### 2. 身份认证失效防护

```typescript
import bcrypt from 'bcrypt'
import crypto from 'crypto'

const SALT_ROUNDS = 12

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS)
}

async function verifyPassword(
  password: string, 
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex')
}
```

### 3. 敏感数据暴露防护

```typescript
import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  
  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: cipher.getAuthTag().toString('hex')
  }
}

function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    ALGORITHM, 
    KEY, 
    Buffer.from(iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  
  return decrypted
}
```

### 4. XML 外部实体 (XXE) 防护

```typescript
import { XMLParser } from 'fast-xml-parser'

const parser = new XMLParser({
  ignoreAttributes: false,
  allowBooleanAttributes: false,
  parseAttributeValue: false,
  parseNodeValue: false,
  trimValues: true
})

function safeParseXml(xmlString: string) {
  return parser.parse(xmlString)
}
```

### 5. 访问控制失效防护

```typescript
interface User {
  id: string
  role: 'admin' | 'user' | 'guest'
  permissions: string[]
}

function hasPermission(
  user: User, 
  requiredPermission: string
): boolean {
  return user.permissions.includes(requiredPermission)
}

function canAccessResource(
  user: User, 
  resource: { ownerId: string }
): boolean {
  return user.role === 'admin' || user.id === resource.ownerId
}

const authMiddleware = (requiredPermission: string) => {
  return (req, res, next) => {
    if (!hasPermission(req.user, requiredPermission)) {
      return res.status(403).json({ 
        code: 403, 
        message: '权限不足' 
      })
    }
    next()
  }
}
```

### 6. 安全配置错误防护

```typescript
import helmet from 'helmet'
import cors from 'cors'

app.use(helmet())
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || [],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.disable('x-powered-by')
```

### 7. 跨站脚本 (XSS) 防护

```typescript
import DOMPurify from 'isomorphic-dompurify'

function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href']
  })
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  }
  return text.replace(/[&<>"']/g, m => map[m])
}
```

### 8. 不安全的反序列化防护

```typescript
import { safeLoad } from 'js-yaml'

function safeParseYaml(yamlString: string) {
  return safeLoad(yamlString, {
    schema: 'FAILSAFE_SCHEMA',
    json: true
  })
}

function safeJsonParse(jsonString: string) {
  const parsed = JSON.parse(jsonString)
  if (typeof parsed === 'object' && parsed !== null) {
    if (parsed.__proto__ !== Object.prototype) {
      throw new Error('Invalid JSON structure')
    }
  }
  return parsed
}
```

### 9. 日志与监控

```typescript
interface SecurityLog {
  timestamp: Date
  eventType: 'auth_failure' | 'access_denied' | 'suspicious_activity'
  userId?: string
  ip: string
  userAgent: string
  details: Record<string, unknown>
}

function logSecurityEvent(event: SecurityLog) {
  console.error(JSON.stringify(event))
}

function detectBruteForce(
  ip: string, 
  failures: Map<string, number[]>
): boolean {
  const now = Date.now()
  const attempts = failures.get(ip) || []
  const recentAttempts = attempts.filter(t => now - t < 15 * 60 * 1000)
  
  if (recentAttempts.length >= 5) {
    logSecurityEvent({
      timestamp: new Date(),
      eventType: 'suspicious_activity',
      ip,
      userAgent: '',
      details: { reason: 'brute_force_detected', attempts: recentAttempts.length }
    })
    return true
  }
  
  return false
}
```

### 10. 服务端请求伪造 (SSRF) 防护

```typescript
import { URL } from 'url'

const ALLOWED_DOMAINS = ['api.example.com', 'cdn.example.com']

function isAllowedUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString)
    return ALLOWED_DOMAINS.includes(url.hostname)
  } catch {
    return false
  }
}

async function safeFetch(urlString: string) {
  if (!isAllowedUrl(urlString)) {
    throw new Error('URL not allowed')
  }
  
  const url = new URL(urlString)
  
  if (url.hostname === 'localhost' || 
      url.hostname === '127.0.0.1' ||
      url.hostname.startsWith('192.168.') ||
      url.hostname.startsWith('10.') ||
      url.hostname.startsWith('172.')) {
    throw new Error('Internal URLs not allowed')
  }
  
  return fetch(urlString)
}
```

## JWT 安全最佳实践

```typescript
import jwt from 'jsonwebtoken'

interface TokenPayload {
  userId: string
  role: string
  iat: number
  exp: number
  jti: string
}

const JWT_CONFIG = {
  algorithm: 'RS256',
  expiresIn: '15m',
  issuer: 'myapp',
  audience: 'myapp-users'
}

function generateAccessToken(userId: string, role: string): string {
  return jwt.sign(
    { userId, role, jti: crypto.randomUUID() },
    process.env.JWT_PRIVATE_KEY!,
    JWT_CONFIG
  )
}

function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { userId, type: 'refresh', jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  )
}

function verifyToken(token: string): TokenPayload {
  return jwt.verify(token, process.env.JWT_PUBLIC_KEY!, {
    algorithms: ['RS256'],
    issuer: 'myapp',
    audience: 'myapp-users'
  }) as TokenPayload
}
```

## 密码策略

```typescript
interface PasswordPolicy {
  minLength: number
  requireUppercase: boolean
  requireLowercase: boolean
  requireNumbers: boolean
  requireSymbols: boolean
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSymbols: true
}

function validatePassword(
  password: string, 
  policy: PasswordPolicy = DEFAULT_POLICY
): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < policy.minLength) {
    errors.push(`密码长度至少 ${ policy.minLength} 位`)
  }
  
  if (policy.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('密码必须包含大写字母')
  }
  
  if (policy.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('密码必须包含小写字母')
  }
  
  if (policy.requireNumbers && !/\d/.test(password)) {
    errors.push('密码必须包含数字')
  }
  
  if (policy.requireSymbols && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('密码必须包含特殊字符')
  }
  
  return { valid: errors.length === 0, errors }
}
```

## 安全响应头

```typescript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'")
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.removeHeader('X-Powered-By')
  next()
})
```
