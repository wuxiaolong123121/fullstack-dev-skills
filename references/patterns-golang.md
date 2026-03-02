# Go 开发模式参考

Go 惯用法、错误处理、并发模式和测试最佳实践，用于构建高效、可靠、可维护的 Go 应用程序。

## When to Activate

- 编写新的 Go 代码
- 审查 Go 代码
- 重构现有 Go 代码
- 设计 Go 包/模块

## Core Principles

### 1. 简洁性 (Simplicity)

Go 优先考虑简洁性。代码应该清晰直接。

```go
// Good: 清晰简洁
func GetActiveUsers(users []User) []User {
    var active []User
    for _, u := range users {
        if u.IsActive {
            active = append(active, u)
        }
    }
    return active
}

// Bad: 过度复杂
func GetActiveUsers(u []User) []User {
    var r []User
    for i := 0; i < len(u); i++ {
        if u[i].IsActive == true {
            r = append(r, u[i])
        }
    }
    return r
}
```

### 2. 显式错误处理 (Explicit Error Handling)

Go 使用显式错误处理，不使用异常。

```go
// Good: 显式错误处理
func ReadConfig(path string) (*Config, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("读取配置文件失败: %w", err)
    }
    
    var config Config
    if err := json.Unmarshal(data, &config); err != nil {
        return nil, fmt.Errorf("解析配置失败: %w", err)
    }
    
    return &config, nil
}

// Bad: 忽略错误
func ReadConfig(path string) *Config {
    data, _ := os.ReadFile(path)
    var config Config
    json.Unmarshal(data, &config)
    return &config
}
```

### 3. 组合优于继承 (Composition Over Inheritance)

Go 使用组合而非继承。

```go
// Good: 使用组合
type Reader interface {
    Read(p []byte) (n int, err error)
}

type Writer interface {
    Write(p []byte) (n int, err error)
}

type ReadWriter interface {
    Reader
    Writer
}

// Good: 结构体嵌入
type Server struct {
    *http.Server
    logger *slog.Logger
    config *Config
}
```

## Error Handling Patterns

### 错误包装 (Error Wrapping)

```go
import "errors"

// 使用 fmt.Errorf 包装错误
func ProcessFile(path string) error {
    if err := validatePath(path); err != nil {
        return fmt.Errorf("路径验证失败: %w", err)
    }
    
    data, err := os.ReadFile(path)
    if err != nil {
        return fmt.Errorf("读取文件失败: %w", err)
    }
    
    return nil
}

// 解包错误
func main() {
    err := ProcessFile("config.json")
    if err != nil {
        var pathErr *os.PathError
        if errors.As(err, &pathErr) {
            fmt.Printf("路径错误: %v\n", pathErr.Path)
        }
        
        if errors.Is(err, os.ErrNotExist) {
            fmt.Println("文件不存在")
        }
    }
}
```

### 自定义错误类型

```go
// 定义自定义错误类型
type ValidationError struct {
    Field   string
    Message string
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("验证错误 [%s]: %s", e.Field, e.Message)
}

// 使用自定义错误
func ValidateUser(u *User) error {
    if u.Name == "" {
        return &ValidationError{
            Field:   "Name",
            Message: "姓名不能为空",
        }
    }
    
    if u.Age < 0 {
        return &ValidationError{
            Field:   "Age",
            Message: "年龄不能为负数",
        }
    }
    
    return nil
}

// 检查特定错误类型
func main() {
    err := ValidateUser(user)
    var valErr *ValidationError
    if errors.As(err, &valErr) {
        fmt.Printf("字段 %s 验证失败: %s\n", valErr.Field, valErr.Message)
    }
}
```

### 错误处理最佳实践

```go
// Good: 尽早返回错误
func ProcessData(data []byte) (*Result, error) {
    if len(data) == 0 {
        return nil, errors.New("数据为空")
    }
    
    parsed, err := parseData(data)
    if err != nil {
        return nil, err
    }
    
    result, err := transformData(parsed)
    if err != nil {
        return nil, err
    }
    
    return result, nil
}

// Good: 使用哨兵错误
var (
    ErrNotFound     = errors.New("资源未找到")
    ErrUnauthorized = errors.New("未授权访问")
    ErrInvalidInput = errors.New("无效输入")
)

func GetUser(id string) (*User, error) {
    user, err := db.FindUser(id)
    if err != nil {
        return nil, ErrNotFound
    }
    return user, nil
}
```

## Concurrency Patterns

### Goroutine 基础

```go
// 启动 goroutine
func processAsync(data []int) {
    go func() {
        result := process(data)
        fmt.Println("处理完成:", result)
    }()
}

// 使用 WaitGroup 等待多个 goroutine
func processConcurrently(items []Item) []Result {
    var wg sync.WaitGroup
    results := make([]Result, len(items))
    
    for i, item := range items {
        wg.Add(1)
        go func(idx int, it Item) {
            defer wg.Done()
            results[idx] = processItem(it)
        }(i, item)
    }
    
    wg.Wait()
    return results
}
```

### Channel 模式

```go
// 基本通道使用
func generateNumbers(n int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := 0; i < n; i++ {
            out <- i
        }
    }()
    return out
}

// 管道模式 (Pipeline)
func square(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for v := range in {
            out <- v * v
        }
    }()
    return out
}

// 使用管道
func main() {
    nums := generateNumbers(5)
    squares := square(nums)
    
    for v := range squares {
        fmt.Println(v)
    }
}
```

### Worker Pool 模式

```go
// Worker Pool 实现
type Job struct {
    ID   int
    Data string
}

type Result struct {
    JobID int
    Value string
    Err   error
}

func worker(id int, jobs <-chan Job, results chan<- Result, wg *sync.WaitGroup) {
    defer wg.Done()
    for job := range jobs {
        result, err := processJob(job)
        results <- Result{
            JobID: job.ID,
            Value: result,
            Err:   err,
        }
    }
}

func NewWorkerPool(numWorkers int, jobs []Job) []Result {
    jobChan := make(chan Job, len(jobs))
    resultChan := make(chan Result, len(jobs))
    
    var wg sync.WaitGroup
    
    // 启动 workers
    for i := 0; i < numWorkers; i++ {
        wg.Add(1)
        go worker(i, jobChan, resultChan, &wg)
    }
    
    // 发送任务
    for _, job := range jobs {
        jobChan <- job
    }
    close(jobChan)
    
    // 等待完成
    go func() {
        wg.Wait()
        close(resultChan)
    }()
    
    // 收集结果
    var results []Result
    for r := range resultChan {
        results = append(results, r)
    }
    
    return results
}
```

### Fan-Out / Fan-In 模式

```go
// Fan-Out: 多个 goroutine 从同一通道读取
func fanOut(source <-chan int, numWorkers int) []<-chan int {
    channels := make([]<-chan int, numWorkers)
    
    for i := 0; i < numWorkers; i++ {
        channels[i] = processWorker(source)
    }
    
    return channels
}

// Fan-In: 合并多个通道到一个
func fanIn(channels ...<-chan int) <-chan int {
    out := make(chan int)
    var wg sync.WaitGroup
    
    for _, ch := range channels {
        wg.Add(1)
        go func(c <-chan int) {
            defer wg.Done()
            for v := range c {
                out <- v
            }
        }(ch)
    }
    
    go func() {
        wg.Wait()
        close(out)
    }()
    
    return out
}

func processWorker(in <-chan int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for v := range in {
            out <- v * 2
        }
    }()
    return out
}
```

### Select 模式

```go
// 多路复用
func multiplex(ch1, ch2 <-chan string) <-chan string {
    out := make(chan string)
    go func() {
        defer close(out)
        for {
            select {
            case v, ok := <-ch1:
                if !ok {
                    ch1 = nil
                    if ch2 == nil {
                        return
                    }
                } else {
                    out <- v
                }
            case v, ok := <-ch2:
                if !ok {
                    ch2 = nil
                    if ch1 == nil {
                        return
                    }
                } else {
                    out <- v
                }
            }
        }
    }()
    return out
}

// 超时处理
func fetchWithTimeout(url string, timeout time.Duration) (*Response, error) {
    ctx, cancel := context.WithTimeout(context.Background(), timeout)
    defer cancel()
    
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    
    return http.DefaultClient.Do(req)
}

// 非阻塞操作
func nonBlockingSend(ch chan<- int, value int) bool {
    select {
    case ch <- value:
        return true
    default:
        return false
    }
}

func nonBlockingReceive(ch <-chan int) (int, bool) {
    select {
    case v := <-ch:
        return v, true
    default:
        return 0, false
    }
}
```

### Context 模式

```go
// 使用 Context 控制取消
func ProcessWithCancel(ctx context.Context, data []int) error {
    for _, v := range data {
        select {
        case <-ctx.Done():
            return ctx.Err()
        default:
            processValue(v)
        }
    }
    return nil
}

// Context 传递请求值
func HandleRequest(ctx context.Context, r *http.Request) {
    // 设置请求 ID
    requestID := generateRequestID()
    ctx = context.WithValue(ctx, "requestID", requestID)
    
    // 传递到下游
    ProcessData(ctx, r.Body)
}

func ProcessData(ctx context.Context, data io.Reader) {
    requestID := ctx.Value("requestID").(string)
    log.Printf("[%s] 处理数据中...\n", requestID)
}

// Context 超时链
func fetchData(ctx context.Context) (string, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    req, err := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/data", nil)
    if err != nil {
        return "", err
    }
    
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return "", err
    }
    defer resp.Body.Close()
    
    return io.ReadAll(resp.Body)
}
```

## Testing Patterns

### Table-Driven Tests

```go
// 表驱动测试
func TestAdd(t *testing.T) {
    tests := []struct {
        name     string
        a, b     int
        expected int
    }{
        {"正数相加", 2, 3, 5},
        {"负数相加", -2, -3, -5},
        {"正负混合", 2, -3, -1},
        {"零值", 0, 0, 0},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result := Add(tt.a, tt.b)
            if result != tt.expected {
                t.Errorf("Add(%d, %d) = %d; 期望 %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}

// 带错误检查的表驱动测试
func TestDivide(t *testing.T) {
    tests := []struct {
        name      string
        a, b      int
        expected  int
        expectErr bool
    }{
        {"正常除法", 10, 2, 5, false},
        {"除以零", 10, 0, 0, true},
        {"负数除法", -10, 2, -5, false},
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            result, err := Divide(tt.a, tt.b)
            
            if tt.expectErr {
                if err == nil {
                    t.Error("期望返回错误，但没有")
                }
                return
            }
            
            if err != nil {
                t.Errorf("未期望的错误: %v", err)
                return
            }
            
            if result != tt.expected {
                t.Errorf("Divide(%d, %d) = %d; 期望 %d", tt.a, tt.b, result, tt.expected)
            }
        })
    }
}
```

### 子测试和并行测试

```go
// 并行测试
func TestParallel(t *testing.T) {
    t.Parallel()
    
    tests := []struct {
        name string
        input int
    }{
        {"case1", 1},
        {"case2", 2},
        {"case3", 3},
    }
    
    for _, tt := range tests {
        tt := tt
        t.Run(tt.name, func(t *testing.T) {
            t.Parallel()
            result := Process(tt.input)
            if result == 0 {
                t.Error("结果不应为零")
            }
        })
    }
}
```

### Mock 和接口测试

```go
// 定义接口
type DataStore interface {
    Get(id string) (*User, error)
    Save(user *User) error
}

// 真实实现
type DatabaseStore struct {
    db *sql.DB
}

func (s *DatabaseStore) Get(id string) (*User, error) {
    var user User
    err := s.db.QueryRow("SELECT * FROM users WHERE id = ?", id).Scan(&user)
    return &user, err
}

// Mock 实现
type MockStore struct {
    users map[string]*User
}

func (m *MockStore) Get(id string) (*User, error) {
    user, ok := m.users[id]
    if !ok {
        return nil, errors.New("用户不存在")
    }
    return user, nil
}

func (m *MockStore) Save(user *User) error {
    m.users[user.ID] = user
    return nil
}

// 使用 Mock 测试
func TestUserService_Get(t *testing.T) {
    mockStore := &MockStore{
        users: map[string]*User{
            "1": {ID: "1", Name: "Alice"},
        },
    }
    
    service := NewUserService(mockStore)
    
    user, err := service.Get("1")
    if err != nil {
        t.Fatalf("获取用户失败: %v", err)
    }
    
    if user.Name != "Alice" {
        t.Errorf("期望 Name=Alice, 得到 %s", user.Name)
    }
}
```

### 基准测试

```go
// 基准测试
func BenchmarkProcess(b *testing.B) {
    data := generateTestData(1000)
    
    b.ResetTimer()
    for i := 0; i < b.N; i++ {
        Process(data)
    }
}

// 并行基准测试
func BenchmarkProcessParallel(b *testing.B) {
    data := generateTestData(1000)
    
    b.RunParallel(func(pb *testing.PB) {
        for pb.Next() {
            Process(data)
        }
    })
}

// 子基准测试
func BenchmarkVariousSizes(b *testing.B) {
    sizes := []int{10, 100, 1000, 10000}
    
    for _, size := range sizes {
        b.Run(fmt.Sprintf("size-%d", size), func(b *testing.B) {
            data := generateTestData(size)
            b.ResetTimer()
            for i := 0; i < b.N; i++ {
                Process(data)
            }
        })
    }
}
```

### 测试辅助函数

```go
// 测试辅助函数
func TestMain(m *testing.M) {
    // 全局设置
    setupTestDatabase()
    
    code := m.Run()
    
    // 全局清理
    cleanupTestDatabase()
    
    os.Exit(code)
}

// 测试 fixtures
func newTestUser(t *testing.T) *User {
    t.Helper()
    return &User{
        ID:        "test-123",
        Name:      "Test User",
        Email:     "test@example.com",
        CreatedAt: time.Now(),
    }
}

// 断言辅助函数
func assertEqual(t *testing.T, expected, actual interface{}) {
    t.Helper()
    if expected != actual {
        t.Errorf("期望 %v, 得到 %v", expected, actual)
    }
}

func assertError(t *testing.T, err error, expectedMsg string) {
    t.Helper()
    if err == nil {
        t.Fatal("期望返回错误，但没有")
    }
    if !strings.Contains(err.Error(), expectedMsg) {
        t.Errorf("错误消息应包含 %q, 得到 %q", expectedMsg, err.Error())
    }
}
```

## Go Idioms

### 接口定义

```go
// Good: 在使用方定义接口
type Reader interface {
    Read(p []byte) (n int, err error)
}

// Good: 小接口
type Writer interface {
    Write(p []byte) (n int, err error)
}

// Good: 组合接口
type ReadWriter interface {
    Reader
    Writer
}

// Good: 接受接口，返回结构体
func NewClient(cfg *Config) *Client {
    return &Client{config: cfg}
}

func (c *Client) Fetch(r Reader) (*Response, error) {
    // ...
}
```

### 零值可用

```go
// Good: 零值可用的类型
type Buffer struct {
    data []byte
}

func (b *Buffer) Write(p []byte) {
    b.data = append(b.data, p...)
}

func (b *Buffer) String() string {
    return string(b.data)
}

// 使用零值
var buf Buffer
buf.Write([]byte("hello"))
fmt.Println(buf.String())

// Good: sync.Mutex 零值可用
type SafeCounter struct {
    mu    sync.Mutex
    count int
}

func (c *SafeCounter) Increment() {
    c.mu.Lock()
    defer c.mu.Unlock()
    c.count++
}
```

### 函数选项模式

```go
// 函数选项模式
type Server struct {
    host    string
    port    int
    timeout time.Duration
    logger  *slog.Logger
}

type ServerOption func(*Server)

func WithHost(host string) ServerOption {
    return func(s *Server) {
        s.host = host
    }
}

func WithPort(port int) ServerOption {
    return func(s *Server) {
        s.port = port
    }
}

func WithTimeout(timeout time.Duration) ServerOption {
    return func(s *Server) {
        s.timeout = timeout
    }
}

func WithLogger(logger *slog.Logger) ServerOption {
    return func(s *Server) {
        s.logger = logger
    }
}

func NewServer(opts ...ServerOption) *Server {
    server := &Server{
        host:    "localhost",
        port:    8080,
        timeout: 30 * time.Second,
    }
    
    for _, opt := range opts {
        opt(server)
    }
    
    return server
}

// 使用
server := NewServer(
    WithPort(9090),
    WithTimeout(60*time.Second),
    WithLogger(logger),
)
```

### defer 使用

```go
// Good: 使用 defer 确保资源释放
func ReadFile(path string) ([]byte, error) {
    f, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer f.Close()
    
    return io.ReadAll(f)
}

// Good: defer 用于追踪
func Trace(name string) func() {
    start := time.Now()
    log.Printf("进入 %s", name)
    return func() {
        log.Printf("退出 %s (%v)", name, time.Since(start))
    }
}

func Process() {
    defer Trace("Process")()
    // 处理逻辑
}

// Good: defer 用于恢复
func SafeExecute(fn func()) (err error) {
    defer func() {
        if r := recover(); r != nil {
            err = fmt.Errorf("panic 恢复: %v", r)
        }
    }()
    fn()
    return nil
}
```

## Project Organization

### 标准项目布局

```
myapp/
├── cmd/
│   └── myapp/
│       └── main.go
├── internal/
│   ├── api/
│   │   └── handler.go
│   ├── service/
│   │   └── user.go
│   └── repository/
│       └── user.go
├── pkg/
│   └── utils/
│       └── helper.go
├── api/
│   └── openapi.yaml
├── configs/
│   └── config.yaml
├── go.mod
├── go.sum
└── README.md
```

### 包导入规范

```go
// Good: 标准库 -> 第三方 -> 本地
import (
    "context"
    "fmt"
    "net/http"
    "time"
    
    "github.com/gin-gonic/gin"
    "go.uber.org/zap"
    
    "myapp/internal/service"
    "myapp/pkg/utils"
)
```

## Quick Reference: Go Idioms

| 惯用法 | 描述 |
|--------|------|
| 接受接口，返回结构体 | 函数参数用接口类型，返回具体类型 |
| 小接口 | 接口方法越少越好，通常 1-3 个 |
| 零值可用 | 类型零值应该可以直接使用 |
| 错误即值 | 错误是普通值，显式处理 |
| defer 资源释放 | 使用 defer 确保资源正确释放 |
| 表驱动测试 | 使用表驱动方式组织测试用例 |
| 函数选项模式 | 使用函数参数配置复杂对象 |
| 组合优于继承 | 使用结构体嵌入实现代码复用 |

## Anti-Patterns to Avoid

```go
// Bad: 忽略错误
data, _ := os.ReadFile(path)

// Good: 处理错误
data, err := os.ReadFile(path)
if err != nil {
    return fmt.Errorf("读取文件失败: %w", err)
}

// Bad: 接口定义在实现方
type UserService interface {
    Get(id string) (*User, error)
}
type userServiceImpl struct{}

// Good: 接口定义在使用方
// 在调用包中定义所需接口
type UserGetter interface {
    Get(id string) (*User, error)
}

// Bad: 过大的接口
type Service interface {
    CreateUser() error
    GetUser() error
    UpdateUser() error
    DeleteUser() error
    CreateOrder() error
    GetOrder() error
}

// Good: 小接口
type UserCreator interface {
    CreateUser() error
}
type UserReader interface {
    GetUser() error
}

// Bad: 导出未使用的字段
type Config struct {
    PublicField  string
    privateField string
}

// Good: 只导出必要的字段
type Config struct {
    Host string
    Port int
}

// Bad: panic 用于普通错误处理
func Divide(a, b int) int {
    if b == 0 {
        panic("除以零")
    }
    return a / b
}

// Good: 返回错误
func Divide(a, b int) (int, error) {
    if b == 0 {
        return 0, errors.New("除以零")
    }
    return a / b, nil
}

// Bad: 在循环中使用 defer
func processFiles(paths []string) error {
    for _, path := range paths {
        f, err := os.Open(path)
        if err != nil {
            return err
        }
        defer f.Close() // 只在函数结束时执行
        // 处理文件
    }
    return nil
}

// Good: 提取为单独函数
func processFile(path string) error {
    f, err := os.Open(path)
    if err != nil {
        return err
    }
    defer f.Close()
    // 处理文件
    return nil
}

func processFiles(paths []string) error {
    for _, path := range paths {
        if err := processFile(path); err != nil {
            return err
        }
    }
    return nil
}
```

**记住**: Go 代码应该简洁、明确、可靠。优先考虑可读性和简单性，避免过度设计。
