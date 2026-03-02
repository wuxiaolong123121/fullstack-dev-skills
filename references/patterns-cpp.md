# C++ 开发模式参考

现代 C++ 标准（C++17/20）、RAII 内存管理、智能指针和测试模式，用于构建高性能、安全、可维护的 C++ 应用程序。

## When to Activate

- 编写新的 C++ 代码
- 审查 C++ 代码
- 重构现有 C++ 代码
- 设计 C++ 库/模块
- 优化内存管理

## Core Principles

### 1. RAII - 资源获取即初始化

C++ 核心资源管理原则，资源生命周期与对象生命周期绑定。

```cpp
/**
 * @brief RAII 文件句柄管理示例
 * 
 * 资源在构造函数中获取，在析构函数中释放
 */
class FileHandle {
private:
    std::FILE* file_;
    
public:
    /**
     * @brief 构造函数 - 获取资源
     * @param filename 文件名
     * @param mode 打开模式
     * @throws std::runtime_error 文件打开失败时抛出
     */
    explicit FileHandle(const std::string& filename, const std::string& mode) 
        : file_(std::fopen(filename.c_str(), mode.c_str())) {
        if (!file_) {
            throw std::runtime_error("无法打开文件: " + filename);
        }
    }
    
    /**
     * @brief 析构函数 - 释放资源
     */
    ~FileHandle() {
        if (file_) {
            std::fclose(file_);
        }
    }
    
    FileHandle(const FileHandle&) = delete;
    FileHandle& operator=(const FileHandle&) = delete;
    
    FileHandle(FileHandle&& other) noexcept : file_(other.file_) {
        other.file_ = nullptr;
    }
    
    FileHandle& operator=(FileHandle&& other) noexcept {
        if (this != &other) {
            if (file_) std::fclose(file_);
            file_ = other.file_;
            other.file_ = nullptr;
        }
        return *this;
    }
    
    std::FILE* get() const noexcept { return file_; }
};

void process_file(const std::string& path) {
    FileHandle handle(path, "r");
    // 使用 handle...
    // 函数结束时自动关闭文件，即使发生异常
}
```

### 2. 零开销抽象

C++ 承诺不为未使用的特性付出运行时代价。

```cpp
/**
 * @brief 零开销抽象示例 - 编译期计算
 */
template<typename T>
constexpr T square(T value) {
    return value * value;
}

// 编译期计算，运行时无开销
static_assert(square(5) == 25);

/**
 * @brief 内联函数避免函数调用开销
 */
inline int fast_add(int a, int b) {
    return a + b;
}
```

### 3. 类型安全

利用类型系统在编译期捕获错误。

```cpp
/**
 * @brief 强类型枚举，避免隐式转换
 */
enum class Color { Red, Green, Blue };
enum class Size { Small, Medium, Large };

void example() {
    Color c = Color::Red;
    // Size s = c;  // 编译错误：类型不匹配
    // int x = c;   // 编译错误：无隐式转换
    int value = static_cast<int>(c);  // 显式转换
}
```

## Memory Management

### 智能指针

#### unique_ptr - 独占所有权

```cpp
#include <memory>

/**
 * @brief 使用 unique_ptr 管理独占资源
 */
class Resource {
public:
    void do_something() { /* ... */ }
};

void unique_ptr_example() {
    // 创建 unique_ptr
    auto ptr = std::make_unique<Resource>();
    
    // 使用 -> 访问成员
    ptr->do_something();
    
    // 使用 * 解引用
    Resource& ref = *ptr;
    
    // 检查是否有效
    if (ptr) {
        // ptr 有效
    }
    
    // 转移所有权
    std::unique_ptr<Resource> ptr2 = std::move(ptr);
    // ptr 现在为 nullptr
    
    // 自定义删除器
    auto deleter = [](FILE* f) { 
        std::fclose(f); 
    };
    std::unique_ptr<FILE, decltype(deleter)> file(
        std::fopen("test.txt", "r"), 
        deleter
    );
}
```

#### shared_ptr - 共享所有权

```cpp
#include <memory>

/**
 * @brief 使用 shared_ptr 管理共享资源
 */
class Node {
public:
    std::string name;
    std::shared_ptr<Node> next;
    
    explicit Node(std::string n) : name(std::move(n)) {}
};

void shared_ptr_example() {
    // 创建 shared_ptr
    auto node1 = std::make_shared<Node>("node1");
    auto node2 = std::make_shared<Node>("node2");
    
    // 共享所有权
    node1->next = node2;
    auto shared = node1->next;  // 引用计数增加
    
    // 获取引用计数
    std::cout << "引用计数: " << shared.use_count() << std::endl;
    
    // 重置指针
    node1.reset();  // 引用计数减少
}

/**
 * @brief 避免循环引用
 */
class SafeNode {
public:
    std::string name;
    std::shared_ptr<SafeNode> next;
    std::weak_ptr<SafeNode> prev;  // 使用 weak_ptr 打破循环
    
    explicit SafeNode(std::string n) : name(std::move(n)) {}
};
```

#### weak_ptr - 非拥有观察者

```cpp
/**
 * @brief weak_ptr 用于观察 shared_ptr 管理的对象
 */
class Observer {
private:
    std::weak_ptr<Resource> resource_;
    
public:
    explicit Observer(std::shared_ptr<Resource> res) 
        : resource_(res) {}
    
    void use_resource() {
        // 尝试获取 shared_ptr
        if (auto locked = resource_.lock()) {
            locked->do_something();
        } else {
            std::cout << "资源已释放" << std::endl;
        }
    }
    
    bool is_expired() const {
        return resource_.expired();
    }
};
```

### 容器内存管理

```cpp
#include <vector>
#include <string>
#include <unordered_map>

/**
 * @brief 高效容器使用模式
 */
void container_patterns() {
    // 预分配容量避免重新分配
    std::vector<int> vec;
    vec.reserve(1000);  // 预分配空间
    for (int i = 0; i < 1000; ++i) {
        vec.push_back(i);
    }
    
    // 使用 emplace_back 避免临时对象
    std::vector<std::string> strings;
    strings.emplace_back("hello");  // 直接在容器中构造
    
    // 移动语义
    std::string heavy = "很长的字符串...";
    strings.push_back(std::move(heavy));  // 移动而非复制
    
    // 使用 shrink_to_fit 释放多余内存
    vec.shrink_to_fit();
    
    // 清空并释放内存
    std::vector<int>().swap(vec);
}

/**
 * @brief 使用 unordered_map 高效查找
 */
std::unordered_map<std::string, int> create_lookup() {
    std::unordered_map<std::string, int> lookup;
    lookup.reserve(100);  // 预分配桶数量
    lookup.emplace("one", 1);
    lookup.emplace("two", 2);
    return lookup;
}
```

## Modern C++ Features

### C++17 特性

#### 结构化绑定

```cpp
#include <map>
#include <tuple>

/**
 * @brief 结构化绑定解构容器和元组
 */
void structured_bindings() {
    // 解构 pair
    std::map<std::string, int> scores = {{"Alice", 95}, {"Bob", 87}};
    for (const auto& [name, score] : scores) {
        std::cout << name << ": " << score << std::endl;
    }
    
    // 解构 tuple
    auto [x, y, z] = std::make_tuple(1, 2.0, "three");
    
    // 解构数组
    int arr[] = {1, 2, 3};
    auto [a, b, c] = arr;
}
```

#### if 和 switch 初始化语句

```cpp
#include <map>

/**
 * @brief 在条件语句中初始化变量
 */
void if_init_example() {
    std::map<std::string, int> cache;
    
    // 在 if 中初始化并检查
    if (auto it = cache.find("key"); it != cache.end()) {
        std::cout << "找到: " << it->second << std::endl;
    }
    
    // 配合锁使用
    std::mutex mtx;
    if (std::lock_guard lock(mtx); true) {
        // 锁保护的代码块
    }
}
```

#### std::optional

```cpp
#include <optional>

/**
 * @brief 使用 optional 表示可能缺失的值
 */
std::optional<int> find_value(const std::vector<int>& vec, int target) {
    for (size_t i = 0; i < vec.size(); ++i) {
        if (vec[i] == target) {
            return static_cast<int>(i);
        }
    }
    return std::nullopt;
}

void optional_example() {
    std::vector<int> data = {1, 2, 3, 4, 5};
    
    if (auto result = find_value(data, 3)) {
        std::cout << "找到索引: " << *result << std::endl;
    } else {
        std::cout << "未找到" << std::endl;
    }
    
    // 使用 value_or 提供默认值
    int index = find_value(data, 10).value_or(-1);
    
    // 使用 and_then 链式操作 (C++23)
    auto doubled = find_value(data, 3).transform([](int i) { return i * 2; });
}
```

#### std::variant 和 std::visit

```cpp
#include <variant>
#include <string>

/**
 * @brief 类型安全的联合体
 */
using Value = std::variant<int, double, std::string>;

/**
 * @brief 访问者模式处理 variant
 */
struct ValuePrinter {
    void operator()(int i) const {
        std::cout << "整数: " << i << std::endl;
    }
    void operator()(double d) const {
        std::cout << "浮点数: " << d << std::endl;
    }
    void operator()(const std::string& s) const {
        std::cout << "字符串: " << s << std::endl;
    }
};

void variant_example() {
    Value v = 42;
    std::visit(ValuePrinter{}, v);
    
    v = 3.14;
    std::visit([](const auto& val) {
        std::cout << "值: " << val << std::endl;
    }, v);
    
    // 使用 get_if 安全访问
    if (auto* ptr = std::get_if<int>(&v)) {
        std::cout << "整数值: " << *ptr << std::endl;
    }
}
```

### C++20 特性

#### Concepts

```cpp
#include <concepts>
#include <vector>

/**
 * @brief 定义概念约束模板参数
 */
template<typename T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template<typename T>
concept Addable = requires(T a, T b) {
    { a + b } -> std::convertible_to<T>;
};

/**
 * @brief 使用概念约束函数模板
 */
template<Numeric T>
T add(T a, T b) {
    return a + b;
}

/**
 * @brief 使用 requires 子句
 */
template<typename T>
    requires requires(T t) { t.size(); }
auto get_size(const T& container) {
    return container.size();
}

/**
 * @brief 简写语法
 */
void process(std::ranges::range auto& container) {
    for (auto& item : container) {
        // 处理 item
    }
}
```

#### Ranges

```cpp
#include <ranges>
#include <vector>
#include <algorithm>

/**
 * @brief 使用 ranges 进行函数式编程
 */
void ranges_example() {
    std::vector<int> numbers = {1, 2, 3, 4, 5, 6, 7, 8, 9, 10};
    
    // 过滤偶数并转换为平方
    auto result = numbers 
        | std::views::filter([](int n) { return n % 2 == 0; })
        | std::views::transform([](int n) { return n * n; });
    
    // 惰性求值
    for (int n : result) {
        std::cout << n << " ";  // 输出: 4 16 36 64 100
    }
    
    // 取前 N 个元素
    auto first_three = numbers | std::views::take(3);
    
    // 反转视图
    auto reversed = numbers | std::views::reverse;
    
    // 组合操作
    auto processed = numbers
        | std::views::filter([](int n) { return n > 3; })
        | std::views::transform([](int n) { return n * 2; })
        | std::views::take(3);
}
```

#### Coroutines

```cpp
#include <coroutine>
#include <generator>  // C++23

/**
 * @brief 协程生成器示例
 */
std::generator<int> fibonacci(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; ++i) {
        co_yield a;
        auto temp = a;
        a = b;
        b = temp + b;
    }
}

void coroutine_example() {
    for (int value : fibonacci(10)) {
        std::cout << value << " ";
    }
}

/**
 * @brief 异步任务示例
 */
struct Task {
    struct promise_type {
        Task get_return_object() { 
            return Task{std::coroutine_handle<promise_type>::from_promise(*this)}; 
        }
        std::suspend_never initial_suspend() { return {}; }
        std::suspend_never final_suspend() noexcept { return {}; }
        void return_void() {}
        void unhandled_exception() { std::terminate(); }
    };
    
    std::coroutine_handle<promise_type> handle;
};
```

## Error Handling

### 异常处理

```cpp
#include <stdexcept>
#include <string>

/**
 * @brief 自定义异常层次结构
 */
class AppException : public std::runtime_error {
public:
    explicit AppException(const std::string& message)
        : std::runtime_error(message) {}
};

class ValidationException : public AppException {
public:
    explicit ValidationException(const std::string& field)
        : AppException("验证失败: " + field) {}
};

class NotFoundException : public AppException {
public:
    explicit NotFoundException(const std::string& resource)
        : AppException("资源未找到: " + resource) {}
};

/**
 * @brief RAII 异常安全保证
 */
class SafeResource {
private:
    int* data_;
    size_t size_;
    
public:
    explicit SafeResource(size_t size) 
        : data_(new int[size]()), size_(size) {}
    
    ~SafeResource() { delete[] data_; }
    
    SafeResource(const SafeResource&) = delete;
    SafeResource& operator=(const SafeResource&) = delete;
    
    SafeResource(SafeResource&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
    }
    
    int& operator[](size_t index) {
        if (index >= size_) {
            throw std::out_of_range("索引越界");
        }
        return data_[index];
    }
};
```

### std::expected (C++23)

```cpp
#include <expected>
#include <string>

/**
 * @brief 使用 expected 处理可能的错误
 */
enum class Error { NotFound, InvalidInput, SystemError };

std::expected<int, Error> parse_int(const std::string& str) {
    try {
        size_t pos;
        int value = std::stoi(str, &pos);
        if (pos != str.length()) {
            return std::unexpected(Error::InvalidInput);
        }
        return value;
    } catch (...) {
        return std::unexpected(Error::InvalidInput);
    }
}

void expected_example() {
    auto result = parse_int("42");
    
    if (result) {
        std::cout << "值: " << *result << std::endl;
    } else {
        switch (result.error()) {
            case Error::NotFound:
                std::cout << "未找到" << std::endl;
                break;
            case Error::InvalidInput:
                std::cout << "无效输入" << std::endl;
                break;
            case Error::SystemError:
                std::cout << "系统错误" << std::endl;
                break;
        }
    }
    
    // 使用 and_then 链式操作
    auto doubled = parse_int("42")
        .and_then([](int i) -> std::expected<int, Error> {
            return i * 2;
        });
}
```

## Concurrency

### 线程与互斥量

```cpp
#include <thread>
#include <mutex>
#include <shared_mutex>
#include <vector>

/**
 * @brief 线程安全的计数器
 */
class ThreadSafeCounter {
private:
    mutable std::shared_mutex mutex_;
    int value_ = 0;
    
public:
    void increment() {
        std::unique_lock lock(mutex_);
        ++value_;
    }
    
    int get() const {
        std::shared_lock lock(mutex_);
        return value_;
    }
};

/**
 * @brief 使用 lock_guard 和 unique_lock
 */
void lock_examples() {
    std::mutex mtx1, mtx2;
    
    // 避免死锁：同时锁定多个互斥量
    std::scoped_lock lock(mtx1, mtx2);
    
    // 或者使用 lock_guard
    {
        std::lock_guard<std::mutex> guard(mtx1);
        // 临界区代码
    }
    
    // unique_lock 提供更多控制
    {
        std::unique_lock<std::mutex> lock(mtx1);
        // 可以手动 unlock 和 lock
        lock.unlock();
        // 执行非临界区代码
        lock.lock();
        // 再次进入临界区
    }
}
```

### 条件变量

```cpp
#include <condition_variable>
#include <queue>

/**
 * @brief 线程安全队列
 */
template<typename T>
class ThreadSafeQueue {
private:
    std::queue<T> queue_;
    mutable std::mutex mutex_;
    std::condition_variable cond_;
    
public:
    void push(T value) {
        std::lock_guard lock(mutex_);
        queue_.push(std::move(value));
        cond_.notify_one();
    }
    
    T pop() {
        std::unique_lock lock(mutex_);
        cond_.wait(lock, [this] { return !queue_.empty(); });
        T value = std::move(queue_.front());
        queue_.pop();
        return value;
    }
    
    bool try_pop(T& value, std::chrono::milliseconds timeout) {
        std::unique_lock lock(mutex_);
        if (cond_.wait_for(lock, timeout, [this] { return !queue_.empty(); })) {
            value = std::move(queue_.front());
            queue_.pop();
            return true;
        }
        return false;
    }
};
```

### 原子操作

```cpp
#include <atomic>
#include <memory>

/**
 * @brief 无锁编程示例
 */
class SpinLock {
private:
    std::atomic_flag flag_ = ATOMIC_FLAG_INIT;
    
public:
    void lock() {
        while (flag_.test_and_set(std::memory_order_acquire)) {
            // 自旋等待
        }
    }
    
    void unlock() {
        flag_.clear(std::memory_order_release);
    }
};

/**
 * @brief 原子引用计数
 */
class RefCounted {
private:
    mutable std::atomic<int> ref_count_{1};
    
public:
    void add_ref() const {
        ref_count_.fetch_add(1, std::memory_order_relaxed);
    }
    
    void release() const {
        if (ref_count_.fetch_sub(1, std::memory_order_acq_rel) == 1) {
            delete this;
        }
    }
};
```

## Testing Patterns

### 单元测试框架

```cpp
#include <cassert>
#include <iostream>
#include <string>
#include <functional>
#include <vector>

/**
 * @brief 简单测试框架
 */
class TestRunner {
private:
    int passed_ = 0;
    int failed_ = 0;
    std::string current_test_;
    
public:
    void run_test(const std::string& name, std::function<void()> test_func) {
        current_test_ = name;
        try {
            test_func();
            ++passed_;
            std::cout << "[通过] " << name << std::endl;
        } catch (const std::exception& e) {
            ++failed_;
            std::cout << "[失败] " << name << ": " << e.what() << std::endl;
        } catch (...) {
            ++failed_;
            std::cout << "[失败] " << name << ": 未知异常" << std::endl;
        }
    }
    
    void report() const {
        std::cout << "\n测试结果: " << passed_ << " 通过, " 
                  << failed_ << " 失败" << std::endl;
    }
};

/**
 * @brief 断言宏
 */
#define ASSERT_TRUE(condition) \
    if (!(condition)) throw std::runtime_error("断言失败: " #condition)

#define ASSERT_EQ(expected, actual) \
    if ((expected) != (actual)) \
        throw std::runtime_error("断言失败: 期望 " + std::to_string(expected) + \
                                 " 但得到 " + std::to_string(actual))

#define ASSERT_THROW(expression, exception_type) \
    { \
        bool caught = false; \
        try { expression; } \
        catch (const exception_type&) { caught = true; } \
        if (!caught) throw std::runtime_error("期望抛出 " #exception_type); \
    }

/**
 * @brief 测试示例
 */
void test_addition() {
    ASSERT_EQ(4, 2 + 2);
    ASSERT_TRUE(2 + 2 == 4);
}

void test_exception() {
    std::vector<int> v;
    ASSERT_THROW(v.at(10), std::out_of_range);
}

int main() {
    TestRunner runner;
    runner.run_test("加法测试", test_addition);
    runner.run_test("异常测试", test_exception);
    runner.report();
    return 0;
}
```

### Google Test 集成

```cpp
#include <gtest/gtest.h>
#include <gmock/gmock.h>

/**
 * @brief 被测试的类
 */
class Calculator {
public:
    virtual ~Calculator() = default;
    virtual int add(int a, int b) { return a + b; }
    virtual int divide(int a, int b) {
        if (b == 0) throw std::invalid_argument("除数不能为零");
        return a / b;
    }
};

/**
 * @brief 测试夹具
 */
class CalculatorTest : public ::testing::Test {
protected:
    void SetUp() override {
        calc_ = std::make_unique<Calculator>();
    }
    
    void TearDown() override {
        calc_.reset();
    }
    
    std::unique_ptr<Calculator> calc_;
};

/**
 * @brief 测试用例
 */
TEST_F(CalculatorTest, AddReturnsCorrectSum) {
    EXPECT_EQ(calc_->add(2, 3), 5);
    EXPECT_EQ(calc_->add(-1, 1), 0);
}

TEST_F(CalculatorTest, DivideByZeroThrows) {
    EXPECT_THROW(calc_->divide(10, 0), std::invalid_argument);
}

TEST_F(CalculatorTest, DivideReturnsCorrectQuotient) {
    EXPECT_EQ(calc_->divide(10, 2), 5);
}

/**
 * @brief Mock 对象示例
 */
class MockDatabase {
public:
    MOCK_METHOD(int, get_value, (const std::string&), (const));
    MOCK_METHOD(void, set_value, (const std::string&, int));
};

using ::testing::Return;
using ::testing::_;

TEST(DatabaseTest, GetValueReturnsStoredValue) {
    MockDatabase db;
    EXPECT_CALL(db, get_value("key"))
        .WillOnce(Return(42));
    
    EXPECT_EQ(db.get_value("key"), 42);
}
```

### 参数化测试

```cpp
#include <gtest/gtest.h>

/**
 * @brief 参数化测试夹具
 */
class PrimeTest : public ::testing::TestWithParam<int> {};

/**
 * @brief 判断是否为素数
 */
bool is_prime(int n) {
    if (n < 2) return false;
    for (int i = 2; i * i <= n; ++i) {
        if (n % i == 0) return false;
    }
    return true;
}

TEST_P(PrimeTest, PrimeNumbersReturnTrue) {
    int n = GetParam();
    EXPECT_TRUE(is_prime(n));
}

INSTANTIATE_TEST_SUITE_P(
    PrimeNumbers,
    PrimeTest,
    ::testing::Values(2, 3, 5, 7, 11, 13, 17, 19, 23, 29)
);

/**
 * @brief 值参数化测试
 */
struct AddTestCase {
    int a, b, expected;
};

class AddTest : public ::testing::TestWithParam<AddTestCase> {};

TEST_P(AddTest, ReturnsCorrectSum) {
    const auto& tc = GetParam();
    EXPECT_EQ(tc.a + tc.b, tc.expected);
}

INSTANTIATE_TEST_SUITE_P(
    AdditionTests,
    AddTest,
    ::testing::Values(
        AddTestCase{1, 2, 3},
        AddTestCase{-1, 1, 0},
        AddTestCase{0, 0, 0},
        AddTestCase{100, 200, 300}
    )
);
```

## Project Structure

### 标准项目布局

```
myproject/
├── CMakeLists.txt
├── cmake/
│   ├── CompilerOptions.cmake
│   └── Dependencies.cmake
├── include/
│   └── myproject/
│       ├── config.hpp
│       ├── types.hpp
│       └── utils.hpp
├── src/
│   ├── CMakeLists.txt
│   ├── main.cpp
│   └── internal/
│       └── implementation.cpp
├── tests/
│   ├── CMakeLists.txt
│   ├── test_main.cpp
│   └── unit/
│       └── test_utils.cpp
├── benchmarks/
│   └── bench_main.cpp
├── docs/
│   └── Doxyfile
├── third_party/
│   └── googletest/
├── .clang-format
├── .clang-tidy
└── README.md
```

### CMake 配置

```cmake
cmake_minimum_required(VERSION 3.20)
project(MyProject VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(BUILD_TESTS "构建测试" ON)
option(BUILD_BENCHMARKS "构建性能测试" OFF)

include(cmake/CompilerOptions.cmake)

add_library(myproject
    src/internal/implementation.cpp
)

target_include_directories(myproject
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_compile_features(myproject PUBLIC cxx_std_20)

if(BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()

if(BUILD_BENCHMARKS)
    add_subdirectory(benchmarks)
endif()
```

### 编译器选项

```cmake
# cmake/CompilerOptions.cmake

if(MSVC)
    add_compile_options(
        /W4           # 警告级别 4
        /WX           # 警告视为错误
        /permissive-  # 严格标准一致性
        /Zc:__cplusplus  # 正确报告 __cplusplus 宏
    )
else()
    add_compile_options(
        -Wall         # 所有警告
        -Wextra       # 额外警告
        -Werror       # 警告视为错误
        -Wpedantic    # 严格标准一致性
        -Wconversion  # 隐式转换警告
        -Wshadow      # 变量遮蔽警告
    )
    
    if(CMAKE_CXX_COMPILER_ID STREQUAL "Clang")
        add_compile_options(-Wthread-safety)
    endif()
endif()
```

## Performance Optimization

### 移动语义

```cpp
#include <utility>
#include <vector>

/**
 * @brief 正确实现移动语义
 */
class Buffer {
private:
    int* data_;
    size_t size_;
    
public:
    explicit Buffer(size_t size) : data_(new int[size]()), size_(size) {}
    
    ~Buffer() { delete[] data_; }
    
    // 复制构造函数
    Buffer(const Buffer& other) 
        : data_(new int[other.size_]), size_(other.size_) {
        std::copy(other.data_, other.data_ + size_, data_);
    }
    
    // 移动构造函数
    Buffer(Buffer&& other) noexcept
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
    }
    
    // 复制赋值运算符
    Buffer& operator=(const Buffer& other) {
        if (this != &other) {
            delete[] data_;
            data_ = new int[other.size_];
            size_ = other.size_;
            std::copy(other.data_, other.data_ + size_, data_);
        }
        return *this;
    }
    
    // 移动赋值运算符
    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data_;
            data_ = other.data_;
            size_ = other.size_;
            other.data_ = nullptr;
            other.size_ = 0;
        }
        return *this;
    }
};

/**
 * @brief 使用 std::move 优化性能
 */
void move_example() {
    std::vector<Buffer> buffers;
    
    Buffer buf(1000);
    buffers.push_back(std::move(buf));  // 移动而非复制
    
    // buf 现在处于有效但未定义状态
}
```

### 小对象优化

```cpp
#include <string>
#include <functional>

/**
 * @brief 小字符串优化 (SSO)
 */
void sso_example() {
    // 短字符串存储在栈上，不分配堆内存
    std::string short_str = "hello";  // SSO 生效
    
    // 长字符串需要堆分配
    std::string long_str = "这是一个非常长的字符串，超过 SSO 阈值...";
}

/**
 * @brief 小函数对象优化
 */
void function_optimization() {
    // 小 lambda 可以内联，无函数指针开销
    auto small_func = [](int x) { return x * 2; };
    
    // std::function 有类型擦除开销
    std::function<int(int)> func = small_func;
    
    // 对于性能关键代码，使用模板而非 std::function
    auto process = []<typename F>(F&& f, int value) {
        return f(value);
    };
}
```

### 编译期优化

```cpp
#include <array>
#include <algorithm>

/**
 * @brief constexpr 编译期计算
 */
constexpr int factorial(int n) {
    return n <= 1 ? 1 : n * factorial(n - 1);
}

static_assert(factorial(5) == 120);  // 编译期计算

/**
 * @brief 模板元编程
 */
template<int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

template<>
struct Factorial<0> {
    static constexpr int value = 1;
};

static_assert(Factorial<5>::value == 120);

/**
 * @brief 编译期字符串处理
 */
constexpr size_t str_length(const char* str) {
    size_t len = 0;
    while (str[len] != '\0') ++len;
    return len;
}

static_assert(str_length("hello") == 5);
```

## Quick Reference: C++ Idioms

| 惯用法 | 描述 |
|--------|------|
| RAII | 资源获取即初始化，绑定资源生命周期到对象 |
| Rule of Five | 析构函数、复制构造/赋值、移动构造/赋值 |
| Rule of Zero | 让编译器自动生成特殊成员函数 |
| PIMPL | 指向实现的指针，隐藏实现细节 |
| CRTP | 奇异递归模板模式，静态多态 |
| SFINAE | 替换失败并非错误，模板元编程 |
| Copy-and-Swap | 复制后交换，简化赋值运算符实现 |
| NVI | 非虚接口模式，模板方法 |

## Anti-Patterns to Avoid

```cpp
// 错误：裸指针管理资源
void bad_raw_pointer() {
    int* ptr = new int(42);
    // 如果这里抛出异常，内存泄漏
    delete ptr;
}

// 正确：使用智能指针
void good_smart_pointer() {
    auto ptr = std::make_unique<int>(42);
    // 自动释放，异常安全
}

// 错误：返回局部变量的引用
const int& bad_return_ref() {
    int local = 42;
    return local;  // 返回悬空引用
}

// 正确：返回值
int good_return_value() {
    int local = 42;
    return local;  // 返回副本或触发 RVO
}

// 错误：忽略移动语义
std::vector<int> bad_copy() {
    std::vector<int> result = create_large_vector();
    return result;  // 可能触发复制
}

// 正确：显式移动（虽然现代编译器会自动优化）
std::vector<int> good_move() {
    std::vector<int> result = create_large_vector();
    return std::move(result);  // 显式移动
}

// 错误：在循环中构造字符串
std::string bad_string_concat(int n) {
    std::string result;
    for (int i = 0; i < n; ++i) {
        result += std::to_string(i);  // 多次重新分配
    }
    return result;
}

// 正确：预分配或使用字符串流
std::string good_string_concat(int n) {
    std::ostringstream oss;
    for (int i = 0; i < n; ++i) {
        oss << i;
    }
    return oss.str();
}

// 错误：使用 C 风格数组
void bad_c_array() {
    int arr[10];
    // 容易越界，不安全
}

// 正确：使用 std::array 或 std::vector
void good_cpp_container() {
    std::array<int, 10> arr;
    std::vector<int> vec(10);
    // 边界检查，安全
}
```

**Remember**: 现代 C++ 强调资源安全、类型安全和零开销抽象。优先使用智能指针、RAII 和标准库容器，避免手动内存管理和 C 风格代码。
