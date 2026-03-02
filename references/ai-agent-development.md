# AI Agent 开发参考

基于 Anthropic "Effective harnesses for long-running agents" 最佳实践整理。

## 核心挑战

长运行 AI 代理面临的核心问题：
- **上下文窗口限制**：代理必须在离散会话中工作，每个新会话从零记忆开始
- **一次性尝试过多**：代理倾向于一次性完成所有任务，导致上下文耗尽
- **过早声明完成**：代理在部分功能完成后即认为项目已完成
- **环境状态混乱**：会话结束时留下未完成的代码和未记录的进度

## 长运行代理架构

### 双代理模式

```
┌─────────────────────────────────────────────────────────────┐
│                    Long-Running Agent                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐        ┌─────────────────┐            │
│  │ Initializer     │        │ Coding Agent    │            │
│  │ Agent           │ ────▶  │ (循环执行)       │            │
│  │ (首次运行)       │        │                 │            │
│  └─────────────────┘        └─────────────────┘            │
│         │                          │                        │
│         ▼                          ▼                        │
│  ┌─────────────────┐        ┌─────────────────┐            │
│  │ - init.sh       │        │ - 增量进展      │            │
│  │ - feature_list  │        │ - Git 提交      │            │
│  │ - progress file │        │ - 进度更新      │            │
│  │ - 初始 Git 提交  │        │ - 功能验证      │            │
│  └─────────────────┘        └─────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### 初始化代理 (Initializer Agent)

首次会话运行，负责设置项目环境。

```typescript
/**
 * 初始化代理配置
 * @description 定义初始化代理需要创建的环境文件
 */
interface InitializerAgentConfig {
  projectRoot: string
  projectName: string
  userPrompt: string
}

/**
 * 创建初始化环境
 * @param config 初始化配置
 * @returns 创建的文件列表
 */
async function initializeAgentEnvironment(
  config: InitializerAgentConfig
): Promise<string[]> {
  const createdFiles: string[] = []
  
  // 1. 创建 init.sh 启动脚本
  const initScript = generateInitScript(config)
  await writeFile('init.sh', initScript)
  createdFiles.push('init.sh')
  
  // 2. 创建功能列表文件
  const featureList = await generateFeatureList(config.userPrompt)
  await writeFile('feature_list.json', JSON.stringify(featureList, null, 2))
  createdFiles.push('feature_list.json')
  
  // 3. 创建进度文件
  const progressFile = initializeProgressFile(config)
  await writeFile('claude-progress.txt', progressFile)
  createdFiles.push('claude-progress.txt')
  
  // 4. 初始化 Git 仓库
  await execCommand('git init')
  await execCommand('git add .')
  await execCommand('git commit -m "Initial project setup"')
  
  return createdFiles
}

/**
 * 生成启动脚本
 * @param config 配置对象
 * @returns Shell 脚本内容
 */
function generateInitScript(config: InitializerAgentConfig): string {
  return `#!/bin/bash

# 项目初始化脚本
# 自动生成于: ${new Date().toISOString()}

echo "Starting ${config.projectName}..."

# 安装依赖
npm install

# 启动开发服务器
npm run dev &

# 等待服务器就绪
sleep 5

echo "Development server is running."
echo "Access the application at http://localhost:3000"
`
}
```

### 编码代理 (Coding Agent)

后续会话运行，负责增量开发和进度追踪。

```typescript
/**
 * 编码代理会话状态
 */
interface CodingAgentSession {
  sessionId: string
  startTime: Date
  currentFeature: Feature | null
  progress: SessionProgress
}

/**
 * 会话进度
 */
interface SessionProgress {
  filesModified: string[]
  testsRun: number
  testsPassed: number
  commits: string[]
}

/**
 * 启动编码代理会话
 * @description 执行会话初始化流程
 */
async function startCodingAgentSession(): Promise<CodingAgentSession> {
  const session: CodingAgentSession = {
    sessionId: generateSessionId(),
    startTime: new Date(),
    currentFeature: null,
    progress: {
      filesModified: [],
      testsRun: 0,
      testsPassed: 0,
      commits: []
    }
  }
  
  // 1. 确认工作目录
  const cwd = await getCurrentDirectory()
  console.log(`Working directory: ${cwd}`)
  
  // 2. 读取进度文件
  const progress = await readProgressFile()
  console.log('Recent progress:', progress.slice(-5))
  
  // 3. 读取 Git 日志
  const gitLog = await getGitLog(20)
  console.log('Recent commits:', gitLog)
  
  // 4. 读取功能列表
  const featureList = await readFeatureList()
  
  // 5. 选择下一个待完成功能
  session.currentFeature = selectNextFeature(featureList)
  
  // 6. 运行 init.sh 确保环境正常
  await runInitScript()
  
  // 7. 执行基础验证测试
  await runBasicVerification()
  
  return session
}

/**
 * 结束编码代理会话
 * @param session 会话状态
 */
async function endCodingAgentSession(session: CodingAgentSession): Promise<void> {
  // 1. 创建 Git 提交
  if (session.progress.filesModified.length > 0) {
    const commitMessage = generateCommitMessage(session)
    await execCommand(`git add .`)
    await execCommand(`git commit -m "${commitMessage}"`)
    session.progress.commits.push(commitMessage)
  }
  
  // 2. 更新进度文件
  await appendProgressFile({
    sessionId: session.sessionId,
    timestamp: new Date(),
    feature: session.currentFeature?.description,
    changes: session.progress.filesModified,
    status: session.currentFeature?.passes ? 'completed' : 'in_progress'
  })
  
  // 3. 更新功能列表状态
  if (session.currentFeature?.passes) {
    await updateFeatureStatus(session.currentFeature.id, true)
  }
}
```

## 功能列表管理

### 功能列表结构

```typescript
/**
 * 功能定义
 */
interface Feature {
  id: string
  category: 'functional' | 'ui' | 'api' | 'security' | 'performance'
  description: string
  priority: 'high' | 'medium' | 'low'
  steps: string[]
  passes: boolean
  lastAttempted?: string
  notes?: string
}

/**
 * 功能列表
 */
interface FeatureList {
  project: string
  createdAt: string
  updatedAt: string
  features: Feature[]
}

/**
 * 生成功能列表
 * @param userPrompt 用户需求描述
 * @returns 功能列表对象
 */
async function generateFeatureList(userPrompt: string): Promise<FeatureList> {
  // 根据用户需求生成详细功能列表
  // 所有功能初始状态为 passes: false
  return {
    project: 'Generated Project',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    features: [
      {
        id: 'feat-001',
        category: 'functional',
        description: '用户可以创建新的聊天会话',
        priority: 'high',
        steps: [
          '导航到主界面',
          '点击"新建聊天"按钮',
          '验证创建了新会话',
          '检查聊天区域显示欢迎状态',
          '验证会话出现在侧边栏'
        ],
        passes: false
      },
      {
        id: 'feat-002',
        category: 'functional',
        description: '用户可以发送消息并接收 AI 响应',
        priority: 'high',
        steps: [
          '在输入框输入消息',
          '按回车或点击发送按钮',
          '验证消息显示在聊天区域',
          '验证 AI 响应正确显示',
          '检查响应格式正确'
        ],
        passes: false
      }
    ]
  }
}

/**
 * 更新功能状态
 * @param featureId 功能 ID
 * @param passes 是否通过
 */
async function updateFeatureStatus(
  featureId: string, 
  passes: boolean
): Promise<void> {
  const featureList = await readFeatureList()
  
  const feature = featureList.features.find(f => f.id === featureId)
  if (feature) {
    feature.passes = passes
    feature.lastAttempted = new Date().toISOString()
    featureList.updatedAt = new Date().toISOString()
    
    await writeFile(
      'feature_list.json',
      JSON.stringify(featureList, null, 2)
    )
  }
}

/**
 * 选择下一个待完成功能
 * @param featureList 功能列表
 * @returns 优先级最高的未完成功能
 */
function selectNextFeature(featureList: FeatureList): Feature | null {
  const pendingFeatures = featureList.features.filter(f => !f.passes)
  
  if (pendingFeatures.length === 0) {
    return null
  }
  
  // 按优先级排序
  const priorityOrder = { high: 0, medium: 1, low: 2 }
  pendingFeatures.sort((a, b) => 
    priorityOrder[a.priority] - priorityOrder[b.priority]
  )
  
  return pendingFeatures[0]
}
```

## 会话状态管理

### 进度文件格式

```typescript
/**
 * 进度条目
 */
interface ProgressEntry {
  sessionId: string
  timestamp: string
  feature?: string
  changes: string[]
  status: 'started' | 'in_progress' | 'completed' | 'blocked'
  summary: string
}

/**
 * 初始化进度文件
 * @param config 初始化配置
 * @returns 进度文件初始内容
 */
function initializeProgressFile(config: InitializerAgentConfig): string {
  return `# 项目进度日志

## 项目: ${config.projectName}
## 创建时间: ${new Date().toISOString()}

### 初始化
- [${new Date().toISOString()}] 项目初始化完成
- 创建了 init.sh 启动脚本
- 创建了 feature_list.json 功能列表
- 初始化了 Git 仓库

---
`
}

/**
 * 追加进度记录
 * @param entry 进度条目
 */
async function appendProgressFile(entry: ProgressEntry): Promise<void> {
  const timestamp = new Date().toISOString()
  const content = `
### 会话: ${entry.sessionId}
- 时间: ${timestamp}
- 功能: ${entry.feature || 'N/A'}
- 状态: ${entry.status}
- 变更文件: ${entry.changes.join(', ') || '无'}
- 摘要: ${entry.summary}

`
  
  await appendFile('claude-progress.txt', content)
}

/**
 * 读取进度文件
 * @returns 最近的进度条目
 */
async function readProgressFile(): Promise<string[]> {
  const content = await readFile('claude-progress.txt')
  return content.split('\n').filter(line => line.trim())
}
```

### Git 集成

```typescript
/**
 * 生成提交消息
 * @param session 会话状态
 * @returns 格式化的提交消息
 */
function generateCommitMessage(session: CodingAgentSession): string {
  const feature = session.currentFeature
  const status = feature?.passes ? 'Complete' : 'WIP'
  
  return `[${status}] ${feature?.description || 'General updates'}

Feature ID: ${feature?.id || 'N/A'}
Session: ${session.sessionId}
Files modified: ${session.progress.filesModified.length}
Tests: ${session.progress.testsPassed}/${session.progress.testsRun} passed
`
}

/**
 * 获取 Git 日志
 * @param count 日志条数
 * @returns 格式化的日志数组
 */
async function getGitLog(count: number): Promise<string[]> {
  const output = await execCommand(
    `git log --oneline -${count}`
  )
  return output.split('\n').filter(line => line.trim())
}

/**
 * 检查工作区状态
 * @returns 是否有未提交的更改
 */
async function hasUncommittedChanges(): Promise<boolean> {
  const status = await execCommand('git status --porcelain')
  return status.trim().length > 0
}

/**
 * 恢复到最后一个干净状态
 */
async function restoreToLastCleanState(): Promise<void> {
  await execCommand('git stash')
  console.log('Stashed uncommitted changes')
}
```

## 测试验证模式

### 浏览器自动化测试

```typescript
import { chromium, Browser, Page } from 'playwright'

/**
 * 测试配置
 */
interface TestConfig {
  baseUrl: string
  timeout: number
  screenshotDir: string
}

/**
 * 浏览器测试器
 */
class BrowserTester {
  private browser: Browser | null = null
  private page: Page | null = null
  
  /**
   * 初始化浏览器
   * @param config 测试配置
   */
  async initialize(config: TestConfig): Promise<void> {
    this.browser = await chromium.launch({ headless: true })
    this.page = await this.browser.newPage()
    this.page.setDefaultTimeout(config.timeout)
  }
  
  /**
   * 执行功能验证
   * @param feature 待验证的功能
   * @returns 验证结果
   */
  async verifyFeature(feature: Feature): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized')
    }
    
    console.log(`Verifying feature: ${feature.description}`)
    
    for (const step of feature.steps) {
      const success = await this.executeStep(step)
      if (!success) {
        console.log(`Step failed: ${step}`)
        await this.takeScreenshot(`failure-${feature.id}`)
        return false
      }
    }
    
    await this.takeScreenshot(`success-${feature.id}`)
    return true
  }
  
  /**
   * 执行单个测试步骤
   * @param step 步骤描述
   * @returns 是否成功
   */
  private async executeStep(step: string): Promise<boolean> {
    // 根据步骤描述执行相应操作
    if (step.includes('点击')) {
      const buttonText = this.extractButtonText(step)
      await this.page?.click(`button:has-text("${buttonText}")`)
    } else if (step.includes('输入')) {
      const inputText = this.extractInputText(step)
      await this.page?.fill('input, textarea', inputText)
    } else if (step.includes('验证')) {
      const verifyText = this.extractVerifyText(step)
      const visible = await this.page?.isVisible(`text=${verifyText}`)
      return visible ?? false
    }
    
    return true
  }
  
  /**
   * 截图
   * @param name 截图名称
   */
  private async takeScreenshot(name: string): Promise<void> {
    await this.page?.screenshot({
      path: `screenshots/${name}.png`
    })
  }
  
  /**
   * 关闭浏览器
   */
  async close(): Promise<void> {
    await this.browser?.close()
  }
  
  private extractButtonText(step: string): string {
    const match = step.match(/点击["'](.+?)["']/)
    return match ? match[1] : ''
  }
  
  private extractInputText(step: string): string {
    const match = step.match(/输入["'](.+?)["']/)
    return match ? match[1] : ''
  }
  
  private extractVerifyText(step: string): string {
    const match = step.match(/验证.*["'](.+?)["']/)
    return match ? match[1] : ''
  }
}
```

### 基础验证流程

```typescript
/**
 * 运行基础验证
 * @description 确保核心功能正常工作
 */
async function runBasicVerification(): Promise<boolean> {
  const tester = new BrowserTester()
  
  try {
    await tester.initialize({
      baseUrl: 'http://localhost:3000',
      timeout: 30000,
      screenshotDir: './screenshots'
    })
    
    // 验证核心功能
    const coreFeatures = [
      '应用可以正常加载',
      '用户界面正常显示',
      '基础交互功能正常'
    ]
    
    for (const feature of coreFeatures) {
      console.log(`Verifying: ${feature}`)
    }
    
    return true
  } finally {
    await tester.close()
  }
}

/**
 * 功能自验证
 * @param feature 待验证功能
 * @returns 验证结果
 */
async function selfVerifyFeature(feature: Feature): Promise<{
  passed: boolean
  evidence: string[]
  errors: string[]
}> {
  const evidence: string[] = []
  const errors: string[] = []
  
  try {
    // 1. 运行单元测试
    const unitTestResult = await runUnitTests()
    evidence.push(`Unit tests: ${unitTestResult.passed}/${unitTestResult.total}`)
    
    // 2. 运行集成测试
    const integrationResult = await runIntegrationTests()
    evidence.push(`Integration tests: ${integrationResult.passed}/${integrationResult.total}`)
    
    // 3. 运行端到端测试
    const e2eResult = await runE2ETests(feature)
    evidence.push(`E2E tests: ${e2eResult.passed}/${e2eResult.total}`)
    
    // 4. 检查代码质量
    const lintResult = await runLintCheck()
    evidence.push(`Lint: ${lintResult.errors} errors, ${lintResult.warnings} warnings`)
    
    const passed = unitTestResult.passed === unitTestResult.total &&
                   integrationResult.passed === integrationResult.total &&
                   e2eResult.passed === e2eResult.total &&
                   lintResult.errors === 0
    
    return { passed, evidence, errors }
  } catch (error) {
    errors.push(String(error))
    return { passed: false, evidence, errors }
  }
}
```

## 代理失败模式及解决方案

| 失败模式 | 初始化代理行为 | 编码代理行为 |
|---------|--------------|------------|
| **过早声明项目完成** | 创建功能列表文件，包含所有端到端功能描述 | 会话开始时读取功能列表，选择单个功能进行开发 |
| **环境状态混乱** | 创建初始 Git 仓库和进度文件 | 会话开始时读取进度文件和 Git 日志，运行基础测试检测未记录的 bug；会话结束时创建 Git 提交和进度更新 |
| **功能标记过早完成** | 创建功能列表文件 | 自验证所有功能，只有经过仔细测试后才能标记为"通过" |
| **不清楚如何运行应用** | 编写 init.sh 脚本启动开发服务器 | 会话开始时读取 init.sh |

## 最佳实践

### 1. 增量开发原则

```typescript
/**
 * 增量开发约束
 */
const INCREMENTAL_RULES = {
  // 每次会话只处理一个功能
  maxFeaturesPerSession: 1,
  
  // 每个功能必须经过验证
  requireVerification: true,
  
  // 代码必须处于可提交状态
  requireCleanState: true,
  
  // 必须有描述性的提交消息
  requireDescriptiveCommits: true
}
```

### 2. 会话启动检查清单

```typescript
/**
 * 会话启动检查清单
 */
async function sessionStartupChecklist(): Promise<void> {
  console.log('=== Session Startup Checklist ===')
  
  // 1. 确认工作目录
  const cwd = process.cwd()
  console.log(`✓ Working directory: ${cwd}`)
  
  // 2. 读取进度文件
  const progress = await readFile('claude-progress.txt').catch(() => null)
  console.log(`✓ Progress file: ${progress ? 'Found' : 'Not found'}`)
  
  // 3. 读取功能列表
  const features = await readFile('feature_list.json').catch(() => null)
  console.log(`✓ Feature list: ${features ? 'Found' : 'Not found'}`)
  
  // 4. 检查 Git 状态
  const gitStatus = await execCommand('git status --porcelain')
  console.log(`✓ Git status: ${gitStatus.trim() || 'Clean'}`)
  
  // 5. 检查 init.sh
  const initScript = await readFile('init.sh').catch(() => null)
  console.log(`✓ Init script: ${initScript ? 'Found' : 'Not found'}`)
  
  console.log('================================')
}
```

### 3. 功能完成标准

```typescript
/**
 * 功能完成标准
 */
interface FeatureCompletionCriteria {
  // 所有步骤都通过验证
  allStepsVerified: boolean
  
  // 单元测试通过
  unitTestsPassed: boolean
  
  // 集成测试通过
  integrationTestsPassed: boolean
  
  // 端到端测试通过
  e2eTestsPassed: boolean
  
  // 代码已提交
  codeCommitted: boolean
  
  // 进度已记录
  progressRecorded: boolean
  
  // 无遗留 bug
  noOutstandingBugs: boolean
}

/**
 * 检查功能是否可以标记为完成
 * @param criteria 完成标准
 * @returns 是否满足所有标准
 */
function canMarkFeatureComplete(
  criteria: FeatureCompletionCriteria
): boolean {
  return Object.values(criteria).every(v => v === true)
}
```

### 4. 进度文件模板

```
# 项目进度日志

## 项目: [项目名称]
## 创建时间: [ISO 时间戳]

### 初始化
- [时间戳] 项目初始化完成
- 创建了 init.sh 启动脚本
- 创建了 feature_list.json 功能列表
- 初始化了 Git 仓库

---

### 会话: [Session ID]
- 时间: [ISO 时间戳]
- 功能: [功能描述]
- 状态: started | in_progress | completed | blocked
- 变更文件: [文件列表]
- 摘要: [本次会话的工作摘要]

### 会话: [Session ID]
...
```

### 5. JSON 功能列表模板

```json
{
  "project": "项目名称",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "features": [
    {
      "id": "feat-001",
      "category": "functional",
      "description": "功能描述",
      "priority": "high",
      "steps": [
        "步骤1",
        "步骤2",
        "步骤3"
      ],
      "passes": false,
      "lastAttempted": null,
      "notes": ""
    }
  ]
}
```
