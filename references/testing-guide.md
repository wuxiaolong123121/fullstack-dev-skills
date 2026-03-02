# 测试策略指南

## 测试金字塔

```
        /\
       /  \
      / E2E \        端到端测试 (慢、贵、少)
     /------\
    /        \
   /Integration\     集成测试 (中等)
  /------------\
 /              \
/   Unit Tests   \    单元测试 (快、便宜、多)
------------------
```

## 单元测试

### Vitest 配置

```typescript
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'dist/', '**/*.test.ts']
    }
  }
})
```

### 测试示例

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { UserService } from './user.service'
import { UserRepository } from './user.repository'

describe('UserService', () => {
  let service: UserService
  let mockRepo: UserRepository

  beforeEach(() => {
    mockRepo = {
      findById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    } as any
    
    service = new UserService(mockRepo)
  })

  describe('getUser', () => {
    it('should return user when found', async () => {
      const mockUser = { id: '1', name: 'Test', email: 'test@example.com' }
      vi.mocked(mockRepo.findById).mockResolvedValue(mockUser)

      const result = await service.getUser('1')

      expect(result).toEqual(mockUser)
      expect(mockRepo.findById).toHaveBeenCalledWith('1')
    })

    it('should throw error when user not found', async () => {
      vi.mocked(mockRepo.findById).mockResolvedValue(null)

      await expect(service.getUser('999')).rejects.toThrow('User not found')
    })
  })
})
```

## 集成测试

### API 测试

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { app } from './app'
import { setupDatabase, cleanupDatabase } from './test-utils'

describe('User API', () => {
  beforeAll(async () => {
    await setupDatabase()
  })

  afterAll(async () => {
    await cleanupDatabase()
  })

  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test User',
          email: 'test@example.com',
          password: 'SecurePass123!'
        })
        .expect(201)

      expect(response.body.data).toMatchObject({
        name: 'Test User',
        email: 'test@example.com'
      })
      expect(response.body.data).not.toHaveProperty('password')
    })

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          name: 'Test User',
          email: 'invalid-email',
          password: 'SecurePass123!'
        })
        .expect(400)

      expect(response.body.errors).toContainEqual({
        field: 'email',
        message: expect.any(String)
      })
    })
  })
})
```

### 数据库测试

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { UserRepository } from './user.repository'

const prisma = new PrismaClient()
const repository = new UserRepository(prisma)

describe('UserRepository', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  it('should create and find user', async () => {
    const created = await repository.create({
      email: 'test@example.com',
      name: 'Test User',
      password: 'hashed'
    })

    const found = await repository.findById(created.id)

    expect(found).toEqual(created)
  })
})
```

## E2E 测试

### Playwright 配置

```typescript
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure'
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
})
```

### E2E 测试示例

```typescript
import { test, expect } from '@playwright/test'

test.describe('User Registration', () => {
  test('should register new user successfully', async ({ page }) => {
    await page.goto('/register')

    await page.fill('[name="name"]', 'Test User')
    await page.fill('[name="email"]', 'test@example.com')
    await page.fill('[name="password"]', 'SecurePass123!')
    await page.fill('[name="confirmPassword"]', 'SecurePass123!')

    await page.click('button[type="submit"]')

    await expect(page).toHaveURL('/dashboard')
    await expect(page.locator('.welcome-message')).toContainText('Test User')
  })

  test('should show validation errors', async ({ page }) => {
    await page.goto('/register')

    await page.click('button[type="submit"]')

    await expect(page.locator('.error-message')).toHaveCount(3)
  })
})
```

## Mock 策略

### 函数 Mock

```typescript
import { vi } from 'vitest'

const mockFetch = vi.fn()
global.fetch = mockFetch

mockFetch.mockResolvedValue({
  ok: true,
  json: () => Promise.resolve({ data: 'test' })
})
```

### 模块 Mock

```typescript
vi.mock('./external-api', () => ({
  fetchData: vi.fn().mockResolvedValue({ data: 'mocked' })
}))
```

### 时间 Mock

```typescript
vi.useFakeTimers()

const now = new Date('2024-01-01')
vi.setSystemTime(now)

vi.useRealTimers()
```

## 测试覆盖率

### 覆盖率目标

| 类型 | 目标覆盖率 |
|------|-----------|
| 关键业务逻辑 | 90%+ |
| API 端点 | 80%+ |
| 工具函数 | 70%+ |
| UI 组件 | 50%+ |

### 覆盖率报告

```bash
vitest run --coverage
```

## 测试最佳实践

1. **AAA 模式**: Arrange, Act, Assert
2. **单一职责**: 每个测试只验证一个行为
3. **描述性命名**: 测试名称应描述预期行为
4. **隔离性**: 测试之间不应有依赖
5. **确定性**: 相同输入应产生相同结果
6. **快速**: 单元测试应在毫秒级完成

---

## Agentic Engineering 测试模式

### First Run the Tests 模式

自动化测试在使用编码代理时不再是可选的。

#### 为什么必须运行测试
- 旧借口（测试耗时、频繁重写成本高）不再成立
- AI 可以在几分钟内生成测试
- 确保生成代码实际工作
- 帮助代理了解代码库

#### 会话初始化测试运行

```javascript
/**
 * 会话开始时的测试运行
 * @description 四字提示词触发完整测试流程
 */
const sessionInit = {
    prompt: 'First run the tests',
    purposes: [
        '告诉代理存在测试套件',
        '让代理了解项目规模',
        '建立测试优先思维模式',
        '确保未来修改会运行测试'
    ]
};
```

#### 特定项目测试命令

```javascript
/**
 * 项目特定测试命令
 */
const testCommands = {
    python: 'uv run pytest',
    node: 'npm test',
    rust: 'cargo test',
    go: 'go test ./...',
    dotnet: 'dotnet test'
};
```

### 测试不可替代性原则

#### 典型陷阱

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
        solution: '必须实际运行测试验证'
    }
};
```

#### 测试策略增强

```markdown
## AI 生成代码测试清单

### 功能测试
- [ ] 核心功能是否正确实现？
- [ ] 边缘情况是否处理？
- [ ] 错误处理是否完善？

### 安全测试
- [ ] 输入验证是否充分？
- [ ] 是否有注入漏洞？
- [ ] 敏感数据是否安全？

### 性能测试
- [ ] 响应时间是否可接受？
- [ ] 资源使用是否合理？
- [ ] 是否有性能瓶颈？
```

### 测试作为代码库理解工具

```javascript
/**
 * 通过测试理解代码库
 * @description 测试是最好的文档
 */
const testsAsDocumentation = {
    benefits: [
        '展示 API 使用方式',
        '说明预期行为',
        '揭示业务规则',
        '暴露边缘情况'
    ],
    approach: {
        step1: '运行测试套件',
        step2: '阅读相关测试代码',
        step3: '理解测试断言',
        step4: '推断功能实现'
    }
};
```

### Red/Green TDD 快捷提示

```javascript
/**
 * 四字提示词支持
 */
const tddShortcuts = {
    'Use red/green TDD': {
        meaning: '使用测试驱动开发，先写测试，确认失败，再实现',
        usage: '实现新功能时'
    },
    'First run the tests': {
        meaning: '会话开始时运行测试，了解项目状态',
        usage: '开始新的 AI 会话时'
    },
    'Add test for edge case': {
        meaning: '为边缘情况添加测试',
        usage: '发现潜在问题时'
    }
};
```
