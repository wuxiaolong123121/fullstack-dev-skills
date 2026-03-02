# 审查模式上下文参考

整合审查模式上下文核心内容，包含质量检查配置、安全审计配置、代码规范检查、审查上下文模板和检查清单，用于构建完整的代码审查体系。

## When to Activate

- 执行代码审查任务
- 配置审查工作流
- 制定审查标准
- 审查上下文构建

## Core Principles

### 1. 系统性审查

审查应覆盖代码的各个维度，确保全面评估。

```markdown
# Good: 系统性审查覆盖
审查维度：
- 功能正确性
- 代码质量
- 安全性
- 性能
- 可维护性
- 测试覆盖

# Bad: 片面审查
只检查代码风格，忽略安全和性能
```

### 2. 上下文驱动

审查决策应基于项目上下文，而非教条式规则。

```markdown
# Good: 基于上下文
考虑到这是一个原型项目，可以接受部分硬编码配置。
建议在正式版本中迁移到配置文件。

# Bad: 脱离上下文
这是最佳实践，必须这样写。
```

### 3. 可操作性反馈

反馈应具体、可操作，提供明确的改进方向。

```markdown
# Good: 可操作反馈
建议将 `processData` 函数拆分为：
- `validateInput()` - 输入验证
- `transformData()` - 数据转换
原因：当前函数 150 行，违反单一职责原则

# Bad: 模糊反馈
代码需要优化
```

## 质量检查配置

### 质量门禁配置

```yaml
# quality-gates.yml
quality_gates:
  overall_threshold: 80
  
  dimensions:
    reliability:
      weight: 0.25
      threshold: 75
      metrics:
        - name: bug_count
          threshold: 0
          severity: blocker
        - name: code_smells
          threshold: 10
          severity: warning
        - name: technical_debt_ratio
          threshold: 5
          severity: info
    
    security:
      weight: 0.30
      threshold: 85
      metrics:
        - name: vulnerabilities
          threshold: 0
          severity: blocker
        - name: security_hotspots
          threshold: 3
          severity: warning
    
    maintainability:
      weight: 0.20
      threshold: 70
      metrics:
        - name: cognitive_complexity
          threshold: 15
          severity: warning
        - name: duplicated_lines_density
          threshold: 3
          severity: info
        - name: comment_density
          min: 10
          max: 40
          severity: info
    
    coverage:
      weight: 0.15
      threshold: 80
      metrics:
        - name: line_coverage
          threshold: 80
          severity: warning
        - name: branch_coverage
          threshold: 70
          severity: warning
        - name: new_code_coverage
          threshold: 90
          severity: blocker
    
    performance:
      weight: 0.10
      threshold: 75
      metrics:
        - name: response_time_p95
          threshold: 500
          unit: ms
          severity: warning
        - name: memory_leak_risk
          threshold: 0
          severity: blocker
```

### 质量度量指标

```typescript
/**
 * 质量度量配置接口
 * @description 定义质量度量的标准配置
 */
interface QualityMetric {
  name: string;
  displayName: string;
  description: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  severity: 'blocker' | 'critical' | 'warning' | 'info';
  weight: number;
}

/**
 * 质量检查器配置
 */
const QUALITY_CHECKER_CONFIG: QualityMetric[] = [
  {
    name: 'cyclomatic_complexity',
    displayName: '圈复杂度',
    description: '函数的圈复杂度不应超过阈值',
    threshold: 15,
    operator: 'lte',
    severity: 'warning',
    weight: 0.15
  },
  {
    name: 'cognitive_complexity',
    displayName: '认知复杂度',
    description: '代码的认知负担不应过高',
    threshold: 20,
    operator: 'lte',
    severity: 'warning',
    weight: 0.15
  },
  {
    name: 'lines_of_code',
    displayName: '代码行数',
    description: '单文件代码行数限制',
    threshold: 500,
    operator: 'lte',
    severity: 'info',
    weight: 0.05
  },
  {
    name: 'function_length',
    displayName: '函数长度',
    description: '单函数代码行数限制',
    threshold: 50,
    operator: 'lte',
    severity: 'warning',
    weight: 0.10
  },
  {
    name: 'parameter_count',
    displayName: '参数数量',
    description: '函数参数数量限制',
    threshold: 5,
    operator: 'lte',
    severity: 'info',
    weight: 0.05
  },
  {
    name: 'nesting_depth',
    displayName: '嵌套深度',
    description: '代码嵌套层级限制',
    threshold: 4,
    operator: 'lte',
    severity: 'warning',
    weight: 0.10
  }
];

/**
 * 质量评分计算器
 */
class QualityScoreCalculator {
  private metrics: QualityMetric[];

  /**
   * 初始化评分计算器
   * @param metrics - 质量度量配置
   */
  constructor(metrics: QualityMetric[] = QUALITY_CHECKER_CONFIG) {
    this.metrics = metrics;
  }

  /**
   * 计算质量评分
   * @param measurements - 实际测量值
   * @returns 质量评分结果
   */
  calculate(measurements: Record<string, number>): {
    score: number;
    passed: boolean;
    details: Array<{ metric: string; passed: boolean; value: number }>;
  } {
    let totalScore = 0;
    let totalWeight = 0;
    const details: Array<{ metric: string; passed: boolean; value: number }> = [];

    for (const metric of this.metrics) {
      const value = measurements[metric.name] ?? 0;
      const passed = this.evaluateMetric(metric, value);
      
      totalScore += passed ? metric.weight : 0;
      totalWeight += metric.weight;
      
      details.push({
        metric: metric.displayName,
        passed,
        value
      });
    }

    return {
      score: Math.round((totalScore / totalWeight) * 100),
      passed: totalScore / totalWeight >= 0.8,
      details
    };
  }

  /**
   * 评估单个度量
   * @param metric - 度量配置
   * @param value - 实际值
   * @returns 是否通过
   */
  private evaluateMetric(metric: QualityMetric, value: number): boolean {
    switch (metric.operator) {
      case 'gt': return value > metric.threshold;
      case 'lt': return value < metric.threshold;
      case 'eq': return value === metric.threshold;
      case 'gte': return value >= metric.threshold;
      case 'lte': return value <= metric.threshold;
      default: return false;
    }
  }
}
```

## 安全审计配置

### 安全扫描规则配置

```yaml
# security-rules.yml
security_scanner:
  sast:
    enabled: true
    tools:
      - name: semgrep
        config: semgrep.yml
        severity_threshold: warning
      - name: sonarqube
        quality_gate: strict
      - name: bandit
        targets:
          - "*.py"
    
    rules:
      sql_injection:
        severity: critical
        enabled: true
        cwe: CWE-89
        owasp: A03:2021
        patterns:
          - "execute\\s*\\(.*\\+.*\\)"
          - "query\\s*\\(.*format.*\\)"
          - "cursor\\.execute\\s*\\(.*%.*%.*\\)"
      
      xss:
        severity: high
        enabled: true
        cwe: CWE-79
        owasp: A03:2021
        patterns:
          - "innerHTML\\s*="
          - "document\\.write\\s*\\("
          - "dangerouslySetInnerHTML"
      
      hardcoded_secrets:
        severity: critical
        enabled: true
        cwe: CWE-798
        owasp: A07:2021
        patterns:
          - "(password|secret|api_key|token)\\s*=\\s*[\"'][^\"']{8,}[\"']"
          - "-----BEGIN.*PRIVATE KEY-----"
      
      insecure_deserialization:
        severity: high
        enabled: true
        cwe: CWE-502
        owasp: A08:2021
        patterns:
          - "pickle\\.loads?\\s*\\("
          - "yaml\\.load\\s*\\([^)]*\\)"
          - "ObjectInputStream"
      
      path_traversal:
        severity: high
        enabled: true
        cwe: CWE-22
        patterns:
          - "\\.\\./"
          - "\\.\\\\"
          - "Path\\s*\\.\\s*combine.*\\+"

  dast:
    enabled: true
    tools:
      - name: owasp-zap
        scan_type: active
        authentication: required
      - name: burp-suite
        scan_profile: thorough
    
    test_cases:
      - type: sql_injection
        payloads_file: payloads/sql.txt
        expected_behavior: error_safe_response
      
      - type: xss
        payloads_file: payloads/xss.txt
        expected_behavior: encoded_output
      
      - type: auth_bypass
        test_paths:
          - "/admin"
          - "/api/users"
          - "/api/settings"

  sca:
    enabled: true
    tools:
      - name: snyk
        monitor: true
      - name: dependabot
        auto_merge: patch
      - name: pip-audit
        targets:
          - requirements.txt
          - pyproject.toml
    
    vulnerability_policy:
      critical: fix_immediately
      high: fix_within_24h
      medium: fix_within_7d
      low: fix_in_next_release
    
    license_policy:
      allowed:
        - MIT
        - Apache-2.0
        - BSD-3-Clause
        - ISC
      prohibited:
        - GPL-3.0
        - AGPL-3.0
        - SSPL
      review_required:
        - LGPL-3.0
        - MPL-2.0
```

### 安全审计检查器

```typescript
/**
 * 安全审计配置接口
 * @description 定义安全审计的标准配置
 */
interface SecurityAuditConfig {
  sast: SASTConfig;
  dast: DASTConfig;
  sca: SCAConfig;
  secrets: SecretsConfig;
}

/**
 * SAST 配置
 */
interface SASTConfig {
  enabled: boolean;
  rules: SecurityRule[];
  excludePatterns: string[];
  severityThreshold: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * 安全规则定义
 */
interface SecurityRule {
  id: string;
  name: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  cwe: string;
  owasp: string;
  enabled: boolean;
  patterns: string[];
  recommendation: string;
}

/**
 * 安全审计器
 */
class SecurityAuditor {
  private config: SecurityAuditConfig;
  private findings: SecurityFinding[] = [];

  /**
   * 初始化安全审计器
   * @param config - 审计配置
   */
  constructor(config: SecurityAuditConfig) {
    this.config = config;
  }

  /**
   * 执行安全审计
   * @param codebase - 代码库路径
   * @returns 审计结果
   */
  async audit(codebase: string): Promise<SecurityAuditResult> {
    this.findings = [];

    if (this.config.sast.enabled) {
      await this.runSAST(codebase);
    }

    return this.generateResult();
  }

  /**
   * 运行静态分析
   * @param codebase - 代码库路径
   */
  private async runSAST(codebase: string): Promise<void> {
    for (const rule of this.config.sast.rules) {
      if (!rule.enabled) continue;

      const matches = await this.scanForPattern(codebase, rule.patterns);
      
      for (const match of matches) {
        this.findings.push({
          ruleId: rule.id,
          severity: rule.severity,
          file: match.file,
          line: match.line,
          code: match.code,
          message: `检测到 ${rule.name} 风险`,
          recommendation: rule.recommendation,
          cwe: rule.cwe,
          owasp: rule.owasp
        });
      }
    }
  }

  /**
   * 扫描模式匹配
   * @param codebase - 代码库路径
   * @param patterns - 正则模式列表
   * @returns 匹配结果
   */
  private async scanForPattern(
    codebase: string,
    patterns: string[]
  ): Promise<PatternMatch[]> {
    return [];
  }

  /**
   * 生成审计结果
   * @returns 审计结果
   */
  private generateResult(): SecurityAuditResult {
    const summary = {
      total: this.findings.length,
      critical: this.findings.filter(f => f.severity === 'critical').length,
      high: this.findings.filter(f => f.severity === 'high').length,
      medium: this.findings.filter(f => f.severity === 'medium').length,
      low: this.findings.filter(f => f.severity === 'low').length
    };

    return {
      passed: summary.critical === 0 && summary.high === 0,
      summary,
      findings: this.findings
    };
  }
}

/**
 * 安全发现接口
 */
interface SecurityFinding {
  ruleId: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line: number;
  code: string;
  message: string;
  recommendation: string;
  cwe: string;
  owasp: string;
}

/**
 * 安全审计结果接口
 */
interface SecurityAuditResult {
  passed: boolean;
  summary: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  findings: SecurityFinding[];
}
```

## 代码规范检查

### 规范检查配置

```yaml
# linting-config.yml
linting:
  javascript:
    linter: eslint
    config: .eslintrc.js
    formatter: stylish
    rules:
      complexity:
        - warn
        - 15
      max-lines:
        - warn
        - max: 500
          skipBlankLines: true
      max-lines-per-function:
        - warn
        - max: 50
      max-params:
        - warn
        - 5
      max-depth:
        - warn
        - 4
      no-unused-vars: error
      no-console: warn
      prefer-const: error
      eqeqeq:
        - error
        - always
  
  typescript:
    linter: eslint
    extends:
      - eslint:recommended
      - "@typescript-eslint/recommended"
      - "@typescript-eslint/recommended-requiring-type-checking"
    rules:
      "@typescript-eslint/explicit-function-return-type": warn
      "@typescript-eslint/no-explicit-any": error
      "@typescript-eslint/no-unsafe-assignment": error
      "@typescript-eslint/no-unsafe-member-access": error
      "@typescript-eslint/prefer-nullish-coalescing": warn
  
  python:
    linter: ruff
    config: pyproject.toml
    select:
      - E    # pycodestyle errors
      - F    # pyflakes
      - I    # isort
      - N    # pep8-naming
      - W    # pycodestyle warnings
      - UP   # pyupgrade
      - B    # flake8-bugbear
      - C4   # flake8-comprehensions
      - DTZ  # flake8-datetimez
      - RUF  # ruff-specific rules
    ignore:
      - E501 # line too long (handled by formatter)
    max_line_length: 88
  
  go:
    linter: golangci-lint
    enable:
      - gofmt
      - goimports
      - govet
      - errcheck
      - staticcheck
      - ineffassign
      - typecheck
      - gosimple
      - goconst
      - gocyclo
    gocyclo:
      min-complexity: 15

formatting:
  javascript:
    formatter: prettier
    config: .prettierrc
    print_width: 100
    tab_width: 2
    use_tabs: false
    semi: true
    single_quote: true
    trailing_comma: es5
  
  python:
    formatter: black
    line_length: 88
    target_version:
      - py39
      - py310
      - py311
  
  go:
    formatter: gofmt
    simplify: true
```

### 规范检查器实现

```typescript
/**
 * 代码规范检查器
 * @description 执行代码风格和规范检查
 */
class CodeStyleChecker {
  private config: LintingConfig;

  /**
   * 初始化规范检查器
   * @param config - 检查配置
   */
  constructor(config: LintingConfig) {
    this.config = config;
  }

  /**
   * 检查命名规范
   * @param name - 标识符名称
   * @param type - 标识符类型
   * @returns 检查结果
   */
  checkNaming(name: string, type: 'variable' | 'function' | 'class' | 'constant'): NamingResult {
    const rules: Record<string, RegExp> = {
      variable: /^[a-z][a-zA-Z0-9]*$/,
      function: /^[a-z][a-zA-Z0-9]*$/,
      class: /^[A-Z][a-zA-Z0-9]*$/,
      constant: /^[A-Z][A-Z0-9_]*$/
    };

    const pattern = rules[type];
    const passed = pattern.test(name);

    return {
      passed,
      name,
      type,
      expected: this.getNamingDescription(type),
      actual: name
    };
  }

  /**
   * 获取命名规范描述
   * @param type - 标识符类型
   * @returns 规范描述
   */
  private getNamingDescription(type: string): string {
    const descriptions: Record<string, string> = {
      variable: 'camelCase (小驼峰)',
      function: 'camelCase (小驼峰)',
      class: 'PascalCase (大驼峰)',
      constant: 'UPPER_SNAKE_CASE (全大写下划线)'
    };
    return descriptions[type];
  }

  /**
   * 检查函数复杂度
   * @param functionCode - 函数代码
   * @returns 复杂度结果
   */
  checkComplexity(functionCode: string): ComplexityResult {
    const cyclomaticComplexity = this.calculateCyclomaticComplexity(functionCode);
    const cognitiveComplexity = this.calculateCognitiveComplexity(functionCode);
    const nestingDepth = this.calculateNestingDepth(functionCode);
    const linesOfCode = functionCode.split('\n').length;

    return {
      cyclomaticComplexity,
      cognitiveComplexity,
      nestingDepth,
      linesOfCode,
      passed: cyclomaticComplexity <= 15 && 
              cognitiveComplexity <= 20 && 
              nestingDepth <= 4 &&
              linesOfCode <= 50
    };
  }

  /**
   * 计算圈复杂度
   * @param code - 代码字符串
   * @returns 圈复杂度值
   */
  private calculateCyclomaticComplexity(code: string): number {
    const patterns = [
      /\bif\b/g,
      /\belse\s+if\b/g,
      /\bfor\b/g,
      /\bwhile\b/g,
      /\bcase\b/g,
      /\bcatch\b/g,
      /\?\s*[^:]+:/g,
      /&&/g,
      /\|\|/g
    ];

    let complexity = 1;
    for (const pattern of patterns) {
      const matches = code.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    }
    return complexity;
  }

  /**
   * 计算认知复杂度
   * @param code - 代码字符串
   * @returns 认知复杂度值
   */
  private calculateCognitiveComplexity(code: string): number {
    let complexity = 0;
    let nestingLevel = 0;
    const lines = code.split('\n');

    for (const line of lines) {
      if (/\b(if|for|while|switch)\b/.test(line)) {
        complexity += 1 + nestingLevel;
        nestingLevel++;
      }
      if (/\b(else|elif|case)\b/.test(line)) {
        complexity += 1;
      }
      if (/^\s*[})\]]/.test(line)) {
        nestingLevel = Math.max(0, nestingLevel - 1);
      }
    }

    return complexity;
  }

  /**
   * 计算嵌套深度
   * @param code - 代码字符串
   * @returns 最大嵌套深度
   */
  private calculateNestingDepth(code: string): number {
    let maxDepth = 0;
    let currentDepth = 0;
    const lines = code.split('\n');

    for (const line of lines) {
      const opens = (line.match(/[{\[\(]/g) || []).length;
      const closes = (line.match(/[}\]\)]/g) || []).length;
      
      currentDepth += opens - closes;
      maxDepth = Math.max(maxDepth, currentDepth);
    }

    return maxDepth;
  }
}

/**
 * 命名检查结果
 */
interface NamingResult {
  passed: boolean;
  name: string;
  type: string;
  expected: string;
  actual: string;
}

/**
 * 复杂度检查结果
 */
interface ComplexityResult {
  cyclomaticComplexity: number;
  cognitiveComplexity: number;
  nestingDepth: number;
  linesOfCode: number;
  passed: boolean;
}

/**
 * 检查配置接口
 */
interface LintingConfig {
  javascript: Record<string, unknown>;
  typescript: Record<string, unknown>;
  python: Record<string, unknown>;
  go: Record<string, unknown>;
}
```

## 审查上下文模板

### 审查上下文结构

```typescript
/**
 * 审查上下文接口
 * @description 定义审查时需要的上下文信息
 */
interface ReviewContext {
  project: ProjectContext;
  change: ChangeContext;
  standards: StandardsContext;
  history: HistoryContext;
}

/**
 * 项目上下文
 */
interface ProjectContext {
  name: string;
  language: string;
  framework: string;
  architecture: string;
  codingStyle: string;
  testFramework: string;
  ciPlatform: string;
}

/**
 * 变更上下文
 */
interface ChangeContext {
  type: 'feature' | 'bugfix' | 'refactor' | 'docs' | 'test' | 'chore';
  scope: string[];
  files: FileInfo[];
  additions: number;
  deletions: number;
  description: string;
  relatedIssues: string[];
}

/**
 * 文件信息
 */
interface FileInfo {
  path: string;
  language: string;
  additions: number;
  deletions: number;
  changeType: 'added' | 'modified' | 'renamed' | 'deleted';
}

/**
 * 标准上下文
 */
interface StandardsContext {
  codingGuidelines: string;
  securityPolicies: string[];
  performanceRequirements: string[];
  testingRequirements: string[];
  documentationRequirements: string[];
}

/**
 * 历史上下文
 */
interface HistoryContext {
  previousReviews: ReviewSummary[];
  relatedPRs: string[];
  contributorExperience: 'new' | 'intermediate' | 'experienced';
}

/**
 * 审查摘要
 */
interface ReviewSummary {
  prNumber: number;
  date: string;
  result: 'approved' | 'changes_requested' | 'rejected';
  issuesFound: number;
}

/**
 * 审查上下文构建器
 */
class ReviewContextBuilder {
  private context: Partial<ReviewContext> = {};

  /**
   * 设置项目上下文
   * @param project - 项目信息
   * @returns 构建器实例
   */
  withProject(project: ProjectContext): this {
    this.context.project = project;
    return this;
  }

  /**
   * 设置变更上下文
   * @param change - 变更信息
   * @returns 构建器实例
   */
  withChange(change: ChangeContext): this {
    this.context.change = change;
    return this;
  }

  /**
   * 设置标准上下文
   * @param standards - 标准信息
   * @returns 构建器实例
   */
  withStandards(standards: StandardsContext): this {
    this.context.standards = standards;
    return this;
  }

  /**
   * 设置历史上下文
   * @param history - 历史信息
   * @returns 构建器实例
   */
  withHistory(history: HistoryContext): this {
    this.context.history = history;
    return this;
  }

  /**
   * 构建审查上下文
   * @returns 完整的审查上下文
   */
  build(): ReviewContext {
    return {
      project: this.context.project ?? this.getDefaultProject(),
      change: this.context.change ?? this.getDefaultChange(),
      standards: this.context.standards ?? this.getDefaultStandards(),
      history: this.context.history ?? this.getDefaultHistory()
    };
  }

  /**
   * 获取默认项目上下文
   * @returns 默认项目上下文
   */
  private getDefaultProject(): ProjectContext {
    return {
      name: 'unknown',
      language: 'typescript',
      framework: 'none',
      architecture: 'modular',
      codingStyle: 'standard',
      testFramework: 'jest',
      ciPlatform: 'github-actions'
    };
  }

  /**
   * 获取默认变更上下文
   * @returns 默认变更上下文
   */
  private getDefaultChange(): ChangeContext {
    return {
      type: 'feature',
      scope: [],
      files: [],
      additions: 0,
      deletions: 0,
      description: '',
      relatedIssues: []
    };
  }

  /**
   * 获取默认标准上下文
   * @returns 默认标准上下文
   */
  private getDefaultStandards(): StandardsContext {
    return {
      codingGuidelines: 'standard',
      securityPolicies: ['OWASP Top 10'],
      performanceRequirements: [],
      testingRequirements: ['80% coverage'],
      documentationRequirements: ['API docs required']
    };
  }

  /**
   * 获取默认历史上下文
   * @returns 默认历史上下文
   */
  private getDefaultHistory(): HistoryContext {
    return {
      previousReviews: [],
      relatedPRs: [],
      contributorExperience: 'intermediate'
    };
  }
}
```

### 审查提示模板

```markdown
# 审查提示模板

## 系统提示
你是一位经验丰富的代码审查专家。请基于以下上下文进行代码审查：

### 项目信息
- 项目名称: {{project.name}}
- 编程语言: {{project.language}}
- 框架: {{project.framework}}
- 架构模式: {{project.architecture}}

### 变更信息
- 变更类型: {{change.type}}
- 变更范围: {{change.scope}}
- 文件数量: {{change.files.length}}
- 新增行数: {{change.additions}}
- 删除行数: {{change.deletions}}
- 变更描述: {{change.description}}

### 审查标准
- 编码规范: {{standards.codingGuidelines}}
- 安全策略: {{standards.securityPolicies}}
- 测试要求: {{standards.testingRequirements}}

### 审查重点
{{#if (eq change.type "feature")}}
- 功能实现完整性
- 边界条件处理
- 测试覆盖
{{/if}}
{{#if (eq change.type "bugfix")}}
- 问题根因分析
- 修复方案正确性
- 回归测试
{{/if}}
{{#if (eq change.type "refactor")}}
- 重构目的明确性
- 行为一致性
- 性能影响
{{/if}}

## 输出格式
请按以下格式输出审查结果：

### 总体评价
[简要评价本次变更]

### 问题列表
| 严重程度 | 文件 | 行号 | 问题描述 | 建议修改 |
|---------|------|------|---------|---------|
| [P0/P1/P2/P3] | [文件路径] | [行号] | [描述] | [建议] |

### 良好实践
[值得肯定的地方]

### 后续建议
[改进建议]
```

## 检查清单

### 功能正确性检查清单

```markdown
## 功能正确性检查清单

### 需求实现
- [ ] 代码实现了需求文档中的所有功能点
- [ ] 功能实现与设计文档一致
- [ ] 没有实现需求之外的功能
- [ ] 功能开关配置正确

### 边界条件
- [ ] 处理了空值/null/undefined 情况
- [ ] 处理了空集合/空数组情况
- [ ] 处理了零值情况
- [ ] 处理了最大值/最小值边界
- [ ] 处理了类型转换边界

### 错误处理
- [ ] 异常被正确捕获和处理
- [ ] 错误信息清晰有意义
- [ ] 错误不会导致数据不一致
- [ ] 错误恢复机制合理
- [ ] 错误日志记录完整

### 数据验证
- [ ] 输入数据经过验证
- [ ] 数据格式正确性检查
- [ ] 数据范围有效性检查
- [ ] 数据完整性检查
- [ ] 数据一致性检查

### 业务逻辑
- [ ] 业务规则实现正确
- [ ] 状态转换正确
- [ ] 业务流程完整
- [ ] 并发场景处理正确
- [ ] 事务处理正确
```

### 代码质量检查清单

```markdown
## 代码质量检查清单

### 命名规范
- [ ] 变量名具有描述性
- [ ] 函数名使用动词短语
- [ ] 类名使用名词短语
- [ ] 常量名全大写下划线
- [ ] 避免使用缩写和单字母变量
- [ ] 命名风格一致

### 代码结构
- [ ] 函数长度适中（< 50 行）
- [ ] 类职责单一
- [ ] 文件结构清晰
- [ ] 模块划分合理
- [ ] 依赖关系清晰

### 代码复杂度
- [ ] 圈复杂度 < 15
- [ ] 认知复杂度 < 20
- [ ] 嵌套深度 < 4
- [ ] 参数数量 < 5
- [ ] 没有深层嵌套

### 代码重复
- [ ] 没有重复代码块
- [ ] 公共逻辑已提取
- [ ] 使用常量替代魔法值
- [ ] 使用函数/方法复用逻辑

### 注释与文档
- [ ] 复杂逻辑有注释说明
- [ ] 公共 API 有文档注释
- [ ] 注释与代码同步
- [ ] 没有无意义注释
- [ ] TODO 有责任人或工单
```

### 安全性检查清单

```markdown
## 安全性检查清单

### 输入验证
- [ ] 所有外部输入都经过验证
- [ ] 使用白名单验证
- [ ] 验证数据类型、长度、格式
- [ ] 防止 SQL 注入
- [ ] 防止 XSS 攻击
- [ ] 防止命令注入
- [ ] 防止路径遍历

### 认证授权
- [ ] 敏感操作需要认证
- [ ] 权限检查在服务端执行
- [ ] Session 管理安全
- [ ] 密码存储使用安全哈希
- [ ] 使用 HTTPS 传输
- [ ] Token 管理安全

### 数据保护
- [ ] 敏感数据加密存储
- [ ] 日志不包含敏感信息
- [ ] 错误信息不泄露系统细节
- [ ] API 密钥不在代码中
- [ ] 使用环境变量管理配置
- [ ] 数据脱敏处理

### 依赖安全
- [ ] 依赖版本无已知漏洞
- [ ] 使用官方或可信源
- [ ] 定期更新依赖
- [ ] 锁定依赖版本
- [ ] 许可证合规
```

### 性能检查清单

```markdown
## 性能检查清单

### 算法效率
- [ ] 时间复杂度可接受
- [ ] 空间复杂度可接受
- [ ] 避免不必要的计算
- [ ] 使用合适的数据结构
- [ ] 循环内避免重复操作

### 数据库性能
- [ ] 查询有适当的索引
- [ ] 避免 N+1 查询
- [ ] 使用连接池
- [ ] 批量操作替代循环查询
- [ ] 分页处理大数据集
- [ ] 避免 SELECT *

### 内存管理
- [ ] 无内存泄漏
- [ ] 及时释放资源
- [ ] 避免大对象频繁创建
- [ ] 使用流式处理大文件
- [ ] 缓存策略合理

### 前端性能
- [ ] 资源压缩和合并
- [ ] 图片优化
- [ ] 懒加载实现
- [ ] 避免阻塞渲染
- [ ] 缓存策略合理
```

### 测试检查清单

```markdown
## 测试检查清单

### 单元测试
- [ ] 测试覆盖率达标（> 80%）
- [ ] 边界条件有测试
- [ ] 异常情况有测试
- [ ] 测试用例独立
- [ ] 测试命名清晰

### 集成测试
- [ ] API 接口有测试
- [ ] 数据库操作有测试
- [ ] 外部服务有测试
- [ ] 测试环境隔离

### 测试质量
- [ ] 测试可重复执行
- [ ] 测试执行快速
- [ ] 测试结果稳定
- [ ] 断言充分
- [ ] Mock 使用合理
```

## Quick Reference: 审查维度速查

| 维度 | 核心检查项 | 工具支持 |
|------|-----------|---------|
| 功能正确性 | 需求实现、边界条件、错误处理 | 测试用例、手动验证 |
| 代码质量 | 命名、复杂度、重复、结构 | ESLint、SonarQube |
| 安全性 | 注入、XSS、认证、数据保护 | SAST、DAST、SCA |
| 性能 | 算法、数据库、内存 | Profiler、Lighthouse |
| 可维护性 | 文档、注释、模块化 | 复杂度分析 |
| 测试 | 覆盖率、边界用例、集成测试 | Jest、Coverage |

## Anti-Patterns to Avoid

```markdown
## 审查反模式

# Bad: 片面审查
只检查代码风格，忽略安全和性能

# Good: 全面审查
系统性覆盖所有审查维度

---

# Bad: 教条式审查
这是最佳实践，必须这样写

# Good: 上下文驱动
考虑到项目实际情况，建议...

---

# Bad: 模糊反馈
代码需要优化

# Good: 具体反馈
建议将函数拆分，原因：当前 150 行违反单一职责原则

---

# Bad: 过度挑剔
这个变量名不够完美

# Good: 抓住重点
聚焦影响功能和质量的关键问题

---

# Bad: 延迟审查
我太忙了，下周再看

# Good: 及时响应
24 小时内完成审查，紧急情况 4 小时响应
```

**Remember**: 审查上下文是高质量审查的基础。完整的上下文信息能帮助审查者做出更准确的判断，提供更有价值的反馈。
