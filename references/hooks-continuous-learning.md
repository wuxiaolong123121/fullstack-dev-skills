# 持续学习 Hook 参考指南

基于 Hook 的持续学习系统，通过确定性观察机制捕获会话行为，提取模式并演化为可复用的技能资产。

## When to Activate

- 配置基于 Hook 的自动学习系统
- 实现模式提取与知识存储
- 调整学习行为的置信度阈值
- 将本能演化为技能/命令/代理
- 设计知识库的导入导出机制

## Core Principles

### 1. Hook 确定性捕获

Hook 机制提供 100% 可靠的事件捕获，区别于 Skill 的概率性触发。

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable
from enum import Enum
import json


class HookType(Enum):
    """Hook 类型枚举。"""
    PRE_TOOL_USE = "PreToolUse"
    POST_TOOL_USE = "PostToolUse"
    PRE_PROMPT = "PrePrompt"
    POST_PROMPT = "PostPrompt"
    NOTIFICATION = "Notification"


@dataclass
class HookContext:
    """Hook 执行上下文。"""
    hook_type: HookType
    timestamp: datetime = field(default_factory=datetime.now)
    tool_name: str | None = None
    tool_input: dict[str, Any] = field(default_factory=dict)
    tool_output: dict[str, Any] = field(default_factory=dict)
    session_id: str = ""
    user_prompt: str = ""


@dataclass
class HookResult:
    """Hook 执行结果。"""
    should_continue: bool = True
    modified_input: dict[str, Any] | None = None
    observations: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
```

### 2. 观察数据原子化

每个观察记录都是不可分割的原子单元，包含完整的上下文信息。

```python
@dataclass
class Observation:
    """原子观察记录。"""
    id: str
    timestamp: datetime
    hook_type: str
    trigger: str
    action: dict[str, Any]
    outcome: str
    context: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_jsonl(self) -> str:
        """转换为 JSONL 格式用于存储。"""
        return json.dumps({
            "id": self.id,
            "timestamp": self.timestamp.isoformat(),
            "hook_type": self.hook_type,
            "trigger": self.trigger,
            "action": self.action,
            "outcome": self.outcome,
            "context": self.context,
            "metadata": self.metadata
        }, ensure_ascii=False)

    @classmethod
    def from_jsonl(cls, data: str) -> "Observation":
        """从 JSONL 格式解析。"""
        obj = json.loads(data)
        return cls(
            id=obj["id"],
            timestamp=datetime.fromisoformat(obj["timestamp"]),
            hook_type=obj["hook_type"],
            trigger=obj["trigger"],
            action=obj["action"],
            outcome=obj["outcome"],
            context=obj.get("context", {}),
            metadata=obj.get("metadata", {})
        )
```

## 模式提取机制

### 模式检测器

```python
from abc import ABC, abstractmethod
from collections import Counter
from dataclasses import dataclass
from typing import Protocol
import re


class PatternDetector(Protocol):
    """模式检测器协议。"""

    def detect(self, observations: list[Observation]) -> list["DetectedPattern"]:
        """从观察记录中检测模式。"""
        ...


@dataclass
class DetectedPattern:
    """检测到的模式。"""
    pattern_id: str
    pattern_type: str
    trigger: str
    action: str
    confidence: float
    evidence: list[str]
    domain: str
    occurrence_count: int


class UserCorrectionDetector:
    """用户修正模式检测器。"""

    def __init__(self, min_occurrences: int = 2):
        self.min_occurrences = min_occurrences

    def detect(self, observations: list[Observation]) -> list[DetectedPattern]:
        """检测用户修正行为模式。"""
        corrections: dict[str, list[Observation]] = {}

        for obs in observations:
            if self._is_correction(obs):
                key = self._extract_pattern_key(obs)
                if key not in corrections:
                    corrections[key] = []
                corrections[key].append(obs)

        patterns = []
        for key, obs_list in corrections.items():
            if len(obs_list) >= self.min_occurrences:
                patterns.append(self._create_pattern(key, obs_list))

        return patterns

    def _is_correction(self, obs: Observation) -> bool:
        """判断是否为修正行为。"""
        correction_indicators = [
            "修正", "修改", "改为", "应该是", "不对",
            "correct", "fix", "should be", "wrong"
        ]
        outcome_lower = obs.outcome.lower()
        return any(ind in outcome_lower for ind in correction_indicators)

    def _extract_pattern_key(self, obs: Observation) -> str:
        """提取模式唯一键。"""
        return f"{obs.hook_type}:{obs.trigger[:50]}"

    def _create_pattern(
        self,
        key: str,
        observations: list[Observation]
    ) -> DetectedPattern:
        """创建检测到的模式。"""
        return DetectedPattern(
            pattern_id=f"corr-{hash(key) % 10000:04d}",
            pattern_type="user_correction",
            trigger=observations[0].trigger,
            action=str(observations[0].action),
            confidence=min(0.9, 0.3 + len(observations) * 0.15),
            evidence=[obs.id for obs in observations],
            domain=self._infer_domain(observations[0]),
            occurrence_count=len(observations)
        )

    def _infer_domain(self, obs: Observation) -> str:
        """推断模式所属领域。"""
        domain_keywords = {
            "code-style": ["格式", "风格", "style", "format"],
            "testing": ["测试", "test", "spec"],
            "git": ["提交", "commit", "branch", "merge"],
            "debugging": ["调试", "debug", "错误", "error"],
            "workflow": ["流程", "workflow", "process"]
        }

        text = f"{obs.trigger} {obs.outcome}".lower()
        for domain, keywords in domain_keywords.items():
            if any(kw in text for kw in keywords):
                return domain
        return "general"


class ErrorResolutionDetector:
    """错误解决模式检测器。"""

    def detect(self, observations: list[Observation]) -> list[DetectedPattern]:
        """检测错误解决模式。"""
        error_patterns: dict[str, list[Observation]] = {}

        for obs in observations:
            if self._is_error_resolution(obs):
                error_type = self._extract_error_type(obs)
                if error_type not in error_patterns:
                    error_patterns[error_type] = []
                error_patterns[error_type].append(obs)

        return [
            self._create_pattern(err_type, obs_list)
            for err_type, obs_list in error_patterns.items()
            if len(obs_list) >= 2
        ]

    def _is_error_resolution(self, obs: Observation) -> bool:
        """判断是否为错误解决。"""
        return (
            obs.hook_type == "PostToolUse" and
            obs.outcome.get("status") == "success" and
            obs.context.get("previous_error") is not None
        )

    def _extract_error_type(self, obs: Observation) -> str:
        """提取错误类型。"""
        error_msg = obs.context.get("previous_error", "unknown")
        return re.sub(r'\d+', '#', error_msg)[:50]

    def _create_pattern(
        self,
        error_type: str,
        observations: list[Observation]
    ) -> DetectedPattern:
        """创建错误解决模式。"""
        return DetectedPattern(
            pattern_id=f"err-{hash(error_type) % 10000:04d}",
            pattern_type="error_resolution",
            trigger=error_type,
            action=str(observations[0].action),
            confidence=min(0.85, 0.4 + len(observations) * 0.1),
            evidence=[obs.id for obs in observations],
            domain="error-handling",
            occurrence_count=len(observations)
        )


class RepeatedWorkflowDetector:
    """重复工作流模式检测器。"""

    def __init__(self, sequence_length: int = 3):
        self.sequence_length = sequence_length

    def detect(self, observations: list[Observation]) -> list[DetectedPattern]:
        """检测重复工作流模式。"""
        sequences = self._extract_sequences(observations)
        pattern_counts = Counter(sequences)

        patterns = []
        for seq, count in pattern_counts.items():
            if count >= 2:
                patterns.append(DetectedPattern(
                    pattern_id=f"flow-{hash(seq) % 10000:04d}",
                    pattern_type="repeated_workflow",
                    trigger=seq,
                    action="sequence",
                    confidence=min(0.8, 0.3 + count * 0.2),
                    evidence=[],
                    domain="workflow",
                    occurrence_count=count
                ))

        return patterns

    def _extract_sequences(
        self,
        observations: list[Observation]
    ) -> list[str]:
        """提取工具调用序列。"""
        sequences = []
        for i in range(len(observations) - self.sequence_length + 1):
            seq_obs = observations[i:i + self.sequence_length]
            seq = " -> ".join(
                obs.action.get("tool", "unknown")
                for obs in seq_obs
            )
            sequences.append(seq)
        return sequences
```

### 模式聚合器

```python
class PatternAggregator:
    """模式聚合器：合并相似模式。"""

    def __init__(self, similarity_threshold: float = 0.7):
        self.similarity_threshold = similarity_threshold

    def aggregate(
        self,
        patterns: list[DetectedPattern]
    ) -> list[DetectedPattern]:
        """聚合相似模式。"""
        if not patterns:
            return []

        aggregated = []
        used = set()

        for i, pattern in enumerate(patterns):
            if i in used:
                continue

            similar = [pattern]
            for j, other in enumerate(patterns[i + 1:], i + 1):
                if j not in used and self._is_similar(pattern, other):
                    similar.append(other)
                    used.add(j)

            if len(similar) > 1:
                aggregated.append(self._merge_patterns(similar))
            else:
                aggregated.append(pattern)

        return aggregated

    def _is_similar(
        self,
        p1: DetectedPattern,
        p2: DetectedPattern
    ) -> bool:
        """判断两个模式是否相似。"""
        if p1.pattern_type != p2.pattern_type:
            return False

        trigger_sim = self._text_similarity(p1.trigger, p2.trigger)
        return trigger_sim >= self.similarity_threshold

    def _text_similarity(self, text1: str, text2: str) -> float:
        """计算文本相似度。"""
        words1 = set(text1.lower().split())
        words2 = set(text2.lower().split())

        if not words1 or not words2:
            return 0.0

        intersection = words1 & words2
        union = words1 | words2
        return len(intersection) / len(union)

    def _merge_patterns(
        self,
        patterns: list[DetectedPattern]
    ) -> DetectedPattern:
        """合并多个相似模式。"""
        total_count = sum(p.occurrence_count for p in patterns)
        avg_confidence = sum(p.confidence for p in patterns) / len(patterns)

        return DetectedPattern(
            pattern_id=f"merged-{hash(patterns[0].pattern_id) % 10000:04d}",
            pattern_type=patterns[0].pattern_type,
            trigger=patterns[0].trigger,
            action=patterns[0].action,
            confidence=min(0.95, avg_confidence + 0.1),
            evidence=[e for p in patterns for e in p.evidence],
            domain=patterns[0].domain,
            occurrence_count=total_count
        )
```

## 知识存储方案

### 本能存储结构

```python
from pathlib import Path
from datetime import datetime
import json
from typing import Optional


@dataclass
class Instinct:
    """本能：从观察中提取的学习行为。"""
    id: str
    trigger: str
    action: str
    confidence: float
    domain: str
    source: str
    evidence: list[str]
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: int = 1

    def __post_init__(self):
        """验证置信度范围。"""
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError(f"置信度必须在 0-1 之间: {self.confidence}")

    def to_markdown(self) -> str:
        """转换为 Markdown 格式。"""
        return f"""---
id: {self.id}
trigger: "{self.trigger}"
confidence: {self.confidence}
domain: "{self.domain}"
source: "{self.source}"
created: {self.created_at.isoformat()}
version: {self.version}
---

# {self.id}

## Trigger
{self.trigger}

## Action
{self.action}

## Evidence
{chr(10).join(f'- {e}' for e in self.evidence)}

## Confidence History
- Current: {self.confidence}
- Observations: {len(self.evidence)}
"""

    @classmethod
    def from_pattern(cls, pattern: DetectedPattern) -> "Instinct":
        """从检测模式创建本能。"""
        return cls(
            id=pattern.pattern_id,
            trigger=pattern.trigger,
            action=pattern.action,
            confidence=pattern.confidence,
            domain=pattern.domain,
            source="pattern-detection",
            evidence=pattern.evidence
        )


class InstinctStore:
    """本能存储管理器。"""

    def __init__(self, base_path: Path):
        self.base_path = base_path
        self.personal_path = base_path / "instincts" / "personal"
        self.inherited_path = base_path / "instincts" / "inherited"
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """确保目录结构存在。"""
        self.personal_path.mkdir(parents=True, exist_ok=True)
        self.inherited_path.mkdir(parents=True, exist_ok=True)

    def save(self, instinct: Instinct, is_inherited: bool = False) -> Path:
        """保存本能到文件系统。"""
        target_dir = self.inherited_path if is_inherited else self.personal_path
        file_path = target_dir / f"{instinct.id}.md"
        file_path.write_text(instinct.to_markdown(), encoding="utf-8")
        return file_path

    def load(self, instinct_id: str) -> Optional[Instinct]:
        """加载指定本能。"""
        for path in [self.personal_path, self.inherited_path]:
            file_path = path / f"{instinct_id}.md"
            if file_path.exists():
                return self._parse_markdown(file_path)
        return None

    def list_all(self) -> list[Instinct]:
        """列出所有本能。"""
        instincts = []
        for path in [self.personal_path, self.inherited_path]:
            for file_path in path.glob("*.md"):
                try:
                    instincts.append(self._parse_markdown(file_path))
                except Exception:
                    continue
        return instincts

    def _parse_markdown(self, file_path: Path) -> Instinct:
        """解析 Markdown 文件为本能对象。"""
        content = file_path.read_text(encoding="utf-8")
        frontmatter, body = self._split_frontmatter(content)

        return Instinct(
            id=frontmatter.get("id", file_path.stem),
            trigger=frontmatter.get("trigger", ""),
            action=self._extract_section(body, "Action"),
            confidence=float(frontmatter.get("confidence", 0.5)),
            domain=frontmatter.get("domain", "general"),
            source=frontmatter.get("source", "unknown"),
            evidence=self._extract_evidence(body),
            created_at=datetime.fromisoformat(
                frontmatter.get("created", datetime.now().isoformat())
            ),
            version=int(frontmatter.get("version", 1))
        )

    def _split_frontmatter(
        self,
        content: str
    ) -> tuple[dict[str, str], str]:
        """分离 YAML 前置数据与正文。"""
        if not content.startswith("---"):
            return {}, content

        parts = content.split("---", 2)
        if len(parts) < 3:
            return {}, content

        frontmatter = {}
        for line in parts[1].strip().split("\n"):
            if ":" in line:
                key, value = line.split(":", 1)
                frontmatter[key.strip()] = value.strip().strip('"')

        return frontmatter, parts[2]

    def _extract_section(self, body: str, section: str) -> str:
        """提取指定章节内容。"""
        pattern = rf"## {section}\s*\n(.*?)(?=\n## |\Z)"
        match = re.search(pattern, body, re.DOTALL)
        return match.group(1).strip() if match else ""

    def _extract_evidence(self, body: str) -> list[str]:
        """提取证据列表。"""
        evidence_section = self._extract_section(body, "Evidence")
        return [
            line.strip("- ").strip()
            for line in evidence_section.split("\n")
            if line.strip().startswith("-")
        ]
```

### JSON 知识库存储

```python
@dataclass
class KnowledgeEntry:
    """知识库条目。"""
    id: str
    type: str
    content: dict[str, Any]
    metadata: dict[str, Any]
    embedding: list[float] | None = None
    created_at: str = field(
        default_factory=lambda: datetime.now().isoformat()
    )


class KnowledgeStore:
    """JSON 格式知识存储。"""

    def __init__(self, store_path: Path):
        self.store_path = store_path
        self.index_path = store_path / "index.json"
        self.data_path = store_path / "data"
        self._ensure_structure()

    def _ensure_structure(self) -> None:
        """确保存储结构存在。"""
        self.data_path.mkdir(parents=True, exist_ok=True)
        if not self.index_path.exists():
            self._save_index({"entries": {}, "stats": {}})

    def add(self, entry: KnowledgeEntry) -> str:
        """添加知识条目。"""
        file_path = self.data_path / f"{entry.id}.json"
        file_path.write_text(
            json.dumps(entry.__dict__, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )

        self._update_index(entry)
        return str(file_path)

    def get(self, entry_id: str) -> Optional[KnowledgeEntry]:
        """获取知识条目。"""
        file_path = self.data_path / f"{entry_id}.json"
        if not file_path.exists():
            return None

        data = json.loads(file_path.read_text(encoding="utf-8"))
        return KnowledgeEntry(**data)

    def search_by_domain(self, domain: str) -> list[KnowledgeEntry]:
        """按领域搜索知识。"""
        index = self._load_index()
        results = []

        for entry_id, meta in index["entries"].items():
            if meta.get("domain") == domain:
                entry = self.get(entry_id)
                if entry:
                    results.append(entry)

        return results

    def _update_index(self, entry: KnowledgeEntry) -> None:
        """更新索引。"""
        index = self._load_index()

        index["entries"][entry.id] = {
            "type": entry.type,
            "domain": entry.metadata.get("domain", "general"),
            "created_at": entry.created_at
        }

        type_stats = index["stats"].get(entry.type, 0)
        index["stats"][entry.type] = type_stats + 1

        self._save_index(index)

    def _load_index(self) -> dict[str, Any]:
        """加载索引。"""
        return json.loads(self.index_path.read_text(encoding="utf-8"))

    def _save_index(self, index: dict[str, Any]) -> None:
        """保存索引。"""
        self.index_path.write_text(
            json.dumps(index, ensure_ascii=False, indent=2),
            encoding="utf-8"
        )


class ObservationStore:
    """观察记录存储（JSONL 格式）。"""

    def __init__(self, file_path: Path, max_size_mb: float = 10):
        self.file_path = file_path
        self.max_size_mb = max_size_mb
        self._ensure_file()

    def _ensure_file(self) -> None:
        """确保文件存在。"""
        if not self.file_path.exists():
            self.file_path.parent.mkdir(parents=True, exist_ok=True)
            self.file_path.touch()

    def append(self, observation: Observation) -> None:
        """追加观察记录。"""
        self._check_size()

        with open(self.file_path, "a", encoding="utf-8") as f:
            f.write(observation.to_jsonl() + "\n")

    def read_all(self) -> list[Observation]:
        """读取所有观察记录。"""
        observations = []
        with open(self.file_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line:
                    observations.append(Observation.from_jsonl(line))
        return observations

    def read_recent(self, count: int = 100) -> list[Observation]:
        """读取最近的观察记录。"""
        all_obs = self.read_all()
        return all_obs[-count:]

    def archive(self, archive_dir: Path) -> None:
        """归档旧观察记录。"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        archive_path = archive_dir / f"observations_{timestamp}.jsonl"

        archive_dir.mkdir(parents=True, exist_ok=True)
        self.file_path.rename(archive_path)
        self.file_path.touch()

    def _check_size(self) -> None:
        """检查文件大小。"""
        if self.file_path.exists():
            size_mb = self.file_path.stat().st_size / (1024 * 1024)
            if size_mb >= self.max_size_mb:
                archive_dir = self.file_path.parent / "archive"
                self.archive(archive_dir)
```

## 技能演化流程

### 本能演化器

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Literal


@dataclass
class EvolvedArtifact:
    """演化产物。"""
    id: str
    name: str
    type: Literal["skill", "command", "agent"]
    content: str
    source_instincts: list[str]
    confidence: float
    created_at: datetime = field(default_factory=datetime.now)


class EvolutionStrategy(ABC):
    """演化策略基类。"""

    @abstractmethod
    def can_evolve(
        self,
        instincts: list[Instinct]
    ) -> bool:
        """判断是否可以演化。"""
        pass

    @abstractmethod
    def evolve(
        self,
        instincts: list[Instinct]
    ) -> EvolvedArtifact:
        """执行演化。"""
        pass


class SkillEvolutionStrategy(EvolutionStrategy):
    """技能演化策略。"""

    def __init__(self, min_instincts: int = 3, min_confidence: float = 0.6):
        self.min_instincts = min_instincts
        self.min_confidence = min_confidence

    def can_evolve(self, instincts: list[Instinct]) -> bool:
        """判断是否满足演化条件。"""
        if len(instincts) < self.min_instincts:
            return False

        avg_confidence = sum(i.confidence for i in instincts) / len(instincts)
        return avg_confidence >= self.min_confidence

    def evolve(self, instincts: list[Instinct]) -> EvolvedArtifact:
        """将本能组演化为技能。"""
        domain = instincts[0].domain
        skill_name = self._generate_skill_name(instincts)

        content = self._generate_skill_content(skill_name, instincts, domain)

        return EvolvedArtifact(
            id=f"skill-{domain}-{hash(skill_name) % 10000:04d}",
            name=skill_name,
            type="skill",
            content=content,
            source_instincts=[i.id for i in instincts],
            confidence=sum(i.confidence for i in instincts) / len(instincts)
        )

    def _generate_skill_name(
        self,
        instincts: list[Instinct]
    ) -> str:
        """生成技能名称。"""
        keywords = set()
        for instinct in instincts:
            words = instinct.trigger.lower().split()[:3]
            keywords.update(words)
        return "-".join(sorted(keywords)[:3])

    def _generate_skill_content(
        self,
        name: str,
        instincts: list[Instinct],
        domain: str
    ) -> str:
        """生成技能 Markdown 内容。"""
        triggers = "\n".join(
            f"- {i.trigger}" for i in instincts
        )
        actions = "\n".join(
            f"### {i.id}\n{i.action}" for i in instincts
        )

        return f"""# {name}

## When to Activate
{triggers}

## Core Actions

{actions}

## Domain
{domain}

## Source Instincts
{chr(10).join(f'- {i.id} (confidence: {i.confidence:.2f})' for i in instincts)}
"""


class CommandEvolutionStrategy(EvolutionStrategy):
    """命令演化策略。"""

    def __init__(self, min_instincts: int = 2):
        self.min_instincts = min_instincts

    def can_evolve(self, instincts: list[Instinct]) -> bool:
        """判断是否为可重复执行的命令模式。"""
        if len(instincts) < self.min_instincts:
            return False

        workflow_indicators = ["sequence", "workflow", "step", "流程"]
        return any(
            any(ind in i.trigger.lower() for ind in workflow_indicators)
            for i in instincts
        )

    def evolve(self, instincts: list[Instinct]) -> EvolvedArtifact:
        """演化命令。"""
        command_name = self._extract_command_name(instincts)
        content = self._generate_command_content(command_name, instincts)

        return EvolvedArtifact(
            id=f"cmd-{hash(command_name) % 10000:04d}",
            name=command_name,
            type="command",
            content=content,
            source_instincts=[i.id for i in instincts],
            confidence=sum(i.confidence for i in instincts) / len(instincts)
        )

    def _extract_command_name(self, instincts: list[Instinct]) -> str:
        """提取命令名称。"""
        return instincts[0].trigger.split()[0].lower().replace("-", "")

    def _generate_command_content(
        self,
        name: str,
        instincts: list[Instinct]
    ) -> str:
        """生成命令内容。"""
        steps = "\n".join(
            f"{idx + 1}. {i.action}"
            for idx, i in enumerate(instincts)
        )

        return f"""# /{name}

## Description
Auto-generated command from learned patterns.

## Steps
{steps}

## Usage
`/{name}` - Execute the learned workflow
"""


class EvolutionEngine:
    """演化引擎。"""

    def __init__(self, evolved_path: Path):
        self.evolved_path = evolved_path
        self.strategies: list[EvolutionStrategy] = [
            SkillEvolutionStrategy(),
            CommandEvolutionStrategy(),
        ]
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """确保目录结构。"""
        for subdir in ["skills", "commands", "agents"]:
            (self.evolved_path / subdir).mkdir(parents=True, exist_ok=True)

    def evolve_cluster(
        self,
        instincts: list[Instinct]
    ) -> Optional[EvolvedArtifact]:
        """演化本能簇。"""
        for strategy in self.strategies:
            if strategy.can_evolve(instincts):
                artifact = strategy.evolve(instincts)
                self._save_artifact(artifact)
                return artifact
        return None

    def _save_artifact(self, artifact: EvolvedArtifact) -> Path:
        """保存演化产物。"""
        subdir = f"{artifact.type}s"
        file_path = self.evolved_path / subdir / f"{artifact.name}.md"
        file_path.write_text(artifact.content, encoding="utf-8")
        return file_path

    def cluster_instincts(
        self,
        instincts: list[Instinct]
    ) -> list[list[Instinct]]:
        """按领域聚类本能。"""
        clusters: dict[str, list[Instinct]] = {}

        for instinct in instincts:
            domain = instinct.domain
            if domain not in clusters:
                clusters[domain] = []
            clusters[domain].append(instinct)

        return list(clusters.values())
```

### 置信度管理

```python
@dataclass
class ConfidenceConfig:
    """置信度配置。"""
    min_confidence: float = 0.3
    auto_approve_threshold: float = 0.7
    decay_rate: float = 0.05
    boost_rate: float = 0.1
    max_confidence: float = 0.95


class ConfidenceManager:
    """置信度管理器。"""

    def __init__(self, config: ConfidenceConfig):
        self.config = config

    def boost(self, instinct: Instinct) -> float:
        """提升置信度。"""
        new_confidence = instinct.confidence + self.config.boost_rate
        return min(new_confidence, self.config.max_confidence)

    def decay(self, instinct: Instinct) -> float:
        """衰减置信度。"""
        new_confidence = instinct.confidence - self.config.decay_rate
        return max(new_confidence, self.config.min_confidence)

    def should_auto_apply(self, instinct: Instinct) -> bool:
        """判断是否应自动应用。"""
        return instinct.confidence >= self.config.auto_approve_threshold

    def is_valid(self, instinct: Instinct) -> bool:
        """判断本能是否有效。"""
        return instinct.confidence >= self.config.min_confidence

    def update_from_feedback(
        self,
        instinct: Instinct,
        positive: bool
    ) -> float:
        """根据反馈更新置信度。"""
        if positive:
            return self.boost(instinct)
        else:
            decayed = self.decay(instinct)
            return max(decayed, self.config.min_confidence)
```

## 学习流程图

```
┌─────────────────────────────────────────────────────────────────┐
│                        会话活动 (Session Activity)               │
│                    用户提示 + 工具调用 + 结果                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ Hook 确定性捕获 (100% 可靠)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     observations.jsonl                          │
│              (原子观察记录：触发器、动作、结果、上下文)            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 后台观察代理读取 (异步处理)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       模式检测层                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ 用户修正检测器   │  │ 错误解决检测器   │  │ 重复工作流检测器 │ │
│  │ UserCorrection  │  │ ErrorResolution │  │ RepeatedWorkflow│ │
│  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘ │
│           │                    │                    │           │
│           └────────────────────┼────────────────────┘           │
│                                │                                │
│                                ▼                                │
│                    ┌─────────────────────┐                     │
│                    │    模式聚合器       │                     │
│                    │ PatternAggregator   │                     │
│                    └─────────────────────┘                     │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ 创建/更新本能
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                    instincts/ (本能库)                          │
│  ┌─────────────────────┐    ┌─────────────────────┐            │
│  │     personal/       │    │     inherited/      │            │
│  │ • prefer-func.md    │    │ • team-style.md     │            │
│  │ • test-first.md     │    │ • git-workflow.md   │            │
│  │ • zod-validate.md   │    │                     │            │
│  │   置信度: 0.7       │    │   置信度: 0.8       │            │
│  │   置信度: 0.9       │    │                     │            │
│  │   置信度: 0.6       │    │                     │            │
│  └─────────────────────┘    └─────────────────────┘            │
└─────────────────────────────────────────────────────────────────┘
                                │
                                │ /evolve 聚类演化
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                       evolved/ (演化产物)                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │    commands/    │  │     skills/     │  │     agents/     │ │
│  │ • new-feature   │  │ • test-workflow │  │ • refactor-spec │ │
│  │ • code-review   │  │ • git-flow      │  │ • debug-helper  │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## 知识存储示例

### 完整存储示例

```python
from pathlib import Path
from datetime import datetime
import json


def create_sample_knowledge_base(base_path: Path) -> None:
    """创建示例知识库。"""
    base_path.mkdir(parents=True, exist_ok=True)

    knowledge_store = KnowledgeStore(base_path)

    entry1 = KnowledgeEntry(
        id="kb-001",
        type="pattern",
        content={
            "trigger": "when writing new functions",
            "action": "prefer functional style over classes",
            "examples": [
                "Use pure functions for transformations",
                "Avoid mutable state when possible"
            ]
        },
        metadata={
            "domain": "code-style",
            "confidence": 0.75,
            "source": "user-correction",
            "occurrences": 5
        }
    )
    knowledge_store.add(entry1)

    entry2 = KnowledgeEntry(
        id="kb-002",
        type="workflow",
        content={
            "name": "new-feature-workflow",
            "steps": [
                "Write tests first",
                "Implement minimal code",
                "Refactor for clarity",
                "Update documentation"
            ]
        },
        metadata={
            "domain": "workflow",
            "confidence": 0.85,
            "source": "repeated-pattern",
            "occurrences": 12
        }
    )
    knowledge_store.add(entry2)

    print(f"知识库创建完成: {base_path}")


def create_sample_instinct(instincts_path: Path) -> None:
    """创建示例本能文件。"""
    instincts_path.mkdir(parents=True, exist_ok=True)

    instinct = Instinct(
        id="prefer-functional-style",
        trigger="when writing new functions",
        action="Use functional patterns over classes when appropriate. Prefer pure functions, avoid mutable state, and use list comprehensions for transformations.",
        confidence=0.75,
        domain="code-style",
        source="session-observation",
        evidence=[
            "obs-2025-01-15-001",
            "obs-2025-01-16-003",
            "obs-2025-01-18-002"
        ]
    )

    store = InstinctStore(instincts_path.parent.parent)
    file_path = store.save(instinct)

    print(f"本能文件创建完成: {file_path}")


def create_sample_observations(obs_path: Path) -> None:
    """创建示例观察记录。"""
    obs_path.parent.mkdir(parents=True, exist_ok=True)

    store = ObservationStore(obs_path)

    observations = [
        Observation(
            id="obs-001",
            timestamp=datetime.now(),
            hook_type="PostToolUse",
            trigger="user requested code review",
            action={"tool": "Read", "file": "src/utils.py"},
            outcome="suggested functional refactoring",
            context={"previous_approach": "class-based"}
        ),
        Observation(
            id="obs-002",
            timestamp=datetime.now(),
            hook_type="PostToolUse",
            trigger="user corrected output format",
            action={"tool": "Write", "changes": "formatting"},
            outcome="user accepted changes after correction",
            context={"correction_type": "style"}
        ),
        Observation(
            id="obs-003",
            timestamp=datetime.now(),
            hook_type="PreToolUse",
            trigger="starting new feature",
            action={"tool": "Glob", "pattern": "test_*.py"},
            outcome="found existing test files",
            context={"workflow_step": 1}
        )
    ]

    for obs in observations:
        store.append(obs)

    print(f"观察记录创建完成: {obs_path}")


if __name__ == "__main__":
    base = Path.home() / ".claude" / "homunculus"

    create_sample_knowledge_base(base / "knowledge")
    create_sample_instinct(base / "instincts" / "personal")
    create_sample_observations(base / "observations.jsonl")
```

### JSON 存储格式示例

```json
{
  "id": "kb-001",
  "type": "pattern",
  "content": {
    "trigger": "when writing new functions",
    "action": "prefer functional style over classes",
    "examples": [
      "Use pure functions for transformations",
      "Avoid mutable state when possible"
    ]
  },
  "metadata": {
    "domain": "code-style",
    "confidence": 0.75,
    "source": "user-correction",
    "occurrences": 5
  },
  "created_at": "2025-02-21T10:30:00.000000"
}
```

```
{"id": "obs-001", "timestamp": "2025-02-21T10:30:00", "hook_type": "PostToolUse", "trigger": "user requested code review", "action": {"tool": "Read", "file": "src/utils.py"}, "outcome": "suggested functional refactoring", "context": {"previous_approach": "class-based"}, "metadata": {}}
{"id": "obs-002", "timestamp": "2025-02-21T10:35:00", "hook_type": "PostToolUse", "trigger": "user corrected output format", "action": {"tool": "Write", "changes": "formatting"}, "outcome": "user accepted changes after correction", "context": {"correction_type": "style"}, "metadata": {}}
```

## 配置参考

```json
{
  "version": "2.0",
  "observation": {
    "enabled": true,
    "store_path": "~/.claude/homunculus/observations.jsonl",
    "max_file_size_mb": 10,
    "archive_after_days": 7
  },
  "instincts": {
    "personal_path": "~/.claude/homunculus/instincts/personal/",
    "inherited_path": "~/.claude/homunculus/instincts/inherited/",
    "min_confidence": 0.3,
    "auto_approve_threshold": 0.7,
    "confidence_decay_rate": 0.05,
    "confidence_boost_rate": 0.1
  },
  "observer": {
    "enabled": true,
    "run_interval_minutes": 5,
    "patterns_to_detect": [
      "user_corrections",
      "error_resolutions",
      "repeated_workflows",
      "tool_preferences"
    ]
  },
  "evolution": {
    "cluster_threshold": 3,
    "min_confidence_for_evolution": 0.6,
    "evolved_path": "~/.claude/homunculus/evolved/"
  }
}
```

## 文件结构

```
~/.claude/homunculus/
├── config.json              # 配置文件
├── identity.json            # 用户画像
├── observations.jsonl       # 当前观察记录
├── observations.archive/    # 归档观察记录
│   ├── observations_20250215_143000.jsonl
│   └── observations_20250218_091500.jsonl
├── knowledge/               # JSON 知识库
│   ├── index.json           # 索引文件
│   └── data/                # 数据文件
│       ├── kb-001.json
│       └── kb-002.json
├── instincts/               # 本能库
│   ├── personal/            # 个人学习本能
│   │   ├── prefer-functional.md
│   │   ├── test-first.md
│   │   └── zod-validate.md
│   └── inherited/           # 导入的本能
│       └── team-style.md
└── evolved/                 # 演化产物
    ├── agents/              # 专用代理
    ├── skills/              # 技能模块
    └── commands/            # 命令脚本
```

## 置信度评分参考

| 分值 | 含义 | 行为 |
|------|------|------|
| 0.3 | 初步 | 建议但不强制执行 |
| 0.5 | 中等 | 相关时应用 |
| 0.7 | 较强 | 自动批准应用 |
| 0.9 | 确定 | 核心行为模式 |

**置信度提升条件：**
- 模式被重复观察
- 用户未修正建议行为
- 其他来源的相似本能一致

**置信度降低条件：**
- 用户明确修正行为
- 长期未观察到模式
- 出现矛盾证据

## Quick Reference

| 组件 | 职责 |
|------|------|
| Hook | 确定性捕获会话事件 |
| Observation | 原子化记录行为数据 |
| PatternDetector | 从观察中提取模式 |
| Instinct | 带置信度的学习行为 |
| KnowledgeStore | JSON 格式知识存储 |
| EvolutionEngine | 本能演化为技能/命令 |

---

*基于 Hook 的持续学习：确定性观察，渐进式演化，从会话中学习用户偏好。*
