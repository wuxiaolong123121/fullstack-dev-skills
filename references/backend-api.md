# API 设计模式参考

## RESTful API 设计原则

### 资源命名规范

```
GET    /api/users           # 获取用户列表
GET    /api/users/:id       # 获取单个用户
POST   /api/users           # 创建用户
PUT    /api/users/:id       # 完整更新用户
PATCH  /api/users/:id       # 部分更新用户
DELETE /api/users/:id       # 删除用户

GET    /api/users/:id/posts # 获取用户的文章
POST   /api/users/:id/posts # 为用户创建文章
```

### 响应格式标准化

```typescript
interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}

interface PaginatedResponse<T> {
  code: number
  message: string
  data: {
    items: T[]
    pagination: {
      page: number
      pageSize: number
      total: number
      totalPages: number
    }
  }
}
```

### 错误处理规范

```typescript
interface ApiError {
  code: number
  message: string
  errors?: FieldError[]
  requestId: string
}

interface FieldError {
  field: string
  message: string
}
```

## HTTP 状态码使用

| 状态码 | 含义 | 使用场景 |
|--------|------|----------|
| 200 | OK | 成功响应 |
| 201 | Created | 资源创建成功 |
| 204 | No Content | 删除成功 |
| 400 | Bad Request | 参数错误 |
| 401 | Unauthorized | 未认证 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 资源冲突 |
| 422 | Unprocessable Entity | 验证失败 |
| 429 | Too Many Requests | 请求过多 |
| 500 | Internal Server Error | 服务器错误 |

## 认证与授权

### JWT 认证流程

```typescript
interface JwtPayload {
  userId: string
  role: string
  permissions: string[]
  iat: number
  exp: number
}

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1]
  
  if (!token) {
    return res.status(401).json({ code: 401, message: '未提供认证令牌' })
  }
  
  try {
    const decoded = verifyJwt(token)
    req.user = decoded
    next()
  } catch (error) {
    return res.status(401).json({ code: 401, message: '令牌无效或已过期' })
  }
}
```

### RBAC 权限控制

```typescript
const checkPermission = (requiredPermission: string) => {
  return (req, res, next) => {
    const { permissions } = req.user
    
    if (!permissions.includes(requiredPermission)) {
      return res.status(403).json({ 
        code: 403, 
        message: '权限不足' 
      })
    }
    
    next()
  }
}
```

## 分页与过滤

### 查询参数标准化

```
GET /api/users?page=1&pageSize=20&sort=-createdAt&filter[status]=active
```

### 实现示例

```typescript
interface QueryParams {
  page?: number
  pageSize?: number
  sort?: string
  filter?: Record<string, string>
  search?: string
}

function parseQueryParams(query: QueryParams) {
  const { page = 1, pageSize = 20, sort, filter, search } = query
  
  const sortDirection = sort?.startsWith('-') ? -1 : 1
  const sortField = sort?.replace(/^-/, '') || 'createdAt'
  
  return {
    skip: (page - 1) * pageSize,
    limit: pageSize,
    sort: { [sortField]: sortDirection },
    filter: filter || {},
    search
  }
}
```

## API 版本控制

### URL 版本控制

```
/api/v1/users
/api/v2/users
```

### Header 版本控制

```
Accept: application/vnd.myapi.v2+json
```

## 速率限制

```typescript
import rateLimit from 'express-rate-limit'

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    code: 429,
    message: '请求过于频繁，请稍后再试'
  }
})

app.use('/api/', apiLimiter)
```

## GraphQL 对比

### REST vs GraphQL 选择

| 场景 | 推荐 |
|------|------|
| 简单 CRUD | REST |
| 复杂关联查询 | GraphQL |
| 公开 API | REST |
| 内部服务 | GraphQL |
| 缓存友好 | REST |
| 灵活查询 | GraphQL |

### GraphQL Schema 示例

```graphql
type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}

type Post {
  id: ID!
  title: String!
  content: String!
  author: User!
}

type Query {
  user(id: ID!): User
  users(page: Int, pageSize: Int): UserConnection!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}
```

## 文档规范

### OpenAPI/Swagger

```yaml
openapi: 3.0.0
info:
  title: API Documentation
  version: 1.0.0
paths:
  /users:
    get:
      summary: 获取用户列表
      parameters:
        - name: page
          in: query
          schema:
            type: integer
      responses:
        '200':
          description: 成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'
```
