# Rust 参考

> Reference for: fullstack-dev-skills
> Load when: 编写 Rust 代码、所有权系统、生命周期、异步 Rust、错误处理

## 核心特性

Rust 是一门系统编程语言，专注于安全性、并发性和性能。其独特的所有权系统在编译时保证内存安全，无需垃圾回收器。Rust 的零成本抽象使其成为高性能应用的理想选择。

### 所有权与借用

```rust
use std::collections::HashMap;
use std::fmt;
use std::marker::PhantomData;

/// 用户结构体
/// 
/// # 示例
/// 
/// ```
/// let user = User::new(1, "Alice".to_string());
/// ```
#[derive(Debug, Clone, PartialEq)]
pub struct User {
    /// 用户唯一标识
    pub id: u64,
    /// 用户名
    pub name: String,
    /// 用户邮箱
    pub email: Option<String>,
}

impl User {
    /// 创建新用户
    /// 
    /// # 参数
    /// 
    /// * `id` - 用户唯一标识
    /// * `name` - 用户名
    /// 
    /// # 返回
    /// 
    /// 新创建的用户实例
    pub fn new(id: u64, name: String) -> Self {
        Self {
            id,
            name,
            email: None,
        }
    }

    /// 设置用户邮箱
    /// 
    /// # 参数
    /// 
    /// * `email` - 邮箱地址
    /// 
    /// # 返回
    /// 
    /// 修改后的用户实例
    pub fn with_email(mut self, email: String) -> Self {
        self.email = Some(email);
        self
    }

    /// 获取用户显示名称
    /// 
    /// # 返回
    /// 
    /// 用户名称的字符串切片
    pub fn display_name(&self) -> &str {
        &self.name
    }
}

impl fmt::Display for User {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match &self.email {
            Some(email) => write!(f, "{} <{}>", self.name, email),
            None => write!(f, "{}", self.name),
        }
    }
}

/// 所有权转移示例
pub fn ownership_example() {
    // 创建 String，拥有堆内存
    let s1 = String::from("hello");
    
    // 所有权转移，s1 不再有效
    let s2 = s1;
    
    // 编译错误：s1 已被移动
    // println!("{}", s1);
    
    println!("{}", s2);
}

/// 借用示例
pub fn borrowing_example() {
    let s = String::from("hello");
    
    // 不可变借用
    let len = calculate_length(&s);
    
    println!("'{}' 的长度是 {}", s, len);
}

/// 计算字符串长度
/// 
/// # 参数
/// 
/// * `s` - 字符串引用
/// 
/// # 返回
/// 
/// 字符串长度
fn calculate_length(s: &String) -> usize {
    s.len()
}

/// 可变借用示例
pub fn mutable_borrowing_example() {
    let mut s = String::from("hello");
    
    // 可变借用
    append_world(&mut s);
    
    println!("{}", s);
}

/// 追加 "world" 到字符串
/// 
/// # 参数
/// 
/// * `s` - 可变字符串引用
fn append_world(s: &mut String) {
    s.push_str(", world!");
}

/// 生命周期标注示例
/// 
/// 带有两个字符串引用参数，返回较长的那个
/// 
/// # 参数
/// 
/// * `x` - 第一个字符串引用
/// * `y` - 第二个字符串引用
/// 
/// # 返回
/// 
/// 较长的字符串引用
pub fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

/// 带生命周期的结构体
#[derive(Debug)]
pub struct Excerpt<'a> {
    /// 文本片段
    pub part: &'a str,
}

impl<'a> Excerpt<'a> {
    /// 创建新的文本片段
    /// 
    /// # 参数
    /// 
    /// * `part` - 文本引用
    /// 
    /// # 返回
    /// 
    /// 新的 Excerpt 实例
    pub fn new(part: &'a str) -> Self {
        Self { part }
    }

    /// 获取片段内容
    /// 
    /// # 返回
    /// 
    /// 文本片段引用
    pub fn content(&self) -> &'a str {
        self.part
    }
}
```

### 泛型与 Trait

```rust
use std::cmp::Ordering;
use std::ops::{Add, Deref, DerefMut};

/// 泛型容器
/// 
/// 存储任意类型的值
#[derive(Debug, Clone, PartialEq)]
pub struct Container<T> {
    value: T,
}

impl<T> Container<T> {
    /// 创建新容器
    /// 
    /// # 参数
    /// 
    /// * `value` - 存储的值
    /// 
    /// # 返回
    /// 
    /// 新的容器实例
    pub fn new(value: T) -> Self {
        Self { value }
    }

    /// 获取值的引用
    /// 
    /// # 返回
    /// 
    /// 值的不可变引用
    pub fn get(&self) -> &T {
        &self.value
    }

    /// 获取值的可变引用
    /// 
    /// # 返回
    /// 
    /// 值的可变引用
    pub fn get_mut(&mut self) -> &mut T {
        &mut self.value
    }

    /// 消费容器，返回内部值
    /// 
    /// # 返回
    /// 
    /// 内部值
    pub fn into_inner(self) -> T {
        self.value
    }
}

impl<T: Clone> Container<T> {
    /// 克隆内部值
    /// 
    /// # 返回
    /// 
    /// 克隆的值
    pub fn clone_value(&self) -> T {
        self.value.clone()
    }
}

impl<T: Default> Default for Container<T> {
    fn default() -> Self {
        Self::new(T::default())
    }
}

impl<T> Deref for Container<T> {
    type Target = T;

    fn deref(&self) -> &Self::Target {
        &self.value
    }
}

impl<T> DerefMut for Container<T> {
    fn deref_mut(&mut self) -> &mut Self::Target {
        &mut self.value
    }
}

/// 序列 Trait
pub trait Sequence {
    /// 元素类型
    type Item;

    /// 获取长度
    fn len(&self) -> usize;

    /// 是否为空
    fn is_empty(&self) -> bool {
        self.len() == 0
    }

    /// 获取元素
    fn get(&self, index: usize) -> Option<&Self::Item>;
}

/// 可迭代 Trait
pub trait Iterable: Sequence {
    /// 迭代器类型
    type Iterator<'a>: Iterator<Item = &'a Self::Item>
    where
        Self: 'a;

    /// 创建迭代器
    fn iter(&self) -> Self::Iterator<'_>;
}

/// 序列 Trait 实现
impl<T> Sequence for Vec<T> {
    type Item = T;

    fn len(&self) -> usize {
        Vec::len(self)
    }

    fn get(&self, index: usize) -> Option<&Self::Item> {
        Vec::get(self, index)
    }
}

/// 可迭代 Trait 实现
impl<T> Iterable for Vec<T> {
    type Iterator<'a> = std::slice::Iter<'a, T> where T: 'a;

    fn iter(&self) -> Self::Iterator<'_> {
        Vec::iter(self)
    }
}

/// 可比较 Trait
pub trait Comparable: PartialEq {
    /// 比较方法
    fn compare(&self, other: &Self) -> Ordering;
}

impl<T: Ord> Comparable for T {
    fn compare(&self, other: &Self) -> Ordering {
        Ord::cmp(self, other)
    }
}

/// 类型状态模式
/// 
/// 使用泛型参数表示不同状态
pub mod state_machine {
    use std::marker::PhantomData;

    /// 空闲状态
    pub struct Idle;
    /// 连接状态
    pub struct Connected;
    /// 关闭状态
    pub struct Closed;

    /// 连接器
    /// 
    /// 使用类型参数表示当前状态
    pub struct Connection<State> {
        _state: PhantomData<State>,
        address: String,
    }

    impl Connection<Idle> {
        /// 创建新的空闲连接
        /// 
        /// # 参数
        /// 
        /// * `address` - 连接地址
        /// 
        /// # 返回
        /// 
        /// 空闲状态的连接
        pub fn new(address: String) -> Self {
            Self {
                _state: PhantomData,
                address,
            }
        }

        /// 连接
        /// 
        /// # 返回
        /// 
        /// 已连接状态的连接
        pub fn connect(self) -> Connection<Connected> {
            Connection {
                _state: PhantomData,
                address: self.address,
            }
        }
    }

    impl Connection<Connected> {
        /// 发送数据
        /// 
        /// # 参数
        /// 
        /// * `data` - 要发送的数据
        /// 
        /// # 返回
        /// 
        /// 发送结果
        pub fn send(&self, data: &[u8]) -> Result<usize, String> {
            println!("发送 {} 字节到 {}", data.len(), self.address);
            Ok(data.len())
        }

        /// 断开连接
        /// 
        /// # 返回
        /// 
        /// 已关闭状态的连接
        pub fn disconnect(self) -> Connection<Closed> {
            Connection {
                _state: PhantomData,
                address: self.address,
            }
        }
    }

    impl Connection<Closed> {
        /// 重新连接
        /// 
        /// # 返回
        /// 
        /// 已连接状态的连接
        pub fn reconnect(self) -> Connection<Connected> {
            Connection {
                _state: PhantomData,
                address: self.address,
            }
        }
    }
}
```

### 错误处理

```rust
use std::error::Error;
use std::fmt;
use std::result;

/// 应用错误类型
#[derive(Debug)]
pub enum AppError {
    /// 未找到错误
    NotFound(String),
    /// 无效输入错误
    InvalidInput { field: String, message: String },
    /// 内部错误
    Internal(String),
    /// IO 错误
    Io(std::io::Error),
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::NotFound(msg) => write!(f, "未找到: {}", msg),
            AppError::InvalidInput { field, message } => {
                write!(f, "无效输入 '{}': {}", field, message)
            }
            AppError::Internal(msg) => write!(f, "内部错误: {}", msg),
            AppError::Io(err) => write!(f, "IO 错误: {}", err),
        }
    }
}

impl Error for AppError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            AppError::Io(err) => Some(err),
            _ => None,
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err)
    }
}

/// 应用结果类型
pub type AppResult<T> = result::Result<T, AppError>;

/// 用户服务
pub struct UserService {
    users: HashMap<u64, User>,
}

impl UserService {
    /// 创建新的用户服务
    /// 
    /// # 返回
    /// 
    /// 新的用户服务实例
    pub fn new() -> Self {
        Self {
            users: HashMap::new(),
        }
    }

    /// 查找用户
    /// 
    /// # 参数
    /// 
    /// * `id` - 用户 ID
    /// 
    /// # 返回
    /// 
    /// 用户引用或错误
    pub fn find_user(&self, id: u64) -> AppResult<&User> {
        self.users.get(&id).ok_or_else(|| {
            AppError::NotFound(format!("用户 ID: {}", id))
        })
    }

    /// 添加用户
    /// 
    /// # 参数
    /// 
    /// * `user` - 用户实例
    /// 
    /// # 返回
    /// 
    /// 添加结果
    pub fn add_user(&mut self, user: User) -> AppResult<()> {
        if user.name.is_empty() {
            return Err(AppError::InvalidInput {
                field: "name".to_string(),
                message: "用户名不能为空".to_string(),
            });
        }
        
        self.users.insert(user.id, user);
        Ok(())
    }

    /// 移除用户
    /// 
    /// # 参数
    /// 
    /// * `id` - 用户 ID
    /// 
    /// # 返回
    /// 
    /// 被移除的用户或错误
    pub fn remove_user(&mut self, id: u64) -> AppResult<User> {
        self.users.remove(&id).ok_or_else(|| {
            AppError::NotFound(format!("用户 ID: {}", id))
        })
    }
}

impl Default for UserService {
    fn default() -> Self {
        Self::new()
    }
}

/// Option 扩展
pub trait OptionExt<T> {
    /// 转换为结果
    /// 
    /// # 参数
    /// 
    /// * `err` - 错误值
    /// 
    /// # 返回
    /// 
    /// 结果类型
    fn ok_or_else<E, F>(self, f: F) -> Result<T, E>
    where
        F: FnOnce() -> E;
}

impl<T> OptionExt<T> for Option<T> {
    fn ok_or_else<E, F>(self, f: F) -> Result<T, E>
    where
        F: FnOnce() -> E,
    {
        self.ok_or_else(f)
    }
}

/// Result 扩展
pub trait ResultExt<T, E> {
    /// 映射错误
    /// 
    /// # 参数
    /// 
    /// * `f` - 错误转换函数
    /// 
    /// # 返回
    /// 
    /// 新的结果类型
    fn map_err_with<U, F>(self, f: F) -> Result<T, U>
    where
        F: FnOnce(E) -> U;
}

impl<T, E> ResultExt<T, E> for Result<T, E> {
    fn map_err_with<U, F>(self, f: F) -> Result<T, U>
    where
        F: FnOnce(E) -> U,
    {
        self.map_err(f)
    }
}
```

### 异步 Rust

```rust
use std::future::Future;
use std::pin::Pin;
use std::sync::Arc;
use std::task::{Context, Poll};
use tokio::sync::{Mutex, RwLock, Semaphore};
use tokio::time::{sleep, timeout, Duration};

/// 异步用户服务
pub struct AsyncUserService {
    users: Arc<RwLock<HashMap<u64, User>>>,
}

impl AsyncUserService {
    /// 创建新的异步用户服务
    /// 
    /// # 返回
    /// 
    /// 新的异步用户服务实例
    pub fn new() -> Self {
        Self {
            users: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    /// 查找用户
    /// 
    /// # 参数
    /// 
    /// * `id` - 用户 ID
    /// 
    /// # 返回
    /// 
    /// 用户选项
    pub async fn find_user(&self, id: u64) -> Option<User> {
        let users = self.users.read().await;
        users.get(&id).cloned()
    }

    /// 添加用户
    /// 
    /// # 参数
    /// 
    /// * `user` - 用户实例
    /// 
    /// # 返回
    /// 
    /// 添加结果
    pub async fn add_user(&self, user: User) -> AppResult<()> {
        let mut users = self.users.write().await;
        
        if user.name.is_empty() {
            return Err(AppError::InvalidInput {
                field: "name".to_string(),
                message: "用户名不能为空".to_string(),
            });
        }
        
        users.insert(user.id, user);
        Ok(())
    }

    /// 批量添加用户
    /// 
    /// # 参数
    /// 
    /// * `users` - 用户列表
    /// 
    /// # 返回
    /// 
    /// 成功添加的数量
    pub async fn add_users(&self, users: Vec<User>) -> usize {
        let mut count = 0;
        let mut map = self.users.write().await;
        
        for user in users {
            if !user.name.is_empty() {
                map.insert(user.id, user);
                count += 1;
            }
        }
        
        count
    }
}

impl Default for AsyncUserService {
    fn default() -> Self {
        Self::new()
    }
}

/// 并发限制器
pub struct ConcurrencyLimiter {
    semaphore: Arc<Semaphore>,
}

impl ConcurrencyLimiter {
    /// 创建新的并发限制器
    /// 
    /// # 参数
    /// 
    /// * `max_concurrent` - 最大并发数
    /// 
    /// # 返回
    /// 
    /// 新的并发限制器实例
    pub fn new(max_concurrent: usize) -> Self {
        Self {
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
        }
    }

    /// 执行受限操作
    /// 
    /// # 参数
    /// 
    /// * `f` - 异步操作
    /// 
    /// # 返回
    /// 
    /// 操作结果
    pub async fn run<F, T, E>(&self, f: F) -> Result<T, E>
    where
        F: Future<Output = Result<T, E>>,
    {
        let _permit = self.semaphore.acquire().await.unwrap();
        f.await
    }
}

/// 带超时的异步操作
/// 
/// # 参数
/// 
/// * `duration` - 超时时间
/// * `future` - 异步操作
/// 
/// # 返回
/// 
/// 操作结果或超时错误
pub async fn with_timeout<F, T>(
    duration: Duration,
    future: F,
) -> Result<T, tokio::time::error::Elapsed>
where
    F: Future<Output = T>,
{
    timeout(duration, future).await
}

/// 重试策略
pub struct RetryPolicy {
    /// 最大重试次数
    pub max_retries: u32,
    /// 初始延迟
    pub initial_delay: Duration,
    /// 最大延迟
    pub max_delay: Duration,
    /// 延迟倍数
    pub multiplier: f64,
}

impl Default for RetryPolicy {
    fn default() -> Self {
        Self {
            max_retries: 3,
            initial_delay: Duration::from_millis(100),
            max_delay: Duration::from_secs(10),
            multiplier: 2.0,
        }
    }
}

/// 带重试的异步操作
/// 
/// # 参数
/// 
/// * `policy` - 重试策略
/// * `f` - 异步操作
/// 
/// # 返回
/// 
/// 操作结果
pub async fn retry<F, Fut, T, E>(policy: RetryPolicy, mut f: F) -> Result<T, E>
where
    F: FnMut() -> Fut,
    Fut: Future<Output = Result<T, E>>,
    E: std::fmt::Debug,
{
    let mut delay = policy.initial_delay;
    let mut attempts = 0;

    loop {
        match f().await {
            Ok(result) => return Ok(result),
            Err(err) => {
                attempts += 1;
                
                if attempts >= policy.max_retries {
                    return Err(err);
                }
                
                sleep(delay).await;
                delay = std::cmp::min(
                    Duration::from_secs_f64(delay.as_secs_f64() * policy.multiplier),
                    policy.max_delay,
                );
            }
        }
    }
}

/// 异步生产者-消费者模式
pub mod producer_consumer {
    use tokio::sync::mpsc;
    use std::sync::Arc;

    /// 生产者
    pub struct Producer<T> {
        sender: mpsc::Sender<T>,
    }

    impl<T> Producer<T> {
        /// 发送数据
        /// 
        /// # 参数
        /// 
        /// * `value` - 要发送的值
        /// 
        /// # 返回
        /// 
        /// 发送结果
        pub async fn send(&self, value: T) -> Result<(), mpsc::error::SendError<T>> {
            self.sender.send(value).await
        }
    }

    /// 消费者
    pub struct Consumer<T> {
        receiver: Arc<Mutex<mpsc::Receiver<T>>>,
    }

    impl<T> Consumer<T> {
        /// 接收数据
        /// 
        /// # 返回
        /// 
        /// 接收到的值
        pub async fn recv(&self) -> Option<T> {
            let mut receiver = self.receiver.lock().await;
            receiver.recv().await
        }
    }

    /// 创建生产者-消费者对
    /// 
    /// # 参数
    /// 
    /// * `buffer_size` - 缓冲区大小
    /// 
    /// # 返回
    /// 
    /// 生产者和消费者
    pub fn create_channel<T>(buffer_size: usize) -> (Producer<T>, Consumer<T>) {
        let (sender, receiver) = mpsc::channel(buffer_size);
        
        (
            Producer { sender },
            Consumer { 
                receiver: Arc::new(Mutex::new(receiver)) 
            },
        )
    }
}
```

## Quick Reference

| 特特性 | 用途 | 示例 |
|--------|------|------|
| `let` | 变量绑定 | `let x = 5;` |
| `let mut` | 可变绑定 | `let mut x = 5;` |
| `&T` | 不可变引用 | `let ref_x = &x;` |
| `&mut T` | 可变引用 | `let ref_x = &mut x;` |
| `*` | 解引用 | `*ref_x` |
| `move` | 移动语义 | `move \|x\| x` |
| `Clone` | 克隆 Trait | `x.clone()` |
| `Copy` | 复制 Trait | 自动复制 |
| `Drop` | 析构 Trait | 实现 `drop()` |
| `Deref` | 解引用 Trait | 自动解引用 |
| `Option<T>` | 可选值 | `Some(v) / None` |
| `Result<T, E>` | 结果类型 | `Ok(v) / Err(e)` |
| `?` | 错误传播 | `function()?` |
| `unwrap()` | 解包 | `opt.unwrap()` |
| `expect()` | 带消息解包 | `opt.expect("msg")` |
| `match` | 模式匹配 | `match x { ... }` |
| `if let` | 条件匹配 | `if let Some(v) = x` |
| `while let` | 循环匹配 | `while let Some(v) = iter.next()` |
| `trait` | Trait 定义 | `trait Foo { ... }` |
| `impl` | Trait 实现 | `impl Foo for Bar` |
| `where` | 约束子句 | `where T: Clone` |
| `async fn` | 异步函数 | `async fn foo() { }` |
| `.await` | 等待异步 | `future.await` |
| `async {}` | 异步块 | `async { ... }` |
| `Pin<P>` | 固定指针 | `Pin::new(&mut x)` |
| `Box::pin` | 装箱固定 | `Box::pin(async { })` |
