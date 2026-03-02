# 持续验证循环模式参考

持续验证循环（Continuous Verification Loop）是一种确保代码质量和功能正确性的系统化方法，通过检查点验证、持续验证和评分器机制实现自动化质量保障。

## When to Activate

- 实现需要多阶段验证的功能
- 构建自动化测试和验证流程
- 设计代码质量评分系统
- 创建持续集成验证管道

## Core Principles

### 1. 验证优先原则

每个阶段完成后立即验证，而非等到最后统一验证。

```typescript
/**
 * 验证优先的工作流程
 * @description 在每个关键步骤后立即执行验证
 */
interface VerificationStep<T> {
  execute: () => Promise<T>;
  verify: (result: T) => Promise<VerificationResult>;
  rollback?: () => Promise<void>;
}

/**
 * 执行带验证的步骤
 * @param step - 验证步骤配置
 * @returns 验证结果
 */
async function executeWithVerification<T>(
  step: VerificationStep<T>
): Promise<VerificationResult> {
  const result = await step.execute();
  const verification = await step.verify(result);
  
  if (!verification.passed && step.rollback) {
    await step.rollback();
  }
  
  return verification;
}
```

### 2. 渐进式验证

从简单到复杂，逐步增加验证深度。

```typescript
/**
 * 渐进式验证级别
 */
enum VerificationLevel {
  SYNTAX = 'syntax',
  SEMANTIC = 'semantic',
  INTEGRATION = 'integration',
  PERFORMANCE = 'performance',
}

/**
 * 渐进式验证器
 * @description 按级别逐步验证
 */
class ProgressiveVerifier {
  private levels: Map<VerificationLevel, Verifier> = new Map();
  
  /**
   * 注册验证器
   * @param level - 验证级别
   * @param verifier - 验证器实例
   */
  register(level: VerificationLevel, verifier: Verifier): void {
    this.levels.set(level, verifier);
  }
  
  /**
   * 执行渐进式验证
   * @param code - 待验证代码
   * @param maxLevel - 最大验证级别
   * @returns 验证结果集合
   */
  async verify(
    code: string, 
    maxLevel: VerificationLevel = VerificationLevel.PERFORMANCE
  ): Promise<VerificationResult[]> {
    const results: VerificationResult[] = [];
    const levelOrder = [
      VerificationLevel.SYNTAX,
      VerificationLevel.SEMANTIC,
      VerificationLevel.INTEGRATION,
      VerificationLevel.PERFORMANCE,
    ];
    
    for (const level of levelOrder) {
      if (levelOrder.indexOf(level) > levelOrder.indexOf(maxLevel)) {
        break;
      }
      
      const verifier = this.levels.get(level);
      if (verifier) {
        const result = await verifier.verify(code);
        results.push(result);
        
        if (!result.passed) {
          break;
        }
      }
    }
    
    return results;
  }
}
```

### 3. 快速失败原则

发现问题立即中断，避免无效的后续操作。

```typescript
/**
 * 快速失败验证管道
 * @description 任一验证失败立即停止
 */
class FailFastPipeline {
  private validators: Validator[] = [];
  
  /**
   * 添加验证器
   * @param validator - 验证器
   * @returns 管道实例（支持链式调用）
   */
  add(validator: Validator): this {
    this.validators.push(validator);
    return this;
  }
  
  /**
   * 执行验证管道
   * @param input - 输入数据
   * @returns 验证结果
   */
  async execute(input: unknown): Promise<PipelineResult> {
    for (const validator of this.validators) {
      const result = await validator.validate(input);
      
      if (!result.valid) {
        return {
          passed: false,
          failedAt: validator.name,
          errors: result.errors,
        };
      }
    }
    
    return { passed: true };
  }
}
```

## 检查点验证模式

### 基础检查点

```typescript
/**
 * 检查点定义
 */
interface Checkpoint {
  id: string;
  name: string;
  description: string;
  validate: (context: VerificationContext) => Promise<boolean>;
  onError?: (error: Error) => Promise<void>;
}

/**
 * 检查点验证器
 * @description 管理多个检查点的验证
 */
class CheckpointVerifier {
  private checkpoints: Map<string, Checkpoint> = new Map();
  
  /**
   * 注册检查点
   * @param checkpoint - 检查点配置
   */
  register(checkpoint: Checkpoint): void {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }
  
  /**
   * 执行检查点验证
   * @param checkpointIds - 检查点ID列表
   * @param context - 验证上下文
   * @returns 验证报告
   */
  async verify(
    checkpointIds: string[], 
    context: VerificationContext
  ): Promise<CheckpointReport> {
    const results: CheckpointResult[] = [];
    
    for (const id of checkpointIds) {
      const checkpoint = this.checkpoints.get(id);
      if (!checkpoint) {
        continue;
      }
      
      const startTime = Date.now();
      let passed = false;
      let error: Error | null = null;
      
      try {
        passed = await checkpoint.validate(context);
      } catch (e) {
        error = e as Error;
        passed = false;
        if (checkpoint.onError) {
          await checkpoint.onError(error);
        }
      }
      
      results.push({
        id,
        name: checkpoint.name,
        passed,
        duration: Date.now() - startTime,
        error: error?.message,
      });
    }
    
    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    };
  }
}
```

### 条件检查点

```typescript
/**
 * 条件检查点
 * @description 根据条件决定是否执行验证
 */
interface ConditionalCheckpoint extends Checkpoint {
  condition: (context: VerificationContext) => boolean;
}

/**
 * 条件检查点验证器
 */
class ConditionalCheckpointVerifier extends CheckpointVerifier {
  /**
   * 执行条件检查点验证
   * @param checkpoints - 条件检查点列表
   * @param context - 验证上下文
   * @returns 验证报告
   */
  async verifyConditional(
    checkpoints: ConditionalCheckpoint[],
    context: VerificationContext
  ): Promise<CheckpointReport> {
    const activeCheckpoints = checkpoints.filter(
      cp => cp.condition(context)
    );
    
    return this.verify(
      activeCheckpoints.map(cp => cp.id),
      context
    );
  }
}
```

### 依赖检查点

```typescript
/**
 * 依赖检查点
 * @description 具有依赖关系的检查点
 */
interface DependentCheckpoint extends Checkpoint {
  dependsOn: string[];
}

/**
 * 依赖检查点验证器
 */
class DependencyCheckpointVerifier {
  private checkpoints: Map<string, DependentCheckpoint> = new Map();
  private results: Map<string, boolean> = new Map();
  
  /**
   * 注册依赖检查点
   * @param checkpoint - 依赖检查点配置
   */
  register(checkpoint: DependentCheckpoint): void {
    this.checkpoints.set(checkpoint.id, checkpoint);
  }
  
  /**
   * 执行依赖检查点验证
   * @param context - 验证上下文
   * @returns 验证报告
   */
  async verify(context: VerificationContext): Promise<CheckpointReport> {
    const sorted = this.topologicalSort();
    const results: CheckpointResult[] = [];
    
    for (const id of sorted) {
      const checkpoint = this.checkpoints.get(id)!;
      
      const depsPassed = checkpoint.dependsOn.every(
        depId => this.results.get(depId) === true
      );
      
      if (!depsPassed) {
        results.push({
          id,
          name: checkpoint.name,
          passed: false,
          skipped: true,
          reason: '依赖检查点未通过',
        });
        continue;
      }
      
      const passed = await checkpoint.validate(context);
      this.results.set(id, passed);
      
      results.push({
        id,
        name: checkpoint.name,
        passed,
      });
    }
    
    return {
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    };
  }
  
  /**
   * 拓扑排序
   * @returns 排序后的检查点ID列表
   */
  private topologicalSort(): string[] {
    const visited = new Set<string>();
    const sorted: string[] = [];
    
    const visit = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      
      const checkpoint = this.checkpoints.get(id);
      if (checkpoint) {
        for (const dep of checkpoint.dependsOn) {
          visit(dep);
        }
      }
      
      sorted.push(id);
    };
    
    for (const id of this.checkpoints.keys()) {
      visit(id);
    }
    
    return sorted;
  }
}
```

## 持续验证模式

### 轮询验证

```typescript
/**
 * 轮询验证配置
 */
interface PollingConfig {
  interval: number;
  maxAttempts: number;
  timeout: number;
}

/**
 * 轮询验证器
 * @description 定期执行验证直到成功或超时
 */
class PollingVerifier {
  /**
   * 执行轮询验证
   * @param validator - 验证函数
   * @param config - 轮询配置
   * @returns 验证结果
   */
  async verify(
    validator: () => Promise<boolean>,
    config: PollingConfig
  ): Promise<PollingResult> {
    const startTime = Date.now();
    let attempts = 0;
    
    while (attempts < config.maxAttempts) {
      if (Date.now() - startTime > config.timeout) {
        return {
          success: false,
          reason: 'timeout',
          attempts,
          duration: Date.now() - startTime,
        };
      }
      
      try {
        const passed = await validator();
        if (passed) {
          return {
            success: true,
            attempts: attempts + 1,
            duration: Date.now() - startTime,
          };
        }
      } catch (error) {
        console.error(`验证尝试 ${attempts + 1} 失败:`, error);
      }
      
      attempts++;
      await this.sleep(config.interval);
    }
    
    return {
      success: false,
      reason: 'max_attempts_reached',
      attempts,
      duration: Date.now() - startTime,
    };
  }
  
  /**
   * 延迟函数
   * @param ms - 延迟毫秒数
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
```

### 事件驱动验证

```typescript
/**
 * 验证事件类型
 */
enum VerificationEvent {
  FILE_CHANGED = 'file_changed',
  TEST_COMPLETED = 'test_completed',
  BUILD_FINISHED = 'build_finished',
  DEPLOY_DONE = 'deploy_done',
}

/**
 * 事件监听器
 */
interface EventListener {
  event: VerificationEvent;
  handler: (payload: unknown) => Promise<VerificationResult>;
}

/**
 * 事件驱动验证器
 * @description 响应事件触发验证
 */
class EventDrivenVerifier {
  private listeners: Map<VerificationEvent, EventListener[]> = new Map();
  
  /**
   * 订阅事件
   * @param event - 事件类型
   * @param handler - 处理函数
   */
  subscribe(
    event: VerificationEvent, 
    handler: EventListener['handler']
  ): void {
    const existing = this.listeners.get(event) || [];
    existing.push({ event, handler });
    this.listeners.set(event, existing);
  }
  
  /**
   * 触发事件
   * @param event - 事件类型
   * @param payload - 事件数据
   * @returns 验证结果列表
   */
  async emit(
    event: VerificationEvent, 
    payload: unknown
  ): Promise<VerificationResult[]> {
    const listeners = this.listeners.get(event) || [];
    const results: VerificationResult[] = [];
    
    for (const listener of listeners) {
      try {
        const result = await listener.handler(payload);
        results.push(result);
      } catch (error) {
        results.push({
          passed: false,
          error: (error as Error).message,
        });
      }
    }
    
    return results;
  }
}
```

### 增量验证

```typescript
/**
 * 增量验证状态
 */
interface IncrementalState {
  lastVerified: Map<string, number>;
  checksums: Map<string, string>;
}

/**
 * 增量验证器
 * @description 仅验证变更部分
 */
class IncrementalVerifier {
  private state: IncrementalState = {
    lastVerified: new Map(),
    checksums: new Map(),
  };
  
  /**
   * 执行增量验证
   * @param items - 待验证项列表
   * @param verifier - 验证函数
   * @returns 验证结果
   */
  async verify(
    items: VerifiableItem[],
    verifier: (item: VerifiableItem) => Promise<boolean>
  ): Promise<IncrementalResult> {
    const changed: VerifiableItem[] = [];
    const unchanged: VerifiableItem[] = [];
    
    for (const item of items) {
      const checksum = this.computeChecksum(item);
      const lastChecksum = this.state.checksums.get(item.id);
      
      if (checksum !== lastChecksum) {
        changed.push(item);
      } else {
        unchanged.push(item);
      }
    }
    
    const results: Map<string, boolean> = new Map();
    
    for (const item of changed) {
      const passed = await verifier(item);
      results.set(item.id, passed);
      
      if (passed) {
        this.state.checksums.set(
          item.id, 
          this.computeChecksum(item)
        );
        this.state.lastVerified.set(item.id, Date.now());
      }
    }
    
    return {
      verified: changed.length,
      skipped: unchanged.length,
      results,
    };
  }
  
  /**
   * 计算校验和
   * @param item - 待验证项
   * @returns 校验和字符串
   */
  private computeChecksum(item: VerifiableItem): string {
    const content = JSON.stringify(item);
    let hash = 0;
    
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    return hash.toString(16);
  }
}
```

## 评分器类型

### 数值评分器

```typescript
/**
 * 数值评分器
 * @description 计算数值分数
 */
class NumericScorer {
  private weights: Map<string, number> = new Map();
  private maxScores: Map<string, number> = new Map();
  
  /**
   * 配置评分项
   * @param name - 评分项名称
   * @param weight - 权重
   * @param maxScore - 最高分
   */
  configure(name: string, weight: number, maxScore: number): void {
    this.weights.set(name, weight);
    this.maxScores.set(name, maxScore);
  }
  
  /**
   * 计算总分
   * @param scores - 各项得分
   * @returns 加权总分
   */
  score(scores: Map<string, number>): number {
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const [name, score] of scores) {
      const weight = this.weights.get(name) || 1;
      const maxScore = this.maxScores.get(name) || 100;
      const normalizedScore = score / maxScore;
      
      weightedSum += normalizedScore * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? (weightedSum / totalWeight) * 100 : 0;
  }
  
  /**
   * 获取评分等级
   * @param score - 分数
   * @returns 等级
   */
  getGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}
```

### 规则评分器

```typescript
/**
 * 评分规则
 */
interface ScoringRule {
  id: string;
  name: string;
  description: string;
  weight: number;
  evaluate: (context: VerificationContext) => Promise<RuleResult>;
}

/**
 * 规则结果
 */
interface RuleResult {
  passed: boolean;
  score: number;
  maxScore: number;
  details?: string;
}

/**
 * 规则评分器
 * @description 基于规则集评分
 */
class RuleScorer {
  private rules: Map<string, ScoringRule> = new Map();
  
  /**
   * 添加评分规则
   * @param rule - 评分规则
   */
  addRule(rule: ScoringRule): void {
    this.rules.set(rule.id, rule);
  }
  
  /**
   * 执行评分
   * @param context - 验证上下文
   * @returns 评分报告
   */
  async evaluate(context: VerificationContext): Promise<ScoringReport> {
    const results: RuleEvaluation[] = [];
    let totalScore = 0;
    let totalMaxScore = 0;
    
    for (const [id, rule] of this.rules) {
      const result = await rule.evaluate(context);
      
      results.push({
        ruleId: id,
        ruleName: rule.name,
        passed: result.passed,
        score: result.score,
        maxScore: result.maxScore,
        weight: rule.weight,
        details: result.details,
      });
      
      totalScore += result.score * rule.weight;
      totalMaxScore += result.maxScore * rule.weight;
    }
    
    const percentage = totalMaxScore > 0 
      ? (totalScore / totalMaxScore) * 100 
      : 0;
    
    return {
      totalScore,
      totalMaxScore,
      percentage,
      passed: percentage >= 60,
      results,
    };
  }
}
```

### 阈值评分器

```typescript
/**
 * 阈值配置
 */
interface Threshold {
  metric: string;
  warning: number;
  critical: number;
  unit: string;
}

/**
 * 阈值评分器
 * @description 基于阈值判断质量
 */
class ThresholdScorer {
  private thresholds: Map<string, Threshold> = new Map();
  
  /**
   * 设置阈值
   * @param threshold - 阈值配置
   */
  setThreshold(threshold: Threshold): void {
    this.thresholds.set(threshold.metric, threshold);
  }
  
  /**
   * 评估指标
   * @param metric - 指标名称
   * @param value - 指标值
   * @returns 评估结果
   */
  evaluate(metric: string, value: number): ThresholdResult {
    const threshold = this.thresholds.get(metric);
    
    if (!threshold) {
      return {
        metric,
        value,
        status: 'unknown',
        score: 0,
      };
    }
    
    let status: 'ok' | 'warning' | 'critical';
    let score: number;
    
    if (value >= threshold.critical) {
      status = 'critical';
      score = 0;
    } else if (value >= threshold.warning) {
      status = 'warning';
      const range = threshold.critical - threshold.warning;
      const position = value - threshold.warning;
      score = Math.max(0, 50 - (position / range) * 50);
    } else {
      status = 'ok';
      score = 100;
    }
    
    return {
      metric,
      value,
      status,
      score,
      threshold,
    };
  }
  
  /**
   * 批量评估
   * @param metrics - 指标键值对
   * @returns 综合评估结果
   */
  evaluateAll(metrics: Map<string, number>): ThresholdReport {
    const results: ThresholdResult[] = [];
    let totalScore = 0;
    
    for (const [metric, value] of metrics) {
      const result = this.evaluate(metric, value);
      results.push(result);
      totalScore += result.score;
    }
    
    return {
      averageScore: results.length > 0 ? totalScore / results.length : 0,
      criticalCount: results.filter(r => r.status === 'critical').length,
      warningCount: results.filter(r => r.status === 'warning').length,
      okCount: results.filter(r => r.status === 'ok').length,
      results,
    };
  }
}
```

## 验证流程图

### 基础验证流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      持续验证循环流程                              │
└─────────────────────────────────────────────────────────────────┘

                              ┌───────────┐
                              │   开始    │
                              └─────┬─────┘
                                    │
                                    ▼
                         ┌─────────────────────┐
                         │   初始化验证上下文   │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
            │ 语法检查    │ │ 语义检查    │ │ 结构检查    │
            │ Checkpoint 1│ │ Checkpoint 2│ │ Checkpoint 3│
            └──────┬──────┘ └──────┬──────┘ └──────┬──────┘
                   │               │               │
                   └───────────────┼───────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │   检查点验证结果    │
                         └──────────┬──────────┘
                                    │
                    ┌───────────────┴───────────────┐
                    │                               │
                    ▼                               ▼
            ┌─────────────┐                 ┌─────────────┐
            │   通过？    │─── 否 ─────────▶│  记录错误   │
            └──────┬──────┘                 └──────┬──────┘
                   │ 是                            │
                   ▼                               ▼
         ┌─────────────────┐              ┌─────────────────┐
         │  执行评分计算   │              │  生成修复建议   │
         └────────┬────────┘              └────────┬────────┘
                  │                                │
                  └────────────────┬───────────────┘
                                   │
                                   ▼
                         ┌─────────────────────┐
                         │   生成验证报告      │
                         └──────────┬──────────┘
                                    │
                                    ▼
                              ┌───────────┐
                              │   结束    │
                              └───────────┘
```

### 增量验证流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      增量验证流程                                │
└─────────────────────────────────────────────────────────────────┘

  ┌──────────┐     ┌──────────────┐     ┌──────────────┐
  │ 输入变更 │────▶│ 计算校验和   │────▶│ 对比历史状态 │
  └──────────┘     └──────────────┘     └──────┬───────┘
                                              │
                              ┌───────────────┴───────────────┐
                              │                               │
                              ▼                               ▼
                      ┌─────────────┐                 ┌─────────────┐
                      │  有变更？   │─── 否 ─────────▶│   跳过验证  │
                      └──────┬──────┘                 └─────────────┘
                             │ 是
                             ▼
                    ┌─────────────────┐
                    │  执行增量验证   │
                    └────────┬────────┘
                             │
                             ▼
                    ┌─────────────────┐
                    │  更新校验状态   │
                    └─────────────────┘
```

### 评分流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      评分计算流程                                │
└─────────────────────────────────────────────────────────────────┘

                    ┌───────────────────────┐
                    │    收集验证结果       │
                    └───────────┬───────────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
        ▼                       ▼                       ▼
┌───────────────┐       ┌───────────────┐       ┌───────────────┐
│ 数值评分器    │       │ 规则评分器    │       │ 阈值评分器    │
│ - 代码覆盖率  │       │ - 编码规范    │       │ - 性能指标    │
│ - 测试通过率  │       │ - 安全规则    │       │ - 资源使用    │
└───────┬───────┘       └───────┬───────┘       └───────┬───────┘
        │                       │                       │
        └───────────────────────┼───────────────────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    加权聚合计算       │
                    └───────────┬───────────┘
                                │
                                ▼
                    ┌───────────────────────┐
                    │    生成评分报告       │
                    │ - 总分 / 等级         │
                    │ - 各项明细            │
                    │ - 改进建议            │
                    └───────────────────────┘
```

## 评分器示例

### 代码质量评分器

```typescript
/**
 * 代码质量评分器
 * @description 综合评估代码质量
 */
class CodeQualityScorer {
  private numericScorer: NumericScorer;
  private ruleScorer: RuleScorer;
  private thresholdScorer: ThresholdScorer;
  
  constructor() {
    this.numericScorer = new NumericScorer();
    this.ruleScorer = new RuleScorer();
    this.thresholdScorer = new ThresholdScorer();
    
    this.initializeScorers();
  }
  
  /**
   * 初始化评分器配置
   */
  private initializeScorers(): void {
    this.numericScorer.configure('coverage', 0.3, 100);
    this.numericScorer.configure('complexity', 0.2, 100);
    this.numericScorer.configure('maintainability', 0.25, 100);
    this.numericScorer.configure('security', 0.25, 100);
    
    this.thresholdScorer.setThreshold({
      metric: 'cyclomatic_complexity',
      warning: 10,
      critical: 20,
      unit: '数值',
    });
    
    this.thresholdScorer.setThreshold({
      metric: 'lines_of_code',
      warning: 300,
      critical: 500,
      unit: '行',
    });
  }
  
  /**
   * 执行代码质量评分
   * @param code - 待评估代码
   * @returns 质量评分报告
   */
  async score(code: string): Promise<QualityReport> {
    const metrics = await this.collectMetrics(code);
    
    const numericScores = new Map<string, number>();
    numericScores.set('coverage', metrics.coverage);
    numericScores.set('complexity', 100 - metrics.avgComplexity * 5);
    numericScores.set('maintainability', metrics.maintainabilityIndex);
    numericScores.set('security', metrics.securityScore);
    
    const numericResult = this.numericScorer.score(numericScores);
    
    const thresholdMetrics = new Map<string, number>();
    thresholdMetrics.set('cyclomatic_complexity', metrics.maxComplexity);
    thresholdMetrics.set('lines_of_code', metrics.linesOfCode);
    
    const thresholdResult = this.thresholdScorer.evaluateAll(thresholdMetrics);
    
    const overallScore = numericResult * 0.7 + thresholdResult.averageScore * 0.3;
    
    return {
      overallScore,
      grade: this.numericScorer.getGrade(overallScore),
      numericBreakdown: numericScores,
      thresholdResults: thresholdResult,
      recommendations: this.generateRecommendations(metrics, overallScore),
    };
  }
  
  /**
   * 收集代码指标
   * @param code - 源代码
   * @returns 指标集合
   */
  private async collectMetrics(code: string): Promise<CodeMetrics> {
    return {
      coverage: 85,
      avgComplexity: 5,
      maxComplexity: 12,
      maintainabilityIndex: 75,
      securityScore: 90,
      linesOfCode: code.split('\n').length,
    };
  }
  
  /**
   * 生成改进建议
   * @param metrics - 代码指标
   * @param score - 总分
   * @returns 建议列表
   */
  private generateRecommendations(
    metrics: CodeMetrics, 
    score: number
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.coverage < 80) {
      recommendations.push('建议提高测试覆盖率至80%以上');
    }
    
    if (metrics.maxComplexity > 15) {
      recommendations.push('检测到高复杂度函数，建议拆分重构');
    }
    
    if (metrics.securityScore < 90) {
      recommendations.push('存在安全风险，请检查安全扫描报告');
    }
    
    if (score < 70) {
      recommendations.push('整体质量较低，建议进行全面代码审查');
    }
    
    return recommendations;
  }
}
```

### 测试验证评分器

```typescript
/**
 * 测试验证评分器
 * @description 评估测试质量和覆盖率
 */
class TestVerificationScorer {
  /**
   * 执行测试评分
   * @param testResults - 测试结果
   * @returns 测试评分报告
   */
  async score(testResults: TestResults): Promise<TestScoreReport> {
    const passRate = this.calculatePassRate(testResults);
    const coverageScore = this.calculateCoverageScore(testResults.coverage);
    const stabilityScore = this.calculateStabilityScore(testResults.history);
    const performanceScore = this.calculatePerformanceScore(testResults.duration);
    
    const weights = {
      passRate: 0.4,
      coverage: 0.3,
      stability: 0.15,
      performance: 0.15,
    };
    
    const totalScore = 
      passRate * weights.passRate +
      coverageScore * weights.coverage +
      stabilityScore * weights.stability +
      performanceScore * weights.performance;
    
    return {
      totalScore,
      breakdown: {
        passRate: { score: passRate, weight: weights.passRate },
        coverage: { score: coverageScore, weight: weights.coverage },
        stability: { score: stabilityScore, weight: weights.stability },
        performance: { score: performanceScore, weight: weights.performance },
      },
      status: this.determineStatus(totalScore),
      summary: this.generateSummary(testResults, totalScore),
    };
  }
  
  /**
   * 计算通过率得分
   * @param results - 测试结果
   * @returns 通过率得分（0-100）
   */
  private calculatePassRate(results: TestResults): number {
    if (results.total === 0) return 0;
    return (results.passed / results.total) * 100;
  }
  
  /**
   * 计算覆盖率得分
   * @param coverage - 覆盖率百分比
   * @returns 覆盖率得分（0-100）
   */
  private calculateCoverageScore(coverage: number): number {
    if (coverage >= 90) return 100;
    if (coverage >= 80) return 90;
    if (coverage >= 70) return 75;
    if (coverage >= 60) return 60;
    return coverage;
  }
  
  /**
   * 计算稳定性得分
   * @param history - 历史测试记录
   * @returns 稳定性得分（0-100）
   */
  private calculateStabilityScore(history: TestHistory[]): number {
    if (history.length === 0) return 100;
    
    const recentRuns = history.slice(-10);
    const passRates = recentRuns.map(run => 
      run.total > 0 ? run.passed / run.total : 0
    );
    
    const avgPassRate = passRates.reduce((a, b) => a + b, 0) / passRates.length;
    const variance = passRates.reduce(
      (sum, rate) => sum + Math.pow(rate - avgPassRate, 2), 
      0
    ) / passRates.length;
    
    const stability = Math.max(0, 100 - variance * 1000);
    return stability;
  }
  
  /**
   * 计算性能得分
   * @param duration - 测试耗时（毫秒）
   * @returns 性能得分（0-100）
   */
  private calculatePerformanceScore(duration: number): number {
    const seconds = duration / 1000;
    
    if (seconds <= 10) return 100;
    if (seconds <= 30) return 90;
    if (seconds <= 60) return 80;
    if (seconds <= 120) return 70;
    if (seconds <= 300) return 50;
    return 30;
  }
  
  /**
   * 确定测试状态
   * @param score - 总分
   * @returns 状态标识
   */
  private determineStatus(score: number): 'excellent' | 'good' | 'acceptable' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'acceptable';
    return 'poor';
  }
  
  /**
   * 生成测试摘要
   * @param results - 测试结果
   * @param score - 总分
   * @returns 摘要文本
   */
  private generateSummary(results: TestResults, score: number): string {
    const status = this.determineStatus(score);
    const statusText = {
      excellent: '优秀',
      good: '良好',
      acceptable: '合格',
      poor: '需改进',
    };
    
    return `测试质量评估：${statusText[status]}（${score.toFixed(1)}分）- ` +
           `通过 ${results.passed}/${results.total}，` +
           `覆盖率 ${results.coverage.toFixed(1)}%`;
  }
}
```

## Quick Reference: 验证模式对照表

| 模式 | 适用场景 | 优点 | 注意事项 |
|------|----------|------|----------|
| 检查点验证 | 多阶段流程 | 清晰的验证边界 | 需合理划分检查点 |
| 持续验证 | 长期运行系统 | 实时发现问题 | 注意性能开销 |
| 增量验证 | 大型代码库 | 高效节省资源 | 需维护状态 |
| 轮询验证 | 异步操作 | 简单可靠 | 避免过度轮询 |
| 事件驱动 | 复杂系统 | 解耦灵活 | 需管理订阅 |

## Anti-Patterns to Avoid

```typescript
/**
 * 反模式示例：过度验证
 * @description 避免对每个微小变更都执行完整验证
 */
// Bad: 每次按键都执行完整验证
document.addEventListener('input', async () => {
  await runFullVerification();
});

// Good: 使用防抖或增量验证
const debouncedVerify = debounce(runIncrementalVerification, 500);
document.addEventListener('input', debouncedVerify);

/**
 * 反模式示例：忽略验证结果
 * @description 验证失败必须有明确的处理流程
 */
// Bad: 验证失败后继续执行
async function deploy() {
  const result = await verify();
  console.log('验证结果:', result);
  await proceedWithDeployment();
}

// Good: 验证失败时中断流程
async function deploy() {
  const result = await verify();
  if (!result.passed) {
    throw new DeploymentError('验证失败', result.errors);
  }
  await proceedWithDeployment();
}

/**
 * 反模式示例：硬编码阈值
 * @description 阈值应该可配置
 */
// Bad: 硬编码阈值
if (complexity > 10) {
  reportWarning();
}

// Good: 可配置阈值
const config = await loadThresholdConfig();
if (complexity > config.complexity.warning) {
  reportWarning();
}
```

**Remember**: 持续验证循环的核心价值在于及早发现问题、持续保障质量。验证应该是自动化的、可重复的、可追溯的。评分器提供量化指标，帮助团队理解当前状态并持续改进。
