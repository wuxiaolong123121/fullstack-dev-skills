# Database Optimizer 参考

> Reference for: fullstack-dev-skills
> Load when: 用户提及 数据库优化、索引策略、查询优化、数据库缓存、性能调优、慢查询分析

## 核心特性

### 1. 索引策略

#### 索引类型与选择

```sql
/**
 * B-Tree 索引
 * @description 默认索引类型，适用于等值查询和范围查询
 * @param {string} table_name - 表名
 * @param {string[]} columns - 索引列
 */
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_date ON orders(user_id, order_date);

/**
 * 哈希索引
 * @description 仅支持等值查询，O(1) 查询复杂度
 * @note PostgreSQL 特有，不存储 WAL
 */
CREATE INDEX idx_sessions_token ON sessions USING HASH (session_token);

/**
 * 部分索引
 * @description 仅索引满足条件的行，减少索引大小
 * @param {string} condition - 过滤条件
 */
CREATE INDEX idx_orders_active ON orders(user_id) 
WHERE status NOT IN ('cancelled', 'deleted');

/**
 * 表达式索引
 * @description 对计算结果建立索引
 */
CREATE INDEX idx_users_lower_email ON users(LOWER(email));
CREATE INDEX idx_orders_month ON orders(EXTRACT(MONTH FROM order_date));

/**
 * 覆盖索引
 * @description 包含查询所需全部字段，避免回表
 */
CREATE INDEX idx_users_covering ON users(email) INCLUDE (name, created_at);

/**
 * 多列索引设计原则
 * @description 遵循最左前缀原则
 * @param {string[]} columns - 按选择性从高到低排列
 */
-- 正确示例：选择性高的列在前
CREATE INDEX idx_orders_composite ON orders(status, user_id, order_date);

-- 查询优化器可利用此索引的场景
SELECT * FROM orders WHERE status = 'pending';                    -- 使用索引
SELECT * FROM orders WHERE status = 'pending' AND user_id = 123;  -- 使用索引
SELECT * FROM orders WHERE user_id = 123;                         -- 不使用索引
```

#### 索引维护

```sql
/**
 * 索引使用情况分析
 * @description 查找未使用的索引
 */
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    idx_tup_read,
    idx_tup_fetch,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
WHERE idx_scan = 0
    AND indexrelname NOT LIKE '%_pkey'
ORDER BY pg_relation_size(indexrelid) DESC;

/**
 * 索引膨胀检测
 * @description 检测需要重建的索引
 */
SELECT 
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    100 * idx_scan / NULLIF(seq_scan + idx_scan, 0) AS index_usage_pct
FROM pg_stat_user_indexes
JOIN pg_indexes ON pg_stat_user_indexes.indexrelname = pg_indexes.indexname
ORDER BY index_usage_pct ASC;

/**
 * 并发重建索引
 * @description 不阻塞写入的情况下重建索引
 */
REINDEX INDEX CONCURRENTLY idx_users_email;

/**
 * 更新索引统计信息
 * @description 优化查询计划器决策
 */
ANALYZE users;
```

### 2. 查询优化

#### 执行计划分析

```sql
/**
 * 查询计划分析
 * @description 分析 SQL 执行计划和实际执行情况
 * @param {string} query - SQL 查询语句
 */
EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
SELECT u.name, COUNT(o.id) AS order_count
FROM users u
LEFT JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01'
GROUP BY u.id, u.name
HAVING COUNT(o.id) > 10
ORDER BY order_count DESC
LIMIT 100;

/**
 * 关键指标解读
 * @description 执行计划中的重要信息
 * 
 * Seq Scan: 全表扫描，大数据表应避免
 * Index Scan: 索引扫描，适合低选择性查询
 * Bitmap Index Scan: 批量索引扫描，适合高选择性查询
 * Hash Join: 哈希连接，适合大表连接
 * Nested Loop: 嵌套循环，适合小表连接
 * Merge Join: 合并连接，适合已排序数据
 * 
 * cost=0.00..1.00: 估计成本（启动..总成本）
 * rows=100: 估计返回行数
 * width=64: 估计行大小（字节）
 * actual time=0.01..0.02: 实际执行时间（毫秒）
 * loops=1: 执行次数
 * Buffers: shared hit=10 read=5 缓存命中和磁盘读取
 */
```

#### 查询重写优化

```sql
/**
 * 避免 SELECT *
 * @description 只查询需要的列，减少数据传输
 */
-- 不推荐
SELECT * FROM users WHERE email = 'user@example.com';

-- 推荐
SELECT id, name, email FROM users WHERE email = 'user@example.com';

/**
 * 使用 LIMIT 限制结果集
 * @description 防止返回大量数据
 */
SELECT * FROM orders 
WHERE user_id = 123 
ORDER BY created_at DESC 
LIMIT 20;

/**
 * 避免 OR 条件
 * @description 使用 UNION ALL 替代 OR 以利用索引
 */
-- 不推荐：可能导致全表扫描
SELECT * FROM orders WHERE user_id = 123 OR status = 'pending';

-- 推荐：分别利用索引
SELECT * FROM orders WHERE user_id = 123
UNION ALL
SELECT * FROM orders WHERE status = 'pending' AND user_id != 123;

/**
 * 避免 LIKE '%xxx%' 前缀模糊
 * @description 前缀通配符无法使用索引
 */
-- 不推荐
SELECT * FROM users WHERE name LIKE '%张%';

-- 推荐：使用全文搜索或前缀匹配
SELECT * FROM users WHERE name LIKE '张%';
-- 或使用 PostgreSQL 全文搜索
SELECT * FROM users WHERE to_tsvector('simple', name) @@ to_tsquery('simple', '张');

/**
 * 批量操作优化
 * @description 减少事务次数，提升批量操作性能
 */
-- 不推荐：循环单条插入
INSERT INTO logs (message) VALUES ('log1');
INSERT INTO logs (message) VALUES ('log2');

-- 推荐：批量插入
INSERT INTO logs (message) VALUES ('log1'), ('log2'), ('log3');

/**
 * 使用 CTE 优化复杂查询
 * @description 提高可读性，避免重复计算
 */
WITH active_users AS (
    SELECT id, name FROM users WHERE status = 'active'
),
user_orders AS (
    SELECT user_id, COUNT(*) AS cnt 
    FROM orders 
    WHERE created_at > CURRENT_DATE - INTERVAL '30 days'
    GROUP BY user_id
)
SELECT au.name, uo.cnt
FROM active_users au
LEFT JOIN user_orders uo ON au.id = uo.user_id
ORDER BY uo.cnt DESC NULLS LAST;
```

#### 分页优化

```sql
/**
 * 传统分页（OFFSET）性能问题
 * @description OFFSET 越大，性能越差
 */
-- 不推荐：大偏移量
SELECT * FROM orders ORDER BY id OFFSET 100000 LIMIT 20;

/**
 * 游标分页（Keyset Pagination）
 * @description 使用上一页最后一条记录作为起点
 * @param {number} last_id - 上一页最后一条记录的 ID
 */
-- 推荐：基于游标的分页
SELECT * FROM orders 
WHERE id > 100000 
ORDER BY id 
LIMIT 20;

/**
 * 复合游标分页
 * @description 处理排序字段有重复值的场景
 */
-- 假设按 created_at 排序，可能有重复
SELECT * FROM orders
WHERE (created_at, id) > ('2024-01-15 10:30:00', 100000)
ORDER BY created_at, id
LIMIT 20;
```

### 3. 缓存策略

#### 数据库级缓存

```sql
/**
 * PostgreSQL 共享缓冲区配置
 * @description 调整数据库内存缓存
 */
-- postgresql.conf 配置
shared_buffers = '4GB'              -- 通常设为系统内存的 25%
work_mem = '256MB'                  -- 单个操作可用内存
maintenance_work_mem = '1GB'        -- 维护操作内存
effective_cache_size = '12GB'       -- 操作系统缓存估计

/**
 * 查询缓存命中统计
 * @description 监控缓存效率
 */
SELECT 
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) AS ratio
FROM pg_statio_user_tables;

/**
 * 表预热
 * @description 将热点数据加载到内存
 */
SELECT pg_prewarm('orders');
SELECT pg_prewarm('users', 'buffer', 'main', 0, 10000);
```

#### 应用级缓存

```javascript
/**
 * Redis 缓存层实现
 * @description 使用 Redis 作为数据库查询缓存
 */

const Redis = require('ioredis');
const redis = new Redis({
    host: process.env.REDIS_HOST,
    port: 6379,
    db: 0
});

/**
 * 缓存查询结果
 * @param {string} key - 缓存键
 * @param {Function} queryFn - 数据库查询函数
 * @param {number} ttl - 缓存过期时间（秒）
 * @returns {Promise<any>} 查询结果
 */
async function cacheQuery(key, queryFn, ttl = 300) {
    const cached = await redis.get(key);
    
    if (cached) {
        return JSON.parse(cached);
    }
    
    const result = await queryFn();
    
    await redis.setex(key, ttl, JSON.stringify(result));
    
    return result;
}

/**
 * 缓存失效策略
 * @param {string} pattern - 缓存键模式
 */
async function invalidateCache(pattern) {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
        await redis.del(...keys);
    }
}

/**
 * 缓存预热
 * @description 应用启动时预加载热点数据
 */
async function warmupCache() {
    const hotQueries = [
        { key: 'products:featured', query: () => getFeaturedProducts() },
        { key: 'categories:all', query: () => getAllCategories() },
        { key: 'config:global', query: () => getGlobalConfig() }
    ];

    await Promise.all(
        hotQueries.map(({ key, query }) => 
            cacheQuery(key, query, 3600)
        )
    );
}

/**
 * 多级缓存实现
 * @description L1 本地缓存 + L2 Redis 缓存
 */
class MultiLevelCache {
    /**
     * 创建多级缓存实例
     * @param {Object} options - 缓存配置
     */
    constructor(options = {}) {
        this.l1Cache = new Map();
        this.l1MaxSize = options.l1MaxSize || 1000;
        this.l1TTL = options.l1TTL || 60000;
        this.redis = redis;
        this.l2TTL = options.l2TTL || 300;
    }

    /**
     * 获取缓存值
     * @param {string} key - 缓存键
     * @param {Function} queryFn - 数据源查询函数
     * @returns {Promise<any>} 缓存值
     */
    async get(key, queryFn) {
        // L1 缓存检查
        const l1Entry = this.l1Cache.get(key);
        if (l1Entry && Date.now() < l1Entry.expiry) {
            return l1Entry.value;
        }

        // L2 缓存检查
        const l2Value = await this.redis.get(key);
        if (l2Value) {
            const parsed = JSON.parse(l2Value);
            this._setL1(key, parsed);
            return parsed;
        }

        // 查询数据源
        const result = await queryFn();
        
        // 写入 L1 和 L2
        this._setL1(key, result);
        await this.redis.setex(key, this.l2TTL, JSON.stringify(result));
        
        return result;
    }

    /**
     * 设置 L1 缓存
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @private
     */
    _setL1(key, value) {
        if (this.l1Cache.size >= this.l1MaxSize) {
            const firstKey = this.l1Cache.keys().next().value;
            this.l1Cache.delete(firstKey);
        }
        this.l1Cache.set(key, {
            value,
            expiry: Date.now() + this.l1TTL
        });
    }

    /**
     * 使缓存失效
     * @param {string} key - 缓存键
     */
    async invalidate(key) {
        this.l1Cache.delete(key);
        await this.redis.del(key);
    }
}
```

### 4. 连接池优化

```javascript
/**
 * 数据库连接池配置
 * @description 优化连接池参数提升并发性能
 */

const { Pool } = require('pg');

/**
 * 创建优化的连接池
 * @param {Object} config - 连接池配置
 * @returns {Pool} 连接池实例
 */
function createOptimizedPool(config) {
    return new Pool({
        host: config.host,
        port: config.port || 5432,
        database: config.database,
        user: config.user,
        password: config.password,
        
        max: config.maxConnections || 20,
        min: config.minConnections || 2,
        
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        
        statement_timeout: 10000,
        query_timeout: 10000,
        
        ssl: config.ssl || false,
        
        application_name: config.appName || 'app'
    });
}

/**
 * 连接池健康检查
 * @param {Pool} pool - 连接池实例
 * @returns {Object} 健康状态
 */
async function checkPoolHealth(pool) {
    const client = await pool.connect();
    try {
        await client.query('SELECT 1');
        return {
            healthy: true,
            totalCount: pool.totalCount,
            idleCount: pool.idleCount,
            waitingCount: pool.waitingCount
        };
    } catch (error) {
        return {
            healthy: false,
            error: error.message
        };
    } finally {
        client.release();
    }
}
```

## 最佳实践

### 慢查询监控

```sql
/**
 * PostgreSQL 慢查询日志配置
 * @description 启用慢查询日志记录
 */
-- postgresql.conf
log_min_duration_statement = 1000  -- 记录超过 1 秒的查询
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on

/**
 * 查询 pg_stat_statements 扩展
 * @description 分析历史查询性能
 */
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT 
    calls,
    round(total_exec_time::numeric, 2) AS total_time_ms,
    round(mean_exec_time::numeric, 2) AS avg_time_ms,
    round((100 * total_exec_time / sum(total_exec_time) over())::numeric, 2) AS pct_total,
    query
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### 性能优化检查清单

```yaml
# 数据库性能优化检查清单
索引优化:
  - [ ] 为常用查询条件创建索引
  - [ ] 检查并删除未使用的索引
  - [ ] 使用覆盖索引避免回表
  - [ ] 定期重建膨胀索引

查询优化:
  - [ ] 避免 SELECT *
  - [ ] 使用 EXPLAIN ANALYZE 分析慢查询
  - [ ] 合理使用 JOIN 类型
  - [ ] 使用游标分页替代 OFFSET

缓存策略:
  - [ ] 配置合理的共享缓冲区
  - [ ] 实现应用级缓存层
  - [ ] 设置合适的缓存过期策略
  - [ ] 监控缓存命中率

连接管理:
  - [ ] 使用连接池
  - [ ] 配置合理的连接数上限
  - [ ] 监控连接等待情况
  - [ ] 及时释放连接

维护任务:
  - [ ] 定期执行 VACUUM ANALYZE
  - [ ] 监控表膨胀情况
  - [ ] 更新统计信息
  - [ ] 检查锁等待情况
```

## Quick Reference

| 优化类型 | 技术 | 适用场景 | 效果 |
|---------|------|---------|------|
| B-Tree 索引 | `CREATE INDEX` | 等值/范围查询 | 查询提速 10-100x |
| 部分索引 | `WHERE` 条件 | 过滤特定数据 | 减少索引大小 50%+ |
| 覆盖索引 | `INCLUDE` 列 | 避免回表 | 减少 I/O 操作 |
| 游标分页 | `WHERE id > ?` | 大数据分页 | 避免 OFFSET 性能问题 |
| 查询缓存 | Redis | 热点数据 | 响应时间 < 1ms |
| 多级缓存 | L1 + L2 | 高并发读取 | 减少 DB 压力 90%+ |
| 连接池 | pg Pool | 高并发连接 | 复用连接，减少开销 |
| 批量操作 | 多值 INSERT | 批量写入 | 性能提升 10x+ |
