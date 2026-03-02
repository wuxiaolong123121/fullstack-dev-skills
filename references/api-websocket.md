# WebSocket Engineer 参考

## 核心概念

### WebSocket 协议基础

```typescript
/**
 * WebSocket 连接配置接口
 */
interface WebSocketConfig {
  url: string
  protocols?: string | string[]
  reconnect: boolean
  reconnectInterval: number
  maxReconnectAttempts: number
  heartbeatInterval: number
}

/**
 * WebSocket 连接状态枚举
 */
enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting'
}
```

## Socket.IO 实现

### 服务端配置

```typescript
import { Server } from 'socket.io'

/**
 * Socket.IO 服务器配置
 * @param httpServer - HTTP 服务器实例
 * @returns Socket.IO 服务器实例
 */
function createSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000
  })

  /**
   * 认证中间件
   * @param socket - Socket 实例
   * @param next - 下一个中间件
   */
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token
    
    if (!token) {
      return next(new Error('未提供认证令牌'))
    }
    
    try {
      const user = await verifyToken(token)
      socket.data.user = user
      next()
    } catch (error) {
      next(new Error('令牌无效'))
    }
  })

  return io
}

/**
 * 连接处理
 * @param io - Socket.IO 服务器实例
 */
function handleConnections(io) {
  io.on('connection', (socket) => {
    console.log(`用户 ${socket.data.user.id} 已连接`)

    /**
     * 加入房间
     */
    socket.on('join:room', (roomId) => {
      socket.join(roomId)
      io.to(roomId).emit('user:joined', {
        userId: socket.data.user.id,
        timestamp: Date.now()
      })
    })

    /**
     * 离开房间
     */
    socket.on('leave:room', (roomId) => {
      socket.leave(roomId)
      io.to(roomId).emit('user:left', {
        userId: socket.data.user.id,
        timestamp: Date.now()
      })
    })

    /**
     * 消息发送
     */
    socket.on('message:send', async (data) => {
      const message = await saveMessage({
        ...data,
        senderId: socket.data.user.id
      })
      
      io.to(data.roomId).emit('message:received', message)
    })

    /**
     * 断开连接
     */
    socket.on('disconnect', (reason) => {
      console.log(`用户 ${socket.data.user.id} 已断开: ${reason}`)
    })
  })
}
```

### 客户端实现

```typescript
import { io, Socket } from 'socket.io-client'

/**
 * WebSocket 客户端管理器
 */
class WebSocketClient {
  private socket: Socket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5

  /**
   * 连接到服务器
   * @param url - 服务器地址
   * @param token - 认证令牌
   */
  connect(url: string, token: string): void {
    this.socket = io(url, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    })

    this.setupEventHandlers()
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return

    this.socket.on('connect', () => {
      console.log('WebSocket 已连接')
      this.reconnectAttempts = 0
    })

    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket 断开: ${reason}`)
    })

    this.socket.on('connect_error', (error) => {
      console.error('连接错误:', error.message)
      this.reconnectAttempts++
    })
  }

  /**
   * 发送消息
   * @param event - 事件名称
   * @param data - 消息数据
   */
  emit(event: string, data: unknown): void {
    this.socket?.emit(event, data)
  }

  /**
   * 监听事件
   * @param event - 事件名称
   * @param callback - 回调函数
   */
  on(event: string, callback: (data: unknown) => void): void {
    this.socket?.on(event, callback)
  }

  /**
   * 断开连接
   */
  disconnect(): void {
    this.socket?.disconnect()
    this.socket = null
  }
}
```

## 实时通信模式

### 发布订阅模式

```typescript
/**
 * 事件发布订阅管理器
 */
class EventEmitter {
  private events: Map<string, Set<Function>> = new Map()

  /**
   * 订阅事件
   * @param event - 事件名称
   * @param listener - 监听器函数
   */
  on(event: string, listener: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set())
    }
    this.events.get(event)!.add(listener)
  }

  /**
   * 取消订阅
   * @param event - 事件名称
   * @param listener - 监听器函数
   */
  off(event: string, listener: Function): void {
    this.events.get(event)?.delete(listener)
  }

  /**
   * 发布事件
   * @param event - 事件名称
   * @param args - 参数
   */
  emit(event: string, ...args: unknown[]): void {
    this.events.get(event)?.forEach(listener => {
      try {
        listener(...args)
      } catch (error) {
        console.error(`事件处理器错误 [${event}]:`, error)
      }
    })
  }
}

/**
 * 实时数据同步
 */
class RealtimeSync {
  private io: Server
  private emitter: EventEmitter

  /**
   * 广播数据变更
   * @param entity - 实体名称
   * @param action - 操作类型
   * @param data - 数据
   */
  broadcastChange(entity: string, action: string, data: unknown): void {
    this.io.emit(`${entity}:${action}`, data)
  }

  /**
   * 房间内广播
   * @param room - 房间ID
   * @param event - 事件名称
   * @param data - 数据
   */
  broadcastToRoom(room: string, event: string, data: unknown): void {
    this.io.to(room).emit(event, data)
  }
}
```

### 房间管理

```typescript
/**
 * 房间管理器
 */
class RoomManager {
  private rooms: Map<string, Set<string>> = new Map()
  private userRooms: Map<string, Set<string>> = new Map()

  /**
   * 用户加入房间
   * @param roomId - 房间ID
   * @param userId - 用户ID
   */
  joinRoom(roomId: string, userId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set())
    }
    this.rooms.get(roomId)!.add(userId)

    if (!this.userRooms.has(userId)) {
      this.userRooms.set(userId, new Set())
    }
    this.userRooms.get(userId)!.add(roomId)
  }

  /**
   * 用户离开房间
   * @param roomId - 房间ID
   * @param userId - 用户ID
   */
  leaveRoom(roomId: string, userId: string): void {
    this.rooms.get(roomId)?.delete(userId)
    this.userRooms.get(userId)?.delete(roomId)

    if (this.rooms.get(roomId)?.size === 0) {
      this.rooms.delete(roomId)
    }
  }

  /**
   * 获取房间用户列表
   * @param roomId - 房间ID
   * @returns 用户ID列表
   */
  getRoomUsers(roomId: string): string[] {
    return Array.from(this.rooms.get(roomId) || [])
  }

  /**
   * 获取用户所在房间
   * @param userId - 用户ID
   * @returns 房间ID列表
   */
  getUserRooms(userId: string): string[] {
    return Array.from(this.userRooms.get(userId) || [])
  }
}
```

## 心跳检测机制

### 服务端心跳

```typescript
/**
 * 心跳检测配置
 */
interface HeartbeatConfig {
  interval: number
  timeout: number
}

/**
 * 心跳管理器
 */
class HeartbeatManager {
  private config: HeartbeatConfig
  private lastPong: Map<string, number> = new Map()
  private intervalId: NodeJS.Timeout | null = null

  constructor(config: HeartbeatConfig) {
    this.config = config
  }

  /**
   * 启动心跳检测
   * @param io - Socket.IO 实例
   */
  start(io: Server): void {
    this.intervalId = setInterval(() => {
      const now = Date.now()
      
      io.sockets.sockets.forEach((socket) => {
        const lastPong = this.lastPong.get(socket.id) || now
        
        if (now - lastPong > this.config.timeout) {
          console.log(`Socket ${socket.id} 心跳超时，断开连接`)
          socket.disconnect(true)
          this.lastPong.delete(socket.id)
        } else {
          socket.emit('ping')
        }
      })
    }, this.config.interval)
  }

  /**
   * 停止心跳检测
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }

  /**
   * 记录心跳响应
   * @param socketId - Socket ID
   */
  recordPong(socketId: string): void {
    this.lastPong.set(socketId, Date.now())
  }
}

/**
 * 初始化心跳检测
 * @param io - Socket.IO 实例
 */
function setupHeartbeat(io: Server): HeartbeatManager {
  const manager = new HeartbeatManager({
    interval: 25000,
    timeout: 60000
  })

  io.on('connection', (socket) => {
    socket.on('pong', () => {
      manager.recordPong(socket.id)
    })
  })

  manager.start(io)
  return manager
}
```

### 客户端心跳

```typescript
/**
 * 客户端心跳处理器
 */
class ClientHeartbeat {
  private socket: Socket
  private intervalId: NodeJS.Timeout | null = null
  private missedPongs = 0
  private maxMissedPongs = 3

  constructor(socket: Socket) {
    this.socket = socket
  }

  /**
   * 启动心跳
   */
  start(): void {
    this.socket.on('ping', () => {
      this.socket.emit('pong')
      this.missedPongs = 0
    })

    this.intervalId = setInterval(() => {
      if (this.missedPongs >= this.maxMissedPongs) {
        console.log('心跳超时，尝试重连')
        this.socket.disconnect()
        return
      }
      this.missedPongs++
    }, 30000)
  }

  /**
   * 停止心跳
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
  }
}
```

## 扩展性设计

### Redis 适配器

```typescript
import { createAdapter } from '@socket.io/redis-adapter'
import { createClient } from 'redis'

/**
 * 配置 Redis 适配器
 * @param io - Socket.IO 实例
 * @param redisUrl - Redis 连接地址
 */
async function setupRedisAdapter(io: Server, redisUrl: string): Promise<void> {
  const pubClient = createClient({ url: redisUrl })
  const subClient = pubClient.duplicate()

  await Promise.all([
    pubClient.connect(),
    subClient.connect()
  ])

  io.adapter(createAdapter(pubClient, subClient))
  
  console.log('Redis 适配器已配置')
}

/**
 * 多服务器消息广播
 */
class ClusterBroadcaster {
  private io: Server

  /**
   * 广播到所有服务器
   * @param event - 事件名称
   * @param data - 数据
   */
  broadcastAll(event: string, data: unknown): void {
    this.io.emit(event, data)
  }

  /**
   * 广播到特定房间（跨服务器）
   * @param room - 房间ID
   * @param event - 事件名称
   * @param data - 数据
   */
  broadcastToRoom(room: string, event: string, data: unknown): void {
    this.io.to(room).emit(event, data)
  }

  /**
   * 发送给特定用户（跨服务器）
   * @param userId - 用户ID
   * @param event - 事件名称
   * @param data - 数据
   */
  sendToUser(userId: string, event: string, data: unknown): void {
    this.io.to(`user:${userId}`).emit(event, data)
  }
}
```

### 粘性会话

```typescript
import { createServer } from 'http'
import { Redis } from 'ioredis'

/**
 * 粘性会话配置
 * @param server - HTTP 服务器
 * @param redis - Redis 客户端
 */
function setupStickySession(server, redis: Redis) {
  server.on('connection', (socket) => {
    const sessionId = generateSessionId()
    
    redis.set(`session:${sessionId}`, process.pid, 'EX', 3600)
    
    socket.on('data', (data) => {
      redis.get(`session:${sessionId}`).then((workerId) => {
        if (workerId && workerId !== String(process.pid)) {
          socket.destroy()
        }
      })
    })
  })
}
```

## 错误处理

### 错误类型定义

```typescript
/**
 * WebSocket 错误类型
 */
enum WSErrorCode {
  UNAUTHORIZED = 4001,
  FORBIDDEN = 4002,
  ROOM_NOT_FOUND = 4003,
  INVALID_MESSAGE = 4004,
  RATE_LIMITED = 4005,
  INTERNAL_ERROR = 4500
}

/**
 * WebSocket 错误类
 */
class WSError extends Error {
  constructor(
    public code: WSErrorCode,
    message: string
  ) {
    super(message)
    this.name = 'WSError'
  }
}

/**
 * 错误处理中间件
 * @param socket - Socket 实例
 * @param next - 下一个中间件
 */
async function errorMiddleware(socket, next) {
  try {
    await next()
  } catch (error) {
    if (error instanceof WSError) {
      socket.emit('error', {
        code: error.code,
        message: error.message
      })
    } else {
      socket.emit('error', {
        code: WSErrorCode.INTERNAL_ERROR,
        message: '服务器内部错误'
      })
    }
  }
}
```

## 安全最佳实践

### 消息验证

```typescript
import Joi from 'joi'

/**
 * 消息验证模式
 */
const messageSchema = Joi.object({
  roomId: Joi.string().required(),
  content: Joi.string().max(1000).required(),
  type: Joi.string().valid('text', 'image', 'file').default('text')
})

/**
 * 消息验证中间件
 * @param schema - Joi 验证模式
 */
function validateMessage(schema: Joi.Schema) {
  return (socket, data, next) => {
    const { error, value } = schema.validate(data)
    
    if (error) {
      return next(new WSError(
        WSErrorCode.INVALID_MESSAGE,
        error.details[0].message
      ))
    }
    
    socket.data.validatedMessage = value
    next()
  }
}
```

### 速率限制

```typescript
/**
 * 速率限制器
 */
class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private limit: number
  private window: number

  constructor(limit: number, windowMs: number) {
    this.limit = limit
    this.window = windowMs
  }

  /**
   * 检查是否超限
   * @param key - 限制键
   * @returns 是否允许
   */
  check(key: string): boolean {
    const now = Date.now()
    const requests = this.requests.get(key) || []
    
    const validRequests = requests.filter(
      time => now - time < this.window
    )
    
    if (validRequests.length >= this.limit) {
      return false
    }
    
    validRequests.push(now)
    this.requests.set(key, validRequests)
    return true
  }
}

/**
 * 速率限制中间件
 */
function rateLimitMiddleware(limiter: RateLimiter) {
  return (socket, event, args, next) => {
    const key = `${socket.data.user.id}:${event}`
    
    if (!limiter.check(key)) {
      return next(new WSError(
        WSErrorCode.RATE_LIMITED,
        '请求过于频繁'
      ))
    }
    
    next()
  }
}
```

## 测试策略

### 单元测试

```typescript
import { createServer } from 'http'
import { io as ioClient } from 'socket.io-client'
import { Server } from 'socket.io'

/**
 * Socket.IO 测试
 */
describe('WebSocket Tests', () => {
  let io: Server
  let serverSocket: any
  let clientSocket: any

  beforeAll((done) => {
    const httpServer = createServer()
    io = new Server(httpServer)
    
    httpServer.listen(() => {
      const port = (httpServer.address() as any).port
      clientSocket = ioClient(`http://localhost:${port}`)
      
      io.on('connection', (socket) => {
        serverSocket = socket
      })
      
      clientSocket.on('connect', done)
    })
  })

  afterAll(() => {
    io.close()
    clientSocket.disconnect()
  })

  it('应该接收消息', (done) => {
    clientSocket.on('hello', (arg) => {
      expect(arg).toBe('world')
      done()
    })
    
    serverSocket.emit('hello', 'world')
  })

  it('应该处理事件', (done) => {
    serverSocket.on('message', (arg) => {
      expect(arg).toBe('test')
      done()
    })
    
    clientSocket.emit('message', 'test')
  })
})
```
