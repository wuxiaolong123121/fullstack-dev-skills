# Hook 自动触发参考

自动触发 Hook 的核心配置、条件判断逻辑和动作执行模式，用于构建响应式、事件驱动的自动化系统。

## When to Activate

- 设计自动化工作流
- 实现事件驱动架构
- 配置定时任务和调度
- 构建条件触发系统

## Core Principles

### 1. 单一职责原则

每个触发器应该只负责一种类型的触发逻辑。

```python
from dataclasses import dataclass
from datetime import datetime
from typing import Callable, Any
from enum import Enum


class TriggerType(Enum):
    """触发器类型枚举。"""
    TIME = "time"
    EVENT = "event"
    CONDITION = "condition"


@dataclass
class TriggerConfig:
    """触发器配置基类。"""
    trigger_type: TriggerType
    enabled: bool = True
    priority: int = 0
```

### 2. 明确的触发条件

触发条件应该清晰、可测试、可追溯。

```python
from abc import ABC, abstractmethod


class TriggerCondition(ABC):
    """触发条件抽象基类。"""

    @abstractmethod
    def evaluate(self, context: dict[str, Any]) -> bool:
        """
        评估触发条件。

        Args:
            context: 上下文数据字典

        Returns:
            条件是否满足
        """
        pass


class CompositeCondition(TriggerCondition):
    """组合条件，支持 AND/OR 逻辑。"""

    def __init__(
        self,
        conditions: list[TriggerCondition],
        operator: str = "AND"
    ):
        self.conditions = conditions
        self.operator = operator

    def evaluate(self, context: dict[str, Any]) -> bool:
        """评估组合条件。"""
        if self.operator == "AND":
            return all(c.evaluate(context) for c in self.conditions)
        elif self.operator == "OR":
            return any(c.evaluate(context) for c in self.conditions)
        raise ValueError(f"未知操作符: {self.operator}")
```

### 3. 幂等性设计

动作执行应该是幂等的，避免重复执行产生副作用。

```python
import hashlib
from functools import wraps


def idempotent(key_func: Callable[..., str]):
    """
    幂等性装饰器。

    Args:
        key_func: 生成唯一键的函数
    """
    executed_keys: set[str] = set()

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            key = key_func(*args, **kwargs)
            if key in executed_keys:
                return None
            executed_keys.add(key)
            return func(*args, **kwargs)
        return wrapper
    return decorator
```

## 触发器配置

### 时间触发器

基于时间间隔或特定时间点触发的配置。

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Literal


@dataclass
class TimeTriggerConfig:
    """
    时间触发器配置。

    Attributes:
        trigger_type: 触发类型（interval/cron/exact）
        interval: 间隔秒数（interval 类型）
        cron_expression: Cron 表达式（cron 类型）
        exact_time: 精确时间（exact 类型）
        timezone: 时区设置
        start_time: 开始时间
        end_time: 结束时间
    """
    trigger_type: Literal["interval", "cron", "exact"]
    interval: int | None = None
    cron_expression: str | None = None
    exact_time: datetime | None = None
    timezone: str = "Asia/Shanghai"
    start_time: datetime | None = None
    end_time: datetime | None = None


class TimeTrigger:
    """时间触发器实现。"""

    def __init__(self, config: TimeTriggerConfig):
        self.config = config
        self._last_triggered: datetime | None = None

    def should_trigger(self, current_time: datetime) -> bool:
        """
        判断是否应该触发。

        Args:
            current_time: 当前时间

        Returns:
            是否应该触发
        """
        if self.config.start_time and current_time < self.config.start_time:
            return False
        if self.config.end_time and current_time > self.config.end_time:
            return False

        if self.config.trigger_type == "interval":
            return self._check_interval(current_time)
        elif self.config.trigger_type == "cron":
            return self._check_cron(current_time)
        elif self.config.trigger_type == "exact":
            return self._check_exact(current_time)

        return False

    def _check_interval(self, current_time: datetime) -> bool:
        """检查间隔触发。"""
        if self._last_triggered is None:
            return True
        elapsed = (current_time - self._last_triggered).total_seconds()
        return elapsed >= self.config.interval

    def _check_cron(self, current_time: datetime) -> bool:
        """检查 Cron 表达式触发。"""
        pass

    def _check_exact(self, current_time: datetime) -> bool:
        """检查精确时间触发。"""
        if self.config.exact_time is None:
            return False
        return current_time >= self.config.exact_time


interval_config = TimeTriggerConfig(
    trigger_type="interval",
    interval=3600,
    start_time=datetime.now(),
    end_time=datetime.now() + timedelta(days=7)
)

cron_config = TimeTriggerConfig(
    trigger_type="cron",
    cron_expression="0 9 * * 1-5"
)

exact_config = TimeTriggerConfig(
    trigger_type="exact",
    exact_time=datetime(2024, 12, 31, 23, 59, 59)
)
```

### 事件触发器

基于系统事件或用户行为触发的配置。

```python
from dataclasses import dataclass, field
from typing import Any, Callable
from enum import Enum


class EventType(Enum):
    """事件类型枚举。"""
    USER_LOGIN = "user.login"
    USER_LOGOUT = "user.logout"
    FILE_CREATED = "file.created"
    FILE_MODIFIED = "file.modified"
    FILE_DELETED = "file.deleted"
    API_REQUEST = "api.request"
    API_RESPONSE = "api.response"
    SYSTEM_STARTUP = "system.startup"
    SYSTEM_SHUTDOWN = "system.shutdown"
    CUSTOM = "custom"


@dataclass
class Event:
    """
    事件数据结构。

    Attributes:
        event_type: 事件类型
        timestamp: 事件时间戳
        source: 事件来源
        payload: 事件负载数据
        metadata: 元数据
    """
    event_type: EventType
    timestamp: datetime
    source: str
    payload: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class EventTriggerConfig:
    """
    事件触发器配置。

    Attributes:
        event_types: 监听的事件类型列表
        sources: 事件来源过滤（空表示全部）
        payload_filters: 负载字段过滤条件
        debounce_ms: 防抖毫秒数
        throttle_ms: 节流毫秒数
    """
    event_types: list[EventType]
    sources: list[str] = field(default_factory=list)
    payload_filters: dict[str, Any] = field(default_factory=dict)
    debounce_ms: int = 0
    throttle_ms: int = 0


class EventTrigger:
    """事件触发器实现。"""

    def __init__(self, config: EventTriggerConfig):
        self.config = config
        self._last_event_time: datetime | None = None

    def should_trigger(self, event: Event) -> bool:
        """
        判断事件是否应该触发。

        Args:
            event: 接收到的事件

        Returns:
            是否应该触发
        """
        if event.event_type not in self.config.event_types:
            return False

        if self.config.sources and event.source not in self.config.sources:
            return False

        if not self._match_payload_filters(event.payload):
            return False

        if not self._check_rate_limit(event.timestamp):
            return False

        return True

    def _match_payload_filters(self, payload: dict[str, Any]) -> bool:
        """匹配负载过滤条件。"""
        for key, expected_value in self.config.payload_filters.items():
            if payload.get(key) != expected_value:
                return False
        return True

    def _check_rate_limit(self, timestamp: datetime) -> bool:
        """检查速率限制。"""
        if self._last_event_time is None:
            self._last_event_time = timestamp
            return True

        elapsed_ms = (timestamp - self._last_event_time).total_seconds() * 1000

        if self.config.throttle_ms > 0 and elapsed_ms < self.config.throttle_ms:
            return False

        self._last_event_time = timestamp
        return True


event_config = EventTriggerConfig(
    event_types=[EventType.FILE_CREATED, EventType.FILE_MODIFIED],
    sources=["user_uploads", "api_import"],
    payload_filters={"file_type": "image"},
    throttle_ms=1000
)
```

### 条件触发器

基于系统状态或业务条件触发的配置。

```python
from dataclasses import dataclass, field
from typing import Any, Callable
from enum import Enum


class ComparisonOperator(Enum):
    """比较操作符枚举。"""
    EQ = "=="
    NE = "!="
    GT = ">"
    GE = ">="
    LT = "<"
    LE = "<="
    CONTAINS = "contains"
    STARTSWITH = "startswith"
    ENDSWITH = "endswith"
    MATCHES = "matches"


@dataclass
class ConditionRule:
    """
    条件规则。

    Attributes:
        field_path: 字段路径（支持点号分隔）
        operator: 比较操作符
        value: 比较值
        negate: 是否取反
    """
    field_path: str
    operator: ComparisonOperator
    value: Any
    negate: bool = False


@dataclass
class ConditionTriggerConfig:
    """
    条件触发器配置。

    Attributes:
        rules: 条件规则列表
        logic_operator: 规则间逻辑关系（AND/OR）
        evaluation_interval: 评估间隔秒数
        state_provider: 状态提供者函数
    """
    rules: list[ConditionRule]
    logic_operator: Literal["AND", "OR"] = "AND"
    evaluation_interval: int = 60
    state_provider: Callable[[], dict[str, Any]] | None = None


class ConditionTrigger:
    """条件触发器实现。"""

    def __init__(self, config: ConditionTriggerConfig):
        self.config = config
        self._last_evaluation: datetime | None = None
        self._previous_result: bool = False

    def evaluate(self, state: dict[str, Any]) -> bool:
        """
        评估当前状态是否满足触发条件。

        Args:
            state: 当前状态数据

        Returns:
            是否满足触发条件
        """
        rule_results = [
            self._evaluate_rule(rule, state)
            for rule in self.config.rules
        ]

        if self.config.logic_operator == "AND":
            result = all(rule_results)
        else:
            result = any(rule_results)

        self._previous_result = result
        return result

    def _evaluate_rule(self, rule: ConditionRule, state: dict[str, Any]) -> bool:
        """评估单个规则。"""
        actual_value = self._get_nested_value(state, rule.field_path)

        result = self._compare(actual_value, rule.operator, rule.value)

        return not result if rule.negate else result

    def _get_nested_value(
        self,
        data: dict[str, Any],
        path: str
    ) -> Any:
        """获取嵌套字段值。"""
        keys = path.split(".")
        value = data
        for key in keys:
            if isinstance(value, dict):
                value = value.get(key)
            else:
                return None
        return value

    def _compare(
        self,
        actual: Any,
        operator: ComparisonOperator,
        expected: Any
    ) -> bool:
        """执行比较操作。"""
        ops = {
            ComparisonOperator.EQ: lambda a, e: a == e,
            ComparisonOperator.NE: lambda a, e: a != e,
            ComparisonOperator.GT: lambda a, e: a > e,
            ComparisonOperator.GE: lambda a, e: a >= e,
            ComparisonOperator.LT: lambda a, e: a < e,
            ComparisonOperator.LE: lambda a, e: a <= e,
            ComparisonOperator.CONTAINS: lambda a, e: e in a if a else False,
            ComparisonOperator.STARTSWITH: lambda a, e: str(a).startswith(str(e)),
            ComparisonOperator.ENDSWITH: lambda a, e: str(a).endswith(str(e)),
            ComparisonOperator.MATCHES: lambda a, e: bool(__import__("re").match(e, str(a))),
        }
        return ops.get(operator, lambda a, e: False)(actual, expected)


condition_config = ConditionTriggerConfig(
    rules=[
        ConditionRule(
            field_path="system.cpu_usage",
            operator=ComparisonOperator.GT,
            value=80
        ),
        ConditionRule(
            field_path="system.memory_usage",
            operator=ComparisonOperator.GT,
            value=90
        ),
    ],
    logic_operator="OR",
    evaluation_interval=30
)
```

## 条件判断逻辑

### 复合条件判断

支持多层嵌套的复合条件判断。

```python
from dataclasses import dataclass
from typing import Any, Literal
from abc import ABC, abstractmethod


class ConditionNode(ABC):
    """条件节点抽象基类。"""

    @abstractmethod
    def evaluate(self, context: dict[str, Any]) -> bool:
        """评估条件。"""
        pass


@dataclass
class SimpleCondition(ConditionNode):
    """
    简单条件节点。

    Attributes:
        field: 字段名
        operator: 操作符
        value: 比较值
    """
    field: str
    operator: str
    value: Any

    def evaluate(self, context: dict[str, Any]) -> bool:
        """评估简单条件。"""
        actual = context.get(self.field)
        ops = {
            "==": lambda a, b: a == b,
            "!=": lambda a, b: a != b,
            ">": lambda a, b: a > b if a is not None else False,
            ">=": lambda a, b: a >= b if a is not None else False,
            "<": lambda a, b: a < b if a is not None else False,
            "<=": lambda a, b: a <= b if a is not None else False,
            "in": lambda a, b: a in b if b else False,
            "not_in": lambda a, b: a not in b if b else True,
            "contains": lambda a, b: b in a if a else False,
            "is_empty": lambda a, b: not a,
            "is_not_empty": lambda a, b: bool(a),
        }
        return ops.get(self.operator, lambda a, b: False)(actual, self.value)


@dataclass
class CompositeCondition(ConditionNode):
    """
    复合条件节点。

    Attributes:
        operator: 逻辑操作符（AND/OR/NOT）
        children: 子条件列表
    """
    operator: Literal["AND", "OR", "NOT"]
    children: list[ConditionNode]

    def evaluate(self, context: dict[str, Any]) -> bool:
        """评估复合条件。"""
        if self.operator == "AND":
            return all(child.evaluate(context) for child in self.children)
        elif self.operator == "OR":
            return any(child.evaluate(context) for child in self.children)
        elif self.operator == "NOT":
            return not self.children[0].evaluate(context) if self.children else True
        return False


class ConditionBuilder:
    """条件构建器，提供流畅的 API。"""

    def __init__(self):
        self._conditions: list[ConditionNode] = []

    def field(self, name: str) -> "FieldConditionBuilder":
        """开始字段条件构建。"""
        return FieldConditionBuilder(self, name)

    def and_(self, *conditions: ConditionNode) -> "ConditionBuilder":
        """添加 AND 组合条件。"""
        self._conditions.append(CompositeCondition("AND", list(conditions)))
        return self

    def or_(self, *conditions: ConditionNode) -> "ConditionBuilder":
        """添加 OR 组合条件。"""
        self._conditions.append(CompositeCondition("OR", list(conditions)))
        return self

    def not_(self, condition: ConditionNode) -> "ConditionBuilder":
        """添加 NOT 条件。"""
        self._conditions.append(CompositeCondition("NOT", [condition]))
        return self

    def build(self) -> ConditionNode:
        """构建最终条件。"""
        if len(self._conditions) == 1:
            return self._conditions[0]
        return CompositeCondition("AND", self._conditions)


class FieldConditionBuilder:
    """字段条件构建器。"""

    def __init__(self, parent: ConditionBuilder, field: str):
        self.parent = parent
        self.field = field

    def eq(self, value: Any) -> ConditionBuilder:
        """等于。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, "==", value)
        )
        return self.parent

    def ne(self, value: Any) -> ConditionBuilder:
        """不等于。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, "!=", value)
        )
        return self.parent

    def gt(self, value: Any) -> ConditionBuilder:
        """大于。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, ">", value)
        )
        return self.parent

    def gte(self, value: Any) -> ConditionBuilder:
        """大于等于。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, ">=", value)
        )
        return self.parent

    def lt(self, value: Any) -> ConditionBuilder:
        """小于。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, "<", value)
        )
        return self.parent

    def lte(self, value: Any) -> ConditionBuilder:
        """小于等于。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, "<=", value)
        )
        return self.parent

    def is_in(self, values: list[Any]) -> ConditionBuilder:
        """在列表中。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, "in", values)
        )
        return self.parent

    def is_empty(self) -> ConditionBuilder:
        """为空。"""
        self.parent._conditions.append(
            SimpleCondition(self.field, "is_empty", None)
        )
        return self.parent


condition = (
    ConditionBuilder()
    .field("status").eq("active")
    .field("score").gte(80)
    .field("role").is_in(["admin", "manager"])
    .build()
)

result = condition.evaluate({
    "status": "active",
    "score": 85,
    "role": "admin"
})
```

### 状态变化检测

检测状态变化并触发相应动作。

```python
from dataclasses import dataclass, field
from typing import Any, Callable
from enum import Enum


class ChangeType(Enum):
    """变化类型枚举。"""
    CREATED = "created"
    UPDATED = "updated"
    DELETED = "deleted"
    VALUE_CHANGED = "value_changed"


@dataclass
class StateChange:
    """
    状态变化记录。

    Attributes:
        field: 变化字段
        change_type: 变化类型
        old_value: 旧值
        new_value: 新值
        timestamp: 变化时间
    """
    field: str
    change_type: ChangeType
    old_value: Any = None
    new_value: Any = None
    timestamp: datetime = field(default_factory=datetime.now)


class StateWatcher:
    """状态观察器，检测状态变化。"""

    def __init__(self):
        self._previous_state: dict[str, Any] = {}
        self._change_handlers: dict[str, list[Callable[[StateChange], None]]] = {}

    def register_handler(
        self,
        field: str,
        handler: Callable[[StateChange], None]
    ) -> None:
        """
        注册变化处理器。

        Args:
            field: 监听的字段
            handler: 处理函数
        """
        if field not in self._change_handlers:
            self._change_handlers[field] = []
        self._change_handlers[field].append(handler)

    def check_changes(
        self,
        current_state: dict[str, Any]
    ) -> list[StateChange]:
        """
        检查状态变化。

        Args:
            current_state: 当前状态

        Returns:
            变化列表
        """
        changes = []

        all_keys = set(self._previous_state.keys()) | set(current_state.keys())

        for key in all_keys:
            old_value = self._previous_state.get(key)
            new_value = current_state.get(key)

            if key not in self._previous_state:
                change = StateChange(
                    field=key,
                    change_type=ChangeType.CREATED,
                    new_value=new_value
                )
                changes.append(change)
            elif key not in current_state:
                change = StateChange(
                    field=key,
                    change_type=ChangeType.DELETED,
                    old_value=old_value
                )
                changes.append(change)
            elif old_value != new_value:
                change = StateChange(
                    field=key,
                    change_type=ChangeType.VALUE_CHANGED,
                    old_value=old_value,
                    new_value=new_value
                )
                changes.append(change)

        self._previous_state = current_state.copy()

        for change in changes:
            handlers = self._change_handlers.get(change.field, [])
            for handler in handlers:
                handler(change)

        return changes


watcher = StateWatcher()

watcher.register_handler(
    "temperature",
    lambda change: print(f"温度变化: {change.old_value} -> {change.new_value}")
)

changes = watcher.check_changes({"temperature": 25, "humidity": 60})
changes = watcher.check_changes({"temperature": 28, "humidity": 60})
```

## 动作执行模式

### 同步执行模式

动作在触发时立即同步执行。

```python
from dataclasses import dataclass
from typing import Any, Callable
from enum import Enum


class ExecutionStatus(Enum):
    """执行状态枚举。"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"
    TIMEOUT = "timeout"
    CANCELLED = "cancelled"


@dataclass
class ExecutionResult:
    """
    执行结果。

    Attributes:
        status: 执行状态
        output: 输出数据
        error: 错误信息
        duration_ms: 执行时长（毫秒）
        timestamp: 执行时间
    """
    status: ExecutionStatus
    output: Any = None
    error: str | None = None
    duration_ms: float = 0
    timestamp: datetime = field(default_factory=datetime.now)


class SyncExecutor:
    """同步执行器。"""

    def __init__(self, timeout_ms: int = 30000):
        self.timeout_ms = timeout_ms

    def execute(
        self,
        action: Callable[..., Any],
        *args: Any,
        **kwargs: Any
    ) -> ExecutionResult:
        """
        同步执行动作。

        Args:
            action: 要执行的动作
            *args: 位置参数
            **kwargs: 关键字参数

        Returns:
            执行结果
        """
        import time
        start_time = time.perf_counter()

        try:
            result = action(*args, **kwargs)
            duration_ms = (time.perf_counter() - start_time) * 1000

            return ExecutionResult(
                status=ExecutionStatus.SUCCESS,
                output=result,
                duration_ms=duration_ms
            )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                error=str(e),
                duration_ms=duration_ms
            )


def send_notification(message: str) -> str:
    """发送通知。"""
    return f"已发送: {message}"


executor = SyncExecutor()
result = executor.execute(send_notification, "系统告警")
```

### 异步执行模式

动作异步执行，支持回调。

```python
import asyncio
from dataclasses import dataclass, field
from typing import Any, Callable, Coroutine
from concurrent.futures import ThreadPoolExecutor


@dataclass
class AsyncTask:
    """
    异步任务。

    Attributes:
        task_id: 任务 ID
        action: 执行动作
        args: 位置参数
        kwargs: 关键字参数
        callback: 完成回调
        created_at: 创建时间
    """
    task_id: str
    action: Callable[..., Any] | Coroutine
    args: tuple = field(default_factory=tuple)
    kwargs: dict = field(default_factory=dict)
    callback: Callable[[ExecutionResult], None] | None = None
    created_at: datetime = field(default_factory=datetime.now)


class AsyncExecutor:
    """异步执行器。"""

    def __init__(self, max_workers: int = 10):
        self.max_workers = max_workers
        self._thread_pool = ThreadPoolExecutor(max_workers=max_workers)
        self._running_tasks: dict[str, asyncio.Task] = {}

    async def execute(
        self,
        task: AsyncTask
    ) -> ExecutionResult:
        """
        异步执行任务。

        Args:
            task: 异步任务

        Returns:
            执行结果
        """
        import time
        start_time = time.perf_counter()

        try:
            if asyncio.iscoroutinefunction(task.action):
                result = await task.action(*task.args, **task.kwargs)
            else:
                loop = asyncio.get_event_loop()
                result = await loop.run_in_executor(
                    self._thread_pool,
                    task.action,
                    *task.args
                )

            duration_ms = (time.perf_counter() - start_time) * 1000
            execution_result = ExecutionResult(
                status=ExecutionStatus.SUCCESS,
                output=result,
                duration_ms=duration_ms
            )
        except Exception as e:
            duration_ms = (time.perf_counter() - start_time) * 1000
            execution_result = ExecutionResult(
                status=ExecutionStatus.FAILED,
                error=str(e),
                duration_ms=duration_ms
            )

        if task.callback:
            task.callback(execution_result)

        return execution_result

    async def execute_batch(
        self,
        tasks: list[AsyncTask]
    ) -> list[ExecutionResult]:
        """
        批量执行任务。

        Args:
            tasks: 任务列表

        Returns:
            结果列表
        """
        coroutines = [self.execute(task) for task in tasks]
        return await asyncio.gather(*coroutines, return_exceptions=False)


async def async_fetch_data(url: str) -> str:
    """异步获取数据。"""
    await asyncio.sleep(0.1)
    return f"数据来自 {url}"


async def main():
    executor = AsyncExecutor()
    task = AsyncTask(
        task_id="fetch_1",
        action=async_fetch_data,
        args=("https://api.example.com",),
        callback=lambda r: print(f"回调: {r.status}")
    )
    result = await executor.execute(task)
    print(f"结果: {result.output}")


asyncio.run(main())
```

### 重试执行模式

支持自动重试的执行模式。

```python
from dataclasses import dataclass
from typing import Any, Callable
from enum import Enum
import time


class BackoffStrategy(Enum):
    """退避策略枚举。"""
    FIXED = "fixed"
    LINEAR = "linear"
    EXPONENTIAL = "exponential"


@dataclass
class RetryConfig:
    """
    重试配置。

    Attributes:
        max_retries: 最大重试次数
        initial_delay_ms: 初始延迟毫秒
        max_delay_ms: 最大延迟毫秒
        backoff_strategy: 退避策略
        retryable_exceptions: 可重试的异常类型
    """
    max_retries: int = 3
    initial_delay_ms: int = 1000
    max_delay_ms: int = 60000
    backoff_strategy: BackoffStrategy = BackoffStrategy.EXPONENTIAL
    retryable_exceptions: tuple[type[Exception], ...] = (Exception,)


class RetryExecutor:
    """重试执行器。"""

    def __init__(self, config: RetryConfig):
        self.config = config

    def execute(
        self,
        action: Callable[..., Any],
        *args: Any,
        **kwargs: Any
    ) -> ExecutionResult:
        """
        带重试的执行。

        Args:
            action: 要执行的动作
            *args: 位置参数
            **kwargs: 关键字参数

        Returns:
            执行结果
        """
        last_error: str | None = None
        total_duration_ms = 0.0

        for attempt in range(self.config.max_retries + 1):
            import time
            start_time = time.perf_counter()

            try:
                result = action(*args, **kwargs)
                duration_ms = (time.perf_counter() - start_time) * 1000

                return ExecutionResult(
                    status=ExecutionStatus.SUCCESS,
                    output=result,
                    duration_ms=total_duration_ms + duration_ms
                )
            except self.config.retryable_exceptions as e:
                duration_ms = (time.perf_counter() - start_time) * 1000
                total_duration_ms += duration_ms
                last_error = str(e)

                if attempt < self.config.max_retries:
                    delay_ms = self._calculate_delay(attempt)
                    time.sleep(delay_ms / 1000)
                    total_duration_ms += delay_ms

        return ExecutionResult(
            status=ExecutionStatus.FAILED,
            error=last_error,
            duration_ms=total_duration_ms
        )

    def _calculate_delay(self, attempt: int) -> int:
        """计算重试延迟。"""
        if self.config.backoff_strategy == BackoffStrategy.FIXED:
            delay = self.config.initial_delay_ms
        elif self.config.backoff_strategy == BackoffStrategy.LINEAR:
            delay = self.config.initial_delay_ms * (attempt + 1)
        else:
            delay = self.config.initial_delay_ms * (2 ** attempt)

        return min(delay, self.config.max_delay_ms)


config = RetryConfig(
    max_retries=3,
    initial_delay_ms=1000,
    backoff_strategy=BackoffStrategy.EXPONENTIAL,
    retryable_exceptions=(ConnectionError, TimeoutError)
)

retry_executor = RetryExecutor(config)
```

## 完整示例：自动化触发系统

```python
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Any, Callable
from enum import Enum
import asyncio


class HookStatus(Enum):
    """Hook 状态枚举。"""
    ENABLED = "enabled"
    DISABLED = "disabled"
    PAUSED = "paused"


@dataclass
class HookConfig:
    """
    Hook 完整配置。

    Attributes:
        name: Hook 名称
        trigger_config: 触发器配置
        condition: 触发条件
        action: 执行动作
        retry_config: 重试配置
        status: 当前状态
    """
    name: str
    trigger_config: TimeTriggerConfig | EventTriggerConfig | ConditionTriggerConfig
    condition: ConditionNode | None = None
    action: Callable[..., Any] | None = None
    retry_config: RetryConfig | None = None
    status: HookStatus = HookStatus.ENABLED


class AutoTriggerSystem:
    """自动触发系统。"""

    def __init__(self):
        self.hooks: dict[str, HookConfig] = {}
        self.time_triggers: dict[str, TimeTrigger] = {}
        self.event_triggers: dict[str, EventTrigger] = {}
        self.condition_triggers: dict[str, ConditionTrigger] = {}
        self.sync_executor = SyncExecutor()
        self.retry_executor = RetryExecutor(RetryConfig())

    def register_hook(self, config: HookConfig) -> None:
        """
        注册 Hook。

        Args:
            config: Hook 配置
        """
        self.hooks[config.name] = config

        if isinstance(config.trigger_config, TimeTriggerConfig):
            self.time_triggers[config.name] = TimeTrigger(config.trigger_config)
        elif isinstance(config.trigger_config, EventTriggerConfig):
            self.event_triggers[config.name] = EventTrigger(config.trigger_config)
        elif isinstance(config.trigger_config, ConditionTriggerConfig):
            self.condition_triggers[config.name] = ConditionTrigger(config.trigger_config)

    def check_time_triggers(self) -> list[str]:
        """
        检查时间触发器。

        Returns:
            触发的 Hook 名称列表
        """
        now = datetime.now()
        triggered = []

        for name, trigger in self.time_triggers.items():
            hook = self.hooks.get(name)
            if hook and hook.status == HookStatus.ENABLED:
                if trigger.should_trigger(now):
                    if self._evaluate_condition(hook):
                        triggered.append(name)

        return triggered

    def process_event(self, event: Event) -> list[str]:
        """
        处理事件。

        Args:
            event: 接收的事件

        Returns:
            触发的 Hook 名称列表
        """
        triggered = []

        for name, trigger in self.event_triggers.items():
            hook = self.hooks.get(name)
            if hook and hook.status == HookStatus.ENABLED:
                if trigger.should_trigger(event):
                    if self._evaluate_condition(hook):
                        triggered.append(name)

        return triggered

    def check_conditions(self, state: dict[str, Any]) -> list[str]:
        """
        检查条件触发器。

        Args:
            state: 当前状态

        Returns:
            触发的 Hook 名称列表
        """
        triggered = []

        for name, trigger in self.condition_triggers.items():
            hook = self.hooks.get(name)
            if hook and hook.status == HookStatus.ENABLED:
                if trigger.evaluate(state):
                    triggered.append(name)

        return triggered

    def execute_hook(self, name: str, *args: Any, **kwargs: Any) -> ExecutionResult:
        """
        执行 Hook 动作。

        Args:
            name: Hook 名称
            *args: 位置参数
            **kwargs: 关键字参数

        Returns:
            执行结果
        """
        hook = self.hooks.get(name)
        if not hook or not hook.action:
            return ExecutionResult(
                status=ExecutionStatus.FAILED,
                error=f"Hook '{name}' 不存在或没有配置动作"
            )

        if hook.retry_config:
            executor = RetryExecutor(hook.retry_config)
            return executor.execute(hook.action, *args, **kwargs)

        return self.sync_executor.execute(hook.action, *args, **kwargs)

    def _evaluate_condition(self, hook: HookConfig) -> bool:
        """评估 Hook 条件。"""
        if hook.condition is None:
            return True
        return hook.condition.evaluate({})


system = AutoTriggerSystem()

system.register_hook(HookConfig(
    name="daily_report",
    trigger_config=TimeTriggerConfig(
        trigger_type="cron",
        cron_expression="0 9 * * *"
    ),
    action=lambda: print("生成日报表"),
    status=HookStatus.ENABLED
))

system.register_hook(HookConfig(
    name="file_processor",
    trigger_config=EventTriggerConfig(
        event_types=[EventType.FILE_CREATED],
        payload_filters={"file_type": "csv"}
    ),
    action=lambda f: print(f"处理文件: {f}"),
    retry_config=RetryConfig(max_retries=3),
    status=HookStatus.ENABLED
))
```

## Quick Reference: 触发器类型

| 类型 | 触发条件 | 适用场景 |
|------|----------|----------|
| 时间触发 | 定时/间隔/Cron | 定期任务、报表生成 |
| 事件触发 | 系统事件/用户行为 | 实时响应、日志处理 |
| 条件触发 | 状态变化/阈值检测 | 监控告警、自动扩缩容 |

## Quick Reference: 执行模式

| 模式 | 特点 | 适用场景 |
|------|------|----------|
| 同步执行 | 立即执行，阻塞等待 | 快速操作、需要立即结果 |
| 异步执行 | 非阻塞，支持回调 | I/O 密集、批量处理 |
| 重试执行 | 自动重试，退避策略 | 网络请求、不稳定操作 |

## Anti-Patterns to Avoid

```python
# Bad: 硬编码触发条件
def check_trigger(value):
    if value > 100 and value < 200 and value % 2 == 0:
        return True
    return False

# Good: 可配置的条件
condition = (
    ConditionBuilder()
    .field("value").gt(100)
    .field("value").lt(200)
    .build()
)

# Bad: 无限重试
def execute_with_retry(action):
    while True:
        try:
            return action()
        except Exception:
            continue

# Good: 有限重试 + 退避
config = RetryConfig(
    max_retries=3,
    backoff_strategy=BackoffStrategy.EXPONENTIAL
)

# Bad: 同步阻塞长时间操作
def process_large_file(path):
    with open(path) as f:
        data = f.read()
    return process(data)

# Good: 异步处理
async def process_large_file_async(path):
    async with aiofiles.open(path) as f:
        data = await f.read()
    return await process_async(data)

# Bad: 忽略执行结果
def trigger_action(action):
    try:
        action()
    except Exception:
        pass

# Good: 记录和处理结果
def trigger_action(action):
    result = executor.execute(action)
    if result.status == ExecutionStatus.FAILED:
        logger.error(f"执行失败: {result.error}")
        notify_failure(result)
```

**Remember**: 自动触发系统应该是可配置、可观测、可恢复的。每个触发器应该有明确的职责，条件判断应该清晰可测试，动作执行应该支持重试和错误处理。
