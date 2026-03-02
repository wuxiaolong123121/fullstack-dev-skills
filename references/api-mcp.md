# MCP (Model Context Protocol) 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 MCP 工具开发、AI 工具集成、资源定义、提示词模板、上下文管理

## 核心特性

MCP (Model Context Protocol) 是一种标准化协议，用于 AI 模型与外部工具、资源和上下文的交互。

### MCP 服务器实现

```javascript
/**
 * MCP 服务器配置
 * @typedef {Object} MCPServerConfig
 * @property {string} name - 服务器名称
 * @property {string} version - 服务器版本
 * @property {Object} capabilities - 服务器能力
 */

/**
 * MCP 服务器基类
 * @description 实现 MCP 协议的服务器基础类
 */
class MCPServer {
  /**
   * 创建 MCP 服务器实例
   * @param {MCPServerConfig} config - 服务器配置
   */
  constructor(config) {
    this.name = config.name
    this.version = config.version
    this.capabilities = config.capabilities || {}
    this.tools = new Map()
    this.resources = new Map()
    this.prompts = new Map()
    this.requestHandlers = new Map()
  }

  /**
   * 注册工具
   * @param {Object} tool - 工具定义
   * @param {Function} handler - 工具处理器
   */
  registerTool(tool, handler) {
    this.tools.set(tool.name, {
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      handler
    })
  }

  /**
   * 注册资源
   * @param {Object} resource - 资源定义
   * @param {Function} handler - 资源处理器
   */
  registerResource(resource, handler) {
    this.resources.set(resource.uri, {
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType,
      handler
    })
  }

  /**
   * 注册提示词模板
   * @param {Object} prompt - 提示词定义
   * @param {Function} handler - 提示词处理器
   */
  registerPrompt(prompt, handler) {
    this.prompts.set(prompt.name, {
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments || [],
      handler
    })
  }

  /**
   * 处理请求
   * @param {Object} request - MCP 请求对象
   * @returns {Promise<Object>} 响应对象
   */
  async handleRequest(request) {
    const { method, params, id } = request

    try {
      let result

      switch (method) {
        case 'initialize':
          result = await this.handleInitialize(params)
          break
        case 'tools/list':
          result = await this.handleToolsList()
          break
        case 'tools/call':
          result = await this.handleToolCall(params)
          break
        case 'resources/list':
          result = await this.handleResourcesList()
          break
        case 'resources/read':
          result = await this.handleResourceRead(params)
          break
        case 'prompts/list':
          result = await this.handlePromptsList()
          break
        case 'prompts/get':
          result = await this.handlePromptGet(params)
          break
        default:
          throw new Error(`未知方法: ${method}`)
      }

      return { jsonrpc: '2.0', id, result }
    } catch (error) {
      return {
        jsonrpc: '2.0',
        id,
        error: {
          code: -32603,
          message: error.message
        }
      }
    }
  }

  /**
   * 处理初始化请求
   * @param {Object} params - 初始化参数
   * @returns {Object} 初始化结果
   */
  async handleInitialize(params) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: true },
        resources: { subscribe: true, listChanged: true },
        prompts: {}
      },
      serverInfo: {
        name: this.name,
        version: this.version
      }
    }
  }

  /**
   * 处理工具列表请求
   * @returns {Object} 工具列表
   */
  async handleToolsList() {
    const tools = Array.from(this.tools.values()).map(tool => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema
    }))

    return { tools }
  }

  /**
   * 处理工具调用请求
   * @param {Object} params - 调用参数
   * @returns {Object} 调用结果
   */
  async handleToolCall(params) {
    const { name, arguments: args } = params
    const tool = this.tools.get(name)

    if (!tool) {
      throw new Error(`工具不存在: ${name}`)
    }

    const result = await tool.handler(args)

    return {
      content: [
        {
          type: 'text',
          text: typeof result === 'string' ? result : JSON.stringify(result, null, 2)
        }
      ]
    }
  }

  /**
   * 处理资源列表请求
   * @returns {Object} 资源列表
   */
  async handleResourcesList() {
    const resources = Array.from(this.resources.values()).map(resource => ({
      uri: resource.uri,
      name: resource.name,
      description: resource.description,
      mimeType: resource.mimeType
    }))

    return { resources }
  }

  /**
   * 处理资源读取请求
   * @param {Object} params - 读取参数
   * @returns {Object} 资源内容
   */
  async handleResourceRead(params) {
    const { uri } = params
    const resource = this.resources.get(uri)

    if (!resource) {
      throw new Error(`资源不存在: ${uri}`)
    }

    const content = await resource.handler(params)

    return {
      contents: [
        {
          uri,
          mimeType: resource.mimeType || 'text/plain',
          text: content
        }
      ]
    }
  }

  /**
   * 处理提示词列表请求
   * @returns {Object} 提示词列表
   */
  async handlePromptsList() {
    const prompts = Array.from(this.prompts.values()).map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      arguments: prompt.arguments
    }))

    return { prompts }
  }

  /**
   * 处理提示词获取请求
   * @param {Object} params - 获取参数
   * @returns {Object} 提示词内容
   */
  async handlePromptGet(params) {
    const { name, arguments: args } = params
    const prompt = this.prompts.get(name)

    if (!prompt) {
      throw new Error(`提示词不存在: ${name}`)
    }

    const messages = await prompt.handler(args || {})

    return { messages }
  }
}
```

### 工具定义示例

```javascript
/**
 * 文件系统工具集
 * @description 提供文件读写、搜索等操作工具
 */
class FileSystemTools {
  /**
   * 创建文件系统工具实例
   * @param {Object} config - 配置选项
   */
  constructor(config) {
    this.rootPath = config.rootPath
    this.allowedExtensions = config.allowedExtensions || ['*']
  }

  /**
   * 获取工具定义列表
   * @returns {Object[]} 工具定义数组
   */
  getToolDefinitions() {
    return [
      {
        name: 'read_file',
        description: '读取指定路径的文件内容',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文件路径（相对于项目根目录）'
            },
            encoding: {
              type: 'string',
              description: '文件编码',
              default: 'utf-8',
              enum: ['utf-8', 'binary', 'base64']
            }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: '将内容写入指定路径的文件',
        inputSchema: {
          type: 'object',
          properties: {
            path: {
              type: 'string',
              description: '文件路径（相对于项目根目录）'
            },
            content: {
              type: 'string',
              description: '文件内容'
            },
            mode: {
              type: 'string',
              description: '写入模式',
              enum: ['overwrite', 'append'],
              default: 'overwrite'
            }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'search_files',
        description: '在项目中搜索匹配模式的文件',
        inputSchema: {
          type: 'object',
          properties: {
            pattern: {
              type: 'string',
              description: 'Glob 搜索模式（如 **/*.js）'
            },
            excludePatterns: {
              type: 'array',
              items: { type: 'string' },
              description: '排除的模式列表'
            }
          },
          required: ['pattern']
        }
      },
      {
        name: 'search_content',
        description: '在文件内容中搜索匹配的文本',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: '搜索查询（支持正则表达式）'
            },
            filePattern: {
              type: 'string',
              description: '文件过滤模式',
              default: '**/*'
            },
            caseSensitive: {
              type: 'boolean',
              description: '是否区分大小写',
              default: false
            }
          },
          required: ['query']
        }
      }
    ]
  }

  /**
   * 处理工具调用
   * @param {string} name - 工具名称
   * @param {Object} args - 调用参数
   * @returns {Promise<string>} 执行结果
   */
  async handleToolCall(name, args) {
    switch (name) {
      case 'read_file':
        return this.readFile(args)
      case 'write_file':
        return this.writeFile(args)
      case 'search_files':
        return this.searchFiles(args)
      case 'search_content':
        return this.searchContent(args)
      default:
        throw new Error(`未知工具: ${name}`)
    }
  }

  /**
   * 读取文件
   * @param {Object} args - 参数
   * @returns {Promise<string>} 文件内容
   */
  async readFile(args) {
    const fs = require('fs').promises
    const path = require('path')

    const fullPath = path.join(this.rootPath, args.path)

    if (!this.isPathAllowed(fullPath)) {
      throw new Error('路径不在允许范围内')
    }

    const content = await fs.readFile(fullPath, args.encoding || 'utf-8')
    return content
  }

  /**
   * 写入文件
   * @param {Object} args - 参数
   * @returns {Promise<string>} 操作结果
   */
  async writeFile(args) {
    const fs = require('fs').promises
    const path = require('path')

    const fullPath = path.join(this.rootPath, args.path)

    if (!this.isPathAllowed(fullPath)) {
      throw new Error('路径不在允许范围内')
    }

    if (args.mode === 'append') {
      await fs.appendFile(fullPath, args.content)
    } else {
      await fs.writeFile(fullPath, args.content)
    }

    return `文件已成功写入: ${args.path}`
  }

  /**
   * 检查路径是否允许访问
   * @param {string} fullPath - 完整路径
   * @returns {boolean} 是否允许
   */
  isPathAllowed(fullPath) {
    const path = require('path')
    const normalized = path.normalize(fullPath)
    return normalized.startsWith(this.rootPath)
  }
}
```

### 资源定义示例

```javascript
/**
 * 项目资源提供者
 * @description 提供项目文件、配置等资源访问
 */
class ProjectResources {
  /**
   * 创建项目资源实例
   * @param {Object} config - 配置选项
   */
  constructor(config) {
    this.projectPath = config.projectPath
    this.cache = new Map()
  }

  /**
   * 获取资源定义列表
   * @returns {Object[]} 资源定义数组
   */
  getResourceDefinitions() {
    return [
      {
        uri: 'project://config',
        name: '项目配置',
        description: '项目的 package.json 配置文件',
        mimeType: 'application/json'
      },
      {
        uri: 'project://structure',
        name: '项目结构',
        description: '项目的目录结构概览',
        mimeType: 'text/plain'
      },
      {
        uri: 'project://dependencies',
        name: '项目依赖',
        description: '项目的依赖列表及版本信息',
        mimeType: 'application/json'
      },
      {
        uri: 'project://git-status',
        name: 'Git 状态',
        description: '当前 Git 仓库的状态信息',
        mimeType: 'application/json'
      }
    ]
  }

  /**
   * 处理资源读取
   * @param {string} uri - 资源 URI
   * @returns {Promise<string>} 资源内容
   */
  async handleResourceRead(uri) {
    switch (uri) {
      case 'project://config':
        return this.getProjectConfig()
      case 'project://structure':
        return this.getProjectStructure()
      case 'project://dependencies':
        return this.getProjectDependencies()
      case 'project://git-status':
        return this.getGitStatus()
      default:
        throw new Error(`未知资源: ${uri}`)
    }
  }

  /**
   * 获取项目配置
   * @returns {Promise<string>} 配置内容
   */
  async getProjectConfig() {
    const fs = require('fs').promises
    const path = require('path')

    const configPath = path.join(this.projectPath, 'package.json')
    const content = await fs.readFile(configPath, 'utf-8')

    return content
  }

  /**
   * 获取项目结构
   * @returns {Promise<string>} 结构描述
   */
  async getProjectStructure() {
    const fs = require('fs').promises
    const path = require('path')

    async function walk(dir, depth = 0, maxDepth = 3) {
      if (depth > maxDepth) return ''

      const items = await fs.readdir(dir, { withFileTypes: true })
      let result = ''

      for (const item of items) {
        if (item.name.startsWith('.') || item.name === 'node_modules') continue

        const indent = '  '.repeat(depth)
        result += `${indent}${item.name}\n`

        if (item.isDirectory()) {
          const subPath = path.join(dir, item.name)
          result += await walk(subPath, depth + 1, maxDepth)
        }
      }

      return result
    }

    return await walk(this.projectPath)
  }
}
```

### 提示词模板示例

```javascript
/**
 * 代码生成提示词模板
 * @description 提供代码生成相关的提示词模板
 */
class CodeGenerationPrompts {
  /**
   * 获取提示词定义列表
   * @returns {Object[]} 提示词定义数组
   */
  getPromptDefinitions() {
    return [
      {
        name: 'generate_function',
        description: '生成符合规范的函数代码',
        arguments: [
          {
            name: 'language',
            description: '编程语言',
            required: true
          },
          {
            name: 'functionName',
            description: '函数名称',
            required: true
          },
          {
            name: 'description',
            description: '功能描述',
            required: true
          },
          {
            name: 'parameters',
            description: '参数列表（JSON 格式）',
            required: false
          }
        ]
      },
      {
        name: 'generate_test',
        description: '为指定代码生成测试用例',
        arguments: [
          {
            name: 'code',
            description: '待测试的代码',
            required: true
          },
          {
            name: 'framework',
            description: '测试框架',
            required: false
          }
        ]
      },
      {
        name: 'refactor_code',
        description: '重构代码以改进质量',
        arguments: [
          {
            name: 'code',
            description: '待重构的代码',
            required: true
          },
          {
            name: 'goals',
            description: '重构目标（如：性能、可读性）',
            required: false
          }
        ]
      }
    ]
  }

  /**
   * 处理提示词请求
   * @param {string} name - 提示词名称
   * @param {Object} args - 参数
   * @returns {Object[]} 消息列表
   */
  handlePromptRequest(name, args) {
    switch (name) {
      case 'generate_function':
        return this.generateFunctionPrompt(args)
      case 'generate_test':
        return this.generateTestPrompt(args)
      case 'refactor_code':
        return this.refactorCodePrompt(args)
      default:
        throw new Error(`未知提示词: ${name}`)
    }
  }

  /**
   * 生成函数提示词
   * @param {Object} args - 参数
   * @returns {Object[]} 消息列表
   */
  generateFunctionPrompt(args) {
    const { language, functionName, description, parameters } = args

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `请用 ${language} 编写一个名为 ${functionName} 的函数。

功能描述：${description}

${parameters ? `参数：${parameters}` : ''}

要求：
1. 使用 JSDoc 中文注释
2. 包含参数类型和返回值类型
3. 进行参数验证
4. 处理边界情况`
        }
      }
    ]
  }

  /**
   * 生成测试提示词
   * @param {Object} args - 参数
   * @returns {Object[]} 消息列表
   */
  generateTestPrompt(args) {
    const { code, framework = 'jest' } = args

    return [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `请为以下代码生成 ${framework} 测试用例：

\`\`\`
${code}
\`\`\`

要求：
1. 覆盖正常情况
2. 覆盖边界情况
3. 覆盖错误情况
4. 使用描述性的测试名称`
        }
      }
    ]
  }
}
```

## 最佳实践

### MCP 服务器注册

```javascript
/**
 * 创建完整的 MCP 服务器实例
 * @param {Object} config - 服务器配置
 * @returns {MCPServer} 配置好的服务器实例
 */
function createMCPServer(config) {
  const server = new MCPServer({
    name: config.name || 'mcp-server',
    version: config.version || '1.0.0'
  })

  const fsTools = new FileSystemTools({
    rootPath: config.rootPath
  })

  fsTools.getToolDefinitions().forEach(tool => {
    server.registerTool(tool, (args) => fsTools.handleToolCall(tool.name, args))
  })

  const projectResources = new ProjectResources({
    projectPath: config.rootPath
  })

  projectResources.getResourceDefinitions().forEach(resource => {
    server.registerResource(resource, () => projectResources.handleResourceRead(resource.uri))
  })

  const codePrompts = new CodeGenerationPrompts()

  codePrompts.getPromptDefinitions().forEach(prompt => {
    server.registerPrompt(prompt, (args) => codePrompts.handlePromptRequest(prompt.name, args))
  })

  return server
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `registerTool` | 注册工具 | `server.registerTool(tool, handler)` |
| `registerResource` | 注册资源 | `server.registerResource(resource, handler)` |
| `registerPrompt` | 注册提示词 | `server.registerPrompt(prompt, handler)` |
| `tools/list` | 列出工具 | `method: 'tools/list'` |
| `tools/call` | 调用工具 | `method: 'tools/call', params: { name, arguments }` |
| `resources/list` | 列出资源 | `method: 'resources/list'` |
| `resources/read` | 读取资源 | `method: 'resources/read', params: { uri }` |
| `prompts/list` | 列出提示词 | `method: 'prompts/list'` |
| `prompts/get` | 获取提示词 | `method: 'prompts/get', params: { name, arguments }` |
| `inputSchema` | 工具参数模式 | `inputSchema: { type: 'object', properties: {...} }` |
| `mimeType` | 资源 MIME 类型 | `mimeType: 'application/json'` |
