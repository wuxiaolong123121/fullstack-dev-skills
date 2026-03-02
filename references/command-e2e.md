# /e2e 端到端测试命令 (E2E Command)

## 概述

`/e2e` 命令用于执行端到端测试，基于 Playwright 框架进行浏览器自动化测试，验证完整用户流程和跨系统集成。

## 命令语法

```
/e2e [测试范围] [选项]
```

### 参数说明

| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `[测试范围]` | string | 否 | 测试文件或目录路径 |
| `--headed` | flag | 否 | 显示浏览器窗口 |
| `--debug` | flag | 否 | 调试模式，逐步执行 |
| `--trace` | flag | 否 | 记录执行轨迹 |
| `--video` | flag | 否 | 录制测试视频 |
| `--screenshot` | flag | 否 | 失败时自动截图 |
| `--browser` | string | 否 | 指定浏览器 (chromium/firefox/webkit) |
| `--parallel` | flag | 否 | 并行执行测试 |
| `--reporter` | string | 否 | 报告格式 (list/dot/html/json) |

## 使用示例

### 基础用法
```
/e2e
```

### 指定测试文件
```
/e2e tests/auth.spec.ts
```

### 调试模式
```
/e2e --headed --debug
```

### 完整诊断模式
```
/e2e --trace --video --screenshot
```

### 指定浏览器
```
/e2e --browser firefox --headed
```

### 生成 HTML 报告
```
/e2e --reporter html
```

## 测试结构

### 项目结构
```
e2e/
├── tests/
│   ├── auth/
│   │   ├── login.spec.ts
│   │   └── register.spec.ts
│   ├── cart/
│   │   └── checkout.spec.ts
│   └── user/
│       └── profile.spec.ts
├── pages/
│   ├── LoginPage.ts
│   └── CartPage.ts
├── fixtures/
│   └── test-data.ts
└── playwright.config.ts
```

### 测试文件模板
```typescript
import { test, expect } from '@playwright/test';

test.describe('用户登录流程', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('应该成功登录', async ({ page }) => {
    // 输入凭证
    await page.fill('[data-testid="email"]', 'user@example.com');
    await page.fill('[data-testid="password"]', 'password123');
    
    // 点击登录
    await page.click('[data-testid="login-button"]');
    
    // 验证跳转
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('.welcome-message')).toBeVisible();
  });

  test('应该显示错误提示', async ({ page }) => {
    await page.fill('[data-testid="email"]', 'wrong@example.com');
    await page.fill('[data-testid="password"]', 'wrongpass');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('.error-message')).toContainText('登录失败');
  });
});
```

## Page Object 模式

### Page Object 类
```typescript
// pages/LoginPage.ts
import { Page, Locator } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.emailInput = page.locator('[data-testid="email"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.loginButton = page.locator('[data-testid="login-button"]');
    this.errorMessage = page.locator('.error-message');
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login(email: string, password: string) {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toContainText(message);
  }
}
```

### 使用 Page Object
```typescript
import { test, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';

test('用户登录测试', async ({ page }) => {
  const loginPage = new LoginPage(page);
  
  await loginPage.goto();
  await loginPage.login('user@example.com', 'password123');
  
  await expect(page).toHaveURL('/dashboard');
});
```

## 输出格式

### 测试执行输出
```markdown
## E2E 测试报告

### 执行概览
- **执行时间**: 2024-01-15 14:30:00
- **浏览器**: Chromium
- **总耗时**: 45.2s

### 测试统计
| 指标 | 数值 |
|-----|------|
| 测试文件 | 5 |
| 测试用例 | 23 |
| 通过 | 21 ✅ |
| 失败 | 2 ❌ |
| 跳过 | 0 ⏭️ |

### 测试结果

#### ✅ auth/login.spec.ts
```
  用户登录流程
    ✓ 应该成功登录 (2.3s)
    ✓ 应该显示错误提示 (1.8s)
    ✓ 应该记住登录状态 (3.1s)
```

#### ❌ cart/checkout.spec.ts
```
  购物车结账流程
    ✓ 应该添加商品到购物车 (1.5s)
    ✗ 应该完成支付流程 (5.2s)
      Error: Timeout waiting for element ".payment-success"
      at checkout.spec.ts:45
    ✓ 应该取消订单 (2.1s)
```

### 失败详情

#### 失败 1: 应该完成支付流程
- **文件**: cart/checkout.spec.ts:45
- **错误**: Timeout waiting for element ".payment-success"
- **截图**: screenshots/checkout-failure-1.png
- **轨迹**: traces/checkout-trace.zip

### 覆盖页面
- /login ✅
- /dashboard ✅
- /cart ✅
- /checkout ⚠️
- /profile ✅
```

### HTML 报告
```
生成 HTML 报告: playwright-report/index.html
打开报告: npx playwright show-report
```

## 配置文件

### playwright.config.ts
```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e/tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## 调试技巧

### 1. 使用调试模式
```bash
/e2e --debug
```
- 逐步执行测试
- 查看页面状态
- 检查元素定位

### 2. 使用 Trace Viewer
```bash
/e2e --trace
npx playwright show-trace trace.zip
```
- 查看完整执行轨迹
- 分析每个操作
- 定位问题原因

### 3. 使用 Codegen
```bash
npx playwright codegen http://localhost:3000
```
- 自动生成测试代码
- 录制用户操作
- 学习选择器

## 最佳实践

### 1. 选择器策略
```typescript
// 推荐: 使用 data-testid
await page.locator('[data-testid="submit-button"]').click();

// 避免: 使用 CSS 类名
await page.locator('.btn-primary').click();

// 避免: 使用 XPath
await page.locator('//button[@class="submit"]').click();
```

### 2. 等待策略
```typescript
// 推荐: 自动等待
await expect(page.locator('.result')).toBeVisible();

// 避免: 固定等待
await page.waitForTimeout(1000);
```

### 3. 测试隔离
```typescript
test.describe('测试套件', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前的设置
    await page.goto('/');
  });

  test.afterEach(async ({ page }) => {
    // 每个测试后的清理
    await page.context().clearCookies();
  });
});
```

### 4. 数据管理
```typescript
// 使用 fixtures 管理测试数据
const testData = {
  validUser: {
    email: 'test@example.com',
    password: 'Test123!'
  },
  invalidUser: {
    email: 'wrong@example.com',
    password: 'wrong'
  }
};
```

## 相关命令

- `/tdd` - 测试驱动开发
- `/test-unit` - 单元测试
- `/test-integration` - 集成测试

## 相关参考

- [命令系统概述](./commands-overview.md)
- [TDD命令](./command-tdd.md)
- [TDD指南代理](./agent-tdd-guide.md)
