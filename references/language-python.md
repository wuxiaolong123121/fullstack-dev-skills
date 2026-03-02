# Python 参考

> Reference for: fullstack-dev-skills
> Load when: 编写 Python 代码、类型提示、异步编程、数据处理、Pydantic 模型

## 核心特性

Python 是一门动态类型、解释型的高级编程语言，以其简洁的语法和强大的生态系统著称。Python 3.10+ 引入了模式匹配、联合类型运算符等现代特性，使代码更加优雅和类型安全。

### 类型系统

```python
from typing import TypeVar, Generic, Protocol, TypeAlias, Callable
from dataclasses import dataclass, field
from typing import Any, Optional, Union, Literal, Final, Annotated

# 类型别名 (Python 3.12+ 支持 type 语法)
type Vector = list[float]
type Matrix = list[Vector]
type JSON = dict[str, Any]

# 传统类型别名
UserId: TypeAlias = int
UserName: TypeAlias = str

# 泛型定义
T = TypeVar('T')
U = TypeVar('U')

class Container(Generic[T]):
    """
    泛型容器类，支持存储任意类型的元素。
    
    Attributes:
        _items: 内部存储的元素列表
    """
    
    def __init__(self) -> None:
        """初始化空容器。"""
        self._items: list[T] = []
    
    def add(self, item: T) -> None:
        """
        添加元素到容器。
        
        Args:
            item: 要添加的元素
        """
        self._items.append(item)
    
    def get(self, index: int) -> Optional[T]:
        """
        获取指定索引的元素。
        
        Args:
            index: 元素索引
            
        Returns:
            找到的元素，如果索引越界则返回 None
        """
        if 0 <= index < len(self._items):
            return self._items[index]
        return None

# Protocol 用于结构化子类型（鸭子类型）
class Drawable(Protocol):
    """可绘制对象的协议接口。"""
    
    def draw(self) -> None:
        """绘制对象。"""
        ...

# 字面量类型
Status = Literal['pending', 'active', 'completed', 'failed']
Direction = Literal['up', 'down', 'left', 'right']

# Final 常量
MAX_CONNECTIONS: Final = 100
DEFAULT_TIMEOUT: Final = 30.0

# Annotated 用于添加元数据
PositiveInt = Annotated[int, lambda x: x > 0]
EmailStr = Annotated[str, r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$']
```

### Dataclasses 数据类

```python
from dataclasses import dataclass, field, asdict, from_dict
from typing import ClassVar
from datetime import datetime
import json

@dataclass
class User:
    """
    用户数据模型。
    
    Attributes:
        id: 用户唯一标识
        name: 用户名称
        email: 用户邮箱
        created_at: 创建时间
        is_active: 是否激活
    """
    
    id: int
    name: str
    email: str
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    tags: list[str] = field(default_factory=list)
    
    # 类变量，不参与实例化
    _table_name: ClassVar[str] = 'users'
    
    def to_dict(self) -> dict[str, Any]:
        """
        转换为字典格式。
        
        Returns:
            包含所有字段的字典
        """
        return {
            'id': self.id,
            'name': self.name,
            'email': self.email,
            'created_at': self.created_at.isoformat(),
            'is_active': self.is_active,
            'tags': self.tags
        }
    
    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> 'User':
        """
        从字典创建用户实例。
        
        Args:
            data: 包含用户数据的字典
            
        Returns:
            用户实例
        """
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)

@dataclass(frozen=True, slots=True)
class Point:
    """
    不可变的坐标点。
    
    使用 frozen=True 实现不可变，
    slots=True 优化内存使用。
    """
    
    x: float
    y: float
    
    def distance_to(self, other: 'Point') -> float:
        """
        计算到另一点的距离。
        
        Args:
            other: 另一个坐标点
            
        Returns:
            两点之间的欧几里得距离
        """
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5
```

### Pydantic 数据验证

```python
from pydantic import BaseModel, Field, validator, field_validator, model_validator
from pydantic import EmailStr, HttpUrl, PositiveInt, NonNegativeFloat
from pydantic import ConfigDict, AliasChoices
from typing import Self
from datetime import datetime

class Product(BaseModel):
    """
    产品数据模型，使用 Pydantic 进行数据验证。
    
    Attributes:
        id: 产品唯一标识
        name: 产品名称
        price: 产品价格（必须为正数）
        stock: 库存数量
        category: 产品分类
        tags: 产品标签列表
        metadata: 额外元数据
    """
    
    model_config = ConfigDict(
        str_strip_whitespace=True,
        validate_assignment=True,
        extra='forbid'
    )
    
    id: int = Field(..., ge=1, description='产品ID，必须大于0')
    name: str = Field(..., min_length=1, max_length=100)
    price: NonNegativeFloat = Field(..., description='产品价格')
    stock: PositiveInt = Field(default=0, description='库存数量')
    category: str = Field(default='general')
    tags: list[str] = Field(default_factory=list, max_length=10)
    metadata: dict[str, Any] = Field(default_factory=dict)
    
    @field_validator('name')
    @classmethod
    def name_must_be_capitalized(cls, v: str) -> str:
        """
        验证名称首字母必须大写。
        
        Args:
            v: 待验证的名称值
            
        Returns:
            验证后的名称
            
        Raises:
            ValueError: 当名称不以大写字母开头时
        """
        if v and v[0].islower():
            raise ValueError('名称必须以大写字母开头')
        return v
    
    @model_validator(mode='after')
    def check_price_consistency(self) -> Self:
        """
        模型级验证器，检查价格与分类的一致性。
        
        Returns:
            验证后的模型实例
            
        Raises:
            ValueError: 当价格与分类不匹配时
        """
        if self.category == 'premium' and self.price < 100:
            raise ValueError('高级产品价格必须大于等于100')
        return self

class Order(BaseModel):
    """
    订单数据模型。
    
    Attributes:
        id: 订单ID
        products: 产品列表
        total: 订单总金额
        created_at: 创建时间
    """
    
    id: str
    products: list[Product]
    total: float = Field(default=0.0)
    created_at: datetime = Field(default_factory=datetime.now)
    
    def calculate_total(self) -> float:
        """
        计算订单总金额。
        
        Returns:
            订单总金额
        """
        self.total = sum(p.price for p in self.products)
        return self.total
```

## 异步编程

### Async/Await 基础

```python
import asyncio
from typing import AsyncGenerator, AsyncIterator, Coroutine, Any
from collections.abc import AsyncIterable

async def fetch_data(url: str, timeout: float = 10.0) -> dict[str, Any]:
    """
    异步获取数据。
    
    Args:
        url: 请求地址
        timeout: 超时时间（秒）
        
    Returns:
        获取的数据字典
        
    Raises:
        asyncio.TimeoutError: 请求超时时抛出
    """
    await asyncio.sleep(0.1)  # 模拟网络请求
    return {'url': url, 'status': 'success', 'data': {}}

async def fetch_all(urls: list[str]) -> list[dict[str, Any]]:
    """
    并发获取多个 URL 的数据。
    
    Args:
        urls: URL 列表
        
    Returns:
        所有请求的结果列表
    """
    tasks = [fetch_data(url) for url in urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    return [
        result for result in results
        if not isinstance(result, Exception)
    ]

async def process_with_semaphore(
    urls: list[str],
    max_concurrent: int = 5
) -> list[dict[str, Any]]:
    """
    使用信号量限制并发数的数据获取。
    
    Args:
        urls: URL 列表
        max_concurrent: 最大并发数
        
    Returns:
        处理结果列表
    """
    semaphore = asyncio.Semaphore(max_concurrent)
    
    async def bounded_fetch(url: str) -> dict[str, Any]:
        """
        受信号量限制的获取操作。
        
        Args:
            url: 请求地址
            
        Returns:
            获取的数据
        """
        async with semaphore:
            return await fetch_data(url)
    
    tasks = [bounded_fetch(url) for url in urls]
    return await asyncio.gather(*tasks)
```

### 异步上下文管理器与迭代器

```python
from contextlib import asynccontextmanager
from typing import AsyncContextManager

class AsyncResource:
    """
    异步资源管理器。
    
    Attributes:
        _connected: 连接状态标志
    """
    
    def __init__(self) -> None:
        """初始化资源管理器。"""
        self._connected = False
    
    async def __aenter__(self) -> 'AsyncResource':
        """
        进入异步上下文。
        
        Returns:
            资源管理器实例
        """
        await self.connect()
        return self
    
    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: Any
    ) -> None:
        """
        退出异步上下文。
        
        Args:
            exc_type: 异常类型
            exc_val: 异常值
            exc_tb: 异常追踪信息
        """
        await self.disconnect()
    
    async def connect(self) -> None:
        """建立异步连接。"""
        await asyncio.sleep(0.1)
        self._connected = True
    
    async def disconnect(self) -> None:
        """断开异步连接。"""
        await asyncio.sleep(0.05)
        self._connected = False
    
    async def query(self, sql: str) -> list[dict[str, Any]]:
        """
        执行异步查询。
        
        Args:
            sql: SQL 查询语句
            
        Returns:
            查询结果列表
            
        Raises:
            RuntimeError: 未连接时抛出
        """
        if not self._connected:
            raise RuntimeError('未建立连接')
        await asyncio.sleep(0.05)
        return [{'id': 1, 'name': 'test'}]

@asynccontextmanager
async def async_database(url: str) -> AsyncGenerator[AsyncResource, None]:
    """
    异步数据库上下文管理器。
    
    Args:
        url: 数据库连接地址
        
    Yields:
        数据库资源实例
    """
    resource = AsyncResource()
    try:
        await resource.connect()
        yield resource
    finally:
        await resource.disconnect()

# 异步生成器
async def async_range(start: int, stop: int, step: int = 1) -> AsyncGenerator[int, None]:
    """
    异步范围生成器。
    
    Args:
        start: 起始值
        stop: 结束值
        step: 步长
        
    Yields:
        范围内的每个值
    """
    current = start
    while current < stop:
        await asyncio.sleep(0.01)
        yield current
        current += step

async def consume_async_range() -> list[int]:
    """
    消费异步生成器的示例。
    
    Returns:
        收集的所有值列表
    """
    result = []
    async for value in async_range(0, 10):
        result.append(value)
    return result
```

## 性能优化

### 内存优化

```python
from __future__ import annotations
from typing import Iterator
import array
import sys

class OptimizedBuffer:
    """
    优化的缓冲区实现。
    
    使用 array 模块替代 list 存储数值，
    显著减少内存占用。
    
    Attributes:
        _data: 内部数组存储
    """
    
    __slots__ = ('_data', '_size')
    
    def __init__(self, size: int) -> None:
        """
        初始化缓冲区。
        
        Args:
            size: 缓冲区大小
        """
        self._data = array.array('d', [0.0] * size)
        self._size = size
    
    def __len__(self) -> int:
        """
        获取缓冲区大小。
        
        Returns:
            缓冲区元素数量
        """
        return self._size
    
    def __getitem__(self, index: int) -> float:
        """
        获取指定位置的元素。
        
        Args:
            index: 元素索引
            
        Returns:
            元素值
        """
        return self._data[index]
    
    def __setitem__(self, index: int, value: float) -> None:
        """
        设置指定位置的元素。
        
        Args:
            index: 元素索引
            value: 要设置的值
        """
        self._data[index] = value
    
    def __iter__(self) -> Iterator[float]:
        """
        迭代缓冲区元素。
        
        Yields:
            每个元素值
        """
        return iter(self._data)

# 使用生成器避免内存占用
def process_large_file(filepath: str) -> Iterator[dict[str, Any]]:
    """
    流式处理大文件。
    
    Args:
        filepath: 文件路径
        
    Yields:
        每行的解析结果
    """
    with open(filepath, 'r', encoding='utf-8') as f:
        for line in f:
            yield parse_line(line)

def parse_line(line: str) -> dict[str, Any]:
    """
    解析单行数据。
    
    Args:
        line: 待解析的行
        
    Returns:
        解析后的数据字典
    """
    parts = line.strip().split(',')
    return {'id': int(parts[0]), 'value': parts[1]}
```

### 并发处理

```python
import asyncio
from concurrent.futures import ProcessPoolExecutor, ThreadPoolExecutor
from functools import partial
from typing import Callable, TypeVar

T = TypeVar('T')
R = TypeVar('R')

async def run_in_threadpool(
    func: Callable[..., R],
    *args: Any,
    **kwargs: Any
) -> R:
    """
    在线程池中运行同步函数。
    
    Args:
        func: 要执行的同步函数
        *args: 位置参数
        **kwargs: 关键字参数
        
    Returns:
        函数执行结果
    """
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(
        None,
        partial(func, *args, **kwargs)
    )

async def run_in_processpool(
    func: Callable[..., R],
    *args: Any,
    **kwargs: Any
) -> R:
    """
    在进程池中运行 CPU 密集型函数。
    
    Args:
        func: 要执行的函数
        *args: 位置参数
        **kwargs: 关键字参数
        
    Returns:
        函数执行结果
    """
    loop = asyncio.get_event_loop()
    with ProcessPoolExecutor() as executor:
        return await loop.run_in_executor(
            executor,
            partial(func, *args, **kwargs)
        )

def cpu_intensive_task(data: list[int]) -> int:
    """
    CPU 密集型任务示例。
    
    Args:
        data: 输入数据列表
        
    Returns:
        计算结果
    """
    return sum(x * x for x in data)

async def process_parallel(
    datasets: list[list[int]]
) -> list[int]:
    """
    并行处理多个数据集。
    
    Args:
        datasets: 数据集列表
        
    Returns:
        每个数据集的处理结果
    """
    tasks = [
        run_in_processpool(cpu_intensive_task, data)
        for data in datasets
    ]
    return await asyncio.gather(*tasks)
```

## 模式匹配 (Python 3.10+)

```python
from typing import Literal, Any

type Shape = Circle | Rectangle | Triangle

@dataclass
class Circle:
    """圆形。"""
    radius: float

@dataclass  
class Rectangle:
    """矩形。"""
    width: float
    height: float

@dataclass
class Triangle:
    """三角形。"""
    base: float
    height: float

def calculate_area(shape: Shape) -> float:
    """
    使用模式匹配计算形状面积。
    
    Args:
        shape: 形状对象
        
    Returns:
        形状面积
    """
    match shape:
        case Circle(radius=r):
            return 3.14159 * r * r
        case Rectangle(width=w, height=h):
            return w * h
        case Triangle(base=b, height=h):
            return 0.5 * b * h
        case _:
            raise ValueError(f"未知形状: {type(shape)}")

def process_command(command: dict[str, Any]) -> str:
    """
    处理命令的模式匹配示例。
    
    Args:
        command: 命令字典
        
    Returns:
        处理结果消息
    """
    match command:
        case {'action': 'create', 'type': 'user', 'data': data}:
            return f"创建用户: {data}"
        case {'action': 'delete', 'id': id} if id > 0:
            return f"删除 ID: {id}"
        case {'action': 'update', 'id': id, 'data': data}:
            return f"更新 ID {id}: {data}"
        case {'action': action}:
            return f"未知操作: {action}"
        case _:
            return "无效命令格式"
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `TypeAlias` | 类型别名 | `UserId: TypeAlias = int` |
| `Generic[T]` | 泛型类 | `class Container(Generic[T]):` |
| `Protocol` | 结构化子类型 | `class Drawable(Protocol):` |
| `Literal` | 字面量类型 | `Status = Literal['active', 'inactive']` |
| `Final` | 常量声明 | `MAX_SIZE: Final = 100` |
| `Annotated` | 类型元数据 | `PositiveInt = Annotated[int, lambda x: x > 0]` |
| `@dataclass` | 数据类 | `@dataclass(frozen=True, slots=True)` |
| `field(default_factory=...)` | 可变默认值 | `tags: list = field(default_factory=list)` |
| `async/await` | 异步编程 | `async def fetch(): await ...` |
| `asyncio.gather()` | 并发执行 | `await asyncio.gather(*tasks)` |
| `asyncio.Semaphore` | 限制并发 | `async with semaphore:` |
| `@asynccontextmanager` | 异步上下文 | `@asynccontextmanager async def db():` |
| `__slots__` | 内存优化 | `__slots__ = ('id', 'name')` |
| `array.array` | 紧凑数组 | `array.array('d', [1.0, 2.0])` |
| `match/case` | 模式匹配 | `match value: case pattern:` |
| `pydantic.BaseModel` | 数据验证 | `class User(BaseModel):` |
| `Field(...)` | 字段约束 | `age: int = Field(ge=0, le=150)` |
| `@field_validator` | 字段验证器 | `@field_validator('name')` |
