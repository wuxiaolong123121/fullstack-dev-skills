# TDD 工作流模式参考

测试驱动开发（Test-Driven Development）方法论核心内容、RED-GREEN-REFACTOR 循环、测试优先原则和最佳实践，用于构建高质量、可维护的软件系统。

## When to Activate

- 编写新的业务功能代码
- 修复 Bug 或重构现有代码
- 设计新模块或组件
- 代码审查和质量检查

## Core Principles

### 1. 测试优先原则

测试先行，代码后行。先定义期望行为，再实现功能。

```javascript
/**
 * 测试优先示例：先写失败的测试
 * @description 定义期望的行为，再实现功能
 */
describe('Calculator', () => {
    /**
     * 测试加法功能
     */
    it('should add two numbers correctly', () => {
        const calculator = new Calculator();
        const result = calculator.add(2, 3);
        expect(result).toBe(5);
    });

    /**
     * 测试边界情况
     */
    it('should handle negative numbers', () => {
        const calculator = new Calculator();
        const result = calculator.add(-1, 5);
        expect(result).toBe(4);
    });
});
```

### 2. 最小实现原则

只编写刚好通过测试的最少代码，避免过度设计。

```javascript
/**
 * 最小实现示例
 * @description 只实现测试要求的功能，不多不少
 */
class Calculator {
    /**
     * 加法运算
     * @param {number} a - 第一个操作数
     * @param {number} b - 第二个操作数
     * @returns {number} 计算结果
     */
    add(a, b) {
        return a + b;
    }
}
```

### 3. 持续重构原则

测试通过后立即重构，保持代码整洁。

```javascript
/**
 * 重构前：硬编码实现
 */
class DiscountCalculator {
    calculate(price, type) {
        if (type === 'VIP') {
            return price * 0.8;
        } else if (type === 'SVIP') {
            return price * 0.7;
        }
        return price;
    }
}

/**
 * 重构后：策略模式
 */
class DiscountCalculator {
    /**
     * 折扣策略映射
     * @type {Object<string, number>}
     */
    static strategies = {
        'VIP': 0.8,
        'SVIP': 0.7,
        'NORMAL': 1.0
    };

    /**
     * 计算折扣价格
     * @param {number} price - 原价
     * @param {string} type - 会员类型
     * @returns {number} 折扣后价格
     */
    calculate(price, type) {
        const rate = DiscountCalculator.strategies[type] || 1.0;
        return price * rate;
    }
}
```

## RED-GREEN-REFACTOR 循环

### 循环流程图

```
┌─────────────────────────────────────────────────────────────┐
│                    TDD 循环流程                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│    ┌─────────┐                                              │
│    │  开始   │                                              │
│    └────┬────┘                                              │
│         │                                                   │
│         ▼                                                   │
│    ┌─────────┐                                              │
│    │   RED   │ ◄──────────────────────────────┐            │
│    │ 写失败  │                                 │            │
│    │ 的测试  │                                 │            │
│    └────┬────┘                                 │            │
│         │                                      │            │
│         ▼                                      │            │
│    ┌─────────┐                                 │            │
│    │  GREEN  │                                 │            │
│    │ 写最少  │                                 │            │
│    │ 的代码  │                                 │            │
│    └────┬────┘                                 │            │
│         │                                      │            │
│         ▼                                      │            │
│    ┌─────────┐                                 │            │
│    │REFACTOR │                                 │            │
│    │ 重构并  │                                 │            │
│    │ 清理    │                                 │            │
│    └────┬────┘                                 │            │
│         │                                      │            │
│         ▼                                      │            │
│    ┌─────────┐     是否有新需求？               │            │
│    │ 测试通过│ ──────────────┐                 │            │
│    └────┬────┘               │                 │            │
│         │                    │                 │            │
│         │     ┌──────────────┴─────────────┐   │            │
│         │     │                            │   │            │
│         │   是│                          否│   │            │
│         │     │                            │   │            │
│         │     ▼                            ▼   │            │
│         │  ┌─────────┐              ┌─────────┐│            │
│         │  │ 添加新  │              │  完成   ││            │
│         └──│ 测试用例│──────────────│         ││            │
│            └─────────┘              └─────────┘│            │
│                                               │            │
│                    循环继续 ───────────────────┘            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### RED 阶段：编写失败的测试

```javascript
/**
 * RED 阶段示例
 * @description 编写一个失败的测试，定义期望行为
 */
describe('UserService', () => {
    let userService;

    beforeEach(() => {
        userService = new UserService();
    });

    /**
     * 测试用户注册功能
     * @description 此测试在实现前会失败
     */
    it('should register a new user with valid data', async () => {
        const userData = {
            username: 'testuser',
            email: 'test@example.com',
            password: 'SecurePass123!'
        };

        const result = await userService.register(userData);

        expect(result.success).toBe(true);
        expect(result.user.id).toBeDefined();
        expect(result.user.username).toBe(userData.username);
    });

    /**
     * 测试重复注册失败场景
     */
    it('should fail when username already exists', async () => {
        const userData = {
            username: 'existinguser',
            email: 'test@example.com',
            password: 'SecurePass123!'
        };

        await userService.register(userData);

        await expect(userService.register(userData))
            .rejects.toThrow('Username already exists');
    });
});
```

### GREEN 阶段：编写最少代码使测试通过

```javascript
/**
 * GREEN 阶段示例
 * @description 编写最少的代码使测试通过
 */
class UserService {
    constructor() {
        /**
         * 用户存储
         * @type {Map<string, Object>}
         */
        this.users = new Map();
        /**
         * ID 计数器
         * @type {number}
         */
        this.idCounter = 1;
    }

    /**
     * 注册新用户
     * @param {Object} userData - 用户数据
     * @param {string} userData.username - 用户名
     * @param {string} userData.email - 邮箱
     * @param {string} userData.password - 密码
     * @returns {Promise<Object>} 注册结果
     * @throws {Error} 用户名已存在时抛出错误
     */
    async register(userData) {
        if (this.users.has(userData.username)) {
            throw new Error('Username already exists');
        }

        const user = {
            id: `user_${this.idCounter++}`,
            username: userData.username,
            email: userData.email
        };

        this.users.set(userData.username, user);

        return {
            success: true,
            user: user
        };
    }
}
```

### REFACTOR 阶段：优化代码结构

```javascript
/**
 * REFACTOR 阶段示例
 * @description 在测试保护下重构代码
 */

/**
 * 用户实体类
 */
class User {
    /**
     * @param {string} id - 用户ID
     * @param {string} username - 用户名
     * @param {string} email - 邮箱
     */
    constructor(id, username, email) {
        this.id = id;
        this.username = username;
        this.email = email;
        this.createdAt = new Date();
    }
}

/**
 * 用户存储接口
 */
class UserRepository {
    constructor() {
        /** @type {Map<string, User>} */
        this.users = new Map();
    }

    /**
     * 检查用户名是否存在
     * @param {string} username - 用户名
     * @returns {boolean}
     */
    exists(username) {
        return this.users.has(username);
    }

    /**
     * 保存用户
     * @param {User} user - 用户对象
     */
    save(user) {
        this.users.set(user.username, user);
    }

    /**
     * 根据用户名查找用户
     * @param {string} username - 用户名
     * @returns {User|undefined}
     */
    findByUsername(username) {
        return this.users.get(username);
    }
}

/**
 * ID 生成器
 */
class IdGenerator {
    constructor() {
        /** @type {number} */
        this.counter = 1;
    }

    /**
     * 生成用户ID
     * @returns {string}
     */
    generate() {
        return `user_${this.counter++}`;
    }
}

/**
 * 重构后的用户服务
 */
class UserService {
    /**
     * @param {UserRepository} repository - 用户存储
     * @param {IdGenerator} idGenerator - ID生成器
     */
    constructor(repository = new UserRepository(), idGenerator = new IdGenerator()) {
        this.repository = repository;
        this.idGenerator = idGenerator;
    }

    /**
     * 注册新用户
     * @param {Object} userData - 用户数据
     * @returns {Promise<Object>} 注册结果
     * @throws {Error} 用户名已存在时抛出错误
     */
    async register(userData) {
        this.validateUniqueUsername(userData.username);

        const user = this.createUser(userData);
        this.repository.save(user);

        return this.createSuccessResponse(user);
    }

    /**
     * 验证用户名唯一性
     * @param {string} username - 用户名
     * @throws {Error} 用户名已存在时抛出错误
     */
    validateUniqueUsername(username) {
        if (this.repository.exists(username)) {
            throw new Error('Username already exists');
        }
    }

    /**
     * 创建用户对象
     * @param {Object} userData - 用户数据
     * @returns {User}
     */
    createUser(userData) {
        return new User(
            this.idGenerator.generate(),
            userData.username,
            userData.email
        );
    }

    /**
     * 创建成功响应
     * @param {User} user - 用户对象
     * @returns {Object}
     */
    createSuccessResponse(user) {
        return {
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        };
    }
}
```

## TDD 实战案例

### 案例：实现购物车功能

```javascript
/**
 * 购物车 TDD 实战案例
 * @description 完整展示 TDD 开发流程
 */

// ==================== RED 阶段 ====================

describe('ShoppingCart', () => {
    let cart;

    beforeEach(() => {
        cart = new ShoppingCart();
    });

    /**
     * 测试：添加商品到购物车
     */
    it('should add item to cart', () => {
        const item = { id: 'p1', name: 'Product 1', price: 100 };

        cart.addItem(item, 2);

        expect(cart.getItemCount()).toBe(2);
        expect(cart.hasItem('p1')).toBe(true);
    });

    /**
     * 测试：计算总价
     */
    it('should calculate total price correctly', () => {
        cart.addItem({ id: 'p1', name: 'Product 1', price: 100 }, 2);
        cart.addItem({ id: 'p2', name: 'Product 2', price: 50 }, 1);

        expect(cart.getTotal()).toBe(250);
    });

    /**
     * 测试：移除商品
     */
    it('should remove item from cart', () => {
        cart.addItem({ id: 'p1', name: 'Product 1', price: 100 }, 2);
        
        cart.removeItem('p1');

        expect(cart.hasItem('p1')).toBe(false);
        expect(cart.getItemCount()).toBe(0);
    });

    /**
     * 测试：更新商品数量
     */
    it('should update item quantity', () => {
        cart.addItem({ id: 'p1', name: 'Product 1', price: 100 }, 2);
        
        cart.updateQuantity('p1', 5);

        expect(cart.getItemCount()).toBe(5);
        expect(cart.getTotal()).toBe(500);
    });

    /**
     * 测试：数量为0时移除商品
     */
    it('should remove item when quantity is zero', () => {
        cart.addItem({ id: 'p1', name: 'Product 1', price: 100 }, 2);
        
        cart.updateQuantity('p1', 0);

        expect(cart.hasItem('p1')).toBe(false);
    });

    /**
     * 测试：清空购物车
     */
    it('should clear all items', () => {
        cart.addItem({ id: 'p1', name: 'Product 1', price: 100 }, 2);
        cart.addItem({ id: 'p2', name: 'Product 2', price: 50 }, 1);
        
        cart.clear();

        expect(cart.getItemCount()).toBe(0);
        expect(cart.getTotal()).toBe(0);
    });
});

// ==================== GREEN 阶段 ====================

/**
 * 购物车类
 * @description 最小实现，刚好通过测试
 */
class ShoppingCart {
    constructor() {
        /** @type {Map<string, Object>} */
        this.items = new Map();
    }

    /**
     * 添加商品
     * @param {Object} product - 商品信息
     * @param {number} quantity - 数量
     */
    addItem(product, quantity) {
        const existing = this.items.get(product.id);
        if (existing) {
            existing.quantity += quantity;
        } else {
            this.items.set(product.id, {
                ...product,
                quantity: quantity
            });
        }
    }

    /**
     * 移除商品
     * @param {string} productId - 商品ID
     */
    removeItem(productId) {
        this.items.delete(productId);
    }

    /**
     * 更新商品数量
     * @param {string} productId - 商品ID
     * @param {number} quantity - 新数量
     */
    updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            this.removeItem(productId);
        } else {
            const item = this.items.get(productId);
            if (item) {
                item.quantity = quantity;
            }
        }
    }

    /**
     * 检查商品是否存在
     * @param {string} productId - 商品ID
     * @returns {boolean}
     */
    hasItem(productId) {
        return this.items.has(productId);
    }

    /**
     * 获取商品总数量
     * @returns {number}
     */
    getItemCount() {
        let count = 0;
        for (const item of this.items.values()) {
            count += item.quantity;
        }
        return count;
    }

    /**
     * 计算总价
     * @returns {number}
     */
    getTotal() {
        let total = 0;
        for (const item of this.items.values()) {
            total += item.price * item.quantity;
        }
        return total;
    }

    /**
     * 清空购物车
     */
    clear() {
        this.items.clear();
    }
}

// ==================== REFACTOR 阶段 ====================

/**
 * 购物车商品项
 */
class CartItem {
    /**
     * @param {string} id - 商品ID
     * @param {string} name - 商品名称
     * @param {number} price - 单价
     * @param {number} quantity - 数量
     */
    constructor(id, name, price, quantity) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.quantity = quantity;
    }

    /**
     * 计算小计
     * @returns {number}
     */
    getSubtotal() {
        return this.price * this.quantity;
    }

    /**
     * 增加数量
     * @param {number} amount - 增加数量
     */
    increase(amount) {
        this.quantity += amount;
    }

    /**
     * 更新数量
     * @param {number} newQuantity - 新数量
     */
    updateQuantity(newQuantity) {
        this.quantity = Math.max(0, newQuantity);
    }
}

/**
 * 重构后的购物车
 */
class ShoppingCart {
    constructor() {
        /** @type {Map<string, CartItem>} */
        this.items = new Map();
    }

    /**
     * 添加商品
     * @param {Object} product - 商品信息
     * @param {number} quantity - 数量
     */
    addItem(product, quantity) {
        const existing = this.items.get(product.id);
        if (existing) {
            existing.increase(quantity);
        } else {
            this.items.set(
                product.id,
                new CartItem(product.id, product.name, product.price, quantity)
            );
        }
    }

    /**
     * 移除商品
     * @param {string} productId - 商品ID
     */
    removeItem(productId) {
        this.items.delete(productId);
    }

    /**
     * 更新商品数量
     * @param {string} productId - 商品ID
     * @param {number} quantity - 新数量
     */
    updateQuantity(productId, quantity) {
        if (quantity <= 0) {
            this.removeItem(productId);
            return;
        }

        const item = this.items.get(productId);
        if (item) {
            item.updateQuantity(quantity);
        }
    }

    /**
     * 检查商品是否存在
     * @param {string} productId - 商品ID
     * @returns {boolean}
     */
    hasItem(productId) {
        return this.items.has(productId);
    }

    /**
     * 获取商品总数量
     * @returns {number}
     */
    getItemCount() {
        return Array.from(this.items.values())
            .reduce((sum, item) => sum + item.quantity, 0);
    }

    /**
     * 计算总价
     * @returns {number}
     */
    getTotal() {
        return Array.from(this.items.values())
            .reduce((sum, item) => sum + item.getSubtotal(), 0);
    }

    /**
     * 清空购物车
     */
    clear() {
        this.items.clear();
    }

    /**
     * 获取所有商品
     * @returns {CartItem[]}
     */
    getAllItems() {
        return Array.from(this.items.values());
    }
}
```

## 测试金字塔与 TDD

### 测试层次结构

```
                    ┌───────────┐
                    │   E2E     │  少量端到端测试
                    │  Tests    │  验证完整流程
                    └─────┬─────┘
                          │
                ┌─────────┴─────────┐
                │   Integration     │  中量集成测试
                │     Tests         │  验证模块交互
                └─────────┬─────────┘
                          │
        ┌─────────────────┴─────────────────┐
        │           Unit Tests              │  大量单元测试
        │        (TDD 核心区域)              │  快速、隔离、精准
        └───────────────────────────────────┘
```

### 各层测试示例

```javascript
/**
 * 单元测试层 - TDD 核心
 * @description 快速、隔离、精准的测试
 */
describe('PriceCalculator (Unit)', () => {
    let calculator;

    beforeEach(() => {
        calculator = new PriceCalculator();
    });

    it('should calculate basic price', () => {
        const result = calculator.calculate(100, 2);
        expect(result).toBe(200);
    });

    it('should apply discount correctly', () => {
        const result = calculator.calculate(100, 2, 0.1);
        expect(result).toBe(180);
    });
});

/**
 * 集成测试层
 * @description 验证模块之间的交互
 */
describe('OrderService (Integration)', () => {
    let orderService;
    let paymentGateway;
    let inventoryService;

    beforeEach(() => {
        paymentGateway = new MockPaymentGateway();
        inventoryService = new MockInventoryService();
        orderService = new OrderService(paymentGateway, inventoryService);
    });

    it('should create order and update inventory', async () => {
        const order = await orderService.createOrder({
            items: [{ productId: 'p1', quantity: 2 }]
        });

        expect(order.status).toBe('confirmed');
        expect(inventoryService.getStock('p1')).toBe(8);
    });
});

/**
 * E2E 测试层
 * @description 验证完整业务流程
 */
describe('Shopping Flow (E2E)', () => {
    it('should complete full purchase flow', async () => {
        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.goto('http://localhost:3000');
        await page.click('[data-testid="product-1"]');
        await page.click('[data-testid="add-to-cart"]');
        await page.click('[data-testid="checkout"]');
        await page.type('[data-testid="card-number"]', '4111111111111111');
        await page.click('[data-testid="submit-order"]');

        const successMessage = await page.$eval(
            '[data-testid="order-success"]',
            el => el.textContent
        );

        expect(successMessage).toContain('Order confirmed');

        await browser.close();
    });
});
```

## 最佳实践清单

### 测试编写原则

| 原则 | 描述 | 示例 |
|------|------|------|
| FIRST | Fast, Independent, Repeatable, Self-validating, Timely | 测试应快速独立可重复 |
| AAA | Arrange, Act, Assert | 准备、执行、断言三段式 |
| 单一职责 | 每个测试只验证一个行为 | 一个 it 块一个断言点 |
| 命名清晰 | 测试名描述期望行为 | `should_return_error_when_input_invalid` |
| 边界覆盖 | 测试边界条件和异常情况 | 空值、极值、非法输入 |

### TDD 开发清单

```markdown
## RED 阶段清单
- [ ] 理解需求，明确期望行为
- [ ] 编写描述性的测试名称
- [ ] 编写失败的测试（断言失败）
- [ ] 确认测试失败原因正确
- [ ] 测试代码简洁明了

## GREEN 阶段清单
- [ ] 编写最少代码使测试通过
- [ ] 不考虑性能和优雅
- [ ] 可以使用硬编码
- [ ] 确认测试通过
- [ ] 不添加测试未要求的功能

## REFACTOR 阶段清单
- [ ] 消除重复代码
- [ ] 优化命名和结构
- [ ] 提取常量和配置
- [ ] 应用设计模式
- [ ] 确保测试仍然通过
- [ ] 提交代码
```

### 测试代码质量

```javascript
/**
 * 好的测试示例
 * @description 清晰、独立、可读
 */
describe('UserService', () => {
    describe('register', () => {
        it('should create user with valid data', async () => {
            // Arrange - 准备
            const service = new UserService();
            const userData = {
                username: 'testuser',
                email: 'test@example.com'
            };

            // Act - 执行
            const result = await service.register(userData);

            // Assert - 断言
            expect(result.success).toBe(true);
            expect(result.user.username).toBe('testuser');
        });

        it('should reject duplicate username', async () => {
            // Arrange
            const service = new UserService();
            await service.register({ username: 'existing', email: 'a@b.com' });

            // Act & Assert
            await expect(
                service.register({ username: 'existing', email: 'c@d.com' })
            ).rejects.toThrow('Username already exists');
        });
    });
});

/**
 * 不好的测试示例
 * @description 避免这些反模式
 */
describe('Bad Tests', () => {
    // ❌ 测试多个行为
    it('should do everything', () => {
        const result = service.doAll();
        expect(result.status).toBe('ok');
        expect(result.count).toBe(5);
        expect(result.items).toHaveLength(5);
        expect(result.total).toBe(100);
    });

    // ❌ 测试依赖外部状态
    it('depends on previous test', () => {
        expect(sharedState.value).toBe('modified');
    });

    // ❌ 测试名称不清晰
    it('test1', () => {
        expect(service.run()).toBe(true);
    });

    // ❌ 测试实现细节
    it('should call internal method', () => {
        const spy = jest.spyOn(service, '_internalMethod');
        service.execute();
        expect(spy).toHaveBeenCalled();
    });
});
```

## 常见反模式

### 反模式：跳过测试

```javascript
// ❌ 跳过失败的测试
it.skip('should work correctly', () => {
    // 被跳过的测试会隐藏问题
});

// ✅ 修复测试或记录为已知问题
it('should work correctly @known-issue', () => {
    // 记录问题并计划修复
});
```

### 反模式：测试私有方法

```javascript
// ❌ 直接测试私有方法
it('should validate internal state', () => {
    expect(service._validate()).toBe(true);
});

// ✅ 通过公共接口测试
it('should reject invalid input', () => {
    expect(() => service.process(invalidInput))
        .toThrow(ValidationError);
});
```

### 反模式：过度 Mock

```javascript
// ❌ Mock 一切
it('should work', () => {
    const mockDb = { find: jest.fn().mockReturnValue({}) };
    const mockCache = { get: jest.fn().mockReturnValue(null) };
    const mockLogger = { log: jest.fn() };
    const mockValidator = { validate: jest.fn().mockReturnValue(true) };
    // 测试变成了 mock 测试
});

// ✅ 只 Mock 外部依赖
it('should fetch user from database', async () => {
    const mockDb = createMockDatabase();
    mockDb.users.insert({ id: 1, name: 'Test' });

    const service = new UserService(mockDb);
    const user = await service.findById(1);

    expect(user.name).toBe('Test');
});
```

### 反模式：断言不足

```javascript
// ❌ 没有断言
it('should not throw', () => {
    service.execute(); // 没有验证结果
});

// ✅ 明确断言
it('should return success result', () => {
    const result = service.execute();
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
});
```

## TDD 与其他实践结合

### TDD + CI/CD

```yaml
# .github/workflows/test.yml
name: TDD Pipeline

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:coverage
      - name: Coverage Report
        uses: codecov/codecov-action@v3
```

### TDD + 代码审查

```markdown
## TDD 代码审查清单

### 测试质量
- [ ] 测试是否覆盖所有业务场景
- [ ] 测试是否清晰描述期望行为
- [ ] 是否有边界条件测试
- [ ] 是否有异常情况测试

### 实现质量
- [ ] 代码是否是测试驱动的
- [ ] 是否有过度设计
- [ ] 重构是否充分

### 覆盖率
- [ ] 单元测试覆盖率 > 80%
- [ ] 关键路径覆盖率 100%
```

## Quick Reference: TDD 流程

| 阶段 | 目标 | 行动 | 验证 |
|------|------|------|------|
| RED | 定义期望 | 写失败的测试 | 测试必须失败 |
| GREEN | 实现功能 | 写最少代码 | 测试必须通过 |
| REFACTOR | 优化代码 | 重构不改变行为 | 测试仍通过 |

**Remember**: TDD 的核心不是测试，而是通过测试驱动设计。测试是手段，高质量代码才是目的。先写测试让你思考接口设计，再写实现让你专注当前需求，最后重构让你持续改进代码质量。
