# C# Developer 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 .NET 开发、C# 现代特性、LINQ、async/await、Entity Framework

## 核心特性

### LINQ 查询

```csharp
using System;
using System.Collections.Generic;
using System.Linq;

/// <summary>
/// 用户数据模型
/// </summary>
public class User
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public int Age { get; set; }
    public string Department { get; set; } = string.Empty;
}

/// <summary>
/// LINQ 查询示例类
/// </summary>
public static class LinqExamples
{
    /// <summary>
    /// 筛选成年用户并按部门分组
    /// </summary>
    /// <param name="users">用户列表</param>
    /// <returns>按部门分组的成年用户</returns>
    public static Dictionary<string, List<User>> GroupAdultsByDepartment(IEnumerable<User> users)
    {
        return users
            .Where(u => u.Age >= 18)
            .GroupBy(u => u.Department)
            .ToDictionary(g => g.Key, g => g.ToList());
    }

    /// <summary>
    /// 获取用户摘要信息
    /// </summary>
    /// <param name="users">用户列表</param>
    /// <returns>用户摘要列表</returns>
    public static IEnumerable<UserSummary> GetUserSummaries(IEnumerable<User> users)
    {
        return users.Select(u => new UserSummary
        {
            DisplayName = $"{u.Name} ({u.Age}岁)",
            Contact = u.Email
        });
    }

    /// <summary>
    /// 分页查询用户
    /// </summary>
    /// <param name="users">用户列表</param>
    /// <param name="page">页码（从1开始）</param>
    /// <param name="pageSize">每页数量</param>
    /// <returns>分页结果</returns>
    public static PagedResult<User> GetPagedUsers(IEnumerable<User> users, int page, int pageSize)
    {
        var query = users.AsQueryable();
        var totalCount = query.Count();
        var items = query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToList();

        return new PagedResult<User>
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }
}

/// <summary>
/// 用户摘要信息
/// </summary>
public class UserSummary
{
    public string DisplayName { get; set; } = string.Empty;
    public string Contact { get; set; } = string.Empty;
}

/// <summary>
/// 分页结果泛型类
/// </summary>
public class PagedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
}
```

### async/await 异步编程

```csharp
using System;
using System.Net.Http;
using System.Threading.Tasks;

/// <summary>
/// 异步数据服务
/// </summary>
public class DataService
{
    private readonly HttpClient _httpClient;

    public DataService(HttpClient httpClient)
    {
        _httpClient = httpClient;
    }

    /// <summary>
    /// 异步获取用户数据
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <returns>用户对象</returns>
    public async Task<User?> GetUserAsync(int userId)
    {
        var response = await _httpClient.GetAsync($"api/users/{userId}");
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<User>();
    }

    /// <summary>
    /// 并行获取多个用户
    /// </summary>
    /// <param name="userIds">用户ID列表</param>
    /// <returns>用户列表</returns>
    public async Task<List<User>> GetUsersAsync(IEnumerable<int> userIds)
    {
        var tasks = userIds.Select(id => GetUserAsync(id));
        var results = await Task.WhenAll(tasks);
        return results.Where(u => u != null).Cast<User>().ToList();
    }

    /// <summary>
    /// 带超时的异步操作
    /// </summary>
    /// <param name="userId">用户ID</param>
    /// <param name="timeoutMs">超时毫秒数</param>
    /// <returns>用户对象</returns>
    public async Task<User?> GetUserWithTimeoutAsync(int userId, int timeoutMs = 5000)
    {
        using var cts = new CancellationTokenSource(timeoutMs);
        try
        {
            var response = await _httpClient.GetAsync(
                $"api/users/{userId}",
                cts.Token);
            response.EnsureSuccessStatusCode();
            return await response.Content.ReadFromJsonAsync<User>();
        }
        catch (OperationCanceledException)
        {
            throw new TimeoutException($"获取用户 {userId} 超时");
        }
    }
}
```

### Record 类型

```csharp
using System;

/// <summary>
/// 不可变用户记录类型
/// </summary>
/// <remarks>Record 提供值语义相等性比较</remarks>
public record UserRecord(int Id, string Name, string Email)
{
    /// <summary>
    /// 创建更新邮箱后的副本
    /// </summary>
    /// <param name="newEmail">新邮箱</param>
    /// <returns>更新后的用户记录</returns>
    public UserRecord WithEmail(string newEmail) => this with { Email = newEmail };
}

/// <summary>
/// 带验证的用户记录
/// </summary>
public record ValidatedUser : UserRecord
{
    public ValidatedUser(int id, string name, string email) 
        : base(id, name, email)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("用户名不能为空", nameof(name));
        if (!email.Contains('@'))
            throw new ArgumentException("邮箱格式不正确", nameof(email));
    }
}

/// <summary>
/// 位置记录（用于演示 with 表达式）
/// </summary>
public record Position(double Latitude, double Longitude)
{
    /// <summary>
    /// 计算与另一位置的距离（简化版）
    /// </summary>
    public double DistanceTo(Position other)
    {
        return Math.Sqrt(
            Math.Pow(Latitude - other.Latitude, 2) +
            Math.Pow(Longitude - other.Longitude, 2));
    }
}
```

### 模式匹配

```csharp
using System;

/// <summary>
/// 模式匹配示例类
/// </summary>
public static class PatternMatchingExamples
{
    /// <summary>
    /// 处理不同类型的输入
    /// </summary>
    /// <param name="input">输入对象</param>
    /// <returns>处理结果字符串</returns>
    public static string ProcessInput(object input) => input switch
    {
        int i when i > 0 => $"正整数: {i}",
        int i when i < 0 => $"负整数: {i}",
        int i => $"零: {i}",
        double d => $"浮点数: {d:F2}",
        string s when string.IsNullOrWhiteSpace(s) => "空字符串",
        string s => $"字符串: {s}",
        null => "null值",
        _ => $"未知类型: {input.GetType().Name}"
    };

    /// <summary>
    /// 验证用户状态
    /// </summary>
    /// <param name="user">用户对象</param>
    /// <returns>验证结果</returns>
    public static ValidationResult ValidateUser(User? user) => user switch
    {
        null => ValidationResult.Error("用户不存在"),
        { Age: < 0 } => ValidationResult.Error("年龄无效"),
        { Age: < 18 } => ValidationResult.Warning("未成年用户"),
        { Name: var name } when string.IsNullOrEmpty(name) => ValidationResult.Error("用户名为空"),
        _ => ValidationResult.Success()
    };

    /// <summary>
    /// 解析坐标
    /// </summary>
    public static (int X, int Y) ParsePoint(string input) => input.Split(',') switch
    {
        [var x, var y] when int.TryParse(x, out var xi) && int.TryParse(y, out var yi) 
            => (xi, yi),
        _ => (0, 0)
    };
}

/// <summary>
/// 验证结果
/// </summary>
public record ValidationResult(bool IsValid, string Message)
{
    public static ValidationResult Success() => new(true, "验证通过");
    public static ValidationResult Error(string message) => new(false, message);
    public static ValidationResult Warning(string message) => new(true, message);
}
```

### 泛型与约束

```csharp
using System;
using System.Collections.Generic;

/// <summary>
/// 泛型仓储接口
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public interface IRepository<T> where T : class, IEntity
{
    Task<T?> GetByIdAsync(int id);
    Task<IEnumerable<T>> GetAllAsync();
    Task AddAsync(T entity);
    Task UpdateAsync(T entity);
    Task DeleteAsync(int id);
}

/// <summary>
/// 实体接口
/// </summary>
public interface IEntity
{
    int Id { get; }
}

/// <summary>
/// 泛型服务基类
/// </summary>
/// <typeparam name="T">实体类型</typeparam>
public abstract class ServiceBase<T> where T : class, IEntity
{
    protected readonly IRepository<T> Repository;

    protected ServiceBase(IRepository<T> repository)
    {
        Repository = repository;
    }

    /// <summary>
    /// 获取实体或抛出异常
    /// </summary>
    /// <param name="id">实体ID</param>
    /// <returns>实体对象</returns>
    public async Task<T> GetOrThrowAsync(int id)
    {
        var entity = await Repository.GetByIdAsync(id);
        return entity ?? throw new KeyNotFoundException($"未找到ID为 {id} 的实体");
    }
}
```

## 最佳实践

### 1. 使用 using 声明简化资源管理

```csharp
/// <summary>
/// 使用 using 声明自动释放资源
/// </summary>
public async Task<string> ReadFileAsync(string path)
{
    using var reader = new StreamReader(path);
    return await reader.ReadToEndAsync();
}
```

### 2. 使用 nullable 引用类型

```csharp
#nullable enable

/// <summary>
/// 启用可空引用类型检查
/// </summary>
public class UserService
{
    private readonly IUserRepository _repository;
    
    // 构造函数参数不可为 null
    public UserService(IUserRepository repository)
    {
        _repository = repository ?? throw new ArgumentNullException(nameof(repository));
    }
    
    // 返回值可能为 null
    public async Task<User?> FindUserAsync(int id)
    {
        return await _repository.FindAsync(id);
    }
}
```

### 3. 使用 Primary Constructor (C# 12)

```csharp
/// <summary>
/// 使用主构造函数简化依赖注入
/// </summary>
public class OrderService(IOrderRepository repository, ILogger<OrderService> logger)
{
    public async Task<Order?> GetOrderAsync(int id)
    {
        logger.LogInformation("获取订单: {OrderId}", id);
        return await repository.FindAsync(id);
    }
}
```

### 4. 使用集合表达式

```csharp
/// <summary>
/// 使用集合表达式简化初始化
/// </summary>
public class CollectionExamples
{
    // C# 12 集合表达式
    public List<int> Numbers => [1, 2, 3, 4, 5];
    public int[] Array => [10, 20, 30];
    public HashSet<string> Tags => ["tag1", "tag2", "tag3"];
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `record` | 不可变数据类型 | `record User(int Id, string Name)` |
| `with` | 创建记录副本 | `user with { Name = "新名称" }` |
| `async/await` | 异步编程 | `await Task.Run(() => {})` |
| `Task.WhenAll` | 并行执行 | `await Task.WhenAll(tasks)` |
| `LINQ` | 数据查询 | `users.Where(u => u.Age > 18)` |
| `pattern matching` | 模式匹配 | `obj switch { int i => ... }` |
| `nullable` | 空值安全 | `string? name = null` |
| `required` | 必需属性 | `required string Name { get; set; }` |
| `init` | 仅初始化设置 | `string Name { get; init; }` |
| `primary constructor` | 主构造函数 | `class Service(ILogger log)` |
