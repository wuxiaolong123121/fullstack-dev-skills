# 安全规则参考

安全编码核心规则、漏洞防护策略和安全检查清单，用于构建安全可靠的应用程序。

## When to Activate

- 编写安全相关代码
- 处理用户输入
- 实现认证授权功能
- 进行安全代码审查
- 防止安全漏洞

## Core Principles

### 1. 最小权限原则

只授予完成任务所需的最小权限，避免过度授权。

```python
from typing import List, Optional

class PermissionManager:
    """
    权限管理器
    
    实现最小权限原则的权限控制系统
    """
    
    def __init__(self) -> None:
        """初始化权限管理器"""
        self._user_permissions: dict[str, set[str]] = {}
    
    def grant_permission(self, user_id: str, permission: str) -> None:
        """
        授予用户指定权限
        
        Args:
            user_id: 用户ID
            permission: 权限标识
        """
        if user_id not in self._user_permissions:
            self._user_permissions[user_id] = set()
        self._user_permissions[user_id].add(permission)
    
    def has_permission(self, user_id: str, required_permission: str) -> bool:
        """
        检查用户是否拥有指定权限
        
        Args:
            user_id: 用户ID
            required_permission: 所需权限
            
        Returns:
            是否拥有权限
        """
        user_perms = self._user_permissions.get(user_id, set())
        return required_permission in user_perms
```

### 2. 纵深防御

多层安全控制，单一防线失效不影响整体安全。

```typescript
import rateLimit from 'express-rate-limit'
import helmet from 'helmet'

/**
 * 纵深防御中间件配置
 * 
 * 多层安全防护策略
 */
export class DefenseInDepth {
  /**
   * 安全头部中间件
   * 
   * @returns Helmet安全头部配置
   */
  static securityHeaders() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
          upgradeInsecureRequests: []
        }
      },
      crossOriginEmbedderPolicy: true,
      crossOriginOpenerPolicy: true,
      crossOriginResourcePolicy: { policy: 'same-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: { permittedPolicies: 'none' },
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      xssFilter: true
    })
  }

  /**
   * 速率限制中间件
   * 
   * @param windowMs - 时间窗口（毫秒）
   * @param max - 最大请求数
   * @returns 速率限制配置
   */
  static rateLimiter(windowMs: number = 15 * 60 * 1000, max: number = 100) {
    return rateLimit({
      windowMs,
      max,
      standardHeaders: true,
      legacyHeaders: false,
      message: { code: 429, message: '请求过于频繁，请稍后再试' }
    })
  }
}
```

### 3. 安全默认值

默认配置应为最安全选项，需要显式操作才能降低安全性。

```python
from dataclasses import dataclass, field
from typing import Literal

@dataclass
class SecurityConfig:
    """
    安全配置类
    
    所有默认值均为最安全配置
    """
    https_only: bool = True
    secure_cookies: bool = True
    same_site_cookies: Literal['Strict', 'Lax', 'None'] = 'Strict'
    session_timeout_minutes: int = 30
    max_login_attempts: int = 5
    password_min_length: int = 12
    require_mfa: bool = True
    log_security_events: bool = True
    allowed_origins: list[str] = field(default_factory=list)
    
    def validate(self) -> list[str]:
        """
        验证配置安全性
        
        Returns:
            配置警告列表
        """
        warnings = []
        
        if not self.https_only:
            warnings.append('警告：HTTPS未启用，数据传输不安全')
        
        if self.same_site_cookies == 'None':
            warnings.append('警告：SameSite=None 可能导致CSRF风险')
        
        if self.session_timeout_minutes > 60:
            warnings.append('警告：会话超时时间过长')
        
        if not self.allowed_origins:
            warnings.append('警告：未配置允许的源列表')
        
        return warnings
```

### 4. 永不信任用户输入

所有用户输入都必须经过验证和净化。

```typescript
import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

/**
 * 输入验证器
 * 
 * 对所有用户输入进行严格验证
 */
export class InputValidator {
  /**
   * 用户注册数据验证模式
   */
  static readonly userRegistrationSchema = z.object({
    username: z.string()
      .min(3, '用户名至少3个字符')
      .max(50, '用户名最多50个字符')
      .regex(/^[a-zA-Z0-9_-]+$/, '用户名只能包含字母、数字、下划线和连字符'),
    
    email: z.string()
      .email('邮箱格式不正确')
      .max(255, '邮箱最多255个字符'),
    
    password: z.string()
      .min(12, '密码至少12个字符')
      .max(128, '密码最多128个字符')
      .regex(/[A-Z]/, '密码必须包含大写字母')
      .regex(/[a-z]/, '密码必须包含小写字母')
      .regex(/[0-9]/, '密码必须包含数字')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, '密码必须包含特殊字符'),
    
    age: z.number()
      .int('年龄必须是整数')
      .min(1, '年龄必须大于0')
      .max(150, '年龄必须小于150')
      .optional()
  })

  /**
   * 净化HTML内容
   * 
   * @param dirty - 未净化的HTML
   * @returns 净化后的安全HTML
   */
  static sanitizeHtml(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href', 'title'],
      ALLOW_DATA_ATTR: false
    })
  }

  /**
   * 验证并净化输入
   * 
   * @param data - 原始输入数据
   * @param schema - Zod验证模式
   * @returns 验证结果
   */
  static validate<T>(data: unknown, schema: z.ZodSchema<T>): 
    { success: true; data: T } | { success: false; errors: string[] } {
    const result = schema.safeParse(data)
    
    if (result.success) {
      return { success: true, data: result.data }
    }
    
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
    return { success: false, errors }
  }
}
```

## OWASP Top 10 安全检查清单

### A01:2021 - 访问控制失效

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否实现最小权限原则 | 高 | 审查权限分配逻辑 |
| 是否存在越权访问漏洞 | 高 | 测试水平/垂直越权 |
| API是否有适当的授权检查 | 高 | 审查API端点权限 |
| 是否存在IDOR漏洞 | 高 | 测试资源访问控制 |
| 会话管理是否安全 | 高 | 检查会话配置 |

```python
from functools import wraps
from typing import Callable, TypeVar, ParamSpec

P = ParamSpec('P')
T = TypeVar('T')

def require_permission(permission: str) -> Callable[[Callable[P, T]], Callable[P, T]]:
    """
    权限检查装饰器
    
    Args:
        permission: 所需权限标识
        
    Returns:
        装饰后的函数
    """
    def decorator(func: Callable[P, T]) -> Callable[P, T]:
        @wraps(func)
        def wrapper(*args: P.args, **kwargs: P.kwargs) -> T:
            user = kwargs.get('current_user') or (args[0] if args else None)
            
            if not user:
                raise PermissionError('未登录')
            
            if not hasattr(user, 'permissions'):
                raise PermissionError('用户权限信息缺失')
            
            if permission not in user.permissions:
                raise PermissionError(f'缺少必要权限: {permission}')
            
            return func(*args, **kwargs)
        return wrapper
    return decorator

def check_resource_access(user_id: str, resource_owner_id: str, user_role: str) -> bool:
    """
    检查资源访问权限
    
    Args:
        user_id: 当前用户ID
        resource_owner_id: 资源所有者ID
        user_role: 用户角色
        
    Returns:
        是否有访问权限
    """
    if user_role == 'admin':
        return True
    
    return user_id == resource_owner_id
```

### A02:2021 - 加密失败

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 敏感数据是否加密存储 | 高 | 检查数据库字段 |
| 是否使用HTTPS传输 | 高 | 检查TLS配置 |
| 密钥管理是否安全 | 高 | 审查密钥存储方式 |
| 加密算法是否安全 | 高 | 检查算法选择 |
| 是否存在弱加密 | 中 | 扫描代码库 |

```python
import os
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from typing import Optional

class SecureEncryption:
    """
    安全加密工具类
    
    使用AES-256-GCM进行加密
    """
    
    def __init__(self, key: Optional[bytes] = None) -> None:
        """
        初始化加密器
        
        Args:
            key: 加密密钥（32字节），不提供则自动生成
        """
        self.key = key or AESGCM.generate_key(bit_length=256)
        self.aesgcm = AESGCM(self.key)
    
    def encrypt(self, plaintext: str, associated_data: Optional[bytes] = None) -> dict[str, str]:
        """
        加密数据
        
        Args:
            plaintext: 明文数据
            associated_data: 关联数据（用于认证）
            
        Returns:
            包含密文、nonce和tag的字典
        """
        nonce = secrets.token_bytes(12)
        ciphertext = self.aesgcm.encrypt(
            nonce,
            plaintext.encode('utf-8'),
            associated_data
        )
        
        return {
            'ciphertext': ciphertext[:-16].hex(),
            'nonce': nonce.hex(),
            'tag': ciphertext[-16:].hex()
        }
    
    def decrypt(
        self, 
        ciphertext: str, 
        nonce: str, 
        tag: str,
        associated_data: Optional[bytes] = None
    ) -> str:
        """
        解密数据
        
        Args:
            ciphertext: 密文（十六进制）
            nonce: 随机数（十六进制）
            tag: 认证标签（十六进制）
            associated_data: 关联数据
            
        Returns:
            解密后的明文
        """
        full_ciphertext = bytes.fromhex(ciphertext) + bytes.fromhex(tag)
        plaintext = self.aesgcm.decrypt(
            bytes.fromhex(nonce),
            full_ciphertext,
            associated_data
        )
        
        return plaintext.decode('utf-8')
```

### A03:2021 - 注入攻击

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否使用参数化查询 | 高 | 审查SQL代码 |
| 是否存在SQL注入 | 高 | 渗透测试 |
| 是否存在命令注入 | 高 | 检查系统调用 |
| 是否存在LDAP注入 | 中 | 审查LDAP查询 |
| 是否存在NoSQL注入 | 中 | 检查NoSQL操作 |

```python
import sqlite3
import subprocess
import shlex
from typing import Optional, List, Any

class SecureQueries:
    """
    安全查询类
    
    使用参数化查询防止注入攻击
    """
    
    def __init__(self, db_path: str) -> None:
        """
        初始化数据库连接
        
        Args:
            db_path: 数据库文件路径
        """
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
    
    def find_user_by_email(self, email: str) -> Optional[dict]:
        """
        根据邮箱查询用户
        
        Args:
            email: 用户邮箱
            
        Returns:
            用户信息字典
        """
        query = "SELECT id, username, email FROM users WHERE email = ?"
        cursor = self.conn.execute(query, (email,))
        row = cursor.fetchone()
        return dict(row) if row else None
    
    def search_products(
        self, 
        category: str, 
        min_price: float, 
        max_price: float,
        limit: int = 50
    ) -> List[dict]:
        """
        安全搜索产品
        
        Args:
            category: 产品类别
            min_price: 最低价格
            max_price: 最高价格
            limit: 返回数量限制
            
        Returns:
            产品列表
        """
        query = """
            SELECT id, name, price, category 
            FROM products 
            WHERE category = ? AND price BETWEEN ? AND ?
            ORDER BY price ASC
            LIMIT ?
        """
        cursor = self.conn.execute(query, (category, min_price, max_price, limit))
        return [dict(row) for row in cursor.fetchall()]

class SecureCommandExecutor:
    """
    安全命令执行器
    
    防止命令注入攻击
    """
    
    @staticmethod
    def execute_command(command: List[str], timeout: int = 30) -> str:
        """
        安全执行系统命令
        
        Args:
            command: 命令及参数列表
            timeout: 超时时间（秒）
            
        Returns:
            命令输出
            
        Raises:
            ValueError: 命令格式无效
            subprocess.TimeoutExpired: 执行超时
        """
        if not command:
            raise ValueError('命令不能为空')
        
        allowed_commands = {'ls', 'cat', 'grep', 'find', 'wc'}
        
        cmd_name = command[0].split('/')[-1] if '/' in command[0] else command[0]
        
        if cmd_name not in allowed_commands:
            raise ValueError(f'不允许执行的命令: {cmd_name}')
        
        result = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout,
            shell=False
        )
        
        if result.returncode != 0:
            raise RuntimeError(f'命令执行失败: {result.stderr}')
        
        return result.stdout
```

### A04:2021 - 不安全设计

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否进行威胁建模 | 高 | 审查设计文档 |
| 是否实现安全架构 | 高 | 架构审查 |
| 业务逻辑是否安全 | 高 | 业务流程测试 |
| 是否有安全需求 | 高 | 需求审查 |
| 是否考虑边界情况 | 中 | 边界测试 |

```typescript
/**
 * 安全设计模式示例
 * 
 * 实现安全的业务流程
 */
export class SecureBusinessFlow {
  private readonly MAX_TRANSFER_AMOUNT = 100000
  private readonly DAILY_LIMIT = 500000

  /**
   * 安全转账流程
   * 
   * @param fromUserId - 转出用户ID
   * @param toUserId - 转入用户ID
   * @param amount - 转账金额
   * @returns 转账结果
   */
  async transfer(
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<{ success: boolean; transactionId?: string; error?: string }> {
    if (amount <= 0) {
      return { success: false, error: '转账金额必须大于0' }
    }

    if (amount > this.MAX_TRANSFER_AMOUNT) {
      return { success: false, error: '单笔转账金额超出限制' }
    }

    if (fromUserId === toUserId) {
      return { success: false, error: '不能转账给自己' }
    }

    const dailyTotal = await this.getDailyTransferTotal(fromUserId)
    if (dailyTotal + amount > this.DAILY_LIMIT) {
      return { success: false, error: '超出每日转账限额' }
    }

    const balance = await this.getUserBalance(fromUserId)
    if (balance < amount) {
      return { success: false, error: '余额不足' }
    }

    const transactionId = await this.executeTransfer(fromUserId, toUserId, amount)
    
    await this.logTransaction({
      transactionId,
      fromUserId,
      toUserId,
      amount,
      timestamp: new Date()
    })

    return { success: true, transactionId }
  }

  private async getDailyTransferTotal(userId: string): Promise<number> {
    return 0
  }

  private async getUserBalance(userId: string): Promise<number> {
    return 0
  }

  private async executeTransfer(
    fromUserId: string,
    toUserId: string,
    amount: number
  ): Promise<string> {
    return 'tx_' + Date.now()
  }

  private async logTransaction(data: object): Promise<void> {
    console.log('Transaction:', data)
  }
}
```

### A05:2021 - 安全配置错误

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否移除默认凭据 | 高 | 检查配置文件 |
| 是否关闭调试模式 | 高 | 检查环境配置 |
| 是否隐藏错误详情 | 高 | 测试错误响应 |
| 是否禁用不必要功能 | 中 | 配置审计 |
| 目录列表是否禁用 | 中 | 测试目录访问 |

```python
import os
from typing import Optional

class SecureConfig:
    """
    安全配置管理器
    
    确保配置安全正确
    """
    
    REQUIRED_ENV_VARS = [
        'DATABASE_URL',
        'SECRET_KEY',
        'ENCRYPTION_KEY',
        'JWT_SECRET'
    ]
    
    FORBIDDEN_VALUES = [
        'secret',
        'password',
        'admin',
        'test',
        'development',
        'changeme'
    ]
    
    @classmethod
    def validate(cls) -> list[str]:
        """
        验证配置安全性
        
        Returns:
            配置问题列表
        """
        issues = []
        
        for var in cls.REQUIRED_ENV_VARS:
            value = os.getenv(var)
            if not value:
                issues.append(f'缺少必要环境变量: {var}')
                continue
            
            lower_value = value.lower()
            for forbidden in cls.FORBIDDEN_VALUES:
                if forbidden in lower_value:
                    issues.append(f'{var} 包含不安全值: {forbidden}')
        
        if os.getenv('DEBUG', 'false').lower() == 'true':
            issues.append('DEBUG模式已启用，生产环境应禁用')
        
        if os.getenv('ALLOWED_HOSTS') == '*':
            issues.append('ALLOWED_HOSTS 设置为 *，存在安全风险')
        
        return issues
    
    @classmethod
    def get_secure_headers(cls) -> dict[str, str]:
        """
        获取安全响应头
        
        Returns:
            安全响应头字典
        """
        return {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
            'Content-Security-Policy': "default-src 'self'",
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
        }
```

### A06:2021 - 易受攻击组件

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 依赖是否有已知漏洞 | 高 | 依赖扫描工具 |
| 是否使用过时版本 | 中 | 版本检查 |
| 是否有不必要依赖 | 中 | 依赖审计 |
| 许可证是否合规 | 低 | 许可证扫描 |

```bash
# 安全扫描命令

# Node.js 依赖安全检查
npm audit
npm audit fix
yarn audit

# Python 依赖安全检查
pip-audit
safety check
pip install safety && safety check -r requirements.txt

# Java 依赖检查
mvn dependency-check:check
gradle dependencyCheckAnalyze

# 通用漏洞扫描
snyk test
trivy fs .
grype dir:.
```

### A07:2021 - 身份识别失败

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否实现多因素认证 | 高 | 功能测试 |
| 密码策略是否安全 | 高 | 策略审查 |
| 会话管理是否安全 | 高 | 会话测试 |
| 是否有暴力破解防护 | 高 | 渗透测试 |
| 密码恢复是否安全 | 中 | 流程测试 |

```python
import secrets
import hashlib
import bcrypt
from typing import Optional, Tuple
from datetime import datetime, timedelta
from dataclasses import dataclass, field

@dataclass
class LoginAttempt:
    """登录尝试记录"""
    ip: str
    timestamp: datetime
    success: bool

@dataclass
class UserSession:
    """用户会话"""
    session_id: str
    user_id: str
    created_at: datetime
    expires_at: datetime
    ip_address: str
    user_agent: str
    mfa_verified: bool = False

class SecureAuthentication:
    """
    安全认证服务
    
    实现安全的身份认证机制
    """
    
    MAX_LOGIN_ATTEMPTS = 5
    LOCKOUT_DURATION = timedelta(minutes=15)
    SESSION_DURATION = timedelta(minutes=30)
    
    def __init__(self) -> None:
        """初始化认证服务"""
        self._login_attempts: dict[str, list[LoginAttempt]] = {}
        self._sessions: dict[str, UserSession] = {}
        self._mfa_codes: dict[str, str] = {}
    
    def check_brute_force(self, ip: str) -> bool:
        """
        检查是否触发暴力破解防护
        
        Args:
            ip: 客户端IP地址
            
        Returns:
            True表示被锁定，需要等待
        """
        attempts = self._login_attempts.get(ip, [])
        recent_attempts = [
            a for a in attempts
            if datetime.now() - a.timestamp < self.LOCKOUT_DURATION
        ]
        
        failed_attempts = [a for a in recent_attempts if not a.success]
        
        return len(failed_attempts) >= self.MAX_LOGIN_ATTEMPTS
    
    def record_login_attempt(self, ip: str, success: bool) -> None:
        """
        记录登录尝试
        
        Args:
            ip: 客户端IP地址
            success: 是否成功
        """
        if ip not in self._login_attempts:
            self._login_attempts[ip] = []
        
        self._login_attempts[ip].append(LoginAttempt(
            ip=ip,
            timestamp=datetime.now(),
            success=success
        ))
    
    async def authenticate(
        self, 
        username: str, 
        password: str,
        ip: str,
        user_agent: str
    ) -> Tuple[bool, Optional[str], Optional[str]]:
        """
        用户认证
        
        Args:
            username: 用户名
            password: 密码
            ip: 客户端IP
            user_agent: 客户端UA
            
        Returns:
            (成功标志, 会话ID, 错误信息)
        """
        if self.check_brute_force(ip):
            return False, None, '登录尝试次数过多，请稍后再试'
        
        user = await self._find_user(username)
        
        if not user:
            self.record_login_attempt(ip, False)
            return False, None, '用户名或密码错误'
        
        if not await self._verify_password(password, user['password_hash']):
            self.record_login_attempt(ip, False)
            return False, None, '用户名或密码错误'
        
        if user.get('require_mfa', False):
            mfa_code = self._generate_mfa_code(user['id'])
            return True, None, f'需要MFA验证，验证码: {mfa_code}'
        
        self.record_login_attempt(ip, True)
        
        session = self._create_session(user['id'], ip, user_agent)
        
        return True, session.session_id, None
    
    def _create_session(self, user_id: str, ip: str, user_agent: str) -> UserSession:
        """
        创建用户会话
        
        Args:
            user_id: 用户ID
            ip: 客户端IP
            user_agent: 客户端UA
            
        Returns:
            用户会话对象
        """
        session_id = secrets.token_urlsafe(32)
        now = datetime.now()
        
        session = UserSession(
            session_id=session_id,
            user_id=user_id,
            created_at=now,
            expires_at=now + self.SESSION_DURATION,
            ip_address=ip,
            user_agent=user_agent
        )
        
        self._sessions[session_id] = session
        return session
    
    def _generate_mfa_code(self, user_id: str) -> str:
        """
        生成MFA验证码
        
        Args:
            user_id: 用户ID
            
        Returns:
            6位验证码
        """
        code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        self._mfa_codes[user_id] = code
        return code
    
    async def _find_user(self, username: str) -> Optional[dict]:
        """查找用户（示例实现）"""
        return None
    
    async def _verify_password(self, password: str, hash: str) -> bool:
        """验证密码"""
        return bcrypt.checkpw(password.encode(), hash.encode())
```

### A08:2021 - 软件完整性失败

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| CI/CD是否安全 | 高 | 流程审查 |
| 是否验证代码签名 | 高 | 签名检查 |
| 是否使用可信源 | 中 | 源验证 |
| 自动更新是否安全 | 中 | 更新机制审查 |

```yaml
# 安全CI/CD配置示例

name: Secure CI/CD Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  security-check:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Verify commit signatures
        run: |
          git verify-commit HEAD || exit 1

      - name: Run dependency scan
        run: |
          npm audit --audit-level=high
          npm audit fix --dry-run

      - name: Run SAST scan
        uses: github/codeql-action/analyze@v2
        with:
          languages: javascript, typescript

      - name: Run container scan
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'HIGH,CRITICAL'

      - name: Check secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
```

### A09:2021 - 日志监控失败

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否记录安全事件 | 高 | 日志审查 |
| 是否有告警机制 | 高 | 告警测试 |
| 日志是否完整 | 中 | 日志分析 |
| 日志是否安全存储 | 中 | 存储检查 |

```python
import logging
import json
from datetime import datetime
from typing import Any, Optional
from enum import Enum
from dataclasses import dataclass, asdict

class SecurityEventType(Enum):
    """安全事件类型"""
    LOGIN_SUCCESS = 'login_success'
    LOGIN_FAILURE = 'login_failure'
    LOGOUT = 'logout'
    PERMISSION_DENIED = 'permission_denied'
    SUSPICIOUS_ACTIVITY = 'suspicious_activity'
    DATA_ACCESS = 'data_access'
    DATA_MODIFICATION = 'data_modification'
    CONFIG_CHANGE = 'config_change'

@dataclass
class SecurityLog:
    """安全日志记录"""
    timestamp: str
    event_type: str
    user_id: Optional[str]
    ip_address: str
    user_agent: str
    resource: Optional[str]
    action: str
    result: str
    details: dict[str, Any]

class SecurityLogger:
    """
    安全日志记录器
    
    记录所有安全相关事件
    """
    
    def __init__(self, log_file: str = 'security.log') -> None:
        """
        初始化日志记录器
        
        Args:
            log_file: 日志文件路径
        """
        self.logger = logging.getLogger('security')
        self.logger.setLevel(logging.INFO)
        
        handler = logging.FileHandler(log_file)
        handler.setFormatter(logging.Formatter('%(message)s'))
        self.logger.addHandler(handler)
    
    def log_event(
        self,
        event_type: SecurityEventType,
        user_id: Optional[str],
        ip_address: str,
        user_agent: str,
        resource: Optional[str],
        action: str,
        result: str,
        details: Optional[dict[str, Any]] = None
    ) -> None:
        """
        记录安全事件
        
        Args:
            event_type: 事件类型
            user_id: 用户ID
            ip_address: IP地址
            user_agent: 用户代理
            resource: 访问资源
            action: 执行动作
            result: 执行结果
            details: 详细信息
        """
        log_entry = SecurityLog(
            timestamp=datetime.utcnow().isoformat(),
            event_type=event_type.value,
            user_id=user_id,
            ip_address=ip_address,
            user_agent=user_agent,
            resource=resource,
            action=action,
            result=result,
            details=details or {}
        )
        
        self.logger.info(json.dumps(asdict(log_entry)))
    
    def log_login_success(
        self, 
        user_id: str, 
        ip: str, 
        user_agent: str
    ) -> None:
        """记录登录成功"""
        self.log_event(
            event_type=SecurityEventType.LOGIN_SUCCESS,
            user_id=user_id,
            ip_address=ip,
            user_agent=user_agent,
            resource='auth',
            action='login',
            result='success'
        )
    
    def log_login_failure(
        self, 
        ip: str, 
        user_agent: str, 
        reason: str
    ) -> None:
        """记录登录失败"""
        self.log_event(
            event_type=SecurityEventType.LOGIN_FAILURE,
            user_id=None,
            ip_address=ip,
            user_agent=user_agent,
            resource='auth',
            action='login',
            result='failure',
            details={'reason': reason}
        )
    
    def log_permission_denied(
        self,
        user_id: str,
        ip: str,
        user_agent: str,
        resource: str,
        required_permission: str
    ) -> None:
        """记录权限拒绝"""
        self.log_event(
            event_type=SecurityEventType.PERMISSION_DENIED,
            user_id=user_id,
            ip_address=ip,
            user_agent=user_agent,
            resource=resource,
            action='access',
            result='denied',
            details={'required_permission': required_permission}
        )
```

### A10:2021 - 服务端请求伪造 (SSRF)

| 检查项 | 风险等级 | 检查方法 |
|-------|---------|---------|
| 是否验证外部URL | 高 | 代码审查 |
| 是否限制内网访问 | 高 | 渗透测试 |
| 是否有URL白名单 | 高 | 配置检查 |
| 是否过滤危险协议 | 中 | 输入测试 |

```python
import ipaddress
import socket
from urllib.parse import urlparse
from typing import Optional, Set
from dataclasses import dataclass

@dataclass
class URLValidationResult:
    """URL验证结果"""
    valid: bool
    error: Optional[str] = None

class SSRFProtection:
    """
    SSRF防护工具
    
    防止服务端请求伪造攻击
    """
    
    BLOCKED_IP_RANGES = [
        ipaddress.ip_network('10.0.0.0/8'),
        ipaddress.ip_network('172.16.0.0/12'),
        ipaddress.ip_network('192.168.0.0/16'),
        ipaddress.ip_network('127.0.0.0/8'),
        ipaddress.ip_network('169.254.0.0/16'),
        ipaddress.ip_network('0.0.0.0/8'),
        ipaddress.ip_network('224.0.0.0/4'),
        ipaddress.ip_network('240.0.0.0/4'),
        ipaddress.ip_network('::1/128'),
        ipaddress.ip_network('fe80::/10'),
        ipaddress.ip_network('fc00::/7'),
    ]
    
    ALLOWED_SCHEMES: Set[str] = {'http', 'https'}
    
    @classmethod
    def validate_url(cls, url: str, allowed_domains: Optional[Set[str]] = None) -> URLValidationResult:
        """
        验证URL安全性
        
        Args:
            url: 待验证的URL
            allowed_domains: 允许的域名列表
            
        Returns:
            验证结果
        """
        try:
            parsed = urlparse(url)
        except Exception as e:
            return URLValidationResult(valid=False, error=f'URL解析失败: {e}')
        
        if parsed.scheme.lower() not in cls.ALLOWED_SCHEMES:
            return URLValidationResult(
                valid=False, 
                error=f'不允许的协议: {parsed.scheme}'
            )
        
        hostname = parsed.hostname
        if not hostname:
            return URLValidationResult(valid=False, error='缺少主机名')
        
        if allowed_domains and hostname not in allowed_domains:
            return URLValidationResult(
                valid=False, 
                error=f'域名不在允许列表中: {hostname}'
            )
        
        try:
            ip_str = socket.gethostbyname(hostname)
            ip = ipaddress.ip_address(ip_str)
        except socket.gaierror:
            return URLValidationResult(valid=False, error='无法解析主机名')
        except ValueError as e:
            return URLValidationResult(valid=False, error=f'无效IP地址: {e}')
        
        for blocked_range in cls.BLOCKED_IP_RANGES:
            if ip in blocked_range:
                return URLValidationResult(
                    valid=False, 
                    error=f'禁止访问内网地址: {ip}'
                )
        
        return URLValidationResult(valid=True)
    
    @classmethod
    async def safe_fetch(
        cls, 
        url: str, 
        allowed_domains: Optional[Set[str]] = None
    ) -> bytes:
        """
        安全获取URL内容
        
        Args:
            url: 目标URL
            allowed_domains: 允许的域名列表
            
        Returns:
            URL内容
            
        Raises:
            ValueError: URL验证失败
        """
        result = cls.validate_url(url, allowed_domains)
        
        if not result.valid:
            raise ValueError(result.error)
        
        import aiohttp
        
        async with aiohttp.ClientSession() as session:
            async with session.get(url, timeout=aiohttp.ClientTimeout(total=30)) as response:
                return await response.read()
```

## 安全编码规范

### 输入验证规则

```python
import re
from typing import Any, Optional
from dataclasses import dataclass

@dataclass
class ValidationResult:
    """验证结果"""
    valid: bool
    value: Any
    error: Optional[str] = None

class InputSanitizer:
    """
    输入净化器
    
    对用户输入进行验证和净化
    """
    
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_PATTERN = re.compile(r'^1[3-9]\d{9}$')
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_-]{3,50}$')
    
    @classmethod
    def validate_email(cls, email: str) -> ValidationResult:
        """
        验证邮箱格式
        
        Args:
            email: 邮箱地址
            
        Returns:
            验证结果
        """
        email = email.strip().lower()
        
        if len(email) > 255:
            return ValidationResult(False, email, '邮箱长度超过255字符')
        
        if not cls.EMAIL_PATTERN.match(email):
            return ValidationResult(False, email, '邮箱格式不正确')
        
        return ValidationResult(True, email)
    
    @classmethod
    def validate_phone(cls, phone: str) -> ValidationResult:
        """
        验证手机号格式
        
        Args:
            phone: 手机号
            
        Returns:
            验证结果
        """
        phone = phone.strip()
        
        if not cls.PHONE_PATTERN.match(phone):
            return ValidationResult(False, phone, '手机号格式不正确')
        
        return ValidationResult(True, phone)
    
    @classmethod
    def validate_username(cls, username: str) -> ValidationResult:
        """
        验证用户名格式
        
        Args:
            username: 用户名
            
        Returns:
            验证结果
        """
        username = username.strip()
        
        if not cls.USERNAME_PATTERN.match(username):
            return ValidationResult(
                False, 
                username, 
                '用户名只能包含字母、数字、下划线和连字符，长度3-50字符'
            )
        
        return ValidationResult(True, username)
    
    @classmethod
    def sanitize_string(cls, value: str, max_length: int = 1000) -> str:
        """
        净化字符串输入
        
        Args:
            value: 原始字符串
            max_length: 最大长度
            
        Returns:
            净化后的字符串
        """
        value = value.strip()
        value = value[:max_length]
        
        control_chars = ''.join(chr(i) for i in range(32) if i not in [9, 10, 13])
        value = value.translate(str.maketrans('', '', control_chars))
        
        return value
    
    @classmethod
    def validate_integer(
        cls, 
        value: str, 
        min_val: Optional[int] = None,
        max_val: Optional[int] = None
    ) -> ValidationResult:
        """
        验证整数输入
        
        Args:
            value: 字符串值
            min_val: 最小值
            max_val: 最大值
            
        Returns:
            验证结果
        """
        try:
            int_value = int(value)
        except ValueError:
            return ValidationResult(False, value, '不是有效的整数')
        
        if min_val is not None and int_value < min_val:
            return ValidationResult(False, int_value, f'值不能小于{min_val}')
        
        if max_val is not None and int_value > max_val:
            return ValidationResult(False, int_value, f'值不能大于{max_val}')
        
        return ValidationResult(True, int_value)
```

### 输出编码规则

```typescript
/**
 * 输出编码器
 * 
 * 防止XSS等注入攻击
 */
export class OutputEncoder {
  /**
   * HTML实体编码
   * 
   * @param text - 原始文本
   * @returns 编码后的安全文本
   */
  static htmlEncode(text: string): string {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
      '`': '&#x60;',
      '=': '&#x3D;'
    }
    
    return String(text).replace(/[&<>"'`=/]/g, char => entities[char])
  }

  /**
   * JavaScript字符串编码
   * 
   * @param value - 原始值
   * @returns 编码后的安全字符串
   */
  static jsEncode(value: string): string {
    const replacements: Record<string, string> = {
      '\\': '\\\\',
      "'": "\\'",
      '"': '\\"',
      '\n': '\\n',
      '\r': '\\r',
      '\t': '\\t',
      '<': '\\x3C',
      '>': '\\x3E',
      '&': '\\x26',
      '=': '\\x3D'
    }
    
    return String(value).replace(/[\\'"<>&=\n\r\t]/g, char => replacements[char])
  }

  /**
   * URL编码
   * 
   * @param value - 原始值
   * @returns 编码后的安全URL
   */
  static urlEncode(value: string): string {
    return encodeURIComponent(String(value))
  }

  /**
   * CSS编码
   * 
   * @param value - 原始值
   * @returns 编码后的安全CSS值
   */
  static cssEncode(value: string): string {
    const hex = (char: string): string => {
      const code = char.charCodeAt(0)
      return `\\${code.toString(16).padStart(6, '0')} `
    }
    
    return String(value).replace(/[<>"'&\\]/g, hex)
  }

  /**
   * JSON安全编码
   * 
   * @param value - 原始值
   * @returns 安全的JSON字符串
   */
  static jsonEncode(value: unknown): string {
    return JSON.stringify(value, (_, v) => {
      if (typeof v === 'string') {
        return v.replace(/[\u0000-\u001f\u007f-\u009f]/g, char => {
          return `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`
        })
      }
      return v
    })
  }
}
```

### 密码安全规则

```python
import re
import secrets
import string
from typing import List, Tuple
from dataclasses import dataclass

@dataclass
class PasswordPolicy:
    """密码策略配置"""
    min_length: int = 12
    max_length: int = 128
    require_uppercase: bool = True
    require_lowercase: bool = True
    require_numbers: bool = True
    require_symbols: bool = True
    min_unique_chars: int = 6
    max_repeated_chars: int = 3
    history_count: int = 5

class PasswordValidator:
    """
    密码验证器
    
    实现安全的密码策略
    """
    
    COMMON_PASSWORDS = {
        'password', '123456', '12345678', 'qwerty', 'abc123',
        'monkey', 'master', 'dragon', 'letmein', 'login',
        'password123', 'admin', 'welcome', 'hello', 'sunshine'
    }
    
    def __init__(self, policy: PasswordPolicy = None) -> None:
        """
        初始化密码验证器
        
        Args:
            policy: 密码策略配置
        """
        self.policy = policy or PasswordPolicy()
    
    def validate(self, password: str, user_info: dict = None) -> Tuple[bool, List[str]]:
        """
        验证密码强度
        
        Args:
            password: 待验证密码
            user_info: 用户信息（用于检查密码是否包含用户信息）
            
        Returns:
            (是否通过, 错误信息列表)
        """
        errors = []
        
        if len(password) < self.policy.min_length:
            errors.append(f'密码长度至少{self.policy.min_length}位')
        
        if len(password) > self.policy.max_length:
            errors.append(f'密码长度不能超过{self.policy.max_length}位')
        
        if self.policy.require_uppercase and not re.search(r'[A-Z]', password):
            errors.append('密码必须包含大写字母')
        
        if self.policy.require_lowercase and not re.search(r'[a-z]', password):
            errors.append('密码必须包含小写字母')
        
        if self.policy.require_numbers and not re.search(r'[0-9]', password):
            errors.append('密码必须包含数字')
        
        if self.policy.require_symbols and not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
            errors.append('密码必须包含特殊字符')
        
        unique_chars = len(set(password))
        if unique_chars < self.policy.min_unique_chars:
            errors.append(f'密码必须包含至少{self.policy.min_unique_chars}个不同字符')
        
        for i in range(len(password) - self.policy.max_repeated_chars + 1):
            substring = password[i:i + self.policy.max_repeated_chars + 1]
            if len(set(substring)) == 1:
                errors.append(f'密码不能包含连续{self.policy.max_repeated_chars + 1}个相同字符')
                break
        
        lower_password = password.lower()
        if lower_password in self.COMMON_PASSWORDS:
            errors.append('密码过于常见，请选择更强的密码')
        
        if user_info:
            for field in ['username', 'email', 'phone', 'name']:
                value = user_info.get(field, '')
                if value and value.lower() in lower_password:
                    errors.append('密码不能包含个人信息')
                    break
        
        return len(errors) == 0, errors
    
    @staticmethod
    def generate_secure_password(length: int = 16) -> str:
        """
        生成安全随机密码
        
        Args:
            length: 密码长度
            
        Returns:
            随机生成的安全密码
        """
        alphabet = string.ascii_letters + string.digits + '!@#$%^&*'
        
        while True:
            password = ''.join(secrets.choice(alphabet) for _ in range(length))
            
            has_upper = any(c.isupper() for c in password)
            has_lower = any(c.islower() for c in password)
            has_digit = any(c.isdigit() for c in password)
            has_symbol = any(c in '!@#$%^&*' for c in password)
            
            if has_upper and has_lower and has_digit and has_symbol:
                return password
```

## 安全检查清单

### 代码审查清单

```markdown
## 安全代码审查清单

### 输入验证
- [ ] 所有用户输入都经过验证
- [ ] 使用白名单验证而非黑名单
- [ ] 验证输入类型、长度、格式和范围
- [ ] 对文件上传进行严格验证
- [ ] 防止批量赋值漏洞

### 输出编码
- [ ] HTML输出进行实体编码
- [ ] JavaScript数据进行转义
- [ ] URL参数进行编码
- [ ] CSS数据进行编码
- [ ] JSON数据进行安全序列化

### 认证授权
- [ ] 实现安全的密码存储（bcrypt/argon2）
- [ ] 使用安全的会话管理
- [ ] 实现适当的访问控制
- [ ] 防止越权访问
- [ ] 实现账户锁定机制

### 数据保护
- [ ] 敏感数据加密存储
- [ ] 使用HTTPS传输
- [ ] 不在日志中记录敏感信息
- [ ] 安全的密钥管理
- [ ] 数据脱敏处理

### 错误处理
- [ ] 不泄露敏感错误信息
- [ ] 使用通用错误消息
- [ ] 记录详细错误日志
- [ ] 优雅处理异常

### 配置安全
- [ ] 移除默认凭据
- [ ] 禁用调试模式
- [ ] 设置安全响应头
- [ ] 禁用不必要的功能
- [ ] 定期更新依赖
```

### 部署前检查清单

```markdown
## 部署前安全检查清单

### 环境配置
- [ ] 所有密钥使用环境变量
- [ ] 数据库连接使用加密
- [ ] 禁用调试模式
- [ ] 配置适当的CORS策略
- [ ] 设置安全Cookie属性

### 依赖安全
- [ ] 运行依赖漏洞扫描
- [ ] 更新所有过时依赖
- [ ] 移除未使用的依赖
- [ ] 检查许可证合规性

### 网络安全
- [ ] 配置防火墙规则
- [ ] 启用DDoS防护
- [ ] 配置WAF规则
- [ ] 启用速率限制

### 监控告警
- [ ] 配置安全日志
- [ ] 设置异常告警
- [ ] 配置性能监控
- [ ] 设置备份策略
```

## Quick Reference: 安全防护速查

| 威胁类型 | 防护措施 | 关键代码 |
|---------|---------|---------|
| SQL注入 | 参数化查询 | `cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))` |
| XSS | 输出编码 | `DOMPurify.sanitize(userInput)` |
| CSRF | Token验证 | `X-CSRF-Token` Header |
| 密码泄露 | 强哈希算法 | `bcrypt.hash(password, 12)` |
| 会话劫持 | 安全Cookie | `HttpOnly; Secure; SameSite=Strict` |
| 敏感数据 | 加密存储 | `AES-256-GCM` |
| 暴力破解 | 速率限制 | `express-rate-limit` |
| SSRF | URL白名单 | 验证目标IP不在内网范围 |
| 信息泄露 | 错误处理 | 返回通用错误消息 |
| 越权访问 | 权限检查 | 检查资源所有权 |

**记住**: 安全是一个持续的过程，不是一次性的任务。定期审查、更新和测试安全措施。
