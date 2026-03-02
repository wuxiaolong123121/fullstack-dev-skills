# RAG Architect 参考

> Reference for: fullstack-dev-skills
> Load when: 向量数据库、嵌入、语义搜索、检索策略

## 向量数据库

### 连接配置

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class VectorStoreConfig:
    """
    向量存储配置
    """
    provider: str          # pinecone, weaviate, milvus, qdrant
    collection: str
    dimension: int
    metric: str = "cosine"
    host: Optional[str] = None
    api_key: Optional[str] = None

class VectorStore:
    """
    向量数据库客户端
    """
    
    def __init__(self, config: VectorStoreConfig):
        """
        初始化向量存储
        
        Args:
            config: 存储配置
        """
        self.config = config
        self._client = self._create_client()
    
    def upsert(
        self,
        ids: List[str],
        vectors: List[List[float]],
        metadata: List[Dict[str, Any]]
    ) -> bool:
        """
        插入或更新向量
        
        Args:
            ids: 文档 ID 列表
            vectors: 向量列表
            metadata: 元数据列表
            
        Returns:
            操作是否成功
        """
        pass
    
    def query(
        self,
        vector: List[float],
        top_k: int = 10,
        filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        """
        查询相似向量
        
        Args:
            vector: 查询向量
            top_k: 返回数量
            filter: 元数据过滤条件
            
        Returns:
            相似文档列表
        """
        pass
    
    def delete(self, ids: List[str]) -> bool:
        """
        删除向量
        
        Args:
            ids: 要删除的文档 ID
            
        Returns:
            操作是否成功
        """
        pass
```

## 嵌入模型

### 文本嵌入

```python
from typing import List, Union
import numpy as np

class EmbeddingModel:
    """
    嵌入模型封装
    """
    
    def __init__(
        self,
        model_name: str = "text-embedding-3-small",
        dimension: int = 1536
    ):
        """
        初始化嵌入模型
        
        Args:
            model_name: 模型名称
            dimension: 向量维度
        """
        self.model_name = model_name
        self.dimension = dimension
    
    def embed(
        self,
        texts: Union[str, List[str]]
    ) -> np.ndarray:
        """
        生成文本嵌入
        
        Args:
            texts: 单个文本或文本列表
            
        Returns:
            嵌入向量数组
        """
        pass
    
    def embed_query(self, query: str) -> List[float]:
        """
        生成查询嵌入
        
        Args:
            query: 查询文本
            
        Returns:
            嵌入向量
        """
        return self.embed(query).tolist()[0]
    
    def embed_documents(
        self,
        documents: List[str]
    ) -> List[List[float]]:
        """
        批量生成文档嵌入
        
        Args:
            documents: 文档列表
            
        Returns:
            嵌入向量列表
        """
        return self.embed(documents).tolist()
```

### 多模态嵌入

```python
from typing import Union
from pathlib import Path

class MultiModalEmbedding:
    """
    多模态嵌入模型
    """
    
    def embed_image(
        self,
        image: Union[str, Path, bytes]
    ) -> List[float]:
        """
        生成图像嵌入
        
        Args:
            image: 图像路径或字节数据
            
        Returns:
            嵌入向量
        """
        pass
    
    def embed_text_image(
        self,
        text: str,
        image: Union[str, Path, bytes]
    ) -> List[float]:
        """
        生成图文联合嵌入
        
        Args:
            text: 文本内容
            image: 图像数据
            
        Returns:
            联合嵌入向量
        """
        pass
```

## 检索策略

### 混合检索

```python
from typing import List, Dict, Any
from dataclasses import dataclass

@dataclass
class HybridSearchConfig:
    """
    混合检索配置
    """
    vector_weight: float = 0.7
    keyword_weight: float = 0.3
    top_k: int = 10
    rerank: bool = True

class HybridRetriever:
    """
    混合检索器
    """
    
    def __init__(
        self,
        vector_store: VectorStore,
        keyword_store: Any,
        config: HybridSearchConfig
    ):
        """
        初始化混合检索器
        
        Args:
            vector_store: 向量存储
            keyword_store: 关键词存储
            config: 检索配置
        """
        self.vector_store = vector_store
        self.keyword_store = keyword_store
        self.config = config
    
    def retrieve(
        self,
        query: str,
        query_vector: List[float]
    ) -> List[Dict[str, Any]]:
        """
        执行混合检索
        
        Args:
            query: 查询文本
            query_vector: 查询向量
            
        Returns:
            检索结果列表
        """
        # 向量检索
        vector_results = self.vector_store.query(
            query_vector,
            top_k=self.config.top_k * 2
        )
        
        # 关键词检索
        keyword_results = self.keyword_store.search(
            query,
            top_k=self.config.top_k * 2
        )
        
        # 融合结果
        merged = self._merge_results(
            vector_results,
            keyword_results
        )
        
        # 重排序
        if self.config.rerank:
            merged = self._rerank(query, merged)
        
        return merged[:self.config.top_k]
    
    def _merge_results(
        self,
        vector_results: List[Dict],
        keyword_results: List[Dict]
    ) -> List[Dict]:
        """
        融合检索结果
        
        Args:
            vector_results: 向量检索结果
            keyword_results: 关键词检索结果
            
        Returns:
            融合后的结果
        """
        scores = {}
        
        for i, r in enumerate(vector_results):
            doc_id = r['id']
            scores[doc_id] = scores.get(doc_id, 0) + \
                self.config.vector_weight * (1 - i / len(vector_results))
        
        for i, r in enumerate(keyword_results):
            doc_id = r['id']
            scores[doc_id] = scores.get(doc_id, 0) + \
                self.config.keyword_weight * (1 - i / len(keyword_results))
        
        return sorted(scores.items(), key=lambda x: x[1], reverse=True)
```

### 重排序

```python
from typing import List, Dict, Any

class Reranker:
    """
    重排序器
    """
    
    def __init__(self, model_name: str = "cross-encoder"):
        """
        初始化重排序器
        
        Args:
            model_name: 重排序模型名称
        """
        self.model_name = model_name
    
    def rerank(
        self,
        query: str,
        documents: List[Dict[str, Any]],
        top_k: int = 10
    ) -> List[Dict[str, Any]]:
        """
        重排序文档
        
        Args:
            query: 查询文本
            documents: 文档列表
            top_k: 返回数量
            
        Returns:
            重排序后的文档列表
        """
        pairs = [(query, doc['content']) for doc in documents]
        scores = self._score_pairs(pairs)
        
        scored_docs = list(zip(documents, scores))
        scored_docs.sort(key=lambda x: x[1], reverse=True)
        
        return [
            {**doc, 'rerank_score': score}
            for doc, score in scored_docs[:top_k]
        ]
```

## RAG Pipeline

### 完整流程

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

@dataclass
class RAGConfig:
    """
    RAG 配置
    """
    chunk_size: int = 512
    chunk_overlap: int = 50
    top_k: int = 5
    temperature: float = 0.7
    max_tokens: int = 1024

class RAGPipeline:
    """
    RAG 管道
    """
    
    def __init__(
        self,
        embedding_model: EmbeddingModel,
        vector_store: VectorStore,
        llm: Any,
        config: RAGConfig
    ):
        """
        初始化 RAG 管道
        
        Args:
            embedding_model: 嵌入模型
            vector_store: 向量存储
            llm: 语言模型
            config: RAG 配置
        """
        self.embedding_model = embedding_model
        self.vector_store = vector_store
        self.llm = llm
        self.config = config
    
    def index_documents(
        self,
        documents: List[Dict[str, Any]]
    ) -> int:
        """
        索引文档
        
        Args:
            documents: 文档列表
            
        Returns:
            索引的文档数量
        """
        chunks = self._chunk_documents(documents)
        vectors = self.embedding_model.embed_documents(
            [c['content'] for c in chunks]
        )
        
        self.vector_store.upsert(
            ids=[c['id'] for c in chunks],
            vectors=vectors,
            metadata=[c['metadata'] for c in chunks]
        )
        
        return len(chunks)
    
    def query(
        self,
        question: str,
        filter: Optional[Dict] = None
    ) -> Dict[str, Any]:
        """
        查询 RAG 系统
        
        Args:
            question: 问题
            filter: 元数据过滤条件
            
        Returns:
            回答和来源
        """
        # 生成查询向量
        query_vector = self.embedding_model.embed_query(question)
        
        # 检索相关文档
        results = self.vector_store.query(
            query_vector,
            top_k=self.config.top_k,
            filter=filter
        )
        
        # 构建上下文
        context = self._build_context(results)
        
        # 生成回答
        answer = self._generate_answer(question, context)
        
        return {
            'answer': answer,
            'sources': results,
            'context': context
        }
    
    def _generate_answer(
        self,
        question: str,
        context: str
    ) -> str:
        """
        生成回答
        
        Args:
            question: 问题
            context: 上下文
            
        Returns:
            生成的回答
        """
        prompt = f"""
基于以下上下文回答问题。如果上下文中没有相关信息，请说明无法回答。

上下文：
{context}

问题：{question}

回答：
"""
        return self.llm.generate(prompt)
```

## Quick Reference

| 组件 | 用途 | 工具选择 |
|------|------|----------|
| 向量数据库 | 存储嵌入 | Pinecone / Milvus / Qdrant |
| 嵌入模型 | 生成向量 | OpenAI / Cohere / BGE |
| 检索策略 | 提高召回 | 混合检索 / 多查询 |
| 重排序 | 提高精度 | Cross-Encoder / LLM |
| 分块 | 文档切分 | 语义分块 / 固定窗口 |
| 评估 | 质量评估 | RAGAS / TruLens |
