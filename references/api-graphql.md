# GraphQL Architect 参考

## 核心概念

### Schema 设计原则

```graphql
"""
用户类型定义
"""
type User {
  id: ID!
  name: String!
  email: String! @deprecated(reason: "使用 username 替代")
  username: String!
  avatar: String
  posts: [Post!]!
  createdAt: DateTime!
  updatedAt: DateTime!
}

"""
文章类型定义
"""
type Post {
  id: ID!
  title: String!
  content: String!
  excerpt: String
  author: User!
  comments(first: Int, after: String): CommentConnection!
  tags: [Tag!]!
  status: PostStatus!
  publishedAt: DateTime
}

"""
文章状态枚举
"""
enum PostStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

"""
日期时间标量
"""
scalar DateTime
```

### 查询与变更设计

```graphql
type Query {
  """
  获取单个用户
  """
  user(id: ID!): User
  
  """
  获取用户列表（支持分页）
  """
  users(
    first: Int = 20
    after: String
    filter: UserFilter
    orderBy: UserOrderBy
  ): UserConnection!
  
  """
  搜索功能
  """
  search(query: String!, type: SearchType): SearchResult!
}

type Mutation {
  """
  创建用户
  """
  createUser(input: CreateUserInput!): CreateUserPayload!
  
  """
  更新用户
  """
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload!
  
  """
  删除用户
  """
  deleteUser(id: ID!): DeleteUserPayload!
}

input UserFilter {
  status: UserStatus
  role: Role
  search: String
}

input UserOrderBy {
  field: UserOrderByField!
  direction: OrderDirection!
}

enum OrderDirection {
  ASC
  DESC
}
```

## Federation 架构

### Apollo Federation 2.0

```typescript
/**
 * 用户服务 Schema
 * @description 定义用户核心实体
 */
const typeDefs = `#graphql
  extend schema
    @link(url: "https://specs.apollo.dev/federation/v2.0",
          import: ["@key", "@shareable"])

  type User @key(fields: "id") {
    id: ID!
    name: String!
    email: String! @shareable
  }

  extend type Post @key(fields: "id") {
    id: ID! @external
    author: User! @requires(fields: "id")
  }
`

/**
 * 用户解析器
 * @param parent - 父级对象
 * @param args - 参数
 * @param context - 上下文
 * @returns 用户实体
 */
const resolvers = {
  User: {
    async __resolveReference(user, { dataSources }) {
      return dataSources.userAPI.getUserById(user.id)
    }
  },
  Post: {
    async author(post, { dataSources }) {
      return dataSources.userAPI.getUserByPostId(post.id)
    }
  }
}
```

### 子服务路由配置

```typescript
/**
 * Federation 网关配置
 * @description 配置多个子服务的路由
 */
const gatewayConfig = {
  serviceList: [
    { name: 'users', url: 'http://users-service:4001/graphql' },
    { name: 'posts', url: 'http://posts-service:4002/graphql' },
    { name: 'comments', url: 'http://comments-service:4003/graphql' }
  ],
  
  buildService({ url }) {
    return new RemoteGraphQLDataSource({
      url,
      willSendRequest({ request, context }) {
        request.http.headers.set('user-id', context.userId)
      }
    })
  }
}
```

## 订阅实现

### WebSocket 订阅

```typescript
import { PubSub } from 'graphql-subscriptions'
import { WebSocketServer } from 'ws'
import { useServer } from 'graphql-ws/lib/use/ws'

/**
 * 发布订阅实例
 */
const pubsub = new PubSub()

/**
 * 订阅类型定义
 */
const typeDefs = `#graphql
  type Subscription {
    """
    文章创建订阅
    """
    postCreated(userId: ID): Post!
    
    """
    评论添加订阅
    """
    commentAdded(postId: ID!): Comment!
    
    """
    用户状态变更订阅
    """
    userStatusChanged(userId: ID!): User!
  }
`

/**
 * 订阅解析器
 */
const resolvers = {
  Subscription: {
    /**
     * 文章创建订阅
     * @param parent - 父级对象
     * @param args - 订阅参数
     * @param context - 上下文
     * @returns 异步迭代器
     */
    postCreated: {
      subscribe: (_, { userId }) => {
        const channel = userId ? `POST_CREATED_${userId}` : 'POST_CREATED'
        return pubsub.asyncIterator(channel)
      }
    },
    
    commentAdded: {
      subscribe: (_, { postId }) => pubsub.asyncIterator(`COMMENT_ADDED_${postId}`)
    }
  },
  
  Mutation: {
    /**
     * 创建文章并发布订阅
     */
    async createPost(_, { input }, context) {
      const post = await context.dataSources.postAPI.createPost(input)
      pubsub.publish('POST_CREATED', { postCreated: post })
      return post
    }
  }
}

/**
 * WebSocket 服务器配置
 * @param schema - GraphQL Schema
 * @param server - HTTP 服务器
 */
function setupWebSocketServer(schema, server) {
  const wsServer = new WebSocketServer({
    server,
    path: '/graphql'
  })
  
  useServer({
    schema,
    context: async (ctx) => {
      const token = ctx.connectionParams?.authorization
      const user = await verifyToken(token)
      return { user }
    },
    onConnect: () => console.log('WebSocket 连接建立'),
    onDisconnect: () => console.log('WebSocket 连接断开')
  }, wsServer)
}
```

## N+1 问题解决

### DataLoader 批量加载

```typescript
import DataLoader from 'dataloader'

/**
 * 用户数据加载器
 * @description 批量加载用户，解决 N+1 问题
 */
function createUserLoader(userService) {
  return new DataLoader(async (userIds) => {
    const users = await userService.findByIds(userIds)
    const userMap = new Map(users.map(u => [u.id, u]))
    return userIds.map(id => userMap.get(id))
  })
}

/**
 * 文章作者加载器
 */
function createPostAuthorLoader(postService) {
  return new DataLoader(async (postIds) => {
    const posts = await postService.findWithAuthors(postIds)
    return postIds.map(id => posts.find(p => p.id === id)?.author)
  })
}

/**
 * 上下文初始化
 * @param req - 请求对象
 * @returns 包含 DataLoader 的上下文
 */
function createContext({ req, dataSources }) {
  return {
    userLoader: createUserLoader(dataSources.userAPI),
    postAuthorLoader: createPostAuthorLoader(dataSources.postAPI),
    user: req.user
  }
}

/**
 * 解析器中使用 DataLoader
 */
const resolvers = {
  Post: {
    /**
     * 获取文章作者
     * @param post - 文章对象
     * @param args - 参数
     * @param context - 包含 DataLoader 的上下文
     * @returns 作者对象
     */
    async author(post, _, { userLoader }) {
      return userLoader.load(post.authorId)
    }
  },
  
  User: {
    /**
     * 获取用户文章
     */
    async posts(user, { first }, { postLoader }) {
      const posts = await postLoader.loadMany(user.postIds.slice(0, first))
      return posts.filter(Boolean)
    }
  }
}
```

### 批量查询优化

```typescript
/**
 * 批量查询用户文章数
 * @param userIds - 用户ID列表
 * @returns 用户文章数映射
 */
async function batchUserPostCount(userIds: string[]) {
  const result = await db.post.aggregate([
    { $match: { authorId: { $in: userIds } } },
    { $group: { _id: '$authorId', count: { $sum: 1 } } }
  ])
  
  const countMap = new Map(result.map(r => [r._id, r.count]))
  return userIds.map(id => countMap.get(id) || 0)
}

/**
 * 创建计数加载器
 */
function createPostCountLoader() {
  return new DataLoader(batchUserPostCount)
}
```

## 性能优化

### 查询复杂度分析

```typescript
import { createComplexityLimitRule } from 'graphql-validation-complexity'

/**
 * 复杂度限制规则
 */
const complexityLimitRule = createComplexityLimitRule(1000, {
  onCost: (cost) => console.log(`查询成本: ${cost}`),
  formatErrorMessage: (cost) => `查询过于复杂 (${cost})，请简化查询`
})

/**
 * 字段复杂度配置
 */
const fieldCostMap = {
  User: {
    posts: { complexity: 5, multipliers: ['first'] }
  },
  Post: {
    comments: { complexity: 3, multipliers: ['first'] }
  }
}
```

### 查询深度限制

```typescript
import depthLimit from 'graphql-depth-limit'

/**
 * 深度限制配置
 */
const depthLimitRule = depthLimit(5, {
  ignore: ['__schema', '__type']
})
```

### 缓存策略

```typescript
/**
 * 响应缓存配置
 */
const cacheConfig = {
  user: {
    maxAge: 300,
    scope: 'PUBLIC'
  },
  post: {
    maxAge: 60,
    scope: 'PUBLIC'
  },
  currentUser: {
    maxAge: 0,
    scope: 'PRIVATE'
  }
}

/**
 * Schema 缓存指令
 */
const typeDefs = `#graphql
  type User @cacheControl(maxAge: 300) {
    id: ID!
    name: String!
    posts: [Post!]! @cacheControl(maxAge: 60)
  }
`
```

## 错误处理

### 统一错误格式

```typescript
import { GraphQLError } from 'graphql'

/**
 * 自定义错误类
 */
class AppError extends GraphQLError {
  constructor(message, code, extensions = {}) {
    super(message, {
      extensions: {
        code,
        ...extensions
      }
    })
  }
}

/**
 * 验证错误
 */
class ValidationError extends AppError {
  constructor(errors) {
    super('验证失败', 'VALIDATION_ERROR', { errors })
  }
}

/**
 * 未授权错误
 */
class UnauthorizedError extends AppError {
  constructor() {
    super('未授权访问', 'UNAUTHORIZED')
  }
}

/**
 * 资源未找到错误
 */
class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource} 不存在`, 'NOT_FOUND')
  }
}

/**
 * 错误格式化中间件
 */
const errorFormatter = (error) => {
  const { message, extensions, path } = error
  
  return {
    message,
    code: extensions?.code || 'INTERNAL_ERROR',
    path,
    timestamp: new Date().toISOString()
  }
}
```

## 安全最佳实践

### 查询白名单

```typescript
import { createPersistedQueryLink } from '@apollo/client/link/persisted-queries'

/**
 * 持久化查询配置
 */
const persistedQueries = new Map([
  ['hash1', 'query GetUser($id: ID!) { user(id: $id) { name } }'],
  ['hash2', 'query ListUsers($first: Int) { users(first: $first) { id name } }']
])

/**
 * 仅允许预注册查询
 */
const persistedLink = createPersistedQueryLink({
  generateHash: (query) => computeHash(query),
  disable: process.env.NODE_ENV === 'development'
})
```

### 字段级权限

```typescript
/**
 * 字段权限中间件
 */
const authDirective = (schema) => {
  return mapSchema(schema, {
    [MapperKind.OBJECT_FIELD]: (fieldConfig, fieldName) => {
      const { auth } = fieldConfig
      
      if (auth) {
        const originalResolver = fieldConfig.resolve
        fieldConfig.resolve = async (parent, args, context, info) => {
          if (!context.user || !auth.includes(context.user.role)) {
            throw new UnauthorizedError()
          }
          return originalResolver(parent, args, context, info)
        }
      }
      
      return fieldConfig
    }
  })
}
```

## 测试策略

### 单元测试

```typescript
import { graphql } from 'graphql'

/**
 * 查询测试
 */
describe('User Queries', () => {
  it('应该返回指定用户', async () => {
    const query = `
      query GetUser($id: ID!) {
        user(id: $id) {
          id
          name
          email
        }
      }
    `
    
    const result = await graphql({
      schema,
      source: query,
      variableValues: { id: '1' },
      contextValue: { user: mockUser }
    })
    
    expect(result.data.user).toEqual({
      id: '1',
      name: 'Test User',
      email: 'test@example.com'
    })
  })
})
```

### 集成测试

```typescript
import { ApolloServer } from '@apollo/server'

/**
 * Apollo Server 集成测试
 */
describe('GraphQL Integration', () => {
  let server
  
  beforeAll(async () => {
    server = new ApolloServer({ typeDefs, resolvers })
    await server.start()
  })
  
  it('应该创建用户并返回', async () => {
    const mutation = `
      mutation CreateUser($input: CreateUserInput!) {
        createUser(input: $input) {
          user {
            id
            name
          }
        }
      }
    `
    
    const result = await server.executeOperation({
      query: mutation,
      variables: { input: { name: 'New User', email: 'new@example.com' } }
    })
    
    expect(result.body.singleResult.data.createUser.user.name).toBe('New User')
  })
})
```
