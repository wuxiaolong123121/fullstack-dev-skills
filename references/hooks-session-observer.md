# AI Agent 会话观察 Hook 参考

会话观察 Hook 用于监控、记录和分析 AI Agent 与用户之间的交互行为，支持事件捕获、日志记录和行为分析。

## When to Activate

- 需要监控 AI Agent 会话行为
- 实现会话审计和合规记录
- 调试 Agent 交互问题
- 分析 Agent 性能和行为模式

## Core Principles

### 1. 非侵入式观察

Hook 应该在不影响原有业务逻辑的情况下进行观察。

```python
from functools import wraps
from typing import Callable, Any
from datetime import datetime

def observe_session(func: Callable) -> Callable:
    """
    非侵入式会话观察装饰器。
    
    不修改原函数行为，仅添加观察逻辑。
    """
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        observer = SessionObserver.get_instance()
        observer.record_event(
            event_type="function_call",
            function_name=func.__name__,
            timestamp=datetime.now()
        )
        return func(*args, **kwargs)
    return wrapper
```

### 2. 事件驱动架构

使用事件驱动模式解耦观察逻辑与业务逻辑。

```python
from dataclasses import dataclass, field
from datetime import datetime
from typing import Callable
from enum import Enum

class EventType(Enum):
    """会话事件类型枚举。"""
    MESSAGE_SEND = "message_send"
    MESSAGE_RECEIVE = "message_receive"
    TOOL_CALL = "tool_call"
    TOOL_RESULT = "tool_result"
    ERROR = "error"
    SESSION_START = "session_start"
    SESSION_END = "session_end"

@dataclass
class SessionEvent:
    """
    会话事件数据类。
    
    Attributes:
        event_type: 事件类型
        timestamp: 事件时间戳
        session_id: 会话标识符
        data: 事件负载数据
        metadata: 事件元数据
    """
    event_type: EventType
    timestamp: datetime = field(default_factory=datetime.now)
    session_id: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)
```

### 3. 可配置的观察级别

支持不同级别的观察粒度，平衡性能与详细程度。

```python
from enum import IntEnum

class ObservationLevel(IntEnum):
    """
    观察级别枚举。
    
    级别越高，记录越详细，性能开销越大。
    """
    NONE = 0
    BASIC = 1
    STANDARD = 2
    DETAILED = 3
    VERBOSE = 4
```

## 事件捕获机制

### 消息发送/接收捕获

```python
from abc import ABC, abstractmethod
from typing import Protocol

class MessageInterceptor(Protocol):
    """消息拦截器协议。"""
    
    def intercept_send(self, message: dict[str, Any]) -> dict[str, Any]:
        """拦截发送消息。"""
        ...
    
    def intercept_receive(self, message: dict[str, Any]) -> dict[str, Any]:
        """拦截接收消息。"""
        ...

class MessageObserver:
    """
    消息观察器。
    
    捕获所有消息发送和接收事件。
    """
    
    def __init__(
        self,
        level: ObservationLevel = ObservationLevel.STANDARD,
        interceptors: list[MessageInterceptor] | None = None
    ):
        self._level = level
        self._interceptors = interceptors or []
        self._event_handlers: list[Callable[[SessionEvent], None]] = []
    
    def register_handler(
        self,
        handler: Callable[[SessionEvent], None]
    ) -> None:
        """
        注册事件处理器。
        
        Args:
            handler: 事件处理函数
        """
        self._event_handlers.append(handler)
    
    def on_message_send(
        self,
        session_id: str,
        message: dict[str, Any]
    ) -> dict[str, Any]:
        """
        消息发送事件处理。
        
        Args:
            session_id: 会话标识符
            message: 发送的消息内容
            
        Returns:
            处理后的消息
        """
        for interceptor in self._interceptors:
            message = interceptor.intercept_send(message)
        
        if self._level >= ObservationLevel.BASIC:
            event = SessionEvent(
                event_type=EventType.MESSAGE_SEND,
                session_id=session_id,
                data={
                    "role": message.get("role"),
                    "content_length": len(str(message.get("content", ""))),
                }
            )
            
            if self._level >= ObservationLevel.DETAILED:
                event.data["content"] = message.get("content")
                event.data["full_message"] = message
            
            self._dispatch_event(event)
        
        return message
    
    def on_message_receive(
        self,
        session_id: str,
        message: dict[str, Any]
    ) -> dict[str, Any]:
        """
        消息接收事件处理。
        
        Args:
            session_id: 会话标识符
            message: 接收的消息内容
            
        Returns:
            处理后的消息
        """
        for interceptor in self._interceptors:
            message = interceptor.intercept_receive(message)
        
        if self._level >= ObservationLevel.BASIC:
            event = SessionEvent(
                event_type=EventType.MESSAGE_RECEIVE,
                session_id=session_id,
                data={
                    "role": message.get("role"),
                    "has_tool_calls": "tool_calls" in message,
                }
            )
            
            if self._level >= ObservationLevel.STANDARD:
                event.data["content_preview"] = self._truncate(
                    str(message.get("content", "")),
                    max_length=200
                )
            
            self._dispatch_event(event)
        
        return message
    
    def _dispatch_event(self, event: SessionEvent) -> None:
        """分发事件到所有处理器。"""
        for handler in self._event_handlers:
            try:
                handler(event)
            except Exception as e:
                pass
    
    @staticmethod
    def _truncate(text: str, max_length: int) -> str:
        """截断文本到指定长度。"""
        if len(text) <= max_length:
            return text
        return text[:max_length] + "..."
```

### 工具调用捕获

```python
@dataclass
class ToolCallRecord:
    """
    工具调用记录。
    
    Attributes:
        tool_name: 工具名称
        arguments: 调用参数
        result: 调用结果
        duration_ms: 执行耗时（毫秒）
        success: 是否成功
        error_message: 错误信息（如有）
    """
    tool_name: str
    arguments: dict[str, Any]
    result: Any = None
    duration_ms: float = 0.0
    success: bool = True
    error_message: str | None = None

class ToolCallObserver:
    """
    工具调用观察器。
    
    监控所有工具调用行为，记录参数、结果和执行时间。
    """
    
    def __init__(
        self,
        level: ObservationLevel = ObservationLevel.STANDARD,
        sensitive_params: set[str] | None = None
    ):
        self._level = level
        self._sensitive_params = sensitive_params or {
            "password", "token", "api_key", "secret", "credential"
        }
        self._call_records: list[ToolCallRecord] = []
    
    def observe_call(
        self,
        tool_name: str,
        arguments: dict[str, Any],
        call_func: Callable[[], Any]
    ) -> Any:
        """
        观察工具调用。
        
        Args:
            tool_name: 工具名称
            arguments: 调用参数
            call_func: 实际调用函数
            
        Returns:
            工具调用结果
        """
        import time
        
        record = ToolCallRecord(
            tool_name=tool_name,
            arguments=self._sanitize_arguments(arguments)
        )
        
        start_time = time.perf_counter()
        
        try:
            result = call_func()
            record.result = self._sanitize_result(result)
            record.success = True
            return result
        except Exception as e:
            record.success = False
            record.error_message = str(e)
            raise
        finally:
            record.duration_ms = (time.perf_counter() - start_time) * 1000
            
            if self._level >= ObservationLevel.BASIC:
                self._call_records.append(record)
    
    def _sanitize_arguments(
        self,
        arguments: dict[str, Any]
    ) -> dict[str, Any]:
        """清理敏感参数。"""
        if self._level < ObservationLevel.DETAILED:
            return {
                k: "***REDACTED***" if k.lower() in self._sensitive_params else v
                for k, v in arguments.items()
            }
        return arguments.copy()
    
    def _sanitize_result(self, result: Any) -> Any:
        """清理结果数据。"""
        if self._level < ObservationLevel.VERBOSE:
            if isinstance(result, str) and len(result) > 500:
                return result[:500] + "...[truncated]"
        return result
    
    def get_statistics(self) -> dict[str, Any]:
        """
        获取工具调用统计信息。
        
        Returns:
            统计数据字典
        """
        if not self._call_records:
            return {"total_calls": 0}
        
        success_count = sum(1 for r in self._call_records if r.success)
        total_duration = sum(r.duration_ms for r in self._call_records)
        
        tool_stats: dict[str, dict[str, Any]] = {}
        for record in self._call_records:
            if record.tool_name not in tool_stats:
                tool_stats[record.tool_name] = {
                    "count": 0,
                    "success_count": 0,
                    "total_duration_ms": 0.0,
                }
            tool_stats[record.tool_name]["count"] += 1
            if record.success:
                tool_stats[record.tool_name]["success_count"] += 1
            tool_stats[record.tool_name]["total_duration_ms"] += record.duration_ms
        
        return {
            "total_calls": len(self._call_records),
            "success_count": success_count,
            "failure_count": len(self._call_records) - success_count,
            "total_duration_ms": total_duration,
            "average_duration_ms": total_duration / len(self._call_records),
            "by_tool": tool_stats,
        }
```

## 日志记录配置

### 结构化日志配置

```python
import logging
import json
from datetime import datetime
from typing import TextIO

class StructuredFormatter(logging.Formatter):
    """
    结构化日志格式化器。
    
    将日志输出为 JSON 格式，便于解析和分析。
    """
    
    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        
        if hasattr(record, "session_id"):
            log_entry["session_id"] = record.session_id
        
        if hasattr(record, "event_type"):
            log_entry["event_type"] = record.event_type
        
        if hasattr(record, "duration_ms"):
            log_entry["duration_ms"] = record.duration_ms
        
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        return json.dumps(log_entry, ensure_ascii=False)

class SessionLogger:
    """
    会话日志记录器。
    
    提供会话级别的日志记录功能。
    """
    
    def __init__(
        self,
        name: str = "session_observer",
        level: int = logging.INFO,
        output: TextIO | None = None
    ):
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        if not self.logger.handlers:
            handler = logging.StreamHandler(output)
            handler.setFormatter(StructuredFormatter())
            self.logger.addHandler(handler)
    
    def log_event(
        self,
        event: SessionEvent,
        level: int = logging.INFO
    ) -> None:
        """
        记录会话事件。
        
        Args:
            event: 会话事件
            level: 日志级别
        """
        record = self.logger.makeRecord(
            name=self.logger.name,
            level=level,
            fn="",
            lno=0,
            msg=f"Session event: {event.event_type.value}",
            args=(),
            exc_info=None
        )
        record.session_id = event.session_id
        record.event_type = event.event_type.value
        
        if "duration_ms" in event.data:
            record.duration_ms = event.data["duration_ms"]
        
        self.logger.handle(record)
    
    def log_tool_call(
        self,
        record: ToolCallRecord,
        session_id: str
    ) -> None:
        """
        记录工具调用。
        
        Args:
            record: 工具调用记录
            session_id: 会话标识符
        """
        level = logging.INFO if record.success else logging.WARNING
        
        log_record = self.logger.makeRecord(
            name=self.logger.name,
            level=level,
            fn="",
            lno=0,
            msg=f"Tool call: {record.tool_name}",
            args=(),
            exc_info=None
        )
        log_record.session_id = session_id
        log_record.event_type = "tool_call"
        log_record.duration_ms = record.duration_ms
        
        self.logger.handle(log_record)
```

### 日志轮转配置

```python
from logging.handlers import RotatingFileHandler, TimedRotatingFileHandler
from pathlib import Path

class RotatingSessionLogger(SessionLogger):
    """
    支持日志轮转的会话日志记录器。
    
    按文件大小或时间自动轮转日志文件。
    """
    
    def __init__(
        self,
        name: str = "session_observer",
        level: int = logging.INFO,
        log_dir: str = "logs",
        max_bytes: int = 10 * 1024 * 1024,
        backup_count: int = 5,
        rotation_type: str = "size"
    ):
        self.log_dir = Path(log_dir)
        self.log_dir.mkdir(parents=True, exist_ok=True)
        
        self.logger = logging.getLogger(name)
        self.logger.setLevel(level)
        
        if not self.logger.handlers:
            log_file = self.log_dir / "session_observer.log"
            
            if rotation_type == "size":
                handler = RotatingFileHandler(
                    log_file,
                    maxBytes=max_bytes,
                    backupCount=backup_count,
                    encoding="utf-8"
                )
            else:
                handler = TimedRotatingFileHandler(
                    log_file,
                    when="midnight",
                    backupCount=backup_count,
                    encoding="utf-8"
                )
            
            handler.setFormatter(StructuredFormatter())
            self.logger.addHandler(handler)
```

## 行为监控模式

### 实时监控器

```python
from collections import defaultdict
from dataclasses import dataclass
from typing import Callable

@dataclass
class MonitoringThreshold:
    """
    监控阈值配置。
    
    Attributes:
        max_tool_calls_per_minute: 每分钟最大工具调用次数
        max_errors_per_session: 每会话最大错误数
        max_session_duration_seconds: 最大会话时长（秒）
        max_message_length: 最大消息长度
    """
    max_tool_calls_per_minute: int = 100
    max_errors_per_session: int = 10
    max_session_duration_seconds: int = 3600
    max_message_length: int = 100000

class BehaviorMonitor:
    """
    行为监控器。
    
    实时监控会话行为，检测异常模式。
    """
    
    def __init__(
        self,
        threshold: MonitoringThreshold | None = None,
        alert_callback: Callable[[str, str, dict[str, Any]], None] | None = None
    ):
        self._threshold = threshold or MonitoringThreshold()
        self._alert_callback = alert_callback
        
        self._tool_calls_by_minute: dict[str, list[float]] = defaultdict(list)
        self._errors_by_session: dict[str, int] = defaultdict(int)
        self._session_start_times: dict[str, float] = {}
    
    def on_session_start(self, session_id: str) -> None:
        """
        会话开始事件处理。
        
        Args:
            session_id: 会话标识符
        """
        import time
        self._session_start_times[session_id] = time.time()
    
    def on_session_end(self, session_id: str) -> None:
        """
        会话结束事件处理。
        
        Args:
            session_id: 会话标识符
        """
        self._session_start_times.pop(session_id, None)
        self._errors_by_session.pop(session_id, None)
        self._tool_calls_by_minute.pop(session_id, None)
    
    def check_tool_call(self, session_id: str) -> bool:
        """
        检查工具调用是否超过阈值。
        
        Args:
            session_id: 会话标识符
            
        Returns:
            是否允许继续调用
        """
        import time
        
        current_time = time.time()
        minute_ago = current_time - 60
        
        calls = self._tool_calls_by_minute[session_id]
        calls[:] = [t for t in calls if t > minute_ago]
        calls.append(current_time)
        
        if len(calls) > self._threshold.max_tool_calls_per_minute:
            self._raise_alert(
                session_id,
                "tool_call_rate_exceeded",
                {
                    "current_rate": len(calls),
                    "threshold": self._threshold.max_tool_calls_per_minute
                }
            )
            return False
        
        return True
    
    def check_error(self, session_id: str) -> bool:
        """
        检查错误数量是否超过阈值。
        
        Args:
            session_id: 会话标识符
            
        Returns:
            是否允许继续
        """
        self._errors_by_session[session_id] += 1
        
        if self._errors_by_session[session_id] > self._threshold.max_errors_per_session:
            self._raise_alert(
                session_id,
                "error_count_exceeded",
                {
                    "current_count": self._errors_by_session[session_id],
                    "threshold": self._threshold.max_errors_per_session
                }
            )
            return False
        
        return True
    
    def check_session_duration(self, session_id: str) -> bool:
        """
        检查会话时长是否超过阈值。
        
        Args:
            session_id: 会话标识符
            
        Returns:
            是否允许继续
        """
        import time
        
        start_time = self._session_start_times.get(session_id)
        if start_time is None:
            return True
        
        duration = time.time() - start_time
        
        if duration > self._threshold.max_session_duration_seconds:
            self._raise_alert(
                session_id,
                "session_duration_exceeded",
                {
                    "current_duration": duration,
                    "threshold": self._threshold.max_session_duration_seconds
                }
            )
            return False
        
        return True
    
    def check_message_length(self, message: str) -> bool:
        """
        检查消息长度是否超过阈值。
        
        Args:
            message: 消息内容
            
        Returns:
            是否允许
        """
        if len(message) > self._threshold.max_message_length:
            self._raise_alert(
                "unknown",
                "message_length_exceeded",
                {
                    "current_length": len(message),
                    "threshold": self._threshold.max_message_length
                }
            )
            return False
        
        return True
    
    def _raise_alert(
        self,
        session_id: str,
        alert_type: str,
        details: dict[str, Any]
    ) -> None:
        """触发告警。"""
        if self._alert_callback:
            self._alert_callback(session_id, alert_type, details)
```

### 行为分析器

```python
from dataclasses import dataclass

@dataclass
class SessionAnalytics:
    """
    会话分析结果。
    
    Attributes:
        session_id: 会话标识符
        total_messages: 消息总数
        total_tool_calls: 工具调用总数
        average_response_time_ms: 平均响应时间（毫秒）
        error_rate: 错误率
        most_used_tools: 最常用工具列表
        session_duration_seconds: 会话时长（秒）
    """
    session_id: str
    total_messages: int = 0
    total_tool_calls: int = 0
    average_response_time_ms: float = 0.0
    error_rate: float = 0.0
    most_used_tools: list[tuple[str, int]] = []
    session_duration_seconds: float = 0.0

class BehaviorAnalyzer:
    """
    行为分析器。
    
    分析会话行为模式，生成统计报告。
    """
    
    def __init__(self):
        self._sessions: dict[str, list[SessionEvent]] = defaultdict(list)
        self._tool_calls: dict[str, list[ToolCallRecord]] = defaultdict(list)
    
    def record_event(self, event: SessionEvent) -> None:
        """
        记录会话事件。
        
        Args:
            event: 会话事件
        """
        self._sessions[event.session_id].append(event)
    
    def record_tool_call(
        self,
        session_id: str,
        record: ToolCallRecord
    ) -> None:
        """
        记录工具调用。
        
        Args:
            session_id: 会话标识符
            record: 工具调用记录
        """
        self._tool_calls[session_id].append(record)
    
    def analyze_session(self, session_id: str) -> SessionAnalytics:
        """
        分析单个会话。
        
        Args:
            session_id: 会话标识符
            
        Returns:
            会话分析结果
        """
        events = self._sessions.get(session_id, [])
        tool_calls = self._tool_calls.get(session_id, [])
        
        message_events = [
            e for e in events
            if e.event_type in (EventType.MESSAGE_SEND, EventType.MESSAGE_RECEIVE)
        ]
        
        tool_counts: dict[str, int] = defaultdict(int)
        for call in tool_calls:
            tool_counts[call.tool_name] += 1
        
        most_used = sorted(
            tool_counts.items(),
            key=lambda x: x[1],
            reverse=True
        )[:5]
        
        error_count = sum(1 for call in tool_calls if not call.success)
        error_rate = error_count / len(tool_calls) if tool_calls else 0.0
        
        avg_response_time = 0.0
        if tool_calls:
            avg_response_time = sum(c.duration_ms for c in tool_calls) / len(tool_calls)
        
        duration = 0.0
        if len(events) >= 2:
            first_time = min(e.timestamp for e in events)
            last_time = max(e.timestamp for e in events)
            duration = (last_time - first_time).total_seconds()
        
        return SessionAnalytics(
            session_id=session_id,
            total_messages=len(message_events),
            total_tool_calls=len(tool_calls),
            average_response_time_ms=avg_response_time,
            error_rate=error_rate,
            most_used_tools=most_used,
            session_duration_seconds=duration
        )
    
    def get_global_statistics(self) -> dict[str, Any]:
        """
        获取全局统计信息。
        
        Returns:
            统计数据字典
        """
        all_tool_calls = [
            call
            for calls in self._tool_calls.values()
            for call in calls
        ]
        
        tool_usage: dict[str, int] = defaultdict(int)
        for call in all_tool_calls:
            tool_usage[call.tool_name] += 1
        
        return {
            "total_sessions": len(self._sessions),
            "total_tool_calls": len(all_tool_calls),
            "tool_usage_distribution": dict(tool_usage),
            "average_calls_per_session": (
                len(all_tool_calls) / len(self._tool_calls)
                if self._tool_calls else 0
            ),
        }
```

## 完整 Hook 配置示例

### 主观察器配置

```python
from dataclasses import dataclass
from typing import Callable

@dataclass
class ObserverConfig:
    """
    观察器配置。
    
    Attributes:
        observation_level: 观察级别
        enable_message_logging: 启用消息日志
        enable_tool_logging: 启用工具调用日志
        enable_behavior_monitoring: 启用行为监控
        log_directory: 日志目录
        sensitive_params: 敏感参数列表
        thresholds: 监控阈值配置
    """
    observation_level: ObservationLevel = ObservationLevel.STANDARD
    enable_message_logging: bool = True
    enable_tool_logging: bool = True
    enable_behavior_monitoring: bool = True
    log_directory: str = "logs/observer"
    sensitive_params: set[str] | None = None
    thresholds: MonitoringThreshold | None = None

class SessionObserver:
    """
    会话观察器主类。
    
    整合消息观察、工具调用观察、日志记录和行为监控。
    """
    
    _instance: "SessionObserver | None" = None
    
    def __init__(self, config: ObserverConfig | None = None):
        self._config = config or ObserverConfig()
        
        self._message_observer = MessageObserver(
            level=self._config.observation_level
        )
        
        self._tool_observer = ToolCallObserver(
            level=self._config.observation_level,
            sensitive_params=self._config.sensitive_params
        )
        
        self._logger = RotatingSessionLogger(
            log_dir=self._config.log_directory
        )
        
        self._monitor = BehaviorMonitor(
            threshold=self._config.thresholds,
            alert_callback=self._handle_alert
        )
        
        self._analyzer = BehaviorAnalyzer()
        
        self._message_observer.register_handler(self._on_event)
    
    @classmethod
    def get_instance(cls) -> "SessionObserver":
        """获取单例实例。"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance
    
    @classmethod
    def initialize(cls, config: ObserverConfig) -> "SessionObserver":
        """
        初始化观察器。
        
        Args:
            config: 观察器配置
            
        Returns:
            观察器实例
        """
        cls._instance = cls(config)
        return cls._instance
    
    def start_session(self, session_id: str) -> None:
        """
        开始会话观察。
        
        Args:
            session_id: 会话标识符
        """
        self._monitor.on_session_start(session_id)
        
        event = SessionEvent(
            event_type=EventType.SESSION_START,
            session_id=session_id
        )
        self._on_event(event)
    
    def end_session(self, session_id: str) -> SessionAnalytics:
        """
        结束会话观察。
        
        Args:
            session_id: 会话标识符
            
        Returns:
            会话分析结果
        """
        analytics = self._analyzer.analyze_session(session_id)
        
        event = SessionEvent(
            event_type=EventType.SESSION_END,
            session_id=session_id,
            data={"analytics": analytics}
        )
        self._on_event(event)
        
        self._monitor.on_session_end(session_id)
        
        return analytics
    
    def observe_message_send(
        self,
        session_id: str,
        message: dict[str, Any]
    ) -> dict[str, Any]:
        """
        观察消息发送。
        
        Args:
            session_id: 会话标识符
            message: 消息内容
            
        Returns:
            处理后的消息
        """
        if self._config.enable_message_logging:
            if self._config.enable_behavior_monitoring:
                content = str(message.get("content", ""))
                self._monitor.check_message_length(content)
            
            return self._message_observer.on_message_send(session_id, message)
        
        return message
    
    def observe_message_receive(
        self,
        session_id: str,
        message: dict[str, Any]
    ) -> dict[str, Any]:
        """
        观察消息接收。
        
        Args:
            session_id: 会话标识符
            message: 消息内容
            
        Returns:
            处理后的消息
        """
        if self._config.enable_message_logging:
            return self._message_observer.on_message_receive(session_id, message)
        
        return message
    
    def observe_tool_call(
        self,
        session_id: str,
        tool_name: str,
        arguments: dict[str, Any],
        call_func: Callable[[], Any]
    ) -> Any:
        """
        观察工具调用。
        
        Args:
            session_id: 会话标识符
            tool_name: 工具名称
            arguments: 调用参数
            call_func: 实际调用函数
            
        Returns:
            工具调用结果
        """
        if self._config.enable_behavior_monitoring:
            if not self._monitor.check_tool_call(session_id):
                raise RuntimeError("Tool call rate limit exceeded")
        
        if self._config.enable_tool_logging:
            result = self._tool_observer.observe_call(
                tool_name,
                arguments,
                call_func
            )
            
            records = self._tool_observer._call_records
            if records:
                self._analyzer.record_tool_call(session_id, records[-1])
                self._logger.log_tool_call(records[-1], session_id)
            
            if not records[-1].success:
                self._monitor.check_error(session_id)
            
            return result
        
        return call_func()
    
    def _on_event(self, event: SessionEvent) -> None:
        """事件处理回调。"""
        self._analyzer.record_event(event)
        self._logger.log_event(event)
    
    def _handle_alert(
        self,
        session_id: str,
        alert_type: str,
        details: dict[str, Any]
    ) -> None:
        """告警处理回调。"""
        self._logger.logger.warning(
            f"Alert: {alert_type}",
            extra={
                "session_id": session_id,
                "alert_type": alert_type,
                "details": details
            }
        )
    
    def get_tool_statistics(self) -> dict[str, Any]:
        """获取工具调用统计。"""
        return self._tool_observer.get_statistics()
    
    def get_global_analytics(self) -> dict[str, Any]:
        """获取全局分析数据。"""
        return self._analyzer.get_global_statistics()
```

### 装饰器方式使用

```python
def with_observation(session_id: str):
    """
    会话观察装饰器工厂。
    
    Args:
        session_id: 会话标识符
        
    Returns:
        装饰器函数
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            observer = SessionObserver.get_instance()
            
            observer.start_session(session_id)
            
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                analytics = observer.end_session(session_id)
                print(f"Session analytics: {analytics}")
        
        return wrapper
    return decorator

def observe_tool_call(tool_name: str):
    """
    工具调用观察装饰器工厂。
    
    Args:
        tool_name: 工具名称
        
    Returns:
        装饰器函数
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, session_id: str = "default", **kwargs):
            observer = SessionObserver.get_instance()
            
            return observer.observe_tool_call(
                session_id=session_id,
                tool_name=tool_name,
                arguments=kwargs,
                call_func=lambda: func(*args, **kwargs)
            )
        
        return wrapper
    return decorator
```

## 实际应用案例

### 案例 1: AI Agent 会话监控

```python
from typing import AsyncIterator
import asyncio

class AIAgentWithObservation:
    """
    带观察功能的 AI Agent。
    
    示例：集成会话观察到 AI Agent 中。
    """
    
    def __init__(
        self,
        agent_id: str,
        observer_config: ObserverConfig | None = None
    ):
        self.agent_id = agent_id
        
        if observer_config:
            SessionObserver.initialize(observer_config)
        
        self.observer = SessionObserver.get_instance()
    
    async def process_message(
        self,
        session_id: str,
        user_message: str
    ) -> AsyncIterator[str]:
        """
        处理用户消息。
        
        Args:
            session_id: 会话标识符
            user_message: 用户消息
            
        Yields:
            AI 响应片段
        """
        self.observer.start_session(session_id)
        
        try:
            self.observer.observe_message_send(
                session_id,
                {"role": "user", "content": user_message}
            )
            
            response_chunks = []
            async for chunk in self._generate_response(user_message):
                response_chunks.append(chunk)
                yield chunk
            
            full_response = "".join(response_chunks)
            self.observer.observe_message_receive(
                session_id,
                {"role": "assistant", "content": full_response}
            )
            
        finally:
            analytics = self.observer.end_session(session_id)
            print(f"Session completed: {analytics.total_tool_calls} tool calls")
    
    async def _generate_response(
        self,
        message: str
    ) -> AsyncIterator[str]:
        """模拟 AI 响应生成。"""
        response = f"Processing: {message}"
        for char in response:
            yield char
            await asyncio.sleep(0.01)

async def main():
    config = ObserverConfig(
        observation_level=ObservationLevel.DETAILED,
        enable_message_logging=True,
        enable_tool_logging=True,
        enable_behavior_monitoring=True,
        log_directory="logs/ai_agent"
    )
    
    agent = AIAgentWithObservation("agent_001", config)
    
    async for chunk in agent.process_message("session_123", "Hello, AI!"):
        print(chunk, end="", flush=True)
    
    print("\n")
    stats = agent.observer.get_global_analytics()
    print(f"Global stats: {stats}")

if __name__ == "__main__":
    asyncio.run(main())
```

### 案例 2: 工具调用审计

```python
class ToolAuditLogger:
    """
    工具调用审计日志器。
    
    记录所有工具调用用于审计和合规。
    """
    
    def __init__(self, observer: SessionObserver):
        self._observer = observer
        self._audit_records: list[dict[str, Any]] = []
    
    def audit_tool_call(
        self,
        session_id: str,
        tool_name: str,
        arguments: dict[str, Any],
        result: Any,
        user_id: str | None = None
    ) -> None:
        """
        审计工具调用。
        
        Args:
            session_id: 会话标识符
            tool_name: 工具名称
            arguments: 调用参数
            result: 调用结果
            user_id: 用户标识符
        """
        from datetime import datetime
        
        audit_record = {
            "timestamp": datetime.now().isoformat(),
            "session_id": session_id,
            "tool_name": tool_name,
            "arguments": arguments,
            "result_type": type(result).__name__,
            "user_id": user_id,
        }
        
        self._audit_records.append(audit_record)
    
    def export_audit_log(self, filepath: str) -> None:
        """
        导出审计日志。
        
        Args:
            filepath: 导出文件路径
        """
        import json
        
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(self._audit_records, f, ensure_ascii=False, indent=2)
    
    def get_audit_summary(self) -> dict[str, Any]:
        """
        获取审计摘要。
        
        Returns:
            审计摘要数据
        """
        tool_counts: dict[str, int] = defaultdict(int)
        for record in self._audit_records:
            tool_counts[record["tool_name"]] += 1
        
        return {
            "total_records": len(self._audit_records),
            "unique_tools": len(tool_counts),
            "tool_distribution": dict(tool_counts),
            "date_range": {
                "start": self._audit_records[0]["timestamp"] if self._audit_records else None,
                "end": self._audit_records[-1]["timestamp"] if self._audit_records else None,
            }
        }
```

### 案例 3: 异常行为检测

```python
class AnomalyDetector:
    """
    异常行为检测器。
    
    检测会话中的异常行为模式。
    """
    
    def __init__(
        self,
        observer: SessionObserver,
        anomaly_thresholds: dict[str, float] | None = None
    ):
        self._observer = observer
        self._thresholds = anomaly_thresholds or {
            "error_rate": 0.3,
            "tool_call_rate": 50.0,
            "response_time_ms": 5000.0,
        }
        self._anomalies: list[dict[str, Any]] = []
    
    def detect_anomalies(
        self,
        analytics: SessionAnalytics
    ) -> list[dict[str, Any]]:
        """
        检测异常行为。
        
        Args:
            analytics: 会话分析数据
            
        Returns:
            检测到的异常列表
        """
        detected = []
        
        if analytics.error_rate > self._thresholds["error_rate"]:
            detected.append({
                "type": "high_error_rate",
                "session_id": analytics.session_id,
                "value": analytics.error_rate,
                "threshold": self._thresholds["error_rate"],
                "message": f"Error rate {analytics.error_rate:.2%} exceeds threshold"
            })
        
        if analytics.average_response_time_ms > self._thresholds["response_time_ms"]:
            detected.append({
                "type": "slow_response",
                "session_id": analytics.session_id,
                "value": analytics.average_response_time_ms,
                "threshold": self._thresholds["response_time_ms"],
                "message": f"Average response time {analytics.average_response_time_ms:.0f}ms exceeds threshold"
            })
        
        self._anomalies.extend(detected)
        return detected
    
    def get_anomaly_report(self) -> dict[str, Any]:
        """
        获取异常报告。
        
        Returns:
            异常报告数据
        """
        by_type: dict[str, list[dict[str, Any]]] = defaultdict(list)
        for anomaly in self._anomalies:
            by_type[anomaly["type"]].append(anomaly)
        
        return {
            "total_anomalies": len(self._anomalies),
            "by_type": {k: len(v) for k, v in by_type.items()},
            "details": self._anomalies,
        }
```

## Quick Reference: 观察器配置

| 配置项 | 说明 | 默认值 |
|-------|------|--------|
| observation_level | 观察详细程度 | STANDARD |
| enable_message_logging | 消息日志开关 | True |
| enable_tool_logging | 工具调用日志开关 | True |
| enable_behavior_monitoring | 行为监控开关 | True |
| log_directory | 日志存储目录 | logs/observer |
| max_tool_calls_per_minute | 每分钟最大调用次数 | 100 |
| max_errors_per_session | 每会话最大错误数 | 10 |

## Anti-Patterns to Avoid

```python
# 错误: 在观察逻辑中修改业务数据
def observe_message_send(self, message: dict) -> dict:
    message["observed"] = True
    return message

# 正确: 仅观察，不修改
def observe_message_send(self, message: dict) -> dict:
    self._log_event(message)
    return message

# 错误: 观察逻辑抛出异常影响业务
def observe_tool_call(self, tool_name: str):
    if not self._validate_tool(tool_name):
        raise ValueError("Invalid tool")

# 正确: 记录异常但不中断业务
def observe_tool_call(self, tool_name: str):
    if not self._validate_tool(tool_name):
        self._logger.warning(f"Invalid tool: {tool_name}")

# 错误: 同步阻塞观察影响性能
def observe_event(self, event: Event):
    time.sleep(1)
    self._write_to_database(event)

# 正确: 异步或批量处理
def observe_event(self, event: Event):
    self._event_queue.put(event)

# 错误: 记录敏感信息
def log_arguments(self, args: dict):
    self._log.info(f"Arguments: {args}")

# 正确: 过滤敏感信息
def log_arguments(self, args: dict):
    safe_args = self._sanitize(args)
    self._log.info(f"Arguments: {safe_args}")
```

**记住**: 会话观察 Hook 应该是非侵入式的、可配置的，并且不影响原有业务逻辑的性能和正确性。
