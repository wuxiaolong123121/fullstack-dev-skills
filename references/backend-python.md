# Python 后端开发参考

> Reference for: fullstack-dev-skills
> Load when: FastAPI、Django、异步编程、Python 类型提示

## FastAPI 核心

### 应用结构

```
app/
├── main.py             # 入口文件
├── config.py           # 配置管理
├── dependencies.py     # 依赖注入
├── routers/
│   ├── users.py
│   └── auth.py
├── models/
│   └── user.py
├── schemas/
│   └── user.py
├── services/
│   └── user_service.py
└── utils/
    └── security.py
```

### 路由定义

```python
from fastapi import APIRouter, Depends, HTTPException, status
from typing import Annotated

router = APIRouter(prefix="/users", tags=["users"])

@router.get("/", response_model=list[UserOut])
async def get_users(
    skip: int = 0,
    limit: int = 100,
    current_user: User = Depends(get_current_user)
) -> list[User]:
    """
    获取用户列表
    
    Args:
        skip: 跳过记录数
        limit: 返回记录数
        current_user: 当前登录用户
        
    Returns:
        用户列表
    """
    return await user_service.get_all(skip, limit)


@router.post("/", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    创建用户
    
    Args:
        user_data: 用户创建数据
        db: 数据库会话
        
    Returns:
        创建的用户
    """
    existing = await user_service.get_by_email(db, user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    return await user_service.create(db, user_data)
```

### Pydantic 模型

```python
from pydantic import BaseModel, EmailStr, Field, field_validator
from datetime import datetime
from typing import Annotated

class UserBase(BaseModel):
    """用户基础模型"""
    email: EmailStr
    name: Annotated[str, Field(min_length=2, max_length=100)]


class UserCreate(UserBase):
    """用户创建模型"""
    password: Annotated[str, Field(min_length=8)]
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError('Password must contain uppercase letter')
        if not any(c.isdigit() for c in v):
            raise ValueError('Password must contain digit')
        return v


class UserOut(UserBase):
    """用户输出模型"""
    id: str
    created_at: datetime
    is_active: bool = True
    
    model_config = {"from_attributes": True}
```

### 依赖注入

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

async def get_db() -> AsyncSession:
    """获取数据库会话"""
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db)
) -> User:
    """
    获取当前用户
    
    Args:
        token: JWT Token
        db: 数据库会话
        
    Returns:
        当前用户
        
    Raises:
        HTTPException: 认证失败
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = await user_service.get_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user
```

## 异步编程

### async/await

```python
import asyncio
from typing import AsyncGenerator

async def fetch_user(user_id: str) -> User | None:
    """
    异步获取用户
    
    Args:
        user_id: 用户 ID
        
    Returns:
        用户对象或 None
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{API_URL}/users/{user_id}")
        if response.status_code == 200:
            return User(**response.json())
    return None


async def fetch_users_batch(user_ids: list[str]) -> list[User]:
    """
    批量获取用户
    
    Args:
        user_ids: 用户 ID 列表
        
    Returns:
        用户列表
    """
    tasks = [fetch_user(uid) for uid in user_ids]
    results = await asyncio.gather(*tasks)
    return [r for r in results if r is not None]


async def stream_users() -> AsyncGenerator[User, None]:
    """
    流式获取用户
    
    Yields:
        用户对象
    """
    async for row in db.stream(query):
        yield User.from_row(row)
```

### SQLAlchemy 异步

```python
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy import select

engine = create_async_engine(DATABASE_URL, echo=True)

async def get_users_paginated(
    session: AsyncSession,
    page: int,
    page_size: int
) -> tuple[list[User], int]:
    """
    分页获取用户
    
    Args:
        session: 数据库会话
        page: 页码
        page_size: 每页数量
        
    Returns:
        用户列表和总数
    """
    offset = (page - 1) * page_size
    
    # 获取数据
    result = await session.execute(
        select(User)
        .order_by(User.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    users = list(result.scalars().all())
    
    # 获取总数
    count_result = await session.execute(
        select(func.count()).select_from(User)
    )
    total = count_result.scalar()
    
    return users, total
```

## 类型提示

### 高级类型

```python
from typing import TypeVar, Generic, Callable, Awaitable
from collections.abc import Sequence

T = TypeVar('T')

class Repository(Generic[T]):
    """泛型仓库基类"""
    
    def __init__(self, model: type[T]):
        self.model = model
    
    async def get_by_id(self, id: str) -> T | None:
        ...


# 类型别名
UserId = Annotated[str, StringConstraints(pattern=r'^[a-zA-Z0-9]+$')]
JsonDict = dict[str, Any]
Handler = Callable[[Request], Awaitable[Response]]


# 协议类型
from typing import Protocol

class Authenticator(Protocol):
    """认证器协议"""
    
    async def authenticate(self, credentials: Credentials) -> User:
        ...
    
    async def validate_token(self, token: str) -> bool:
        ...
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| Pydantic | 数据验证 | `class User(BaseModel)` |
| Depends | 依赖注入 | `db: AsyncSession = Depends(get_db)` |
| APIRouter | 路由分组 | `router = APIRouter(prefix="/users")` |
| BackgroundTasks | 后台任务 | `tasks.add_task(send_email, user)` |
| HTTPException | 异常处理 | `raise HTTPException(status_code=404)` |
| Response Model | 响应模型 | `@router.get(response_model=UserOut)` |
| Annotated | 类型注解 | `name: Annotated[str, Field(min_length=2)]` |
| async/await | 异步编程 | `async def fetch(): ... await client.get()` |
