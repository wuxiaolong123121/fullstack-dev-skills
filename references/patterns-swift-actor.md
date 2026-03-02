# Swift Actor 开发模式参考

Swift Actor 并发模型、线程安全机制和持久化策略，用于构建高性能、线程安全的 Swift 应用程序。

## When to Activate

- 编写并发 Swift 代码
- 实现线程安全的数据访问
- 设计持久化 Actor 系统
- 重构回调/锁为基础的代码

## Core Principles

### 1. Actor 隔离原则

Actor 通过隔离可变状态来保证线程安全，所有对 Actor 状态的访问必须通过 Actor 的方法进行。

```swift
/// 用户管理 Actor
actor UserManager {
    /// 存储用户数据的字典
    private var users: [String: User] = [:]
    
    /// 添加用户到管理器
    /// - Parameter user: 要添加的用户
    func addUser(_ user: User) {
        users[user.id] = user
    }
    
    /// 根据 ID 获取用户
    /// - Parameter id: 用户标识符
    /// - Returns: 对应的用户，如果不存在则返回 nil
    func getUser(id: String) -> User? {
        return users[id]
    }
    
    /// 获取所有活跃用户
    /// - Returns: 活跃用户列表
    func getActiveUsers() -> [User] {
        return users.values.filter { $0.isActive }
    }
}

/// 使用示例
let manager = UserManager()
await manager.addUser(User(id: "1", name: "Alice"))
let user = await manager.getUser(id: "1")
```

### 2. 数据竞争预防

Actor 编译时保证数据竞争安全，编译器会阻止不安全的跨 Actor 访问。

```swift
/// 银行账户 Actor
actor BankAccount {
    /// 账户余额
    private(set) var balance: Decimal = 0
    
    /// 账户持有人
    let owner: String
    
    /// 初始化账户
    /// - Parameter owner: 账户持有人姓名
    init(owner: String) {
        self.owner = owner
    }
    
    /// 存款
    /// - Parameter amount: 存款金额
    func deposit(_ amount: Decimal) {
        balance += amount
    }
    
    /// 取款
    /// - Parameter amount: 取款金额
    /// - Returns: 取款是否成功
    func withdraw(_ amount: Decimal) -> Bool {
        guard balance >= amount else {
            return false
        }
        balance -= amount
        return true
    }
    
    /// 转账到另一个账户
    /// - Parameters:
    ///   - amount: 转账金额
    ///   - destination: 目标账户
    /// - Returns: 转账是否成功
    func transfer(amount: Decimal, to destination: BankAccount) async -> Bool {
        guard withdraw(amount) else {
            return false
        }
        await destination.deposit(amount)
        return true
    }
}
```

### 3. Sendable 协议约束

跨 Actor 传递的数据必须遵循 Sendable 协议，确保数据传递的安全性。

```swift
/// 用户数据结构（Sendable 兼容）
struct User: Sendable {
    let id: String
    let name: String
    let email: String
    var isActive: Bool
}

/// 配置结构（使用值类型保证 Sendable）
struct AppConfig: Sendable {
    let apiEndpoint: String
    let timeout: TimeInterval
    let maxRetries: Int
}

/// 非 Sendable 类型示例
final class MutableState: @unchecked Sendable {
    private var counter = 0
    private let lock = NSLock()
    
    /// 线程安全地增加计数器
    func increment() -> Int {
        lock.lock()
        defer { lock.unlock() }
        counter += 1
        return counter
    }
}
```

## Actor 模式详解

### 基本 Actor 定义

```swift
/// 计数器 Actor
actor Counter {
    /// 当前计数值
    private var count = 0
    
    /// 获取当前计数
    /// - Returns: 当前计数值
    var currentCount: Int {
        return count
    }
    
    /// 增加计数
    /// - Returns: 增加后的计数值
    func increment() -> Int {
        count += 1
        return count
    }
    
    /// 重置计数器
    func reset() {
        count = 0
    }
    
    /// 批量增加
    /// - Parameter times: 增加次数
    /// - Returns: 最终计数值
    func increment(times: Int) -> Int {
        count += times
        return count
    }
}
```

### Actor 隔离与 nonisolated

```swift
/// 混合隔离策略的 Actor
actor DataProcessor {
    /// 处理器名称（不可变，可同步访问）
    nonisolated let name: String
    
    /// 处理计数（隔离状态）
    private var processCount = 0
    
    /// 初始化处理器
    /// - Parameter name: 处理器名称
    init(name: String) {
        self.name = name
    }
    
    /// 静态方法（不需要 Actor 隔离）
    nonisolated static func validateInput(_ input: String) -> Bool {
        return !input.isEmpty
    }
    
    /// 处理数据
    /// - Parameter data: 输入数据
    /// - Returns: 处理结果
    func process(_ data: String) -> String {
        processCount += 1
        return "Processed: \(data)"
    }
    
    /// 获取处理次数
    /// - Returns: 总处理次数
    func getProcessCount() -> Int {
        return processCount
    }
}
```

### Actor 继承与协议

```swift
/// Actor 协议定义
protocol Storable: Actor {
    associatedtype Item: Sendable
    
    /// 存储项目
    func store(_ item: Item) async
    
    /// 检索项目
    func retrieve(id: String) async -> Item?
    
    /// 删除项目
    func delete(id: String) async -> Bool
}

/// 缓存存储 Actor
actor CacheStorage<T: Sendable>: Storable {
    typealias Item = T
    
    /// 缓存字典
    private var cache: [String: T] = [:]
    
    /// 最大容量
    private let maxCapacity: Int
    
    /// 初始化缓存
    /// - Parameter maxCapacity: 最大缓存容量
    init(maxCapacity: Int = 100) {
        self.maxCapacity = maxCapacity
    }
    
    /// 存储项目到缓存
    /// - Parameter item: 要存储的项目
    func store(_ item: T) async {
        if cache.count >= maxCapacity {
            // 移除最早的项目（简化实现）
            cache.removeValue(forKey: cache.keys.first!)
        }
        cache[UUID().uuidString] = item
    }
    
    /// 从缓存检索项目
    /// - Parameter id: 项目标识符
    /// - Returns: 缓存的项目，如果不存在则返回 nil
    func retrieve(id: String) async -> T? {
        return cache[id]
    }
    
    /// 从缓存删除项目
    /// - Parameter id: 项目标识符
    /// - Returns: 删除是否成功
    func delete(id: String) async -> Bool {
        return cache.removeValue(forKey: id) != nil
    }
}
```

## 线程安全机制

### Actor 序列化访问

```swift
/// 线程安全的集合 Actor
actor SafeCollection<T: Sendable> {
    /// 内部存储数组
    private var items: [T] = []
    
    /// 添加项目
    /// - Parameter item: 要添加的项目
    func append(_ item: T) {
        items.append(item)
    }
    
    /// 批量添加项目
    /// - Parameter newItems: 新项目数组
    func append(contentsOf newItems: [T]) {
        items.append(contentsOf: newItems)
    }
    
    /// 获取所有项目
    /// - Returns: 项目数组的副本
    func getAll() -> [T] {
        return items
    }
    
    /// 过滤项目
    /// - Parameter predicate: 过滤条件
    /// - Returns: 符合条件的项目数组
    func filter(_ predicate: @Sendable (T) -> Bool) -> [T] {
        return items.filter(predicate)
    }
    
    /// 安全地修改项目
    /// - Parameter modifier: 修改闭包
    func modify(_ modifier: @Sendable (inout [T]) -> Void) {
        modifier(&items)
    }
    
    /// 获取项目数量
    /// - Returns: 当前项目数量
    var count: Int {
        return items.count
    }
    
    /// 检查是否为空
    /// - Returns: 集合是否为空
    var isEmpty: Bool {
        return items.isEmpty
    }
}
```

### 死锁预防策略

```swift
/// 资源管理 Actor（避免死锁）
actor ResourceManager {
    /// 资源字典
    private var resources: [String: Resource] = [:]
    
    /// 等待队列
    private var waitingQueue: [(String, CheckedContinuation<Resource, Error>)] = []
    
    /// 获取资源（带超时）
    /// - Parameters:
    ///   - id: 资源标识符
    ///   - timeout: 超时时间
    /// - Returns: 请求的资源
    /// - Throws: 获取失败时抛出错误
    func acquireResource(id: String, timeout: TimeInterval = 5.0) async throws -> Resource {
        // 如果资源可用，直接返回
        if let resource = resources[id] {
            return resource
        }
        
        // 使用 withCheckedThrowingContinuation 处理异步等待
        return try await withCheckedThrowingContinuation { continuation in
            waitingQueue.append((id, continuation))
            
            // 设置超时
            Task {
                try? await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                // 超时后取消等待
                if let index = waitingQueue.firstIndex(where: { $0.0 == id }) {
                    let (_, pendingContinuation) = waitingQueue.remove(at: index)
                    pendingContinuation.resume(throwing: ResourceError.timeout)
                }
            }
        }
    }
    
    /// 释放资源
    /// - Parameter id: 资源标识符
    func releaseResource(id: String) {
        resources.removeValue(forKey: id)
        
        // 检查是否有等待的请求
        if let index = waitingQueue.firstIndex(where: { $0.0 == id }) {
            let (_, continuation) = waitingQueue.remove(at: index)
            if let resource = resources[id] {
                continuation.resume(returning: resource)
            }
        }
    }
}

/// 资源错误类型
enum ResourceError: Error {
    case timeout
    case notFound
    case unavailable
}

/// 资源类型
struct Resource: Sendable {
    let id: String
    let data: Data
}
```

### 原子操作模式

```swift
/// 原子计数器 Actor
actor AtomicCounter {
    /// 计数值
    private var value: Int = 0
    
    /// 获取当前值
    /// - Returns: 当前计数值
    func get() -> Int {
        return value
    }
    
    /// 设置新值
    /// - Parameter newValue: 新的计数值
    func set(_ newValue: Int) {
        value = newValue
    }
    
    /// 原子增加并返回旧值
    /// - Parameter delta: 增量
    /// - Returns: 增加前的值
    func getAndAdd(_ delta: Int) -> Int {
        let oldValue = value
        value += delta
        return oldValue
    }
    
    /// 原子增加并返回新值
    /// - Parameter delta: 增量
    /// - Returns: 增加后的值
    func addAndGet(_ delta: Int) -> Int {
        value += delta
        return value
    }
    
    /// 比较并交换
    /// - Parameters:
    ///   - expected: 期望值
    ///   - newValue: 新值
    /// - Returns: 是否交换成功
    func compareAndSwap(expected: Int, newValue: Int) -> Bool {
        if value == expected {
            value = newValue
            return true
        }
        return false
    }
}
```

## 持久化策略

### 文件系统持久化

```swift
/// 文件持久化 Actor
actor FilePersistence<T: Codable & Sendable> {
    /// 文件管理器
    private let fileManager = FileManager.default
    
    /// 存储目录 URL
    private let storageDirectory: URL
    
    /// 内存缓存
    private var cache: [String: T] = [:]
    
    /// 初始化持久化存储
    /// - Parameter directory: 存储目录名称
    init(directory: String) throws {
        let appSupport = try fileManager.url(
            for: .applicationSupportDirectory,
            in: .userDomainMask,
            appropriateFor: nil,
            create: true
        )
        self.storageDirectory = appSupport.appendingPathComponent(directory)
        try fileManager.createDirectory(at: storageDirectory, withIntermediateDirectories: true)
    }
    
    /// 保存项目
    /// - Parameters:
    ///   - item: 要保存的项目
    ///   - id: 项目标识符
    /// - Throws: 保存失败时抛出错误
    func save(_ item: T, id: String) async throws {
        cache[id] = item
        
        let fileURL = storageDirectory.appendingPathComponent("\(id).json")
        let data = try JSONEncoder().encode(item)
        try data.write(to: fileURL)
    }
    
    /// 加载项目
    /// - Parameter id: 项目标识符
    /// - Returns: 加载的项目，如果不存在则返回 nil
    /// - Throws: 加载失败时抛出错误
    func load(id: String) async throws -> T? {
        // 先检查缓存
        if let cached = cache[id] {
            return cached
        }
        
        let fileURL = storageDirectory.appendingPathComponent("\(id).json")
        guard fileManager.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        let data = try Data(contentsOf: fileURL)
        let item = try JSONDecoder().decode(T.self, from: data)
        cache[id] = item
        return item
    }
    
    /// 删除项目
    /// - Parameter id: 项目标识符
    /// - Returns: 删除是否成功
    /// - Throws: 删除失败时抛出错误
    func delete(id: String) async throws -> Bool {
        cache.removeValue(forKey: id)
        
        let fileURL = storageDirectory.appendingPathComponent("\(id).json")
        if fileManager.fileExists(atPath: fileURL.path) {
            try fileManager.removeItem(at: fileURL)
            return true
        }
        return false
    }
    
    /// 获取所有已保存项目的 ID
    /// - Returns: 项目 ID 列表
    /// - Throws: 读取失败时抛出错误
    func getAllIds() async throws -> [String] {
        let files = try fileManager.contentsOfDirectory(
            at: storageDirectory,
            includingPropertiesForKeys: nil
        )
        return files
            .filter { $0.pathExtension == "json" }
            .map { $0.deletingPathExtension().lastPathComponent }
    }
}
```

### 数据库持久化模式

```swift
import SQLite3

/// SQLite 持久化 Actor
actor SQLitePersistence {
    /// 数据库连接
    private var db: OpaquePointer?
    
    /// 数据库路径
    private let dbPath: String
    
    /// 初始化数据库连接
    /// - Parameter path: 数据库文件路径
    /// - Throws: 连接失败时抛出错误
    init(path: String) async throws {
        self.dbPath = path
        try await openDatabase()
        try await createTables()
    }
    
    /// 打开数据库连接
    private func openDatabase() throws {
        if sqlite3_open(dbPath, &db) != SQLITE_OK {
            throw PersistenceError.connectionFailed
        }
    }
    
    /// 创建数据表
    private func createTables() async throws {
        let createTableSQL = """
            CREATE TABLE IF NOT EXISTS items (
                id TEXT PRIMARY KEY,
                data BLOB NOT NULL,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )
            """
        
        try await execute(createTableSQL)
    }
    
    /// 执行 SQL 语句
    /// - Parameter sql: SQL 语句
    /// - Throws: 执行失败时抛出错误
    private func execute(_ sql: String) throws {
        var statement: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            throw PersistenceError.queryFailed
        }
        
        defer {
            sqlite3_finalize(statement)
        }
        
        if sqlite3_step(statement) != SQLITE_DONE {
            throw PersistenceError.executionFailed
        }
    }
    
    /// 保存数据
    /// - Parameters:
    ///   - id: 数据标识符
    ///   - data: 要保存的数据
    /// - Throws: 保存失败时抛出错误
    func save(id: String, data: Data) async throws {
        let sql = """
            INSERT OR REPLACE INTO items (id, data, created_at, updated_at)
            VALUES (?, ?, ?, ?)
            """
        
        var statement: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            throw PersistenceError.queryFailed
        }
        
        defer {
            sqlite3_finalize(statement)
        }
        
        let timestamp = Int(Date().timeIntervalSince1970)
        sqlite3_bind_text(statement, 1, (id as NSString).utf8String, -1, nil)
        data.withUnsafeBytes { ptr in
            sqlite3_bind_blob(statement, 2, ptr.baseAddress, Int32(data.count), nil)
        }
        sqlite3_bind_int64(statement, 3, Int64(timestamp))
        sqlite3_bind_int64(statement, 4, Int64(timestamp))
        
        if sqlite3_step(statement) != SQLITE_DONE {
            throw PersistenceError.executionFailed
        }
    }
    
    /// 加载数据
    /// - Parameter id: 数据标识符
    /// - Returns: 加载的数据，如果不存在则返回 nil
    /// - Throws: 加载失败时抛出错误
    func load(id: String) async throws -> Data? {
        let sql = "SELECT data FROM items WHERE id = ?"
        var statement: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            throw PersistenceError.queryFailed
        }
        
        defer {
            sqlite3_finalize(statement)
        }
        
        sqlite3_bind_text(statement, 1, (id as NSString).utf8String, -1, nil)
        
        if sqlite3_step(statement) == SQLITE_ROW {
            if let blob = sqlite3_column_blob(statement, 0) {
                let size = sqlite3_column_bytes(statement, 0)
                return Data(bytes: blob, count: Int(size))
            }
        }
        
        return nil
    }
    
    /// 删除数据
    /// - Parameter id: 数据标识符
    /// - Returns: 删除是否成功
    /// - Throws: 删除失败时抛出错误
    func delete(id: String) async throws -> Bool {
        let sql = "DELETE FROM items WHERE id = ?"
        var statement: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
            throw PersistenceError.queryFailed
        }
        
        defer {
            sqlite3_finalize(statement)
        }
        
        sqlite3_bind_text(statement, 1, (id as NSString).utf8String, -1, nil)
        
        return sqlite3_step(statement) == SQLITE_DONE
    }
    
    /// 关闭数据库连接
    func close() {
        if let db = db {
            sqlite3_close(db)
            self.db = nil
        }
    }
    
    deinit {
        close()
    }
}

/// 持久化错误类型
enum PersistenceError: Error {
    case connectionFailed
    case queryFailed
    case executionFailed
    case dataNotFound
}
```

### Core Data 持久化

```swift
import CoreData

/// Core Data 持久化 Actor
actor CoreDataPersistence {
    /// 持久化容器
    private let container: NSPersistentContainer
    
    /// 主上下文
    private var mainContext: NSManagedObjectContext {
        return container.viewContext
    }
    
    /// 初始化 Core Data 持久化
    /// - Parameters:
    ///   - modelName: 数据模型名称
    ///   - inMemory: 是否使用内存存储
    init(modelName: String, inMemory: Bool = false) async throws {
        container = NSPersistentContainer(name: modelName)
        
        if inMemory {
            let description = NSPersistentStoreDescription()
            description.type = NSInMemoryStoreType
            container.persistentStoreDescriptions = [description]
        }
        
        try await container.loadPersistentStores()
    }
    
    /// 保存上下文
    /// - Throws: 保存失败时抛出错误
    private func saveContext() throws {
        let context = container.viewContext
        if context.hasChanges {
            try context.save()
        }
    }
    
    /// 创建后台上下文
    /// - Returns: 新的后台上下文
    func newBackgroundContext() -> NSManagedObjectContext {
        return container.newBackgroundContext()
    }
    
    /// 在后台执行任务
    /// - Parameter block: 要执行的任务闭包
    /// - Throws: 任务执行失败时抛出错误
    func performBackgroundTask<T>(_ block: @escaping (NSManagedObjectContext) throws -> T) async rethrows -> T {
        return try await container.performBackgroundTask(block)
    }
    
    /// 获取所有实体
    /// - Parameter entityName: 实体名称
    /// - Returns: 实体数组
    /// - Throws: 获取失败时抛出错误
    func fetchAll<T: NSManagedObject>(_ entityName: String) async throws -> [T] {
        let request = NSFetchRequest<T>(entityName: entityName)
        return try mainContext.fetch(request)
    }
    
    /// 删除所有实体
    /// - Parameter entityName: 实体名称
    /// - Throws: 删除失败时抛出错误
    func deleteAll(_ entityName: String) async throws {
        let request = NSFetchRequest<NSFetchRequestResult>(entityName: entityName)
        let deleteRequest = NSBatchDeleteRequest(fetchRequest: request)
        try mainContext.execute(deleteRequest)
        try saveContext()
    }
}

/// NSPersistentContainer 扩展
extension NSPersistentContainer {
    /// 异步加载持久化存储
    /// - Throws: 加载失败时抛出错误
    func loadPersistentStores() async throws {
        try await withCheckedThrowingContinuation { continuation in
            loadPersistentStores { _, error in
                if let error = error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume()
                }
            }
        }
    }
}
```

## 并发模式示例

### Task 与 Actor 协作

```swift
/// 任务调度 Actor
actor TaskScheduler {
    /// 活跃任务字典
    private var activeTasks: [String: Task<Void, Never>] = [:]
    
    /// 最大并发数
    private let maxConcurrency: Int
    
    /// 当前并发数
    private var currentConcurrency: Int = 0
    
    /// 初始化调度器
    /// - Parameter maxConcurrency: 最大并发任务数
    init(maxConcurrency: Int = 5) {
        self.maxConcurrency = maxConcurrency
    }
    
    /// 提交任务
    /// - Parameters:
    ///   - id: 任务标识符
    ///   - priority: 任务优先级
    ///   - operation: 任务操作
    /// - Returns: 任务是否成功提交
    @discardableResult
    func submit(
        id: String,
        priority: TaskPriority = .medium,
        operation: @escaping @Sendable () async throws -> Void
    ) -> Bool {
        guard currentConcurrency < maxConcurrency else {
            return false
        }
        
        currentConcurrency += 1
        
        let task = Task(priority: priority) { [weak self] in
            do {
                try await operation()
            } catch {
                print("Task \(id) failed: \(error)")
            }
            await self?.completeTask(id: id)
        }
        
        activeTasks[id] = task
        return true
    }
    
    /// 完成任务
    /// - Parameter id: 任务标识符
    private func completeTask(id: String) {
        activeTasks.removeValue(forKey: id)
        currentConcurrency = max(0, currentConcurrency - 1)
    }
    
    /// 取消任务
    /// - Parameter id: 任务标识符
    /// - Returns: 任务是否成功取消
    func cancel(id: String) -> Bool {
        if let task = activeTasks[id] {
            task.cancel()
            activeTasks.removeValue(forKey: id)
            currentConcurrency = max(0, currentConcurrency - 1)
            return true
        }
        return false
    }
    
    /// 取消所有任务
    func cancelAll() {
        for (_, task) in activeTasks {
            task.cancel()
        }
        activeTasks.removeAll()
        currentConcurrency = 0
    }
    
    /// 获取活跃任务数
    /// - Returns: 当前活跃任务数
    func activeTaskCount() -> Int {
        return activeTasks.count
    }
}
```

### Actor 隔离边界通信

```swift
/// 消息类型定义
enum ActorMessage: Sendable {
    case data(Data)
    case command(String)
    case query(String)
}

/// 消息响应类型
struct ActorResponse: Sendable {
    let id: String
    let result: Result<Data?, Error>
}

/// 消息处理 Actor
actor MessageHandler {
    /// 处理器 ID
    let id: String
    
    /// 消息队列
    private var messageQueue: [ActorMessage] = []
    
    /// 响应回调
    private var responseHandler: (@Sendable (ActorResponse) async -> Void)?
    
    /// 初始化消息处理器
    /// - Parameter id: 处理器标识符
    init(id: String) {
        self.id = id
    }
    
    /// 设置响应处理器
    /// - Parameter handler: 响应处理闭包
    func setResponseHandler(_ handler: @escaping @Sendable (ActorResponse) async -> Void) {
        self.responseHandler = handler
    }
    
    /// 发送消息
    /// - Parameter message: 要发送的消息
    func send(_ message: ActorMessage) async {
        messageQueue.append(message)
        await processNextMessage()
    }
    
    /// 批量发送消息
    /// - Parameter messages: 消息数组
    func sendBatch(_ messages: [ActorMessage]) async {
        messageQueue.append(contentsOf: messages)
        await processNextMessage()
    }
    
    /// 处理下一条消息
    private func processNextMessage() async {
        guard !messageQueue.isEmpty else { return }
        
        let message = messageQueue.removeFirst()
        let messageId = UUID().uuidString
        
        let result: Result<Data?, Error> = await {
            do {
                let data = try await processMessage(message)
                return .success(data)
            } catch {
                return .failure(error)
            }
        }()
        
        let response = ActorResponse(id: messageId, result: result)
        await responseHandler?(response)
    }
    
    /// 处理单条消息
    /// - Parameter message: 要处理的消息
    /// - Returns: 处理结果数据
    /// - Throws: 处理失败时抛出错误
    private func processMessage(_ message: ActorMessage) async throws -> Data? {
        switch message {
        case .data(let data):
            return data
        case .command(let cmd):
            return cmd.data(using: .utf8)
        case .query(let query):
            return query.data(using: .utf8)
        }
    }
    
    /// 获取队列长度
    /// - Returns: 当前队列中的消息数
    var queueLength: Int {
        return messageQueue.count
    }
}
```

### Actor 状态机模式

```swift
/// 状态机状态
enum StateMachineState: Sendable, Equatable {
    case idle
    case loading
    case loaded(Data)
    case error(Error)
    
    static func == (lhs: StateMachineState, rhs: StateMachineState) -> Bool {
        switch (lhs, rhs) {
        case (.idle, .idle):
            return true
        case (.loading, .loading):
            return true
        case (.loaded(let l), .loaded(let r)):
            return l == r
        case (.error, .error):
            return true
        default:
            return false
        }
    }
}

/// 状态机 Actor
actor StateMachine {
    /// 当前状态
    private(set) var state: StateMachineState = .idle
    
    /// 状态转换历史
    private var history: [StateMachineState] = []
    
    /// 最大历史记录数
    private let maxHistory: Int
    
    /// 初始化状态机
    /// - Parameter maxHistory: 最大历史记录数
    init(maxHistory: Int = 10) {
        self.maxHistory = maxHistory
    }
    
    /// 转换到新状态
    /// - Parameter newState: 新状态
    /// - Returns: 转换是否成功
    @discardableResult
    func transition(to newState: StateMachineState) -> Bool {
        guard canTransition(from: state, to: newState) else {
            return false
        }
        
        history.append(state)
        if history.count > maxHistory {
            history.removeFirst()
        }
        
        state = newState
        return true
    }
    
    /// 检查是否可以转换
    /// - Parameters:
    ///   - from: 源状态
    ///   - to: 目标状态
    /// - Returns: 是否允许转换
    private func canTransition(from: StateMachineState, to: StateMachineState) -> Bool {
        switch (from, to) {
        case (.idle, .loading):
            return true
        case (.loading, .loaded):
            return true
        case (.loading, .error):
            return true
        case (.loaded, .loading):
            return true
        case (.error, .idle):
            return true
        case (.error, .loading):
            return true
        default:
            return false
        }
    }
    
    /// 重置状态机
    func reset() {
        history.append(state)
        state = .idle
    }
    
    /// 获取历史记录
    /// - Returns: 状态历史数组
    func getHistory() -> [StateMachineState] {
        return history
    }
    
    /// 回滚到上一个状态
    /// - Returns: 回滚是否成功
    func rollback() -> Bool {
        guard let previous = history.popLast() else {
            return false
        }
        state = previous
        return true
    }
}
```

### Actor 池模式

```swift
/// Actor 池管理器
actor ActorPool<T: Actor> {
    /// 池中的 Actor 数组
    private var actors: [T] = []
    
    /// 可用 Actor 索引
    private var availableIndices: Set<Int> = []
    
    /// 初始化 Actor 池
    /// - Parameters:
    ///   - factory: Actor 工厂闭包
    ///   - count: 池大小
    init(factory: @escaping () -> T, count: Int) async {
        for i in 0..<count {
            actors.append(factory())
            availableIndices.insert(i)
        }
    }
    
    /// 获取一个可用的 Actor
    /// - Returns: 可用的 Actor 及其索引，如果没有可用的则返回 nil
    func acquire() async -> (actor: T, index: Int)? {
        guard let index = availableIndices.first else {
            return nil
        }
        availableIndices.remove(index)
        return (actors[index], index)
    }
    
    /// 释放 Actor 回池中
    /// - Parameter index: Actor 索引
    func release(index: Int) {
        guard index >= 0 && index < actors.count else { return }
        availableIndices.insert(index)
    }
    
    /// 执行任务并自动释放
    /// - Parameter operation: 要执行的操作
    /// - Returns: 操作结果
    func withActor<R: Sendable>(_ operation: @escaping (T) async throws -> R) async rethrows -> R? {
        guard let (actor, index) = await acquire() else {
            return nil
        }
        
        defer {
            release(index: index)
        }
        
        return try await operation(actor)
    }
    
    /// 获取池状态
    /// - Returns: (总数量, 可用数量)
    func status() -> (total: Int, available: Int) {
        return (actors.count, availableIndices.count)
    }
}

/// 工作节点 Actor
actor WorkerActor {
    /// 节点 ID
    let id: String
    
    /// 当前是否忙碌
    private(set) var isBusy: Bool = false
    
    /// 初始化工作节点
    /// - Parameter id: 节点标识符
    init(id: String) {
        self.id = id
    }
    
    /// 执行工作
    /// - Parameter task: 要执行的任务
    /// - Returns: 任务结果
    func performWork<T: Sendable>(_ task: @escaping @Sendable () async throws -> T) async rethrows -> T {
        isBusy = true
        defer { isBusy = false }
        return try await task()
    }
}
```

## 错误处理模式

### Actor 错误传播

```swift
/// Actor 错误类型
enum ActorError: Error {
    case stateInvalid
    case operationTimeout
    case resourceUnavailable
    case concurrentModification
}

/// 带错误处理的 Actor
actor SafeActor<T: Sendable> {
    /// 存储的值
    private var value: T
    
    /// 版本号（用于乐观锁）
    private var version: UInt64 = 0
    
    /// 初始化 Actor
    /// - Parameter initialValue: 初始值
    init(initialValue: T) {
        self.value = initialValue
    }
    
    /// 获取当前值和版本
    /// - Returns: 值和版本号的元组
    func get() -> (value: T, version: UInt64) {
        return (value, version)
    }
    
    /// 使用乐观锁更新值
    /// - Parameters:
    ///   - expectedVersion: 期望的版本号
    ///   - newValue: 新值
    /// - Throws: 版本不匹配时抛出错误
    func update(expectedVersion: UInt64, newValue: T) throws {
        guard version == expectedVersion else {
            throw ActorError.concurrentModification
        }
        value = newValue
        version += 1
    }
    
    /// 安全更新值
    /// - Parameter updater: 更新闭包
    /// - Returns: 更新后的值
    func safeUpdate(_ updater: @escaping @Sendable (T) -> T) -> T {
        value = updater(value)
        version += 1
        return value
    }
    
    /// 带重试的更新
    /// - Parameters:
    ///   - maxRetries: 最大重试次数
    ///   - updater: 更新闭包
    /// - Returns: 更新后的值
    /// - Throws: 重试耗尽后抛出错误
    func updateWithRetry(
        maxRetries: Int = 3,
        updater: @escaping @Sendable (T) -> T
    ) throws -> T {
        var attempts = 0
        while attempts < maxRetries {
            do {
                let (currentValue, currentVersion) = get()
                let newValue = updater(currentValue)
                try update(expectedVersion: currentVersion, newValue: newValue)
                return newValue
            } catch ActorError.concurrentModification {
                attempts += 1
                continue
            }
        }
        throw ActorError.concurrentModification
    }
}
```

## 性能优化

### Actor 批处理模式

```swift
/// 批处理 Actor
actor BatchProcessor<T: Sendable, R: Sendable> {
    /// 待处理项目队列
    private var queue: [T] = []
    
    /// 批处理大小
    private let batchSize: Int
    
    /// 处理超时（纳秒）
    private let timeout: UInt64
    
    /// 处理闭包
    private let processBatch: @Sendable ([T]) async throws -> [R]
    
    /// 初始化批处理器
    /// - Parameters:
    ///   - batchSize: 批处理大小
    ///   - timeout: 处理超时时间（秒）
    ///   - processor: 批处理闭包
    init(
        batchSize: Int = 100,
        timeout: TimeInterval = 1.0,
        processor: @escaping @Sendable ([T]) async throws -> [R]
    ) {
        self.batchSize = batchSize
        self.timeout = UInt64(timeout * 1_000_000_000)
        self.processBatch = processor
    }
    
    /// 添加项目到队列
    /// - Parameter item: 要添加的项目
    func add(_ item: T) async throws -> [R]? {
        queue.append(item)
        
        if queue.count >= batchSize {
            return try await flush()
        }
        
        return nil
    }
    
    /// 批量添加项目
    /// - Parameter items: 要添加的项目数组
    func addBatch(_ items: [T]) async throws -> [R]? {
        queue.append(contentsOf: items)
        
        if queue.count >= batchSize {
            return try await flush()
        }
        
        return nil
    }
    
    /// 强制处理队列中的所有项目
    /// - Returns: 处理结果数组
    /// - Throws: 处理失败时抛出错误
    func flush() async throws -> [R] {
        guard !queue.isEmpty else {
            return []
        }
        
        let itemsToProcess = queue
        queue.removeAll()
        
        return try await processBatch(itemsToProcess)
    }
    
    /// 获取队列大小
    /// - Returns: 当前队列中的项目数
    var queueSize: Int {
        return queue.count
    }
}
```

### Actor 缓存模式

```swift
/// 缓存条目
struct CacheEntry<T: Sendable>: Sendable {
    let value: T
    let timestamp: Date
    let ttl: TimeInterval
    
    /// 检查是否过期
    var isExpired: Bool {
        return Date().timeIntervalSince(timestamp) > ttl
    }
}

/// 缓存 Actor
actor CacheActor<K: Hashable & Sendable, V: Sendable> {
    /// 缓存存储
    private var storage: [K: CacheEntry<V>] = [:]
    
    /// 默认 TTL（秒）
    private let defaultTTL: TimeInterval
    
    /// 最大缓存大小
    private let maxSize: Int
    
    /// 初始化缓存
    /// - Parameters:
    ///   - defaultTTL: 默认过期时间
    ///   - maxSize: 最大缓存条目数
    init(defaultTTL: TimeInterval = 300, maxSize: Int = 1000) {
        self.defaultTTL = defaultTTL
        self.maxSize = maxSize
    }
    
    /// 获取缓存值
    /// - Parameter key: 缓存键
    /// - Returns: 缓存值，如果不存在或已过期则返回 nil
    func get(_ key: K) -> V? {
        guard let entry = storage[key] else {
            return nil
        }
        
        if entry.isExpired {
            storage.removeValue(forKey: key)
            return nil
        }
        
        return entry.value
    }
    
    /// 设置缓存值
    /// - Parameters:
    ///   - value: 要缓存的值
    ///   - key: 缓存键
    ///   - ttl: 过期时间（可选）
    func set(_ value: V, forKey key: K, ttl: TimeInterval? = nil) {
        // 如果达到最大大小，移除过期条目
        if storage.count >= maxSize {
            removeExpired()
        }
        
        // 如果仍然达到最大大小，移除最旧的条目
        if storage.count >= maxSize {
            removeOldest()
        }
        
        let entry = CacheEntry(
            value: value,
            timestamp: Date(),
            ttl: ttl ?? defaultTTL
        )
        storage[key] = entry
    }
    
    /// 删除缓存值
    /// - Parameter key: 缓存键
    /// - Returns: 被删除的值
    @discardableResult
    func remove(_ key: K) -> V? {
        return storage.removeValue(forKey: key)?.value
    }
    
    /// 清空缓存
    func clear() {
        storage.removeAll()
    }
    
    /// 移除过期条目
    private func removeExpired() {
        storage = storage.filter { !$0.value.isExpired }
    }
    
    /// 移除最旧的条目
    private func removeOldest() {
        guard let oldest = storage.min(by: { $0.value.timestamp < $1.value.timestamp }) else {
            return
        }
        storage.removeValue(forKey: oldest.key)
    }
    
    /// 获取缓存统计
    /// - Returns: (总条目数, 过期条目数)
    func stats() -> (total: Int, expired: Int) {
        let total = storage.count
        let expired = storage.filter { $0.value.isExpired }.count
        return (total, expired)
    }
}
```

## Quick Reference: Swift Actor 模式

| 模式 | 描述 |
|------|------|
| Actor 隔离 | 通过 Actor 边界保护可变状态 |
| Sendable | 跨 Actor 传递数据的安全协议 |
| nonisolated | 标记不需要 Actor 隔离的成员 |
| async/await | Actor 方法调用的异步语法 |
| Task | 创建异步任务单元 |
| TaskPool | 并发任务池管理 |
| Actor 池 | 复用 Actor 实例提高性能 |

## Anti-Patterns to Avoid

```swift
// 错误：直接访问 Actor 的隔离属性
actor BadExample {
    var count = 0
}
let bad = BadExample()
// print(bad.count)  // 编译错误！

// 正确：通过 async 方法访问
actor GoodExample {
    var count = 0
    
    func getCount() -> Int {
        return count
    }
}
let good = GoodExample()
let count = await good.getCount()

// 错误：在 Actor 内部同步等待自身
actor DeadlockRisk {
    func methodA() async {
        // await methodB()  // 可能导致死锁
    }
    
    func methodB() async {
    }
}

// 正确：使用 nonisolated 或重构
actor NoDeadlock {
    nonisolated func helper() {
        // 不需要隔离的辅助方法
    }
    
    func methodA() async {
        helper()
    }
}

// 错误：非 Sendable 闭包跨 Actor
actor ClosureIssue {
    func process(completion: @escaping () -> Void) {
        // completion 不是 Sendable，可能导致问题
    }
}

// 正确：使用 @Sendable 闭包
actor ClosureFixed {
    func process(completion: @escaping @Sendable () -> Void) {
        Task {
            completion()
        }
    }
}
```

**记住**: Swift Actor 通过编译时检查保证线程安全，正确使用 Actor 隔离和 Sendable 协议是构建安全并发代码的关键。
