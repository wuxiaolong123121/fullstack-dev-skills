# FastCode 混合检索模式

> 基于 HKUDS FastCode 项目 - Hybrid Retriever 模块

## 核心概念

FastCode 提供**混合检索能力**，结合语义搜索、关键词搜索和图遍历，支持两阶段仓库选择和 Agency 模式深度探索。

### 1. 多阶段检索

#### 原理

将检索过程分为多个阶段：语义搜索、关键词搜索、结果合并、图扩展、重排序。

```python
class MultiStageRetriever:
    """
    多阶段检索器
    
    结合语义、关键词和图检索
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.semantic_weight = config.get("semantic_weight", 0.6)
        self.keyword_weight = config.get("keyword_weight", 0.3)
        self.graph_weight = config.get("graph_weight", 0.1)
        self.min_similarity = config.get("min_similarity", 0.3)
        self.max_results = config.get("max_results", 5)
    
    def retrieve(
        self,
        query: str,
        filters: dict = None,
        repo_filter: list = None
    ) -> list:
        """
        执行多阶段检索
        
        Args:
            query: 用户查询
            filters: 过滤条件
            repo_filter: 仓库过滤列表
        
        Returns:
            检索结果列表
        """
        semantic_results = self._semantic_search(query, top_k=20, repo_filter=repo_filter)
        
        keyword_results = self._keyword_search(query, top_k=10, repo_filter=repo_filter)
        
        combined = self._combine_results(semantic_results, keyword_results)
        
        if self.graph_weight > 0:
            combined = self._expand_with_graph(combined, max_hops=2)
        
        reranked = self._rerank(query, combined)
        
        if filters:
            reranked = self._apply_filters(reranked, filters)
        
        diversified = self._diversify(reranked)
        
        return diversified[:self.max_results]
    
    def _semantic_search(
        self,
        query: str,
        top_k: int,
        repo_filter: list = None
    ) -> list:
        """
        语义搜索
        
        Args:
            query: 查询字符串
            top_k: 返回结果数
            repo_filter: 仓库过滤列表
        
        Returns:
            语义搜索结果
        """
        query_embedding = self.embedder.embed(query)
        
        results = self.vector_store.search(
            query_embedding,
            top_k=top_k,
            repo_filter=repo_filter
        )
        
        return [r for r in results if r.get("score", 0) >= self.min_similarity]
    
    def _keyword_search(
        self,
        query: str,
        top_k: int,
        repo_filter: list = None
    ) -> list:
        """
        关键词搜索
        
        Args:
            query: 查询字符串
            top_k: 返回结果数
            repo_filter: 仓库过滤列表
        
        Returns:
            关键词搜索结果
        """
        tokens = query.lower().split()
        
        scores = self.bm25.get_scores(tokens)
        
        top_indices = np.argsort(scores)[::-1][:top_k]
        
        results = []
        for idx in top_indices:
            elem = self.bm25_elements[idx]
            if repo_filter is None or elem.get("repo_name") in repo_filter:
                results.append({
                    **elem,
                    "keyword_score": scores[idx]
                })
        
        return results
    
    def _combine_results(
        self,
        semantic_results: list,
        keyword_results: list
    ) -> list:
        """
        合并检索结果
        
        Args:
            semantic_results: 语义搜索结果
            keyword_results: 关键词搜索结果
        
        Returns:
            合并后的结果
        """
        combined = {}
        
        for r in semantic_results:
            key = r.get("id") or r.get("relative_path")
            combined[key] = {
                **r,
                "semantic_score": r.get("score", 0),
                "keyword_score": 0
            }
        
        for r in keyword_results:
            key = r.get("id") or r.get("relative_path")
            if key in combined:
                combined[key]["keyword_score"] = r.get("keyword_score", 0)
            else:
                combined[key] = {
                    **r,
                    "semantic_score": 0,
                    "keyword_score": r.get("keyword_score", 0)
                }
        
        for key in combined:
            r = combined[key]
            r["combined_score"] = (
                r["semantic_score"] * self.semantic_weight +
                r["keyword_score"] * self.keyword_weight
            )
        
        return sorted(combined.values(), key=lambda x: x["combined_score"], reverse=True)
```

### 2. 两阶段仓库选择

#### 原理

先选择相关仓库，再在选定仓库中检索，提高多仓库场景效率。

```python
class TwoStageRepoSelector:
    """
    两阶段仓库选择器
    
    先选仓库，再检索
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.top_repos_to_search = config.get("top_repos_to_search", 5)
        self.min_repo_similarity = config.get("min_repo_similarity", 0.3)
        self.repo_selection_method = config.get("repo_selection_method", "llm")
    
    def select_and_retrieve(
        self,
        query: str,
        repo_filter: list = None
    ) -> tuple:
        """
        选择仓库并准备检索
        
        Args:
            query: 用户查询
            repo_filter: 用户指定的仓库过滤
        
        Returns:
            (选中的仓库列表, 是否需要选择)
        """
        available_repos = self.vector_store.get_repository_names()
        
        effective_repos = repo_filter if repo_filter else available_repos
        
        if len(effective_repos) <= 1:
            return effective_repos, False
        
        if self.repo_selection_method == "llm":
            selected = self._select_repos_by_llm(query, effective_repos)
        else:
            selected = self._select_repos_by_embedding(query, effective_repos)
        
        return selected, True
    
    def _select_repos_by_llm(self, query: str, available: list) -> list:
        """
        使用 LLM 选择仓库
        
        Args:
            query: 用户查询
            available: 可用仓库列表
        
        Returns:
            选中的仓库列表
        """
        repo_overviews = self.vector_store.load_repo_overviews()
        
        filtered_overviews = {
            name: data for name, data in repo_overviews.items()
            if name in available
        }
        
        return self.repo_selector.select_relevant_repos(
            query, filtered_overviews, self.top_repos_to_search
        )
    
    def _select_repos_by_embedding(self, query: str, available: list) -> list:
        """
        使用嵌入相似度选择仓库
        
        Args:
            query: 用户查询
            available: 可用仓库列表
        
        Returns:
            选中的仓库列表
        """
        query_embedding = self.embedder.embed(query)
        
        repo_scores = []
        for repo_name in available:
            overview = self.vector_store.get_repo_overview(repo_name)
            if overview and "embedding" in overview:
                score = cosine_similarity(query_embedding, overview["embedding"])
                if score >= self.min_repo_similarity:
                    repo_scores.append((repo_name, score))
        
        repo_scores.sort(key=lambda x: x[1], reverse=True)
        
        return [name for name, _ in repo_scores[:self.top_repos_to_search]]
```

### 3. Agency 模式

#### 原理

使用迭代代理进行深度探索，适用于需要精确检索的场景。

```python
class AgencyModeRetriever:
    """
    Agency 模式检索器
    
    使用迭代代理深度探索
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.max_iterations = config.get("max_iterations", 5)
        self.confidence_threshold = config.get("confidence_threshold", 0.8)
    
    def retrieve_with_agency(
        self,
        query: str,
        initial_results: list,
        query_info: dict = None,
        repo_filter: list = None,
        dialogue_history: list = None
    ) -> list:
        """
        使用 Agency 模式检索
        
        Args:
            query: 用户查询
            initial_results: 初始检索结果
            query_info: 查询信息
            repo_filter: 仓库过滤
            dialogue_history: 对话历史
        
        Returns:
            增强后的检索结果
        """
        context = {
            "query": query,
            "results": initial_results,
            "query_info": query_info,
            "repo_filter": repo_filter,
            "dialogue_history": dialogue_history,
            "iteration": 0,
            "confidence": 0.0
        }
        
        while context["iteration"] < self.max_iterations:
            action = self._decide_action(context)
            
            if action == "stop":
                break
            
            result = self._execute_action(action, context)
            
            context = self._update_context(context, action, result)
            
            if context["confidence"] >= self.confidence_threshold:
                break
        
        return context["results"]
    
    def _decide_action(self, context: dict) -> str:
        """
        决定下一步行动
        
        Args:
            context: 当前上下文
        
        Returns:
            行动名称
        """
        if not context["results"]:
            return "search_broader"
        
        if context["confidence"] < 0.5:
            return "search_deeper"
        
        if self._need_more_context(context):
            return "expand_context"
        
        return "stop"
    
    def _execute_action(self, action: str, context: dict) -> dict:
        """
        执行行动
        
        Args:
            action: 行动名称
            context: 当前上下文
        
        Returns:
            行动结果
        """
        if action == "search_broader":
            return self._search_broader(context)
        elif action == "search_deeper":
            return self._search_deeper(context)
        elif action == "expand_context":
            return self._expand_context(context)
        else:
            return {"results": [], "confidence": 0}
    
    def _search_broader(self, context: dict) -> dict:
        """
        扩大搜索范围
        
        Args:
            context: 当前上下文
        
        Returns:
            搜索结果
        """
        query = context["query"]
        repo_filter = context.get("repo_filter")
        
        results = self._semantic_search(query, top_k=30, repo_filter=repo_filter)
        
        return {
            "results": results,
            "confidence": self._calculate_confidence(results)
        }
    
    def _search_deeper(self, context: dict) -> dict:
        """
        深度搜索
        
        Args:
            context: 当前上下文
        
        Returns:
            搜索结果
        """
        current_results = context["results"]
        
        expanded = []
        for result in current_results[:5]:
            related = self._get_related_elements(result)
            expanded.extend(related)
        
        return {
            "results": expanded,
            "confidence": self._calculate_confidence(expanded)
        }
    
    def _expand_context(self, context: dict) -> dict:
        """
        扩展上下文
        
        Args:
            context: 当前上下文
        
        Returns:
            扩展后的结果
        """
        current_results = context["results"]
        
        for result in current_results:
            callers = self.graph_builder.get_callers(result.get("name"))
            callees = self.graph_builder.get_callees(result.get("name"))
            
            result["related_callers"] = callers
            result["related_callees"] = callees
        
        return {
            "results": current_results,
            "confidence": context["confidence"] + 0.1
        }
    
    def _calculate_confidence(self, results: list) -> float:
        """
        计算置信度
        
        Args:
            results: 检索结果
        
        Returns:
            置信度分数
        """
        if not results:
            return 0.0
        
        scores = [r.get("combined_score", r.get("score", 0)) for r in results]
        avg_score = sum(scores) / len(scores)
        
        coverage = min(len(results) / 10, 1.0)
        
        return avg_score * 0.7 + coverage * 0.3
    
    def _update_context(self, context: dict, action: str, result: dict) -> dict:
        """
        更新上下文
        
        Args:
            context: 当前上下文
            action: 执行的行动
            result: 行动结果
        
        Returns:
            更新后的上下文
        """
        context["iteration"] += 1
        
        if result.get("results"):
            context["results"].extend(result["results"])
            context["results"] = self._deduplicate(context["results"])
        
        context["confidence"] = max(
            context["confidence"],
            result.get("confidence", 0)
        )
        
        return context
    
    def _deduplicate(self, results: list) -> list:
        """
        去重
        
        Args:
            results: 结果列表
        
        Returns:
            去重后的列表
        """
        seen = set()
        unique = []
        
        for r in results:
            key = r.get("id") or r.get("relative_path")
            if key not in seen:
                seen.add(key)
                unique.append(r)
        
        return unique
```

### 4. 图扩展

#### 原理

使用代码关系图扩展检索结果。

```python
class GraphExpander:
    """
    图扩展器
    
    使用代码关系图扩展结果
    """
    
    def __init__(self, graph_builder):
        self.graph = graph_builder
    
    def expand_with_graph(
        self,
        results: list,
        max_hops: int = 2
    ) -> list:
        """
        使用图扩展结果
        
        Args:
            results: 原始结果
            max_hops: 最大跳数
        
        Returns:
            扩展后的结果
        """
        expanded = list(results)
        
        for result in results:
            name = result.get("name")
            if not name:
                continue
            
            related = self._get_related(name, max_hops)
            
            for elem in related:
                if not any(r.get("id") == elem.get("id") for r in expanded):
                    elem["graph_distance"] = related[elem]
                    expanded.append(elem)
        
        return expanded
    
    def _get_related(self, name: str, max_hops: int) -> dict:
        """
        获取相关元素
        
        Args:
            name: 元素名称
            max_hops: 最大跳数
        
        Returns:
            相关元素到距离的映射
        """
        related = {}
        to_visit = [(name, 0)]
        visited = {name}
        
        while to_visit:
            current, distance = to_visit.pop(0)
            
            if distance >= max_hops:
                continue
            
            callers = self.graph.get_callers(current)
            callees = self.graph.get_callees(current)
            
            for elem in callers | callees:
                if elem not in visited:
                    visited.add(elem)
                    related[elem] = distance + 1
                    to_visit.append((elem, distance + 1))
        
        return related
```

## 实践指导

### 1. 检索模式选择

| 场景 | 推荐模式 | 说明 |
|-----|---------|------|
| 单仓库简单查询 | 标准检索 | 语义 + 关键词 |
| 多仓库查询 | 两阶段 | 先选仓库再检索 |
| 复杂代码理解 | Agency | 迭代深度探索 |
| 依赖分析 | 图扩展 | 追踪调用关系 |

### 2. 权重配置

| 参数 | 推荐值 | 说明 |
|-----|-------|------|
| semantic_weight | 0.6 | 语义搜索权重 |
| keyword_weight | 0.3 | 关键词搜索权重 |
| graph_weight | 0.1 | 图扩展权重 |

### 3. 性能优化

- 缓存仓库概览和嵌入
- 使用过滤减少搜索空间
- 限制迭代次数
- 并行执行多阶段检索

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [BM25 算法](https://en.wikipedia.org/wiki/Okapi_BM25)
- [混合检索最佳实践](https://www.pinecone.io/learn/hybrid-search/)
