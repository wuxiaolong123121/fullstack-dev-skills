# REST API 设计参考

REST API 设计核心内容、最佳实践和标准规范，用于构建一致、可维护、易用的 API 接口。

## When to Activate

- 设计新的 REST API
- 审查 API 设计方案
- 重构现有 API 接口
- 制定 API 规范文档

## Core Principles

### 1. 资源导向设计

API 围绕资源构建，资源是 API 的名词。

```http
# Good: 资源导向 URI
GET    /users                  # 获取集合
GET    /users/{id}             # 获取单个资源
GET    /users/{id}/orders      # 获取嵌套集合
POST   /users                  # 创建资源
PUT    /users/{id}             # 替换资源
PATCH  /users/{id}             # 部分更新
DELETE /users/{id}             # 删除资源

# Bad: 动词导向 URI
POST   /getUser                # URI 中包含动词
POST   /createUser             # URI 中包含动词
GET    /user?action=delete     # 查询参数表示动作
```

### 2. HTTP 方法语义

| 方法 | 安全 | 幂等 | 用途 |
|------|------|------|------|
| GET | 是 | 是 | 获取资源 |
| POST | 否 | 否 | 创建资源、非幂等操作 |
| PUT | 否 | 是 | 完整替换资源 |
| PATCH | 否 | 否 | 部分更新资源 |
| DELETE | 否 | 是 | 删除资源 |
| HEAD | 是 | 是 | 获取响应头 |
| OPTIONS | 是 | 是 | 获取允许的方法 |

### 3. HTTP 状态码规范

```http
# 成功响应 (2xx)
200 OK                    # 请求成功（GET、PUT、PATCH）
201 Created               # 资源创建成功（POST）
202 Accepted              # 请求已接受，异步处理中
204 No Content            # 成功但无响应体（DELETE）

# 重定向 (3xx)
301 Moved Permanently     # 资源永久移动
302 Found                 # 临时重定向
304 Not Modified          # 缓存有效

# 客户端错误 (4xx)
400 Bad Request           # 请求格式错误或验证失败
401 Unauthorized          # 未认证或认证失败
403 Forbidden             # 已认证但无权限
404 Not Found             # 资源不存在
405 Method Not Allowed    # 方法不允许
409 Conflict              # 请求冲突（如重复）
422 Unprocessable Entity  # 语义错误
429 Too Many Requests     # 请求频率超限

# 服务端错误 (5xx)
500 Internal Server Error # 服务器内部错误
502 Bad Gateway           # 上游服务错误
503 Service Unavailable   # 服务暂时不可用
504 Gateway Timeout       # 上游服务超时
```

## 分页模式

### Offset 分页

适用于简单场景，支持随机跳页。

```http
GET /users?page=2&page_size=20
```

```json
{
  "data": [
    { "id": 21, "name": "User 21" },
    { "id": 22, "name": "User 22" }
  ],
  "pagination": {
    "page": 2,
    "page_size": 20,
    "total_items": 150,
    "total_pages": 8,
    "has_next": true,
    "has_prev": true
  },
  "_links": {
    "self": "/users?page=2&page_size=20",
    "first": "/users?page=1&page_size=20",
    "prev": "/users?page=1&page_size=20",
    "next": "/users?page=3&page_size=20",
    "last": "/users?page=8&page_size=20"
  }
}
```

**优点**：实现简单，支持跳页，用户体验友好

**缺点**：大数据集性能差，数据变更时可能遗漏或重复

### Cursor 分页

适用于大数据集、实时数据流。

```http
GET /users?cursor=eyJpZCI6MjB9&page_size=20
```

```json
{
  "data": [
    { "id": 21, "name": "User 21" },
    { "id": 22, "name": "User 22" }
  ],
  "pagination": {
    "cursor": "eyJpZCI6NDB9",
    "has_next": true,
    "has_prev": false
  },
  "_links": {
    "self": "/users?cursor=eyJpZCI6MjB9&page_size=20",
    "next": "/users?cursor=eyJpZCI6NDB9&page_size=20"
  }
}
```

**优点**：性能稳定，数据一致性好

**缺点**：不支持跳页，实现复杂

### Keyset 分页

适用于有序数据、时间序列数据。

```http
GET /messages?after_id=100&limit=20
GET /messages?before_id=50&limit=20
GET /events?since=2024-01-15T10:00:00Z&limit=100
```

```json
{
  "data": [
    { "id": 101, "content": "Message 101", "created_at": "2024-01-15T10:01:00Z" },
    { "id": 102, "content": "Message 102", "created_at": "2024-01-15T10:02:00Z" }
  ],
  "pagination": {
    "after_id": 102,
    "has_more": true
  }
}
```

**优点**：性能最佳，数据一致性最好

**缺点**：仅支持顺序浏览，需索引支持

### 分页模式选择指南

| 场景 | 推荐模式 | 原因 |
|------|----------|------|
| 管理后台列表 | Offset | 支持跳页，用户体验好 |
| 社交媒体信息流 | Cursor | 实时更新，大数据量 |
| 聊天消息历史 | Keyset | 时间有序，性能最优 |
| 数据导出 | Keyset | 稳定可靠，数据一致 |
| 搜索结果 | Offset | 支持跳页，总量可控 |

## 错误响应格式

### RFC 7807 Problem Details 标准格式

```json
{
  "type": "https://api.example.com/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "请求参数验证失败",
  "instance": "/users",
  "errors": [
    {
      "field": "email",
      "code": "invalid_format",
      "message": "邮箱格式不正确"
    },
    {
      "field": "password",
      "code": "min_length",
      "message": "密码长度至少8位"
    }
  ],
  "timestamp": "2024-01-15T10:30:00Z",
  "trace_id": "abc123def456"
}
```

### 简化错误格式

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": [
      {
        "field": "email",
        "message": "邮箱格式不正确"
      }
    ]
  },
  "request_id": "req-abc123",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### 错误响应模板

**400 Bad Request - 参数验证失败**

```json
{
  "type": "https://api.example.com/errors/bad-request",
  "title": "Bad Request",
  "status": 400,
  "detail": "请求参数格式错误",
  "errors": [
    {
      "field": "age",
      "code": "type_error",
      "message": "必须是整数"
    }
  ]
}
```

**401 Unauthorized - 认证失败**

```json
{
  "type": "https://api.example.com/errors/unauthorized",
  "title": "Unauthorized",
  "status": 401,
  "detail": "认证令牌无效或已过期",
  "www_authenticate": "Bearer error=\"invalid_token\""
}
```

**403 Forbidden - 权限不足**

```json
{
  "type": "https://api.example.com/errors/forbidden",
  "title": "Forbidden",
  "status": 403,
  "detail": "您没有权限访问此资源",
  "required_permission": "users:write"
}
```

**404 Not Found - 资源不存在**

```json
{
  "type": "https://api.example.com/errors/not-found",
  "title": "Not Found",
  "status": 404,
  "detail": "请求的资源不存在",
  "resource": "User",
  "resource_id": "123"
}
```

**409 Conflict - 资源冲突**

```json
{
  "type": "https://api.example.com/errors/conflict",
  "title": "Conflict",
  "status": 409,
  "detail": "资源状态冲突",
  "conflict_type": "duplicate_email",
  "message": "邮箱已被其他用户使用"
}
```

**422 Unprocessable Entity - 语义错误**

```json
{
  "type": "https://api.example.com/errors/unprocessable-entity",
  "title": "Unprocessable Entity",
  "status": 422,
  "detail": "请求语义无法处理",
  "errors": [
    {
      "field": "start_date",
      "code": "invalid_range",
      "message": "开始日期不能晚于结束日期"
    }
  ]
}
```

**429 Too Many Requests - 请求频率超限**

```json
{
  "type": "https://api.example.com/errors/rate-limit",
  "title": "Too Many Requests",
  "status": 429,
  "detail": "请求频率超过限制",
  "retry_after": 60,
  "rate_limit": {
    "limit": 100,
    "remaining": 0,
    "reset": 1705312800
  }
}
```

**500 Internal Server Error - 服务器错误**

```json
{
  "type": "https://api.example.com/errors/internal-error",
  "title": "Internal Server Error",
  "status": 500,
  "detail": "服务器内部错误，请稍后重试",
  "trace_id": "trace-abc123",
  "support_url": "https://support.example.com"
}
```

## 版本控制策略

### URL 路径版本控制

```http
# 最常用方式
GET /v1/users
GET /v2/users

# 优点：清晰直观，易于缓存
# 缺点：URL 变更，破坏 REST 原则
```

### 请求头版本控制

```http
# 自定义请求头
GET /users
Accept-Version: v2

# Accept 头媒体类型
GET /users
Accept: application/vnd.myapi.v2+json

# 优点：URL 简洁，符合 REST 原则
# 缺点：不够直观，调试不便
```

### 查询参数版本控制

```http
GET /users?version=2
GET /users?v=2

# 优点：简单易用
# 缺点：不推荐，易被忽略
```

### 版本控制最佳实践

```yaml
# 版本生命周期管理
versions:
  v1:
    status: deprecated
    sunset_date: "2024-06-01"
    deprecation_notice: "请迁移至 v2"
  v2:
    status: current
    release_date: "2024-01-01"
  v3:
    status: beta
    release_date: "2024-03-01"
```

```http
# 弃用响应头
Deprecation: true
Sunset: Sat, 01 Jun 2024 00:00:00 GMT
Link: </v2/users>; rel="successor-version"
```

### 版本兼容性策略

| 变更类型 | 是否需要新版本 | 示例 |
|----------|----------------|------|
| 新增资源 | 否 | 新增 /products 端点 |
| 新增可选字段 | 否 | 响应新增 optional_field |
| 新增必填字段 | 是 | 请求必须包含 new_field |
| 删除字段 | 是 | 移除 deprecated_field |
| 修改字段类型 | 是 | id: int → string |
| 修改字段语义 | 是 | status: "active" → 1 |
| 修改错误格式 | 是 | 错误响应结构变更 |

## 认证授权模式

### Bearer Token (JWT)

```http
# 请求示例
GET /users/me
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 令牌结构
{
  "header": {
    "alg": "RS256",
    "typ": "JWT"
  },
  "payload": {
    "sub": "user-123",
    "iss": "https://api.example.com",
    "aud": "https://api.example.com",
    "exp": 1705316400,
    "iat": 1705312800,
    "scope": "read:users write:orders"
  }
}
```

**最佳实践**：

- 使用 RS256 非对称加密
- 设置合理的过期时间（access_token: 15分钟，refresh_token: 7天）
- 包含最小必要信息
- 使用 jti 防止重放攻击

### OAuth 2.0 授权码流程

```http
# 1. 授权请求
GET /authorize?
    response_type=code&
    client_id=client123&
    redirect_uri=https://app.example.com/callback&
    scope=read:users write:orders&
    state=xyz123

# 2. 获取令牌
POST /token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=auth_code_here&
redirect_uri=https://app.example.com/callback&
client_id=client123&
client_secret=secret123

# 3. 令牌响应
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "Bearer",
  "expires_in": 900,
  "refresh_token": "refresh_token_here",
  "scope": "read:users write:orders"
}
```

### API Key 认证

```http
# 请求头方式
GET /users
X-API-Key: api_key_here

# 查询参数方式（不推荐）
GET /users?api_key=api_key_here
```

**适用场景**：服务间调用、内部 API、开发测试

### Basic Authentication

```http
GET /users
Authorization: Basic base64(username:password)
```

**适用场景**：仅限内部服务、测试环境，生产环境不推荐

### 权限控制模型

**RBAC (基于角色)**

```json
{
  "user": {
    "id": "user-123",
    "roles": ["admin", "editor"]
  },
  "roles": {
    "admin": {
      "permissions": ["users:read", "users:write", "users:delete"]
    },
    "editor": {
      "permissions": ["posts:read", "posts:write"]
    }
  }
}
```

**ABAC (基于属性)**

```json
{
  "policy": {
    "effect": "allow",
    "action": "documents:read",
    "resource": "documents/*",
    "condition": {
      "owner": "${user.id}",
      "department": "${user.department}"
    }
  }
}
```

**Scope 权限控制**

```json
{
  "scopes": {
    "read:users": "读取用户信息",
    "write:users": "创建和更新用户",
    "delete:users": "删除用户",
    "admin:all": "完全管理权限"
  }
}
```

## API 设计规范

### 资源命名规范

```http
# 使用复数名词
GET /users           # Good
GET /user            # Bad

# 使用小写和连字符
GET /shipping-addresses    # Good
GET /shippingAddresses     # Bad
GET /shipping_addresses    # 可接受

# 避免深层嵌套（最多 2-3 层）
GET /users/{id}/orders/{orderId}           # Good
GET /users/{id}/orders/{orderId}/items     # 可接受
GET /a/b/c/d/e                             # Bad

# 使用查询参数过滤
GET /users?status=active&role=admin        # Good
GET /active-admin-users                    # Bad
```

### 请求响应规范

**请求格式**

```http
POST /users
Content-Type: application/json
Accept: application/json
Accept-Language: zh-CN
X-Request-ID: req-abc123

{
  "name": "张三",
  "email": "zhangsan@example.com"
}
```

**成功响应格式**

```json
{
  "data": {
    "id": 123,
    "name": "张三",
    "email": "zhangsan@example.com",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "_links": {
    "self": "/users/123",
    "orders": "/users/123/orders"
  }
}
```

**列表响应格式**

```json
{
  "data": [
    { "id": 1, "name": "用户1" },
    { "id": 2, "name": "用户2" }
  ],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_items": 100,
    "total_pages": 5
  }
}
```

### 查询参数规范

```http
# 分页
GET /users?page=2&page_size=20
GET /users?offset=20&limit=20

# 排序
GET /users?sort=created_at              # 升序
GET /users?sort=-created_at             # 降序
GET /users?sort=name,-created_at        # 多字段排序

# 过滤
GET /users?status=active
GET /users?status=active&role=admin
GET /products?price[gte]=100&price[lte]=500

# 字段选择
GET /users?fields=id,name,email
GET /users?exclude=password,token

# 搜索
GET /users?q=张三
GET /products?search=laptop

# 展开/关联
GET /users?include=orders,profile
GET /orders?expand=user,items
```

### HATEOAS 超媒体驱动

```json
{
  "data": {
    "id": 123,
    "name": "张三",
    "status": "active"
  },
  "_links": {
    "self": { "href": "/users/123", "method": "GET" },
    "update": { "href": "/users/123", "method": "PATCH" },
    "delete": { "href": "/users/123", "method": "DELETE" },
    "orders": { "href": "/users/123/orders", "method": "GET" },
    "deactivate": { "href": "/users/123/deactivate", "method": "POST" }
  },
  "_actions": [
    {
      "name": "deactivate",
      "method": "POST",
      "href": "/users/123/deactivate",
      "title": "停用用户"
    }
  ]
}
```

### 缓存控制

```http
# 响应头
Cache-Control: public, max-age=3600, stale-while-revalidate=60
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
Last-Modified: Mon, 15 Jan 2024 10:30:00 GMT

# 条件请求
GET /users/123
If-None-Match: "33a64df551425fcc55e4d42a148795d9f25f89d4"

# 响应: 304 Not Modified（资源未变更）
```

### 幂等性设计

```http
# 使用幂等键防止重复请求
POST /payments
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json

{
  "amount": 100.00,
  "currency": "CNY"
}

# 服务端存储幂等键，相同键返回相同响应
```

## 安全最佳实践

### 请求安全

```http
# 强制 HTTPS
Strict-Transport-Security: max-age=31536000; includeSubDomains

# 防止 XSS
Content-Type: application/json; charset=utf-8
X-Content-Type-Options: nosniff
X-Frame-Options: DENY

# CORS 配置
Access-Control-Allow-Origin: https://app.example.com
Access-Control-Allow-Methods: GET, POST, PUT, DELETE
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

### 速率限制

```http
# 响应头
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705312800
Retry-After: 60

# 超限响应
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "请求频率超过限制，请 60 秒后重试"
  }
}
```

### 敏感数据处理

```json
# 响应中排除敏感字段
{
  "id": 123,
  "name": "张三",
  "email": "zhang***@example.com",
  "phone": "138****1234"
}

# 不返回
// "password": "hashed_password",
// "api_key": "secret_key",
// "token": "access_token"
```

## Quick Reference: HTTP 方法速查

| 方法 | 安全 | 幂等 | 请求体 | 响应体 | 成功状态码 |
|------|------|------|--------|--------|------------|
| GET | 是 | 是 | 否 | 是 | 200, 206 |
| POST | 否 | 否 | 是 | 是 | 201, 202 |
| PUT | 否 | 是 | 是 | 是 | 200, 204 |
| PATCH | 否 | 否 | 是 | 是 | 200, 204 |
| DELETE | 否 | 是 | 否 | 否 | 204 |
| HEAD | 是 | 是 | 否 | 否 | 200 |
| OPTIONS | 是 | 是 | 否 | 是 | 200 |

## Anti-Patterns to Avoid

```http
# Bad: URI 中使用动词
POST /createUser
GET /getUserById/123

# Good: 使用 HTTP 方法表示动作
POST /users
GET /users/123

# Bad: 返回不恰当的状态码
POST /users
Response: 200 OK { "error": "用户已存在" }

# Good: 使用正确的状态码
POST /users
Response: 409 Conflict { "error": "用户已存在" }

# Bad: 响应中包含敏感信息
{
  "user": {
    "password": "hashed_value",
    "api_key": "secret_key"
  }
}

# Good: 排除敏感字段
{
  "user": {
    "id": 123,
    "name": "张三"
  }
}

# Bad: 不一致的命名风格
GET /user-profiles
GET /orderItems
GET /shipping_address

# Good: 统一的命名风格
GET /user-profiles
GET /order-items
GET /shipping-addresses

# Bad: 过深的嵌套
GET /users/123/orders/456/items/789/variants

# Good: 扁平化资源
GET /order-items/789/variants
GET /users/123/orders?item_id=789

# Bad: 忽略缓存控制
GET /users/123
Response: 200 OK (无缓存头)

# Good: 正确的缓存控制
GET /users/123
Response: 200 OK
Cache-Control: private, max-age=300
ETag: "abc123"
```

**Remember**: API 设计应该一致、可预测、易理解。遵循最小惊讶原则，让开发者能够直觉地使用 API。
