# 代理状态管理参考

代理状态持久化、恢复机制、并发控制的核心模式，用于构建可靠、可恢复、线程安全的代理系统。

## When to Activate

- 设计代理状态持久化方案
- 实现代理恢复机制
- 处理代理并发控制
- 构建分布式代理系统

## Core Principles

### 1. 状态可序列化

所有代理状态必须能够序列化为可存储格式。

```python
from dataclasses import dataclass, asdict
from typing import Any
import json

@dataclass
class AgentState:
    """代理状态数据类。"""
    agent_id: str
    status: str
    context: dict[str, Any]
    created_at: float
    updated_at: float

    def to_dict(self) -> dict[str, Any]:
        """将状态转换为字典格式。"""
        return asdict(self)

    def to_json(self) -> str:
        """将状态序列化为 JSON 字符串。"""
        return json.dumps(self.to_dict(), ensure_ascii=False)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'AgentState':
        """从字典创建状态实例。"""
        return cls(**data)

    @classmethod
    def from_json(cls, json_str: str) -> 'AgentState':
        """从 JSON 字符串反序列化状态。"""
        return cls.from_dict(json.loads(json_str))
```

### 2. 原子性操作

状态更新必须是原子的，避免部分更新导致的不一致。

```python
import threading
from contextlib import contextmanager

class AtomicStateManager:
    """原子状态管理器。"""

    def __init__(self):
        self._lock = threading.RLock()
        self._state: dict[str, Any] = {}

    @contextmanager
    def atomic_update(self, key: str):
        """原子更新上下文管理器。"""
        with self._lock:
            yield self._state
            self._persist_state(key)

    def _persist_state(self, key: str) -> None:
        """持久化状态（内部方法）。"""
        pass

    def get_state(self, key: str) -> dict[str, Any] | None:
        """获取状态（线程安全）。"""
        with self._lock:
            return self._state.get(key)
```

### 3. 幂等性设计

状态操作应该是幂等的，重复执行不会产生副作用。

```python
def update_agent_status(
    agent_id: str,
    new_status: str,
    storage: 'StateStorage'
) -> bool:
    """更新代理状态（幂等操作）。

    Args:
        agent_id: 代理唯一标识符
        new_status: 新状态值
        storage: 状态存储实例

    Returns:
        操作是否成功
    """
    current = storage.get(agent_id)
    if current and current.get('status') == new_status:
        return True

    return storage.set(agent_id, {'status': new_status})
```

## 状态持久化方案

### Redis 持久化方案

```python
import redis
import json
from typing import Any, Optional
from datetime import timedelta

class RedisStateStorage:
    """基于 Redis 的状态持久化存储。"""

    def __init__(
        self,
        host: str = 'localhost',
        port: int = 6379,
        db: int = 0,
        password: Optional[str] = None,
        prefix: str = 'agent:state:'
    ):
        """初始化 Redis 存储连接。

        Args:
            host: Redis 主机地址
            port: Redis 端口
            db: 数据库编号
            password: 认证密码
            prefix: 键名前缀
        """
        self._client = redis.Redis(
            host=host,
            port=port,
            db=db,
            password=password,
            decode_responses=True
        )
        self._prefix = prefix

    def _make_key(self, agent_id: str) -> str:
        """生成完整的存储键名。"""
        return f"{self._prefix}{agent_id}"

    def save(
        self,
        agent_id: str,
        state: dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """保存代理状态。

        Args:
            agent_id: 代理唯一标识符
            state: 状态数据字典
            ttl: 过期时间（秒）

        Returns:
            保存是否成功
        """
        key = self._make_key(agent_id)
        value = json.dumps(state, ensure_ascii=False)

        if ttl:
            return self._client.setex(key, ttl, value)
        return self._client.set(key, value)

    def load(self, agent_id: str) -> Optional[dict[str, Any]]:
        """加载代理状态。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            状态数据字典，不存在则返回 None
        """
        key = self._make_key(agent_id)
        value = self._client.get(key)

        if value is None:
            return None
        return json.loads(value)

    def delete(self, agent_id: str) -> bool:
        """删除代理状态。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            删除是否成功
        """
        key = self._make_key(agent_id)
        return bool(self._client.delete(key))

    def exists(self, agent_id: str) -> bool:
        """检查代理状态是否存在。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            状态是否存在
        """
        key = self._make_key(agent_id)
        return bool(self._client.exists(key))

    def update_field(
        self,
        agent_id: str,
        field: str,
        value: Any
    ) -> bool:
        """更新状态中的单个字段。

        Args:
            agent_id: 代理唯一标识符
            field: 字段名
            value: 字段值

        Returns:
            更新是否成功
        """
        state = self.load(agent_id)
        if state is None:
            return False

        state[field] = value
        return self.save(agent_id, state)

    def list_agents(self) -> list[str]:
        """列出所有代理 ID。

        Returns:
            代理 ID 列表
        """
        pattern = f"{self._prefix}*"
        keys = self._client.keys(pattern)
        prefix_len = len(self._prefix)
        return [key[prefix_len:] for key in keys]
```

### SQLite 持久化方案

```python
import sqlite3
import json
import threading
from typing import Any, Optional
from contextlib import contextmanager
from pathlib import Path

class SQLiteStateStorage:
    """基于 SQLite 的状态持久化存储。"""

    def __init__(self, db_path: str = 'agent_states.db'):
        """初始化 SQLite 存储。

        Args:
            db_path: 数据库文件路径
        """
        self._db_path = db_path
        self._local = threading.local()
        self._init_database()

    def _get_connection(self) -> sqlite3.Connection:
        """获取线程本地数据库连接。"""
        if not hasattr(self._local, 'connection'):
            self._local.connection = sqlite3.connect(
                self._db_path,
                check_same_thread=False
            )
            self._local.connection.row_factory = sqlite3.Row
        return self._local.connection

    def _init_database(self) -> None:
        """初始化数据库表结构。"""
        conn = self._get_connection()
        conn.execute('''
            CREATE TABLE IF NOT EXISTS agent_states (
                agent_id TEXT PRIMARY KEY,
                state TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.execute('''
            CREATE INDEX IF NOT EXISTS idx_updated_at
            ON agent_states(updated_at)
        ''')
        conn.commit()

    @contextmanager
    def transaction(self):
        """事务上下文管理器。"""
        conn = self._get_connection()
        try:
            yield conn
            conn.commit()
        except Exception:
            conn.rollback()
            raise

    def save(self, agent_id: str, state: dict[str, Any]) -> bool:
        """保存代理状态（插入或更新）。

        Args:
            agent_id: 代理唯一标识符
            state: 状态数据字典

        Returns:
            保存是否成功
        """
        state_json = json.dumps(state, ensure_ascii=False)

        with self.transaction() as conn:
            conn.execute('''
                INSERT INTO agent_states (agent_id, state, updated_at)
                VALUES (?, ?, CURRENT_TIMESTAMP)
                ON CONFLICT(agent_id) DO UPDATE SET
                    state = excluded.state,
                    updated_at = CURRENT_TIMESTAMP
            ''', (agent_id, state_json))

        return True

    def load(self, agent_id: str) -> Optional[dict[str, Any]]:
        """加载代理状态。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            状态数据字典，不存在则返回 None
        """
        conn = self._get_connection()
        cursor = conn.execute(
            'SELECT state FROM agent_states WHERE agent_id = ?',
            (agent_id,)
        )
        row = cursor.fetchone()

        if row is None:
            return None
        return json.loads(row['state'])

    def delete(self, agent_id: str) -> bool:
        """删除代理状态。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            删除是否成功
        """
        with self.transaction() as conn:
            cursor = conn.execute(
                'DELETE FROM agent_states WHERE agent_id = ?',
                (agent_id,)
            )
            return cursor.rowcount > 0

    def list_agents(
        self,
        status: Optional[str] = None,
        limit: int = 100
    ) -> list[dict[str, Any]]:
        """列出代理状态。

        Args:
            status: 按状态过滤（可选）
            limit: 返回数量限制

        Returns:
            代理状态列表
        """
        conn = self._get_connection()

        if status:
            cursor = conn.execute('''
                SELECT agent_id, state, created_at, updated_at
                FROM agent_states
                WHERE json_extract(state, '$.status') = ?
                ORDER BY updated_at DESC
                LIMIT ?
            ''', (status, limit))
        else:
            cursor = conn.execute('''
                SELECT agent_id, state, created_at, updated_at
                FROM agent_states
                ORDER BY updated_at DESC
                LIMIT ?
            ''', (limit,))

        return [dict(row) for row in cursor.fetchall()]

    def cleanup_old_states(self, days: int = 30) -> int:
        """清理过期状态。

        Args:
            days: 保留天数

        Returns:
            删除的记录数
        """
        with self.transaction() as conn:
            cursor = conn.execute('''
                DELETE FROM agent_states
                WHERE updated_at < datetime('now', ?)
            ''', (f'-{days} days',))
            return cursor.rowcount
```

## 恢复机制

### 状态快照模式

```python
from dataclasses import dataclass, field
from typing import Any, Callable
from enum import Enum
import time

class AgentStatus(Enum):
    """代理状态枚举。"""
    IDLE = 'idle'
    RUNNING = 'running'
    PAUSED = 'paused'
    ERROR = 'error'
    COMPLETED = 'completed'

@dataclass
class StateSnapshot:
    """状态快照数据类。"""
    snapshot_id: str
    agent_id: str
    state: dict[str, Any]
    timestamp: float = field(default_factory=time.time)
    checksum: str = ''

    def __post_init__(self):
        """生成快照校验和。"""
        if not self.checksum:
            self.checksum = self._compute_checksum()

    def _compute_checksum(self) -> str:
        """计算状态校验和。"""
        import hashlib
        state_str = json.dumps(self.state, sort_keys=True)
        return hashlib.md5(state_str.encode()).hexdigest()

    def verify(self) -> bool:
        """验证快照完整性。"""
        return self.checksum == self._compute_checksum()

class SnapshotManager:
    """快照管理器。"""

    def __init__(
        self,
        storage: 'StateStorage',
        max_snapshots: int = 10
    ):
        """初始化快照管理器。

        Args:
            storage: 状态存储实例
            max_snapshots: 每个代理保留的最大快照数
        """
        self._storage = storage
        self._max_snapshots = max_snapshots

    def create_snapshot(
        self,
        agent_id: str,
        state: dict[str, Any]
    ) -> StateSnapshot:
        """创建状态快照。

        Args:
            agent_id: 代理唯一标识符
            state: 当前状态

        Returns:
            创建的快照对象
        """
        import uuid
        snapshot = StateSnapshot(
            snapshot_id=str(uuid.uuid4()),
            agent_id=agent_id,
            state=state.copy()
        )

        self._save_snapshot(snapshot)
        self._cleanup_old_snapshots(agent_id)

        return snapshot

    def restore_snapshot(
        self,
        snapshot_id: str
    ) -> Optional[dict[str, Any]]:
        """从快照恢复状态。

        Args:
            snapshot_id: 快照唯一标识符

        Returns:
            恢复的状态数据，失败返回 None
        """
        snapshot = self._load_snapshot(snapshot_id)
        if snapshot is None:
            return None

        if not snapshot.verify():
            raise ValueError(f"快照校验失败: {snapshot_id}")

        return snapshot.state

    def list_snapshots(self, agent_id: str) -> list[StateSnapshot]:
        """列出代理的所有快照。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            快照列表
        """
        pass

    def _save_snapshot(self, snapshot: StateSnapshot) -> None:
        """保存快照到存储。"""
        pass

    def _load_snapshot(self, snapshot_id: str) -> Optional[StateSnapshot]:
        """从存储加载快照。"""
        pass

    def _cleanup_old_snapshots(self, agent_id: str) -> None:
        """清理旧快照。"""
        pass
```

### 自动恢复机制

```python
from typing import TypeVar, Generic
from abc import ABC, abstractmethod
import logging

T = TypeVar('T')

class Recoverable(ABC, Generic[T]):
    """可恢复接口。"""

    @abstractmethod
    def get_state(self) -> dict[str, Any]:
        """获取当前状态。"""
        pass

    @abstractmethod
    def restore_state(self, state: dict[str, Any]) -> bool:
        """从状态恢复。"""
        pass

class RecoveryManager:
    """恢复管理器。"""

    def __init__(
        self,
        storage: 'StateStorage',
        snapshot_manager: SnapshotManager
    ):
        """初始化恢复管理器。

        Args:
            storage: 状态存储实例
            snapshot_manager: 快照管理器实例
        """
        self._storage = storage
        self._snapshot_manager = snapshot_manager
        self._logger = logging.getLogger(__name__)

    def checkpoint(self, agent: Recoverable) -> str:
        """创建检查点。

        Args:
            agent: 可恢复的代理实例

        Returns:
            快照 ID
        """
        state = agent.get_state()
        snapshot = self._snapshot_manager.create_snapshot(
            agent_id=state.get('agent_id', 'unknown'),
            state=state
        )
        return snapshot.snapshot_id

    def recover(
        self,
        agent: Recoverable,
        snapshot_id: Optional[str] = None
    ) -> bool:
        """恢复代理状态。

        Args:
            agent: 可恢复的代理实例
            snapshot_id: 指定快照 ID（可选）

        Returns:
            恢复是否成功
        """
        try:
            if snapshot_id:
                state = self._snapshot_manager.restore_snapshot(snapshot_id)
            else:
                agent_id = getattr(agent, 'agent_id', None)
                if not agent_id:
                    return False
                state = self._storage.load(agent_id)

            if state is None:
                self._logger.warning("未找到可恢复的状态")
                return False

            return agent.restore_state(state)

        except Exception as e:
            self._logger.error(f"恢复失败: {e}")
            return False

    def auto_recover_on_error(
        self,
        agent: Recoverable,
        max_retries: int = 3
    ) -> Callable:
        """错误自动恢复装饰器。

        Args:
            agent: 可恢复的代理实例
            max_retries: 最大重试次数

        Returns:
            装饰器函数
        """
        def decorator(func: Callable) -> Callable:
            def wrapper(*args, **kwargs):
                for attempt in range(max_retries):
                    try:
                        return func(*args, **kwargs)
                    except Exception as e:
                        self._logger.warning(
                            f"执行失败 (尝试 {attempt + 1}/{max_retries}): {e}"
                        )
                        if attempt < max_retries - 1:
                            self.recover(agent)
                        else:
                            raise
            return wrapper
        return decorator
```

## 并发控制

### 分布式锁模式

```python
import time
import uuid
from typing import Optional
from contextlib import contextmanager

class DistributedLock:
    """分布式锁实现。"""

    def __init__(
        self,
        redis_client,
        lock_prefix: str = 'agent:lock:',
        default_timeout: int = 30
    ):
        """初始化分布式锁。

        Args:
            redis_client: Redis 客户端实例
            lock_prefix: 锁键前缀
            default_timeout: 默认锁超时时间（秒）
        """
        self._redis = redis_client
        self._lock_prefix = lock_prefix
        self._default_timeout = default_timeout

    def _make_lock_key(self, resource_id: str) -> str:
        """生成锁键名。"""
        return f"{self._lock_prefix}{resource_id}"

    def acquire(
        self,
        resource_id: str,
        timeout: Optional[int] = None,
        wait: int = 0
    ) -> Optional[str]:
        """获取分布式锁。

        Args:
            resource_id: 资源唯一标识符
            timeout: 锁超时时间（秒）
            wait: 等待获取锁的最长时间（秒）

        Returns:
            锁令牌，获取失败返回 None
        """
        lock_key = self._make_lock_key(resource_id)
        lock_token = str(uuid.uuid4())
        timeout = timeout or self._default_timeout

        start_time = time.time()

        while True:
            acquired = self._redis.set(
                lock_key,
                lock_token,
                nx=True,
                ex=timeout
            )

            if acquired:
                return lock_token

            if wait <= 0 or (time.time() - start_time) >= wait:
                return None

            time.sleep(0.1)

    def release(
        self,
        resource_id: str,
        lock_token: str
    ) -> bool:
        """释放分布式锁。

        Args:
            resource_id: 资源唯一标识符
            lock_token: 获取锁时返回的令牌

        Returns:
            释放是否成功
        """
        lock_key = self._make_lock_key(resource_id)

        script = '''
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        '''

        result = self._redis.eval(script, 1, lock_key, lock_token)
        return bool(result)

    @contextmanager
    def locked(
        self,
        resource_id: str,
        timeout: Optional[int] = None,
        wait: int = 10
    ):
        """锁上下文管理器。

        Args:
            resource_id: 资源唯一标识符
            timeout: 锁超时时间（秒）
            wait: 等待获取锁的最长时间（秒）

        Yields:
            锁令牌

        Raises:
            TimeoutError: 获取锁超时
        """
        lock_token = self.acquire(resource_id, timeout, wait)

        if lock_token is None:
            raise TimeoutError(f"获取锁超时: {resource_id}")

        try:
            yield lock_token
        finally:
            self.release(resource_id, lock_token)

    def extend(
        self,
        resource_id: str,
        lock_token: str,
        additional_time: int
    ) -> bool:
        """延长锁的持有时间。

        Args:
            resource_id: 资源唯一标识符
            lock_token: 锁令牌
            additional_time: 延长的秒数

        Returns:
            延长是否成功
        """
        lock_key = self._make_lock_key(resource_id)

        script = '''
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("expire", KEYS[1], ARGV[2])
            else
                return 0
            end
        '''

        result = self._redis.eval(
            script, 1, lock_key, lock_token, additional_time
        )
        return bool(result)
```

### 乐观锁模式

```python
from dataclasses import dataclass
from typing import Any, Optional

@dataclass
class VersionedState:
    """带版本号的状态。"""
    agent_id: str
    state: dict[str, Any]
    version: int

class OptimisticLockManager:
    """乐观锁管理器。"""

    def __init__(self, storage: 'StateStorage'):
        """初始化乐观锁管理器。

        Args:
            storage: 状态存储实例
        """
        self._storage = storage

    def read(self, agent_id: str) -> Optional[VersionedState]:
        """读取带版本号的状态。

        Args:
            agent_id: 代理唯一标识符

        Returns:
            版本化状态，不存在返回 None
        """
        data = self._storage.load(agent_id)
        if data is None:
            return None

        return VersionedState(
            agent_id=agent_id,
            state=data.get('state', {}),
            version=data.get('version', 0)
        )

    def write(self, versioned_state: VersionedState) -> bool:
        """写入状态（带版本检查）。

        Args:
            versioned_state: 版本化状态

        Returns:
            写入是否成功（版本冲突返回 False）
        """
        current = self._storage.load(versioned_state.agent_id)
        current_version = current.get('version', 0) if current else 0

        if current_version != versioned_state.version:
            return False

        new_version = current_version + 1
        data = {
            'state': versioned_state.state,
            'version': new_version
        }

        return self._storage.save(versioned_state.agent_id, data)

    def update_with_retry(
        self,
        agent_id: str,
        update_fn: Callable[[dict[str, Any]], dict[str, Any]],
        max_retries: int = 3
    ) -> bool:
        """带重试的状态更新。

        Args:
            agent_id: 代理唯一标识符
            update_fn: 状态更新函数
            max_retries: 最大重试次数

        Returns:
            更新是否成功
        """
        for attempt in range(max_retries):
            versioned = self.read(agent_id)
            if versioned is None:
                versioned = VersionedState(
                    agent_id=agent_id,
                    state={},
                    version=0
                )

            new_state = update_fn(versioned.state.copy())
            versioned.state = new_state

            if self.write(versioned):
                return True

        return False
```

### 读写锁模式

```python
import threading
from contextlib import contextmanager

class ReadWriteLock:
    """读写锁实现。"""

    def __init__(self):
        """初始化读写锁。"""
        self._readers = 0
        self._writers = 0
        self._read_ready = threading.Condition(threading.Lock())
        self._write_ready = threading.Condition(threading.Lock())

    @contextmanager
    def read_lock(self):
        """读锁上下文管理器。"""
        with self._read_ready:
            while self._writers > 0:
                self._read_ready.wait()
            self._readers += 1

        try:
            yield
        finally:
            with self._read_ready:
                self._readers -= 1
                if self._readers == 0:
                    self._read_ready.notify_all()

    @contextmanager
    def write_lock(self):
        """写锁上下文管理器。"""
        with self._write_ready:
            self._writers += 1

        with self._read_ready:
            while self._readers > 0:
                self._read_ready.wait()

        try:
            yield
        finally:
            with self._write_ready:
                self._writers -= 1

            with self._read_ready:
                self._read_ready.notify_all()

class ConcurrentStateStorage:
    """并发安全的状态存储。"""

    def __init__(self, storage: 'StateStorage'):
        """初始化并发状态存储。

        Args:
            storage: 底层状态存储实例
        """
        self._storage = storage
        self._locks: dict[str, ReadWriteLock] = {}
        self._locks_lock = threading.Lock()

    def _get_lock(self, agent_id: str) -> ReadWriteLock:
        """获取代理对应的读写锁。"""
        with self._locks_lock:
            if agent_id not in self._locks:
                self._locks[agent_id] = ReadWriteLock()
            return self._locks[agent_id]

    def read(self, agent_id: str) -> Optional[dict[str, Any]]:
        """读取状态（读锁保护）。"""
        lock = self._get_lock(agent_id)
        with lock.read_lock():
            return self._storage.load(agent_id)

    def write(
        self,
        agent_id: str,
        state: dict[str, Any]
    ) -> bool:
        """写入状态（写锁保护）。"""
        lock = self._get_lock(agent_id)
        with lock.write_lock():
            return self._storage.save(agent_id, state)

    def update(
        self,
        agent_id: str,
        update_fn: Callable[[dict[str, Any]], dict[str, Any]]
    ) -> bool:
        """更新状态（写锁保护）。"""
        lock = self._get_lock(agent_id)
        with lock.write_lock():
            current = self._storage.load(agent_id) or {}
            updated = update_fn(current.copy())
            return self._storage.save(agent_id, updated)
```

## 并发控制模式对比

| 模式 | 适用场景 | 优点 | 缺点 |
|------|----------|------|------|
| 分布式锁 | 分布式环境、强一致性 | 简单可靠、跨进程 | 需要外部存储、性能开销 |
| 乐观锁 | 读多写少、低冲突 | 无锁开销、高并发 | 冲突时需重试 |
| 读写锁 | 读多写少、单进程 | 并发读取、性能好 | 仅限单进程内 |

## 状态生命周期管理

```python
from enum import Enum
from typing import Callable
from dataclasses import dataclass

class StateTransition(Enum):
    """状态转换枚举。"""
    INITIALIZE = 'initialize'
    START = 'start'
    PAUSE = 'pause'
    RESUME = 'resume'
    COMPLETE = 'complete'
    ERROR = 'error'
    RESET = 'reset'

@dataclass
class TransitionRule:
    """状态转换规则。"""
    from_status: AgentStatus
    to_status: AgentStatus
    validator: Callable[[dict[str, Any]], bool] | None = None

class StateMachine:
    """状态机管理器。"""

    TRANSITIONS: dict[StateTransition, TransitionRule] = {
        StateTransition.INITIALIZE: TransitionRule(
            from_status=AgentStatus.IDLE,
            to_status=AgentStatus.IDLE
        ),
        StateTransition.START: TransitionRule(
            from_status=AgentStatus.IDLE,
            to_status=AgentStatus.RUNNING
        ),
        StateTransition.PAUSE: TransitionRule(
            from_status=AgentStatus.RUNNING,
            to_status=AgentStatus.PAUSED
        ),
        StateTransition.RESUME: TransitionRule(
            from_status=AgentStatus.PAUSED,
            to_status=AgentStatus.RUNNING
        ),
        StateTransition.COMPLETE: TransitionRule(
            from_status=AgentStatus.RUNNING,
            to_status=AgentStatus.COMPLETED
        ),
        StateTransition.ERROR: TransitionRule(
            from_status=AgentStatus.RUNNING,
            to_status=AgentStatus.ERROR
        ),
        StateTransition.RESET: TransitionRule(
            from_status=AgentStatus.ERROR,
            to_status=AgentStatus.IDLE
        ),
    }

    def __init__(self, storage: 'StateStorage'):
        """初始化状态机。

        Args:
            storage: 状态存储实例
        """
        self._storage = storage

    def can_transition(
        self,
        agent_id: str,
        transition: StateTransition
    ) -> bool:
        """检查是否可以执行状态转换。

        Args:
            agent_id: 代理唯一标识符
            transition: 状态转换类型

        Returns:
            是否可以转换
        """
        rule = self.TRANSITIONS.get(transition)
        if rule is None:
            return False

        state = self._storage.load(agent_id)
        if state is None:
            return False

        current_status = AgentStatus(state.get('status', 'idle'))
        return current_status == rule.from_status

    def transition(
        self,
        agent_id: str,
        transition: StateTransition,
        context: dict[str, Any] | None = None
    ) -> bool:
        """执行状态转换。

        Args:
            agent_id: 代理唯一标识符
            transition: 状态转换类型
            context: 转换上下文数据

        Returns:
            转换是否成功
        """
        if not self.can_transition(agent_id, transition):
            return False

        rule = self.TRANSITIONS[transition]
        state = self._storage.load(agent_id) or {}

        if rule.validator and not rule.validator(state):
            return False

        state['status'] = rule.to_status.value
        state['last_transition'] = transition.value

        if context:
            state['context'] = {**state.get('context', {}), **context}

        return self._storage.save(agent_id, state)
```

## Anti-Patterns to Avoid

```python
# Bad: 状态存储在内存中，重启丢失
class InMemoryAgent:
    def __init__(self):
        self._state = {}

# Good: 状态持久化到外部存储
class PersistentAgent:
    def __init__(self, storage: StateStorage):
        self._storage = storage

# Bad: 无锁并发访问
class UnsafeStateAccess:
    def update(self, key: str, value: Any):
        self._state[key] = value

# Good: 使用锁保护并发访问
class SafeStateAccess:
    def __init__(self):
        self._lock = threading.Lock()
        self._state = {}

    def update(self, key: str, value: Any):
        with self._lock:
            self._state[key] = value

# Bad: 状态更新无版本控制
def update_state(agent_id: str, state: dict):
    storage.save(agent_id, state)

# Good: 使用乐观锁版本控制
def update_state_safe(agent_id: str, state: dict, expected_version: int):
    current = storage.load(agent_id)
    if current.get('version') != expected_version:
        raise VersionConflictError()
    state['version'] = expected_version + 1
    storage.save(agent_id, state)

# Bad: 锁未释放
def process_with_lock(agent_id: str):
    lock.acquire(agent_id)
    process()
    lock.release(agent_id)

# Good: 使用上下文管理器确保锁释放
def process_with_lock(agent_id: str):
    with lock.locked(agent_id):
        process()
```

**Remember**: 代理状态管理必须保证持久性、一致性和可恢复性。选择合适的持久化方案和并发控制模式，确保系统在故障后能够正确恢复。
