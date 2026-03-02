# PHP Pro 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 PHP 开发、Laravel 框架、现代 PHP 特性、类型系统

## 核心特性

### 现代 PHP (8.1/8.2/8.3)

```php
<?php

declare(strict_types=1);

namespace App\Models;

/**
 * 用户数据传输对象
 * 
 * 使用 readonly 属性实现不可变性
 */
readonly class UserDTO
{
    /**
     * 构造函数
     *
     * @param int $id 用户ID
     * @param string $name 用户名
     * @param string $email 邮箱地址
     * @param \DateTimeImmutable $createdAt 创建时间
     */
    public function __construct(
        public int $id,
        public string $name,
        public string $email,
        public \DateTimeImmutable $createdAt
    ) {}
}

/**
 * 用户服务类
 */
class UserService
{
    /**
     * 创建新用户
     *
     * @param string $name 用户名
     * @param string $email 邮箱
     * @return UserDTO 创建的用户DTO
     * @throws \InvalidArgumentException 参数无效时抛出
     */
    public function createUser(string $name, string $email): UserDTO
    {
        if (empty(trim($name))) {
            throw new \InvalidArgumentException('用户名不能为空');
        }

        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new \InvalidArgumentException('邮箱格式无效');
        }

        return new UserDTO(
            id: 0,
            name: $name,
            email: $email,
            createdAt: new \DateTimeImmutable()
        );
    }
}
```

### 枚举类型 (Enums)

```php
<?php

declare(strict_types=1);

namespace App\Enums;

/**
 * 用户状态枚举
 */
enum UserStatus: string
{
    case ACTIVE = 'active';
    case INACTIVE = 'inactive';
    case SUSPENDED = 'suspended';
    case PENDING = 'pending';

    /**
     * 检查用户是否可登录
     *
     * @return bool 是否可登录
     */
    public function canLogin(): bool
    {
        return $this === self::ACTIVE;
    }

    /**
     * 获取状态显示名称
     *
     * @return string 显示名称
     */
    public function label(): string
    {
        return match($this) {
            self::ACTIVE => '活跃',
            self::INACTIVE => '未激活',
            self::SUSPENDED => '已暂停',
            self::PENDING => '待审核',
        };
    }
}

/**
 * 订单状态枚举（带方法）
 */
enum OrderStatus: int
{
    case CREATED = 0;
    case PAID = 1;
    case SHIPPED = 2;
    case DELIVERED = 3;
    case CANCELLED = 4;

    /**
     * 检查是否可取消
     *
     * @return bool 是否可取消
     */
    public function isCancellable(): bool
    {
        return in_array($this, [self::CREATED, self::PAID], true);
    }

    /**
     * 获取下一个状态
     *
     * @return OrderStatus|null 下一个状态或null
     */
    public function next(): ?OrderStatus
    {
        return match($this) {
            self::CREATED => self::PAID,
            self::PAID => self::SHIPPED,
            self::SHIPPED => self::DELIVERED,
            default => null,
        };
    }
}
```

### 属性 (Attributes)

```php
<?php

declare(strict_types=1);

namespace App\Attributes;

use Attribute;

/**
 * 路由属性
 */
#[Attribute(Attribute::TARGET_METHOD | Attribute::IS_REPEATABLE)]
class Route
{
    /**
     * 构造函数
     *
     * @param string $path 路由路径
     * @param string $method HTTP方法
     * @param string|null $name 路由名称
     */
    public function __construct(
        public string $path,
        public string $method = 'GET',
        public ?string $name = null
    ) {}
}

/**
 * 验证规则属性
 */
#[Attribute(Attribute::TARGET_PROPERTY)]
class Validate
{
    /**
     * @param array<string> $rules 验证规则列表
     */
    public function __construct(
        public array $rules = []
    ) {}
}

/**
 * API 控制器示例
 */
class UserController
{
    /**
     * 获取用户列表
     */
    #[Route('/api/users', method: 'GET', name: 'users.index')]
    public function index(): array
    {
        return [];
    }

    /**
     * 创建新用户
     */
    #[Route('/api/users', method: 'POST')]
    public function store(): array
    {
        return [];
    }

    /**
     * 获取单个用户
     */
    #[Route('/api/users/{id}', method: 'GET')]
    public function show(int $id): array
    {
        return ['id' => $id];
    }
}
```

### 类型系统

```php
<?php

declare(strict_types=1);

namespace App\Services;

/**
 * 类型系统示例类
 */
class TypeExamples
{
    /**
     * 联合类型参数
     *
     * @param int|float $value 数值
     * @return int|float 处理后的值
     */
    public function processNumber(int|float $value): int|float
    {
        return $value * 2;
    }

    /**
     * 可空类型
     *
     * @param string|null $name 名称
     * @return string 处理后的名称
     */
    public function formatName(?string $name): string
    {
        return $name ?? '匿名用户';
    }

    /**
     * 交叉类型（需要 PHP 8.1+）
     *
     * @param \Countable&\Iterator $collection 集合对象
     * @return int 元素数量
     */
    public function countItems(\Countable&\Iterator $collection): int
    {
        return $collection->count();
    }

    /**
     * mixed 类型
     *
     * @param mixed $value 任意值
     * @return string 类型描述
     */
    public function describeType(mixed $value): string
    {
        return match(true) {
            is_int($value) => '整数',
            is_float($value) => '浮点数',
            is_string($value) => '字符串',
            is_bool($value) => '布尔值',
            is_array($value) => '数组',
            is_object($value) => '对象',
            is_null($value) => 'null',
            default => '未知类型',
        };
    }

    /**
     * never 返回类型（总是抛出异常或终止）
     *
     * @throws \Exception 总是抛出异常
     */
    public function alwaysFail(): never
    {
        throw new \Exception('此方法总是失败');
    }

    /**
     * void 返回类型
     */
    public function logMessage(string $message): void
    {
        error_log($message);
    }
}
```

### Laravel 模式

```php
<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Cache;

/**
 * 用户控制器
 */
class UserController extends Controller
{
    /**
     * 获取用户列表
     *
     * @return JsonResponse JSON响应
     */
    public function index(): JsonResponse
    {
        $users = Cache::remember('users.all', 3600, function () {
            return User::query()
                ->select(['id', 'name', 'email'])
                ->where('status', 'active')
                ->orderBy('created_at', 'desc')
                ->paginate(15);
        });

        return response()->json([
            'data' => UserResource::collection($users),
            'meta' => [
                'current_page' => $users->currentPage(),
                'last_page' => $users->lastPage(),
                'total' => $users->total(),
            ],
        ]);
    }

    /**
     * 创建新用户
     *
     * @param StoreUserRequest $request 验证后的请求
     * @return JsonResponse JSON响应
     */
    public function store(StoreUserRequest $request): JsonResponse
    {
        $user = DB::transaction(function () use ($request) {
            $user = User::create($request->validated());
            
            // 触发用户创建事件
            event(new \App\Events\UserCreated($user));
            
            return $user;
        });

        return response()->json([
            'message' => '用户创建成功',
            'data' => new UserResource($user),
        ], 201);
    }
}

/**
 * 用户请求验证类
 */
class StoreUserRequest extends \Illuminate\Foundation\Http\FormRequest
{
    /**
     * 获取验证规则
     *
     * @return array<string, mixed> 验证规则数组
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ];
    }

    /**
     * 获取验证错误消息
     *
     * @return array<string, string> 错误消息数组
     */
    public function messages(): array
    {
        return [
            'name.required' => '用户名不能为空',
            'email.unique' => '该邮箱已被注册',
            'password.min' => '密码至少需要8个字符',
        ];
    }
}
```

## 最佳实践

### 1. 使用严格类型

```php
<?php

declare(strict_types=1);

// 在每个 PHP 文件开头声明严格类型
```

### 2. 使用命名参数

```php
<?php

// 命名参数提高可读性
$user = new UserDTO(
    id: 1,
    name: '张三',
    email: 'zhangsan@example.com',
    createdAt: new \DateTimeImmutable()
);
```

### 3. 使用 null 合并运算符

```php
<?php

/**
 * 安全获取配置值
 *
 * @param string $key 配置键
 * @param mixed $default 默认值
 * @return mixed 配置值或默认值
 */
function config(string $key, mixed $default = null): mixed
{
    return $_ENV[$key] ?? $default;
}
```

### 4. 使用 match 表达式

```php
<?php

/**
 * 获取 HTTP 状态消息
 *
 * @param int $code 状态码
 * @return string 状态消息
 */
function getStatusMessage(int $code): string
{
    return match($code) {
        200 => 'OK',
        201 => 'Created',
        400 => 'Bad Request',
        401 => 'Unauthorized',
        403 => 'Forbidden',
        404 => 'Not Found',
        500 => 'Internal Server Error',
        default => 'Unknown Status',
    };
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `readonly` | 只读属性 | `readonly class User {}` |
| `enum` | 枚举类型 | `enum Status: string {}` |
| `match` | 模式匹配 | `match($v) { 1 => 'a' }` |
| `#[Attribute]` | 属性注解 | `#[Route('/api')]` |
| `named args` | 命名参数 | `func(name: 'value')` |
| `union types` | 联合类型 | `int\|string $value` |
| `mixed` | 任意类型 | `mixed $value` |
| `never` | 永不返回 | `function fail(): never` |
| `nullsafe` | 空安全调用 | `$user?->profile?->avatar` |
| `??=` | 空合并赋值 | `$value ??= 'default'` |
