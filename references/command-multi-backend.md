# multi-backend 命令参考

## 命令概述
`multi-backend` 命令用于后端聚焦的多服务编排，通过协调多个后端服务和模型来共同完成复杂的后端开发任务。

## 命令语法
```bash
fullstack-dev-skills multi-backend [选项] --task "后端任务描述"
```

## 参数说明
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `--task` | 字符串 | 是 | 后端任务描述，详细说明任务目标和要求 |
| `--services` | 字符串数组 | 否 | 指定要使用的后端服务列表，默认为系统推荐的服务组合 |
| `--models` | 字符串数组 | 否 | 指定要使用的模型列表，默认为系统推荐的模型组合 |
| `--timeout` | 数字 | 否 | 任务超时时间（秒），默认 300 |
| `--output` | 字符串 | 否 | 输出格式，支持 `json` 和 `text`，默认 `text` |

## 工作原理
1. **服务识别**：识别任务所需的后端服务类型（数据库、缓存、消息队列等）
2. **模型分配**：根据任务性质分配给最适合的模型
3. **服务编排**：协调多个后端服务的配置和交互
4. **代码生成**：生成符合最佳实践的后端代码
5. **测试验证**：确保生成的代码和配置能够正常工作

## 使用示例

### 示例 1：后端 API 开发
```bash
fullstack-dev-skills multi-backend --task "开发一个用户认证系统的后端 API，包括注册、登录、密码重置功能"
```

#### 预期输出
```
# 用户认证系统后端 API 实现

## 1. 技术栈
- **框架**：Express.js
- **数据库**：PostgreSQL
- **认证**：JWT
- **密码加密**：bcrypt
- **验证**：express-validator

## 2. 项目结构
```
src/
├── controllers/
│   └── authController.js
├── middlewares/
│   └── authMiddleware.js
├── models/
│   └── User.js
├── routes/
│   └── authRoutes.js
├── utils/
│   ├── email.js
│   └── validator.js
├── config/
│   └── database.js
└── server.js
```

## 3. 核心代码

### 用户模型 (User.js)
```javascript
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

// 密码加密
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// 密码验证
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
```

### 认证控制器 (authController.js)
```javascript
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// 注册
exports.register = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 检查用户是否已存在
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: '用户已存在' });
    }

    // 创建新用户
    user = new User({ email, password });
    await user.save();

    // 生成 JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
};

// 登录
exports.login = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    // 查找用户
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: '邮箱或密码错误' });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: '邮箱或密码错误' });
    }

    // 生成 JWT
    const payload = { user: { id: user.id } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ token });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
};

// 密码重置请求
exports.resetPasswordRequest = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email } = req.body;

  try {
    // 查找用户
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: '用户不存在' });
    }

    // 生成重置令牌
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1小时
    await user.save();

    // 发送重置邮件
    const transporter = nodemailer.createTransporter({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: '密码重置请求',
      text: `请点击以下链接重置密码：\n\n${process.env.FRONTEND_URL}/reset-password/${resetToken}\n\n如果您没有请求此操作，请忽略此邮件。`
    };

    await transporter.sendMail(mailOptions);
    res.json({ msg: '重置邮件已发送' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
};

// 密码重置
exports.resetPassword = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { token, password } = req.body;

  try {
    // 查找用户
    let user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ msg: '令牌无效或已过期' });
    }

    // 更新密码
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.json({ msg: '密码已重置' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
};
```

### 认证中间件 (authMiddleware.js)
```javascript
const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
  // 获取 token
  const token = req.header('x-auth-token');

  // 检查 token 是否存在
  if (!token) {
    return res.status(401).json({ msg: '无令牌，授权被拒绝' });
  }

  try {
    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded.user;
    next();
  } catch (err) {
    res.status(401).json({ msg: '令牌无效' });
  }
};
```

### 路由 (authRoutes.js)
```javascript
const express = require('express');
const router = express.Router();
const { check } = require('express-validator');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// 注册
router.post('/register', [
  check('email', '请提供有效的邮箱').isEmail(),
  check('password', '密码长度至少为 6 个字符').isLength({ min: 6 })
], authController.register);

// 登录
router.post('/login', [
  check('email', '请提供有效的邮箱').isEmail(),
  check('password', '密码不能为空').exists()
], authController.login);

// 密码重置请求
router.post('/reset-password-request', [
  check('email', '请提供有效的邮箱').isEmail()
], authController.resetPasswordRequest);

// 密码重置
router.post('/reset-password', [
  check('password', '密码长度至少为 6 个字符').isLength({ min: 6 })
], authController.resetPassword);

// 获取当前用户
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router;
```

## 4. 配置文件

### 数据库配置 (database.js)
```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('数据库连接成功');
  } catch (err) {
    console.error(err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
```

### 服务器配置 (server.js)
```javascript
const express = require('express');
const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');

// 加载环境变量
require('dotenv').config();

// 连接数据库
connectDB();

const app = express();

// 中间件
app.use(express.json());

// 路由
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`服务器运行在端口 ${PORT}`));
```

## 5. 安装和运行

### 安装依赖
```bash
npm install express mongoose bcrypt jsonwebtoken express-validator nodemailer dotenv
```

### 环境变量
创建 `.env` 文件：
```
MONGO_URI=mongodb://localhost:27017/auth-system
JWT_SECRET=your_jwt_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_email_password
FRONTEND_URL=http://localhost:3000
```

### 运行服务器
```bash
npm run server
```
```

### 示例 2：数据库优化
```bash
fullstack-dev-skills multi-backend --task "优化一个包含 1000 万条记录的用户数据库查询性能"
```

#### 预期输出
```
# 用户数据库查询性能优化方案

## 1. 现状分析
- 数据库类型：PostgreSQL
- 表结构：users 表，包含 1000 万条记录
- 当前查询：按用户名、邮箱、注册日期等字段查询
- 性能问题：查询响应时间长，特别是复杂条件查询

## 2. 优化方案

### 2.1 索引优化
```sql
-- 为常用查询字段创建索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_created_at ON users(created_at);

-- 为常用组合查询创建复合索引
CREATE INDEX idx_users_status_created_at ON users(status, created_at);
CREATE INDEX idx_users_country_city ON users(country, city);
```

### 2.2 查询优化
```sql
-- 优化前
SELECT * FROM users WHERE status = 'active' AND created_at > '2023-01-01' ORDER BY created_at DESC;

-- 优化后
SELECT id, username, email, status, created_at 
FROM users 
WHERE status = 'active' AND created_at > '2023-01-01' 
ORDER BY created_at DESC 
LIMIT 100 OFFSET 0;
```

### 2.3 分区表
```sql
-- 创建按时间分区的表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL
)
PARTITION BY RANGE (created_at);

-- 创建分区
CREATE TABLE users_2023 PARTITION OF users
  FOR VALUES FROM ('2023-01-01') TO ('2024-01-01');

CREATE TABLE users_2024 PARTITION OF users
  FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');
```

### 2.4 缓存策略
```javascript
// 使用 Redis 缓存热点数据
const redis = require('redis');
const client = redis.createClient();

// 查询用户信息，带缓存
async function getUserById(id) {
  // 先从缓存查询
  const cachedUser = await client.get(`user:${id}`);
  if (cachedUser) {
    return JSON.parse(cachedUser);
  }

  // 缓存未命中，从数据库查询
  const user = await db.query('SELECT * FROM users WHERE id = $1', [id]);
  
  // 存入缓存，设置过期时间
  if (user) {
    await client.set(`user:${id}`, JSON.stringify(user), 'EX', 3600);
  }

  return user;
}
```

### 2.5 数据库配置优化
```
# postgresql.conf 优化配置
shared_buffers = 4GB          # 内存的 25%
work_mem = 64MB               # 每个工作进程的内存
maintenance_work_mem = 1GB    # 维护操作的内存
random_page_cost = 1.1         # 随机读取成本（SSD 存储）
effective_cache_size = 12GB    # 缓存大小估计
```

## 3. 预期效果
- 简单查询响应时间：从 1-2 秒优化到 0.1 秒以内
- 复杂查询响应时间：从 5-10 秒优化到 0.5 秒以内
- 数据库负载：降低 50% 以上
- 系统吞吐量：提升 300% 以上

## 4. 实施步骤
1. **备份数据库**：确保数据安全
2. **创建索引**：按优先级顺序创建索引
3. **优化查询**：修改应用中的查询语句
4. **配置分区**：实施表分区策略
5. **部署缓存**：集成 Redis 缓存
6. **调整配置**：修改数据库配置参数
7. **性能测试**：验证优化效果
8. **监控维护**：建立长期性能监控
```

## 常见问题

### Q: multi-backend 命令与普通后端开发命令有什么区别？
A: `multi-backend` 命令通过协调多个后端服务和模型来完成任务，可以处理更复杂的后端开发场景，提供更全面、更深入的解决方案。

### Q: 如何选择适合的后端服务组合？
A: 系统会根据任务类型自动推荐合适的后端服务组合。对于数据密集型任务，建议包含高性能数据库服务；对于计算密集型任务，建议包含计算优化的服务。

### Q: 任务描述应该多详细？
A: 任务描述越详细，优化结果越准确。建议包含任务目标、具体要求、约束条件、预期成果等信息。

### Q: 如何处理生成的代码不符合预期的情况？
A: 可以尝试以下方法：
1. 提供更详细的任务描述
2. 指定更适合的后端服务和模型
3. 调整任务的范围和目标
4. 多次运行命令，比较不同的结果
