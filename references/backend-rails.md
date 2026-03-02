# Rails 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Rails/Ruby 后端、Hotwire、Turbo、ActiveJob、ActiveRecord

## 核心特性

Ruby on Rails 是 Ruby 最流行的 Web 框架，以"约定优于配置"和"DRY 原则"著称。

### 主要特性
- **ActiveRecord**：强大的 ORM 实现
- **Hotwire**：现代前端解决方案
- **Turbo**：无需 JavaScript 的动态页面
- **ActiveJob**：统一的任务队列接口
- **ActionCable**：WebSocket 实时通信

## 最佳实践

### ActiveRecord

```ruby
# frozen_string_literal: true

# 文章模型
#
# 使用 ActiveRecord 进行数据库操作，
# 支持关联关系、作用域和回调。
#
# @author System
# @version 1.0
class Post < ApplicationRecord
  # 软删除
  acts_as_paranoid
  
  # 关联
  belongs_to :author, class_name: 'User'
  has_many :comments, dependent: :destroy
  has_many :likes, as: :likeable
  has_and_belongs_to_many :tags
  
  # 嵌套属性
  accepts_nested_attributes_for :comments, 
    allow_destroy: true,
    reject_if: :all_blank
  
  # 验证
  validates :title, 
    presence: true,
    length: { minimum: 5, maximum: 200 },
    uniqueness: { scope: :author_id }
  validates :content, presence: true
  validates :status, 
    inclusion: { in: %w[draft published archived] }
  
  # 作用域
  scope :published, -> { 
    where(status: 'published')
      .where('published_at <= ?', Time.current) 
  }
  scope :draft, -> { where(status: 'draft') }
  scope :recent, -> { order(created_at: :desc) }
  scope :by_author, ->(author_id) { where(author_id: author_id) }
  scope :search, ->(keyword) {
    where('title LIKE ? OR content LIKE ?', 
      "%#{keyword}%", "%#{keyword}%")
  }
  
  # 回调
  before_create :set_slug
  before_save :sanitize_content
  after_commit :notify_subscribers, on: :create
  
  # 枚举
  enum status: { draft: 0, published: 1, archived: 2 }
  
  # 类方法
  class << self
    # 批量导入文章
    #
    # 使用 upsert_all 优化批量导入性能，
    # 避免多次数据库查询。
    #
    # @param posts_data [Array<Hash>] 文章数据数组
    # @return [Integer] 插入记录数
    def bulk_import(posts_data)
      posts_data.map! do |data|
        {
          title: data[:title],
          content: data[:content],
          author_id: data[:author_id],
          status: data[:status] || 'draft',
          created_at: Time.current,
          updated_at: Time.current
        }
      end
      
      upsert_all(posts_data, unique_by: :title)
    end
    
    # 统计热门文章
    #
    # @param limit [Integer] 返回数量
    # @return [ActiveRecord::Relation] 热门文章列表
    def popular(limit: 10)
      select('posts.*, COUNT(comments.id) AS comments_count')
        .left_joins(:comments)
        .group(:id)
        .order('comments_count DESC, views DESC')
        .limit(limit)
    end
  end
  
  # 实例方法
  
  # 发布文章
  #
  # 更新状态并设置发布时间，
  # 触发相关回调。
  #
  # @return [Boolean] 是否成功
  def publish!
    update!(
      status: 'published',
      published_at: Time.current
    )
  end
  
  # 归档文章
  #
  # @return [Boolean] 是否成功
  def archive!
    update!(status: 'archived')
  end
  
  # 获取摘要
  #
  # @param length [Integer] 摘要长度
  # @return [String] 文章摘要
  def excerpt(length: 150)
    ActionView::Base.full_sanitizer
      .sanitize(content)
      .truncate(length)
  end
  
  # 增加浏览量
  #
  # 使用 increment! 原子操作避免竞态条件。
  #
  # @return [void]
  def increment_views!
    increment!(:views)
  end
  
  private
  
  # 设置 URL 别名
  #
  # @return [void]
  def set_slug
    self.slug = title.to_s.parameterize
  end
  
  # 清理内容
  #
  # @return [void]
  def sanitize_content
    self.content = ActionController::Base.helpers
      .sanitize(content, tags: %w[p br strong em a])
  end
  
  # 通知订阅者
  #
  # @return [void]
  def notify_subscribers
    return unless published?
    
    PostNotificationJob.perform_later(id)
  end
end

# 用户模型
#
# 包含认证和授权功能。
class User < ApplicationRecord
  has_secure_password
  has_many :posts, foreign_key: :author_id
  
  # 生成 JWT Token
  #
  # @return [String] JWT Token
  def generate_token
    JWT.encode(
      { user_id: id, exp: 24.hours.from_now.to_i },
      Rails.application.credentials.secret_key_base
    )
  end
  
  # 验证 Token
  #
  # @param token [String] JWT Token
  # @return [User, nil] 用户实例或 nil
  def self.from_token(token)
    decoded = JWT.decode(
      token,
      Rails.application.credentials.secret_key_base
    )[0]
    find_by(id: decoded['user_id'])
  rescue JWT::DecodeError
    nil
  end
end
```

### Hotwire & Turbo

```ruby
# frozen_string_literal: true

# 文章控制器
#
# 使用 Turbo Streams 实现动态页面更新，
# 无需编写 JavaScript 代码。
#
# @author System
class PostsController < ApplicationController
  before_action :authenticate_user!
  before_action :set_post, only: %i[show edit update destroy]
  
  # GET /posts
  #
  # 支持分页和搜索，
  # 使用 Turbo Frame 局部刷新。
  def index
    @posts = Post.published
      .search(params[:q])
      .recent
      .page(params[:page])
    
    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end
  
  # GET /posts/:id
  #
  # 支持 Turbo Stream 格式响应。
  def show
    @post.increment_views!
    
    respond_to do |format|
      format.html
      format.turbo_stream
    end
  end
  
  # GET /posts/new
  def new
    @post = current_user.posts.build
  end
  
  # POST /posts
  #
  # 创建成功后通过 Turbo Stream 更新页面。
  def create
    @post = current_user.posts.build(post_params)
    
    respond_to do |format|
      if @post.save
        format.html { redirect_to @post, notice: '文章创建成功' }
        format.turbo_stream
      else
        format.html { render :new, status: :unprocessable_entity }
        format.turbo_stream { render :create_error }
      end
    end
  end
  
  # PATCH/PUT /posts/:id
  #
  # 使用 Turbo Stream 局部更新。
  def update
    respond_to do |format|
      if @post.update(post_params)
        format.html { redirect_to @post }
        format.turbo_stream
      else
        format.html { render :edit, status: :unprocessable_entity }
      end
    end
  end
  
  # DELETE /posts/:id
  #
  # 删除后从 DOM 中移除元素。
  def destroy
    @post.destroy
    
    respond_to do |format|
      format.html { redirect_to posts_url }
      format.turbo_stream
    end
  end
  
  private
  
  # 设置文章
  #
  # @return [void]
  def set_post
    @post = Post.find(params[:id])
  end
  
  # 文章参数
  #
  # @return [ActionController::Parameters] 允许的参数
  def post_params
    params.require(:post).permit(:title, :content, :status, tag_ids: [])
  end
end
```

```erb
<%# app/views/posts/index.html.erb %>

<div class="posts-container">
  <%= turbo_stream_from "posts" %>
  
  <%= turbo_frame_tag "search" do %>
    <%= form_with(url: posts_path, method: :get, data: { 
      turbo_frame: "posts_list" 
    }) do |form| %>
      <%= form.search_field :q, 
        placeholder: "搜索文章...",
        value: params[:q] %>
      <%= form.submit "搜索" %>
    <% end %>
  <% end %>
  
  <%= turbo_frame_tag "posts_list" do %>
    <div id="posts">
      <%= render @posts %>
    </div>
    
    <%= paginate @posts %>
  <% end %>
</div>
```

```erb
<%# app/views/posts/_post.html.erb %>

<%= turbo_frame_tag dom_id(post) do %>
  <article class="post-card" data-post-id="<%= post.id %>">
    <h2><%= link_to post.title, post %></h2>
    <p><%= post.excerpt %></p>
    
    <div class="post-meta">
      <span>作者: <%= post.author.name %></span>
      <span>发布于: <%= time_ago_in_words(post.published_at) %>前</span>
    </div>
    
    <%= turbo_frame_tag "#{dom_id(post)}_likes" do %>
      <%= render partial: "likes/button", locals: { post: post } %>
    <% end %>
  </article>
<% end %>
```

```erb
<%# app/views/posts/create.turbo_stream.erb %>

<%= turbo_stream.prepend "posts" do %>
  <%= render @post %>
<% end %>

<%= turbo_stream.update "post_count" do %>
  <%= Post.published.count %> 篇文章
<% end %>

<%= turbo_stream.append "notifications" do %>
  <%= render partial: "shared/notification", 
    locals: { message: "文章创建成功", type: "success" } %>
<% end %>
```

### ActiveJob

```ruby
# frozen_string_literal: true

# 文章通知任务
#
# 异步发送文章发布通知，
# 支持多种队列后端。
#
# @author System
class PostNotificationJob < ApplicationJob
  # 队列名称
  queue_as :notifications
  
  # 重试策略
  retry_on StandardError, 
    wait: :exponentially_longer,
    attempts: 3
  
  # 丢弃策略
  discard_on ActiveJob::DeserializationError
  
  # 执行任务
  #
  # @param post_id [Integer] 文章ID
  # @return [void]
  def perform(post_id)
    post = Post.find(post_id)
    
    return unless post.published?
    
    subscribers = User.joins(:subscriptions)
      .where(subscriptions: { author_id: post.author_id })
    
    subscribers.find_each do |user|
      PostMailer.with(
        post: post,
        user: user
      ).notification_email.deliver_later
    end
    
    # 更新统计
    Rails.cache.increment("posts:#{post.author_id}:notifications_sent")
  rescue StandardError => e
    Rails.logger.error("通知发送失败: #{e.message}")
    raise
  end
end

# 报表生成任务
#
# 长时间运行的报表生成任务，
# 支持进度追踪。
#
# @author System
class ReportGenerationJob < ApplicationJob
  queue_as :reports
  
  # 执行任务
  #
  # @param report_id [Integer] 报表ID
  # @param params [Hash] 参数
  # @return [void]
  def perform(report_id, params)
    report = Report.find(report_id)
    
    report.update!(status: 'processing')
    
    data = collect_data(params)
    file_path = generate_report(data, params[:format])
    
    report.update!(
      status: 'completed',
      file_url: upload_to_storage(file_path)
    )
    
    # 发送完成通知
    ReportMailer.completion_email(report).deliver_later
  rescue StandardError => e
    report&.update!(status: 'failed', error_message: e.message)
    raise
  ensure
    # 清理临时文件
    FileUtils.rm_f(file_path) if file_path
  end
  
  private
  
  # 收集数据
  #
  # @param params [Hash] 参数
  # @return [Array] 数据集合
  def collect_data(params)
    # 使用 find_each 批量处理
    Post.where(created_at: params[:date_range])
      .find_each(batch_size: 1000)
      .map { |post| serialize_post(post) }
  end
end

# 批量处理任务
#
# 处理大量数据的批量操作。
#
# @author System
class BulkProcessJob < ApplicationJob
  queue_as :heavy
  
  # 执行任务
  #
  # @param model_class [String] 模型类名
  # @param ids [Array<Integer>] ID列表
  # @param action [Symbol] 操作名称
  # @return [void]
  def perform(model_class, ids, action)
    model_class.constantize
      .where(id: ids)
      .find_each(batch_size: 100) do |record|
        record.send(action)
      end
  end
end
```

### ActionCable

```ruby
# frozen_string_literal: true

# 文章频道
#
# 实时推送文章更新到订阅者。
#
# @author System
class PostsChannel < ApplicationCable::Channel
  # 订阅频道
  #
  # @return [void]
  def subscribed
    stream_from "posts:#{current_user.id}"
    stream_for Post.published
  end
  
  # 取消订阅
  #
  # @return [void]
  def unsubscribed
    stop_all_streams
  end
  
  # 发送评论
  #
  # @param data [Hash] 评论数据
  # @return [void]
  def send_comment(data)
    post = Post.find(data['post_id'])
    
    comment = post.comments.create!(
      content: data['content'],
      user: current_user
    )
    
    # 广播到所有订阅者
    PostsChannel.broadcast_to(
      post,
      action: 'new_comment',
      comment: render_comment(comment)
    )
  end
  
  private
  
  # 渲染评论
  #
  # @param comment [Comment] 评论对象
  # @return [String] HTML 内容
  def render_comment(comment)
    ApplicationController.renderer.render(
      partial: 'comments/comment',
      locals: { comment: comment }
    )
  end
end

# 在线状态频道
#
# 追踪用户在线状态。
#
# @author System
class PresenceChannel < ApplicationCable::Channel
  def subscribed
    stream_from 'presence'
    
    # 标记用户在线
    Rails.cache.write(
      "user:#{current_user.id}:online",
      true,
      expires_in: 5.minutes
    )
    
    # 广播在线状态
    ActionCable.server.broadcast(
      'presence',
      user_id: current_user.id,
      status: 'online'
    )
  end
  
  def unsubscribed
    Rails.cache.delete("user:#{current_user.id}:online")
    
    ActionCable.server.broadcast(
      'presence',
      user_id: current_user.id,
      status: 'offline'
    )
  end
end
```

```javascript
// app/javascript/channels/posts.js

import consumer from "./consumer"

/**
 * 文章频道订阅
 * 
 * @param {number} postId - 文章ID
 * @returns {Subscription} 订阅实例
 */
export function subscribeToPost(postId) {
  return consumer.subscriptions.create(
    { channel: "PostsChannel", post_id: postId },
    {
      connected() {
        console.log("已连接到文章频道")
      },
      
      disconnected() {
        console.log("已断开文章频道")
      },
      
      received(data) {
        switch (data.action) {
          case "new_comment":
            appendComment(data.comment)
            break
          case "updated":
            updatePost(data.post)
            break
        }
      }
    }
  )
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `belongs_to` | 反向关联 | `belongs_to :author` |
| `has_many` | 一对多关联 | `has_many :comments` |
| `has_and_belongs_to_many` | 多对多关联 | `has_and_belongs_to_many :tags` |
| `scope` | 查询作用域 | `scope :published, -> { where(status: 'published') }` |
| `enum` | 枚举类型 | `enum status: { draft: 0, published: 1 }` |
| `validates` | 验证 | `validates :title, presence: true` |
| `before_save` | 保存前回调 | `before_save :normalize_data` |
| `after_commit` | 事务提交后回调 | `after_commit :notify, on: :create` |
| `turbo_frame_tag` | Turbo Frame | `turbo_frame_tag "posts"` |
| `turbo_stream_from` | 订阅更新 | `turbo_stream_from "posts"` |
| `turbo_stream` | Turbo Stream | `turbo_stream.append "posts"` |
| `ApplicationJob` | 任务基类 | `class MyJob < ApplicationJob` |
| `queue_as` | 队列名称 | `queue_as :notifications` |
| `retry_on` | 重试策略 | `retry_on StandardError, attempts: 3` |
| `perform_later` | 异步执行 | `Job.perform_later(arg)` |
| `ActionCable` | WebSocket | `ActionCable.server.broadcast` |
