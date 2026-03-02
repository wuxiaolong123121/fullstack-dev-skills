# 数据库优化参考

## SQL 查询优化

### 索引策略

```sql
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at);
CREATE INDEX idx_products_category ON products(category_id) WHERE active = true;
```

### 查询优化技巧

```sql
SELECT u.id, u.name, COUNT(o.id) as order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 0
ORDER BY order_count DESC
LIMIT 100;
```

### 避免 N+1 查询

```typescript
const users = await prisma.user.findMany({
  include: {
    posts: true,
    orders: {
      where: { status: 'completed' },
      take: 5
    }
  }
})
```

## 数据建模

### 关系设计

```typescript
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  posts     Post[]
  orders    Order[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        String   @id @default(cuid())
  title     String
  content   String
  author    User     @relation(fields: [authorId], references: [id])
  authorId  String
  createdAt DateTime @default(now())
}

model Order {
  id        String   @id @default(cuid())
  status    OrderStatus @default(PENDING)
  user      User     @relation(fields: [userId], references: [id])
  userId    String
  items     OrderItem[]
  createdAt DateTime @default(now())
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
}
```

### 软删除模式

```typescript
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  deletedAt DateTime?
  
  @@index([deletedAt])
}
```

## 连接池配置

```typescript
import { Pool } from 'pg'

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000
})

async function query<T>(sql: string, params?: any[]): Promise<T[]> {
  const client = await pool.connect()
  try {
    const result = await client.query(sql, params)
    return result.rows
  } finally {
    client.release()
  }
}
```

## 事务处理

### ACID 事务

```typescript
async function transferFunds(
  fromId: string, 
  toId: string, 
  amount: number
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const from = await tx.account.findUnique({ where: { id: fromId } })
    const to = await tx.account.findUnique({ where: { id: toId } })
    
    if (!from || !to) throw new Error('Account not found')
    if (from.balance < amount) throw new Error('Insufficient funds')
    
    await tx.account.update({
      where: { id: fromId },
      data: { balance: { decrement: amount } }
    })
    
    await tx.account.update({
      where: { id: toId },
      data: { balance: { increment: amount } }
    })
    
    await tx.transaction.create({
      data: { fromId, toId, amount }
    })
  })
}
```

### 乐观锁

```typescript
async function updateWithVersion(
  id: string, 
  version: number, 
  data: Partial<User>
): Promise<User> {
  const result = await prisma.user.updateMany({
    where: { id, version },
    data: { ...data, version: { increment: 1 } }
  })
  
  if (result.count === 0) {
    throw new Error('Concurrent modification detected')
  }
  
  return prisma.user.findUnique({ where: { id } })!
}
```

## 分页策略

### 偏移分页

```typescript
async function paginateOffset<T>(
  model: any,
  page: number,
  pageSize: number,
  where?: any
): Promise<{ items: T[]; total: number }> {
  const [items, total] = await Promise.all([
    model.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { createdAt: 'desc' }
    }),
    model.count({ where })
  ])
  
  return { items, total }
}
```

### 游标分页

```typescript
async function paginateCursor<T>(
  model: any,
  cursor: string | null,
  pageSize: number,
  where?: any
): Promise<{ items: T[]; nextCursor: string | null }> {
  const items = await model.findMany({
    where,
    take: pageSize + 1,
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1
    }),
    orderBy: { createdAt: 'desc' }
  })
  
  const hasMore = items.length > pageSize
  const result = hasMore ? items.slice(0, -1) : items
  const nextCursor = hasMore ? result[result.length - 1].id : null
  
  return { items: result, nextCursor }
}
```

## 性能监控

### 慢查询日志

```typescript
prisma.$on('query', (e) => {
  if (e.duration > 1000) {
    console.warn('Slow query detected:', {
      query: e.query,
      duration: e.duration,
      params: e.params
    })
  }
})
```

### 查询分析

```sql
EXPLAIN ANALYZE SELECT * FROM users WHERE email LIKE '%@example.com';
```

## NoSQL 选型

| 数据库 | 适用场景 | 特点 |
|--------|----------|------|
| MongoDB | 文档存储、灵活schema | 高性能读写、水平扩展 |
| Redis | 缓存、会话、队列 | 内存存储、极快速度 |
| Elasticsearch | 全文搜索、日志分析 | 倒排索引、实时搜索 |
| Neo4j | 图关系数据 | 节点关系查询优化 |

### Redis 缓存模式

```typescript
import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

async function getCached<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600
): Promise<T> {
  const cached = await redis.get(key)
  
  if (cached) {
    return JSON.parse(cached)
  }
  
  const data = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(data))
  
  return data
}
```
