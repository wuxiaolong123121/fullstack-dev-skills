# Hook 实现脚本参考

## 概述

本文档提供 Claude Code Hooks 系统的具体实现脚本参考，包括 session-start、session-end、pre-compact 等核心 Hook 脚本。

## 目录

1. [session-start.js](#session-startjs)
2. [session-end.js](#session-endjs)
3. [pre-compact.js](#pre-compactjs)
4. [suggest-compact.js](#suggest-compactjs)
5. [pre-tool-use.js](#pre-tool-usejs)
6. [post-tool-use.js](#post-tool-usejs)

---

## session-start.js

会话开始时执行的 Hook，用于初始化环境、加载上下文、记录会话信息。

```javascript
#!/usr/bin/env node

/**
 * Session Start Hook
 * 在 Claude Code 会话开始时执行
 * 
 * 功能：
 * - 记录会话开始时间
 * - 加载项目上下文
 * - 初始化环境变量
 * - 检查项目状态
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSION_LOG_DIR = path.join(os.homedir(), '.claude', 'sessions');
const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

/**
 * 主函数
 */
async function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID || generateSessionId();
  const timestamp = new Date().toISOString();
  
  console.log(`[Session Start] ${timestamp}`);
  console.log(`Session ID: ${sessionId}`);
  console.log(`Project: ${PROJECT_ROOT}`);
  
  const sessionData = {
    id: sessionId,
    startTime: timestamp,
    projectRoot: PROJECT_ROOT,
    user: os.userInfo().username,
    platform: os.platform(),
    nodeVersion: process.version
  };
  
  await ensureLogDir();
  await saveSessionStart(sessionData);
  await loadProjectContext();
  await checkProjectStatus();
  
  console.log('[Session Start] 初始化完成');
}

/**
 * 生成会话 ID
 * @returns {string} 会话 ID
 */
function generateSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * 确保日志目录存在
 */
async function ensureLogDir() {
  if (!fs.existsSync(SESSION_LOG_DIR)) {
    fs.mkdirSync(SESSION_LOG_DIR, { recursive: true });
  }
}

/**
 * 保存会话开始信息
 * @param {Object} sessionData - 会话数据
 */
async function saveSessionStart(sessionData) {
  const logFile = path.join(SESSION_LOG_DIR, `${sessionData.id}.json`);
  fs.writeFileSync(logFile, JSON.stringify(sessionData, null, 2));
  console.log(`会话日志: ${logFile}`);
}

/**
 * 加载项目上下文
 */
async function loadProjectContext() {
  const claudeMdPath = path.join(PROJECT_ROOT, 'CLAUDE.md');
  
  if (fs.existsSync(claudeMdPath)) {
    console.log('[Context] 发现 CLAUDE.md 项目配置');
    const content = fs.readFileSync(claudeMdPath, 'utf-8');
    const rules = extractRules(content);
    if (rules.length > 0) {
      console.log(`[Context] 加载了 ${rules.length} 条项目规则`);
    }
  }
  
  const packageJsonPath = path.join(PROJECT_ROOT, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    console.log(`[Context] 项目: ${pkg.name || 'unnamed'} v${pkg.version || '0.0.0'}`);
  }
}

/**
 * 从 CLAUDE.md 提取规则
 * @param {string} content - 文件内容
 * @returns {Array} 规则列表
 */
function extractRules(content) {
  const rules = [];
  const lines = content.split('\n');
  let inRulesSection = false;
  
  for (const line of lines) {
    if (line.includes('## 规则') || line.includes('## Rules')) {
      inRulesSection = true;
      continue;
    }
    if (inRulesSection && line.startsWith('## ')) {
      inRulesSection = false;
    }
    if (inRulesSection && line.startsWith('- ')) {
      rules.push(line.slice(2));
    }
  }
  
  return rules;
}

/**
 * 检查项目状态
 */
async function checkProjectStatus() {
  const gitDir = path.join(PROJECT_ROOT, '.git');
  
  if (fs.existsSync(gitDir)) {
    const { execSync } = require('child_process');
    try {
      const branch = execSync('git branch --show-current', { cwd: PROJECT_ROOT, encoding: 'utf-8' }).trim();
      const status = execSync('git status --porcelain', { cwd: PROJECT_ROOT, encoding: 'utf-8' });
      const changes = status.split('\n').filter(Boolean).length;
      
      console.log(`[Git] 分支: ${branch}`);
      if (changes > 0) {
        console.log(`[Git] 未提交更改: ${changes} 个文件`);
      }
    } catch (error) {
      console.log('[Git] 无法获取 Git 状态');
    }
  }
}

main().catch(console.error);
```

---

## session-end.js

会话结束时执行的 Hook，用于清理资源、保存状态、生成摘要。

```javascript
#!/usr/bin/env node

/**
 * Session End Hook
 * 在 Claude Code 会话结束时执行
 * 
 * 功能：
 * - 记录会话结束时间
 * - 计算会话持续时间
 * - 保存会话摘要
 * - 清理临时资源
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSION_LOG_DIR = path.join(os.homedir(), '.claude', 'sessions');

/**
 * 主函数
 */
async function main() {
  const sessionId = process.env.CLAUDE_SESSION_ID;
  const timestamp = new Date().toISOString();
  
  console.log(`[Session End] ${timestamp}`);
  
  if (!sessionId) {
    console.log('[Session End] 无会话 ID，跳过');
    return;
  }
  
  const sessionFile = path.join(SESSION_LOG_DIR, `${sessionId}.json`);
  
  if (fs.existsSync(sessionFile)) {
    const sessionData = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    sessionData.endTime = timestamp;
    sessionData.duration = calculateDuration(sessionData.startTime, timestamp);
    
    fs.writeFileSync(sessionFile, JSON.stringify(sessionData, null, 2));
    
    console.log(`[Session End] 会话持续时间: ${sessionData.duration}`);
    await generateSessionSummary(sessionData);
  }
  
  await cleanupTempFiles();
  console.log('[Session End] 清理完成');
}

/**
 * 计算持续时间
 * @param {string} start - 开始时间
 * @param {string} end - 结束时间
 * @returns {string} 格式化的持续时间
 */
function calculateDuration(start, end) {
  const startTime = new Date(start);
  const endTime = new Date(end);
  const diffMs = endTime - startTime;
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

/**
 * 生成会话摘要
 * @param {Object} sessionData - 会话数据
 */
async function generateSessionSummary(sessionData) {
  const summaryFile = path.join(SESSION_LOG_DIR, 'summaries.json');
  let summaries = [];
  
  if (fs.existsSync(summaryFile)) {
    summaries = JSON.parse(fs.readFileSync(summaryFile, 'utf-8'));
  }
  
  summaries.push({
    id: sessionData.id,
    project: sessionData.projectRoot,
    startTime: sessionData.startTime,
    endTime: sessionData.endTime,
    duration: sessionData.duration,
    user: sessionData.user
  });
  
  // 只保留最近 100 条记录
  if (summaries.length > 100) {
    summaries = summaries.slice(-100);
  }
  
  fs.writeFileSync(summaryFile, JSON.stringify(summaries, null, 2));
  console.log('[Session End] 会话摘要已保存');
}

/**
 * 清理临时文件
 */
async function cleanupTempFiles() {
  const tempDir = path.join(os.tmpdir(), 'claude-code');
  
  if (fs.existsSync(tempDir)) {
    const files = fs.readdirSync(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 小时
    
    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stat = fs.statSync(filePath);
      
      if (now - stat.mtimeMs > maxAge) {
        fs.unlinkSync(filePath);
        console.log(`[Cleanup] 删除过期临时文件: ${file}`);
      }
    }
  }
}

main().catch(console.error);
```

---

## pre-compact.js

上下文压缩前执行的 Hook，用于决定是否压缩、保存重要信息。

```javascript
#!/usr/bin/env node

/**
 * Pre-Compact Hook
 * 在 Claude Code 执行上下文压缩前执行
 * 
 * 功能：
 * - 检查是否需要压缩
 * - 提取重要信息
 * - 保存关键上下文
 * - 生成压缩建议
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const CONTEXT_DIR = path.join(os.homedir(), '.claude', 'context');

/**
 * 主函数
 */
async function main() {
  const contextSize = parseInt(process.env.CLAUDE_CONTEXT_SIZE || '0');
  const maxContextSize = parseInt(process.env.CLAUDE_MAX_CONTEXT || '200000');
  const threshold = maxContextSize * 0.8;
  
  console.log(`[Pre-Compact] 当前上下文大小: ${contextSize}`);
  console.log(`[Pre-Compact] 最大上下文: ${maxContextSize}`);
  console.log(`[Pre-Compact] 压缩阈值: ${threshold}`);
  
  if (contextSize < threshold) {
    console.log('[Pre-Compact] 上下文未达阈值，建议跳过压缩');
    process.exit(0);
  }
  
  await ensureContextDir();
  await extractImportantContext();
  await generateCompactSuggestion();
  
  console.log('[Pre-Compact] 准备就绪，可以执行压缩');
}

/**
 * 确保上下文目录存在
 */
async function ensureContextDir() {
  if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
  }
}

/**
 * 提取重要上下文
 */
async function extractImportantContext() {
  const importantFile = path.join(CONTEXT_DIR, 'important-context.md');
  
  const importantInfo = {
    timestamp: new Date().toISOString(),
    projectInfo: await getProjectInfo(),
    recentFiles: await getRecentFiles(),
    activeTasks: await getActiveTasks()
  };
  
  const markdown = generateMarkdown(importantInfo);
  fs.writeFileSync(importantFile, markdown);
  
  console.log('[Pre-Compact] 重要上下文已提取');
}

/**
 * 获取项目信息
 * @returns {Object} 项目信息
 */
async function getProjectInfo() {
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const packageJsonPath = path.join(projectRoot, 'package.json');
  
  if (fs.existsSync(packageJsonPath)) {
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    return {
      name: pkg.name,
      version: pkg.version,
      description: pkg.description
    };
  }
  
  return { name: path.basename(projectRoot) };
}

/**
 * 获取最近修改的文件
 * @returns {Array} 文件列表
 */
async function getRecentFiles() {
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const files = [];
  
  function scan(dir, depth = 0) {
    if (depth > 3) return;
    
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath, depth + 1);
      } else {
        const stat = fs.statSync(fullPath);
        files.push({
          path: path.relative(projectRoot, fullPath),
          mtime: stat.mtime
        });
      }
    }
  }
  
  try {
    scan(projectRoot);
    return files
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, 10)
      .map(f => f.path);
  } catch (error) {
    return [];
  }
}

/**
 * 获取活动任务
 * @returns {Array} 任务列表
 */
async function getActiveTasks() {
  const projectRoot = process.env.PROJECT_ROOT || process.cwd();
  const tasksFile = path.join(projectRoot, '.claude', 'tasks.json');
  
  if (fs.existsSync(tasksFile)) {
    const tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
    return tasks.filter(t => t.status === 'in_progress');
  }
  
  return [];
}

/**
 * 生成 Markdown 内容
 * @param {Object} info - 信息对象
 * @returns {string} Markdown 内容
 */
function generateMarkdown(info) {
  return `# 重要上下文

> 提取时间: ${info.timestamp}

## 项目信息

- 名称: ${info.projectInfo.name}
- 版本: ${info.projectInfo.version || 'N/A'}
- 描述: ${info.projectInfo.description || 'N/A'}

## 最近修改的文件

${info.recentFiles.map(f => `- ${f}`).join('\n') || '无'}

## 活动任务

${info.activeTasks.map(t => `- [${t.id}] ${t.content}`).join('\n') || '无'}
`;
}

/**
 * 生成压缩建议
 */
async function generateCompactSuggestion() {
  const suggestions = [
    '移除旧的对话历史',
    '压缩重复的代码片段',
    '保留最近的工具调用结果',
    '保持项目配置信息'
  ];
  
  console.log('[Pre-Compact] 压缩建议:');
  suggestions.forEach((s, i) => console.log(`  ${i + 1}. ${s}`));
}

main().catch(console.error);
```

---

## suggest-compact.js

智能压缩建议 Hook，分析上下文使用情况并提供优化建议。

```javascript
#!/usr/bin/env node

/**
 * Suggest Compact Hook
 * 智能压缩建议
 * 
 * 功能：
 * - 分析上下文使用模式
 * - 识别可压缩的内容
 * - 提供优化建议
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const SESSION_LOG_DIR = path.join(os.homedir(), '.claude', 'sessions');

/**
 * 主函数
 */
async function main() {
  const contextSize = parseInt(process.env.CLAUDE_CONTEXT_SIZE || '0');
  const maxContext = parseInt(process.env.CLAUDE_MAX_CONTEXT || '200000');
  
  const usage = (contextSize / maxContext) * 100;
  
  console.log(`[Suggest Compact] 上下文使用率: ${usage.toFixed(1)}%`);
  
  if (usage > 90) {
    console.log('[Suggest Compact] ⚠️ 上下文使用率过高，建议立即压缩');
    await generateUrgentSuggestions();
  } else if (usage > 70) {
    console.log('[Suggest Compact] 💡 上下文使用率较高，建议考虑压缩');
    await generateModerateSuggestions();
  } else {
    console.log('[Suggest Compact] ✅ 上下文使用率正常');
  }
}

/**
 * 生成紧急建议
 */
async function generateUrgentSuggestions() {
  const suggestions = [
    {
      priority: 'P0',
      action: '立即执行 /compact 命令',
      reason: '上下文即将耗尽'
    },
    {
      priority: 'P0',
      action: '移除所有旧的对话历史',
      reason: '释放最大空间'
    },
    {
      priority: 'P1',
      action: '总结当前工作进度',
      reason: '防止信息丢失'
    }
  ];
  
  printSuggestions(suggestions);
}

/**
 * 生成中等优先级建议
 */
async function generateModerateSuggestions() {
  const suggestions = [
    {
      priority: 'P1',
      action: '考虑执行 /compact 命令',
      reason: '预防上下文溢出'
    },
    {
      priority: 'P2',
      action: '清理不需要的文件引用',
      reason: '减少上下文占用'
    },
    {
      priority: 'P2',
      action: '总结已完成的任务',
      reason: '可以安全压缩'
    }
  ];
  
  printSuggestions(suggestions);
}

/**
 * 打印建议
 * @param {Array} suggestions - 建议列表
 */
function printSuggestions(suggestions) {
  console.log('\n[Suggest Compact] 优化建议:');
  console.log('─'.repeat(50));
  
  for (const s of suggestions) {
    console.log(`[${s.priority}] ${s.action}`);
    console.log(`      原因: ${s.reason}`);
  }
  
  console.log('─'.repeat(50));
}

main().catch(console.error);
```

---

## pre-tool-use.js

工具调用前执行的 Hook，用于验证、日志记录、权限检查。

```javascript
#!/usr/bin/env node

/**
 * Pre-Tool-Use Hook
 * 在工具调用前执行
 * 
 * 功能：
 * - 记录工具调用
 * - 验证参数
 * - 权限检查
 * - 安全审计
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const AUDIT_LOG = path.join(os.homedir(), '.claude', 'audit.log');
const BLOCKED_TOOLS = process.env.CLAUDE_BLOCKED_TOOLS?.split(',') || [];
const SENSITIVE_PATHS = ['/etc', '/root', '~/.ssh', '~/.gnupg'];

/**
 * 主函数
 */
async function main() {
  const toolName = process.env.CLAUDE_TOOL_NAME;
  const toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  
  console.log(`[Pre-Tool-Use] 工具: ${toolName}`);
  
  // 检查是否被阻止
  if (BLOCKED_TOOLS.includes(toolName)) {
    console.log(`[Pre-Tool-Use] ❌ 工具 ${toolName} 被阻止`);
    process.exit(1);
  }
  
  // 安全检查
  const securityCheck = await performSecurityCheck(toolName, toolInput);
  if (!securityCheck.allowed) {
    console.log(`[Pre-Tool-Use] ❌ 安全检查失败: ${securityCheck.reason}`);
    process.exit(1);
  }
  
  // 记录审计日志
  await logAudit(toolName, toolInput);
  
  console.log('[Pre-Tool-Use] ✅ 检查通过');
}

/**
 * 执行安全检查
 * @param {string} toolName - 工具名称
 * @param {Object} toolInput - 工具输入
 * @returns {Object} 检查结果
 */
async function performSecurityCheck(toolName, toolInput) {
  // 检查敏感路径访问
  if (toolInput.file_path || toolInput.path) {
    const targetPath = toolInput.file_path || toolInput.path;
    const expandedPath = expandPath(targetPath);
    
    for (const sensitive of SENSITIVE_PATHS) {
      if (expandedPath.startsWith(expandPath(sensitive))) {
        return {
          allowed: false,
          reason: `禁止访问敏感路径: ${sensitive}`
        };
      }
    }
  }
  
  // 检查命令执行
  if (toolName === 'RunCommand' || toolName === 'Bash') {
    const command = toolInput.command || '';
    const dangerousPatterns = [
      /rm\s+-rf\s+\//,
      /sudo\s+/,
      /chmod\s+777/,
      />\s*\/dev\/sd/,
      /mkfs/,
      /dd\s+if=/
    ];
    
    for (const pattern of dangerousPatterns) {
      if (pattern.test(command)) {
        return {
          allowed: false,
          reason: `检测到危险命令模式`
        };
      }
    }
  }
  
  return { allowed: true };
}

/**
 * 展开路径
 * @param {string} p - 路径
 * @returns {string} 展开后的路径
 */
function expandPath(p) {
  if (p.startsWith('~')) {
    return path.join(os.homedir(), p.slice(1));
  }
  return path.resolve(p);
}

/**
 * 记录审计日志
 * @param {string} toolName - 工具名称
 * @param {Object} toolInput - 工具输入
 */
async function logAudit(toolName, toolInput) {
  const logDir = path.dirname(AUDIT_LOG);
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
  }
  
  const entry = {
    timestamp: new Date().toISOString(),
    tool: toolName,
    input: sanitizeInput(toolInput),
    user: os.userInfo().username
  };
  
  fs.appendFileSync(AUDIT_LOG, JSON.stringify(entry) + '\n');
}

/**
 * 清理敏感输入
 * @param {Object} input - 输入对象
 * @returns {Object} 清理后的对象
 */
function sanitizeInput(input) {
  const sanitized = { ...input };
  const sensitiveKeys = ['password', 'token', 'secret', 'key', 'credential'];
  
  for (const key of Object.keys(sanitized)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

main().catch(console.error);
```

---

## post-tool-use.js

工具调用后执行的 Hook，用于结果处理、状态更新、通知。

```javascript
#!/usr/bin/env node

/**
 * Post-Tool-Use Hook
 * 在工具调用后执行
 * 
 * 功能：
 * - 处理工具结果
 * - 更新状态
 * - 发送通知
 * - 记录指标
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const METRICS_FILE = path.join(os.homedir(), '.claude', 'metrics.json');

/**
 * 主函数
 */
async function main() {
  const toolName = process.env.CLAUDE_TOOL_NAME;
  const toolInput = JSON.parse(process.env.CLAUDE_TOOL_INPUT || '{}');
  const toolResult = process.env.CLAUDE_TOOL_RESULT || '';
  const executionTime = parseInt(process.env.CLAUDE_TOOL_TIME || '0');
  
  console.log(`[Post-Tool-Use] 工具: ${toolName}`);
  console.log(`[Post-Tool-Use] 执行时间: ${executionTime}ms`);
  
  // 更新指标
  await updateMetrics(toolName, executionTime);
  
  // 处理特定工具的结果
  await handleToolResult(toolName, toolInput, toolResult);
  
  console.log('[Post-Tool-Use] 完成');
}

/**
 * 更新指标
 * @param {string} toolName - 工具名称
 * @param {number} executionTime - 执行时间
 */
async function updateMetrics(toolName, executionTime) {
  let metrics = {};
  
  if (fs.existsSync(METRICS_FILE)) {
    metrics = JSON.parse(fs.readFileSync(METRICS_FILE, 'utf-8'));
  }
  
  if (!metrics.tools) {
    metrics.tools = {};
  }
  
  if (!metrics.tools[toolName]) {
    metrics.tools[toolName] = {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      maxTime: 0
    };
  }
  
  const tool = metrics.tools[toolName];
  tool.count++;
  tool.totalTime += executionTime;
  tool.avgTime = Math.round(tool.totalTime / tool.count);
  tool.maxTime = Math.max(tool.maxTime, executionTime);
  
  metrics.lastUpdated = new Date().toISOString();
  
  fs.writeFileSync(METRICS_FILE, JSON.stringify(metrics, null, 2));
}

/**
 * 处理工具结果
 * @param {string} toolName - 工具名称
 * @param {Object} toolInput - 工具输入
 * @param {string} toolResult - 工具结果
 */
async function handleToolResult(toolName, toolInput, toolResult) {
  switch (toolName) {
    case 'Write':
    case 'Edit':
      console.log(`[Post-Tool-Use] 文件已修改: ${toolInput.file_path}`);
      break;
      
    case 'RunCommand':
      if (toolResult.includes('error') || toolResult.includes('Error')) {
        console.log('[Post-Tool-Use] ⚠️ 命令执行可能有错误');
      }
      break;
      
    case 'Grep':
    case 'SearchCodebase':
      const matchCount = (toolResult.match(/\n/g) || []).length;
      console.log(`[Post-Tool-Use] 找到 ${matchCount} 个匹配`);
      break;
  }
}

main().catch(console.error);
```

---

## 配置示例

### settings.json 配置

```json
{
  "hooks": {
    "SessionStart": {
      "command": "node",
      "args": ["/path/to/hooks/session-start.js"],
      "timeout": 5000
    },
    "SessionEnd": {
      "command": "node",
      "args": ["/path/to/hooks/session-end.js"],
      "timeout": 5000
    },
    "PreCompact": {
      "command": "node",
      "args": ["/path/to/hooks/pre-compact.js"],
      "timeout": 3000
    },
    "PreToolUse": {
      "command": "node",
      "args": ["/path/to/hooks/pre-tool-use.js"],
      "timeout": 2000
    },
    "PostToolUse": {
      "command": "node",
      "args": ["/path/to/hooks/post-tool-use.js"],
      "timeout": 2000
    }
  }
}
```

### 环境变量

```bash
# 会话配置
export CLAUDE_SESSION_ID="session-$(date +%s)"
export CLAUDE_MAX_CONTEXT="200000"
export CLAUDE_CONTEXT_SIZE="50000"

# 安全配置
export CLAUDE_BLOCKED_TOOLS="ExecuteBash,RunCommand"

# 项目配置
export PROJECT_ROOT="/path/to/project"
```

## 相关文档

- [hooks-overview.md](./hooks-overview.md) - Hooks 系统概述
- [hooks-recipes.md](./hooks-recipes.md) - Hooks 配方
- [example-project-config.md](./example-project-config.md) - 项目配置示例
