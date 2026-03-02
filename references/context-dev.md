# 开发模式上下文参考

开发专注模式配置、快速迭代策略、调试模式配置及上下文注入模板，用于构建高效、专注的开发工作流。

## When to Activate

- 进入深度开发状态
- 需要快速迭代验证
- 调试复杂问题
- 上下文注入与切换
- 多任务并行开发

## Core Principles

### 1. Focus First

开发专注模式优先考虑深度工作，减少上下文切换开销。

```yaml
# 开发专注模式配置
focus_mode:
  enabled: true
  duration_minutes: 90
  break_interval_minutes: 15
  notifications: muted
  auto_save_interval_seconds: 30
  context_preservation: true
```

### 2. Iterate Rapidly

快速迭代策略强调小步快跑，持续验证。

```yaml
# 快速迭代配置
iteration:
  cycle_time_minutes: 25
  commit_frequency: high
  test_first: true
  rollback_enabled: true
  auto_rollback_on_failure: true
  max_retry_count: 3
```

### 3. Debug Systematically

调试模式采用系统化方法，确保问题可追踪、可复现。

```yaml
# 调试模式配置
debug_mode:
  log_level: verbose
  stack_trace_depth: 10
  variable_inspection: true
  breakpoint_persistence: true
  watch_expressions:
    - "this.state"
    - "response.data"
    - "error.message"
  auto_attach_debugger: true
```

## 开发专注模式配置

### 基础配置

```yaml
# focus-config.yaml
focus:
  name: "deep-work-session"
  version: "1.0.0"
  
  # 时间配置
  timing:
    pomodoro_duration: 25
    long_break_duration: 15
    short_break_duration: 5
    sessions_before_long_break: 4
    
  # 环境配置
  environment:
    ide_theme: "dark"
    font_size: 14
    line_height: 1.6
    minimap: false
    sidebar: hidden
    terminal_panel: bottom
    
  # 通知配置
  notifications:
    desktop: disabled
    sound: disabled
    ide: critical_only
    
  # 自动化配置
  automation:
    auto_save: true
    auto_format: true
    auto_import_organize: true
    auto_test_on_save: false
```

### 高级配置

```yaml
# focus-advanced.yaml
focus_advanced:
  # 上下文保持
  context_retention:
    enabled: true
    max_contexts: 5
    auto_switch_threshold_seconds: 300
    
  # 任务追踪
  task_tracking:
    enabled: true
    auto_log_time: true
    completion_sound: true
    
  # 屏蔽规则
  blocking:
    websites:
      - "social-media.com"
      - "news-site.com"
    applications:
      - "slack"
      - "teams"
    exceptions:
      - "stackoverflow.com"
      - "github.com"
```

## 快速迭代策略

### 迭代工作流配置

```yaml
# iteration-workflow.yaml
iteration_workflow:
  # 迭代周期配置
  cycles:
    micro:
      duration_minutes: 5
      deliverable: "single_function_or_fix"
    mini:
      duration_minutes: 15
      deliverable: "feature_slice"
    standard:
      duration_minutes: 25
      deliverable: "complete_feature"
      
  # 验证策略
  validation:
    unit_tests: required
    integration_tests: optional
    lint_check: required
    type_check: required
    
  # 提交策略
  commit:
    strategy: "wip_commits"
    auto_message: true
    push_frequency: "after_each_cycle"
    
  # 回滚配置
  rollback:
    enabled: true
    auto_on_test_failure: true
    preserve_stash: true
```

### 迭代检查清单

```markdown
## 迭代前检查
- [ ] 明确本次迭代目标
- [ ] 确认依赖项已就绪
- [ ] 检查测试环境状态

## 迭代中检查
- [ ] 保持代码可编译/可运行
- [ ] 每次修改后运行相关测试
- [ ] 记录关键决策

## 迭代后检查
- [ ] 所有测试通过
- [ ] 代码已格式化
- [ ] 类型检查通过
- [ ] 提交信息清晰
```

## 调试模式配置

### 基础调试配置

```yaml
# debug-config.yaml
debug:
  # 日志配置
  logging:
    level: "debug"
    format: "[{timestamp}] [{level}] [{module}] {message}"
    output:
      - console
      - file
    file_path: "./logs/debug.log"
    rotation:
      max_size_mb: 10
      backup_count: 5
      
  # 断点配置
  breakpoints:
    persist: true
    file_path: "./.vscode/breakpoints.json"
    conditional_support: true
    
  # 变量监视
  watch:
    auto_expand: true
    max_depth: 3
    refresh_rate_ms: 100
```

### 高级调试配置

```yaml
# debug-advanced.yaml
debug_advanced:
  # 远程调试
  remote:
    enabled: false
    host: "localhost"
    port: 9229
    protocol: "inspector"
    
  # 性能分析
  profiling:
    cpu_sampling: true
    memory_snapshot: true
    heap_analysis: true
    
  # 异常处理
  exceptions:
    break_on_uncaught: true
    break_on_caught: false
    skip_node_internal: true
    
  # 源码映射
  source_maps:
    enabled: true
    resolve_paths: true
    web_root: "${workspaceFolder}"
```

### 调试模板

```javascript
/**
 * 调试日志工具函数
 * @param {string} tag - 日志标签
 * @param {any} data - 日志数据
 * @param {string} level - 日志级别
 */
function debugLog(tag, data, level = 'debug') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    tag,
    level,
    data,
    stackTrace: new Error().stack
  };
  
  if (process.env.DEBUG_MODE === 'true') {
    console.log(JSON.stringify(logEntry, null, 2));
  }
  
  return logEntry;
}

/**
 * 条件断点辅助函数
 * @param {any} condition - 断点条件
 * @param {string} message - 断点消息
 */
function conditionalBreak(condition, message = 'Conditional breakpoint') {
  if (condition) {
    debugger;
    console.log(`[BREAKPOINT] ${message}`);
  }
}
```

## 上下文注入模板

### 项目上下文模板

```yaml
# context-injection-template.yaml
context_injection:
  # 项目基础信息
  project:
    name: "${PROJECT_NAME}"
    version: "${PROJECT_VERSION}"
    tech_stack: "${TECH_STACK}"
    
  # 代码库上下文
  codebase:
    entry_points:
      - "${ENTRY_POINT_1}"
      - "${ENTRY_POINT_2}"
    key_directories:
      - "${SRC_DIR}"
      - "${TEST_DIR}"
      - "${CONFIG_DIR}"
    important_files:
      - "${PACKAGE_FILE}"
      - "${CONFIG_FILE}"
      
  # 开发环境上下文
  environment:
    node_version: "${NODE_VERSION}"
    package_manager: "${PACKAGE_MANAGER}"
    build_tool: "${BUILD_TOOL}"
    
  # 团队上下文
  team:
    coding_standards: "${CODING_STANDARDS_FILE}"
    pr_template: "${PR_TEMPLATE_FILE}"
    commit_convention: "${COMMIT_CONVENTION}"
```

### 技能上下文模板

```yaml
# skill-context-template.yaml
skill_context:
  # 技能标识
  skill_id: "${SKILL_ID}"
  skill_name: "${SKILL_NAME}"
  skill_version: "${SKILL_VERSION}"
  
  # 能力范围
  capabilities:
    - "${CAPABILITY_1}"
    - "${CAPABILITY_2}"
    
  # 触发条件
  triggers:
    keywords:
      - "${KEYWORD_1}"
      - "${KEYWORD_2}"
    file_patterns:
      - "${FILE_PATTERN_1}"
    commands:
      - "${COMMAND_1}"
      
  # 上下文注入点
  injection_points:
    pre_execution: "${PRE_EXECUTION_HOOK}"
    post_execution: "${POST_EXECUTION_HOOK}"
    on_error: "${ERROR_HOOK}"
```

### 会话上下文模板

```yaml
# session-context-template.yaml
session_context:
  # 会话标识
  session_id: "${SESSION_ID}"
  created_at: "${TIMESTAMP}"
  
  # 用户意图
  user_intent:
    primary: "${PRIMARY_INTENT}"
    secondary:
      - "${SECONDARY_INTENT_1}"
      
  # 工作状态
  work_state:
    current_task: "${CURRENT_TASK}"
    completed_tasks:
      - "${COMPLETED_TASK_1}"
    pending_tasks:
      - "${PENDING_TASK_1}"
      
  # 上下文历史
  history:
    max_entries: 50
    compression_enabled: true
    
  # 恢复配置
  recovery:
    auto_save: true
    save_interval_seconds: 60
    restore_on_restart: true
```

## 触发条件

### 开发专注模式触发

```yaml
# focus-triggers.yaml
focus_triggers:
  # 手动触发
  manual:
    command: "/focus"
    keyboard_shortcut: "Ctrl+Shift+F"
    
  # 自动触发条件
  auto:
    - condition: "file_open_count >= 3"
      action: "suggest_focus_mode"
    - condition: "consecutive_coding_minutes >= 30"
      action: "enter_focus_mode"
    - condition: "git_branch_contains('feature/')"
      action: "enable_feature_context"
      
  # 时间触发
  scheduled:
    - time: "09:00"
      action: "morning_focus_session"
    - time: "14:00"
      action: "afternoon_focus_session"
```

### 快速迭代触发

```yaml
# iteration-triggers.yaml
iteration_triggers:
  # 文件变更触发
  file_change:
    - pattern: "**/*.test.*"
      action: "run_related_tests"
    - pattern: "**/package.json"
      action: "check_dependencies"
      
  # Git 事件触发
  git_events:
    - event: "branch_create"
      action: "init_iteration_context"
    - event: "commit"
      action: "validate_commit_quality"
    - event: "push"
      action: "run_ci_checks"
      
  # 测试结果触发
  test_results:
    - condition: "test_failure"
      action: "enter_debug_mode"
    - condition: "coverage_drop > 5%"
      action: "suggest_coverage_improvement"
```

### 调试模式触发

```yaml
# debug-triggers.yaml
debug_triggers:
  # 错误触发
  errors:
    - type: "runtime_error"
      action: "attach_debugger"
    - type: "test_failure"
      action: "analyze_failure"
    - type: "build_error"
      action: "show_build_context"
      
  # 性能触发
  performance:
    - condition: "response_time > threshold"
      action: "enable_profiling"
    - condition: "memory_usage > 80%"
      action: "memory_analysis"
      
  # 日志触发
  logging:
    - pattern: "ERROR:*"
      action: "capture_error_context"
    - pattern: "WARN:*"
      action: "log_warning_state"
```

### 上下文注入触发

```yaml
# injection-triggers.yaml
injection_triggers:
  # 项目检测触发
  project_detection:
    - file: "package.json"
      inject: "nodejs_context"
    - file: "requirements.txt"
      inject: "python_context"
    - file: "go.mod"
      inject: "golang_context"
    - file: "Cargo.toml"
      inject: "rust_context"
      
  # 文件类型触发
  file_types:
    - pattern: "*.tsx"
      inject: "react_context"
    - pattern: "*.vue"
      inject: "vue_context"
    - pattern: "*.py"
      inject: "python_context"
    - pattern: "*.java"
      inject: "java_context"
      
  # 命令触发
  commands:
    - command: "/debug"
      inject: "debug_context"
    - command: "/test"
      inject: "testing_context"
    - command: "/deploy"
      inject: "deployment_context"
```

## Quick Reference: 上下文开发模式

| 模式 | 触发条件 | 持续时间 | 主要功能 |
|------|----------|----------|----------|
| Focus Mode | 手动/自动 | 25-90分钟 | 深度工作、减少干扰 |
| Iteration | 文件变更/Git事件 | 5-25分钟 | 快速验证、持续集成 |
| Debug Mode | 错误/性能问题 | 问题解决为止 | 系统化调试、日志追踪 |
| Context Injection | 项目检测/命令 | 会话周期 | 上下文加载、状态恢复 |

## Anti-Patterns to Avoid

```yaml
# 错误示例：过度配置
focus_mode:
  notifications: all
  auto_save_interval_seconds: 1
  break_interval_minutes: 1

# 正确示例：合理配置
focus_mode:
  notifications: critical_only
  auto_save_interval_seconds: 30
  break_interval_minutes: 15

# 错误示例：忽略上下文恢复
session_context:
  recovery:
    auto_save: false
    restore_on_restart: false

# 正确示例：启用上下文恢复
session_context:
  recovery:
    auto_save: true
    save_interval_seconds: 60
    restore_on_restart: true

# 错误示例：调试模式过度日志
debug_mode:
  log_level: trace
  stack_trace_depth: 100

# 正确示例：适度调试配置
debug_mode:
  log_level: debug
  stack_trace_depth: 10
```

**Remember**: 开发模式上下文的核心是减少认知负担，让开发者能够专注于真正重要的工作。配置应该服务于工作流，而非增加复杂性。
