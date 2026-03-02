# Atlassian MCP 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Atlassian 开发、Jira 集成、Confluence 集成、JQL/CQL 查询、Atlassian Connect 相关任务

## 核心特性

Atlassian 提供企业级项目管理和协作工具：

- **Jira**：项目和问题跟踪管理
- **Confluence**：团队协作和知识管理
- **JQL**：Jira 查询语言，用于高级搜索
- **CQL**：Confluence 查询语言，用于内容搜索
- **Atlassian Connect**：构建 Atlassian 应用扩展
- **REST API**：完整的 API 接口集成

## 最佳实践

### Jira REST API 示例

```javascript
/**
 * Jira API 客户端类
 * 提供 Jira REST API 操作方法
 */
class JiraClient {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {string} config.baseUrl - Jira 基础URL
     * @param {string} config.email - 用户邮箱
     * @param {string} config.apiToken - API Token
     */
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    }

    /**
     * 发送 API 请求
     * @param {string} method - HTTP 方法
     * @param {string} endpoint - API 端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async request(method, endpoint, data = null) {
        const options = {
            method: method,
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseUrl}/rest/api/3${endpoint}`, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.errorMessages?.join(', ') || '请求失败');
        }

        return response.json();
    }

    /**
     * 获取问题详情
     * @param {string} issueKey - 问题键 (如: PROJ-123)
     * @returns {Promise<Object>} 问题详情
     */
    async getIssue(issueKey) {
        return this.request('GET', `/issue/${issueKey}`);
    }

    /**
     * 创建问题
     * @param {Object} issueData - 问题数据
     * @returns {Promise<Object>} 创建的问题
     */
    async createIssue(issueData) {
        return this.request('POST', '/issue', {
            fields: {
                project: { key: issueData.projectKey },
                summary: issueData.summary,
                description: {
                    type: 'doc',
                    version: 1,
                    content: [
                        {
                            type: 'paragraph',
                            content: [
                                { type: 'text', text: issueData.description }
                            ]
                        }
                    ]
                },
                issuetype: { name: issueData.issueType },
                priority: { name: issueData.priority || 'Medium' },
                assignee: issueData.assignee ? { accountId: issueData.assignee } : null,
            }
        });
    }

    /**
     * 更新问题
     * @param {string} issueKey - 问题键
     * @param {Object} fields - 更新字段
     * @returns {Promise<void>}
     */
    async updateIssue(issueKey, fields) {
        return this.request('PUT', `/issue/${issueKey}`, { fields });
    }

    /**
     * 添加评论
     * @param {string} issueKey - 问题键
     * @param {string} comment - 评论内容
     * @returns {Promise<Object>} 创建的评论
     */
    async addComment(issueKey, comment) {
        return this.request('POST', `/issue/${issueKey}/comment`, {
            body: {
                type: 'doc',
                version: 1,
                content: [
                    {
                        type: 'paragraph',
                        content: [{ type: 'text', text: comment }]
                    }
                ]
            }
        });
    }

    /**
     * 执行 JQL 搜索
     * @param {string} jql - JQL 查询语句
     * @param {Object} options - 搜索选项
     * @returns {Promise<Object>} 搜索结果
     */
    async searchJql(jql, options = {}) {
        const params = new URLSearchParams({
            jql: jql,
            startAt: options.startAt || 0,
            maxResults: options.maxResults || 50,
            fields: options.fields?.join(',') || 'summary,status,assignee,priority',
        });

        return this.request('GET', `/search?${params}`);
    }

    /**
     * 获取用户问题
     * @param {string} accountId - 用户账户ID
     * @returns {Promise<Object>} 用户问题列表
     */
    async getUserIssues(accountId) {
        return this.searchJql(`assignee = "${accountId}" AND status != Done ORDER BY updated DESC`);
    }
}

export { JiraClient };
```

### JQL 查询示例

```javascript
/**
 * JQL 查询构建器类
 * 提供流畅的 JQL 查询构建方法
 */
class JqlBuilder {
    /**
     * 构造函数
     */
    constructor() {
        this.conditions = [];
        this.orderByClause = '';
    }

    /**
     * 添加项目条件
     * @param {string} projectKey - 项目键
     * @returns {JqlBuilder} 构建器实例
     */
    project(projectKey) {
        this.conditions.push(`project = "${projectKey}"`);
        return this;
    }

    /**
     * 添加状态条件
     * @param {string|string[]} statuses - 状态或状态数组
     * @returns {JqlBuilder} 构建器实例
     */
    status(statuses) {
        if (Array.isArray(statuses)) {
            this.conditions.push(`status in (${statuses.map(s => `"${s}"`).join(', ')})`);
        } else {
            this.conditions.push(`status = "${statuses}"`);
        }
        return this;
    }

    /**
     * 添加经办人条件
     * @param {string} accountId - 用户账户ID
     * @returns {JqlBuilder} 构建器实例
     */
    assignee(accountId) {
        this.conditions.push(`assignee = "${accountId}"`);
        return this;
    }

    /**
     * 添加优先级条件
     * @param {string|string[]} priorities - 优先级或优先级数组
     * @returns {JqlBuilder} 构建器实例
     */
    priority(priorities) {
        if (Array.isArray(priorities)) {
            this.conditions.push(`priority in (${priorities.map(p => `"${p}"`).join(', ')})`);
        } else {
            this.conditions.push(`priority = "${priorities}"`);
        }
        return this;
    }

    /**
     * 添加标签条件
     * @param {string} label - 标签名称
     * @returns {JqlBuilder} 构建器实例
     */
    label(label) {
        this.conditions.push(`labels = "${label}"`);
        return this;
    }

    /**
     * 添加创建日期范围条件
     * @param {Date} start - 开始日期
     * @param {Date} end - 结束日期
     * @returns {JqlBuilder} 构建器实例
     */
    createdBetween(start, end) {
        const formatDate = (date) => date.toISOString().split('T')[0];
        this.conditions.push(`created >= "${formatDate(start)}" AND created <= "${formatDate(end)}"`);
        return this;
    }

    /**
     * 添加更新日期条件
     * @param {number} days - 最近天数
     * @returns {JqlBuilder} 构建器实例
     */
    updatedWithin(days) {
        this.conditions.push(`updated >= -${days}d`);
        return this;
    }

    /**
     * 设置排序
     * @param {string} field - 排序字段
     * @param {string} direction - 排序方向 (ASC/DESC)
     * @returns {JqlBuilder} 构建器实例
     */
    orderBy(field, direction = 'DESC') {
        this.orderByClause = `ORDER BY ${field} ${direction}`;
        return this;
    }

    /**
     * 构建 JQL 查询字符串
     * @returns {string} JQL 查询
     */
    build() {
        let jql = this.conditions.join(' AND ');
        if (this.orderByClause) {
            jql += ` ${this.orderByClause}`;
        }
        return jql;
    }
}

/**
 * 常用 JQL 查询模板
 */
const JqlTemplates = {
    /**
     * 获取用户待办问题
     * @param {string} accountId - 用户账户ID
     * @returns {string} JQL 查询
     */
    myOpenIssues: (accountId) => 
        `assignee = "${accountId}" AND status != Done ORDER BY priority DESC, updated DESC`,

    /**
     * 获取项目冲刺问题
     * @param {string} projectKey - 项目键
     * @param {string} sprintName - 冲刺名称
     * @returns {string} JQL 查询
     */
    sprintIssues: (projectKey, sprintName) =>
        `project = "${projectKey}" AND sprint = "${sprintName}" ORDER BY rank`,

    /**
     * 获取高优先级未解决问题
     * @param {string} projectKey - 项目键
     * @returns {string} JQL 查询
     */
    highPriorityOpen: (projectKey) =>
        `project = "${projectKey}" AND priority in (Highest, High) AND status != Done`,

    /**
     * 获取过期问题
     * @param {string} projectKey - 项目键
     * @returns {string} JQL 查询
     */
    overdueIssues: (projectKey) =>
        `project = "${projectKey}" AND due < now() AND status != Done ORDER BY due ASC`,
};

export { JqlBuilder, JqlTemplates };
```

### Confluence REST API 示例

```javascript
/**
 * Confluence API 客户端类
 * 提供 Confluence REST API 操作方法
 */
class ConfluenceClient {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     * @param {string} config.baseUrl - Confluence 基础URL
     * @param {string} config.email - 用户邮箱
     * @param {string} config.apiToken - API Token
     */
    constructor(config) {
        this.baseUrl = config.baseUrl;
        this.auth = Buffer.from(`${config.email}:${config.apiToken}`).toString('base64');
    }

    /**
     * 发送 API 请求
     * @param {string} method - HTTP 方法
     * @param {string} endpoint - API 端点
     * @param {Object} data - 请求数据
     * @returns {Promise<Object>} 响应数据
     */
    async request(method, endpoint, data = null) {
        const options = {
            method: method,
            headers: {
                'Authorization': `Basic ${this.auth}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        };

        if (data) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseUrl}/wiki/rest/api${endpoint}`, options);
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message?.reasons || '请求失败');
        }

        return response.json();
    }

    /**
     * 获取页面内容
     * @param {string} pageId - 页面ID
     * @param {Object} options - 获取选项
     * @returns {Promise<Object>} 页面详情
     */
    async getPage(pageId, options = {}) {
        const params = new URLSearchParams();
        
        if (options.expand) {
            params.append('expand', options.expand.join(','));
        }

        const queryString = params.toString();
        return this.request('GET', `/content/${pageId}${queryString ? '?' + queryString : ''}`);
    }

    /**
     * 创建页面
     * @param {Object} pageData - 页面数据
     * @returns {Promise<Object>} 创建的页面
     */
    async createPage(pageData) {
        return this.request('POST', '/content', {
            type: 'page',
            title: pageData.title,
            space: { key: pageData.spaceKey },
            body: {
                storage: {
                    value: pageData.content,
                    representation: 'storage',
                }
            },
            ancestors: pageData.parentId ? [{ id: pageData.parentId }] : undefined,
        });
    }

    /**
     * 更新页面内容
     * @param {string} pageId - 页面ID
     * @param {Object} pageData - 更新数据
     * @returns {Promise<Object>} 更新后的页面
     */
    async updatePage(pageId, pageData) {
        const currentPage = await this.getPage(pageId, { expand: ['version'] });
        
        return this.request('PUT', `/content/${pageId}`, {
            type: 'page',
            title: pageData.title || currentPage.title,
            version: {
                number: currentPage.version.number + 1,
            },
            body: {
                storage: {
                    value: pageData.content,
                    representation: 'storage',
                }
            },
        });
    }

    /**
     * 执行 CQL 搜索
     * @param {string} cql - CQL 查询语句
     * @param {Object} options - 搜索选项
     * @returns {Promise<Object>} 搜索结果
     */
    async searchCql(cql, options = {}) {
        const params = new URLSearchParams({
            cql: cql,
            start: options.start || 0,
            limit: options.limit || 25,
        });

        if (options.expand) {
            params.append('expand', options.expand.join(','));
        }

        return this.request('GET', `/content/search?${params}`);
    }

    /**
     * 获取空间页面
     * @param {string} spaceKey - 空间键
     * @param {number} limit - 返回数量限制
     * @returns {Promise<Object>} 页面列表
     */
    async getSpacePages(spaceKey, limit = 50) {
        return this.request('GET', `/content?spaceKey=${spaceKey}&type=page&limit=${limit}`);
    }

    /**
     * 添加页面标签
     * @param {string} pageId - 页面ID
     * @param {string} label - 标签名称
     * @returns {Promise<Object>} 添加结果
     */
    async addLabel(pageId, label) {
        return this.request('POST', `/content/${pageId}/label`, [{
            prefix: 'global',
            name: label,
        }]);
    }
}

export { ConfluenceClient };
```

### CQL 查询示例

```javascript
/**
 * CQL 查询构建器类
 * 提供流畅的 CQL 查询构建方法
 */
class CqlBuilder {
    /**
     * 构造函数
     */
    constructor() {
        this.conditions = [];
        this.orderByClause = '';
    }

    /**
     * 添加空间条件
     * @param {string} spaceKey - 空间键
     * @returns {CqlBuilder} 构建器实例
     */
    space(spaceKey) {
        this.conditions.push(`space = "${spaceKey}"`);
        return this;
    }

    /**
     * 添加类型条件
     * @param {string} type - 内容类型
     * @returns {CqlBuilder} 构建器实例
     */
    type(type) {
        this.conditions.push(`type = "${type}"`);
        return this;
    }

    /**
     * 添加标题条件
     * @param {string} title - 标题文本
     * @returns {CqlBuilder} 构建器实例
     */
    title(title) {
        this.conditions.push(`title ~ "${title}"`);
        return this;
    }

    /**
     * 添加文本搜索条件
     * @param {string} text - 搜索文本
     * @returns {CqlBuilder} 构建器实例
     */
    text(text) {
        this.conditions.push(`text ~ "${text}"`);
        return this;
    }

    /**
     * 添加标签条件
     * @param {string} label - 标签名称
     * @returns {CqlBuilder} 构建器实例
     */
    label(label) {
        this.conditions.push(`label = "${label}"`);
        return this;
    }

    /**
     * 添加创建者条件
     * @param {string} username - 用户名
     * @returns {CqlBuilder} 构建器实例
     */
    creator(username) {
        this.conditions.push(`creator = "${username}"`);
        return this;
    }

    /**
     * 添加贡献者条件
     * @param {string} username - 用户名
     * @returns {CqlBuilder} 构建器实例
     */
    contributor(username) {
        this.conditions.push(`contributor = "${username}"`);
        return this;
    }

    /**
     * 添加创建日期范围条件
     * @param {Date} start - 开始日期
     * @param {Date} end - 结束日期
     * @returns {CqlBuilder} 构建器实例
     */
    createdBetween(start, end) {
        const formatDate = (date) => date.toISOString().split('T')[0];
        this.conditions.push(`created >= "${formatDate(start)}" AND created <= "${formatDate(end)}"`);
        return this;
    }

    /**
     * 设置排序
     * @param {string} field - 排序字段
     * @param {string} direction - 排序方向
     * @returns {CqlBuilder} 构建器实例
     */
    orderBy(field, direction = 'DESC') {
        this.orderByClause = `ORDER BY ${field} ${direction}`;
        return this;
    }

    /**
     * 构建 CQL 查询字符串
     * @returns {string} CQL 查询
     */
    build() {
        let cql = this.conditions.join(' AND ');
        if (this.orderByClause) {
            cql += ` ${this.orderByClause}`;
        }
        return cql;
    }
}

/**
 * 常用 CQL 查询模板
 */
const CqlTemplates = {
    /**
     * 获取空间所有页面
     * @param {string} spaceKey - 空间键
     * @returns {string} CQL 查询
     */
    spacePages: (spaceKey) =>
        `space = "${spaceKey}" AND type = page ORDER BY created DESC`,

    /**
     * 搜索内容
     * @param {string} spaceKey - 空间键
     * @param {string} searchText - 搜索文本
     * @returns {string} CQL 查询
     */
    searchContent: (spaceKey, searchText) =>
        `space = "${spaceKey}" AND text ~ "${searchText}"`,

    /**
     * 获取用户贡献内容
     * @param {string} username - 用户名
     * @returns {string} CQL 查询
     */
    userContributions: (username) =>
        `contributor = "${username}" ORDER BY lastmodified DESC`,

    /**
     * 获取带标签的页面
     * @param {string} label - 标签名称
     * @returns {string} CQL 查询
     */
    pagesWithLabel: (label) =>
        `label = "${label}" AND type = page`,
};

export { CqlBuilder, CqlTemplates };
```

## Quick Reference

### JQL 操作符

| 操作符 | 用途 | 示例 |
|-------|------|------|
| `=` | 等于 | `status = "In Progress"` |
| `!=` | 不等于 | `status != Done` |
| `in` | 包含于 | `status in (Open, "In Progress")` |
| `not in` | 不包含于 | `priority not in (Low, Lowest)` |
| `<`, `<=` | 小于/小于等于 | `priority <= High` |
| `>`, `>=` | 大于/大于等于 | `created >= -7d` |
| `~` | 包含文本 | `summary ~ "bug fix"` |
| `!~` | 不包含文本 | `description !~ "deprecated"` |
| `is empty` | 为空 | `assignee is empty` |
| `is not empty` | 不为空 | `due is not empty` |

### JQL 函数

| 函数 | 用途 | 示例 |
|-----|------|------|
| `now()` | 当前时间 | `created > now("-1d")` |
| `currentUser()` | 当前用户 | `assignee = currentUser()` |
| `membersOf()` | 组成员 | `assignee in membersOf("developers")` |
| `startOfDay()` | 今天开始 | `created > startOfDay()` |
| `endOfDay()` | 今天结束 | `due < endOfDay()` |
| `startOfWeek()` | 本周开始 | `created > startOfWeek()` |
| `startOfMonth()` | 本月开始 | `created > startOfMonth()` |
| `updatedBy()` | 更新者 | `updatedBy(currentUser())` |

### CQL 操作符

| 操作符 | 用途 | 示例 |
|-------|------|------|
| `=` | 等于 | `space = "DEV"` |
| `!=` | 不等于 | `type != comment` |
| `in` | 包含于 | `space in ("DEV", "QA")` |
| `~` | 模糊匹配 | `title ~ "API"` |
| `>` / `<` | 比较 | `created > "2024-01-01"` |

### API 端点速查

| 端点 | 用途 | 方法 |
|-----|------|------|
| `/rest/api/3/issue/{id}` | 获取/更新问题 | GET/PUT |
| `/rest/api/3/issue` | 创建问题 | POST |
| `/rest/api/3/search` | JQL 搜索 | GET/POST |
| `/rest/api/3/project` | 获取项目列表 | GET |
| `/rest/api/3/user` | 获取用户信息 | GET |
| `/wiki/rest/api/content/{id}` | 获取页面 | GET |
| `/wiki/rest/api/content` | 创建页面 | POST |
| `/wiki/rest/api/content/search` | CQL 搜索 | GET |
