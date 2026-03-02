# FastCode 多轮对话缓存模式

> 基于 HKUDS FastCode 项目 - Cache 模块

## 核心概念

FastCode 提供**多轮对话缓存系统**，支持长期对话历史存储、摘要检索和会话管理，实现高效的上下文复用。

### 1. 对话轮次保存

#### 原理

将每轮对话的查询、答案、摘要和检索元素保存到缓存，支持长期存储（默认 30 天）。

```python
class DialogueTurnManager:
    """
    对话轮次管理器
    
    保存和管理对话历史
    """
    
    def __init__(self, cache_manager):
        self.cache = cache_manager
        self.dialogue_ttl = 2592000  # 30 天
    
    def save_dialogue_turn(
        self,
        session_id: str,
        turn_number: int,
        query: str,
        answer: str,
        summary: str,
        retrieved_elements: list = None,
        metadata: dict = None
    ) -> bool:
        """
        保存对话轮次
        
        Args:
            session_id: 会话 ID
            turn_number: 轮次号（从 1 开始）
            query: 用户查询
            answer: 生成的答案
            summary: 对话摘要
            retrieved_elements: 检索的代码元素
            metadata: 额外元数据
        
        Returns:
            是否保存成功
        """
        try:
            turn_data = {
                "session_id": session_id,
                "turn_number": turn_number,
                "timestamp": time.time(),
                "query": query,
                "answer": answer,
                "summary": summary,
                "retrieved_elements": retrieved_elements or [],
                "metadata": metadata or {}
            }
            
            key = f"dialogue_{session_id}_turn_{turn_number}"
            self.cache.set(key, turn_data, ttl=self.dialogue_ttl)
            
            self._update_session_index(session_id, turn_number, metadata)
            
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to save dialogue turn: {e}")
            return False
    
    def _update_session_index(
        self,
        session_id: str,
        turn_number: int,
        metadata: dict = None
    ) -> bool:
        """
        更新会话索引
        
        Args:
            session_id: 会话 ID
            turn_number: 轮次号
            metadata: 元数据（包含 multi_turn 标志）
        
        Returns:
            是否更新成功
        """
        key = f"dialogue_session_{session_id}_index"
        
        session_index = self.cache.get(key) or {
            "session_id": session_id,
            "created_at": time.time(),
            "total_turns": 0,
            "last_updated": time.time(),
            "multi_turn": False
        }
        
        session_index["total_turns"] = max(
            session_index["total_turns"], turn_number
        )
        session_index["last_updated"] = time.time()
        
        if metadata and metadata.get("multi_turn"):
            session_index["multi_turn"] = True
        
        return self.cache.set(key, session_index, ttl=self.dialogue_ttl)
```

### 2. 对话历史检索

#### 原理

检索历史对话摘要作为上下文，支持限制检索轮次数量。

```python
class DialogueHistoryRetriever:
    """
    对话历史检索器
    
    检索历史对话摘要
    """
    
    def __init__(self, cache_manager):
        self.cache = cache_manager
    
    def get_dialogue_turn(
        self,
        session_id: str,
        turn_number: int
    ) -> dict:
        """
        获取特定轮次的对话
        
        Args:
            session_id: 会话 ID
            turn_number: 轮次号
        
        Returns:
            对话轮次数据，不存在则返回 None
        """
        key = f"dialogue_{session_id}_turn_{turn_number}"
        return self.cache.get(key)
    
    def get_dialogue_history(
        self,
        session_id: str,
        max_turns: int = None
    ) -> list:
        """
        获取对话历史
        
        Args:
            session_id: 会话 ID
            max_turns: 最大检索轮次（None 表示全部）
        
        Returns:
            对话历史列表，从旧到新排序
        """
        session_index = self._get_session_index(session_id)
        if not session_index:
            return []
        
        total_turns = session_index.get("total_turns", 0)
        if total_turns == 0:
            return []
        
        if max_turns is None or max_turns >= total_turns:
            start_turn = 1
        else:
            start_turn = total_turns - max_turns + 1
        
        history = []
        for turn_num in range(start_turn, total_turns + 1):
            turn_data = self.get_dialogue_turn(session_id, turn_num)
            if turn_data:
                history.append(turn_data)
        
        return history
    
    def get_recent_summaries(
        self,
        session_id: str,
        num_rounds: int
    ) -> list:
        """
        获取最近的对话摘要
        
        Args:
            session_id: 会话 ID
            num_rounds: 检索轮次数
        
        Returns:
            摘要列表，包含 turn_number, query, summary
        """
        history = self.get_dialogue_history(session_id, max_turns=num_rounds)
        
        summaries = []
        for turn in history:
            summaries.append({
                "turn_number": turn.get("turn_number"),
                "query": turn.get("query"),
                "summary": turn.get("summary")
            })
        
        return summaries
    
    def _get_session_index(self, session_id: str) -> dict:
        """
        获取会话索引
        
        Args:
            session_id: 会话 ID
        
        Returns:
            会话索引数据
        """
        key = f"dialogue_session_{session_id}_index"
        return self.cache.get(key)
```

### 3. 会话管理

#### 原理

支持列出、删除和管理多个会话。

```python
class SessionManager:
    """
    会话管理器
    
    管理多个对话会话
    """
    
    def __init__(self, cache_manager):
        self.cache = cache_manager
    
    def list_sessions(self) -> list:
        """
        列出所有会话
        
        Returns:
            会话元数据列表
        """
        sessions = []
        
        for key in self.cache.iterkeys():
            if isinstance(key, str) and key.startswith("dialogue_session_") and key.endswith("_index"):
                session_data = self.cache.get(key)
                if session_data:
                    sessions.append(session_data)
        
        sessions.sort(
            key=lambda x: (
                x.get("created_at", 0),
                x.get("last_updated", 0)
            ),
            reverse=True
        )
        
        return sessions
    
    def delete_session(self, session_id: str) -> bool:
        """
        删除会话及其所有历史
        
        Args:
            session_id: 会话 ID
        
        Returns:
            是否删除成功
        """
        try:
            session_index = self._get_session_index(session_id)
            if not session_index:
                return False
            
            total_turns = session_index.get("total_turns", 0)
            
            for turn_num in range(1, total_turns + 1):
                key = f"dialogue_{session_id}_turn_{turn_num}"
                self.cache.delete(key)
            
            index_key = f"dialogue_session_{session_id}_index"
            self.cache.delete(index_key)
            
            return True
        
        except Exception as e:
            self.logger.error(f"Failed to delete session: {e}")
            return False
    
    def get_session_info(self, session_id: str) -> dict:
        """
        获取会话信息
        
        Args:
            session_id: 会话 ID
        
        Returns:
            会话信息字典
        """
        session_index = self._get_session_index(session_id)
        if not session_index:
            return None
        
        return {
            "session_id": session_id,
            "created_at": session_index.get("created_at"),
            "last_updated": session_index.get("last_updated"),
            "total_turns": session_index.get("total_turns", 0),
            "multi_turn": session_index.get("multi_turn", False)
        }
    
    def _get_session_index(self, session_id: str) -> dict:
        """
        获取会话索引
        
        Args:
            session_id: 会话 ID
        
        Returns:
            会话索引数据
        """
        key = f"dialogue_session_{session_id}_index"
        return self.cache.get(key)
```

### 4. 缓存后端支持

#### 原理

支持多种缓存后端：磁盘缓存和 Redis 缓存。

```python
class CacheBackend:
    """
    缓存后端抽象
    
    支持磁盘和 Redis 后端
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.backend = config.get("backend", "disk")
        self.ttl = config.get("ttl", 3600)
        self.max_size_mb = config.get("max_size_mb", 1000)
        self.cache_directory = config.get("cache_directory", "./data/cache")
        
        self.cache = None
        self._initialize_cache()
    
    def _initialize_cache(self):
        """
        初始化缓存后端
        """
        if self.backend == "disk":
            Path(self.cache_directory).mkdir(parents=True, exist_ok=True)
            max_size_bytes = self.max_size_mb * 1024 * 1024
            self.cache = DiskCache(
                self.cache_directory,
                size_limit=max_size_bytes
            )
        
        elif self.backend == "redis":
            import redis
            self.cache = redis.Redis(
                host=os.getenv("REDIS_HOST", "localhost"),
                port=int(os.getenv("REDIS_PORT", 6379)),
                db=0,
                decode_responses=False
            )
            self.cache.ping()
    
    def get(self, key: str) -> any:
        """
        获取缓存值
        
        Args:
            key: 缓存键
        
        Returns:
            缓存值，不存在则返回 None
        """
        if self.backend == "disk":
            return self.cache.get(key)
        
        elif self.backend == "redis":
            value = self.cache.get(key)
            if value:
                return pickle.loads(value)
            return None
    
    def set(self, key: str, value: any, ttl: int = None) -> bool:
        """
        设置缓存值
        
        Args:
            key: 缓存键
            value: 缓存值
            ttl: 过期时间（秒）
        
        Returns:
            是否设置成功
        """
        if ttl is None:
            ttl = self.ttl
        
        if self.backend == "disk":
            return self.cache.set(key, value, expire=ttl)
        
        elif self.backend == "redis":
            return self.cache.setex(key, ttl, pickle.dumps(value))
    
    def delete(self, key: str) -> bool:
        """
        删除缓存值
        
        Args:
            key: 缓存键
        
        Returns:
            是否删除成功
        """
        if self.backend == "disk":
            return self.cache.delete(key)
        
        elif self.backend == "redis":
            return bool(self.cache.delete(key))
    
    def get_stats(self) -> dict:
        """
        获取缓存统计
        
        Returns:
            缓存统计信息
        """
        if self.backend == "disk":
            return {
                "backend": "disk",
                "size": self.cache.volume(),
                "items": len(self.cache)
            }
        
        elif self.backend == "redis":
            info = self.cache.info()
            return {
                "backend": "redis",
                "size": info.get("used_memory", 0),
                "items": self.cache.dbsize()
            }
```

## 实践指导

### 1. TTL 配置建议

| 数据类型 | 推荐 TTL | 说明 |
|---------|---------|------|
| 对话历史 | 30 天 | 长期上下文保持 |
| 嵌入向量 | 7 天 | 代码变更后需更新 |
| 查询结果 | 1 小时 | 短期缓存 |

### 2. 后端选择

| 后端 | 适用场景 | 优点 |
|-----|---------|------|
| 磁盘 | 单机部署、小规模 | 简单、无需额外依赖 |
| Redis | 分布式、大规模 | 高性能、支持集群 |

### 3. 会话 ID 生成

```python
import uuid
import hashlib

def generate_session_id(user_id: str = None) -> str:
    """
    生成会话 ID
    
    Args:
        user_id: 用户标识（可选）
    
    Returns:
        唯一的会话 ID
    """
    if user_id:
        base = f"{user_id}_{time.time()}"
    else:
        base = str(uuid.uuid4())
    
    return hashlib.md5(base.encode()).hexdigest()[:16]
```

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [DiskCache 文档](https://grantjenks.com/docs/diskcache/)
- [Redis 缓存最佳实践](https://redis.io/docs/manual/patterns/)
