# 上下文工程参考

> Reference for: fullstack-dev-skills
> Load when: Common Ground、假设验证、上下文对齐

## Common Ground 概念

Common Ground 是一种上下文工程技术，用于显式化 Claude 对项目的隐式假设，确保 AI 和用户对项目上下文有共同理解。

## 假设验证流程

### 流程图

```
任务开始 → 假设提取 → 假设展示 → 用户确认 → 任务执行
    ↓          ↓          ↓          ↓          ↓
  User      Claude     Display    Validate    Execute
```

### 步骤详解

#### 1. 假设提取

```typescript
/**
 * 假设类型定义
 */
interface Assumption {
  id: string
  category: 'technology' | 'architecture' | 'environment' | 'constraint'
  description: string
  confidence: 'high' | 'medium' | 'low'
  source: 'explicit' | 'inferred' | 'default'
  impact: 'critical' | 'important' | 'minor'
}

/**
 * 假设类别
 */
type AssumptionCategory = {
  technology: [
    '编程语言版本',
    '框架版本',
    '数据库类型',
    '运行环境'
  ],
  architecture: [
    '项目结构',
    '设计模式',
    '依赖关系',
    '部署架构'
  ],
  environment: [
    '操作系统',
    'Node.js 版本',
    '包管理器',
    '构建工具'
  ],
  constraint: [
    '性能要求',
    '安全要求',
    '兼容性要求',
    '资源限制'
  ]
}
```

#### 2. 假设展示

```typescript
/**
 * 假设展示模板
 */
interface AssumptionReport {
  sessionId: string
  timestamp: Date
  task: string
  assumptions: Assumption[]
  questions: Question[]
  recommendations: string[]
}

/**
 * 生成假设报告
 * @param task 任务描述
 * @param context 项目上下文
 * @returns 假设报告
 */
function generateAssumptionReport(
  task: string, 
  context: ProjectContext
): AssumptionReport {
  const assumptions = extractAssumptions(task, context)
  
  return {
    sessionId: generateId(),
    timestamp: new Date(),
    task,
    assumptions: assumptions.map(a => ({
      ...a,
      status: 'pending'
    })),
    questions: generateClarifyingQuestions(assumptions),
    recommendations: generateRecommendations(assumptions)
  }
}
```

#### 3. 用户确认

```typescript
/**
 * 假设验证结果
 */
interface AssumptionValidation {
  assumptionId: string
  status: 'confirmed' | 'corrected' | 'rejected'
  correction?: string
  notes?: string
}

/**
 * 处理用户反馈
 * @param validation 用户验证结果
 */
function processValidation(validation: AssumptionValidation): void {
  switch (validation.status) {
    case 'confirmed':
      // 假设正确，继续执行
      break
    case 'corrected':
      // 更新上下文
      updateContext(validation.correction)
      break
    case 'rejected':
      // 重新分析
      requestClarification(validation.assumptionId)
      break
  }
}
```

## 假设验证模板

### 技术栈假设

```markdown
## 技术栈假设

### 编程语言
- [ ] 语言: TypeScript / JavaScript / Python / Go
- [ ] 版本: ___

### 框架
- [ ] 前端框架: React / Vue / Angular / Next.js
- [ ] 后端框架: NestJS / FastAPI / Express
- [ ] 版本: ___

### 数据库
- [ ] 类型: PostgreSQL / MySQL / MongoDB / Redis
- [ ] 版本: ___

### 运行环境
- [ ] Node.js 版本: ___
- [ ] 包管理器: npm / yarn / pnpm
```

### 架构假设

```markdown
## 架构假设

### 项目结构
- [ ] 模块化: monorepo / multi-repo
- [ ] 目录结构: src/ 或自定义

### API 设计
- [ ] 风格: REST / GraphQL / gRPC
- [ ] 认证: JWT / OAuth2 / Session

### 部署架构
- [ ] 容器化: Docker / Kubernetes
- [ ] 云平台: AWS / Azure / GCP
```

### 约束假设

```markdown
## 约束假设

### 性能要求
- [ ] 响应时间: < 100ms / < 500ms / < 1s
- [ ] 并发用户: ___

### 安全要求
- [ ] 认证级别: 基本 / 双因素 / OAuth2
- [ ] 数据加密: 传输 / 存储 / 两者

### 兼容性要求
- [ ] 浏览器支持: 现代 / IE11+
- [ ] 移动端: 响应式 / 原生应用
```

## The Fool 角色

### 角色定义

The Fool 是一个挑战者角色，用于对决策进行压力测试，提供结构化的批判性思维。

### 挑战模式

```typescript
/**
 * The Fool 挑战模式
 */
type ChallengeMode = 
  | 'devil_advocate'    // 魔鬼代言人
  | 'what_if'          // 假设场景
  | 'worst_case'       // 最坏情况
  | 'first_principles' // 第一性原理
  | 'outsider'         // 局外人视角

/**
 * 挑战结果
 */
interface ChallengeResult {
  mode: ChallengeMode
  originalDecision: string
  challenge: string
  weaknesses: string[]
  alternatives: string[]
  refinedDecision?: string
}
```

### 使用示例

```typescript
/**
 * 执行决策挑战
 * @param decision 待挑战的决策
 * @param mode 挑战模式
 */
function challengeDecision(
  decision: string, 
  mode: ChallengeMode
): ChallengeResult {
  switch (mode) {
    case 'devil_advocate':
      return {
        mode,
        originalDecision: decision,
        challenge: '为什么这个决策是错误的？',
        weaknesses: identifyWeaknesses(decision),
        alternatives: generateAlternatives(decision)
      }
    case 'what_if':
      return {
        mode,
        originalDecision: decision,
        challenge: '如果关键假设不成立会怎样？',
        weaknesses: testAssumptions(decision),
        alternatives: planForFailure(decision)
      }
    case 'worst_case':
      return {
        mode,
        originalDecision: decision,
        challenge: '最坏的情况是什么？',
        weaknesses: identifyRisks(decision),
        alternatives: createContingencyPlans(decision)
      }
    default:
      return defaultChallenge(decision)
  }
}
```

## Quick Reference

| 组件 | 用途 | 输出 |
|------|------|------|
| Common Ground | 假设提取 | 假设列表 |
| 假设验证 | 用户确认 | 验证结果 |
| The Fool | 决策挑战 | 挑战报告 |
| Architecture Designer | 决策文档 | ADR |

## 最佳实践

1. **任务开始前** - 先运行 Common Ground 提取假设
2. **关键决策时** - 使用 The Fool 进行压力测试
3. **假设变化时** - 及时更新上下文
4. **定期回顾** - 验证假设是否仍然有效
