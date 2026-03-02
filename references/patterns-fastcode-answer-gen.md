# FastCode 流式答案生成模式

> 基于 HKUDS FastCode 项目 - Answer Generator 模块

## 核心概念

FastCode 提供**流式答案生成**能力，支持逐步输出内容、摘要提取和 Token 预算管理，提升用户体验和成本效率。

### 1. 流式输出

#### 原理

使用流式 API 逐步输出答案，减少用户等待时间。

```python
class StreamingAnswerGenerator:
    """
    流式答案生成器
    
    逐步输出答案内容
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.provider = config.get("provider", "openai")
        self.model = os.getenv("MODEL")
        self.max_tokens = config.get("max_tokens", 20000)
        self.max_context_tokens = config.get("max_context_tokens", 200000)
        self.reserve_tokens = config.get("reserve_tokens_for_response", 10000)
    
    def generate_stream(
        self,
        query: str,
        retrieved_elements: list,
        query_info: dict = None,
        dialogue_history: list = None,
        prompt_builder: callable = None
    ):
        """
        流式生成答案
        
        Args:
            query: 用户查询
            retrieved_elements: 检索的代码元素
            query_info: 查询处理信息
            dialogue_history: 对话历史
            prompt_builder: 自定义提示构建器
        
        Yields:
            (chunk_text, metadata) 元组
        """
        context = self._prepare_context(retrieved_elements)
        
        if prompt_builder:
            prompt = prompt_builder(query, context, query_info, dialogue_history)
        else:
            prompt = self._build_prompt(query, context, query_info, dialogue_history)
        
        prompt_tokens = count_tokens(prompt, self.model)
        prompt = self._ensure_token_limit(prompt, prompt_tokens)
        
        metadata = {
            "prompt_tokens": prompt_tokens,
            "sources": self._extract_sources(retrieved_elements),
            "context_elements": len(retrieved_elements),
            "query": query
        }
        yield None, metadata
        
        full_response = []
        for chunk in self._stream_llm_response(prompt):
            full_response.append(chunk)
            yield chunk, None
        
        final_metadata = {"complete": True}
        yield None, final_metadata
    
    def _stream_llm_response(self, prompt: str):
        """
        流式调用 LLM
        
        Args:
            prompt: 提示字符串
        
        Yields:
            响应文本块
        """
        if self.provider == "openai":
            yield from self._stream_openai(prompt)
        elif self.provider == "anthropic":
            yield from self._stream_anthropic(prompt)
    
    def _stream_openai(self, prompt: str):
        """
        流式调用 OpenAI API
        
        Args:
            prompt: 提示字符串
        
        Yields:
            响应文本块
        """
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[{"role": "user", "content": prompt}],
            temperature=self.temperature,
            max_tokens=self.max_tokens,
            stream=True
        )
        
        for chunk in response:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content
    
    def _stream_anthropic(self, prompt: str):
        """
        流式调用 Anthropic API
        
        Args:
            prompt: 提示字符串
        
        Yields:
            响应文本块
        """
        with self.client.messages.stream(
            model=self.model,
            max_tokens=self.max_tokens,
            temperature=self.temperature,
            messages=[{"role": "user", "content": prompt}]
        ) as stream:
            for text in stream.text_stream:
                yield text
```

### 2. 摘要提取

#### 原理

从答案中提取摘要，用于多轮对话的上下文传递。

```python
class SummaryExtractor:
    """
    摘要提取器
    
    从答案中提取对话摘要
    """
    
    def __init__(self):
        self.summary_patterns = [
            r'<\s*[Ss][Uu][Mm][Mm][Aa][Rr][Yy]\s*:?\s*>(.*?)<\s*/\s*[Ss][Uu][Mm][Mm][Aa][Rr][Yy]\s*>',
            r'\*\*\s*[Ss][Uu][Mm][Mm][Aa][Rr][Yy]\s*\*\*\s*:?(.*?)(?=\n\n|\Z)',
        ]
    
    def parse_response_with_summary(self, response: str) -> tuple:
        """
        解析响应，提取答案和摘要
        
        Args:
            response: LLM 响应字符串
        
        Returns:
            (答案, 摘要) 元组
        """
        for pattern in self.summary_patterns:
            match = re.search(pattern, response, re.DOTALL | re.IGNORECASE)
            if match:
                summary = match.group(1).strip()
                answer = re.sub(pattern, '', response, flags=re.DOTALL | re.IGNORECASE).strip()
                return answer, summary
        
        return response, None
    
    def generate_fallback_summary(
        self,
        query: str,
        answer: str,
        retrieved_elements: list
    ) -> str:
        """
        生成后备摘要
        
        Args:
            query: 用户查询
            answer: 生成的答案
            retrieved_elements: 检索的代码元素
        
        Returns:
            摘要字符串
        """
        sources = []
        for elem in retrieved_elements[:3]:
            if "relative_path" in elem:
                sources.append(elem["relative_path"])
        
        summary_parts = [
            f"Query: {query[:100]}",
            f"Answer: {answer[:200]}..."
        ]
        
        if sources:
            summary_parts.append(f"Sources: {', '.join(sources)}")
        
        return " | ".join(summary_parts)
    
    def stream_with_summary_filter(self, prompt: str):
        """
        流式输出时过滤摘要部分
        
        Args:
            prompt: 提示字符串
        
        Yields:
            (原始块, 过滤后块) 元组
        """
        summary_start_regex = re.compile(
            r'<\s*[Ss][Uu][Mm][Mm][Aa][Rr][Yy]\s*:?\s*>|'
            r'\*\*\s*[Ss][Uu][Mm][Mm][Aa][Rr][Yy]\s*\*\*\s*:?'
        )
        summary_end_regex = re.compile(
            r'<\s*/\s*[Ss][Uu][Mm][Mm][Aa][Rr][Yy]\s*>'
        )
        
        buffer = ""
        in_summary = False
        max_buffer_size = 20
        
        for chunk in self._stream_llm_response(prompt):
            original_chunk = chunk
            
            if in_summary:
                combined_for_end = buffer + chunk
                
                end_match = summary_end_regex.search(combined_for_end)
                if end_match:
                    end_idx = end_match.end()
                    remaining = combined_for_end[end_idx:]
                    in_summary = False
                    buffer = ""
                    yield original_chunk, remaining if remaining else None
                else:
                    buffer = chunk[-max_buffer_size:] if len(chunk) > max_buffer_size else chunk
                    yield original_chunk, None
            else:
                combined = buffer + chunk
                
                start_match = summary_start_regex.search(combined)
                if start_match:
                    start_idx = start_match.start()
                    before_summary = combined[:start_idx]
                    in_summary = True
                    buffer = combined[start_idx:]
                    
                    yield original_chunk, before_summary if before_summary else None
                else:
                    buffer = combined[-max_buffer_size:]
                    yield original_chunk, chunk
```

### 3. Token 预算管理

#### 原理

动态管理 Token 预算，确保上下文不超限。

```python
class TokenBudgetManager:
    """
    Token 预算管理器
    
    动态管理上下文 Token 预算
    """
    
    def __init__(self, config: dict):
        self.max_context_tokens = config.get("max_context_tokens", 200000)
        self.max_output_tokens = config.get("max_tokens", 20000)
        self.reserve_tokens = config.get("reserve_tokens", 10000)
    
    def ensure_token_limit(
        self,
        prompt: str,
        context: str,
        model: str
    ) -> tuple:
        """
        确保 Token 在限制内
        
        Args:
            prompt: 完整提示
            context: 上下文内容
            model: 模型名称
        
        Returns:
            (调整后的提示, 是否被截断)
        """
        prompt_tokens = count_tokens(prompt, model)
        available = self.max_context_tokens - self.max_output_tokens - self.reserve_tokens
        
        if prompt_tokens <= available:
            return prompt, False
        
        truncated_context = self._truncate_context(context, available - 1000)
        return truncated_context, True
    
    def _truncate_context(self, context: str, max_tokens: int) -> str:
        """
        截断上下文
        
        Args:
            context: 上下文内容
            max_tokens: 最大 Token 数
        
        Returns:
            截断后的上下文
        """
        lines = context.split('\n')
        result = []
        current_tokens = 0
        
        for line in lines:
            line_tokens = count_tokens(line, self.model)
            if current_tokens + line_tokens > max_tokens:
                break
            result.append(line)
            current_tokens += line_tokens
        
        return '\n'.join(result)
    
    def calculate_available_tokens(self) -> int:
        """
        计算可用 Token 数
        
        Returns:
            可用 Token 数
        """
        return self.max_context_tokens - self.max_output_tokens - self.reserve_tokens
    
    def estimate_tokens(self, text: str) -> int:
        """
        估算文本 Token 数
        
        Args:
            text: 文本字符串
        
        Returns:
            估算的 Token 数
        """
        return len(text.split()) // 0.75
```

### 4. 上下文准备

#### 原理

将检索的代码元素组织成结构化的上下文。

```python
class ContextPreparer:
    """
    上下文准备器
    
    组织检索元素为结构化上下文
    """
    
    def __init__(self, config: dict):
        self.include_file_paths = config.get("include_file_paths", True)
        self.include_line_numbers = config.get("include_line_numbers", True)
        self.include_related_code = config.get("include_related_code", True)
    
    def prepare_context(self, retrieved_elements: list) -> str:
        """
        准备上下文
        
        Args:
            retrieved_elements: 检索的代码元素列表
        
        Returns:
            格式化的上下文字符串
        """
        context_parts = []
        
        for i, elem in enumerate(retrieved_elements, 1):
            context_parts.append(f"\n--- Element {i} ---")
            
            if self.include_file_paths and "relative_path" in elem:
                context_parts.append(f"File: {elem['relative_path']}")
            
            if "type" in elem:
                context_parts.append(f"Type: {elem['type']}")
            
            if "name" in elem:
                context_parts.append(f"Name: {elem['name']}")
            
            if "signature" in elem:
                context_parts.append(f"Signature: {elem['signature']}")
            
            if "docstring" in elem:
                context_parts.append(f"Docstring: {elem['docstring']}")
            
            if "code" in elem:
                code = elem["code"]
                if self.include_line_numbers and "start_line" in elem:
                    code = self._add_line_numbers(code, elem["start_line"])
                context_parts.append(f"Code:\n{code}")
        
        return "\n".join(context_parts)
    
    def _add_line_numbers(self, code: str, start_line: int) -> str:
        """
        添加行号
        
        Args:
            code: 代码字符串
            start_line: 起始行号
        
        Returns:
            带行号的代码
        """
        lines = code.split('\n')
        numbered_lines = []
        
        for i, line in enumerate(lines):
            line_num = start_line + i
            numbered_lines.append(f"{line_num:4d} | {line}")
        
        return '\n'.join(numbered_lines)
    
    def extract_sources(self, retrieved_elements: list) -> list:
        """
        提取来源信息
        
        Args:
            retrieved_elements: 检索的代码元素列表
        
        Returns:
            来源信息列表
        """
        sources = []
        seen = set()
        
        for elem in retrieved_elements:
            path = elem.get("relative_path")
            if path and path not in seen:
                sources.append({
                    "path": path,
                    "type": elem.get("type"),
                    "name": elem.get("name")
                })
                seen.add(path)
        
        return sources
```

## 实践指导

### 1. 流式输出配置

| 参数 | 推荐值 | 说明 |
|-----|-------|------|
| max_context_tokens | 200000 | 上下文窗口大小 |
| max_tokens | 20000 | 输出 Token 限制 |
| reserve_tokens | 10000 | 响应预留 Token |

### 2. 摘要格式

```
<SUMMARY>
查询主题：[简要描述]
关键发现：[主要结论]
相关文件：[文件列表]
</SUMMARY>
```

### 3. 性能优化

- 使用流式输出减少首字延迟
- 缓存常用上下文模板
- 预计算 Token 数量
- 并行处理多个请求

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [OpenAI Streaming API](https://platform.openai.com/docs/api-reference/streaming)
- [Token 计数最佳实践](https://platform.openai.com/docs/guides/tokens)
