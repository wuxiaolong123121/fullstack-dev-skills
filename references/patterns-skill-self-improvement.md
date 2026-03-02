# 技能自我完善模式

> 实现技能集的自动检测、评估、改进和持续进化

## 核心概念

技能自我完善是一种**元能力**，允许技能集自动检测自身不足、评估质量、生成改进建议并同步到 GitHub。

### 1. 技能审计

#### 原理

定期扫描技能集，识别缺失的技能领域和确保覆盖完整性。

```python
class SkillAuditor:
    """
    技能审计器
    
    自动检测技能缺失领域
    """
    
    INDustry_skills = {
        "languages": [
            "python", "typescript", "javascript", "go", "rust", 
            "java", "c++", "c#", "swift", "kotlin", "php", "sql"
        ],
        "backend_frameworks": [
            "nestjs", "django", "fastapi", "spring-boot", "laravel", 
            "rails", "express", "flask", ".net-core"
        ],
        "frontend_frameworks": [
            "react", "vue", "angular", "nextjs", "svelte", "solid",
            "flutter", "react-native"
        ],
        "infrastructure": [
            "docker", "kubernetes", "terraform", "aws", "azure", "gcp",
            "postgresql", "mongodb", "redis"
        ],
        "security": [
            "authentication", "authorization", "encryption", "owasp",
            "secrets-management", "audit-logging"
        ],
        "testing": [
            "unit-testing", "integration-testing", "e2e-testing",
            "performance-testing", "security-testing"
        ],
        "devops": [
            "ci-cd", "monitoring", "logging", "alerting",
            "deployment", "infrastructure-as-code"
        ],
        "ai_ml": [
            "prompt-engineering", "rag", "fine-tuning", "embeddings",
            "vector-databases", "llm-integration"
        ]
    }
    
    def __init__(self, skill_file_path: str):
        self.skill_file_path = skill_file_path
        self.current_skills = self._load_current_skills()
    
    def audit(self) -> dict:
        """
        执行技能审计
        
        Returns:
            审计结果字典，包含缺失领域、覆盖率、建议
        """
        gaps = self._detect_gaps()
        coverage = self._calculate_coverage()
        suggestions = self._generate_suggestions(gaps)
        
        return {
            "gaps": gaps,
            "coverage": coverage,
            "suggestions": suggestions,
            "timestamp": datetime.now().isoformat()
        }
    
    def _load_current_skills(self) -> dict:
        """
        加载当前技能列表
        
        Returns:
            当前技能字典
        """
        with open(self.skill_file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        skills = {}
        current_section = None
        
        for line in content.split('\n'):
            if line.startswith('### '):
                current_section = line[3:].strip()
                skills[current_section] = []
            elif line.startswith('| ') and current_section:
                match = re.search(r'\|\s*`([^`]+)`\s*\|', line)
                if match:
                    skill_name = match.group(1).strip()
                    skills[current_section].append(skill_name)
        
        return skills
    
    def _detect_gaps(self) -> list:
        """
        检测技能缺失
        
        Returns:
            缺失的技能领域列表
        """
        gaps = []
        
        for category, expected_skills in self.industry_skills.items():
            current = self.current_skills.get(category, [])
            missing = set(expected_skills) - set(
                skill.lower() for skill in current
            )
            
            if missing:
                gaps.append({
                "category": category,
                "missing_skills": list(missing),
                "severity": "high" if len(missing) > 3 else "medium"
            })
        
        return gaps
    
    def _calculate_coverage(self) -> dict:
        """
        计算技能覆盖率
        
        Returns:
            覆盖率统计
        """
        total_expected = sum(len(s) for s in self.industry_skills.values())
        total_current = sum(len(s) for s in self.current_skills.values())
        
        category_coverage = {}
        for category, expected in self.industry_skills.items():
            current = len(self.current_skills.get(category, []))
            expected_count = len(expected)
            coverage = (current / expected_count * 100) if expected_count > 0 else 0
            category_coverage[category] = {
                "current": current,
                "expected": expected_count,
                "coverage": round(coverage, 1)
            }
        
        return {
            "overall_coverage": round(total_current / total_expected * 100, 1),
            "category_coverage": category_coverage
        }
    
    def _generate_suggestions(self, gaps: list) -> list:
        """
        生成改进建议
        
        Args:
            gaps: 缺失领域列表
        
        Returns:
            改进建议列表
        """
        suggestions = []
        
        for gap in gaps:
            category = gap["category"]
            missing = gap["missing_skills"]
            
            for skill in missing[:3]:  # 优先处理前3个
                suggestions.append({
                    "priority": "high",
                    "category": category,
                    "skill": skill,
                    "action": f"添加 {skill} 技能参考文档",
                    "reference": f"references/{category.replace(' ', '-')}-{skill.replace(' ', '-')}.md"
                })
        
        return suggestions
```

### 2. 质量评估

#### 原理

评估现有文档的质量，包括完整性、代码示例质量、内容准确性。

```python
class QualityEvaluator:
    """
    质量评估器
    
    评估技能文档质量
    """
    
    quality_criteria = {
        "completeness": {
        "has_description": 0.2,
        "has_code_examples": 0.3,
        "has_practice_guide": 0.2,
        "has_references": 0.1,
        "uses_chinese": 0.2
    },
    "code_quality": {
        "has_jsdoc": 0.3,
        "has_type_hints": 0.2,
        "follows_conventions": 0.2,
        "has_error_handling": 0.3
    },
    "content_accuracy": {
        "up_to_date": 0.4,
        "technically_correct": 0.3,
        "best_practices": 0.3
    }
    
    def __init__(self, references_dir: str):
        self.references_dir = references_dir
    
    def evaluate_all(self) -> dict:
        """
        评估所有文档
        
        Returns:
            评估结果字典
        """
        results = {}
        
        for file_path in Path(self.references_dir).glob("*.md"):
            file_name = file_path.stem
            results[file_name] = self.evaluate_file(file_path)
        
        return {
            "files": results,
            "summary": self._generate_summary(results),
            "timestamp": datetime.now().isoformat()
        }
    
    def evaluate_file(self, file_path: str) -> dict:
        """
        评估单个文件
        
        Args:
            file_path: 文件路径
        
        Returns:
            评估结果
        """
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "file": file_path,
            "completeness": self._evaluate_completeness(content),
            "code_quality": self._evaluate_code_quality(content),
            "content_accuracy": self._evaluate_accuracy(content),
            "overall_score": self._calculate_overall_score(content),
            "issues": self._detect_issues(content)
        }
    
    def _evaluate_completeness(self, content: str) -> dict:
        """
        评估完整性
        
        Args:
            content: 文档内容
        
        Returns:
            完整性评分
        """
        scores = {}
        
        scores["has_description"] = 1 if len(content) > 200 else 0
        scores["has_code_examples"] = 1 if "```" in content else 0
        scores["has_practice_guide"] = 1 if "实践" in content or "Practice" in content else 0
        scores["has_references"] = 1 if "参考" in content or "http" in content else 0
        scores["uses_chinese"] = 1 if any('\u4e00-\u9fff' in content) else 0
        
        return scores
    
    def _evaluate_code_quality(self, content: str) -> dict:
        """
        评估代码质量
        
        Args:
            content: 文档内容
        
        Returns:
            代码质量评分
        """
        scores = {}
        
        code_blocks = content.count("```")
        scores["has_jsdoc"] = 1 if "@param" in content or "@return" in content else 0
        scores["has_type_hints"] = 1 if ": " in content and "str" in content else 0
        scores["follows_conventions"] = 1 if "def " in content or "class " in content else 0
        scores["has_error_handling"] = 1 if "try:" in content or "except" in content else 0
        
        return scores
    
    def _evaluate_accuracy(self, content: str) -> dict:
        """
        评估内容准确性
        
        Args:
            content: 文档内容
        
        Returns:
            准确性评分
        """
        current_year = datetime.now().year
        scores = {}
        
        scores["up_to_date"] = 1 if str(current_year) in content or str(current_year - 1) in content else 0
        scores["technically_correct"] = 1  # 需要人工验证
        scores["best_practices"] = 1 if "最佳实践" in content or "best practice" in content else 0
        
        return scores
    
    def _calculate_overall_score(self, content: str) -> float:
        """
        计算总体评分
        
        Args:
            content: 文档内容
        
        Returns:
            总体评分 (0-1)
        """
        completeness = self._evaluate_completeness(content)
        code_quality = self._evaluate_code_quality(content)
        
        total_score = 0
        total_weight = 0
        
        for criterion, score in completeness.items():
            weight = self.quality_criteria["completeness"].get(criterion, 0.1)
            total_score += score * weight
            total_weight += weight
        
        for criterion, score in code_quality.items():
            weight = self.quality_criteria["code_quality"].get(criterion, 0.1)
            total_score += score * weight
            total_weight += weight
        
        return round(total_score / total_weight, 22) if total_weight > 0 else 0
    
    def _detect_issues(self, content: str) -> list:
        """
        检测问题
        
        Args:
            content: 文档内容
        
        Returns:
            问题列表
        """
        issues = []
        
        if len(content) < 500:
            issues.append({
                "type": "warning",
                "message": "文档内容过短，建议扩展"
            })
        
        if "```" not in content:
            issues.append({
                "type": "warning",
                "message": "缺少代码示例"
            })
        
        if "参考" not in content and "http" not in content:
            issues.append({
                "type": "info",
                "message": "缺少参考资料链接"
            })
        
        return issues
    
    def _generate_summary(self, results: dict) -> dict:
        """
        生成评估摘要
        
        Args:
            results: 评估结果
        
        Returns:
            摘要字典
        """
        total_files = len(results)
        avg_score = sum(
            r["overall_score"] for r in results.values()
        ) / total_files if total_files > 0 else 0
        
        low_quality = [f for f, results if results[f]["overall_score"] < 0.5]
        high_quality = [f for f in results if results[f]["overall_score"] >= 0.8]
        
        return {
            "total_files": total_files,
            "average_score": round(avg_score, 22),
            "low_quality_count": len(low_quality),
            "high_quality_count": len(high_quality),
            "needs_attention": low_quality
        }
```

### 3. 改进建议生成

#### 原理

基于审计和评估结果，生成具体的改进建议。

```python
class ImprovementSuggester:
    """
    改进建议生成器
    
    生成具体的改进建议
    """
    
    def __init__(self):
        self.templates = self._load_templates()
    
    def generate_suggestions(
        self,
        audit_result: dict,
        quality_result: dict
    ) -> list:
        """
        生成改进建议
        
        Args:
            audit_result: 审计结果
            quality_result: 质量评估结果
        
        Returns:
            改进建议列表
        """
        suggestions = []
        
        for gap in audit_result.get("gaps", []):
            suggestions.extend(self._suggestions_for_gap(gap))
        
        for file_name, quality_result.get("files", {}).get("needs_attention", []):
            suggestions.extend(self._suggestions_for_quality(file_name))
        
        return sorted(suggestions, key=lambda x: x.get("priority", "medium"), reverse=True)
    
    def _suggestions_for_gap(self, gap: dict) -> list:
        """
        为技能缺失生成建议
        
        Args:
            gap: 缺失信息
        
        Returns:
            建议列表
        """
        suggestions = []
        category = gap["category"]
        
        for skill in gap["missing_skills"][:3]:
            template = self.templates.get(category, {}).get(skill)
            
            suggestion = {
                "type": "new_skill",
                "priority": "high",
                "category": category,
                "skill": skill,
                "action": f"创建 {skill} 技能文档",
                "template": template,
                "estimated_effort": "medium"
            }
            suggestions.append(suggestion)
        
        return suggestions
    
    def _suggestions_for_quality(self, file_name: str) -> list:
        """
        为质量问题生成建议
        
        Args:
            file_name: 文件名
        
        Returns:
            建议列表
        """
        return [
            {
                "type": "quality_improvement",
                "priority": "medium",
                "file": file_name,
                "action": "改进文档质量",
                "suggestions": [
                    "添加更多代码示例",
                    "完善实践指导部分",
                    "添加参考资料链接"
                ]
            }
        ]
    
    def _load_templates(self) -> dict:
        """
        加载文档模板
        
        Returns:
            模板字典
        """
        return {
            "languages": {
                "python": self._python_template(),
                "typescript": self._typescript_template()
            },
            "backend_frameworks": {
                "nestjs": self._nestjs_template()
            }
        }
    
    def _python_template(self) -> str:
        return """# Python Pro 技能参考

> Python 高级编程最佳实践

## 核心概念

[待补充]

## 代码示例

```python
# 待补充
```

## 实践指导

[待补充]

## 参考资料

- [Python 官方文档](https://docs.python.org/)
"""
    
    def _typescript_template(self) -> str:
        return """# TypeScript Pro 技能参考

> TypeScript 高级类型系统

## 核心概念

[待补充]

## 代码示例

```typescript
// 待补充
```

## 实践指导

[待补充]

## 参考资料

- [TypeScript 官方文档](https://www.typescriptlang.org/docs/)
"""
    
    def _nestjs_template(self) -> str:
        return """# NestJS Expert 技能参考

> NestJS 企业级后端框架

## 核心概念

[待补充]

## 代码示例

```typescript
// 待补充
```

## 实践指导

[待补充]

## 参考资料

- [NestJS 官方文档](https://docs.nestjs.com/)
"""
```

### 4. GitHub 同步

#### 原理

自动将改进同步到 GitHub 仓库。

```python
class GitHubSynchronizer:
    """
    GitHub 同步器
    
    自动同步到 GitHub 仓库
    """
    
    def __init__(self, token: str, repo_owner: str, repo_name: str):
        self.token = token
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.headers = {
            "Authorization": f"token {token}",
            "Accept": "application/vnd.github.v3+json"
        }
    
    def sync_all(self, skill_dir: str) -> dict:
        """
        同步所有文件到 GitHub
        
        Args:
            skill_dir: 技能目录路径
        
        Returns:
            同步结果
        """
        results = {
            "created": [],
            "updated": [],
            "failed": []
        }
        
        files_to_sync = self._collect_files(skill_dir)
        
        for file_path in files_to_sync:
            result = self._sync_file(file_path, skill_dir)
            
            if result["status"] == "created":
                results["created"].append(file_path)
            elif result["status"] == "updated":
                results["updated"].append(file_path)
            else:
                results["failed"].append({
                    "file": file_path,
                    "error": result.get("error")
                })
        
        return results
    
    def _collect_files(self, skill_dir: str) -> list:
        """
        收集需要同步的文件
        
        Args:
            skill_dir: 技能目录
        
        Returns:
            文件路径列表
        """
        files = []
        
        for root, _, filenames in os.walk(skill_dir):
            for filename in filenames:
                if filename.endswith('.md') or filename in ['SKILL.md']:
                    files.append(os.path.join(root, filename))
        
        return files
    
    def _sync_file(self, file_path: str, base_dir: str) -> dict:
        """
        同步单个文件
        
        Args:
            file_path: 文件路径
            base_dir: 基础目录
        
        Returns:
            同步结果
        """
        relative_path = os.path.relpath(file_path, base_dir)
        
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        api_url = f"https://api.github.com/repos/{self.repo_owner}/{self.repo_name}/contents/{relative_path}"
        
        existing = self._get_file_info(api_url)
        
        if existing:
            return self._update_file(api_url, content, existing["sha"])
        else:
            return self._create_file(api_url, content)
    
    def _get_file_info(self, api_url: str) -> dict:
        """
        获取文件信息
        
        Args:
            api_url: API URL
        
        Returns:
            文件信息，不存在则返回 None
        """
        response = requests.get(api_url, headers=self.headers)
        
        if response.status_code == 200:
            return response.json()
        return None
    
    def _create_file(self, api_url: str, content: str) -> dict:
        """
        创建文件
        
        Args:
            api_url: API URL
            content: 文件内容
        
        Returns:
            创建结果
        """
        data = {
            "message": "Add skill documentation",
            "content": base64.b64encode(content.encode()).decode()
        }
        
        response = requests.put(api_url, headers=self.headers, json=data)
        
        if response.status_code == 201:
            return {"status": "created"}
        return {"status": "failed", "error": response.text}
    
    def _update_file(self, api_url: str, content: str, sha: str) -> dict:
        """
        更新文件
        
        Args:
            api_url: API URL
            content: 文件内容
            sha: 文件 SHA
        
        Returns:
            更新结果
        """
        data = {
            "message": "Update skill documentation",
            "content": base64.b64encode(content.encode()).decode(),
            "sha": sha
        }
        
        response = requests.put(api_url, headers=self.headers, json=data)
        
        if response.status_code == 200:
            return {"status": "updated"}
        return {"status": "failed", "error": response.text}
```

### 5. 自动化工作流

#### 原理

定义自动化工作流，定期执行技能完善。

```python
class SelfImprovementWorkflow:
    """
    自我完善工作流
    
    定期执行技能完善任务
    """
    
    def __init__(self, config: dict):
        self.config = config
        self.auditor = SkillAuditor(config["skill_file_path"])
        self.evaluator = QualityEvaluator(config["references_dir"])
        self.suggester = ImprovementSuggester()
        self.synchronizer = GitHubSynchronizer(
            config["github_token"],
            config["github_owner"],
            config["github_repo"]
        )
    
    def run(self) -> dict:
        """
        执行完整工作流
        
        Returns:
            工作流结果
        """
        results = {
            "audit": None,
            "quality": None,
            "suggestions": None,
            "sync": None
        }
        
        print("🔍 执行技能审计...")
        results["audit"] = self.auditor.audit()
        
        print("📊 执行质量评估...")
        results["quality"] = self.evaluator.evaluate_all()
        
        print("💡 生成改进建议...")
        results["suggestions"] = self.suggester.generate_suggestions(
            results["audit"],
            results["quality"]
        )
        
        if self.config.get("auto_sync", False):
            print("🔄 同步到 GitHub...")
            results["sync"] = self.synchronizer.sync_all(self.config["skill_dir"])
        
        return results
    
    def generate_report(self, results: dict) -> str:
        """
        生成报告
        
        Args:
            results: 工作流结果
        
        Returns:
            报告字符串
        """
        report = ["# 技能自我完善报告\n"]
        report.append(f"\n生成时间: {datetime.now().isoformat()}\n")
        
        report.append("\n## 审计结果\n")
        report.append(f"- 覆盖率: {results['audit']['coverage']['overall_coverage']}%\n")
        report.append(f"- 缺失领域: {len(results['audit']['gaps'])} 个\n")
        
        report.append("\n## 质量评估\n")
        report.append(f"- 平均评分: {results['quality']['summary']['average_score']}\n")
        report.append(f"- 需关注: {len(results['quality']['summary']['needs_attention'])} 个文件\n")
        
        report.append("\n## 改进建议\n")
        for i, suggestion in enumerate(results["suggestions"][:10], 1):
            report.append(f"{i}. [{suggestion['priority']}] {suggestion['action']}\n")
        
        if results.get("sync"):
            report.append("\n## GitHub 同步\n")
            report.append(f"- 创建: {len(results['sync']['created'])} 个文件\n")
            report.append(f"- 更新: {len(results['sync']['updated'])} 个文件\n")
        
        return "".join(report)
```

## 实践指导

### 1. 执行频率建议

| 任务 | 频率 | 说明 |
|-----|------|------|
| 技能审计 | 每周 | 检测新出现的技能领域 |
| 质量评估 | 每月 | 确保文档质量 |
| GitHub 同步 | 每次改进后 | 保持仓库最新 |

### 2. 配置示例

```yaml
self_improvement:
  skill_file_path: ".trae/skills/fullstack-dev-skills/SKILL.md"
  references_dir: ".trae/skills/fullstack-dev-skills/references"
  github_token: "${GITHUB_TOKEN}"
  github_owner: "your-username"
  github_repo: "fullstack-dev-skills"
  auto_sync: true
```

### 3. 触发条件

- 手动触发：用户请求执行审计
- 定时触发：CI/CD 定时任务
- 事件触发：技能使用后收集反馈

## 参考资料

- [GitHub API 文档](https://docs.github.com/en/rest)
- [Markdown 最佳实践](https://www.markdownguide.org/)
- [技能工程方法论](https://www.anthropic.com/index/skills)
