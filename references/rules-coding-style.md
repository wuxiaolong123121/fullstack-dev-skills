# 编码风格规则参考

统一的编码风格规范，确保代码一致性、可读性和可维护性。适用于所有编程语言的项目开发。

## When to Activate

- 编写新代码时
- 代码审查时
- 重构现有代码时
- 设计模块/组件时

## Core Principles

### 1. 不可变性原则 (Immutability)

优先使用不可变数据和纯函数，减少副作用，提高代码可预测性。

```javascript
/**
 * Good: 使用不可变操作
 * @param {number[]} numbers - 数字数组
 * @returns {number[]} 新数组
 */
function doubleNumbers(numbers) {
    return numbers.map(n => n * 2);
}

/**
 * Bad: 直接修改原数组
 * @param {number[]} numbers - 数字数组
 * @returns {number[]} 修改后的数组
 */
function doubleNumbers(numbers) {
    for (let i = 0; i < numbers.length; i++) {
        numbers[i] = numbers[i] * 2;
    }
    return numbers;
}
```

```javascript
/**
 * Good: 使用展开运算符创建新对象
 * @param {Object} user - 用户对象
 * @param {string} newEmail - 新邮箱
 * @returns {Object} 更新后的用户对象
 */
function updateEmail(user, newEmail) {
    return { ...user, email: newEmail };
}

/**
 * Bad: 直接修改原对象
 * @param {Object} user - 用户对象
 * @param {string} newEmail - 新邮箱
 * @returns {Object} 修改后的用户对象
 */
function updateEmail(user, newEmail) {
    user.email = newEmail;
    return user;
}
```

### 2. 文件组织规范

#### 标准项目结构

```
project/
├── src/
│   ├── index.js
│   ├── components/
│   │   ├── index.js
│   │   └── Button/
│   │       ├── index.js
│   │       ├── Button.js
│   │       ├── Button.test.js
│   │       └── Button.styles.js
│   ├── services/
│   │   ├── index.js
│   │   └── api.js
│   ├── utils/
│   │   ├── index.js
│   │   └── helpers.js
│   └── constants/
│       └── index.js
├── tests/
│   └── integration/
├── docs/
├── package.json
└── README.md
```

#### 文件内容组织顺序

```javascript
/**
 * 文件头部注释
 * 说明文件用途
 */

/**
 * 1. 导入语句
 * 按类型分组：标准库 → 第三方库 → 项目内部模块
 */
import fs from 'fs';
import path from 'path';

import express from 'express';
import lodash from 'lodash';

import { UserService } from './services';
import { formatDate } from './utils';

/**
 * 2. 常量定义
 */
const MAX_RETRY_COUNT = 3;
const DEFAULT_TIMEOUT = 5000;

/**
 * 3. 类型定义（TypeScript）
 */
interface UserConfig {
    name: string;
    email: string;
}

/**
 * 4. 工具函数
 */
function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * 5. 主要类/函数
 */
class UserManager {
    constructor(config) {
        this.config = config;
    }
}

/**
 * 6. 导出
 */
export { UserManager, validateEmail };
```

### 3. 命名规范

#### 变量命名

```javascript
/**
 * Good: 使用有意义的名称
 */
const userCount = 10;
const isActive = true;
const errorMessage = '操作失败';

/**
 * Bad: 使用无意义缩写
 */
const uc = 10;
const flag = true;
const msg = '操作失败';
```

#### 命名约定对照表

| 类型 | 命名风格 | 示例 |
|------|----------|------|
| 变量 | camelCase | `userName`, `itemCount` |
| 常量 | UPPER_SNAKE_CASE | `MAX_SIZE`, `API_BASE_URL` |
| 函数 | camelCase | `getUserById`, `calculateTotal` |
| 类 | PascalCase | `UserService`, `HttpClient` |
| 接口 | PascalCase | `IUserRepository`, `ILogger` |
| 类型别名 | PascalCase | `UserConfig`, `ApiResponse` |
| 枚举 | PascalCase | `UserRole`, `HttpStatus` |
| 文件名 | kebab-case | `user-service.js`, `api-client.ts` |
| 组件名 | PascalCase | `Button.jsx`, `UserProfile.tsx` |

#### 布尔值命名

```javascript
/**
 * Good: 使用 is/has/can/should 前缀
 */
const isVisible = true;
const hasPermission = false;
const canEdit = true;
const shouldRender = false;
const isLoading = false;
const hasError = true;

/**
 * Bad: 不明确的布尔命名
 */
const visible = true;
const permission = false;
const edit = true;
const render = false;
```

#### 函数命名

```javascript
/**
 * Good: 动词开头，表达意图
 */
function getUserById(id) { }
function calculateTotalPrice(items) { }
function validateEmail(email) { }
function convertToJson(data) { }
function isEmailValid(email) { }

/**
 * Bad: 名词或不明确
 */
function user(id) { }
function price(items) { }
function email(email) { }
```

#### 类命名

```javascript
/**
 * Good: 名词，PascalCase
 */
class UserRepository { }
class EmailService { }
class HttpClient { }
class OrderProcessor { }

/**
 * Bad: 动词或小写开头
 */
class GetUser { }
class emailService { }
```

### 4. 函数设计规范

#### 单一职责原则

```javascript
/**
 * Good: 每个函数只做一件事
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否有效
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否发送成功
 */
function sendVerificationEmail(email) {
    const template = generateEmailTemplate();
    return mailer.send(email, template);
}

/**
 * Bad: 一个函数做多件事
 * @param {string} email - 邮箱地址
 * @returns {boolean} 是否成功
 */
function validateAndSendEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return false;
    }
    const template = generateEmailTemplate();
    return mailer.send(email, template);
}
```

#### 函数参数设计

```javascript
/**
 * Good: 参数不超过3个，使用对象解构
 * @param {Object} options - 配置选项
 * @param {string} options.name - 用户名
 * @param {string} options.email - 邮箱
 * @param {number} options.age - 年龄
 * @returns {Object} 用户对象
 */
function createUser({ name, email, age }) {
    return { name, email, age };
}

/**
 * Bad: 参数过多
 */
function createUser(name, email, age, address, phone, role) {
    return { name, email, age, address, phone, role };
}
```

#### 纯函数优先

```javascript
/**
 * Good: 纯函数，无副作用
 * @param {number} a - 第一个数
 * @param {number} b - 第二个数
 * @returns {number} 总和
 */
function add(a, b) {
    return a + b;
}

/**
 * Bad: 有副作用
 */
let total = 0;
function addToTotal(value) {
    total += value;
    return total;
}
```

### 5. 注释规范

#### JSDoc 中文注释

```javascript
/**
 * 计算购物车总价
 * @param {Object[]} items - 商品列表
 * @param {number} items[].price - 商品单价
 * @param {number} items[].quantity - 商品数量
 * @param {number} discount - 折扣率（0-1）
 * @returns {number} 总价
 * @throws {Error} 当商品列表为空时抛出错误
 * @example
 * const total = calculateTotal([
 *   { price: 100, quantity: 2 },
 *   { price: 50, quantity: 1 }
 * ], 0.9);
 * // 返回: 225
 */
function calculateTotal(items, discount = 1) {
    if (!items || items.length === 0) {
        throw new Error('商品列表不能为空');
    }
    const subtotal = items.reduce((sum, item) => {
        return sum + item.price * item.quantity;
    }, 0);
    return subtotal * discount;
}
```

#### 注释使用场景

```javascript
/**
 * Good: 解释"为什么"，而非"是什么"
 */

// 使用 Math.max 确保最小值为0，避免负数导致的计算错误
const safeValue = Math.max(0, calculatedValue);

// 延迟100ms等待DOM渲染完成后再执行测量
setTimeout(measureElement, 100);

/**
 * Bad: 冗余注释
 */

// 设置 i 等于 0
let i = 0;

// 循环遍历数组
for (const item of items) {
    // 处理每个元素
    process(item);
}
```

### 6. 代码格式规范

#### 缩进与空格

```javascript
/**
 * Good: 统一使用2空格或4空格缩进
 */
function example() {
    if (condition) {
        doSomething();
    }
}

/**
 * Good: 运算符两侧空格
 */
const result = a + b;
const isValid = value !== null && value !== undefined;

/**
 * Good: 逗号后空格
 */
const config = { name: 'test', value: 100 };
const items = [1, 2, 3, 4, 5];
```

#### 代码块与空行

```javascript
/**
 * Good: 逻辑块之间空行分隔
 */
function processOrder(order) {
    // 验证订单
    if (!validateOrder(order)) {
        return null;
    }

    // 计算价格
    const total = calculateTotal(order.items);

    // 创建订单记录
    const record = createOrderRecord(order, total);

    return record;
}

/**
 * Good: 链式调用合理换行
 */
const result = users
    .filter(user => user.isActive)
    .map(user => user.name)
    .sort()
    .join(', ');
```

## 风格检查清单

### 提交前检查

- [ ] **命名规范**
  - [ ] 变量使用 camelCase
  - [ ] 常量使用 UPPER_SNAKE_CASE
  - [ ] 类/组件使用 PascalCase
  - [ ] 文件名使用 kebab-case
  - [ ] 布尔值使用 is/has/can/should 前缀

- [ ] **函数设计**
  - [ ] 函数名使用动词开头
  - [ ] 参数不超过3个
  - [ ] 单一职责原则
  - [ ] 有返回值
  - [ ] 包含 JSDoc 注释

- [ ] **代码组织**
  - [ ] 导入按类型分组
  - [ ] 常量定义在顶部
  - [ ] 相关代码放在一起
  - [ ] 无未使用的导入/变量

- [ ] **不可变性**
  - [ ] 不直接修改函数参数
  - [ ] 使用展开运算符或 Object.assign
  - [ ] 数组使用 map/filter/reduce

- [ ] **错误处理**
  - [ ] 有适当的错误处理
  - [ ] 错误信息有意义
  - [ ] 边界条件已处理

- [ ] **格式规范**
  - [ ] 缩进一致
  - [ ] 无多余空行
  - [ ] 无多余空格
  - [ ] 行长度合理（建议80-120字符）

## Good/Bad 示例对照

### 示例1：用户数据处理

```javascript
/**
 * Good: 清晰、可测试、无副作用
 * @param {Object[]} users - 用户列表
 * @returns {Object[]} 活跃用户列表
 */
function getActiveUsers(users) {
    return users
        .filter(user => user.isActive)
        .map(user => ({
            id: user.id,
            name: user.name,
            email: user.email
        }));
}

/**
 * Bad: 直接修改原数组，命名不清晰
 */
function process(u) {
    const result = [];
    for (let i = 0; i < u.length; i++) {
        if (u[i].active) {
            u[i].processed = true;
            result.push(u[i]);
        }
    }
    return result;
}
```

### 示例2：配置对象处理

```javascript
/**
 * Good: 使用默认值，不可变更新
 * @param {Object} config - 原始配置
 * @param {Object} updates - 更新内容
 * @returns {Object} 新配置对象
 */
function mergeConfig(config, updates) {
    const defaultConfig = {
        timeout: 5000,
        retries: 3,
        debug: false
    };
    return { ...defaultConfig, ...config, ...updates };
}

/**
 * Bad: 直接修改参数，无默认值处理
 */
function updateConfig(config, updates) {
    for (const key in updates) {
        config[key] = updates[key];
    }
    return config;
}
```

### 示例3：异步操作

```javascript
/**
 * Good: 使用 async/await，清晰错误处理
 * @param {string} userId - 用户ID
 * @returns {Promise<Object>} 用户数据
 */
async function fetchUserData(userId) {
    try {
        const response = await api.get(`/users/${userId}`);
        return response.data;
    } catch (error) {
        logger.error(`获取用户数据失败: ${userId}`, error);
        throw new Error(`无法获取用户数据: ${userId}`);
    }
}

/**
 * Bad: 回调地狱，无错误处理
 */
function fetchUserData(userId, callback) {
    api.get(`/users/${userId}`, function(response) {
        callback(response.data);
    });
}
```

### 示例4：条件判断

```javascript
/**
 * Good: 使用早期返回，逻辑清晰
 * @param {Object} user - 用户对象
 * @returns {boolean} 是否可以访问
 */
function canAccess(user) {
    if (!user) {
        return false;
    }
    if (!user.isActive) {
        return false;
    }
    if (user.role !== 'admin' && user.role !== 'editor') {
        return false;
    }
    return true;
}

/**
 * Bad: 嵌套过深，难以阅读
 */
function canAccess(user) {
    if (user) {
        if (user.isActive) {
            if (user.role === 'admin' || user.role === 'editor') {
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    } else {
        return false;
    }
}
```

### 示例5：对象创建

```javascript
/**
 * Good: 使用工厂函数，封装创建逻辑
 * @param {Object} data - 原始数据
 * @returns {Object} 用户对象
 */
function createUser(data) {
    return {
        id: generateId(),
        name: data.name || '匿名用户',
        email: data.email,
        createdAt: new Date().toISOString(),
        isActive: true
    };
}

/**
 * Bad: 直接暴露实现细节
 */
const user = {
    id: Math.random().toString(36).substr(2, 9),
    name: data.name ? data.name : '匿名用户',
    email: data.email,
    createdAt: new Date().toISOString(),
    isActive: true
};
```

## 工具配置参考

### ESLint 配置示例

```javascript
module.exports = {
    env: {
        browser: true,
        es2021: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:import/recommended'
    ],
    rules: {
        'no-unused-vars': 'error',
        'no-var': 'error',
        'prefer-const': 'error',
        'prefer-arrow-callback': 'warn',
        'eqeqeq': ['error', 'always'],
        'curly': ['error', 'all'],
        'max-len': ['warn', { code: 120 }],
        'indent': ['error', 4],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always']
    }
};
```

### Prettier 配置示例

```javascript
module.exports = {
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    semi: true,
    singleQuote: true,
    trailingComma: 'es5',
    bracketSpacing: true,
    arrowParens: 'always',
    endOfLine: 'lf'
};
```

## 快速参考表

| 规范项 | 要求 |
|--------|------|
| 变量命名 | camelCase，有意义 |
| 常量命名 | UPPER_SNAKE_CASE |
| 函数命名 | 动词开头，camelCase |
| 类命名 | PascalCase，名词 |
| 文件命名 | kebab-case |
| 函数参数 | 不超过3个，使用对象解构 |
| 函数长度 | 不超过50行 |
| 行长度 | 不超过120字符 |
| 缩进 | 统一使用空格（2或4） |
| 注释 | JSDoc 中文注释 |

**记住**: 代码是写给人看的，顺便让机器执行。保持一致性比个人偏好更重要。
