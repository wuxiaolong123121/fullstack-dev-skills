# Feature Forge 参考

> Reference for: fullstack-dev-skills
> Load when: 需求收集、规格编写、验收标准、用户故事

## 需求收集

### 用户故事模板

```typescript
/**
 * 用户故事
 * @description 描述用户需求的标准化格式
 */
interface UserStory {
  id: string
  as: string           // 作为...
  iWant: string        // 我想要...
  soThat: string       // 以便...
  acceptanceCriteria: AcceptanceCriterion[]
  priority: 'must' | 'should' | 'could' | 'wont'
  storyPoints: number
  dependencies: string[]
}

/**
 * 验收标准
 */
interface AcceptanceCriterion {
  given: string        // 给定...
  when: string         // 当...
  then: string         // 那么...
}

/**
 * 创建用户故事
 * @param description 用户故事描述
 * @returns 格式化的用户故事
 */
function createUserStory(description: {
  as: string
  iWant: string
  soThat: string
}): UserStory {
  return {
    id: generateId(),
    ...description,
    acceptanceCriteria: [],
    priority: 'should',
    storyPoints: 0,
    dependencies: []
  }
}
```

### 需求分类

```typescript
/**
 * 需求分类
 */
type RequirementCategory = 
  | 'functional'       // 功能需求
  | 'non-functional'   // 非功能需求
  | 'technical'        // 技术需求
  | 'constraint'       // 约束条件
  | 'integration'      // 集成需求

/**
 * 功能需求
 */
interface FunctionalRequirement {
  id: string
  category: 'functional'
  name: string
  description: string
  priority: 'P0' | 'P1' | 'P2' | 'P3'
  source: string
  status: 'draft' | 'reviewed' | 'approved' | 'implemented'
}

/**
 * 非功能需求
 */
interface NonFunctionalRequirement {
  id: string
  category: 'non-functional'
  type: 'performance' | 'security' | 'usability' | 'reliability' | 'scalability'
  metric: string
  target: string
  measurement: string
}
```

## 规格编写

### 功能规格模板

```typescript
/**
 * 功能规格文档
 */
interface FeatureSpecification {
  metadata: {
    id: string
    title: string
    version: string
    author: string
    status: 'draft' | 'review' | 'approved'
    created: Date
    updated: Date
  }
  overview: {
    problem: string
    solution: string
    goals: string[]
    nonGoals: string[]
  }
  requirements: {
    functional: FunctionalRequirement[]
    nonFunctional: NonFunctionalRequirement[]
  }
  design: {
    wireframes: string[]
    flows: Flow[]
    api: ApiEndpoint[]
  }
  testing: {
    unitTests: string[]
    integrationTests: string[]
    e2eTests: string[]
  }
}

/**
 * 用户流程
 */
interface Flow {
  name: string
  steps: FlowStep[]
  exceptions: Exception[]
}

interface FlowStep {
  order: number
  actor: string
  action: string
  system: string
  result: string
}
```

## 验收标准

### Gherkin 语法

```typescript
/**
 * Gherkin 场景
 * @description BDD 测试场景定义
 */
interface GherkinScenario {
  scenario: string
  given: string[]
  when: string[]
  then: string[]
  examples?: Record<string, any>[]
}

/**
 * 示例：登录场景
 */
const loginScenario: GherkinScenario = {
  scenario: '用户使用有效凭据登录',
  given: ['用户在登录页面', '用户已注册账号'],
  when: ['用户输入正确的邮箱', '用户输入正确的密码', '用户点击登录按钮'],
  then: ['用户被重定向到首页', '显示用户头像']
}
```

### 验收清单

```typescript
/**
 * 验收清单
 */
interface AcceptanceChecklist {
  featureId: string
  items: ChecklistItem[]
  approvedBy: string
  approvedAt: Date
}

interface ChecklistItem {
  id: string
  category: 'functional' | 'ui' | 'performance' | 'security' | 'accessibility'
  description: string
  verified: boolean
  verifiedBy: string
  notes: string
}

/**
 * 创建验收清单
 * @param featureId 功能 ID
 * @param requirements 需求列表
 * @returns 验收清单
 */
function createAcceptanceChecklist(
  featureId: string,
  requirements: FunctionalRequirement[]
): AcceptanceChecklist {
  const items = requirements.map(req => ({
    id: `check-${req.id}`,
    category: 'functional' as const,
    description: req.description,
    verified: false,
    verifiedBy: '',
    notes: ''
  }))
  
  return {
    featureId,
    items,
    approvedBy: '',
    approvedAt: new Date()
  }
}
```

## 优先级框架

### MoSCoW 方法

```typescript
/**
 * MoSCoW 优先级
 */
type MoSCoWPriority = 'must' | 'should' | 'could' | 'wont'

/**
 * 优先级评估
 */
interface PriorityAssessment {
  requirement: string
  businessValue: number    // 1-10
  effort: number           // 1-10
  risk: number             // 1-10
  dependency: number       // 1-10
  priority: MoSCoWPriority
  rationale: string
}

/**
 * 计算优先级
 * @param assessment 评估参数
 * @returns MoSCoW 优先级
 */
function calculatePriority(assessment: Omit<PriorityAssessment, 'priority'>): MoSCoWPriority {
  const score = 
    assessment.businessValue * 0.4 -
    assessment.effort * 0.2 -
    assessment.risk * 0.2 -
    assessment.dependency * 0.2
  
  if (score >= 6) return 'must'
  if (score >= 4) return 'should'
  if (score >= 2) return 'could'
  return 'wont'
}
```

## Quick Reference

| 工具 | 用途 | 格式 |
|------|------|------|
| 用户故事 | 需求描述 | 作为...我想要...以便... |
| 验收标准 | 验证条件 | Given/When/Then |
| MoSCoW | 优先级排序 | Must/Should/Could/Won't |
| 功能规格 | 详细文档 | 概述/需求/设计/测试 |
| 决策矩阵 | 方案评估 | 标准/权重/得分 |
