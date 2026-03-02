# FastCode 代码探索工具模式

> 基于 HKUDS FastCode 项目 - Agent Tools 模块

## 核心概念

FastCode 提供一套**只读代码探索工具**，允许 AI Agent 安全地浏览和搜索代码库，无需加载完整代码。

### 1. 目录列表工具

#### 原理

安全地列出目录内容，支持隐藏文件过滤，返回结构化的目录信息。

```python
class DirectoryLister:
    """
    目录列表工具
    
    安全地列出目录内容
    """
    
    def __init__(self, repo_root: str):
        self.repo_root = os.path.abspath(repo_root)
        self.path_utils = PathUtils(repo_root)
    
    def list_directory(
        self,
        path: str = ".",
        include_hidden: bool = False
    ) -> dict:
        """
        列出目录内容
        
        Args:
            path: 相对于仓库根目录的路径
            include_hidden: 是否包含隐藏文件
        
        Returns:
            目录结构字典，包含成功状态、内容列表
        """
        if not self._is_safe_path(path):
            return {
                "success": False,
                "error": "Access denied: path outside repository root",
                "path": path
            }
        
        full_path = self._resolve_path(path)
        if full_path is None:
            return {
                "success": False,
                "error": f"Path does not exist: {path}",
                "path": path
            }
        
        if not os.path.isdir(full_path):
            return {
                "success": False,
                "error": f"Path is not a directory: {path}",
                "path": path
            }
        
        result = {
            "success": True,
            "path": path,
            "contents": []
        }
        
        for item in sorted(os.listdir(full_path)):
            if not include_hidden and item.startswith('.'):
                continue
            
            item_path = os.path.join(full_path, item)
            rel_path = os.path.relpath(item_path, self.repo_root)
            is_dir = os.path.isdir(item_path)
            
            item_info = {
                "name": item,
                "path": rel_path,
                "type": "directory" if is_dir else "file"
            }
            
            if not is_dir:
                try:
                    item_info["size"] = os.path.getsize(item_path)
                except:
                    item_info["size"] = 0
            
            result["contents"].append(item_info)
        
        return result
    
    def _is_safe_path(self, path: str) -> bool:
        """
        检查路径是否在仓库根目录内
        
        Args:
            path: 待检查的路径
        
        Returns:
            是否安全
        """
        return self.path_utils.is_safe_path(path)
    
    def _resolve_path(self, path: str) -> str:
        """
        智能解析路径
        
        Args:
            path: 相对路径
        
        Returns:
            绝对路径，如果不存在则返回 None
        """
        return self.path_utils.resolve_path(path)
```

### 2. 代码搜索工具

#### 原理

在代码库中搜索字符串或正则表达式，支持文件模式匹配和大小写敏感选项。

```python
class CodeSearcher:
    """
    代码搜索工具
    
    支持正则表达式和文件模式匹配
    """
    
    def __init__(self, repo_root: str):
        self.repo_root = os.path.abspath(repo_root)
        self.exclude_dirs = {
            '__pycache__', 'node_modules', '.git', 
            'dist', 'build', 'venv', '.venv'
        }
    
    def search_codebase(
        self,
        search_term: str,
        file_pattern: str = "*",
        root_path: str = ".",
        max_results: int = 30,
        case_sensitive: bool = False,
        use_regex: bool = False
    ) -> dict:
        """
        搜索代码库
        
        Args:
            search_term: 搜索字符串或正则表达式
            file_pattern: 文件模式 (如 "*.py", "*.js")
            root_path: 搜索起始路径
            max_results: 最大返回结果数
            case_sensitive: 是否大小写敏感
            use_regex: 是否使用正则表达式
        
        Returns:
            搜索结果字典
        """
        if not self._is_safe_path(root_path):
            return {
                "success": False,
                "error": "Access denied: path outside repository root",
                "search_term": search_term
            }
        
        search_root = self._resolve_path(root_path)
        if search_root is None:
            return {
                "success": False,
                "error": f"Path does not exist: {root_path}",
                "search_term": search_term
            }
        
        try:
            content_pattern = self._compile_pattern(
                search_term, case_sensitive, use_regex
            )
            file_matcher = self._compile_file_matcher(file_pattern)
            
            results = []
            files_searched = 0
            
            for root, dirs, files in os.walk(search_root):
                dirs[:] = [d for d in dirs if not d.startswith('.') and d not in self.exclude_dirs]
                
                for file in files:
                    if file.startswith('.'):
                        continue
                    
                    file_path = os.path.join(root, file)
                    rel_path = os.path.relpath(file_path, self.repo_root)
                    
                    if not self._match_file(rel_path, file, file_matcher, file_pattern):
                        continue
                    
                    files_searched += 1
                    file_result = self._search_file(
                        file_path, rel_path, content_pattern, case_sensitive
                    )
                    
                    if file_result:
                        results.append(file_result)
                        if len(results) >= max_results:
                            break
                
                if len(results) >= max_results:
                    break
            
            return {
                "success": True,
                "search_term": search_term,
                "file_pattern": file_pattern,
                "files_searched": files_searched,
                "matches_found": len(results),
                "results": results
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "search_term": search_term
            }
    
    def _compile_pattern(self, term: str, case_sensitive: bool, use_regex: bool):
        """
        编译搜索模式
        
        Args:
            term: 搜索词
            case_sensitive: 是否大小写敏感
            use_regex: 是否使用正则表达式
        
        Returns:
            编译后的正则表达式对象
        """
        flags = 0 if case_sensitive else re.IGNORECASE
        
        if use_regex:
            return re.compile(term, flags)
        
        if '|' in term:
            terms = [re.escape(t.strip()) for t in term.split('|')]
            pattern_str = '|'.join(terms)
        else:
            pattern_str = re.escape(term)
        
        return re.compile(pattern_str, flags)
    
    def _search_file(self, file_path: str, rel_path: str, pattern, case_sensitive: bool) -> dict:
        """
        在单个文件中搜索
        
        Args:
            file_path: 文件绝对路径
            rel_path: 文件相对路径
            pattern: 编译后的搜索模式
            case_sensitive: 是否大小写敏感
        
        Returns:
            文件搜索结果，无匹配则返回 None
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                content = f.read()
            
            file_matches = []
            lines = content.split('\n')
            
            for i, line in enumerate(lines, 1):
                if pattern.search(line):
                    file_matches.append({
                        "line_number": i,
                        "line_content": line.strip()[:200]
                    })
                    if len(file_matches) >= 20:
                        break
            
            if file_matches:
                return {
                    "file": rel_path,
                    "match_count": len(file_matches),
                    "matches": file_matches,
                    "match_type": "content"
                }
        
        except Exception:
            pass
        
        return None
```

### 3. 文件结构摘要工具

#### 原理

提取文件的类、函数定义，无需读取完整源码，快速理解文件结构。

```python
class FileStructureSummarizer:
    """
    文件结构摘要工具
    
    提取文件的类、函数定义
    """
    
    def __init__(self, repo_root: str):
        self.repo_root = repo_root
        self.max_lines = 100
    
    def get_file_structure_summary(
        self,
        file_path: str,
        max_lines: int = 100
    ) -> dict:
        """
        获取文件结构摘要
        
        Args:
            file_path: 文件路径
            max_lines: 最大读取行数
        
        Returns:
            文件结构摘要
        """
        if not self._is_safe_path(file_path):
            return {
                "success": False,
                "error": "Access denied: path outside repository root"
            }
        
        full_path = self._resolve_path(file_path)
        if full_path is None:
            return {
                "success": False,
                "error": f"File does not exist: {file_path}"
            }
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = []
                for i, line in enumerate(f):
                    if i >= max_lines:
                        break
                    lines.append(line)
            
            content = ''.join(lines)
            
            classes = self._extract_classes(content)
            functions = self._extract_functions(content)
            imports = self._extract_imports(content)
            
            return {
                "success": True,
                "path": file_path,
                "classes": classes,
                "functions": functions,
                "imports": imports,
                "lines_analyzed": len(lines)
            }
        
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    def _extract_classes(self, content: str) -> list:
        """
        提取类定义
        
        Args:
            content: 文件内容
        
        Returns:
            类信息列表
        """
        classes = []
        pattern = r'^\s*class\s+(\w+)(?:\s*\([^)]*\))?:'
        
        for match in re.finditer(pattern, content, re.MULTILINE):
            classes.append({
                "name": match.group(1),
                "line": content[:match.start()].count('\n') + 1
            })
        
        return classes
    
    def _extract_functions(self, content: str) -> list:
        """
        提取函数定义
        
        Args:
            content: 文件内容
        
        Returns:
            函数信息列表
        """
        functions = []
        pattern = r'^\s*(?:async\s+)?def\s+(\w+)\s*\(([^)]*)\)'
        
        for match in re.finditer(pattern, content, re.MULTILINE):
            functions.append({
                "name": match.group(1),
                "params": match.group(2).strip(),
                "line": content[:match.start()].count('\n') + 1
            })
        
        return functions
    
    def _extract_imports(self, content: str) -> list:
        """
        提取导入语句
        
        Args:
            content: 文件内容
        
        Returns:
            导入信息列表
        """
        imports = []
        patterns = [
            r'^\s*import\s+(\S+)',
            r'^\s*from\s+(\S+)\s+import'
        ]
        
        for pattern in patterns:
            for match in re.finditer(pattern, content, re.MULTILINE):
                imports.append(match.group(1))
        
        return list(set(imports))
```

## 实践指导

### 1. 工具选择策略

| 任务 | 推荐工具 | 说明 |
|-----|---------|------|
| 浏览项目结构 | 目录列表 | 快速了解目录布局 |
| 查找特定代码 | 代码搜索 | 支持正则和文件模式 |
| 理解文件功能 | 结构摘要 | 无需读取完整文件 |
| 定位函数定义 | 结构摘要 | 提取函数签名和参数 |

### 2. 安全最佳实践

- 始终验证路径在仓库根目录内
- 禁止访问隐藏文件和敏感目录
- 限制搜索结果数量防止资源耗尽
- 使用只读模式，不修改任何文件

### 3. 性能优化建议

- 使用文件模式过滤减少搜索范围
- 限制最大读取行数
- 缓存常用目录结构
- 并行处理多个小文件

## 参考资料

- [FastCode GitHub](https://github.com/HKUDS/FastCode)
- [Path Security Best Practices](https://owasp.org/www-community/attacks/Path_Traversal)
