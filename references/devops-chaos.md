# 混沌工程参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求故障注入、韧性测试、恢复验证、混沌实验、Chaos Monkey

## 核心特性

混沌工程是通过主动注入故障来提升系统韧性的实践：
- 发现系统弱点
- 验证恢复机制
- 提高团队故障应对能力
- 建立系统韧性信心
- 预防生产事故

## 混沌实验设计

### 实验定义框架

```typescript
/**
 * 混沌实验定义
 */
interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  target: ExperimentTarget;
  fault: FaultInjection;
  steadyState: SteadyStateCheck[];
  rollback: RollbackAction[];
  metadata: ExperimentMetadata;
}

/**
 * 实验目标
 */
interface ExperimentTarget {
  type: 'service' | 'infrastructure' | 'network' | 'data';
  selector: Record<string, string>;
  scope: 'single' | 'subset' | 'all';
}

/**
 * 故障注入配置
 */
interface FaultInjection {
  type: FaultType;
  duration: number;
  intensity: number;
  parameters: Record<string, unknown>;
}

type FaultType =
  | 'pod_kill'
  | 'cpu_stress'
  | 'memory_stress'
  | 'network_latency'
  | 'network_packet_loss'
  | 'disk_fill'
  | 'dns_failure'
  | 'dependency_failure';

/**
 * 稳态检查
 */
interface SteadyStateCheck {
  name: string;
  type: 'metric' | 'synthetic' | 'user_flow';
  query?: string;
  threshold?: {
    min?: number;
    max?: number;
  };
  expectedValue?: unknown;
}

/**
 * 回滚动作
 */
interface RollbackAction {
  trigger: 'manual' | 'automatic';
  condition?: string;
  action: string;
}

/**
 * 实验元数据
 */
interface ExperimentMetadata {
  author: string;
  createdAt: Date;
  environment: 'development' | 'staging' | 'production';
  tags: string[];
  schedule?: string;
}

/**
 * 创建混沌实验示例
 * @returns 混沌实验对象
 */
const createPodKillExperiment = (): ChaosExperiment => ({
  id: 'exp-001',
  name: '用户服务 Pod 随机终止',
  description: '验证用户服务在 Pod 意外终止时的自动恢复能力',
  hypothesis: '当用户服务 Pod 被终止时，Kubernetes 应在 30 秒内重新调度，服务保持可用',
  target: {
    type: 'service',
    selector: { app: 'user-service' },
    scope: 'single',
  },
  fault: {
    type: 'pod_kill',
    duration: 60,
    intensity: 1,
    parameters: {
      gracePeriod: 5,
    },
  },
  steadyState: [
    {
      name: '服务可用性',
      type: 'metric',
      query: 'avg_over_time(up{job="user-service"}[5m])',
      threshold: { min: 0.99 },
    },
    {
      name: '错误率',
      type: 'metric',
      query: 'sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))',
      threshold: { max: 0.01 },
    },
    {
      name: '用户登录流程',
      type: 'synthetic',
      expectedValue: 'success',
    },
  ],
  rollback: [
    {
      trigger: 'automatic',
      condition: 'error_rate > 0.05',
      action: 'stop_experiment',
    },
    {
      trigger: 'manual',
      action: 'restore_pod',
    },
  ],
  metadata: {
    author: 'sre-team',
    createdAt: new Date(),
    environment: 'staging',
    tags: ['kubernetes', 'resilience', 'pod-lifecycle'],
  },
});
```

### 实验执行器

```typescript
/**
 * 混沌实验执行器
 * @description 执行和管理混沌实验
 */
class ChaosExperimentRunner {
  private experiments: Map<string, ChaosExperiment> = new Map();
  private activeRuns: Map<string, ExperimentRun> = new Map();

  /**
   * 注册实验
   * @param experiment - 实验定义
   */
  registerExperiment(experiment: ChaosExperiment): void {
    this.experiments.set(experiment.id, experiment);
  }

  /**
   * 运行实验
   * @param experimentId - 实验ID
   * @returns 实验运行结果
   */
  async runExperiment(experimentId: string): Promise<ExperimentResult> {
    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`实验 ${experimentId} 不存在`);
    }

    const runId = this.generateRunId();
    const run: ExperimentRun = {
      id: runId,
      experimentId,
      status: 'running',
      startTime: new Date(),
      steadyStateResults: [],
    };

    this.activeRuns.set(runId, run);

    try {
      // 1. 验证初始稳态
      await this.validateSteadyState(experiment, run);

      // 2. 注入故障
      await this.injectFault(experiment, run);

      // 3. 持续监控稳态
      await this.monitorSteadyState(experiment, run);

      // 4. 停止故障注入
      await this.stopFault(experiment, run);

      // 5. 验证恢复
      await this.validateRecovery(experiment, run);

      run.status = 'completed';
      run.endTime = new Date();
    } catch (error) {
      run.status = 'failed';
      run.error = error instanceof Error ? error.message : String(error);
      run.endTime = new Date();
      
      // 自动回滚
      await this.rollback(experiment, run);
    }

    return this.generateResult(run);
  }

  /**
   * 验证稳态
   * @param experiment - 实验定义
   * @param run - 运行记录
   */
  private async validateSteadyState(
    experiment: ChaosExperiment,
    run: ExperimentRun
  ): Promise<void> {
    for (const check of experiment.steadyState) {
      const result = await this.executeCheck(check);
      run.steadyStateResults.push({
        check: check.name,
        phase: 'pre',
        passed: result.passed,
        value: result.value,
      });

      if (!result.passed) {
        throw new Error(`初始稳态检查失败: ${check.name}`);
      }
    }
  }

  /**
   * 注入故障
   * @param experiment - 实验定义
   * @param run - 运行记录
   */
  private async injectFault(
    experiment: ChaosExperiment,
    run: ExperimentRun
  ): Promise<void> {
    console.log(`[混沌] 注入故障: ${experiment.fault.type}`);
    
    switch (experiment.fault.type) {
      case 'pod_kill':
        await this.injectPodKill(experiment.target, experiment.fault);
        break;
      case 'cpu_stress':
        await this.injectCpuStress(experiment.target, experiment.fault);
        break;
      case 'network_latency':
        await this.injectNetworkLatency(experiment.target, experiment.fault);
        break;
      default:
        throw new Error(`不支持的故障类型: ${experiment.fault.type}`);
    }
  }

  /**
   * 注入 Pod 终止故障
   * @param target - 目标配置
   * @param fault - 故障配置
   */
  private async injectPodKill(
    target: ExperimentTarget,
    fault: FaultInjection
  ): Promise<void> {
    // 模拟 kubectl delete pod
    const command = `kubectl delete pod -l ${Object.entries(target.selector)
      .map(([k, v]) => `${k}=${v}`)
      .join(',')} --grace-period=${fault.parameters.gracePeriod ?? 5}`;
    
    console.log(`执行: ${command}`);
  }

  /**
   * 注入 CPU 压力故障
   * @param target - 目标配置
   * @param fault - 故障配置
   */
  private async injectCpuStress(
    target: ExperimentTarget,
    fault: FaultInjection
  ): Promise<void> {
    // 使用 stress-ng 注入 CPU 压力
    const command = `kubectl exec -it deployment/${target.selector.app} -- ` +
      `stress-ng --cpu ${fault.intensity} --timeout ${fault.duration}s`;
    
    console.log(`执行: ${command}`);
  }

  /**
   * 注入网络延迟故障
   * @param target - 目标配置
   * @param fault - 故障配置
   */
  private async injectNetworkLatency(
    target: ExperimentTarget,
    fault: FaultInjection
  ): Promise<void> {
    // 使用 tc (traffic control) 注入网络延迟
    const latency = fault.parameters.latency ?? '100ms';
    const command = `kubectl exec -it deployment/${target.selector.app} -- ` +
      `tc qdisc add dev eth0 root netem delay ${latency}`;
    
    console.log(`执行: ${command}`);
  }

  /**
   * 执行检查
   * @param check - 检查定义
   * @returns 检查结果
   */
  private async executeCheck(check: SteadyStateCheck): Promise<CheckResult> {
    // 模拟检查执行
    return {
      passed: true,
      value: 0.999,
    };
  }

  /**
   * 监控稳态
   * @param experiment - 实验定义
   * @param run - 运行记录
   */
  private async monitorSteadyState(
    experiment: ChaosExperiment,
    run: ExperimentRun
  ): Promise<void> {
    const interval = 10;
    const duration = experiment.fault.duration;
    const iterations = Math.floor(duration / interval);

    for (let i = 0; i < iterations; i++) {
      await new Promise(resolve => setTimeout(resolve, interval * 1000));

      for (const check of experiment.steadyState) {
        const result = await this.executeCheck(check);
        
        // 检查是否需要自动回滚
        if (!result.passed) {
          const shouldRollback = experiment.rollback.some(
            r => r.trigger === 'automatic' && this.evaluateCondition(r.condition, result)
          );
          
          if (shouldRollback) {
            throw new Error(`稳态检查失败，触发自动回滚: ${check.name}`);
          }
        }
      }
    }
  }

  /**
   * 停止故障注入
   * @param experiment - 实验定义
   * @param run - 运行记录
   */
  private async stopFault(
    experiment: ChaosExperiment,
    run: ExperimentRun
  ): Promise<void> {
    console.log(`[混沌] 停止故障注入: ${experiment.fault.type}`);
  }

  /**
   * 验证恢复
   * @param experiment - 实验定义
   * @param run - 运行记录
   */
  private async validateRecovery(
    experiment: ChaosExperiment,
    run: ExperimentRun
  ): Promise<void> {
    // 等待恢复时间
    await new Promise(resolve => setTimeout(resolve, 30000));

    for (const check of experiment.steadyState) {
      const result = await this.executeCheck(check);
      run.steadyStateResults.push({
        check: check.name,
        phase: 'post',
        passed: result.passed,
        value: result.value,
      });

      if (!result.passed) {
        throw new Error(`恢复后稳态检查失败: ${check.name}`);
      }
    }
  }

  /**
   * 回滚
   * @param experiment - 实验定义
   * @param run - 运行记录
   */
  private async rollback(
    experiment: ChaosExperiment,
    run: ExperimentRun
  ): Promise<void> {
    console.log(`[混沌] 执行回滚`);
  }

  /**
   * 评估条件
   * @param condition - 条件表达式
   * @param result - 检查结果
   * @returns 是否满足条件
   */
  private evaluateCondition(condition: string | undefined, result: CheckResult): boolean {
    if (!condition) return true;
    // 简化的条件评估
    return !result.passed;
  }

  /**
   * 生成运行ID
   * @returns 运行ID
   */
  private generateRunId(): string {
    return `run-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成结果
   * @param run - 运行记录
   * @returns 实验结果
   */
  private generateResult(run: ExperimentRun): ExperimentResult {
    return {
      runId: run.id,
      experimentId: run.experimentId,
      status: run.status,
      duration: run.endTime && run.startTime
        ? run.endTime.getTime() - run.startTime.getTime()
        : 0,
      steadyStateResults: run.steadyStateResults,
      error: run.error,
    };
  }
}

interface ExperimentRun {
  id: string;
  experimentId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: Date;
  endTime?: Date;
  steadyStateResults: SteadyStateResult[];
  error?: string;
}

interface SteadyStateResult {
  check: string;
  phase: 'pre' | 'during' | 'post';
  passed: boolean;
  value: unknown;
}

interface CheckResult {
  passed: boolean;
  value: unknown;
}

interface ExperimentResult {
  runId: string;
  experimentId: string;
  status: string;
  duration: number;
  steadyStateResults: SteadyStateResult[];
  error?: string;
}
```

## 故障注入类型

### 常见故障场景

```markdown
## 故障注入类型参考

### 资源故障
| 故障类型 | 描述 | 工具 |
|----------|------|------|
| CPU 压力 | 消耗 CPU 资源 | stress-ng |
| 内存压力 | 消耗内存资源 | stress-ng |
| 磁盘填充 | 填满磁盘空间 | dd |
| 磁盘 IO | 高磁盘 IO 负载 | fio |

### 网络故障
| 故障类型 | 描述 | 工具 |
|----------|------|------|
| 网络延迟 | 增加网络延迟 | tc |
| 丢包 | 模拟网络丢包 | tc |
| 网络分区 | 隔离网络分区 | iptables |
| DNS 故障 | DNS 解析失败 | 修改 /etc/hosts |

### 服务故障
| 故障类型 | 描述 | 工具 |
|----------|------|------|
| Pod 终止 | 随机终止 Pod | kubectl |
| 容器崩溃 | 容器 OOM | ulimit |
| 服务不可用 | 服务停止响应 | systemctl |
| 依赖故障 | 下游服务不可用 | mock |

### 数据故障
| 故障类型 | 描述 | 工具 |
|----------|------|------|
| 数据库延迟 | 慢查询注入 | pt-query-digest |
| 数据库不可用 | 数据库连接断开 | iptables |
| 缓存失效 | 清空缓存 | redis-cli |
| 数据损坏 | 数据不一致 | 手动修改 |
```

## Chaos Mesh 集成

### Kubernetes 混沌实验配置

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-example
  namespace: default
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: user-service
  scheduler:
    cron: "@every 1h"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: StressChaos
metadata:
  name: cpu-stress-example
  namespace: default
spec:
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: order-service
  stressors:
    cpu:
      workers: 4
      load: 80
  duration: "5m"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-latency-example
  namespace: default
spec:
  action: delay
  mode: all
  selector:
    namespaces:
      - default
    labelSelectors:
      app: payment-service
  delay:
    latency: "100ms"
    correlation: "50"
    jitter: "10ms"
  duration: "10m"
---
apiVersion: chaos-mesh.org/v1alpha1
kind: IOChaos
metadata:
  name: io-latency-example
  namespace: default
spec:
  action: latency
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: data-service
  delay: "500ms"
  percent: 50
  path: "/data"
  duration: "5m"
```

## 最佳实践

### 混沌实验检查清单

```markdown
## 混沌实验检查清单

### 实验前准备
- [ ] 明确实验假设
- [ ] 定义稳态指标
- [ ] 准备回滚方案
- [ ] 通知相关团队
- [ ] 选择合适的实验窗口
- [ ] 确认监控和告警正常

### 实验执行
- [ ] 先在非生产环境验证
- [ ] 从小范围开始
- [ ] 持续监控关键指标
- [ ] 准备随时中止实验
- [ ] 记录实验过程

### 实验后
- [ ] 验证系统恢复
- [ ] 分析实验结果
- [ ] 记录发现的问题
- [ ] 制定改进计划
- [ ] 更新实验文档

### 安全边界
- [ ] 设置爆炸半径限制
- [ ] 配置自动终止条件
- [ ] 避免级联故障
- [ ] 保护关键服务
- [ ] 不在高峰期执行
```

### 实验成熟度模型

```markdown
## 混沌工程成熟度模型

### Level 1: 初级
- 手动执行故障注入
- 仅在开发环境测试
- 无系统化的实验设计
- 依赖人工监控

### Level 2: 中级
- 自动化故障注入工具
- 在预发布环境测试
- 定义了稳态检查
- 集成监控告警

### Level 3: 高级
- 生产环境实验
- 自动化实验流水线
- 完整的假设验证
- 自动回滚机制

### Level 4: 专家
- 持续混沌工程实践
- 实验驱动架构改进
- 全团队参与
- 韧性文化建立
```

## Quick Reference

| 概念 | 定义 | 示例 |
|------|------|------|
| 爆炸半径 | 故障影响范围 | 单个 Pod、整个服务 |
| 稳态 | 系统正常运行状态 | 错误率 < 1% |
| 假设 | 实验预期结果 | 服务自动恢复 |
| 故障注入 | 主动引入故障 | Pod 终止、网络延迟 |
| 回滚 | 恢复故障状态 | 重启服务、恢复网络 |
| Blast Radius | 故障影响范围 | 单实例 → 集群 |
| Game Day | 混沌演练日 | 定期故障演练 |
