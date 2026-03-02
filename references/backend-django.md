# Django 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Django/DRF 相关开发、Python Web 后端、ORM 优化、异步视图

## 核心特性

Django 是 Python 全栈 Web 框架，以"开箱即用"和"快速开发"著称。Django REST Framework (DRF) 扩展了 Django 的 API 能力。

### 主要特性
- **MTV 架构**：Model-Template-View 分层设计
- **ORM**：强大的数据库抽象层
- **Admin**：自动生成管理后台
- **DRF**：RESTful API 快速开发
- **异步支持**：Django 4.1+ 原生异步视图

## 最佳实践

### DRF 序列化器

```python
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    """
    用户序列化器
    
    用于用户数据的序列化和反序列化处理，
    包含用户基本信息和关联数据。
    
    Attributes:
        full_name: 用户全名，由 first_name 和 last_name 组合
        posts_count: 用户发布的文章数量
    """
    
    full_name = serializers.SerializerMethodField()
    posts_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'full_name', 'posts_count', 'created_at']
        read_only_fields = ['id', 'created_at']
    
    def get_full_name(self, obj):
        """
        获取用户全名
        
        Args:
            obj: User 实例
            
        Returns:
            str: 组合后的用户全名，若无则返回用户名
        """
        return f"{obj.first_name} {obj.last_name}".strip() or obj.username


class PostSerializer(serializers.ModelSerializer):
    """
    文章序列化器
    
    处理文章的 CRUD 操作，支持嵌套用户信息。
    包含验证逻辑防止发布重复标题。
    """
    
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='author',
        write_only=True
    )
    
    class Meta:
        model = Post
        fields = '__all__'
    
    def validate_title(self, value):
        """
        验证文章标题
        
        Args:
            value: 待验证的标题字符串
            
        Returns:
            str: 验证通过的标题
            
        Raises:
            ValidationError: 标题已存在时抛出
        """
        if Post.objects.filter(title=value).exists():
            raise serializers.ValidationError("该标题已存在")
        return value
```

### 异步视图

```python
from django.http import JsonResponse
from django.views import View
import asyncio
import aiohttp

class AsyncDataView(View):
    """
    异步数据获取视图
    
    使用 Django 4.1+ 异步视图特性，
    并发请求多个外部 API 并聚合结果。
    
    适用于需要调用多个外部服务的场景，
    可显著减少响应时间。
    """
    
    async def get(self, request):
        """
        异步 GET 请求处理
        
        Args:
            request: Django HttpRequest 对象
            
        Returns:
            JsonResponse: 包含聚合数据的 JSON 响应
        """
        urls = [
            'https://api.example.com/users',
            'https://api.example.com/posts',
            'https://api.example.com/comments'
        ]
        
        results = await self.fetch_all(urls)
        return JsonResponse({
            'status': 'success',
            'data': results
        })
    
    async def fetch_all(self, urls):
        """
        并发获取多个 URL 数据
        
        Args:
            urls: 需要请求的 URL 列表
            
        Returns:
            list: 各 URL 返回的数据列表
        """
        async with aiohttp.ClientSession() as session:
            tasks = [self.fetch_single(session, url) for url in urls]
            return await asyncio.gather(*tasks)
    
    async def fetch_single(self, session, url):
        """
        获取单个 URL 数据
        
        Args:
            session: aiohttp 会话对象
            url: 请求 URL
            
        Returns:
            dict: JSON 响应数据
        """
        async with session.get(url) as response:
            return await response.json()
```

### ORM 优化

```python
from django.db import models
from django.db.models import Prefetch, Count, Q

class PostQuerySet(models.QuerySet):
    """
    文章自定义查询集
    
    封装常用查询逻辑，优化数据库访问性能。
    支持链式调用和查询复用。
    """
    
    def published(self):
        """
        获取已发布文章
        
        Returns:
            QuerySet: 已发布且未被删除的文章
        """
        return self.filter(
            status='published',
            deleted_at__isnull=True
        )
    
    def with_author(self):
        """
        预加载作者信息
        
        使用 select_related 优化一对一/外键关联查询，
        避免 N+1 查询问题。
        
        Returns:
            QuerySet: 包含预加载作者的查询集
        """
        return self.select_related('author')
    
    def with_comments(self):
        """
        预加载评论信息
        
        使用 prefetch_related 优化多对多/反向关联查询，
        配合 Prefetch 对象实现更精细的控制。
        
        Returns:
            QuerySet: 包含预加载评论的查询集
        """
        return self.prefetch_related(
            Prefetch(
                'comments',
                queryset=Comment.objects.filter(is_active=True)
            )
        )
    
    def annotate_stats(self):
        """
        添加统计注解
        
        使用聚合函数添加统计数据，
        在单次查询中获取关联数据统计。
        
        Returns:
            QuerySet: 包含统计字段的查询集
        """
        return self.annotate(
            comments_count=Count('comments'),
            likes_count=Count('likes')
        )

class Post(models.Model):
    """文章模型"""
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    status = models.CharField(max_length=20, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    
    objects = PostQuerySet.as_manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['author', 'status']),
        ]


def get_posts_optimized():
    """
    获取优化后的文章列表
    
    演示 ORM 优化的最佳实践：
    1. 使用 select_related 预加载外键
    2. 使用 prefetch_related 预加载多对多
    3. 使用 only/defer 控制字段
    4. 使用批量操作减少查询
    
    Returns:
        QuerySet: 优化后的文章查询集
    """
    return Post.objects.published() \
        .with_author() \
        .with_comments() \
        .annotate_stats() \
        .only('title', 'content', 'author__username', 'created_at')
```

### 中间件

```python
from django.http import HttpRequest, HttpResponse
import time
import logging

logger = logging.getLogger(__name__)

class RequestTimingMiddleware:
    """
    请求计时中间件
    
    记录每个请求的处理时间，
    用于性能监控和问题排查。
    
    使用 __init__ 和 __call__ 模式，
    确保中间件可配置且可复用。
    """
    
    def __init__(self, get_response):
        """
        初始化中间件
        
        Args:
            get_response: 下一个中间件或视图的调用函数
        """
        self.get_response = get_response
    
    def __call__(self, request):
        """
        处理请求
        
        Args:
            request: Django HttpRequest 对象
            
        Returns:
            HttpResponse: 处理后的响应
        """
        start_time = time.time()
        
        response = self.get_response(request)
        
        duration = time.time() - start_time
        response['X-Request-Duration'] = f"{duration:.3f}s"
        
        if duration > 1.0:
            logger.warning(
                f"慢请求: {request.path} 耗时 {duration:.3f}s"
            )
        
        return response


class ExceptionHandlerMiddleware:
    """
    异常处理中间件
    
    统一捕获和处理异常，
    返回标准化的错误响应。
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        return self.get_response(request)
    
    def process_exception(self, request, exception):
        """
        处理异常
        
        Args:
            request: Django HttpRequest 对象
            exception: 捕获的异常对象
            
        Returns:
            JsonResponse: 标准化的错误响应
        """
        logger.exception(f"请求异常: {request.path}")
        
        from django.http import JsonResponse
        
        return JsonResponse({
            'error': {
                'type': exception.__class__.__name__,
                'message': str(exception)
            }
        }, status=500)
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `select_related` | 预加载外键/一对一关联 | `Post.objects.select_related('author')` |
| `prefetch_related` | 预加载多对多/反向关联 | `User.objects.prefetch_related('posts')` |
| `annotate` | 添加聚合字段 | `Post.objects.annotate(count=Count('comments'))` |
| `only` | 只查询指定字段 | `Post.objects.only('title', 'content')` |
| `defer` | 排除指定字段 | `Post.objects.defer('large_content')` |
| `bulk_create` | 批量创建 | `Post.objects.bulk_create(posts_list)` |
| `bulk_update` | 批量更新 | `Post.objects.bulk_update(posts, ['status'])` |
| `F` 表达式 | 字段级原子操作 | `Post.objects.update(views=F('views') + 1)` |
| `atomic` | 事务控制 | `with transaction.atomic(): ...` |
| `async def get` | 异步视图 | `async def get(self, request): ...` |
| `SerializerMethodField` | 自定义序列化字段 | `field = serializers.SerializerMethodField()` |
| `APIView` | DRF 基础视图类 | `class MyView(APIView): ...` |
| `ModelViewSet` | DRF 完整 CRUD 视图集 | `class PostViewSet(ModelViewSet): ...` |
