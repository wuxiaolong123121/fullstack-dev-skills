# 数据库迁移模式参考

数据库迁移策略、版本控制和回滚模式，用于安全可靠地管理数据库架构变更。

## When to Activate

- 设计数据库架构变更流程
- 实现多环境数据库同步
- 构建持续集成中的数据库部署
- 处理生产环境数据库升级
- 执行数据库迁移策略（双写、懒迁移等）
- 设计 ORM 迁移脚本

## Core Principles

### 1. 迁移版本控制

每个迁移应有唯一版本号和清晰的变更记录。

```python
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
import hashlib

class MigrationStatus(Enum):
    """迁移状态枚举"""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

@dataclass
class Migration:
    """
    迁移定义
    
    表示一个数据库迁移单元，包含向上和向下迁移脚本。
    """
    version: str
    name: str
    description: str
    up_sql: str
    down_sql: str
    dependencies: List[str] = field(default_factory=list)
    checksum: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    
    def __post_init__(self):
        if not self.checksum:
            self.checksum = self._calculate_checksum()
    
    def _calculate_checksum(self) -> str:
        """计算迁移校验和，用于检测迁移内容变更"""
        content = f"{self.version}{self.name}{self.up_sql}{self.down_sql}"
        return hashlib.sha256(content.encode()).hexdigest()[:16]

@dataclass
class MigrationRecord:
    """
    迁移执行记录
    
    记录迁移执行的详细信息和状态。
    """
    version: str
    name: str
    checksum: str
    status: MigrationStatus
    executed_at: datetime
    duration_ms: int
    error_message: Optional[str] = None

class MigrationRegistry:
    """
    迁移注册表
    
    管理所有迁移定义，维护执行顺序。
    """
    
    def __init__(self):
        self._migrations: Dict[str, Migration] = {}
        self._execution_order: List[str] = []
    
    def register(self, migration: Migration) -> None:
        """
        注册迁移
        
        参数:
            migration: 迁移定义对象
        
        异常:
            ValueError: 如果版本号已存在
        """
        if migration.version in self._migrations:
            raise ValueError(f"迁移版本 '{migration.version}' 已存在")
        
        self._migrations[migration.version] = migration
        self._update_execution_order()
    
    def get(self, version: str) -> Optional[Migration]:
        """获取指定版本的迁移"""
        return self._migrations.get(version)
    
    def get_all(self) -> List[Migration]:
        """获取所有迁移（按执行顺序）"""
        return [self._migrations[v] for v in self._execution_order]
    
    def get_pending(self, applied_versions: List[str]) -> List[Migration]:
        """
        获取待执行的迁移
        
        参数:
            applied_versions: 已应用的迁移版本列表
        
        返回:
            待执行的迁移列表
        """
        return [
            m for m in self.get_all()
            if m.version not in applied_versions
        ]
    
    def _update_execution_order(self) -> None:
        """更新执行顺序（拓扑排序）"""
        visited = set()
        order = []
        
        def visit(version: str):
            if version in visited:
                return
            visited.add(version)
            
            migration = self._migrations.get(version)
            if migration:
                for dep in migration.dependencies:
                    visit(dep)
            
            order.append(version)
        
        for version in self._migrations:
            visit(version)
        
        self._execution_order = order
```

### 2. 迁移执行器

```python
import asyncio
from abc import ABC, abstractmethod
from contextlib import contextmanager

class DatabaseConnection(ABC):
    """数据库连接抽象接口"""
    
    @abstractmethod
    async def execute(self, sql: str) -> Any:
        """执行 SQL 语句"""
        pass
    
    @abstractmethod
    async def fetch(self, sql: str) -> List[Dict[str, Any]]:
        """查询数据"""
        pass
    
    @abstractmethod
    async def begin_transaction(self) -> None:
        """开始事务"""
        pass
    
    @abstractmethod
    async def commit(self) -> None:
        """提交事务"""
        pass
    
    @abstractmethod
    async def rollback(self) -> None:
        """回滚事务"""
        pass

class MigrationExecutor:
    """
    迁移执行器
    
    执行数据库迁移并记录状态，支持向上迁移和向下迁移。
    """
    
    MIGRATION_TABLE = "_schema_migrations"
    
    def __init__(
        self,
        connection: DatabaseConnection,
        registry: MigrationRegistry
    ):
        self.connection = connection
        self.registry = registry
    
    async def initialize(self) -> None:
        """初始化迁移表"""
        create_table_sql = f"""
        CREATE TABLE IF NOT EXISTS {self.MIGRATION_TABLE} (
            version VARCHAR(255) PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            checksum VARCHAR(64) NOT NULL,
            status VARCHAR(50) NOT NULL,
            executed_at TIMESTAMP NOT NULL,
            duration_ms INTEGER NOT NULL,
            error_message TEXT
        )
        """
        await self.connection.execute(create_table_sql)
    
    async def get_applied_migrations(self) -> List[str]:
        """获取已应用的迁移版本"""
        rows = await self.connection.fetch(
            f"SELECT version FROM {self.MIGRATION_TABLE} "
            f"WHERE status = '{MigrationStatus.COMPLETED.value}'"
        )
        return [row["version"] for row in rows]
    
    async def migrate(
        self,
        target_version: Optional[str] = None
    ) -> List[MigrationRecord]:
        """
        执行向上迁移
        
        参数:
            target_version: 目标版本（None 表示最新）
        
        返回:
            执行记录列表
        """
        await self.initialize()
        
        applied = await self.get_applied_migrations()
        pending = self.registry.get_pending(applied)
        
        if target_version:
            pending = [
                m for m in pending
                if m.version <= target_version
            ]
        
        records = []
        for migration in pending:
            record = await self._execute_migration(migration)
            records.append(record)
            
            if record.status == MigrationStatus.FAILED:
                break
        
        return records
    
    async def rollback(self, steps: int = 1) -> List[MigrationRecord]:
        """
        执行向下迁移（回滚）
        
        参数:
            steps: 回滚步数
        
        返回:
            回滚记录列表
        """
        applied = await self.get_applied_migrations()
        
        to_rollback = []
        for version in reversed(applied[-steps:]):
            migration = self.registry.get(version)
            if migration:
                to_rollback.append(migration)
        
        records = []
        for migration in to_rollback:
            record = await self._execute_rollback(migration)
            records.append(record)
        
        return records
    
    async def _execute_migration(self, migration: Migration) -> MigrationRecord:
        """执行单个向上迁移"""
        start_time = datetime.now()
        
        try:
            await self._record_start(migration)
            
            await self.connection.begin_transaction()
            await self.connection.execute(migration.up_sql)
            await self.connection.commit()
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            record = MigrationRecord(
                version=migration.version,
                name=migration.name,
                checksum=migration.checksum,
                status=MigrationStatus.COMPLETED,
                executed_at=datetime.now(),
                duration_ms=int(duration)
            )
            
            await self._record_completion(record)
            return record
            
        except Exception as e:
            await self.connection.rollback()
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            record = MigrationRecord(
                version=migration.version,
                name=migration.name,
                checksum=migration.checksum,
                status=MigrationStatus.FAILED,
                executed_at=datetime.now(),
                duration_ms=int(duration),
                error_message=str(e)
            )
            
            await self._record_completion(record)
            return record
    
    async def _execute_rollback(self, migration: Migration) -> MigrationRecord:
        """执行单个向下迁移"""
        start_time = datetime.now()
        
        try:
            await self.connection.begin_transaction()
            await self.connection.execute(migration.down_sql)
            await self.connection.commit()
            
            duration = (datetime.now() - start_time).total_seconds() * 1000
            
            record = MigrationRecord(
                version=migration.version,
                name=migration.name,
                checksum=migration.checksum,
                status=MigrationStatus.ROLLED_BACK,
                executed_at=datetime.now(),
                duration_ms=int(duration)
            )
            
            await self._update_rollback_status(record)
            return record
            
        except Exception as e:
            await self.connection.rollback()
            raise
    
    async def _record_start(self, migration: Migration) -> None:
        """记录迁移开始状态"""
        await self.connection.execute(
            f"INSERT INTO {self.MIGRATION_TABLE} "
            f"(version, name, checksum, status, executed_at, duration_ms) "
            f"VALUES (?, ?, ?, ?, ?, ?)",
            (
                migration.version,
                migration.name,
                migration.checksum,
                MigrationStatus.RUNNING.value,
                datetime.now(),
                0
            )
        )
    
    async def _record_completion(self, record: MigrationRecord) -> None:
        """记录迁移完成状态"""
        await self.connection.execute(
            f"UPDATE {self.MIGRATION_TABLE} "
            f"SET status = ?, duration_ms = ?, error_message = ? "
            f"WHERE version = ?",
            (
                record.status.value,
                record.duration_ms,
                record.error_message,
                record.version
            )
        )
    
    async def _update_rollback_status(self, record: MigrationRecord) -> None:
        """更新回滚状态"""
        await self.connection.execute(
            f"UPDATE {self.MIGRATION_TABLE} "
            f"SET status = ? "
            f"WHERE version = ?",
            (record.status.value, record.version)
        )
```

### 3. 迁移策略模式

```python
class MigrationStrategy(ABC):
    """迁移策略抽象基类"""
    
    @abstractmethod
    async def execute(
        self,
        migrations: List[Migration],
        executor: MigrationExecutor
    ) -> List[MigrationRecord]:
        """执行迁移"""
        pass

class DirectMigrationStrategy(MigrationStrategy):
    """
    直接迁移策略
    
    直接执行所有迁移，失败即停止。
    """
    
    async def execute(
        self,
        migrations: List[Migration],
        executor: MigrationExecutor
    ) -> List[MigrationRecord]:
        return await executor.migrate()

class SafeMigrationStrategy(MigrationStrategy):
    """
    安全迁移策略
    
    在事务中执行，失败自动回滚已执行的迁移。
    """
    
    async def execute(
        self,
        migrations: List[Migration],
        executor: MigrationExecutor
    ) -> List[MigrationRecord]:
        records = []
        
        for migration in migrations:
            record = await executor._execute_migration(migration)
            records.append(record)
            
            if record.status == MigrationStatus.FAILED:
                await executor.rollback(len(records))
                break
        
        return records

class DryRunMigrationStrategy(MigrationStrategy):
    """
    试运行策略
    
    只验证不执行，用于预检查。
    """
    
    async def execute(
        self,
        migrations: List[Migration],
        executor: MigrationExecutor
    ) -> List[MigrationRecord]:
        records = []
        
        for migration in migrations:
            records.append(MigrationRecord(
                version=migration.version,
                name=migration.name,
                checksum=migration.checksum,
                status=MigrationStatus.PENDING,
                executed_at=datetime.now(),
                duration_ms=0
            ))
        
        return records
```

### 4. 多环境管理

```python
from enum import Enum

class Environment(Enum):
    """环境类型枚举"""
    DEVELOPMENT = "development"
    STAGING = "staging"
    PRODUCTION = "production"

@dataclass
class EnvironmentConfig:
    """
    环境配置
    
    定义每个环境的迁移策略和安全设置。
    """
    name: Environment
    connection_string: str
    auto_migrate: bool = False
    require_approval: bool = False
    backup_before_migrate: bool = True

class MultiEnvironmentMigrationManager:
    """
    多环境迁移管理器
    
    管理多个环境的数据库迁移，支持环境同步。
    """
    
    def __init__(self):
        self._environments: Dict[Environment, EnvironmentConfig] = {}
        self._executors: Dict[Environment, MigrationExecutor] = {}
    
    def register_environment(
        self,
        config: EnvironmentConfig,
        executor: MigrationExecutor
    ) -> None:
        """注册环境及其执行器"""
        self._environments[config.name] = config
        self._executors[config.name] = executor
    
    async def migrate_environment(
        self,
        env: Environment,
        target_version: Optional[str] = None
    ) -> List[MigrationRecord]:
        """
        迁移指定环境
        
        参数:
            env: 目标环境
            target_version: 目标版本
        
        返回:
            迁移执行记录
        """
        config = self._environments.get(env)
        executor = self._executors.get(env)
        
        if not config or not executor:
            raise ValueError(f"环境 '{env.value}' 未配置")
        
        if config.require_approval:
            approved = await self._request_approval(env, target_version)
            if not approved:
                raise PermissionError("迁移未获批准")
        
        if config.backup_before_migrate:
            await self._create_backup(env)
        
        return await executor.migrate(target_version)
    
    async def sync_environments(
        self,
        source: Environment,
        target: Environment
    ) -> Dict[str, Any]:
        """
        同步两个环境的迁移状态
        
        参数:
            source: 源环境
            target: 目标环境
        
        返回:
            同步状态报告
        """
        source_executor = self._executors.get(source)
        target_executor = self._executors.get(target)
        
        source_applied = await source_executor.get_applied_migrations()
        target_applied = await target_executor.get_applied_migrations()
        
        missing = set(source_applied) - set(target_applied)
        
        return {
            "source_env": source.value,
            "target_env": target.value,
            "source_migrations": source_applied,
            "target_migrations": target_applied,
            "missing_in_target": list(missing),
            "sync_needed": len(missing) > 0
        }
    
    async def _request_approval(
        self,
        env: Environment,
        target_version: Optional[str]
    ) -> bool:
        """请求批准（需实现具体逻辑）"""
        return True
    
    async def _create_backup(self, env: Environment) -> None:
        """创建备份（需实现具体逻辑）"""
        pass
```

## 高级迁移策略

### 1. 双写模式（Dual-Write Pattern）

用于数据库迁移期间保持数据一致性。

```python
class DualWriteUserRepository:
    """
    双写用户仓库
    
    在迁移期间同时写入新旧数据库，确保数据一致性。
    """
    
    def __init__(self, legacy_db, modern_db: AsyncSession):
        self.legacy = legacy_db
        self.modern = modern_db
    
    async def create_user(self, user_data: dict) -> User:
        """
        创建用户（双写模式）
        
        写入新数据库作为真实来源，异步同步到旧数据库。
        """
        async with self.modern.begin():
            user = User(**user_data)
            self.modern.add(user)
            await self.modern.flush()
        
        asyncio.create_task(self._sync_to_legacy(user))
        
        return user
    
    async def _sync_to_legacy(self, user: User):
        """异步同步到旧数据库"""
        try:
            await asyncio.to_thread(
                self.legacy.execute,
                "INSERT INTO users VALUES (?, ?, ?)",
                user.id, user.email, user.name,
            )
        except Exception as e:
            logger.error(f"Legacy sync failed: {e}", extra={"user_id": user.id})
    
    async def get_user(self, user_id: int) -> User | None:
        """
        获取用户（双读模式）
        
        优先从新数据库读取，不存在则从旧数据库读取并懒迁移。
        """
        user = await self.modern.get(User, user_id)
        if user:
            return user
        
        legacy_user = await self._read_from_legacy(user_id)
        if legacy_user:
            return await self._lazy_migrate(legacy_user)
        
        return None
    
    async def _lazy_migrate(self, legacy_data: dict) -> User:
        """懒迁移：读取时迁移数据"""
        user = User(**legacy_data)
        async with self.modern.begin():
            self.modern.add(user)
            await self.modern.flush()
        return user
```

### 2. Expand-Contract 模式

用于安全地修改数据库架构。

```python
"""
Expand-Contract 模式示例

用于安全地修改数据库架构，避免停机时间。
"""

# Step 1: EXPAND - 添加新列（可空或有默认值）
EXPAND_SQL = """
ALTER TABLE users ADD COLUMN email_verified BOOLEAN DEFAULT FALSE;
"""

# Step 2: WRITE BOTH - 应用同时写入新旧字段
class User(Base):
    __tablename__ = "users"
    
    is_confirmed = Column(Boolean, default=False)
    email_verified = Column(Boolean, default=False)
    
    def set_verified(self, verified: bool):
        """同时写入新旧字段"""
        self.email_verified = verified
        self.is_confirmed = verified

# Step 3: MIGRATE - 回填现有数据
BACKFILL_SQL = """
UPDATE users
SET email_verified = is_confirmed
WHERE email_verified IS NULL;
"""

# Step 4: READ NEW - 应用读取新字段
@property
def is_email_verified(self) -> bool:
    """优先读取新字段"""
    return self.email_verified or self.is_confirmed

# Step 5: CONTRACT - 删除旧列（所有代码部署后）
CONTRACT_SQL = """
ALTER TABLE users DROP COLUMN is_confirmed;
"""
```

## SQL 迁移脚本示例

### 基础表创建

```sql
-- V20240101001__create_users_table.sql
-- 创建用户表

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

COMMENT ON TABLE users IS '用户基础信息表';
COMMENT ON COLUMN users.email IS '用户邮箱，唯一标识';
```

### 添加字段迁移

```sql
-- V20240101002__add_user_status.sql
-- 添加用户状态字段

ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';
CREATE INDEX idx_users_status ON users(status);

-- 回滚脚本
-- DROP INDEX IF EXISTS idx_users_status;
-- ALTER TABLE users DROP COLUMN status;
```

### 审计日志表

```sql
-- V20240101003__create_audit_log.sql
-- 创建审计日志表

CREATE TABLE audit_logs (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id INTEGER NOT NULL,
    action VARCHAR(20) NOT NULL,
    old_values JSONB,
    new_values JSONB,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX idx_audit_logs_record ON audit_logs(table_name, record_id);

COMMENT ON TABLE audit_logs IS '数据库变更审计日志';
```

## ORM 迁移示例

### Django ORM 迁移

```python
# migrations/0001_initial.py
from django.db import migrations, models

class Migration(migrations.Migration):
    """
    Django 初始迁移
    
    创建用户相关表结构。
    """
    
    initial = True
    
    dependencies = []
    
    operations = [
        migrations.CreateModel(
            name='User',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True,
                    primary_key=True,
                    serialize=False,
                    verbose_name='ID'
                )),
                ('email', models.EmailField(
                    max_length=255,
                    unique=True,
                    verbose_name='邮箱'
                )),
                ('name', models.CharField(
                    max_length=255,
                    verbose_name='姓名'
                )),
                ('status', models.CharField(
                    default='active',
                    max_length=50,
                    verbose_name='状态'
                )),
                ('created_at', models.DateTimeField(
                    auto_now_add=True,
                    verbose_name='创建时间'
                )),
                ('updated_at', models.DateTimeField(
                    auto_now=True,
                    verbose_name='更新时间'
                )),
            ],
            options={
                'verbose_name': '用户',
                'verbose_name_plural': '用户',
                'db_table': 'users',
            },
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['email'], name='idx_users_email'),
        ),
        migrations.AddIndex(
            model_name='user',
            index=models.Index(fields=['status'], name='idx_users_status'),
        ),
    ]
```

### Alembic 迁移（SQLAlchemy）

```python
# alembic/versions/20240101_initial.py
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '20240101_initial'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    """
    向上迁移：创建用户表
    
    包含表结构、索引和注释。
    """
    op.create_table(
        'users',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('email', sa.String(length=255), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=True, default='active'),
        sa.Column('created_at', sa.TIMESTAMP(), nullable=True, server_default=sa.func.now()),
        sa.Column('updated_at', sa.TIMESTAMP(), nullable=True, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )
    
    op.create_index('idx_users_email', 'users', ['email'])
    op.create_index('idx_users_status', 'users', ['status'])

def downgrade():
    """
    向下迁移：删除用户表
    
    按相反顺序删除索引和表。
    """
    op.drop_index('idx_users_status', table_name='users')
    op.drop_index('idx_users_email', table_name='users')
    op.drop_table('users')
```

### Flyway 迁移（Java/Spring Boot）

```sql
-- V1__create_users_table.sql
-- Flyway 迁移脚本：创建用户表

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

COMMENT ON TABLE users IS '用户基础信息表';
```

```sql
-- V2__create_addresses_table.sql
-- Flyway 迁移脚本：创建地址表

CREATE TABLE addresses (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    street VARCHAR(200) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(2) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_addresses_user_id ON addresses(user_id);
```

### Laravel 迁移

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * 向上迁移：创建用户表
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('email', 255)->unique();
            $table->string('name', 255);
            $table->string('status', 50)->default('active');
            $table->timestamps();
            
            $table->index('email', 'idx_users_email');
            $table->index('status', 'idx_users_status');
        });
    }

    /**
     * 向下迁移：删除用户表
     */
    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
```

## 版本控制最佳实践

### 版本号命名规范

```
格式: YYYYMMDDNNN[_description]

YYYY - 年份
MM   - 月份
DD   - 日期
NNN  - 当日序号（001-999）
description - 可选的描述性名称

示例:
- 20240101001_create_users_table
- 20240101002_add_user_status
- 20240101003_create_audit_log
```

### 迁移文件组织

```
migrations/
├── versions/
│   ├── 20240101001_initial.py
│   ├── 20240101002_add_user_status.py
│   └── 20240101003_create_audit_log.py
├── env.py
└── alembic.ini

db/migrate/
├── 20240101001_create_users_table.sql
├── 20240101002_add_user_status.sql
└── 20240101003_create_audit_log.sql
```

## 回滚模式

### 安全回滚策略

```python
class SafeRollbackStrategy:
    """
    安全回滚策略
    
    提供多种回滚方式以适应不同场景。
    """
    
    async def rollback_to_version(
        self,
        executor: MigrationExecutor,
        target_version: str
    ) -> List[MigrationRecord]:
        """
        回滚到指定版本
        
        参数:
            executor: 迁移执行器
            target_version: 目标版本
        
        返回:
            回滚记录列表
        """
        applied = await executor.get_applied_migrations()
        
        to_rollback = []
        for version in reversed(applied):
            if version <= target_version:
                break
            migration = executor.registry.get(version)
            if migration:
                to_rollback.append(migration)
        
        records = []
        for migration in to_rollback:
            record = await executor._execute_rollback(migration)
            records.append(record)
        
        return records
    
    async def rollback_last_batch(
        self,
        executor: MigrationExecutor,
        batch_size: int = 1
    ) -> List[MigrationRecord]:
        """
        回滚最后一批迁移
        
        参数:
            executor: 迁移执行器
            batch_size: 回滚数量
        
        返回:
            回滚记录列表
        """
        return await executor.rollback(batch_size)
```

### 回滚脚本示例

```sql
-- 回滚 V20240101003
DROP INDEX IF EXISTS idx_audit_logs_record;
DROP INDEX IF EXISTS idx_audit_logs_table;
DROP TABLE IF EXISTS audit_logs;

-- 回滚 V20240101002
DROP INDEX IF EXISTS idx_users_status;
ALTER TABLE users DROP COLUMN status;

-- 回滚 V20240101001
DROP INDEX IF EXISTS idx_users_email;
DROP TABLE IF EXISTS users;
```

## 最佳实践清单

### 迁移设计原则

| 原则 | 说明 |
|------|------|
| 版本号规范 | 使用时间戳格式 `YYYYMMDDNNN` |
| 幂等性 | 迁移脚本应可重复执行 |
| 小步迁移 | 每个迁移只做一件事 |
| 可逆性 | 每个迁移必须有对应的回滚脚本 |
| 原子性 | 迁移在事务中执行，失败自动回滚 |

### 生产环境检查清单

| 检查项 | 说明 |
|--------|------|
| 备份策略 | 生产环境迁移前必须备份 |
| 审核流程 | 重要迁移需要审批 |
| 监控告警 | 监控迁移执行状态 |
| 回滚预案 | 准备好回滚方案 |
| 测试验证 | 在开发/测试环境验证 |

### 性能优化建议

| 建议 | 说明 |
|------|------|
| 批量操作 | 大数据量迁移使用批处理 |
| 索引优化 | 迁移后重建统计信息 |
| 锁最小化 | 避免长时间锁表 |
| 分批执行 | 大表变更分批进行 |

## 快速参考

| 工具 | 语言/框架 | 版本号格式 |
|------|-----------|------------|
| Alembic | Python/SQLAlchemy | 时间戳或序号 |
| Flyway | Java/Spring | V{N}__description.sql |
| Liquibase | Java | 变更集ID |
| Django | Python | 0001_initial.py |
| Laravel | PHP | 时间戳格式 |

## 反模式警告

```python
# 错误：跳过迁移
# 不要直接修改数据库而不记录迁移

# 错误：不可逆迁移
# 每个迁移都必须有回滚脚本

# 错误：大数据量迁移无批处理
# 会锁表导致服务不可用

# 错误：迁移中包含业务逻辑
# 迁移应该只包含结构变更

# 错误：生产环境无备份迁移
# 始终在迁移前备份
```

**记住**: 数据库迁移是高风险操作，务必遵循最佳实践，在非生产环境充分测试后再执行生产迁移。
