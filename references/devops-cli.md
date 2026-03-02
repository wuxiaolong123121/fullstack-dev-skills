# CLI 开发参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 CLI 框架、Shell 集成、命令行工具、参数解析、分发

## 核心特性

命令行界面（CLI）工具开发要点：
- 友好的用户交互体验
- 强大的参数解析能力
- 完善的帮助系统
- 跨平台兼容性
- 易于分发和安装

## CLI 框架选型

### 主流框架对比

```markdown
## Node.js CLI 框架对比

| 框架 | 特点 | 适用场景 |
|------|------|----------|
| Commander.js | 简单易用，功能完整 | 中小型 CLI |
| Yargs | 功能强大，配置灵活 | 复杂 CLI |
| Oclif | 企业级，插件架构 | 大型 CLI |
| CAC | 轻量级，TypeScript 友好 | 小型 CLI |
| Ink | React 风格终端 UI | 交互式 CLI |
```

## Commander.js 实践

### 基础命令定义

```typescript
import { Command } from 'commander';

/**
 * CLI 程序实例
 */
const program = new Command();

/**
 * 配置 CLI 基本信息
 */
program
  .name('mycli')
  .description('一个示例命令行工具')
  .version('1.0.0', '-v, --version', '显示版本信息')
  .helpOption('-h, --help', '显示帮助信息');

/**
 * 定义全局选项
 */
program
  .option('-d, --debug', '启用调试模式')
  .option('-c, --config <path>', '指定配置文件路径')
  .option('--no-color', '禁用彩色输出');

/**
 * 创建用户命令
 */
program
  .command('create <name>')
  .description('创建新项目')
  .option('-t, --template <template>', '指定模板', 'default')
  .option('-f, --force', '强制覆盖已存在的目录')
  .option('--private', '创建私有项目')
  .action(async (name: string, options: CreateOptions) => {
    console.log(`创建项目: ${name}`);
    console.log(`使用模板: ${options.template}`);
    
    if (options.force) {
      console.log('强制模式已启用');
    }
  });

/**
 * 列表命令
 */
program
  .command('list')
  .alias('ls')
  .description('列出所有项目')
  .option('-a, --all', '显示所有项目包括隐藏项目')
  .option('--json', '以 JSON 格式输出')
  .action(async (options: ListOptions) => {
    console.log('列出项目...');
    if (options.all) {
      console.log('包含隐藏项目');
    }
  });

/**
 * 删除命令
 */
program
  .command('remove <name>')
  .alias('rm')
  .description('删除项目')
  .option('-f, --force', '强制删除，不询问确认')
  .action(async (name: string, options: RemoveOptions) => {
    if (!options.force) {
      const confirmed = await confirmAction(`确定要删除项目 ${name} 吗？`);
      if (!confirmed) {
        console.log('操作已取消');
        return;
      }
    }
    console.log(`删除项目: ${name}`);
  });

/**
 * 解析命令行参数
 */
program.parse();

interface CreateOptions {
  template: string;
  force: boolean;
  private: boolean;
}

interface ListOptions {
  all: boolean;
  json: boolean;
}

interface RemoveOptions {
  force: boolean;
}
```

### 子命令与嵌套

```typescript
import { Command } from 'commander';

const program = new Command();

/**
 * 配置命令组
 */
const configCmd = program
  .command('config')
  .description('配置管理命令');

/**
 * 配置查看子命令
 */
configCmd
  .command('get <key>')
  .description('获取配置项')
  .action((key: string) => {
    console.log(`获取配置: ${key}`);
  });

/**
 * 配置设置子命令
 */
configCmd
  .command('set <key> <value>')
  .description('设置配置项')
  .action((key: string, value: string) => {
    console.log(`设置配置: ${key} = ${value}`);
  });

/**
 * 配置列表子命令
 */
configCmd
  .command('list')
  .alias('ls')
  .description('列出所有配置')
  .action(() => {
    console.log('列出所有配置');
  });

/**
 * 配置删除子命令
 */
configCmd
  .command('unset <key>')
  .description('删除配置项')
  .action((key: string) => {
    console.log(`删除配置: ${key}`);
  });

program.parse();
```

## 参数解析

### 参数类型验证

```typescript
import { Command, InvalidArgumentError } from 'commander';

/**
 * 解析整数参数
 * @param value - 参数值
 * @returns 解析后的整数
 * @throws InvalidArgumentError 无效参数错误
 */
function parseInteger(value: string): number {
  const parsedValue = parseInt(value, 10);
  if (isNaN(parsedValue)) {
    throw new InvalidArgumentError('不是有效的整数');
  }
  return parsedValue;
}

/**
 * 解析端口参数
 * @param value - 参数值
 * @returns 解析后的端口号
 * @throws InvalidArgumentError 无效参数错误
 */
function parsePort(value: string): number {
  const port = parseInteger(value);
  if (port < 1 || port > 65535) {
    throw new InvalidArgumentError('端口号必须在 1-65535 范围内');
  }
  return port;
}

/**
 * 解析 URL 参数
 * @param value - 参数值
 * @returns 解析后的 URL
 * @throws InvalidArgumentError 无效参数错误
 */
function parseUrl(value: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new InvalidArgumentError('不是有效的 URL');
  }
}

/**
 * 解析枚举参数
 * @param allowed - 允许的值列表
 * @returns 参数解析函数
 */
function parseEnum<T extends string>(allowed: T[]): (value: string) => T {
  return (value: string): T => {
    if (!allowed.includes(value as T)) {
      throw new InvalidArgumentError(
        `无效的值，允许的值: ${allowed.join(', ')}`
      );
    }
    return value as T;
  };
}

const program = new Command();

program
  .command('server')
  .description('启动服务器')
  .option('-p, --port <port>', '端口号', parsePort, 3000)
  .option('-h, --host <host>', '主机地址', 'localhost')
  .option('-m, --mode <mode>', '运行模式', parseEnum(['dev', 'prod', 'test']), 'dev')
  .option('--api-url <url>', 'API 地址', parseUrl)
  .action((options) => {
    console.log(`启动服务器: ${options.host}:${options.port}`);
    console.log(`运行模式: ${options.mode}`);
    if (options.apiUrl) {
      console.log(`API 地址: ${options.apiUrl}`);
    }
  });

program.parse();
```

### 可变参数处理

```typescript
import { Command } from 'commander';

const program = new Command();

/**
 * 处理可变参数
 */
program
  .command('copy <source> <dest> [extra...]')
  .description('复制文件')
  .action((source: string, dest: string, extra: string[]) => {
    console.log(`源文件: ${source}`);
    console.log(`目标位置: ${dest}`);
    if (extra.length > 0) {
      console.log(`额外目标: ${extra.join(', ')}`);
    }
  });

/**
 * 收集重复选项
 */
program
  .command('search')
  .description('搜索文件')
  .option('-e, --ext <extensions...>', '文件扩展名')
  .option('-i, --include <patterns...>', '包含模式')
  .option('-x, --exclude <patterns...>', '排除模式')
  .action((options) => {
    console.log('搜索配置:', options);
  });

program.parse();
```

## 交互式输入

### Inquirer.js 集成

```typescript
import inquirer from 'inquirer';
import { Command } from 'commander';

const program = new Command();

/**
 * 用户输入提示类型
 */
interface InitAnswers {
  projectName: string;
  template: string;
  features: string[];
  packageManager: string;
  git: boolean;
}

/**
 * 初始化项目命令
 */
program
  .command('init [name]')
  .description('初始化新项目')
  .option('-y, --yes', '使用默认配置')
  .action(async (name?: string, options?: { yes?: boolean }) => {
    if (options?.yes) {
      console.log('使用默认配置初始化项目');
      return;
    }

    const answers = await inquirer.prompt<InitAnswers>([
      {
        type: 'input',
        name: 'projectName',
        message: '项目名称:',
        default: name || 'my-project',
        validate: (input: string) => {
          if (!input.trim()) {
            return '项目名称不能为空';
          }
          if (!/^[a-z0-9-_]+$/.test(input)) {
            return '项目名称只能包含小写字母、数字、连字符和下划线';
          }
          return true;
        },
      },
      {
        type: 'list',
        name: 'template',
        message: '选择模板:',
        choices: [
          { name: 'Vue 3 + TypeScript', value: 'vue-ts' },
          { name: 'React + TypeScript', value: 'react-ts' },
          { name: 'Node.js + TypeScript', value: 'node-ts' },
          { name: '纯 TypeScript', value: 'ts' },
        ],
        default: 'vue-ts',
      },
      {
        type: 'checkbox',
        name: 'features',
        message: '选择功能:',
        choices: [
          { name: 'ESLint', value: 'eslint', checked: true },
          { name: 'Prettier', value: 'prettier', checked: true },
          { name: 'Vitest', value: 'vitest' },
          { name: 'Playwright', value: 'playwright' },
          { name: 'Docker', value: 'docker' },
        ],
      },
      {
        type: 'list',
        name: 'packageManager',
        message: '选择包管理器:',
        choices: ['npm', 'yarn', 'pnpm'],
        default: 'pnpm',
      },
      {
        type: 'confirm',
        name: 'git',
        message: '初始化 Git 仓库?',
        default: true,
      },
    ]);

    console.log('\n项目配置:');
    console.log(JSON.stringify(answers, null, 2));
  });

/**
 * 确认操作
 * @param message - 确认消息
 * @returns 用户是否确认
 */
async function confirmAction(message: string): Promise<boolean> {
  const { confirmed } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      message,
      default: false,
    },
  ]);
  return confirmed;
}

program.parse();
```

### 进度显示

```typescript
import ora from 'ora';
import chalk from 'chalk';

/**
 * 任务执行器
 * @description 执行带进度显示的任务
 */
class TaskRunner {
  private spinner: ora.Ora;

  constructor() {
    this.spinner = ora();
  }

  /**
   * 执行任务
   * @param text - 任务描述
   * @param task - 任务函数
   * @returns 任务结果
   */
  async run<T>(text: string, task: () => Promise<T>): Promise<T> {
    this.spinner.start(text);
    
    try {
      const result = await task();
      this.spinner.succeed(chalk.green(`${text} 完成`));
      return result;
    } catch (error) {
      this.spinner.fail(chalk.red(`${text} 失败`));
      throw error;
    }
  }

  /**
   * 显示信息
   * @param text - 信息文本
   */
  info(text: string): void {
    this.spinner.info(chalk.blue(text));
  }

  /**
   * 显示警告
   * @param text - 警告文本
   */
  warn(text: string): void {
    this.spinner.warn(chalk.yellow(text));
  }
}

/**
 * 使用示例
 */
async function deployProject(): Promise<void> {
  const runner = new TaskRunner();

  await runner.run('检查配置文件', async () => {
    await sleep(500);
  });

  await runner.run('安装依赖', async () => {
    await sleep(1000);
  });

  await runner.run('构建项目', async () => {
    await sleep(2000);
  });

  await runner.run('部署到服务器', async () => {
    await sleep(1500);
  });

  runner.info('部署完成！');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 输出美化

### 彩色输出

```typescript
import chalk from 'chalk';
import cliui from 'cliui';
import boxen from 'boxen';

/**
 * 日志输出器
 */
class Logger {
  /**
   * 信息日志
   * @param message - 消息内容
   */
  static info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  /**
   * 成功日志
   * @param message - 消息内容
   */
  static success(message: string): void {
    console.log(chalk.green('✔'), message);
  }

  /**
   * 警告日志
   * @param message - 消息内容
   */
  static warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  /**
   * 错误日志
   * @param message - 消息内容
   */
  static error(message: string): void {
    console.log(chalk.red('✖'), message);
  }

  /**
   * 调试日志
   * @param message - 消息内容
   */
  static debug(message: string): void {
    if (process.env.DEBUG) {
      console.log(chalk.gray('🔍'), chalk.gray(message));
    }
  }

  /**
   * 标题输出
   * @param title - 标题内容
   */
  static title(title: string): void {
    console.log(boxen(title, {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
    }));
  }

  /**
   * 表格输出
   * @param data - 表格数据
   */
  static table(data: Record<string, string>[]): void {
    const ui = cliui({ width: 80 });
    
    if (data.length > 0) {
      const headers = Object.keys(data[0]);
      ui.div(
        ...headers.map(h => ({
          text: chalk.bold.cyan(h),
          width: Math.floor(80 / headers.length),
        }))
      );
      
      data.forEach(row => {
        ui.div(
          ...Object.values(row).map(v => ({
            text: v,
            width: Math.floor(80 / headers.length),
          }))
        );
      });
    }
    
    console.log(ui.toString());
  }
}

// 使用示例
Logger.title('MyCLI v1.0.0');
Logger.info('正在处理...');
Logger.success('操作成功完成');
Logger.warn('这是一个警告');
Logger.error('发生错误');
Logger.debug('调试信息');

Logger.table([
  { name: '项目A', status: '运行中', port: '3000' },
  { name: '项目B', status: '已停止', port: '3001' },
  { name: '项目C', status: '运行中', port: '3002' },
]);
```

## 分发与安装

### package.json 配置

```json
{
  "name": "mycli",
  "version": "1.0.0",
  "description": "一个示例命令行工具",
  "type": "module",
  "bin": {
    "mycli": "./dist/index.js"
  },
  "files": [
    "dist",
    "README.md"
  ],
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --watch",
    "test": "vitest",
    "lint": "eslint src"
  },
  "keywords": [
    "cli",
    "command-line",
    "tool"
  ],
  "author": "Your Name",
  "license": "MIT",
  "engines": {
    "node": ">=18"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^11.1.0",
    "inquirer": "^9.2.0",
    "ora": "^7.0.0"
  },
  "devDependencies": {
    "@types/inquirer": "^9.0.0",
    "@types/node": "^20.0.0",
    "tsup": "^8.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

### 入口文件

```typescript
#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('mycli')
  .description('一个示例命令行工具')
  .version('1.0.0');

program
  .command('hello <name>')
  .description('打招呼')
  .action((name: string) => {
    console.log(`你好, ${name}!`);
  });

program.parse();
```

## 最佳实践

### CLI 开发检查清单

```markdown
## CLI 开发检查清单

### 用户体验
- [ ] 提供清晰的帮助信息
- [ ] 支持版本查询
- [ ] 友好的错误提示
- [ ] 支持交互式输入
- [ ] 提供进度反馈

### 参数处理
- [ ] 参数验证完整
- [ ] 默认值合理
- [ ] 支持短选项和长选项
- [ ] 参数类型正确
- [ ] 必填参数检查

### 输出格式
- [ ] 彩色输出
- [ ] 支持 JSON 输出
- [ ] 表格格式美观
- [ ] 错误信息清晰

### 兼容性
- [ ] 跨平台支持
- [ ] Node.js 版本兼容
- [ ] Shell 集成
- [ ] 环境变量支持

### 分发
- [ ] npm 发布配置
- [ ] 全局安装测试
- [ ] 更新机制
- [ ] 文档完整
```

## Quick Reference

| 功能 | 库 | 用途 |
|------|-----|------|
| 命令解析 | Commander | 定义命令和选项 |
| 交互输入 | Inquirer | 用户问答交互 |
| 彩色输出 | Chalk | 终端彩色文本 |
| 进度显示 | Ora | 加载动画 |
| 表格输出 | cli-table3 | 表格格式化 |
| 框框输出 | Boxen | 边框文本 |
| 图标符号 | log-symbols | 状态图标 |
| 进度条 | cli-progress | 进度条显示 |
