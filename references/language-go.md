# Go 参考

> Reference for: fullstack-dev-skills
> Load when: 编写 Go 代码、并发编程、接口设计、Goroutines、Channels

## 核心特性

Go 是一门静态类型、编译型的系统编程语言，以其简洁的语法、内置并发支持和高效的编译速度著称。Go 的设计哲学是"少即是多"，强调代码的简洁性和可读性。

### 基础语法与类型

```go
package main

import (
	"context"
	"errors"
	"fmt"
	"time"
)

// User 用户结构体
type User struct {
	ID        int64     `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	CreatedAt time.Time `json:"created_at"`
}

// NewUser 创建新用户
// 参数：
//   - name: 用户名
//   - email: 用户邮箱
// 返回：
//   - *User: 用户指针
func NewUser(name, email string) *User {
	return &User{
		Name:      name,
		Email:     email,
		CreatedAt: time.Now(),
	}
}

// String 实现 Stringer 接口
func (u *User) String() string {
	return fmt.Sprintf("User{id=%d, name=%s, email=%s}", u.ID, u.Name, u.Email)
}

// Validate 验证用户数据
// 返回：
//   - error: 验证错误
func (u *User) Validate() error {
	if u.Name == "" {
		return errors.New("name is required")
	}
	if u.Email == "" {
		return errors.New("email is required")
	}
	return nil
}

// Status 用户状态类型
type Status int

const (
	StatusPending Status = iota
	StatusActive
	StatusInactive
	StatusDeleted
)

// String 实现 Stringer 接口
func (s Status) String() string {
	switch s {
	case StatusPending:
		return "pending"
	case StatusActive:
		return "active"
	case StatusInactive:
		return "inactive"
	case StatusDeleted:
		return "deleted"
	default:
		return "unknown"
	}
}

// Config 应用配置
type Config struct {
	Host         string        `yaml:"host" env:"HOST" envDefault:"localhost"`
	Port         int           `yaml:"port" env:"PORT" envDefault:"8080"`
	ReadTimeout  time.Duration `yaml:"read_timeout" env:"READ_TIMEOUT" envDefault:"10s"`
	WriteTimeout time.Duration `yaml:"write_timeout" env:"WRITE_TIMEOUT" envDefault:"10s"`
}

// Option 配置选项函数类型
type Option func(*Config)

// WithHost 设置主机选项
func WithHost(host string) Option {
	return func(c *Config) {
		c.Host = host
	}
}

// WithPort 设置端口选项
func WithPort(port int) Option {
	return func(c *Config) {
		c.Port = port
	}
}

// NewConfig 创建配置
// 参数：
//   - opts: 配置选项
// 返回：
//   - *Config: 配置指针
func NewConfig(opts ...Option) *Config {
	config := &Config{
		Host:         "localhost",
		Port:         8080,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 10 * time.Second,
	}
	for _, opt := range opts {
		opt(config)
	}
	return config
}
```

### 接口与多态

```go
package main

import (
	"context"
	"fmt"
	"io"
)

// Reader 读取器接口
type Reader interface {
	Read(ctx context.Context, key string) ([]byte, error)
}

// Writer 写入器接口
type Writer interface {
	Write(ctx context.Context, key string, value []byte) error
}

// ReadWriter 读写器接口（接口组合）
type ReadWriter interface {
	Reader
	Writer
}

// Deleter 删除器接口
type Deleter interface {
	Delete(ctx context.Context, key string) error
}

// Storage 完整存储接口
type Storage interface {
	ReadWriter
	Deleter
	io.Closer
}

// MemoryStorage 内存存储实现
type MemoryStorage struct {
	data map[string][]byte
}

// NewMemoryStorage 创建内存存储
func NewMemoryStorage() *MemoryStorage {
	return &MemoryStorage{
		data: make(map[string][]byte),
	}
}

// Read 读取数据
// 参数：
//   - ctx: 上下文
//   - key: 键
// 返回：
//   - []byte: 数据
//   - error: 错误
func (s *MemoryStorage) Read(ctx context.Context, key string) ([]byte, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}
	
	data, ok := s.data[key]
	if !ok {
		return nil, fmt.Errorf("key not found: %s", key)
	}
	return data, nil
}

// Write 写入数据
func (s *MemoryStorage) Write(ctx context.Context, key string, value []byte) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	
	s.data[key] = value
	return nil
}

// Delete 删除数据
func (s *MemoryStorage) Delete(ctx context.Context, key string) error {
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
	}
	
	delete(s.data, key)
	return nil
}

// Close 关闭存储
func (s *MemoryStorage) Close() error {
	s.data = nil
	return nil
}

// Processor 数据处理器接口
type Processor interface {
	Process(ctx context.Context, data []byte) ([]byte, error)
	Name() string
}

// Pipeline 处理管道
type Pipeline struct {
	processors []Processor
}

// NewPipeline 创建管道
func NewPipeline(processors ...Processor) *Pipeline {
	return &Pipeline{
		processors: processors,
	}
}

// Execute 执行管道处理
// 参数：
//   - ctx: 上下文
//   - input: 输入数据
// 返回：
//   - []byte: 处理结果
//   - error: 错误
func (p *Pipeline) Execute(ctx context.Context, input []byte) ([]byte, error) {
	data := input
	var err error
	
	for _, processor := range p.processors {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		
		data, err = processor.Process(ctx, data)
		if err != nil {
			return nil, fmt.Errorf("processor %s failed: %w", processor.Name(), err)
		}
	}
	
	return data, nil
}

// AddProcessor 添加处理器
func (p *Pipeline) AddProcessor(processor Processor) {
	p.processors = append(p.processors, processor)
}
```

### Goroutines 与 Channels

```go
package main

import (
	"context"
	"fmt"
	"sync"
	"time"
)

// Worker 工作器
type Worker struct {
	ID   int
	Name string
}

// Process 处理任务
// 参数：
//   - ctx: 上下文
//   - task: 任务数据
// 返回：
//   - interface{}: 处理结果
//   - error: 错误
func (w *Worker) Process(ctx context.Context, task interface{}) (interface{}, error) {
	select {
	case <-ctx.Done():
		return nil, ctx.Err()
	default:
	}
	
	// 模拟处理
	time.Sleep(100 * time.Millisecond)
	return fmt.Sprintf("Worker %d processed: %v", w.ID, task), nil
}

// Pool 工作池
type Pool struct {
	workers    int
	taskChan   chan interface{}
	resultChan chan Result
	wg         sync.WaitGroup
	ctx        context.Context
	cancel     context.CancelFunc
}

// Result 处理结果
type Result struct {
	Value interface{}
	Error error
}

// NewPool 创建工作池
// 参数：
//   - workers: 工作者数量
//   - bufferSize: 缓冲区大小
// 返回：
//   - *Pool: 工作池指针
func NewPool(workers, bufferSize int) *Pool {
	ctx, cancel := context.WithCancel(context.Background())
	return &Pool{
		workers:    workers,
		taskChan:   make(chan interface{}, bufferSize),
		resultChan: make(chan Result, bufferSize),
		ctx:        ctx,
		cancel:     cancel,
	}
}

// Start 启动工作池
func (p *Pool) Start() {
	for i := 0; i < p.workers; i++ {
		p.wg.Add(1)
		go p.worker(i)
	}
}

// worker 工作者协程
func (p *Pool) worker(id int) {
	defer p.wg.Done()
	
	worker := &Worker{ID: id, Name: fmt.Sprintf("worker-%d", id)}
	
	for {
		select {
		case <-p.ctx.Done():
			return
		case task, ok := <-p.taskChan:
			if !ok {
				return
			}
			
			result, err := worker.Process(p.ctx, task)
			p.resultChan <- Result{
				Value: result,
				Error: err,
			}
		}
	}
}

// Submit 提交任务
func (p *Pool) Submit(task interface{}) error {
	select {
	case <-p.ctx.Done():
		return p.ctx.Err()
	case p.taskChan <- task:
		return nil
	}
}

// Results 获取结果通道
func (p *Pool) Results() <-chan Result {
	return p.resultChan
}

// Stop 停止工作池
func (p *Pool) Stop() {
	p.cancel()
	close(p.taskChan)
	p.wg.Wait()
	close(p.resultChan)
}

// FanOut 扇出模式
// 参数：
//   - ctx: 上下文
//   - input: 输入通道
//   - workers: 工作者数量
//   - process: 处理函数
// 返回：
//   - <-chan interface{}: 输出通道
func FanOut(
	ctx context.Context,
	input <-chan interface{},
	workers int,
	process func(context.Context, interface{}) (interface{}, error),
) <-chan interface{} {
	output := make(chan interface{})
	var wg sync.WaitGroup
	
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for {
				select {
				case <-ctx.Done():
					return
				case item, ok := <-input:
					if !ok {
						return
					}
					result, err := process(ctx, item)
					if err == nil {
						select {
						case <-ctx.Done():
							return
						case output <- result:
						}
					}
				}
			}
		}()
	}
	
	go func() {
		wg.Wait()
		close(output)
	}()
	
	return output
}

// FanIn 扇入模式
// 参数：
//   - ctx: 上下文
//   - channels: 输入通道列表
// 返回：
//   - <-chan interface{}: 合并后的输出通道
func FanIn(ctx context.Context, channels ...<-chan interface{}) <-chan interface{} {
	output := make(chan interface{})
	var wg sync.WaitGroup
	
	multiplex := func(ch <-chan interface{}) {
		defer wg.Done()
		for {
			select {
			case <-ctx.Done():
				return
			case item, ok := <-ch:
				if !ok {
					return
				}
				select {
				case <-ctx.Done():
					return
				case output <- item:
				}
			}
		}
	}
	
	wg.Add(len(channels))
	for _, ch := range channels {
		go multiplex(ch)
	}
	
	go func() {
		wg.Wait()
		close(output)
	}()
	
	return output
}

// PipelineStage 管道阶段
type PipelineStage func(context.Context, <-chan interface{}) <-chan interface{}

// BuildPipeline 构建处理管道
// 参数：
//   - ctx: 上下文
//   - input: 输入通道
//   - stages: 处理阶段
// 返回：
//   - <-chan interface{}: 最终输出通道
func BuildPipeline(ctx context.Context, input <-chan interface{}, stages ...PipelineStage) <-chan interface{} {
	current := input
	for _, stage := range stages {
		current = stage(ctx, current)
	}
	return current
}
```

### 错误处理

```go
package main

import (
	"errors"
	"fmt"
)

// ErrorCode 错误码类型
type ErrorCode int

const (
	ErrUnknown ErrorCode = iota
	ErrNotFound
	ErrInvalidInput
	ErrUnauthorized
	ErrInternal
)

// AppError 应用错误
type AppError struct {
	Code    ErrorCode
	Message string
	Cause   error
}

// Error 实现 error 接口
func (e *AppError) Error() string {
	if e.Cause != nil {
		return fmt.Sprintf("[%d] %s: %v", e.Code, e.Message, e.Cause)
	}
	return fmt.Sprintf("[%d] %s", e.Code, e.Message)
}

// Unwrap 实现错误解包
func (e *AppError) Unwrap() error {
	return e.Cause
}

// NewAppError 创建应用错误
// 参数：
//   - code: 错误码
//   - message: 错误消息
//   - cause: 原因错误
// 返回：
//   - *AppError: 应用错误指针
func NewAppError(code ErrorCode, message string, cause error) *AppError {
	return &AppError{
		Code:    code,
		Message: message,
		Cause:   cause,
	}
}

// IsNotFound 检查是否为未找到错误
func IsNotFound(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code == ErrNotFound
	}
	return false
}

// IsInvalidInput 检查是否为输入错误
func IsInvalidInput(err error) bool {
	var appErr *AppError
	if errors.As(err, &appErr) {
		return appErr.Code == ErrInvalidInput
	}
	return false
}

// Result 通用结果类型
type Result[T any] struct {
	Value T
	Error error
}

// Ok 创建成功结果
func Ok[T any](value T) Result[T] {
	return Result[T]{Value: value}
}

// Err 创建错误结果
func Err[T any](err error) Result[T] {
	return Result[T]{Error: err}
}

// IsOk 检查是否成功
func (r Result[T]) IsOk() bool {
	return r.Error == nil
}

// IsErr 检查是否错误
func (r Result[T]) IsErr() bool {
	return r.Error != nil
}

// Unwrap 解包结果
func (r Result[T]) Unwrap() T {
	if r.Error != nil {
		panic(r.Error)
	}
	return r.Value
}

// UnwrapOr 解包或返回默认值
func (r Result[T]) UnwrapOr(defaultValue T) T {
	if r.Error != nil {
		return defaultValue
	}
	return r.Value
}

// Map 映射结果值
func Map[T, U any](r Result[T], fn func(T) U) Result[U] {
	if r.Error != nil {
		return Err[U](r.Error)
	}
	return Ok(fn(r.Value))
}

// AndThen 链式操作
func AndThen[T, U any](r Result[T], fn func(T) Result[U]) Result[U] {
	if r.Error != nil {
		return Err[U](r.Error)
	}
	return fn(r.Value)
}
```

### Context 使用

```go
package main

import (
	"context"
	"fmt"
	"time"
)

// RequestContext 请求上下文
type RequestContext struct {
	TraceID  string
	UserID   int64
	Metadata map[string]interface{}
}

// contextKey 上下文键类型
type contextKey string

const (
	requestContextKey contextKey = "request_context"
)

// WithRequestContext 设置请求上下文
// 参数：
//   - ctx: 原始上下文
//   - rc: 请求上下文
// 返回：
//   - context.Context: 新上下文
func WithRequestContext(ctx context.Context, rc *RequestContext) context.Context {
	return context.WithValue(ctx, requestContextKey, rc)
}

// GetRequestContext 获取请求上下文
// 参数：
//   - ctx: 上下文
// 返回：
//   - *RequestContext: 请求上下文
//   - bool: 是否存在
func GetRequestContext(ctx context.Context) (*RequestContext, bool) {
	rc, ok := ctx.Value(requestContextKey).(*RequestContext)
	return rc, ok
}

// TimeoutOperation 带超时的操作
// 参数：
//   - ctx: 上下文
//   - timeout: 超时时间
//   - operation: 操作函数
// 返回：
//   - interface{}: 结果
//   - error: 错误
func TimeoutOperation(
	ctx context.Context,
	timeout time.Duration,
	operation func(context.Context) (interface{}, error),
) (interface{}, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	
	resultChan := make(chan interface{})
	errChan := make(chan error)
	
	go func() {
		result, err := operation(ctx)
		if err != nil {
			errChan <- err
			return
		}
		resultChan <- result
	}()
	
	select {
	case <-ctx.Done():
		return nil, fmt.Errorf("operation timed out: %w", ctx.Err())
	case err := <-errChan:
		return nil, err
	case result := <-resultChan:
		return result, nil
	}
}

// RetryWithBackoff 带退避的重试
// 参数：
//   - ctx: 上下文
//   - maxRetries: 最大重试次数
//   - initialDelay: 初始延迟
//   - operation: 操作函数
// 返回：
//   - interface{}: 结果
//   - error: 错误
func RetryWithBackoff(
	ctx context.Context,
	maxRetries int,
	initialDelay time.Duration,
	operation func(context.Context) (interface{}, error),
) (interface{}, error) {
	var lastErr error
	delay := initialDelay
	
	for i := 0; i < maxRetries; i++ {
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		default:
		}
		
		result, err := operation(ctx)
		if err == nil {
			return result, nil
		}
		
		lastErr = err
		
		select {
		case <-ctx.Done():
			return nil, ctx.Err()
		case <-time.After(delay):
		}
		
		delay *= 2
	}
	
	return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `go func()` | 启动协程 | `go func() { ... }()` |
| `make(chan T)` | 创建通道 | `ch := make(chan int, 10)` |
| `<-ch` | 从通道接收 | `value := <-ch` |
| `ch <- value` | 发送到通道 | `ch <- 123` |
| `close(ch)` | 关闭通道 | `close(ch)` |
| `select` | 多路选择 | `select { case <-ch: }` |
| `context.Context` | 上下文控制 | `ctx, cancel := context.WithTimeout(...)` |
| `sync.WaitGroup` | 等待组 | `wg.Add(1); go fn(); wg.Wait()` |
| `sync.Mutex` | 互斥锁 | `mu.Lock(); defer mu.Unlock()` |
| `sync.RWMutex` | 读写锁 | `mu.RLock(); defer mu.RUnlock()` |
| `sync.Once` | 单次执行 | `once.Do(func(){ ... })` |
| `sync.Pool` | 对象池 | `pool.Get(); pool.Put()` |
| `defer` | 延迟执行 | `defer file.Close()` |
| `interface{}` | 空接口 | `func Any(v interface{})` |
| `type assertion` | 类型断言 | `v, ok := i.(string)` |
| `type switch` | 类型切换 | `switch v := i.(type)` |
| `error` | 错误接口 | `if err != nil { return err }` |
| `errors.Is()` | 错误比较 | `errors.Is(err, ErrNotFound)` |
| `errors.As()` | 错误转换 | `errors.As(err, &appErr)` |
| `go generate` | 代码生成 | `//go:generate go tool` |
