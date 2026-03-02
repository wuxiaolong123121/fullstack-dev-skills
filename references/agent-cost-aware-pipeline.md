# LLM 成本优化模式参考

成本感知的 LLM 调用模式，包括模型路由、成本跟踪、重试逻辑和提示缓存，用于优化 AI 应用的运营成本。

## When to Activate

- 构建需要成本控制的 LLM 应用
- 实现多模型路由策略
- 优化大规模 AI 调用的运营成本
- 设计预算敏感的 AI 系统
- 需要监控和分析 API 使用费用

## Core Principles

### 1. 模型路由策略

根据任务复杂度选择合适的模型，避免过度使用昂贵模型。

```python
from typing import Dict, List, Optional, Callable, Any
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import json
import time

class ModelTier(Enum):
    """模型层级枚举"""
    FAST_CHEAP = "fast_cheap"
    BALANCED = "balanced"
    POWERFUL_EXPENSIVE = "powerful_expensive"

@dataclass
class ModelConfig:
    """
    模型配置数据类
    
    属性:
        name: 模型名称
        tier: 模型层级
        input_cost_per_1k: 每 1K 输入 token 成本（美元）
        output_cost_per_1k: 每 1K 输出 token 成本（美元）
        max_tokens: 最大上下文窗口
        latency_ms: 平均响应延迟（毫秒）
        capabilities: 模型能力列表
    """
    name: str
    tier: ModelTier
    input_cost_per_1k: float
    output_cost_per_1k: float
    max_tokens: int
    latency_ms: int
    capabilities: List[str] = field(default_factory=list)

MODEL_CATALOG: Dict[str, ModelConfig] = {
    "gpt-4o-mini": ModelConfig(
        name="gpt-4o-mini",
        tier=ModelTier.FAST_CHEAP,
        input_cost_per_1k=0.00015,
        output_cost_per_1k=0.0006,
        max_tokens=128000,
        latency_ms=200,
        capabilities=["chat", "simple_tasks", "summarization"]
    ),
    "gpt-4o": ModelConfig(
        name="gpt-4o",
        tier=ModelTier.BALANCED,
        input_cost_per_1k=0.0025,
        output_cost_per_1k=0.01,
        max_tokens=128000,
        latency_ms=500,
        capabilities=["chat", "reasoning", "code", "analysis", "vision"]
    ),
    "gpt-4-turbo": ModelConfig(
        name="gpt-4-turbo",
        tier=ModelTier.POWERFUL_EXPENSIVE,
        input_cost_per_1k=0.01,
        output_cost_per_1k=0.03,
        max_tokens=128000,
        latency_ms=1000,
        capabilities=["chat", "reasoning", "code", "analysis", "complex_tasks"]
    ),
    "claude-3-5-haiku": ModelConfig(
        name="claude-3-5-haiku",
        tier=ModelTier.FAST_CHEAP,
        input_cost_per_1k=0.0008,
        output_cost_per_1k=0.004,
        max_tokens=200000,
        latency_ms=150,
        capabilities=["chat", "simple_tasks", "code", "vision"]
    ),
    "claude-3-5-sonnet": ModelConfig(
        name="claude-3-5-sonnet",
        tier=ModelTier.BALANCED,
        input_cost_per_1k=0.003,
        output_cost_per_1k=0.015,
        max_tokens=200000,
        latency_ms=400,
        capabilities=["chat", "reasoning", "code", "analysis", "vision", "artifacts"]
    ),
    "claude-3-opus": ModelConfig(
        name="claude-3-opus",
        tier=ModelTier.POWERFUL_EXPENSIVE,
        input_cost_per_1k=0.015,
        output_cost_per_1k=0.075,
        max_tokens=200000,
        latency_ms=1500,
        capabilities=["chat", "reasoning", "code", "analysis", "complex_tasks", "vision"]
    ),
    "gemini-1.5-flash": ModelConfig(
        name="gemini-1.5-flash",
        tier=ModelTier.FAST_CHEAP,
        input_cost_per_1k=0.000075,
        output_cost_per_1k=0.0003,
        max_tokens=1000000,
        latency_ms=180,
        capabilities=["chat", "simple_tasks", "vision", "long_context"]
    ),
    "gemini-1.5-pro": ModelConfig(
        name="gemini-1.5-pro",
        tier=ModelTier.BALANCED,
        input_cost_per_1k=0.00125,
        output_cost_per_1k=0.005,
        max_tokens=2000000,
        latency_ms=600,
        capabilities=["chat", "reasoning", "code", "analysis", "vision", "long_context"]
    ),
    "deepseek-chat": ModelConfig(
        name="deepseek-chat",
        tier=ModelTier.FAST_CHEAP,
        input_cost_per_1k=0.00007,
        output_cost_per_1k=0.00028,
        max_tokens=64000,
        latency_ms=250,
        capabilities=["chat", "simple_tasks"]
    ),
    "deepseek-reasoner": ModelConfig(
        name="deepseek-reasoner",
        tier=ModelTier.BALANCED,
        input_cost_per_1k=0.00055,
        output_cost_per_1k=0.00219,
        max_tokens=64000,
        latency_ms=800,
        capabilities=["chat", "reasoning", "code", "analysis"]
    )
}

class ModelRouter:
    """
    模型路由器
    
    根据任务特征选择最优模型，平衡成本与性能。
    """
    
    def __init__(
        self,
        default_tier: ModelTier = ModelTier.BALANCED,
        budget_limit: Optional[float] = None
    ):
        """
        初始化模型路由器
        
        参数:
            default_tier: 默认模型层级
            budget_limit: 预算上限（美元）
        """
        self.default_tier = default_tier
        self.budget_limit = budget_limit
        self._spent = 0.0
    
    def select_model(
        self,
        task_type: str,
        complexity: str = "medium",
        required_capabilities: Optional[List[str]] = None,
        prefer_speed: bool = False
    ) -> ModelConfig:
        """
        选择最适合的模型
        
        参数:
            task_type: 任务类型（chat, code, analysis 等）
            complexity: 复杂度（low/medium/high）
            required_capabilities: 必需的能力列表
            prefer_speed: 是否优先考虑速度
        
        返回:
            选中的模型配置
        """
        required = required_capabilities or []
        
        complexity_tier_map = {
            "low": ModelTier.FAST_CHEAP,
            "medium": ModelTier.BALANCED,
            "high": ModelTier.POWERFUL_EXPENSIVE
        }
        
        target_tier = complexity_tier_map.get(complexity, self.default_tier)
        
        candidates = [
            model for model in MODEL_CATALOG.values()
            if model.tier == target_tier and
            all(cap in model.capabilities for cap in required)
        ]
        
        if not candidates:
            candidates = [
                model for model in MODEL_CATALOG.values()
                if all(cap in model.capabilities for cap in required)
            ]
        
        if not candidates:
            candidates = list(MODEL_CATALOG.values())
        
        if prefer_speed:
            candidates.sort(key=lambda m: m.latency_ms)
        else:
            candidates.sort(key=lambda m: m.input_cost_per_1k)
        
        return candidates[0]
    
    def estimate_cost(
        self,
        model: ModelConfig,
        input_tokens: int,
        output_tokens: int
    ) -> float:
        """
        估算调用成本
        
        参数:
            model: 模型配置
            input_tokens: 输入 token 数
            output_tokens: 输出 token 数
        
        返回:
            预估成本（美元）
        """
        input_cost = (input_tokens / 1000) * model.input_cost_per_1k
        output_cost = (output_tokens / 1000) * model.output_cost_per_1k
        return input_cost + output_cost
    
    def get_cheaper_alternative(
        self,
        current_model: ModelConfig,
        required_capabilities: Optional[List[str]] = None
    ) -> Optional[ModelConfig]:
        """
        获取更便宜的替代模型
        
        参数:
            current_model: 当前模型配置
            required_capabilities: 必需的能力列表
        
        返回:
            更便宜的模型配置，若无则返回 None
        """
        required = required_capabilities or []
        cheaper_models = [
            model for model in MODEL_CATALOG.values()
            if model.input_cost_per_1k < current_model.input_cost_per_1k
            and all(cap in model.capabilities for cap in required)
        ]
        
        if cheaper_models:
            cheaper_models.sort(key=lambda m: m.input_cost_per_1k)
            return cheaper_models[0]
        return None
```

### 2. 成本跟踪器

```python
@dataclass
class UsageRecord:
    """
    使用记录数据类
    
    属性:
        timestamp: 时间戳
        model: 使用的模型名称
        input_tokens: 输入 token 数
        output_tokens: 输出 token 数
        cost: 成本（美元）
        task_type: 任务类型
        cached: 是否命中缓存
        request_id: 请求唯一标识
    """
    timestamp: float
    model: str
    input_tokens: int
    output_tokens: int
    cost: float
    task_type: str
    cached: bool = False
    request_id: Optional[str] = None

class CostTracker:
    """
    成本跟踪器
    
    记录和分析 LLM 调用成本，支持预算控制和报表生成。
    """
    
    def __init__(
        self,
        budget_limit: Optional[float] = None,
        alert_threshold: float = 0.8
    ):
        """
        初始化成本跟踪器
        
        参数:
            budget_limit: 预算上限（美元）
            alert_threshold: 预警阈值（占预算比例）
        """
        self.budget_limit = budget_limit
        self.alert_threshold = alert_threshold
        self._records: List[UsageRecord] = []
        self._total_cost = 0.0
        self._total_tokens = {"input": 0, "output": 0}
        self._callbacks: List[Callable[[str, Dict], None]] = []
    
    def register_callback(
        self,
        callback: Callable[[str, Dict], None]
    ) -> None:
        """
        注册事件回调函数
        
        参数:
            callback: 回调函数，接收事件类型和数据
        """
        self._callbacks.append(callback)
    
    def _emit_event(
        self,
        event_type: str,
        data: Dict
    ) -> None:
        """
        触发事件
        
        参数:
            event_type: 事件类型
            data: 事件数据
        """
        for callback in self._callbacks:
            try:
                callback(event_type, data)
            except Exception:
                pass
    
    def record(
        self,
        model: str,
        input_tokens: int,
        output_tokens: int,
        cost: float,
        task_type: str = "unknown",
        cached: bool = False,
        request_id: Optional[str] = None
    ) -> None:
        """
        记录一次使用
        
        参数:
            model: 模型名称
            input_tokens: 输入 token 数
            output_tokens: 输出 token 数
            cost: 成本（美元）
            task_type: 任务类型
            cached: 是否命中缓存
            request_id: 请求唯一标识
        """
        record = UsageRecord(
            timestamp=time.time(),
            model=model,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost=cost,
            task_type=task_type,
            cached=cached,
            request_id=request_id
        )
        
        self._records.append(record)
        self._total_cost += cost
        self._total_tokens["input"] += input_tokens
        self._total_tokens["output"] += output_tokens
        
        if self.budget_limit:
            usage_ratio = self._total_cost / self.budget_limit
            if usage_ratio >= self.alert_threshold:
                self._emit_event("budget_alert", {
                    "current_cost": self._total_cost,
                    "budget_limit": self.budget_limit,
                    "usage_ratio": usage_ratio
                })
    
    def check_budget(self, estimated_cost: float) -> bool:
        """
        检查是否超出预算
        
        参数:
            estimated_cost: 预估成本
        
        返回:
            是否在预算范围内
        """
        if self.budget_limit is None:
            return True
        return (self._total_cost + estimated_cost) <= self.budget_limit
    
    def get_summary(self) -> Dict[str, Any]:
        """
        获取使用摘要
        
        返回:
            包含成本统计的字典
        """
        model_costs: Dict[str, float] = {}
        model_calls: Dict[str, int] = {}
        
        for record in self._records:
            model_costs[record.model] = model_costs.get(record.model, 0) + record.cost
            model_calls[record.model] = model_calls.get(record.model, 0) + 1
        
        return {
            "total_cost": self._total_cost,
            "total_input_tokens": self._total_tokens["input"],
            "total_output_tokens": self._total_tokens["output"],
            "total_calls": len(self._records),
            "cached_calls": sum(1 for r in self._records if r.cached),
            "cache_hit_rate": (
                sum(1 for r in self._records if r.cached) / len(self._records)
                if self._records else 0
            ),
            "model_breakdown": {
                model: {
                    "cost": model_costs[model],
                    "calls": model_calls[model]
                }
                for model in model_costs
            },
            "budget_remaining": (
                self.budget_limit - self._total_cost
                if self.budget_limit else None
            ),
            "budget_usage_percent": (
                (self._total_cost / self.budget_limit * 100)
                if self.budget_limit else None
            )
        }
    
    def get_cost_by_period(
        self,
        period: str = "day"
    ) -> Dict[str, float]:
        """
        按时间段统计成本
        
        参数:
            period: 时间段类型（day/hour/week）
        
        返回:
            时间段到成本的映射
        """
        period_costs: Dict[str, float] = {}
        
        for record in self._records:
            if period == "day":
                key = time.strftime("%Y-%m-%d", time.localtime(record.timestamp))
            elif period == "hour":
                key = time.strftime("%Y-%m-%d %H:00", time.localtime(record.timestamp))
            elif period == "week":
                key = time.strftime("%Y-W%W", time.localtime(record.timestamp))
            else:
                key = "all"
            
            period_costs[key] = period_costs.get(key, 0) + record.cost
        
        return period_costs
    
    def get_cost_by_task_type(self) -> Dict[str, float]:
        """
        按任务类型统计成本
        
        返回:
            任务类型到成本的映射
        """
        task_costs: Dict[str, float] = {}
        
        for record in self._records:
            task_costs[record.task_type] = task_costs.get(record.task_type, 0) + record.cost
        
        return task_costs
    
    def reset(self) -> None:
        """重置所有记录"""
        self._records.clear()
        self._total_cost = 0.0
        self._total_tokens = {"input": 0, "output": 0}
```

### 3. 提示缓存

```python
class PromptCache:
    """
    提示缓存
    
    缓存相似提示的响应以节省成本和减少延迟。
    支持语义相似度匹配和精确匹配两种模式。
    """
    
    def __init__(
        self,
        max_size: int = 1000,
        ttl_seconds: int = 3600,
        similarity_threshold: float = 0.95
    ):
        """
        初始化提示缓存
        
        参数:
            max_size: 最大缓存条目数
            ttl_seconds: 缓存过期时间（秒）
            similarity_threshold: 语义相似度阈值
        """
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self.similarity_threshold = similarity_threshold
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._hits = 0
        self._misses = 0
    
    def _hash_prompt(
        self,
        prompt: str,
        model: str,
        **kwargs
    ) -> str:
        """
        生成提示的哈希键
        
        参数:
            prompt: 提示文本
            model: 模型名称
            **kwargs: 其他影响结果的参数
        
        返回:
            哈希字符串
        """
        cache_key = {
            "prompt": prompt.strip().lower(),
            "model": model,
            **{k: v for k, v in kwargs.items() if k in ["temperature", "max_tokens", "system"]}
        }
        return hashlib.sha256(
            json.dumps(cache_key, sort_keys=True).encode()
        ).hexdigest()
    
    def _normalize_prompt(self, prompt: str) -> str:
        """
        标准化提示文本
        
        参数:
            prompt: 原始提示
        
        返回:
            标准化后的提示
        """
        return " ".join(prompt.strip().lower().split())
    
    def get(
        self,
        prompt: str,
        model: str,
        **kwargs
    ) -> Optional[Dict[str, Any]]:
        """
        获取缓存的响应
        
        参数:
            prompt: 提示文本
            model: 模型名称
            **kwargs: 其他参数
        
        返回:
            缓存的响应，若不存在则返回 None
        """
        key = self._hash_prompt(prompt, model, **kwargs)
        
        if key in self._cache:
            entry = self._cache[key]
            if time.time() - entry["timestamp"] < self.ttl_seconds:
                self._hits += 1
                return entry["response"]
            else:
                del self._cache[key]
        
        self._misses += 1
        return None
    
    def set(
        self,
        prompt: str,
        model: str,
        response: Dict[str, Any],
        **kwargs
    ) -> None:
        """
        缓存响应
        
        参数:
            prompt: 提示文本
            model: 模型名称
            response: 响应内容
            **kwargs: 其他参数
        """
        if len(self._cache) >= self.max_size:
            self._evict_oldest()
        
        key = self._hash_prompt(prompt, model, **kwargs)
        self._cache[key] = {
            "response": response,
            "timestamp": time.time(),
            "prompt_preview": prompt[:100] if len(prompt) > 100 else prompt
        }
    
    def _evict_oldest(self) -> None:
        """淘汰最旧的缓存条目"""
        if not self._cache:
            return
        
        oldest_key = min(
            self._cache.keys(),
            key=lambda k: self._cache[k]["timestamp"]
        )
        del self._cache[oldest_key]
    
    def clear(self) -> None:
        """清空缓存"""
        self._cache.clear()
        self._hits = 0
        self._misses = 0
    
    def get_stats(self) -> Dict[str, Any]:
        """
        获取缓存统计
        
        返回:
            缓存统计信息
        """
        total_requests = self._hits + self._misses
        return {
            "size": len(self._cache),
            "max_size": self.max_size,
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate": self._hits / total_requests if total_requests > 0 else 0,
            "ttl_seconds": self.ttl_seconds
        }
    
    def estimate_savings(
        self,
        avg_cost_per_call: float = 0.01
    ) -> float:
        """
        估算节省的成本
        
        参数:
            avg_cost_per_call: 平均每次调用的成本
        
        返回:
            节省的成本（美元）
        """
        return self._hits * avg_cost_per_call
```

### 4. 重试逻辑

```python
import random
import asyncio
from typing import TypeVar, Generic, List, Type
from enum import Enum

T = TypeVar('T')

class RetryStrategy(Enum):
    """重试策略枚举"""
    EXPONENTIAL = "exponential"
    LINEAR = "linear"
    FIXED = "fixed"

class RetryPolicy:
    """
    重试策略
    
    处理 LLM 调用的失败重试，支持多种退避策略。
    """
    
    RETRYABLE_ERRORS = [
        "rate_limit",
        "rate_limit_exceeded",
        "timeout",
        "timed_out",
        "service_unavailable",
        "internal_error",
        "overloaded",
        "capacity_exceeded"
    ]
    
    def __init__(
        self,
        max_retries: int = 3,
        base_delay: float = 1.0,
        max_delay: float = 60.0,
        strategy: RetryStrategy = RetryStrategy.EXPONENTIAL,
        jitter: bool = True,
        exponential_base: float = 2.0
    ):
        """
        初始化重试策略
        
        参数:
            max_retries: 最大重试次数
            base_delay: 基础延迟（秒）
            max_delay: 最大延迟（秒）
            strategy: 退避策略
            jitter: 是否添加随机抖动
            exponential_base: 指数退避基数
        """
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.max_delay = max_delay
        self.strategy = strategy
        self.jitter = jitter
        self.exponential_base = exponential_base
    
    def get_delay(self, attempt: int) -> float:
        """
        计算重试延迟
        
        参数:
            attempt: 当前尝试次数（从 0 开始）
        
        返回:
            延迟时间（秒）
        """
        if self.strategy == RetryStrategy.EXPONENTIAL:
            delay = min(
                self.base_delay * (self.exponential_base ** attempt),
                self.max_delay
            )
        elif self.strategy == RetryStrategy.LINEAR:
            delay = min(
                self.base_delay * (attempt + 1),
                self.max_delay
            )
        else:
            delay = min(self.base_delay, self.max_delay)
        
        if self.jitter:
            delay = delay * (0.5 + random.random())
        
        return delay
    
    def should_retry(
        self,
        error: Exception,
        attempt: int
    ) -> bool:
        """
        判断是否应该重试
        
        参数:
            error: 发生的异常
            attempt: 当前尝试次数
        
        返回:
            是否应该重试
        """
        if attempt >= self.max_retries:
            return False
        
        error_str = str(error).lower()
        error_type = type(error).__name__.lower()
        
        return any(
            err in error_str or err in error_type
            for err in self.RETRYABLE_ERRORS
        )
    
    def get_retry_after(self, error: Exception) -> Optional[float]:
        """
        从错误中提取 Retry-After 时间
        
        参数:
            error: 异常对象
        
        返回:
            重试等待时间（秒），若无则返回 None
        """
        error_str = str(error)
        
        import re
        match = re.search(r'retry.?after[:\s]+(\d+(?:\.\d+)?)', error_str, re.I)
        if match:
            return float(match.group(1))
        
        match = re.search(r'wait[:\s]+(\d+(?:\.\d+)?)\s*s', error_str, re.I)
        if match:
            return float(match.group(1))
        
        return None


class RetryExecutor:
    """
    重试执行器
    
    封装重试逻辑，支持同步和异步调用。
    """
    
    def __init__(self, policy: RetryPolicy):
        """
        初始化重试执行器
        
        参数:
            policy: 重试策略
        """
        self.policy = policy
        self._attempt_counts: Dict[str, int] = {}
    
    async def execute_async(
        self,
        func: Callable[..., Any],
        *args,
        **kwargs
    ) -> Any:
        """
        异步执行带重试的函数
        
        参数:
            func: 要执行的异步函数
            *args: 位置参数
            **kwargs: 关键字参数
        
        返回:
            函数执行结果
        
        抛出:
            最后一次尝试的异常
        """
        attempt = 0
        last_error = None
        
        while True:
            try:
                return await func(*args, **kwargs)
            except Exception as e:
                last_error = e
                
                if not self.policy.should_retry(e, attempt):
                    raise
                
                retry_after = self.policy.get_retry_after(e)
                if retry_after:
                    delay = retry_after
                else:
                    delay = self.policy.get_delay(attempt)
                
                await asyncio.sleep(delay)
                attempt += 1
    
    def execute_sync(
        self,
        func: Callable[..., Any],
        *args,
        **kwargs
    ) -> Any:
        """
        同步执行带重试的函数
        
        参数:
            func: 要执行的同步函数
            *args: 位置参数
            **kwargs: 关键字参数
        
        返回:
            函数执行结果
        
        抛出:
            最后一次尝试的异常
        """
        import time as time_module
        attempt = 0
        last_error = None
        
        while True:
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_error = e
                
                if not self.policy.should_retry(e, attempt):
                    raise
                
                retry_after = self.policy.get_retry_after(e)
                if retry_after:
                    delay = retry_after
                else:
                    delay = self.policy.get_delay(attempt)
                
                time_module.sleep(delay)
                attempt += 1
```

### 5. 成本感知 LLM 管道

```python
import uuid
from abc import ABC, abstractmethod

class BudgetExceededError(Exception):
    """预算超限异常"""
    pass

class LLMProvider(ABC):
    """
    LLM 提供商抽象基类
    
    定义统一的 LLM 调用接口。
    """
    
    @abstractmethod
    async def call(
        self,
        model: str,
        prompt: str,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行 LLM 调用
        
        参数:
            model: 模型名称
            prompt: 提示文本
            **kwargs: 其他参数
        
        返回:
            包含响应和使用信息的字典
        """
        pass

class CostAwareLLMPipeline:
    """
    成本感知 LLM 调用管道
    
    整合模型路由、成本跟踪、缓存和重试，提供统一的调用接口。
    """
    
    def __init__(
        self,
        provider: LLMProvider,
        budget_limit: Optional[float] = None,
        cache_enabled: bool = True,
        default_complexity: str = "medium"
    ):
        """
        初始化成本感知管道
        
        参数:
            provider: LLM 提供商实例
            budget_limit: 预算上限（美元）
            cache_enabled: 是否启用缓存
            default_complexity: 默认任务复杂度
        """
        self.provider = provider
        self.router = ModelRouter(budget_limit=budget_limit)
        self.tracker = CostTracker(budget_limit=budget_limit)
        self.cache = PromptCache() if cache_enabled else None
        self.retry_policy = RetryPolicy()
        self.retry_executor = RetryExecutor(self.retry_policy)
        self.default_complexity = default_complexity
    
    async def call(
        self,
        prompt: str,
        task_type: str = "chat",
        complexity: Optional[str] = None,
        required_capabilities: Optional[List[str]] = None,
        model: Optional[str] = None,
        **kwargs
    ) -> Dict[str, Any]:
        """
        执行 LLM 调用
        
        参数:
            prompt: 提示文本
            task_type: 任务类型
            complexity: 任务复杂度
            required_capabilities: 必需的能力列表
            model: 指定模型（可选，覆盖自动选择）
            **kwargs: 其他参数
        
        返回:
            包含响应和元数据的字典
        
        抛出:
            BudgetExceededError: 预算超限时
        """
        request_id = str(uuid.uuid4())[:8]
        
        if model:
            selected_model = MODEL_CATALOG.get(model)
            if not selected_model:
                raise ValueError(f"未知模型: {model}")
        else:
            selected_model = self.router.select_model(
                task_type=task_type,
                complexity=complexity or self.default_complexity,
                required_capabilities=required_capabilities
            )
        
        if self.cache:
            cached = self.cache.get(prompt, selected_model.name, **kwargs)
            if cached:
                self.tracker.record(
                    model=selected_model.name,
                    input_tokens=0,
                    output_tokens=0,
                    cost=0,
                    task_type=task_type,
                    cached=True,
                    request_id=request_id
                )
                return {**cached, "cached": True, "request_id": request_id}
        
        estimated_input = self._estimate_tokens(prompt)
        estimated_output = kwargs.get("max_tokens", 500)
        estimated_cost = self.router.estimate_cost(
            selected_model, estimated_input, estimated_output
        )
        
        if not self.tracker.check_budget(estimated_cost):
            raise BudgetExceededError(
                f"预算不足: 已使用 ${self.tracker._total_cost:.4f}, "
                f"需要 ${estimated_cost:.4f}"
            )
        
        response = await self._call_with_retry(
            prompt=prompt,
            model=selected_model,
            **kwargs
        )
        
        actual_input = response.get("usage", {}).get("input_tokens", estimated_input)
        actual_output = response.get("usage", {}).get("output_tokens", estimated_output)
        actual_cost = self.router.estimate_cost(
            selected_model, actual_input, actual_output
        )
        
        self.tracker.record(
            model=selected_model.name,
            input_tokens=actual_input,
            output_tokens=actual_output,
            cost=actual_cost,
            task_type=task_type,
            request_id=request_id
        )
        
        if self.cache:
            self.cache.set(prompt, selected_model.name, response, **kwargs)
        
        return {
            **response,
            "model": selected_model.name,
            "cost": actual_cost,
            "request_id": request_id
        }
    
    async def _call_with_retry(
        self,
        prompt: str,
        model: ModelConfig,
        **kwargs
    ) -> Dict[str, Any]:
        """
        带重试的调用
        
        参数:
            prompt: 提示文本
            model: 模型配置
            **kwargs: 其他参数
        
        返回:
            响应字典
        """
        async def _call():
            return await self.provider.call(
                model=model.name,
                prompt=prompt,
                **kwargs
            )
        
        return await self.retry_executor.execute_async(_call)
    
    def _estimate_tokens(self, text: str) -> int:
        """
        估算文本的 token 数
        
        参数:
            text: 输入文本
        
        返回:
            估算的 token 数
        """
        char_count = len(text)
        word_count = len(text.split())
        return int(max(char_count / 4, word_count * 1.3))
    
    def get_report(self) -> Dict[str, Any]:
        """
        获取成本报告
        
        返回:
            包含成本和缓存统计的字典
        """
        return {
            "cost_summary": self.tracker.get_summary(),
            "cost_by_period": self.tracker.get_cost_by_period(),
            "cost_by_task": self.tracker.get_cost_by_task_type(),
            "cache_stats": self.cache.get_stats() if self.cache else None,
            "cache_savings": (
                self.cache.estimate_savings(
                    avg_cost_per_call=self.tracker._total_cost / max(self.tracker._records.__len__(), 1)
                ) if self.cache else 0
            )
        }
    
    def set_budget_alert(
        self,
        callback: Callable[[str, Dict], None]
    ) -> None:
        """
        设置预算预警回调
        
        参数:
            callback: 回调函数
        """
        self.tracker.register_callback(callback)
```

## 定价参考表

### OpenAI 模型定价

| 模型 | 输入价格 ($/1K tokens) | 输出价格 ($/1K tokens) | 上下文窗口 | 缓存输入价格 |
|------|----------------------|----------------------|-----------|-------------|
| GPT-4o-mini | 0.00015 | 0.0006 | 128K | 0.000075 |
| GPT-4o | 0.0025 | 0.01 | 128K | 0.00125 |
| GPT-4-turbo | 0.01 | 0.03 | 128K | 0.005 |
| GPT-4 | 0.03 | 0.06 | 8K | - |
| GPT-3.5-turbo | 0.0005 | 0.0015 | 16K | - |

### Anthropic 模型定价

| 模型 | 输入价格 ($/1K tokens) | 输出价格 ($/1K tokens) | 上下文窗口 | 缓存写入 | 缓存读取 |
|------|----------------------|----------------------|-----------|---------|---------|
| Claude 3.5 Haiku | 0.0008 | 0.004 | 200K | 0.001 | 0.00008 |
| Claude 3.5 Sonnet | 0.003 | 0.015 | 200K | 0.00375 | 0.0003 |
| Claude 3 Opus | 0.015 | 0.075 | 200K | 0.01875 | 0.0015 |

### Google 模型定价

| 模型 | 输入价格 ($/1K tokens) | 输出价格 ($/1K tokens) | 上下文窗口 |
|------|----------------------|----------------------|-----------|
| Gemini 1.5 Flash | 0.000075 | 0.0003 | 1M |
| Gemini 1.5 Pro | 0.00125 | 0.005 | 2M |
| Gemini 1.0 Pro | 0.00025 | 0.0005 | 32K |

### 其他模型定价

| 模型 | 输入价格 ($/1K tokens) | 输出价格 ($/1K tokens) | 上下文窗口 |
|------|----------------------|----------------------|-----------|
| DeepSeek Chat | 0.00007 | 0.00028 | 64K |
| DeepSeek Reasoner | 0.00055 | 0.00219 | 64K |
| Mistral Small | 0.0002 | 0.0006 | 32K |
| Mistral Medium | 0.0027 | 0.0081 | 32K |
| Mistral Large | 0.004 | 0.012 | 32K |
| Llama 3.1 70B (Groq) | 0.00059 | 0.00079 | 128K |
| Llama 3.1 8B (Groq) | 0.00005 | 0.00008 | 128K |

> **注意**: 以上价格为参考价格，实际价格可能因地区、用量等级等因素有所不同。建议查阅各提供商官方定价页面获取最新信息。

## 最佳实践

### 1. 模型选择策略

```python
def select_optimal_model(
    task: str,
    budget_remaining: float,
    urgency: str = "normal"
) -> ModelConfig:
    """
    选择最优模型
    
    参数:
        task: 任务描述
        budget_remaining: 剩余预算
        urgency: 紧急程度（low/normal/high）
    
    返回:
        最优模型配置
    """
    if urgency == "high":
        complexity = "low"
        prefer_speed = True
    elif urgency == "low":
        complexity = "high"
        prefer_speed = False
    else:
        complexity = "medium"
        prefer_speed = False
    
    router = ModelRouter(budget_limit=budget_remaining)
    return router.select_model(
        task_type=task,
        complexity=complexity,
        prefer_speed=prefer_speed
    )
```

### 2. 成本优化建议

| 场景 | 推荐策略 | 预期节省 |
|------|---------|---------|
| 重复查询 | 启用提示缓存 | 50-90% |
| 简单任务 | 使用 Fast Cheap 模型 | 80-95% |
| 批量处理 | 合并请求减少调用次数 | 30-50% |
| 长上下文 | 使用支持长上下文的模型 | 避免 token 截断重试 |
| 高频调用 | 设置预算预警和限流 | 防止超支 |

### 3. 监控指标

```python
class CostMonitor:
    """
    成本监控器
    
    提供实时成本监控和预警功能。
    """
    
    def __init__(
        self,
        tracker: CostTracker,
        alert_thresholds: List[float] = [0.5, 0.75, 0.9, 0.95]
    ):
        """
        初始化成本监控器
        
        参数:
            tracker: 成本跟踪器
            alert_thresholds: 预警阈值列表
        """
        self.tracker = tracker
        self.alert_thresholds = sorted(alert_thresholds)
        self._triggered_thresholds: set = set()
    
    def check_and_alert(
        self,
        budget_limit: float
    ) -> Optional[Dict[str, Any]]:
        """
        检查并触发预警
        
        参数:
            budget_limit: 预算上限
        
        返回:
            预警信息，若无则返回 None
        """
        summary = self.tracker.get_summary()
        current_cost = summary["total_cost"]
        usage_ratio = current_cost / budget_limit
        
        for threshold in self.alert_thresholds:
            if threshold not in self._triggered_thresholds:
                if usage_ratio >= threshold:
                    self._triggered_thresholds.add(threshold)
                    return {
                        "level": f"{int(threshold * 100)}%",
                        "current_cost": current_cost,
                        "budget_limit": budget_limit,
                        "remaining": budget_limit - current_cost,
                        "usage_ratio": usage_ratio
                    }
        
        return None
    
    def get_health_status(
        self,
        budget_limit: float
    ) -> Dict[str, Any]:
        """
        获取健康状态
        
        参数:
            budget_limit: 预算上限
        
        返回:
            健康状态信息
        """
        summary = self.tracker.get_summary()
        usage_ratio = summary["total_cost"] / budget_limit
        
        if usage_ratio < 0.5:
            status = "healthy"
        elif usage_ratio < 0.75:
            status = "warning"
        elif usage_ratio < 0.9:
            status = "critical"
        else:
            status = "emergency"
        
        return {
            "status": status,
            "usage_ratio": usage_ratio,
            "total_calls": summary["total_calls"],
            "cache_hit_rate": summary["cache_hit_rate"],
            "recommendations": self._get_recommendations(usage_ratio, summary)
        }
    
    def _get_recommendations(
        self,
        usage_ratio: float,
        summary: Dict
    ) -> List[str]:
        """
        生成优化建议
        
        参数:
            usage_ratio: 使用比例
            summary: 使用摘要
        
        返回:
            建议列表
        """
        recommendations = []
        
        if usage_ratio > 0.75:
            recommendations.append("考虑切换到更便宜的模型")
        
        if summary["cache_hit_rate"] < 0.3:
            recommendations.append("启用或优化提示缓存策略")
        
        model_breakdown = summary.get("model_breakdown", {})
        expensive_models = [
            m for m, data in model_breakdown.items()
            if data["cost"] > summary["total_cost"] * 0.5
        ]
        if expensive_models:
            recommendations.append(f"减少使用昂贵模型: {', '.join(expensive_models)}")
        
        return recommendations
```

## 快速参考

| 组件 | 用途 | 关键方法 |
|------|------|---------|
| ModelRouter | 模型选择 | `select_model()`, `estimate_cost()` |
| CostTracker | 成本跟踪 | `record()`, `get_summary()`, `check_budget()` |
| PromptCache | 响应缓存 | `get()`, `set()`, `get_stats()` |
| RetryPolicy | 重试策略 | `get_delay()`, `should_retry()` |
| CostAwareLLMPipeline | 统一管道 | `call()`, `get_report()` |

## 反模式警示

```python
# 错误: 简单任务使用昂贵模型
response = await pipeline.call(
    prompt="Hello",
    model="gpt-4-turbo"
)

# 正确: 让路由器自动选择
response = await pipeline.call(
    prompt="Hello",
    complexity="low"
)

# 错误: 忽略缓存统计
response = await pipeline.call(prompt, cache_enabled=False)

# 正确: 监控缓存效果
response = await pipeline.call(prompt)
print(pipeline.cache.get_stats())

# 错误: 无预算限制
pipeline = CostAwareLLMPipeline(provider)

# 正确: 设置预算上限
pipeline = CostAwareLLMPipeline(
    provider,
    budget_limit=10.00
)
```

**记住**: 成本优化的核心是"按需选择"——根据任务复杂度匹配合适的模型，同时通过缓存和监控避免不必要的开支。
