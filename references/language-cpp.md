# C++ Pro 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 C++ 相关开发、系统编程、性能优化、游戏开发

## 核心特性

### 现代 C++ (C++17/20/23)

```cpp
#include <iostream>
#include <vector>
#include <algorithm>
#include <ranges>
#include <concepts>

/**
 * @brief 演示 C++20 Concepts 约束模板参数
 * @tparam T 必须满足 std::integral 概念的类型
 * @param value 要处理的整数值
 * @return 处理后的结果
 */
template<std::integral T>
T process_value(T value) {
    return value * 2;
}

/**
 * @brief 使用 C++20 Ranges 进行函数式数据处理
 * @param data 输入数据向量
 * @return 过滤并转换后的结果向量
 */
std::vector<int> filter_and_transform(const std::vector<int>& data) {
    auto result = data 
        | std::views::filter([](int x) { return x > 0; })
        | std::views::transform([](int x) { return x * 2; });
    return std::vector<int>(result.begin(), result.end());
}
```

### RAII 资源管理

```cpp
#include <memory>
#include <fstream>
#include <mutex>

/**
 * @brief RAII 文件处理器，自动管理文件资源
 */
class FileHandler {
private:
    std::fstream file_;
    std::string filepath_;

public:
    /**
     * @brief 构造函数，打开文件
     * @param path 文件路径
     * @param mode 打开模式
     */
    FileHandler(const std::string& path, std::ios::openmode mode)
        : filepath_(path), file_(path, mode) {
        if (!file_.is_open()) {
            throw std::runtime_error("无法打开文件: " + path);
        }
    }
    
    /**
     * @brief 析构函数，自动关闭文件
     */
    ~FileHandler() {
        if (file_.is_open()) {
            file_.close();
        }
    }
    
    /**
     * @brief 写入数据到文件
     * @param data 要写入的数据
     */
    void write(const std::string& data) {
        file_ << data;
    }
    
    // 禁止拷贝
    FileHandler(const FileHandler&) = delete;
    FileHandler& operator=(const FileHandler&) = delete;
    
    // 允许移动
    FileHandler(FileHandler&&) noexcept = default;
    FileHandler& operator=(FileHandler&&) noexcept = default;
};

/**
 * @brief RAII 锁守卫，自动释放互斥锁
 */
class LockGuard {
private:
    std::mutex& mutex_;

public:
    explicit LockGuard(std::mutex& m) : mutex_(m) {
        mutex_.lock();
    }
    
    ~LockGuard() {
        mutex_.unlock();
    }
    
    LockGuard(const LockGuard&) = delete;
    LockGuard& operator=(const LockGuard&) = delete;
};
```

### 智能指针

```cpp
#include <memory>
#include <vector>

/**
 * @brief 使用智能指针管理动态内存的资源类
 */
class Resource {
public:
    /**
     * @brief 构造函数
     * @param name 资源名称
     */
    explicit Resource(const std::string& name) : name_(name) {
        std::cout << "创建资源: " << name_ << std::endl;
    }
    
    /**
     * @brief 析构函数，自动释放资源
     */
    ~Resource() {
        std::cout << "释放资源: " << name_ << std::endl;
    }
    
    /**
     * @brief 使用资源
     */
    void use() const {
        std::cout << "使用资源: " << name_ << std::endl;
    }

private:
    std::string name_;
};

/**
 * @brief 演示智能指针的使用方式
 */
void smart_pointer_demo() {
    // unique_ptr: 独占所有权
    std::unique_ptr<Resource> unique_res = std::make_unique<Resource>("独占资源");
    unique_res->use();
    
    // shared_ptr: 共享所有权
    std::shared_ptr<Resource> shared_res1 = std::make_shared<Resource>("共享资源");
    std::shared_ptr<Resource> shared_res2 = shared_res1; // 引用计数增加
    shared_res1->use();
    
    // weak_ptr: 不增加引用计数的观察者
    std::weak_ptr<Resource> weak_res = shared_res1;
    if (auto locked = weak_res.lock()) {
        locked->use();
    }
}
```

### 模板编程

```cpp
#include <type_traits>
#include <concepts>

/**
 * @brief 概念约束：要求类型可序列化
 * @tparam T 要检查的类型
 */
template<typename T>
concept Serializable = requires(T t) {
    { t.serialize() } -> std::convertible_to<std::string>;
};

/**
 * @brief 通用容器模板类
 * @tparam T 元素类型
 * @tparam Capacity 容器容量
 */
template<typename T, size_t Capacity>
class FixedContainer {
private:
    std::array<T, Capacity> data_;
    size_t size_ = 0;

public:
    /**
     * @brief 添加元素到容器
     * @param value 要添加的值
     * @return 是否添加成功
     */
    bool push(const T& value) {
        if (size_ >= Capacity) return false;
        data_[size_++] = value;
        return true;
    }
    
    /**
     * @brief 获取容器当前大小
     * @return 元素数量
     */
    size_t size() const { return size_; }
    
    /**
     * @brief 获取容器容量
     * @return 最大容量
     */
    static constexpr size_t capacity() { return Capacity; }
};

/**
 * @brief 可变参数模板：计算总和
 * @tparam Args 参数类型包
 * @param args 参数包
 * @return 所有参数的总和
 */
template<typename... Args>
auto sum(Args... args) {
    return (args + ...);
}
```

### 移动语义

```cpp
#include <utility>
#include <vector>

/**
 * @brief 演示移动语义的缓冲区类
 */
class Buffer {
private:
    int* data_;
    size_t size_;

public:
    /**
     * @brief 构造函数，分配内存
     * @param size 缓冲区大小
     */
    explicit Buffer(size_t size) : size_(size), data_(new int[size]()) {}
    
    /**
     * @brief 析构函数，释放内存
     */
    ~Buffer() { delete[] data_; }
    
    /**
     * @brief 移动构造函数
     * @param other 要移动的源对象
     */
    Buffer(Buffer&& other) noexcept 
        : data_(other.data_), size_(other.size_) {
        other.data_ = nullptr;
        other.size_ = 0;
    }
    
    /**
     * @brief 移动赋值运算符
     * @param other 要移动的源对象
     * @return 当前对象引用
     */
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
    
    // 禁止拷贝
    Buffer(const Buffer&) = delete;
    Buffer& operator=(const Buffer&) = delete;
};
```

## 最佳实践

### 1. 优先使用智能指针

```cpp
// 推荐
auto resource = std::make_unique<Resource>("name");
auto shared = std::make_shared<Resource>("shared");

// 避免
Resource* raw = new Resource("name"); // 需要手动 delete
```

### 2. 使用 RAII 管理所有资源

```cpp
/**
 * @brief 使用标准库 RAII 包装器
 */
void use_raii() {
    // 使用 std::lock_guard 管理互斥锁
    std::mutex mtx;
    {
        std::lock_guard<std::mutex> lock(mtx);
        // 临界区代码
    } // 自动释放锁
    
    // 使用 std::unique_ptr 管理动态内存
    auto ptr = std::make_unique<int[]>(100);
    // 自动释放内存
}
```

### 3. 使用 constexpr 和 consteval

```cpp
/**
 * @brief 编译期计算斐波那契数
 * @param n 斐波那契数列索引
 * @return 第 n 个斐波那契数
 */
constexpr int fibonacci(int n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
}

// 编译期计算
static_assert(fibonacci(10) == 55);
```

### 4. 异常安全保证

```cpp
/**
 * @brief 异常安全的资源交换函数
 * @tparam T 类型参数
 * @param a 第一个对象
 * @param b 第二个对象
 */
template<typename T>
void safe_swap(T& a, T& b) noexcept {
    T temp = std::move(a);
    a = std::move(b);
    b = std::move(temp);
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `std::unique_ptr` | 独占所有权 | `auto p = make_unique<T>()` |
| `std::shared_ptr` | 共享所有权 | `auto p = make_shared<T>()` |
| `std::weak_ptr` | 打破循环引用 | `weak_ptr<T> w = shared` |
| `std::move` | 转移所有权 | `auto b = std::move(a)` |
| `constexpr` | 编译期计算 | `constexpr int x = f()` |
| `std::views` | 惰性求值范围 | `v \| filter \| transform` |
| `concepts` | 模板约束 | `template<std::integral T>` |
| `auto` | 类型推导 | `auto x = getValue()` |
| `std::optional` | 可选值 | `optional<int> maybe` |
| `std::variant` | 类型安全联合 | `variant<int, string>` |
