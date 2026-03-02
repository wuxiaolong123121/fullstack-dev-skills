# Red/Green TDD 代理模式参考

针对 AI 编码代理优化的测试驱动开发流程，确保生成代码质量。

## When to Activate
- 使用 AI 编码代理实现新功能时
- 需要验证生成代码正确性时
- 进行代码重构时

## 核心理念

### 四字提示词
"**Use red/green TDD**" 是触发完整 TDD 流程的简洁方式。

### 为什么适合编码代理
- 防止代理写无用代码
- 确保代码实际工作
- 提供回归测试保护
- 验证实现符合预期

## RED 阶段：编写失败的测试

### 测试优先原则

```javascript
/**
 * RED 阶段示例
 * @description 先写失败的测试，定义期望行为
 */
describe('MarkdownParser', () => {
    /**
     * 测试标题提取功能
     * @description 此测试在实现前会失败
     */
    it('should extract headers from markdown string', () => {
        const parser = new MarkdownParser();
        const markdown = `# Header 1
## Header 2
### Header 3`;
        
        const headers = parser.extractHeaders(markdown);
        
        expect(headers).toEqual([
            { level: 1, text: 'Header 1' },
            { level: 2, text: 'Header 2' },
            { level: 3, text: 'Header 3' }
        ]);
    });

    /**
     * 测试边缘情况
     */
    it('should handle empty string', () => {
        const parser = new MarkdownParser();
        const headers = parser.extractHeaders('');
        expect(headers).toEqual([]);
    });
});
```

### 确认测试失败

```javascript
/**
 * 测试失败验证
 * @description 确保测试因正确原因失败
 */
const verifyTestFailure = {
    step1: '运行测试，确认失败',
    step2: '检查失败信息是否正确',
    step3: '确保不是语法错误导致的失败',
    step4: '验证测试逻辑本身正确'
};
```

## GREEN 阶段：最小实现

### 最小代码原则

```javascript
/**
 * GREEN 阶段示例
 * @description 只编写刚好通过测试的最少代码
 */
class MarkdownParser {
    /**
     * 提取 Markdown 标题
     * @param {string} markdown - Markdown 文本
     * @returns {Array<{level: number, text: string}>} 标题列表
     */
    extractHeaders(markdown) {
        if (!markdown) return [];
        
        const headers = [];
        const lines = markdown.split('\n');
        
        for (const line of lines) {
            const match = line.match(/^(#{1,6})\s+(.+)$/);
            if (match) {
                headers.push({
                    level: match[1].length,
                    text: match[2]
                });
            }
        }
        
        return headers;
    }
}
```

### 避免过度设计

```javascript
/**
 * 过度设计 vs 最小实现
 */

// ❌ 过度设计：添加了测试未要求的功能
class MarkdownParserOverEngineered {
    extractHeaders(markdown, options = {}) {
        // 添加了缓存（测试未要求）
        if (this.cache.has(markdown)) {
            return this.cache.get(markdown);
        }
        
        // 添加了自定义级别过滤（测试未要求）
        const minLevel = options.minLevel || 1;
        const maxLevel = options.maxLevel || 6;
        
        // ... 复杂实现
    }
}

// ✅ 最小实现：刚好通过测试
class MarkdownParserMinimal {
    extractHeaders(markdown) {
        if (!markdown) return [];
        // 简单直接的实现
    }
}
```

## 测试不可替代性原则

### 典型陷阱

```javascript
/**
 * LLM 生成代码的常见问题
 */
const commonPitfalls = {
    edgeCases: {
        problem: '忽略边缘情况',
        examples: ['网络超时', '空数据', '非法输入', '并发访问'],
        solution: '要求模型生成边缘情况测试'
    },
    securityIssues: {
        problem: '安全漏洞',
        examples: ['SQL 注入', 'XSS 攻击', '路径遍历'],
        solution: '使用安全扫描工具检查'
    },
    falseConfidence: {
        problem: '代码看起来正确但实际不工作',
        examples: ['未执行的代码', '错误的假设', '环境差异'],
        solution: '必须实际运行测试'
    }
};
```

### 测试策略

```javascript
/**
 * 测试不可替代性清单
 */
const testingChecklist = {
    must: [
        '要求模型生成测试用例',
        '结合覆盖率工具验证',
        '检查边缘情况',
        '验证安全漏洞'
    ],
    coverage: {
        critical: '100% 覆盖关键路径',
        business: '80%+ 覆盖业务逻辑',
        utility: '70%+ 覆盖工具函数'
    }
};
```

## 边缘情况和安全检查

### 边缘情况测试模板

```javascript
/**
 * 边缘情况测试框架
 */
describe('Edge Cases', () => {
    /**
     * 空值测试
     */
    describe('null/undefined handling', () => {
        it('should handle null input', () => {
            expect(() => service.process(null)).not.toThrow();
        });
        
        it('should handle undefined input', () => {
            expect(() => service.process(undefined)).not.toThrow();
        });
    });
    
    /**
     * 边界值测试
     */
    describe('boundary values', () => {
        it('should handle empty array', () => {
            expect(service.process([])).toEqual([]);
        });
        
        it('should handle maximum size', () => {
            const largeInput = Array(10000).fill('item');
            expect(() => service.process(largeInput)).not.toThrow();
        });
    });
    
    /**
     * 异常输入测试
     */
    describe('invalid input', () => {
        it('should reject negative numbers', () => {
            expect(() => service.process(-1)).toThrow();
        });
        
        it('should reject malformed data', () => {
            expect(() => service.process({ invalid: 'data' })).toThrow();
        });
    });
});
```

### 安全检查清单

```javascript
/**
 * 安全检查模板
 */
const securityChecks = {
    sqlInjection: {
        test: '输入包含 SQL 语句',
        expect: '应被转义或拒绝'
    },
    xss: {
        test: '输入包含脚本标签',
        expect: '应被转义或移除'
    },
    pathTraversal: {
        test: '文件路径包含 ../',
        expect: '应被拒绝或规范化'
    },
    commandInjection: {
        test: '输入包含 shell 命令',
        expect: '应被转义或拒绝'
    }
};
```

## 代理专用最佳实践

### 提示词模板

```javascript
/**
 * TDD 提示词模板
 */
const tddPrompts = {
    full: `
使用 Red/Green TDD 方法实现以下功能：
1. 先编写失败的测试
2. 确认测试失败
3. 编写最小代码使测试通过
4. 重构并确保测试仍然通过

功能需求：[具体需求]
`,
    minimal: 'Use red/green TDD to implement [功能描述]',
    iterative: `
当前测试失败，错误信息：
[错误信息]

请修复代码使测试通过，不要添加额外功能。
`
};
```

### 验证流程

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD 验证流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────────┐                                          │
│    │ 编写测试    │                                          │
│    └──────┬──────┘                                          │
│           │                                                 │
│           ▼                                                 │
│    ┌─────────────┐     失败？                               │
│    │ 运行测试    │ ─────────────┐                           │
│    └──────┬──────┘              │                           │
│           │                     │                           │
│           │ 通过                │ 否                        │
│           │                     │                           │
│           │                     ▼                           │
│           │              ┌─────────────┐                    │
│           │              │ 检查失败    │                    │
│           │              │ 原因正确？  │                    │
│           │              └──────┬──────┘                    │
│           │                     │                           │
│           │              是     │     否                    │
│           │                     │                           │
│           │              ┌──────┴──────┐                    │
│           │              │             │                    │
│           │              ▼             ▼                    │
│           │       ┌───────────┐  ┌───────────┐              │
│           │       │ 进入      │  │ 修正测试  │              │
│           │       │ GREEN阶段 │  │ 逻辑      │              │
│           │       └───────────┘  └───────────┘              │
│           │                                                 │
│           ▼                                                 │
│    ┌─────────────┐                                          │
│    │ 测试逻辑    │                                          │
│    │ 可能错误    │                                          │
│    └─────────────┘                                          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Quick Reference

| 阶段 | 目标 | 行动 | 验证 |
|------|------|------|------|
| RED | 定义期望 | 写失败的测试 | 测试必须失败 |
| GREEN | 实现功能 | 写最少代码 | 测试必须通过 |
| REFACTOR | 优化代码 | 重构不改变行为 | 测试仍通过 |

**Remember**: TDD 的核心不是测试，而是通过测试驱动设计。测试是手段，高质量代码才是目的。
