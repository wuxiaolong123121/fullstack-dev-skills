# Legacy Modernizer 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求遗留系统迁移、代码重构、系统现代化、绞杀者模式、技术债务处理相关任务

## 核心特性

遗留系统现代化是软件工程的重要领域：

- **绞杀者模式**：渐进式替换遗留系统
- **重构策略**：安全地改进代码结构
- **迁移方法**：数据、业务逻辑、接口迁移
- **技术债务**：识别、评估、偿还技术债务
- **架构演进**：单体到微服务转型
- **兼容层**：新旧系统桥接方案

## 最佳实践

### 绞杀者模式实现

```javascript
/**
 * 绞杀者模式路由器
 * 逐步将请求从遗留系统路由到新系统
 */
class StranglerRouter {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     */
    constructor(config) {
        this.legacyBackend = config.legacyBackend;
        this.newBackend = config.newBackend;
        this.featureFlags = config.featureFlags || new Map();
        this.migrationRules = config.migrationRules || [];
    }

    /**
     * 注册迁移规则
     * @param {Object} rule - 迁移规则
     * @param {string} rule.path - 路径模式
     * @param {string} rule.method - HTTP 方法
     * @param {Function} rule.handler - 处理函数
     * @param {boolean} rule.useNew - 是否使用新系统
     */
    registerMigrationRule(rule) {
        this.migrationRules.push({
            path: rule.path,
            method: rule.method || 'GET',
            handler: rule.handler,
            useNew: rule.useNew || false,
            percentage: rule.percentage || 100,
        });
    }

    /**
     * 匹配迁移规则
     * @param {string} path - 请求路径
     * @param {string} method - HTTP 方法
     * @returns {Object|null} 匹配的规则
     */
    matchRule(path, method) {
        for (const rule of this.migrationRules) {
            const pathMatches = new RegExp(rule.path).test(path);
            const methodMatches = rule.method === '*' || rule.method === method;
            
            if (pathMatches && methodMatches) {
                return rule;
            }
        }
        return null;
    }

    /**
     * 路由请求
     * @param {Object} request - 请求对象
     * @returns {Promise<Object>} 响应对象
     */
    async route(request) {
        const rule = this.matchRule(request.path, request.method);

        if (!rule) {
            return this.forwardToLegacy(request);
        }

        if (rule.useNew) {
            if (this.shouldUseNewSystem(rule, request)) {
                return this.forwardToNew(request);
            }
        }

        if (rule.handler) {
            return rule.handler(request, {
                legacy: this.legacyBackend,
                new: this.newBackend,
            });
        }

        return this.forwardToLegacy(request);
    }

    /**
     * 判断是否使用新系统
     * @param {Object} rule - 迁移规则
     * @param {Object} request - 请求对象
     * @returns {boolean} 是否使用新系统
     */
    shouldUseNewSystem(rule, request) {
        const featureFlag = this.featureFlags.get(rule.path);
        if (featureFlag !== undefined) {
            return featureFlag;
        }

        const percentage = rule.percentage || 100;
        const hash = this.hashRequest(request);
        return (hash % 100) < percentage;
    }

    /**
     * 计算请求哈希值
     * @param {Object} request - 请求对象
     * @returns {number} 哈希值
     */
    hashRequest(request) {
        const str = request.headers['user-id'] || request.ip || Math.random().toString();
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash);
    }

    /**
     * 转发到遗留系统
     * @param {Object} request - 请求对象
     * @returns {Promise<Object>} 响应对象
     */
    async forwardToLegacy(request) {
        return this.legacyBackend.request(request);
    }

    /**
     * 转发到新系统
     * @param {Object} request - 请求对象
     * @returns {Promise<Object>} 响应对象
     */
    async forwardToNew(request) {
        return this.newBackend.request(request);
    }
}

export { StranglerRouter };
```

### 数据迁移工具

```javascript
/**
 * 数据迁移工具类
 * 提供安全的数据迁移功能
 */
class DataMigrator {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     */
    constructor(config) {
        this.sourceDb = config.sourceDb;
        this.targetDb = config.targetDb;
        this.batchSize = config.batchSize || 1000;
        this.dryRun = config.dryRun || false;
        this.migrationLog = [];
    }

    /**
     * 执行数据迁移
     * @param {Object} migration - 迁移配置
     * @returns {Promise<Object>} 迁移结果
     */
    async migrate(migration) {
        const result = {
            sourceTable: migration.sourceTable,
            targetTable: migration.targetTable,
            totalRecords: 0,
            migratedRecords: 0,
            failedRecords: 0,
            errors: [],
            startTime: new Date(),
            endTime: null,
        };

        try {
            const totalCount = await this.getCount(migration.sourceTable, migration.whereClause);
            result.totalRecords = totalCount;

            let offset = 0;
            let hasMore = true;

            while (hasMore) {
                const batch = await this.fetchBatch(
                    migration.sourceTable,
                    migration.columns,
                    migration.whereClause,
                    offset,
                    this.batchSize
                );

                if (batch.length === 0) {
                    hasMore = false;
                    break;
                }

                const transformedData = await this.transformBatch(
                    batch,
                    migration.transform
                );

                if (!this.dryRun) {
                    await this.insertBatch(
                        migration.targetTable,
                        transformedData,
                        migration.onConflict
                    );
                }

                result.migratedRecords += batch.length;
                offset += this.batchSize;

                this.logProgress(result);
            }

            result.endTime = new Date();
            result.duration = result.endTime - result.startTime;

            return result;
        } catch (error) {
            result.errors.push({
                message: error.message,
                stack: error.stack,
            });
            throw error;
        }
    }

    /**
     * 获取记录总数
     * @param {string} table - 表名
     * @param {string} whereClause - WHERE 条件
     * @returns {Promise<number>} 记录数
     */
    async getCount(table, whereClause) {
        const sql = `SELECT COUNT(*) as count FROM ${table}`;
        const fullSql = whereClause ? `${sql} WHERE ${whereClause}` : sql;
        const result = await this.sourceDb.query(fullSql);
        return result[0].count;
    }

    /**
     * 获取批次数据
     * @param {string} table - 表名
     * @param {string[]} columns - 列名数组
     * @param {string} whereClause - WHERE 条件
     * @param {number} offset - 偏移量
     * @param {number} limit - 限制数量
     * @returns {Promise<Array>} 数据批次
     */
    async fetchBatch(table, columns, whereClause, offset, limit) {
        const cols = columns && columns.length > 0 ? columns.join(', ') : '*';
        let sql = `SELECT ${cols} FROM ${table}`;
        
        if (whereClause) {
            sql += ` WHERE ${whereClause}`;
        }
        
        sql += ` LIMIT ${limit} OFFSET ${offset}`;
        
        return this.sourceDb.query(sql);
    }

    /**
     * 转换数据批次
     * @param {Array} batch - 原始数据批次
     * @param {Function} transformFn - 转换函数
     * @returns {Promise<Array>} 转换后的数据
     */
    async transformBatch(batch, transformFn) {
        if (!transformFn) {
            return batch;
        }

        return batch.map((record, index) => {
            try {
                return transformFn(record);
            } catch (error) {
                this.migrationLog.push({
                    record: record,
                    error: error.message,
                    index: index,
                });
                return null;
            }
        }).filter(Boolean);
    }

    /**
     * 插入数据批次
     * @param {string} table - 目标表名
     * @param {Array} data - 数据数组
     * @param {string} onConflict - 冲突处理策略
     * @returns {Promise<void>}
     */
    async insertBatch(table, data, onConflict) {
        if (data.length === 0) return;

        const columns = Object.keys(data[0]);
        const values = data.map(row => Object.values(row));
        const placeholders = values.map((_, i) => 
            `(${columns.map((_, j) => `$${i * columns.length + j + 1}`).join(', ')})`
        ).join(', ');

        let sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${placeholders}`;
        
        if (onConflict) {
            sql += ` ON CONFLICT ${onConflict}`;
        }

        await this.targetDb.query(sql, values.flat());
    }

    /**
     * 记录进度日志
     * @param {Object} result - 迁移结果
     */
    logProgress(result) {
        const percentage = ((result.migratedRecords / result.totalRecords) * 100).toFixed(2);
        console.log(`迁移进度: ${result.migratedRecords}/${result.totalRecords} (${percentage}%)`);
    }

    /**
     * 验证迁移结果
     * @param {Object} migration - 迁移配置
     * @returns {Promise<Object>} 验证结果
     */
    async validate(migration) {
        const sourceCount = await this.getCount(migration.sourceTable, migration.whereClause);
        const targetCount = await this.getCount(migration.targetTable, null);

        return {
            sourceCount,
            targetCount,
            isValid: sourceCount === targetCount,
            difference: Math.abs(sourceCount - targetCount),
        };
    }
}

export { DataMigrator };
```

### 重构模式示例

```javascript
/**
 * 重构工具类
 * 提供安全的代码重构方法
 */
class RefactoringTools {
    /**
     * 提取方法重构
     * 将代码片段提取为独立方法
     * 
     * @param {string} sourceCode - 源代码
     * @param {Object} selection - 选中的代码范围
     * @param {string} methodName - 新方法名
     * @returns {Object} 重构后的代码
     */
    static extractMethod(sourceCode, selection, methodName) {
        const lines = sourceCode.split('\n');
        const extractedCode = lines
            .slice(selection.startLine - 1, selection.endLine)
            .join('\n');

        const indent = this.getIndentation(lines[selection.startLine - 1]);
        const parameters = this.extractParameters(extractedCode, sourceCode);
        
        const methodSignature = this.buildMethodSignature(methodName, parameters);
        const methodCall = this.buildMethodCall(methodName, parameters);

        const newMethod = `\n${indent}${methodSignature} {\n${extractedCode}\n${indent}}`;
        
        const modifiedLines = [...lines];
        modifiedLines.splice(
            selection.startLine - 1,
            selection.endLine - selection.startLine + 1,
            `${indent}${methodCall}`
        );

        const lastMethodEnd = this.findLastMethodEnd(modifiedLines);
        modifiedLines.splice(lastMethodEnd, 0, newMethod);

        return {
            code: modifiedLines.join('\n'),
            extractedMethod: newMethod,
            callSite: methodCall,
        };
    }

    /**
     * 获取缩进
     * @param {string} line - 代码行
     * @returns {string} 缩进字符串
     */
    static getIndentation(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1] : '';
    }

    /**
     * 提取参数
     * @param {string} extractedCode - 提取的代码
     * @param {string} sourceCode - 源代码
     * @returns {Array} 参数列表
     */
    static extractParameters(extractedCode, sourceCode) {
        const variablePattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
        const usedVariables = new Set();
        const definedVariables = new Set();

        let match;
        while ((match = variablePattern.exec(extractedCode)) !== null) {
            usedVariables.add(match[1]);
        }

        const declarationPattern = /(let|const|var)\s+([a-zA-Z_][a-zA-Z0-9_]*)/g;
        while ((match = declarationPattern.exec(extractedCode)) !== null) {
            definedVariables.add(match[2]);
        }

        return [...usedVariables].filter(v => !definedVariables.has(v));
    }

    /**
     * 构建方法签名
     * @param {string} methodName - 方法名
     * @param {Array} parameters - 参数列表
     * @returns {string} 方法签名
     */
    static buildMethodSignature(methodName, parameters) {
        const params = parameters.join(', ');
        return `function ${methodName}(${params})`;
    }

    /**
     * 构建方法调用
     * @param {string} methodName - 方法名
     * @param {Array} parameters - 参数列表
     * @returns {string} 方法调用语句
     */
    static buildMethodCall(methodName, parameters) {
        const args = parameters.join(', ');
        return `${methodName}(${args});`;
    }

    /**
     * 查找最后一个方法的结束位置
     * @param {Array} lines - 代码行数组
     * @returns {number} 结束行号
     */
    static findLastMethodEnd(lines) {
        let braceCount = 0;
        let lastMethodEnd = lines.length;

        for (let i = lines.length - 1; i >= 0; i--) {
            const line = lines[i];
            for (const char of line) {
                if (char === '}') braceCount++;
                if (char === '{') braceCount--;
            }
            if (braceCount === 0 && line.includes('}')) {
                lastMethodEnd = i + 1;
                break;
            }
        }

        return lastMethodEnd;
    }

    /**
     * 重命名变量
     * @param {string} sourceCode - 源代码
     * @param {string} oldName - 旧变量名
     * @param {string} newName - 新变量名
     * @returns {Object} 重构结果
     */
    static renameVariable(sourceCode, oldName, newName) {
        const variablePattern = new RegExp(`\\b${oldName}\\b`, 'g');
        const newCode = sourceCode.replace(variablePattern, newName);
        
        const occurrences = (sourceCode.match(variablePattern) || []).length;

        return {
            code: newCode,
            occurrences: occurrences,
            oldName: oldName,
            newName: newName,
        };
    }
}

export { RefactoringTools };
```

### 技术债务评估

```javascript
/**
 * 技术债务评估器
 * 分析和评估代码中的技术债务
 */
class TechnicalDebtAnalyzer {
    /**
     * 构造函数
     * @param {Object} config - 配置对象
     */
    constructor(config) {
        this.rules = config.rules || this.getDefaultRules();
        this.weights = config.weights || this.getDefaultWeights();
    }

    /**
     * 获取默认规则
     * @returns {Array} 规则数组
     */
    getDefaultRules() {
        return [
            {
                id: 'long-method',
                name: '长方法',
                pattern: /function\s+\w+\s*\([^)]*\)\s*\{[\s\S]{500,}\}/g,
                description: '方法超过500字符',
                severity: 'medium',
            },
            {
                id: 'duplicate-code',
                name: '重复代码',
                pattern: /(.{50,})\1+/g,
                description: '检测到重复代码块',
                severity: 'high',
            },
            {
                id: 'magic-number',
                name: '魔法数字',
                pattern: /(?<!["\d.])\d{2,}(?!["\d.])/g,
                description: '硬编码的数字常量',
                severity: 'low',
            },
            {
                id: 'deep-nesting',
                name: '深层嵌套',
                pattern: /(\{[^{}]*\}){4,}/g,
                description: '嵌套层级过深',
                severity: 'medium',
            },
            {
                id: 'todo-comment',
                name: 'TODO 注释',
                pattern: /\/\/\s*(TODO|FIXME|HACK|XXX):/gi,
                description: '未处理的 TODO 注释',
                severity: 'low',
            },
            {
                id: 'deprecated-api',
                name: '废弃 API',
                pattern: /\b(eval|with|arguments\.callee)\b/g,
                description: '使用已废弃的 API',
                severity: 'high',
            },
        ];
    }

    /**
     * 获取默认权重
     * @returns {Object} 权重配置
     */
    getDefaultWeights() {
        return {
            low: 1,
            medium: 3,
            high: 5,
            critical: 10,
        };
    }

    /**
     * 分析代码
     * @param {string} sourceCode - 源代码
     * @param {string} filePath - 文件路径
     * @returns {Object} 分析结果
     */
    analyze(sourceCode, filePath) {
        const issues = [];
        let totalDebtScore = 0;

        for (const rule of this.rules) {
            const matches = this.findMatches(sourceCode, rule);
            
            for (const match of matches) {
                const issue = {
                    ruleId: rule.id,
                    ruleName: rule.name,
                    severity: rule.severity,
                    description: rule.description,
                    filePath: filePath,
                    line: this.getLineNumber(sourceCode, match.index),
                    column: this.getColumnNumber(sourceCode, match.index),
                    snippet: this.getSnippet(sourceCode, match.index, 50),
                    score: this.weights[rule.severity],
                };
                
                issues.push(issue);
                totalDebtScore += issue.score;
            }
        }

        return {
            filePath: filePath,
            issues: issues,
            totalIssues: issues.length,
            debtScore: totalDebtScore,
            summary: this.summarizeBySeverity(issues),
        };
    }

    /**
     * 查找匹配项
     * @param {string} sourceCode - 源代码
     * @param {Object} rule - 规则对象
     * @returns {Array} 匹配项数组
     */
    findMatches(sourceCode, rule) {
        const matches = [];
        let match;
        
        const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
        
        while ((match = regex.exec(sourceCode)) !== null) {
            matches.push({
                value: match[0],
                index: match.index,
            });
        }
        
        return matches;
    }

    /**
     * 获取行号
     * @param {string} sourceCode - 源代码
     * @param {number} index - 字符索引
     * @returns {number} 行号
     */
    getLineNumber(sourceCode, index) {
        return sourceCode.substring(0, index).split('\n').length;
    }

    /**
     * 获取列号
     * @param {string} sourceCode - 源代码
     * @param {number} index - 字符索引
     * @returns {number} 列号
     */
    getColumnNumber(sourceCode, index) {
        const lineStart = sourceCode.lastIndexOf('\n', index - 1);
        return index - lineStart;
    }

    /**
     * 获取代码片段
     * @param {string} sourceCode - 源代码
     * @param {number} index - 起始索引
     * @param {number} length - 片段长度
     * @returns {string} 代码片段
     */
    getSnippet(sourceCode, index, length) {
        const start = Math.max(0, index - length / 2);
        const end = Math.min(sourceCode.length, index + length / 2);
        return sourceCode.substring(start, end).trim();
    }

    /**
     * 按严重程度汇总
     * @param {Array} issues - 问题列表
     * @returns {Object} 汇总结果
     */
    summarizeBySeverity(issues) {
        const summary = {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0,
        };

        for (const issue of issues) {
            summary[issue.severity]++;
        }

        return summary;
    }

    /**
     * 生成报告
     * @param {Array} results - 分析结果数组
     * @returns {Object} 综合报告
     */
    generateReport(results) {
        const totalIssues = results.reduce((sum, r) => sum + r.totalIssues, 0);
        const totalDebtScore = results.reduce((sum, r) => sum + r.debtScore, 0);

        const severitySummary = {
            low: results.reduce((sum, r) => sum + r.summary.low, 0),
            medium: results.reduce((sum, r) => sum + r.summary.medium, 0),
            high: results.reduce((sum, r) => sum + r.summary.high, 0),
            critical: results.reduce((sum, r) => sum + r.summary.critical, 0),
        };

        const topFiles = [...results]
            .sort((a, b) => b.debtScore - a.debtScore)
            .slice(0, 10);

        return {
            summary: {
                totalFiles: results.length,
                totalIssues: totalIssues,
                totalDebtScore: totalDebtScore,
                averageDebtPerFile: totalDebtScore / results.length,
                severity: severitySummary,
            },
            topFiles: topFiles,
            recommendations: this.generateRecommendations(severitySummary),
        };
    }

    /**
     * 生成改进建议
     * @param {Object} severitySummary - 严重程度汇总
     * @returns {Array} 建议列表
     */
    generateRecommendations(severitySummary) {
        const recommendations = [];

        if (severitySummary.critical > 0) {
            recommendations.push({
                priority: 'urgent',
                action: '立即处理关键问题',
                description: `发现 ${severitySummary.critical} 个关键级别问题，需要立即修复`,
            });
        }

        if (severitySummary.high > 5) {
            recommendations.push({
                priority: 'high',
                action: '优先处理高严重性问题',
                description: `发现 ${severitySummary.high} 个高严重性问题，建议在下一个迭代中处理`,
            });
        }

        if (severitySummary.medium > 10) {
            recommendations.push({
                priority: 'medium',
                action: '规划中等严重性问题修复',
                description: `发现 ${severitySummary.medium} 个中等严重性问题，建议纳入技术债务清理计划`,
            });
        }

        return recommendations;
    }
}

export { TechnicalDebtAnalyzer };
```

## Quick Reference

### 迁移策略

| 策略 | 适用场景 | 风险等级 |
|-----|---------|---------|
| 大爆炸迁移 | 小型系统、时间紧迫 | 高 |
| 渐进式迁移 | 大型系统、业务连续性要求高 | 低 |
| 并行运行 | 金融、医疗等关键系统 | 低 |
| 分层迁移 | 分层架构系统 | 中 |
| 功能开关迁移 | 需要快速回滚能力 | 中 |

### 重构手法

| 手法 | 用途 | 代码示例 |
|-----|------|---------|
| 提取方法 | 消除重复、提高可读性 | 将重复代码块提取为独立方法 |
| 内联方法 | 简化不必要的间接层 | 将简单方法调用替换为方法体 |
| 提取变量 | 提高表达式可读性 | `const isValid = value > 0 && value < 100` |
| 重命名变量 | 提高代码语义清晰度 | `x` → `userAge` |
| 移动方法 | 改善职责分配 | 将方法移到更合适的类中 |
| 分解条件 | 简化复杂条件判断 | 提取条件为独立方法 |

### 技术债务分类

| 类型 | 示例 | 偿还优先级 |
|-----|------|----------|
| 架构债务 | 循环依赖、紧耦合 | 高 |
| 代码债务 | 重复代码、长方法 | 中 |
| 测试债务 | 缺少单元测试 | 中 |
| 文档债务 | 缺少注释、文档过时 | 低 |
| 基础设施债务 | 过时的依赖版本 | 高 |
