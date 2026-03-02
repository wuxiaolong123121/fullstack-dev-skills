# PM2 进程管理工作流参考

PM2 进程管理器核心配置、监控策略、日志管理和最佳实践，用于构建稳定、可靠的 Node.js 应用生产环境。

## When to Activate

- 部署 Node.js 应用到生产环境
- 配置进程监控和自动重启
- 设置日志管理策略
- 管理多进程集群模式

## Core Principles

### 1. 进程高可用

PM2 确保应用持续运行，自动处理崩溃和重启。

```javascript
// Good: 配置自动重启策略
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    // 自动重启配置
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 1000,
    // 监听文件变化（生产环境建议关闭）
    watch: false,
  }]
};
```

### 2. 零停机重载

使用集群模式实现无缝部署。

```javascript
// Good: 集群模式配置
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    // 优雅关闭
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 3000,
  }]
};
```

### 3. 环境隔离

区分开发、测试、生产环境配置。

```javascript
// Good: 多环境配置
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    env: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug'
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 8080,
      LOG_LEVEL: 'info'
    }
  }]
};
```

## 进程监控配置

### 基础监控设置

```javascript
/**
 * 基础进程监控配置
 * @description 配置进程健康检查和资源限制
 */
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    instances: 2,
    exec_mode: 'cluster',
    
    // 内存限制（超出自动重启）
    max_memory_restart: '500M',
    
    // 健康检查
    instance_var: 'INSTANCE_ID',
    
    // 进程异常监控
    pmx: true,
    automation: false,
  }]
};
```

### 内存监控策略

```javascript
/**
 * 内存监控配置
 * @description 设置内存阈值和重启策略
 */
module.exports = {
  apps: [{
    name: 'memory-monitored-app',
    script: './src/index.js',
    
    // 内存限制
    max_memory_restart: '1G',
    
    // 重启策略
    max_restarts: 15,
    min_uptime: '30s',
    restart_delay: 2000,
    
    // 异常检测
    exp_backoff_restart_delay: true,
    max_restarts_per_hour: 5,
  }]
};
```

### CPU 监控配置

```javascript
/**
 * CPU 监控配置
 * @description 配置 CPU 使用率监控
 */
module.exports = {
  apps: [{
    name: 'cpu-monitored-app',
    script: './src/index.js',
    
    // 实例数量（根据 CPU 核心数）
    instances: 'max',
    exec_mode: 'cluster',
    
    // 进程优先级
    node_args: '--max-old-space-size=2048',
    
    // 监控配置
    merge_logs: true,
    time: true,
  }]
};
```

## 自动重启策略

### 基于时间的重启

```javascript
/**
 * 定时重启配置
 * @description 在特定时间自动重启进程
 */
module.exports = {
  apps: [{
    name: 'scheduled-restart-app',
    script: './src/index.js',
    
    // 定时重启（cron 格式）
    cron_restart: '0 3 * * *',  // 每天凌晨 3 点重启
    
    // 重启前通知
    pre_stop: 'npm run pre-stop-hook',
  }]
};
```

### 基于异常的重启

```javascript
/**
 * 异常重启配置
 * @description 配置异常情况下的重启策略
 */
module.exports = {
  apps: [{
    name: 'fault-tolerant-app',
    script: './src/index.js',
    
    // 自动重启
    autorestart: true,
    
    // 重启限制
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 1000,
    
    // 指数退避
    exp_backoff_restart_delay: true,
    
    // 不稳定重启阈值
    unstable_restarts: 5,
  }]
};
```

### 优雅关闭配置

```javascript
/**
 * 优雅关闭配置
 * @description 确保进程安全退出
 */
module.exports = {
  apps: [{
    name: 'graceful-shutdown-app',
    script: './src/index.js',
    
    // 关闭超时时间
    kill_timeout: 5000,
    
    // 等待 ready 信号
    wait_ready: true,
    listen_timeout: 3000,
    
    // 关闭钩子脚本
    pre_stop: 'node scripts/pre-stop.js',
  }]
};
```

```javascript
// 应用代码中的优雅关闭处理
// src/index.js

/**
 * 优雅关闭处理
 * @description 处理进程信号和资源清理
 */
process.on('SIGINT', async () => {
  console.log('收到 SIGINT 信号，开始优雅关闭...');
  
  // 停止接受新请求
  server.close(() => {
    console.log('HTTP 服务器已关闭');
  });
  
  // 关闭数据库连接
  await database.close();
  
  // 清理其他资源
  await cleanupResources();
  
  // 通知 PM2 进程已准备好关闭
  process.send('ready');
  
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('收到 SIGTERM 信号，开始优雅关闭...');
  // 同上处理逻辑
});
```

## 日志管理配置

### 基础日志配置

```javascript
/**
 * 基础日志配置
 * @description 配置日志输出和存储
 */
module.exports = {
  apps: [{
    name: 'logging-app',
    script: './src/index.js',
    
    // 日志文件路径
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    
    // 日志合并
    merge_logs: true,
    
    // 添加时间戳
    time: true,
    
    // 日志格式
    log_type: 'json',
  }]
};
```

### 日志轮转配置

```javascript
/**
 * 日志轮转配置
 * @description 使用 pm2-logrotate 管理日志文件
 */
module.exports = {
  apps: [{
    name: 'logrotate-app',
    script: './src/index.js',
    
    // 日志配置
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    
    // 禁用 PM2 默认日志轮转（使用 pm2-logrotate）
    merge_logs: false,
  }]
};
```

```bash
# 安装 pm2-logrotate 模块
pm2 install pm2-logrotate

# 配置日志轮转参数
pm2 set pm2-logrotate:max_size 100M        # 单文件最大 100MB
pm2 set pm2-logrotate:retain 30            # 保留 30 天日志
pm2 set pm2-logrotate:compress true        # 压缩旧日志
pm2 set pm2-logrotate:dateFormat YYYY-MM-DD-HH-mm-ss  # 日期格式
pm2 set pm2-logrotate:rotateModule true    # 轮转 PM2 模块日志
```

### 结构化日志配置

```javascript
/**
 * 结构化日志配置
 * @description 输出 JSON 格式日志便于分析
 */
module.exports = {
  apps: [{
    name: 'structured-logging-app',
    script: './src/index.js',
    
    // JSON 格式日志
    log_type: 'json',
    log_date_format: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
    
    // 日志文件
    error_file: './logs/error.json.log',
    out_file: './logs/out.json.log',
    
    // 合并日志流
    merge_logs: true,
  }]
};
```

```javascript
// 应用代码中的结构化日志示例
// src/logger.js

const winston = require('winston');

/**
 * 创建结构化日志记录器
 * @returns {winston.Logger} Winston 日志实例
 */
function createLogger() {
  return winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    defaultMeta: {
      service: 'my-app',
      environment: process.env.NODE_ENV
    },
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error'
      }),
      new winston.transports.File({
        filename: 'logs/combined.log'
      })
    ]
  });
}

module.exports = { createLogger };
```

## PM2 配置示例

### 完整 ecosystem.config.js

```javascript
/**
 * PM2 生态系统配置文件
 * @description 生产环境完整配置示例
 */
module.exports = {
  apps: [
    // 主应用配置
    {
      name: 'api-server',
      script: './src/index.js',
      
      // 实例配置
      instances: 'max',
      exec_mode: 'cluster',
      
      // 环境变量
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      
      // 资源限制
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=2048',
      
      // 重启策略
      autorestart: true,
      max_restarts: 10,
      min_uptime: '30s',
      restart_delay: 2000,
      exp_backoff_restart_delay: true,
      
      // 定时重启
      cron_restart: '0 3 * * *',
      
      // 优雅关闭
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 3000,
      
      // 日志配置
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/api-error.log',
      out_file: './logs/api-out.log',
      merge_logs: true,
      
      // 监控
      pmx: true,
      automation: false,
    },
    
    // 后台任务配置
    {
      name: 'background-worker',
      script: './src/worker.js',
      
      // 单实例模式
      instances: 1,
      exec_mode: 'fork',
      
      // 环境变量
      env_production: {
        NODE_ENV: 'production',
        QUEUE_URL: 'redis://localhost:6379'
      },
      
      // 资源限制
      max_memory_restart: '512M',
      
      // 重启策略
      autorestart: true,
      max_restarts: 5,
      restart_delay: 5000,
      
      // 日志配置
      error_file: './logs/worker-error.log',
      out_file: './logs/worker-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    },
    
    // 定时任务配置
    {
      name: 'cron-job',
      script: './src/cron.js',
      
      // 定时执行
      cron_restart: '*/5 * * * *',  // 每 5 分钟执行一次
      
      // 单实例
      instances: 1,
      exec_mode: 'fork',
      
      // 执行后自动停止
      autorestart: false,
      
      // 日志配置
      error_file: './logs/cron-error.log',
      out_file: './logs/cron-out.log',
    }
  ],
  
  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['server1.example.com', 'server2.example.com'],
      ref: 'origin/main',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/production',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': 'apt-get install git -y'
    },
    staging: {
      user: 'deploy',
      host: 'staging.example.com',
      ref: 'origin/develop',
      repo: 'git@github.com:user/repo.git',
      path: '/var/www/staging',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging'
    }
  }
};
```

### 微服务架构配置

```javascript
/**
 * 微服务架构 PM2 配置
 * @description 多服务协同配置示例
 */
module.exports = {
  apps: [
    // API 网关
    {
      name: 'api-gateway',
      script: './services/gateway/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        PORT: 8000,
        SERVICE_NAME: 'gateway'
      },
      max_memory_restart: '512M'
    },
    
    // 用户服务
    {
      name: 'user-service',
      script: './services/user/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        PORT: 8001,
        SERVICE_NAME: 'user'
      },
      max_memory_restart: '512M'
    },
    
    // 订单服务
    {
      name: 'order-service',
      script: './services/order/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env_production: {
        PORT: 8002,
        SERVICE_NAME: 'order'
      },
      max_memory_restart: '512M'
    },
    
    // 消息队列消费者
    {
      name: 'message-consumer',
      script: './services/consumer/index.js',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        SERVICE_NAME: 'consumer'
      },
      max_memory_restart: '256M'
    }
  ]
};
```

## 监控脚本示例

### 健康检查脚本

```javascript
/**
 * 健康检查脚本
 * @description 检查 PM2 进程状态并发送告警
 * @file scripts/health-check.js
 */

const pm2 = require('pm2');
const axios = require('axios');

/**
 * 发送告警通知
 * @param {string} message - 告警消息
 * @returns {Promise<void>}
 */
async function sendAlert(message) {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL;
  if (!webhookUrl) {
    console.warn('未配置告警 Webhook URL');
    return;
  }
  
  try {
    await axios.post(webhookUrl, {
      text: `【PM2 告警】${message}`,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('发送告警失败:', error.message);
  }
}

/**
 * 检查进程健康状态
 * @returns {Promise<void>}
 */
async function checkProcessHealth() {
  return new Promise((resolve, reject) => {
    pm2.connect((err) => {
      if (err) {
        reject(err);
        return;
      }
      
      pm2.list((err, processes) => {
        pm2.disconnect();
        
        if (err) {
          reject(err);
          return;
        }
        
        const issues = [];
        
        processes.forEach(proc => {
          // 检查停止的进程
          if (proc.pm2_env.status === 'stopped') {
            issues.push(`进程 ${proc.name} 已停止`);
          }
          
          // 检查重启次数
          if (proc.pm2_env.restart_time > 5) {
            issues.push(`进程 ${proc.name} 重启次数过多: ${proc.pm2_env.restart_time}`);
          }
          
          // 检查内存使用
          const memoryMB = proc.monit.memory / 1024 / 1024;
          if (memoryMB > 500) {
            issues.push(`进程 ${proc.name} 内存使用过高: ${memoryMB.toFixed(2)}MB`);
          }
          
          // 检查 CPU 使用
          if (proc.monit.cpu > 80) {
            issues.push(`进程 ${proc.name} CPU 使用过高: ${proc.monit.cpu}%`);
          }
        });
        
        if (issues.length > 0) {
          sendAlert(issues.join('\n'));
        }
        
        resolve(issues);
      });
    });
  });
}

// 执行健康检查
checkProcessHealth()
  .then(issues => {
    if (issues.length === 0) {
      console.log('所有进程运行正常');
    } else {
      console.log('发现问题:', issues);
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('健康检查失败:', error);
    process.exit(1);
  });
```

### 自动重启监控脚本

```javascript
/**
 * 自动重启监控脚本
 * @description 监控进程重启频率并自动处理
 * @file scripts/restart-monitor.js
 */

const pm2 = require('pm2');

/**
 * 重启监控器类
 * @description 监控进程重启行为
 */
class RestartMonitor {
  /**
   * 创建重启监控器实例
   * @param {Object} options - 配置选项
   * @param {number} options.threshold - 重启阈值
   * @param {number} options.windowMs - 时间窗口（毫秒）
   */
  constructor(options = {}) {
    this.threshold = options.threshold || 5;
    this.windowMs = options.windowMs || 60000;
    this.restartHistory = new Map();
  }
  
  /**
   * 记录重启事件
   * @param {string} processName - 进程名称
   */
  recordRestart(processName) {
    const now = Date.now();
    
    if (!this.restartHistory.has(processName)) {
      this.restartHistory.set(processName, []);
    }
    
    const history = this.restartHistory.get(processName);
    history.push(now);
    
    // 清理过期记录
    const cutoff = now - this.windowMs;
    const filtered = history.filter(time => time > cutoff);
    this.restartHistory.set(processName, filtered);
    
    // 检查是否超过阈值
    if (filtered.length >= this.threshold) {
      this.handleExcessiveRestarts(processName);
    }
  }
  
  /**
   * 处理频繁重启
   * @param {string} processName - 进程名称
   */
  async handleExcessiveRestarts(processName) {
    console.error(`进程 ${processName} 在 ${this.windowMs / 1000}s 内重启超过 ${this.threshold} 次`);
    
    // 停止问题进程
    pm2.stop(processName, (err) => {
      if (err) {
        console.error(`停止进程 ${processName} 失败:`, err);
      } else {
        console.log(`已停止频繁重启的进程: ${processName}`);
      }
    });
    
    // 发送告警
    await this.sendAlert(processName);
  }
  
  /**
   * 发送告警
   * @param {string} processName - 进程名称
   */
  async sendAlert(processName) {
    console.log(`[告警] 进程 ${processName} 频繁重启，已自动停止`);
  }
  
  /**
   * 启动监控
   */
  start() {
    pm2.connect((err) => {
      if (err) {
        console.error('连接 PM2 失败:', err);
        return;
      }
      
      // 监听进程事件
      pm2.launchBus((err, bus) => {
        if (err) {
          console.error('启动事件总线失败:', err);
          return;
        }
        
        bus.on('process:restart', (data) => {
          this.recordRestart(data.process.name);
        });
        
        console.log('重启监控已启动');
      });
    });
  }
}

// 启动监控
const monitor = new RestartMonitor({
  threshold: 5,
  windowMs: 60000
});

monitor.start();
```

### 性能监控脚本

```javascript
/**
 * 性能监控脚本
 * @description 收集并上报进程性能指标
 * @file scripts/performance-monitor.js
 */

const pm2 = require('pm2');
const os = require('os');

/**
 * 性能监控器类
 * @description 收集系统和进程性能数据
 */
class PerformanceMonitor {
  /**
   * 创建性能监控器实例
   * @param {Object} options - 配置选项
   * @param {number} options.interval - 采集间隔（毫秒）
   */
  constructor(options = {}) {
    this.interval = options.interval || 60000;
    this.metrics = [];
  }
  
  /**
   * 收集系统指标
   * @returns {Object} 系统指标数据
   */
  collectSystemMetrics() {
    return {
      timestamp: new Date().toISOString(),
      hostname: os.hostname(),
      platform: os.platform(),
      cpus: os.cpus().length,
      totalMemory: os.totalmem(),
      freeMemory: os.freemem(),
      usedMemoryPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2),
      loadAverage: os.loadavg(),
      uptime: os.uptime()
    };
  }
  
  /**
   * 收集进程指标
   * @returns {Promise<Array>} 进程指标数组
   */
  collectProcessMetrics() {
    return new Promise((resolve, reject) => {
      pm2.list((err, processes) => {
        if (err) {
          reject(err);
          return;
        }
        
        const metrics = processes.map(proc => ({
          name: proc.name,
          pid: proc.pid,
          status: proc.pm2_env.status,
          cpu: proc.monit.cpu,
          memory: proc.monit.memory,
          memoryMB: (proc.monit.memory / 1024 / 1024).toFixed(2),
          restarts: proc.pm2_env.restart_time,
          uptime: proc.pm2_env.pm_uptime
        }));
        
        resolve(metrics);
      });
    });
  }
  
  /**
   * 生成性能报告
   * @returns {Promise<Object>} 完整性能报告
   */
  async generateReport() {
    const systemMetrics = this.collectSystemMetrics();
    const processMetrics = await this.collectProcessMetrics();
    
    return {
      system: systemMetrics,
      processes: processMetrics,
      summary: {
        totalProcesses: processMetrics.length,
        runningProcesses: processMetrics.filter(p => p.status === 'online').length,
        totalCpuUsage: processMetrics.reduce((sum, p) => sum + p.cpu, 0).toFixed(2),
        totalMemoryUsage: processMetrics.reduce((sum, p) => sum + p.memory, 0)
      }
    };
  }
  
  /**
   * 启动监控
   */
  start() {
    pm2.connect((err) => {
      if (err) {
        console.error('连接 PM2 失败:', err);
        return;
      }
      
      // 定时收集指标
      setInterval(async () => {
        try {
          const report = await this.generateReport();
          console.log(JSON.stringify(report, null, 2));
          
          // 这里可以添加上报逻辑
          await this.reportMetrics(report);
        } catch (error) {
          console.error('收集指标失败:', error);
        }
      }, this.interval);
      
      console.log(`性能监控已启动，采集间隔: ${this.interval}ms`);
    });
  }
  
  /**
   * 上报指标数据
   * @param {Object} report - 性能报告
   */
  async reportMetrics(report) {
    // 实现指标上报逻辑
    // 例如发送到 Prometheus、InfluxDB 等
  }
}

// 启动监控
const monitor = new PerformanceMonitor({
  interval: 60000
});

monitor.start();
```

## Quick Reference: PM2 命令

| 命令 | 描述 |
|------|------|
| `pm2 start app.js` | 启动应用 |
| `pm2 start ecosystem.config.js` | 使用配置文件启动 |
| `pm2 stop all` | 停止所有应用 |
| `pm2 restart all` | 重启所有应用 |
| `pm2 reload all` | 零停机重载 |
| `pm2 delete all` | 删除所有应用 |
| `pm2 list` | 查看应用列表 |
| `pm2 monit` | 打开监控面板 |
| `pm2 logs` | 查看日志 |
| `pm2 logs app --lines 100` | 查看指定应用最近 100 行日志 |
| `pm2 flush` | 清空日志 |
| `pm2 describe app` | 查看应用详情 |
| `pm2 env 0` | 查看进程环境变量 |
| `pm2 startup` | 生成开机启动脚本 |
| `pm2 save` | 保存当前进程列表 |
| `pm2 resurrect` | 恢复保存的进程 |
| `pm2 reset` | 重置重启计数器 |

## Anti-Patterns to Avoid

```javascript
// Bad: 直接使用命令行参数启动生产应用
// pm2 start app.js -i max --name "my-app"

// Good: 使用配置文件
// pm2 start ecosystem.config.js --env production

// Bad: 不配置内存限制
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js'
    // 缺少 max_memory_restart
  }]
};

// Good: 配置内存限制
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    max_memory_restart: '1G'
  }]
};

// Bad: 开发环境配置用于生产
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    watch: true,  // 生产环境不应开启
    ignore_watch: ['node_modules']
  }]
};

// Good: 生产环境关闭 watch
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    watch: false,
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};

// Bad: 无限制重启
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    autorestart: true
    // 缺少 max_restarts 限制
  }]
};

// Good: 配置重启限制
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    autorestart: true,
    max_restarts: 10,
    min_uptime: '30s'
  }]
};

// Bad: 日志文件无限增长
module.exports = {
  apps: [{
    name: 'my-app',
    script: './src/index.js',
    error_file: './logs/error.log',
    out_file: './logs/out.log'
    // 缺少日志轮转配置
  }]
};

// Good: 配置日志轮转
// 安装: pm2 install pm2-logrotate
// 配置: pm2 set pm2-logrotate:max_size 100M
```

**Remember**: PM2 配置应该根据应用特性进行调整，生产环境务必配置内存限制、重启策略和日志管理，确保应用稳定可靠运行。
