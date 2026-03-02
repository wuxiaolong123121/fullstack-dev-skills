# FastCode 快速导航模式

> 基于 HKUDS FastCode 项目 - Token 高效代码理解框架

## 核心概念

FastCode 通过**两阶段搜索**和**代码略读**技术实现快速导航，相比传统方法减少 70% 的上下文 token 消耗。

### 1. 两阶段搜索

#### 原理

将搜索过程分为两个阶段：粗粒度检索和细粒度精确定位。

```
查询 → 粗粒度检索 (快速) → 候选集 → 细粒度定位 (精确) → 最终结果
```

#### 第一阶段：粗粒度检索

使用轻量级索引快速筛选候选：

```python
class CoarseRetriever:
    """
    粗粒度检索器
    
    使用轻量级索引快速筛选候选结果
    """
    
    def __init__(self, index_path: str):
        self.index_path = index_path
        self.file_index = {}
        self.symbol_index = {}
    
    def build_file_index(self, codebase_path: str) -> None:
        """
        构建文件级索引
        
        Args:
            codebase_path: 代码库路径
        """
        pass
    
    def search_files(self, query: str, top_k: int = 20) -> list[str]:
        """
        快速搜索相关文件
        
        Args:
            query: 查询字符串
            top_k: 返回文件数量
        
        Returns:
            相关文件路径列表
        """
        pass
    
    def search_symbols(self, query: str, top_k: int = 50) -> list[dict]:
        """
        快速搜索符号（函数、类、变量）
        
        Args:
            query: 查询字符串
            top_k: 返回符号数量
        
        Returns:
            符号信息列表，包含名称、类型、位置
        """
        pass
```

#### 第二阶段：细粒度定位

在候选集内进行精确匹配：

```python
class FineGrainedLocator:
    """
    细粒度定位器
    
    在候选集内进行精确匹配和上下文提取
    """
    
    def __init__(self):
        self.ast_cache = {}
    
    def locate_in_file(
        self,
        file_path: str,
        query: str,
        context_lines: int = 5
    ) -> list[dict]:
        """
        在文件中精确定位相关代码
        
        Args:
            file_path: 文件路径
            query: 查询字符串
            context_lines: 上下文行数
        
        Returns:
            定位结果列表，包含代码片段和位置信息
        """
        pass
    
    def extract_context(
        self,
        file_path: str,
        start_line: int,
        end_line: int,
        include_signatures: bool = True
    ) -> str:
        """
        提取代码上下文
        
        Args:
            file_path: 文件路径
            start_line: 起始行号
            end_line: 结束行号
            include_signatures: 是否包含函数签名
        
        Returns:
            提取的代码上下文字符串
        """
        pass
```

#### 两阶段搜索协调器

```python
class TwoStageSearcher:
    """
    两阶段搜索协调器
    
    协调粗粒度检索和细粒度定位
    """
    
    def __init__(self, codebase_path: str):
        self.coarse_retriever = CoarseRetriever(codebase_path)
        self.fine_locator = FineGrainedLocator()
        self.coarse_top_k = 20
        self.fine_top_k = 10
    
    def search(self, query: str) -> list[dict]:
        """
        执行两阶段搜索
        
        Args:
            query: 查询字符串
        
        Returns:
            最终搜索结果列表
        """
        candidates = self.coarse_retriever.search_symbols(query, self.coarse_top_k)
        
        results = []
        for candidate in candidates:
            file_path = candidate["file_path"]
            located = self.fine_locator.locate_in_file(file_path, query)
            results.extend(located)
        
        results = self._rank_results(results, query)
        return results[:self.fine_top_k]
    
    def _rank_results(self, results: list[dict], query: str) -> list[dict]:
        """
        对结果进行排序
        
        Args:
            results: 搜索结果列表
            query: 查询字符串
        
        Returns:
            排序后的结果列表
        """
        pass
```

### 2. 代码略读 (Code Skimming)

#### 原理

通过提取代码的关键结构信息，快速理解代码功能，避免阅读完整代码。

```
完整代码 → 结构提取 → 签名 + 关键路径 → 摘要 → 快速理解
```

#### 函数签名提取

```python
class SignatureExtractor:
    """
    函数签名提取器
    
    从代码中提取函数签名信息
    """
    
    def extract_function_signature(self, code: str) -> dict:
        """
        提取函数签名
        
        Args:
            code: 函数代码字符串
        
        Returns:
            签名信息字典，包含名称、参数、返回类型、文档
        """
        pass
    
    def extract_class_signature(self, code: str) -> dict:
        """
        提取类签名
        
        Args:
            code: 类代码字符串
        
        Returns:
            签名信息字典，包含名称、基类、方法列表、属性
        """
        pass
    
    def format_signature(self, signature: dict, style: str = "compact") -> str:
        """
        格式化签名为可读字符串
        
        Args:
            signature: 签名信息字典
            style: 格式化风格 (compact/full/minimal)
        
        Returns:
            格式化后的签名字符串
        """
        pass
```

#### 关键路径识别

```python
class KeyPathIdentifier:
    """
    关键路径识别器
    
    识别代码中的关键执行路径
    """
    
    def __init__(self):
        self.control_flow_keywords = {
            "if", "elif", "else", "for", "while", "try", "except", "with"
        }
        self.return_keywords = {"return", "yield", "raise"}
    
    def identify_key_paths(self, function_code: str) -> list[dict]:
        """
        识别函数中的关键路径
        
        Args:
            function_code: 函数代码字符串
        
        Returns:
            关键路径列表，每条路径包含条件和结果
        """
        pass
    
    def extract_return_statements(self, function_code: str) -> list[str]:
        """
        提取函数中的返回语句
        
        Args:
            function_code: 函数代码字符串
        
        Returns:
            返回语句列表
        """
        pass
    
    def identify_error_handling(self, function_code: str) -> list[dict]:
        """
        识别错误处理逻辑
        
        Args:
            function_code: 函数代码字符串
        
        Returns:
            错误处理信息列表
        """
        pass
```

#### 代码摘要生成

```python
class CodeSummarizer:
    """
    代码摘要生成器
    
    生成代码的简洁摘要
    """
    
    def __init__(self, max_length: int = 200):
        self.max_length = max_length
    
    def summarize_function(self, function_code: str) -> str:
        """
        生成函数摘要
        
        Args:
            function_code: 函数代码字符串
        
        Returns:
            函数摘要字符串
        """
        signature = self._extract_signature(function_code)
        docstring = self._extract_docstring(function_code)
        key_paths = self._extract_key_paths(function_code)
        
        return self._compose_summary(signature, docstring, key_paths)
    
    def summarize_class(self, class_code: str) -> str:
        """
        生成类摘要
        
        Args:
            class_code: 类代码字符串
        
        Returns:
            类摘要字符串
        """
        pass
    
    def summarize_module(self, module_code: str) -> str:
        """
        生成模块摘要
        
        Args:
            module_code: 模块代码字符串
        
        Returns:
            模块摘要字符串
        """
        pass
    
    def _compose_summary(
        self,
        signature: dict,
        docstring: str,
        key_paths: list
    ) -> str:
        """
        组合生成摘要
        
        Args:
            signature: 签名信息
            docstring: 文档字符串
            key_paths: 关键路径列表
        
        Returns:
            摘要字符串
        """
        pass
```

### 3. 导航策略

#### 基于任务的导航

```python
class TaskBasedNavigator:
    """
    基于任务的导航器
    
    根据任务类型选择最优导航策略
    """
    
    def __init__(self, codebase_path: str):
        self.searcher = TwoStageSearcher(codebase_path)
        self.summarizer = CodeSummarizer()
    
    def find_implementation(self, function_name: str) -> dict:
        """
        查找函数实现
        
        Args:
            function_name: 函数名称
        
        Returns:
            实现信息，包含代码和位置
        """
        pass
    
    def find_usages(self, symbol_name: str) -> list[dict]:
        """
        查找符号使用位置
        
        Args:
            symbol_name: 符号名称
        
        Returns:
            使用位置列表
        """
        pass
    
    def find_definition(self, symbol_name: str) -> dict:
        """
        查找符号定义
        
        Args:
            symbol_name: 符号名称
        
        Returns:
            定义信息
        """
        pass
    
    def explore_related(self, symbol_name: str, depth: int = 2) -> dict:
        """
        探索相关代码
        
        Args:
            symbol_name: 起始符号名称
            depth: 探索深度
        
        Returns:
            相关代码图谱
        """
        pass
```

#### 导航模式选择

| 任务类型 | 推荐导航模式 | Token 消耗 |
|---------|------------|-----------|
| 查找函数实现 | 签名提取 + 关键路径 | 低 |
| 理解类结构 | 类摘要 + 方法列表 | 中 |
| 追踪调用链 | 调用图遍历 | 中 |
| 修复 Bug | 两阶段搜索 + 上下文 | 高 |
| 添加功能 | 依赖分析 + 接口提取 | 高 |

## 实践指导

### 1. 快速理解代码库

```
1. 模块摘要 → 了解整体结构
2. 类签名 → 理解核心组件
3. 函数签名 → 理解主要功能
4. 关键路径 → 理解核心逻辑
```

### 2. 定位问题代码

```
1. 关键词搜索 → 粗粒度定位
2. 调用图分析 → 确定影响范围
3. 上下文提取 → 理解问题环境
```

### 3. 代码审查准备

```
1. 变更文件摘要 → 快速了解变更
2. 影响范围分析 → 确定审查重点
3. 相关代码略读 → 理解上下文
```

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [代码摘要技术](https://arxiv.org/abs/2107.04662)
- [程序理解方法](https://dl.acm.org/doi/10.1145/321268.321274)
