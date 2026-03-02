# 正则表达式 vs LLM 文本解析决策框架

在文本解析任务中选择正则表达式还是大语言模型（LLM）的决策指南，帮助开发者做出最优选择。

## When to Activate

- 需要解析文本数据时选择技术方案
- 评估文本处理任务的复杂度
- 设计文本解析流水线
- 优化文本处理性能

## Core Principles

### 1. 明确性优先

选择能够提供确定性结果的技术。正则表达式提供 100% 可预测的行为，而 LLM 具有概率性。

```python
import re

def extract_emails_regex(text: str) -> list[str]:
    """
    使用正则表达式提取邮箱地址。
    
    Returns:
        list[str]: 所有匹配的邮箱地址列表
    """
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
    return re.findall(pattern, text)

def extract_emails_llm(text: str, llm_client) -> list[str]:
    """
    使用 LLM 提取邮箱地址。
    
    注意: LLM 可能遗漏或产生幻觉，结果不确定
    
    Returns:
        list[str]: LLM 识别的邮箱地址列表
    """
    prompt = f"Extract all email addresses from this text: {text}"
    response = llm_client.generate(prompt)
    return parse_llm_response(response)
```

### 2. 性能与成本权衡

正则表达式在性能和成本上具有绝对优势，LLM 适合处理语义理解任务。

### 3. 可维护性考量

正则表达式需要专业知识维护，LLM 提示词更易理解和修改。

## 决策树流程

```
开始文本解析任务
        │
        ▼
┌─────────────────────────────┐
│ 是否需要语义理解？          │
│ (意图识别、情感分析、摘要)  │
└─────────────────────────────┘
        │
   ┌────┴────┐
   │         │
  是        否
   │         │
   ▼         ▼
┌───────┐  ┌─────────────────────────────┐
│ LLM   │  │ 是否有明确的模式可匹配？     │
└───────┘  │ (固定格式、结构化数据)       │
           └─────────────────────────────┘
                    │
              ┌─────┴─────┐
              │           │
             是          否
              │           │
              ▼           ▼
        ┌──────────┐  ┌─────────────────────┐
        │ 正则表达式 │  │ 模式是否可描述？     │
        └──────────┘  └─────────────────────┘
                           │
                     ┌─────┴─────┐
                     │           │
                    是          否
                     │           │
                     ▼           ▼
              ┌──────────┐  ┌─────────────────┐
              │ 正则表达式 │  │ LLM + 后验证    │
              │ 或混合方案 │  │ 或人工审核      │
              └──────────┘  └─────────────────┘
```

## 决策流程图（详细版）

```
                    ┌────────────────────────────┐
                    │      文本解析任务入口       │
                    └────────────────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │           任务特征评估                 │
            │  • 数据量级: 小(<1K) / 中(1K-100K) / 大(>100K) │
            │  • 实时性要求: 低 / 中 / 高            │
            │  • 准确率要求: 普通(90%) / 高(99%) / 极高(99.9%) │
            │  • 预算限制: 严格 / 宽松               │
            └───────────────────────────────────────┘
                                │
                                ▼
            ┌───────────────────────────────────────┐
            │        是否需要语义理解能力？          │
            └───────────────────────────────────────┘
                    │                       │
                   是                      否
                    │                       │
                    ▼                       ▼
        ┌──────────────────┐    ┌───────────────────────┐
        │   首选 LLM 方案   │    │   是否有固定模式？     │
        │ • 意图识别        │    └───────────────────────┘
        │ • 情感分析        │            │       │
        │ • 文本摘要        │           是      否
        │ • 问答抽取        │            │       │
        │ • 复杂推理        │            ▼       ▼
        └──────────────────┘    ┌─────┐  ┌────────────────┐
                                │正则 │  │ 模式复杂度评估  │
                                └─────┘  └────────────────┘
                                            │       │
                                         简单     复杂
                                            │       │
                                            ▼       ▼
                                     ┌─────┐  ┌──────────────┐
                                     │正则 │  │ 混合方案评估  │
                                     └─────┘  └──────────────┘
                                                   │
                                    ┌──────────────┼──────────────┐
                                    │              │              │
                                    ▼              ▼              ▼
                              ┌──────────┐  ┌──────────┐  ┌──────────┐
                              │正则预处理│  │LLM 处理  │  │正则+LLM  │
                              │+ LLM验证 │  │+ 正则后处理│ │ 级联处理 │
                              └──────────┘  └──────────┘  └──────────┘
```

## 性能对比分析

### 响应时间对比

```python
import re
import time
from dataclasses import dataclass

@dataclass
class PerformanceMetrics:
    """
    性能指标数据类。
    
    Attributes:
        method: 使用的方法名称
        avg_time_ms: 平均响应时间（毫秒）
        p99_time_ms: P99 响应时间（毫秒）
        throughput_qps: 吞吐量（每秒查询数）
    """
    method: str
    avg_time_ms: float
    p99_time_ms: float
    throughput_qps: float

def benchmark_comparison():
    """
    性能基准测试对比示例。
    
    Returns:
        dict: 包含正则和 LLM 的性能指标对比
    """
    results = {
        'regex': PerformanceMetrics(
            method='正则表达式',
            avg_time_ms=0.05,
            p99_time_ms=0.15,
            throughput_qps=20000
        ),
        'llm_small': PerformanceMetrics(
            method='LLM (小模型 7B)',
            avg_time_ms=50,
            p99_time_ms=200,
            throughput_qps=20
        ),
        'llm_large': PerformanceMetrics(
            method='LLM (大模型 70B+)',
            avg_time_ms=500,
            p99_time_ms=2000,
            throughput_qps=2
        )
    }
    return results
```

### 性能基准测试表

| 指标 | 正则表达式 | LLM (7B) | LLM (70B+) | 混合方案 |
|------|-----------|----------|------------|----------|
| 平均延迟 | <1ms | 50-100ms | 500-2000ms | 10-100ms |
| P99 延迟 | <5ms | 200-500ms | 2000-5000ms | 100-500ms |
| 吞吐量 (QPS) | 10,000+ | 10-50 | 1-5 | 100-500 |
| 内存占用 | <10MB | 4-16GB | 40-160GB | 可变 |
| 单次成本 | $0 | $0.0001 | $0.001-0.01 | $0.0001-0.001 |
| 准确率 (简单任务) | 99.9% | 95-99% | 98-99.5% | 99%+ |
| 准确率 (复杂任务) | N/A | 85-95% | 90-98% | 92-97% |

### 成本分析

```python
@dataclass
class CostAnalysis:
    """
    成本分析数据类。
    
    Attributes:
        method: 方法名称
        per_1k_requests: 每 1000 次请求成本
        monthly_1m_requests: 每月 100 万次请求成本
        setup_cost: 初始设置成本
    """
    method: str
    per_1k_requests: float
    monthly_1m_requests: float
    setup_cost: float

def calculate_costs():
    """
    计算不同方案的成本。
    
    Returns:
        dict: 各方案的成本分析结果
    """
    return {
        'regex': CostAnalysis(
            method='正则表达式',
            per_1k_requests=0.0,
            monthly_1m_requests=0.0,
            setup_cost=0.0
        ),
        'llm_api': CostAnalysis(
            method='LLM API 调用',
            per_1k_requests=0.02,
            monthly_1m_requests=20.0,
            setup_cost=0.0
        ),
        'llm_self_hosted': CostAnalysis(
            method='LLM 自部署',
            per_1k_requests=0.005,
            monthly_1m_requests=5.0,
            setup_cost=5000.0
        )
    }
```

## 适用场景说明

### 正则表达式适用场景

```python
import re
from typing import Optional

class RegexUseCases:
    """
    正则表达式典型应用场景示例。
    """
    
    @staticmethod
    def extract_phone_numbers(text: str) -> list[str]:
        """
        提取电话号码 - 固定格式匹配。
        
        Args:
            text: 输入文本
            
        Returns:
            list[str]: 匹配的电话号码列表
        """
        patterns = [
            r'\d{3}-\d{4}-\d{4}',
            r'\d{11}',
            r'\(\d{3}\)\s*\d{3}-\d{4}',
        ]
        results = []
        for pattern in patterns:
            results.extend(re.findall(pattern, text))
        return results
    
    @staticmethod
    def parse_log_entry(log_line: str) -> Optional[dict]:
        """
        解析日志条目 - 结构化数据提取。
        
        Args:
            log_line: 单行日志文本
            
        Returns:
            Optional[dict]: 解析后的日志字典，失败返回 None
        """
        pattern = r'^\[(?P<timestamp>\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})\]\s+(?P<level>\w+)\s+-\s+(?P<message>.+)$'
        match = re.match(pattern, log_line)
        if match:
            return match.groupdict()
        return None
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """
        验证邮箱格式 - 格式校验。
        
        Args:
            email: 待验证的邮箱地址
            
        Returns:
            bool: 是否为有效邮箱格式
        """
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return bool(re.match(pattern, email))
    
    @staticmethod
    def extract_json_from_text(text: str) -> list[str]:
        """
        从文本中提取 JSON 字符串 - 嵌套结构匹配。
        
        Args:
            text: 包含 JSON 的文本
            
        Returns:
            list[str]: 提取的 JSON 字符串列表
        """
        pattern = r'\{(?:[^{}]|(?:\{(?:[^{}]|(?:\{[^{}]*\})*)*\})*)*\}'
        return re.findall(pattern, text)
    
    @staticmethod
    def sanitize_input(user_input: str) -> str:
        """
        清理用户输入 - 安全过滤。
        
        Args:
            user_input: 原始用户输入
            
        Returns:
            str: 清理后的安全字符串
        """
        dangerous_patterns = [
            (r'<script[^>]*>.*?</script>', ''),
            (r'javascript:', ''),
            (r'on\w+\s*=', ''),
        ]
        result = user_input
        for pattern, replacement in dangerous_patterns:
            result = re.sub(pattern, replacement, result, flags=re.IGNORECASE)
        return result
```

### LLM 适用场景

```python
from typing import Any
from dataclasses import dataclass

@dataclass
class LLMResponse:
    """
    LLM 响应数据类。
    
    Attributes:
        content: 响应内容
        confidence: 置信度
        tokens_used: 使用的 token 数量
    """
    content: str
    confidence: float
    tokens_used: int

class LLMUseCases:
    """
    LLM 典型应用场景示例。
    """
    
    @staticmethod
    def extract_entities_with_context(text: str, llm_client: Any) -> dict:
        """
        上下文感知的实体提取 - 需要语义理解。
        
        Args:
            text: 输入文本
            llm_client: LLM 客户端实例
            
        Returns:
            dict: 提取的实体及其上下文信息
        """
        prompt = f"""
        从以下文本中提取所有实体，并判断其类型和重要性。
        
        文本: {text}
        
        请以 JSON 格式返回，包含:
        - entities: 实体列表
        - types: 每个实体的类型
        - importance: 重要性评分 (1-10)
        """
        response = llm_client.generate(prompt)
        return parse_json_response(response.content)
    
    @staticmethod
    def sentiment_analysis(text: str, llm_client: Any) -> dict:
        """
        情感分析 - 需要深度语义理解。
        
        Args:
            text: 待分析文本
            llm_client: LLM 客户端实例
            
        Returns:
            dict: 情感分析结果
        """
        prompt = f"""
        分析以下文本的情感倾向，考虑讽刺、双关等复杂情况。
        
        文本: {text}
        
        返回:
        - sentiment: positive/negative/neutral/mixed
        - confidence: 0-1
        - reasoning: 判断理由
        """
        response = llm_client.generate(prompt)
        return parse_json_response(response.content)
    
    @staticmethod
    def summarize_document(document: str, llm_client: Any, max_length: int = 200) -> str:
        """
        文档摘要 - 需要理解全文语义。
        
        Args:
            document: 原始文档
            llm_client: LLM 客户端实例
            max_length: 摘要最大长度
            
        Returns:
            str: 文档摘要
        """
        prompt = f"""
        请为以下文档生成一个简洁的摘要，不超过 {max_length} 字。
        保留关键信息和核心观点。
        
        文档: {document}
        """
        response = llm_client.generate(prompt)
        return response.content
    
    @staticmethod
    def extract_structured_data(
        unstructured_text: str,
        schema: dict,
        llm_client: Any
    ) -> dict:
        """
        从非结构化文本提取结构化数据 - 需要推理能力。
        
        Args:
            unstructured_text: 非结构化文本
            schema: 目标数据结构定义
            llm_client: LLM 客户端实例
            
        Returns:
            dict: 符合 schema 的结构化数据
        """
        prompt = f"""
        从以下文本中提取信息，并按照指定的 JSON Schema 组织数据。
        
        文本: {unstructured_text}
        
        目标结构: {schema}
        
        请返回符合结构的 JSON 数据。如果某些字段无法从文本中提取，使用 null。
        """
        response = llm_client.generate(prompt)
        return parse_json_response(response.content)
```

### 混合方案场景

```python
import re
from typing import Any, Callable

class HybridParser:
    """
    混合解析器 - 结合正则和 LLM 的优势。
    """
    
    def __init__(self, llm_client: Any, confidence_threshold: float = 0.9):
        """
        初始化混合解析器。
        
        Args:
            llm_client: LLM 客户端实例
            confidence_threshold: 正则结果置信度阈值
        """
        self.llm_client = llm_client
        self.confidence_threshold = confidence_threshold
    
    def parse_with_fallback(
        self,
        text: str,
        regex_pattern: str,
        llm_prompt_template: str
    ) -> dict:
        """
        正则优先，LLM 兜底的解析策略。
        
        Args:
            text: 输入文本
            regex_pattern: 正则表达式模式
            llm_prompt_template: LLM 提示词模板
            
        Returns:
            dict: 解析结果，包含方法和置信度
        """
        regex_result = re.findall(regex_pattern, text)
        
        if regex_result and self._validate_regex_result(regex_result):
            return {
                'result': regex_result,
                'method': 'regex',
                'confidence': 1.0
            }
        
        llm_result = self._parse_with_llm(text, llm_prompt_template)
        return {
            'result': llm_result,
            'method': 'llm',
            'confidence': llm_result.get('confidence', 0.8)
        }
    
    def _validate_regex_result(self, result: list) -> bool:
        """
        验证正则结果的有效性。
        
        Args:
            result: 正则匹配结果
            
        Returns:
            bool: 结果是否有效
        """
        return len(result) > 0 and all(bool(r) for r in result)
    
    def _parse_with_llm(self, text: str, prompt_template: str) -> dict:
        """
        使用 LLM 进行解析。
        
        Args:
            text: 输入文本
            prompt_template: 提示词模板
            
        Returns:
            dict: LLM 解析结果
        """
        prompt = prompt_template.format(text=text)
        response = self.llm_client.generate(prompt)
        return parse_json_response(response.content)
    
    def parallel_validation(
        self,
        text: str,
        regex_pattern: str,
        llm_prompt: str
    ) -> dict:
        """
        并行执行正则和 LLM，交叉验证结果。
        
        Args:
            text: 输入文本
            regex_pattern: 正则表达式模式
            llm_prompt: LLM 提示词
            
        Returns:
            dict: 验证后的最终结果
        """
        import concurrent.futures
        
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            regex_future = executor.submit(re.findall, regex_pattern, text)
            llm_future = executor.submit(
                self._parse_with_llm, text, llm_prompt
            )
            
            regex_result = regex_future.result()
            llm_result = llm_future.result()
        
        if self._results_match(regex_result, llm_result.get('result', [])):
            return {
                'result': regex_result,
                'method': 'regex+llm_validated',
                'confidence': 1.0
            }
        
        return {
            'result': llm_result,
            'method': 'llm',
            'confidence': llm_result.get('confidence', 0.7),
            'regex_discrepancy': regex_result
        }
    
    def _results_match(self, regex_result: list, llm_result: list) -> bool:
        """
        比较正则和 LLM 结果是否一致。
        
        Args:
            regex_result: 正则匹配结果
            llm_result: LLM 解析结果
            
        Returns:
            bool: 结果是否匹配
        """
        if not regex_result or not llm_result:
            return False
        
        set_regex = set(str(r).lower() for r in regex_result)
        set_llm = set(str(r).lower() for r in llm_result)
        
        return set_regex == set_llm


class PipelineParser:
    """
    流水线解析器 - 正则预处理 + LLM 精处理。
    """
    
    def __init__(self, llm_client: Any):
        """
        初始化流水线解析器。
        
        Args:
            llm_client: LLM 客户端实例
        """
        self.llm_client = llm_client
    
    def parse_document(self, document: str) -> dict:
        """
        多阶段文档解析。
        
        Args:
            document: 原始文档
            
        Returns:
            dict: 解析结果
        """
        cleaned = self._preprocess_with_regex(document)
        sections = self._split_sections(cleaned)
        entities = self._extract_entities_llm(sections)
        
        return {
            'sections': sections,
            'entities': entities,
            'metadata': self._extract_metadata(cleaned)
        }
    
    def _preprocess_with_regex(self, text: str) -> str:
        """
        使用正则进行预处理。
        
        Args:
            text: 原始文本
            
        Returns:
            str: 清理后的文本
        """
        patterns_to_remove = [
            r'\s+',
            r'[\x00-\x1f\x7f-\x9f]',
            r'https?://\S+',
        ]
        result = text
        for pattern in patterns_to_remove:
            result = re.sub(pattern, ' ', result)
        return result.strip()
    
    def _split_sections(self, text: str) -> list[dict]:
        """
        使用正则分割文档章节。
        
        Args:
            text: 文档文本
            
        Returns:
            list[dict]: 章节列表
        """
        section_pattern = r'^#{1,3}\s+(.+)$'
        sections = []
        current_section = {'title': 'Introduction', 'content': ''}
        
        for line in text.split('\n'):
            match = re.match(section_pattern, line)
            if match:
                if current_section['content'].strip():
                    sections.append(current_section)
                current_section = {'title': match.group(1), 'content': ''}
            else:
                current_section['content'] += line + '\n'
        
        if current_section['content'].strip():
            sections.append(current_section)
        
        return sections
    
    def _extract_entities_llm(self, sections: list[dict]) -> list[dict]:
        """
        使用 LLM 提取实体。
        
        Args:
            sections: 章节列表
            
        Returns:
            list[dict]: 实体列表
        """
        entities = []
        for section in sections:
            prompt = f"Extract all named entities from: {section['content']}"
            response = self.llm_client.generate(prompt)
            entities.extend(parse_json_response(response.content).get('entities', []))
        return entities
    
    def _extract_metadata(self, text: str) -> dict:
        """
        使用正则提取元数据。
        
        Args:
            text: 文档文本
            
        Returns:
            dict: 元数据字典
        """
        metadata = {}
        
        date_pattern = r'\d{4}-\d{2}-\d{2}'
        dates = re.findall(date_pattern, text)
        if dates:
            metadata['dates'] = dates
        
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        emails = re.findall(email_pattern, text)
        if emails:
            metadata['emails'] = emails
        
        return metadata
```

## 决策矩阵

### 快速决策表

| 任务类型 | 数据量 | 实时性 | 准确率要求 | 推荐方案 |
|---------|-------|--------|-----------|---------|
| 格式验证 | 任意 | 高 | 高 | 正则 |
| 简单提取 | 大 | 高 | 中 | 正则 |
| 简单提取 | 小 | 低 | 高 | 正则或 LLM |
| 复杂提取 | 大 | 中 | 中 | 混合 |
| 复杂提取 | 小 | 低 | 高 | LLM |
| 语义理解 | 任意 | 低 | 中 | LLM |
| 情感分析 | 任意 | 低 | 中 | LLM |
| 摘要生成 | 任意 | 低 | 中 | LLM |

### 场景决策流程

```python
from enum import Enum
from dataclasses import dataclass

class ParseMethod(Enum):
    """
    解析方法枚举。
    """
    REGEX = "regex"
    LLM = "llm"
    HYBRID = "hybrid"
    PIPELINE = "pipeline"

@dataclass
class TaskProfile:
    """
    任务特征描述。
    
    Attributes:
        need_semantic: 是否需要语义理解
        has_pattern: 是否有固定模式
        data_volume: 数据量级 (small/medium/large)
        latency_requirement: 延迟要求 (low/medium/high)
        accuracy_requirement: 准确率要求 (normal/high/critical)
        budget: 预算限制 (strict/moderate/flexible)
    """
    need_semantic: bool
    has_pattern: bool
    data_volume: str
    latency_requirement: str
    accuracy_requirement: str
    budget: str

def decide_parse_method(profile: TaskProfile) -> ParseMethod:
    """
    根据任务特征决定解析方法。
    
    Args:
        profile: 任务特征描述
        
    Returns:
        ParseMethod: 推荐的解析方法
    """
    if profile.need_semantic:
        if profile.has_pattern and profile.budget == 'strict':
            return ParseMethod.HYBRID
        return ParseMethod.LLM
    
    if profile.has_pattern:
        if profile.accuracy_requirement == 'critical':
            return ParseMethod.HYBRID
        return ParseMethod.REGEX
    
    if profile.data_volume == 'large' and profile.latency_requirement == 'high':
        return ParseMethod.REGEX
    
    if profile.budget == 'flexible':
        return ParseMethod.LLM
    
    return ParseMethod.HYBRID
```

## 性能基准测试代码

```python
import time
import statistics
from typing import Callable
from dataclasses import dataclass

@dataclass
class BenchmarkResult:
    """
    基准测试结果。
    
    Attributes:
        name: 测试名称
        iterations: 迭代次数
        avg_time_ms: 平均耗时（毫秒）
        min_time_ms: 最小耗时（毫秒）
        max_time_ms: 最大耗时（毫秒）
        p50_time_ms: P50 耗时（毫秒）
        p99_time_ms: P99 耗时（毫秒）
        std_dev_ms: 标准差（毫秒）
    """
    name: str
    iterations: int
    avg_time_ms: float
    min_time_ms: float
    max_time_ms: float
    p50_time_ms: float
    p99_time_ms: float
    std_dev_ms: float

def run_benchmark(
    func: Callable,
    iterations: int = 1000,
    warmup: int = 10
) -> BenchmarkResult:
    """
    运行基准测试。
    
    Args:
        func: 待测试函数
        iterations: 测试迭代次数
        warmup: 预热次数
        
    Returns:
        BenchmarkResult: 测试结果
    """
    for _ in range(warmup):
        func()
    
    times = []
    for _ in range(iterations):
        start = time.perf_counter_ns()
        func()
        end = time.perf_counter_ns()
        times.append((end - start) / 1_000_000)
    
    times.sort()
    
    return BenchmarkResult(
        name=func.__name__,
        iterations=iterations,
        avg_time_ms=statistics.mean(times),
        min_time_ms=min(times),
        max_time_ms=max(times),
        p50_time_ms=times[len(times) // 2],
        p99_time_ms=times[int(len(times) * 0.99)],
        std_dev_ms=statistics.stdev(times)
    )

def compare_regex_vs_llm():
    """
    对比正则和 LLM 的性能。
    
    Returns:
        dict: 性能对比结果
    """
    sample_text = "Contact us at support@example.com or call 123-4567-8901"
    
    def regex_extract():
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        phone_pattern = r'\d{3}-\d{4}-\d{4}'
        re.findall(email_pattern, sample_text)
        re.findall(phone_pattern, sample_text)
    
    regex_result = run_benchmark(regex_extract, iterations=10000)
    
    return {
        'regex': regex_result,
        'note': 'LLM benchmark requires actual API calls and is not included in automated tests'
    }
```

## Quick Reference: 决策速查表

| 场景 | 正则 | LLM | 混合 |
|------|-----|-----|------|
| 邮箱/电话提取 | ✅ | ⚠️ | - |
| 日志解析 | ✅ | ⚠️ | - |
| JSON 提取 | ✅ | ⚠️ | - |
| 表单验证 | ✅ | ❌ | - |
| 意图识别 | ❌ | ✅ | - |
| 情感分析 | ❌ | ✅ | - |
| 文档摘要 | ❌ | ✅ | - |
| 复杂实体提取 | ⚠️ | ✅ | ✅ |
| 不规则数据清洗 | ⚠️ | ⚠️ | ✅ |
| 高准确率要求 | ✅ | ⚠️ | ✅ |

## Anti-Patterns to Avoid

```python
import re

def bad_use_llm_for_simple_pattern(text: str, llm_client) -> list[str]:
    """
    反模式: 使用 LLM 提取固定格式数据。
    
    问题: 成本高、延迟大、结果不确定
    """
    prompt = f"Extract all email addresses: {text}"
    return llm_client.generate(prompt)

def good_use_regex_for_simple_pattern(text: str) -> list[str]:
    """
    正确做法: 使用正则提取固定格式数据。
    """
    return re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', text)


def bad_use_regex_for_semantic(text: str) -> str:
    """
    反模式: 使用正则进行语义分析。
    
    问题: 无法处理语义、上下文、歧义
    """
    positive_words = ['good', 'great', 'excellent']
    negative_words = ['bad', 'poor', 'terrible']
    
    for word in positive_words:
        if re.search(word, text, re.IGNORECASE):
            return 'positive'
    for word in negative_words:
        if re.search(word, text, re.IGNORECASE):
            return 'negative'
    return 'neutral'

def good_use_llm_for_semantic(text: str, llm_client) -> dict:
    """
    正确做法: 使用 LLM 进行语义分析。
    """
    prompt = f"Analyze the sentiment of this text, consider context and sarcasm: {text}"
    return llm_client.generate(prompt)


def bad_no_fallback_strategy(text: str, pattern: str) -> list[str]:
    """
    反模式: 只依赖单一方法，无容错机制。
    """
    result = re.findall(pattern, text)
    if not result:
        raise ValueError("No matches found")
    return result

def good_with_fallback(text: str, pattern: str, llm_client) -> dict:
    """
    正确做法: 提供降级策略。
    """
    regex_result = re.findall(pattern, text)
    
    if regex_result:
        return {'result': regex_result, 'method': 'regex', 'confidence': 1.0}
    
    llm_result = llm_client.generate(f"Extract data from: {text}")
    return {'result': llm_result, 'method': 'llm', 'confidence': 0.8}
```

**Remember**: 选择正确的工具取决于任务特征。正则表达式适合确定性模式匹配，LLM 适合语义理解任务，混合方案在复杂场景中提供最佳平衡。
