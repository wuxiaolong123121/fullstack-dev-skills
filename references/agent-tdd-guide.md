# TDD 指南代理 (TDD Guide Agent)

## 概述

TDD 指南代理负责测试驱动开发流程指导、测试策略建议和测试覆盖率分析。它帮助开发团队遵循 RED-GREEN-REFACTOR 循环，确保代码质量和测试完整性。

## 核心职责

### 1. TDD 流程指导
- RED 阶段：编写失败的测试
- GREEN 阶段：编写最小实现代码
- REFACTOR 阶段：优化代码结构

### 2. 测试策略建议
- 单元测试策略
- 集成测试策略
- 端到端测试策略
- 测试金字塔设计

### 3. 测试覆盖率分析
- 代码覆盖率统计
- 分支覆盖率分析
- 测试缺口识别
- 覆盖率目标设定

## TDD 循环

```
┌─────────────────────────────────────────┐
│                                         │
│    ┌─────────┐                          │
│    │  RED    │ 编写失败的测试            │
│    └────┬────┘                          │
│         │                               │
│         ▼                               │
│    ┌─────────┐                          │
│    │  GREEN  │ 编写最小实现使测试通过     │
│    └────┬────┘                          │
│         │                               │
│         ▼                               │
│    ┌──────────┐                         │
│    │ REFACTOR │ 优化代码，保持测试通过    │
│    └────┬─────┘                         │
│         │                               │
│         └───────────────────────────────┘
│                                         │
└─────────────────────────────────────────┘
```

## 使用场景

### 新功能开发
```
用户: 使用 TDD 开发一个计算器加法功能
代理: 
  1. RED: 编写测试用例 test_add_two_numbers
  2. GREEN: 实现最小代码使测试通过
  3. REFACTOR: 优化实现，添加边界处理
```

### Bug 修复
```
用户: 修复用户登录验证的 bug
代理:
  1. RED: 编写重现 bug 的失败测试
  2. GREEN: 修复代码使测试通过
  3. REFACTOR: 优化验证逻辑
```

## 测试金字塔

```
          △
         /│\        E2E 测试 (10%)
        / │ \       - 用户流程测试
       /  │  \      - 跨系统集成测试
      /───┼───\     
     /    │    \    集成测试 (20%)
    /     │     \   - API 测试
   /      │      \  - 数据库测试
  /───────┼───────\ 
 /        │        \ 单元测试 (70%)
/_________│_________\ - 函数测试
                       - 组件测试
```

## 测试命名规范

### AAA 模式
```javascript
describe('Calculator', () => {
  describe('add', () => {
    it('should return sum of two positive numbers', () => {
      // Arrange (准备)
      const calculator = new Calculator();
      const a = 5;
      const b = 3;
      
      // Act (执行)
      const result = calculator.add(a, b);
      
      // Assert (断言)
      expect(result).toBe(8);
    });
  });
});
```

### 测试命名模板
```
should_[expected_behavior]_when_[condition]

示例:
- should_return_true_when_user_is_authenticated
- should_throw_error_when_password_is_empty
- should_return_empty_list_when_no_items_found
```

## 测试覆盖率目标

| 类型 | 目标 | 说明 |
|-----|------|------|
| 行覆盖率 | ≥ 80% | 代码行执行比例 |
| 分支覆盖率 | ≥ 70% | 条件分支覆盖 |
| 函数覆盖率 | ≥ 90% | 函数调用覆盖 |
| 语句覆盖率 | ≥ 80% | 语句执行比例 |

## TDD 工作流程示例

### 阶段 1: RED
```javascript
// 测试文件: calculator.test.js
describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    const calc = new Calculator();
    expect(calc.add(2, 3)).toBe(5);
  });
});

// 运行测试: 失败 ❌
// ReferenceError: Calculator is not defined
```

### 阶段 2: GREEN
```javascript
// 实现文件: calculator.js
class Calculator {
  add(a, b) {
    return a + b;
  }
}

// 运行测试: 通过 ✅
```

### 阶段 3: REFACTOR
```javascript
// 优化实现
class Calculator {
  /**
   * 计算两个数的和
   * @param {number} a - 第一个数
   * @param {number} b - 第二个数
   * @returns {number} 两数之和
   * @throws {TypeError} 参数必须是数字
   */
  add(a, b) {
    if (typeof a !== 'number' || typeof b !== 'number') {
      throw new TypeError('参数必须是数字');
    }
    return a + b;
  }
}

// 补充测试
it('should throw error when parameters are not numbers', () => {
  const calc = new Calculator();
  expect(() => calc.add('2', 3)).toThrow(TypeError);
});
```

## 测试类型指南

### 单元测试
```javascript
// 测试单个函数或方法
describe('formatDate', () => {
  it('should format date to YYYY-MM-DD', () => {
    const date = new Date('2024-01-15');
    expect(formatDate(date)).toBe('2024-01-15');
  });
});
```

### 集成测试
```javascript
// 测试多个组件协作
describe('UserService', () => {
  it('should create user and save to database', async () => {
    const service = new UserService(mockDb);
    const user = await service.create({ name: 'Test' });
    expect(user.id).toBeDefined();
    expect(mockDb.save).toHaveBeenCalled();
  });
});
```

### E2E 测试
```javascript
// 测试完整用户流程
describe('User Registration Flow', () => {
  it('should complete registration process', async () => {
    await page.goto('/register');
    await page.fill('#email', 'test@example.com');
    await page.fill('#password', 'Password123!');
    await page.click('#submit');
    await expect(page.locator('.success-message')).toBeVisible();
  });
});
```

## Mock 和 Stub

### Mock 示例
```javascript
// Mock 数据库
const mockDb = {
  find: jest.fn().mockResolvedValue({ id: 1, name: 'Test' }),
  save: jest.fn().mockResolvedValue(true)
};

// 使用 Mock
const service = new UserService(mockDb);
const result = await service.getUser(1);
expect(mockDb.find).toHaveBeenCalledWith(1);
```

### Stub 示例
```javascript
// Stub 外部服务
const stubPaymentGateway = {
  charge: () => Promise.resolve({ success: true, transactionId: 'txn_123' })
};

// 使用 Stub
const orderService = new OrderService(stubPaymentGateway);
```

## 测试报告模板

```markdown
## TDD 测试报告

### 概览
- **测试文件**: [文件列表]
- **执行时间**: [时间戳]
- **总耗时**: [毫秒]

### 测试统计
| 指标 | 数值 |
|-----|------|
| 测试套件 | [数量] |
| 测试用例 | [数量] |
| 通过 | [数量] ✅ |
| 失败 | [数量] ❌ |
| 跳过 | [数量] ⏭️ |

### 覆盖率报告
| 文件 | 语句 | 分支 | 函数 | 行 |
|-----|------|------|------|-----|
| calculator.js | 95% | 87% | 100% | 95% |
| utils.js | 82% | 75% | 90% | 83% |
| **总计** | **88%** | **81%** | **95%** | **89%** |

### 失败测试
#### ❌ test_add_negative_numbers
```
Expected: -2
Received: 0
```
**位置**: calculator.test.js:25

### 覆盖缺口
- [ ] calculator.js:45 - 错误处理分支未覆盖
- [ ] utils.js:12 - 边界条件未测试
```

## 最佳实践

### 1. 测试原则
- FIRST 原则: Fast, Independent, Repeatable, Self-validating, Timely
- 一个测试只验证一个行为
- 测试应该独立，不依赖执行顺序

### 2. 测试数据
- 使用工厂函数创建测试数据
- 避免硬编码测试数据
- 清理测试产生的数据

### 3. 测试维护
- 保持测试代码质量
- 定期重构测试代码
- 删除过时的测试

## 相关参考

- [代理系统概述](./agents-overview.md)
- [代码审查代理](./agent-code-reviewer.md)
- [E2E测试命令](./command-e2e.md)
