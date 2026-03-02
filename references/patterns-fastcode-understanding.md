# FastCode 语义-结构代码表示模式

> 基于 HKUDS FastCode 项目 - Token 高效代码理解框架

## 核心概念

FastCode 通过**语义-结构双重表示**实现高效代码理解，相比传统方法减少 55% 的 token 消耗，速度提升 3 倍。

### 1. AST 解析与多层索引

#### 原理

使用抽象语法树 (AST) 解析代码，提取结构化信息，结合语义嵌入构建多层索引。

```
源代码 → AST 解析 → 结构节点 → 语义嵌入 → 混合索引
```

#### 结构节点类型

| 节点类型 | 提取内容 | 用途 |
|---------|---------|------|
| Function | 函数名、参数、返回类型、文档字符串 | 函数级理解 |
| Class | 类名、继承关系、方法列表、属性 | 类级理解 |
| Module | 导入语句、顶层定义、模块文档 | 模块级理解 |
| Variable | 变量名、类型注解、初始值 | 数据流分析 |

#### 多语言支持

```python
LANGUAGE_CONFIGS = {
    "python": {
        "extensions": [".py"],
        "parser": "tree_sitter_python",
        "node_types": ["function_definition", "class_definition"]
    },
    "javascript": {
        "extensions": [".js", ".jsx", ".mjs"],
        "parser": "tree_sitter_javascript",
        "node_types": ["function_declaration", "class_declaration"]
    },
    "typescript": {
        "extensions": [".ts", ".tsx"],
        "parser": "tree_sitter_typescript",
        "node_types": ["function_declaration", "class_declaration", "interface_declaration"]
    },
    "go": {
        "extensions": [".go"],
        "parser": "tree_sitter_go",
        "node_types": ["function_declaration", "type_declaration"]
    },
    "rust": {
        "extensions": [".rs"],
        "parser": "tree_sitter_rust",
        "node_types": ["function_item", "struct_item", "impl_item"]
    },
    "java": {
        "extensions": [".java"],
        "parser": "tree_sitter_java",
        "node_types": ["method_declaration", "class_declaration"]
    }
}
```

### 2. 混合索引策略

#### 语义嵌入索引

使用向量嵌入捕获代码语义：

```python
class SemanticIndex:
    """
    语义嵌入索引器
    
    使用向量嵌入捕获代码语义相似性
    """
    
    def __init__(self, model_name: str = "text-embedding-3-small"):
        self.model_name = model_name
        self.embeddings = {}
        self.dimension = 1536
    
    def embed_code(self, code_snippet: str) -> list[float]:
        """
        将代码片段转换为嵌入向量
        
        Args:
            code_snippet: 代码片段字符串
        
        Returns:
            嵌入向量列表
        """
        pass
    
    def search_similar(self, query: str, top_k: int = 10) -> list[tuple[str, float]]:
        """
        搜索语义相似的代码
        
        Args:
            query: 查询字符串
            top_k: 返回结果数量
        
        Returns:
            (代码片段, 相似度分数) 列表
        """
        pass
```

#### BM25 关键词索引

使用 BM25 算法进行精确关键词匹配：

```python
class BM25Index:
    """
    BM25 关键词索引器
    
    使用 BM25 算法进行精确关键词匹配
    """
    
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.doc_lengths = {}
        self.avg_doc_length = 0
        self.inverted_index = {}
    
    def index_document(self, doc_id: str, tokens: list[str]) -> None:
        """
        索引单个文档
        
        Args:
            doc_id: 文档标识符
            tokens: 分词后的词元列表
        """
        pass
    
    def search(self, query: str, top_k: int = 10) -> list[tuple[str, float]]:
        """
        搜索匹配的文档
        
        Args:
            query: 查询字符串
            top_k: 返回结果数量
        
        Returns:
            (文档ID, BM25分数) 列表
        """
        pass
```

#### 混合检索

```python
class HybridRetriever:
    """
    混合检索器
    
    结合语义嵌入和 BM25 进行混合检索
    """
    
    def __init__(
        self,
        semantic_weight: float = 0.6,
        bm25_weight: float = 0.4
    ):
        self.semantic_index = SemanticIndex()
        self.bm25_index = BM25Index()
        self.semantic_weight = semantic_weight
        self.bm25_weight = bm25_weight
    
    def search(self, query: str, top_k: int = 10) -> list[dict]:
        """
        执行混合检索
        
        Args:
            query: 查询字符串
            top_k: 返回结果数量
        
        Returns:
            检索结果列表，包含合并后的分数
        """
        semantic_results = self.semantic_index.search_similar(query, top_k * 2)
        bm25_results = self.bm25_index.search(query, top_k * 2)
        
        return self._merge_results(semantic_results, bm25_results, top_k)
    
    def _merge_results(
        self,
        semantic_results: list,
        bm25_results: list,
        top_k: int
    ) -> list[dict]:
        """
        合并语义和 BM25 检索结果
        
        Args:
            semantic_results: 语义检索结果
            bm25_results: BM25 检索结果
            top_k: 返回结果数量
        
        Returns:
            合并后的结果列表
        """
        merged_scores = {}
        
        for doc_id, score in semantic_results:
            merged_scores[doc_id] = merged_scores.get(doc_id, 0) + score * self.semantic_weight
        
        for doc_id, score in bm25_results:
            merged_scores[doc_id] = merged_scores.get(doc_id, 0) + score * self.bm25_weight
        
        sorted_results = sorted(
            merged_scores.items(),
            key=lambda x: x[1],
            reverse=True
        )
        
        return [{"doc_id": k, "score": v} for k, v in sorted_results[:top_k]]
```

### 3. 多层图建模

#### 调用图 (Call Graph)

表示函数之间的调用关系：

```python
class CallGraph:
    """
    调用图构建器
    
    分析函数之间的调用关系
    """
    
    def __init__(self):
        self.nodes: set[str] = set()
        self.edges: list[tuple[str, str]] = []
        self.adjacency: dict[str, set[str]] = {}
    
    def add_call(self, caller: str, callee: str) -> None:
        """
        添加调用关系
        
        Args:
            caller: 调用者函数名
            callee: 被调用函数名
        """
        self.nodes.add(caller)
        self.nodes.add(callee)
        self.edges.append((caller, callee))
        
        if caller not in self.adjacency:
            self.adjacency[caller] = set()
        self.adjacency[caller].add(callee)
    
    def get_callers(self, function: str) -> set[str]:
        """
        获取调用指定函数的所有函数
        
        Args:
            function: 目标函数名
        
        Returns:
            调用者函数名集合
        """
        callers = set()
        for caller, callees in self.adjacency.items():
            if function in callees:
                callers.add(caller)
        return callers
    
    def get_callees(self, function: str) -> set[str]:
        """
        获取指定函数调用的所有函数
        
        Args:
            function: 目标函数名
        
        Returns:
            被调用函数名集合
        """
        return self.adjacency.get(function, set())
```

#### 依赖图 (Dependency Graph)

表示模块之间的依赖关系：

```python
class DependencyGraph:
    """
    依赖图构建器
    
    分析模块之间的依赖关系
    """
    
    def __init__(self):
        self.nodes: set[str] = set()
        self.edges: list[tuple[str, str]] = []
        self.dependencies: dict[str, set[str]] = {}
    
    def add_dependency(self, module: str, depends_on: str) -> None:
        """
        添加依赖关系
        
        Args:
            module: 模块名
            depends_on: 依赖的模块名
        """
        self.nodes.add(module)
        self.nodes.add(depends_on)
        self.edges.append((module, depends_on))
        
        if module not in self.dependencies:
            self.dependencies[module] = set()
        self.dependencies[module].add(depends_on)
    
    def get_dependencies(self, module: str) -> set[str]:
        """
        获取模块的直接依赖
        
        Args:
            module: 模块名
        
        Returns:
            依赖模块名集合
        """
        return self.dependencies.get(module, set())
    
    def get_transitive_dependencies(self, module: str) -> set[str]:
        """
        获取模块的传递依赖
        
        Args:
            module: 模块名
        
        Returns:
            所有传递依赖模块名集合
        """
        visited = set()
        to_visit = list(self.dependencies.get(module, set()))
        
        while to_visit:
            current = to_visit.pop()
            if current not in visited:
                visited.add(current)
                to_visit.extend(self.dependencies.get(current, set()))
        
        return visited
```

#### 继承图 (Inheritance Graph)

表示类之间的继承关系：

```python
class InheritanceGraph:
    """
    继承图构建器
    
    分析类之间的继承关系
    """
    
    def __init__(self):
        self.nodes: set[str] = set()
        self.edges: list[tuple[str, str]] = []
        self.parent_map: dict[str, set[str]] = {}
        self.child_map: dict[str, set[str]] = {}
    
    def add_inheritance(self, child: str, parent: str) -> None:
        """
        添加继承关系
        
        Args:
            child: 子类名
            parent: 父类名
        """
        self.nodes.add(child)
        self.nodes.add(parent)
        self.edges.append((child, parent))
        
        if child not in self.parent_map:
            self.parent_map[child] = set()
        self.parent_map[child].add(parent)
        
        if parent not in self.child_map:
            self.child_map[parent] = set()
        self.child_map[parent].add(child)
    
    def get_parents(self, class_name: str) -> set[str]:
        """
        获取类的直接父类
        
        Args:
            class_name: 类名
        
        Returns:
            父类名集合
        """
        return self.parent_map.get(class_name, set())
    
    def get_ancestors(self, class_name: str) -> set[str]:
        """
        获取类的所有祖先类
        
        Args:
            class_name: 类名
        
        Returns:
            祖先类名集合
        """
        ancestors = set()
        to_visit = list(self.parent_map.get(class_name, set()))
        
        while to_visit:
            current = to_visit.pop()
            if current not in ancestors:
                ancestors.add(current)
                to_visit.extend(self.parent_map.get(current, set()))
        
        return ancestors
    
    def get_children(self, class_name: str) -> set[str]:
        """
        获取类的直接子类
        
        Args:
            class_name: 类名
        
        Returns:
            子类名集合
        """
        return self.child_map.get(class_name, set())
```

## 实践指导

### 1. 代码库索引流程

```
1. 扫描代码库 → 识别文件类型
2. AST 解析 → 提取结构节点
3. 生成嵌入 → 构建语义索引
4. 分词处理 → 构建 BM25 索引
5. 分析关系 → 构建图模型
```

### 2. 查询处理流程

```
1. 接收查询 → 分析查询意图
2. 混合检索 → 获取候选结果
3. 图遍历 → 扩展相关节点
4. 排序过滤 → 返回最终结果
```

### 3. 性能优化建议

- **增量索引**: 仅更新变更的文件
- **缓存策略**: 缓存热门查询结果
- **并行处理**: 并行处理多个文件的 AST 解析
- **批量嵌入**: 批量调用嵌入 API 减少延迟

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [Tree-sitter 解析器](https://tree-sitter.github.io/tree-sitter/)
- [BM25 算法](https://en.wikipedia.org/wiki/Okapi_BM25)
