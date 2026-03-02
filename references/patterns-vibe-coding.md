# Vibe Coding 实践指南

直觉编程实践方法，通过快速实验和 Prompt 模板积累提升开发效率。

## When to Activate
- 快速原型开发时
- 探索新技术栈时
- 积累 Prompt 模板时
- 降低试错成本时

## 核心理念

### 什么是 Vibe Coding
- **定义**：不关注代码细节，通过提示词快速生成可工作代码的开发方式
- **特点**：快速迭代、直觉驱动、结果导向
- **价值**：原型开发速度提升 5 倍

### Vibe Coding vs Agentic Engineering

| 维度 | Vibe Coding | Agentic Engineering |
|------|-------------|---------------------|
| 关注点 | 结果而非代码 | 代码质量和可维护性 |
| 适用场景 | 原型、实验 | 生产代码 |
| 开发者角色 | 提示词设计者 | 工程师 + AI 协作者 |
| 验证方式 | 功能验证 | 测试驱动验证 |

## 直觉编程实践方法

### 快速实验循环

```
┌─────────────────────────────────────────────────────────────┐
│                    Vibe Coding 循环                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────────┐                                          │
│    │ 想法/需求   │                                          │
│    └──────┬──────┘                                          │
│           │                                                 │
│           ▼                                                 │
│    ┌─────────────┐                                          │
│    │ 编写提示词  │                                          │
│    └──────┬──────┘                                          │
│           │                                                 │
│           ▼                                                 │
│    ┌─────────────┐     满意？                               │
│    │ 生成代码    │ ─────────────┐                           │
│    └──────┬──────┘              │                           │
│           │                     │                           │
│           │ 运行测试            │ 否                        │
│           │                     │                           │
│           ▼                     ▼                           │
│    ┌─────────────┐      ┌─────────────┐                     │
│    │ 观察结果    │      │ 调整提示词  │                     │
│    └──────┬──────┘      └──────┬──────┘                     │
│           │                    │                            │
│           │                    └────────────────────────────┤
│           │                                                 │
│           ▼                                                 │
│    ┌─────────────┐                                          │
│    │ 记录有效    │                                          │
│    │ 提示词模式  │                                          │
│    └─────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 实验技巧

```javascript
/**
 * Vibe Coding 实验技巧
 */
const experimentTechniques = {
    parameterTweaking: {
        description: '调整提示词参数观察结果变化',
        example: '修改 CSS 布局参数，观察 UI 变化'
    },
    incrementalAddition: {
        description: '逐步添加功能需求',
        example: '先实现基本功能，再添加动画效果'
    },
    styleVariation: {
        description: '尝试不同代码风格',
        example: '对比函数式和面向对象实现'
    },
    constraintRelaxation: {
        description: '放宽约束探索可能性',
        example: '不指定具体实现，让 AI 选择最佳方案'
    }
};
```

## 可复用 Prompt 模板积累

### 模板分类

```javascript
/**
 * Prompt 模板分类
 */
const promptCategories = {
    scaffolding: {
        name: '项目脚手架',
        templates: [
            '生成 Flask CRUD 应用',
            '创建 React 组件库',
            '搭建 FastAPI 项目结构'
        ]
    },
    features: {
        name: '功能实现',
        templates: [
            '实现用户认证系统',
            '添加文件上传功能',
            '集成支付网关'
        ]
    },
    utilities: {
        name: '工具函数',
        templates: [
            '日期格式化工具',
            '数据验证器',
            'API 客户端封装'
        ]
    },
    testing: {
        name: '测试相关',
        templates: [
            '生成单元测试',
            '创建 E2E 测试场景',
            'Mock 数据生成'
        ]
    }
};
```

### 模板结构

```javascript
/**
 * Prompt 模板标准结构
 */
const promptTemplate = {
    name: '模板名称',
    description: '模板用途描述',
    category: '分类',
    parameters: [
        { name: 'param1', description: '参数说明', required: true },
        { name: 'param2', description: '参数说明', required: false }
    ],
    template: `
        实际的提示词模板内容
        使用 {param1} 和 {param2} 作为占位符
    `,
    examples: [
        {
            input: { param1: 'value1', param2: 'value2' },
            output: '预期输出示例'
        }
    ],
    notes: '使用注意事项'
};
```

### 模板积累策略

```javascript
/**
 * 模板积累策略
 */
const accumulationStrategy = {
    capture: {
        when: '每次成功的 Vibe Coding 会话后',
        action: '记录有效的提示词模式',
        format: '使用标准模板结构记录'
    },
    organize: {
        when: '定期整理',
        action: '分类和索引模板',
        tools: ['Notion', 'Obsidian', 'Git 仓库']
    },
    refine: {
        when: '重复使用时',
        action: '优化和泛化模板',
        goal: '提高模板复用性'
    },
    share: {
        when: '模板成熟后',
        action: '分享给团队',
        benefit: '提升团队整体效率'
    }
};
```

## 快速原型验证流程

### 原型开发阶段

```javascript
/**
 * 快速原型开发流程
 */
const prototypeWorkflow = {
    phase1: {
        name: '概念验证',
        duration: '30分钟 - 2小时',
        activities: [
            '定义核心功能',
            '生成最小可行原型',
            '验证技术可行性'
        ],
        output: '可工作的原型代码'
    },
    phase2: {
        name: '功能扩展',
        duration: '2-4小时',
        activities: [
            '添加次要功能',
            '优化用户体验',
            '处理边缘情况'
        ],
        output: '功能完整的原型'
    },
    phase3: {
        name: '代码理解',
        duration: '1-2小时',
        activities: [
            '生成代码演示文档',
            '理解实现细节',
            '识别改进点'
        ],
        output: '技术文档和改进计划'
    },
    phase4: {
        name: '生产化决策',
        duration: '1小时',
        activities: [
            '评估原型质量',
            '决定是否重构或重写',
            '制定生产化计划'
        ],
        output: '生产化路线图'
    }
};
```

### 原型评估标准

```javascript
/**
 * 原型评估清单
 */
const evaluationChecklist = {
    functionality: {
        weight: 0.3,
        questions: [
            '核心功能是否完整？',
            '是否满足用户需求？',
            '是否有明显的 Bug？'
        ]
    },
    codeQuality: {
        weight: 0.25,
        questions: [
            '代码结构是否清晰？',
            '是否有足够的测试？',
            '是否遵循最佳实践？'
        ]
    },
    maintainability: {
        weight: 0.25,
        questions: [
            '是否易于理解和修改？',
            '是否有适当的文档？',
            '依赖是否合理？'
        ]
    },
    performance: {
        weight: 0.2,
        questions: [
            '响应时间是否可接受？',
            '资源使用是否合理？',
            '是否有明显的性能瓶颈？'
        ]
    }
};
```

## 学习路径

### 初级：基础 Vibe Coding

```javascript
/**
 * 初级学习路径
 */
const beginnerPath = {
    duration: '1-2周',
    skills: [
        '理解提示词基本结构',
        '学会调整参数观察结果',
        '积累 10+ 基础模板'
    ],
    practice: [
        '生成简单的 CRUD 应用',
        '创建基础 UI 组件',
        '编写工具函数'
    ],
    goals: [
        '能够快速生成可工作的原型',
        '理解提示词对结果的影响',
        '建立模板积累习惯'
    ]
};
```

### 中级：效率提升

```javascript
/**
 * 中级学习路径
 */
const intermediatePath = {
    duration: '2-4周',
    skills: [
        '掌握上下文管理技巧',
        '学会迭代式对话修正',
        '积累 50+ 模板'
    ],
    practice: [
        '开发中等复杂度应用',
        '集成多个服务',
        '优化生成代码'
    ],
    goals: [
        '原型开发速度提升 3 倍',
        '减少无效迭代次数',
        '建立个人模板库'
    ]
};
```

### 高级：知识转化

```javascript
/**
 * 高级学习路径
 */
const advancedPath = {
    duration: '持续',
    skills: [
        '将专业知识转化为提示词约束',
        '设计复杂系统架构',
        '指导团队 Vibe Coding 实践'
    ],
    practice: [
        '开发复杂业务系统',
        '跨技术栈项目',
        '团队协作项目'
    ],
    goals: [
        '原型开发速度提升 5 倍',
        '建立团队模板库',
        '形成最佳实践文档'
    ]
};
```

## 最佳实践清单

### 开始前
- [ ] 明确原型目标
- [ ] 准备必要的上下文
- [ ] 选择合适的模板

### 开发中
- [ ] 保持迭代节奏
- [ ] 记录有效的提示词
- [ ] 及时验证功能

### 完成后
- [ ] 生成代码演示文档
- [ ] 评估原型质量
- [ ] 决定后续行动
- [ ] 更新模板库
