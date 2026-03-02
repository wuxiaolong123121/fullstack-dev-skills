# Debugging Wizard 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求调试、问题排查、根因分析、错误诊断、性能问题定位相关任务

## 核心特性

系统化调试是软件工程的关键技能：

- **系统化方法**：科学的问题诊断流程
- **根因分析**：找到问题的真正原因
- **调试工具**：日志、断点、性能分析
- **常见模式**：典型 bug 的识别和修复
- **预防策略**：减少 bug 产生的实践
- **文档记录**：问题追踪和知识积累

## 最佳实践

### 调试工具类

```typescript
/**
 * 调试工具集
 * 提供常用的调试辅助功能
 */

/**
 * 日志级别枚举
 */
enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
    FATAL = 4,
}

/**
 * 日志配置接口
 */
interface LoggerConfig {
    level: LogLevel;
    enableTimestamp: boolean;
    enableStackTrace: boolean;
    outputHandler: (level: LogLevel, message: string, context?: any) => void;
}

/**
 * 增强日志类
 * 提供结构化日志输出
 */
class Logger {
    private static instance: Logger;
    private config: LoggerConfig;

    /**
     * 私有构造函数
     */
    private constructor() {
        this.config = {
            level: LogLevel.DEBUG,
            enableTimestamp: true,
            enableStackTrace: false,
            outputHandler: this.defaultOutputHandler,
        };
    }

    /**
     * 获取单例实例
     * @returns Logger 实例
     */
    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    /**
     * 配置日志器
     * @param config 配置对象
     */
    public configure(config: Partial<LoggerConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 调试级别日志
     * @param message 日志消息
     * @param context 上下文数据
     */
    public debug(message: string, context?: any): void {
        this.log(LogLevel.DEBUG, message, context);
    }

    /**
     * 信息级别日志
     * @param message 日志消息
     * @param context 上下文数据
     */
    public info(message: string, context?: any): void {
        this.log(LogLevel.INFO, message, context);
    }

    /**
     * 警告级别日志
     * @param message 日志消息
     * @param context 上下文数据
     */
    public warn(message: string, context?: any): void {
        this.log(LogLevel.WARN, message, context);
    }

    /**
     * 错误级别日志
     * @param message 日志消息
     * @param error 错误对象
     * @param context 上下文数据
     */
    public error(message: string, error?: Error, context?: any): void {
        const errorContext = {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
        };
        this.log(LogLevel.ERROR, message, errorContext);
    }

    /**
     * 致命级别日志
     * @param message 日志消息
     * @param error 错误对象
     * @param context 上下文数据
     */
    public fatal(message: string, error?: Error, context?: any): void {
        const errorContext = {
            ...context,
            error: error ? {
                name: error.name,
                message: error.message,
                stack: error.stack,
            } : undefined,
            stackTrace: this.config.enableStackTrace ? this.getStackTrace() : undefined,
        };
        this.log(LogLevel.FATAL, message, errorContext);
    }

    /**
     * 内部日志方法
     * @param level 日志级别
     * @param message 日志消息
     * @param context 上下文数据
     */
    private log(level: LogLevel, message: string, context?: any): void {
        if (level < this.config.level) {
            return;
        }

        const timestamp = this.config.enableTimestamp
            ? new Date().toISOString()
            : '';

        const formattedMessage = this.formatMessage(level, message, timestamp);
        this.config.outputHandler(level, formattedMessage, context);
    }

    /**
     * 格式化日志消息
     * @param level 日志级别
     * @param message 原始消息
     * @param timestamp 时间戳
     * @returns 格式化后的消息
     */
    private formatMessage(level: LogLevel, message: string, timestamp: string): string {
        const levelName = LogLevel[level].padEnd(5);
        return timestamp ? `[${timestamp}] [${levelName}] ${message}` : `[${levelName}] ${message}`;
    }

    /**
     * 获取调用堆栈
     * @returns 堆栈字符串
     */
    private getStackTrace(): string {
        const stack = new Error().stack || '';
        const lines = stack.split('\n').slice(3);
        return lines.join('\n');
    }

    /**
     * 默认输出处理器
     * @param level 日志级别
     * @param message 日志消息
     * @param context 上下文数据
     */
    private defaultOutputHandler(level: LogLevel, message: string, context?: any): void {
        const consoleMethod = {
            [LogLevel.DEBUG]: console.debug,
            [LogLevel.INFO]: console.info,
            [LogLevel.WARN]: console.warn,
            [LogLevel.ERROR]: console.error,
            [LogLevel.FATAL]: console.error,
        }[level];

        consoleMethod(message);
        if (context) {
            consoleMethod('Context:', context);
        }
    }
}

export { Logger, LogLevel, LoggerConfig };
```

### 性能分析器

```typescript
/**
 * 性能分析器
 * 用于测量代码执行时间和资源使用
 */
class PerformanceProfiler {
    /** 计时器映射 */
    private timers: Map<string, number> = new Map();

    /** 计数器映射 */
    private counters: Map<string, number> = new Map();

    /** 测量结果 */
    private measurements: Map<string, number[]> = new Map();

    /**
     * 开始计时
     * @param label 计时标签
     */
    public startTimer(label: string): void {
        this.timers.set(label, performance.now());
    }

    /**
     * 结束计时
     * @param label 计时标签
     * @returns 耗时（毫秒）
     */
    public endTimer(label: string): number {
        const startTime = this.timers.get(label);
        if (startTime === undefined) {
            console.warn(`计时器 "${label}" 未找到`);
            return 0;
        }

        const elapsed = performance.now() - startTime;
        this.timers.delete(label);

        this.recordMeasurement(label, elapsed);

        return elapsed;
    }

    /**
     * 记录测量结果
     * @param label 标签
     * @param value 值
     */
    private recordMeasurement(label: string, value: number): void {
        if (!this.measurements.has(label)) {
            this.measurements.set(label, []);
        }
        this.measurements.get(label)!.push(value);
    }

    /**
     * 测量函数执行时间
     * @param label 标签
     * @param fn 要测量的函数
     * @returns 函数返回值
     */
    public async measure<T>(label: string, fn: () => T | Promise<T>): Promise<T> {
        this.startTimer(label);
        try {
            const result = await fn();
            const elapsed = this.endTimer(label);
            console.log(`[${label}] 执行耗时: ${elapsed.toFixed(2)}ms`);
            return result;
        } catch (error) {
            this.endTimer(label);
            throw error;
        }
    }

    /**
     * 增加计数器
     * @param label 计数器标签
     * @param increment 增量
     */
    public increment(label: string, increment: number = 1): void {
        const current = this.counters.get(label) || 0;
        this.counters.set(label, current + increment);
    }

    /**
     * 获取计数器值
     * @param label 计数器标签
     * @returns 计数器值
     */
    public getCounter(label: string): number {
        return this.counters.get(label) || 0;
    }

    /**
     * 获取测量统计
     * @param label 测量标签
     * @returns 统计结果
     */
    public getStats(label: string): {
        count: number;
        min: number;
        max: number;
        avg: number;
        total: number;
    } | null {
        const values = this.measurements.get(label);
        if (!values || values.length === 0) {
            return null;
        }

        const sum = values.reduce((a, b) => a + b, 0);
        return {
            count: values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            avg: sum / values.length,
            total: sum,
        };
    }

    /**
     * 生成性能报告
     * @returns 报告对象
     */
    public generateReport(): {
        timers: Record<string, ReturnType<typeof this.getStats>>;
        counters: Record<string, number>;
    } {
        const timerReport: Record<string, ReturnType<typeof this.getStats>> = {};
        this.measurements.forEach((_, label) => {
            timerReport[label] = this.getStats(label);
        });

        const counterReport: Record<string, number> = {};
        this.counters.forEach((value, label) => {
            counterReport[label] = value;
        });

        return {
            timers: timerReport,
            counters: counterReport,
        };
    }

    /**
     * 重置所有数据
     */
    public reset(): void {
        this.timers.clear();
        this.counters.clear();
        this.measurements.clear();
    }
}

export { PerformanceProfiler };
```

### 断言工具

```typescript
/**
 * 断言工具类
 * 提供运行时条件检查
 */
class Assert {
    /**
     * 断言条件为真
     * @param condition 条件
     * @param message 错误消息
     * @throws Error 如果条件为假
     */
    public static isTrue(condition: boolean, message: string = '断言失败'): void {
        if (!condition) {
            throw new Error(message);
        }
    }

    /**
     * 断言值不为空
     * @param value 要检查的值
     * @param message 错误消息
     * @throws Error 如果值为 null 或 undefined
     */
    public static notNull<T>(value: T | null | undefined, message: string = '值不能为空'): T {
        if (value === null || value === undefined) {
            throw new Error(message);
        }
        return value;
    }

    /**
     * 断言字符串不为空
     * @param value 字符串值
     * @param message 错误消息
     * @throws Error 如果字符串为空
     */
    public static notEmpty(value: string, message: string = '字符串不能为空'): string {
        if (!value || value.trim().length === 0) {
            throw new Error(message);
        }
        return value;
    }

    /**
     * 断言数组不为空
     * @param value 数组值
     * @param message 错误消息
     * @throws Error 如果数组为空
     */
    public static notEmptyArray<T>(value: T[], message: string = '数组不能为空'): T[] {
        if (!value || value.length === 0) {
            throw new Error(message);
        }
        return value;
    }

    /**
     * 断言数值在范围内
     * @param value 数值
     * @param min 最小值
     * @param max 最大值
     * @param message 错误消息
     * @throws Error 如果数值不在范围内
     */
    public static inRange(value: number, min: number, max: number, message?: string): void {
        if (value < min || value > max) {
            throw new Error(message || `值 ${value} 不在范围 [${min}, ${max}] 内`);
        }
    }

    /**
     * 断言类型正确
     * @param value 值
     * @param expectedType 期望类型
     * @param message 错误消息
     * @throws Error 如果类型不匹配
     */
    public static isType(value: any, expectedType: string, message?: string): void {
        const actualType = typeof value;
        if (actualType !== expectedType) {
            throw new Error(message || `期望类型 ${expectedType}，实际类型 ${actualType}`);
        }
    }

    /**
     * 断言是有效索引
     * @param index 索引值
     * @param array 数组
     * @param message 错误消息
     * @throws Error 如果索引无效
     */
    public static isValidIndex(index: number, array: any[], message?: string): void {
        if (index < 0 || index >= array.length) {
            throw new Error(message || `索引 ${index} 超出范围 [0, ${array.length - 1}]`);
        }
    }

    /**
     * 断言对象包含属性
     * @param obj 对象
     * @param property 属性名
     * @param message 错误消息
     * @throws Error 如果对象不包含属性
     */
    public static hasProperty(obj: object, property: string, message?: string): void {
        if (!(property in obj)) {
            throw new Error(message || `对象缺少属性 "${property}"`);
        }
    }
}

export { Assert };
```

### 错误追踪器

```typescript
/**
 * 错误追踪器
 * 收集和分析运行时错误
 */
class ErrorTracker {
    /** 错误记录 */
    private errors: ErrorRecord[] = [];

    /** 最大记录数 */
    private maxRecords: number = 100;

    /** 错误处理器 */
    private handlers: ((error: ErrorRecord) => void)[] = [];

    /**
     * 记录错误
     * @param error 错误对象
     * @param context 上下文信息
     */
    public capture(error: Error, context?: Record<string, any>): void {
        const record: ErrorRecord = {
            id: this.generateId(),
            timestamp: new Date(),
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            context: context || {},
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            url: typeof window !== 'undefined' ? window.location.href : 'unknown',
        };

        this.errors.push(record);

        if (this.errors.length > this.maxRecords) {
            this.errors.shift();
        }

        this.handlers.forEach((handler) => {
            try {
                handler(record);
            } catch (e) {
                console.error('错误处理器执行失败:', e);
            }
        });
    }

    /**
     * 添加错误处理器
     * @param handler 处理函数
     */
    public addHandler(handler: (error: ErrorRecord) => void): void {
        this.handlers.push(handler);
    }

    /**
     * 获取所有错误记录
     * @returns 错误记录数组
     */
    public getErrors(): ErrorRecord[] {
        return [...this.errors];
    }

    /**
     * 按类型获取错误
     * @param errorName 错误名称
     * @returns 错误记录数组
     */
    public getErrorsByType(errorName: string): ErrorRecord[] {
        return this.errors.filter((r) => r.error.name === errorName);
    }

    /**
     * 获取错误统计
     * @returns 统计结果
     */
    public getStatistics(): {
        total: number;
        byType: Record<string, number>;
        recentCount: number;
    } {
        const byType: Record<string, number> = {};
        this.errors.forEach((record) => {
            byType[record.error.name] = (byType[record.error.name] || 0) + 1;
        });

        const oneHourAgo = Date.now() - 3600000;
        const recentCount = this.errors.filter(
            (r) => r.timestamp.getTime() > oneHourAgo
        ).length;

        return {
            total: this.errors.length,
            byType,
            recentCount,
        };
    }

    /**
     * 清除所有记录
     */
    public clear(): void {
        this.errors = [];
    }

    /**
     * 生成唯一ID
     * @returns ID字符串
     */
    private generateId(): string {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 安装全局错误监听
     */
    public installGlobalHandler(): void {
        if (typeof window !== 'undefined') {
            window.addEventListener('error', (event) => {
                this.capture(event.error || new Error(event.message), {
                    filename: event.filename,
                    lineno: event.lineno,
                    colno: event.colno,
                });
            });

            window.addEventListener('unhandledrejection', (event) => {
                const error = event.reason instanceof Error
                    ? event.reason
                    : new Error(String(event.reason));
                this.capture(error, { type: 'unhandledrejection' });
            });
        }
    }
}

/**
 * 错误记录接口
 */
interface ErrorRecord {
    id: string;
    timestamp: Date;
    error: {
        name: string;
        message: string;
        stack?: string;
    };
    context: Record<string, any>;
    userAgent: string;
    url: string;
}

export { ErrorTracker, ErrorRecord };
```

### 调试会话管理

```typescript
/**
 * 调试会话管理器
 * 管理调试上下文和状态
 */
class DebugSession {
    /** 会话ID */
    public readonly id: string;

    /** 会话开始时间 */
    public readonly startTime: Date;

    /** 调试标签 */
    private tags: Set<string> = new Set();

    /** 变量监视 */
    private watches: Map<string, any> = new Map();

    /** 事件日志 */
    private events: DebugEvent[] = [];

    /** 检查点 */
    private checkpoints: Checkpoint[] = [];

    /**
     * 构造函数
     */
    constructor() {
        this.id = `session_${Date.now()}`;
        this.startTime = new Date();
    }

    /**
     * 添加标签
     * @param tag 标签名称
     */
    public addTag(tag: string): void {
        this.tags.add(tag);
    }

    /**
     * 获取所有标签
     * @returns 标签数组
     */
    public getTags(): string[] {
        return [...this.tags];
    }

    /**
     * 设置监视变量
     * @param name 变量名
     * @param value 变量值
     */
    public watch(name: string, value: any): void {
        this.watches.set(name, value);
        this.logEvent('watch', { name, value });
    }

    /**
     * 获取监视变量
     * @param name 变量名
     * @returns 变量值
     */
    public getWatch(name: string): any {
        return this.watches.get(name);
    }

    /**
     * 获取所有监视变量
     * @returns 变量映射
     */
    public getAllWatches(): Record<string, any> {
        return Object.fromEntries(this.watches);
    }

    /**
     * 记录事件
     * @param type 事件类型
     * @param data 事件数据
     */
    public logEvent(type: string, data?: any): void {
        this.events.push({
            timestamp: new Date(),
            type,
            data,
        });
    }

    /**
     * 获取事件日志
     * @param typeFilter 类型过滤（可选）
     * @returns 事件数组
     */
    public getEvents(typeFilter?: string): DebugEvent[] {
        if (typeFilter) {
            return this.events.filter((e) => e.type === typeFilter);
        }
        return [...this.events];
    }

    /**
     * 创建检查点
     * @param name 检查点名称
     * @param state 状态快照
     */
    public createCheckpoint(name: string, state?: any): void {
        this.checkpoints.push({
            name,
            timestamp: new Date(),
            state: state || this.getAllWatches(),
        });
        this.logEvent('checkpoint', { name });
    }

    /**
     * 获取检查点
     * @param name 检查点名称
     * @returns 检查点数据
     */
    public getCheckpoint(name: string): Checkpoint | undefined {
        return this.checkpoints.find((c) => c.name === name);
    }

    /**
     * 回滚到检查点
     * @param name 检查点名称
     */
    public rollbackTo(name: string): void {
        const checkpoint = this.getCheckpoint(name);
        if (checkpoint && checkpoint.state) {
            Object.entries(checkpoint.state).forEach(([key, value]) => {
                this.watches.set(key, value);
            });
            this.logEvent('rollback', { name });
        }
    }

    /**
     * 生成会话报告
     * @returns 报告对象
     */
    public generateReport(): {
        id: string;
        duration: number;
        tags: string[];
        eventCount: number;
        checkpointCount: number;
        watches: Record<string, any>;
    } {
        const duration = Date.now() - this.startTime.getTime();
        return {
            id: this.id,
            duration,
            tags: this.getTags(),
            eventCount: this.events.length,
            checkpointCount: this.checkpoints.length,
            watches: this.getAllWatches(),
        };
    }
}

/**
 * 调试事件接口
 */
interface DebugEvent {
    timestamp: Date;
    type: string;
    data?: any;
}

/**
 * 检查点接口
 */
interface Checkpoint {
    name: string;
    timestamp: Date;
    state: any;
}

export { DebugSession, DebugEvent, Checkpoint };
```

## Quick Reference

### 调试流程

| 步骤 | 动作 | 工具 |
|-----|------|------|
| 1. 复现 | 确定问题可复现 | 日志、录屏 |
| 2. 隔离 | 缩小问题范围 | 二分法、注释 |
| 3. 假设 | 提出可能原因 | 经验、文档 |
| 4. 验证 | 测试假设 | 断点、日志 |
| 5. 修复 | 实施解决方案 | 代码修改 |
| 6. 验证 | 确认问题解决 | 测试用例 |

### 常见 Bug 类型

| 类型 | 特征 | 调试方法 |
|-----|------|---------|
| 空指针 | TypeError: null/undefined | 检查对象初始化 |
| 类型错误 | TypeError: X is not a function | 检查类型和导入 |
| 边界错误 | Index out of range | 检查数组长度 |
| 异步问题 | 竞态条件、时序问题 | 日志时间戳、Promise |
| 内存泄漏 | 内存持续增长 | 堆快照对比 |
| 性能问题 | 执行缓慢 | 性能分析器 |

### 日志级别使用

| 级别 | 用途 | 生产环境 |
|-----|------|---------|
| DEBUG | 详细调试信息 | 关闭 |
| INFO | 正常运行信息 | 可选 |
| WARN | 潜在问题警告 | 开启 |
| ERROR | 错误但可恢复 | 开启 |
| FATAL | 严重错误 | 开启 |

### 断点类型

| 类型 | 说明 | 用途 |
|-----|------|------|
| 行断点 | 执行到指定行暂停 | 常规调试 |
| 条件断点 | 满足条件时暂停 | 循环/频繁调用 |
| 日志断点 | 输出日志不暂停 | 无侵入调试 |
| 异常断点 | 抛出异常时暂停 | 错误追踪 |
| 函数断点 | 调用函数时暂停 | 源码不可用时 |

### 性能分析指标

| 指标 | 说明 | 健康值 |
|-----|------|--------|
| FCP | 首次内容绘制 | < 1.8s |
| LCP | 最大内容绘制 | < 2.5s |
| FID | 首次输入延迟 | < 100ms |
| CLS | 累积布局偏移 | < 0.1 |
| TTI | 可交互时间 | < 3.8s |
