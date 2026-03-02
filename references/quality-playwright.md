# Playwright 测试专家参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 E2E 测试、视觉测试、浏览器自动化、Page Object 模式

## 核心特性

Playwright 是微软开发的现代 Web 测试框架，支持：
- 跨浏览器测试（Chromium、Firefox、WebKit）
- 自动等待与重试机制
- 强大的选择器引擎
- 视觉回归测试
- 并行执行与分片
- 网络拦截与模拟
- 追踪查看器调试

## 安装与配置

```bash
# 初始化 Playwright
npm init playwright@latest

# 或手动安装
npm install -D @playwright/test
npx playwright install
```

### playwright.config.ts 配置

```typescript
import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 测试配置
 * @description 配置测试运行环境、浏览器、并行策略等
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
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

## Page Object 模式

### 基础 Page Object

```typescript
import { Locator, Page } from '@playwright/test';

/**
 * 登录页面 Page Object
 * @description 封装登录页面的元素定位与操作
 */
export class LoginPage {
  readonly page: Page;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly loginButton: Locator;
  readonly errorMessage: Locator;

  /**
   * 构造函数
   * @param page - Playwright Page 实例
   */
  constructor(page: Page) {
    this.page = page;
    this.usernameInput = page.locator('[data-testid="username"]');
    this.passwordInput = page.locator('[data-testid="password"]');
    this.loginButton = page.locator('[data-testid="login-btn"]');
    this.errorMessage = page.locator('[data-testid="error-message"]');
  }

  /**
   * 导航到登录页面
   * @returns Promise<void>
   */
  async goto(): Promise<void> {
    await this.page.goto('/login');
  }

  /**
   * 执行登录操作
   * @param username - 用户名
   * @param password - 密码
   * @returns Promise<void>
   */
  async login(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
    await this.loginButton.click();
  }

  /**
   * 获取错误消息文本
   * @returns Promise<string> 错误消息内容
   */
  async getErrorMessage(): Promise<string> {
    return await this.errorMessage.textContent() ?? '';
  }
}
```

### 测试文件示例

```typescript
import { expect, test } from '@playwright/test';
import { LoginPage } from '../pages/login-page';

test.describe('登录功能测试', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  /**
   * 测试成功登录场景
   */
  test('使用有效凭据应成功登录', async ({ page }) => {
    await loginPage.login('testuser', 'password123');
    
    await expect(page).toHaveURL(/.*dashboard/);
    await expect(page.locator('[data-testid="welcome"]')).toBeVisible();
  });

  /**
   * 测试登录失败场景
   */
  test('使用无效凭据应显示错误消息', async () => {
    await loginPage.login('invalid', 'wrong');
    
    await expect(loginPage.errorMessage).toBeVisible();
    await expect(loginPage.errorMessage).toContainText('用户名或密码错误');
  });
});
```

## 高级选择器

```typescript
import { expect, test } from '@playwright/test';

test.describe('选择器示例', () => {
  /**
   * 测试各种选择器策略
   */
  test('选择器最佳实践', async ({ page }) => {
    await page.goto('/products');

    // 推荐：使用 data-testid
    const productCard = page.getByTestId('product-card');
    
    // 文本选择器
    const submitBtn = page.getByRole('button', { name: '提交' });
    
    // 标签关联选择器
    const emailInput = page.getByLabel('邮箱地址');
    
    // 占位符选择器
    const searchInput = page.getByPlaceholder('搜索商品...');
    
    // 组合选择器
    const activeItem = page.locator('.item').filter({ hasText: '激活' });
    
    // 链式选择器
    const nestedElement = page
      .locator('.sidebar')
      .locator('.menu-item')
      .nth(2);

    await expect(productCard).toBeVisible();
  });
});
```

## 网络拦截与模拟

```typescript
import { expect, test } from '@playwright/test';

test.describe('API 模拟测试', () => {
  /**
   * 测试 API 响应模拟
   */
  test('模拟 API 响应', async ({ page }) => {
    // 拦截并模拟 API 响应
    await page.route('**/api/users', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          users: [
            { id: 1, name: '测试用户' },
            { id: 2, name: '模拟用户' },
          ],
        }),
      });
    });

    await page.goto('/users');
    
    await expect(page.getByText('测试用户')).toBeVisible();
  });

  /**
   * 测试网络错误处理
   */
  test('模拟网络错误', async ({ page }) => {
    await page.route('**/api/data', (route) => route.abort('failed'));

    await page.goto('/dashboard');
    
    await expect(page.getByTestId('error-boundary')).toBeVisible();
  });

  /**
   * 测试请求验证
   */
  test('验证请求参数', async ({ page }) => {
    let requestBody: unknown;

    await page.route('**/api/login', async (route, request) => {
      requestBody = request.postDataJSON();
      await route.continue();
    });

    await page.goto('/login');
    await page.fill('[name="username"]', 'testuser');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    expect(requestBody).toEqual({
      username: 'testuser',
      password: 'password123',
    });
  });
});
```

## 视觉回归测试

```typescript
import { expect, test } from '@playwright/test';

test.describe('视觉回归测试', () => {
  /**
   * 全页面截图对比
   */
  test('首页视觉回归', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });

  /**
   * 元素级截图对比
   */
  test('组件视觉回归', async ({ page }) => {
    await page.goto('/components/button');
    
    const button = page.getByTestId('primary-button');
    await expect(button).toHaveScreenshot('primary-button.png', {
      maxDiffPixels: 100,
    });
  });

  /**
   * 多状态截图
   */
  test('按钮多状态视觉测试', async ({ page }) => {
    await page.goto('/components/button');
    
    const button = page.getByTestId('primary-button');
    
    // 默认状态
    await expect(button).toHaveScreenshot('button-default.png');
    
    // 悬停状态
    await button.hover();
    await expect(button).toHaveScreenshot('button-hover.png');
    
    // 聚焦状态
    await button.focus();
    await expect(button).toHaveScreenshot('button-focus.png');
  });
});
```

## 并行执行与分片

```typescript
// 并行测试配置
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // 完全并行模式
  fullyParallel: true,
  
  // 工作进程数
  workers: process.env.CI ? 4 : '50%',
  
  // 分片配置（CI 环境）
  // npx playwright test --shard=1/3
  // npx playwright test --shard=2/3
  // npx playwright test --shard=3/3
});
```

### 测试隔离示例

```typescript
import { expect, test } from '@playwright/test';

test.describe.serial('用户流程测试', () => {
  /**
   * 步骤1：创建用户
   */
  test('创建用户', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: { name: '测试用户', email: 'test@example.com' },
    });
    
    expect(response.ok()).toBeTruthy();
  });

  /**
   * 步骤2：验证用户存在
   */
  test('验证用户存在', async ({ request }) => {
    const response = await request.get('/api/users/test@example.com');
    expect(response.ok()).toBeTruthy();
  });

  /**
   * 步骤3：删除用户
   */
  test('删除用户', async ({ request }) => {
    const response = await request.delete('/api/users/test@example.com');
    expect(response.ok()).toBeTruthy();
  });
});
```

## 调试与追踪

```typescript
import { expect, test } from '@playwright/test';

test.describe('调试示例', () => {
  test.use({
    // 启用追踪
    trace: 'on',
    // 启用截图
    screenshot: 'on',
    // 启用视频
    video: 'on',
  });

  /**
   * 调试模式测试
   */
  test('调试断点示例', async ({ page }) => {
    await page.goto('/dashboard');
    
    // 使用 page.pause() 设置断点
    // await page.pause();
    
    // 使用 debug 模式运行
    // npx playwright test --debug
    
    await expect(page.getByTestId('dashboard-content')).toBeVisible();
  });

  /**
   * 追踪查看器
   */
  test('追踪分析示例', async ({ page, context }) => {
    await page.goto('/complex-flow');
    
    // 执行复杂操作
    await page.click('[data-testid="start-flow"]');
    await page.waitForSelector('[data-testid="flow-complete"]');
    
    // 追踪会自动保存
    // 使用 npx playwright show-trace trace.zip 查看
  });
});
```

## 最佳实践

### 测试数据管理

```typescript
import { test as base } from '@playwright/test';

/**
 * 测试数据类型定义
 */
interface TestData {
  user: {
    id: string;
    name: string;
    email: string;
  };
}

/**
 * 扩展测试夹具
 */
const test = base.extend<TestData>({
  user: async ({ request }, use) => {
    // 创建测试用户
    const response = await request.post('/api/test-users', {
      data: { name: '测试用户', email: 'test@example.com' },
    });
    const user = await response.json();
    
    // 提供测试数据
    await use(user);
    
    // 清理测试数据
    await request.delete(`/api/test-users/${user.id}`);
  },
});

test('使用测试夹具', async ({ page, user }) => {
  await page.goto('/profile');
  await expect(page.getByText(user.name)).toBeVisible();
});
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `getByTestId()` | 推荐：data-testid 选择器 | `page.getByTestId('submit-btn')` |
| `getByRole()` | 语义化角色选择器 | `page.getByRole('button', { name: '提交' })` |
| `getByText()` | 文本内容选择器 | `page.getByText('欢迎')` |
| `getByLabel()` | 表单标签选择器 | `page.getByLabel('用户名')` |
| `getByPlaceholder()` | 占位符选择器 | `page.getByPlaceholder('请输入...')` |
| `locator.filter()` | 过滤定位器 | `locator.filter({ hasText: '激活' })` |
| `route.fulfill()` | 模拟响应 | `route.fulfill({ status: 200 })` |
| `route.abort()` | 中断请求 | `route.abort('failed')` |
| `toHaveScreenshot()` | 视觉断言 | `expect(page).toHaveScreenshot('home.png')` |
| `waitForSelector()` | 等待元素 | `page.waitForSelector('.loaded')` |
| `expect().toBeVisible()` | 可见性断言 | `expect(element).toBeVisible()` |
| `expect().toHaveText()` | 文本断言 | `expect(element).toHaveText('成功')` |
