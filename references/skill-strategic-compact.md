# 策略压缩模式 (Strategic Compact Mode)

## 概述

策略压缩模式是一种上下文管理技术，通过智能压缩和摘要化处理，在有限的上下文窗口中最大化有效信息密度，提高 AI 助手的响应质量和效率。

## 核心原则

### 1. 信息优先级
根据信息重要性进行分级，保留关键信息，压缩次要信息。

### 2. 渐进式压缩
根据上下文使用情况，逐步压缩较早的内容。

### 3. 结构化摘要
将代码和文档转换为结构化摘要，保留核心语义。

### 4. 动态调整
根据任务需求动态调整压缩策略。

## 压缩策略

### 信息优先级分级

| 级别 | 类型 | 处理方式 | 示例 |
|-----|------|---------|------|
| P0 | 核心逻辑 | 完整保留 | 主函数、关键算法 |
| P1 | 重要上下文 | 精简保留 | 接口定义、类型声明 |
| P2 | 辅助信息 | 摘要保留 | 注释、文档 |
| P3 | 历史记录 | 高度压缩 | 旧对话、已处理任务 |

### 压缩技术

#### 1. 代码摘要
```javascript
// 原始代码 (完整)
function calculateDiscount(price, customerType, membershipYears) {
  let discount = 0;
  
  if (customerType === 'premium') {
    discount = 0.2;
    if (membershipYears > 5) {
      discount += 0.1;
    }
  } else if (customerType === 'regular') {
    discount = 0.1;
    if (membershipYears > 2) {
      discount += 0.05;
    }
  }
  
  return price * (1 - discount);
}

// 压缩摘要
/**
 * calculateDiscount(price, customerType, membershipYears)
 * - 计算客户折扣价格
 * - premium: 20% + 10% (会员>5年)
 * - regular: 10% + 5% (会员>2年)
 * - 返回: 折后价格
 */
```

#### 2. 对话压缩
```markdown
# 原始对话 (完整)
用户: 我需要实现一个用户认证系统
助手: 好的，我来帮你设计...
用户: 需要支持邮箱和手机号登录
助手: 明白，我会添加...
用户: 还需要第三方登录
助手: 好的，我会集成...

# 压缩摘要
## 对话历史摘要
- 任务: 实现用户认证系统
- 需求: 邮箱/手机号登录 + 第三方登录
- 当前进度: 基础认证已完成
- 待处理: 第三方登录集成
```

#### 3. 文件结构压缩
```markdown
# 原始结构 (完整)
src/
├── auth/
│   ├── login.ts (150行)
│   ├── register.ts (200行)
│   ├── password.ts (100行)
│   └── session.ts (80行)
├── user/
│   ├── profile.ts (120行)
│   └── settings.ts (90行)
└── utils/
    ├── validate.ts (50行)
    └── crypto.ts (40行)

# 压缩摘要
## 项目结构摘要
src/
├── auth/ (530行) - 认证模块: login, register, password, session
├── user/ (210行) - 用户模块: profile, settings
└── utils/ (90行) - 工具模块: validate, crypto
```

## 压缩流程

```
┌─────────────────────────────────────────────────────┐
│                上下文压缩流程                       │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐                                    │
│  │ 监控上下文  │                                    │
│  │ 使用率      │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│         ▼                                           │
│  ┌─────────────┐                                    │
│  │ 检查阈值    │                                    │
│  │ (>80%?)     │                                    │
│  └──────┬──────┘                                    │
│         │                                           │
│    ┌────┴────┐                                      │
│    │         │                                      │
│    ▼         ▼                                      │
│ ┌───────┐ ┌───────┐                                 │
│ │ 是    │ │ 否    │                                 │
│ └───┬───┘ └───┬───┘                                 │
│     │         │                                     │
│     ▼         │                                     │
│ ┌───────┐     │                                     │
│ │ 分析  │     │                                     │
│ │ 内容  │     │                                     │
│ └───┬───┘     │                                     │
│     │         │                                     │
│     ▼         │                                     │
│ ┌───────┐     │                                     │
│ │ 分级  │     │                                     │
│ │ 优先  │     │                                     │
│ └───┬───┘     │                                     │
│     │         │                                     │
│     ▼         │                                     │
│ ┌───────┐     │                                     │
│ │ 应用  │     │                                     │
│ │ 压缩  │     │                                     │
│ └───┬───┘     │                                     │
│     │         │                                     │
│     ▼         │                                     │
│ ┌───────┐     │                                     │
│ │ 验证  │     │                                     │
│ │ 结果  │     │                                     │
│ └───┬───┘     │                                     │
│     │         │                                     │
│     └────┬────┘                                     │
│          │                                          │
│          ▼                                          │
│    ┌─────────────┐                                  │
│    │ 继续处理    │                                  │
│    └─────────────┘                                  │
│                                                     │
└─────────────────────────────────────────────────────┘
```

## 压缩配置

### 配置参数
```json
{
  "compression": {
    "enabled": true,
    "threshold": 0.8,
    "strategy": "progressive",
    "preservePatterns": [
      "function*main*",
      "class*Service*",
      "interface*Config*"
    ],
    "compressionLevels": {
      "code": {
        "keepSignatures": true,
        "keepTypes": true,
        "compressBody": "summary"
      },
      "conversation": {
        "keepRecent": 5,
        "compressOlder": "summary"
      },
      "files": {
        "keepStructure": true,
        "compressContent": "outline"
      }
    }
  }
}
```

### 压缩级别
```json
{
  "levels": {
    "minimal": {
      "threshold": 0.9,
      "preserveRatio": 0.8
    },
    "moderate": {
      "threshold": 0.8,
      "preserveRatio": 0.6
    },
    "aggressive": {
      "threshold": 0.7,
      "preserveRatio": 0.4
    }
  }
}
```

## 压缩效果示例

### 代码文件压缩

#### 压缩前
```typescript
// user.service.ts (完整 200 行)
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
    return user;
  }

  async create(createUserDto: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(createUserDto);
    return this.userRepository.save(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    await this.userRepository.update(id, updateUserDto);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const result = await this.userRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }
  }
}
```

#### 压缩后
```typescript
// user.service.ts (摘要)
@Injectable
class UserService {
  // 依赖: User Repository
  
  + findAll(): Promise<User[]>
  + findOne(id: number): Promise<User> | NotFoundException
  + create(createUserDto: CreateUserDto): Promise<User>
  + update(id: number, updateUserDto: UpdateUserDto): Promise<User>
  + remove(id: number): Promise<void> | NotFoundException
  
  // 关键逻辑: 标准 CRUD 操作，使用 TypeORM
}
```

### 对话历史压缩

#### 压缩前
```
[用户] 我需要实现一个购物车功能
[助手] 好的，我来帮你设计购物车功能。首先我们需要考虑...
[用户] 需要支持添加、删除、修改数量
[助手] 明白，我会实现这些基本功能。购物车数据结构...
[用户] 还需要支持优惠券
[助手] 好的，我会添加优惠券功能。优惠券验证逻辑...
[用户] 需要计算折扣后的价格
[助手] 我会实现价格计算功能。折扣计算规则...
... (更多对话)
```

#### 压缩后
```
## 对话摘要: 购物车功能开发
- 需求: 购物车 CRUD + 优惠券 + 折扣计算
- 已完成: 基础购物车功能
- 进行中: 优惠券集成
- 关键决策: 使用 Redis 存储购物车数据
```

## 最佳实践

### 1. 压缩时机
- 上下文使用率超过阈值时
- 切换任务上下文时
- 长时间会话中定期压缩

### 2. 保留策略
- 保留当前任务相关的完整上下文
- 保留关键决策和设计文档
- 保留错误处理和边界条件

### 3. 压缩验证
- 确保压缩后语义完整
- 验证关键信息可检索
- 测试压缩后的响应质量

### 4. 恢复机制
- 支持从压缩状态恢复详情
- 保留原始数据的引用
- 提供上下文扩展接口

## 相关参考

- [搜索优先模式](./skill-search-first.md)
- [代理系统概述](./agents-overview.md)
- [会话管理命令](./command-sessions.md)
