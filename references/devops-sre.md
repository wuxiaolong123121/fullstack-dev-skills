# SRE 工程师参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 SLO/SLA、事件响应、容量规划、错误预算、可靠性工程

## 核心特性

站点可靠性工程（SRE）的核心目标：
- 定义和度量服务可靠性
- 平衡可靠性与开发速度
- 建立事件响应机制
- 容量规划与成本优化
- 自动化运维实践

## SLO/SLA/SLI 框架

### 核心概念定义

```typescript
/**
 * 服务水平指标（SLI）
 * @description 衡量服务水平的具体指标
 */
interface SLI {
  name: string;
  description: string;
  query: string;
  unit: string;
}

/**
 * 服务水平目标（SLO）
 * @description 对 SLI 的目标值设定
 */
interface SLO {
  name: string;
  sli: SLI;
  target: number;
  window: string;
  description: string;
}

/**
 * 服务水平协议（SLA）
 * @description 对客户的承诺及违约后果
 */
interface SLA {
  name: string;
  slo: SLO;
  consequences: string;
  measurementWindow: string;
}

/**
 * 示例 SLI 定义
 */
const availabilitySLI: SLI = {
  name: 'availability',
  description: '服务可用性比例',
  query: 'sum(rate(http_requests_total{status_code!~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
  unit: 'percentage',
};

/**
 * 示例 SLO 定义
 */
const availabilitySLO: SLO = {
  name: '99.9% 可用性',
  sli: availabilitySLI,
  target: 0.999,
  window: '30d',
  description: '月度服务可用性不低于 99.9%',
};

/**
 * 示例 SLA 定义
 */
const availabilitySLA: SLA = {
  name: '企业版可用性承诺',
  slo: availabilitySLO,
  consequences: '未达标时退还当月服务费用的 10%',
  measurementWindow: '月度',
};
```

### SLO 计算器

```typescript
/**
 * SLO 计算器
 * @description 计算错误预算和允许的停机时间
 */
class SLOCalculator {
  /**
   * 计算允许的停机时间
   * @param sloTarget - SLO 目标（如 0.999 表示 99.9%）
   * @param windowDays - 时间窗口（天）
   * @returns 允许的停机时间（分钟）
   */
  static calculateAllowedDowntime(
    sloTarget: number,
    windowDays: number = 30
  ): { minutes: number; hours: number; formatted: string } {
    const totalMinutes = windowDays * 24 * 60;
    const allowedDowntime = totalMinutes * (1 - sloTarget);
    
    return {
      minutes: Math.floor(allowedDowntime),
      hours: Math.floor(allowedDowntime / 60),
      formatted: this.formatDowntime(allowedDowntime),
    };
  }

  /**
   * 格式化停机时间
   * @param minutes - 分钟数
   * @returns 格式化字符串
   */
  private static formatDowntime(minutes: number): string {
    const days = Math.floor(minutes / (24 * 60));
    const hours = Math.floor((minutes % (24 * 60)) / 60);
    const mins = Math.floor(minutes % 60);
    
    const parts: string[] = [];
    if (days > 0) parts.push(`${days}天`);
    if (hours > 0) parts.push(`${hours}小时`);
    if (mins > 0) parts.push(`${mins}分钟`);
    
    return parts.join(' ') || '0分钟';
  }

  /**
   * 计算错误预算
   * @param sloTarget - SLO 目标
   * @param currentSLI - 当前 SLI 值
   * @param windowDays - 时间窗口（天）
   * @returns 错误预算信息
   */
  static calculateErrorBudget(
    sloTarget: number,
    currentSLI: number,
    windowDays: number = 30
  ): ErrorBudgetResult {
    const totalMinutes = windowDays * 24 * 60;
    const allowedDowntime = totalMinutes * (1 - sloTarget);
    const actualDowntime = totalMinutes * (1 - currentSLI);
    const remainingBudget = allowedDowntime - actualDowntime;
    const budgetConsumed = (actualDowntime / allowedDowntime) * 100;

    return {
      totalBudget: allowedDowntime,
      consumed: actualDowntime,
      remaining: Math.max(0, remainingBudget),
      consumedPercentage: Math.min(100, Math.max(0, budgetConsumed)),
      status: this.getBudgetStatus(budgetConsumed),
    };
  }

  /**
   * 获取预算状态
   * @param consumedPercentage - 已消耗百分比
   * @returns 预算状态
   */
  private static getBudgetStatus(consumedPercentage: number): BudgetStatus {
    if (consumedPercentage >= 100) return 'exhausted';
    if (consumedPercentage >= 80) return 'critical';
    if (consumedPercentage >= 50) return 'warning';
    return 'healthy';
  }
}

/**
 * 错误预算结果
 */
interface ErrorBudgetResult {
  totalBudget: number;
  consumed: number;
  remaining: number;
  consumedPercentage: number;
  status: BudgetStatus;
}

type BudgetStatus = 'healthy' | 'warning' | 'critical' | 'exhausted';

// 使用示例
const budget = SLOCalculator.calculateErrorBudget(0.999, 0.9985, 30);
console.log(`错误预算剩余: ${budget.remaining.toFixed(2)} 分钟`);
console.log(`预算状态: ${budget.status}`);
```

### SLO 常用目标参考

```markdown
## SLO 目标参考表

| 服务类型 | 可用性目标 | 年度允许停机 | 适用场景 |
|----------|-----------|-------------|----------|
| 99% | 99% | 3天15小时 | 内部工具 |
| 99.9% | 99.9% | 8小时46分 | 一般业务系统 |
| 99.95% | 99.95% | 4小时23分 | 重要业务系统 |
| 99.99% | 99.99% | 52分36秒 | 关键业务系统 |
| 99.999% | 99.999% | 5分16秒 | 金融/医疗核心系统 |

## 常见 SLI 类型

| SLI 类型 | 描述 | 计算方式 |
|----------|------|----------|
| 可用性 | 服务正常运行时间比例 | 成功请求 / 总请求 |
| 延迟 | 请求响应时间 | P50/P95/P99 延迟 |
| 吞吐量 | 单位时间处理请求数 | 请求总数 / 时间窗口 |
| 错误率 | 失败请求比例 | 错误请求 / 总请求 |
| 饱和度 | 资源使用程度 | 已用资源 / 总资源 |
```

## 事件响应

### 事件分级标准

```typescript
/**
 * 事件严重程度枚举
 */
enum IncidentSeverity {
  SEV1 = 'SEV1',
  SEV2 = 'SEV2',
  SEV3 = 'SEV3',
  SEV4 = 'SEV4',
  SEV5 = 'SEV5',
}

/**
 * 事件定义
 */
interface Incident {
  id: string;
  title: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: Date;
  updatedAt: Date;
  assignee?: string;
  summary: string;
  impact: string;
  timeline: IncidentEvent[];
}

type IncidentStatus = 
  | 'investigating'
  | 'identified'
  | 'monitoring'
  | 'resolved';

interface IncidentEvent {
  timestamp: Date;
  type: 'created' | 'acknowledged' | 'update' | 'escalated' | 'resolved';
  author: string;
  content: string;
}

/**
 * 事件严重程度定义
 */
const SEVERITY_DEFINITIONS: Record<IncidentSeverity, SeverityDefinition> = {
  SEV1: {
    name: '严重',
    description: '完全服务中断，影响所有用户',
    responseTime: 15,
    escalationTime: 30,
    examples: ['生产环境完全不可用', '数据丢失', '安全漏洞'],
  },
  SEV2: {
    name: '高',
    description: '主要功能不可用，影响大量用户',
    responseTime: 30,
    escalationTime: 60,
    examples: ['核心功能故障', '性能严重下降', '部分用户无法访问'],
  },
  SEV3: {
    name: '中',
    description: '次要功能受影响，影响部分用户',
    responseTime: 60,
    escalationTime: 120,
    examples: ['非核心功能故障', '间歇性问题', '单个区域受影响'],
  },
  SEV4: {
    name: '低',
    description: '轻微问题，影响有限',
    responseTime: 240,
    escalationTime: 480,
    examples: ['UI 小问题', '非关键警告', '文档错误'],
  },
  SEV5: {
    name: '信息',
    description: '无需立即处理的问题',
    responseTime: 1440,
    escalationTime: 2880,
    examples: ['优化建议', '功能请求', '一般咨询'],
  },
};

interface SeverityDefinition {
  name: string;
  description: string;
  responseTime: number;
  escalationTime: number;
  examples: string[];
}
```

### 事件响应流程

```typescript
/**
 * 事件管理器
 * @description 管理事件生命周期
 */
class IncidentManager {
  private incidents: Map<string, Incident> = new Map();

  /**
   * 创建新事件
   * @param title - 事件标题
   * @param severity - 严重程度
   * @param summary - 事件摘要
   * @param impact - 影响范围
   * @returns 创建的事件
   */
  createIncident(
    title: string,
    severity: IncidentSeverity,
    summary: string,
    impact: string
  ): Incident {
    const incident: Incident = {
      id: this.generateId(),
      title,
      severity,
      status: 'investigating',
      createdAt: new Date(),
      updatedAt: new Date(),
      summary,
      impact,
      timeline: [
        {
          timestamp: new Date(),
          type: 'created',
          author: 'system',
          content: `创建 ${severity} 级事件: ${title}`,
        },
      ],
    };

    this.incidents.set(incident.id, incident);
    this.notifyOnCall(incident);

    return incident;
  }

  /**
   * 确认事件
   * @param incidentId - 事件ID
   * @param assignee - 指派人
   */
  acknowledgeIncident(incidentId: string, assignee: string): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('事件不存在');

    incident.assignee = assignee;
    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      type: 'acknowledged',
      author: assignee,
      content: `${assignee} 已确认并接手处理`,
    });
  }

  /**
   * 更新事件状态
   * @param incidentId - 事件ID
   * @param status - 新状态
   * @param author - 操作人
   * @param note - 备注
   */
  updateStatus(
    incidentId: string,
    status: IncidentStatus,
    author: string,
    note: string
  ): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('事件不存在');

    incident.status = status;
    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      type: 'update',
      author,
      content: `状态更新为 ${status}: ${note}`,
    });
  }

  /**
   * 解决事件
   * @param incidentId - 事件ID
   * @param author - 操作人
   * @param resolution - 解决方案
   */
  resolveIncident(
    incidentId: string,
    author: string,
    resolution: string
  ): void {
    const incident = this.incidents.get(incidentId);
    if (!incident) throw new Error('事件不存在');

    incident.status = 'resolved';
    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      type: 'resolved',
      author,
      content: `事件已解决: ${resolution}`,
    });
  }

  /**
   * 通知值班人员
   * @param incident - 事件对象
   */
  private notifyOnCall(incident: Incident): void {
    const definition = SEVERITY_DEFINITIONS[incident.severity];
    console.log(`[告警] ${incident.severity} 级事件需要 ${definition.responseTime} 分钟内响应`);
  }

  /**
   * 生成事件ID
   * @returns 事件ID
   */
  private generateId(): string {
    return `INC-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### 事后复盘模板

```markdown
# 事后复盘报告

## 基本信息
- **事件ID**: INC-2024-001
- **标题**: 用户服务不可用
- **严重程度**: SEV2
- **影响时长**: 45 分钟
- **影响范围**: 30% 用户无法登录
- **负责人**: 张三

## 时间线
| 时间 | 事件 |
|------|------|
| 10:00 | 监控告警：登录服务错误率上升 |
| 10:05 | 值班工程师确认问题 |
| 10:10 | 定位到数据库连接池耗尽 |
| 10:15 | 扩容数据库连接池 |
| 10:30 | 服务恢复正常 |
| 10:45 | 确认问题完全解决 |

## 根因分析
### 直接原因
数据库连接池配置过小，无法支撑高峰期流量。

### 根本原因
1. 容量规划未考虑业务增长
2. 缺少连接池使用率监控
3. 压测场景未覆盖高峰流量

## 影响评估
- 受影响用户: 约 30,000 人
- 错误预算消耗: 2.5%
- 业务损失: 估算 50,000 元

## 改进措施
| 措施 | 负责人 | 截止日期 | 状态 |
|------|--------|----------|------|
| 增加连接池监控 | 李四 | 2024-01-20 | 进行中 |
| 更新容量规划模型 | 王五 | 2024-01-25 | 待开始 |
| 完善压测场景 | 赵六 | 2024-01-30 | 待开始 |

## 经验教训
### 做得好的
- 告警及时，响应迅速
- 问题定位准确

### 需要改进的
- 缺少自动化扩容机制
- 监控覆盖不够全面
```

## 容量规划

### 资源规划模型

```typescript
/**
 * 容量规划器
 * @description 预测资源需求
 */
class CapacityPlanner {
  /**
   * 预测服务器需求
   * @param currentQPS - 当前 QPS
   * @param growthRate - 增长率（月）
   * @param months - 预测月数
   * @param qpsPerServer - 单服务器 QPS 容量
   * @returns 容量预测结果
   */
  static predictServerCapacity(
    currentQPS: number,
    growthRate: number,
    months: number,
    qpsPerServer: number
  ): CapacityPrediction {
    const predictions: MonthPrediction[] = [];
    let qps = currentQPS;

    for (let month = 1; month <= months; month++) {
      qps = qps * (1 + growthRate);
      const serversNeeded = Math.ceil(qps / qpsPerServer);
      const buffer = Math.ceil(serversNeeded * 0.2);
      
      predictions.push({
        month,
        expectedQPS: Math.round(qps),
        serversNeeded,
        serversWithBuffer: serversNeeded + buffer,
      });
    }

    return {
      currentQPS,
      growthRate,
      predictions,
      recommendation: this.generateRecommendation(predictions),
    };
  }

  /**
   * 生成建议
   * @param predictions - 预测数据
   * @returns 建议文本
   */
  private static generateRecommendation(
    predictions: MonthPrediction[]
  ): string {
    const lastPrediction = predictions[predictions.length - 1];
    const firstPrediction = predictions[0];
    
    const increase = lastPrediction.serversWithBuffer - firstPrediction.serversWithBuffer;
    
    return `建议在 ${predictions.length} 个月内增加 ${increase} 台服务器，` +
           `最终达到 ${lastPrediction.serversWithBuffer} 台。`;
  }
}

interface CapacityPrediction {
  currentQPS: number;
  growthRate: number;
  predictions: MonthPrediction[];
  recommendation: string;
}

interface MonthPrediction {
  month: number;
  expectedQPS: number;
  serversNeeded: number;
  serversWithBuffer: number;
}
```

## 最佳实践

### SRE 检查清单

```markdown
## SRE 实践检查清单

### SLO 定义
- [ ] 关键服务已定义 SLO
- [ ] SLO 目标与业务需求一致
- [ ] 错误预算已建立
- [ ] SLO 仪表盘已配置

### 监控告警
- [ ] 告警基于 SLO 而非资源
- [ ] 告警分级合理
- [ ] 值班轮换已建立
- [ ] 升级路径清晰

### 事件管理
- [ ] 事件分级标准明确
- [ ] 响应流程文档化
- [ ] 事后复盘制度化
- [ ] 改进措施跟踪到位

### 容量规划
- [ ] 资源使用趋势监控
- [ ] 增长预测模型建立
- [ ] 扩容流程自动化
- [ ] 成本优化定期评估

### 变更管理
- [ ] 变更审批流程
- [ ] 灰度发布机制
- [ ] 回滚方案准备
- [ ] 变更窗口管理
```

## Quick Reference

| 概念 | 定义 | 示例 |
|------|------|------|
| SLI | 服务水平指标 | 可用性、延迟、错误率 |
| SLO | 服务水平目标 | 99.9% 可用性 |
| SLA | 服务水平协议 | 未达标退款条款 |
| 错误预算 | 允许的故障额度 | 月度 43 分钟停机 |
| Toil | 重复性运维工作 | 手动扩容、日志清理 |
| On-Call | 值班响应 | 7x24 小时轮值 |
| Runbook | 运维手册 | 故障处理步骤 |
| Postmortem | 事后复盘 | 根因分析报告 |
