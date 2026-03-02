# 代码审查专家参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求代码审查、PR Review、质量检查、最佳实践建议

## 核心特性

代码审查是保证代码质量的关键环节：
- 发现潜在缺陷和安全漏洞
- 确保代码符合团队规范
- 促进知识共享与团队成长
- 提高代码可维护性
- 减少技术债务积累

## 审查清单框架

### 通用审查清单

```markdown
## 代码审查清单

### 功能正确性
- [ ] 代码是否实现了需求描述的功能
- [ ] 边界条件是否正确处理
- [ ] 错误处理是否完善
- [ ] 是否有遗漏的场景

### 代码质量
- [ ] 命名是否清晰、有意义
- [ ] 函数长度是否合理（建议 < 50 行）
- [ ] 是否存在重复代码
- [ ] 是否遵循 SOLID 原则

### 性能考量
- [ ] 是否存在性能瓶颈
- [ ] 数据库查询是否优化
- [ ] 是否有不必要的循环或计算
- [ ] 内存使用是否合理

### 安全性
- [ ] 输入是否经过验证和清理
- [ ] 敏感数据是否加密处理
- [ ] 是否存在注入风险
- [ ] 权限检查是否完善

### 可测试性
- [ ] 代码是否易于测试
- [ ] 依赖是否可以模拟
- [ ] 是否有足够的测试覆盖

### 文档与注释
- [ ] 复杂逻辑是否有注释说明
- [ ] API 是否有文档
- [ ] README 是否需要更新
```

### 前端审查清单

```typescript
/**
 * 前端代码审查示例
 * @description 展示前端审查关注点
 */

// ❌ 不推荐：直接使用 any 类型
const processData = (data: any) => {
  return data.map((item: any) => item.value);
};

// ✅ 推荐：使用明确的类型定义
interface DataItem {
  id: string;
  value: number;
}

/**
 * 处理数据列表
 * @param data - 数据项数组
 * @returns 数值数组
 */
const processData = (data: DataItem[]): number[] => {
  return data.map((item) => item.value);
};
```

### 后端审查清单

```typescript
/**
 * 后端代码审查示例
 * @description 展示后端审查关注点
 */
import { Request, Response } from 'express';

// ❌ 不推荐：缺少错误处理和验证
const getUser = async (req: Request, res: Response) => {
  const user = await db.users.findUnique({
    where: { id: req.params.id },
  });
  res.json(user);
};

// ✅ 推荐：完善的错误处理和验证
import { z } from 'zod';

/**
 * 用户 ID 参数验证模式
 */
const userIdSchema = z.object({
  id: z.string().uuid('无效的用户 ID 格式'),
});

/**
 * 获取用户信息
 * @param req - Express 请求对象
 * @param res - Express 响应对象
 * @returns Promise<void>
 */
const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = userIdSchema.parse(req.params);
    
    const user = await db.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        createdAt: true,
      },
    });

    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    res.json(user);
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: '参数验证失败', details: error.errors });
      return;
    }
    
    console.error('获取用户失败:', error);
    res.status(500).json({ error: '服务器内部错误' });
  }
};
```

## 审查反馈模式

### 反馈层级分类

```typescript
/**
 * 审查反馈类型枚举
 * @description 定义反馈的严重程度
 */
enum ReviewFeedbackLevel {
  BLOCKER = 'BLOCKER',
  CRITICAL = 'CRITICAL',
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  SUGGESTION = 'SUGGESTION',
  NITPICK = 'NITPICK',
}

/**
 * 审查反馈接口
 */
interface ReviewFeedback {
  level: ReviewFeedbackLevel;
  file: string;
  line: number;
  message: string;
  suggestion?: string;
}

/**
 * 生成审查反馈示例
 * @returns ReviewFeedback 审查反馈对象
 */
const createFeedback = (): ReviewFeedback => ({
  level: ReviewFeedbackLevel.MAJOR,
  file: 'src/services/user.ts',
  line: 42,
  message: '缺少输入验证，可能导致 SQL 注入风险',
  suggestion: '使用参数化查询或 ORM 方法',
});
```

### 有效反馈模板

```markdown
## 反馈模板

### 问题反馈
**[严重程度]** 问题描述
- 位置：`文件路径:行号`
- 问题：具体描述问题
- 影响：可能造成的影响
- 建议：改进建议或示例代码

### 示例

**[MAJOR]** 缺少空值检查
- 位置：`src/utils/parser.ts:25`
- 问题：`data.items` 可能为 undefined，直接调用 map 会抛出异常
- 影响：当数据为空时导致运行时错误
- 建议：
  ```typescript
  const items = data.items ?? [];
  return items.map(processItem);
  ```
```

## 代码质量度量

### 圈复杂度分析

```typescript
/**
 * 圈复杂度示例
 * @description 展示如何降低复杂度
 */

// ❌ 不推荐：高圈复杂度
const calculateDiscount = (
  customerType: string,
  orderAmount: number,
  memberYears: number,
  hasCoupon: boolean,
  isHoliday: boolean
): number => {
  let discount = 0;

  if (customerType === 'vip') {
    if (memberYears > 5) {
      discount = 0.3;
    } else if (memberYears > 2) {
      discount = 0.2;
    } else {
      discount = 0.1;
    }
  } else if (customerType === 'member') {
    discount = 0.05;
  }

  if (hasCoupon) {
    discount += 0.1;
  }

  if (isHoliday) {
    discount += 0.05;
  }

  return Math.min(discount, 0.5);
};

// ✅ 推荐：使用策略模式降低复杂度
interface DiscountStrategy {
  calculate(memberYears: number): number;
}

/**
 * VIP 折扣策略
 */
class VipDiscountStrategy implements DiscountStrategy {
  /**
   * 计算 VIP 折扣
   * @param memberYears - 会员年限
   * @returns 折扣比例
   */
  calculate(memberYears: number): number {
    if (memberYears > 5) return 0.3;
    if (memberYears > 2) return 0.2;
    return 0.1;
  }
}

/**
 * 普通会员折扣策略
 */
class MemberDiscountStrategy implements DiscountStrategy {
  calculate(): number {
    return 0.05;
  }
}

/**
 * 折扣计算器
 */
class DiscountCalculator {
  private strategies: Record<string, DiscountStrategy> = {
    vip: new VipDiscountStrategy(),
    member: new MemberDiscountStrategy(),
  };

  /**
   * 计算最终折扣
   * @param customerType - 客户类型
   * @param orderAmount - 订单金额
   * @param memberYears - 会员年限
   * @param modifiers - 折扣修饰符
   * @returns 最终折扣比例
   */
  calculate(
    customerType: string,
    orderAmount: number,
    memberYears: number,
    modifiers: { hasCoupon: boolean; isHoliday: boolean }
  ): number {
    const strategy = this.strategies[customerType];
    let discount = strategy?.calculate(memberYears) ?? 0;

    if (modifiers.hasCoupon) discount += 0.1;
    if (modifiers.isHoliday) discount += 0.05;

    return Math.min(discount, 0.5);
  }
}
```

## 安全审查要点

### 常见安全漏洞检测

```typescript
/**
 * 安全审查示例
 * @description 展示常见安全问题及修复
 */

// ❌ 不推荐：SQL 注入风险
const findUser = (username: string) => {
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  return db.execute(query);
};

// ✅ 推荐：使用参数化查询
const findUser = (username: string) => {
  return db.users.findFirst({
    where: { username },
  });
};

// ❌ 不推荐：XSS 风险
const renderComment = (comment: string) => {
  return `<div>${comment}</div>`;
};

// ✅ 推荐：转义输出
import { escape } from 'html-escaper';

const renderComment = (comment: string) => {
  return `<div>${escape(comment)}</div>`;
};

// ❌ 不推荐：敏感信息暴露
const logError = (error: Error, user: User) => {
  console.log(`Error for user ${JSON.stringify(user)}: ${error.message}`);
};

// ✅ 推荐：脱敏处理
const logError = (error: Error, userId: string) => {
  console.log(`Error for user ${userId}: ${error.message}`);
};
```

## 最佳实践

### 审查流程规范

```yaml
review_process:
  auto_assign: true
  required_approvers: 2
  auto_merge: false
  
  checks:
    - name: 代码风格检查
      command: npm run lint
      required: true
      
    - name: 单元测试
      command: npm run test
      required: true
      coverage_threshold: 80
      
    - name: 类型检查
      command: npm run typecheck
      required: true
      
    - name: 安全扫描
      command: npm run security:scan
      required: true

  labels:
    - name: needs-review
      color: yellow
      
    - name: approved
      color: green
      
    - name: changes-requested
      color: red
```

### 审查时间指南

```markdown
## 审查时间建议

| PR 规模 | 建议审查时间 | 审查重点 |
|---------|-------------|----------|
| < 100 行 | 15-30 分钟 | 完整审查 |
| 100-300 行 | 30-60 分钟 | 完整审查 + 架构考量 |
| 300-500 行 | 60-90 分钟 | 分模块审查 |
| > 500 行 | 建议拆分 | 考虑要求拆分 PR |

## 审查优先级

1. **P0 - 紧急**：阻塞发布的问题，4 小时内响应
2. **P1 - 高优先级**：重要功能，1 天内响应
3. **P2 - 正常**：常规功能，2 天内响应
4. **P3 - 低优先级**：优化改进，1 周内响应
```

## Quick Reference

| 审查维度 | 关注点 | 工具/方法 |
|----------|--------|-----------|
| 功能正确性 | 需求实现、边界条件 | 测试用例、手动验证 |
| 代码质量 | 命名、复杂度、重复 | ESLint、SonarQube |
| 性能 | 查询优化、内存使用 | Lighthouse、Profiler |
| 安全性 | 注入、XSS、权限 | SAST、依赖扫描 |
| 可测试性 | 依赖注入、纯函数 | 测试覆盖率报告 |
| 可维护性 | 文档、注释、结构 | 代码复杂度分析 |
| 规范遵循 | 编码风格、最佳实践 | Prettier、ESLint |
| 架构设计 | 模块划分、依赖关系 | 架构图、依赖分析 |
