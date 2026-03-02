# 开发者行动指南

LLM 协作开发的完整行动指南，包括技能培养、工具整合和风险管理。

## When to Activate
- 开始 LLM 辅助开发时
- 提升团队 AI 协作能力时
- 建立开发规范时
- 进行代码审查时

## 技能培养

### Prompt Engineering 基础

#### COSTAR 框架

```javascript
/**
 * COSTAR 提示词框架
 * @description 结构化提示设计方法
 */
const COSTAR = {
    C: {
        name: 'Context（背景）',
        description: '提供任务背景信息',
        example: '你是一个有10年经验的 Python 后端开发者'
    },
    O: {
        name: 'Objective（目标）',
        description: '明确要完成的任务',
        example: '实现一个带缓存的 API 客户端'
    },
    S: {
        name: 'Style（风格）',
        description: '指定输出风格',
        example: '使用简洁的代码风格，添加类型注解'
    },
    T: {
        name: 'Tone（语气）',
        description: '设定交互语气',
        example: '专业、技术性'
    },
    A: {
        name: 'Audience（受众）',
        description: '定义目标读者',
        example: '面向中级开发者'
    },
    R: {
        name: 'Response（响应）',
        description: '指定输出格式',
        example: '返回完整代码，附带简要说明'
    }
};
```

#### 提示词模板库

```javascript
/**
 * 常用提示词模板
 */
const promptTemplates = {
    feature: `
## 背景
[项目背景信息]

## 需求
实现 [功能名称]：
- [具体要求1]
- [具体要求2]

## 约束
- 使用 [技术栈]
- 遵循 [代码规范]
- 包含 [测试要求]
`,
    bugfix: `
## 问题描述
[错误现象]

## 错误信息
\`\`\`
[错误日志]
\`\`\`

## 相关代码
\`\`\`
[代码片段]
\`\`\`

## 期望行为
[正确的行为描述]
`,
    review: `
## 审查目标
审查以下代码的：
- 代码质量
- 安全问题
- 性能问题
- 最佳实践

## 代码
\`\`\`
[待审查代码]
\`\`\`
`
};
```

### 代码审查清单

```markdown
## LLM 生成代码审查清单

### 功能正确性
- [ ] 代码是否实现了需求功能？
- [ ] 是否处理了所有边缘情况？
- [ ] 错误处理是否完善？

### 代码质量
- [ ] 代码结构是否清晰？
- [ ] 命名是否有意义？
- [ ] 是否有重复代码？
- [ ] 是否遵循项目编码规范？

### 安全性
- [ ] 是否有 SQL 注入风险？
- [ ] 是否有 XSS 漏洞？
- [ ] 敏感数据是否正确处理？
- [ ] 输入验证是否充分？

### 性能
- [ ] 是否有明显的性能问题？
- [ ] 数据库查询是否优化？
- [ ] 是否有不必要的循环？

### 测试
- [ ] 是否有单元测试？
- [ ] 测试覆盖率是否足够？
- [ ] 边缘情况是否测试？

### 文档
- [ ] 函数是否有注释？
- [ ] 复杂逻辑是否有说明？
- [ ] README 是否需要更新？
```

## 工具链整合

### IDE 插件集成

```javascript
/**
 * 推荐 IDE 插件
 */
const idePlugins = {
    vscode: [
        {
            name: 'GitHub Copilot',
            features: ['代码补全', '上下文感知', '多语言支持'],
            useCase: '日常编码辅助'
        },
        {
            name: 'Cursor',
            features: ['AI 对话', '代码生成', '项目理解'],
            useCase: '复杂功能开发'
        },
        {
            name: 'Continue',
            features: ['开源', '自定义模型', '代码解释'],
            useCase: '隐私敏感项目'
        }
    ],
    jetbrains: [
        {
            name: 'AI Assistant',
            features: ['代码生成', '文档编写', '测试生成'],
            useCase: 'JetBrains IDE 用户'
        }
    ]
};
```

### 自动化测试流程

```yaml
# .github/workflows/ai-code-review.yml
name: AI Code Review

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Tests
        run: |
          npm ci
          npm run test:coverage
          
      - name: Security Scan
        uses: snyk/actions/node@master
        with:
          args: --severity-threshold=high
          
      - name: Code Quality Check
        run: |
          npm run lint
          npm run typecheck
          
      - name: Coverage Report
        uses: codecov/codecov-action@v3
```

### CI/CD 集成检查点

```javascript
/**
 * CI/CD 检查点配置
 */
const cicdCheckpoints = {
    preCommit: {
        checks: ['lint', 'format', 'typecheck'],
        timeout: '5m'
    },
    prePush: {
        checks: ['unit-tests', 'security-scan'],
        timeout: '15m'
    },
    pullRequest: {
        checks: [
            'unit-tests',
            'integration-tests',
            'coverage-report',
            'security-audit',
            'performance-baseline'
        ],
        timeout: '30m'
    },
    deployment: {
        checks: [
            'e2e-tests',
            'load-tests',
            'security-penetration'
        ],
        timeout: '60m'
    }
};
```

## 风险管理

### 安全扫描工具

```javascript
/**
 * 安全扫描工具配置
 */
const securityTools = {
    semgrep: {
        description: '静态分析工具',
        config: {
            rules: ['p/security', 'p/secrets', 'p/sql-injection'],
            severity: 'ERROR'
        },
        usage: 'semgrep --config auto --error'
    },
    bandit: {
        description: 'Python 安全检查',
        config: {
            severity: 'medium',
            confidence: 'medium'
        },
        usage: 'bandit -r src/ -ll'
    },
    snyk: {
        description: '依赖漏洞扫描',
        config: {
            severityThreshold: 'high',
            failOn: 'upgradable'
        },
        usage: 'snyk test --severity-threshold=high'
    },
    trivy: {
        description: '容器安全扫描',
        config: {
            severity: 'HIGH,CRITICAL',
            ignoreUnfixed: true
        },
        usage: 'trivy image myapp:latest'
    }
};
```

### 知识验证流程

```javascript
/**
 * 技术建议验证流程
 */
const knowledgeVerification = {
    sources: {
        primary: ['官方文档', 'GitHub 仓库', '发布说明'],
        secondary: ['Stack Overflow', '技术博客', '社区论坛'],
        caution: ['AI 生成内容', '过时教程', '未验证的答案']
    },
    verification: {
        step1: '检查官方文档确认 API 存在',
        step2: '验证版本兼容性',
        step3: '查看 GitHub Issues 了解已知问题',
        step4: '小规模测试验证功能'
    },
    redFlags: [
        'AI 提供的 API 在文档中找不到',
        '代码示例使用过时的方法',
        '建议与最佳实践冲突',
        '没有官方来源支持的说法'
    ]
};
```

### 风险评估矩阵

```
┌─────────────────────────────────────────────────────────────┐
│                    风险评估矩阵                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  影响程度                                                   │
│      高 │  安全漏洞    │  数据泄露    │  系统崩溃          │
│         │  [需审查]    │  [需审查]    │  [需测试]          │
│         ├──────────────┼──────────────┼────────────────────┤
│      中 │  性能问题    │  功能缺陷    │  兼容性问题        │
│         │  [需测试]    │  [需测试]    │  [需验证]          │
│         ├──────────────┼──────────────┼────────────────────┤
│      低 │  代码风格    │  文档缺失    │  命名不规范        │
│         │  [可选修复]  │  [可选补充]  │  [可选改进]        │
│         └──────────────┴──────────────┴────────────────────┘
│              低            中            高                │
│                        发生概率                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 未来展望：技术策展人角色

### 角色转变

```javascript
/**
 * 开发者角色演变
 */
const roleEvolution = {
    traditional: {
        focus: '编写代码',
        skills: ['编程语言', '算法', '数据结构'],
        output: '代码行数'
    },
    modern: {
        focus: '技术策展',
        skills: [
            'Prompt Engineering',
            '系统架构设计',
            '代码审查',
            'AI 协作',
            '风险管理'
        ],
        output: '交付价值'
    }
};
```

### 新能力要求

```javascript
/**
 * 技术策展人能力模型
 */
const curatorSkills = {
    technical: {
        name: '技术判断力',
        items: [
            '评估 AI 生成代码质量',
            '识别技术方案优劣',
            '做出架构决策'
        ]
    },
    collaboration: {
        name: 'AI 协作能力',
        items: [
            '设计有效提示词',
            '管理上下文信息',
            '迭代优化输出'
        ]
    },
    quality: {
        name: '质量把控能力',
        items: [
            '建立测试策略',
            '执行代码审查',
            '管理技术债务'
        ]
    },
    strategic: {
        name: '战略规划能力',
        items: [
            '技术选型决策',
            '团队能力建设',
            '流程优化设计'
        ]
    }
};
```

### 工作流变革

```
┌─────────────────────────────────────────────────────────────┐
│                    工作流变革                                │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  传统流程：                                                  │
│  需求 → 设计 → 编码 → 测试 → 部署                           │
│         │                    │                              │
│         └──── 开发者时间 ────┘                              │
│                                                             │
│  AI 协作流程：                                               │
│  需求 → 设计 → [AI生成] → 审查 → 测试 → 部署                │
│         │           │        │      │                       │
│         └─ 开发者 ──┴─ 策展 ─┴─ 验证 ┘                      │
│                                                             │
│  时间分配变化：                                              │
│  ┌─────────────────────────────────────────────┐            │
│  │ 传统：编码 60% │ 测试 20% │ 设计 15% │ 其他 5% │           │
│  ├─────────────────────────────────────────────┤            │
│  │ AI协作：审查 40% │ 设计 30% │ 测试 20% │ 其他 10% │        │
│  └─────────────────────────────────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## 行动清单

### 即时行动
- [ ] 安装并配置 AI 编码助手
- [ ] 建立个人提示词模板库
- [ ] 设置安全扫描工具

### 短期目标（1个月）
- [ ] 完成 Prompt Engineering 基础学习
- [ ] 建立 LLM 生成代码审查流程
- [ ] 积累 20+ 有效提示词模板

### 中期目标（3个月）
- [ ] 团队推广 AI 协作最佳实践
- [ ] 建立团队共享模板库
- [ ] 优化 CI/CD 集成 AI 辅助检查

### 长期目标（6个月+）
- [ ] 形成 AI 协作开发规范
- [ ] 培养团队技术策展能力
- [ ] 持续改进工作流程
