# PostgreSQL 开发模式参考

PostgreSQL 索引策略、查询优化、连接池配置和性能调优最佳实践，用于构建高性能、可扩展的数据库应用。

## When to Activate

- 设计数据库表结构和索引
- 优化慢查询
- 配置连接池
- 进行性能调优
- 排查数据库性能问题

## Core Principles

### 1. 索引是双刃剑

索引加速查询但增加写入开销，需要平衡读写性能。

```sql
-- Good: 为高频查询条件创建索引
CREATE INDEX idx_users_email ON users(email);

-- Bad: 过度索引影响写入性能
CREATE INDEX idx_users_col1 ON users(col1);
CREATE INDEX idx_users_col2 ON users(col2);
CREATE INDEX idx_users_col3 ON users(col3);
-- 如果这些列很少单独查询，考虑组合索引
```

### 2. 查询计划优先

始终使用 EXPLAIN ANALYZE 验证查询性能。

```sql
-- Good: 分析查询计划
EXPLAIN ANALYZE
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id
WHERE u.created_at > '2024-01-01';

-- 关注关键指标：
-- - Seq Scan（顺序扫描）vs Index Scan（索引扫描）
-- - 执行时间
-- - 行数估计准确性
```

### 3. 连接池是必需品

生产环境必须使用连接池管理数据库连接。

```sql
-- 数据库端连接限制
SHOW max_connections;

-- 应用端连接池配置应小于 max_connections
-- 公式: 连接池大小 = ((核心数 * 2) + 有效磁盘数)
```

## 索引策略

### B-tree 索引（默认）

适用于等值查询、范围查询、排序操作。

```sql
/**
 * 创建 B-tree 索引
 * 适用于: =, <, >, <=, >=, BETWEEN, IN, ORDER BY
 */
CREATE INDEX idx_users_created_at ON users(created_at);

/**
 * 组合索引 - 遵循最左前缀原则
 * 查询条件顺序应与索引列顺序匹配
 */
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- 有效使用索引的查询
SELECT * FROM orders WHERE user_id = 123;                    -- 使用索引
SELECT * FROM orders WHERE user_id = 123 AND status = 'paid'; -- 使用索引
SELECT * FROM orders WHERE status = 'paid';                   -- 不使用索引（违反最左前缀）

/**
 * 降序索引 - 优化 ORDER BY DESC
 */
CREATE INDEX idx_users_created_desc ON users(created_at DESC);

/**
 * 唯一索引 - 保证数据完整性
 */
CREATE UNIQUE INDEX idx_users_email_unique ON users(email);
```

### GIN 索引（Generalized Inverted Index）

适用于数组、JSONB、全文搜索、多值元素。

```sql
/**
 * JSONB 索引
 * 支持 @>, @?, ? 等操作符
 */
CREATE INDEX idx_products_attrs ON products USING GIN (attributes);

-- 查询示例
SELECT * FROM products WHERE attributes @> '{"color": "red"}';

/**
 * 数组索引
 */
CREATE INDEX idx_tags ON articles USING GIN (tags);

-- 查询示例
SELECT * FROM articles WHERE tags @> ARRAY['postgresql', 'database'];

/**
 * 全文搜索索引
 */
CREATE INDEX idx_posts_content_fts ON posts USING GIN (to_tsvector('english', content));

-- 查询示例
SELECT * FROM posts WHERE to_tsvector('english', content) @@ to_tsquery('postgresql & performance');

/**
 * GIN 索引配置 - fastupdate 延迟更新
 * 适用于高写入场景，牺牲查询性能换取写入性能
 */
CREATE INDEX idx_logs_data ON logs USING GIN (data) WITH (fastupdate = on);
```

### GiST 索引（Generalized Search Tree）

适用于几何数据、范围类型、排除约束。

```sql
/**
 * 几何数据索引
 */
CREATE INDEX idx_locations_point ON locations USING GIST (point);

-- 范围查询示例
SELECT * FROM locations WHERE point <@ box '((0,0),(10,10))';

/**
 * 范围类型索引
 */
CREATE INDEX idx_events_duration ON events USING GIST (duration);

-- 重叠查询
SELECT * FROM events WHERE duration && tsrange('2024-01-01', '2024-01-31');

/**
 * 排除约束 - 防止时间重叠
 */
CREATE TABLE reservations (
    id SERIAL PRIMARY KEY,
    room_id INT,
    during TSRANGE,
    EXCLUDE USING GIST (
        room_id WITH =,
        during WITH &&
    )
);
```

### BRIN 索引（Block Range Index）

适用于大表、自然排序数据、低维护成本场景。

```sql
/**
 * BRIN 索引 - 存储块级摘要
 * 适用于按时间顺序插入的大表
 */
CREATE INDEX idx_logs_created_brin ON logs USING BRIN (created_at);

/**
 * BRIN 索引配置
 * pages_per_range: 每个摘要覆盖的页数，默认128
 */
CREATE INDEX idx_logs_created_brin ON logs USING BRIN (created_at) WITH (pages_per_range = 64);

/**
 * 多列 BRIN 索引
 */
CREATE INDEX idx_logs_multi_brin ON logs USING BRIN (created_at, level);
```

### 部分索引

只为满足条件的行创建索引，节省空间。

```sql
/**
 * 部分索引 - 只索引活跃用户
 */
CREATE INDEX idx_active_users_email ON users(email) WHERE is_active = true;

/**
 * 部分索引 - 只索引未处理订单
 */
CREATE INDEX idx_pending_orders ON orders(created_at) WHERE status = 'pending';

/**
 * 部分索引 - 只索引非空值
 */
CREATE INDEX idx_users_phone ON users(phone) WHERE phone IS NOT NULL;
```

### 表达式索引

对计算结果创建索引。

```sql
/**
 * 函数表达式索引
 */
CREATE INDEX idx_users_lower_email ON users(LOWER(email));

-- 查询时必须使用相同表达式
SELECT * FROM users WHERE LOWER(email) = 'user@example.com';

/**
 * 日期提取索引
 */
CREATE INDEX idx_orders_year ON orders(EXTRACT(YEAR FROM created_at));

/**
 * JSONB 路径索引
 */
CREATE INDEX idx_products_price ON products((data->>'price')::numeric);
```

## 查询优化技巧

### 避免 SELECT *

```sql
-- Bad: 获取所有列，增加网络传输和内存消耗
SELECT * FROM users WHERE id = 1;

-- Good: 只选择需要的列
SELECT id, name, email FROM users WHERE id = 1;
```

### 使用覆盖索引

```sql
/**
 * 覆盖索引 - 包含查询所需的所有列
 * 避免回表查询
 */
CREATE INDEX idx_orders_user_covering ON orders(user_id, status) INCLUDE (total, created_at);

-- 该查询只需访问索引，无需访问表数据
SELECT status, total, created_at
FROM orders
WHERE user_id = 123;
```

### 优化 JOIN 操作

```sql
/**
 * JOIN 顺序优化
 * 小表驱动大表
 */
-- Good: 先过滤再 JOIN
SELECT u.name, o.total
FROM (SELECT id, name FROM users WHERE status = 'active') u
JOIN orders o ON u.id = o.user_id;

/**
 * 使用 EXISTS 替代 IN
 * EXISTS 在找到第一条匹配就停止
 */
-- Good: EXISTS 对于大子查询更高效
SELECT u.name
FROM users u
WHERE EXISTS (
    SELECT 1 FROM orders o WHERE o.user_id = u.id
);

-- Bad: IN 可能扫描整个子查询结果
SELECT u.name
FROM users u
WHERE u.id IN (SELECT user_id FROM orders);

/**
 * 避免笛卡尔积
 */
-- Bad: 缺少 JOIN 条件
SELECT u.name, o.total
FROM users u, orders o;

-- Good: 明确 JOIN 条件
SELECT u.name, o.total
FROM users u
JOIN orders o ON u.id = o.user_id;
```

### 分页优化

```sql
/**
 * 传统分页 - OFFSET 性能问题
 */
-- Bad: 大 OFFSET 导致扫描跳过大量行
SELECT * FROM orders ORDER BY id OFFSET 100000 LIMIT 20;

/**
 * Keyset 分页 - 使用上一页最后一条记录
 */
-- Good: 使用 WHERE 条件定位
SELECT * FROM orders
WHERE id > 100000
ORDER BY id
LIMIT 20;

/**
 * 复合键分页
 */
SELECT * FROM orders
WHERE (created_at, id) > ('2024-01-15 10:00:00', 5000)
ORDER BY created_at, id
LIMIT 20;
```

### 批量操作优化

```sql
/**
 * 批量插入 - 使用 COPY 或多行 VALUES
 */
-- Good: 多行 VALUES
INSERT INTO users (name, email) VALUES
    ('Alice', 'alice@example.com'),
    ('Bob', 'bob@example.com'),
    ('Charlie', 'charlie@example.com');

-- Best: COPY 命令（最快）
COPY users (name, email) FROM '/path/to/data.csv' CSV;

/**
 * 批量更新 - 使用 UPDATE ... FROM
 */
UPDATE orders o
SET status = 'completed'
FROM temp_completed_orders t
WHERE o.id = t.order_id;

/**
 * 批量删除 - 分批处理避免长事务
 */
-- 分批删除，每次删除 10000 条
DELETE FROM logs
WHERE created_at < '2023-01-01'
AND ctid IN (
    SELECT ctid FROM logs
    WHERE created_at < '2023-01-01'
    LIMIT 10000
);
```

### 避免索引失效

```sql
/**
 * 避免在索引列上使用函数
 */
-- Bad: 函数导致索引失效
SELECT * FROM users WHERE UPPER(email) = 'USER@EXAMPLE.COM';

-- Good: 使用表达式索引或修改查询
SELECT * FROM users WHERE email = LOWER('USER@EXAMPLE.COM');

/**
 * 避免隐式类型转换
 */
-- Bad: 字符串与数字比较导致索引失效
SELECT * FROM users WHERE phone = 13800138000;

-- Good: 类型匹配
SELECT * FROM users WHERE phone = '13800138000';

/**
 * 避免 LIKE 前缀通配符
 */
-- Bad: 前缀通配符无法使用索引
SELECT * FROM users WHERE name LIKE '%john%';

-- Good: 后缀通配符可以使用索引
SELECT * FROM users WHERE name LIKE 'john%';

-- Best: 使用全文搜索
SELECT * FROM users WHERE to_tsvector(name) @@ to_tsquery('john');
```

## 连接池配置

### PgBouncer 配置

```ini
; pgbouncer.ini

[database]
; 数据库连接配置
mydb = host=127.0.0.1 port=5432 dbname=mydb user=app password=secret

[pgbouncer]
; 监听配置
listen_addr = 0.0.0.0
listen_port = 6432

; 连接池模式
; session: 会话级池化，最安全但效率最低
; transaction: 事务级池化，推荐大多数场景
; statement: 语句级池化，不支持事务
pool_mode = transaction

; 连接池大小
; 计算: max_client_conn 应大于应用总连接需求
; default_pool_size 应小于数据库 max_connections
max_client_conn = 1000
default_pool_size = 25

; 最小连接数
min_pool_size = 5

; 连接保留数量（用于管理连接）
reserve_pool_size = 5
reserve_pool_timeout = 3

; 超时配置
; 客户端连接超时
client_idle_timeout = 0
; 服务端连接超时
server_idle_timeout = 600
; 服务端连接生命周期
server_lifetime = 3600
; 连接获取超时
acquire_timeout = 30

; 日志配置
log_connections = 1
log_disconnections = 1
log_pooler_errors = 1

; 管理用户
admin_users = postgres
stats_users = postgres

[users]
; 用户配置
app = password=secret
```

### 应用层连接池配置

```javascript
/**
 * Node.js - pg 连接池配置
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'mydb',
    user: 'app',
    password: 'secret',
    
    // 连接池大小
    max: 20,                    // 最大连接数
    min: 2,                     // 最小连接数
    idleTimeoutMillis: 30000,   // 空闲连接超时
    connectionTimeoutMillis: 2000, // 连接获取超时
    
    // 健康检查
    allowExitOnIdle: false,
});

/**
 * 连接池使用示例
 */
async function queryWithPool() {
    const client = await pool.connect();
    try {
        const result = await client.query('SELECT * FROM users WHERE id = $1', [1]);
        return result.rows;
    } finally {
        client.release();
    }
}
```

```python
"""
Python - asyncpg 连接池配置
"""
import asyncpg

async def create_pool():
    pool = await asyncpg.create_pool(
        host='localhost',
        port=5432,
        database='mydb',
        user='app',
        password='secret',
        
        # 连接池大小
        min_size=2,           # 最小连接数
        max_size=20,          # 最大连接数
        
        # 超时配置
        command_timeout=60,   # 命令超时
        max_inactive_connection_lifetime=300,  # 空闲连接生命周期
    )
    return pool

async def query_with_pool(pool):
    async with pool.acquire() as conn:
        return await conn.fetch('SELECT * FROM users WHERE id = $1', 1)
```

```java
/**
 * Java - HikariCP 连接池配置
 */
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;

HikariConfig config = new HikariConfig();
config.setJdbcUrl("jdbc:postgresql://localhost:5432/mydb");
config.setUsername("app");
config.setPassword("secret");

// 连接池大小
config.setMaximumPoolSize(20);
config.setMinimumIdle(2);

// 超时配置
config.setConnectionTimeout(30000);      // 连接获取超时
config.setIdleTimeout(600000);           // 空闲连接超时
config.setMaxLifetime(1800000);          // 连接最大生命周期

// 性能优化
config.addDataSourceProperty("preparedStatementCacheQueries", 256);
config.addDataSourceProperty("preparedStatementCacheSizeMiB", 5);
config.addDataSourceProperty("cachePrepStmts", "true");
config.addDataSourceProperty("useServerPrepStmts", "true");

HikariDataSource dataSource = new HikariDataSource(config);
```

## 性能调优参数

### 内存配置

```sql
/**
 * 共享缓冲区 - 数据缓存
 * 推荐: 系统内存的 25%
 */
ALTER SYSTEM SET shared_buffers = '4GB';

/**
 * 工作内存 - 排序、哈希操作
 * 注意: 每个操作可能分配多个 work_mem
 */
ALTER SYSTEM SET work_mem = '64MB';

/**
 * 维护工作内存 - VACUUM、CREATE INDEX
 */
ALTER SYSTEM SET maintenance_work_mem = '512MB';

/**
 * 有效缓存大小 - 查询规划器估计
 * 应包含 shared_buffers + 操作系统缓存
 */
ALTER SYSTEM SET effective_cache_size = '12GB';

/**
 * 巨大页面 - 大内存服务器
 */
ALTER SYSTEM SET huge_pages = 'try';
```

### WAL 配置

```sql
/**
 * WAL 缓冲区
 */
ALTER SYSTEM SET wal_buffers = '64MB';

/**
 * 检查点配置
 * checkpoint_completion_target: 0.9 让检查点更平滑
 */
ALTER SYSTEM SET checkpoint_completion_target = 0.9;
ALTER SYSTEM SET max_wal_size = '2GB';
ALTER SYSTEM SET min_wal_size = '512MB';

/**
 * WAL 压缩
 */
ALTER SYSTEM SET wal_compression = 'on';

/**
 * 同步提交 - 性能与持久性权衡
 * off: 可能丢失最近 0.5 秒数据，但性能提升
 */
ALTER SYSTEM SET synchronous_commit = 'on';  -- 生产环境推荐 on
```

### 并行查询配置

```sql
/**
 * 最大并行工作进程
 */
ALTER SYSTEM SET max_parallel_workers = 8;

/**
 * 每个收集器的最大并行工作进程
 */
ALTER SYSTEM SET max_parallel_workers_per_gather = 4;

/**
 * 并行查询最小表大小
 */
ALTER SYSTEM SET min_parallel_table_scan_size = '8MB';

/**
 * 并行元组成本
 */
ALTER SYSTEM SET parallel_tuple_cost = 0.1;
ALTER SYSTEM SET parallel_setup_cost = 1000;
```

### 统计信息配置

```sql
/**
 * 默认统计目标 - 影响查询计划准确性
 */
ALTER SYSTEM SET default_statistics_target = 100;

/**
 * 为特定列增加统计精度
 */
ALTER TABLE users ALTER COLUMN email SET STATISTICS 500;

/**
 * 扩展统计信息 - 多列相关性
 */
CREATE STATISTICS s1 (dependencies, ndistinct) ON col1, col2 FROM mytable;
ANALYZE mytable;
```

### 自动清理配置

```sql
/**
 * 自动清理间隔
 */
ALTER SYSTEM SET autovacuum_naptime = '1min';

/**
 * 触发清理的阈值
 */
ALTER SYSTEM SET autovacuum_vacuum_threshold = 50;
ALTER SYSTEM SET autovacuum_vacuum_scale_factor = 0.1;

/**
 * 清理工作进程数
 */
ALTER SYSTEM SET autovacuum_max_workers = 3;

/**
 * 清理成本限制
 */
ALTER SYSTEM SET autovacuum_vacuum_cost_limit = 200;
ALTER SYSTEM SET autovacuum_vacuum_cost_delay = '2ms';

/**
 * 表级自动清理配置
 */
ALTER TABLE large_logs SET (
    autovacuum_vacuum_scale_factor = 0.05,
    autovacuum_vacuum_cost_limit = 1000
);
```

## SQL 优化示例

### 慢查询优化案例

```sql
/**
 * 案例 1: 优化 COUNT 查询
 */
-- 问题: 大表 COUNT(*) 慢
SELECT COUNT(*) FROM orders WHERE status = 'pending';

-- 解决方案 1: 使用估计值
SELECT reltuples::bigint AS estimate
FROM pg_class WHERE relname = 'orders';

-- 解决方案 2: 维护计数表
CREATE TABLE order_counts (
    status VARCHAR(20) PRIMARY KEY,
    count BIGINT
);

-- 使用触发器更新计数
CREATE OR REPLACE FUNCTION update_order_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO order_counts (status, count)
        VALUES (NEW.status, 1)
        ON CONFLICT (status) DO UPDATE SET count = order_counts.count + 1;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE order_counts SET count = count - 1 WHERE status = OLD.status;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE order_counts SET count = count - 1 WHERE status = OLD.status;
        INSERT INTO order_counts (status, count)
        VALUES (NEW.status, 1)
        ON CONFLICT (status) DO UPDATE SET count = order_counts.count + 1;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

/**
 * 案例 2: 优化子查询
 */
-- 问题: 相关子查询性能差
SELECT u.*,
    (SELECT COUNT(*) FROM orders o WHERE o.user_id = u.id) AS order_count
FROM users u;

-- 解决方案: 使用 LEFT JOIN + GROUP BY
SELECT u.*, COALESCE(o.order_count, 0) AS order_count
FROM users u
LEFT JOIN (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
) o ON u.id = o.user_id;

/**
 * 案例 3: 优化 OR 条件
 */
-- 问题: OR 条件可能导致索引失效
SELECT * FROM orders
WHERE user_id = 123 OR status = 'pending';

-- 解决方案: 使用 UNION ALL
SELECT * FROM orders WHERE user_id = 123
UNION
SELECT * FROM orders WHERE status = 'pending' AND user_id != 123;

/**
 * 案例 4: 优化 JSONB 查询
 */
-- 问题: JSONB 深层查询慢
SELECT * FROM products WHERE data->'attributes'->'color'->>'value' = 'red';

-- 解决方案: 创建 GIN 索引或表达式索引
CREATE INDEX idx_products_color ON products((data->'attributes'->'color'->>'value'));
```

### CTE 优化

```sql
/**
 * CTE 优化提示
 * PostgreSQL 12+ 使用 MATERIALIZED 关键字控制
 */
-- 默认: MATERIALIZED（物化，存储中间结果）
WITH user_orders AS MATERIALIZED (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    GROUP BY user_id
)
SELECT u.name, uo.order_count
FROM users u
JOIN user_orders uo ON u.id = uo.user_id;

-- NOT MATERIALIZED（内联，可能更高效）
WITH user_orders AS NOT MATERIALIZED (
    SELECT user_id, COUNT(*) AS order_count
    FROM orders
    WHERE created_at > '2024-01-01'
    GROUP BY user_id
)
SELECT u.name, uo.order_count
FROM users u
JOIN user_orders uo ON u.id = uo.user_id
WHERE u.status = 'active';
```

## 性能监控指标

### 关键监控查询

```sql
/**
 * 活动连接监控
 */
SELECT 
    pid,
    usename,
    application_name,
    state,
    wait_event_type,
    wait_event,
    query_start,
    NOW() - query_start AS duration,
    query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC;

/**
 * 长事务检测
 */
SELECT 
    pid,
    usename,
    NOW() - xact_start AS transaction_duration,
    query
FROM pg_stat_activity
WHERE xact_start IS NOT NULL
ORDER BY transaction_duration DESC;

/**
 * 锁等待分析
 */
SELECT 
    blocked_locks.pid AS blocked_pid,
    blocked_activity.usename AS blocked_user,
    blocking_locks.pid AS blocking_pid,
    blocking_activity.usename AS blocking_user,
    blocked_activity.query AS blocked_statement,
    blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
    AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
    AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
    AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
    AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
    AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

/**
 * 表统计信息
 */
SELECT 
    schemaname,
    relname AS table_name,
    n_live_tup AS row_count,
    n_dead_tup AS dead_rows,
    n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0) AS dead_ratio,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC;

/**
 * 索引使用率
 */
SELECT 
    schemaname,
    relname AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan ASC;

/**
 * 未使用索引检测
 */
SELECT 
    schemaname || '.' || relname AS table,
    indexrelname AS index,
    pg_size_pretty(pg_relation_size(i.indexrelid)) AS index_size,
    idx_scan AS index_scans
FROM pg_stat_user_indexes ui
JOIN pg_index i ON ui.indexrelid = i.indexrelid
WHERE NOT i.indisunique 
    AND idx_scan < 50
    AND pg_relation_size(i.indexrelid) > 1024 * 1024
ORDER BY pg_relation_size(i.indexrelid) DESC;

/**
 * 缓存命中率
 */
SELECT 
    sum(heap_blks_read) AS heap_read,
    sum(heap_blks_hit) AS heap_hit,
    sum(heap_blks_hit)::float / NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0) AS ratio
FROM pg_statio_user_tables;

/**
 * 查询性能统计（需要 pg_stat_statements 扩展）
 */
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

SELECT 
    query,
    calls,
    total_exec_time / 1000 AS total_time_seconds,
    mean_exec_time AS avg_time_ms,
    rows,
    100.0 * shared_blks_hit / NULLIF(shared_blks_hit + shared_blks_read, 0) AS cache_hit_percent
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 20;
```

### 系统监控视图

```sql
/**
 * 数据库大小监控
 */
SELECT 
    datname,
    pg_size_pretty(pg_database_size(datname)) AS size
FROM pg_database
WHERE datistemplate = false
ORDER BY pg_database_size(datname) DESC;

/**
 * 表大小监控（包含索引）
 */
SELECT 
    schemaname,
    relname AS table_name,
    pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
    pg_size_pretty(pg_relation_size(relid)) AS table_size,
    pg_size_pretty(pg_indexes_size(relid)) AS indexes_size
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 20;

/**
 * 复制延迟监控
 */
SELECT 
    client_addr,
    state,
    sync_state,
    replay_lag,
    write_lag,
    flush_lag
FROM pg_stat_replication;

/**
 * WAL 位置监控
 */
SELECT 
    pg_current_wal_lsn(),
    pg_walfile_name(pg_current_wal_lsn());
```

### 性能基线指标

| 指标 | 健康阈值 | 说明 |
|------|----------|------|
| 缓存命中率 | > 99% | shared_buffers 效率 |
| 死元组比例 | < 10% | 需要 vacuum 的程度 |
| 索引使用率 | > 90% | 索引有效性 |
| 活动连接数 | < 80% max_connections | 连接池健康度 |
| 长事务时长 | < 5 分钟 | 事务积压风险 |
| 锁等待 | 0 | 并发冲突 |
| 复制延迟 | < 1 秒 | 主从同步健康 |

## 常用维护命令

```sql
/**
 * 手动 VACUUM
 */
-- 普通 VACUUM（不锁表）
VACUUM ANALYZE users;

-- VACUUM FULL（锁表，重建表）
VACUUM FULL ANALYZE users;

/**
 * 重建索引
 */
-- 并发重建索引（不锁表）
REINDEX INDEX CONCURRENTLY idx_users_email;

-- 重建表所有索引
REINDEX TABLE CONCURRENTLY users;

/**
 * 更新统计信息
 */
ANALYZE users;
ANALYZE users (email, status);

/**
 * 表空间管理
 */
CREATE TABLESPACE fast_storage LOCATION '/ssd/pgdata';
ALTER TABLE hot_data SET TABLESPACE fast_storage;
```

## Quick Reference: 索引选择

| 场景 | 推荐索引 | 示例 |
|------|----------|------|
| 等值查询 | B-tree | `WHERE email = 'x'` |
| 范围查询 | B-tree | `WHERE age > 18` |
| 排序 | B-tree | `ORDER BY created_at` |
| 数组包含 | GIN | `WHERE tags @> ARRAY['a']` |
| JSONB 查询 | GIN | `WHERE data @> '{"k":"v"}'` |
| 全文搜索 | GIN | `WHERE to_tsvector() @@ to_tsquery()` |
| 几何数据 | GiST | `WHERE point <@ box` |
| 时间范围排除 | GiST | `EXCLUDE USING GIST` |
| 大表时序数据 | BRIN | `WHERE created_at > '2024-01-01'` |

## Anti-Patterns to Avoid

```sql
-- Bad: 过度使用 OFFSET 分页
SELECT * FROM logs ORDER BY id OFFSET 1000000 LIMIT 100;

-- Good: 使用 keyset 分页
SELECT * FROM logs WHERE id > 1000000 ORDER BY id LIMIT 100;

-- Bad: 在索引列上使用函数
SELECT * FROM users WHERE DATE(created_at) = '2024-01-01';

-- Good: 使用范围查询
SELECT * FROM users WHERE created_at >= '2024-01-01' AND created_at < '2024-01-02';

-- Bad: 大批量 DELETE
DELETE FROM logs WHERE created_at < '2023-01-01';

-- Good: 分批删除
DELETE FROM logs WHERE created_at < '2023-01-01' AND ctid IN (
    SELECT ctid FROM logs WHERE created_at < '2023-01-01' LIMIT 10000
);

-- Bad: 不使用连接池
-- 每次请求都创建新连接

-- Good: 使用连接池
-- 复用数据库连接

-- Bad: 忽略 EXPLAIN ANALYZE
-- 凭直觉写查询

-- Good: 始终分析查询计划
EXPLAIN ANALYZE SELECT ...;

-- Bad: 过早优化
-- 为所有列创建索引

-- Good: 基于实际查询模式优化
-- 分析慢查询日志后创建索引
```

**Remember**: PostgreSQL 性能优化是一个持续过程。始终基于实际数据和查询模式进行优化，使用 EXPLAIN ANALYZE 验证效果，并建立监控体系持续跟踪性能指标。
