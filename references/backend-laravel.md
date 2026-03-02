# Laravel 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Laravel/PHP 后端、Eloquent ORM、队列、事件系统、服务容器

## 核心特性

Laravel 是 PHP 最流行的 Web 框架，以优雅的语法和丰富的功能著称。

### 主要特性
- **Eloquent ORM**：优雅的 ActiveRecord 实现
- **服务容器**：强大的依赖注入容器
- **队列系统**：支持多种驱动的任务队列
- **事件系统**：观察者模式的事件广播
- **Artisan CLI**：强大的命令行工具

## 最佳实践

### Eloquent ORM

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * 文章模型
 * 
 * 使用 Eloquent ORM 进行数据库操作，
 * 支持关联关系、作用域和访问器。
 * 
 * @property int $id
 * @property string $title
 * @property string $content
 * @property int $author_id
 * @property string $status
 * @property \Carbon\Carbon $created_at
 * @property \Carbon\Carbon $updated_at
 */
class Post extends Model
{
    use SoftDeletes;
    
    /**
     * 可批量赋值的属性
     * 
     * @var array<int, string>
     */
    protected $fillable = [
        'title',
        'content',
        'author_id',
        'status',
        'published_at',
    ];
    
    /**
     * 属性类型转换
     * 
     * 自动将数据库值转换为指定类型。
     * 
     * @var array<string, string>
     */
    protected $casts = [
        'published_at' => 'datetime',
        'is_featured' => 'boolean',
        'metadata' => 'array',
    ];
    
    /**
     * 模型关联：作者
     * 
     * 定义文章与用户的一对多反向关联。
     * 
     * @return BelongsTo
     */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }
    
    /**
     * 模型关联：评论
     * 
     * 定义文章与评论的一对多关联。
     * 
     * @return HasMany
     */
    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)
            ->where('is_active', true)
            ->orderBy('created_at', 'desc');
    }
    
    /**
     * 模型关联：标签
     * 
     * 定义文章与标签的多对多关联。
     * 
     * @return \Illuminate\Database\Eloquent\Relations\BelongsToMany
     */
    public function tags()
    {
        return $this->belongsToMany(Tag::class, 'post_tags')
            ->withTimestamps();
    }
    
    /**
     * 访问器：摘要
     * 
     * 自动截取内容前 150 字符作为摘要。
     * 
     * @return string
     */
    public function getExcerptAttribute(): string
    {
        return Str::limit(strip_tags($this->content), 150);
    }
    
    /**
     * 作用域：已发布
     * 
     * 查询已发布且未删除的文章。
     * 
     * @param Builder $query 查询构建器
     * @return Builder
     */
    public function scopePublished(Builder $query): Builder
    {
        return $query->where('status', 'published')
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }
    
    /**
     * 作用域：热门文章
     * 
     * 按评论数和浏览量排序获取热门文章。
     * 
     * @param Builder $query 查询构建器
     * @param int $limit 限制数量
     * @return Builder
     */
    public function scopePopular(Builder $query, int $limit = 10): Builder
    {
        return $query->withCount('comments')
            ->orderByDesc('comments_count')
            ->orderByDesc('views')
            ->limit($limit);
    }
    
    /**
     * 作用域：搜索
     * 
     * 全文搜索标题和内容。
     * 
     * @param Builder $query 查询构建器
     * @param string $keyword 搜索关键词
     * @return Builder
     */
    public function scopeSearch(Builder $query, string $keyword): Builder
    {
        return $query->where(function ($q) use ($keyword) {
            $q->where('title', 'LIKE', "%{$keyword}%")
              ->orWhere('content', 'LIKE', "%{$keyword}%");
        });
    }
}

/**
 * 用户模型
 * 
 * 包含用户认证和授权相关功能。
 */
class User extends Model implements Authenticatable
{
    use Notifiable, HasApiTokens;
    
    /**
     * 发布文章
     * 
     * 创建并发布新文章，触发相关事件。
     * 
     * @param array $data 文章数据
     * @return Post
     */
    public function publishPost(array $data): Post
    {
        $post = $this->posts()->create([
            'title' => $data['title'],
            'content' => $data['content'],
            'status' => 'published',
            'published_at' => now(),
        ]);
        
        event(new PostPublished($post));
        
        return $post;
    }
    
    /**
     * 模型关联：文章
     * 
     * @return HasMany
     */
    public function posts(): HasMany
    {
        return $this->hasMany(Post::class, 'author_id');
    }
}
```

### 队列系统

```php
<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use App\Mail\PostNotification;
use App\Models\Post;
use App\Models\User;

/**
 * 发送文章通知任务
 * 
 * 异步发送文章发布通知邮件，
 * 支持重试和失败处理。
 * 
 * @package App\Jobs
 */
class SendPostNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    /**
     * 任务最大尝试次数
     * 
     * @var int
     */
    public $tries = 3;
    
    /**
     * 任务超时时间（秒）
     * 
     * @var int
     */
    public $timeout = 120;
    
    /**
     * 任务最大异常数
     * 
     * @var int
     */
    public $maxExceptions = 2;
    
    /**
     * 文章实例
     * 
     * @var Post
     */
    protected Post $post;
    
    /**
     * 用户ID列表
     * 
     * @var array
     */
    protected array $userIds;
    
    /**
     * 创建任务实例
     * 
     * @param Post $post 文章实例
     * @param array $userIds 目标用户ID列表
     */
    public function __construct(Post $post, array $userIds)
    {
        $this->post = $post;
        $this->userIds = $userIds;
        $this->onQueue('notifications');
    }
    
    /**
     * 执行任务
     * 
     * 批量发送通知邮件，记录发送结果。
     * 
     * @return void
     */
    public function handle(): void
    {
        $users = User::whereIn('id', $this->userIds)->get();
        
        foreach ($users as $user) {
            try {
                Mail::to($user->email)
                    ->send(new PostNotification($this->post, $user));
                
                Log::info('文章通知发送成功', [
                    'post_id' => $this->post->id,
                    'user_id' => $user->id,
                ]);
            } catch (\Exception $e) {
                Log::error('文章通知发送失败', [
                    'post_id' => $this->post->id,
                    'user_id' => $user->id,
                    'error' => $e->getMessage(),
                ]);
            }
        }
    }
    
    /**
     * 任务失败处理
     * 
     * 当任务最终失败时执行清理操作。
     * 
     * @param \Throwable $exception 异常对象
     * @return void
     */
    public function failed(\Throwable $exception): void
    {
        Log::error('文章通知任务失败', [
            'post_id' => $this->post->id,
            'error' => $exception->getMessage(),
        ]);
        
        // 发送告警通知
        Notification::route('mail', config('app.admin_email'))
            ->notify(new JobFailedNotification($this, $exception));
    }
    
    /**
     * 获取任务中间件
     * 
     * 配置速率限制和去重策略。
     * 
     * @return array
     */
    public function middleware(): array
    {
        return [
            new \App\Jobs\Middleware\RateLimited('notifications'),
            new \App\Jobs\Middleware\WithoutOverlapping($this->post->id),
        ];
    }
    
    /**
     * 确定任务唯一标识
     * 
     * 防止重复任务进入队列。
     * 
     * @return string
     */
    public function uniqueId(): string
    {
        return "post_notification_{$this->post->id}";
    }
}

/**
 * 处理视频转码任务
 * 
 * 长时间运行的任务示例，
 * 支持进度追踪和取消操作。
 */
class ProcessVideo implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    
    /**
     * 执行任务
     */
    public function handle(): void
    {
        $totalFrames = $this->getTotalFrames();
        
        for ($i = 0; $i < $totalFrames; $i++) {
            // 检查任务是否被取消
            if ($this->job->isReleased()) {
                return;
            }
            
            $this->processFrame($i);
            
            // 更新进度
            $progress = (int)(($i / $totalFrames) * 100);
            event(new VideoProcessingProgress($this->video->id, $progress));
        }
        
        event(new VideoProcessingCompleted($this->video));
    }
}
```

### 事件系统

```php
<?php

namespace App\Events;

use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use App\Models\Post;

/**
 * 文章发布事件
 * 
 * 当文章发布时触发，支持广播到前端。
 * 
 * @package App\Events
 */
class PostPublished implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets;
    
    /**
     * 文章实例
     * 
     * @var Post
     */
    public Post $post;
    
    /**
     * 创建事件实例
     * 
     * @param Post $post 已发布的文章
     */
    public function __construct(Post $post)
    {
        $this->post = $post;
    }
    
    /**
     * 获取广播频道
     * 
     * 使用 Presence Channel 支持在线状态。
     * 
     * @return \Illuminate\Broadcasting\Channel|array
     */
    public function broadcastOn()
    {
        return new PresenceChannel('posts.' . $this->post->author_id);
    }
    
    /**
     * 广播事件名称
     * 
     * 自定义广播到前端的事件名称。
     * 
     * @return string
     */
    public function broadcastAs(): string
    {
        return 'post.published';
    }
    
    /**
     * 广播数据
     * 
     * 只发送必要的数据到前端。
     * 
     * @return array
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->post->id,
            'title' => $this->post->title,
            'author' => $this->post->author->name,
            'published_at' => $this->post->published_at->toISOString(),
        ];
    }
    
    /**
     * 确定是否广播
     * 
     * 根据条件决定是否触发广播。
     * 
     * @return bool
     */
    public function broadcastWhen(): bool
    {
        return $this->post->status === 'published';
    }
}

/**
 * 文章发布监听器
 * 
 * 处理文章发布后的业务逻辑。
 */
class SendPostNotification
{
    /**
     * 处理事件
     * 
     * @param PostPublished $event 事件实例
     * @return void
     */
    public function handle(PostPublished $event): void
    {
        $post = $event->post;
        
        // 通知订阅者
        $subscribers = User::whereHas('subscriptions', function ($q) use ($post) {
            $q->where('author_id', $post->author_id);
        })->pluck('id');
        
        // 分发队列任务
        SendPostNotification::dispatch($post, $subscribers->toArray())
            ->delay(now()->addMinutes(5));
        
        // 更新统计
        Cache::increment("user.{$post->author_id}.posts_count");
    }
}

/**
 * 订阅者类
 * 
 * 在单个类中订阅多个事件。
 */
class PostEventSubscriber
{
    /**
     * 处理文章创建事件
     * 
     * @param \App\Events\PostCreated $event
     */
    public function handlePostCreated($event): void
    {
        Log::info('新文章创建', ['post_id' => $event->post->id]);
    }
    
    /**
     * 处理文章更新事件
     * 
     * @param \App\Events\PostUpdated $event
     */
    public function handlePostUpdated($event): void
    {
        Cache::forget("post.{$event->post->id}");
    }
    
    /**
     * 注册监听器
     * 
     * @param \Illuminate\Events\Dispatcher $events
     */
    public function subscribe($events): array
    {
        return [
            \App\Events\PostCreated::class => 'handlePostCreated',
            \App\Events\PostUpdated::class => 'handlePostUpdated',
            \App\Events\PostDeleted::class => 'handlePostDeleted',
        ];
    }
}
```

### 服务容器

```php
<?php

namespace App\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use App\Contracts\PaymentGatewayInterface;

/**
 * 支付服务
 * 
 * 封装支付网关操作，支持多种支付方式。
 * 通过服务容器注入具体实现。
 * 
 * @package App\Services
 */
class PaymentService
{
    /**
     * 支付网关实例
     * 
     * @var PaymentGatewayInterface
     */
    protected PaymentGatewayInterface $gateway;
    
    /**
     * 创建服务实例
     * 
     * @param PaymentGatewayInterface $gateway 支付网关
     */
    public function __construct(PaymentGatewayInterface $gateway)
    {
        $this->gateway = $gateway;
    }
    
    /**
     * 创建支付订单
     * 
     * @param array $orderData 订单数据
     * @return array 支付信息
     */
    public function createPayment(array $orderData): array
    {
        return $this->gateway->createOrder($orderData);
    }
    
    /**
     * 查询支付状态
     * 
     * @param string $orderId 订单ID
     * @return array 支付状态
     */
    public function queryPayment(string $orderId): array
    {
        return Cache::remember(
            "payment.{$orderId}",
            now()->addMinutes(5),
            fn() => $this->gateway->queryOrder($orderId)
        );
    }
}

/**
 * 服务提供者
 * 
 * 注册服务绑定和单例。
 */
class PaymentServiceProvider extends ServiceProvider
{
    /**
     * 注册服务
     * 
     * @return void
     */
    public function register(): void
    {
        // 绑定接口到实现
        $this->app->bind(
            PaymentGatewayInterface::class,
            fn($app) => match(config('payment.gateway')) {
                'alipay' => new AlipayGateway(),
                'wechat' => new WechatGateway(),
                default => new StripeGateway(),
            }
        );
        
        // 注册单例
        $this->app->singleton(PaymentService::class, function ($app) {
            return new PaymentService(
                $app->make(PaymentGatewayInterface::class)
            );
        });
        
        // 绑定上下文服务
        $this->app->when(OrderController::class)
            ->needs(PaymentGatewayInterface::class)
            ->give(function ($app) {
                return $app->make(config('payment.default_gateway'));
            });
    }
    
    /**
     * 启动服务
     * 
     * @return void
     */
    public function boot(): void
    {
        // 发布配置文件
        $this->publishes([
            __DIR__.'/../config/payment.php' => config_path('payment.php'),
        ]);
    }
}

/**
 * 可队列的服务
 * 
 * 服务类也可以实现队列接口。
 */
class ReportGenerator implements ShouldQueue
{
    use InteractsWithQueue;
    
    /**
     * 生成报告
     * 
     * @param array $params 参数
     * @return string 报告路径
     */
    public function generate(array $params): string
    {
        // 长时间运行的报告生成逻辑
        $data = $this->collectData($params);
        $report = $this->formatReport($data);
        
        return $this->store($report);
    }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `hasMany` | 一对多关联 | `return $this->hasMany(Comment::class)` |
| `belongsTo` | 反向关联 | `return $this->belongsTo(User::class)` |
| `belongsToMany` | 多对多关联 | `return $this->belongsToMany(Tag::class)` |
| `scopeXxx` | 查询作用域 | `public function scopePublished($query)` |
| `getXxxAttribute` | 访问器 | `public function getExcerptAttribute()` |
| `setXxxAttribute` | 修改器 | `public function setPasswordAttribute($value)` |
| `dispatch` | 分发队列任务 | `SendEmail::dispatch($user)` |
| `ShouldQueue` | 队列任务接口 | `class Job implements ShouldQueue` |
| `ShouldBroadcast` | 广播事件接口 | `class Event implements ShouldBroadcast` |
| `event()` | 触发事件 | `event(new PostPublished($post))` |
| `listen` | 监听事件 | `Event::listen(PostPublished::class, Listener::class)` |
| `singleton` | 注册单例 | `$app->singleton(Service::class, ...)` |
| `bind` | 绑定服务 | `$app->bind(Interface::class, Implementation::class)` |
| `make` | 解析服务 | `$app->make(Service::class)` |
