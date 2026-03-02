# Agent 工具调用优化参考

工具调用是 AI Agent 与外部环境交互的核心机制。本文档整合工具选择策略、参数优化方法和结果缓存机制，用于构建高效、可靠的 Agent 系统。

## When to Activate

- 设计 Agent 工具调用架构
- 优化现有工具调用性能
- 实现工具结果缓存
- 调试工具调用问题

## Core Principles

### 1. 最小化工具调用次数

每次工具调用都有延迟和成本，应尽可能减少不必要的调用。

```python
# Good: 批量获取所需信息
def process_user_request(user_id: str) -> dict:
    """一次性获取用户完整信息，避免多次调用。"""
    user_data = fetch_user_complete_data(user_id)
    return {
        "profile": user_data.profile,
        "preferences": user_data.preferences,
        "history": user_data.history
    }

# Bad: 多次单独调用
def process_user_request(user_id: str) -> dict:
    profile = fetch_user_profile(user_id)
    preferences = fetch_user_preferences(user_id)
    history = fetch_user_history(user_id)
    return {"profile": profile, "preferences": preferences, "history": history}
```

### 2. 并行调用独立工具

当多个工具调用之间没有依赖关系时，应并行执行。

```python
# Good: 并行获取独立数据源
async def gather_context(query: str) -> dict:
    """并行调用多个独立数据源。"""
    tasks = [
        search_documentation(query),
        search_codebase(query),
        search_issues(query)
    ]
    results = await asyncio.gather(*tasks)
    return {
        "docs": results[0],
        "code": results[1],
        "issues": results[2]
    }

# Bad: 串行调用独立数据源
async def gather_context(query: str) -> dict:
    docs = await search_documentation(query)
    code = await search_codebase(query)
    issues = await search_issues(query)
    return {"docs": docs, "code": code, "issues": issues}
```

### 3. 智能参数默认值

为工具参数提供合理的默认值，减少调用时的参数复杂度。

```python
# Good: 提供智能默认值
def search_code(
    query: str,
    max_results: int = 10,
    file_types: list[str] | None = None,
    include_tests: bool = False
) -> list[SearchResult]:
    """搜索代码库，提供合理的默认参数值。"""
    if file_types is None:
        file_types = [".py", ".js", ".ts", ".java"]
    return _execute_search(query, max_results, file_types, include_tests)

# Bad: 强制所有参数
def search_code(
    query: str,
    max_results: int,
    file_types: list[str],
    include_tests: bool
) -> list[SearchResult]:
    return _execute_search(query, max_results, file_types, include_tests)
```

## 工具选择策略

### 策略一：基于任务类型选择

根据任务类型选择最合适的工具，避免使用过于通用的工具。

```python
from enum import Enum
from typing import Protocol

class TaskType(Enum):
    """任务类型枚举。"""
    CODE_SEARCH = "code_search"
    FILE_READ = "file_read"
    COMMAND_EXEC = "command_exec"
    WEB_SEARCH = "web_search"


class Tool(Protocol):
    """工具接口协议。"""
    
    name: str
    description: str
    supported_tasks: list[TaskType]
    
    def can_handle(self, task_type: TaskType) -> bool:
        """检查是否支持指定任务类型。"""
        ...
    
    def execute(self, params: dict) -> dict:
        """执行工具操作。"""
        ...


class ToolSelector:
    """工具选择器，基于任务类型选择最优工具。"""
    
    def __init__(self, tools: list[Tool]):
        self.tools = tools
        self._build_task_mapping()
    
    def _build_task_mapping(self) -> None:
        """构建任务类型到工具的映射。"""
        self.task_mapping: dict[TaskType, list[Tool]] = {}
        for tool in self.tools:
            for task in tool.supported_tasks:
                if task not in self.task_mapping:
                    self.task_mapping[task] = []
                self.task_mapping[task].append(tool)
    
    def select_best_tool(self, task_type: TaskType) -> Tool | None:
        """选择处理指定任务的最佳工具。"""
        candidates = self.task_mapping.get(task_type, [])
        if not candidates:
            return None
        return candidates[0]
    
    def select_all_tools(self, task_type: TaskType) -> list[Tool]:
        """选择所有支持指定任务的工具。"""
        return self.task_mapping.get(task_type, [])
```

### 策略二：基于上下文相关性选择

根据当前上下文选择最相关的工具。

```python
from dataclasses import dataclass
from typing import Any


@dataclass
class Context:
    """执行上下文。"""
    current_file: str | None = None
    current_directory: str | None = None
    recent_files: list[str] | None = None
    language: str | None = None


class ContextAwareToolSelector:
    """基于上下文的工具选择器。"""
    
    def __init__(self, tools: list[Tool]):
        self.tools = tools
        self.context = Context()
    
    def update_context(self, **kwargs: Any) -> None:
        """更新执行上下文。"""
        for key, value in kwargs.items():
            if hasattr(self.context, key):
                setattr(self.context, key, value)
    
    def score_tool_relevance(self, tool: Tool) -> float:
        """计算工具与当前上下文的相关性分数。"""
        score = 0.0
        
        if self.context.language:
            if hasattr(tool, "supported_languages"):
                if self.context.language in tool.supported_languages:
                    score += 0.5
        
        if self.context.current_file:
            if hasattr(tool, "file_extensions"):
                ext = self._get_extension(self.context.current_file)
                if ext in tool.file_extensions:
                    score += 0.3
        
        return score
    
    def _get_extension(self, filepath: str) -> str:
        """获取文件扩展名。"""
        import os
        return os.path.splitext(filepath)[1]
    
    def select_by_context(self, task_type: TaskType) -> Tool | None:
        """基于上下文选择最佳工具。"""
        candidates = [
            tool for tool in self.tools
            if task_type in tool.supported_tasks
        ]
        
        if not candidates:
            return None
        
        scored = [(tool, self.score_tool_relevance(tool)) for tool in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        
        return scored[0][0]
```

### 策略三：基于历史成功率选择

根据工具的历史执行成功率动态选择。

```python
import time
from collections import defaultdict


@dataclass
class ToolStats:
    """工具执行统计。"""
    success_count: int = 0
    failure_count: int = 0
    total_latency: float = 0.0
    last_used: float = 0.0
    
    @property
    def success_rate(self) -> float:
        """计算成功率。"""
        total = self.success_count + self.failure_count
        return self.success_count / total if total > 0 else 0.0
    
    @property
    def avg_latency(self) -> float:
        """计算平均延迟。"""
        total = self.success_count + self.failure_count
        return self.total_latency / total if total > 0 else 0.0


class AdaptiveToolSelector:
    """自适应工具选择器，基于历史表现选择工具。"""
    
    def __init__(self, tools: list[Tool]):
        self.tools = tools
        self.stats: dict[str, ToolStats] = defaultdict(ToolStats)
    
    def record_success(self, tool_name: str, latency: float) -> None:
        """记录成功执行。"""
        stats = self.stats[tool_name]
        stats.success_count += 1
        stats.total_latency += latency
        stats.last_used = time.time()
    
    def record_failure(self, tool_name: str, latency: float) -> None:
        """记录失败执行。"""
        stats = self.stats[tool_name]
        stats.failure_count += 1
        stats.total_latency += latency
        stats.last_used = time.time()
    
    def calculate_score(self, tool: Tool) -> float:
        """计算工具综合得分。"""
        stats = self.stats.get(tool.name, ToolStats())
        
        success_weight = 0.6
        latency_weight = 0.3
        recency_weight = 0.1
        
        success_score = stats.success_rate
        
        max_latency = 10.0
        latency_score = max(0, 1 - stats.avg_latency / max_latency)
        
        time_since_use = time.time() - stats.last_used
        recency_score = max(0, 1 - time_since_use / 3600)
        
        return (
            success_weight * success_score +
            latency_weight * latency_score +
            recency_weight * recency_score
        )
    
    def select_best(self, task_type: TaskType) -> Tool | None:
        """选择综合表现最佳的工具。"""
        candidates = [
            tool for tool in self.tools
            if task_type in tool.supported_tasks
        ]
        
        if not candidates:
            return None
        
        scored = [(tool, self.calculate_score(tool)) for tool in candidates]
        scored.sort(key=lambda x: x[1], reverse=True)
        
        return scored[0][0]
```

## 参数优化方法

### 方法一：参数验证与规范化

在调用工具前验证并规范化参数，减少无效调用。

```python
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class ParameterSpec:
    """参数规格定义。"""
    name: str
    type: type
    required: bool = True
    default: Any = None
    validator: Callable[[Any], bool] | None = None
    normalizer: Callable[[Any], Any] | None = None


class ParameterOptimizer:
    """参数优化器，验证并规范化工具参数。"""
    
    def __init__(self, specs: list[ParameterSpec]):
        self.specs = {spec.name: spec for spec in specs}
    
    def validate(self, params: dict[str, Any]) -> tuple[bool, list[str]]:
        """验证参数是否有效。"""
        errors = []
        
        for name, spec in self.specs.items():
            if spec.required and name not in params:
                errors.append(f"缺少必需参数: {name}")
                continue
            
            if name in params:
                value = params[name]
                
                if not isinstance(value, spec.type):
                    errors.append(
                        f"参数 {name} 类型错误: 期望 {spec.type.__name__}, "
                        f"实际 {type(value).__name__}"
                    )
                
                if spec.validator and not spec.validator(value):
                    errors.append(f"参数 {name} 验证失败: {value}")
        
        return len(errors) == 0, errors
    
    def normalize(self, params: dict[str, Any]) -> dict[str, Any]:
        """规范化参数值。"""
        normalized = {}
        
        for name, spec in self.specs.items():
            if name in params:
                value = params[name]
                if spec.normalizer:
                    value = spec.normalizer(value)
                normalized[name] = value
            elif spec.default is not None:
                normalized[name] = spec.default
        
        return normalized
    
    def optimize(self, params: dict[str, Any]) -> tuple[dict[str, Any], list[str]]:
        """验证并优化参数。"""
        is_valid, errors = self.validate(params)
        if not is_valid:
            return {}, errors
        
        normalized = self.normalize(params)
        return normalized, []


def create_search_optimizer() -> ParameterOptimizer:
    """创建代码搜索工具的参数优化器。"""
    specs = [
        ParameterSpec(
            name="query",
            type=str,
            required=True,
            validator=lambda x: len(x.strip()) > 0,
            normalizer=lambda x: x.strip()
        ),
        ParameterSpec(
            name="max_results",
            type=int,
            required=False,
            default=10,
            validator=lambda x: 1 <= x <= 100,
            normalizer=lambda x: min(max(x, 1), 100)
        ),
        ParameterSpec(
            name="file_pattern",
            type=str,
            required=False,
            default="*",
            normalizer=lambda x: x if x else "*"
        )
    ]
    return ParameterOptimizer(specs)
```

### 方法二：参数合并与去重

合并重复参数，减少冗余调用。

```python
from collections import defaultdict


class ParameterMerger:
    """参数合并器，合并相似请求的参数。"""
    
    def __init__(self, merge_window_ms: int = 100):
        self.merge_window_ms = merge_window_ms
        self.pending_requests: dict[str, list[dict]] = defaultdict(list)
    
    def add_request(self, tool_name: str, params: dict) -> str:
        """添加待合并的请求。"""
        import uuid
        request_id = str(uuid.uuid4())
        self.pending_requests[tool_name].append({
            "id": request_id,
            "params": params,
            "timestamp": time.time() * 1000
        })
        return request_id
    
    def merge_file_reads(self, requests: list[dict]) -> dict:
        """合并文件读取请求。"""
        files_to_read = set()
        for req in requests:
            if "file_path" in req["params"]:
                files_to_read.add(req["params"]["file_path"])
        
        return {
            "action": "batch_read",
            "file_paths": list(files_to_read)
        }
    
    def merge_searches(self, requests: list[dict]) -> dict:
        """合并搜索请求。"""
        queries = []
        for req in requests:
            if "query" in req["params"]:
                queries.append(req["params"]["query"])
        
        combined_query = " OR ".join(f'"{q}"' for q in queries)
        return {
            "action": "combined_search",
            "query": combined_query,
            "max_results": max(
                req["params"].get("max_results", 10) for req in requests
            )
        }
```

### 方法三：参数预计算

预先计算常用参数值，减少运行时开销。

```python
from functools import lru_cache


class PrecomputedParams:
    """预计算参数值。"""
    
    def __init__(self):
        self._cache: dict[str, Any] = {}
    
    def precompute_project_structure(self, root_path: str) -> dict:
        """预计算项目结构信息。"""
        import os
        
        structure = {
            "directories": [],
            "files_by_extension": defaultdict(list),
            "config_files": []
        }
        
        for root, dirs, files in os.walk(root_path):
            rel_root = os.path.relpath(root, root_path)
            structure["directories"].append(rel_root)
            
            for file in files:
                filepath = os.path.join(rel_root, file)
                _, ext = os.path.splitext(file)
                structure["files_by_extension"][ext].append(filepath)
                
                if file in ["package.json", "pyproject.toml", "Cargo.toml"]:
                    structure["config_files"].append(filepath)
        
        self._cache["project_structure"] = structure
        return structure
    
    @lru_cache(maxsize=128)
    def get_file_type(self, extension: str) -> str:
        """获取文件类型（带缓存）。"""
        type_mapping = {
            ".py": "python",
            ".js": "javascript",
            ".ts": "typescript",
            ".java": "java",
            ".go": "golang",
            ".rs": "rust"
        }
        return type_mapping.get(extension, "unknown")
    
    def get_precomputed(self, key: str) -> Any | None:
        """获取预计算的值。"""
        return self._cache.get(key)
```

## 结果缓存机制

### 基础缓存实现

```python
import hashlib
import json
import time
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class CacheEntry:
    """缓存条目。"""
    value: Any
    created_at: float
    ttl: float
    hits: int = 0


class ToolResultCache:
    """工具结果缓存。"""
    
    def __init__(self, default_ttl: float = 300.0):
        self.default_ttl = default_ttl
        self._cache: dict[str, CacheEntry] = {}
    
    def _generate_key(self, tool_name: str, params: dict) -> str:
        """生成缓存键。"""
        sorted_params = json.dumps(params, sort_keys=True)
        params_hash = hashlib.md5(sorted_params.encode()).hexdigest()
        return f"{tool_name}:{params_hash}"
    
    def get(self, tool_name: str, params: dict) -> Any | None:
        """获取缓存结果。"""
        key = self._generate_key(tool_name, params)
        entry = self._cache.get(key)
        
        if entry is None:
            return None
        
        if time.time() - entry.created_at > entry.ttl:
            del self._cache[key]
            return None
        
        entry.hits += 1
        return entry.value
    
    def set(
        self,
        tool_name: str,
        params: dict,
        value: Any,
        ttl: float | None = None
    ) -> None:
        """设置缓存结果。"""
        key = self._generate_key(tool_name, params)
        self._cache[key] = CacheEntry(
            value=value,
            created_at=time.time(),
            ttl=ttl or self.default_ttl
        )
    
    def invalidate(self, tool_name: str, params: dict | None = None) -> int:
        """使缓存失效。"""
        if params:
            key = self._generate_key(tool_name, params)
            if key in self._cache:
                del self._cache[key]
                return 1
            return 0
        
        keys_to_delete = [
            k for k in self._cache if k.startswith(f"{tool_name}:")
        ]
        for key in keys_to_delete:
            del self._cache[key]
        return len(keys_to_delete)
    
    def clear_expired(self) -> int:
        """清理过期缓存。"""
        current_time = time.time()
        expired_keys = [
            k for k, v in self._cache
            if current_time - v.created_at > v.ttl
        ]
        for key in expired_keys:
            del self._cache[key]
        return len(expired_keys)
    
    def get_stats(self) -> dict:
        """获取缓存统计信息。"""
        total_hits = sum(entry.hits for entry in self._cache.values())
        return {
            "entries": len(self._cache),
            "total_hits": total_hits,
            "entries_detail": [
                {
                    "key": k,
                    "hits": v.hits,
                    "age": time.time() - v.created_at
                }
                for k, v in self._cache.items()
            ]
        }
```

### 分层缓存实现

```python
from abc import ABC, abstractmethod
from typing import Any


class CacheLayer(ABC):
    """缓存层抽象基类。"""
    
    @abstractmethod
    def get(self, key: str) -> Any | None:
        """获取缓存值。"""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: float) -> None:
        """设置缓存值。"""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> bool:
        """删除缓存值。"""
        pass


class MemoryCacheLayer(CacheLayer):
    """内存缓存层。"""
    
    def __init__(self, max_size: int = 1000):
        self.max_size = max_size
        self._cache: dict[str, CacheEntry] = {}
    
    def get(self, key: str) -> Any | None:
        entry = self._cache.get(key)
        if entry and time.time() - entry.created_at <= entry.ttl:
            entry.hits += 1
            return entry.value
        return None
    
    def set(self, key: str, value: Any, ttl: float) -> None:
        if len(self._cache) >= self.max_size:
            self._evict_lru()
        self._cache[key] = CacheEntry(
            value=value,
            created_at=time.time(),
            ttl=ttl
        )
    
    def delete(self, key: str) -> bool:
        if key in self._cache:
            del self._cache[key]
            return True
        return False
    
    def _evict_lru(self) -> None:
        """淘汰最少使用的条目。"""
        if not self._cache:
            return
        lru_key = min(self._cache.keys(), key=lambda k: self._cache[k].hits)
        del self._cache[lru_key]


class DiskCacheLayer(CacheLayer):
    """磁盘缓存层。"""
    
    def __init__(self, cache_dir: str):
        import os
        self.cache_dir = cache_dir
        os.makedirs(cache_dir, exist_ok=True)
    
    def _get_filepath(self, key: str) -> str:
        import os
        safe_key = hashlib.md5(key.encode()).hexdigest()
        return os.path.join(self.cache_dir, f"{safe_key}.cache")
    
    def get(self, key: str) -> Any | None:
        import pickle
        
        filepath = self._get_filepath(key)
        if not os.path.exists(filepath):
            return None
        
        try:
            with open(filepath, "rb") as f:
                entry = pickle.load(f)
            if time.time() - entry["created_at"] <= entry["ttl"]:
                return entry["value"]
            os.remove(filepath)
        except (pickle.PickleError, IOError):
            pass
        return None
    
    def set(self, key: str, value: Any, ttl: float) -> None:
        import pickle
        
        filepath = self._get_filepath(key)
        entry = {
            "value": value,
            "created_at": time.time(),
            "ttl": ttl
        }
        with open(filepath, "wb") as f:
            pickle.dump(entry, f)
    
    def delete(self, key: str) -> bool:
        import os
        
        filepath = self._get_filepath(key)
        if os.path.exists(filepath):
            os.remove(filepath)
            return True
        return False


class LayeredCache:
    """分层缓存，依次查询各层。"""
    
    def __init__(self, layers: list[CacheLayer]):
        self.layers = layers
    
    def get(self, key: str) -> Any | None:
        """从各层依次获取，找到后回填到上层。"""
        for i, layer in enumerate(self.layers):
            value = layer.get(key)
            if value is not None:
                for j in range(i):
                    self.layers[j].set(key, value, ttl=300)
                return value
        return None
    
    def set(self, key: str, value: Any, ttl: float = 300.0) -> None:
        """设置到所有层。"""
        for layer in self.layers:
            layer.set(key, value, ttl)
    
    def delete(self, key: str) -> bool:
        """从所有层删除。"""
        return any(layer.delete(key) for layer in self.layers)
```

### 智能缓存策略

```python
from enum import Enum
from typing import Any


class CacheStrategy(Enum):
    """缓存策略枚举。"""
    ALWAYS = "always"
    NEVER = "never"
    READ_ONLY = "read_only"
    WRITE_THROUGH = "write_through"
    WRITE_BACK = "write_back"


class SmartCache:
    """智能缓存，根据工具特性选择缓存策略。"""
    
    def __init__(self):
        self.cache = ToolResultCache()
        self.strategies: dict[str, CacheStrategy] = {}
        self.write_back_queue: dict[str, list[tuple[str, dict, Any]]] = {}
    
    def register_tool(self, tool_name: str, strategy: CacheStrategy) -> None:
        """注册工具及其缓存策略。"""
        self.strategies[tool_name] = strategy
    
    def should_cache_read(self, tool_name: str) -> bool:
        """判断是否应该缓存读取结果。"""
        strategy = self.strategies.get(tool_name, CacheStrategy.ALWAYS)
        return strategy in [
            CacheStrategy.ALWAYS,
            CacheStrategy.READ_ONLY,
            CacheStrategy.WRITE_THROUGH,
            CacheStrategy.WRITE_BACK
        ]
    
    def should_cache_write(self, tool_name: str) -> bool:
        """判断是否应该缓存写入结果。"""
        strategy = self.strategies.get(tool_name, CacheStrategy.ALWAYS)
        return strategy in [
            CacheStrategy.ALWAYS,
            CacheStrategy.WRITE_THROUGH,
            CacheStrategy.WRITE_BACK
        ]
    
    def get_or_compute(
        self,
        tool_name: str,
        params: dict,
        compute_func: Callable[[], Any]
    ) -> Any:
        """获取缓存或计算结果。"""
        if self.should_cache_read(tool_name):
            cached = self.cache.get(tool_name, params)
            if cached is not None:
                return cached
        
        result = compute_func()
        
        if self.should_cache_write(tool_name):
            self.cache.set(tool_name, params, result)
        
        return result
    
    def get_strategy_for_tool_type(self, tool_type: str) -> CacheStrategy:
        """根据工具类型获取推荐策略。"""
        strategy_mapping = {
            "file_read": CacheStrategy.ALWAYS,
            "file_write": CacheStrategy.WRITE_THROUGH,
            "search": CacheStrategy.READ_ONLY,
            "command": CacheStrategy.NEVER,
            "api_call": CacheStrategy.WRITE_BACK
        }
        return strategy_mapping.get(tool_type, CacheStrategy.ALWAYS)


def create_smart_cache() -> SmartCache:
    """创建配置好的智能缓存实例。"""
    cache = SmartCache()
    
    cache.register_tool("read_file", CacheStrategy.ALWAYS)
    cache.register_tool("write_file", CacheStrategy.WRITE_THROUGH)
    cache.register_tool("search_code", CacheStrategy.READ_ONLY)
    cache.register_tool("execute_command", CacheStrategy.NEVER)
    cache.register_tool("fetch_url", CacheStrategy.WRITE_BACK)
    
    return cache
```

## 完整示例：优化后的工具调用框架

```python
from dataclasses import dataclass
from typing import Any, Callable


@dataclass
class ToolCallResult:
    """工具调用结果。"""
    success: bool
    value: Any
    error: str | None = None
    from_cache: bool = False
    latency: float = 0.0


class OptimizedToolExecutor:
    """优化的工具执行器。"""
    
    def __init__(self):
        self.selector = AdaptiveToolSelector([])
        self.param_optimizer = ParameterOptimizer([])
        self.cache = create_smart_cache()
        self.stats: dict[str, ToolStats] = defaultdict(ToolStats)
    
    def register_tool(
        self,
        tool: Tool,
        cache_strategy: CacheStrategy = CacheStrategy.ALWAYS
    ) -> None:
        """注册工具。"""
        self.selector.tools.append(tool)
        self.cache.register_tool(tool.name, cache_strategy)
    
    async def execute(
        self,
        task_type: TaskType,
        params: dict,
        use_cache: bool = True
    ) -> ToolCallResult:
        """执行工具调用。"""
        start_time = time.time()
        
        tool = self.selector.select_best(task_type)
        if tool is None:
            return ToolCallResult(
                success=False,
                value=None,
                error=f"未找到支持任务类型 {task_type} 的工具"
            )
        
        optimized_params, errors = self.param_optimizer.optimize(params)
        if errors:
            return ToolCallResult(
                success=False,
                value=None,
                error=f"参数验证失败: {errors}"
            )
        
        if use_cache:
            cached = self.cache.get_or_compute(
                tool.name,
                optimized_params,
                lambda: None
            )
            if cached is not None:
                return ToolCallResult(
                    success=True,
                    value=cached,
                    from_cache=True,
                    latency=time.time() - start_time
                )
        
        try:
            if asyncio.iscoroutinefunction(tool.execute):
                result = await tool.execute(optimized_params)
            else:
                result = tool.execute(optimized_params)
            
            latency = time.time() - start_time
            self.selector.record_success(tool.name, latency)
            
            if use_cache:
                self.cache.cache.set(tool.name, optimized_params, result)
            
            return ToolCallResult(
                success=True,
                value=result,
                latency=latency
            )
        
        except Exception as e:
            latency = time.time() - start_time
            self.selector.record_failure(tool.name, latency)
            
            return ToolCallResult(
                success=False,
                value=None,
                error=str(e),
                latency=latency
            )
    
    def get_performance_report(self) -> dict:
        """获取性能报告。"""
        return {
            "tool_stats": {
                name: {
                    "success_rate": stats.success_rate,
                    "avg_latency": stats.avg_latency,
                    "total_calls": stats.success_count + stats.failure_count
                }
                for name, stats in self.stats.items()
            },
            "cache_stats": self.cache.cache.get_stats()
        }
```

## Quick Reference: 工具调用优化策略

| 策略 | 适用场景 | 收益 |
|------|----------|------|
| 批量调用 | 多个独立请求 | 减少网络往返 |
| 并行执行 | 无依赖的调用 | 降低总延迟 |
| 结果缓存 | 重复查询 | 避免重复计算 |
| 参数预计算 | 固定参数 | 减少运行时开销 |
| 智能选择 | 多工具可选 | 提高成功率 |

## Anti-Patterns to Avoid

```python
# Bad: 串行调用独立工具
result1 = await tool_a.execute()
result2 = await tool_b.execute()
result3 = await tool_c.execute()

# Good: 并行调用独立工具
results = await asyncio.gather(
    tool_a.execute(),
    tool_b.execute(),
    tool_c.execute()
)

# Bad: 忽略缓存结果
def search(query: str) -> list:
    return database.query(query)

# Good: 使用缓存
def search(query: str) -> list:
    cached = cache.get("search", {"query": query})
    if cached:
        return cached
    result = database.query(query)
    cache.set("search", {"query": query}, result)
    return result

# Bad: 过于通用的错误处理
try:
    result = tool.execute()
except Exception:
    pass

# Good: 具体的错误处理和日志
try:
    result = tool.execute()
except ValidationError as e:
    logger.warning(f"参数验证失败: {e}")
    raise
except TimeoutError as e:
    logger.error(f"工具执行超时: {e}")
    return fallback_result()

# Bad: 固定 TTL 不考虑数据特性
cache.set(key, value, ttl=300)

# Good: 根据数据特性设置 TTL
cache.set(key, value, ttl=get_appropriate_ttl(data_type))
```

**Remember**: 工具调用优化应平衡性能与正确性。缓存能提升性能，但可能导致数据不一致。始终根据具体场景选择合适的策略。
