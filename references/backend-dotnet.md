# .NET Core 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 .NET Core/C# 后端、Minimal APIs、中间件、EF Core、依赖注入

## 核心特性

.NET Core 是微软开源的跨平台框架，以高性能和现代化设计著称。

### 主要特性
- **Minimal APIs**：轻量级 API 开发模式
- **中间件管道**：灵活的请求处理管道
- **EF Core**：现代化的 ORM 框架
- **依赖注入**：内置 IoC 容器
- **性能优化**：高性能异步支持

## 最佳实践

### Minimal APIs

```csharp
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MyApp.Api;

/// <summary>
/// 文章相关 API 端点
/// 
/// 使用 Minimal APIs 模式定义 RESTful 端点，
/// 支持路由分组、参数验证和响应类型。
/// </summary>
public static class PostEndpoints
{
    /// <summary>
    /// 注册文章 API 端点
    /// 
    /// 配置路由、参数验证和 OpenAPI 文档。
    /// </summary>
    /// <param name="routes">路由构建器</param>
    public static void MapPostEndpoints(this IEndpointRouteBuilder routes)
    {
        var group = routes.MapGroup("/api/posts")
            .WithTags("Posts")
            .WithOpenApi();

        // GET /api/posts - 获取文章列表
        group.MapGet("/", async (
            [FromServices] AppDbContext db,
            [FromQuery] int page = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] string? keyword = null,
            CancellationToken ct = default) =>
        {
            var query = db.Posts
                .Include(p => p.Author)
                .Where(p => p.Status == PostStatus.Published);

            if (!string.IsNullOrEmpty(keyword))
            {
                query = query.Where(p => 
                    p.Title.Contains(keyword) || 
                    p.Content.Contains(keyword));
            }

            var total = await query.CountAsync(ct);
            var posts = await query
                .OrderByDescending(p => p.PublishedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(p => new PostSummaryDto
                {
                    Id = p.Id,
                    Title = p.Title,
                    Excerpt = p.Content.Substring(0, Math.Min(150, p.Content.Length)),
                    AuthorName = p.Author.Name,
                    PublishedAt = p.PublishedAt!.Value,
                    CommentsCount = p.Comments.Count
                })
                .ToListAsync(ct);

            return Results.Ok(new PaginatedResult<PostSummaryDto>
            {
                Items = posts,
                Total = total,
                Page = page,
                PageSize = pageSize
            });
        })
        .WithName("GetPosts")
        .Produces<PaginatedResult<PostSummaryDto>>()
        .ProducesProblem(500);

        // GET /api/posts/{id} - 获取文章详情
        group.MapGet("/{id:int}", async (
            int id,
            [FromServices] AppDbContext db,
            CancellationToken ct) =>
        {
            var post = await db.Posts
                .Include(p => p.Author)
                .Include(p => p.Comments.Where(c => c.IsActive))
                .FirstOrDefaultAsync(p => p.Id == id, ct);

            return post is null 
                ? Results.NotFound() 
                : Results.Ok(PostDetailDto.FromEntity(post));
        })
        .WithName("GetPost")
        .Produces<PostDetailDto>()
        .Produces(404);

        // POST /api/posts - 创建文章
        group.MapPost("/", async (
            [FromBody] CreatePostRequest request,
            [FromServices] AppDbContext db,
            [FromServices] ICurrentUser currentUser,
            CancellationToken ct) =>
        {
            var post = new Post
            {
                Title = request.Title,
                Content = request.Content,
                AuthorId = currentUser.Id,
                Status = PostStatus.Draft,
                CreatedAt = DateTime.UtcNow
            };

            db.Posts.Add(post);
            await db.SaveChangesAsync(ct);

            return Results.CreatedAtRoute(
                "GetPost", 
                new { id = post.Id }, 
                PostDetailDto.FromEntity(post));
        })
        .WithName("CreatePost")
        .Produces<PostDetailDto>(201)
        .ProducesValidationProblem()
        .RequireAuthorization();

        // PUT /api/posts/{id}/publish - 发布文章
        group.MapPut("/{id:int}/publish", async (
            int id,
            [FromServices] AppDbContext db,
            [FromServices] ICurrentUser currentUser,
            CancellationToken ct) =>
        {
            var post = await db.Posts.FindAsync([id], ct);
            
            if (post is null) return Results.NotFound();
            if (post.AuthorId != currentUser.Id) return Results.Forbid();

            post.Status = PostStatus.Published;
            post.PublishedAt = DateTime.UtcNow;
            
            await db.SaveChangesAsync(ct);

            return Results.Ok(PostDetailDto.FromEntity(post));
        })
        .WithName("PublishPost")
        .RequireAuthorization();

        // DELETE /api/posts/{id} - 删除文章
        group.MapDelete("/{id:int}", async (
            int id,
            [FromServices] AppDbContext db,
            [FromServices] ICurrentUser currentUser,
            CancellationToken ct) =>
        {
            var post = await db.Posts.FindAsync([id], ct);
            
            if (post is null) return Results.NotFound();
            if (post.AuthorId != currentUser.Id) return Results.Forbid();

            db.Posts.Remove(post);
            await db.SaveChangesAsync(ct);

            return Results.NoContent();
        })
        .WithName("DeletePost")
        .RequireAuthorization();
    }
}

/// <summary>
/// 创建文章请求模型
/// </summary>
public record CreatePostRequest
{
    /// <summary>
    /// 文章标题
    /// </summary>
    [Required, MinLength(5), MaxLength(200)]
    public string Title { get; init; } = string.Empty;

    /// <summary>
    /// 文章内容
    /// </summary>
    [Required, MinLength(10)]
    public string Content { get; init; } = string.Empty;
}

/// <summary>
/// 文章摘要 DTO
/// </summary>
public record PostSummaryDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Excerpt { get; init; } = string.Empty;
    public string AuthorName { get; init; } = string.Empty;
    public DateTime PublishedAt { get; init; }
    public int CommentsCount { get; init; }
}

/// <summary>
/// 文章详情 DTO
/// </summary>
public record PostDetailDto
{
    public int Id { get; init; }
    public string Title { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string AuthorName { get; init; } = string.Empty;
    public PostStatus Status { get; init; }
    public DateTime? PublishedAt { get; init; }
    public List<CommentDto> Comments { get; init; } = [];

    /// <summary>
    /// 从实体创建 DTO
    /// </summary>
    /// <param name="entity">文章实体</param>
    /// <returns>文章详情 DTO</returns>
    public static PostDetailDto FromEntity(Post entity) => new()
    {
        Id = entity.Id,
        Title = entity.Title,
        Content = entity.Content,
        AuthorName = entity.Author.Name,
        Status = entity.Status,
        PublishedAt = entity.PublishedAt,
        Comments = entity.Comments
            .Select(c => new CommentDto
            {
                Id = c.Id,
                Content = c.Content,
                AuthorName = c.Author.Name,
                CreatedAt = c.CreatedAt
            })
            .ToList()
    };
}
```

### 中间件

```csharp
using System.Diagnostics;

namespace MyApp.Middleware;

/// <summary>
/// 请求计时中间件
/// 
/// 记录每个请求的处理时间，
/// 用于性能监控和问题排查。
/// </summary>
public class RequestTimingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestTimingMiddleware> _logger;

    /// <summary>
    /// 初始化中间件
    /// </summary>
    /// <param name="next">下一个中间件委托</param>
    /// <param name="logger">日志记录器</param>
    public RequestTimingMiddleware(
        RequestDelegate next,
        ILogger<RequestTimingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// 处理请求
    /// 
    /// 记录请求开始和结束时间，
    /// 添加响应头并记录慢请求。
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    public async Task InvokeAsync(HttpContext context)
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            await _next(context);
        }
        finally
        {
            stopwatch.Stop();
            var duration = stopwatch.ElapsedMilliseconds;

            context.Response.Headers["X-Response-Time"] = $"{duration}ms";

            if (duration > 1000)
            {
                _logger.LogWarning(
                    "慢请求: {Method} {Path} 耗时 {Duration}ms",
                    context.Request.Method,
                    context.Request.Path,
                    duration);
            }
        }
    }
}

/// <summary>
/// 异常处理中间件
/// 
/// 全局捕获异常并返回标准化错误响应。
/// </summary>
public class ExceptionHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    /// <summary>
    /// 处理请求
    /// </summary>
    /// <param name="context">HTTP 上下文</param>
    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (ValidationException ex)
        {
            await HandleValidationExceptionAsync(context, ex);
        }
        catch (NotFoundException ex)
        {
            await HandleNotFoundExceptionAsync(context, ex);
        }
        catch (Exception ex)
        {
            await HandleExceptionAsync(context, ex);
        }
    }

    /// <summary>
    /// 处理验证异常
    /// </summary>
    private async Task HandleValidationExceptionAsync(
        HttpContext context, 
        ValidationException exception)
    {
        context.Response.StatusCode = StatusCodes.Status400BadRequest;
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            Type = "ValidationError",
            Message = exception.Message,
            Errors = exception.Errors
        };

        await context.Response.WriteAsJsonAsync(response);
    }

    /// <summary>
    /// 处理未找到异常
    /// </summary>
    private async Task HandleNotFoundExceptionAsync(
        HttpContext context, 
        NotFoundException exception)
    {
        context.Response.StatusCode = StatusCodes.Status404NotFound;
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            Type = "NotFoundError",
            Message = exception.Message
        };

        await context.Response.WriteAsJsonAsync(response);
    }

    /// <summary>
    /// 处理通用异常
    /// </summary>
    private async Task HandleExceptionAsync(
        HttpContext context, 
        Exception exception)
    {
        _logger.LogError(
            exception,
            "未处理的异常: {Message}",
            exception.Message);

        context.Response.StatusCode = StatusCodes.Status500InternalServerError;
        context.Response.ContentType = "application/json";

        var response = new ErrorResponse
        {
            Type = "InternalServerError",
            Message = "服务器内部错误，请稍后重试"
        };

        await context.Response.WriteAsJsonAsync(response);
    }
}

/// <summary>
/// 中间件扩展方法
/// </summary>
public static class MiddlewareExtensions
{
    /// <summary>
    /// 使用请求计时中间件
    /// </summary>
    public static IApplicationBuilder UseRequestTiming(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<RequestTimingMiddleware>();
    }

    /// <summary>
    /// 使用异常处理中间件
    /// </summary>
    public static IApplicationBuilder UseExceptionHandling(
        this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ExceptionHandlingMiddleware>();
    }
}
```

### EF Core

```csharp
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace MyApp.Data;

/// <summary>
/// 应用数据库上下文
/// 
/// 管理 EF Core 实体和数据库连接，
/// 支持多租户和软删除。
/// </summary>
public class AppDbContext : DbContext
{
    private readonly ICurrentUserService _currentUser;
    private readonly ITenantService _tenantService;

    /// <summary>
    /// 初始化数据库上下文
    /// </summary>
    public AppDbContext(
        DbContextOptions<AppDbContext> options,
        ICurrentUserService currentUser,
        ITenantService tenantService) : base(options)
    {
        _currentUser = currentUser;
        _tenantService = tenantService;
    }

    public DbSet<Post> Posts => Set<Post>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Comment> Comments => Set<Comment>();

    /// <summary>
    /// 配置模型
    /// 
    /// 应用全局查询过滤器和实体配置。
    /// </summary>
    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // 应用所有配置
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);

        // 全局查询过滤器 - 软删除
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ISoftDeletable).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(e => !EF.Property<bool>(e, "IsDeleted"));
            }
        }

        // 全局查询过滤器 - 多租户
        foreach (var entityType in modelBuilder.Model.GetEntityTypes())
        {
            if (typeof(ITenantEntity).IsAssignableFrom(entityType.ClrType))
            {
                modelBuilder.Entity(entityType.ClrType)
                    .HasQueryFilter(e => 
                        EF.Property<int>(e, "TenantId") == _tenantService.TenantId);
            }
        }
    }

    /// <summary>
    /// 保存更改前处理
    /// 
    /// 自动设置审计字段和租户ID。
    /// </summary>
    public override int SaveChanges()
    {
        UpdateAuditFields();
        return base.SaveChanges();
    }

    /// <summary>
    /// 异步保存更改前处理
    /// </summary>
    public override Task<int> SaveChangesAsync(
        CancellationToken cancellationToken = default)
    {
        UpdateAuditFields();
        return base.SaveChangesAsync(cancellationToken);
    }

    /// <summary>
    /// 更新审计字段
    /// </summary>
    private void UpdateAuditFields()
    {
        var entries = ChangeTracker.Entries<IAuditable>();

        foreach (var entry in entries)
        {
            switch (entry.State)
            {
                case EntityState.Added:
                    entry.Entity.CreatedAt = DateTime.UtcNow;
                    entry.Entity.CreatedBy = _currentUser.UserId;
                    break;
                case EntityState.Modified:
                    entry.Entity.UpdatedAt = DateTime.UtcNow;
                    entry.Entity.UpdatedBy = _currentUser.UserId;
                    break;
            }
        }
    }
}

/// <summary>
/// 文章实体配置
/// </summary>
public class PostConfiguration : IEntityTypeConfiguration<Post>
{
    /// <summary>
    /// 配置文章实体
    /// </summary>
    public void Configure(EntityTypeBuilder<Post> builder)
    {
        builder.ToTable("posts");

        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(p => p.Content)
            .IsRequired()
            .HasColumnType("text");

        builder.Property(p => p.Status)
            .HasConversion<string>()
            .HasMaxLength(20);

        // 索引
        builder.HasIndex(p => new { p.Status, p.PublishedAt });
        builder.HasIndex(p => p.AuthorId);

        // 关联
        builder.HasOne(p => p.Author)
            .WithMany(u => u.Posts)
            .HasForeignKey(p => p.AuthorId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasMany(p => p.Comments)
            .WithOne(c => c.Post)
            .HasForeignKey(c => c.PostId)
            .OnDelete(DeleteBehavior.Cascade);
    }
}

/// <summary>
/// 文章实体
/// </summary>
public class Post : IAuditable, ISoftDeletable, ITenantEntity
{
    public int Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public PostStatus Status { get; set; } = PostStatus.Draft;
    public DateTime? PublishedAt { get; set; }
    
    public int AuthorId { get; set; }
    public User Author { get; set; } = null!;
    public ICollection<Comment> Comments { get; set; } = [];

    // 审计字段
    public DateTime CreatedAt { get; set; }
    public int? CreatedBy { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public int? UpdatedBy { get; set; }
    
    // 软删除
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    
    // 多租户
    public int TenantId { get; set; }
}

/// <summary>
/// 文章状态枚举
/// </summary>
public enum PostStatus
{
    Draft,
    Published,
    Archived
}

/// <summary>
/// 审计接口
/// </summary>
public interface IAuditable
{
    DateTime CreatedAt { get; set; }
    int? CreatedBy { get; set; }
    DateTime? UpdatedAt { get; set; }
    int? UpdatedBy { get; set; }
}

/// <summary>
/// 软删除接口
/// </summary>
public interface ISoftDeletable
{
    bool IsDeleted { get; set; }
    DateTime? DeletedAt { get; set; }
}

/// <summary>
/// 多租户接口
/// </summary>
public interface ITenantEntity
{
    int TenantId { get; set; }
}
```

### 依赖注入

```csharp
using Microsoft.Extensions.DependencyInjection;

namespace MyApp.Extensions;

/// <summary>
/// 服务集合扩展
/// 
/// 封装服务注册逻辑，支持模块化配置。
/// </summary>
public static class ServiceCollectionExtensions
{
    /// <summary>
    /// 添加应用服务
    /// 
    /// 注册所有应用层服务，
    /// 使用 Scrutor 自动扫描注册。
    /// </summary>
    public static IServiceCollection AddApplicationServices(
        this IServiceCollection services)
    {
        // 自动注册所有服务
        services.Scan(scan => scan
            .FromAssemblyOf<IApplicationAssembly>()
            .AddClasses(classes => classes
                .AssignableTo<ITransientService>())
            .AsImplementedInterfaces()
            .WithTransientLifetime()
            .AddClasses(classes => classes
                .AssignableTo<IScopedService>())
            .AsImplementedInterfaces()
            .WithScopedLifetime()
            .AddClasses(classes => classes
                .AssignableTo<ISingletonService>())
            .AsImplementedInterfaces()
            .WithSingletonLifetime());

        // 注册装饰器
        services.Decorate<INotificationService, LoggingNotificationDecorator>();
        services.Decorate<INotificationService, RetryNotificationDecorator>();

        return services;
    }

    /// <summary>
    /// 添加数据库服务
    /// </summary>
    public static IServiceCollection AddDatabase(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>((sp, options) =>
        {
            var tenantService = sp.GetRequiredService<ITenantService>();
            var connectionString = configuration.GetConnectionString("DefaultConnection");
            
            options.UseNpgsql(connectionString, sqlOptions =>
            {
                sqlOptions.EnableRetryOnFailure(3);
                sqlOptions.CommandTimeout(30);
            });
        });

        services.AddScoped<ITenantService, TenantService>();
        services.AddScoped<ICurrentUserService, CurrentUserService>();

        return services;
    }

    /// <summary>
    /// 添加缓存服务
    /// </summary>
    public static IServiceCollection AddCaching(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddStackExchangeRedisCache(options =>
        {
            options.Configuration = configuration.GetConnectionString("Redis");
            options.InstanceName = "MyApp:";
        });

        services.AddSingleton<ICacheService, RedisCacheService>();
        services.Decorate<ICacheService, LocalCacheDecorator>();

        return services;
    }
}

/// <summary>
/// 服务生命周期标记接口
/// </summary>
public interface ITransientService { }
public interface IScopedService { }
public interface ISingletonService { }

/// <summary>
/// 通知服务接口
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// 发送通知
    /// </summary>
    Task SendAsync(Notification notification, CancellationToken ct = default);
}

/// <summary>
/// 通知服务实现
/// </summary>
public class NotificationService : INotificationService, ITransientService
{
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(ILogger<NotificationService> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// 发送通知
    /// </summary>
    public async Task SendAsync(Notification notification, CancellationToken ct = default)
    {
        _logger.LogInformation("发送通知: {Type} 到 {Recipient}", 
            notification.Type, notification.Recipient);
        
        // 实际发送逻辑
        await Task.Delay(100, ct);
    }
}

/// <summary>
/// 日志装饰器
/// </summary>
public class LoggingNotificationDecorator : INotificationService
{
    private readonly INotificationService _inner;
    private readonly ILogger<LoggingNotificationDecorator> _logger;

    public LoggingNotificationDecorator(
        INotificationService inner,
        ILogger<LoggingNotificationDecorator> logger)
    {
        _inner = inner;
        _logger = logger;
    }

    public async Task SendAsync(Notification notification, CancellationToken ct = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            await _inner.SendAsync(notification, ct);
            
            _logger.LogInformation(
                "通知发送成功: {Type}, 耗时: {Duration}ms",
                notification.Type,
                stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "通知发送失败: {Type}", notification.Type);
            throw;
        }
    }
}

/// <summary>
/// 重试装饰器
/// </summary>
public class RetryNotificationDecorator : INotificationService
{
    private readonly INotificationService _inner;
    private readonly ILogger<RetryNotificationDecorator> _logger;
    private const int MaxRetries = 3;

    public RetryNotificationDecorator(
        INotificationService inner,
        ILogger<RetryNotificationDecorator> logger)
    {
        _inner = inner;
        _logger = logger;
    }

    public async Task SendAsync(Notification notification, CancellationToken ct = default)
    {
        for (int i = 0; i < MaxRetries; i++)
        {
            try
            {
                await _inner.SendAsync(notification, ct);
                return;
            }
            catch (Exception ex) when (i < MaxRetries - 1)
            {
                _logger.LogWarning(
                    "通知发送失败，第 {Attempt} 次重试: {Error}",
                    i + 1,
                    ex.Message);
                
                await Task.Delay(TimeSpan.FromSeconds(Math.Pow(2, i)), ct);
            }
        }
    }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `MapGet` | GET 端点 | `app.MapGet("/api/posts", handler)` |
| `MapPost` | POST 端点 | `app.MapPost("/api/posts", handler)` |
| `MapPut` | PUT 端点 | `app.MapPut("/api/posts/{id}", handler)` |
| `MapDelete` | DELETE 端点 | `app.MapDelete("/api/posts/{id}", handler)` |
| `WithTags` | API 分组 | `.WithTags("Posts")` |
| `Produces` | 响应类型 | `.Produces<PostDto>()` |
| `RequireAuthorization` | 需要认证 | `.RequireAuthorization()` |
| `UseMiddleware` | 使用中间件 | `app.UseMiddleware<T>()` |
| `AddDbContext` | 注册 DbContext | `services.AddDbContext<AppDbContext>()` |
| `Include` | 加载关联 | `query.Include(p => p.Author)` |
| `ThenInclude` | 加载嵌套关联 | `query.Include(p => p.Comments).ThenInclude(c => c.Author)` |
| `AsNoTracking` | 禁用变更追踪 | `query.AsNoTracking()` |
| `HasQueryFilter` | 全局查询过滤 | `builder.HasQueryFilter(e => !e.IsDeleted)` |
| `AddScoped` | 作用域服务 | `services.AddScoped<IService, Service>()` |
| `AddTransient` | 瞬态服务 | `services.AddTransient<IService, Service>()` |
| `AddSingleton` | 单例服务 | `services.AddSingleton<IService, Service>()` |
| `Decorate` | 装饰器模式 | `services.Decorate<IService, Decorator>()` |
