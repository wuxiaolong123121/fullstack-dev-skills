# /tdd 测试驱动开发命令 (TDD Command)

## 概述

`/tdd` 命令启动测试驱动开发工作流，遵循 RED-GREEN-REFACTOR 循环，帮助开发者编写高质量的测试代码和实现代码。

## 命令语法

```
/tdd <功能描述> [选项]
```

### 参数说明

| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `<功能描述>` | string | 是 | 要开发的功能描述 |
| `--watch` | flag | 否 | 监视模式，文件变化自动重跑测试 |
| `--coverage` | flag | 否 | 生成覆盖率报告 |
| `--debug` | flag | 否 | 调试模式，显示详细日志 |
| `--parallel` | flag | 否 | 并行执行测试 |
| `--snapshot` | flag | 否 | 更新快照测试 |
| `--only` | string | 否 | 仅运行指定测试文件 |

## 使用示例

### 基础用法
```
/tdd 实现计算器加法功能
```

### 监视模式
```
/tdd 实现用户验证 --watch
```

### 带覆盖率报告
```
/tdd 实现订单处理 --coverage --parallel
```

### 调试模式
```
/tdd 实现支付功能 --debug
```

## TDD 工作流程

```
┌─────────────────────────────────────────────────┐
│                   TDD 循环                       │
│                                                  │
│    ┌─────────┐                                  │
│    │  RED    │ 1. 编写失败的测试                 │
│    │         │    - 定义期望行为                 │
│    │         │    - 运行测试确认失败             │
│    └────┬────┘                                  │
│         │                                        │
│         ▼                                        │
│    ┌─────────┐                                  │
│    │  GREEN  │ 2. 编写最小实现                   │
│    │         │    - 只写必要的代码               │
│    │         │    - 使测试通过                   │
│    └────┬────┘                                  │
│         │                                        │
│         ▼                                        │
│    ┌──────────┐                                 │
│    │ REFACTOR │ 3. 优化代码                      │
│    │          │    - 消除重复                    │
│    │          │    - 改善设计                    │
│    │          │    - 保持测试通过                │
│    └────┬─────┘                                 │
│         │                                        │
│         └──────────── 循环 ────────────────┐    │
│                                            │    │
└────────────────────────────────────────────┼────┘
                                             │
                                             ▼
                                    ┌──────────────┐
                                    │   完成 ✓     │
                                    └──────────────┘
```

## 输出格式

### RED 阶段输出
```markdown
## TDD: RED 阶段

### 功能: 计算器加法

### 编写测试
```javascript
// calculator.test.js
describe('Calculator', () => {
  describe('add', () => {
    it('should add two positive numbers', () => {
      const calc = new Calculator();
      expect(calc.add(2, 3)).toBe(5);
    });
  });
});
```

### 运行测试
```
FAIL src/calculator.test.js
  ● Calculator › add › should add two positive numbers

    ReferenceError: Calculator is not defined

Tests:       1 failed, 1 total
```

### 状态: ✅ RED 阶段完成
测试正确失败，可以进入 GREEN 阶段
```

### GREEN 阶段输出
```markdown
## TDD: GREEN 阶段

### 最小实现
```javascript
// calculator.js
class Calculator {
  add(a, b) {
    return a + b;
  }
}

module.exports = Calculator;
```

### 运行测试
```
PASS src/calculator.test.js
  Calculator
    add
      ✓ should add two positive numbers (2 ms)

Tests:       1 passed, 1 total
```

### 状态: ✅ GREEN 阶段完成
测试通过，可以进入 REFACTOR 阶段
```

### REFACTOR 阶段输出
```markdown
## TDD: REFACTOR 阶段

### 优化前
```javascript
class Calculator {
  add(a, b) {
    return a + b;
  }
}
```

### 优化后
```javascript
class Calculator {
  /**
   * 计算两个数的和
   * @param {number} a - 第一个数
   * @param {number} b - 第二个数
   * @returns {number} 两数之和
   * @throws {TypeError} 参数必须是数字
   */
  add(a, b) {
    this._validateNumber(a);
    this._validateNumber(b);
    return a + b;
  }

  _validateNumber(value) {
    if (typeof value !== 'number' || isNaN(value)) {
      throw new TypeError('参数必须是有效数字');
    }
  }
}
```

### 补充测试
```javascript
it('should throw error for non-number inputs', () => {
  const calc = new Calculator();
  expect(() => calc.add('2', 3)).toThrow(TypeError);
  expect(() => calc.add(2, null)).toThrow(TypeError);
});
```

### 运行测试
```
PASS src/calculator.test.js
  Calculator
    add
      ✓ should add two positive numbers (2 ms)
      ✓ should throw error for non-number inputs (1 ms)

Tests:       2 passed, 2 total
```

### 状态: ✅ REFACTOR 阶段完成
代码已优化，所有测试通过
```

## 覆盖率报告

```
## 测试覆盖率报告

### 文件覆盖情况
| 文件 | 语句 | 分支 | 函数 | 行 |
|-----|------|------|------|-----|
| calculator.js | 100% | 100% | 100% | 100% |
| utils.js | 95% | 87% | 100% | 95% |
| **总计** | **97%** | **93%** | **100%** | **97%** |

### 未覆盖代码
- utils.js:45 - 边界条件分支
- utils.js:78 - 错误处理分支

### 覆盖率目标
- [x] 语句覆盖率 ≥ 80%
- [x] 分支覆盖率 ≥ 70%
- [x] 函数覆盖率 ≥ 90%
- [x] 行覆盖率 ≥ 80%
```

## 测试模板

### 单元测试模板
```javascript
describe('[模块名]', () => {
  describe('[函数/方法名]', () => {
    it('should [期望行为] when [条件]', () => {
      // Arrange
      const input = 'test input';
      const expected = 'expected output';
      
      // Act
      const result = functionUnderTest(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### 异步测试模板
```javascript
describe('[异步功能]', () => {
  it('should [期望行为]', async () => {
    // Arrange
    const mockData = { id: 1 };
    
    // Act
    const result = await asyncFunction(mockData);
    
    // Assert
    expect(result).toBeDefined();
  });
});
```

### 异常测试模板
```javascript
describe('[异常处理]', () => {
  it('should throw [错误类型] when [条件]', () => {
    // Arrange
    const invalidInput = null;
    
    // Act & Assert
    expect(() => functionUnderTest(invalidInput))
      .toThrow(ExpectedError);
  });
});
```

## 最佳实践

### 1. RED 阶段
- 测试名称清晰描述期望行为
- 一个测试只验证一个行为
- 使用 AAA 模式 (Arrange-Act-Assert)

### 2. GREEN 阶段
- 编写最小代码使测试通过
- 不要过度实现
- 保持代码简单

### 3. REFACTOR 阶段
- 保持测试通过
- 消除代码重复
- 改善命名和结构
- 添加必要注释

### 4. 测试原则
- FIRST 原则
  - Fast: 测试快速执行
  - Independent: 测试相互独立
  - Repeatable: 测试可重复
  - Self-validating: 自动验证结果
  - Timely: 及时编写测试

## 相关命令

- `/plan` - 功能规划
- `/e2e` - 端到端测试
- `/code-review` - 代码审查

## 相关参考

- [命令系统概述](./commands-overview.md)
- [TDD指南代理](./agent-tdd-guide.md)
- [E2E命令](./command-e2e.md)
