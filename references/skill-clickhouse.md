# ClickHouse 数据工程模式参考

ClickHouse 查询优化、数据建模、聚合函数、物化视图和性能调优最佳实践，用于构建高性能 OLAP 分析系统。

## When to Activate

- 设计 ClickHouse 表结构和数据模型
- 优化分析查询性能
- 配置物化视图和投影
- 进行大数据聚合分析
- 排查 ClickHouse 性能问题

## Core Principles

### 1. 列式存储优化

ClickHouse 是列式数据库，查询时应只选择需要的列。

```sql
-- Good: 只选择需要的列，利用列式存储优势
SELECT user_id, SUM(amount) AS total_amount
FROM orders
WHERE created_at >= today() - INTERVAL 7 DAY
GROUP BY user_id;

-- Bad: SELECT * 导致读取所有列数据
SELECT * FROM orders WHERE created_at >= today() - INTERVAL 7 DAY;
```

### 2. 分区与排序键设计

合理设计分区键和排序键是性能优化的核心。

```sql
/**
 * 分区键(PARTITION BY): 按时间或维度分区，便于数据管理和查询裁剪
 * 排序键(ORDER BY): 决定数据物理排序，影响查询性能
 * 主键(PRIMARY KEY): 稀疏索引，通常与排序键相同
 */
CREATE TABLE events (
    event_id UUID,
    user_id UInt64,
    event_type String,
    event_time DateTime,
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)  -- 按月分区
ORDER BY (event_time, user_id)     -- 按时间和用户排序
PRIMARY KEY (event_time, user_id)  -- 稀疏索引
SETTINGS index_granularity = 8192;
```

### 3. 批量写入原则

ClickHouse 对大批量写入友好，避免小批量频繁写入。

```sql
-- Good: 批量插入大量数据
INSERT INTO events SELECT * FROM staging_events;

-- Bad: 频繁小批量插入（会导致大量分区合并）
INSERT INTO events VALUES (1, 'event1');
INSERT INTO events VALUES (2, 'event2');
INSERT INTO events VALUES (3, 'event3');
```

## 表引擎选择

### MergeTree 系列（核心引擎）

```sql
/**
 * MergeTree - 基础引擎，支持主键、分区、排序
 * 适用于: 大多数 OLAP 场景
 */
CREATE TABLE page_views (
    view_id UUID DEFAULT generateUUIDv4(),
    user_id UInt64,
    page_url String,
    referrer String,
    view_time DateTime,
    duration_ms UInt32,
    device_type LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMMDD(view_time)
ORDER BY (view_time, user_id)
SETTINGS index_granularity = 8192;

/**
 * ReplacingMergeTree - 自动去重
 * 适用于: 需要最新数据的场景
 */
CREATE TABLE user_profiles (
    user_id UInt64,
    profile_data String,
    updated_at DateTime,
    version UInt64
) ENGINE = ReplacingMergeTree(version)  -- 使用 version 字段保留最新版本
PARTITION BY toYYYYMM(updated_at)
ORDER BY user_id;

/**
 * SummingMergeTree - 预聚合求和
 * 适用于: 预聚合指标存储
 */
CREATE TABLE daily_stats (
    stat_date Date,
    metric_name String,
    dimension String,
    value UInt64
) ENGINE = SummingMergeTree(value)
PARTITION BY toYYYYMM(stat_date)
ORDER BY (stat_date, metric_name, dimension);

/**
 * AggregatingMergeTree - 高级预聚合
 * 适用于: 复杂聚合函数预计算
 */
CREATE TABLE user_aggregates (
    user_id UInt64,
    date Date,
    uniq_users AggregateFunction(uniq, UInt64),
    sum_duration AggregateFunction(sum, UInt64),
    avg_amount AggregateFunction(avg, Float64)
) ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id);

/**
 * CollapsingMergeTree - 折叠合并
 * 适用于: 增量更新场景
 */
CREATE TABLE user_actions (
    user_id UInt64,
    action_type String,
    action_time DateTime,
    sign Int8  -- 1 表示添加，-1 表示删除
) ENGINE = CollapsingMergeTree(sign)
PARTITION BY toYYYYMM(action_time)
ORDER BY (user_id, action_time);
```

### 日志引擎系列

```sql
/**
 * TinyLog - 轻量级日志表
 * 适用于: 临时数据、小表
 */
CREATE TABLE temp_logs (
    message String,
    log_time DateTime
) ENGINE = TinyLog;

/**
 * StripeLog - 条带日志
 * 适用于: 中等规模日志数据
 */
CREATE TABLE app_logs (
    level String,
    message String,
    log_time DateTime
) ENGINE = StripeLog;
```

### 分布式表

```sql
/**
 * Distributed - 分布式表引擎
 * 用于跨分片查询
 */
CREATE TABLE events_local ON CLUSTER '{cluster}' (
    event_id UUID,
    user_id UInt64,
    event_time DateTime,
    event_type String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{database}/{table}/{shard}', '{replica}')
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);

CREATE TABLE events_global ON CLUSTER '{cluster}' AS events_local
ENGINE = Distributed('{cluster}', currentDatabase(), 'events_local', rand());
```

## 数据建模模式

### 大宽表模式

```sql
/**
 * 大宽表 - ClickHouse 推荐模式
 * 避免 JOIN，将维度直接存储在事实表中
 */
CREATE TABLE fact_orders (
    order_id UInt64,
    order_time DateTime,
    
    -- 用户维度（直接存储）
    user_id UInt64,
    user_name String,
    user_email String,
    user_level LowCardinality(String),
    user_register_date Date,
    
    -- 商品维度（直接存储）
    product_id UInt64,
    product_name String,
    category_id UInt64,
    category_name String,
    brand_name String,
    
    -- 地理维度（直接存储）
    country String,
    province String,
    city String,
    
    -- 度量值
    quantity UInt32,
    unit_price Decimal(10, 2),
    total_amount Decimal(12, 2),
    discount_amount Decimal(10, 2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(order_time)
ORDER BY (order_time, user_id, order_id);
```

### 星型模式（使用字典）

```sql
/**
 * 字典 - 用于维度表快速查找
 * 避免 JOIN，使用 dictGet 函数
 */
CREATE DICTIONARY dim_user_dict (
    user_id UInt64,
    user_name String,
    user_level String,
    register_date Date
) PRIMARY KEY user_id
SOURCE(MYSQL(
    host 'mysql-host'
    port 3306
    user 'clickhouse'
    password 'secret'
    db 'dim_db'
    table 'dim_user'
))
LAYOUT(HASHED())
LIFETIME(MIN 300 MAX 600);

-- 使用字典查询
SELECT 
    order_id,
    user_id,
    dictGet('dim_user_dict', 'user_name', user_id) AS user_name,
    dictGet('dim_user_dict', 'user_level', user_id) AS user_level,
    total_amount
FROM fact_orders
WHERE order_time >= today() - INTERVAL 7 DAY;
```

### 预聚合模式

```sql
/**
 * 物化视图 - 自动预聚合
 * 源表数据变更时自动更新
 */
CREATE TABLE orders_raw (
    order_id UInt64,
    order_time DateTime,
    user_id UInt64,
    product_id UInt64,
    quantity UInt32,
    amount Decimal(12, 2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(order_time)
ORDER BY (order_time, order_id);

-- 创建预聚合物化视图
CREATE MATERIALIZED VIEW orders_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(stat_date)
ORDER BY (stat_date, user_id)
AS SELECT
    toDate(order_time) AS stat_date,
    user_id,
    count() AS order_count,
    sum(quantity) AS total_quantity,
    sum(amount) AS total_amount
FROM orders_raw
GROUP BY stat_date, user_id;

-- 查询预聚合数据
SELECT 
    stat_date,
    sum(order_count) AS total_orders,
    sum(total_amount) AS total_revenue
FROM orders_daily_mv
WHERE stat_date >= today() - INTERVAL 30 DAY
GROUP BY stat_date
ORDER BY stat_date;
```

## 聚合函数使用

### 基础聚合函数

```sql
/**
 * 常用聚合函数
 */
SELECT 
    count() AS total_count,                    -- 计数
    count(DISTINCT user_id) AS unique_users,   -- 去重计数
    sum(amount) AS total_amount,               -- 求和
    avg(amount) AS avg_amount,                 -- 平均值
    min(amount) AS min_amount,                 -- 最小值
    max(amount) AS max_amount,                 -- 最大值
    median(amount) AS median_amount,           -- 中位数
    quantile(0.95)(amount) AS p95_amount,      -- 95分位数
    quantile(0.99)(amount) AS p99_amount       -- 99分位数
FROM orders
WHERE order_time >= today() - INTERVAL 7 DAY;
```

### 高级聚合函数

```sql
/**
 * uniq 系列函数 - 近似去重计数
 * uniq: 默认实现，精度与性能平衡
 * uniqExact: 精确计数，内存消耗大
 * uniqHLL12: HyperLogLog 算法，内存效率高
 * uniqTheta: Theta Sketch，支持集合操作
 */
SELECT 
    uniq(user_id) AS unique_users,           -- 近似去重
    uniqExact(user_id) AS exact_users,       -- 精确去重
    uniqHLL12(user_id) AS hll_users          -- HLL 算法
FROM events
WHERE event_time >= today() - INTERVAL 30 DAY;

/**
 * groupArray - 聚合为数组
 */
SELECT 
    user_id,
    groupArray(page_url) AS visited_pages,
    groupArrayDistinct(event_type) AS event_types
FROM events
WHERE event_time >= today() - INTERVAL 1 DAY
GROUP BY user_id;

/**
 * groupUniqArray - 去重后聚合为数组
 */
SELECT 
    user_id,
    groupUniqArray(product_id) AS unique_products
FROM orders
GROUP BY user_id;

/**
 * topK - 返回最频繁的 K 个值
 */
SELECT 
    topK(10)(page_url) AS top_pages
FROM page_views;

/**
 * histogram - 直方图
 */
SELECT 
    histogram(10)(duration_ms) AS duration_histogram
FROM page_views;
```

### 窗口函数

```sql
/**
 * ROW_NUMBER - 行号
 */
SELECT 
    user_id,
    order_time,
    amount,
    row_number() OVER (PARTITION BY user_id ORDER BY order_time) AS order_seq
FROM orders
ORDER BY user_id, order_time;

/**
 * RANK 和 DENSE_RANK - 排名
 */
SELECT 
    user_id,
    amount,
    rank() OVER (ORDER BY amount DESC) AS rank_val,
    dense_rank() OVER (ORDER BY amount DESC) AS dense_rank_val
FROM (
    SELECT user_id, sum(amount) AS amount
    FROM orders
    GROUP BY user_id
);

/**
 * LAG 和 LEAD - 前后行访问
 */
SELECT 
    stat_date,
    daily_revenue,
    lagInFrame(daily_revenue, 1) OVER (ORDER BY stat_date) AS prev_revenue,
    daily_revenue - lagInFrame(daily_revenue, 1) OVER (ORDER BY stat_date) AS revenue_growth
FROM (
    SELECT toDate(order_time) AS stat_date, sum(amount) AS daily_revenue
    FROM orders
    GROUP BY stat_date
);

/**
 * 滚动聚合
 */
SELECT 
    stat_date,
    daily_revenue,
    sum(daily_revenue) OVER (
        ORDER BY stat_date 
        ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
    ) AS rolling_7day_revenue
FROM (
    SELECT toDate(order_time) AS stat_date, sum(amount) AS daily_revenue
    FROM orders
    GROUP BY stat_date
);
```

### 条件聚合

```sql
/**
 * sumIf / countIf / avgIf - 条件聚合
 */
SELECT 
    count() AS total_orders,
    countIf(status = 'completed') AS completed_orders,
    countIf(status = 'cancelled') AS cancelled_orders,
    sumIf(amount, status = 'completed') AS completed_amount,
    avgIf(amount, status = 'completed') AS avg_completed_amount
FROM orders
WHERE order_time >= today() - INTERVAL 7 DAY;

/**
 * 使用 CASE WHEN 进行复杂条件聚合
 */
SELECT 
    sum(CASE WHEN amount < 100 THEN 1 ELSE 0 END) AS small_orders,
    sum(CASE WHEN amount >= 100 AND amount < 500 THEN 1 ELSE 0 END) AS medium_orders,
    sum(CASE WHEN amount >= 500 THEN 1 ELSE 0 END) AS large_orders
FROM orders;
```

## 物化视图配置

### 基础物化视图

```sql
/**
 * 物化视图 - 自动聚合
 * 当源表有数据插入时自动更新
 */
CREATE MATERIALIZED VIEW page_views_hourly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMMDD(hour)
ORDER BY (hour, page_url)
AS SELECT
    toStartOfHour(view_time) AS hour,
    page_url,
    count() AS view_count,
    uniq(user_id) AS unique_visitors,
    sum(duration_ms) AS total_duration
FROM page_views
GROUP BY hour, page_url;

-- 查询物化视图
SELECT 
    hour,
    sum(view_count) AS total_views,
    sum(unique_visitors) AS total_visitors
FROM page_views_hourly_mv
WHERE hour >= now() - INTERVAL 24 HOUR
GROUP BY hour
ORDER BY hour;
```

### 多级聚合物化视图

```sql
/**
 * 多级聚合 - 从明细到汇总
 */
-- 原始事件表
CREATE TABLE events_raw (
    event_time DateTime,
    user_id UInt64,
    event_type String,
    properties String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_time)
ORDER BY (event_time, user_id);

-- 小时级聚合
CREATE MATERIALIZED VIEW events_hourly_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMMDD(hour)
ORDER BY (hour, event_type)
AS SELECT
    toStartOfHour(event_time) AS hour,
    event_type,
    count() AS event_count,
    uniqState(user_id) AS unique_users_state
FROM events_raw
GROUP BY hour, event_type;

-- 天级聚合（从小时级聚合）
CREATE MATERIALIZED VIEW events_daily_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (day, event_type)
AS SELECT
    toDate(hour) AS day,
    event_type,
    sum(event_count) AS event_count,
    uniqMerge(unique_users_state) AS unique_users
FROM events_hourly_mv
GROUP BY day, event_type;
```

### 物化视图管理

```sql
/**
 * 查看物化视图状态
 */
SELECT 
    database,
    name,
    engine,
    total_rows,
    total_bytes
FROM system.tables
WHERE engine LIKE '%Materialized%';

/**
 * 手动刷新物化视图
 */
SYSTEM REFRESH VIEW my_mv;

/**
 * 暂停/恢复物化视图
 */
ALTER TABLE my_mv MODIFY SETTING materialized_view_enabled = 0;  -- 暂停
ALTER TABLE my_mv MODIFY SETTING materialized_view_enabled = 1;  -- 恢复

/**
 * 删除物化视图
 */
DROP VIEW my_mv;
```

## 投影(Projection)

```sql
/**
 * 投影 - 同一表的多种物理排序
 * 类似于物化视图，但与原表绑定
 */
CREATE TABLE sales (
    sale_id UInt64,
    sale_time DateTime,
    user_id UInt64,
    product_id UInt64,
    region String,
    amount Decimal(12, 2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(sale_time)
ORDER BY (sale_time, sale_id);

-- 创建按用户维度的投影
ALTER TABLE sales ADD PROJECTION user_projection (
    SELECT * ORDER BY (user_id, sale_time)
);

-- 创建按地区维度的投影
ALTER TABLE sales ADD PROJECTION region_projection (
    SELECT 
        region,
        toDate(sale_time) AS sale_date,
        sum(amount) AS total_amount,
        count() AS sale_count
    GROUP BY region, sale_date
);

-- 物化投影
ALTER TABLE sales MATERIALIZE PROJECTION user_projection;
ALTER TABLE sales MATERIALIZE PROJECTION region_projection;

-- 查询时自动选择最优投影
SELECT sum(amount)
FROM sales
WHERE user_id = 12345;  -- 自动使用 user_projection
```

## 查询优化技巧

### 使用 PREWHERE 优化

```sql
/**
 * PREWHERE - 提前过滤，减少读取数据量
 * 适用于高选择性过滤条件
 */
-- Good: 使用 PREWHERE 提前过滤
SELECT user_id, count() AS event_count
FROM events
PREWHERE event_time >= today() - INTERVAL 7 DAY  -- 提前过滤
WHERE event_type = 'purchase'
GROUP BY user_id;

-- 对于多个条件，按选择性排序
SELECT user_id, count() AS event_count
FROM events
PREWHERE event_time >= today() - INTERVAL 1 DAY  -- 高选择性优先
PREWHERE event_type = 'purchase'
GROUP BY user_id;
```

### 分区裁剪优化

```sql
/**
 * 分区裁剪 - 查询时只扫描相关分区
 */
-- Good: 查询条件包含分区键
SELECT count()
FROM events
WHERE event_time >= '2024-01-01' AND event_time < '2024-02-01';  -- 只扫描 2024-01 分区

-- 查看分区裁剪效果
EXPLAIN PLAN
SELECT count() FROM events WHERE event_time >= '2024-01-01';

-- 手动指定分区查询
SELECT count()
FROM events
WHERE (event_time >= '2024-01-01') AND (event_time < '2024-02-01')
AND _partition_id = '202401';
```

### 索引优化

```sql
/**
 * 主键索引 - 稀疏索引
 * 数据按主键排序存储，主键索引用于快速定位
 */
CREATE TABLE users (
    user_id UInt64,
    register_time DateTime,
    user_name String,
    email String
) ENGINE = MergeTree()
ORDER BY (register_time, user_id);  -- 主键索引

/**
 * 跳数索引 - 二级索引
 * 用于加速特定查询模式
 */
CREATE TABLE logs (
    log_time DateTime,
    level String,
    message String,
    user_id UInt64
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(log_time)
ORDER BY (log_time)
SETTINGS index_granularity = 8192;

-- minmax 跳数索引（默认）
ALTER TABLE logs ADD INDEX idx_user_id user_id TYPE minmax GRANULARITY 4;

-- bloom_filter 跳数索引（适合等值查询）
ALTER TABLE logs ADD INDEX idx_message message TYPE bloom_filter(0.01) GRANULARITY 4;

-- tokenbf_v1 跳数索引（适合 LIKE 查询）
ALTER TABLE logs ADD INDEX idx_message_token message TYPE tokenbf_v1(512, 3, 0) GRANULARITY 4;

-- set 跳数索引（适合低基数等值查询）
ALTER TABLE logs ADD INDEX idx_level level TYPE set(10) GRANULARITY 4;

-- 物化索引
ALTER TABLE logs MATERIALIZE INDEX idx_user_id;
ALTER TABLE logs MATERIALIZE INDEX idx_message;
```

### 查询优化示例

```sql
/**
 * 避免 SELECT *
 */
-- Bad
SELECT * FROM large_table WHERE date >= today() - INTERVAL 7 DAY;

-- Good
SELECT col1, col2, col3 FROM large_table WHERE date >= today() - INTERVAL 7 DAY;

/**
 * 使用 LIMIT 限制结果集
 */
SELECT user_id, count() AS cnt
FROM events
WHERE event_time >= today() - INTERVAL 7 DAY
GROUP BY user_id
ORDER BY cnt DESC
LIMIT 100;

/**
 * 使用 SAMPLE 采样查询
 */
-- 1% 采样
SELECT count() FROM events SAMPLE 0.01;

-- 采样特定范围
SELECT count() FROM events SAMPLE 1/10 OFFSET 3/10;  -- 第 4 个十分之一

/**
 * 使用 FINAL 处理重复数据（谨慎使用，性能影响大）
 */
-- 仅在需要确保数据唯一性时使用
SELECT * FROM user_profiles FINAL WHERE user_id = 123;

/**
 * 优化 GROUP BY
 */
-- 使用 -State 和 -Merge 函数进行两阶段聚合
SELECT 
    mergeState(uniq_users_state) AS unique_users
FROM (
    SELECT uniqState(user_id) AS uniq_users_state
    FROM events
    WHERE event_time >= today() - INTERVAL 7 DAY
    GROUP BY event_type
);
```

## 性能优化建议

### 内存优化

```sql
/**
 * 查询内存限制
 */
SET max_memory_usage = 10000000000;  -- 10GB
SET max_bytes_before_external_group_by = 5000000000;  -- 5GB 后使用外部排序

/**
 * 使用外部排序
 */
SET max_bytes_before_external_sort = 1000000000;  -- 1GB 后使用磁盘排序

/**
 * 限制并发查询内存
 */
SET max_memory_usage_for_user = 5000000000;  -- 每用户 5GB
```

### 并发优化

```sql
/**
 * 并发线程设置
 */
SET max_threads = 8;  -- 最大并发线程数
SET max_insert_threads = 4;  -- 插入并发线程数

/**
 * 异步查询执行
 */
SET allow_experimental_parallel_reading_from_replicas = 1;
SET parallel_replicas_count = 3;
```

### 写入优化

```sql
/**
 * 批量写入配置
 */
SET max_insert_block_size = 1048576;  -- 单次插入最大行数
SET min_insert_block_size_rows = 100000;  -- 最小行数
SET min_insert_block_size_bytes = 104857600;  -- 最小字节数

/**
 * 异步插入模式
 */
SET async_insert = 1;
SET async_insert_max_data_size = 1000000;  -- 最大缓冲大小
SET async_insert_busy_timeout_ms = 10000;  -- 最大等待时间

-- 异步插入
INSERT INTO events_async SETTINGS async_insert = 1 VALUES (1, 'event1', now());
```

### 压缩优化

```sql
/**
 * 列压缩配置
 */
CREATE TABLE compressed_data (
    id UInt64,
    data String CODEC(ZSTD(3)),           -- ZSTD 压缩级别 3
    json_data String CODEC(LZ4),          -- LZ4 压缩（速度快）
    timestamp DateTime CODEC(DoubleDelta), -- 双增量编码（适合时间序列）
    value Float64 CODEC(Gorilla)          -- Gorilla 编码（适合浮点数）
) ENGINE = MergeTree()
ORDER BY id;

/**
 * 常用压缩编解码器
 * - LZ4: 默认，速度快
 * - ZSTD: 高压缩比
 * - Delta: 增量编码
 * - DoubleDelta: 双增量编码
 * - Gorilla: Facebook 时间序列编码
 * - T64: 64位整数压缩
 */
```

## 数据类型优化

### 使用正确的数据类型

```sql
/**
 * LowCardinality - 低基数字符串优化
 * 适用于重复值多的字符串列
 */
CREATE TABLE page_views (
    view_id UInt64,
    page_url String,
    device_type LowCardinality(String),  -- 低基数优化
    browser LowCardinality(String),
    country LowCardinality(String)
) ENGINE = MergeTree()
ORDER BY view_id;

/**
 * 使用枚举类型
 */
CREATE TABLE orders (
    order_id UInt64,
    status Enum8('pending' = 1, 'paid' = 2, 'shipped' = 3, 'completed' = 4, 'cancelled' = 5)
) ENGINE = MergeTree()
ORDER BY order_id;

/**
 * 使用 Nullable 谨慎
 * Nullable 列会额外存储 null 标记，影响性能
 */
-- Bad: 过度使用 Nullable
CREATE TABLE bad_design (
    id UInt64,
    name Nullable(String),
    age Nullable(UInt32)
) ENGINE = MergeTree()
ORDER BY id;

-- Good: 使用默认值代替 Nullable
CREATE TABLE good_design (
    id UInt64,
    name String DEFAULT '',
    age UInt32 DEFAULT 0
) ENGINE = MergeTree()
ORDER BY id;
```

### 时间类型优化

```sql
/**
 * 时间类型选择
 * - Date: 日期，占用 2 字节
 * - DateTime: 日期时间，占用 4 字节
 * - DateTime64: 高精度日期时间，占用 8 字节
 */
CREATE TABLE time_series (
    event_date Date,                    -- 日期
    event_time DateTime,                -- 秒级时间戳
    event_time_ms DateTime64(3),        -- 毫秒级时间戳
    event_time_us DateTime64(6)         -- 微秒级时间戳
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (event_time, event_date);
```

## 常用运维命令

### 集群管理

```sql
/**
 * 查看集群状态
 */
SELECT * FROM system.clusters;

/**
 * 查看副本状态
 */
SELECT 
    database,
    table,
    engine,
    replica_name,
    replica_path,
    total_replicas,
    active_replicas
FROM system.replicas;

/**
 * 查看分布式 DDL 任务
 */
SELECT * FROM system.distributed_ddl_queue;
```

### 性能监控

```sql
/**
 * 查看正在执行的查询
 */
SELECT 
    query_id,
    user,
    query,
    elapsed,
    memory_usage,
    read_rows,
    written_rows
FROM system.processes
ORDER BY elapsed DESC;

/**
 * 终止查询
 */
KILL QUERY WHERE query_id = 'xxx';

/**
 * 查看查询日志
 */
SELECT 
    event_date,
    event_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 100;

/**
 * 查看慢查询
 */
SELECT 
    query,
    query_duration_ms / 1000 AS duration_seconds,
    read_rows,
    memory_usage
FROM system.query_log
WHERE type = 'QueryFinish'
AND query_duration_ms > 10000  -- 超过 10 秒
ORDER BY query_duration_ms DESC
LIMIT 20;
```

### 存储管理

```sql
/**
 * 查看表大小
 */
SELECT 
    database,
    table,
    formatReadableSize(sum(bytes)) AS size,
    sum(rows) AS rows,
    count() AS parts
FROM system.parts
WHERE active = 1
GROUP BY database, table
ORDER BY sum(bytes) DESC;

/**
 * 查看分区信息
 */
SELECT 
    database,
    table,
    partition,
    name,
    rows,
    bytes_on_disk
FROM system.parts
WHERE active = 1
ORDER BY database, table, partition;

/**
 * 手动合并分区
 */
OPTIMIZE TABLE my_table FINAL;

/**
 * 清理过期数据
 */
ALTER TABLE my_table DROP PARTITION '202301';

/**
 * 检查表完整性
 */
CHECK TABLE my_table;
```

## Quick Reference: 表引擎选择

| 场景 | 推荐引擎 | 特点 |
|------|----------|------|
| 通用 OLAP | MergeTree | 支持索引、分区、排序 |
| 去重场景 | ReplacingMergeTree | 自动去重保留最新 |
| 预聚合求和 | SummingMergeTree | 自动求和聚合 |
| 复杂聚合 | AggregatingMergeTree | 支持 -State/-Merge 函数 |
| 增量更新 | CollapsingMergeTree | 通过 sign 字段折叠 |
| 版本控制 | VersionedCollapsingMergeTree | 支持版本号 |
| 分布式表 | Distributed | 跨分片查询 |
| 临时数据 | TinyLog/StripeLog | 轻量级无索引 |

## Quick Reference: 聚合函数

| 函数 | 说明 | 示例 |
|------|------|------|
| count() | 计数 | `count()` |
| sum() | 求和 | `sum(amount)` |
| avg() | 平均值 | `avg(price)` |
| min()/max() | 最小/最大值 | `min(price)` |
| uniq() | 近似去重 | `uniq(user_id)` |
| uniqExact() | 精确去重 | `uniqExact(user_id)` |
| quantile() | 分位数 | `quantile(0.95)(amount)` |
| groupArray() | 聚合为数组 | `groupArray(id)` |
| topK() | Top K 值 | `topK(10)(url)` |
| sumIf() | 条件求和 | `sumIf(amount, status='ok')` |
| countIf() | 条件计数 | `countIf(status='ok')` |

## Anti-Patterns to Avoid

```sql
-- Bad: 使用 SELECT *
SELECT * FROM large_table;

-- Good: 只选择需要的列
SELECT col1, col2 FROM large_table;

-- Bad: 高频小批量写入
INSERT INTO table VALUES (1);
INSERT INTO table VALUES (2);

-- Good: 批量写入
INSERT INTO table VALUES (1), (2), (3), ...;

-- Bad: 不使用分区键过滤
SELECT count() FROM events WHERE user_id = 123;

-- Good: 使用分区键过滤
SELECT count() FROM events 
WHERE event_time >= today() - INTERVAL 7 DAY 
AND user_id = 123;

-- Bad: 过度使用 FINAL
SELECT * FROM table FINAL;

-- Good: 避免使用 FINAL，或使用 ReplacingMergeTree 正确设计
SELECT * FROM table WHERE ...;

-- Bad: 大表 JOIN
SELECT a.*, b.* 
FROM large_table_a a 
JOIN large_table_b b ON a.id = b.id;

-- Good: 使用字典或大宽表
SELECT a.*, dictGet('dim_dict', 'name', a.id) AS name
FROM large_table_a a;

-- Bad: 使用 Nullable 过多
CREATE TABLE bad (id UInt64, name Nullable(String), age Nullable(UInt32));

-- Good: 使用默认值
CREATE TABLE good (id UInt64, name String DEFAULT '', age UInt32 DEFAULT 0);

-- Bad: 字符串存储低基数数据
CREATE TABLE bad (id UInt64, status String);

-- Good: 使用 LowCardinality 或 Enum
CREATE TABLE good (id UInt64, status LowCardinality(String));
CREATE TABLE good (id UInt64, status Enum8('active'=1, 'inactive'=2));
```

**Remember**: ClickHouse 是为 OLAP 分析场景设计的列式数据库。核心优化原则是：减少数据扫描量（分区裁剪、列裁剪）、批量写入、预聚合、避免 JOIN。始终根据查询模式设计表结构和索引。
