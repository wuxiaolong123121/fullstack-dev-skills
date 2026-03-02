# /sessions 会话管理命令 (Sessions Command)

## 概述

`/sessions` 命令用于管理开发会话，支持会话创建、保存、恢复和列表查看，确保工作状态可持久化和可恢复。

## 命令语法

```
/sessions <操作> [选项]
```

### 操作类型

| 操作 | 描述 |
|-----|------|
| `list` | 列出所有会话 |
| `save` | 保存当前会话 |
| `restore` | 恢复指定会话 |
| `delete` | 删除指定会话 |
| `clear` | 清除所有会话 |
| `info` | 显示会话详情 |

### 参数说明

| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `--name` | string | 否 | 会话名称 |
| `--id` | string | 否 | 会话 ID |
| `--all` | flag | 否 | 操作所有会话 |
| `--force` | flag | 否 | 强制执行 |

## 使用示例

### 列出所有会话
```
/sessions list
```

### 保存当前会话
```
/sessions save --name "用户认证开发"
```

### 恢复会话
```
/sessions restore --id "sess_abc123"
```

### 删除会话
```
/sessions delete --id "sess_abc123"
```

### 清除所有会话
```
/sessions clear --all --force
```

## 会话数据结构

### 会话元数据
```json
{
  "id": "sess_abc123",
  "name": "用户认证开发",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T12:30:00Z",
  "status": "active",
  "metadata": {
    "branch": "feature/auth",
    "project": "my-app",
    "tasks": 5,
    "completedTasks": 3
  }
}
```

### 会话状态
```json
{
  "id": "sess_abc123",
  "state": {
    "workingDirectory": "/projects/my-app",
    "openFiles": [
      "src/auth/login.ts",
      "src/auth/register.ts",
      "tests/auth.test.ts"
    ],
    "currentTask": {
      "id": "task-003",
      "description": "实现 JWT 认证",
      "status": "in_progress"
    },
    "taskQueue": [
      {"id": "task-004", "description": "添加刷新令牌"},
      {"id": "task-005", "description": "编写集成测试"}
    ],
    "completedTasks": [
      {"id": "task-001", "description": "设计数据模型"},
      {"id": "task-002", "description": "实现注册接口"}
    ],
    "context": {
      "lastCommand": "/tdd 实现 JWT 认证",
      "recentSearches": ["JWT", "authentication"],
      "notes": "需要处理令牌过期逻辑"
    },
    "environment": {
      "nodeVersion": "18.17.0",
      "packageManager": "npm",
      "lastInstall": "2024-01-15T09:00:00Z"
    }
  }
}
```

## 输出格式

### 会话列表
```markdown
## 会话列表

### 活跃会话 (2)
| ID | 名称 | 创建时间 | 最后更新 | 任务进度 |
|----|------|---------|---------|---------|
| sess_abc123 | 用户认证开发 | 2024-01-15 10:00 | 2024-01-15 12:30 | 3/5 |
| sess_def456 | 购物车功能 | 2024-01-14 14:00 | 2024-01-14 18:00 | 5/5 ✅ |

### 已完成会话 (3)
| ID | 名称 | 完成时间 | 状态 |
|----|------|---------|------|
| sess_789xyz | 支付集成 | 2024-01-13 16:00 | 已完成 |
| sess_ghi012 | 用户配置 | 2024-01-12 11:00 | 已完成 |
| sess_jkl345 | 首页优化 | 2024-01-11 09:00 | 已完成 |

### 操作提示
- 恢复会话: /sessions restore --id <会话ID>
- 查看详情: /sessions info --id <会话ID>
- 删除会话: /sessions delete --id <会话ID>
```

### 会话详情
```markdown
## 会话详情: sess_abc123

### 基本信息
- **名称**: 用户认证开发
- **状态**: 活跃
- **创建时间**: 2024-01-15 10:00:00
- **最后更新**: 2024-01-15 12:30:00
- **工作目录**: /projects/my-app
- **分支**: feature/auth

### 任务进度
```
[████████████░░░░░░░░] 60% (3/5)
```

### 已完成任务
1. ✅ task-001: 设计数据模型
2. ✅ task-002: 实现注册接口
3. ✅ task-003: 实现登录接口

### 进行中任务
- 🔄 task-004: 实现 JWT 认证

### 待处理任务
- ⏳ task-005: 添加刷新令牌
- ⏳ task-006: 编写集成测试

### 打开的文件
- src/auth/login.ts
- src/auth/register.ts
- tests/auth.test.ts

### 备注
需要处理令牌过期逻辑

### 恢复命令
```
/sessions restore --id sess_abc123
```
```

### 保存确认
```markdown
## 会话已保存

### 保存信息
- **会话 ID**: sess_abc123
- **名称**: 用户认证开发
- **保存时间**: 2024-01-15 12:30:00

### 已保存内容
- [x] 工作目录状态
- [x] 打开的文件列表
- [x] 任务进度 (3/5)
- [x] 上下文信息
- [x] 环境配置

### 恢复方式
```
/sessions restore --id sess_abc123
```
```

## 会话存储

### 存储位置
```
~/.trae/sessions/
├── sess_abc123/
│   ├── metadata.json
│   ├── state.json
│   ├── context.json
│   └── backup/
│       └── 2024-01-15_12-30-00.json
├── sess_def456/
│   └── ...
└── index.json
```

### 自动保存配置
```json
{
  "autoSave": {
    "enabled": true,
    "interval": 300000,
    "onTaskComplete": true,
    "onFileChange": false,
    "maxBackups": 5
  }
}
```

## 会话恢复流程

```
┌─────────────────┐
│ 恢复会话请求    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 验证会话 ID     │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ 有效  │ │ 无效  │
└───┬───┘ └───┬───┘
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ 加载  │ │ 错误  │
│ 状态  │ │ 提示  │
└───┬───┘ └───────┘
    │
    ▼
┌─────────────────┐
│ 恢复工作目录    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 恢复打开文件    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 恢复任务状态    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 恢复上下文      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 显示恢复摘要    │
└─────────────────┘
```

## 使用场景

### 1. 切换工作上下文
```
# 保存当前工作
/sessions save --name "支付功能开发"

# 切换到另一个任务
/sessions restore --id sess_def456
```

### 2. 恢复中断的工作
```
# 列出最近的会话
/sessions list

# 恢复上次的工作
/sessions restore --id sess_abc123
```

### 3. 团队协作
```
# 导出会话
/sessions export --id sess_abc123 --output session.json

# 导入会话
/sessions import --file session.json
```

## 最佳实践

### 1. 会话命名
- 使用描述性名称
- 包含功能或任务标识
- 添加日期或版本信息

### 2. 定期保存
- 启用自动保存
- 重要节点手动保存
- 完成任务后保存

### 3. 会话管理
- 定期清理旧会话
- 归档完成的会话
- 保持会话列表整洁

### 4. 恢复验证
- 检查工作目录是否正确
- 确认文件状态
- 验证任务进度

## 相关命令

- `/checkpoint` - 创建检查点
- `/multi-execute` - 多代理执行
- `/plan` - 功能规划

## 相关参考

- [命令系统概述](./commands-overview.md)
- [规划命令](./command-plan.md)
