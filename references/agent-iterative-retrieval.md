# AI Agent 迭代检索模式参考

4 阶段循环检索模式，用于构建能够自主获取、评估和优化上下文的智能 Agent 系统。源自 everything-claude-code 项目的核心检索模式。

## When to Activate

- 构建需要外部知识检索的 AI Agent
- 实现 RAG（检索增强生成）系统
- 开发需要多轮信息收集的智能助手
- 设计能够自我优化检索结果的 Agent
- 解决子代理上下文不足问题

## Core Principles

### 1. 迭代优于单次检索

单次检索往往无法获取足够的上下文，迭代检索通过多轮优化提升结果质量。

## 4 阶段循环流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                    迭代检索循环流程                               │
└─────────────────────────────────────────────────────────────────┘

    ┌──────────┐
    │  开始    │
    └────┬─────┘
         │
         ▼
┌─────────────────┐
│   DISPATCH      │  阶段 1: 初始检索
│   初始检索      │  - 解析查询意图
│                 │  - 生成搜索关键词
│                 │  - 执行首次检索
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   EVALUATE      │  阶段 2: 评估结果
│   评估结果      │  - 计算相关性分数
│                 │  - 识别上下文缺口
│                 │  - 判断是否充分
└────────┬────────┘
         │
         ▼
    ┌──────────┐      否       ┌─────────────────┐
    │ 是否充分? ├──────────────►│    REFINE       │
    └────┬─────┘               │    优化查询     │
         │                     │ - 分析缺口原因  │
         │ 是                  │ - 生成补充查询  │
         │                     │ - 调整检索策略  │
         │                     └────────┬────────┘
         │                              │
         │                              ▼
         │                     ┌─────────────────┐
         │                     │     LOOP        │
         │                     │    循环检索     │
         │                     │ - 合并上下文    │
         │                     │ - 迭代计数+1    │
         │                     └────────┬────────┘
         │                              │
         │                              │ 返回 EVALUATE
         │                              │
         ▼                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                        结束（返回结果）                          │
│  - 合并所有检索结果                                              │
│  - 返回最终评估报告                                              │
└─────────────────────────────────────────────────────────────────┘
```

## 核心数据结构

```python
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime

class RetrievalPhase(Enum):
    """检索阶段枚举"""
    DISPATCH = "dispatch"
    EVALUATE = "evaluate"
    REFINE = "refine"
    LOOP = "loop"

@dataclass
class Document:
    """文档数据结构"""
    id: str
    content: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    source: str = ""
    timestamp: datetime = field(default_factory=datetime.now)

@dataclass
class RelevanceScore:
    """相关性评分结果"""
    document_id: str
    score: float
    factors: Dict[str, float] = field(default_factory=dict)

@dataclass
class ContextGap:
    """上下文缺口"""
    missing_entity: str
    importance: float
    suggested_query: str

@dataclass
class RetrievalResult:
    """检索结果数据结构"""
    documents: List[Document]
    relevance_scores: List[RelevanceScore]
    gaps_identified: List[ContextGap]
    iteration_count: int
    is_sufficient: bool
    total_tokens: int = 0
    elapsed_time: float = 0.0

@dataclass
class IterationState:
    """迭代状态追踪"""
    current_phase: RetrievalPhase
    iteration: int
    accumulated_documents: List[Document] = field(default_factory=list)
    query_history: List[str] = field(default_factory=list)
    gap_history: List[List[ContextGap]] = field(default_factory=list)
```

## 完整实现

### 阶段 1: DISPATCH - 初始检索

```python
class QueryParser:
    """
    查询解析器
    
    解析用户查询，提取关键实体和意图
    """
    
    def __init__(self):
        self.intent_patterns = {
            "how_to": ["如何", "怎么", "怎样", "how to", "how do"],
            "what_is": ["什么是", "是什么", "what is", "define"],
            "compare": ["比较", "区别", "对比", "compare", "vs", "versus"],
            "troubleshoot": ["错误", "问题", "故障", "error", "issue", "bug"],
            "best_practice": ["最佳实践", "推荐", "best practice", "recommended"]
        }
    
    def parse(self, query: str) -> Dict[str, Any]:
        """
        解析查询
        
        返回包含意图、实体、关键词的解析结果
        """
        intent = self._detect_intent(query)
        entities = self._extract_entities(query)
        keywords = self._extract_keywords(query)
        
        return {
            "original_query": query,
            "intent": intent,
            "entities": entities,
            "keywords": keywords,
            "expanded_queries": self._expand_query(query, intent, entities)
        }
    
    def _detect_intent(self, query: str) -> str:
        """检测查询意图"""
        query_lower = query.lower()
        for intent, patterns in self.intent_patterns.items():
            for pattern in patterns:
                if pattern in query_lower:
                    return intent
        return "general"
    
    def _extract_entities(self, query: str) -> List[str]:
        """提取命名实体"""
        import re
        entities = []
        
        tech_pattern = r'\b(?:API|SDK|HTTP|REST|GraphQL|SQL|NoSQL|Redis|MongoDB|PostgreSQL|Python|JavaScript|TypeScript|React|Vue|Django|FastAPI)\b'
        entities.extend(re.findall(tech_pattern, query, re.IGNORECASE))
        
        version_pattern = r'\b\d+(?:\.\d+)+\b'
        entities.extend(re.findall(version_pattern, query))
        
        return list(set(entities))
    
    def _extract_keywords(self, query: str) -> List[str]:
        """提取关键词"""
        import re
        words = re.findall(r'\b[\u4e00-\u9fa5]+|[a-zA-Z]{2,}\b', query)
        stop_words = {"的", "是", "在", "和", "了", "有", "不", "这", "个", "上"}
        return [w for w in words if w.lower() not in stop_words and len(w) > 1]
    
    def _expand_query(
        self,
        query: str,
        intent: str,
        entities: List[str]
    ) -> List[str]:
        """扩展查询生成多个搜索变体"""
        expanded = [query]
        
        if intent == "how_to":
            expanded.append(f"{query} 教程")
            expanded.append(f"{query} 示例")
        elif intent == "troubleshoot":
            expanded.append(f"{query} 解决方案")
            expanded.append(f"{query} 修复")
        
        for entity in entities:
            expanded.append(f"{entity} {query}")
        
        return list(set(expanded))


class Dispatcher:
    """
    调度器
    
    执行初始检索并返回结果
    """
    
    def __init__(
        self,
        vector_store: Any,
        text_splitter: Any = None,
        top_k: int = 10
    ):
        self.vector_store = vector_store
        self.text_splitter = text_splitter
        self.top_k = top_k
        self.query_parser = QueryParser()
    
    def dispatch(self, query: str) -> List[Document]:
        """
        执行初始检索
        
        参数:
            query: 用户查询
        
        返回:
            检索到的文档列表
        """
        parsed = self.query_parser.parse(query)
        all_results = []
        
        for expanded_query in parsed["expanded_queries"][:3]:
            results = self._search(expanded_query)
            all_results.extend(results)
        
        unique_results = self._deduplicate(all_results)
        return unique_results[:self.top_k]
    
    def _search(self, query: str) -> List[Document]:
        """执行向量搜索"""
        results = self.vector_store.similarity_search(query, k=self.top_k)
        return results
    
    def _deduplicate(self, documents: List[Document]) -> List[Document]:
        """去重文档"""
        seen = set()
        unique = []
        for doc in documents:
            if doc.id not in seen:
                seen.add(doc.id)
                unique.append(doc)
        return unique
```

### 阶段 2: EVALUATE - 评估结果

```python
class RelevanceScorer:
    """
    相关性评分器
    
    使用多因素计算文档与查询的相关性
    """
    
    def __init__(
        self,
        semantic_model: Any = None,
        weights: Dict[str, float] = None
    ):
        self.semantic_model = semantic_model
        self.weights = weights or {
            "semantic_similarity": 0.4,
            "keyword_overlap": 0.2,
            "entity_match": 0.2,
            "recency": 0.1,
            "source_quality": 0.1
        }
    
    def score(
        self,
        query: str,
        documents: List[Document],
        parsed_query: Dict[str, Any]
    ) -> List[RelevanceScore]:
        """
        计算相关性分数
        
        返回每个文档的综合相关性评分
        """
        scores = []
        
        for doc in documents:
            factors = {}
            
            factors["semantic_similarity"] = self._semantic_score(query, doc.content)
            factors["keyword_overlap"] = self._keyword_overlap_score(
                parsed_query["keywords"],
                doc.content
            )
            factors["entity_match"] = self._entity_match_score(
                parsed_query["entities"],
                doc.content
            )
            factors["recency"] = self._recency_score(doc.timestamp)
            factors["source_quality"] = self._source_quality_score(doc.source)
            
            total_score = sum(
                factors[factor] * weight
                for factor, weight in self.weights.items()
            )
            
            scores.append(RelevanceScore(
                document_id=doc.id,
                score=total_score,
                factors=factors
            ))
        
        return scores
    
    def _semantic_score(self, query: str, content: str) -> float:
        """计算语义相似度"""
        if self.semantic_model:
            import numpy as np
            query_emb = self.semantic_model.encode(query, normalize_embeddings=True)
            content_emb = self.semantic_model.encode(content, normalize_embeddings=True)
            return float(np.dot(query_emb, content_emb))
        return 0.5
    
    def _keyword_overlap_score(
        self,
        keywords: List[str],
        content: str
    ) -> float:
        """计算关键词重叠分数"""
        if not keywords:
            return 0.5
        content_lower = content.lower()
        matches = sum(1 for kw in keywords if kw.lower() in content_lower)
        return matches / len(keywords)
    
    def _entity_match_score(
        self,
        entities: List[str],
        content: str
    ) -> float:
        """计算实体匹配分数"""
        if not entities:
            return 0.5
        content_lower = content.lower()
        matches = sum(1 for e in entities if e.lower() in content_lower)
        return matches / len(entities)
    
    def _recency_score(self, timestamp: datetime) -> float:
        """计算时效性分数"""
        import datetime as dt
        age_days = (dt.datetime.now() - timestamp).days
        if age_days < 30:
            return 1.0
        elif age_days < 90:
            return 0.8
        elif age_days < 365:
            return 0.6
        return 0.4
    
    def _source_quality_score(self, source: str) -> float:
        """计算来源质量分数"""
        high_quality_sources = {
            "official_docs": 1.0,
            "github": 0.9,
            "stackoverflow": 0.8,
            "blog": 0.7,
            "forum": 0.6
        }
        return high_quality_sources.get(source, 0.5)


class GapIdentifier:
    """
    上下文缺口识别器
    
    识别当前上下文中缺失的关键信息
    """
    
    def __init__(self):
        self.critical_patterns = [
            r'\b(?:错误|error|exception|失败|fail)\b',
            r'\b(?:配置|config|设置|setting)\b',
            r'\b(?:版本|version|v\d+)\b',
            r'\b(?:示例|example|demo|代码|code)\b',
        ]
    
    def identify(
        self,
        query: str,
        documents: List[Document],
        parsed_query: Dict[str, Any]
    ) -> List[ContextGap]:
        """
        识别上下文缺口
        
        返回缺失的关键信息列表
        """
        gaps = []
        
        query_entities = set(parsed_query["entities"])
        context_entities = self._extract_all_entities(documents)
        
        for entity in query_entities - context_entities:
            gaps.append(ContextGap(
                missing_entity=entity,
                importance=0.8,
                suggested_query=f"{entity} 详细说明"
            ))
        
        intent = parsed_query["intent"]
        missing_critical = self._check_critical_info(intent, documents)
        
        for info_type in missing_critical:
            gaps.append(ContextGap(
                missing_entity=info_type,
                importance=0.9,
                suggested_query=f"{parsed_query['original_query']} {info_type}"
            ))
        
        return sorted(gaps, key=lambda x: x.importance, reverse=True)
    
    def _extract_all_entities(self, documents: List[Document]) -> Set[str]:
        """从所有文档中提取实体"""
        import re
        entities = set()
        for doc in documents:
            tech_pattern = r'\b(?:API|SDK|HTTP|REST|GraphQL|SQL|NoSQL|Redis|MongoDB|PostgreSQL|Python|JavaScript|TypeScript|React|Vue|Django|FastAPI)\b'
            entities.update(re.findall(tech_pattern, doc.content, re.IGNORECASE))
        return entities
    
    def _check_critical_info(
        self,
        intent: str,
        documents: List[Document]
    ) -> List[str]:
        """检查是否缺少关键信息"""
        missing = []
        all_content = " ".join(d.content for d in documents).lower()
        
        if intent == "how_to":
            if "示例" not in all_content and "example" not in all_content:
                missing.append("代码示例")
            if "步骤" not in all_content and "step" not in all_content:
                missing.append("实现步骤")
        
        elif intent == "troubleshoot":
            if "解决" not in all_content and "solution" not in all_content:
                missing.append("解决方案")
            if "原因" not in all_content and "cause" not in all_content:
                missing.append("问题原因")
        
        return missing


class Evaluator:
    """
    评估器
    
    综合评估检索结果的质量和完整性
    """
    
    def __init__(
        self,
        relevance_threshold: float = 0.6,
        min_documents: int = 3,
        max_gap_count: int = 2
    ):
        self.relevance_threshold = relevance_threshold
        self.min_documents = min_documents
        self.max_gap_count = max_gap_count
        self.scorer = RelevanceScorer()
        self.gap_identifier = GapIdentifier()
    
    def evaluate(
        self,
        query: str,
        documents: List[Document],
        parsed_query: Dict[str, Any]
    ) -> RetrievalResult:
        """
        执行完整评估
        
        返回包含评分和缺口的评估结果
        """
        relevance_scores = self.scorer.score(query, documents, parsed_query)
        gaps = self.gap_identifier.identify(query, documents, parsed_query)
        
        avg_relevance = (
            sum(s.score for s in relevance_scores) / len(relevance_scores)
            if relevance_scores else 0
        )
        
        high_relevance_count = sum(
            1 for s in relevance_scores
            if s.score >= self.relevance_threshold
        )
        
        is_sufficient = (
            avg_relevance >= self.relevance_threshold and
            high_relevance_count >= self.min_documents and
            len(gaps) <= self.max_gap_count
        )
        
        return RetrievalResult(
            documents=documents,
            relevance_scores=relevance_scores,
            gaps_identified=gaps,
            iteration_count=0,
            is_sufficient=is_sufficient
        )
```

### 阶段 3: REFINE - 优化查询

```python
class QueryRefiner:
    """
    查询优化器
    
    基于评估结果生成优化后的查询
    """
    
    def __init__(self):
        self.refinement_strategies = {
            "entity_gap": self._refine_by_entity_gap,
            "intent_gap": self._refine_by_intent_gap,
            "low_relevance": self._refine_by_low_relevance
        }
    
    def refine(
        self,
        original_query: str,
        evaluation: RetrievalResult,
        parsed_query: Dict[str, Any]
    ) -> List[str]:
        """
        生成优化查询
        
        返回优化后的查询列表
        """
        refined_queries = []
        
        for gap in evaluation.gaps_identified:
            refined_queries.append(gap.suggested_query)
        
        if not refined_queries:
            avg_score = sum(s.score for s in evaluation.relevance_scores) / len(evaluation.relevance_scores)
            if avg_score < 0.5:
                refined_queries = self._refine_by_low_relevance(
                    original_query,
                    parsed_query
                )
        
        if not refined_queries:
            refined_queries = [f"{original_query} 详细教程"]
        
        return refined_queries[:3]
    
    def _refine_by_entity_gap(
        self,
        query: str,
        missing_entities: List[str]
    ) -> List[str]:
        """基于实体缺口优化"""
        return [f"{query} {entity}" for entity in missing_entities]
    
    def _refine_by_intent_gap(
        self,
        query: str,
        intent: str,
        missing_info: List[str]
    ) -> List[str]:
        """基于意图缺口优化"""
        refinements = []
        for info in missing_info:
            refinements.append(f"{query} {info}")
        return refinements
    
    def _refine_by_low_relevance(
        self,
        query: str,
        parsed_query: Dict[str, Any]
    ) -> List[str]:
        """基于低相关性优化"""
        keywords = parsed_query["keywords"]
        if len(keywords) > 2:
            return [" ".join(keywords[:3])]
        return [f"{query} 完整指南"]
```

### 阶段 4: LOOP - 循环检索

```python
class IterativeRetriever:
    """
    迭代检索器
    
    整合 4 阶段循环检索的完整实现
    """
    
    def __init__(
        self,
        vector_store: Any,
        max_iterations: int = 3,
        relevance_threshold: float = 0.6,
        min_documents: int = 3,
        semantic_model: Any = None
    ):
        self.max_iterations = max_iterations
        self.relevance_threshold = relevance_threshold
        self.min_documents = min_documents
        
        self.dispatcher = Dispatcher(vector_store)
        self.evaluator = Evaluator(
            relevance_threshold=relevance_threshold,
            min_documents=min_documents
        )
        self.query_refiner = QueryRefiner()
        
        if semantic_model:
            self.evaluator.scorer.semantic_model = semantic_model
    
    def retrieve(self, query: str) -> RetrievalResult:
        """
        执行完整的迭代检索流程
        
        参数:
            query: 用户查询
        
        返回:
            最终检索结果
        """
        import time
        start_time = time.time()
        
        state = IterationState(
            current_phase=RetrievalPhase.DISPATCH,
            iteration=0
        )
        
        documents = self.dispatcher.dispatch(query)
        parsed_query = self.dispatcher.query_parser.parse(query)
        state.query_history.append(query)
        
        while state.iteration < self.max_iterations:
            state.current_phase = RetrievalPhase.EVALUATE
            evaluation = self.evaluator.evaluate(query, documents, parsed_query)
            evaluation.iteration_count = state.iteration
            state.gap_history.append(evaluation.gaps_identified)
            
            if evaluation.is_sufficient:
                evaluation.elapsed_time = time.time() - start_time
                return evaluation
            
            state.current_phase = RetrievalPhase.REFINE
            refined_queries = self.query_refiner.refine(
                query,
                evaluation,
                parsed_query
            )
            
            state.current_phase = RetrievalPhase.LOOP
            state.iteration += 1
            state.accumulated_documents.extend(documents)
            
            new_documents = []
            for refined_query in refined_queries:
                state.query_history.append(refined_query)
                new_docs = self.dispatcher.dispatch(refined_query)
                new_documents.extend(new_docs)
            
            documents = self._merge_and_deduplicate(
                state.accumulated_documents,
                new_documents
            )
        
        final_evaluation = self.evaluator.evaluate(
            query,
            state.accumulated_documents,
            parsed_query
        )
        final_evaluation.iteration_count = state.iteration
        final_evaluation.elapsed_time = time.time() - start_time
        
        return final_evaluation
    
    def _merge_and_deduplicate(
        self,
        existing: List[Document],
        new: List[Document]
    ) -> List[Document]:
        """合并并去重文档"""
        seen = {doc.id for doc in existing}
        merged = list(existing)
        for doc in new:
            if doc.id not in seen:
                seen.add(doc.id)
                merged.append(doc)
        return merged
```

## 实际应用案例

### 案例 1: 技术文档检索

```python
async def tech_docs_retrieval_example():
    """
    技术文档检索示例
    
    场景：用户查询"如何在 Django 中实现 JWT 认证"
    """
    from typing import Any
    
    vector_store = MockVectorStore()
    retriever = IterativeRetriever(
        vector_store=vector_store,
        max_iterations=3,
        relevance_threshold=0.65,
        min_documents=5
    )
    
    query = "如何在 Django 中实现 JWT 认证"
    
    result = retriever.retrieve(query)
    
    print(f"=== 检索结果报告 ===")
    print(f"迭代次数: {result.iteration_count}")
    print(f"是否充分: {result.is_sufficient}")
    print(f"文档数量: {len(result.documents)}")
    print(f"耗时: {result.elapsed_time:.2f}秒")
    
    if result.relevance_scores:
        avg_score = sum(s.score for s in result.relevance_scores) / len(result.relevance_scores)
        print(f"平均相关性: {avg_score:.2f}")
    
    if result.gaps_identified:
        print(f"\n识别的缺口:")
        for gap in result.gaps_identified:
            print(f"  - {gap.missing_entity} (重要性: {gap.importance:.2f})")
    
    return result


class MockVectorStore:
    """模拟向量存储用于演示"""
    
    def similarity_search(self, query: str, k: int = 10) -> List[Document]:
        """模拟相似度搜索"""
        mock_docs = [
            Document(
                id="doc1",
                content="Django JWT 认证教程：使用 djangorestframework-simplejwt 库实现...",
                source="official_docs",
                metadata={"framework": "Django", "topic": "JWT"}
            ),
            Document(
                id="doc2",
                content="JWT 认证配置示例代码：settings.py 配置...",
                source="github",
                metadata={"type": "code_example"}
            ),
        ]
        return mock_docs
```

### 案例 2: 故障排查检索

```python
async def troubleshooting_retrieval_example():
    """
    故障排查检索示例
    
    场景：用户遇到错误需要查找解决方案
    """
    vector_store = MockVectorStore()
    retriever = IterativeRetriever(
        vector_store=vector_store,
        max_iterations=4,
        relevance_threshold=0.7,
        min_documents=3
    )
    
    query = "Django 迁移时出现 CircularDependencyError 错误"
    
    result = retriever.retrieve(query)
    
    print(f"=== 故障排查检索报告 ===")
    print(f"查询: {query}")
    print(f"迭代次数: {result.iteration_count}")
    
    high_relevance_docs = [
        doc for doc, score in zip(result.documents, result.relevance_scores)
        if score.score >= 0.7
    ]
    print(f"高相关性文档: {len(high_relevance_docs)}")
    
    return result
```

### 案例 3: 多语言代码检索

```python
async def multilingual_code_retrieval():
    """
    多语言代码检索示例
    
    场景：跨语言查找相似实现模式
    """
    vector_store = MockVectorStore()
    retriever = IterativeRetriever(
        vector_store=vector_store,
        max_iterations=2,
        relevance_threshold=0.6,
        min_documents=4
    )
    
    query = "实现一个单例模式的最佳方式"
    
    result = retriever.retrieve(query)
    
    print(f"=== 多语言代码检索报告 ===")
    
    languages_found = set()
    for doc in result.documents:
        lang = doc.metadata.get("language", "unknown")
        languages_found.add(lang)
    
    print(f"覆盖语言: {', '.join(languages_found)}")
    
    return result
```

## 性能优化配置

```python
RECOMMENDED_CONFIGS = {
    "simple_query": {
        "max_iterations": 2,
        "relevance_threshold": 0.7,
        "min_documents": 3,
        "description": "简单查询，快速响应"
    },
    "complex_query": {
        "max_iterations": 3,
        "relevance_threshold": 0.65,
        "min_documents": 5,
        "description": "复杂查询，平衡质量与速度"
    },
    "research_task": {
        "max_iterations": 5,
        "relevance_threshold": 0.6,
        "min_documents": 8,
        "description": "研究任务，追求全面性"
    },
    "troubleshooting": {
        "max_iterations": 4,
        "relevance_threshold": 0.7,
        "min_documents": 4,
        "description": "故障排查，注重准确性"
    }
}


def get_config_for_query(query: str, intent: str) -> Dict[str, Any]:
    """
    根据查询特征获取推荐配置
    """
    if intent == "troubleshoot":
        return RECOMMENDED_CONFIGS["troubleshooting"]
    elif intent == "how_to" and len(query) > 50:
        return RECOMMENDED_CONFIGS["complex_query"]
    elif intent == "research":
        return RECOMMENDED_CONFIGS["research_task"]
    return RECOMMENDED_CONFIGS["simple_query"]
```

## 最佳实践

### 1. 避免无限循环

```python
class SafeIterativeRetriever(IterativeRetriever):
    """带安全机制的迭代检索器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.max_total_time = 30.0
    
    def retrieve(self, query: str) -> RetrievalResult:
        import time
        start = time.time()
        
        result = super().retrieve(query)
        
        if time.time() - start > self.max_total_time:
            result.is_sufficient = True
        
        return result
```

### 2. 缓存中间结果

```python
from functools import lru_cache
import hashlib

class CachedIterativeRetriever(IterativeRetriever):
    """带缓存的迭代检索器"""
    
    def __init__(self, *args, cache_size: int = 100, **kwargs):
        super().__init__(*args, **kwargs)
        self._cache: Dict[str, RetrievalResult] = {}
        self.cache_size = cache_size
    
    def _get_cache_key(self, query: str) -> str:
        return hashlib.md5(query.encode()).hexdigest()
    
    def retrieve(self, query: str) -> RetrievalResult:
        cache_key = self._get_cache_key(query)
        
        if cache_key in self._cache:
            return self._cache[cache_key]
        
        result = super().retrieve(query)
        
        if len(self._cache) >= self.cache_size:
            self._cache.pop(next(iter(self._cache)))
        
        self._cache[cache_key] = result
        return result
```

### 3. 监控与日志

```python
import logging
from dataclasses import asdict
import json

class MonitoredIterativeRetriever(IterativeRetriever):
    """带监控的迭代检索器"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.logger = logging.getLogger(__name__)
        self.metrics: List[Dict[str, Any]] = []
    
    def retrieve(self, query: str) -> RetrievalResult:
        self.logger.info(f"开始迭代检索: {query}")
        
        result = super().retrieve(query)
        
        metric = {
            "query": query,
            "iterations": result.iteration_count,
            "documents_found": len(result.documents),
            "is_sufficient": result.is_sufficient,
            "elapsed_time": result.elapsed_time,
            "gaps_count": len(result.gaps_identified)
        }
        self.metrics.append(metric)
        
        self.logger.info(
            f"检索完成: 迭代{result.iteration_count}次, "
            f"找到{len(result.documents)}个文档, "
            f"耗时{result.elapsed_time:.2f}秒"
        )
        
        return result
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """获取性能指标摘要"""
        if not self.metrics:
            return {}
        
        return {
            "total_queries": len(self.metrics),
            "avg_iterations": sum(m["iterations"] for m in self.metrics) / len(self.metrics),
            "avg_documents": sum(m["documents_found"] for m in self.metrics) / len(self.metrics),
            "avg_time": sum(m["elapsed_time"] for m in self.metrics) / len(self.metrics),
            "sufficiency_rate": sum(1 for m in self.metrics if m["is_sufficient"]) / len(self.metrics)
        }
```

## 注意事项

| 问题 | 解决方案 |
|------|----------|
| 无限循环 | 必须设置 max_iterations 和 max_total_time |
| 延迟增加 | 根据场景调整迭代次数和阈值 |
| 内存占用 | 使用生成器处理大量文档 |
| 结果质量不稳定 | 动态调整相关性阈值 |
| 缓存过期 | 实现 TTL 机制清理过期缓存 |

## 快速参考

| 阶段 | 职责 | 关键输出 |
|------|------|----------|
| DISPATCH | 初始检索 | 文档列表 |
| EVALUATE | 评估质量 | 相关性分数、缺口列表 |
| REFINE | 优化策略 | 优化查询列表 |
| LOOP | 循环控制 | 合并后的上下文 |

**核心原则**: 迭代检索通过多轮优化，逐步提升上下文质量，直到满足充分性标准或达到迭代上限。
