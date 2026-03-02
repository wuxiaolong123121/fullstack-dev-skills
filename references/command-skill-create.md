# /skill-create 技能创建命令 (Skill Create Command)

## 概述

`/skill-create` 命令用于创建新的技能模板，提供交互式向导和多种生成模式，帮助开发者快速构建标准化的技能结构。

## 命令语法

```
/skill-create <技能名称> [选项]
```

### 参数说明

| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| `<技能名称>` | string | 是 | 新技能的名称 |
| `--template` | string | 否 | 使用模板类型 |
| `--interactive` | flag | 否 | 交互式创建模式 |
| `--output` | string | 否 | 输出目录路径 |
| `--description` | string | 否 | 技能描述 |
| `--category` | string | 否 | 技能分类 |

## 使用示例

### 基础用法
```
/skill-create my-custom-skill
```

### 交互式创建
```
/skill-create my-skill --interactive
```

### 使用模板
```
/skill-create api-client --template rest-api --description "REST API 客户端技能"
```

### 指定输出目录
```
/skill-create data-processor --output ./skills/
```

## 技能模板类型

### 内置模板

| 模板名称 | 描述 | 适用场景 |
|---------|------|---------|
| `basic` | 基础技能模板 | 通用技能开发 |
| `rest-api` | REST API 技能模板 | API 集成开发 |
| `cli` | 命令行工具模板 | CLI 工具开发 |
| `data-processor` | 数据处理模板 | 数据转换处理 |
| `code-generator` | 代码生成模板 | 代码自动生成 |
| `testing` | 测试技能模板 | 测试自动化 |
| `deployment` | 部署技能模板 | 部署自动化 |

## 技能目录结构

### 标准结构
```
my-skill/
├── SKILL.md              # 技能主文件
├── config.json           # 配置文件
├── templates/            # 模板文件
│   ├── component.ts.hbs
│   └── test.ts.hbs
├── scripts/              # 脚本文件
│   ├── pre-process.sh
│   └── post-process.sh
├── references/           # 参考文档
│   └── guide.md
└── examples/             # 示例文件
    └── example-usage.md
```

## SKILL.md 模板

### 基础模板
```markdown
# [技能名称]

## 描述
[技能功能描述]

## 使用场景
- 场景 1: [描述]
- 场景 2: [描述]

## 参数说明
| 参数 | 类型 | 必需 | 描述 |
|-----|------|------|------|
| param1 | string | 是 | 参数描述 |

## 使用示例

### 基础用法
```
[使用命令示例]
```

### 高级用法
```
[高级用法示例]
```

## 输出格式
[输出格式描述]

## 注意事项
- [注意事项 1]
- [注意事项 2]

## 相关参考
- [相关文档链接]
```

### 完整模板
```markdown
# [技能名称]

**版本**: 1.0.0
**分类**: [分类]
**作者**: [作者]

## 概述
[详细描述技能的功能和用途]

## 功能特性
- ✅ 功能 1
- ✅ 功能 2
- ✅ 功能 3

## 使用场景

### 适用场景
- 场景 1: [描述]
- 场景 2: [描述]

### 不适用场景
- 场景 1: [描述]

## 参数说明

### 必需参数
| 参数 | 类型 | 描述 | 示例 |
|-----|------|------|------|
| param1 | string | 参数描述 | "value" |

### 可选参数
| 参数 | 类型 | 默认值 | 描述 |
|-----|------|-------|------|
| param2 | number | 10 | 参数描述 |

## 使用示例

### 基础用法
```
/skill-name [参数]
```

### 带选项
```
/skill-name [参数] --option value
```

### 完整示例
```javascript
// 示例代码
const result = await skill.execute({
  param1: 'value',
  param2: 10
});
```

## 输出格式

### 成功输出
```json
{
  "status": "success",
  "data": {}
}
```

### 错误输出
```json
{
  "status": "error",
  "message": "错误描述"
}
```

## 配置选项

### config.json
```json
{
  "timeout": 30000,
  "retryCount": 3,
  "cacheEnabled": true
}
```

## 最佳实践
1. [最佳实践 1]
2. [最佳实践 2]

## 常见问题

### Q1: [问题]
A: [答案]

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本

## 相关参考
- [相关文档 1]
- [相关文档 2]
```

## 交互式创建流程

```
┌─────────────────────────────────────┐
│     技能创建向导                     │
├─────────────────────────────────────┤
│                                     │
│  ? 技能名称: my-custom-skill        │
│                                     │
│  ? 技能描述: 这是一个自定义技能      │
│                                     │
│  ? 选择分类:                         │
│    ❯ 开发工具                        │
│      数据处理                        │
│      测试工具                        │
│      部署工具                        │
│                                     │
│  ? 选择模板:                         │
│    ❯ basic                          │
│      rest-api                       │
│      cli                            │
│                                     │
│  ? 是否需要配置文件? (Y/n)          │
│                                     │
│  ? 是否需要模板目录? (Y/n)           │
│                                     │
│  ? 是否需要参考文档? (Y/n)           │
│                                     │
├─────────────────────────────────────┤
│  ✓ 技能创建完成!                     │
│                                     │
│  创建的文件:                         │
│  - my-custom-skill/SKILL.md         │
│  - my-custom-skill/config.json      │
│  - my-custom-skill/templates/       │
│  - my-custom-skill/references/      │
│                                     │
│  下一步:                             │
│  1. 编辑 SKILL.md 添加技能内容       │
│  2. 在 config.json 中配置参数        │
│  3. 测试技能功能                     │
└─────────────────────────────────────┘
```

## 输出示例

### 创建成功
```markdown
## 技能创建成功 ✅

### 基本信息
- **技能名称**: my-custom-skill
- **分类**: 开发工具
- **模板**: basic
- **输出路径**: ./skills/my-custom-skill/

### 创建的文件
```
my-custom-skill/
├── SKILL.md          ✅ 已创建
├── config.json       ✅ 已创建
├── templates/        ✅ 已创建
│   └── .gitkeep
└── references/       ✅ 已创建
    └── guide.md
```

### 下一步操作
1. 编辑 `SKILL.md` 文件，添加技能的具体实现
2. 在 `config.json` 中配置技能参数
3. 在 `templates/` 目录添加需要的模板文件
4. 在 `references/` 目录添加参考文档

### 测试技能
```
# 在技能目录下运行
/skill-test my-custom-skill
```

### 发布技能
```
/skill-publish my-custom-skill
```
```

## 配置文件模板

### config.json
```json
{
  "name": "my-custom-skill",
  "version": "1.0.0",
  "description": "技能描述",
  "category": "development",
  "author": "your-name",
  "keywords": ["keyword1", "keyword2"],
  "dependencies": [],
  "parameters": {
    "required": ["param1"],
    "optional": {
      "param2": {
        "type": "string",
        "default": "default-value",
        "description": "参数描述"
      }
    }
  },
  "settings": {
    "timeout": 30000,
    "retryCount": 3,
    "cacheEnabled": true,
    "debugMode": false
  },
  "hooks": {
    "beforeExecute": "scripts/pre-process.sh",
    "afterExecute": "scripts/post-process.sh"
  }
}
```

## 模板文件示例

### Handlebars 模板
```handlebars
// templates/component.ts.hbs
import React from 'react';

interface {{pascalCase name}}Props {
  {{#each props}}
  {{name}}: {{type}};
  {{/each}}
}

export const {{pascalCase name}}: React.FC<{{pascalCase name}}Props> = (props) => {
  return (
    <div className="{{kebabCase name}}">
      {{!-- 组件内容 --}}
    </div>
  );
};
```

## 最佳实践

### 1. 命名规范
- 使用小写字母和连字符
- 名称应描述技能功能
- 避免使用特殊字符

### 2. 文档编写
- 提供清晰的使用说明
- 包含多个使用示例
- 说明参数和输出格式

### 3. 配置管理
- 合理设置默认值
- 提供参数验证
- 支持环境变量覆盖

### 4. 错误处理
- 提供友好的错误信息
- 记录详细的错误日志
- 提供错误恢复建议

## 相关命令

- `/skill-test` - 测试技能
- `/skill-publish` - 发布技能
- `/skill-update` - 更新技能

## 相关参考

- [命令系统概述](./commands-overview.md)
- [代理系统概述](./agents-overview.md)
