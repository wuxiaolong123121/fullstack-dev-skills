# Python pytest 测试模式参考

pytest 测试框架核心模式、fixture 使用、参数化测试、mock 技术和覆盖率配置，用于构建可靠、可维护的 Python 测试套件。

## When to Activate

- 编写新的 Python 测试代码
- 重构现有测试
- 配置 pytest 测试环境
- 调试测试失败问题

## Core Principles

### 1. 测试应该简单明了

测试代码的可读性同样重要，清晰的测试即文档。

```python
def test_user_creation():
    """测试用户创建功能。"""
    user = User(name="Alice", email="alice@example.com")
    assert user.name == "Alice"
    assert user.is_active is True
```

### 2. 测试应该独立

每个测试应该独立运行，不依赖其他测试的执行顺序或状态。

```python
import pytest

class TestUserManagement:
    """用户管理测试类。"""
    
    def test_create_user(self, db_session):
        """测试创建用户。"""
        user = UserFactory.create()
        assert user.id is not None
    
    def test_delete_user(self, db_session):
        """测试删除用户。"""
        user = UserFactory.create()
        db_session.delete(user)
        assert db_session.query(User).count() == 0
```

### 3. 测试应该快速

快速反馈是测试的核心价值，避免不必要的延迟。

```python
import pytest

@pytest.fixture
def mock_external_api(mocker):
    """模拟外部 API 调用，避免网络请求。"""
    mock_response = {"status": "ok", "data": []}
    return mocker.patch("requests.get", return_value=mock_response)

def test_api_call_fast(mock_external_api):
    """测试 API 调用，使用 mock 避免真实网络请求。"""
    result = fetch_data_from_api()
    assert result["status"] == "ok"
```

## Fixture 使用模式

### 基础 Fixture

```python
import pytest
from myapp.database import Database
from myapp.models import User

@pytest.fixture
def database():
    """创建测试数据库连接。"""
    db = Database("sqlite:///:memory:")
    db.create_tables()
    yield db
    db.drop_tables()
    db.close()

@pytest.fixture
def sample_user(database):
    """创建示例用户。"""
    user = User(name="Test User", email="test@example.com")
    database.add(user)
    database.commit()
    return user

def test_user_query(database, sample_user):
    """测试用户查询。"""
    found = database.query(User).filter_by(name="Test User").first()
    assert found is not None
    assert found.email == "test@example.com"
```

### Fixture 作用域

```python
import pytest
from myapp.database import Database

@pytest.fixture(scope="session")
def app_config():
    """会话级别配置，整个测试会话只创建一次。"""
    return {"debug": True, "database_url": "sqlite:///:memory:"}

@pytest.fixture(scope="module")
def module_database(app_config):
    """模块级别数据库，每个模块创建一次。"""
    db = Database(app_config["database_url"])
    db.create_tables()
    yield db
    db.drop_tables()

@pytest.fixture(scope="function")
def function_database(module_database):
    """函数级别数据库，每个测试函数创建一次。"""
    module_database.begin_transaction()
    yield module_database
    module_database.rollback()

def test_with_transaction(function_database):
    """测试使用事务隔离。"""
    assert function_database.is_connected()
```

### Fixture 工厂模式

```python
import pytest
from myapp.models import User, Post

@pytest.fixture
def user_factory(database):
    """用户工厂 fixture，支持动态创建用户。"""
    created_users = []
    
    def _create_user(name="Default User", email=None, **kwargs):
        user = User(
            name=name,
            email=email or f"{name.lower().replace(' ', '@')}example.com",
            **kwargs
        )
        database.add(user)
        database.commit()
        created_users.append(user)
        return user
    
    yield _create_user
    
    for user in created_users:
        database.delete(user)
    database.commit()

@pytest.fixture
def post_factory(database, user_factory):
    """文章工厂 fixture，支持动态创建文章。"""
    def _create_post(title="Test Post", author=None, **kwargs):
        post = Post(
            title=title,
            author=author or user_factory(),
            **kwargs
        )
        database.add(post)
        database.commit()
        return post
    
    return _create_post

def test_post_creation(user_factory, post_factory):
    """测试文章创建。"""
    author = user_factory(name="Alice")
    post = post_factory(title="Hello World", author=author)
    assert post.author.name == "Alice"
```

### Fixture 依赖注入

```python
import pytest
from myapp.services import EmailService, UserService

@pytest.fixture
def mock_email_sender(mocker):
    """模拟邮件发送器。"""
    return mocker.Mock()

@pytest.fixture
def email_service(mock_email_sender):
    """邮件服务，注入模拟发送器。"""
    return EmailService(sender=mock_email_sender)

@pytest.fixture
def user_service(database, email_service):
    """用户服务，注入数据库和邮件服务。"""
    return UserService(database=database, email_service=email_service)

def test_user_registration(user_service, mock_email_sender):
    """测试用户注册流程。"""
    user = user_service.register("Alice", "alice@example.com")
    assert user.id is not None
    mock_email_sender.send_welcome.assert_called_once_with(user)
```

### conftest.py 共享 Fixture

```python
import pytest
from myapp.database import Database
from myapp.models import User

@pytest.fixture(scope="session")
def test_config():
    """测试配置，会话级别共享。"""
    return {
        "database_url": "sqlite:///:memory:",
        "debug": True,
        "testing": True,
    }

@pytest.fixture(scope="session")
def database(test_config):
    """数据库 fixture，会话级别。"""
    db = Database(test_config["database_url"])
    db.create_tables()
    yield db
    db.drop_tables()
    db.close()

@pytest.fixture
def clean_database(database):
    """清理数据库，函数级别。"""
    database.query(User).delete()
    database.commit()
    yield database
    database.query(User).delete()
    database.commit()

@pytest.fixture(autouse=True)
def setup_test_environment(test_config, monkeypatch):
    """自动应用的测试环境设置。"""
    monkeypatch.setenv("TESTING", "true")
    monkeypatch.setenv("DATABASE_URL", test_config["database_url"])
```

## 参数化测试

### 基础参数化

```python
import pytest

@pytest.mark.parametrize("input_value,expected", [
    (0, 0),
    (1, 1),
    (2, 4),
    (3, 9),
    (10, 100),
])
def test_square(input_value, expected):
    """测试平方函数。"""
    assert square(input_value) == expected

@pytest.mark.parametrize("email,is_valid", [
    ("user@example.com", True),
    ("invalid-email", False),
    ("@example.com", False),
    ("user@", False),
    ("user.name+tag@example.com", True),
])
def test_email_validation(email, is_valid):
    """测试邮箱验证。"""
    assert validate_email(email) is is_valid
```

### 多参数组合

```python
import pytest

@pytest.mark.parametrize("x", [1, 2, 3])
@pytest.mark.parametrize("y", [10, 20])
def test_multiply_combinations(x, y):
    """测试乘法组合，共 3x2=6 种组合。"""
    assert multiply(x, y) == x * y

@pytest.mark.parametrize("operation,expected", [
    pytest.param("add", 5, id="加法"),
    pytest.param("subtract", -1, id="减法"),
    pytest.param("multiply", 6, id="乘法"),
    pytest.param("divide", 1.5, id="除法"),
])
def test_calculator_operations(operation, expected):
    """测试计算器操作。"""
    result = calculate(3, 2, operation)
    assert result == expected
```

### 参数化与 Fixture 结合

```python
import pytest
from myapp.database import Database

@pytest.fixture(params=["sqlite", "postgresql"])
def database(request, test_config):
    """参数化数据库 fixture。"""
    db_url = test_config[f"{request.param}_url"]
    db = Database(db_url)
    db.create_tables()
    yield db
    db.drop_tables()

@pytest.mark.parametrize("user_data,should_succeed", [
    ({"name": "Alice", "email": "alice@example.com"}, True),
    ({"name": "", "email": "alice@example.com"}, False),
    ({"name": "Bob", "email": "invalid"}, False),
])
def test_user_creation_validation(database, user_data, should_succeed):
    """测试用户创建验证。"""
    if should_succeed:
        user = User.create(**user_data)
        assert user.id is not None
    else:
        with pytest.raises(ValidationError):
            User.create(**user_data)
```

### 从文件加载参数

```python
import pytest
import json
from pathlib import Path

def load_test_cases():
    """从 JSON 文件加载测试用例。"""
    cases_file = Path(__file__).parent / "test_cases" / "api_cases.json"
    with open(cases_file) as f:
        return json.load(f)

@pytest.mark.parametrize("case", load_test_cases(), ids=lambda c: c["name"])
def test_api_endpoints(case, api_client):
    """测试 API 端点。"""
    response = api_client.request(
        method=case["method"],
        path=case["path"],
        data=case.get("data"),
    )
    assert response.status_code == case["expected_status"]
```

## Mock 和 Patch

### unittest.mock 基础

```python
from unittest.mock import Mock, MagicMock, patch

def test_mock_basic():
    """测试基础 Mock 使用。"""
    mock_obj = Mock()
    mock_obj.method.return_value = "mocked"
    
    result = mock_obj.method("arg1", "arg2")
    
    assert result == "mocked"
    mock_obj.method.assert_called_once_with("arg1", "arg2")

def test_mock_attributes():
    """测试 Mock 属性。"""
    mock_user = Mock()
    mock_user.name = "Alice"
    mock_user.email = "alice@example.com"
    
    assert mock_user.name == "Alice"
    assert mock_user.email == "alice@example.com"
```

### patch 装饰器

```python
from unittest.mock import patch
import requests

@patch("requests.get")
def test_fetch_data(mock_get):
    """测试数据获取，模拟 requests.get。"""
    mock_get.return_value.json.return_value = {"data": "test"}
    
    result = fetch_data("https://api.example.com/data")
    
    assert result == {"data": "test"}
    mock_get.assert_called_once_with("https://api.example.com/data")

@patch("myapp.services.EmailService.send")
@patch("myapp.database.Database.save")
def test_user_registration(mock_save, mock_send):
    """测试用户注册，模拟数据库和邮件服务。"""
    mock_save.return_value = True
    mock_send.return_value = True
    
    service = UserService()
    result = service.register("Alice", "alice@example.com")
    
    assert result is True
    mock_save.assert_called_once()
    mock_send.assert_called_once()
```

### patch 上下文管理器

```python
from unittest.mock import patch

def test_with_context_manager():
    """测试使用上下文管理器进行 patch。"""
    with patch("os.path.exists") as mock_exists:
        mock_exists.return_value = True
        
        result = check_file_exists("/some/path")
        
        assert result is True
        mock_exists.assert_called_once_with("/some/path")

def test_multiple_patches():
    """测试多个 patch。"""
    with patch("module.function_a") as mock_a, \
         patch("module.function_b") as mock_b:
        mock_a.return_value = "a"
        mock_b.return_value = "b"
        
        result = combined_function()
        
        assert result == "a and b"
```

### pytest-mock 插件

```python
import pytest

def test_with_mocker(mocker):
    """测试使用 pytest-mock 的 mocker fixture。"""
    mock_get = mocker.patch("requests.get")
    mock_get.return_value.json.return_value = {"status": "ok"}
    
    result = fetch_status()
    
    assert result == "ok"
    mock_get.assert_called_once()

def test_spy_with_mocker(mocker):
    """测试使用 spy 监控真实调用。"""
    original_func = my_module.important_function
    spy = mocker.spy(my_module, "important_function")
    
    result = my_module.important_function("input")
    
    assert result == "expected"
    spy.assert_called_once_with("input")
    assert spy.spy_return == "expected"

def test_patch_object(mocker):
    """测试 patch 对象方法。"""
    service = EmailService()
    mock_send = mocker.patch.object(service, "send", return_value=True)
    
    result = service.send("test@example.com", "Hello")
    
    assert result is True
    mock_send.assert_called_once_with("test@example.com", "Hello")
```

### Mock 高级用法

```python
from unittest.mock import Mock, call, create_autospec

def test_mock_call_tracking():
    """测试 Mock 调用追踪。"""
    mock = Mock()
    mock.method(1, 2)
    mock.method(3, 4)
    mock.other("a", "b")
    
    assert mock.method.call_count == 2
    assert mock.method.call_args_list == [call(1, 2), call(3, 4)]
    assert mock.other.call_args == call("a", "b")

def test_mock_side_effect():
    """测试 Mock 副作用。"""
    mock = Mock()
    mock.side_effect = [1, 2, 3]
    
    assert mock() == 1
    assert mock() == 2
    assert mock() == 3

def test_mock_side_effect_exception():
    """测试 Mock 抛出异常。"""
    mock = Mock()
    mock.side_effect = ValueError("Invalid input")
    
    with pytest.raises(ValueError, match="Invalid input"):
        mock()

def test_autospec():
    """测试使用 autospec 保持接口一致性。"""
    mock_service = create_autospec(EmailService)
    
    mock_service.send.return_value = True
    result = mock_service.send("test@example.com", "Subject", "Body")
    
    assert result is True
```

## 测试覆盖率配置

### pytest-cov 基础使用

```bash
pytest --cov=myapp tests/

pytest --cov=myapp --cov-report=term-missing tests/

pytest --cov=myapp --cov-report=html tests/

pytest --cov=myapp --cov-report=xml tests/
```

### pyproject.toml 覆盖率配置

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "--cov=myapp",
    "--cov-report=term-missing",
    "--cov-report=html:htmlcov",
    "--cov-fail-under=80",
]

[tool.coverage.run]
source = ["myapp"]
branch = true
omit = [
    "*/tests/*",
    "*/__init__.py",
    "*/migrations/*",
]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise AssertionError",
    "raise NotImplementedError",
    "if __name__ == .__main__.:",
    "if TYPE_CHECKING:",
]
fail_under = 80
show_missing = true
skip_covered = true

[tool.coverage.html]
directory = "htmlcov"
```

### .coveragerc 配置文件

```ini
[run]
source = myapp
branch = True
omit =
    */tests/*
    */__init__.py
    */migrations/*

[report]
exclude_lines =
    pragma: no cover
    def __repr__
    raise AssertionError
    raise NotImplementedError
    if __name__ == .__main__.:
    if TYPE_CHECKING:
fail_under = 80
show_missing = True

[html]
directory = htmlcov
```

### 覆盖率标记

```python
import pytest

@pytest.mark.skip_coverage
def test_slow_integration():
    """跳过覆盖率检测的慢速集成测试。"""
    pass

def test_normal():
    """正常测试，计入覆盖率。"""
    if debug_mode:
        print("debug info")
```

## pytest 配置示例

### pyproject.toml 完整配置

```toml
[tool.pytest.ini_options]
minversion = "7.0"
testpaths = ["tests"]
python_files = ["test_*.py", "*_test.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]

addopts = [
    "-ra",
    "-q",
    "--strict-markers",
    "--strict-config",
    "--cov=myapp",
    "--cov-report=term-missing",
]

markers = [
    "slow: 标记慢速测试",
    "integration: 标记集成测试",
    "unit: 标记单元测试",
    "smoke: 标记冒烟测试",
]

filterwarnings = [
    "ignore::DeprecationWarning",
    "ignore::PendingDeprecationWarning",
]

log_cli = true
log_cli_level = "INFO"
log_cli_format = "%(asctime)s [%(levelname)8s] %(message)s (%(filename)s:%(lineno)s)"
log_cli_date_format = "%Y-%m-%d %H:%M:%S"

xfail_strict = true
```

### pytest.ini 配置文件

```ini
[pytest]
minversion = 7.0
testpaths = tests
python_files = test_*.py *_test.py
python_classes = Test*
python_functions = test_*

addopts = -ra -q --strict-markers --strict-config

markers =
    slow: 标记慢速测试
    integration: 标记集成测试
    unit: 标记单元测试

filterwarnings =
    ignore::DeprecationWarning

log_cli = true
log_cli_level = INFO
```

### conftest.py 高级配置

```python
import pytest
from pathlib import Path
from myapp import create_app
from myapp.database import Database

def pytest_addoption(parser):
    """添加自定义命令行选项。"""
    parser.addoption(
        "--runslow",
        action="store_true",
        default=False,
        help="运行慢速测试",
    )
    parser.addoption(
        "--env",
        default="testing",
        help="测试环境",
    )

def pytest_configure(config):
    """注册自定义标记。"""
    config.addinivalue_line("markers", "slow: 标记慢速测试")
    config.addinivalue_line("markers", "integration: 标记集成测试")

def pytest_collection_modifyitems(config, items):
    """根据选项修改测试收集。"""
    if config.getoption("--runslow"):
        return
    
    skip_slow = pytest.mark.skip(reason="需要 --runslow 选项")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip_slow)

@pytest.fixture(scope="session")
def app(request):
    """创建测试应用。"""
    env = request.config.getoption("--env")
    app = create_app(config=f"config.{env}")
    yield app

@pytest.fixture(scope="session")
def app_context(app):
    """应用上下文。"""
    with app.app_context():
        yield

@pytest.fixture
def client(app):
    """测试客户端。"""
    return app.test_client()
```

## 测试模式示例

### 单元测试模式

```python
import pytest
from myapp.calculator import Calculator

class TestCalculator:
    """计算器单元测试。"""
    
    @pytest.fixture
    def calculator(self):
        """创建计算器实例。"""
        return Calculator()
    
    def test_add(self, calculator):
        """测试加法。"""
        assert calculator.add(2, 3) == 5
    
    def test_subtract(self, calculator):
        """测试减法。"""
        assert calculator.subtract(5, 3) == 2
    
    def test_divide_by_zero(self, calculator):
        """测试除零异常。"""
        with pytest.raises(ZeroDivisionError):
            calculator.divide(10, 0)
```

### 集成测试模式

```python
import pytest
from myapp import create_app
from myapp.database import Database
from myapp.models import User

@pytest.fixture(scope="module")
def app():
    """创建测试应用。"""
    app = create_app(config="config.testing")
    with app.app_context():
        yield app

@pytest.fixture(scope="module")
def database(app):
    """创建测试数据库。"""
    db = Database(app.config["DATABASE_URL"])
    db.create_tables()
    yield db
    db.drop_tables()

@pytest.fixture
def client(app):
    """创建测试客户端。"""
    return app.test_client()

class TestUserAPI:
    """用户 API 集成测试。"""
    
    def test_create_user(self, client, database):
        """测试创建用户 API。"""
        response = client.post("/api/users", json={
            "name": "Alice",
            "email": "alice@example.com",
        })
        assert response.status_code == 201
        data = response.get_json()
        assert data["name"] == "Alice"
    
    def test_get_user(self, client, database):
        """测试获取用户 API。"""
        user = User.create(name="Bob", email="bob@example.com")
        
        response = client.get(f"/api/users/{user.id}")
        assert response.status_code == 200
        data = response.get_json()
        assert data["email"] == "bob@example.com"
```

### 异步测试模式

```python
import pytest
import asyncio
from myapp.async_service import AsyncService

@pytest.fixture
def event_loop():
    """创建事件循环。"""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.mark.asyncio
async def test_async_fetch():
    """测试异步数据获取。"""
    service = AsyncService()
    result = await service.fetch_data("https://api.example.com")
    assert result["status"] == "ok"

@pytest.mark.asyncio
async def test_async_concurrent_operations():
    """测试并发异步操作。"""
    service = AsyncService()
    results = await asyncio.gather(
        service.fetch_data("/api/1"),
        service.fetch_data("/api/2"),
        service.fetch_data("/api/3"),
    )
    assert len(results) == 3

class TestAsyncService:
    """异步服务测试类。"""
    
    @pytest.fixture
    async def service(self):
        """创建异步服务实例。"""
        service = AsyncService()
        await service.connect()
        yield service
        await service.disconnect()
    
    @pytest.mark.asyncio
    async def test_service_operation(self, service):
        """测试服务操作。"""
        result = await service.process("test data")
        assert result.success is True
```

### 测试类组织模式

```python
import pytest

class TestUserModel:
    """用户模型测试。"""
    
    @pytest.fixture(autouse=True)
    def setup(self, database):
        """每个测试前的设置。"""
        self.db = database
        yield
        self.db.rollback()
    
    def test_create_user(self):
        """测试创建用户。"""
        user = User(name="Test", email="test@example.com")
        self.db.add(user)
        self.db.commit()
        assert user.id is not None
    
    def test_user_validation(self):
        """测试用户验证。"""
        with pytest.raises(ValidationError):
            User(name="", email="invalid")

class TestUserService:
    """用户服务测试。"""
    
    @pytest.fixture
    def service(self, database, mock_email_service):
        """创建用户服务。"""
        return UserService(database, mock_email_service)
    
    def test_register_user(self, service):
        """测试用户注册。"""
        user = service.register("Alice", "alice@example.com")
        assert user.id is not None
    
    def test_register_duplicate_email(self, service):
        """测试重复邮箱注册。"""
        service.register("Alice", "alice@example.com")
        with pytest.raises(DuplicateEmailError):
            service.register("Bob", "alice@example.com")
```

### 临时文件测试模式

```python
import pytest
from pathlib import Path
from myapp.file_processor import process_file

def test_file_processing(tmp_path):
    """测试文件处理，使用 pytest 内置 tmp_path fixture。"""
    input_file = tmp_path / "input.txt"
    input_file.write_text("Hello, World!")
    
    output_file = process_file(str(input_file))
    
    assert Path(output_file).exists()
    assert Path(output_file).read_text() == "HELLO, WORLD!"

def test_multiple_files(tmp_path):
    """测试多文件处理。"""
    files = []
    for i in range(3):
        file_path = tmp_path / f"file_{i}.txt"
        file_path.write_text(f"Content {i}")
        files.append(str(file_path))
    
    results = process_multiple_files(files)
    assert len(results) == 3
```

### 异常测试模式

```python
import pytest
from myapp.exceptions import ValidationError, NotFoundError
from myapp.services import UserService

def test_specific_exception():
    """测试特定异常。"""
    with pytest.raises(ValueError, match="invalid input"):
        raise ValueError("invalid input")

def test_exception_attributes():
    """测试异常属性。"""
    with pytest.raises(ValidationError) as exc_info:
        validate_user({"name": ""})
    
    assert exc_info.value.field == "name"
    assert "cannot be empty" in str(exc_info.value)

def test_exception_chaining():
    """测试异常链。"""
    with pytest.raises(NotFoundError) as exc_info:
        get_nonexistent_user(999)
    
    assert exc_info.value.__cause__ is not None

@pytest.mark.parametrize("input_data,exception_type", [
    ({"name": ""}, ValidationError),
    ({"email": "invalid"}, ValidationError),
    ({"age": -1}, ValueError),
])
def test_validation_exceptions(input_data, exception_type):
    """测试验证异常类型。"""
    with pytest.raises(exception_type):
        validate_user(input_data)
```

## 测试标记和分组

```python
import pytest

@pytest.mark.unit
def test_simple_calculation():
    """单元测试标记。"""
    assert 1 + 1 == 2

@pytest.mark.integration
def test_database_connection(database):
    """集成测试标记。"""
    assert database.is_connected()

@pytest.mark.slow
def test_long_running_process():
    """慢速测试标记。"""
    time.sleep(5)
    assert True

@pytest.mark.smoke
def test_critical_function():
    """冒烟测试标记。"""
    assert critical_function() is not None

@pytest.mark.skip(reason="功能尚未实现")
def test_future_feature():
    """跳过测试。"""
    pass

@pytest.mark.skipif(sys.version_info < (3, 10), reason="需要 Python 3.10+")
def test_python_310_feature():
    """条件跳过测试。"""
    pass

@pytest.mark.xfail(reason="已知问题")
def test_known_bug():
    """预期失败的测试。"""
    assert buggy_function() == "expected"
```

## Quick Reference: pytest 常用命令

| 命令 | 描述 |
|------|------|
| `pytest` | 运行所有测试 |
| `pytest tests/test_module.py` | 运行指定文件 |
| `pytest tests/test_module.py::test_func` | 运行指定测试 |
| `pytest -k "keyword"` | 按关键字筛选 |
| `pytest -m marker` | 按标记筛选 |
| `pytest -v` | 详细输出 |
| `pytest -x` | 首次失败即停止 |
| `pytest --tb=short` | 简短回溯 |
| `pytest --cov=myapp` | 覆盖率报告 |
| `pytest -n auto` | 并行执行 |
| `pytest --fixtures` | 显示可用 fixtures |

## Anti-Patterns to Avoid

```python
def test_bad_no_assertion():
    """错误：没有断言。"""
    user = User(name="Test")
    user.save()

def test_bad_multiple_concerns():
    """错误：测试多个关注点。"""
    user = User(name="Test")
    assert user.name == "Test"
    assert user.save() is True
    assert user.email is None
    assert User.query.count() == 1

def test_bad_external_dependency():
    """错误：依赖外部服务。"""
    response = requests.get("https://api.example.com/real-api")
    assert response.status_code == 200

def test_bad_shared_state():
    """错误：共享可变状态。"""
    global_counter += 1
    assert global_counter > 0

def test_bad_hardcoded_data():
    """错误：硬编码测试数据。"""
    assert process("2024-01-15") == "Monday"
```

**Remember**: 测试是代码质量的保障，好的测试应该快速、独立、可重复、自验证和及时（FIRST 原则）。
