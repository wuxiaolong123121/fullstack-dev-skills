# MCP 模型上下文协议参考

Model Context Protocol (MCP) 是一个开放协议，用于标准化 AI 应用与外部数据源和工具之间的连接。

## When to Activate
- 创建 MCP Server 时
- 集成 MCP Client 时
- 构建 AI Agent 工具链时
- 需要标准化上下文交换时

## 核心概念

### 架构组件

```javascript
/**
 * MCP 架构组件
 * @description 三大核心角色
 */
const mcpArchitecture = {
    host: {
        role: 'Host（宿主）',
        description: '运行 LLM 应用的环境，如 Claude Desktop、IDE',
        examples: ['Claude Desktop', 'VS Code', 'Cursor']
    },
    client: {
        role: 'Client（客户端）',
        description: '在 Host 中运行，连接 MCP Server',
        responsibilities: ['发现服务器能力', '调用工具', '访问资源', '管理会话']
    },
    server: {
        role: 'Server（服务器）',
        description: '提供工具、资源、提示词的服务端',
        responsibilities: ['暴露工具', '提供资源', '管理提示词', '处理请求']
    }
};
```

### 三大核心能力

```javascript
/**
 * MCP 三大核心能力
 */
const coreCapabilities = {
    tools: {
        name: 'Tools（工具）',
        description: '可被 LLM 调用的函数',
        example: {
            name: 'get_weather',
            description: '获取指定城市的天气',
            inputSchema: {
                type: 'object',
                properties: {
                    city: { type: 'string', description: '城市名称' }
                },
                required: ['city']
            }
        }
    },
    resources: {
        name: 'Resources（资源）',
        description: '可被 LLM 访问的数据源',
        example: {
            uri: 'file:///project/README.md',
            name: 'README.md',
            mimeType: 'text/markdown'
        }
    },
    prompts: {
        name: 'Prompts（提示词）',
        description: '预定义的提示词模板',
        example: {
            name: 'code_review',
            description: '代码审查提示词模板',
            arguments: [
                { name: 'language', description: '编程语言', required: true }
            ]
        }
    }
};
```

## Server 开发指南

### Python SDK

```python
# MCP Server Python 示例
from mcp.server import Server
from mcp.types import Tool, TextContent

server = Server("example-server")

@server.list_tools()
async def list_tools():
    """
    列出可用工具
    @returns 工具列表
    """
    return [
        Tool(
            name="get_weather",
            description="获取指定城市的天气信息",
            inputSchema={
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "城市名称"
                    }
                },
                "required": ["city"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: dict):
    """
    调用工具
    @param name 工具名称
    @param arguments 工具参数
    @returns 工具执行结果
    """
    if name == "get_weather":
        city = arguments["city"]
        # 实现天气获取逻辑
        return [TextContent(type="text", text=f"{city}的天气：晴天，25°C")]
```

### TypeScript SDK

```typescript
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

/**
 * MCP Server TypeScript 示例
 */
const server = new Server(
  { name: "example-server", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

/**
 * 列出可用工具
 */
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_weather",
        description: "获取指定城市的天气信息",
        inputSchema: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "城市名称"
            }
          },
          required: ["city"]
        }
      }
    ]
  };
});

/**
 * 调用工具
 */
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "get_weather") {
    return {
      content: [
        { type: "text", text: `${args.city}的天气：晴天，25°C` }
      ]
    };
  }
  
  throw new Error(`Unknown tool: ${name}`);
});
```

## Client 集成指南

### 连接 MCP Server

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

/**
 * MCP Client 连接示例
 */
async function connectToServer() {
  const client = new Client(
    { name: "example-client", version: "1.0.0" },
    { capabilities: {} }
  );
  
  const transport = new StdioClientTransport({
    command: "python",
    args: ["server.py"]
  });
  
  await client.connect(transport);
  return client;
}
```

### 调用工具

```typescript
/**
 * 调用 MCP 工具
 * @param client MCP 客户端
 * @param toolName 工具名称
 * @param args 工具参数
 */
async function callTool(client: Client, toolName: string, args: Record<string, any>) {
  const result = await client.request(
    { method: "tools/call", params: { name: toolName, arguments: args } },
    CallToolResultSchema
  );
  
  return result.content;
}
```

### 访问资源

```typescript
/**
 * 访问 MCP 资源
 * @param client MCP 客户端
 * @param uri 资源 URI
 */
async function readResource(client: Client, uri: string) {
  const result = await client.request(
    { method: "resources/read", params: { uri } },
    ReadResourceResultSchema
  );
  
  return result.contents;
}
```

## 工具定义规范

### JSON Schema 输入规范

```javascript
/**
 * 工具输入 Schema 规范
 * @description 遵循 JSON Schema 标准
 */
const inputSchemaExample = {
    type: "object",
    properties: {
        query: {
            type: "string",
            description: "搜索查询字符串"
        },
        limit: {
            type: "integer",
            description: "返回结果数量限制",
            default: 10,
            minimum: 1,
            maximum: 100
        },
        filters: {
            type: "object",
            properties: {
                category: { type: "string" },
                dateRange: {
                    type: "object",
                    properties: {
                        start: { type: "string", format: "date" },
                        end: { type: "string", format: "date" }
                    }
                }
            }
        }
    },
    required: ["query"]
};
```

### 工具注解

```typescript
/**
 * 工具注解接口
 * @description 提供工具行为的提示信息
 */
interface ToolAnnotations {
    /** 工具的显示标题 */
    title?: string;
    
    /** 是否为只读操作（不修改数据） */
    readOnlyHint?: boolean;
    
    /** 是否可能产生破坏性操作 */
    destructiveHint?: boolean;
    
    /** 是否为幂等操作（多次执行结果相同） */
    idempotentHint?: boolean;
    
    /** 是否与外部世界交互 */
    openWorldHint?: boolean;
}

/**
 * 工具注解示例
 */
const toolAnnotationsExample = {
    name: "delete_file",
    description: "删除指定文件",
    inputSchema: { /* ... */ },
    annotations: {
        title: "删除文件",
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false
    }
};
```

## 最佳实践

### 工具设计原则

```markdown
1. 单一职责：每个工具只做一件事
2. 清晰描述：工具名称和描述要准确
3. 类型安全：使用 JSON Schema 严格定义输入
4. 错误处理：返回有意义的错误信息
5. 安全边界：使用注解标记潜在风险
```

### 资源设计原则

```markdown
1. URI 规范：使用标准 URI 格式
2. MIME 类型：正确声明资源类型
3. 分页支持：大量数据支持分页
4. 订阅机制：支持资源变更通知
```

### 安全考虑

```javascript
/**
 * MCP 安全最佳实践
 */
const securityBestPractices = {
    authentication: {
        description: '实现适当的身份验证',
        methods: ['API Key', 'OAuth', 'Token']
    },
    authorization: {
        description: '实现细粒度权限控制',
        example: '只允许访问特定目录的文件'
    },
    inputValidation: {
        description: '严格验证所有输入',
        tools: ['JSON Schema 验证', '参数清洗']
    },
    rateLimiting: {
        description: '实施速率限制',
        config: { maxRequests: 100, windowMs: 60000 }
    }
};
```

## Quick Reference

| 概念 | 说明 | 关键点 |
|------|------|--------|
| Host | 宿主环境 | Claude Desktop、IDE |
| Client | 客户端 | 连接 Server、调用工具 |
| Server | 服务器 | 暴露工具、资源、提示词 |
| Tools | 工具 | 可调用的函数 |
| Resources | 资源 | 可访问的数据 |
| Prompts | 提示词 | 预定义模板 |
