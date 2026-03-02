# 监控专家参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求日志、指标、追踪、告警、Prometheus、Grafana

## 核心特性

可观测性是现代系统的基石，包含三大支柱：
- **日志（Logs）**：离散的事件记录
- **指标（Metrics）**：聚合的数值测量
- **追踪（Traces）**：请求的完整路径

## 日志管理

### 结构化日志

```typescript
import pino from 'pino';

/**
 * 日志配置接口
 */
interface LoggerConfig {
  level: 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  service: string;
  environment: string;
}

/**
 * 创建结构化日志器
 * @param config - 日志配置
 * @returns Pino 日志实例
 */
const createLogger = (config: LoggerConfig) => {
  return pino({
    level: config.level,
    base: {
      service: config.service,
      environment: config.environment,
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label) => ({ level: label }),
    },
    serializers: {
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
      err: pino.stdSerializers.err,
    },
  });
};

const logger = createLogger({
  level: 'info',
  service: 'user-service',
  environment: process.env.NODE_ENV ?? 'development',
});

/**
 * 用户服务示例
 */
class UserService {
  /**
   * 创建用户
   * @param userData - 用户数据
   * @returns 创建的用户
   */
  async createUser(userData: CreateUserData): Promise<User> {
    const startTime = Date.now();
    
    logger.info({
      action: 'createUser',
      userId: userData.id,
      email: userData.email,
    }, '开始创建用户');

    try {
      const user = await this.repository.create(userData);
      
      logger.info({
        action: 'createUser',
        userId: user.id,
        duration: Date.now() - startTime,
        status: 'success',
      }, '用户创建成功');

      return user;
    } catch (error) {
      logger.error({
        action: 'createUser',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        duration: Date.now() - startTime,
        status: 'failed',
      }, '用户创建失败');
      
      throw error;
    }
  }
}
```

### 日志级别规范

```typescript
/**
 * 日志级别枚举
 * @description 定义日志严重程度
 */
enum LogLevel {
  TRACE = 'trace',
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

/**
 * 日志使用指南
 * 
 * TRACE: 最详细的日志，用于追踪程序执行流程
 * DEBUG: 调试信息，开发环境使用
 * INFO: 常规业务事件，如用户登录、订单创建
 * WARN: 警告信息，不影响系统运行但需要关注
 * ERROR: 错误信息，影响业务功能但系统可继续运行
 * FATAL: 致命错误，导致系统无法继续运行
 */

/**
 * 日志上下文增强器
 */
class LogContextEnhancer {
  private static context: Map<string, unknown> = new Map();

  /**
   * 设置上下文
   * @param key - 上下文键
   * @param value - 上下文值
   */
  static set(key: string, value: unknown): void {
    this.context.set(key, value);
  }

  /**
   * 获取所有上下文
   * @returns 上下文对象
   */
  static getAll(): Record<string, unknown> {
    return Object.fromEntries(this.context);
  }

  /**
   * 清除上下文
   */
  static clear(): void {
    this.context.clear();
  }
}
```

## 指标收集

### Prometheus 指标类型

```typescript
import client from 'prom-client';

/**
 * 指标注册器
 */
const register = new client.Registry();

/**
 * 默认指标收集
 * @description 自动收集 Node.js 运行时指标
 */
client.collectDefaultMetrics({ register });

/**
 * HTTP 请求计数器
 * @description 记录 HTTP 请求总数
 */
const httpRequestCounter = new client.Counter({
  name: 'http_requests_total',
  help: 'HTTP 请求总数',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register],
});

/**
 * HTTP 请求持续时间直方图
 * @description 记录 HTTP 请求响应时间分布
 */
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP 请求持续时间（秒）',
  labelNames: ['method', 'path', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
  registers: [register],
});

/**
 * 活跃用户仪表盘
 * @description 记录当前活跃用户数
 */
const activeUsersGauge = new client.Gauge({
  name: 'active_users_count',
  help: '当前活跃用户数',
  labelNames: ['tenant'],
  registers: [register],
});

/**
 * 数据库连接池仪表盘
 * @description 记录数据库连接池状态
 */
const dbPoolGauge = new client.Gauge({
  name: 'db_pool_connections',
  help: '数据库连接池连接数',
  labelNames: ['pool_name', 'state'],
  registers: [register],
});

/**
 * 业务指标计数器
 * @description 记录业务事件
 */
const businessEventCounter = new client.Counter({
  name: 'business_events_total',
  help: '业务事件总数',
  labelNames: ['event_type', 'tenant', 'result'],
  registers: [register],
});

/**
 * 记录 HTTP 请求指标
 * @param method - HTTP 方法
 * @param path - 请求路径
 * @param statusCode - 响应状态码
 * @param duration - 请求持续时间（秒）
 */
const recordHttpRequest = (
  method: string,
  path: string,
  statusCode: number,
  duration: number
): void => {
  httpRequestCounter.inc({ method, path, status_code: statusCode });
  httpRequestDuration.observe(
    { method, path, status_code: statusCode },
    duration
  );
};

/**
 * 更新活跃用户数
 * @param tenant - 租户标识
 * @param count - 用户数量
 */
const updateActiveUsers = (tenant: string, count: number): void => {
  activeUsersGauge.set({ tenant }, count);
};

/**
 * 记录业务事件
 * @param eventType - 事件类型
 * @param tenant - 租户标识
 * @param result - 事件结果
 */
const recordBusinessEvent = (
  eventType: string,
  tenant: string,
  result: 'success' | 'failure'
): void => {
  businessEventCounter.inc({ event_type: eventType, tenant, result });
};
```

### Express 中间件集成

```typescript
import express, { Request, Response, NextFunction } from 'express';

const app = express();

/**
 * Prometheus 指标中间件
 * @description 自动收集 HTTP 请求指标
 */
const prometheusMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const path = req.route?.path ?? req.path;
    
    recordHttpRequest(req.method, path, res.statusCode, duration);
  });

  next();
};

app.use(prometheusMiddleware);

/**
 * 指标暴露端点
 */
app.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end('获取指标失败');
  }
});
```

## 分布式追踪

### OpenTelemetry 集成

```typescript
import {
  NodeTracerProvider,
  BatchSpanProcessor,
} from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

/**
 * 初始化追踪提供者
 * @param serviceName - 服务名称
 * @param otlpEndpoint - OTLP 端点地址
 */
const initTracing = (serviceName: string, otlpEndpoint: string): void => {
  const provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
    }),
  });

  const exporter = new OTLPTraceExporter({
    url: otlpEndpoint,
  });

  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();
};

/**
 * 追踪装饰器工厂
 * @param spanName - Span 名称
 * @returns 方法装饰器
 */
function Traced(spanName: string) {
  return function (
    target: unknown,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    const tracer = trace.getTracer('app-tracer');

    descriptor.value = async function (...args: unknown[]) {
      const span = tracer.startSpan(spanName);

      return context.with(trace.setSpan(context.active(), span), async () => {
        try {
          const result = await originalMethod.apply(this, args);
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : String(error),
          });
          throw error;
        } finally {
          span.end();
        }
      });
    };

    return descriptor;
  };
}

/**
 * 订单服务示例
 */
class OrderService {
  /**
   * 创建订单
   * @param orderData - 订单数据
   * @returns 创建的订单
   */
  @Traced('OrderService.createOrder')
  async createOrder(orderData: OrderData): Promise<Order> {
    const span = trace.getActiveSpan();
    span?.setAttribute('order.id', orderData.id);
    span?.setAttribute('order.userId', orderData.userId);

    const order = await this.repository.create(orderData);
    
    span?.setAttribute('order.status', order.status);
    
    return order;
  }
}
```

## 告警配置

### Prometheus 告警规则

```yaml
groups:
  - name: application_alerts
    rules:
      - alert: HighErrorRate
        expr: |
          sum(rate(http_requests_total{status_code=~"5.."}[5m])) 
          / 
          sum(rate(http_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "高错误率告警"
          description: "5xx 错误率超过 5%，当前值: {{ $value | humanizePercentage }}"

      - alert: HighLatency
        expr: |
          histogram_quantile(0.95, 
            sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
          ) > 2
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "高延迟告警"
          description: "P95 延迟超过 2 秒，当前值: {{ $value | humanizeDuration }}"

      - alert: ServiceDown
        expr: up == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "服务下线"
          description: "服务 {{ $labels.job }} 已下线超过 1 分钟"

      - alert: HighMemoryUsage
        expr: |
          (node_memory_MemTotal_bytes - node_memory_MemAvailable_bytes) 
          / node_memory_MemTotal_bytes > 0.9
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "高内存使用率"
          description: "内存使用率超过 90%，当前值: {{ $value | humanizePercentage }}"

      - alert: DatabaseConnectionPoolExhausted
        expr: db_pool_connections{state="idle"} < 5
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "数据库连接池即将耗尽"
          description: "空闲连接数少于 5，当前值: {{ $value }}"
```

### Alertmanager 配置

```yaml
global:
  resolve_timeout: 5m
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'password'

route:
  group_by: ['alertname', 'severity']
  group_wait: 30s
  group_interval: 5m
  repeat_interval: 4h
  receiver: 'team-email'
  routes:
    - match:
        severity: critical
      receiver: 'team-pagerduty'
      continue: true
    - match:
        severity: warning
      receiver: 'team-email'

receivers:
  - name: 'team-email'
    email_configs:
      - to: 'team@example.com'
        send_resolved: true

  - name: 'team-pagerduty'
    pagerduty_configs:
      - service_key: 'your-service-key'
        severity: critical
        description: '{{ .GroupLabels.alertname }}'

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'instance']
```

## Grafana 仪表盘

### 仪表盘 JSON 模板

```json
{
  "dashboard": {
    "title": "应用监控仪表盘",
    "tags": ["application", "monitoring"],
    "panels": [
      {
        "title": "请求速率",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total[5m])) by (service)",
            "legendFormat": "{{service}}"
          }
        ],
        "yaxes": [
          { "format": "reqps" },
          { "format": "short" }
        ]
      },
      {
        "title": "错误率",
        "type": "graph",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{status_code=~\"5..\"}[5m])) / sum(rate(http_requests_total[5m]))",
            "legendFormat": "Error Rate"
          }
        ],
        "yaxes": [
          { "format": "percentunit", "max": 1 },
          { "format": "short" }
        ],
        "alert": {
          "conditions": [
            {
              "evaluator": { "type": "gt", "params": [0.05] },
              "operator": { "type": "and" },
              "query": { "params": ["A", "5m", "now"] }
            }
          ]
        }
      },
      {
        "title": "响应时间 (P95)",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))",
            "legendFormat": "P95"
          }
        ],
        "yaxes": [
          { "format": "s" },
          { "format": "short" }
        ]
      },
      {
        "title": "活跃用户数",
        "type": "stat",
        "targets": [
          {
            "expr": "sum(active_users_count)",
            "legendFormat": "Active Users"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area"
        }
      }
    ]
  }
}
```

## 最佳实践

### 可观测性检查清单

```markdown
## 可观测性检查清单

### 日志
- [ ] 使用结构化日志格式（JSON）
- [ ] 包含请求 ID 用于追踪
- [ ] 记录关键业务事件
- [ ] 敏感信息已脱敏
- [ ] 日志级别使用正确

### 指标
- [ ] RED 指标（Rate、Errors、Duration）
- [ ] USE 指标（Utilization、Saturation、Errors）
- [ ] 业务指标已定义
- [ ] 标签使用合理
- [ ] 基数可控

### 追踪
- [ ] 关键路径已埋点
- [ ] 跨服务追踪已配置
- [ ] Span 属性完整
- [ ] 采样策略合理

### 告警
- [ ] 告警规则已定义
- 通知渠道已配置
- [ ] 告警分级合理
- [ ] 告警可操作
```

## Quick Reference

| 组件 | 用途 | 常用工具 |
|------|------|----------|
| 日志收集 | 事件记录 | Pino、Winston、ELK |
| 指标存储 | 数值存储 | Prometheus、VictoriaMetrics |
| 可视化 | 数据展示 | Grafana、Datadog |
| 追踪收集 | 链路追踪 | Jaeger、Zipkin、Tempo |
| 告警管理 | 告警路由 | Alertmanager、PagerDuty |
| APM | 应用性能 | New Relic、Dynatrace |
