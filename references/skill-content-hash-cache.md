# SHA-256 内容哈希缓存参考

基于内容哈希的缓存策略设计、哈希计算实现、失效检测机制和性能优化，用于构建高效的缓存系统。

## When to Activate

- 实现基于内容的缓存系统
- 优化文件/数据变更检测
- 构建增量更新机制
- 设计内容寻址存储

## Core Principles

### 1. 内容寻址

相同内容产生相同哈希，实现精确的变更检测。

```python
import hashlib

def compute_hash(content: bytes) -> str:
    """计算内容的 SHA-256 哈希值。"""
    return hashlib.sha256(content).hexdigest()

content1 = b"Hello, World!"
content2 = b"Hello, World!"
content3 = b"Hello, Python!"

print(compute_hash(content1) == compute_hash(content2))
print(compute_hash(content1) == compute_hash(content3))
```

### 2. 增量更新

仅当内容变化时才更新缓存，减少不必要的计算。

```python
from dataclasses import dataclass
from typing import Optional
import hashlib

@dataclass
class CacheEntry:
    """缓存条目结构。"""
    content_hash: str
    data: bytes
    metadata: dict

class ContentBasedCache:
    """基于内容哈希的缓存系统。"""
    
    def __init__(self):
        self._cache: dict[str, CacheEntry] = {}
        self._key_to_hash: dict[str, str] = {}
    
    def get_or_compute(
        self, 
        key: str, 
        content: bytes,
        compute_fn: callable
    ) -> bytes:
        """获取缓存或计算新值。"""
        content_hash = hashlib.sha256(content).hexdigest()
        
        if key in self._key_to_hash:
            if self._key_to_hash[key] == content_hash:
                return self._cache[content_hash].data
        
        result = compute_fn(content)
        self._cache[content_hash] = CacheEntry(
            content_hash=content_hash,
            data=result,
            metadata={}
        )
        self._key_to_hash[key] = content_hash
        return result
```

### 3. 失效检测

通过哈希比对快速检测内容变更。

```python
def detect_changes(
    old_hashes: dict[str, str],
    new_hashes: dict[str, str]
) -> tuple[set[str], set[str], set[str]]:
    """
    检测内容变更。
    
    返回:
        tuple: (新增文件, 修改文件, 删除文件)
    """
    old_keys = set(old_hashes.keys())
    new_keys = set(new_hashes.keys())
    
    added = new_keys - old_keys
    deleted = old_keys - new_keys
    common = old_keys & new_keys
    
    modified = {
        key for key in common 
        if old_hashes[key] != new_hashes[key]
    }
    
    return added, modified, deleted
```

## Hash Calculation Patterns

### 文件哈希计算

```python
import hashlib
from pathlib import Path
from typing import Union

def hash_file(
    file_path: Union[str, Path],
    chunk_size: int = 8192
) -> str:
    """
    计算文件的 SHA-256 哈希值。
    
    参数:
        file_path: 文件路径
        chunk_size: 分块大小（字节）
    
    返回:
        str: 十六进制哈希字符串
    """
    sha256 = hashlib.sha256()
    
    with open(file_path, 'rb') as f:
        while chunk := f.read(chunk_size):
            sha256.update(chunk)
    
    return sha256.hexdigest()

def hash_file_fast(file_path: Union[str, Path]) -> str:
    """
    快速文件哈希（使用文件元数据）。
    
    适用于大文件的快速变更检测，
    但不如内容哈希精确。
    """
    import os
    
    stat = os.stat(file_path)
    content = f"{file_path}:{stat.st_size}:{stat.st_mtime}"
    return hashlib.sha256(content.encode()).hexdigest()
```

### 目录哈希计算

```python
import hashlib
from pathlib import Path
from typing import Optional

def hash_directory(
    dir_path: Union[str, Path],
    exclude_patterns: Optional[list[str]] = None,
    follow_symlinks: bool = False
) -> str:
    """
    计算目录的递归哈希值。
    
    参数:
        dir_path: 目录路径
        exclude_patterns: 排除的文件模式列表
        follow_symlinks: 是否跟随符号链接
    
    返回:
        str: 目录内容的哈希值
    """
    exclude_patterns = exclude_patterns or []
    dir_path = Path(dir_path)
    
    sha256 = hashlib.sha256()
    
    for file_path in sorted(dir_path.rglob('*')):
        if not file_path.is_file():
            continue
        
        if any(file_path.match(p) for p in exclude_patterns):
            continue
        
        relative_path = file_path.relative_to(dir_path)
        sha256.update(str(relative_path).encode())
        sha256.update(hash_file(file_path).encode())
    
    return sha256.hexdigest()
```

### 增量哈希计算

```python
class IncrementalHasher:
    """增量哈希计算器。"""
    
    def __init__(self, algorithm: str = 'sha256'):
        """
        初始化增量哈希器。
        
        参数:
            algorithm: 哈希算法名称
        """
        self._hasher = hashlib.new(algorithm)
        self._parts: list[bytes] = []
    
    def update(self, data: bytes) -> 'IncrementalHasher':
        """
        添加数据到哈希计算。
        
        返回:
            IncrementalHasher: 支持链式调用
        """
        self._hasher.update(data)
        self._parts.append(data)
        return self
    
    def update_file(self, file_path: Union[str, Path]) -> 'IncrementalHasher':
        """添加文件内容到哈希计算。"""
        with open(file_path, 'rb') as f:
            while chunk := f.read(8192):
                self.update(chunk)
        return self
    
    def digest(self) -> str:
        """获取十六进制哈希值。"""
        return self._hasher.hexdigest()
    
    def reset(self) -> None:
        """重置哈希计算器。"""
        self._hasher = hashlib.new('sha256')
        self._parts.clear()
```

## Cache Strategy Design

### LRU 缓存与内容哈希结合

```python
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Optional
import hashlib
import threading

@dataclass
class CacheItem:
    """缓存项。"""
    content_hash: str
    value: Any
    created_at: datetime = field(default_factory=datetime.now)
    last_accessed: datetime = field(default_factory=datetime.now)
    access_count: int = 0
    size_bytes: int = 0

class HashBasedLRUCache:
    """
    基于内容哈希的 LRU 缓存。
    
    特性:
        - LRU 淘汰策略
        - 内容去重
        - 线程安全
        - 大小限制
    """
    
    def __init__(
        self,
        max_size: int = 1000,
        max_bytes: int = 100 * 1024 * 1024
    ):
        """
        初始化缓存。
        
        参数:
            max_size: 最大条目数
            max_bytes: 最大字节数
        """
        self._cache: OrderedDict[str, CacheItem] = OrderedDict()
        self._hash_to_keys: dict[str, set[str]] = {}
        self._lock = threading.RLock()
        self._max_size = max_size
        self._max_bytes = max_bytes
        self._current_bytes = 0
    
    def _compute_hash(self, content: bytes) -> str:
        """计算内容哈希。"""
        return hashlib.sha256(content).hexdigest()
    
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值。"""
        with self._lock:
            if key not in self._cache:
                return None
            
            item = self._cache.pop(key)
            item.last_accessed = datetime.now()
            item.access_count += 1
            self._cache[key] = item
            
            return item.value
    
    def set(
        self, 
        key: str, 
        content: bytes, 
        value: Any
    ) -> str:
        """
        设置缓存值。
        
        返回:
            str: 内容哈希值
        """
        content_hash = self._compute_hash(content)
        size = len(content) if isinstance(value, bytes) else 0
        
        with self._lock:
            if key in self._cache:
                old_item = self._cache.pop(key)
                self._current_bytes -= old_item.size_bytes
                self._hash_to_keys[old_item.content_hash].discard(key)
            
            while (len(self._cache) >= self._max_size or 
                   self._current_bytes + size > self._max_bytes):
                self._evict_lru()
            
            item = CacheItem(
                content_hash=content_hash,
                value=value,
                size_bytes=size
            )
            
            self._cache[key] = item
            self._current_bytes += size
            
            if content_hash not in self._hash_to_keys:
                self._hash_to_keys[content_hash] = set()
            self._hash_to_keys[content_hash].add(key)
            
            return content_hash
    
    def _evict_lru(self) -> None:
        """淘汰最近最少使用的条目。"""
        if not self._cache:
            return
        
        key, item = self._cache.popitem(last=False)
        self._current_bytes -= item.size_bytes
        self._hash_to_keys[item.content_hash].discard(key)
    
    def get_by_hash(self, content_hash: str) -> list[Any]:
        """根据哈希获取所有相关值。"""
        with self._lock:
            keys = self._hash_to_keys.get(content_hash, set())
            return [self._cache[k].value for k in keys if k in self._cache]
    
    def clear(self) -> None:
        """清空缓存。"""
        with self._lock:
            self._cache.clear()
            self._hash_to_keys.clear()
            self._current_bytes = 0
    
    def stats(self) -> dict:
        """获取缓存统计信息。"""
        with self._lock:
            return {
                'size': len(self._cache),
                'max_size': self._max_size,
                'bytes': self._current_bytes,
                'max_bytes': self._max_bytes,
                'unique_hashes': len(self._hash_to_keys),
                'dedup_ratio': (
                    1 - len(self._hash_to_keys) / max(len(self._cache), 1)
                )
            }
```

### 分层缓存策略

```python
from abc import ABC, abstractmethod
from typing import Optional, Any
import hashlib

class CacheLayer(ABC):
    """缓存层抽象基类。"""
    
    @abstractmethod
    def get(self, key: str) -> Optional[Any]:
        """获取缓存值。"""
        pass
    
    @abstractmethod
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        """设置缓存值。"""
        pass
    
    @abstractmethod
    def delete(self, key: str) -> None:
        """删除缓存值。"""
        pass

class MemoryCacheLayer(CacheLayer):
    """内存缓存层。"""
    
    def __init__(self, max_size: int = 1000):
        self._cache: dict[str, Any] = {}
        self._max_size = max_size
    
    def get(self, key: str) -> Optional[Any]:
        return self._cache.get(key)
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        if len(self._cache) >= self._max_size:
            self._cache.pop(next(iter(self._cache)))
        self._cache[key] = value
    
    def delete(self, key: str) -> None:
        self._cache.pop(key, None)

class DiskCacheLayer(CacheLayer):
    """磁盘缓存层。"""
    
    def __init__(self, cache_dir: str):
        from pathlib import Path
        self._cache_dir = Path(cache_dir)
        self._cache_dir.mkdir(parents=True, exist_ok=True)
    
    def _get_path(self, key: str) -> 'Path':
        return self._cache_dir / f"{hashlib.sha256(key.encode()).hexdigest()}.cache"
    
    def get(self, key: str) -> Optional[Any]:
        import pickle
        path = self._get_path(key)
        if path.exists():
            with open(path, 'rb') as f:
                return pickle.load(f)
        return None
    
    def set(self, key: str, value: Any, ttl: Optional[int] = None) -> None:
        import pickle
        path = self._get_path(key)
        with open(path, 'wb') as f:
            pickle.dump(value, f)
    
    def delete(self, key: str) -> None:
        path = self._get_path(key)
        path.unlink(missing_ok=True)

class TieredCache:
    """分层缓存系统。"""
    
    def __init__(self, layers: list[CacheLayer]):
        self._layers = layers
    
    def get(self, key: str) -> Optional[Any]:
        """从各层获取缓存值，并回填。"""
        for i, layer in enumerate(self._layers):
            value = layer.get(key)
            if value is not None:
                for j in range(i):
                    self._layers[j].set(key, value)
                return value
        return None
    
    def set(self, key: str, value: Any) -> None:
        """设置所有层的缓存值。"""
        for layer in self._layers:
            layer.set(key, value)
    
    def delete(self, key: str) -> None:
        """删除所有层的缓存值。"""
        for layer in self._layers:
            layer.delete(key)
```

## Invalidation Mechanisms

### 基于哈希的失效检测

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable, Optional
import hashlib
import json

@dataclass
class HashRecord:
    """哈希记录。"""
    content_hash: str
    timestamp: datetime = field(default_factory=datetime.now)
    metadata: dict = field(default_factory=dict)

class ContentChangeDetector:
    """内容变更检测器。"""
    
    def __init__(self):
        self._records: dict[str, HashRecord] = {}
    
    def register(
        self, 
        key: str, 
        content: bytes,
        metadata: Optional[dict] = None
    ) -> str:
        """
        注册内容并返回哈希值。
        
        返回:
            str: 内容哈希值
        """
        content_hash = hashlib.sha256(content).hexdigest()
        
        self._records[key] = HashRecord(
            content_hash=content_hash,
            metadata=metadata or {}
        )
        
        return content_hash
    
    def check_changed(self, key: str, content: bytes) -> bool:
        """
        检查内容是否变更。
        
        返回:
            bool: True 表示内容已变更
        """
        new_hash = hashlib.sha256(content).hexdigest()
        
        if key not in self._records:
            return True
        
        return self._records[key].content_hash != new_hash
    
    def update_if_changed(
        self, 
        key: str, 
        content: bytes,
        callback: Optional[Callable[[str, str], None]] = None
    ) -> tuple[bool, str]:
        """
        如果内容变更则更新记录。
        
        返回:
            tuple: (是否变更, 新哈希值)
        """
        new_hash = hashlib.sha256(content).hexdigest()
        
        if key in self._records:
            old_hash = self._records[key].content_hash
            if old_hash == new_hash:
                return False, new_hash
        
        self._records[key] = HashRecord(content_hash=new_hash)
        
        if callback:
            callback(key, new_hash)
        
        return True, new_hash
    
    def get_hash(self, key: str) -> Optional[str]:
        """获取已记录的哈希值。"""
        if key in self._records:
            return self._records[key].content_hash
        return None
    
    def batch_check(
        self, 
        items: dict[str, bytes]
    ) -> tuple[dict[str, str], set[str]]:
        """
        批量检查变更。
        
        参数:
            items: {key: content} 字典
        
        返回:
            tuple: (变更的键和哈希, 未变更的键集合)
        """
        changed = {}
        unchanged = set()
        
        for key, content in items.items():
            new_hash = hashlib.sha256(content).hexdigest()
            
            if key in self._records:
                if self._records[key].content_hash == new_hash:
                    unchanged.add(key)
                    continue
            
            changed[key] = new_hash
            self._records[key] = HashRecord(content_hash=new_hash)
        
        return changed, unchanged
```

### 依赖追踪失效

```python
from collections import defaultdict
from typing import Optional
import hashlib

class DependencyTracker:
    """依赖追踪器，用于级联失效。"""
    
    def __init__(self):
        self._dependencies: dict[str, set[str]] = defaultdict(set)
        self._dependents: dict[str, set[str]] = defaultdict(set)
        self._hashes: dict[str, str] = {}
    
    def register(
        self, 
        key: str, 
        content: bytes,
        dependencies: Optional[set[str]] = None
    ) -> str:
        """
        注册键及其依赖关系。
        
        参数:
            key: 键名
            content: 内容
            dependencies: 依赖的键集合
        
        返回:
            str: 内容哈希值
        """
        content_hash = hashlib.sha256(content).hexdigest()
        self._hashes[key] = content_hash
        
        if dependencies:
            for dep in dependencies:
                self._dependencies[key].add(dep)
                self._dependents[dep].add(key)
        
        return content_hash
    
    def invalidate(self, key: str) -> set[str]:
        """
        失效一个键及其所有依赖者。
        
        返回:
            set: 所有被失效的键
        """
        invalidated = {key}
        
        def cascade(k: str):
            for dependent in self._dependents.get(k, set()):
                if dependent not in invalidated:
                    invalidated.add(dependent)
                    cascade(dependent)
        
        cascade(key)
        
        for k in invalidated:
            self._hashes.pop(k, None)
        
        return invalidated
    
    def check_valid(self, key: str) -> bool:
        """检查键是否有效（所有依赖未变更）。"""
        if key not in self._hashes:
            return False
        
        for dep in self._dependencies.get(key, set()):
            if dep not in self._hashes:
                return False
        
        return True
    
    def compute_composite_hash(self, key: str) -> Optional[str]:
        """计算包含依赖的组合哈希。"""
        if key not in self._hashes:
            return None
        
        hasher = hashlib.sha256()
        hasher.update(self._hashes[key].encode())
        
        for dep in sorted(self._dependencies.get(key, set())):
            if dep in self._hashes:
                hasher.update(self._hashes[dep].encode())
        
        return hasher.hexdigest()
```

## Complete Implementation Example

```python
"""
完整的基于 SHA-256 内容哈希的缓存系统实现。
"""
import hashlib
import json
import threading
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Callable, Generic, Optional, TypeVar

T = TypeVar('T')

@dataclass
class CacheEntry(Generic[T]):
    """缓存条目。"""
    content_hash: str
    value: T
    created_at: float = field(default_factory=time.time)
    last_accessed: float = field(default_factory=time.time)
    access_count: int = 0
    ttl: Optional[float] = None
    size: int = 0

class ContentHashCache(Generic[T]):
    """
    基于内容哈希的缓存系统。
    
    特性:
        - 内容去重
        - LRU 淘汰
        - TTL 支持
        - 线程安全
        - 统计信息
    """
    
    def __init__(
        self,
        max_entries: int = 10000,
        max_size_bytes: int = 1024 * 1024 * 1024,
        default_ttl: Optional[float] = None
    ):
        """
        初始化缓存系统。
        
        参数:
            max_entries: 最大条目数
            max_size_bytes: 最大缓存大小（字节）
            default_ttl: 默认过期时间（秒）
        """
        self._cache: OrderedDict[str, CacheEntry[T]] = OrderedDict()
        self._hash_index: dict[str, set[str]] = {}
        self._lock = threading.RLock()
        self._max_entries = max_entries
        self._max_size_bytes = max_size_bytes
        self._default_ttl = default_ttl
        self._current_size = 0
        
        self._stats = {
            'hits': 0,
            'misses': 0,
            'evictions': 0,
            'dedup_hits': 0
        }
    
    @staticmethod
    def compute_hash(content: bytes | str) -> str:
        """
        计算内容的 SHA-256 哈希值。
        
        参数:
            content: 字节或字符串内容
        
        返回:
            str: 十六进制哈希字符串
        """
        if isinstance(content, str):
            content = content.encode('utf-8')
        return hashlib.sha256(content).hexdigest()
    
    def get(self, key: str) -> Optional[T]:
        """
        获取缓存值。
        
        参数:
            key: 缓存键
        
        返回:
            缓存值或 None
        """
        with self._lock:
            if key not in self._cache:
                self._stats['misses'] += 1
                return None
            
            entry = self._cache[key]
            
            if entry.ttl and time.time() - entry.created_at > entry.ttl:
                self._remove_entry(key)
                self._stats['misses'] += 1
                return None
            
            self._cache.move_to_end(key)
            entry.last_accessed = time.time()
            entry.access_count += 1
            self._stats['hits'] += 1
            
            return entry.value
    
    def set(
        self,
        key: str,
        content: bytes | str,
        value: T,
        ttl: Optional[float] = None,
        size: int = 0
    ) -> str:
        """
        设置缓存值。
        
        参数:
            key: 缓存键
            content: 用于计算哈希的内容
            value: 缓存值
            ttl: 过期时间（秒）
            size: 值的大小（字节）
        
        返回:
            str: 内容哈希值
        """
        content_hash = self.compute_hash(content)
        
        with self._lock:
            if key in self._cache:
                self._remove_entry(key)
            
            while (len(self._cache) >= self._max_entries or
                   self._current_size + size > self._max_size_bytes):
                self._evict_lru()
            
            entry = CacheEntry(
                content_hash=content_hash,
                value=value,
                ttl=ttl or self._default_ttl,
                size=size
            )
            
            self._cache[key] = entry
            self._current_size += size
            
            if content_hash not in self._hash_index:
                self._hash_index[content_hash] = set()
            self._hash_index[content_hash].add(key)
            
            return content_hash
    
    def get_or_compute(
        self,
        key: str,
        content: bytes | str,
        compute_fn: Callable[[bytes | str], T],
        ttl: Optional[float] = None
    ) -> tuple[T, bool]:
        """
        获取缓存值或计算新值。
        
        参数:
            key: 缓存键
            content: 用于计算哈希的内容
            compute_fn: 计算函数
            ttl: 过期时间
        
        返回:
            tuple: (值, 是否来自缓存)
        """
        content_hash = self.compute_hash(content)
        
        with self._lock:
            if key in self._cache:
                entry = self._cache[key]
                if entry.content_hash == content_hash:
                    if not entry.ttl or time.time() - entry.created_at <= entry.ttl:
                        entry.last_accessed = time.time()
                        entry.access_count += 1
                        self._stats['hits'] += 1
                        return entry.value, True
            
            self._stats['misses'] += 1
            value = compute_fn(content)
            self.set(key, content, value, ttl)
            return value, False
    
    def find_by_hash(self, content_hash: str) -> list[tuple[str, T]]:
        """
        根据内容哈希查找所有相关条目。
        
        返回:
            list: [(key, value), ...]
        """
        with self._lock:
            keys = self._hash_index.get(content_hash, set())
            return [(k, self._cache[k].value) for k in keys if k in self._cache]
    
    def invalidate(self, key: str) -> bool:
        """
        使指定键失效。
        
        返回:
            bool: 是否成功失效
        """
        with self._lock:
            if key in self._cache:
                self._remove_entry(key)
                return True
            return False
    
    def invalidate_by_hash(self, content_hash: str) -> int:
        """
        使具有相同哈希的所有条目失效。
        
        返回:
            int: 失效的条目数
        """
        with self._lock:
            keys = self._hash_index.get(content_hash, set()).copy()
            for key in keys:
                self._remove_entry(key)
            return len(keys)
    
    def _remove_entry(self, key: str) -> None:
        """移除缓存条目。"""
        if key in self._cache:
            entry = self._cache.pop(key)
            self._current_size -= entry.size
            self._hash_index[entry.content_hash].discard(key)
            if not self._hash_index[entry.content_hash]:
                del self._hash_index[entry.content_hash]
    
    def _evict_lru(self) -> None:
        """淘汰最近最少使用的条目。"""
        if not self._cache:
            return
        
        key, entry = self._cache.popitem(last=False)
        self._current_size -= entry.size
        self._hash_index[entry.content_hash].discard(key)
        if not self._hash_index[entry.content_hash]:
            del self._hash_index[entry.content_hash]
        self._stats['evictions'] += 1
    
    def clear(self) -> None:
        """清空缓存。"""
        with self._lock:
            self._cache.clear()
            self._hash_index.clear()
            self._current_size = 0
    
    def cleanup_expired(self) -> int:
        """
        清理过期条目。
        
        返回:
            int: 清理的条目数
        """
        with self._lock:
            now = time.time()
            expired = [
                k for k, v in self._cache.items()
                if v.ttl and now - v.created_at > v.ttl
            ]
            for key in expired:
                self._remove_entry(key)
            return len(expired)
    
    def stats(self) -> dict:
        """获取缓存统计信息。"""
        with self._lock:
            total_requests = self._stats['hits'] + self._stats['misses']
            hit_rate = self._stats['hits'] / total_requests if total_requests else 0
            
            return {
                'entries': len(self._cache),
                'max_entries': self._max_entries,
                'size_bytes': self._current_size,
                'max_size_bytes': self._max_size_bytes,
                'unique_hashes': len(self._hash_index),
                'dedup_ratio': 1 - len(self._hash_index) / max(len(self._cache), 1),
                'hits': self._stats['hits'],
                'misses': self._stats['misses'],
                'hit_rate': hit_rate,
                'evictions': self._stats['evictions']
            }
```

## Performance Analysis

### 哈希计算性能对比

```python
import hashlib
import time
from typing import Callable

def benchmark_hash_algorithms(
    data: bytes,
    iterations: int = 10000
) -> dict[str, float]:
    """
    对比不同哈希算法的性能。
    
    返回:
        dict: {算法名: 平均耗时（毫秒）}
    """
    algorithms = ['md5', 'sha1', 'sha256', 'sha512', 'blake2b', 'blake2s']
    results = {}
    
    for algo in algorithms:
        hasher = hashlib.new(algo)
        
        start = time.perf_counter()
        for _ in range(iterations):
            hasher_copy = hasher.copy()
            hasher_copy.update(data)
            hasher_copy.digest()
        elapsed = time.perf_counter() - start
        
        results[algo] = (elapsed / iterations) * 1000
    
    return results

def benchmark_file_hashing(
    file_path: str,
    chunk_sizes: list[int] = [1024, 4096, 8192, 65536]
) -> dict[int, float]:
    """
    对比不同分块大小的文件哈希性能。
    
    返回:
        dict: {分块大小: 耗时（秒）}
    """
    results = {}
    
    for chunk_size in chunk_sizes:
        sha256 = hashlib.sha256()
        
        start = time.perf_counter()
        with open(file_path, 'rb') as f:
            while chunk := f.read(chunk_size):
                sha256.update(chunk)
        elapsed = time.perf_counter() - start
        
        results[chunk_size] = elapsed
    
    return results
```

### 缓存性能测试

```python
import random
import string
import time
from typing import Any

def generate_test_data(size: int) -> bytes:
    """生成测试数据。"""
    return ''.join(
        random.choices(string.ascii_letters + string.digits, k=size)
    ).encode()

def benchmark_cache_operations(
    cache: ContentHashCache,
    operations: int = 10000,
    data_size: int = 1024
) -> dict[str, float]:
    """
    基准测试缓存操作性能。
    
    返回:
        dict: {操作类型: 平均耗时（微秒）}
    """
    test_data = [generate_test_data(data_size) for _ in range(operations)]
    
    start = time.perf_counter()
    for i, data in enumerate(test_data):
        cache.set(f"key_{i}", data, data)
    set_time = (time.perf_counter() - start) / operations * 1_000_000
    
    start = time.perf_counter()
    for i in range(operations):
        cache.get(f"key_{i}")
    get_time = (time.perf_counter() - start) / operations * 1_000_000
    
    start = time.perf_counter()
    for i, data in enumerate(test_data):
        cache.get_or_compute(
            f"key_{i}",
            data,
            lambda x: x
        )
    compute_time = (time.perf_counter() - start) / operations * 1_000_000
    
    return {
        'set_us': set_time,
        'get_us': get_time,
        'get_or_compute_us': compute_time
    }
```

### 性能对比表

| 操作 | 无缓存 | 哈希缓存 | 性能提升 |
|------|--------|----------|----------|
| 文件变更检测 | O(n) 全量读取 | O(1) 哈希比对 | 100x+ |
| 内容去重 | 无 | 自动去重 | 存储节省 30-70% |
| 增量构建 | 全量重建 | 仅变更部分 | 10x-100x |
| 缓存命中 | - | ~1μs | - |

| 哈希算法 | 1KB 数据 | 1MB 数据 | 100MB 数据 | 安全性 |
|----------|----------|----------|------------|--------|
| MD5 | 0.002ms | 1.2ms | 120ms | 低 |
| SHA-1 | 0.003ms | 1.8ms | 180ms | 中 |
| SHA-256 | 0.004ms | 2.5ms | 250ms | 高 |
| BLAKE2b | 0.002ms | 1.0ms | 100ms | 高 |

## Quick Reference

| 模式 | 用途 | 复杂度 |
|------|------|--------|
| 内容寻址 | 精确变更检测 | O(1) |
| 增量哈希 | 流式/大文件处理 | O(n) |
| 分层缓存 | 多级存储优化 | O(layers) |
| 依赖追踪 | 级联失效 | O(dependencies) |

## Anti-Patterns to Avoid

```python
# 错误：使用可变对象作为哈希输入
def bad_hash(data: list) -> str:
    return hashlib.sha256(str(data).encode()).hexdigest()

# 正确：使用不可变序列
def good_hash(data: tuple) -> str:
    return hashlib.sha256(json.dumps(data).encode()).hexdigest()

# 错误：忽略哈希碰撞（虽然概率极低）
def bad_compare(content1: bytes, content2: bytes) -> bool:
    return hashlib.sha256(content1).hexdigest() == hashlib.sha256(content2).hexdigest()

# 正确：碰撞时进行内容比对
def safe_compare(content1: bytes, content2: bytes) -> bool:
    if hashlib.sha256(content1).hexdigest() != hashlib.sha256(content2).hexdigest():
        return False
    return content1 == content2

# 错误：缓存键与内容不关联
def bad_cache_set(key: str, value: Any) -> None:
    cache[key] = value

# 正确：使用内容哈希关联
def good_cache_set(key: str, content: bytes, value: Any) -> None:
    content_hash = hashlib.sha256(content).hexdigest()
    cache.set(key, content_hash, value)

# 错误：无限增长的缓存
class BadCache:
    def __init__(self):
        self._data = {}
    
    def set(self, key, value):
        self._data[key] = value

# 正确：带淘汰策略的缓存
class GoodCache:
    def __init__(self, max_size: int = 1000):
        self._data = OrderedDict()
        self._max_size = max_size
    
    def set(self, key, value):
        if len(self._data) >= self._max_size:
            self._data.popitem(last=False)
        self._data[key] = value
```

**记住**: 内容哈希缓存的核心价值在于精确的变更检测和自动去重。选择合适的哈希算法、缓存策略和失效机制是构建高效缓存系统的关键。
