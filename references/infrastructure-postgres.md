# Postgres Pro 参考

> Reference for: fullstack-dev-skills
> Load when: 用户提及 PostgreSQL、数据库复制、分区表、JSON 数据类型、高级 SQL 特性

## 核心特性

### 1. 数据库复制

PostgreSQL 提供多种复制方案，满足高可用和读写分离需求。

#### 流复制（Streaming Replication）

```sql
-- 主库配置 postgresql.conf
wal_level = replica
max_wal_senders = 10
wal_keep_size = 1GB
synchronous_commit = on
synchronous_standby_names = 'standby1,standby2'

-- 从库配置 postgresql.conf
primary_conninfo = 'host=primary_host port=5432 user=replicator password=xxx'
hot_standby = on
hot_standby_feedback = on
```

#### 逻辑复制（Logical Replication）

```sql
-- 发布端配置
CREATE PUBLICATION user_changes FOR TABLE users, user_profiles;

-- 订阅端配置
CREATE SUBSCRIPTION user_subscription
    CONNECTION 'host=source_host port=5432 dbname=mydb user=replicator'
    PUBLICATION user_changes
    WITH (copy_data = true, create_slot = true);
```

### 2. 表分区

```sql
/**
 * 创建范围分区表
 * @description 按时间范围分区，适用于日志、订单等时序数据
 * @param {string} partition_key - 分区键字段
 * @returns {void}
 */
CREATE TABLE orders (
    id BIGSERIAL,
    user_id BIGINT NOT NULL,
    order_date DATE NOT NULL,
    amount DECIMAL(10, 2),
    status VARCHAR(20)
) PARTITION BY RANGE (order_date);

-- 创建分区
CREATE TABLE orders_2024_q1 PARTITION OF orders
    FOR VALUES FROM ('2024-01-01') TO ('2024-04-01');

CREATE TABLE orders_2024_q2 PARTITION OF orders
    FOR VALUES FROM ('2024-04-01') TO ('2024-07-01');

CREATE TABLE orders_default PARTITION OF orders DEFAULT;

/**
 * 创建列表分区表
 * @description 按区域分区，适用于地域分布数据
 */
CREATE TABLE users_by_region (
    id BIGSERIAL,
    name VARCHAR(100),
    region VARCHAR(20)
) PARTITION BY LIST (region);

CREATE TABLE users_asia PARTITION OF users_by_region
    FOR VALUES IN ('china', 'japan', 'korea');

CREATE TABLE users_europe PARTITION OF users_by_region
    FOR VALUES IN ('uk', 'germany', 'france');

/**
 * 创建哈希分区表
 * @description 均匀分布数据，适用于高并发写入场景
 */
CREATE TABLE events (
    id BIGSERIAL,
    event_type VARCHAR(50),
    payload JSONB,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY HASH (id);

CREATE TABLE events_p0 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 0);
CREATE TABLE events_p1 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 1);
CREATE TABLE events_p2 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 2);
CREATE TABLE events_p3 PARTITION OF events
    FOR VALUES WITH (MODULUS 4, REMAINDER 3);
```

### 3. JSON 支持

```sql
/**
 * JSONB 数据类型操作
 * @description PostgreSQL 的 JSONB 提供高效的 JSON 存储和查询
 */

-- 创建带 JSONB 列的表
CREATE TABLE products (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(200),
    attributes JSONB NOT NULL,
    metadata JSONB DEFAULT '{}'
);

-- 插入 JSON 数据
INSERT INTO products (name, attributes, metadata) VALUES
('笔记本电脑', 
 '{"cpu": "Intel i7", "ram": "16GB", "storage": {"type": "SSD", "size": "512GB"}}',
 '{"brand": "Dell", "warranty": "2年"}');

-- JSONB 查询操作符
SELECT * FROM products WHERE attributes->>'cpu' = 'Intel i7';
SELECT * FROM products WHERE attributes->'storage'->>'type' = 'SSD';
SELECT * FROM products WHERE attributes @> '{"ram": "16GB"}';

-- JSONB 路径查询（PostgreSQL 12+）
SELECT * FROM products
WHERE attributes @? '$.storage.size ? (@ == "512GB")';

-- 更新 JSON 数据
UPDATE products
SET attributes = jsonb_set(attributes, '{ram}', '"32GB"')
WHERE id = 1;

-- 合并 JSON 数据
UPDATE products
SET attributes = attributes || '{"gpu": "RTX 4060"}'
WHERE id = 1;

-- 删除 JSON 键
UPDATE products
SET attributes = attributes - 'gpu'
WHERE id = 1;

-- 创建 GIN 索引加速 JSON 查询
CREATE INDEX idx_products_attributes ON products USING GIN (attributes);
CREATE INDEX idx_products_attributes_path ON products USING GIN (attributes jsonb_path_ops);
```

### 4. 高级 SQL 特性

```sql
/**
 * CTE（公用表表达式）
 * @description 提高复杂查询的可读性和性能
 * @returns {table} 查询结果集
 */
WITH RECURSIVE category_tree AS (
    -- 基础查询
    SELECT id, name, parent_id, 1 AS level
    FROM categories
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- 递归查询
    SELECT c.id, c.name, c.parent_id, ct.level + 1
    FROM categories c
    INNER JOIN category_tree ct ON c.parent_id = ct.id
)
SELECT * FROM category_tree ORDER BY level, name;

/**
 * 窗口函数
 * @description 在不减少行数的情况下进行聚合计算
 */
SELECT 
    id,
    name,
    department,
    salary,
    ROW_NUMBER() OVER (PARTITION BY department ORDER BY salary DESC) AS dept_rank,
    RANK() OVER (ORDER BY salary DESC) AS overall_rank,
    LAG(salary) OVER (ORDER BY salary) AS prev_salary,
    LEAD(salary) OVER (ORDER BY salary) AS next_salary,
    SUM(salary) OVER (PARTITION BY department) AS dept_total,
    AVG(salary) OVER (PARTITION BY department) AS dept_avg
FROM employees;

/**
 * 物化视图
 * @description 缓存复杂查询结果，提升查询性能
 */
CREATE MATERIALIZED VIEW sales_summary AS
SELECT 
    product_id,
    DATE_TRUNC('month', sale_date) AS month,
    SUM(quantity) AS total_qty,
    SUM(amount) AS total_amount,
    COUNT(*) AS transaction_count
FROM sales
GROUP BY product_id, DATE_TRUNC('month', sale_date);

-- 创建索引
CREATE INDEX idx_sales_summary_month ON sales_summary(month);

-- 刷新物化视图
REFRESH MATERIALIZED VIEW CONCURRENTLY sales_summary;

/**
 * UPSERT 操作
 * @description 插入或更新，避免重复数据
 */
INSERT INTO users (email, name, last_login)
VALUES ('user@example.com', '张三', NOW())
ON CONFLICT (email)
DO UPDATE SET 
    name = EXCLUDED.name,
    last_login = EXCLUDED.last_login;
```

## 最佳实践

### 性能优化

```sql
/**
 * 分析查询计划
 * @description 使用 EXPLAIN ANALYZE 分析查询性能
 */
EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
SELECT * FROM orders WHERE user_id = 12345;

/**
 * 更新统计信息
 * @description 定期更新表统计信息以优化查询计划
 */
ANALYZE orders;
VACUUM (ANALYZE, VERBOSE) orders;

/**
 * 并行查询配置
 * @description 启用并行查询提升大表扫描性能
 */
SET max_parallel_workers_per_gather = 4;
SET parallel_tuple_cost = 0.001;
SET parallel_setup_cost = 100;
```

### 连接池配置

```javascript
/**
 * Node.js 连接池配置示例
 * @description 使用 pg 模块配置高效连接池
 * @param {Object} config - 连接池配置对象
 * @returns {Pool} PostgreSQL 连接池实例
 */
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.PG_HOST,
    port: process.env.PG_PORT || 5432,
    database: process.env.PG_DATABASE,
    user: process.env.PG_USER,
    password: process.env.PG_PASSWORD,
    max: 20,                    // 最大连接数
    idleTimeoutMillis: 30000,   // 空闲超时
    connectionTimeoutMillis: 2000,  // 连接超时
    statement_timeout: 10000,   // 语句超时
});

/**
 * 执行参数化查询
 * @param {string} sql - SQL 查询语句
 * @param {Array} params - 查询参数
 * @returns {Promise<Array>} 查询结果
 */
async function query(sql, params = []) {
    const client = await pool.connect();
    try {
        const result = await client.query(sql, params);
        return result.rows;
    } finally {
        client.release();
    }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| 流复制 | 高可用、读写分离 | `primary_conninfo` 配置 |
| 逻辑复制 | 表级复制、数据同步 | `CREATE PUBLICATION/SUBSCRIPTION` |
| 范围分区 | 时序数据分区 | `PARTITION BY RANGE` |
| 列表分区 | 地域数据分区 | `PARTITION BY LIST` |
| 哈希分区 | 均匀分布数据 | `PARTITION BY HASH` |
| JSONB | JSON 数据存储查询 | `attributes->>'key'` |
| GIN 索引 | 加速 JSON 查询 | `USING GIN (column)` |
| CTE | 复杂查询分解 | `WITH RECURSIVE` |
| 窗口函数 | 行级聚合计算 | `OVER (PARTITION BY ...)` |
| 物化视图 | 缓存查询结果 | `REFRESH MATERIALIZED VIEW` |
| UPSERT | 插入或更新 | `ON CONFLICT DO UPDATE` |
