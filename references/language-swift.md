# Swift Expert 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 iOS/macOS 开发、SwiftUI、Swift 并发、Apple 生态

## 核心特性

### SwiftUI 声明式 UI

```swift
import SwiftUI

/**
 * @brief 用户数据模型，遵循 ObservableObject 协议
 * @discussion 使用 @Published 属性包装器自动发布变更通知
 */
class UserViewModel: ObservableObject {
    @Published var username: String = ""
    @Published var isLoading: Bool = false
    
    /**
     * @brief 异步加载用户数据
     */
    func loadUser() async {
        isLoading = true
        defer { isLoading = false }
        
        // 模拟网络请求
        try? await Task.sleep(nanoseconds: 1_000_000_000)
        username = "John Doe"
    }
}

/**
 * @brief 用户资料视图
 * @discussion 展示 SwiftUI 声明式 UI 模式
 */
struct UserProfileView: View {
    @StateObject private var viewModel = UserViewModel()
    @State private var showError = false
    
    var body: some View {
        VStack(spacing: 20) {
            if viewModel.isLoading {
                ProgressView("加载中...")
            } else {
                Text("用户: \(viewModel.username)")
                    .font(.title)
                
                Button("刷新") {
                    Task {
                        await viewModel.loadUser()
                    }
                }
                .buttonStyle(.borderedProminent)
            }
        }
        .padding()
        .alert("错误", isPresented: $showError) {
            Button("确定", role: .cancel) { }
        }
    }
}
```

### Combine 响应式编程

```swift
import Combine

/**
 * @brief 搜索视图模型，使用 Combine 处理用户输入
 */
class SearchViewModel: ObservableObject {
    @Published var searchText: String = ""
    @Published var results: [String] = []
    
    private var cancellables = Set<AnyCancellable>()
    
    /**
     * @brief 初始化搜索功能
     * @discussion 使用 debounce 减少搜索请求频率
     */
    init() {
        $searchText
            .debounce(for: .milliseconds(300), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .sink { [weak self] query in
                self?.performSearch(query: query)
            }
            .store(in: &cancellables)
    }
    
    /**
     * @brief 执行搜索操作
     * @param query 搜索关键词
     */
    private func performSearch(query: String) {
        guard !query.isEmpty else {
            results = []
            return
        }
        // 模拟搜索结果
        results = ["结果1", "结果2", "结果3"]
    }
}
```

### Swift Concurrency (async/await)

```swift
import Foundation

/**
 * @brief 网络服务类，演示现代 Swift 并发
 */
actor NetworkService {
    private var cache: [String: Data] = [:]
    
    /**
     * @brief 获取远程数据
     * @param url 请求地址
     * @return 响应数据
     * @throws 网络错误
     */
    func fetchData(from url: URL) async throws -> Data {
        // 检查缓存
        if let cached = cache[url.absoluteString] {
            return cached
        }
        
        // 发起网络请求
        let (data, response) = try await URLSession.shared.data(from: url)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NetworkError.invalidResponse
        }
        
        // 缓存结果
        cache[url.absoluteString] = data
        return data
    }
    
    /**
     * @brief 并行获取多个资源
     * @param urls URL 数组
     * @return 数据数组
     */
    func fetchAll(from urls: [URL]) async throws -> [Data] {
        try await withThrowingTaskGroup(of: Data.self) { group in
            for url in urls {
                group.addTask {
                    try await self.fetchData(from: url)
                }
            }
            
            var results: [Data] = []
            for try await data in group {
                results.append(data)
            }
            return results
        }
    }
}

/**
 * @brief 网络错误枚举
 */
enum NetworkError: Error {
    case invalidResponse
    case timeout
    case noConnection
}
```

### 属性包装器

```swift
import Foundation

/**
 * @brief 用户默认值属性包装器
 * @discussion 简化 UserDefaults 的读写操作
 */
@propertyWrapper
struct UserDefault<T> {
    private let key: String
    private let defaultValue: T
    
    /**
     * @brief 初始化属性包装器
     * @param key 存储键名
     * @param defaultValue 默认值
     */
    init(key: String, defaultValue: T) {
        self.key = key
        self.defaultValue = defaultValue
    }
    
    var wrappedValue: T {
        get {
            UserDefaults.standard.object(forKey: key) as? T ?? defaultValue
        }
        set {
            UserDefaults.standard.set(newValue, forKey: key)
        }
    }
}

/**
 * @brief 设置管理器
 */
class SettingsManager {
    @UserDefault(key: "isDarkMode", defaultValue: false)
    var isDarkMode: Bool
    
    @UserDefault(key: "username", defaultValue: "")
    var username: String
}
```

### 协议与扩展

```swift
/**
 * @brief 可识别协议
 */
protocol Identifiable {
    var id: UUID { get }
}

/**
 * @brief 可序列化协议
 */
protocol Serializable {
    func serialize() -> Data?
}

/**
 * @brief 用户模型，遵循多个协议
 */
struct User: Identifiable, Serializable, Codable {
    let id: UUID
    var name: String
    var email: String
    
    /**
     * @brief 序列化为 JSON 数据
     * @return JSON 数据或 nil
     */
    func serialize() -> Data? {
        try? JSONEncoder().encode(self)
    }
}

/**
 * @brief Collection 扩展，添加安全访问方法
 */
extension Collection {
    /**
     * @brief 安全访问集合元素
     * @param index 索引
     * @return 元素或 nil
     */
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}
```

## 最佳实践

### 1. 使用 Actor 保证线程安全

```swift
/**
 * @brief 线程安全的数据存储
 */
actor DataStore {
    private var items: [String: Int] = [:]
    
    func get(_ key: String) -> Int? {
        items[key]
    }
    
    func set(_ key: String, value: Int) {
        items[key] = value
    }
}
```

### 2. 善用 Result 类型

```swift
/**
 * @brief 使用 Result 类型处理异步操作结果
 * @param completion 结果回调
 */
func fetchUser(completion: @escaping (Result<User, Error>) -> Void) {
    Task {
        do {
            let user = try await loadUser()
            completion(.success(user))
        } catch {
            completion(.failure(error))
        }
    }
}
```

### 3. 使用 guard 提前退出

```swift
/**
 * @brief 处理用户输入
 * @param input 用户输入字符串
 * @return 处理结果或 nil
 */
func processInput(_ input: String?) -> String? {
    guard let input = input, !input.isEmpty else {
        return nil
    }
    
    guard input.count >= 3 else {
        return "输入太短"
    }
    
    return input.uppercased()
}
```

### 4. SwiftUI 视图拆分

```swift
/**
 * @brief 主视图，拆分为小组件
 */
struct ContentView: View {
    var body: some View {
        VStack {
            HeaderView()
            ContentArea()
            FooterView()
        }
    }
}

struct HeaderView: View {
    var body: some View {
        Text("标题")
            .font(.largeTitle)
    }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `@State` | 本地状态 | `@State var count = 0` |
| `@StateObject` | 持有 ObservableObject | `@StateObject var vm = VM()` |
| `@ObservedObject` | 观察外部对象 | `@ObservedObject var vm` |
| `@Published` | 发布变更通知 | `@Published var items = []` |
| `@Binding` | 双向绑定 | `@Binding var isOn: Bool` |
| `async/await` | 异步编程 | `let data = try await fetch()` |
| `actor` | 线程安全隔离 | `actor DataStore { }` |
| `Task` | 异步任务 | `Task { await doWork() }` |
| `@propertyWrapper` | 属性包装器 | `@propertyWrapper struct` |
| `some` | 不透明类型 | `var body: some View` |
