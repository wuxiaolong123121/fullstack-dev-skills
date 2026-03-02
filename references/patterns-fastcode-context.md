# FastCode 成本高效上下文管理模式

> 基于 HKUDS FastCode 项目 - Token 高效代码理解框架

## 核心概念

FastCode 通过**预算感知决策**和**增量更新**实现 55% 的成本降低，同时保持代码理解质量。

### 1. 预算感知决策

#### 原理

根据 token 预算动态选择最相关的代码片段，最大化信息密度。

```
查询 + 预算 → 相关性评估 → 选择策略 → 最优片段组合
```

#### Token 预算管理器

```python
class TokenBudgetManager:
    """
    Token 预算管理器
    
    管理和分配 token 预算
    """
    
    def __init__(
        self,
        total_budget: int = 8000,
        reserve_for_response: int = 2000
    ):
        self.total_budget = total_budget
        self.reserve_for_response = reserve_for_response
        self.available_budget = total_budget - reserve_for_response
        self.allocated = 0
    
    def allocate(self, requested: int) -> int:
        """
        分配 token 预算
        
        Args:
            requested: 请求的 token 数量
        
        Returns:
            实际分配的 token 数量
        """
        available = self.available_budget - self.allocated
        allocated = min(requested, available)
        self.allocated += allocated
        return allocated
    
    def remaining(self) -> int:
        """
        获取剩余可用预算
        
        Returns:
            剩余 token 数量
        """
        return self.available_budget - self.allocated
    
    def reset(self) -> None:
        """
        重置预算分配
        """
        self.allocated = 0
```

#### 相关性评估器

```python
class RelevanceEvaluator:
    """
    相关性评估器
    
    评估代码片段与查询的相关性
    """
    
    def __init__(self):
        self.semantic_weight = 0.4
        self.structural_weight = 0.3
        self.contextual_weight = 0.3
    
    def evaluate(
        self,
        code_snippet: str,
        query: str,
        context: dict = None
    ) -> float:
        """
        评估代码片段的相关性
        
        Args:
            code_snippet: 代码片段
            query: 查询字符串
            context: 上下文信息
        
        Returns:
            相关性分数 (0-1)
        """
        semantic_score = self._semantic_similarity(code_snippet, query)
        structural_score = self._structural_relevance(code_snippet, query)
        contextual_score = self._contextual_relevance(code_snippet, context)
        
        return (
            semantic_score * self.semantic_weight +
            structural_score * self.structural_weight +
            contextual_score * self.contextual_weight
        )
    
    def _semantic_similarity(self, code: str, query: str) -> float:
        """
        计算语义相似度
        
        Args:
            code: 代码字符串
            query: 查询字符串
        
        Returns:
            语义相似度分数
        """
        pass
    
    def _structural_relevance(self, code: str, query: str) -> float:
        """
        计算结构相关性
        
        Args:
            code: 代码字符串
            query: 查询字符串
        
        Returns:
            结构相关性分数
        """
        pass
    
    def _contextual_relevance(self, code: str, context: dict) -> float:
        """
        计算上下文相关性
        
        Args:
            code: 代码字符串
            context: 上下文信息
        
        Returns:
            上下文相关性分数
        """
        pass
```

#### 最优片段选择器

```python
class OptimalSnippetSelector:
    """
    最优片段选择器
    
    在预算约束下选择最优代码片段组合
    """
    
    def __init__(
        self,
        budget_manager: TokenBudgetManager,
        relevance_evaluator: RelevanceEvaluator
    ):
        self.budget_manager = budget_manager
        self.relevance_evaluator = relevance_evaluator
    
    def select(
        self,
        candidates: list[dict],
        query: str,
        context: dict = None
    ) -> list[dict]:
        """
        选择最优片段组合
        
        Args:
            candidates: 候选片段列表
            query: 查询字符串
            context: 上下文信息
        
        Returns:
            选中的片段列表
        """
        scored_candidates = []
        for candidate in candidates:
            score = self.relevance_evaluator.evaluate(
                candidate["code"],
                query,
                context
            )
            token_count = self._count_tokens(candidate["code"])
            scored_candidates.append({
                **candidate,
                "score": score,
                "tokens": token_count,
                "efficiency": score / max(token_count, 1)
            })
        
        scored_candidates.sort(key=lambda x: x["efficiency"], reverse=True)
        
        selected = []
        for candidate in scored_candidates:
            if self.budget_manager.remaining() >= candidate["tokens"]:
                self.budget_manager.allocate(candidate["tokens"])
                selected.append(candidate)
        
        return selected
    
    def _count_tokens(self, text: str) -> int:
        """
        计算 token 数量
        
        Args:
            text: 文本字符串
        
        Returns:
            token 数量
        """
        return len(text.split()) // 0.75
```

### 2. 增量上下文更新

#### 原理

当代码变更时，仅更新受影响的部分，避免全量重建。

```
变更检测 → 影响分析 → 增量更新 → 索引同步
```

#### 变更检测器

```python
class ChangeDetector:
    """
    变更检测器
    
    检测代码库中的变更
    """
    
    def __init__(self, codebase_path: str):
        self.codebase_path = codebase_path
        self.file_hashes = {}
    
    def scan_changes(self) -> dict:
        """
        扫描代码库变更
        
        Returns:
            变更信息字典，包含新增、修改、删除的文件
        """
        current_hashes = self._compute_all_hashes()
        
        added = set(current_hashes.keys()) - set(self.file_hashes.keys())
        removed = set(self.file_hashes.keys()) - set(current_hashes.keys())
        modified = set()
        
        for file_path in set(self.file_hashes.keys()) & set(current_hashes.keys()):
            if self.file_hashes[file_path] != current_hashes[file_path]:
                modified.add(file_path)
        
        self.file_hashes = current_hashes
        
        return {
            "added": list(added),
            "removed": list(removed),
            "modified": list(modified)
        }
    
    def _compute_all_hashes(self) -> dict:
        """
        计算所有文件的哈希值
        
        Returns:
            文件路径到哈希值的映射
        """
        pass
    
    def _compute_file_hash(self, file_path: str) -> str:
        """
        计算单个文件的哈希值
        
        Args:
            file_path: 文件路径
        
        Returns:
            文件哈希值
        """
        pass
```

#### 影响分析器

```python
class ImpactAnalyzer:
    """
    影响分析器
    
    分析代码变更的影响范围
    """
    
    def __init__(self, call_graph, dependency_graph):
        self.call_graph = call_graph
        self.dependency_graph = dependency_graph
    
    def analyze_impact(self, changed_files: list[str]) -> dict:
        """
        分析变更影响
        
        Args:
            changed_files: 变更文件列表
        
        Returns:
            影响分析结果
        """
        directly_affected = set(changed_files)
        
        dependents = set()
        for file_path in changed_files:
            dependents.update(self._find_dependents(file_path))
        
        callers = set()
        for file_path in changed_files:
            callers.update(self._find_callers(file_path))
        
        return {
            "directly_affected": list(directly_affected),
            "dependents": list(dependents),
            "callers": list(callers),
            "total_impact": len(directly_affected | dependents | callers)
        }
    
    def _find_dependents(self, file_path: str) -> set[str]:
        """
        查找依赖该文件的模块
        
        Args:
            file_path: 文件路径
        
        Returns:
            依赖模块集合
        """
        pass
    
    def _find_callers(self, file_path: str) -> set[str]:
        """
        查找调用该文件中函数的模块
        
        Args:
            file_path: 文件路径
        
        Returns:
            调用模块集合
        """
        pass
```

#### 增量索引更新器

```python
class IncrementalIndexUpdater:
    """
    增量索引更新器
    
    增量更新代码索引
    """
    
    def __init__(self, semantic_index, bm25_index, graph_builder):
        self.semantic_index = semantic_index
        self.bm25_index = bm25_index
        self.graph_builder = graph_builder
    
    def update(self, changes: dict) -> None:
        """
        增量更新索引
        
        Args:
            changes: 变更信息字典
        """
        for file_path in changes["removed"]:
            self._remove_from_index(file_path)
        
        for file_path in changes["added"]:
            self._add_to_index(file_path)
        
        for file_path in changes["modified"]:
            self._update_in_index(file_path)
    
    def _remove_from_index(self, file_path: str) -> None:
        """
        从索引中移除文件
        
        Args:
            file_path: 文件路径
        """
        self.semantic_index.remove(file_path)
        self.bm25_index.remove(file_path)
        self.graph_builder.remove_file(file_path)
    
    def _add_to_index(self, file_path: str) -> None:
        """
        将文件添加到索引
        
        Args:
            file_path: 文件路径
        """
        code = self._read_file(file_path)
        self.semantic_index.index(file_path, code)
        self.bm25_index.index(file_path, code)
        self.graph_builder.process_file(file_path, code)
    
    def _update_in_index(self, file_path: str) -> None:
        """
        更新索引中的文件
        
        Args:
            file_path: 文件路径
        """
        self._remove_from_index(file_path)
        self._add_to_index(file_path)
    
    def _read_file(self, file_path: str) -> str:
        """
        读取文件内容
        
        Args:
            file_path: 文件路径
        
        Returns:
            文件内容字符串
        """
        pass
```

### 3. MCP 服务器集成

#### FastCode MCP 服务器

FastCode 提供 MCP 服务器支持，可与其他 AI 工具集成：

```python
class FastCodeMCPServer:
    """
    FastCode MCP 服务器
    
    提供 MCP 协议接口
    """
    
    def __init__(self, codebase_path: str):
        self.codebase_path = codebase_path
        self.sessions = {}
        self.indexer = None
    
    async def code_qa(
        self,
        question: str,
        session_id: str = None,
        top_k: int = 5
    ) -> dict:
        """
        代码问答工具
        
        Args:
            question: 问题字符串
            session_id: 会话 ID
            top_k: 返回结果数量
        
        Returns:
            问答结果
        """
        pass
    
    async def list_sessions(self) -> list[dict]:
        """
        列出所有会话
        
        Returns:
            会话列表
        """
        return list(self.sessions.values())
    
    async def get_session_history(
        self,
        session_id: str,
        limit: int = 10
    ) -> list[dict]:
        """
        获取会话历史
        
        Args:
            session_id: 会话 ID
            limit: 返回记录数量
        
        Returns:
            会话历史记录
        """
        pass
    
    async def delete_session(self, session_id: str) -> bool:
        """
        删除会话
        
        Args:
            session_id: 会话 ID
        
        Returns:
            是否删除成功
        """
        if session_id in self.sessions:
            del self.sessions[session_id]
            return True
        return False
    
    async def list_indexed_repos(self) -> list[dict]:
        """
        列出已索引的仓库
        
        Returns:
            仓库列表
        """
        pass
    
    async def delete_repo_metadata(self, repo_name: str) -> bool:
        """
        删除仓库元数据
        
        Args:
            repo_name: 仓库名称
        
        Returns:
            是否删除成功
        """
        pass
```

#### MCP 工具定义

```python
MCP_TOOLS = [
    {
        "name": "code_qa",
        "description": "回答关于代码库的问题",
        "inputSchema": {
            "type": "object",
            "properties": {
                "question": {
                    "type": "string",
                    "description": "关于代码的问题"
                },
                "session_id": {
                    "type": "string",
                    "description": "可选的会话 ID，用于多轮对话"
                },
                "top_k": {
                    "type": "integer",
                    "description": "返回的相关代码片段数量",
                    "default": 5
                }
            },
            "required": ["question"]
        }
    },
    {
        "name": "list_sessions",
        "description": "列出所有会话",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "get_session_history",
        "description": "获取会话历史记录",
        "inputSchema": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "会话 ID"
                },
                "limit": {
                    "type": "integer",
                    "description": "返回记录数量",
                    "default": 10
                }
            },
            "required": ["session_id"]
        }
    },
    {
        "name": "delete_session",
        "description": "删除会话",
        "inputSchema": {
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "会话 ID"
                }
            },
            "required": ["session_id"]
        }
    },
    {
        "name": "list_indexed_repos",
        "description": "列出已索引的代码仓库",
        "inputSchema": {
            "type": "object",
            "properties": {}
        }
    },
    {
        "name": "delete_repo_metadata",
        "description": "删除仓库元数据",
        "inputSchema": {
            "type": "object",
            "properties": {
                "repo_name": {
                    "type": "string",
                    "description": "仓库名称"
                }
            },
            "required": ["repo_name"]
        }
    }
]
```

## 实践指导

### 1. 上下文构建策略

| 场景 | 预算分配 | 优先级 |
|-----|---------|-------|
| 快速查询 | 2000 tokens | 签名 > 摘要 > 代码 |
| 深度分析 | 6000 tokens | 相关代码 > 依赖 > 测试 |
| 代码审查 | 4000 tokens | 变更 > 上下文 > 相关代码 |
| Bug 修复 | 5000 tokens | 错误位置 > 调用链 > 相关代码 |

### 2. 增量更新触发条件

- 文件保存时
- Git 提交后
- 定时检查（如每 5 分钟）
- 手动触发

### 3. 成本优化技巧

- **压缩上下文**: 移除冗余空白和注释
- **智能截断**: 保留关键部分，截断次要部分
- **缓存复用**: 缓存常用查询结果
- **批量处理**: 合并多个小请求

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [MCP 协议规范](https://modelcontextprotocol.io/)
- [Token 优化策略](https://platform.openai.com/docs/guides/prompt-engineering)
