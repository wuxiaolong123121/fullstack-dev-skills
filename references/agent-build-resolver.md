# 构建错误解决代理 (Build Error Resolver Agent)

## 概述

构建错误解决代理负责编译错误诊断、依赖冲突解决和环境问题修复。它分析构建失败原因，提供具体的解决方案，帮助开发者快速恢复开发流程。

## 核心职责

### 1. 编译错误诊断
- 语法错误定位
- 类型错误分析
- 链接错误排查
- 资源缺失检测

### 2. 依赖冲突解决
- 版本冲突分析
- 依赖树解析
- 锁文件修复
- 包管理器问题

### 3. 环境问题修复
- Node.js 版本问题
- 环境变量配置
- 构建工具配置
- 平台兼容性问题

## 常见错误类型

### JavaScript/TypeScript 错误

| 错误类型 | 描述 | 常见原因 |
|---------|------|---------|
| SyntaxError | 语法错误 | 括号不匹配、缺少分号 |
| TypeError | 类型错误 | null/undefined 访问 |
| ReferenceError | 引用错误 | 变量未定义 |
| ModuleNotFoundError | 模块未找到 | 路径错误、未安装依赖 |

### 构建工具错误

| 错误类型 | 描述 | 常见原因 |
|---------|------|---------|
| ENOENT | 文件不存在 | 路径错误、文件被删除 |
| EACCES | 权限不足 | 文件权限、目录权限 |
| EMFILE | 打开文件过多 | 系统限制、资源泄漏 |
| EADDRINUSE | 端口占用 | 服务未关闭、端口冲突 |

## 错误诊断流程

```
┌─────────────────┐
│  构建失败       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  解析错误信息   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  分类错误类型   │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌───────┐
│ 编译  │ │ 依赖  │
│ 错误  │ │ 错误  │
└───┬───┘ └───┬───┘
    │         │
    └────┬────┘
         │
         ▼
┌─────────────────┐
│  提供解决方案   │
└─────────────────┘
```

## 使用场景

### TypeScript 编译错误
```
错误: Type 'string' is not assignable to type 'number'

代理分析:
- 位置: src/utils.ts:45
- 原因: 函数参数类型不匹配
- 解决方案:
  1. 修改参数类型为 string
  2. 或添加类型转换 Number(value)
```

### 依赖版本冲突
```
错误: npm ERR! ERESOLVE unable to resolve dependency tree

代理分析:
- 冲突: react@18.2.0 vs react-dom@17.0.2
- 原因: 版本不一致
- 解决方案:
  1. npm install --legacy-peer-deps
  2. 或更新 react-dom 到 18.2.0
```

## 错误解决方案库

### 语法错误

#### 缺少括号/花括号
```javascript
// 错误
function add(a, b {
  return a + b;
}

// 修复
function add(a, b) {
  return a + b;
}
```

#### 导入路径错误
```javascript
// 错误
import { foo } from './utils';

// 修复 (检查文件扩展名)
import { foo } from './utils.js';
// 或检查文件是否存在
```

### 类型错误

#### 隐式 any 类型
```typescript
// 错误: Parameter 'x' implicitly has an 'any' type
function process(x) {
  return x.value;
}

// 修复
function process(x: { value: string }) {
  return x.value;
}
```

#### 类型不匹配
```typescript
// 错误: Type 'string' is not assignable to type 'number'
const age: number = "25";

// 修复
const age: number = 25;
// 或
const age: number = parseInt("25");
```

### 依赖错误

#### 模块未找到
```bash
# 错误
Error: Cannot find module 'lodash'

# 解决方案
npm install lodash
# 或
yarn add lodash
```

#### 版本冲突
```bash
# 错误
npm ERR! peer dep missing: react@^16.0.0

# 解决方案
# 方案1: 安装缺失的 peer dependency
npm install react@^16.0.0

# 方案2: 使用 --legacy-peer-deps
npm install --legacy-peer-deps

# 方案3: 更新依赖版本
npm update
```

### 构建配置错误

#### Webpack 配置
```javascript
// 错误: Module not found: Error: Can't resolve './styles.css'

// 解决方案: 检查 loader 配置
module.exports = {
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  }
};
```

#### TypeScript 配置
```json
// 错误: Cannot find module '@/utils'

// 解决方案: 配置路径别名 tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## 错误报告模板

```markdown
## 构建错误诊断报告

### 错误概览
- **错误类型**: [编译/依赖/配置/环境]
- **严重程度**: [阻塞/警告]
- **影响范围**: [开发/生产/两者]

### 原始错误信息
```
[完整的错误堆栈]
```

### 错误分析
- **根本原因**: [原因描述]
- **触发条件**: [触发场景]
- **影响文件**: [文件列表]

### 解决方案

#### 方案 1: [推荐方案]
```bash
# 执行命令
[命令]
```
```javascript
// 代码修改
[修改内容]
```

#### 方案 2: [替代方案]
[替代方案描述]

### 预防措施
1. [预防措施1]
2. [预防措施2]

### 相关文档
- [相关文档链接]
```

## 环境诊断检查

### Node.js 环境
```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version

# 检查全局安装的包
npm list -g --depth=0
```

### 项目依赖
```bash
# 检查依赖树
npm ls

# 检查过时的依赖
npm outdated

# 检查安全漏洞
npm audit
```

### 构建缓存
```bash
# 清理 npm 缓存
npm cache clean --force

# 清理 node_modules
rm -rf node_modules
npm install

# 清理构建产物
rm -rf dist build
```

## 最佳实践

### 1. 错误预防
- 使用 TypeScript 进行类型检查
- 配置 ESLint 进行代码检查
- 使用 husky 进行提交前检查
- 保持依赖版本更新

### 2. 错误处理
- 仔细阅读完整错误信息
- 从第一个错误开始修复
- 记录错误和解决方案
- 使用版本控制回滚

### 3. 环境管理
- 使用 nvm 管理 Node.js 版本
- 锁定依赖版本 (package-lock.json)
- 使用 .nvmrc 指定 Node 版本
- 文档化环境配置

## 常用修复命令

```bash
# 清理并重新安装
rm -rf node_modules package-lock.json
npm install

# 强制清理缓存
npm cache clean --force

# 更新所有依赖
npm update

# 修复安全漏洞
npm audit fix

# 检查重复依赖
npm dedupe

# 重建原生模块
npm rebuild
```

## 相关参考

- [代理系统概述](./agents-overview.md)
- [代码审查代理](./agent-code-reviewer.md)
- [TDD指南代理](./agent-tdd-guide.md)
