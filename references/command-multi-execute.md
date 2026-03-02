# /multi-execute 多代理执行命令 (Multi-Execute Command)

## 概述

`/multi-execute` 命令用于并行执行多个代理任务，协调多个代理协同工作，提高大规模任务的执行效率。

## 命令语法

```
/multi-execute <任务配置> [选项]
```

### 参数说明

| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `<任务配置>` | string | 是 | 任务配置文件或内联配置 |
| `--parallel` | number | 否 | 并行执行数量 (默认: 4) |
| `--timeout` | number | 否 | 单任务超时时间 (毫秒) |
| `--retry` | number | 否 | 失败重试次数 |
| `--report` | string | 否 | 报告输出路径 |

## 使用示例

### 基础用法
```
/multi-execute tasks.json
```

### 指定并行数
```
/multi-execute tasks.json --parallel 8
```

### 带超时和重试
```
/multi-execute tasks.json --timeout 60000 --retry 3
```

### 内联配置
```
/multi-execute '[
  {"agent": "code-reviewer", "target": "src/"},
  {"agent": "security-reviewer", "target": "src/"}
]'
```

## 任务配置格式

### 配置文件结构
```json
{
  "name": "代码质量检查",
  "version": "1.0",
  "tasks": [
    {
      "id": "task-001",
      "agent": "code-reviewer",
      "target": "src/",
      "params": {
        "rules": ["eslint", "prettier"],
        "severity": "error"
      },
      "dependencies": []
    },
    {
      "id": "task-002",
      "agent": "security-reviewer",
      "target": "src/",
      "params": {
        "standards": ["OWASP"],
        "level": "high"
      },
      "dependencies": []
    },
    {
      "id": "task-003",
      "agent": "tdd-guide",
      "target": "src/",
      "params": {
        "coverage": true
      },
      "dependencies": ["task-001", "task-002"]
    }
  ],
  "config": {
    "parallel": 4,
    "timeout": 300000,
    "retry": 2,
    "failFast": false
  }
}
```

### 任务定义字段

| 字段 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `id` | string | 是 | 任务唯一标识 |
| `agent` | string | 是 | 代理名称 |
| `target` | string | 是 | 目标文件或目录 |
| `params` | object | 否 | 代理参数 |
| `dependencies` | array | 否 | 依赖任务 ID 列表 |
| `priority` | number | 否 | 优先级 (1-10) |
| `timeout` | number | 否 | 任务超时时间 |

## 执行模式

### 1. 并行执行
```
┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐
│ Task 1  │  │ Task 2  │  │ Task 3  │  │ Task 4  │
│ (代理A) │  │ (代理B) │  │ (代理C) │  │ (代理D) │
└────┬────┘  └────┬────┘  └────┬────┘  └────┬────┘
     │            │            │            │
     └────────────┴────────────┴────────────┘
                        │
                        ▼
              ┌─────────────────┐
              │   结果聚合      │
              └─────────────────┘
```

### 2. 依赖执行
```
     ┌─────────┐
     │ Task 1  │
     └────┬────┘
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
┌─────────┐ ┌─────────┐
│ Task 2  │ │ Task 3  │
└────┬────┘ └────┬────┘
     │           │
     └─────┬─────┘
           │
           ▼
     ┌─────────┐
     │ Task 4  │
     └─────────┘
```

### 3. 混合执行
```
┌─────────┐     ┌─────────┐
│ Task 1  │     │ Task 2  │
└────┬────┘     └────┬────┘
     │               │
     └───────┬───────┘
             │
             ▼
       ┌─────────┐
       │ Task 3  │
       └────┬────┘
            │
      ┌─────┴─────┐
      │           │
      ▼           ▼
┌─────────┐ ┌─────────┐
│ Task 4  │ │ Task 5  │
└─────────┘ └─────────┘
```

## 输出格式

### 执行报告
```markdown
## 多代理执行报告

### 执行概览
- **任务名称**: 代码质量检查
- **开始时间**: 2024-01-15 10:00:00
- **结束时间**: 2024-01-15 10:05:32
- **总耗时**: 5m 32s
- **并行数**: 4

### 任务统计
| 状态 | 数量 |
|-----|------|
| ✅ 成功 | 4 |
| ❌ 失败 | 1 |
| ⏭️ 跳过 | 0 |
| 📊 总计 | 5 |

### 任务详情

#### ✅ task-001: code-reviewer
- **状态**: 成功
- **耗时**: 2m 15s
- **发现**: 12 个问题
- **输出**: reports/code-review.json

#### ❌ task-002: security-reviewer
- **状态**: 失败
- **耗时**: 1m 30s
- **错误**: 找不到目标目录
- **重试**: 2/2

#### ✅ task-003: tdd-guide
- **状态**: 成功
- **耗时**: 1m 47s
- **依赖**: task-001, task-002
- **覆盖率**: 87%

### 聚合结果
| 代理 | 问题数 | 严重 | 高 | 中 | 低 |
|-----|-------|------|-----|-----|-----|
| code-reviewer | 12 | 2 | 4 | 4 | 2 |
| security-reviewer | - | - | - | - | - |
| tdd-guide | 3 | 0 | 1 | 2 | 0 |
| **总计** | **15** | **2** | **5** | **6** | **2** |

### 执行时间线
```
10:00:00 │ Task 1 开始
10:00:00 │ Task 2 开始
10:00:05 │ Task 2 失败 (重试 1)
10:00:10 │ Task 2 失败 (重试 2)
10:00:15 │ Task 2 最终失败
10:02:15 │ Task 1 完成
10:02:15 │ Task 3 开始 (依赖满足)
10:04:02 │ Task 3 完成
```
```

## 代理协调

### 结果聚合
```javascript
// 聚合配置
{
  "aggregation": {
    "strategy": "merge",
    "deduplication": true,
    "priority": "severity",
    "output": {
      "format": "json",
      "file": "aggregated-report.json"
    }
  }
}
```

### 冲突解决
```javascript
// 冲突解决策略
{
  "conflictResolution": {
    "strategy": "priority",
    "rules": [
      {
        "type": "severity",
        "higherWins": true
      },
      {
        "type": "agent",
        "priority": ["security-reviewer", "code-reviewer"]
      }
    ]
  }
}
```

## 使用场景

### 1. 代码质量全面检查
```json
{
  "name": "全面代码检查",
  "tasks": [
    {"agent": "code-reviewer", "target": "src/"},
    {"agent": "security-reviewer", "target": "src/"},
    {"agent": "tdd-guide", "target": "tests/"}
  ]
}
```

### 2. 多模块并行处理
```json
{
  "name": "多模块检查",
  "tasks": [
    {"agent": "code-reviewer", "target": "packages/core/"},
    {"agent": "code-reviewer", "target": "packages/api/"},
    {"agent": "code-reviewer", "target": "packages/web/"}
  ]
}
```

### 3. CI/CD 集成
```json
{
  "name": "CI 检查",
  "tasks": [
    {"agent": "code-reviewer", "target": "src/"},
    {"agent": "security-reviewer", "target": "src/"},
    {"agent": "build-resolver", "target": "."}
  ],
  "config": {
    "failFast": true,
    "report": "ci-report.json"
  }
}
```

## 最佳实践

### 1. 任务设计
- 任务粒度适中
- 明确依赖关系
- 避免循环依赖

### 2. 并行控制
- 根据资源调整并行数
- 考虑 I/O 和 CPU 密集型任务
- 监控系统资源使用

### 3. 错误处理
- 设置合理的重试次数
- 使用 failFast 控制失败行为
- 记录详细错误信息

### 4. 结果处理
- 聚合相似问题
- 按严重程度排序
- 生成可操作的报告

## 相关命令

- `/multi-plan` - 多任务并行规划
- `/sessions` - 会话管理
- `/verify` - 验证确认

## 相关参考

- [命令系统概述](./commands-overview.md)
- [代理系统概述](./agents-overview.md)
- [会话管理命令](./command-sessions.md)
