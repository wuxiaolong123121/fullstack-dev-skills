# multi-workflow 命令参考

## 命令概述
`multi-workflow` 命令用于全多模型开发工作流编排，通过协调多个不同类型的模型和服务来共同完成端到端的开发工作流。

## 命令语法
```bash
fullstack-dev-skills multi-workflow [选项] --workflow "工作流描述"
```

## 参数说明
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `--workflow` | 字符串 | 是 | 工作流描述，详细说明端到端的开发任务目标和要求 |
| `--models` | 字符串数组 | 否 | 指定要使用的模型列表，默认为系统推荐的模型组合 |
| `--services` | 字符串数组 | 否 | 指定要使用的服务列表，默认为系统推荐的服务组合 |
| `--timeout` | 数字 | 否 | 任务超时时间（秒），默认 600 |
| `--output` | 字符串 | 否 | 输出格式，支持 `json` 和 `text`，默认 `text` |

## 工作原理
1. **工作流分解**：将端到端工作流分解为多个阶段（需求分析、设计、开发、测试、部署）
2. **模型分配**：根据各阶段的性质分配给最适合的模型
3. **服务协调**：协调多个服务的配置和交互
4. **并行处理**：多个模型和服务同时处理各自的任务
5. **结果整合**：将各阶段的结果整合为统一的工作流输出
6. **质量保证**：确保整个工作流的输出质量和一致性

## 使用示例

### 示例 1：完整的 Web 应用开发
```bash
fullstack-dev-skills multi-workflow --workflow "开发一个完整的任务管理 Web 应用，包括前端 React 界面、后端 Express API 和 MongoDB 数据库"
```

#### 预期输出
```
# 任务管理 Web 应用开发工作流

## 1. 需求分析

### 功能需求
- **用户认证**：注册、登录、密码重置
- **任务管理**：创建、读取、更新、删除任务
- **任务属性**：标题、描述、截止日期、优先级、状态
- **分类管理**：任务分类和标签
- **用户界面**：响应式设计，支持桌面和移动设备

### 非功能需求
- **性能**：页面加载时间 < 2 秒
- **安全性**：使用 HTTPS，密码加密存储
- **可扩展性**：支持未来添加更多功能
- **可靠性**：数据定期备份

## 2. 技术设计

### 技术栈
- **前端**：React 18 + TypeScript + Tailwind CSS
- **后端**：Express.js + Node.js + MongoDB
- **认证**：JWT + bcrypt
- **API**：RESTful API
- **构建工具**：Vite (前端) + Nodemon (后端)

### 系统架构
- **前端**：单页应用 (SPA)，使用 React Router 进行路由管理
- **后端**：Express 服务器，提供 RESTful API
- **数据库**：MongoDB，存储用户和任务数据
- **部署**：前端部署到 Vercel，后端部署到 Heroku

### 数据模型

#### 用户模型
```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,
  createdAt: Date,
  updatedAt: Date
}
```

#### 任务模型
```javascript
{
  _id: ObjectId,
  title: String,
  description: String,
  dueDate: Date,
  priority: String, // low, medium, high
  status: String, // todo, in-progress, completed
  userId: ObjectId,
  category: String,
  tags: [String],
  createdAt: Date,
  updatedAt: Date
}
```

## 3. 前端开发

### 项目结构
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   ├── Task/
│   │   ├── Layout/
│   │   └── Common/
│   ├── pages/
│   │   ├── Auth/
│   │   ├── Task/
│   │   └── Dashboard/
│   ├── hooks/
│   ├── services/
│   ├── utils/
│   ├── context/
│   ├── router/
│   ├── App.tsx
│   └── main.tsx
├── package.json
├── tsconfig.json
└── vite.config.ts
```

### 核心组件
- **登录/注册组件**：处理用户认证
- **任务列表组件**：显示任务列表，支持筛选和排序
- **任务详情组件**：显示和编辑任务详情
- **任务表单组件**：创建和更新任务
- **导航组件**：应用导航菜单

### 前端状态管理
- 使用 React Context API 管理全局状态（如用户认证状态）
- 使用 React Hooks (useState, useEffect) 管理组件局部状态

## 4. 后端开发

### 项目结构
```
backend/
├── src/
│   ├── controllers/
│   │   ├── authController.js
│   │   └── taskController.js
│   ├── middlewares/
│   │   ├── authMiddleware.js
│   │   └── errorMiddleware.js
│   ├── models/
│   │   ├── User.js
│   │   └── Task.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── taskRoutes.js
│   ├── utils/
│   │   ├── jwtUtils.js
│   │   └── passwordUtils.js
│   ├── config/
│   │   ├── database.js
│   │   └── server.js
│   └── app.js
├── package.json
└── .env
```

### 核心 API 端点

#### 认证 API
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/forgot-password` - 密码重置请求
- `POST /api/auth/reset-password` - 密码重置

#### 任务 API
- `GET /api/tasks` - 获取用户任务列表
- `GET /api/tasks/:id` - 获取任务详情
- `POST /api/tasks` - 创建新任务
- `PUT /api/tasks/:id` - 更新任务
- `DELETE /api/tasks/:id` - 删除任务

## 5. 数据库配置

### MongoDB 配置
```javascript
// config/database.js
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('MongoDB 连接成功');
  } catch (error) {
    console.error('MongoDB 连接失败:', error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 环境变量
```env
# .env
PORT=5000
MONGO_URI=mongodb://localhost:27017/task-manager
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
```

## 6. 测试计划

### 前端测试
- **单元测试**：测试组件功能
- **集成测试**：测试组件交互
- **E2E 测试**：测试完整的用户流程

### 后端测试
- **单元测试**：测试控制器和中间件
- **集成测试**：测试 API 端点
- **数据库测试**：测试数据模型和查询

### 性能测试
- **负载测试**：测试系统在高负载下的性能
- **响应时间测试**：测试 API 响应时间

## 7. 部署计划

### 前端部署
1. **构建生产版本**：`npm run build`
2. **部署到 Vercel**：连接 GitHub 仓库，自动部署
3. **配置环境变量**：设置 API 端点 URL

### 后端部署
1. **创建 Heroku 应用**：`heroku create`
2. **添加 MongoDB 插件**：`heroku addons:create mongolab:sandbox`
3. **配置环境变量**：`heroku config:set JWT_SECRET=your_jwt_secret_key`
4. **部署代码**：`git push heroku main`
5. **启动应用**：`heroku ps:scale web=1`

## 8. 完整代码实现

### 前端核心代码

#### 任务列表组件
```tsx
import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const TaskList: React.FC = () => {
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          setError('请先登录');
          setLoading(false);
          return;
        }

        const response = await axios.get('http://localhost:5000/api/tasks', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setTasks(response.data);
        setLoading(false);
      } catch (err: any) {
        setError(err.response?.data?.message || '获取任务失败');
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await axios.delete(`http://localhost:5000/api/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      setTasks(tasks.filter(task => task._id !== id));
    } catch (err) {
      setError('删除任务失败');
    }
  };

  if (loading) return <div className="loading">加载中...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <h1>任务列表</h1>
      <Link to="/tasks/add" className="btn btn-primary mb-4">添加任务</Link>
      
      <div className="task-list">
        {tasks.length === 0 ? (
          <p>暂无任务</p>
        ) : (
          tasks.map(task => (
            <div key={task._id} className="task-card">
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <div className="task-meta">
                <span>截止日期: {new Date(task.dueDate).toLocaleDateString()}</span>
                <span>优先级: {task.priority}</span>
                <span>状态: {task.status}</span>
              </div>
              <div className="task-actions">
                <Link to={`/tasks/${task._id}`} className="btn btn-secondary">编辑</Link>
                <button 
                  onClick={() => handleDelete(task._id)} 
                  className="btn btn-danger"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TaskList;
```

### 后端核心代码

#### 任务控制器
```javascript
const Task = require('../models/Task');

// 获取用户任务列表
exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user.id });
    res.json(tasks);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('服务器错误');
  }
};

// 获取任务详情
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 验证任务所属权
    if (task.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: '无权访问此任务' });
    }
    
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('服务器错误');
  }
};

// 创建新任务
exports.createTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, status, category, tags } = req.body;
    
    const newTask = new Task({
      title,
      description,
      dueDate,
      priority,
      status,
      category,
      tags,
      userId: req.user.id
    });
    
    const task = await newTask.save();
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('服务器错误');
  }
};

// 更新任务
exports.updateTask = async (req, res) => {
  try {
    const { title, description, dueDate, priority, status, category, tags } = req.body;
    
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 验证任务所属权
    if (task.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: '无权修改此任务' });
    }
    
    // 更新任务
    task = await Task.findByIdAndUpdate(
      req.params.id,
      {
        title,
        description,
        dueDate,
        priority,
        status,
        category,
        tags
      },
      { new: true }
    );
    
    res.json(task);
  } catch (error) {
    console.error(error.message);
    res.status(500).send('服务器错误');
  }
};

// 删除任务
exports.deleteTask = async (req, res) => {
  try {
    let task = await Task.findById(req.params.id);
    
    if (!task) {
      return res.status(404).json({ message: '任务不存在' });
    }
    
    // 验证任务所属权
    if (task.userId.toString() !== req.user.id) {
      return res.status(401).json({ message: '无权删除此任务' });
    }
    
    await Task.findByIdAndRemove(req.params.id);
    res.json({ message: '任务已删除' });
  } catch (error) {
    console.error(error.message);
    res.status(500).send('服务器错误');
  }
};
```

#### 认证中间件
```javascript
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 获取 token
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  // 检查 token 是否存在
  if (!token) {
    return res.status(401).json({ message: '无令牌，授权被拒绝' });
  }
  
  try {
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (error) {
    res.status(401).json({ message: '令牌无效' });
  }
};
```

## 9. 安装和运行

### 前端
```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 后端
```bash
# 安装依赖
npm install

# 运行开发服务器
npm run dev

# 启动生产服务器
npm start
```

## 10. 预期成果

### 功能特性
- **完整的用户认证系统**：支持注册、登录和密码重置
- **全面的任务管理**：支持创建、编辑、删除和查看任务
- **任务属性管理**：支持设置截止日期、优先级、状态、分类和标签
- **响应式设计**：适配桌面和移动设备
- **安全的 API**：使用 JWT 进行身份验证，密码加密存储

### 技术亮点
- **模块化架构**：前端和后端代码都采用模块化设计
- **类型安全**：前端使用 TypeScript 确保类型安全
- **响应式 UI**：使用 Tailwind CSS 构建美观的响应式界面
- **RESTful API**：后端提供标准化的 RESTful API
- **数据验证**：前端和后端都实现了数据验证

### 部署成果
- **前端**：部署到 Vercel，提供全球访问
- **后端**：部署到 Heroku，提供稳定的 API 服务
- **数据库**：使用 MongoDB Atlas，提供可靠的数据存储
```

### 示例 2：移动应用后端 API 开发
```bash
fullstack-dev-skills multi-workflow --workflow "为一个移动应用开发完整的后端 API，包括用户认证、数据存储和推送通知功能"
```

#### 预期输出
```
# 移动应用后端 API 开发工作流

## 1. 需求分析

### 功能需求
- **用户认证**：注册、登录、刷新令牌
- **数据存储**：用户资料、应用数据、设置
- **推送通知**：发送和管理推送通知
- **文件上传**：用户头像、应用数据附件
- **分析**：用户行为分析、应用使用统计

### 非功能需求
- **性能**：API 响应时间 < 500ms
- **安全性**：使用 HTTPS，加密存储敏感数据
- **可靠性**：99.9% 的可用性
- **可扩展性**：支持百万级用户

## 2. 技术设计

### 技术栈
- **后端**：Node.js + Express.js
- **数据库**：PostgreSQL + Redis (缓存)
- **认证**：JWT + OAuth 2.0
- **推送通知**：Firebase Cloud Messaging (FCM)
- **文件存储**：AWS S3
- **分析**：Google Analytics

### 系统架构
- **API 网关**：处理请求路由和认证
- **微服务**：用户服务、数据服务、通知服务
- **数据库**：主从复制架构
- **缓存**：Redis 集群
- **消息队列**：RabbitMQ (处理异步任务)

## 3. 后端开发

### 项目结构
```
backend/
├── src/
│   ├── api/
│   │   ├── routes/
│   │   ├── controllers/
│   │   └── middleware/
│   ├── services/
│   │   ├── authService.js
│   │   ├── userService.js
│   │   ├── dataService.js
│   │   ├── notificationService.js
│   │   └── storageService.js
│   ├── models/
│   ├── utils/
│   ├── config/
│   └── app.js
├── package.json
└── .env
```

### 核心 API 端点

#### 认证 API
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/refresh` - 刷新令牌
- `POST /api/auth/logout` - 用户登出

#### 用户 API
- `GET /api/users/me` - 获取当前用户资料
- `PUT /api/users/me` - 更新用户资料
- `POST /api/users/avatar` - 上传用户头像

#### 数据 API
- `GET /api/data` - 获取用户数据
- `POST /api/data` - 创建新数据
- `PUT /api/data/:id` - 更新数据
- `DELETE /api/data/:id` - 删除数据

#### 通知 API
- `POST /api/notifications` - 发送通知
- `GET /api/notifications` - 获取通知历史
- `PUT /api/notifications/:id/read` - 标记通知为已读

## 4. 数据库设计

### 数据库模式

#### 用户表
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  avatar VARCHAR(255),
  device_token VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 数据表
```sql
CREATE TABLE user_data (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  type VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 通知表
```sql
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 5. 服务实现

### 认证服务
```javascript
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const User = require('../models/User');

class AuthService {
  // 注册用户
  async register(userData) {
    // 检查用户是否已存在
    const existingUser = await User.findOne({ email: userData.email });
    if (existingUser) {
      throw new Error('用户已存在');
    }
    
    // 加密密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(userData.password, salt);
    
    // 创建用户
    const user = new User({
      ...userData,
      password: hashedPassword
    });
    
    await user.save();
    
    // 生成令牌
    const token = this.generateToken(user.id);
    return { user, token };
  }
  
  // 用户登录
  async login(email, password) {
    // 查找用户
    const user = await User.findOne({ email });
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw new Error('密码错误');
    }
    
    // 生成令牌
    const token = this.generateToken(user.id);
    return { user, token };
  }
  
  // 生成 JWT 令牌
  generateToken(userId) {
    return jwt.sign(
      { userId },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  }
}

module.exports = new AuthService();
```

### 通知服务
```javascript
const admin = require('firebase-admin');
const Notification = require('../models/Notification');

class NotificationService {
  // 发送推送通知
  async sendNotification(userId, title, body, data = {}) {
    // 查找用户
    const user = await User.findById(userId);
    if (!user || !user.deviceToken) {
      throw new Error('用户没有设备令牌');
    }
    
    // 构建通知
    const message = {
      notification: {
        title,
        body
      },
      data,
      token: user.deviceToken
    };
    
    try {
      // 发送通知
      const response = await admin.messaging().send(message);
      
      // 保存通知记录
      const notification = new Notification({
        userId,
        title,
        body,
        data
      });
      await notification.save();
      
      return { success: true, messageId: response };
    } catch (error) {
      console.error('发送通知失败:', error);
      throw new Error('发送通知失败');
    }
  }
  
  // 获取用户通知
  async getUserNotifications(userId) {
    return await Notification.find({ userId }).sort({ createdAt: -1 });
  }
  
  // 标记通知为已读
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({ _id: notificationId, userId });
    if (!notification) {
      throw new Error('通知不存在');
    }
    
    notification.read = true;
    await notification.save();
    return notification;
  }
}

module.exports = new NotificationService();
```

## 6. 部署计划

### 基础设施
- **服务器**：AWS EC2 实例
- **数据库**：AWS RDS PostgreSQL
- **缓存**：AWS ElastiCache Redis
- **文件存储**：AWS S3
- **监控**：AWS CloudWatch

### 部署步骤
1. **设置 AWS 基础设施**：创建 EC2 实例、RDS 实例、ElastiCache 集群和 S3 存储桶
2. **配置环境变量**：设置数据库连接字符串、JWT 密钥、AWS 凭证等
3. **部署代码**：使用 CI/CD 工具（如 GitHub Actions）自动部署代码
4. **设置负载均衡**：使用 AWS ELB 进行负载均衡
5. **配置自动扩展**：根据流量自动调整 EC2 实例数量
6. **设置监控**：配置 CloudWatch 监控和告警

## 7. 测试计划

### API 测试
- **单元测试**：测试服务和控制器
- **集成测试**：测试 API 端点和数据库交互
- **负载测试**：测试系统在高负载下的性能

### 安全性测试
- **漏洞扫描**：使用工具扫描 API 漏洞
- **渗透测试**：测试系统的安全防护能力
- **代码审计**：审查代码中的安全问题

### 可靠性测试
- **故障注入测试**：测试系统在故障情况下的表现
- **恢复测试**：测试系统从故障中恢复的能力
- **可用性测试**：测试系统的可用性

## 8. 预期成果

### 功能特性
- **完整的用户认证系统**：支持注册、登录和令牌刷新
- **全面的数据管理**：支持创建、读取、更新和删除用户数据
- **推送通知系统**：支持发送和管理推送通知
- **文件上传功能**：支持上传用户头像和其他文件
- **分析功能**：支持用户行为分析和应用使用统计

### 技术亮点
- **微服务架构**：使用模块化设计，便于扩展
- **高性能**：使用 Redis 缓存提高性能
- **可靠性**：实现了错误处理和日志记录
- **安全性**：使用 JWT 认证，密码加密存储
- **可扩展性**：支持水平扩展

### 部署成果
- **API 服务**：部署到 AWS EC2，提供高可用性
- **数据库**：使用 AWS RDS PostgreSQL，提供可靠的数据存储
- **缓存**：使用 AWS ElastiCache Redis，提高系统性能
- **文件存储**：使用 AWS S3，提供安全的文件存储
- **监控**：使用 AWS CloudWatch，实时监控系统状态
```

## 常见问题

### Q: multi-workflow 命令与其他多代理命令有什么区别？
A: `multi-workflow` 命令专注于端到端的完整开发工作流，从需求分析到部署，协调多个模型和服务完成整个开发过程，而其他多代理命令则专注于特定阶段的任务。

### Q: 如何选择适合的模型和服务组合？
A: 系统会根据工作流类型自动推荐合适的模型和服务组合。对于复杂的全栈开发工作流，建议包含擅长前端、后端、数据库和 DevOps 的模型和服务。

### Q: 工作流描述应该多详细？
A: 工作流描述越详细，输出结果越准确。建议包含工作流的目标、具体要求、约束条件、预期成果等信息。

### Q: 如何处理工作流执行中的错误？
A: 系统会自动处理工作流执行中的错误，并提供详细的错误信息。如果遇到错误，可以尝试以下方法：
1. 提供更详细的工作流描述
2. 指定更适合的模型和服务组合
3. 调整工作流的范围和目标
4. 多次运行命令，比较不同的结果
