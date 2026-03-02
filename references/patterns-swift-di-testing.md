# Swift 协议依赖注入测试模式参考

Swift 协议依赖注入、测试替身模式与最佳实践，用于构建可测试、可维护的 Swift 应用程序。

## When to Activate

- 设计 Swift 模块架构
- 编写可测试的 Swift 代码
- 重构现有 Swift 代码以提高可测试性
- 实现 Swift 依赖注入容器

## Core Principles

### 1. 面向协议编程（Protocol-Oriented Programming）

Swift 推荐使用协议定义抽象接口，而非继承。

```swift
protocol UserServiceProtocol {
    func fetchUser(id: String) async throws -> User
    func saveUser(_ user: User) async throws
}

class UserService: UserServiceProtocol {
    func fetchUser(id: String) async throws -> User {
    }

    func saveUser(_ user: User) async throws {
    }
}
```

### 2. 依赖倒置原则（Dependency Inversion）

高层模块不应依赖低层模块，两者都应依赖抽象。

```swift
protocol NetworkClientProtocol {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}

protocol DatabaseProtocol {
    func fetch<T: Decodable>(_ type: T.Type, id: String) async throws -> T?
    func save<T: Encodable>(_ entity: T) async throws
}

class UserRepository {
    private let networkClient: NetworkClientProtocol
    private let database: DatabaseProtocol

    init(networkClient: NetworkClientProtocol, database: DatabaseProtocol) {
        self.networkClient = networkClient
        self.database = database
    }
}
```

### 3. 显式依赖注入

所有依赖应通过构造器显式注入。

```swift
class OrderProcessor {
    private let paymentService: PaymentServiceProtocol
    private let inventoryService: InventoryServiceProtocol
    private let notificationService: NotificationServiceProtocol

    init(
        paymentService: PaymentServiceProtocol,
        inventoryService: InventoryServiceProtocol,
        notificationService: NotificationServiceProtocol
    ) {
        self.paymentService = paymentService
        self.inventoryService = inventoryService
        self.notificationService = notificationService
    }
}
```

## 协议依赖注入模式

### 构造器注入（Constructor Injection）

```swift
protocol LoggerProtocol {
    func log(_ message: String, level: LogLevel)
}

protocol CacheProtocol {
    func get<T>(_ key: String) -> T?
    func set<T>(_ value: T, for key: String)
}

class DataService {
    private let logger: LoggerProtocol
    private let cache: CacheProtocol

    init(logger: LoggerProtocol, cache: CacheProtocol) {
        self.logger = logger
        self.cache = cache
    }

    func fetchData(key: String) async throws -> Data {
        if let cached: Data = cache.get(key) {
            logger.log("Cache hit for key: \(key)", level: .debug)
            return cached
        }

        logger.log("Cache miss for key: \(key)", level: .debug)
        let data = try await fetchFromNetwork(key: key)
        cache.set(data, for: key)
        return data
    }
}
```

### 属性注入（Property Injection）

```swift
protocol ConfigurationProtocol {
    var apiKey: String { get }
    var baseURL: URL { get }
    var timeout: TimeInterval { get }
}

class APIClient {
    var configuration: ConfigurationProtocol!

    func makeRequest() async throws -> Response {
        let url = configuration.baseURL.appendingPathComponent("api")
        return try await performRequest(url: url)
    }
}

class MockConfiguration: ConfigurationProtocol {
    var apiKey: String { "test-api-key" }
    var baseURL: URL { URL(string: "https://test.example.com")! }
    var timeout: TimeInterval { 30.0 }
}
```

### 方法注入（Method Injection）

```swift
protocol ValidatorProtocol {
    func validate(_ value: String) -> Bool
}

class FormProcessor {
    func processField(
        _ value: String,
        validator: ValidatorProtocol
    ) -> ValidationResult {
        guard validator.validate(value) else {
            return .invalid("Validation failed")
        }
        return .valid
    }
}
```

### 环境对象注入（SwiftUI）

```swift
protocol ThemeProtocol: ObservableObject {
    var primaryColor: Color { get }
    var secondaryColor: Color { get }
    var font: Font { get }
}

class DefaultTheme: ThemeProtocol {
    let primaryColor = Color.blue
    let secondaryColor = Color.gray
    let font = Font.system(size: 16)
}

class MockTheme: ThemeProtocol {
    let primaryColor = Color.red
    let secondaryColor = Color.green
    let font = Font.system(size: 14)
}

struct ContentView: View {
    @EnvironmentObject var theme: ThemeProtocol

    var body: some View {
        Text("Hello")
            .foregroundColor(theme.primaryColor)
            .font(theme.font)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .environmentObject(MockTheme())
    }
}
```

## 测试替身（Test Doubles）

### Mock（模拟对象）

用于验证交互行为，记录方法调用。

```swift
protocol AuthServiceProtocol {
    func login(email: String, password: String) async throws -> User
    func logout() async throws
}

class MockAuthService: AuthServiceProtocol {
    var loginCallCount = 0
    var loginEmailArg: String?
    var loginPasswordArg: String?
    var loginResult: Result<User, Error> = .success(User(id: "1", name: "Test"))

    var logoutCallCount = 0
    var logoutError: Error?

    func login(email: String, password: String) async throws -> User {
        loginCallCount += 1
        loginEmailArg = email
        loginPasswordArg = password
        return try loginResult.get()
    }

    func logout() async throws {
        logoutCallCount += 1
        if let error = logoutError {
            throw error
        }
    }
}

final class LoginViewModelTests: XCTestCase {
    func testLoginCallsAuthService() async throws {
        let mockAuth = MockAuthService()
        let viewModel = LoginViewModel(authService: mockAuth)

        try await viewModel.login(email: "test@example.com", password: "password123")

        XCTAssertEqual(mockAuth.loginCallCount, 1)
        XCTAssertEqual(mockAuth.loginEmailArg, "test@example.com")
        XCTAssertEqual(mockAuth.loginPasswordArg, "password123")
    }

    func testLoginHandlesError() async throws {
        let mockAuth = MockAuthService()
        mockAuth.loginResult = .failure(AuthError.invalidCredentials)
        let viewModel = LoginViewModel(authService: mockAuth)

        await XCTAssertThrowsError(
            try await viewModel.login(email: "test@example.com", password: "wrong")
        )
    }
}
```

### Stub（桩对象）

提供预定义的响应，不验证交互。

```swift
protocol WeatherServiceProtocol {
    func getCurrentWeather(for city: String) async throws -> Weather
}

class StubWeatherService: WeatherServiceProtocol {
    var stubbedWeather: Weather = Weather(
        temperature: 25.0,
        condition: .sunny,
        humidity: 60
    )

    func getCurrentWeather(for city: String) async throws -> Weather {
        return stubbedWeather
    }
}

class StubFailingWeatherService: WeatherServiceProtocol {
    func getCurrentWeather(for city: String) async throws -> Weather {
        throw WeatherError.cityNotFound
    }
}

final class WeatherViewModelTests: XCTestCase {
    func testDisplayWeather() async throws {
        let stubService = StubWeatherService()
        stubService.stubbedWeather = Weather(
            temperature: 30.0,
            condition: .cloudy,
            humidity: 70
        )

        let viewModel = WeatherViewModel(weatherService: stubService)
        try await viewModel.loadWeather(for: "Tokyo")

        XCTAssertEqual(viewModel.temperature, "30°C")
        XCTAssertEqual(viewModel.condition, "Cloudy")
    }
}
```

### Fake（假对象）

提供简化但可工作的实现。

```swift
protocol UserRepositoryProtocol {
    func fetch(id: String) async throws -> User?
    func save(_ user: User) async throws
    func delete(id: String) async throws
}

class FakeUserRepository: UserRepositoryProtocol {
    private var storage: [String: User] = [:]

    func fetch(id: String) async throws -> User? {
        return storage[id]
    }

    func save(_ user: User) async throws {
        storage[user.id] = user
    }

    func delete(id: String) async throws {
        storage.removeValue(forKey: id)
    }

    func preload(users: [User]) {
        for user in users {
            storage[user.id] = user
        }
    }

    func count() -> Int {
        storage.count
    }
}

final class UserInteractorTests: XCTestCase {
    var sut: UserInteractor!
    var fakeRepository: FakeUserRepository!

    override func setUp() {
        super.setUp()
        fakeRepository = FakeUserRepository()
        sut = UserInteractor(repository: fakeRepository)
    }

    func testCreateUser() async throws {
        let user = User(id: "1", name: "Alice", email: "alice@example.com")

        try await sut.createUser(user)

        let fetched = try await fakeRepository.fetch(id: "1")
        XCTAssertEqual(fetched?.name, "Alice")
        XCTAssertEqual(fakeRepository.count(), 1)
    }

    func testDeleteUser() async throws {
        fakeRepository.preload(users: [
            User(id: "1", name: "Bob", email: "bob@example.com")
        ])

        try await sut.deleteUser(id: "1")

        let fetched = try await fakeRepository.fetch(id: "1")
        XCTAssertNil(fetched)
    }
}
```

### Spy（间谍对象）

记录方法调用信息，用于验证内部行为。

```swift
protocol AnalyticsServiceProtocol {
    func track(event: String, properties: [String: Any]?)
}

class SpyAnalyticsService: AnalyticsServiceProtocol {
    private(set) var trackedEvents: [(event: String, properties: [String: Any]?)] = []

    func track(event: String, properties: [String: Any]?) {
        trackedEvents.append((event, properties))
    }

    var lastEvent: (event: String, properties: [String: Any]?)? {
        trackedEvents.last
    }

    func eventCount(for eventName: String) -> Int {
        trackedEvents.filter { $0.event == eventName }.count
    }

    func reset() {
        trackedEvents.removeAll()
    }
}

final class CheckoutViewModelTests: XCTestCase {
    func testCheckoutTracksAnalytics() async throws {
        let spyAnalytics = SpyAnalyticsService()
        let viewModel = CheckoutViewModel(analytics: spyAnalytics)

        try await viewModel.checkout(items: [CartItem]())

        XCTAssertEqual(spyAnalytics.trackedEvents.count, 2)
        XCTAssertEqual(spyAnalytics.trackedEvents[0].event, "checkout_started")
        XCTAssertEqual(spyAnalytics.trackedEvents[1].event, "checkout_completed")
    }

    func testFailedCheckoutTracksError() async throws {
        let spyAnalytics = SpyAnalyticsService()
        let viewModel = CheckoutViewModel(analytics: spyAnalytics)
        viewModel.shouldFailCheckout = true

        await XCTAssertThrowsError(try await viewModel.checkout(items: [CartItem]()))

        XCTAssertEqual(spyAnalytics.eventCount(for: "checkout_failed"), 1)
        XCTAssertNotNil(spyAnalytics.lastEvent?.properties?["error"])
    }
}
```

## 依赖注入容器

### 简单容器实现

```swift
protocol ContainerProtocol {
    func register<T>(_ type: T.Type, factory: @escaping () -> T)
    func resolve<T>(_ type: T.Type) -> T
}

class DIContainer: ContainerProtocol {
    private var services: [String: Any] = [:]

    func register<T>(_ type: T.Type, factory: @escaping () -> T) {
        let key = String(describing: type)
        services[key] = factory
    }

    func resolve<T>(_ type: T.Type) -> T {
        let key = String(describing: type)
        guard let factory = services[key] as? () -> T else {
            fatalError("Dependency \(key) not registered")
        }
        return factory()
    }
}

extension DIContainer {
    static var production: DIContainer {
        let container = DIContainer()

        container.register(NetworkClientProtocol.self) {
            NetworkClient()
        }

        container.register(UserRepositoryProtocol.self) {
            let networkClient = container.resolve(NetworkClientProtocol.self)
            return UserRepository(networkClient: networkClient)
        }

        container.register(UserServiceProtocol.self) {
            let repository = container.resolve(UserRepositoryProtocol.self)
            return UserService(repository: repository)
        }

        return container
    }

    static var testing: DIContainer {
        let container = DIContainer()

        container.register(NetworkClientProtocol.self) {
            MockNetworkClient()
        }

        container.register(UserRepositoryProtocol.self) {
            FakeUserRepository()
        }

        container.register(UserServiceProtocol.self) {
            MockUserService()
        }

        return container
    }
}
```

### 属性包装器注入

```swift
@propertyWrapper
struct Inject<T> {
    private var container: ContainerProtocol
    private var cachedValue: T?

    var wrappedValue: T {
        if let cached = cachedValue {
            return cached
        }
        let resolved = container.resolve(T.self)
        cachedValue = resolved
        return resolved
    }

    init(container: ContainerProtocol = DIContainer.production) {
        self.container = container
    }
}

class DashboardViewModel: ObservableObject {
    @Inject private var userService: UserServiceProtocol
    @Inject private var analytics: AnalyticsServiceProtocol

    func loadUser() async throws {
        let user = try await userService.fetchCurrentUser()
        analytics.track(event: "dashboard_loaded", properties: ["user_id": user.id])
    }
}
```

### SwiftUI 环境注入

```swift
struct DIContainerKey: EnvironmentKey {
    static let defaultValue = DIContainer.production
}

extension EnvironmentValues {
    var diContainer: DIContainer {
        get { self[DIContainerKey.self] }
        set { self[DIContainerKey.self] = newValue }
    }
}

extension View {
    func injectDependencies(_ container: DIContainer) -> some View {
        environment(\.diContainer, container)
    }
}

struct AppView: View {
    @Environment(\.diContainer) private var container

    var body: some View {
        ContentView()
            .injectDependencies(.production)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
            .injectDependencies(.testing)
    }
}
```

## DI 模式示例

### 服务层模式

```swift
protocol APIClientProtocol {
    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}

protocol CacheProtocol {
    func get<T: Decodable>(_ key: String) -> T?
    func set<T: Encodable>(_ value: T, for key: String)
}

protocol LoggerProtocol {
    func log(_ message: String, level: LogLevel)
}

class APIClient: APIClientProtocol {
    private let session: URLSession
    private let baseURL: URL

    init(session: URLSession = .shared, baseURL: URL) {
        self.session = session
        self.baseURL = baseURL
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let url = baseURL.appendingPathComponent(endpoint.path)
        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw APIError.invalidResponse
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw APIError.httpError(statusCode: httpResponse.statusCode)
        }

        return try JSONDecoder().decode(T.self, from: data)
    }
}

class CachedAPIClient: APIClientProtocol {
    private let client: APIClientProtocol
    private let cache: CacheProtocol
    private let logger: LoggerProtocol

    init(client: APIClientProtocol, cache: CacheProtocol, logger: LoggerProtocol) {
        self.client = client
        self.cache = cache
        self.logger = logger
    }

    func request<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        let cacheKey = "\(endpoint.path)-\(endpoint.method.rawValue)"

        if let cached: T = cache.get(cacheKey) {
            logger.log("Cache hit: \(cacheKey)", level: .debug)
            return cached
        }

        logger.log("Cache miss: \(cacheKey)", level: .debug)
        let result: T = try await client.request(endpoint)
        cache.set(result, for: cacheKey)
        return result
    }
}
```

### 仓库模式

```swift
protocol UserRepositoryProtocol {
    func fetch(id: String) async throws -> User?
    func fetchAll() async throws -> [User]
    func save(_ user: User) async throws
    func delete(id: String) async throws
}

class UserRepository: UserRepositoryProtocol {
    private let apiClient: APIClientProtocol
    private let cache: CacheProtocol

    init(apiClient: APIClientProtocol, cache: CacheProtocol) {
        self.apiClient = apiClient
        self.cache = cache
    }

    func fetch(id: String) async throws -> User? {
        if let cached: User = cache.get("user-\(id)") {
            return cached
        }

        let endpoint = Endpoint(path: "/users/\(id)", method: .get)
        let user: User = try await apiClient.request(endpoint)
        cache.set(user, for: "user-\(id)")
        return user
    }

    func fetchAll() async throws -> [User] {
        let endpoint = Endpoint(path: "/users", method: .get)
        return try await apiClient.request(endpoint)
    }

    func save(_ user: User) async throws {
        let endpoint = Endpoint(path: "/users/\(user.id)", method: .put)
        try await apiClient.request(endpoint)
        cache.set(user, for: "user-\(user.id)")
    }

    func delete(id: String) async throws {
        let endpoint = Endpoint(path: "/users/\(id)", method: .delete)
        try await apiClient.request(endpoint as! Endpoint)
    }
}
```

### 协调器模式

```swift
protocol CoordinatorProtocol: AnyObject {
    var childCoordinators: [CoordinatorProtocol] { get set }
    func start()
    func finish()
}

protocol AppCoordinatorProtocol: CoordinatorProtocol {
    func showLogin()
    func showDashboard()
    func showSettings()
}

class AppCoordinator: AppCoordinatorProtocol {
    var childCoordinators: [CoordinatorProtocol] = []
    private let navigationController: UINavigationController
    private let container: DIContainer

    init(navigationController: UINavigationController, container: DIContainer) {
        self.navigationController = navigationController
        self.container = container
    }

    func start() {
        showLogin()
    }

    func finish() {
        childCoordinators.forEach { $0.finish() }
        childCoordinators.removeAll()
    }

    func showLogin() {
        let authService = container.resolve(AuthServiceProtocol.self)
        let viewModel = LoginViewModel(authService: authService, coordinator: self)
        let viewController = LoginViewController(viewModel: viewModel)
        navigationController.setViewControllers([viewController], animated: true)
    }

    func showDashboard() {
        let userService = container.resolve(UserServiceProtocol.self)
        let viewModel = DashboardViewModel(userService: userService, coordinator: self)
        let viewController = DashboardViewController(viewModel: viewModel)
        navigationController.setViewControllers([viewController], animated: true)
    }

    func showSettings() {
        let settingsService = container.resolve(SettingsServiceProtocol.self)
        let viewModel = SettingsViewModel(settingsService: settingsService, coordinator: self)
        let viewController = SettingsViewController(viewModel: viewModel)
        navigationController.pushViewController(viewController, animated: true)
    }
}
```

## 测试替身完整示例

### 完整测试场景

```swift
protocol PaymentGatewayProtocol {
    func processPayment(amount: Decimal, card: Card) async throws -> Transaction
    func refund(transactionId: String) async throws
}

protocol OrderStorageProtocol {
    func save(_ order: Order) async throws
    func fetch(id: String) async throws -> Order?
}

protocol NotificationServiceProtocol {
    func sendOrderConfirmation(to email: String, order: Order) async throws
}

class OrderService {
    private let paymentGateway: PaymentGatewayProtocol
    private let storage: OrderStorageProtocol
    private let notification: NotificationServiceProtocol

    init(
        paymentGateway: PaymentGatewayProtocol,
        storage: OrderStorageProtocol,
        notification: NotificationServiceProtocol
    ) {
        self.paymentGateway = paymentGateway
        self.storage = storage
        self.notification = notification
    }

    func placeOrder(items: [CartItem], card: Card, email: String) async throws -> Order {
        let amount = items.reduce(Decimal(0)) { $0 + $1.price * Decimal($1.quantity) }

        let transaction = try await paymentGateway.processPayment(amount: amount, card: card)

        let order = Order(
            id: UUID().uuidString,
            items: items,
            transactionId: transaction.id,
            status: .confirmed,
            createdAt: Date()
        )

        try await storage.save(order)

        try await notification.sendOrderConfirmation(to: email, order: order)

        return order
    }
}

class MockPaymentGateway: PaymentGatewayProtocol {
    var processPaymentCallCount = 0
    var processPaymentAmountArg: Decimal?
    var processPaymentCardArg: Card?
    var processPaymentResult: Result<Transaction, Error> = .success(
        Transaction(id: "txn_123", status: .completed)
    )

    var refundCallCount = 0
    var refundTransactionIdArg: String?
    var refundError: Error?

    func processPayment(amount: Decimal, card: Card) async throws -> Transaction {
        processPaymentCallCount += 1
        processPaymentAmountArg = amount
        processPaymentCardArg = card
        return try processPaymentResult.get()
    }

    func refund(transactionId: String) async throws {
        refundCallCount += 1
        refundTransactionIdArg = transactionId
        if let error = refundError {
            throw error
        }
    }
}

class FakeOrderStorage: OrderStorageProtocol {
    private var orders: [String: Order] = [:]

    func save(_ order: Order) async throws {
        orders[order.id] = order
    }

    func fetch(id: String) async throws -> Order? {
        orders[id]
    }

    func count() -> Int {
        orders.count
    }
}

class SpyNotificationService: NotificationServiceProtocol {
    private(set) var sentConfirmations: [(email: String, order: Order)] = []

    func sendOrderConfirmation(to email: String, order: Order) async throws {
        sentConfirmations.append((email, order))
    }

    var lastSentEmail: String? {
        sentConfirmations.last?.email
    }
}

final class OrderServiceTests: XCTestCase {
    var sut: OrderService!
    var mockPayment: MockPaymentGateway!
    var fakeStorage: FakeOrderStorage!
    var spyNotification: SpyNotificationService!

    override func setUp() {
        super.setUp()
        mockPayment = MockPaymentGateway()
        fakeStorage = FakeOrderStorage()
        spyNotification = SpyNotificationService()
        sut = OrderService(
            paymentGateway: mockPayment,
            storage: fakeStorage,
            notification: spyNotification
        )
    }

    override func tearDown() {
        sut = nil
        mockPayment = nil
        fakeStorage = nil
        spyNotification = nil
        super.tearDown()
    }

    func testPlaceOrderProcessesPayment() async throws {
        let items = [CartItem(id: "1", name: "Product", price: 10.0, quantity: 2)]
        let card = Card(number: "4242424242424242", expiry: "12/25", cvv: "123")

        _ = try await sut.placeOrder(items: items, card: card, email: "test@example.com")

        XCTAssertEqual(mockPayment.processPaymentCallCount, 1)
        XCTAssertEqual(mockPayment.processPaymentAmountArg, Decimal(20.0))
    }

    func testPlaceOrderSavesToStorage() async throws {
        let items = [CartItem(id: "1", name: "Product", price: 10.0, quantity: 1)]
        let card = Card(number: "4242424242424242", expiry: "12/25", cvv: "123")

        let order = try await sut.placeOrder(items: items, card: card, email: "test@example.com")

        let saved = try await fakeStorage.fetch(id: order.id)
        XCTAssertNotNil(saved)
        XCTAssertEqual(saved?.items.count, 1)
    }

    func testPlaceOrderSendsConfirmation() async throws {
        let items = [CartItem(id: "1", name: "Product", price: 10.0, quantity: 1)]
        let card = Card(number: "4242424242424242", expiry: "12/25", cvv: "123")

        _ = try await sut.placeOrder(items: items, card: card, email: "customer@example.com")

        XCTAssertEqual(spyNotification.sentConfirmations.count, 1)
        XCTAssertEqual(spyNotification.lastSentEmail, "customer@example.com")
    }

    func testPlaceOrderThrowsOnPaymentFailure() async throws {
        mockPayment.processPaymentResult = .failure(PaymentError.declined)
        let items = [CartItem(id: "1", name: "Product", price: 10.0, quantity: 1)]
        let card = Card(number: "4242424242424242", expiry: "12/25", cvv: "123")

        await XCTAssertThrowsError(
            try await sut.placeOrder(items: items, card: card, email: "test@example.com")
        )

        XCTAssertEqual(fakeStorage.count(), 0)
        XCTAssertEqual(spyNotification.sentConfirmations.count, 0)
    }
}
```

## Quick Reference: 测试替身对比

| 类型 | 用途 | 特点 |
|------|------|------|
| Mock | 验证交互行为 | 记录调用次数、参数，可设置返回值 |
| Stub | 提供固定响应 | 不验证交互，只返回预设值 |
| Fake | 简化实现 | 提供可工作的简化版本 |
| Spy | 监控行为 | 记录调用信息，用于断言验证 |

## Anti-Patterns to Avoid

```swift
class BadService {
    private let apiClient = APIClient()

    func fetchData() async throws -> Data {
        return try await apiClient.request(.fetchData)
    }
}

class GoodService {
    private let apiClient: APIClientProtocol

    init(apiClient: APIClientProtocol) {
        self.apiClient = apiClient
    }

    func fetchData() async throws -> Data {
        return try await apiClient.request(.fetchData)
    }
}

class BadViewModel {
    func saveUser(_ user: User) {
        UserDefaults.standard.set(user.id, forKey: "userId")
    }
}

class GoodViewModel {
    private let storage: StorageProtocol

    init(storage: StorageProtocol) {
        self.storage = storage
    }

    func saveUser(_ user: User) {
        storage.save(user.id, for: "userId")
    }
}

class BadViewController: UIViewController {
    private let service = UserService()
}

class GoodViewController: UIViewController {
    private let service: UserServiceProtocol

    init(service: UserServiceProtocol) {
        self.service = service
        super.init(nibName: nil, bundle: nil)
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }
}
```

**Remember**: Swift 协议依赖注入的核心是面向协议编程，通过抽象接口解耦组件，使代码更易于测试和维护。测试替身的选择取决于测试目标：验证交互用 Mock，提供固定响应用 Stub，需要工作实现用 Fake，监控行为用 Spy。
