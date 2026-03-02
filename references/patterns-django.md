# Django 开发模式参考

Django 框架核心模式、安全实践、TDD 流程和验证策略，用于构建安全、可维护的 Django 应用程序。

## When to Activate

- 编写新的 Django 项目或应用
- 设计 Django 模型、视图、序列化器
- 实现安全认证和授权
- 编写 Django 测试用例
- 审查 Django 代码安全性

## Core Principles

### 1. MTV 架构模式

Django 采用 Model-Template-View 分层架构，职责分离清晰。

```
┌─────────────────────────────────────────────────────────┐
│                      URL Dispatcher                      │
│                    (urls.py - 路由分发)                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                         View                             │
│              (views.py - 业务逻辑处理)                    │
│    ┌─────────────┐    ┌─────────────┐                   │
│    │  Form验证   │    │ Serializer  │                   │
│    └─────────────┘    └─────────────┘                   │
└─────────────────────────────────────────────────────────┘
                            │
          ┌─────────────────┼─────────────────┐
          ▼                 ▼                 ▼
┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
│      Model       │ │   Template   │ │  Serializer/JSON │
│  (models.py)     │ │ (.html文件)   │ │    (DRF)         │
│   数据访问层      │ │   展示层      │ │   API响应层      │
└──────────────────┘ └──────────────┘ └──────────────────┘
          │
          ▼
┌──────────────────┐
│    Database      │
│     数据库        │
└──────────────────┘
```

### 2. Apps 模块化设计

```python
from django.apps import AppConfig

class BlogConfig(AppConfig):
    """
    博客应用配置
    
    定义应用的元数据和启动行为，
    遵循 Django 应用模块化设计原则。
    """
    
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'blog'
    verbose_name = '博客管理'
    
    def ready(self):
        """
        应用启动时执行
        
        用于导入信号处理程序和初始化逻辑。
        """
        import blog.signals
```

**标准 Django 项目结构：**

```
myproject/
├── config/
│   ├── __init__.py
│   ├── settings/
│   │   ├── __init__.py
│   │   ├── base.py
│   │   ├── development.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── apps/
│   ├── users/
│   │   ├── __init__.py
│   │   ├── apps.py
│   │   ├── models.py
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── urls.py
│   │   └── tests/
│   │       ├── __init__.py
│   │       ├── test_models.py
│   │       └── test_views.py
│   └── blog/
│       └── ...
├── templates/
├── static/
├── manage.py
└── requirements/
    ├── base.txt
    ├── development.txt
    └── production.txt
```

### 3. Middleware 中间件模式

```python
from django.http import HttpRequest, HttpResponse
from django.utils.deprecation import MiddlewareMixin
import time
import logging
import json

logger = logging.getLogger(__name__)


class RequestTimingMiddleware:
    """
    请求计时中间件
    
    记录每个请求的处理时间，用于性能监控。
    使用 __init__ 和 __call__ 模式实现。
    """
    
    def __init__(self, get_response):
        """
        初始化中间件
        
        Args:
            get_response: 下一个中间件或视图的调用函数
        """
        self.get_response = get_response
    
    def __call__(self, request: HttpRequest) -> HttpResponse:
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


class SecurityHeadersMiddleware(MiddlewareMixin):
    """
    安全响应头中间件
    
    添加安全相关的 HTTP 响应头，
    防止常见的 Web 安全攻击。
    """
    
    def process_response(
        self, 
        request: HttpRequest, 
        response: HttpResponse
    ) -> HttpResponse:
        """
        处理响应，添加安全头
        
        Args:
            request: HTTP 请求对象
            response: HTTP 响应对象
            
        Returns:
            添加安全头后的响应对象
        """
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        if not response.get('Content-Security-Policy'):
            response['Content-Security-Policy'] = "default-src 'self'"
        
        return response


class ExceptionHandlerMiddleware(MiddlewareMixin):
    """
    异常处理中间件
    
    统一捕获和处理异常，返回标准化的错误响应。
    """
    
    def process_exception(self, request, exception):
        """
        处理异常
        
        Args:
            request: HTTP 请求对象
            exception: 捕获的异常对象
            
        Returns:
            JsonResponse: 标准化的错误响应
        """
        from django.http import JsonResponse
        
        logger.exception(f"请求异常: {request.path}")
        
        status_code = getattr(exception, 'status_code', 500)
        
        return JsonResponse({
            'error': {
                'type': exception.__class__.__name__,
                'message': str(exception)
            }
        }, status=status_code)
```

## Security Patterns

### 1. CSRF 防护

Django 内置 CSRF 防护，确保所有 POST/PUT/DELETE 请求携带 CSRF Token。

```python
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse


@method_decorator(csrf_protect, name='dispatch')
class SecureFormView(View):
    """
    安全表单视图
    
    使用 Django 内置 CSRF 防护，
    确保表单提交的安全性。
    """
    
    def post(self, request):
        """
        处理 POST 请求
        
        Args:
            request: HTTP 请求对象
            
        Returns:
            JsonResponse: 处理结果
        """
        data = request.POST
        return JsonResponse({'status': 'success', 'data': dict(data)})


@ensure_csrf_cookie
def get_csrf_token(request):
    """
    获取 CSRF Token
    
    确保 CSRF Cookie 已设置，
    用于前后端分离架构。
    
    Args:
        request: HTTP 请求对象
        
    Returns:
        JsonResponse: 包含 CSRF Token 的响应
    """
    from django.middleware.csrf import get_token
    
    return JsonResponse({
        'csrfToken': get_token(request)
    })
```

**前端 CSRF 集成：**

```javascript
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

const csrftoken = getCookie('csrftoken');

fetch('/api/endpoint/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrftoken
    },
    body: JSON.stringify(data)
});
```

### 2. XSS 防护

```python
from django.utils.html import escape, strip_tags
from django.utils.safestring import mark_safe
from django import forms
import bleach


class XSSProtectionMixin:
    """
    XSS 防护混入类
    
    提供输入净化和输出编码功能。
    """
    
    ALLOWED_TAGS = ['b', 'i', 'em', 'strong', 'a', 'p', 'br']
    ALLOWED_ATTRIBUTES = {'a': ['href', 'title']}
    
    @classmethod
    def sanitize_html(cls, content: str) -> str:
        """
        净化 HTML 内容
        
        Args:
            content: 原始 HTML 内容
            
        Returns:
            str: 净化后的安全 HTML
        """
        return bleach.clean(
            content,
            tags=cls.ALLOWED_TAGS,
            attributes=cls.ALLOWED_ATTRIBUTES,
            strip=True
        )
    
    @classmethod
    def escape_output(cls, text: str) -> str:
        """
        转义输出内容
        
        Args:
            text: 原始文本
            
        Returns:
            str: 转义后的安全文本
        """
        return escape(text)


class SafeContentForm(forms.Form, XSSProtectionMixin):
    """
    安全内容表单
    
    自动净化用户输入的 HTML 内容。
    """
    
    title = forms.CharField(max_length=200)
    content = forms.CharField(widget=forms.Textarea)
    
    def clean_content(self):
        """
        验证并净化内容字段
        
        Returns:
            str: 净化后的内容
        """
        content = self.cleaned_data['content']
        return self.sanitize_html(content)


class Comment(models.Model):
    """
    评论模型
    
    存储用户评论，自动净化内容。
    """
    
    user = models.ForeignKey(
        'auth.User', 
        on_delete=models.CASCADE,
        related_name='comments'
    )
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    def save(self, *args, **kwargs):
        """
        保存前净化内容
        """
        self.content = XSSProtectionMixin.sanitize_html(self.content)
        super().save(*args, **kwargs)
    
    def get_safe_content(self):
        """
        获取安全的内容（已标记为安全）
        
        Returns:
            SafeString: 标记为安全的 HTML
        """
        return mark_safe(self.content)
```

### 3. SQL 注入防护

Django ORM 自动防护 SQL 注入，但需注意原始 SQL 查询。

```python
from django.db import models, connection
from django.db.models import Q, F, Count
from typing import Optional, List


class ArticleQuerySet(models.QuerySet):
    """
    文章自定义查询集
    
    封装安全查询方法，避免 SQL 注入风险。
    """
    
    def search(self, keyword: str):
        """
        安全搜索文章
        
        使用 ORM 查询，自动防护 SQL 注入。
        
        Args:
            keyword: 搜索关键词
            
        Returns:
            QuerySet: 匹配的文章
        """
        return self.filter(
            Q(title__icontains=keyword) | 
            Q(content__icontains=keyword)
        )
    
    def published(self):
        """
        获取已发布文章
        
        Returns:
            QuerySet: 已发布文章
        """
        return self.filter(status='published', deleted_at__isnull=True)
    
    def with_author(self):
        """
        预加载作者信息
        
        使用 select_related 优化查询。
        
        Returns:
            QuerySet: 包含预加载作者的查询集
        """
        return self.select_related('author')
    
    def with_stats(self):
        """
        添加统计注解
        
        Returns:
            QuerySet: 包含统计字段的查询集
        """
        return self.annotate(
            comments_count=Count('comments'),
            likes_count=Count('likes')
        )


class Article(models.Model):
    """
    文章模型
    
    演示安全的数据库操作模式。
    """
    
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('published', '已发布'),
        ('archived', '已归档'),
    ]
    
    title = models.CharField(max_length=200)
    content = models.TextField()
    author = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='articles'
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    objects = ArticleQuerySet.as_manager()
    
    class Meta:
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['author', 'status']),
        ]


class SafeRawQuery:
    """
    安全原始查询工具类
    
    使用参数化查询防止 SQL 注入。
    """
    
    @staticmethod
    def search_articles_by_tag(tag_name: str) -> List[dict]:
        """
        按标签搜索文章（原始 SQL 示例）
        
        使用参数化查询确保安全。
        
        Args:
            tag_name: 标签名称
            
        Returns:
            List[dict]: 文章列表
        """
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT a.id, a.title, a.content 
                FROM articles_article a
                JOIN articles_articletags at ON a.id = at.article_id
                JOIN articles_tag t ON at.tag_id = t.id
                WHERE t.name = %s AND a.status = %s
                """,
                [tag_name, 'published']
            )
            columns = [col[0] for col in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    @staticmethod
    def get_user_statistics(user_id: int) -> Optional[dict]:
        """
        获取用户统计信息
        
        Args:
            user_id: 用户 ID
            
        Returns:
            Optional[dict]: 统计信息
        """
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT 
                    COUNT(*) as article_count,
                    AVG(views) as avg_views
                FROM articles_article
                WHERE author_id = %s
                """,
                [user_id]
            )
            row = cursor.fetchone()
            if row:
                return {
                    'article_count': row[0],
                    'avg_views': float(row[1]) if row[1] else 0
                }
            return None
```

### 4. 认证与授权

```python
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required, permission_required
from django.utils.decorators import method_decorator
from django.views import View
from django.http import JsonResponse
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, BasePermission
from rest_framework_simplejwt.authentication import JWTAuthentication
import logging

logger = logging.getLogger(__name__)


class IsOwnerOrAdmin(BasePermission):
    """
    自定义权限类
    
    仅允许对象所有者或管理员访问。
    """
    
    def has_object_permission(self, request, view, obj):
        """
        检查对象级别权限
        
        Args:
            request: 请求对象
            view: 视图对象
            obj: 目标对象
            
        Returns:
            bool: 是否有权限
        """
        if request.user.is_staff or request.user.is_superuser:
            return True
        
        return getattr(obj, 'author', None) == request.user


@method_decorator(login_required, name='dispatch')
class ProfileView(View):
    """
    用户资料视图
    
    需要用户登录才能访问。
    """
    
    def get(self, request):
        """
        获取用户资料
        
        Args:
            request: HTTP 请求对象
            
        Returns:
            JsonResponse: 用户资料
        """
        user = request.user
        return JsonResponse({
            'id': user.id,
            'username': user.username,
            'email': user.email,
            'date_joined': user.date_joined.isoformat()
        })


class ArticleAPIView(APIView):
    """
    文章 API 视图
    
    使用 JWT 认证和自定义权限。
    """
    
    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    
    def get(self, request, pk=None):
        """
        获取文章列表或详情
        
        Args:
            request: DRF 请求对象
            pk: 文章 ID（可选）
            
        Returns:
            Response: 文章数据
        """
        if pk:
            article = Article.objects.get(pk=pk)
            serializer = ArticleSerializer(article)
        else:
            articles = Article.objects.published().with_author()
            serializer = ArticleSerializer(articles, many=True)
        return Response(serializer.data)
    
    def post(self, request):
        """
        创建文章
        
        Args:
            request: DRF 请求对象
            
        Returns:
            Response: 创建结果
        """
        serializer = ArticleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(author=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def put(self, request, pk):
        """
        更新文章
        
        Args:
            request: DRF 请求对象
            pk: 文章 ID
            
        Returns:
            Response: 更新结果
        """
        article = Article.objects.get(pk=pk)
        self.check_object_permissions(request, article)
        
        serializer = ArticleSerializer(article, data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)
    
    def delete(self, request, pk):
        """
        删除文章
        
        Args:
            request: DRF 请求对象
            pk: 文章 ID
            
        Returns:
            Response: 删除结果
        """
        article = Article.objects.get(pk=pk)
        self.check_object_permissions(request, article)
        article.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
```

## TDD Flow

### TDD 三大铁律

1. **铁律一**：除非是为了让失败的测试通过，否则不写任何生产代码
2. **铁律二**：只编写刚好能失败的最小测试
3. **铁律三**：只编写刚好能使测试通过的最小代码

### RED-GREEN-REFACTOR 循环

```python
from django.test import TestCase, Client
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model

User = get_user_model()


class ArticleTDDExample(APITestCase):
    """
    文章 API TDD 示例
    
    演示完整的 RED-GREEN-REFACTOR 循环。
    """
    
    def setUp(self):
        """
        测试前置设置
        """
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client = APIClient()
    
    # ========== 第一轮：创建文章 ==========
    
    def test_red_create_article_without_auth(self):
        """
        [RED] 测试未认证用户无法创建文章
        
        预期：返回 401 未授权
        """
        response = self.client.post('/api/articles/', {
            'title': 'Test Article',
            'content': 'Test Content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_green_create_article_with_auth(self):
        """
        [GREEN] 测试认证用户可以创建文章
        
        预期：返回 201 创建成功
        """
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post('/api/articles/', {
            'title': 'Test Article',
            'content': 'Test Content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['title'], 'Test Article')
        self.assertEqual(response.data['author']['username'], 'testuser')
    
    # ========== 第二轮：验证逻辑 ==========
    
    def test_red_create_article_without_title(self):
        """
        [RED] 测试缺少标题时创建失败
        
        预期：返回 400 验证错误
        """
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post('/api/articles/', {
            'content': 'Test Content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)
    
    def test_green_create_article_with_valid_data(self):
        """
        [GREEN] 测试有效数据创建成功
        
        预期：返回 201 创建成功
        """
        self.client.force_authenticate(user=self.user)
        
        response = self.client.post('/api/articles/', {
            'title': 'Valid Title',
            'content': 'Valid Content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Article.objects.count(), 1)
    
    # ========== 第三轮：权限检查 ==========
    
    def test_red_update_other_user_article(self):
        """
        [RED] 测试更新他人文章失败
        
        预期：返回 403 禁止访问
        """
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='otherpass123'
        )
        
        article = Article.objects.create(
            title='Other Article',
            content='Other Content',
            author=other_user
        )
        
        self.client.force_authenticate(user=self.user)
        
        response = self.client.put(f'/api/articles/{article.id}/', {
            'title': 'Updated Title',
            'content': 'Updated Content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_green_update_own_article(self):
        """
        [GREEN] 测试更新自己的文章成功
        
        预期：返回 200 更新成功
        """
        article = Article.objects.create(
            title='My Article',
            content='My Content',
            author=self.user
        )
        
        self.client.force_authenticate(user=self.user)
        
        response = self.client.put(f'/api/articles/{article.id}/', {
            'title': 'Updated Title',
            'content': 'Updated Content'
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Updated Title')


class ModelTDDExample(TestCase):
    """
    模型 TDD 示例
    """
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            password='testpass123'
        )
    
    def test_red_article_slug_auto_generate(self):
        """
        [RED] 测试文章 slug 自动生成
        
        预期：保存时自动生成 slug
        """
        article = Article.objects.create(
            title='Test Article Title',
            content='Content',
            author=self.user
        )
        
        self.assertEqual(article.slug, 'test-article-title')
    
    def test_red_article_unique_slug(self):
        """
        [RED] 测试文章 slug 唯一性
        
        预期：重复标题生成唯一 slug
        """
        Article.objects.create(
            title='Duplicate Title',
            content='Content 1',
            author=self.user
        )
        
        article2 = Article.objects.create(
            title='Duplicate Title',
            content='Content 2',
            author=self.user
        )
        
        self.assertNotEqual(article2.slug, 'duplicate-title')
        self.assertTrue(article2.slug.startswith('duplicate-title'))
```

### TDD 验证清单

在声称任何代码完成之前：

- [ ] 每个生产函数都有对应的测试
- [ ] 每个测试都在实现之前编写
- [ ] 每个测试都观察到失败
- [ ] 测试验证行为而非实现
- [ ] 重构保持所有测试通过
- [ ] 没有测试就不存在生产代码

## Validation Strategies

### 1. Serializer 验证

```python
from rest_framework import serializers
from django.core.validators import RegexValidator
from django.contrib.auth.password_validation import validate_password


class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    用户注册序列化器
    
    演示完整的验证策略。
    """
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)
    email = serializers.EmailField()
    phone = serializers.CharField(
        required=False,
        validators=[
            RegexValidator(
                regex=r'^1[3-9]\d{9}$',
                message='请输入有效的手机号码'
            )
        ]
    )
    
    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password_confirm', 'phone']
    
    def validate_username(self, value):
        """
        验证用户名
        
        Args:
            value: 用户名
            
        Returns:
            str: 验证通过的用户名
            
        Raises:
            ValidationError: 用户名已存在或格式错误
        """
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('用户名已存在')
        
        if not value.isalnum():
            raise serializers.ValidationError('用户名只能包含字母和数字')
        
        return value
    
    def validate_email(self, value):
        """
        验证邮箱
        
        Args:
            value: 邮箱地址
            
        Returns:
            str: 验证通过的邮箱
            
        Raises:
            ValidationError: 邮箱已存在
        """
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('邮箱已被注册')
        
        return value.lower()
    
    def validate_password(self, value):
        """
        验证密码强度
        
        Args:
            value: 密码
            
        Returns:
            str: 验证通过的密码
            
        Raises:
            ValidationError: 密码不符合要求
        """
        validate_password(value)
        return value
    
    def validate(self, attrs):
        """
        对象级别验证
        
        Args:
            attrs: 所有字段值
            
        Returns:
            dict: 验证通过的字段
            
        Raises:
            ValidationError: 验证失败
        """
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': '两次密码输入不一致'
            })
        
        return attrs
    
    def create(self, validated_data):
        """
        创建用户
        
        Args:
            validated_data: 验证通过的数据
            
        Returns:
            User: 新创建的用户
        """
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        
        user = User.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class ArticleSerializer(serializers.ModelSerializer):
    """
    文章序列化器
    
    包含字段验证和自定义验证逻辑。
    """
    
    author = UserSerializer(read_only=True)
    author_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='author',
        write_only=True
    )
    tags = serializers.SlugRelatedField(
        many=True,
        slug_field='name',
        queryset=Tag.objects.all(),
        required=False
    )
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'content', 'author', 'author_id',
            'status', 'tags', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_title(self, value):
        """
        验证标题
        
        Args:
            value: 标题
            
        Returns:
            str: 验证通过的标题
        """
        if len(value) < 5:
            raise serializers.ValidationError('标题至少需要 5 个字符')
        
        if len(value) > 200:
            raise serializers.ValidationError('标题不能超过 200 个字符')
        
        return value
    
    def validate_content(self, value):
        """
        验证内容
        
        Args:
            value: 内容
            
        Returns:
            str: 净化后的内容
        """
        return XSSProtectionMixin.sanitize_html(value)
    
    def validate(self, attrs):
        """
        对象级别验证
        
        确保发布状态的文章有足够内容。
        """
        if attrs.get('status') == 'published':
            content = attrs.get('content', '')
            if len(content) < 50:
                raise serializers.ValidationError({
                    'content': '发布文章内容至少需要 50 个字符'
                })
        
        return attrs
```

### 2. Form 验证

```python
from django import forms
from django.core.exceptions import ValidationError


class ContactForm(forms.Form):
    """
    联系表单
    
    演示表单验证模式。
    """
    
    name = forms.CharField(max_length=100, min_length=2)
    email = forms.EmailField()
    subject = forms.CharField(max_length=200)
    message = forms.CharField(widget=forms.Textarea, min_length=10)
    
    def clean_name(self):
        """
        验证姓名
        
        Returns:
            str: 验证通过的姓名
        """
        name = self.cleaned_data['name']
        
        if not name.replace(' ', '').isalpha():
            raise ValidationError('姓名只能包含字母')
        
        return name.strip()
    
    def clean_message(self):
        """
        验证消息
        
        Returns:
            str: 净化后的消息
        """
        message = self.cleaned_data['message']
        return XSSProtectionMixin.sanitize_html(message)
    
    def clean(self):
        """
        整体验证
        """
        cleaned_data = super().clean()
        
        subject = cleaned_data.get('subject')
        message = cleaned_data.get('message')
        
        if subject and message and subject.lower() in message.lower():
            raise ValidationError('消息内容不应包含主题')
        
        return cleaned_data
```

### 3. Model 验证

```python
from django.core.exceptions import ValidationError
from django.utils import timezone


class Event(models.Model):
    """
    活动模型
    
    演示模型级别验证。
    """
    
    title = models.CharField(max_length=200)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    max_participants = models.PositiveIntegerField(default=100)
    created_by = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='events'
    )
    
    def clean(self):
        """
        模型级别验证
        
        在 save() 之前调用。
        """
        if self.start_time and self.end_time:
            if self.start_time >= self.end_time:
                raise ValidationError({
                    'end_time': '结束时间必须晚于开始时间'
                })
            
            if self.start_time < timezone.now():
                raise ValidationError({
                    'start_time': '开始时间不能早于当前时间'
                })
    
    def save(self, *args, **kwargs):
        """
        保存前执行验证
        """
        self.full_clean()
        super().save(*args, **kwargs)
```

## Complete Django Example

### 完整的博客 API 示例

```python
# models.py
from django.db import models
from django.contrib.auth import get_user_model
from django.utils.text import slugify

User = get_user_model()


class Tag(models.Model):
    """
    标签模型
    """
    
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Article(models.Model):
    """
    文章模型
    """
    
    STATUS_CHOICES = [
        ('draft', '草稿'),
        ('published', '已发布'),
    ]
    
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=200, unique=True, blank=True)
    content = models.TextField()
    excerpt = models.TextField(max_length=300, blank=True)
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='articles'
    )
    tags = models.ManyToManyField(Tag, blank=True, related_name='articles')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    views = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['author', 'status']),
        ]
    
    def save(self, *args, **kwargs):
        if not self.slug:
            base_slug = slugify(self.title)
            slug = base_slug
            counter = 1
            while Article.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        
        if not self.excerpt and self.content:
            self.excerpt = self.content[:297] + '...'
        
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.title


class Comment(models.Model):
    """
    评论模型
    """
    
    article = models.ForeignKey(
        Article,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    content = models.TextField(max_length=1000)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='replies'
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['created_at']
    
    def __str__(self):
        return f'{self.author.username}: {self.content[:50]}'


# serializers.py
from rest_framework import serializers


class TagSerializer(serializers.ModelSerializer):
    """
    标签序列化器
    """
    
    article_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Tag
        fields = ['id', 'name', 'slug', 'article_count']


class CommentSerializer(serializers.ModelSerializer):
    """
    评论序列化器
    """
    
    author_name = serializers.CharField(source='author.username', read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = Comment
        fields = [
            'id', 'article', 'author', 'author_name',
            'content', 'parent', 'replies', 'created_at'
        ]
        read_only_fields = ['author', 'created_at']
    
    def get_replies(self, obj):
        """
        获取回复列表
        """
        if obj.replies.exists():
            return CommentSerializer(
                obj.replies.filter(is_active=True),
                many=True
            ).data
        return []
    
    def validate_content(self, value):
        """
        验证评论内容
        """
        return XSSProtectionMixin.sanitize_html(value)


class ArticleSerializer(serializers.ModelSerializer):
    """
    文章序列化器
    """
    
    author_name = serializers.CharField(source='author.username', read_only=True)
    tags = TagSerializer(many=True, read_only=True)
    tag_ids = serializers.PrimaryKeyRelatedField(
        queryset=Tag.objects.all(),
        many=True,
        write_only=True,
        source='tags',
        required=False
    )
    comments_count = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Article
        fields = [
            'id', 'title', 'slug', 'content', 'excerpt',
            'author', 'author_name', 'tags', 'tag_ids',
            'status', 'views', 'comments_count',
            'created_at', 'updated_at', 'published_at'
        ]
        read_only_fields = ['slug', 'views', 'created_at', 'updated_at', 'published_at']


# views.py
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from django.utils import timezone
from django.db.models import Count


class ArticleViewSet(viewsets.ModelViewSet):
    """
    文章视图集
    
    提供文章的 CRUD 操作和自定义操作。
    """
    
    queryset = Article.objects.select_related('author').prefetch_related('tags')
    serializer_class = ArticleSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    
    def get_queryset(self):
        """
        根据请求类型过滤查询集
        """
        queryset = super().get_queryset()
        
        if self.action == 'list':
            queryset = queryset.filter(status='published')
        
        queryset = queryset.annotate(
            comments_count=Count('comments')
        )
        
        return queryset
    
    def perform_create(self, serializer):
        """
        创建文章时设置作者
        """
        serializer.save(author=self.request.user)
    
    def perform_update(self, serializer):
        """
        更新文章时检查权限
        """
        if serializer.instance.author != self.request.user:
            return Response(
                {'detail': '您没有权限修改此文章'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def publish(self, request, slug=None):
        """
        发布文章
        """
        article = self.get_object()
        
        if article.author != request.user:
            return Response(
                {'detail': '您没有权限发布此文章'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        article.status = 'published'
        article.published_at = timezone.now()
        article.save()
        
        return Response({'status': 'published'})
    
    @action(detail=True, methods=['post'])
    def increment_view(self, request, slug=None):
        """
        增加浏览量
        """
        article = self.get_object()
        article.views = models.F('views') + 1
        article.save(update_fields=['views'])
        
        return Response({'views': article.views + 1})


class CommentViewSet(viewsets.ModelViewSet):
    """
    评论视图集
    """
    
    queryset = Comment.objects.select_related('author', 'article')
    serializer_class = CommentSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    
    def get_queryset(self):
        """
        过滤评论
        """
        queryset = super().get_queryset()
        
        article_slug = self.request.query_params.get('article')
        if article_slug:
            queryset = queryset.filter(article__slug=article_slug)
        
        return queryset.filter(is_active=True)
    
    def perform_create(self, serializer):
        """
        创建评论时设置作者
        """
        serializer.save(author=self.request.user)


# urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter

router = DefaultRouter()
router.register('articles', ArticleViewSet)
router.register('comments', CommentViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
```

## Security Checklist

### Django 安全检查清单

| 类别 | 检查项 | 操作 |
|------|--------|------|
| **认证** | 端点需要认证？ | 添加 `@login_required` 或 DRF 权限类 |
| **授权** | 用户有权执行操作？ | 检查所有权或角色 |
| **输入** | 所有输入已验证净化？ | 使用 Serializer/Form 验证 |
| **输出** | 敏感数据已排除？ | 过滤响应字段 |
| **CSRF** | POST 请求有 CSRF 保护？ | 启用 `@csrf_protect` |
| **XSS** | 用户内容已转义？ | 使用 `escape()` 或 `bleach` |
| **SQL** | 使用参数化查询？ | 使用 ORM 或参数化原始 SQL |
| **速率** | 端点有速率限制？ | 添加 `django-ratelimit` |
| **日志** | 安全事件已记录？ | 记录认证失败、权限变更 |

### settings.py 安全配置

```python
# settings/production.py

DEBUG = False

ALLOWED_HOSTS = ['example.com', 'www.example.com']

SECURE_SSL_REDIRECT = True
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

CSP_DEFAULT_SRC = ("'self'",)
CSP_SCRIPT_SRC = ("'self'",)
CSP_STYLE_SRC = ("'self'", "'unsafe-inline'")
CSP_IMG_SRC = ("'self'", "data:")
CSP_CONNECT_SRC = ("'self'",)
CSP_FONT_SRC = ("'self'",)
CSP_FRAME_SRC = ("'none'",)
CSP_MEDIA_SRC = ("'self'",)

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ['DB_NAME'],
        'USER': os.environ['DB_USER'],
        'PASSWORD': os.environ['DB_PASSWORD'],
        'HOST': os.environ['DB_HOST'],
        'PORT': os.environ['DB_PORT'],
        'OPTIONS': {
            'sslmode': 'require',
        },
    }
}

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'security': {
            'format': '%(asctime)s [%(levelname)s] %(message)s'
        },
    },
    'handlers': {
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/security.log',
            'formatter': 'security',
        },
    },
    'loggers': {
        'django.security': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}
```

## Quick Reference

### ORM 优化

| 方法 | 用途 | 示例 |
|------|------|------|
| `select_related` | 预加载外键/一对一 | `Article.objects.select_related('author')` |
| `prefetch_related` | 预加载多对多/反向 | `User.objects.prefetch_related('articles')` |
| `annotate` | 添加聚合字段 | `Article.objects.annotate(count=Count('comments'))` |
| `only` | 只查询指定字段 | `Article.objects.only('title', 'content')` |
| `defer` | 排除指定字段 | `Article.objects.defer('large_content')` |
| `bulk_create` | 批量创建 | `Article.objects.bulk_create(articles_list)` |
| `bulk_update` | 批量更新 | `Article.objects.bulk_update(articles, ['status'])` |
| `F` 表达式 | 字段级原子操作 | `Article.objects.update(views=F('views') + 1)` |
| `atomic` | 事务控制 | `with transaction.atomic(): ...` |

### DRF 快速参考

| 组件 | 用途 |
|------|------|
| `ModelSerializer` | 自动生成序列化器 |
| `SerializerMethodField` | 自定义计算字段 |
| `PrimaryKeyRelatedField` | 关联对象 ID |
| `SlugRelatedField` | 通过 slug 关联 |
| `APIView` | 基础 API 视图类 |
| `ModelViewSet` | 完整 CRUD 视图集 |
| `IsAuthenticated` | 需要登录 |
| `IsAdminUser` | 需要管理员 |
| `BasePermission` | 自定义权限基类 |

### 测试命令

```bash
pytest --cov=apps --cov-report=html
pytest -x --tb=short
pytest -k "test_article" -v
pytest --parallel 4
```

**Remember**: Django 开发应遵循"安全优先"原则，所有用户输入都不可信，使用 ORM 防止 SQL 注入，使用模板自动转义防止 XSS，启用 CSRF 保护防止跨站请求伪造。
