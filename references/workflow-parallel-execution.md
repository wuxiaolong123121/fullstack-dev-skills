# 工作流并行执行模式参考

并行执行模式的核心内容、任务拆分策略、调度机制与结果合并策略，用于构建高效、可扩展的并行处理系统。

## When to Activate

- 需要并行处理大量独立任务
- 优化 I/O 密集型或 CPU 密集型操作
- 构建高性能数据处理流水线
- 实现任务调度与结果聚合

## Core Principles

### 1. 任务独立性原则

并行任务之间应尽量保持独立，避免共享状态和竞争条件。

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class Task:
    """
    独立任务单元。
    
    Attributes:
        task_id: 任务唯一标识
        payload: 任务负载数据
        metadata: 任务元数据
    """
    task_id: str
    payload: Any
    metadata: dict[str, Any] | None = None


def validate_task_independence(tasks: list[Task]) -> bool:
    """
    验证任务集合是否满足独立性要求。
    
    Args:
        tasks: 待验证的任务列表
        
    Returns:
        任务是否相互独立
    """
    task_ids = [t.task_id for t in tasks]
    return len(task_ids) == len(set(task_ids))
```

### 2. 粒度适中原则

任务粒度过细会增加调度开销，过粗会降低并行效率。

```python
import math
from typing import Generator

def chunk_tasks(
    items: list[Any],
    chunk_size: int | None = None,
    max_workers: int = 4
) -> Generator[list[Any], None, None]:
    """
    将任务列表分割为适中的处理块。
    
    Args:
        items: 原始任务项列表
        chunk_size: 每块大小，None 则自动计算
        max_workers: 最大工作线程/进程数
        
    Yields:
        分割后的任务块
    """
    if chunk_size is None:
        optimal_chunk_size = max(1, math.ceil(len(items) / (max_workers * 4)))
    else:
        optimal_chunk_size = chunk_size
    
    for i in range(0, len(items), optimal_chunk_size):
        yield items[i:i + optimal_chunk_size]
```

### 3. 错误隔离原则

单个任务失败不应影响其他任务的执行。

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Any

class TaskStatus(Enum):
    """任务执行状态枚举。"""
    PENDING = "pending"
    RUNNING = "running"
    SUCCESS = "success"
    FAILED = "failed"


@dataclass
class TaskResult:
    """
    任务执行结果封装。
    
    Attributes:
        task_id: 关联的任务标识
        status: 执行状态
        data: 成功时的结果数据
        error: 失败时的错误信息
    """
    task_id: str
    status: TaskStatus
    data: Any = None
    error: str | None = None


def safe_execute(
    task: Task,
    handler: callable
) -> TaskResult:
    """
    安全执行单个任务，捕获所有异常。
    
    Args:
        task: 待执行的任务
        handler: 任务处理函数
        
    Returns:
        封装后的执行结果
    """
    try:
        result = handler(task.payload)
        return TaskResult(
            task_id=task.task_id,
            status=TaskStatus.SUCCESS,
            data=result
        )
    except Exception as e:
        return TaskResult(
            task_id=task.task_id,
            status=TaskStatus.FAILED,
            error=str(e)
        )
```

## 任务拆分策略

### 按数据分片拆分

适用于处理大量数据记录的场景。

```python
from typing import TypeVar, Generic, Iterable

T = TypeVar('T')
R = TypeVar('R')


class DataShardingStrategy(Generic[T]):
    """
    数据分片拆分策略。
    
    将大数据集按分片键拆分为多个独立子集。
    """
    
    def __init__(self, shard_key: callable[[T], str] | None = None):
        """
        初始化分片策略。
        
        Args:
            shard_key: 分片键提取函数
        """
        self.shard_key = shard_key or (lambda x: str(hash(x) % 10))
    
    def shard(
        self,
        data: Iterable[T],
        num_shards: int
    ) -> dict[str, list[T]]:
        """
        将数据分片为多个子集。
        
        Args:
            data: 原始数据迭代器
            num_shards: 分片数量
            
        Returns:
            分片键到数据子集的映射
        """
        shards: dict[str, list[T]] = {
            str(i): [] for i in range(num_shards)
        }
        
        for item in data:
            key = self.shard_key(item)
            if key in shards:
                shards[key].append(item)
            else:
                shard_idx = int(key) % num_shards
                shards[str(shard_idx)].append(item)
        
        return shards


def shard_by_range(
    data: list[int],
    num_shards: int
) -> dict[str, list[int]]:
    """
    按数值范围分片。
    
    Args:
        data: 数值列表
        num_shards: 分片数量
        
    Returns:
        范围分片结果
    """
    if not data:
        return {str(i): [] for i in range(num_shards)}
    
    min_val = min(data)
    max_val = max(data)
    range_size = (max_val - min_val + 1) / num_shards
    
    shards: dict[str, list[int]] = {str(i): [] for i in range(num_shards)}
    
    for value in data:
        shard_idx = min(
            int((value - min_val) / range_size),
            num_shards - 1
        )
        shards[str(shard_idx)].append(value)
    
    return shards
```

### 按功能模块拆分

适用于多阶段处理流水线。

```python
from dataclasses import dataclass
from typing import Callable, Any
from enum import Enum

class Stage(Enum):
    """流水线阶段枚举。"""
    EXTRACT = "extract"
    TRANSFORM = "transform"
    LOAD = "load"


@dataclass
class PipelineStage:
    """
    流水线阶段定义。
    
    Attributes:
        name: 阶段名称
        processor: 处理函数
        dependencies: 依赖的前置阶段
    """
    name: str
    processor: Callable[[Any], Any]
    dependencies: list[str] | None = None


class PipelineSplitter:
    """
    流水线任务拆分器。
    
    将复杂任务拆分为可并行执行的阶段。
    """
    
    def __init__(self):
        """初始化拆分器。"""
        self.stages: dict[str, PipelineStage] = {}
        self.execution_order: list[str] = []
    
    def add_stage(self, stage: PipelineStage) -> None:
        """
        添加处理阶段。
        
        Args:
            stage: 流水线阶段定义
        """
        self.stages[stage.name] = stage
        self._compute_execution_order()
    
    def _compute_execution_order(self) -> None:
        """计算拓扑排序的执行顺序。"""
        visited = set()
        order = []
        
        def visit(name: str) -> None:
            if name in visited:
                return
            visited.add(name)
            stage = self.stages.get(name)
            if stage and stage.dependencies:
                for dep in stage.dependencies:
                    visit(dep)
            order.append(name)
        
        for name in self.stages:
            visit(name)
        
        self.execution_order = order
    
    def get_parallel_groups(self) -> list[list[str]]:
        """
        获取可并行执行的阶段组。
        
        Returns:
            按依赖层级分组的阶段列表
        """
        levels: dict[str, int] = {}
        
        def get_level(name: str) -> int:
            if name in levels:
                return levels[name]
            
            stage = self.stages.get(name)
            if not stage or not stage.dependencies:
                levels[name] = 0
                return 0
            
            max_dep_level = max(get_level(dep) for dep in stage.dependencies)
            levels[name] = max_dep_level + 1
            return levels[name]
        
        for name in self.stages:
            get_level(name)
        
        max_level = max(levels.values()) if levels else 0
        groups: list[list[str]] = [[] for _ in range(max_level + 1)]
        
        for name, level in levels.items():
            groups[level].append(name)
        
        return groups
```

### 按优先级拆分

适用于任务优先级差异明显的场景。

```python
from dataclasses import dataclass, field
from queue import PriorityQueue
from typing import Any
import time

@dataclass(order=True)
class PrioritizedTask:
    """
    优先级任务封装。
    
    Attributes:
        priority: 优先级（数值越小优先级越高）
        task: 原始任务
        created_at: 创建时间戳
    """
    priority: int
    task: Task = field(compare=False)
    created_at: float = field(default_factory=time.time, compare=True)


class PriorityTaskSplitter:
    """
    优先级任务拆分器。
    
    按优先级将任务分配到不同队列。
    """
    
    def __init__(self, num_levels: int = 3):
        """
        初始化拆分器。
        
        Args:
            num_levels: 优先级级别数量
        """
        self.num_levels = num_levels
        self.queues: list[list[Task]] = [[] for _ in range(num_levels)]
    
    def add_task(self, task: Task, priority: int) -> None:
        """
        添加任务到对应优先级队列。
        
        Args:
            task: 待添加的任务
            priority: 优先级（0 最高）
        """
        level = min(priority, self.num_levels - 1)
        self.queues[level].append(task)
    
    def get_batches_by_priority(
        self,
        batch_size: int
    ) -> list[tuple[int, list[Task]]]:
        """
        按优先级获取批次任务。
        
        Args:
            batch_size: 每批次大小
            
        Returns:
            优先级级别与任务批次的元组列表
        """
        batches = []
        
        for level, queue in enumerate(self.queues):
            while queue:
                batch = queue[:batch_size]
                queue[:batch_size] = []
                if batch:
                    batches.append((level, batch))
        
        return batches
    
    def get_statistics(self) -> dict[str, Any]:
        """
        获取队列统计信息。
        
        Returns:
            各优先级队列的任务数量统计
        """
        return {
            f"level_{i}": len(q)
            for i, q in enumerate(self.queues)
        }
```

## 并行调度机制

### asyncio 协程调度

适用于 I/O 密集型任务的异步调度。

```python
import asyncio
from dataclasses import dataclass
from typing import Any, Callable, TypeVar

T = TypeVar('T')
R = TypeVar('R')


@dataclass
class AsyncSchedulerConfig:
    """
    异步调度器配置。
    
    Attributes:
        max_concurrency: 最大并发数
        timeout: 单任务超时时间（秒）
        retry_count: 失败重试次数
    """
    max_concurrency: int = 10
    timeout: float = 30.0
    retry_count: int = 0


class AsyncParallelScheduler:
    """
    基于 asyncio 的并行调度器。
    
    适用于 I/O 密集型任务的异步并发执行。
    """
    
    def __init__(self, config: AsyncSchedulerConfig | None = None):
        """
        初始化调度器。
        
        Args:
            config: 调度器配置
        """
        self.config = config or AsyncSchedulerConfig()
        self._semaphore: asyncio.Semaphore | None = None
    
    async def execute_single(
        self,
        task: Task,
        handler: Callable[[Any], asyncio.coroutine]
    ) -> TaskResult:
        """
        执行单个异步任务。
        
        Args:
            task: 待执行任务
            handler: 异步处理函数
            
        Returns:
            任务执行结果
        """
        async with self._semaphore:
            for attempt in range(self.config.retry_count + 1):
                try:
                    result = await asyncio.wait_for(
                        handler(task.payload),
                        timeout=self.config.timeout
                    )
                    return TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.SUCCESS,
                        data=result
                    )
                except asyncio.TimeoutError:
                    if attempt == self.config.retry_count:
                        return TaskResult(
                            task_id=task.task_id,
                            status=TaskStatus.FAILED,
                            error="Task timeout"
                        )
                except Exception as e:
                    if attempt == self.config.retry_count:
                        return TaskResult(
                            task_id=task.task_id,
                            status=TaskStatus.FAILED,
                            error=str(e)
                        )
        
        return TaskResult(
            task_id=task.task_id,
            status=TaskStatus.FAILED,
            error="Unknown error"
        )
    
    async def execute_batch(
        self,
        tasks: list[Task],
        handler: Callable[[Any], asyncio.coroutine]
    ) -> list[TaskResult]:
        """
        并发执行一批任务。
        
        Args:
            tasks: 任务列表
            handler: 异步处理函数
            
        Returns:
            所有任务的执行结果列表
        """
        self._semaphore = asyncio.Semaphore(self.config.max_concurrency)
        
        coroutines = [
            self.execute_single(task, handler)
            for task in tasks
        ]
        
        results = await asyncio.gather(*coroutines)
        return list(results)
    
    async def execute_with_callback(
        self,
        tasks: list[Task],
        handler: Callable[[Any], asyncio.coroutine],
        on_complete: Callable[[TaskResult], None] | None = None
    ) -> list[TaskResult]:
        """
        执行任务并在完成时调用回调。
        
        Args:
            tasks: 任务列表
            handler: 异步处理函数
            on_complete: 完成回调函数
            
        Returns:
            所有任务的执行结果列表
        """
        self._semaphore = asyncio.Semaphore(self.config.max_concurrency)
        
        async def execute_with_cb(task: Task) -> TaskResult:
            result = await self.execute_single(task, handler)
            if on_complete:
                on_complete(result)
            return result
        
        coroutines = [execute_with_cb(task) for task in tasks]
        results = await asyncio.gather(*coroutines)
        return list(results)


async def async_fetch_example(url: str) -> dict:
    """
    异步获取示例函数。
    
    Args:
        url: 请求地址
        
    Returns:
        响应数据
    """
    await asyncio.sleep(0.1)
    return {"url": url, "status": "success"}


async def run_async_scheduler_example():
    """
    运行异步调度器示例。
    """
    config = AsyncSchedulerConfig(
        max_concurrency=5,
        timeout=10.0
    )
    scheduler = AsyncParallelScheduler(config)
    
    tasks = [
        Task(task_id=f"task_{i}", payload=f"https://api.example.com/{i}")
        for i in range(20)
    ]
    
    results = await scheduler.execute_batch(tasks, async_fetch_example)
    
    success_count = sum(1 for r in results if r.status == TaskStatus.SUCCESS)
    print(f"完成 {success_count}/{len(tasks)} 个任务")
```

### concurrent.futures 线程/进程调度

适用于混合型任务的调度。

```python
import concurrent.futures
from dataclasses import dataclass
from typing import Any, Callable, Generator
from enum import Enum
import time


class ExecutorType(Enum):
    """执行器类型枚举。"""
    THREAD = "thread"
    PROCESS = "process"


@dataclass
class FuturesSchedulerConfig:
    """
    Futures 调度器配置。
    
    Attributes:
        max_workers: 最大工作线程/进程数
        executor_type: 执行器类型
        timeout: 整体超时时间（秒）
    """
    max_workers: int = 4
    executor_type: ExecutorType = ExecutorType.THREAD
    timeout: float = 60.0


class FuturesParallelScheduler:
    """
    基于 concurrent.futures 的并行调度器。
    
    支持线程池和进程池两种执行模式。
    """
    
    def __init__(self, config: FuturesSchedulerConfig | None = None):
        """
        初始化调度器。
        
        Args:
            config: 调度器配置
        """
        self.config = config or FuturesSchedulerConfig()
    
    def _get_executor(self) -> concurrent.futures.Executor:
        """
        获取执行器实例。
        
        Returns:
            线程池或进程池执行器
        """
        if self.config.executor_type == ExecutorType.PROCESS:
            return concurrent.futures.ProcessPoolExecutor(
                max_workers=self.config.max_workers
            )
        return concurrent.futures.ThreadPoolExecutor(
            max_workers=self.config.max_workers
        )
    
    def execute_batch(
        self,
        tasks: list[Task],
        handler: Callable[[Any], Any]
    ) -> list[TaskResult]:
        """
        并行执行一批任务。
        
        Args:
            tasks: 任务列表
            handler: 同步处理函数
            
        Returns:
            所有任务的执行结果列表
        """
        results = []
        
        with self._get_executor() as executor:
            future_to_task = {
                executor.submit(handler, task.payload): task
                for task in tasks
            }
            
            for future in concurrent.futures.as_completed(
                future_to_task,
                timeout=self.config.timeout
            ):
                task = future_to_task[future]
                try:
                    result = future.result()
                    results.append(TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.SUCCESS,
                        data=result
                    ))
                except Exception as e:
                    results.append(TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.FAILED,
                        error=str(e)
                    ))
        
        return results
    
    def execute_streaming(
        self,
        tasks: list[Task],
        handler: Callable[[Any], Any]
    ) -> Generator[TaskResult, None, None]:
        """
        流式执行任务，逐个返回结果。
        
        Args:
            tasks: 任务列表
            handler: 同步处理函数
            
        Yields:
            任务执行结果
        """
        with self._get_executor() as executor:
            future_to_task = {
                executor.submit(handler, task.payload): task
                for task in tasks
            }
            
            for future in concurrent.futures.as_completed(future_to_task):
                task = future_to_task[future]
                try:
                    result = future.result()
                    yield TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.SUCCESS,
                        data=result
                    )
                except Exception as e:
                    yield TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.FAILED,
                        error=str(e)
                    )
    
    def execute_with_progress(
        self,
        tasks: list[Task],
        handler: Callable[[Any], Any],
        progress_callback: Callable[[int, int], None] | None = None
    ) -> list[TaskResult]:
        """
        执行任务并报告进度。
        
        Args:
            tasks: 任务列表
            handler: 同步处理函数
            progress_callback: 进度回调函数（已完成数，总数）
            
        Returns:
            所有任务的执行结果列表
        """
        results = []
        completed = 0
        total = len(tasks)
        
        with self._get_executor() as executor:
            future_to_task = {
                executor.submit(handler, task.payload): task
                for task in tasks
            }
            
            for future in concurrent.futures.as_completed(future_to_task):
                task = future_to_task[future]
                try:
                    result = future.result()
                    results.append(TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.SUCCESS,
                        data=result
                    ))
                except Exception as e:
                    results.append(TaskResult(
                        task_id=task.task_id,
                        status=TaskStatus.FAILED,
                        error=str(e)
                    ))
                
                completed += 1
                if progress_callback:
                    progress_callback(completed, total)
        
        return results


def cpu_intensive_handler(data: list[int]) -> int:
    """
    CPU 密集型处理示例。
    
    Args:
        data: 整数列表
        
    Returns:
        计算结果
    """
    return sum(x ** 2 for x in data)


def run_futures_scheduler_example():
    """
    运行 Futures 调度器示例。
    """
    config = FuturesSchedulerConfig(
        max_workers=4,
        executor_type=ExecutorType.PROCESS
    )
    scheduler = FuturesParallelScheduler(config)
    
    tasks = [
        Task(task_id=f"cpu_task_{i}", payload=list(range(i * 1000)))
        for i in range(16)
    ]
    
    def on_progress(completed: int, total: int) -> None:
        print(f"进度: {completed}/{total}")
    
    results = scheduler.execute_with_progress(
        tasks,
        cpu_intensive_handler,
        on_progress
    )
    
    success_count = sum(1 for r in results if r.status == TaskStatus.SUCCESS)
    print(f"完成 {success_count}/{len(tasks)} 个任务")
```

### 混合调度策略

根据任务特性自动选择调度方式。

```python
from dataclasses import dataclass
from typing import Any, Callable
import asyncio


@dataclass
class HybridSchedulerConfig:
    """
    混合调度器配置。
    
    Attributes:
        io_max_concurrency: I/O 任务最大并发数
        cpu_max_workers: CPU 任务最大工作进程数
        io_timeout: I/O 任务超时时间
    """
    io_max_concurrency: int = 20
    cpu_max_workers: int = 4
    io_timeout: float = 30.0


class HybridParallelScheduler:
    """
    混合并行调度器。
    
    根据任务类型自动选择异步或进程池执行。
    """
    
    def __init__(self, config: HybridSchedulerConfig | None = None):
        """
        初始化调度器。
        
        Args:
            config: 调度器配置
        """
        self.config = config or HybridSchedulerConfig()
        self._async_scheduler = AsyncParallelScheduler(
            AsyncSchedulerConfig(
                max_concurrency=self.config.io_max_concurrency,
                timeout=self.config.io_timeout
            )
        )
        self._futures_scheduler = FuturesParallelScheduler(
            FuturesSchedulerConfig(
                max_workers=self.config.cpu_max_workers,
                executor_type=ExecutorType.PROCESS
            )
        )
    
    async def execute_io_tasks(
        self,
        tasks: list[Task],
        handler: Callable[[Any], asyncio.coroutine]
    ) -> list[TaskResult]:
        """
        执行 I/O 密集型任务。
        
        Args:
            tasks: 任务列表
            handler: 异步处理函数
            
        Returns:
            执行结果列表
        """
        return await self._async_scheduler.execute_batch(tasks, handler)
    
    def execute_cpu_tasks(
        self,
        tasks: list[Task],
        handler: Callable[[Any], Any]
    ) -> list[TaskResult]:
        """
        执行 CPU 密集型任务。
        
        Args:
            tasks: 任务列表
            handler: 同步处理函数
            
        Returns:
            执行结果列表
        """
        return self._futures_scheduler.execute_batch(tasks, handler)
    
    async def execute_mixed(
        self,
        io_tasks: list[Task],
        io_handler: Callable[[Any], asyncio.coroutine],
        cpu_tasks: list[Task],
        cpu_handler: Callable[[Any], Any]
    ) -> dict[str, list[TaskResult]]:
        """
        混合执行 I/O 和 CPU 任务。
        
        Args:
            io_tasks: I/O 任务列表
            io_handler: 异步处理函数
            cpu_tasks: CPU 任务列表
            cpu_handler: 同步处理函数
            
        Returns:
            分类后的执行结果字典
        """
        loop = asyncio.get_event_loop()
        
        cpu_future = loop.run_in_executor(
            None,
            lambda: self._futures_scheduler.execute_batch(cpu_tasks, cpu_handler)
        )
        
        io_coro = self._async_scheduler.execute_batch(io_tasks, io_handler)
        
        io_results, cpu_results = await asyncio.gather(
            io_coro,
            cpu_future
        )
        
        return {
            "io_results": io_results,
            "cpu_results": cpu_results
        }
```

## 结果合并策略

### 简单聚合合并

将所有结果简单聚合为列表或字典。

```python
from dataclasses import dataclass
from typing import Any
from collections import defaultdict


@dataclass
class MergeConfig:
    """
    合并配置。
    
    Attributes:
        include_failures: 是否包含失败结果
        deduplicate: 是否去重
        sort_by: 排序字段
    """
    include_failures: bool = False
    deduplicate: bool = False
    sort_by: str | None = None


class SimpleResultMerger:
    """
    简单结果合并器。
    
    提供基础的聚合和过滤功能。
    """
    
    def __init__(self, config: MergeConfig | None = None):
        """
        初始化合并器。
        
        Args:
            config: 合并配置
        """
        self.config = config or MergeConfig()
    
    def merge_to_list(
        self,
        results: list[TaskResult]
    ) -> list[Any]:
        """
        合并结果为列表。
        
        Args:
            results: 任务结果列表
            
        Returns:
            结果数据列表
        """
        data = []
        
        for result in results:
            if result.status == TaskStatus.SUCCESS:
                data.append(result.data)
            elif self.config.include_failures:
                data.append({"error": result.error, "task_id": result.task_id})
        
        if self.config.deduplicate:
            seen = set()
            unique_data = []
            for item in data:
                item_hash = hash(str(item))
                if item_hash not in seen:
                    seen.add(item_hash)
                    unique_data.append(item)
            data = unique_data
        
        return data
    
    def merge_to_dict(
        self,
        results: list[TaskResult],
        key_field: str = "id"
    ) -> dict[str, Any]:
        """
        合并结果为字典。
        
        Args:
            results: 任务结果列表
            key_field: 作为键的字段名
            
        Returns:
            任务ID到结果的映射
        """
        result_dict = {}
        
        for result in results:
            if result.status == TaskStatus.SUCCESS:
                if isinstance(result.data, dict) and key_field in result.data:
                    key = str(result.data[key_field])
                else:
                    key = result.task_id
                result_dict[key] = result.data
            elif self.config.include_failures:
                result_dict[result.task_id] = {"error": result.error}
        
        return result_dict
    
    def merge_grouped(
        self,
        results: list[TaskResult],
        group_key: callable[[Any], str]
    ) -> dict[str, list[Any]]:
        """
        按分组键合并结果。
        
        Args:
            results: 任务结果列表
            group_key: 分组键提取函数
            
        Returns:
            分组键到结果列表的映射
        """
        groups: dict[str, list[Any]] = defaultdict(list)
        
        for result in results:
            if result.status == TaskStatus.SUCCESS:
                key = group_key(result.data)
                groups[key].append(result.data)
        
        return dict(groups)
```

### 层级聚合合并

支持多层级的嵌套结果合并。

```python
from typing import Any
from collections import defaultdict


class HierarchicalResultMerger:
    """
    层级结果合并器。
    
    支持多层级嵌套结构的合并。
    """
    
    def merge_nested(
        self,
        results: list[TaskResult],
        hierarchy: list[str]
    ) -> dict[str, Any]:
        """
        按层级路径合并结果。
        
        Args:
            results: 任务结果列表
            hierarchy: 层级字段列表
            
        Returns:
            层级嵌套的结果字典
        """
        root: dict[str, Any] = {}
        
        for result in results:
            if result.status != TaskStatus.SUCCESS:
                continue
            
            data = result.data
            if not isinstance(data, dict):
                continue
            
            current = root
            for i, key_field in enumerate(hierarchy[:-1]):
                key = str(data.get(key_field, "unknown"))
                if key not in current:
                    current[key] = {}
                current = current[key]
            
            leaf_key = str(data.get(hierarchy[-1], "unknown"))
            if leaf_key not in current:
                current[leaf_key] = []
            current[leaf_key].append(data)
        
        return root
    
    def merge_with_aggregation(
        self,
        results: list[TaskResult],
        group_by: list[str],
        aggregations: dict[str, callable[[list[Any]], Any]]
    ) -> list[dict[str, Any]]:
        """
        分组聚合合并。
        
        Args:
            results: 任务结果列表
            group_by: 分组字段列表
            aggregations: 聚合函数字典
            
        Returns:
            聚合后的结果列表
        """
        groups: dict[tuple, list[dict]] = defaultdict(list)
        
        for result in results:
            if result.status != TaskStatus.SUCCESS:
                continue
            
            data = result.data
            if not isinstance(data, dict):
                continue
            
            key = tuple(str(data.get(field, "")) for field in group_by)
            groups[key].append(data)
        
        aggregated = []
        for key, items in groups.items():
            row = dict(zip(group_by, key))
            for agg_name, agg_func in aggregations.items():
                row[agg_name] = agg_func(items)
            aggregated.append(row)
        
        return aggregated


def sum_field(field_name: str) -> callable[[list[dict]], float]:
    """
    创建字段求和聚合函数。
    
    Args:
        field_name: 要求和的字段名
        
    Returns:
        聚合函数
    """
    def aggregator(items: list[dict]) -> float:
        return sum(
            item.get(field_name, 0) or 0
            for item in items
        )
    return aggregator


def count_field(field_name: str) -> callable[[list[dict]], int]:
    """
    创建字段计数聚合函数。
    
    Args:
        field_name: 要计数的字段名
        
    Returns:
        聚合函数
    """
    def aggregator(items: list[dict]) -> int:
        return sum(
            1 for item in items
            if item.get(field_name) is not None
        )
    return aggregator


def avg_field(field_name: str) -> callable[[list[dict]], float]:
    """
    创建字段平均值聚合函数。
    
    Args:
        field_name: 要求平均的字段名
        
    Returns:
        聚合函数
    """
    def aggregator(items: list[dict]) -> float:
        values = [
            item.get(field_name)
            for item in items
            if item.get(field_name) is not None
        ]
        return sum(values) / len(values) if values else 0
    return aggregator
```

### 流式结果合并

支持大规模结果的流式合并。

```python
from typing import Any, Iterator
from dataclasses import dataclass
import json


@dataclass
class StreamingMergeConfig:
    """
    流式合并配置。
    
    Attributes:
        batch_size: 批处理大小
        output_format: 输出格式
        flush_interval: 刷新间隔（条数）
    """
    batch_size: int = 100
    output_format: str = "json"
    flush_interval: int = 1000


class StreamingResultMerger:
    """
    流式结果合并器。
    
    支持大规模结果的增量合并。
    """
    
    def __init__(self, config: StreamingMergeConfig | None = None):
        """
        初始化合并器。
        
        Args:
            config: 流式合并配置
        """
        self.config = config or StreamingMergeConfig()
        self._buffer: list[dict] = []
        self._total_count = 0
        self._success_count = 0
    
    def add_result(self, result: TaskResult) -> dict[str, Any] | None:
        """
        添加单个结果，达到阈值时返回批次。
        
        Args:
            result: 任务结果
            
        Returns:
            达到阈值时返回合并批次，否则返回 None
        """
        self._total_count += 1
        
        if result.status == TaskStatus.SUCCESS:
            self._success_count += 1
            self._buffer.append({
                "task_id": result.task_id,
                "data": result.data
            })
        
        if len(self._buffer) >= self.config.flush_interval:
            return self._flush()
        
        return None
    
    def _flush(self) -> dict[str, Any]:
        """
        刷新缓冲区。
        
        Returns:
            当前缓冲区的合并结果
        """
        batch = {
            "batch_size": len(self._buffer),
            "total_processed": self._total_count,
            "success_count": self._success_count,
            "items": self._buffer.copy()
        }
        self._buffer.clear()
        return batch
    
    def merge_stream(
        self,
        result_stream: Iterator[TaskResult]
    ) -> Iterator[dict[str, Any]]:
        """
        流式合并结果迭代器。
        
        Args:
            result_stream: 结果迭代器
            
        Yields:
            合并后的批次数据
        """
        for result in result_stream:
            batch = self.add_result(result)
            if batch is not None:
                yield batch
        
        if self._buffer:
            yield self._flush()
    
    def get_statistics(self) -> dict[str, Any]:
        """
        获取合并统计信息。
        
        Returns:
            统计数据字典
        """
        return {
            "total_processed": self._total_count,
            "success_count": self._success_count,
            "failure_count": self._total_count - self._success_count,
            "buffer_size": len(self._buffer)
        }


def write_to_file(
    merged_batches: Iterator[dict[str, Any]],
    output_path: str
) -> int:
    """
    将合并结果写入文件。
    
    Args:
        merged_batches: 合并批次迭代器
        output_path: 输出文件路径
        
    Returns:
        写入的总条目数
    """
    total_items = 0
    
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('[\n')
        first = True
        
        for batch in merged_batches:
            for item in batch.get("items", []):
                if not first:
                    f.write(',\n')
                f.write(json.dumps(item, ensure_ascii=False, indent=2))
                first = False
                total_items += 1
        
        f.write('\n]')
    
    return total_items
```

## 完整示例

### 并行数据处理流水线

```python
import asyncio
from dataclasses import dataclass
from typing import Any, Callable
import time


@dataclass
class PipelineConfig:
    """
    流水线配置。
    
    Attributes:
        batch_size: 批处理大小
        max_concurrency: 最大并发数
        enable_retry: 是否启用重试
    """
    batch_size: int = 100
    max_concurrency: int = 10
    enable_retry: bool = True


class ParallelDataPipeline:
    """
    并行数据处理流水线。
    
    整合任务拆分、并行调度和结果合并。
    """
    
    def __init__(self, config: PipelineConfig | None = None):
        """
        初始化流水线。
        
        Args:
            config: 流水线配置
        """
        self.config = config or PipelineConfig()
        self._scheduler = AsyncParallelScheduler(
            AsyncSchedulerConfig(
                max_concurrency=self.config.max_concurrency
            )
        )
        self._merger = StreamingResultMerger()
    
    async def process(
        self,
        data_source: list[Any],
        processor: Callable[[Any], asyncio.coroutine],
        on_batch_complete: Callable[[dict[str, Any]], None] | None = None
    ) -> dict[str, Any]:
        """
        处理数据源。
        
        Args:
            data_source: 数据源列表
            processor: 数据处理函数
            on_batch_complete: 批次完成回调
            
        Returns:
            处理统计信息
        """
        tasks = [
            Task(task_id=f"item_{i}", payload=item)
            for i, item in enumerate(data_source)
        ]
        
        all_results = []
        
        for i in range(0, len(tasks), self.config.batch_size):
            batch = tasks[i:i + self.config.batch_size]
            results = await self._scheduler.execute_batch(batch, processor)
            all_results.extend(results)
            
            if on_batch_complete:
                batch_stats = {
                    "batch_index": i // self.config.batch_size,
                    "batch_size": len(batch),
                    "success_count": sum(
                        1 for r in results
                        if r.status == TaskStatus.SUCCESS
                    )
                }
                on_batch_complete(batch_stats)
        
        success_count = sum(
            1 for r in all_results
            if r.status == TaskStatus.SUCCESS
        )
        
        return {
            "total_tasks": len(tasks),
            "success_count": success_count,
            "failure_count": len(tasks) - success_count,
            "results": all_results
        }


async def sample_processor(item: Any) -> dict[str, Any]:
    """
    示例处理函数。
    
    Args:
        item: 待处理数据项
        
    Returns:
        处理结果
    """
    await asyncio.sleep(0.01)
    return {"processed": item, "timestamp": time.time()}


async def run_pipeline_example():
    """
    运行流水线示例。
    """
    pipeline = ParallelDataPipeline(
        PipelineConfig(batch_size=50, max_concurrency=10)
    )
    
    data = [{"id": i, "value": f"data_{i}"} for i in range(200)]
    
    def on_batch(stats: dict[str, Any]) -> None:
        print(f"批次 {stats['batch_index']} 完成: {stats['success_count']}/{stats['batch_size']}")
    
    result = await pipeline.process(data, sample_processor, on_batch)
    
    print(f"\n总计: {result['success_count']}/{result['total_tasks']} 成功")
```

## Quick Reference: 并行模式选择

| 模式 | 适用场景 | 优势 | 劣势 |
|------|----------|------|------|
| asyncio | I/O 密集型任务 | 高并发、低开销 | 不适合 CPU 密集型 |
| ThreadPoolExecutor | 混合型任务 | 简单易用 | GIL 限制 |
| ProcessPoolExecutor | CPU 密集型任务 | 绕过 GIL | 进程开销大 |
| 混合调度 | 复杂场景 | 灵活高效 | 实现复杂 |

## Anti-Patterns to Avoid

```python
# Bad: 在异步代码中使用阻塞调用
async def bad_async_handler(url: str) -> str:
    import urllib.request
    return urllib.request.urlopen(url).read()  # 阻塞事件循环

# Good: 使用异步库
async def good_async_handler(url: str) -> str:
    import aiohttp
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            return await response.text()


# Bad: 过度并发导致资源耗尽
async def bad_concurrent_fetch(urls: list[str]) -> list[str]:
    tasks = [fetch(url) for url in urls]  # 无限制并发
    return await asyncio.gather(*tasks)

# Good: 使用信号量限制并发
async def good_concurrent_fetch(urls: list[str], max_concurrent: int = 10) -> list[str]:
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def limited_fetch(url: str) -> str:
        async with semaphore:
            return await fetch(url)
    
    tasks = [limited_fetch(url) for url in urls]
    return await asyncio.gather(*tasks)


# Bad: 忽略异常处理
def bad_parallel_process(tasks: list[Task]) -> list[Any]:
    with ThreadPoolExecutor() as executor:
        return list(executor.map(process, tasks))  # 异常会中断

# Good: 完善的异常处理
def good_parallel_process(tasks: list[Task]) -> list[TaskResult]:
    results = []
    with ThreadPoolExecutor() as executor:
        futures = {executor.submit(process, t.payload): t for t in tasks}
        for future in as_completed(futures):
            task = futures[future]
            try:
                results.append(TaskResult(
                    task_id=task.task_id,
                    status=TaskStatus.SUCCESS,
                    data=future.result()
                ))
            except Exception as e:
                results.append(TaskResult(
                    task_id=task.task_id,
                    status=TaskStatus.FAILED,
                    error=str(e)
                ))
    return results


# Bad: 共享可变状态
counter = 0

def bad_increment(_):
    global counter
    counter += 1  # 竞态条件

# Good: 使用线程安全的数据结构
from threading import Lock

class SafeCounter:
    def __init__(self):
        self._value = 0
        self._lock = Lock()
    
    def increment(self) -> int:
        with self._lock:
            self._value += 1
            return self._value

counter = SafeCounter()

def good_increment(_):
    return counter.increment()
```

**Remember**: 并行执行的核心在于任务独立性、合理粒度和错误隔离。选择合适的调度机制，确保结果正确合并，避免共享状态带来的并发问题。
