# Microservices Architect 参考

## 核心概念

### 微服务架构原则

```typescript
/**
 * 微服务设计原则
 */
interface MicroservicePrinciples {
  singleResponsibility: boolean
  looseCoupling: boolean
  highCohesion: boolean
  independentDeployment: boolean
  decentralizedGovernance: boolean
}

/**
 * 服务定义接口
 */
interface ServiceDefinition {
  name: string
  version: string
  port: number
  dependencies: string[]
  healthCheck: HealthCheckConfig
  metadata: Record<string, unknown>
}

/**
 * 服务配置
 */
interface ServiceConfig {
  name: string
  env: 'development' | 'staging' | 'production'
  database: DatabaseConfig
  cache: CacheConfig
  messaging: MessagingConfig
}
```

## 服务网格

### Istio 配置

```yaml
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: user-service
spec:
  hosts:
    - user-service
  http:
    - route:
        - destination:
            host: user-service
            subset: v1
          weight: 90
        - destination:
            host: user-service
            subset: v2
          weight: 10
      retries:
        attempts: 3
        perTryTimeout: 2s
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: user-service
spec:
  host: user-service
  subsets:
    - name: v1
      labels:
        version: v1
    - name: v2
      labels:
        version: v2
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 100
      http:
        h2UpgradePolicy: UPGRADE
    outlierDetection:
      consecutive5xxErrors: 5
      interval: 30s
      baseEjectionTime: 60s
```

### Envoy Sidecar 配置

```yaml
static_resources:
  listeners:
    - name: http_listener
      address:
        socket_address:
          address: 0.0.0.0
          port_value: 8080
      filter_chains:
        - filters:
            - name: envoy.filters.network.http_connection_manager
              typed_config:
                "@type": type.googleapis.com/envoy.extensions.filters.network.http_connection_manager.v3.HttpConnectionManager
                stat_prefix: ingress_http
                route_config:
                  name: local_route
                  virtual_hosts:
                    - name: backend
                      domains:
                        - "*"
                      routes:
                        - match:
                            prefix: "/api/users"
                          route:
                            cluster: user_service
                http_filters:
                  - name: envoy.filters.http.router
  clusters:
    - name: user_service
      connect_timeout: 5s
      type: STRICT_DNS
      lb_policy: ROUND_ROBIN
      load_assignment:
        cluster_name: user_service
        endpoints:
          - lb_endpoints:
              - endpoint:
                  address:
                    socket_address:
                      address: user-service
                      port_value: 3000
```

## Saga 模式

### 编排式 Saga

```typescript
/**
 * Saga 步骤定义
 */
interface SagaStep<T, R> {
  name: string
  execute: (data: T) => Promise<R>
  compensate: (data: R) => Promise<void>
}

/**
 * Saga 执行结果
 */
interface SagaResult<T> {
  success: boolean
  data?: T
  error?: Error
  completedSteps: string[]
  compensatedSteps: string[]
}

/**
 * Saga 编排器
 */
class SagaOrchestrator<T> {
  private steps: SagaStep<any, any>[] = []
  private context: Map<string, any> = new Map()

  /**
   * 添加步骤
   * @param step - Saga 步骤
   */
  addStep<R>(step: SagaStep<T, R>): SagaOrchestrator<T> {
    this.steps.push(step)
    return this
  }

  /**
   * 执行 Saga
   * @param initialData - 初始数据
   */
  async execute(initialData: T): Promise<SagaResult<T>> {
    const completedSteps: string[] = []
    const compensatedSteps: string[] = []

    try {
      let data = initialData

      for (const step of this.steps) {
        const result = await step.execute(data)
        this.context.set(step.name, result)
        completedSteps.push(step.name)
        data = result
      }

      return {
        success: true,
        data,
        completedSteps,
        compensatedSteps
      }
    } catch (error) {
      for (let i = completedSteps.length - 1; i >= 0; i--) {
        const stepName = completedSteps[i]
        const step = this.steps.find(s => s.name === stepName)
        const stepData = this.context.get(stepName)

        try {
          await step!.compensate(stepData)
          compensatedSteps.push(stepName)
        } catch (compensateError) {
          console.error(`补偿失败 [${stepName}]:`, compensateError)
        }
      }

      return {
        success: false,
        error: error as Error,
        completedSteps,
        compensatedSteps
      }
    }
  }
}

/**
 * 订单创建 Saga 示例
 */
async function createOrderSaga(orderData: OrderInput) {
  const saga = new SagaOrchestrator<OrderInput>()
    .addStep({
      name: 'reserve_inventory',
      execute: async (data) => {
        return await inventoryService.reserve(data.items)
      },
      compensate: async (reservation) => {
        await inventoryService.release(reservation.id)
      }
    })
    .addStep({
      name: 'process_payment',
      execute: async (data) => {
        return await paymentService.charge(data)
      },
      compensate: async (payment) => {
        await paymentService.refund(payment.id)
      }
    })
    .addStep({
      name: 'create_order',
      execute: async (data) => {
        return await orderService.create(data)
      },
      compensate: async (order) => {
        await orderService.cancel(order.id)
      }
    })

  return saga.execute(orderData)
}
```

### 协同式 Saga

```typescript
/**
 * Saga 事件类型
 */
enum SagaEventType {
  ORDER_CREATED = 'ORDER_CREATED',
  INVENTORY_RESERVED = 'INVENTORY_RESERVED',
  PAYMENT_PROCESSED = 'PAYMENT_PROCESSED',
  ORDER_COMPLETED = 'ORDER_COMPLETED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  INVENTORY_RELEASED = 'INVENTORY_RELEASED',
  PAYMENT_REFUNDED = 'PAYMENT_REFUNDED'
}

/**
 * Saga 事件
 */
interface SagaEvent {
  type: SagaEventType
  sagaId: string
  data: Record<string, unknown>
  timestamp: number
}

/**
 * 事件处理器
 */
class SagaEventHandler {
  /**
   * 处理订单创建事件
   * @param event - Saga 事件
   */
  @OnEvent(SagaEventType.ORDER_CREATED)
  async handleOrderCreated(event: SagaEvent): Promise<void> {
    try {
      const reservation = await inventoryService.reserve(event.data.items)
      
      await eventBus.publish({
        type: SagaEventType.INVENTORY_RESERVED,
        sagaId: event.sagaId,
        data: { reservationId: reservation.id, orderId: event.data.orderId }
      })
    } catch (error) {
      await eventBus.publish({
        type: SagaEventType.ORDER_CANCELLED,
        sagaId: event.sagaId,
        data: { orderId: event.data.orderId, reason: 'inventory_failed' }
      })
    }
  }

  /**
   * 处理库存预留事件
   * @param event - Saga 事件
   */
  @OnEvent(SagaEventType.INVENTORY_RESERVED)
  async handleInventoryReserved(event: SagaEvent): Promise<void> {
    try {
      const payment = await paymentService.charge(event.data)
      
      await eventBus.publish({
        type: SagaEventType.PAYMENT_PROCESSED,
        sagaId: event.sagaId,
        data: { paymentId: payment.id, orderId: event.data.orderId }
      })
    } catch (error) {
      await eventBus.publish({
        type: SagaEventType.INVENTORY_RELEASED,
        sagaId: event.sagaId,
        data: { reservationId: event.data.reservationId }
      })
    }
  }
}
```

## CQRS 模式

### 命令查询分离

```typescript
/**
 * 命令接口
 */
interface Command {
  type: string
  payload: unknown
  metadata: {
    correlationId: string
    timestamp: number
    userId: string
  }
}

/**
 * 查询接口
 */
interface Query<T> {
  type: string
  params: Record<string, unknown>
}

/**
 * 命令处理器
 */
class CommandBus {
  private handlers: Map<string, CommandHandler<any>> = new Map()

  /**
   * 注册命令处理器
   * @param type - 命令类型
   * @param handler - 处理器
   */
  register<T extends Command>(type: string, handler: CommandHandler<T>): void {
    this.handlers.set(type, handler)
  }

  /**
   * 执行命令
   * @param command - 命令对象
   */
  async execute<T extends Command>(command: T): Promise<void> {
    const handler = this.handlers.get(command.type)
    
    if (!handler) {
      throw new Error(`未找到命令处理器: ${command.type}`)
    }
    
    await handler.handle(command)
  }
}

/**
 * 查询总线
 */
class QueryBus {
  private handlers: Map<string, QueryHandler<any, any>> = new Map()

  /**
   * 注册查询处理器
   * @param type - 查询类型
   * @param handler - 处理器
   */
  register<T extends Query<R>, R>(
    type: string,
    handler: QueryHandler<T, R>
  ): void {
    this.handlers.set(type, handler)
  }

  /**
   * 执行查询
   * @param query - 查询对象
   */
  async execute<T extends Query<R>, R>(query: T): Promise<R> {
    const handler = this.handlers.get(query.type)
    
    if (!handler) {
      throw new Error(`未找到查询处理器: ${query.type}`)
    }
    
    return handler.handle(query)
  }
}
```

### 读写模型分离

```typescript
/**
 * 写模型 - 命令侧
 */
interface OrderWriteModel {
  id: string
  userId: string
  items: OrderItem[]
  status: OrderStatus
  createdAt: Date
  updatedAt: Date
}

/**
 * 创建订单命令
 */
interface CreateOrderCommand extends Command {
  type: 'CREATE_ORDER'
  payload: {
    userId: string
    items: OrderItemInput[]
  }
}

/**
 * 创建订单处理器
 */
class CreateOrderHandler implements CommandHandler<CreateOrderCommand> {
  /**
   * 处理创建订单命令
   * @param command - 创建订单命令
   */
  async handle(command: CreateOrderCommand): Promise<void> {
    const order = await this.orderRepository.create({
      userId: command.payload.userId,
      items: command.payload.items,
      status: OrderStatus.PENDING
    })

    await this.eventStore.append({
      type: 'ORDER_CREATED',
      aggregateId: order.id,
      data: order,
      metadata: command.metadata
    })
  }
}

/**
 * 读模型 - 查询侧
 */
interface OrderReadModel {
  id: string
  userId: string
  userName: string
  items: OrderItemView[]
  totalAmount: number
  status: string
  createdAt: Date
}

/**
 * 订单查询处理器
 */
class GetOrderHandler implements QueryHandler<GetOrderQuery, OrderReadModel> {
  /**
   * 处理获取订单查询
   * @param query - 查询对象
   */
  async handle(query: GetOrderQuery): Promise<OrderReadModel> {
    return await this.readDatabase.query(`
      SELECT 
        o.id,
        o.user_id,
        u.name as user_name,
        o.total_amount,
        o.status,
        o.created_at
      FROM orders o
      JOIN users u ON o.user_id = u.id
      WHERE o.id = ?
    `, [query.params.orderId])
  }
}
```

## 服务发现

### 服务注册中心

```typescript
/**
 * 服务实例
 */
interface ServiceInstance {
  id: string
  name: string
  host: string
  port: number
  metadata: Record<string, string>
  status: 'UP' | 'DOWN'
  lastHeartbeat: number
}

/**
 * 服务注册接口
 */
interface ServiceRegistry {
  register(instance: ServiceInstance): Promise<void>
  deregister(instanceId: string): Promise<void>
  discover(serviceName: string): Promise<ServiceInstance[]>
  heartbeat(instanceId: string): Promise<void>
}

/**
 * Consul 服务注册实现
 */
class ConsulServiceRegistry implements ServiceRegistry {
  private consul: Consul

  constructor(consulConfig: ConsulConfig) {
    this.consul = new Consul(consulConfig)
  }

  /**
   * 注册服务
   * @param instance - 服务实例
   */
  async register(instance: ServiceInstance): Promise<void> {
    await this.consul.agent.service.register({
      ID: instance.id,
      Name: instance.name,
      Address: instance.host,
      Port: instance.port,
      Check: {
        HTTP: `http://${instance.host}:${instance.port}/health`,
        Interval: '10s',
        Timeout: '5s'
      },
      Meta: instance.metadata
    })
  }

  /**
   * 注销服务
   * @param instanceId - 实例ID
   */
  async deregister(instanceId: string): Promise<void> {
    await this.consul.agent.service.deregister(instanceId)
  }

  /**
   * 发现服务
   * @param serviceName - 服务名称
   */
  async discover(serviceName: string): Promise<ServiceInstance[]> {
    const services = await this.consul.catalog.service.nodes(serviceName)
    
    return services.map(service => ({
      id: service.ServiceID,
      name: service.ServiceName,
      host: service.ServiceAddress,
      port: service.ServicePort,
      metadata: service.ServiceMeta || {},
      status: 'UP',
      lastHeartbeat: Date.now()
    }))
  }
}
```

### 客户端负载均衡

```typescript
/**
 * 负载均衡策略
 */
type LoadBalanceStrategy = 'round_robin' | 'random' | 'least_connections' | 'weighted'

/**
 * 负载均衡器
 */
class LoadBalancer {
  private instances: ServiceInstance[] = []
  private currentIndex = 0
  private connections: Map<string, number> = new Map()

  /**
   * 更新服务实例列表
   * @param instances - 服务实例列表
   */
  updateInstances(instances: ServiceInstance[]): void {
    this.instances = instances.filter(i => i.status === 'UP')
  }

  /**
   * 选择服务实例
   * @param strategy - 负载均衡策略
   */
  select(strategy: LoadBalanceStrategy = 'round_robin'): ServiceInstance | null {
    if (this.instances.length === 0) return null

    switch (strategy) {
      case 'round_robin':
        return this.roundRobin()
      case 'random':
        return this.random()
      case 'least_connections':
        return this.leastConnections()
      default:
        return this.roundRobin()
    }
  }

  /**
   * 轮询策略
   */
  private roundRobin(): ServiceInstance {
    const instance = this.instances[this.currentIndex]
    this.currentIndex = (this.currentIndex + 1) % this.instances.length
    return instance
  }

  /**
   * 随机策略
   */
  private random(): ServiceInstance {
    const index = Math.floor(Math.random() * this.instances.length)
    return this.instances[index]
  }

  /**
   * 最少连接策略
   */
  private leastConnections(): ServiceInstance {
    let minConnections = Infinity
    let selectedInstance = this.instances[0]

    for (const instance of this.instances) {
      const connections = this.connections.get(instance.id) || 0
      if (connections < minConnections) {
        minConnections = connections
        selectedInstance = instance
      }
    }

    return selectedInstance
  }
}
```

## 服务间通信

### gRPC 实现

```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc GetUser(GetUserRequest) returns (UserResponse);
  rpc CreateUser(CreateUserRequest) returns (UserResponse);
  rpc ListUsers(ListUsersRequest) returns (stream UserResponse);
}

message GetUserRequest {
  string id = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message UserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
}
```

```typescript
import { loadPackageDefinition, Server, ServerCredentials } from '@grpc/grpc-js'
import { loadSync } from '@grpc/proto-loader'

/**
 * gRPC 服务实现
 */
class UserGrpcService {
  private server: Server

  /**
   * 初始化 gRPC 服务
   * @param port - 服务端口
   */
  async start(port: number): Promise<void> {
    const packageDefinition = loadSync('./proto/user.proto', {
      keepCase: true,
      longs: String,
      enums: String,
      defaults: true,
      oneofs: true
    })

    const proto = loadPackageDefinition(packageDefinition).user

    this.server = new Server()
    this.server.addService(proto.UserService.service, {
      getUser: this.getUser.bind(this),
      createUser: this.createUser.bind(this),
      listUsers: this.listUsers.bind(this)
    })

    await new Promise<void>((resolve, reject) => {
      this.server.bindAsync(
        `0.0.0.0:${port}`,
        ServerCredentials.createInsecure(),
        (error) => {
          if (error) reject(error)
          else resolve()
        }
      )
    })

    this.server.start()
  }

  /**
   * 获取用户
   * @param call - gRPC 调用对象
   * @param callback - 回调函数
   */
  async getUser(call, callback): Promise<void> {
    try {
      const user = await userService.findById(call.request.id)
      callback(null, user)
    } catch (error) {
      callback(error, null)
    }
  }

  /**
   * 创建用户
   * @param call - gRPC 调用对象
   * @param callback - 回调函数
   */
  async createUser(call, callback): Promise<void> {
    try {
      const user = await userService.create(call.request)
      callback(null, user)
    } catch (error) {
      callback(error, null)
    }
  }
}
```

### 消息队列集成

```typescript
import { Channel, Connection, connect } from 'amqplib'

/**
 * RabbitMQ 生产者
 */
class MessageProducer {
  private connection: Connection
  private channel: Channel

  /**
   * 连接到 RabbitMQ
   * @param url - RabbitMQ 连接地址
   */
  async connect(url: string): Promise<void> {
    this.connection = await connect(url)
    this.channel = await this.connection.createChannel()
  }

  /**
   * 发布消息
   * @param exchange - 交换机名称
   * @param routingKey - 路由键
   * @param message - 消息内容
   */
  async publish(exchange: string, routingKey: string, message: unknown): Promise<void> {
    await this.channel.assertExchange(exchange, 'topic', { durable: true })
    
    this.channel.publish(
      exchange,
      routingKey,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    )
  }

  /**
   * 发送到队列
   * @param queue - 队列名称
   * @param message - 消息内容
   */
  async sendToQueue(queue: string, message: unknown): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true })
    
    this.channel.sendToQueue(
      queue,
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    )
  }
}

/**
 * RabbitMQ 消费者
 */
class MessageConsumer {
  private connection: Connection
  private channel: Channel

  /**
   * 连接到 RabbitMQ
   * @param url - RabbitMQ 连接地址
   */
  async connect(url: string): Promise<void> {
    this.connection = await connect(url)
    this.channel = await this.connection.createChannel()
  }

  /**
   * 订阅队列
   * @param queue - 队列名称
   * @param handler - 消息处理器
   */
  async subscribe(queue: string, handler: (message: unknown) => Promise<void>): Promise<void> {
    await this.channel.assertQueue(queue, { durable: true })
    await this.channel.prefetch(10)

    this.channel.consume(queue, async (msg) => {
      if (!msg) return

      try {
        const content = JSON.parse(msg.content.toString())
        await handler(content)
        this.channel.ack(msg)
      } catch (error) {
        console.error('消息处理失败:', error)
        this.channel.nack(msg, false, true)
      }
    })
  }
}
```

## 可观测性

### 分布式追踪

```typescript
import { trace, context, Span, SpanStatusCode } from '@opentelemetry/api'

/**
 * 追踪装饰器
 */
function Traced(name?: string) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value
    const tracer = trace.getTracer('microservice')

    descriptor.value = async function (...args: any[]) {
      const spanName = name || `${target.constructor.name}.${propertyKey}`
      
      return tracer.startActiveSpan(spanName, async (span: Span) => {
        try {
          const result = await originalMethod.apply(this, args)
          span.setStatus({ code: SpanStatusCode.OK })
          return result
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error.message
          })
          span.recordException(error)
          throw error
        } finally {
          span.end()
        }
      })
    }
  }
}

/**
 * 服务调用追踪
 */
class TracedServiceClient {
  /**
   * 调用远程服务
   * @param serviceName - 服务名称
   * @param method - 方法名称
   * @param data - 请求数据
   */
  @Traced()
  async call<T>(serviceName: string, method: string, data: unknown): Promise<T> {
    const span = trace.getActiveSpan()
    
    span?.setAttributes({
      'rpc.system': 'grpc',
      'rpc.service': serviceName,
      'rpc.method': method,
      'rpc.grpc.status_code': 0
    })

    const carrier: Record<string, string> = {}
    
    context.with(trace.setSpan(context.active(), span!), () => {
      trace.getPropagation().inject(context.active(), carrier)
    })

    return await this.grpcClient.call(serviceName, method, data, {
      metadata: carrier
    })
  }
}
```

### 健康检查

```typescript
/**
 * 健康状态
 */
interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded'
  checks: HealthCheck[]
  timestamp: number
}

/**
 * 健康检查项
 */
interface HealthCheck {
  name: string
  status: 'pass' | 'fail' | 'warn'
  message?: string
  duration: number
}

/**
 * 健康检查器
 */
class HealthChecker {
  private checks: Map<string, () => Promise<boolean>> = new Map()

  /**
   * 注册健康检查
   * @param name - 检查名称
   * @param check - 检查函数
   */
  register(name: string, check: () => Promise<boolean>): void {
    this.checks.set(name, check)
  }

  /**
   * 执行所有健康检查
   */
  async check(): Promise<HealthStatus> {
    const checks: HealthCheck[] = []
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy'

    for (const [name, checkFn] of this.checks) {
      const start = Date.now()
      
      try {
        const passed = await checkFn()
        const duration = Date.now() - start

        checks.push({
          name,
          status: passed ? 'pass' : 'fail',
          duration
        })

        if (!passed) {
          overallStatus = 'unhealthy'
        }
      } catch (error) {
        checks.push({
          name,
          status: 'fail',
          message: error.message,
          duration: Date.now() - start
        })
        overallStatus = 'unhealthy'
      }
    }

    return {
      status: overallStatus,
      checks,
      timestamp: Date.now()
    }
  }
}

/**
 * 初始化健康检查
 */
function setupHealthChecks(): HealthChecker {
  const checker = new HealthChecker()

  checker.register('database', async () => {
    await db.ping()
    return true
  })

  checker.register('redis', async () => {
    await redis.ping()
    return true
  })

  checker.register('rabbitmq', async () => {
    return messageQueue.isConnected()
  })

  return checker
}
```
