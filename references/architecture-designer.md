# 架构设计参考

> Reference for: fullstack-dev-skills
> Load when: ADR、架构决策、系统设计、权衡分析

## 架构决策记录 (ADR)

### ADR 模板

```markdown
# ADR-001: [决策标题]

## 状态
[提议中 | 已接受 | 已废弃 | 已替代]

## 背景
[描述导致此决策的情况和问题]

## 决策
[描述决策内容和理由]

## 后果
[描述应用此决策后的影响，包括正面和负面]

## 替代方案
[列出考虑过的其他方案及拒绝原因]
```

### ADR 示例

```typescript
/**
 * 架构决策记录
 * @description 用于追踪和记录重要架构决策
 */
interface ArchitectureDecisionRecord {
  id: string
  title: string
  status: 'proposed' | 'accepted' | 'deprecated' | 'superseded'
  date: Date
  authors: string[]
  context: string
  decision: string
  consequences: {
    positive: string[]
    negative: string[]
    neutral: string[]
  }
  alternatives: Alternative[]
}

interface Alternative {
  name: string
  description: string
  rejectedReason: string
}
```

## 架构模式

### 分层架构

```typescript
/**
 * 分层架构配置
 * @description 定义应用层次结构
 */
interface LayeredArchitecture {
  presentation: {
    components: string[]
    responsibilities: string[]
  }
  business: {
    services: string[]
    domain: string[]
  }
  data: {
    repositories: string[]
    models: string[]
  }
  infrastructure: {
    database: string
    messaging: string
    external: string[]
  }
}
```

### 微服务架构

```typescript
/**
 * 微服务定义
 * @description 单个微服务的配置
 */
interface Microservice {
  name: string
  version: string
  endpoints: Endpoint[]
  dependencies: Dependency[]
  database: DatabaseConfig
  events: {
    publishes: Event[]
    subscribes: Event[]
  }
}

/**
 * 服务间通信配置
 */
interface ServiceCommunication {
  sync: {
    protocol: 'REST' | 'gRPC' | 'GraphQL'
    timeout: number
    retryPolicy: RetryPolicy
  }
  async: {
    broker: 'kafka' | 'rabbitmq' | 'sqs'
    topics: string[]
  }
}
```

## 权衡分析

### 决策矩阵

```typescript
/**
 * 决策矩阵
 * @description 用于评估多个方案的决策工具
 */
interface DecisionMatrix {
  criteria: Criterion[]
  alternatives: AlternativeEvaluation[]
  weights: Record<string, number>
  result: string
}

interface Criterion {
  name: string
  description: string
  weight: number
  scale: '1-5' | '1-10'
}

interface AlternativeEvaluation {
  name: string
  scores: Record<string, number>
  weightedScore: number
  pros: string[]
  cons: string[]
}

/**
 * 计算加权得分
 * @param matrix 决策矩阵
 * @returns 排序后的方案列表
 */
function calculateWeightedScores(
  matrix: DecisionMatrix
): AlternativeEvaluation[] {
  return matrix.alternatives
    .map(alt => ({
      ...alt,
      weightedScore: Object.entries(alt.scores).reduce(
        (sum, [criterion, score]) => 
          sum + score * (matrix.weights[criterion] || 1),
        0
      )
    }))
    .sort((a, b) => b.weightedScore - a.weightedScore)
}
```

## 系统设计

### C4 模型

```typescript
/**
 * C4 模型 - 上下文层
 * @description 系统上下文图
 */
interface SystemContext {
  system: {
    name: string
    description: string
  }
  users: User[]
  externalSystems: ExternalSystem[]
}

/**
 * C4 模型 - 容器层
 * @description 容器图
 */
interface Container {
  name: string
  type: 'web-app' | 'mobile-app' | 'api' | 'database' | 'queue'
  technology: string
  description: string
  interfaces: Interface[]
}

/**
 * C4 模型 - 组件层
 * @description 组件图
 */
interface Component {
  name: string
  type: string
  technology: string
  description: string
  responsibilities: string[]
  dependencies: string[]
}
```

## Quick Reference

| 模式 | 用途 | 适用场景 |
|------|------|----------|
| 分层架构 | 简单清晰 | 传统企业应用 |
| 微服务 | 独立部署 | 大型复杂系统 |
| 事件驱动 | 解耦通信 | 实时数据处理 |
| CQRS | 读写分离 | 高并发查询 |
| 六边形架构 | 可测试性 | 领域驱动设计 |
| Saga | 分布式事务 | 微服务数据一致性 |
