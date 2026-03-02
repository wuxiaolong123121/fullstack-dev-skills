# Prompt Engineer 参考

> Reference for: fullstack-dev-skills
> Load when: 提示设计、CoT、Few-shot、评估

## 提示设计原则

### 基础结构

```typescript
/**
 * 提示模板
 * @description 结构化提示定义
 */
interface PromptTemplate {
  system: string        // 系统指令
  context: string       // 上下文信息
  instruction: string   // 具体任务
  output: {
    format: string      // 输出格式
    example: string     // 输出示例
  }
  constraints: string[] // 约束条件
}

/**
 * 创建提示
 * @param template 提示模板
 * @returns 格式化的提示字符串
 */
function createPrompt(template: PromptTemplate): string {
  return `
## System
${template.system}

## Context
${template.context}

## Instruction
${template.instruction}

## Output Format
${template.output.format}

## Example
${template.output.example}

## Constraints
${template.constraints.map(c => `- ${c}`).join('\n')}
`
}
```

## Chain-of-Thought (CoT)

### 思维链提示

```typescript
/**
 * CoT 提示配置
 */
interface CoTConfig {
  problem: string
  steps: string[]
  reasoning: boolean
  selfConsistency: boolean
}

/**
 * 创建 CoT 提示
 * @param config CoT 配置
 * @returns 思维链提示
 */
function createCoTPrompt(config: CoTConfig): string {
  return `
请逐步思考并解决以下问题。

问题：${config.problem}

请按照以下步骤进行：
${config.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}

要求：
- 每一步都要展示你的推理过程
- 解释为什么做出这个选择
- 最后给出明确的答案

让我们一步步思考：
`
}
```

### Zero-shot CoT

```typescript
/**
 * Zero-shot CoT 提示
 * @param problem 问题描述
 * @returns 提示字符串
 */
function zeroShotCoT(problem: string): string {
  return `
问题：${problem}

让我们一步步思考这个问题。
`
}
```

## Few-shot Learning

### 示例设计

```typescript
/**
 * Few-shot 示例
 */
interface FewShotExample {
  input: string
  output: string
  explanation?: string
}

/**
 * Few-shot 配置
 */
interface FewShotConfig {
  task: string
  examples: FewShotExample[]
  query: string
}

/**
 * 创建 Few-shot 提示
 * @param config Few-shot 配置
 * @returns 提示字符串
 */
function createFewShotPrompt(config: FewShotConfig): string {
  const exampleText = config.examples
    .map((ex, i) => `
示例 ${i + 1}：
输入：${ex.input}
输出：${ex.output}
${ex.explanation ? `解释：${ex.explanation}` : ''}
`)
    .join('\n')
  
  return `
任务：${config.task}

${exampleText}

现在请处理：
输入：${config.query}
输出：
`
}
```

### 示例选择策略

```typescript
/**
 * 示例选择策略
 */
type SelectionStrategy = 
  | 'random'           // 随机选择
  | 'similarity'       // 相似度选择
  | 'diversity'        // 多样性选择
  | 'curriculum'       // 课程学习

/**
 * 选择示例
 * @param examples 候选示例
 * @param query 查询
 * @param strategy 选择策略
 * @param k 选择数量
 * @returns 选中的示例
 */
function selectExamples(
  examples: FewShotExample[],
  query: string,
  strategy: SelectionStrategy,
  k: number
): FewShotExample[] {
  switch (strategy) {
    case 'random':
      return shuffle(examples).slice(0, k)
    case 'similarity':
      return findBySimilarity(examples, query, k)
    case 'diversity':
      return findByDiversity(examples, k)
    case 'curriculum':
      return findByDifficulty(examples, k)
    default:
      return examples.slice(0, k)
  }
}
```

## 提示评估

### 评估指标

```typescript
/**
 * 提示评估结果
 */
interface PromptEvaluation {
  promptId: string
  metrics: {
    accuracy: number
    consistency: number
    latency: number
    tokenUsage: number
  }
  testCases: TestCaseResult[]
  recommendations: string[]
}

interface TestCaseResult {
  input: string
  expected: string
  actual: string
  passed: boolean
  score: number
}

/**
 * 评估提示
 * @param prompt 提示字符串
 * @param testCases 测试用例
 * @returns 评估结果
 */
async function evaluatePrompt(
  prompt: string,
  testCases: Array<{ input: string; expected: string }>
): Promise<PromptEvaluation> {
  const results = await Promise.all(
    testCases.map(async (tc) => {
      const actual = await executePrompt(prompt, tc.input)
      const score = calculateSimilarity(tc.expected, actual)
      return {
        input: tc.input,
        expected: tc.expected,
        actual,
        passed: score > 0.8,
        score
      }
    })
  )
  
  return {
    promptId: generateId(),
    metrics: {
      accuracy: results.filter(r => r.passed).length / results.length,
      consistency: calculateConsistency(results),
      latency: 0,
      tokenUsage: countTokens(prompt)
    },
    testCases: results,
    recommendations: generateRecommendations(results)
  }
}
```

## 高级技术

### Self-Consistency

```typescript
/**
 * Self-Consistency 配置
 */
interface SelfConsistencyConfig {
  prompt: string
  numSamples: number
  temperature: number
  aggregation: 'vote' | 'average'
}

/**
 * 执行 Self-Consistency
 * @param config 配置
 * @returns 最终答案
 */
async function selfConsistency(
  config: SelfConsistencyConfig
): Promise<string> {
  const samples = await Promise.all(
    Array(config.numSamples).fill(null).map(() =>
      executePrompt(config.prompt, '', config.temperature)
    )
  )
  
  if (config.aggregation === 'vote') {
    return majorityVote(samples)
  } else {
    return averageResults(samples)
  }
}
```

### Tree-of-Thought

```typescript
/**
 * 思维树节点
 */
interface ThoughtNode {
  id: string
  thought: string
  score: number
  children: ThoughtNode[]
}

/**
 * Tree-of-Thought 推理
 * @param problem 问题
 * @param maxDepth 最大深度
 * @param branchFactor 分支因子
 * @returns 最佳推理路径
 */
async function treeOfThought(
  problem: string,
  maxDepth: number,
  branchFactor: number
): Promise<string> {
  const root: ThoughtNode = {
    id: 'root',
    thought: problem,
    score: 1,
    children: []
  }
  
  await expandTree(root, maxDepth, branchFactor)
  
  return findBestPath(root)
}
```

## Quick Reference

| 技术 | 用途 | 适用场景 |
|------|------|----------|
| Zero-shot | 无示例推理 | 简单任务 |
| Few-shot | 示例学习 | 复杂模式 |
| CoT | 逐步推理 | 数学、逻辑 |
| Self-Consistency | 提高准确性 | 高可靠性需求 |
| Tree-of-Thought | 探索推理 | 复杂决策 |
| ReAct | 工具调用 | 需要外部信息 |
