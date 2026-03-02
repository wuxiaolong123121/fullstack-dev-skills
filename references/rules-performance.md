# 性能优化规则参考

性能优化核心策略、模型选择、上下文管理、缓存机制和最佳实践，用于构建高性能、低延迟的应用程序。

## When to Activate

- 系统响应时间超过预期阈值
- 资源消耗（CPU/内存/网络）异常
- 高并发场景下性能下降
- 大数据处理任务执行缓慢
- 代码审查中识别性能瓶颈

## Core Principles

### 1. Measure Before Optimize

优化前必须先测量，避免过早优化。

```javascript
/**
 * 性能测量工具
 * @param {string} name - 测量名称
 * @param {Function} fn - 待测量函数
 * @returns {Promise<{result: any, duration: number}>} 测量结果
 */
async function measurePerformance(name, fn) {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    console.log(`[${name}] 耗时: ${duration.toFixed(2)}ms`);
    return { result, duration };
}

// 使用示例
const { result } = await measurePerformance('数据处理', () => processData(data));
```

### 2. Optimize the Hot Path

优先优化执行频率最高的代码路径。

```javascript
/**
 * 识别热点代码
 * @param {Map<string, number>} callCounts - 调用计数映射
 * @returns {string[]} 热点函数列表
 */
function identifyHotPaths(callCounts) {
    const threshold = 1000;
    return [...callCounts.entries()]
        .filter(([_, count]) => count > threshold)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name);
}
```

### 3. Trade-offs Are Inevitable

性能优化需要在时间、空间、复杂度之间权衡。

```javascript
/**
 * 权衡决策矩阵
 */
const TRADE_OFF_MATRIX = {
    timeVsSpace: {
        caching: { time: 'improved', space: 'increased' },
        compression: { time: 'degraded', space: 'reduced' }
    },
    complexityVsMaintainability: {
        optimization: { complexity: 'increased', maintainability: 'degraded' }
    }
};
```

## 模型选择策略

### 按任务复杂度选择模型

```javascript
/**
 * 模型选择配置
 */
const MODEL_SELECTION = {
    simple: {
        tasks: ['分类', '简单提取', '格式转换'],
        model: 'fast-model',
        maxTokens: 1000,
        expectedLatency: '100-300ms'
    },
    medium: {
        tasks: ['摘要', '翻译', '代码生成'],
        model: 'balanced-model',
        maxTokens: 4000,
        expectedLatency: '500-1500ms'
    },
    complex: {
        tasks: ['推理', '分析', '创意写作'],
        model: 'advanced-model',
        maxTokens: 8000,
        expectedLatency: '2000-5000ms'
    }
};

/**
 * 根据任务类型选择最优模型
 * @param {string} taskType - 任务类型
 * @param {object} constraints - 约束条件
 * @returns {object} 模型配置
 */
function selectModel(taskType, constraints = {}) {
    const { maxLatency, maxCost } = constraints;
    
    for (const [level, config] of Object.entries(MODEL_SELECTION)) {
        if (config.tasks.includes(taskType)) {
            if (maxLatency && parseLatency(config.expectedLatency) > maxLatency) {
                continue;
            }
            return config;
        }
    }
    
    return MODEL_SELECTION.medium;
}
```

### 批量处理策略

```javascript
/**
 * 批量请求处理器
 */
class BatchProcessor {
    /**
     * 创建批量处理器
     * @param {number} batchSize - 批次大小
     * @param {number} timeout - 超时时间(ms)
     */
    constructor(batchSize = 10, timeout = 100) {
        this.batchSize = batchSize;
        this.timeout = timeout;
        this.queue = [];
        this.timer = null;
    }

    /**
     * 添加请求到批次
     * @param {any} request - 请求数据
     * @returns {Promise<any>} 处理结果
     */
    add(request) {
        return new Promise((resolve, reject) => {
            this.queue.push({ request, resolve, reject });
            
            if (this.queue.length >= this.batchSize) {
                this.flush();
            } else if (!this.timer) {
                this.timer = setTimeout(() => this.flush(), this.timeout);
            }
        });
    }

    /**
     * 执行批量处理
     */
    async flush() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        const batch = this.queue.splice(0, this.batchSize);
        if (batch.length === 0) return;
        
        const requests = batch.map(item => item.request);
        const results = await this.processBatch(requests);
        
        batch.forEach((item, index) => {
            item.resolve(results[index]);
        });
    }

    /**
     * 批量处理实现
     * @param {any[]} requests - 请求列表
     * @returns {Promise<any[]>} 结果列表
     */
    async processBatch(requests) {
        // 实际批量处理逻辑
        return Promise.all(requests.map(req => this.processSingle(req)));
    }
}
```

## 上下文管理

### 上下文窗口优化

```javascript
/**
 * 上下文管理器
 */
class ContextManager {
    /**
     * 创建上下文管理器
     * @param {number} maxTokens - 最大令牌数
     */
    constructor(maxTokens = 4096) {
        this.maxTokens = maxTokens;
        this.messages = [];
        this.summary = null;
    }

    /**
     * 添加消息
     * @param {object} message - 消息对象
     */
    addMessage(message) {
        this.messages.push(message);
        this.enforceLimit();
    }

    /**
     * 强制执行上下文限制
     */
    enforceLimit() {
        while (this.estimateTokens() > this.maxTokens && this.messages.length > 2) {
            this.summarizeOldest();
        }
    }

    /**
     * 估算当前令牌数
     * @returns {number} 估算的令牌数
     */
    estimateTokens() {
        return this.messages.reduce((total, msg) => {
            return total + Math.ceil(msg.content.length / 4);
        }, 0);
    }

    /**
     * 摘要最旧的消息
     */
    summarizeOldest() {
        const oldest = this.messages.shift();
        if (!this.summary) {
            this.summary = oldest.content;
        } else {
            this.summary = `${this.summary}\n${oldest.content}`;
        }
        
        if (this.messages.length > 0) {
            this.messages[0] = {
                role: 'system',
                content: `历史摘要: ${this.summary.substring(0, 500)}...`
            };
        }
    }
}
```

### 分层上下文策略

```javascript
/**
 * 分层上下文结构
 */
const CONTEXT_LAYERS = {
    system: {
        priority: 1,
        retention: 'permanent',
        maxTokens: 500
    },
    persona: {
        priority: 2,
        retention: 'permanent',
        maxTokens: 300
    },
    knowledge: {
        priority: 3,
        retention: 'selective',
        maxTokens: 1000
    },
    conversation: {
        priority: 4,
        retention: 'summarize',
        maxTokens: 2000
    },
    working: {
        priority: 5,
        retention: 'temporary',
        maxTokens: 500
    }
};

/**
 * 构建优化后的上下文
 * @param {object} layers - 各层上下文数据
 * @param {number} budget - 令牌预算
 * @returns {object[]} 优化后的消息列表
 */
function buildOptimizedContext(layers, budget) {
    const messages = [];
    let usedTokens = 0;
    
    const sortedLayers = Object.entries(CONTEXT_LAYERS)
        .sort((a, b) => a[1].priority - b[1].priority);
    
    for (const [name, config] of sortedLayers) {
        const layerData = layers[name];
        if (!layerData) continue;
        
        const tokens = Math.min(config.maxTokens, budget - usedTokens);
        if (tokens <= 0) break;
        
        const content = truncateToTokens(layerData, tokens);
        messages.push({ role: 'system', content });
        usedTokens += tokens;
    }
    
    return messages;
}
```

## 缓存策略

### 多级缓存架构

```javascript
/**
 * 多级缓存系统
 */
class MultiLevelCache {
    /**
     * 创建多级缓存
     */
    constructor() {
        this.levels = {
            l1: new Map(),      // 内存缓存 - 最快
            l2: new LRUCache(1000),  // LRU缓存
            l3: null            // 持久化缓存 - 可选
        };
        this.stats = { hits: 0, misses: 0 };
    }

    /**
     * 获取缓存值
     * @param {string} key - 缓存键
     * @returns {any} 缓存值或null
     */
    get(key) {
        // L1 查找
        if (this.levels.l1.has(key)) {
            this.stats.hits++;
            return this.levels.l1.get(key);
        }
        
        // L2 查找
        const l2Value = this.levels.l2.get(key);
        if (l2Value !== undefined) {
            this.stats.hits++;
            this.levels.l1.set(key, l2Value);
            return l2Value;
        }
        
        // L3 查找
        if (this.levels.l3) {
            const l3Value = this.levels.l3.get(key);
            if (l3Value !== undefined) {
                this.stats.hits++;
                this.levels.l2.set(key, l3Value);
                this.levels.l1.set(key, l3Value);
                return l3Value;
            }
        }
        
        this.stats.misses++;
        return null;
    }

    /**
     * 设置缓存值
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     * @param {number} ttl - 过期时间(ms)
     */
    set(key, value, ttl = 3600000) {
        this.levels.l1.set(key, value);
        this.levels.l2.set(key, value);
        
        if (this.levels.l3) {
            this.levels.l3.set(key, value, ttl);
        }
        
        // L1 定时清理
        setTimeout(() => {
            this.levels.l1.delete(key);
        }, Math.min(ttl, 60000));
    }

    /**
     * 获取缓存命中率
     * @returns {number} 命中率百分比
     */
    getHitRate() {
        const total = this.stats.hits + this.stats.misses;
        return total > 0 ? (this.stats.hits / total * 100).toFixed(2) : 0;
    }
}

/**
 * LRU缓存实现
 */
class LRUCache {
    /**
     * 创建LRU缓存
     * @param {number} capacity - 容量
     */
    constructor(capacity) {
        this.capacity = capacity;
        this.cache = new Map();
    }

    /**
     * 获取缓存值
     * @param {string} key - 缓存键
     * @returns {any} 缓存值
     */
    get(key) {
        if (!this.cache.has(key)) return undefined;
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    /**
     * 设置缓存值
     * @param {string} key - 缓存键
     * @param {any} value - 缓存值
     */
    set(key, value) {
        if (this.cache.has(key)) {
            this.cache.delete(key);
        } else if (this.cache.size >= this.capacity) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
```

### 缓存键生成策略

```javascript
/**
 * 缓存键生成器
 */
class CacheKeyGenerator {
    /**
     * 生成语义缓存键
     * @param {string} query - 查询内容
     * @param {object} context - 上下文参数
     * @returns {string} 缓存键
     */
    static generateSemanticKey(query, context = {}) {
        const normalizedQuery = this.normalize(query);
        const contextHash = this.hashObject(context);
        return `${normalizedQuery}:${contextHash}`;
    }

    /**
     * 标准化查询文本
     * @param {string} text - 原始文本
     * @returns {string} 标准化文本
     */
    static normalize(text) {
        return text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .replace(/[^\w\s\u4e00-\u9fa5]/g, '')
            .trim();
    }

    /**
     * 对象哈希
     * @param {object} obj - 对象
     * @returns {string} 哈希值
     */
    static hashObject(obj) {
        const str = JSON.stringify(obj, Object.keys(obj).sort());
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
}
```

### 缓存失效策略

```javascript
/**
 * 缓存失效管理器
 */
class CacheInvalidator {
    /**
     * 创建失效管理器
     */
    constructor() {
        this.dependencies = new Map();
        this.timers = new Map();
    }

    /**
     * 注册依赖关系
     * @param {string} cacheKey - 缓存键
     * @param {string[]} deps - 依赖项列表
     */
    registerDependencies(cacheKey, deps) {
        for (const dep of deps) {
            if (!this.dependencies.has(dep)) {
                this.dependencies.set(dep, new Set());
            }
            this.dependencies.get(dep).add(cacheKey);
        }
    }

    /**
     * 使依赖项相关的缓存失效
     * @param {string} dep - 依赖项
     * @param {object} cache - 缓存实例
     */
    invalidate(dep, cache) {
        const affectedKeys = this.dependencies.get(dep);
        if (affectedKeys) {
            for (const key of affectedKeys) {
                cache.delete(key);
            }
            affectedKeys.clear();
        }
    }

    /**
     * 设置定时失效
     * @param {string} key - 缓存键
     * @param {number} ttl - 存活时间(ms)
     * @param {object} cache - 缓存实例
     */
    setExpiry(key, ttl, cache) {
        if (this.timers.has(key)) {
            clearTimeout(this.timers.get(key));
        }
        
        const timer = setTimeout(() => {
            cache.delete(key);
            this.timers.delete(key);
        }, ttl);
        
        this.timers.set(key, timer);
    }
}
```

## 性能检查清单

### 代码层面检查

```markdown
## 性能检查清单

### 算法复杂度
- [ ] 识别 O(n²) 或更高复杂度的循环
- [ ] 检查嵌套循环是否可优化
- [ ] 评估递归深度和栈溢出风险
- [ ] 验证排序算法选择是否合适

### 数据结构
- [ ] 选择合适的数据结构（Map vs Object, Set vs Array）
- [ ] 避免频繁的数组 splice/unshift 操作
- [ ] 使用对象池减少 GC 压力
- [ ] 考虑使用 TypedArray 处理数值数据

### 内存管理
- [ ] 检查内存泄漏（事件监听器、定时器、闭包）
- [ ] 大对象使用后及时释放
- [ ] 避免深拷贝大对象
- [ ] 使用 WeakMap/WeakSet 管理对象引用

### 异步处理
- [ ] 避免阻塞主线程的长任务
- [ ] 合理使用 Promise.all 并发控制
- [ ] 实现请求取消机制
- [ ] 添加超时处理

### 网络优化
- [ ] 启用响应压缩
- [ ] 实现请求去重
- [ ] 使用连接池
- [ ] 配置合理的超时时间
```

### 运行时检查脚本

```javascript
/**
 * 性能诊断工具
 */
class PerformanceDiagnostics {
    /**
     * 运行完整诊断
     * @returns {object} 诊断报告
     */
    static runDiagnostics() {
        return {
            memory: this.checkMemory(),
            timing: this.checkTiming(),
            resources: this.checkResources(),
            recommendations: this.generateRecommendations()
        };
    }

    /**
     * 检查内存使用
     * @returns {object} 内存报告
     */
    static checkMemory() {
        if (typeof process !== 'undefined') {
            const used = process.memoryUsage();
            return {
                heapUsed: `${(used.heapUsed / 1024 / 1024).toFixed(2)} MB`,
                heapTotal: `${(used.heapTotal / 1024 / 1024).toFixed(2)} MB`,
                external: `${(used.external / 1024 / 1024).toFixed(2)} MB`,
                status: used.heapUsed / used.heapTotal > 0.9 ? 'warning' : 'ok'
            };
        }
        return { status: 'unavailable' };
    }

    /**
     * 检查性能计时
     * @returns {object} 计时报告
     */
    static checkTiming() {
        if (typeof performance !== 'undefined') {
            const timing = performance.timing || {};
            return {
                domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
                loadComplete: timing.loadEventEnd - timing.navigationStart,
                status: 'ok'
            };
        }
        return { status: 'unavailable' };
    }

    /**
     * 检查资源加载
     * @returns {object} 资源报告
     */
    static checkResources() {
        if (typeof performance !== 'undefined' && performance.getEntriesByType) {
            const resources = performance.getEntriesByType('resource');
            const slowResources = resources.filter(r => r.duration > 1000);
            return {
                total: resources.length,
                slowCount: slowResources.length,
                slowResources: slowResources.map(r => ({
                    name: r.name,
                    duration: `${r.duration.toFixed(2)}ms`
                }))
            };
        }
        return { status: 'unavailable' };
    }

    /**
     * 生成优化建议
     * @returns {string[]} 建议列表
     */
    static generateRecommendations() {
        const recommendations = [];
        
        const memory = this.checkMemory();
        if (memory.status === 'warning') {
            recommendations.push('内存使用率过高，建议检查内存泄漏');
        }
        
        const resources = this.checkResources();
        if (resources.slowCount > 0) {
            recommendations.push(`发现 ${resources.slowCount} 个加载缓慢的资源`);
        }
        
        return recommendations;
    }
}
```

## 优化策略示例

### 数据处理优化

```javascript
/**
 * 大数据集处理优化
 */
class DataProcessor {
    /**
     * 分块处理大数据集
     * @param {any[]} data - 数据集
     * @param {Function} processor - 处理函数
     * @param {number} chunkSize - 块大小
     * @returns {Promise<any[]>} 处理结果
     */
    static async processInChunks(data, processor, chunkSize = 1000) {
        const results = [];
        
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            const chunkResults = await Promise.all(
                chunk.map(item => processor(item))
            );
            results.push(...chunkResults);
            
            // 让出主线程
            await new Promise(resolve => setTimeout(resolve, 0));
        }
        
        return results;
    }

    /**
     * 流式处理
     * @param {ReadableStream} stream - 数据流
     * @param {Function} transformer - 转换函数
     * @returns {ReadableStream} 处理后的流
     */
    static createTransformStream(transformer) {
        return new TransformStream({
            async transform(chunk, controller) {
                const transformed = await transformer(chunk);
                controller.enqueue(transformed);
            }
        });
    }

    /**
     * 懒加载处理
     * @param {Function} loader - 加载函数
     * @returns {Proxy} 代理对象
     */
    static createLazyProxy(loader) {
        let cached = null;
        let loaded = false;
        
        return new Proxy({}, {
            get(target, prop) {
                if (!loaded) {
                    cached = loader();
                    loaded = true;
                }
                return cached[prop];
            }
        });
    }
}
```

### 并发控制优化

```javascript
/**
 * 并发控制器
 */
class ConcurrencyController {
    /**
     * 创建并发控制器
     * @param {number} maxConcurrent - 最大并发数
     */
    constructor(maxConcurrent = 5) {
        this.maxConcurrent = maxConcurrent;
        this.running = 0;
        this.queue = [];
    }

    /**
     * 执行任务
     * @param {Function} task - 任务函数
     * @returns {Promise<any>} 任务结果
     */
    async execute(task) {
        return new Promise((resolve, reject) => {
            this.queue.push({ task, resolve, reject });
            this.process();
        });
    }

    /**
     * 处理队列
     */
    async process() {
        while (this.running < this.maxConcurrent && this.queue.length > 0) {
            this.running++;
            const { task, resolve, reject } = this.queue.shift();
            
            try {
                const result = await task();
                resolve(result);
            } catch (error) {
                reject(error);
            } finally {
                this.running--;
                this.process();
            }
        }
    }

    /**
     * 批量执行任务
     * @param {Function[]} tasks - 任务列表
     * @returns {Promise<any[]>} 结果列表
     */
    async executeAll(tasks) {
        return Promise.all(tasks.map(task => this.execute(task)));
    }
}
```

### 节流与防抖

```javascript
/**
 * 性能优化装饰器集合
 */
const PerformanceDecorators = {
    /**
     * 防抖装饰器
     * @param {number} wait - 等待时间(ms)
     * @returns {Function} 装饰器函数
     */
    debounce(wait) {
        return function(target, propertyKey, descriptor) {
            const original = descriptor.value;
            let timer = null;
            
            descriptor.value = function(...args) {
                clearTimeout(timer);
                timer = setTimeout(() => original.apply(this, args), wait);
            };
            
            return descriptor;
        };
    },

    /**
     * 节流装饰器
     * @param {number} interval - 间隔时间(ms)
     * @returns {Function} 装饰器函数
     */
    throttle(interval) {
        return function(target, propertyKey, descriptor) {
            const original = descriptor.value;
            let lastTime = 0;
            
            descriptor.value = function(...args) {
                const now = Date.now();
                if (now - lastTime >= interval) {
                    lastTime = now;
                    return original.apply(this, args);
                }
            };
            
            return descriptor;
        };
    },

    /**
     * 记忆化装饰器
     * @returns {Function} 装饰器函数
     */
    memoize() {
        return function(target, propertyKey, descriptor) {
            const original = descriptor.value;
            const cache = new Map();
            
            descriptor.value = function(...args) {
                const key = JSON.stringify(args);
                if (cache.has(key)) {
                    return cache.get(key);
                }
                
                const result = original.apply(this, args);
                cache.set(key, result);
                return result;
            };
            
            return descriptor;
        };
    }
};

/**
 * 函数式防抖
 * @param {Function} fn - 目标函数
 * @param {number} wait - 等待时间
 * @returns {Function} 防抖函数
 */
function debounce(fn, wait) {
    let timer = null;
    return function(...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), wait);
    };
}

/**
 * 函数式节流
 * @param {Function} fn - 目标函数
 * @param {number} interval - 间隔时间
 * @returns {Function} 节流函数
 */
function throttle(fn, interval) {
    let lastTime = 0;
    return function(...args) {
        const now = Date.now();
        if (now - lastTime >= interval) {
            lastTime = now;
            return fn.apply(this, args);
        }
    };
}
```

## Quick Reference: 性能优化速查表

| 优化类型 | 策略 | 适用场景 |
|---------|------|---------|
| 缓存 | 多级缓存、LRU | 重复计算、频繁访问 |
| 并发 | 连接池、并发控制 | I/O密集型任务 |
| 懒加载 | 按需加载、虚拟滚动 | 大数据集、长列表 |
| 批处理 | 请求合并、分块处理 | 批量操作、大数据 |
| 压缩 | Gzip、Brotli | 网络传输 |
| 索引 | 哈希索引、B树 | 数据查找 |
| 预计算 | 预编译、预热 | 启动优化 |
| 去重 | 请求去重、结果复用 | 重复请求 |

## Anti-Patterns to Avoid

```javascript
// 错误: 在循环中进行异步操作
async function processItems(items) {
    for (const item of items) {
        await processItem(item);  // 串行执行，效率低
    }
}

// 正确: 使用 Promise.all 并行处理
async function processItems(items) {
    return Promise.all(items.map(item => processItem(item)));
}

// 错误: 频繁创建大对象
function processData(data) {
    const result = [];
    for (const item of data) {
        result.push(JSON.parse(JSON.stringify(item)));  // 深拷贝开销大
    }
    return result;
}

// 正确: 使用浅拷贝或直接引用
function processData(data) {
    return data.map(item => ({ ...item }));  // 浅拷贝，性能更好
}

// 错误: 同步阻塞操作
function heavyComputation() {
    let result = 0;
    for (let i = 0; i < 10000000000; i++) {
        result += i;  // 阻塞主线程
    }
    return result;
}

// 正确: 分片执行
async function heavyComputation() {
    let result = 0;
    const chunk = 1000000;
    for (let i = 0; i < 10000000000; i += chunk) {
        for (let j = 0; j < chunk && i + j < 10000000000; j++) {
            result += i + j;
        }
        await new Promise(r => setTimeout(r, 0));  // 让出主线程
    }
    return result;
}

// 错误: 无限制的缓存
const cache = {};
function getData(key) {
    if (!cache[key]) {
        cache[key] = fetchData(key);  // 缓存无限增长
    }
    return cache[key];
}

// 正确: 使用 LRU 缓存
const cache = new LRUCache(1000);
function getData(key) {
    let value = cache.get(key);
    if (value === undefined) {
        value = fetchData(key);
        cache.set(key, value);
    }
    return value;
}
```

**记住**: 性能优化应该基于实际测量数据，而非假设。先测量，后优化，再验证。
