# FastCode 多仓库选择与推理模式

> 基于 HKUDS FastCode 项目 - Repository Selector 模块

## 核心概念

FastCode 提供**多仓库推理能力**，使用 LLM 智能选择相关仓库和文件，支持模糊匹配处理 LLM 输出的不精确名称。

### 1. LLM 仓库选择

#### 原理

使用 LLM 分析查询意图，从多个仓库中选择最相关的仓库。

```python
class RepositorySelector:
    """
    仓库选择器
    
    使用 LLM 选择相关仓库
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.provider = config.get("provider", "openai")
        self.model = os.getenv("MODEL")
        self.temperature = 0.2  # 低温度确保精确选择
        self.max_tokens = 2000
    
    def select_relevant_repos(
        self,
        query: str,
        repo_overviews: dict,
        max_repos: int = 5
    ) -> list:
        """
        选择相关仓库
        
        Args:
            query: 用户查询
            repo_overviews: 仓库名称 -> 概览数据的映射
            max_repos: 最大返回仓库数
        
        Returns:
            选中的仓库名称列表
        """
        available_names = list(repo_overviews.keys())
        if not available_names:
            return []
        
        prompt = self._build_repo_selection_prompt(
            query, repo_overviews, max_repos
        )
        
        response = self._call_llm(prompt)
        
        return self._parse_repo_selection_response(response, available_names)
    
    def _build_repo_selection_prompt(
        self,
        query: str,
        repo_overviews: dict,
        max_repos: int
    ) -> str:
        """
        构建仓库选择提示
        
        Args:
            query: 用户查询
            repo_overviews: 仓库概览
            max_repos: 最大仓库数
        
        Returns:
            提示字符串
        """
        prompt_parts = [
            "You are a code repository selection assistant.\n",
            f'User Query: "{query}"\n\n',
            "Below are the available repositories with their summaries.\n",
            "Select the repositories that are most relevant to the query.\n",
            f"Return at most {max_repos} repository names.\n\n"
        ]
        
        for idx, (repo_name, data) in enumerate(repo_overviews.items(), 1):
            metadata = data.get("metadata", {})
            summary = metadata.get("summary", data.get("content", "No summary"))
            prompt_parts.append(f"Repository #{idx}: {repo_name}\n")
            prompt_parts.append(f"Summary: {summary[:1000]}\n\n")
        
        prompt_parts.append(
            "Respond with ONLY the selected repository names, one per line.\n"
            "Format: REPO: <repository_name>\n\n"
            "If you cannot determine relevance, return ALL repository names.\n"
        )
        
        return "".join(prompt_parts)
    
    def _parse_repo_selection_response(
        self,
        response: str,
        available_names: list
    ) -> list:
        """
        解析仓库选择响应
        
        Args:
            response: LLM 响应
            available_names: 可用仓库名称列表
        
        Returns:
            选中的仓库名称列表
        """
        selected = []
        seen = set()
        
        for line in response.splitlines():
            line = line.strip()
            match = re.match(r'(?:\*{0,2}REPO:\*{0,2}\s*|[-•]\s*)(.*)', line, re.IGNORECASE)
            if match:
                raw_name = match.group(1).strip()
            elif line and not line.startswith('#'):
                raw_name = line
            else:
                continue
            
            matched_name = self._fuzzy_match_repo(raw_name, available_names)
            if matched_name and matched_name not in seen:
                selected.append(matched_name)
                seen.add(matched_name)
        
        return selected
```

### 2. 跨仓库文件选择

#### 原理

使用 LLM 从多个仓库中选择最相关的文件。

```python
class FileSelector:
    """
    文件选择器
    
    跨仓库选择相关文件
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.temperature = 0.2
    
    def select_relevant_files(
        self,
        query: str,
        repo_overviews: list,
        max_files: int = 10,
        scenario_mode: str = "multi"
    ) -> list:
        """
        选择相关文件
        
        Args:
            query: 用户查询
            repo_overviews: 仓库概览列表
            max_files: 最大文件数
            scenario_mode: "single" 或 "multi"
        
        Returns:
            选中的文件列表，包含 repo_name, file_path, reason
        """
        prompt = self._build_file_selection_prompt(
            query, repo_overviews, max_files, scenario_mode
        )
        
        response = self._call_llm(prompt)
        
        return self._parse_file_selection_response(response, repo_overviews)
    
    def _build_file_selection_prompt(
        self,
        query: str,
        repo_overviews: list,
        max_files: int,
        scenario_mode: str
    ) -> str:
        """
        构建文件选择提示
        
        Args:
            query: 用户查询
            repo_overviews: 仓库概览列表
            max_files: 最大文件数
            scenario_mode: 场景模式
        
        Returns:
            提示字符串
        """
        is_single_repo = scenario_mode == "single"
        
        scope_line = (
            "Select only files from this repository that best address the query.\n"
            if is_single_repo
            else "Identify relevant repositories first, then pick files from those.\n"
        )
        
        prompt_parts = [
            "You are a code navigation assistant.\n",
            scope_line,
            f'\nUser Query: "{query}"\n',
            "\nRepository Information:\n"
        ]
        
        for i, overview in enumerate(repo_overviews, 1):
            repo_name = overview.get("repo_name", "Unknown")
            summary = overview.get("summary", "No summary")
            structure = overview.get("structure_text", "")
            
            prompt_parts.append(f"\n{'='*60}")
            prompt_parts.append(f"\nRepository #{i}: {repo_name}")
            prompt_parts.append(f"\nSummary: {summary}")
            prompt_parts.append(f"\nFile Structure:\n{structure}")
        
        prompt_parts.append(f"\n{'='*60}\n")
        prompt_parts.append(
            f"\nTask: Select the fewest files needed (up to {max_files}) "
            "that would contain the answer or relevant code.\n"
        )
        prompt_parts.append("\nFormat your response EXACTLY as:")
        prompt_parts.append("\nFILE: <repo_name>::<file_path>")
        prompt_parts.append("\nREASON: <brief reason>")
        
        return "".join(prompt_parts)
    
    def _parse_file_selection_response(
        self,
        response: str,
        repo_overviews: list
    ) -> list:
        """
        解析文件选择响应
        
        Args:
            response: LLM 响应
            repo_overviews: 仓库概览列表
        
        Returns:
            选中的文件列表
        """
        selected_files = []
        valid_repos = {ov.get("repo_name") for ov in repo_overviews}
        
        file_pattern = r'\*{0,2}FILE:\*{0,2}\s*(?:(.+?)::)?(.+?)(?:\n|$)'
        reason_pattern = r'\*{0,2}REASON:\*{0,2}\s*(.+?)(?:\n|$)'
        
        file_matches = re.findall(file_pattern, response, re.MULTILINE)
        reason_matches = re.findall(reason_pattern, response, re.MULTILINE)
        
        for i, (repo_name, file_path) in enumerate(file_matches):
            repo_name = (repo_name or "").strip()
            file_path = file_path.strip()
            
            repo_name = re.sub(r'^`+|`+$', '', repo_name)
            file_path = re.sub(r'^`+|`+$', '', file_path)
            repo_name = re.sub(r'^\*+|\*+$', '', repo_name)
            file_path = re.sub(r'^\*+|\*+$', '', file_path)
            
            repo_name = repo_name.strip()
            file_path = file_path.strip()
            
            if repo_name not in valid_repos:
                inferred_repo = self._infer_repo_name(
                    file_path, valid_repos
                )
                if inferred_repo:
                    repo_name = inferred_repo
                else:
                    continue
            
            reason = reason_matches[i].strip() if i < len(reason_matches) else "No reason"
            
            selected_files.append({
                "repo_name": repo_name,
                "file_path": file_path,
                "reason": reason
            })
        
        return selected_files
    
    def _infer_repo_name(self, file_path: str, valid_repos: set) -> str:
        """
        从文件路径推断仓库名
        
        Args:
            file_path: 文件路径
            valid_repos: 有效仓库名集合
        
        Returns:
            推断的仓库名，无法推断则返回 None
        """
        if not file_path:
            return None
        
        first_segment = file_path.split("/", 1)[0]
        for candidate in valid_repos:
            if candidate and candidate.lower() == first_segment.lower():
                return candidate
        
        if len(valid_repos) == 1:
            return next(iter(valid_repos))
        
        return None
```

### 3. 模糊匹配算法

#### 原理

使用多级模糊匹配处理 LLM 返回的不精确名称。

```python
class FuzzyMatcher:
    """
    模糊匹配器
    
    处理 LLM 返回的不精确名称
    """
    
    @staticmethod
    def normalize(name: str) -> str:
        """
        标准化名称
        
        Args:
            name: 原始名称
        
        Returns:
            标准化后的名称
        """
        name = name.strip().strip("`").strip("*").strip("'").strip('"')
        return name.lower()
    
    def fuzzy_match_repo(
        self,
        candidate: str,
        available: list
    ) -> str:
        """
        模糊匹配仓库名
        
        Args:
            candidate: 候选名称
            available: 可用名称列表
        
        Returns:
            匹配到的名称，无匹配则返回 None
        """
        norm_candidate = self.normalize(candidate)
        if not norm_candidate:
            return None
        
        # 1. 精确匹配（不区分大小写）
        for name in available:
            if self.normalize(name) == norm_candidate:
                return name
        
        # 2. 子串包含匹配
        for name in available:
            norm_name = self.normalize(name)
            if norm_candidate in norm_name or norm_name in norm_candidate:
                return name
        
        # 3. Jaccard 相似度匹配
        return self._jaccard_match(candidate, available)
    
    def _jaccard_match(self, candidate: str, available: list) -> str:
        """
        Jaccard 相似度匹配
        
        Args:
            candidate: 候选名称
            available: 可用名称列表
        
        Returns:
            最佳匹配名称
        """
        def tokens(s: str) -> set:
            return set(re.split(r'[\W_]+', s.lower())) - {''}
        
        cand_tokens = tokens(candidate)
        best_score = 0.0
        best_name = None
        
        for name in available:
            name_tokens = tokens(name)
            if not cand_tokens or not name_tokens:
                continue
            
            score = len(cand_tokens & name_tokens) / len(cand_tokens | name_tokens)
            
            if score > best_score:
                best_score = score
                best_name = name
        
        if best_score >= 0.5:
            return best_name
        
        return None
    
    def fuzzy_match_file(
        self,
        candidate: str,
        available_files: list
    ) -> str:
        """
        模糊匹配文件名
        
        Args:
            candidate: 候选文件名
            available_files: 可用文件列表
        
        Returns:
            匹配到的文件路径
        """
        norm_candidate = self.normalize(candidate)
        
        # 1. 精确匹配
        for file_path in available_files:
            if self.normalize(file_path) == norm_candidate:
                return file_path
        
        # 2. 文件名匹配（忽略路径）
        for file_path in available_files:
            file_name = os.path.basename(file_path)
            if self.normalize(file_name) == norm_candidate:
                return file_path
        
        # 3. 后缀匹配
        for file_path in available_files:
            if file_path.lower().endswith(norm_candidate):
                return file_path
        
        return None
```

## 实践指导

### 1. 场景模式选择

| 场景 | 模式 | 说明 |
|-----|-----|------|
| 单仓库查询 | single | 仅在当前仓库内选择文件 |
| 多仓库查询 | multi | 先选择仓库，再选择文件 |
| 跨仓库依赖 | multi | 需要分析多个仓库的关系 |

### 2. 模糊匹配阈值

| 匹配类型 | 阈值 | 说明 |
|---------|-----|------|
| Jaccard 相似度 | 0.5 | 低于此值认为不匹配 |
| 子串包含 | 无 | 只要包含即匹配 |
| 精确匹配 | 1.0 | 完全相同才匹配 |

### 3. 性能优化

- 缓存仓库概览，避免重复构建
- 限制 LLM 调用次数
- 使用本地模型减少延迟
- 批量处理多个查询

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [Jaccard 相似度](https://en.wikipedia.org/wiki/Jaccard_index)
- [LLM 提示工程](https://platform.openai.com/docs/guides/prompt-engineering)
