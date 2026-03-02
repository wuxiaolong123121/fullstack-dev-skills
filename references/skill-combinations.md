# 技能组合模式参考

> Reference for: fullstack-dev-skills
> Load when: 多技能协作、工作流组合、复杂任务

## 组合模式概览

```
单一技能 → 技能组合 → 工作流程
    ↓          ↓          ↓
  专家      多专家      端到端
```

## 全功能开发组合

### 组合配置

```typescript
/**
 * 全功能开发组合
 * @description 从需求到部署的完整流程
 */
const fullFeatureDevelopment = {
  name: 'Full Feature Development',
  skills: [
    { role: 'Feature Forge', phase: 'discovery' },
    { role: 'Architecture Designer', phase: 'planning' },
    { role: 'Framework Expert', phase: 'implementation' },
    { role: 'Test Master', phase: 'testing' },
    { role: 'DevOps Engineer', phase: 'deployment' }
  ],
  flow: 'sequential',
  handoffs: [
    { from: 'Feature Forge', to: 'Architecture Designer', artifact: 'spec' },
    { from: 'Architecture Designer', to: 'Framework Expert', artifact: 'design' },
    { from: 'Framework Expert', to: 'Test Master', artifact: 'code' },
    { from: 'Test Master', to: 'DevOps Engineer', artifact: 'artifacts' }
  ]
}
```

### 使用场景

- 新功能开发
- 大型项目启动
- 完整特性实现

### 示例触发

```
"帮我开发一个用户认证系统，从需求分析到部署上线"
→ 激活: Feature Forge → Architecture Designer → NestJS Expert → Test Master → DevOps Engineer
```

## 安全聚焦开发组合

### 组合配置

```typescript
/**
 * 安全聚焦开发组合
 * @description 安全优先的开发流程
 */
const securityFocusedDevelopment = {
  name: 'Security-Focused Development',
  skills: [
    { role: 'Secure Code Guardian', phase: 'design' },
    { role: 'Framework Expert', phase: 'implementation' },
    { role: 'Security Reviewer', phase: 'review' },
    { role: 'Test Master', phase: 'testing' }
  ],
  flow: 'iterative',
  focus: 'security'
}
```

### 使用场景

- 认证授权系统
- 支付处理功能
- 敏感数据处理

### 示例触发

```
"实现一个安全的支付网关集成"
→ 激活: Secure Code Guardian → NestJS Expert → Security Reviewer → Test Master
```

## 性能优化组合

### 组合配置

```typescript
/**
 * 性能优化组合
 * @description 系统性能分析和优化
 */
const performanceOptimization = {
  name: 'Performance Optimization',
  skills: [
    { role: 'Architecture Designer', phase: 'analysis' },
    { role: 'Monitoring Expert', phase: 'profiling' },
    { role: 'Framework Expert', phase: 'optimization' },
    { role: 'Database Optimizer', phase: 'database' },
    { role: 'Test Master', phase: 'benchmark' }
  ],
  flow: 'iterative',
  focus: 'performance'
}
```

### 使用场景

- 响应时间优化
- 吞吐量提升
- 资源使用优化

### 示例触发

```
"优化这个 API 的响应时间，目前平均 2 秒"
→ 激活: Architecture Designer → Monitoring Expert → Node.js Expert → Database Optimizer → Test Master
```

## 文档冲刺组合

### 组合配置

```typescript
/**
 * 文档冲刺组合
 * @description 快速完善项目文档
 */
const documentationSprint = {
  name: 'Documentation Sprint',
  skills: [
    { role: 'Spec Miner', phase: 'analysis' },
    { role: 'Architecture Designer', phase: 'architecture' },
    { role: 'Code Documenter', phase: 'documentation' }
  ],
  flow: 'parallel',
  focus: 'documentation'
}
```

### 使用场景

- 遗留项目文档化
- API 文档生成
- 架构文档更新

### 示例触发

```
"为这个遗留项目生成完整的技术文档"
→ 激活: Spec Miner → Architecture Designer → Code Documenter
```

## 云原生开发组合

### 组合配置

```typescript
/**
 * 云原生开发组合
 * @description 云原生应用开发
 */
const cloudNativeDevelopment = {
  name: 'Cloud-Native Development',
  skills: [
    { role: 'Kubernetes Specialist', phase: 'orchestration' },
    { role: 'Terraform Engineer', phase: 'infrastructure' },
    { role: 'Cloud Architect', phase: 'architecture' },
    { role: 'SRE Engineer', phase: 'reliability' },
    { role: 'Monitoring Expert', phase: 'observability' }
  ],
  flow: 'sequential',
  focus: 'cloud-native'
}
```

### 使用场景

- 微服务部署
- 容器化迁移
- 多云架构

### 示例触发

```
"设计并实现一个 Kubernetes 部署方案"
→ 激活: Kubernetes Specialist → Terraform Engineer → Cloud Architect → SRE Engineer → Monitoring Expert
```

## API 开发组合

### 组合配置

```typescript
/**
 * API 开发组合
 * @description API 设计和实现
 */
const apiDevelopment = {
  name: 'API Development',
  skills: [
    { role: 'API Designer', phase: 'design' },
    { role: 'GraphQL Architect', phase: 'graphql' },
    { role: 'WebSocket Engineer', phase: 'realtime' },
    { role: 'Microservices Architect', phase: 'architecture' }
  ],
  flow: 'selective',
  focus: 'api'
}
```

### 使用场景

- RESTful API 设计
- GraphQL 实现
- 实时通信

### 示例触发

```
"设计一个支持实时通知的 API 系统"
→ 激活: API Designer → WebSocket Engineer → Microservices Architect
```

## 决策验证组合

### 组合配置

```typescript
/**
 * 决策验证组合
 * @description 验证技术决策
 */
const decisionValidation = {
  name: 'Decision Validation',
  skills: [
    { role: 'Common Ground', phase: 'assumptions' },
    { role: 'The Fool', phase: 'challenge' },
    { role: 'Architecture Designer', phase: 'document' }
  ],
  flow: 'sequential',
  focus: 'validation'
}
```

### 使用场景

- 技术选型验证
- 架构决策评审
- 风险评估

### 示例触发

```
"验证我们选择 PostgreSQL 作为主数据库的决策"
→ 激活: Common Ground → The Fool → Architecture Designer
```

## Quick Reference

| 组合 | 技能链 | 适用场景 |
|------|--------|----------|
| 全功能开发 | Feature Forge → Architecture → Framework → Test → DevOps | 新功能开发 |
| 安全聚焦 | Secure Code → Framework → Security Reviewer → Test | 安全敏感功能 |
| 性能优化 | Architecture → Monitoring → Framework → Database → Test | 性能问题 |
| 文档冲刺 | Spec Miner → Architecture → Documenter | 文档完善 |
| 云原生 | K8s → Terraform → Cloud → SRE → Monitoring | 云部署 |
| API 开发 | API Designer → GraphQL/WebSocket → Microservices | API 设计 |
| 决策验证 | Common Ground → The Fool → Architecture | 技术决策 |
