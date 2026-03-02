# 多代理协作模式参考

多代理系统（Multi-Agent System）协作模式、任务分配策略、通信协议和结果聚合最佳实践，用于构建高效、可扩展的分布式智能系统。

## When to Activate

- 设计多代理协作系统
- 实现代理间通信机制
- 构建分布式任务处理系统
- 开发自适应工作流引擎

## Core Principles

### 1. 单一职责原则

每个代理应专注于单一职责，确保系统可维护性和可测试性。

```python
from abc import ABC, abstractmethod
from typing import Any

class BaseAgent(ABC):
    """代理基类，定义统一接口。"""
    
    @property
    @abstractmethod
    def name(self) -> str:
        """返回代理名称。"""
        pass
    
    @property
    @abstractmethod
    def capabilities(self) -> list[str]:
        """返回代理能力列表。"""
        pass
    
    @abstractmethod
    async def execute(self, task: 'Task') -> 'AgentResult':
        """执行分配的任务。"""
        pass


class DataCollectorAgent(BaseAgent):
    """数据采集代理 - 专注于数据收集。"""
    
    @property
    def name(self) -> str:
        return "data_collector"
    
    @property
    def capabilities(self) -> list[str]:
        return ["fetch", "scrape", "read"]
    
    async def execute(self, task: 'Task') -> 'AgentResult':
        data = await self._collect_data(task.params)
        return AgentResult(success=True, data=data)


class DataProcessorAgent(BaseAgent):
    """数据处理代理 - 专注于数据转换。"""
    
    @property
    def name(self) -> str:
        return "data_processor"
    
    @property
    def capabilities(self) -> list[str]:
        return ["transform", "clean", "aggregate"]
    
    async def execute(self, task: 'Task') -> 'AgentResult':
        processed = await self._process_data(task.data)
        return AgentResult(success=True, data=processed)
```

### 2. 显式通信原则

代理间通信必须明确、可追踪，避免隐式依赖。

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional
import uuid


class MessageType(Enum):
    """消息类型枚举。"""
    TASK_ASSIGN = "task_assign"
    TASK_RESULT = "task_result"
    STATUS_QUERY = "status_query"
    STATUS_RESPONSE = "status_response"
    ERROR_REPORT = "error_report"
    HEARTBEAT = "heartbeat"


class MessagePriority(Enum):
    """消息优先级枚举。"""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4


@dataclass
class AgentMessage:
    """
    代理间通信消息格式。
    
    Attributes:
        sender: 发送方代理ID
        receiver: 接收方代理ID（None表示广播）
        message_type: 消息类型
        payload: 消息负载内容
        priority: 消息优先级
        correlation_id: 关联ID，用于请求-响应匹配
        timestamp: 消息时间戳
        metadata: 额外元数据
    """
    sender: str
    receiver: Optional[str]
    message_type: MessageType
    payload: dict[str, Any]
    priority: MessagePriority = MessagePriority.NORMAL
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> dict[str, Any]:
        """转换为字典格式，便于序列化。"""
        return {
            "sender": self.sender,
            "receiver": self.receiver,
            "message_type": self.message_type.value,
            "payload": self.payload,
            "priority": self.priority.value,
            "correlation_id": self.correlation_id,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }
```

### 3. 容错与恢复原则

系统应具备错误检测、隔离和恢复能力。

```python
from enum import Enum
from typing import Callable, Awaitable


class TaskStatus(Enum):
    """任务状态枚举。"""
    PENDING = "pending"
    ASSIGNED = "assigned"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMEOUT = "timeout"
    RETRYING = "retrying"


@dataclass
class AgentResult:
    """
    代理执行结果。
    
    Attributes:
        success: 是否成功
        data: 返回数据
        error: 错误信息
        execution_time: 执行耗时（秒）
        metadata: 额外元数据
    """
    success: bool
    data: Any = None
    error: Optional[str] = None
    execution_time: float = 0.0
    metadata: dict[str, Any] = field(default_factory=dict)


class RetryPolicy:
    """重试策略配置。"""
    
    def __init__(
        self,
        max_retries: int = 3,
        backoff_factor: float = 2.0,
        initial_delay: float = 1.0,
        max_delay: float = 60.0
    ):
        self.max_retries = max_retries
        self.backoff_factor = backoff_factor
        self.initial_delay = initial_delay
        self.max_delay = max_delay
    
    def get_delay(self, attempt: int) -> float:
        """计算第N次重试的延迟时间。"""
        delay = self.initial_delay * (self.backoff_factor ** attempt)
        return min(delay, self.max_delay)


async def execute_with_retry(
    agent: BaseAgent,
    task: 'Task',
    policy: RetryPolicy
) -> AgentResult:
    """带重试策略的任务执行。"""
    last_error = None
    
    for attempt in range(policy.max_retries + 1):
        try:
            result = await agent.execute(task)
            if result.success:
                return result
            last_error = result.error
        except Exception as e:
            last_error = str(e)
        
        if attempt < policy.max_retries:
            delay = policy.get_delay(attempt)
            await asyncio.sleep(delay)
    
    return AgentResult(
        success=False,
        error=f"Max retries exceeded. Last error: {last_error}"
    )
```

## 任务分配策略

### 能力匹配策略

根据代理能力自动匹配任务。

```python
from dataclasses import dataclass
from typing import Optional


@dataclass
class Task:
    """
    任务定义。
    
    Attributes:
        task_id: 任务唯一标识
        task_type: 任务类型
        params: 任务参数
        required_capabilities: 所需能力列表
        priority: 任务优先级
        timeout: 超时时间（秒）
        dependencies: 依赖任务ID列表
    """
    task_id: str
    task_type: str
    params: dict[str, Any]
    required_capabilities: list[str]
    priority: MessagePriority = MessagePriority.NORMAL
    timeout: float = 300.0
    dependencies: list[str] = field(default_factory=list)


class CapabilityMatcher:
    """能力匹配器 - 根据任务需求匹配合适的代理。"""
    
    def __init__(self):
        self._agents: dict[str, BaseAgent] = {}
        self._agent_load: dict[str, int] = {}
    
    def register_agent(self, agent: BaseAgent) -> None:
        """注册代理到匹配器。"""
        self._agents[agent.name] = agent
        self._agent_load[agent.name] = 0
    
    def find_best_agent(self, task: Task) -> Optional[BaseAgent]:
        """
        查找最适合执行任务的代理。
        
        策略：
        1. 能力匹配 - 代理必须具备所有所需能力
        2. 负载均衡 - 选择当前负载最低的代理
        """
        candidates = []
        
        for name, agent in self._agents.items():
            agent_caps = set(agent.capabilities)
            required_caps = set(task.required_capabilities)
            
            if required_caps.issubset(agent_caps):
                candidates.append((name, agent, self._agent_load[name]))
        
        if not candidates:
            return None
        
        candidates.sort(key=lambda x: x[2])
        best_name = candidates[0][0]
        self._agent_load[best_name] += 1
        
        return candidates[0][1]
    
    def release_agent(self, agent_name: str) -> None:
        """释放代理，减少负载计数。"""
        if agent_name in self._agent_load:
            self._agent_load[agent_name] = max(0, self._agent_load[agent_name] - 1)
```

### 优先级队列策略

基于优先级的任务调度。

```python
import asyncio
import heapq
from typing import Priority


class PriorityTaskQueue:
    """优先级任务队列。"""
    
    def __init__(self):
        self._queue: list[tuple[int, int, Task]] = []
        self._counter = 0
        self._lock = asyncio.Lock()
    
    async def put(self, task: Task) -> None:
        """
        将任务加入队列。
        
        优先级数值越大，优先级越高。
        使用计数器保证同优先级任务的FIFO顺序。
        """
        async with self._lock:
            priority_value = task.priority.value
            heapq.heappush(
                self._queue,
                (-priority_value, self._counter, task)
            )
            self._counter += 1
    
    async def get(self) -> Optional[Task]:
        """从队列获取最高优先级任务。"""
        async with self._lock:
            if not self._queue:
                return None
            _, _, task = heapq.heappop(self._queue)
            return task
    
    async def peek(self) -> Optional[Task]:
        """查看队列头部任务但不移除。"""
        async with self._lock:
            if not self._queue:
                return None
            return self._queue[0][2]
    
    @property
    def size(self) -> int:
        """返回队列大小。"""
        return len(self._queue)
```

### 工作窃取策略

实现代理间的负载均衡。

```python
class WorkStealingScheduler:
    """工作窃取调度器。"""
    
    def __init__(self, agent_queues: dict[str, asyncio.Queue]):
        self._queues = agent_queues
        self._steal_threshold = 2
    
    async def get_task(self, agent_name: str) -> Optional[Task]:
        """
        获取任务，支持工作窃取。
        
        1. 首先尝试从自己的队列获取
        2. 如果自己队列为空，尝试从其他代理窃取
        """
        own_queue = self._queues.get(agent_name)
        
        if own_queue and not own_queue.empty():
            return await own_queue.get()
        
        for other_name, queue in self._queues.items():
            if other_name != agent_name and queue.qsize() > self._steal_threshold:
                try:
                    task = queue.get_nowait()
                    return task
                except asyncio.QueueEmpty:
                    continue
        
        return None
    
    async def assign_task(self, task: Task, agent_name: str) -> None:
        """将任务分配给指定代理。"""
        queue = self._queues.get(agent_name)
        if queue:
            await queue.put(task)
```

## 通信协议

### 同步通信模式

请求-响应模式的同步通信。

```python
from concurrent.futures import Future
from typing import Dict


class SyncCommunicationHub:
    """同步通信中心。"""
    
    def __init__(self):
        self._pending_requests: dict[str, Future] = {}
        self._lock = asyncio.Lock()
    
    async def send_and_wait(
        self,
        message: AgentMessage,
        timeout: float = 30.0
    ) -> AgentMessage:
        """
        发送消息并等待响应。
        
        Args:
            message: 要发送的消息
            timeout: 超时时间（秒）
        
        Returns:
            响应消息
        
        Raises:
            asyncio.TimeoutError: 超时未收到响应
        """
        future: Future = asyncio.get_event_loop().create_future()
        
        async with self._lock:
            self._pending_requests[message.correlation_id] = future
        
        try:
            response = await asyncio.wait_for(future, timeout)
            return response
        finally:
            async with self._lock:
                self._pending_requests.pop(message.correlation_id, None)
    
    async def handle_response(self, response: AgentMessage) -> None:
        """处理响应消息，完成对应的Future。"""
        correlation_id = response.metadata.get("in_reply_to")
        
        if correlation_id:
            async with self._lock:
                future = self._pending_requests.get(correlation_id)
                if future and not future.done():
                    future.set_result(response)
```

### 异步通信模式

基于消息队列的异步通信。

```python
from collections import defaultdict
from typing import Callable


class AsyncMessageBus:
    """异步消息总线。"""
    
    def __init__(self):
        self._subscribers: dict[str, list[Callable]] = defaultdict(list)
        self._message_queue: asyncio.Queue = asyncio.Queue()
        self._running = False
    
    def subscribe(
        self,
        message_type: str,
        handler: Callable[[AgentMessage], Awaitable[None]]
    ) -> None:
        """
        订阅特定类型的消息。
        
        Args:
            message_type: 消息类型
            handler: 消息处理函数
        """
        self._subscribers[message_type].append(handler)
    
    async def publish(self, message: AgentMessage) -> None:
        """
        发布消息到总线。
        
        Args:
            message: 要发布的消息
        """
        await self._message_queue.put(message)
    
    async def start(self) -> None:
        """启动消息处理循环。"""
        self._running = True
        while self._running:
            try:
                message = await asyncio.wait_for(
                    self._message_queue.get(),
                    timeout=1.0
                )
                await self._dispatch(message)
            except asyncio.TimeoutError:
                continue
    
    async def stop(self) -> None:
        """停止消息处理。"""
        self._running = False
    
    async def _dispatch(self, message: AgentMessage) -> None:
        """分发消息给订阅者。"""
        handlers = self._subscribers.get(message.message_type.value, [])
        
        tasks = [
            self._safe_call(handler, message)
            for handler in handlers
        ]
        
        if tasks:
            await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _safe_call(
        self,
        handler: Callable,
        message: AgentMessage
    ) -> None:
        """安全调用处理函数，捕获异常。"""
        try:
            await handler(message)
        except Exception as e:
            print(f"Handler error: {e}")
```

### 消息格式规范

```python
@dataclass
class TaskAssignmentPayload:
    """
    任务分配消息负载。
    
    Attributes:
        task: 任务对象
        deadline: 截止时间
        callback_url: 结果回调地址
    """
    task: Task
    deadline: Optional[datetime] = None
    callback_url: Optional[str] = None


@dataclass
class TaskResultPayload:
    """
    任务结果消息负载。
    
    Attributes:
        task_id: 任务ID
        status: 任务状态
        result: 执行结果
        metrics: 执行指标
    """
    task_id: str
    status: TaskStatus
    result: Optional[AgentResult] = None
    metrics: dict[str, float] = field(default_factory=dict)


def create_task_assign_message(
    sender: str,
    receiver: str,
    task: Task,
    priority: MessagePriority = MessagePriority.NORMAL
) -> AgentMessage:
    """创建任务分配消息。"""
    return AgentMessage(
        sender=sender,
        receiver=receiver,
        message_type=MessageType.TASK_ASSIGN,
        payload={"task_id": task.task_id, "task_type": task.task_type},
        priority=priority,
        metadata={"task": task.__dict__}
    )


def create_task_result_message(
    sender: str,
    receiver: str,
    task_id: str,
    result: AgentResult,
    correlation_id: str
) -> AgentMessage:
    """创建任务结果消息。"""
    return AgentMessage(
        sender=sender,
        receiver=receiver,
        message_type=MessageType.TASK_RESULT,
        payload={
            "task_id": task_id,
            "success": result.success,
            "data": result.data
        },
        correlation_id=correlation_id,
        metadata={"in_reply_to": correlation_id}
    )
```

## 结果聚合模式

### Map-Reduce 聚合模式

分布式任务的结果聚合。

```python
from typing import Generic, TypeVar

T = TypeVar('T')
R = TypeVar('R')


class MapReduceAggregator(Generic[T, R]):
    """
    Map-Reduce 结果聚合器。
    
    泛型参数：
        T: 输入数据类型
        R: 输出结果类型
    """
    
    def __init__(
        self,
        map_func: Callable[[T], Awaitable[R]],
        reduce_func: Callable[[list[R]], R]
    ):
        self._map_func = map_func
        self._reduce_func = reduce_func
    
    async def process(
        self,
        items: list[T],
        parallelism: int = 4
    ) -> R:
        """
        并行处理数据项并聚合结果。
        
        Args:
            items: 输入数据项列表
            parallelism: 并行度
        
        Returns:
            聚合后的结果
        """
        semaphore = asyncio.Semaphore(parallelism)
        
        async def limited_map(item: T) -> R:
            async with semaphore:
                return await self._map_func(item)
        
        tasks = [limited_map(item) for item in items]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        successful_results = [
            r for r in results
            if not isinstance(r, Exception)
        ]
        
        return self._reduce_func(successful_results)


async def example_usage():
    """Map-Reduce 使用示例。"""
    
    async def square(x: int) -> int:
        await asyncio.sleep(0.1)
        return x * x
    
    def sum_results(results: list[int]) -> int:
        return sum(results)
    
    aggregator = MapReduceAggregator(
        map_func=square,
        reduce_func=sum_results
    )
    
    numbers = list(range(1, 11))
    result = await aggregator.process(numbers, parallelism=4)
    print(f"Sum of squares: {result}")
```

### 投票聚合模式

多代理共识决策。

```python
from collections import Counter
from enum import Enum


class VotingStrategy(Enum):
    """投票策略枚举。"""
    MAJORITY = "majority"
    UNANIMOUS = "unanimous"
    WEIGHTED = "weighted"
    PLURALITY = "plurality"


@dataclass
class Vote:
    """
    投票记录。
    
    Attributes:
        voter_id: 投票者ID
        choice: 投票选择
        weight: 投票权重
        confidence: 置信度（0-1）
    """
    voter_id: str
    choice: Any
    weight: float = 1.0
    confidence: float = 1.0


class VotingAggregator:
    """投票聚合器。"""
    
    def __init__(self, strategy: VotingStrategy = VotingStrategy.MAJORITY):
        self._strategy = strategy
    
    def aggregate(self, votes: list[Vote]) -> tuple[Any, float]:
        """
        聚合投票结果。
        
        Args:
            votes: 投票列表
        
        Returns:
            元组（获胜选择，支持率）
        """
        if not votes:
            return None, 0.0
        
        if self._strategy == VotingStrategy.MAJORITY:
            return self._majority_vote(votes)
        elif self._strategy == VotingStrategy.UNANIMOUS:
            return self._unanimous_vote(votes)
        elif self._strategy == VotingStrategy.WEIGHTED:
            return self._weighted_vote(votes)
        else:
            return self._plurality_vote(votes)
    
    def _majority_vote(self, votes: list[Vote]) -> tuple[Any, float]:
        """多数决投票。"""
        counter = Counter(v.choice for v in votes)
        winner, count = counter.most_common(1)[0]
        support = count / len(votes)
        
        if support > 0.5:
            return winner, support
        return None, support
    
    def _unanimous_vote(self, votes: list[Vote]) -> tuple[Any, float]:
        """一致同意投票。"""
        choices = set(v.choice for v in votes)
        
        if len(choices) == 1:
            return choices.pop(), 1.0
        return None, 0.0
    
    def _weighted_vote(self, votes: list[Vote]) -> tuple[Any, float]:
        """加权投票。"""
        weighted_scores: dict[Any, float] = {}
        total_weight = 0.0
        
        for vote in votes:
            weighted_scores[vote.choice] = weighted_scores.get(
                vote.choice, 0.0
            ) + vote.weight * vote.confidence
            total_weight += vote.weight
        
        winner = max(weighted_scores, key=weighted_scores.get)
        support = weighted_scores[winner] / total_weight
        
        return winner, support
    
    def _plurality_vote(self, votes: list[Vote]) -> tuple[Any, float]:
        """相对多数投票。"""
        counter = Counter(v.choice for v in votes)
        winner, count = counter.most_common(1)[0]
        support = count / len(votes)
        
        return winner, support
```

### 流式聚合模式

实时流数据处理与聚合。

```python
from typing import AsyncIterator


class StreamAggregator:
    """流式聚合器。"""
    
    def __init__(
        self,
        window_size: int = 100,
        aggregation_func: Callable[[list[Any]], Any] = None
    ):
        self._window_size = window_size
        self._aggregation_func = aggregation_func or self._default_aggregate
        self._buffer: list[Any] = []
    
    async def add(self, item: Any) -> Optional[Any]:
        """
        添加数据项到缓冲区。
        
        当缓冲区满时触发聚合。
        
        Args:
            item: 数据项
        
        Returns:
            聚合结果（缓冲区未满时返回None）
        """
        self._buffer.append(item)
        
        if len(self._buffer) >= self._window_size:
            result = self._aggregation_func(self._buffer)
            self._buffer.clear()
            return result
        
        return None
    
    async def process_stream(
        self,
        stream: AsyncIterator[Any]
    ) -> AsyncIterator[Any]:
        """
        处理数据流并产生聚合结果。
        
        Args:
            stream: 异步数据流
        
        Yields:
            聚合结果
        """
        async for item in stream:
            result = await self.add(item)
            if result is not None:
                yield result
        
        if self._buffer:
            yield self._aggregation_func(self._buffer)
    
    @staticmethod
    def _default_aggregate(items: list[Any]) -> dict[str, Any]:
        """默认聚合函数。"""
        return {
            "count": len(items),
            "first": items[0] if items else None,
            "last": items[-1] if items else None
        }
```

## 协作流程图

### 基本协作流程

```
┌─────────────────────────────────────────────────────────────────┐
│                      多代理协作系统架构                            │
└─────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │   客户端请求   │
                              └──────┬───────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      任务调度器        │
                         │  (Task Scheduler)     │
                         └───────────┬───────────┘
                                     │
              ┌──────────────────────┼──────────────────────┐
              │                      │                      │
              ▼                      ▼                      ▼
     ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
     │   代理 A        │   │   代理 B        │   │   代理 C        │
     │  (Collector)    │   │  (Processor)    │   │  (Aggregator)   │
     └────────┬────────┘   └────────┬────────┘   └────────┬────────┘
              │                      │                      │
              │     ┌────────────────┴────────────────┐     │
              │     │         消息总线                 │     │
              └────►│    (Message Bus / Queue)        │◄────┘
                    └────────────────┬────────────────┘
                                     │
                                     ▼
                         ┌───────────────────────┐
                         │      结果聚合器        │
                         │  (Result Aggregator)  │
                         └───────────┬───────────┘
                                     │
                                     ▼
                              ┌──────────────┐
                              │   返回结果    │
                              └──────────────┘
```

### 任务分配流程

```
┌─────────────────────────────────────────────────────────────────┐
│                        任务分配流程                               │
└─────────────────────────────────────────────────────────────────┘

  ┌─────────┐     ┌─────────────┐     ┌─────────────────┐
  │ 新任务  │────►│ 能力匹配器  │────►│ 选择最佳代理    │
  └─────────┘     └─────────────┘     └────────┬────────┘
                                               │
                    ┌──────────────────────────┴───────────────────────┐
                    │                                                  │
                    ▼                                                  ▼
           ┌─────────────────┐                              ┌─────────────────┐
           │ 代理可用        │                              │ 代理不可用      │
           │ 发送任务分配    │                              │ 加入等待队列    │
           └────────┬────────┘                              └─────────────────┘
                    │
                    ▼
           ┌─────────────────┐
           │ 代理确认接收    │
           └────────┬────────┘
                    │
         ┌──────────┴──────────┐
         │                     │
         ▼                     ▼
  ┌─────────────┐      ┌─────────────┐
  │ 执行成功    │      │ 执行失败    │
  └──────┬──────┘      └──────┬──────┘
         │                    │
         ▼                    ▼
  ┌─────────────┐      ┌─────────────┐
  │ 返回结果    │      │ 重试/重分配 │
  └─────────────┘      └─────────────┘
```

### 通信协议流程

```
┌─────────────────────────────────────────────────────────────────┐
│                     同步通信协议流程                              │
└─────────────────────────────────────────────────────────────────┘

  代理 A                                    代理 B
    │                                         │
    │  1. 发送请求 (correlation_id: xxx)      │
    │────────────────────────────────────────►│
    │                                         │
    │  2. 等待响应 (Future pending)           │
    │                        ┌────────────────┤
    │                        │ 处理请求       │
    │                        │ 执行任务       │
    │                        │ 生成结果       │
    │                        └────────────────┤
    │                                         │
    │  3. 返回响应 (in_reply_to: xxx)         │
    │◄────────────────────────────────────────│
    │                                         │
    │  4. Future 完成                         │
    │                                         │


┌─────────────────────────────────────────────────────────────────┐
│                     异步通信协议流程                              │
└─────────────────────────────────────────────────────────────────┘

  代理 A              消息总线               代理 B
    │                    │                     │
    │  1. 发布消息       │                     │
    │───────────────────►│                     │
    │                    │  2. 分发给订阅者    │
    │                    │────────────────────►│
    │                    │                     │
    │                    │        ┌────────────┤
    │                    │        │ 异步处理   │
    │                    │        └────────────┤
    │                    │                     │
    │                    │  3. 发布结果        │
    │                    │◄────────────────────│
    │  4. 接收结果       │                     │
    │◄───────────────────│                     │
    │                    │                     │
```

## 完整示例：多代理协作系统

```python
import asyncio
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional, Callable, Awaitable
import uuid


class MultiAgentOrchestrator:
    """
    多代理协作编排器。
    
    负责协调多个代理之间的任务分配、通信和结果聚合。
    """
    
    def __init__(
        self,
        max_concurrent_tasks: int = 10,
        default_timeout: float = 300.0
    ):
        self._agents: dict[str, BaseAgent] = {}
        self._matcher = CapabilityMatcher()
        self._message_bus = AsyncMessageBus()
        self._task_queue = PriorityTaskQueue()
        self._result_aggregator = VotingAggregator(VotingStrategy.WEIGHTED)
        self._max_concurrent = max_concurrent_tasks
        self._default_timeout = default_timeout
        self._running = False
    
    def register_agent(self, agent: BaseAgent) -> None:
        """注册代理到编排器。"""
        self._agents[agent.name] = agent
        self._matcher.register_agent(agent)
        
        self._message_bus.subscribe(
            MessageType.TASK_RESULT.value,
            self._handle_task_result
        )
    
    async def submit_task(self, task: Task) -> str:
        """
        提交任务到编排器。
        
        Args:
            task: 任务对象
        
        Returns:
            任务ID
        """
        await self._task_queue.put(task)
        return task.task_id
    
    async def start(self) -> None:
        """启动编排器。"""
        self._running = True
        
        await asyncio.gather(
            self._message_bus.start(),
            self._process_tasks()
        )
    
    async def stop(self) -> None:
        """停止编排器。"""
        self._running = False
        await self._message_bus.stop()
    
    async def _process_tasks(self) -> None:
        """处理任务队列。"""
        semaphore = asyncio.Semaphore(self._max_concurrent)
        
        while self._running:
            task = await self._task_queue.get()
            
            if task:
                async with semaphore:
                    asyncio.create_task(self._execute_task(task))
    
    async def _execute_task(self, task: Task) -> None:
        """执行单个任务。"""
        agent = self._matcher.find_best_agent(task)
        
        if not agent:
            await self._handle_no_agent(task)
            return
        
        message = create_task_assign_message(
            sender="orchestrator",
            receiver=agent.name,
            task=task
        )
        
        await self._message_bus.publish(message)
        
        try:
            result = await asyncio.wait_for(
                agent.execute(task),
                timeout=task.timeout
            )
            
            result_message = create_task_result_message(
                sender=agent.name,
                receiver="orchestrator",
                task_id=task.task_id,
                result=result,
                correlation_id=message.correlation_id
            )
            
            await self._message_bus.publish(result_message)
            
        except asyncio.TimeoutError:
            await self._handle_timeout(task, agent.name)
        
        finally:
            self._matcher.release_agent(agent.name)
    
    async def _handle_task_result(self, message: AgentMessage) -> None:
        """处理任务结果消息。"""
        task_id = message.payload.get("task_id")
        success = message.payload.get("success")
        
        print(f"Task {task_id} completed: {'success' if success else 'failed'}")
    
    async def _handle_no_agent(self, task: Task) -> None:
        """处理无可用代理的情况。"""
        print(f"No available agent for task {task.task_id}")
    
    async def _handle_timeout(self, task: Task, agent_name: str) -> None:
        """处理任务超时。"""
        print(f"Task {task.task_id} timed out on agent {agent_name}")


async def main():
    """主函数示例。"""
    
    orchestrator = MultiAgentOrchestrator()
    
    orchestrator.register_agent(DataCollectorAgent())
    orchestrator.register_agent(DataProcessorAgent())
    
    task = Task(
        task_id=str(uuid.uuid4()),
        task_type="data_collection",
        params={"source": "api"},
        required_capabilities=["fetch"]
    )
    
    await orchestrator.submit_task(task)
    
    await orchestrator.start()


if __name__ == "__main__":
    asyncio.run(main())
```

## Quick Reference: 多代理协作模式

| 模式 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| 能力匹配 | 异构代理系统 | 自动匹配、灵活 | 需要维护能力注册 |
| 优先级队列 | 任务优先级差异大 | 重要任务优先处理 | 可能导致低优先级饥饿 |
| 工作窃取 | 负载不均衡 | 自动负载均衡 | 实现复杂度高 |
| 同步通信 | 需要即时响应 | 简单直接 | 阻塞等待 |
| 异步通信 | 高吞吐量场景 | 非阻塞、可扩展 | 需要处理消息顺序 |
| Map-Reduce | 大规模数据处理 | 并行高效 | 需要可分割任务 |
| 投票聚合 | 需要共识决策 | 容错性强 | 通信开销大 |
| 流式聚合 | 实时数据处理 | 低延迟 | 需要窗口管理 |

## Anti-Patterns to Avoid

```python
# Bad: 紧耦合的代理设计
class BadAgent:
    def __init__(self):
        self.other_agent = SpecificAgent()
    
    def execute(self, task):
        return self.other_agent.do_something()

# Good: 松耦合，通过接口通信
class GoodAgent(BaseAgent):
    def __init__(self, message_bus: AsyncMessageBus):
        self._message_bus = message_bus
    
    async def execute(self, task: Task) -> AgentResult:
        await self._message_bus.publish(message)
        return result


# Bad: 同步阻塞等待多个代理
def collect_results(agents):
    results = []
    for agent in agents:
        results.append(agent.execute_sync())
    return results

# Good: 异步并发执行
async def collect_results(agents):
    tasks = [agent.execute(task) for agent in agents]
    results = await asyncio.gather(*tasks)
    return results


# Bad: 忽略错误处理
async def process(task):
    result = await agent.execute(task)
    return result.data

# Good: 完善的错误处理
async def process(task):
    try:
        result = await agent.execute(task)
        if not result.success:
            raise ProcessingError(result.error)
        return result.data
    except asyncio.TimeoutError:
        raise ProcessingError("Task timed out")
    except Exception as e:
        raise ProcessingError(f"Unexpected error: {e}")


# Bad: 硬编码代理配置
def get_agent(task_type):
    if task_type == "collect":
        return DataCollectorAgent("host1", 8080)
    elif task_type == "process":
        return DataProcessorAgent("host2", 8081)

# Good: 配置驱动的代理发现
class AgentRegistry:
    def __init__(self, config: dict):
        self._config = config
    
    async def discover(self, capability: str) -> list[AgentInfo]:
        return await self._query_registry(capability)
```

**Remember**: 多代理系统的核心是解耦、异步和容错。每个代理应该独立、自治，通过明确的协议通信，系统整体应该能够优雅地处理部分失败。
