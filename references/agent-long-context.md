# Agent 长上下文管理参考

长上下文管理策略、压缩算法、摘要生成机制和关键信息提取技术，用于构建高效、可扩展的 AI Agent 系统。

## When to Activate

- 处理超长对话历史
- 构建需要长期记忆的 Agent
- 优化 Token 使用成本
- 实现上下文窗口管理

## Core Principles

### 1. 分层压缩原则

长上下文应按信息重要性分层处理，保留关键信息，压缩冗余内容。

```python
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum

class ContextPriority(Enum):
    """上下文优先级枚举"""
    CRITICAL = 1      # 关键信息：必须保留
    HIGH = 2          # 高优先级：尽量保留
    MEDIUM = 3        # 中优先级：可压缩
    LOW = 4           # 低优先级：可丢弃

@dataclass
class ContextSegment:
    """上下文片段数据类"""
    content: str
    priority: ContextPriority
    timestamp: float
    token_count: int
    summary: Optional[str] = None
    metadata: dict = field(default_factory=dict)
```

### 2. 滑动窗口策略

保持最近上下文的完整性，对历史内容进行渐进式压缩。

```python
from collections import deque
from typing import Iterator

class SlidingWindowContext:
    """滑动窗口上下文管理器"""
    
    def __init__(
        self,
        max_tokens: int = 4000,
        window_size: int = 1000,
        compression_ratio: float = 0.3
    ):
        """
        初始化滑动窗口管理器
        
        Args:
            max_tokens: 最大 Token 容量
            window_size: 完整保留的窗口大小
            compression_ratio: 历史内容压缩比例
        """
        self.max_tokens = max_tokens
        self.window_size = window_size
        self.compression_ratio = compression_ratio
        self._context_buffer: deque[ContextSegment] = deque()
        self._current_tokens = 0
    
    def add_segment(self, segment: ContextSegment) -> None:
        """添加新的上下文片段"""
        self._context_buffer.append(segment)
        self._current_tokens += segment.token_count
        
        if self._current_tokens > self.max_tokens:
            self._compress_oldest()
    
    def _compress_oldest(self) -> None:
        """压缩最早的上下文片段"""
        while self._current_tokens > self.max_tokens and len(self._context_buffer) > 1:
            oldest = self._context_buffer.popleft()
            compressed = self._compress_segment(oldest)
            self._context_buffer.appendleft(compressed)
            self._current_tokens -= (oldest.token_count - compressed.token_count)
    
    def _compress_segment(self, segment: ContextSegment) -> ContextSegment:
        """压缩单个片段"""
        if segment.priority == ContextPriority.CRITICAL:
            return segment
        
        compressed_tokens = int(segment.token_count * self.compression_ratio)
        summary = self._generate_summary(segment.content)
        
        return ContextSegment(
            content=segment.content,
            priority=segment.priority,
            timestamp=segment.timestamp,
            token_count=compressed_tokens,
            summary=summary,
            metadata={**segment.metadata, "compressed": True}
        )
    
    def _generate_summary(self, content: str) -> str:
        """生成内容摘要"""
        pass
    
    def get_context(self) -> Iterator[ContextSegment]:
        """获取当前上下文迭代器"""
        return iter(self._context_buffer)
```

### 3. 信息密度最大化

在有限 Token 内保留最大信息量，去除冗余和噪声。

```python
import re
from typing import List, Tuple

class InformationDensityOptimizer:
    """信息密度优化器"""
    
    def __init__(self):
        self._stop_patterns = [
            r'\b(嗯|啊|那个|这个|就是|然后)\b',
            r'\s+',
            r'重复的短语.*重复的短语',
        ]
    
    def optimize(self, text: str) -> str:
        """
        优化文本信息密度
        
        Args:
            text: 原始文本
        
        Returns:
            优化后的高密度文本
        """
        result = text
        for pattern in self._stop_patterns:
            result = re.sub(pattern, ' ', result, flags=re.IGNORECASE)
        
        result = self._remove_redundancy(result)
        result = self._normalize_whitespace(result)
        
        return result.strip()
    
    def _remove_redundancy(self, text: str) -> str:
        """移除冗余内容"""
        sentences = text.split('。')
        seen = set()
        unique_sentences = []
        
        for sentence in sentences:
            normalized = sentence.strip()
            if normalized and normalized not in seen:
                seen.add(normalized)
                unique_sentences.append(normalized)
        
        return '。'.join(unique_sentences)
    
    def _normalize_whitespace(self, text: str) -> str:
        """规范化空白字符"""
        return re.sub(r'\s+', ' ', text)
```

## 上下文压缩策略

### 分层摘要压缩

```python
from abc import ABC, abstractmethod
from typing import Protocol

class CompressionStrategy(Protocol):
    """压缩策略协议"""
    
    def compress(self, content: str, target_ratio: float) -> str:
        """
        压缩内容
        
        Args:
            content: 原始内容
            target_ratio: 目标压缩比例
        
        Returns:
            压缩后的内容
        """
        ...

class HierarchicalSummarizer:
    """分层摘要压缩器"""
    
    def __init__(
        self,
        chunk_size: int = 500,
        overlap: int = 50,
        summary_ratio: float = 0.2
    ):
        """
        初始化分层摘要器
        
        Args:
            chunk_size: 分块大小（Token 数）
            overlap: 块间重叠大小
            summary_ratio: 摘要压缩比例
        """
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.summary_ratio = summary_ratio
    
    def hierarchical_compress(
        self,
        content: str,
        levels: int = 3
    ) -> List[str]:
        """
        分层压缩内容
        
        Args:
            content: 原始内容
            levels: 压缩层级数
        
        Returns:
            各层级的摘要列表
        """
        summaries = []
        current_content = content
        
        for level in range(levels):
            chunks = self._split_into_chunks(current_content)
            chunk_summaries = [
                self._summarize_chunk(chunk) 
                for chunk in chunks
            ]
            level_summary = ' '.join(chunk_summaries)
            summaries.append(level_summary)
            current_content = level_summary
        
        return summaries
    
    def _split_into_chunks(self, content: str) -> List[str]:
        """将内容分割成重叠块"""
        words = content.split()
        chunks = []
        
        for i in range(0, len(words), self.chunk_size - self.overlap):
            chunk = ' '.join(words[i:i + self.chunk_size])
            chunks.append(chunk)
        
        return chunks
    
    def _summarize_chunk(self, chunk: str) -> str:
        """生成块摘要"""
        sentences = chunk.split('。')
        key_sentences = sentences[:max(1, int(len(sentences) * self.summary_ratio))]
        return '。'.join(key_sentences)
```

### 语义聚类压缩

```python
from dataclasses import dataclass
from typing import List, Dict, Set
from collections import defaultdict

@dataclass
class SemanticCluster:
    """语义聚类数据类"""
    cluster_id: int
    centroid: str
    members: List[str]
    keywords: Set[str]

class SemanticClusterCompressor:
    """语义聚类压缩器"""
    
    def __init__(
        self,
        similarity_threshold: float = 0.7,
        min_cluster_size: int = 2
    ):
        """
        初始化语义聚类压缩器
        
        Args:
            similarity_threshold: 相似度阈值
            min_cluster_size: 最小聚类大小
        """
        self.similarity_threshold = similarity_threshold
        self.min_cluster_size = min_cluster_size
    
    def compress(self, segments: List[str]) -> List[SemanticCluster]:
        """
        通过语义聚类压缩内容
        
        Args:
            segments: 内容片段列表
        
        Returns:
            语义聚类列表
        """
        clusters = self._cluster_segments(segments)
        return self._merge_similar_clusters(clusters)
    
    def _cluster_segments(self, segments: List[str]) -> List[SemanticCluster]:
        """对片段进行语义聚类"""
        clusters: List[SemanticCluster] = []
        assigned: Set[int] = set()
        
        for i, segment in enumerate(segments):
            if i in assigned:
                continue
            
            cluster_members = [segment]
            cluster_keywords = self._extract_keywords(segment)
            
            for j, other in enumerate(segments[i + 1:], start=i + 1):
                if j in assigned:
                    continue
                
                similarity = self._calculate_similarity(segment, other)
                if similarity >= self.similarity_threshold:
                    cluster_members.append(other)
                    cluster_keywords.update(self._extract_keywords(other))
                    assigned.add(j)
            
            if len(cluster_members) >= self.min_cluster_size:
                clusters.append(SemanticCluster(
                    cluster_id=len(clusters),
                    centroid=segment,
                    members=cluster_members,
                    keywords=cluster_keywords
                ))
                assigned.add(i)
        
        return clusters
    
    def _merge_similar_clusters(
        self,
        clusters: List[SemanticCluster]
    ) -> List[SemanticCluster]:
        """合并相似的聚类"""
        return clusters
    
    def _extract_keywords(self, text: str) -> Set[str]:
        """提取关键词"""
        words = set(text.lower().split())
        stop_words = {'的', '是', '在', '了', '和', '与', '或'}
        return words - stop_words
    
    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """计算文本相似度"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1 & words2
        union = words1 | words2
        
        return len(intersection) / len(union) if union else 0.0
```

### 增量式压缩

```python
from typing import Deque, Optional
from collections import deque
import time

class IncrementalCompressor:
    """增量式压缩器"""
    
    def __init__(
        self,
        buffer_size: int = 10,
        compression_interval: float = 60.0
    ):
        """
        初始化增量压缩器
        
        Args:
            buffer_size: 缓冲区大小
            compression_interval: 压缩间隔（秒）
        """
        self.buffer_size = buffer_size
        self.compression_interval = compression_interval
        self._buffer: Deque[ContextSegment] = deque(maxlen=buffer_size)
        self._compressed_history: List[str] = []
        self._last_compression: float = time.time()
    
    def add(self, segment: ContextSegment) -> Optional[str]:
        """
        添加新片段，返回压缩结果（如有）
        
        Args:
            segment: 新的上下文片段
        
        Returns:
            压缩后的摘要或 None
        """
        self._buffer.append(segment)
        
        current_time = time.time()
        should_compress = (
            current_time - self._last_compression >= self.compression_interval
            or len(self._buffer) >= self.buffer_size
        )
        
        if should_compress:
            return self._compress_buffer()
        
        return None
    
    def _compress_buffer(self) -> str:
        """压缩缓冲区内容"""
        combined = ' '.join(seg.content for seg in self._buffer)
        summary = self._create_incremental_summary(combined)
        
        self._compressed_history.append(summary)
        self._buffer.clear()
        self._last_compression = time.time()
        
        return summary
    
    def _create_incremental_summary(self, content: str) -> str:
        """创建增量摘要"""
        sentences = content.split('。')
        if len(sentences) <= 3:
            return content
        
        first = sentences[0]
        last = sentences[-1] if sentences[-1] else sentences[-2]
        middle_count = len(sentences) - 2
        
        return f"{first}。[省略 {middle_count} 句]。{last}"
```

## 摘要生成机制

### 抽取式摘要

```python
from typing import List, Tuple
import re

class ExtractiveSummarizer:
    """抽取式摘要生成器"""
    
    def __init__(
        self,
        num_sentences: int = 3,
        min_sentence_length: int = 10
    ):
        """
        初始化抽取式摘要器
        
        Args:
            num_sentences: 摘要句子数
            min_sentence_length: 最小句子长度
        """
        self.num_sentences = num_sentences
        self.min_sentence_length = min_sentence_length
    
    def summarize(self, text: str) -> str:
        """
        生成抽取式摘要
        
        Args:
            text: 原始文本
        
        Returns:
            摘要文本
        """
        sentences = self._split_sentences(text)
        scored_sentences = self._score_sentences(sentences)
        
        top_sentences = sorted(
            scored_sentences,
            key=lambda x: x[1],
            reverse=True
        )[:self.num_sentences]
        
        selected = sorted(top_sentences, key=lambda x: x[2])
        
        return '。'.join(s[0] for s in selected)
    
    def _split_sentences(self, text: str) -> List[str]:
        """分割句子"""
        delimiters = r'[。！？\n]'
        sentences = re.split(delimiters, text)
        
        return [
            s.strip() for s in sentences
            if s.strip() and len(s.strip()) >= self.min_sentence_length
        ]
    
    def _score_sentences(
        self,
        sentences: List[str]
    ) -> List[Tuple[str, float, int]]:
        """
        为句子评分
        
        Returns:
            (句子, 分数, 原始位置) 元组列表
        """
        word_freq = self._calculate_word_frequency(sentences)
        max_freq = max(word_freq.values()) if word_freq else 1
        
        scored = []
        for i, sentence in enumerate(sentences):
            words = sentence.split()
            score = sum(
                word_freq.get(word, 0) / max_freq
                for word in words
            ) / len(words) if words else 0
            
            position_weight = 1.0 if i < 3 else 0.8
            final_score = score * position_weight
            
            scored.append((sentence, final_score, i))
        
        return scored
    
    def _calculate_word_frequency(
        self,
        sentences: List[str]
    ) -> Dict[str, int]:
        """计算词频"""
        freq: Dict[str, int] = {}
        stop_words = {'的', '是', '在', '了', '和', '与', '或', '这', '那'}
        
        for sentence in sentences:
            for word in sentence.split():
                if word not in stop_words:
                    freq[word] = freq.get(word, 0) + 1
        
        return freq
```

### 生成式摘要模板

```python
from dataclasses import dataclass
from typing import List, Optional
from enum import Enum

class SummaryType(Enum):
    """摘要类型枚举"""
    CONVERSATION = "conversation"
    DOCUMENT = "document"
    CODE = "code"
    TASK = "task"

@dataclass
class SummaryTemplate:
    """摘要模板数据类"""
    template_id: str
    summary_type: SummaryType
    structure: List[str]
    max_length: int

class TemplateBasedSummarizer:
    """基于模板的摘要生成器"""
    
    def __init__(self):
        self._templates = self._load_default_templates()
    
    def _load_default_templates(self) -> Dict[SummaryType, SummaryTemplate]:
        """加载默认模板"""
        return {
            SummaryType.CONVERSATION: SummaryTemplate(
                template_id="conv_v1",
                summary_type=SummaryType.CONVERSATION,
                structure=[
                    "【对话主题】{topic}",
                    "【参与方】{participants}",
                    "【关键讨论】{key_points}",
                    "【结论/决定】{conclusions}",
                    "【待办事项】{action_items}"
                ],
                max_length=500
            ),
            SummaryType.DOCUMENT: SummaryTemplate(
                template_id="doc_v1",
                summary_type=SummaryType.DOCUMENT,
                structure=[
                    "【文档标题】{title}",
                    "【主要内容】{main_content}",
                    "【关键要点】{key_points}",
                    "【相关引用】{references}"
                ],
                max_length=300
            ),
            SummaryType.CODE: SummaryTemplate(
                template_id="code_v1",
                summary_type=SummaryType.CODE,
                structure=[
                    "【功能描述】{description}",
                    "【输入参数】{inputs}",
                    "【输出结果】{outputs}",
                    "【依赖关系】{dependencies}",
                    "【注意事项】{notes}"
                ],
                max_length=400
            ),
            SummaryType.TASK: SummaryTemplate(
                template_id="task_v1",
                summary_type=SummaryType.TASK,
                structure=[
                    "【任务名称】{task_name}",
                    "【任务状态】{status}",
                    "【完成进度】{progress}",
                    "【遇到问题】{issues}",
                    "【下一步】{next_steps}"
                ],
                max_length=200
            )
        }
    
    def summarize(
        self,
        content: str,
        summary_type: SummaryType,
        extracted_info: Optional[Dict[str, str]] = None
    ) -> str:
        """
        使用模板生成摘要
        
        Args:
            content: 原始内容
            summary_type: 摘要类型
            extracted_info: 预提取的信息
        
        Returns:
            格式化的摘要
        """
        template = self._templates.get(summary_type)
        if not template:
            return content[:template.max_length] if template else content
        
        info = extracted_info or self._extract_info(content, summary_type)
        
        summary_lines = []
        for line_template in template.structure:
            try:
                filled = line_template.format(**info)
                summary_lines.append(filled)
            except KeyError:
                pass
        
        return '\n'.join(summary_lines)
    
    def _extract_info(
        self,
        content: str,
        summary_type: SummaryType
    ) -> Dict[str, str]:
        """从内容中提取模板所需信息"""
        return {
            "topic": "待提取",
            "participants": "待提取",
            "key_points": "待提取",
            "conclusions": "待提取",
            "action_items": "待提取"
        }
```

## 关键信息提取

### 实体识别提取

```python
from dataclasses import dataclass
from typing import List, Set
from enum import Enum
import re

class EntityType(Enum):
    """实体类型枚举"""
    PERSON = "person"
    ORGANIZATION = "organization"
    LOCATION = "location"
    DATE = "date"
    URL = "url"
    EMAIL = "email"
    PHONE = "phone"
    CODE = "code"

@dataclass
class Entity:
    """实体数据类"""
    entity_type: EntityType
    value: str
    start_pos: int
    end_pos: int
    confidence: float

class EntityExtractor:
    """实体识别提取器"""
    
    def __init__(self):
        self._patterns = {
            EntityType.EMAIL: r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}',
            EntityType.URL: r'https?://[^\s<>"{}|\\^`\[\]]+',
            EntityType.PHONE: r'1[3-9]\d{9}',
            EntityType.DATE: r'\d{4}[-/年]\d{1,2}[-/月]\d{1,2}[日]?',
            EntityType.CODE: r'```[\s\S]*?```|`[^`]+`',
        }
    
    def extract(self, text: str) -> List[Entity]:
        """
        从文本中提取实体
        
        Args:
            text: 输入文本
        
        Returns:
            实体列表
        """
        entities = []
        
        for entity_type, pattern in self._patterns.items():
            for match in re.finditer(pattern, text):
                entities.append(Entity(
                    entity_type=entity_type,
                    value=match.group(),
                    start_pos=match.start(),
                    end_pos=match.end(),
                    confidence=1.0
                ))
        
        entities.extend(self._extract_chinese_names(text))
        
        return sorted(entities, key=lambda e: e.start_pos)
    
    def _extract_chinese_names(self, text: str) -> List[Entity]:
        """提取中文人名（简化规则）"""
        name_pattern = r'[\u4e00-\u9fa5]{2,4}(?=说|表示|认为|指出|提到)'
        entities = []
        
        for match in re.finditer(name_pattern, text):
            entities.append(Entity(
                entity_type=EntityType.PERSON,
                value=match.group(),
                start_pos=match.start(),
                end_pos=match.end(),
                confidence=0.7
            ))
        
        return entities
    
    def get_unique_entities(
        self,
        text: str,
        entity_type: Optional[EntityType] = None
    ) -> Set[str]:
        """
        获取唯一实体值集合
        
        Args:
            text: 输入文本
            entity_type: 可选的实体类型过滤
        
        Returns:
            唯一实体值集合
        """
        entities = self.extract(text)
        
        if entity_type:
            entities = [e for e in entities if e.entity_type == entity_type]
        
        return {e.value for e in entities}
```

### 关键短语提取

```python
from typing import List, Tuple
from collections import Counter

class KeyPhraseExtractor:
    """关键短语提取器"""
    
    def __init__(
        self,
        top_n: int = 10,
        min_length: int = 2,
        max_length: int = 8
    ):
        """
        初始化关键短语提取器
        
        Args:
            top_n: 返回的顶级短语数量
            min_length: 最小短语长度
            max_length: 最大短语长度
        """
        self.top_n = top_n
        self.min_length = min_length
        self.max_length = max_length
        self._stop_words = {
            '的', '是', '在', '了', '和', '与', '或', '这', '那',
            '有', '为', '以', '及', '等', '到', '对', '就'
        }
    
    def extract(self, text: str) -> List[Tuple[str, float]]:
        """
        提取关键短语
        
        Args:
            text: 输入文本
        
        Returns:
            (短语, 分数) 元组列表
        """
        candidates = self._extract_candidates(text)
        scored = self._score_candidates(candidates, text)
        
        return sorted(scored, key=lambda x: x[1], reverse=True)[:self.top_n]
    
    def _extract_candidates(self, text: str) -> List[str]:
        """提取候选短语"""
        candidates = []
        
        delimiter_pattern = r'[，。！？；：\s\n\t]+'
        segments = re.split(delimiter_pattern, text)
        
        for segment in segments:
            segment = segment.strip()
            if self.min_length <= len(segment) <= self.max_length:
                if not self._is_stop_phrase(segment):
                    candidates.append(segment)
        
        return candidates
    
    def _is_stop_phrase(self, phrase: str) -> bool:
        """检查是否为停用短语"""
        words = set(phrase.split())
        return words.issubset(self._stop_words)
    
    def _score_candidates(
        self,
        candidates: List[str],
        text: str
    ) -> List[Tuple[str, float]]:
        """为候选短语评分"""
        counter = Counter(candidates)
        total = len(candidates) if candidates else 1
        
        text_len = len(text)
        scored = []
        
        for phrase, freq in counter.items():
            tf_score = freq / total
            
            position_score = self._calculate_position_score(phrase, text)
            
            length_score = min(len(phrase) / 10, 1.0)
            
            final_score = (
                tf_score * 0.5 +
                position_score * 0.3 +
                length_score * 0.2
            )
            
            scored.append((phrase, final_score))
        
        return scored
    
    def _calculate_position_score(self, phrase: str, text: str) -> float:
        """计算位置分数（靠前的短语得分更高）"""
        pos = text.find(phrase)
        if pos == -1:
            return 0.0
        
        relative_pos = pos / len(text) if text else 0
        return 1.0 - relative_pos
```

### 结构化信息提取

```python
from dataclasses import dataclass
from typing import Dict, List, Any, Optional
import re

@dataclass
class StructuredInfo:
    """结构化信息数据类"""
    info_type: str
    content: Dict[str, Any]
    confidence: float

class StructuredInfoExtractor:
    """结构化信息提取器"""
    
    def __init__(self):
        self._extractors = {
            'task': self._extract_task,
            'decision': self._extract_decision,
            'question': self._extract_question,
            'code_block': self._extract_code_block,
            'list': self._extract_list,
        }
    
    def extract_all(self, text: str) -> List[StructuredInfo]:
        """
        提取所有类型的结构化信息
        
        Args:
            text: 输入文本
        
        Returns:
            结构化信息列表
        """
        results = []
        
        for info_type, extractor in self._extractors.items():
            extracted = extractor(text)
            results.extend(extracted)
        
        return results
    
    def _extract_task(self, text: str) -> List[StructuredInfo]:
        """提取任务信息"""
        task_patterns = [
            r'待办[：:]\s*(.+)',
            r'需要(.+)',
            r'请(.+)',
            r'TODO[：:]\s*(.+)',
        ]
        
        results = []
        for pattern in task_patterns:
            for match in re.finditer(pattern, text):
                results.append(StructuredInfo(
                    info_type='task',
                    content={'task': match.group(1).strip()},
                    confidence=0.8
                ))
        
        return results
    
    def _extract_decision(self, text: str) -> List[StructuredInfo]:
        """提取决策信息"""
        decision_patterns = [
            r'决定[：:]\s*(.+)',
            r'结论[：:]\s*(.+)',
            r'最终(.+)',
            r'确定(.+)',
        ]
        
        results = []
        for pattern in decision_patterns:
            for match in re.finditer(pattern, text):
                results.append(StructuredInfo(
                    info_type='decision',
                    content={'decision': match.group(1).strip()},
                    confidence=0.85
                ))
        
        return results
    
    def _extract_question(self, text: str) -> List[StructuredInfo]:
        """提取问题信息"""
        question_pattern = r'([^。！？\n]*[？?])'
        
        results = []
        for match in re.finditer(question_pattern, text):
            question = match.group(1).strip()
            if len(question) > 3:
                results.append(StructuredInfo(
                    info_type='question',
                    content={'question': question},
                    confidence=0.9
                ))
        
        return results
    
    def _extract_code_block(self, text: str) -> List[StructuredInfo]:
        """提取代码块"""
        code_pattern = r'```(\w*)\n([\s\S]*?)```'
        
        results = []
        for match in re.finditer(code_pattern, text):
            language = match.group(1) or 'unknown'
            code = match.group(2).strip()
            
            results.append(StructuredInfo(
                info_type='code_block',
                content={
                    'language': language,
                    'code': code,
                    'length': len(code)
                },
                confidence=1.0
            ))
        
        return results
    
    def _extract_list(self, text: str) -> List[StructuredInfo]:
        """提取列表项"""
        list_patterns = [
            r'^\s*[-*]\s*(.+)$',
            r'^\s*\d+[.、]\s*(.+)$',
        ]
        
        results = []
        lines = text.split('\n')
        
        for line in lines:
            for pattern in list_patterns:
                match = re.match(pattern, line)
                if match:
                    results.append(StructuredInfo(
                        info_type='list_item',
                        content={'item': match.group(1).strip()},
                        confidence=0.95
                    ))
                    break
        
        return results
```

## 完整上下文管理器

```python
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Any
from datetime import datetime
import json

@dataclass
class ContextState:
    """上下文状态数据类"""
    total_tokens: int = 0
    compressed_tokens: int = 0
    segment_count: int = 0
    last_update: str = field(default_factory=lambda: datetime.now().isoformat())
    compression_ratio: float = 0.0

class LongContextManager:
    """长上下文管理器"""
    
    def __init__(
        self,
        max_tokens: int = 8000,
        compression_threshold: float = 0.8,
        enable_entity_extraction: bool = True,
        enable_key_phrase_extraction: bool = True
    ):
        """
        初始化长上下文管理器
        
        Args:
            max_tokens: 最大 Token 容量
            compression_threshold: 触发压缩的阈值比例
            enable_entity_extraction: 启用实体提取
            enable_key_phrase_extraction: 启用关键短语提取
        """
        self.max_tokens = max_tokens
        self.compression_threshold = compression_threshold
        
        self._segments: List[ContextSegment] = []
        self._entity_extractor = EntityExtractor() if enable_entity_extraction else None
        self._key_phrase_extractor = KeyPhraseExtractor() if enable_key_phrase_extraction else None
        self._summarizer = ExtractiveSummarizer()
        self._state = ContextState()
    
    def add_content(
        self,
        content: str,
        priority: ContextPriority = ContextPriority.MEDIUM,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        添加新内容
        
        Args:
            content: 内容文本
            priority: 内容优先级
            metadata: 额外元数据
        """
        token_count = self._estimate_tokens(content)
        
        segment = ContextSegment(
            content=content,
            priority=priority,
            timestamp=datetime.now().timestamp(),
            token_count=token_count,
            metadata=metadata or {}
        )
        
        self._segments.append(segment)
        self._state.total_tokens += token_count
        self._state.segment_count += 1
        
        if self._should_compress():
            self._compress_context()
        
        self._update_state()
    
    def get_context(
        self,
        include_summaries: bool = True,
        include_entities: bool = True
    ) -> Dict[str, Any]:
        """
        获取当前上下文
        
        Args:
            include_summaries: 包含摘要
            include_entities: 包含实体信息
        
        Returns:
            上下文字典
        """
        context = {
            'segments': [
                {
                    'content': seg.summary if seg.summary and include_summaries else seg.content,
                    'priority': seg.priority.name,
                    'timestamp': seg.timestamp,
                    'compressed': seg.summary is not None
                }
                for seg in self._segments
            ],
            'state': {
                'total_tokens': self._state.total_tokens,
                'compressed_tokens': self._state.compressed_tokens,
                'segment_count': self._state.segment_count,
                'compression_ratio': self._state.compression_ratio
            }
        }
        
        if include_entities and self._entity_extractor:
            all_text = ' '.join(seg.content for seg in self._segments)
            context['entities'] = [
                {
                    'type': e.entity_type.value,
                    'value': e.value,
                    'confidence': e.confidence
                }
                for e in self._entity_extractor.extract(all_text)
            ]
        
        return context
    
    def get_summary(self, max_length: int = 500) -> str:
        """
        获取整体摘要
        
        Args:
            max_length: 最大长度
        
        Returns:
            摘要文本
        """
        all_content = ' '.join(
            seg.summary or seg.content 
            for seg in self._segments
        )
        
        return self._summarizer.summarize(all_content)[:max_length]
    
    def _should_compress(self) -> bool:
        """判断是否需要压缩"""
        return (
            self._state.total_tokens >= 
            self.max_tokens * self.compression_threshold
        )
    
    def _compress_context(self) -> None:
        """执行上下文压缩"""
        compressible = [
            seg for seg in self._segments
            if seg.priority != ContextPriority.CRITICAL and seg.summary is None
        ]
        
        compressible.sort(key=lambda s: (s.priority.value, s.timestamp))
        
        for segment in compressible:
            if self._state.total_tokens <= self.max_tokens * 0.6:
                break
            
            original_tokens = segment.token_count
            segment.summary = self._summarizer.summarize(segment.content)
            segment.token_count = self._estimate_tokens(segment.summary)
            
            saved = original_tokens - segment.token_count
            self._state.total_tokens -= saved
            self._state.compressed_tokens += saved
    
    def _estimate_tokens(self, text: str) -> int:
        """估算文本 Token 数"""
        chinese_chars = sum(1 for c in text if '\u4e00' <= c <= '\u9fff')
        other_chars = len(text) - chinese_chars
        
        return chinese_chars + other_chars // 4
    
    def _update_state(self) -> None:
        """更新状态"""
        if self._state.total_tokens > 0:
            self._state.compression_ratio = (
                self._state.compressed_tokens / self._state.total_tokens
            )
        self._state.last_update = datetime.now().isoformat()
    
    def export_state(self) -> str:
        """导出状态为 JSON"""
        return json.dumps(self.get_context(), ensure_ascii=False, indent=2)
    
    def clear(self) -> None:
        """清空上下文"""
        self._segments.clear()
        self._state = ContextState()
```

## 快速参考：压缩策略对比

| 策略 | 适用场景 | 压缩比 | 信息损失 |
|------|----------|--------|----------|
| 滑动窗口 | 实时对话 | 中等 | 低（近期） |
| 分层摘要 | 长文档 | 高 | 中等 |
| 语义聚类 | 重复内容 | 高 | 低 |
| 增量压缩 | 流式数据 | 中等 | 低 |
| 抽取式摘要 | 结构化内容 | 中等 | 低 |

## Anti-Patterns to Avoid

```python
# Bad: 直接丢弃旧内容
def add_content(content: str):
    if len(buffer) > MAX_SIZE:
        buffer.pop(0)  # 直接丢弃，丢失关键信息
    buffer.append(content)

# Good: 压缩而非丢弃
def add_content(content: str):
    if len(buffer) > MAX_SIZE:
        compressed = compress(buffer[0])
        buffer[0] = compressed
    buffer.append(content)

# Bad: 无优先级压缩
def compress_all(segments: List[ContextSegment]):
    return [summarize(seg) for seg in segments]

# Good: 基于优先级压缩
def compress_smart(segments: List[ContextSegment]):
    return [
        seg if seg.priority == ContextPriority.CRITICAL else summarize(seg)
        for seg in segments
    ]

# Bad: 忽略上下文关联
def process_independently(chunks: List[str]):
    return [process(chunk) for chunk in chunks]

# Good: 保持上下文关联
def process_with_context(chunks: List[str]):
    results = []
    context = ""
    for chunk in chunks:
        combined = context + chunk
        result = process(combined)
        results.append(result)
        context = get_context_window(combined)
    return results

# Bad: 过度压缩
def over_compress(text: str) -> str:
    return text[:100]  # 简单截断，丢失语义

# Good: 智能摘要
def smart_compress(text: str) -> str:
    return extractive_summarize(text, ratio=0.3)
```

**Remember**: 长上下文管理的核心是在有限的 Token 预算内最大化信息保留，同时保持上下文的连贯性和可追溯性。优先级驱动、分层压缩、增量处理是三大关键原则。
