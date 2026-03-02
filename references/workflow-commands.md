# 工作流程命令参考

> Reference for: fullstack-dev-skills
> Load when: 功能开发、Bug 修复、代码审查、遗留代码分析

## 功能开发工作流

### 流程图

```
需求分析 → 架构设计 → 实现 → 测试 → 部署
    ↓          ↓        ↓      ↓      ↓
 Feature   Architecture Code  Test   DevOps
  Forge     Designer   Expert Master Engineer
```

### 步骤详解

#### 1. 需求分析 (Feature Forge)

```typescript
/**
 * 功能需求模板
 */
interface FeatureSpec {
  name: string
  description: string
  userStories: UserStory[]
  acceptanceCriteria: string[]
  dependencies: string[]
  priority: 'high' | 'medium' | 'low'
  estimatedEffort: string
}

interface UserStory {
  as: string
  iWant: string
  soThat: string
}
```

#### 2. 架构设计 (Architecture Designer)

```typescript
/**
 * 架构决策记录
 */
interface ArchitectureDecision {
  id: string
  title: string
  status: 'proposed' | 'accepted' | 'deprecated'
  context: string
  decision: string
  consequences: string[]
  alternatives: string[]
}
```

#### 3. 实现 (Framework Expert)

- 选择合适的技术栈
- 遵循框架最佳实践
- 编写可维护代码

#### 4. 测试 (Test Master)

```typescript
/**
 * 测试计划
 */
interface TestPlan {
  unitTests: TestSuite[]
  integrationTests: TestSuite[]
  e2eTests: TestSuite[]
  performanceTests?: TestSuite[]
  securityTests?: TestSuite[]
}
```

#### 5. 部署 (DevOps Engineer)

- CI/CD 流水线配置
- 环境变量管理
- 监控告警设置

## Bug 修复工作流

### 流程图

```
问题报告 → 问题定位 → 根因分析 → 修复 → 验证
    ↓          ↓          ↓        ↓      ↓
  Debug     Debug     Debug    Code   Test
  Report    Wizard    Wizard   Expert Master
```

### 步骤详解

#### 1. 问题报告

```typescript
/**
 * Bug 报告模板
 */
interface BugReport {
  id: string
  title: string
  description: string
  steps: string[]
  expectedBehavior: string
  actualBehavior: string
  environment: {
    os: string
    browser?: string
    version: string
  }
  logs?: string[]
  screenshots?: string[]
  priority: 'critical' | 'high' | 'medium' | 'low'
}
```

#### 2. 问题定位 (Debugging Wizard)

```typescript
/**
 * 调试检查清单
 */
const debugChecklist = [
  '确认问题可复现',
  '检查最近代码变更',
  '查看错误日志',
  '检查依赖版本',
  '验证环境配置',
  '检查网络请求',
  '分析内存使用',
  '检查并发问题'
]
```

#### 3. 根因分析

```typescript
/**
 * 根因分析模板
 */
interface RootCauseAnalysis {
  problem: string
  immediateCause: string
  rootCause: string
  contributingFactors: string[]
  timeline: TimelineEvent[]
  lessons: string[]
  preventions: string[]
}
```

#### 4. 修复实现

- 编写修复代码
- 添加回归测试
- 更新文档

#### 5. 验证

- 本地验证
- 测试环境验证
- 代码审查
- 部署到生产

## 代码审查工作流

### 流程图

```
提交代码 → 自动检查 → 人工审查 → 反馈 → 合并
    ↓          ↓          ↓        ↓      ↓
   Git       CI/CD    Reviewer  Author  Merge
```

### 审查清单

```typescript
/**
 * 代码审查检查项
 */
interface CodeReviewChecklist {
  functionality: {
    meetsRequirements: boolean
    edgeCasesHandled: boolean
    errorHandling: boolean
  }
  codeQuality: {
    readable: boolean
    maintainable: boolean
    followsConventions: boolean
    noCodeDuplication: boolean
  }
  performance: {
    noMemoryLeaks: boolean
    efficientAlgorithms: boolean
    properCaching: boolean
  }
  security: {
    noSqlInjection: boolean
    noXss: boolean
    properAuth: boolean
    sensitiveDataProtected: boolean
  }
  testing: {
    unitTestsPresent: boolean
    testsPassing: boolean
    goodCoverage: boolean
  }
}
```

## 遗留代码分析工作流

### 流程图

```
代码扫描 → 架构分析 → 文档生成 → 重构建议 → 现代化
    ↓          ↓          ↓          ↓         ↓
  Spec      Arch      Doc      Legacy    Modern
  Miner    Designer  Generator Modernizer  Stack
```

### 分析步骤

#### 1. 代码扫描 (Spec Miner)

```typescript
/**
 * 代码分析结果
 */
interface CodeAnalysis {
  structure: {
    files: number
    linesOfCode: number
    dependencies: Dependency[]
  }
  patterns: {
    architectural: string[]
    design: string[]
    antiPatterns: string[]
  }
  quality: {
    complexity: number
    coverage: number
    technicalDebt: string
  }
  risks: Risk[]
}
```

#### 2. 架构分析

- 识别核心模块
- 分析依赖关系
- 评估技术债务

#### 3. 文档生成

- API 文档
- 架构图
- 数据流图

#### 4. 重构建议

```typescript
/**
 * 重构建议
 */
interface RefactoringSuggestion {
  area: string
  current: string
  proposed: string
  benefits: string[]
  risks: string[]
  effort: 'low' | 'medium' | 'high'
  priority: number
}
```

## Quick Reference

| 工作流 | 关键角色 | 主要产出 |
|--------|----------|----------|
| 功能开发 | Feature Forge → Architecture Designer → Test Master | 功能规格、代码、测试 |
| Bug 修复 | Debugging Wizard → Code Expert → Test Master | 根因分析、修复、回归测试 |
| 代码审查 | Code Reviewer → Security Reviewer | 审查报告、改进建议 |
| 遗留分析 | Spec Miner → Architecture Designer | 分析报告、重构计划 |
