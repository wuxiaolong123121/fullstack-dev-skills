# Go 微服务示例 (Go Microservice Example)

## 概述

本文档提供一个完整的 Go 微服务项目配置示例，使用 gRPC + PostgreSQL 技术栈。

## 技术栈

| 类别 | 技术 | 版本 |
|-----|------|------|
| 语言 | Go | 1.21+ |
| 框架 | gRPC | - |
| 数据库 | PostgreSQL | 15+ |
| ORM | GORM | v1.25+ |
| 缓存 | Redis | 7+ |
| 容器 | Docker | - |
| 编排 | Kubernetes | - |

## 项目结构

```
go-microservice/
├── api/
│   └── proto/
│       └── v1/
│           ├── user.proto
│           └── order.proto
├── cmd/
│   ├── server/
│   │   └── main.go
│   └── migrate/
│       └── main.go
├── internal/
│   ├── config/
│   │   └── config.go
│   ├── domain/
│   │   ├── user/
│   │   │   ├── entity.go
│   │   │   ├── repository.go
│   │   │   └── service.go
│   │   └── order/
│   │       ├── entity.go
│   │       ├── repository.go
│   │       └── service.go
│   ├── infrastructure/
│   │   ├── database/
│   │   │   └── postgres.go
│   │   ├── cache/
│   │   │   └── redis.go
│   │   └── messaging/
│   │       └── rabbitmq.go
│   └── transport/
│       └── grpc/
│           ├── user_server.go
│           └── order_server.go
├── pkg/
│   ├── logger/
│   │   └── logger.go
│   ├── middleware/
│   │   ├── auth.go
│   │   └── logging.go
│   └── utils/
│       └── utils.go
├── deployments/
│   ├── docker/
│   │   ├── Dockerfile
│   │   └── docker-compose.yml
│   └── k8s/
│       ├── deployment.yaml
│       ├── service.yaml
│       └── configmap.yaml
├── scripts/
│   ├── generate.sh
│   └── migrate.sh
├── go.mod
├── go.sum
├── Makefile
└── .env.example
```

## CLAUDE.md 配置

```markdown
# Go 微服务项目

## 项目概述

订单管理微服务，提供用户和订单管理功能。

## 技术栈

- Go 1.21+
- gRPC + Protobuf
- PostgreSQL + GORM
- Redis
- Docker + Kubernetes

## 代码规范

### 项目结构
遵循 Clean Architecture:
- cmd/: 应用入口
- internal/: 内部实现
- pkg/: 可复用包
- api/: API 定义

### 错误处理
```go
// 定义错误
var (
    ErrUserNotFound = errors.New("user not found")
    ErrInvalidInput = errors.New("invalid input")
)

// 返回错误
func (s *Service) GetUser(id string) (*User, error) {
    if id == "" {
        return nil, ErrInvalidInput
    }
    
    user, err := s.repo.FindByID(id)
    if err != nil {
        if errors.Is(err, gorm.ErrRecordNotFound) {
            return nil, ErrUserNotFound
        }
        return nil, fmt.Errorf("failed to find user: %w", err)
    }
    
    return user, nil
}
```

### 依赖注入
```go
type UserService struct {
    repo   UserRepository
    cache  Cache
    logger Logger
}

func NewUserService(repo UserRepository, cache Cache, logger Logger) *UserService {
    return &UserService{
        repo:   repo,
        cache:  cache,
        logger: logger,
    }
}
```

## 常用命令

```bash
# 开发
make run              # 运行服务
make test             # 运行测试
make lint             # 代码检查

# 生成代码
make proto            # 生成 gRPC 代码
make migrate          # 运行迁移

# Docker
make docker-build     # 构建镜像
make docker-run       # 运行容器
```

## 环境变量

- DATABASE_URL
- REDIS_URL
- GRPC_PORT
- LOG_LEVEL
```

## Proto 定义

### api/proto/v1/user.proto

```protobuf
syntax = "proto3";

package api.v1;

option go_package = "github.com/example/go-microservice/api/v1;v1";

service UserService {
  rpc GetUser(GetUserRequest) returns (GetUserResponse);
  rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
  rpc UpdateUser(UpdateUserRequest) returns (UpdateUserResponse);
  rpc DeleteUser(DeleteUserRequest) returns (DeleteUserResponse);
  rpc ListUsers(ListUsersRequest) returns (ListUsersResponse);
}

message User {
  string id = 1;
  string email = 2;
  string name = 3;
  string created_at = 4;
  string updated_at = 5;
}

message GetUserRequest {
  string id = 1;
}

message GetUserResponse {
  User user = 1;
}

message CreateUserRequest {
  string email = 1;
  string name = 2;
  string password = 3;
}

message CreateUserResponse {
  User user = 1;
}

message UpdateUserRequest {
  string id = 1;
  string email = 2;
  string name = 3;
}

message UpdateUserResponse {
  User user = 1;
}

message DeleteUserRequest {
  string id = 1;
}

message DeleteUserResponse {
  bool success = 1;
}

message ListUsersRequest {
  int32 page = 1;
  int32 page_size = 2;
}

message ListUsersResponse {
  repeated User users = 1;
  int32 total = 2;
}
```

## 服务实现

### internal/domain/user/entity.go

```go
package user

import (
    "time"
    
    "gorm.io/gorm"
)

type User struct {
    ID        string         `gorm:"primaryKey;type:uuid;default:gen_random_uuid()"`
    Email     string         `gorm:"uniqueIndex;not null"`
    Name      string         `gorm:"not null"`
    Password  string         `gorm:"not null"`
    CreatedAt time.Time      `gorm:"autoCreateTime"`
    UpdatedAt time.Time      `gorm:"autoUpdateTime"`
    DeletedAt gorm.DeletedAt `gorm:"index"`
}

func (User) TableName() string {
    return "users"
}
```

### internal/domain/user/repository.go

```go
package user

import (
    "context"
    
    "gorm.io/gorm"
)

type Repository interface {
    FindByID(ctx context.Context, id string) (*User, error)
    FindByEmail(ctx context.Context, email string) (*User, error)
    Create(ctx context.Context, user *User) error
    Update(ctx context.Context, user *User) error
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, page, pageSize int) ([]User, int64, error)
}

type repository struct {
    db *gorm.DB
}

func NewRepository(db *gorm.DB) Repository {
    return &repository{db: db}
}

func (r *repository) FindByID(ctx context.Context, id string) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, "id = ?", id).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *repository) FindByEmail(ctx context.Context, email string) (*User, error) {
    var user User
    err := r.db.WithContext(ctx).First(&user, "email = ?", email).Error
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func (r *repository) Create(ctx context.Context, user *User) error {
    return r.db.WithContext(ctx).Create(user).Error
}

func (r *repository) Update(ctx context.Context, user *User) error {
    return r.db.WithContext(ctx).Save(user).Error
}

func (r *repository) Delete(ctx context.Context, id string) error {
    return r.db.WithContext(ctx).Delete(&User{}, "id = ?", id).Error
}

func (r *repository) List(ctx context.Context, page, pageSize int) ([]User, int64, error) {
    var users []User
    var total int64
    
    offset := (page - 1) * pageSize
    
    if err := r.db.WithContext(ctx).Model(&User{}).Count(&total).Error; err != nil {
        return nil, 0, err
    }
    
    if err := r.db.WithContext(ctx).Offset(offset).Limit(pageSize).Find(&users).Error; err != nil {
        return nil, 0, err
    }
    
    return users, total, nil
}
```

### internal/domain/user/service.go

```go
package user

import (
    "context"
    "errors"
    
    "golang.org/x/crypto/bcrypt"
)

var (
    ErrUserNotFound  = errors.New("user not found")
    ErrUserExists    = errors.New("user already exists")
    ErrInvalidInput  = errors.New("invalid input")
)

type Service interface {
    GetByID(ctx context.Context, id string) (*User, error)
    GetByEmail(ctx context.Context, email string) (*User, error)
    Create(ctx context.Context, email, name, password string) (*User, error)
    Update(ctx context.Context, id, email, name string) (*User, error)
    Delete(ctx context.Context, id string) error
    List(ctx context.Context, page, pageSize int) ([]User, int64, error)
}

type service struct {
    repo Repository
}

func NewService(repo Repository) Service {
    return &service{repo: repo}
}

func (s *service) GetByID(ctx context.Context, id string) (*User, error) {
    if id == "" {
        return nil, ErrInvalidInput
    }
    
    user, err := s.repo.FindByID(ctx, id)
    if err != nil {
        return nil, ErrUserNotFound
    }
    
    return user, nil
}

func (s *service) Create(ctx context.Context, email, name, password string) (*User, error) {
    if email == "" || name == "" || password == "" {
        return nil, ErrInvalidInput
    }
    
    existing, _ := s.repo.FindByEmail(ctx, email)
    if existing != nil {
        return nil, ErrUserExists
    }
    
    hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
    if err != nil {
        return nil, err
    }
    
    user := &User{
        Email:    email,
        Name:     name,
        Password: string(hashedPassword),
    }
    
    if err := s.repo.Create(ctx, user); err != nil {
        return nil, err
    }
    
    return user, nil
}
```

## Docker 配置

### Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder

WORKDIR /app

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

COPY --from=builder /server .
COPY --from=builder /app/config ./config

EXPOSE 50051

CMD ["./server"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "50051:50051"
    environment:
      - DATABASE_URL=postgres://user:password@postgres:5432/app?sslmode=disable
      - REDIS_URL=redis://redis:6379
      - GRPC_PORT=50051
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
      - POSTGRES_DB=app
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

## Kubernetes 配置

### deployment.yaml

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-microservice
  labels:
    app: go-microservice
spec:
  replicas: 3
  selector:
    matchLabels:
      app: go-microservice
  template:
    metadata:
      labels:
        app: go-microservice
    spec:
      containers:
      - name: app
        image: go-microservice:latest
        ports:
        - containerPort: 50051
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: database-url
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: redis-url
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "256Mi"
            cpu: "200m"
        livenessProbe:
          tcpSocket:
            port: 50051
          initialDelaySeconds: 5
          periodSeconds: 10
        readinessProbe:
          tcpSocket:
            port: 50051
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Makefile

```makefile
.PHONY: all build run test lint proto migrate docker-build docker-run

all: build

build:
	go build -o bin/server ./cmd/server

run:
	go run ./cmd/server

test:
	go test -v -race -coverprofile=coverage.out ./...

lint:
	golangci-lint run ./...

proto:
	protoc --go_out=. --go-grpc_out=. api/proto/v1/*.proto

migrate:
	go run ./cmd/migrate

docker-build:
	docker build -t go-microservice:latest .

docker-run:
	docker-compose up -d

clean:
	rm -rf bin/
	rm -rf coverage.out
```

## 相关参考

- [项目级配置示例](./example-project-config.md)
- [SaaS Next.js 示例](./example-saas-nextjs.md)
- [Django API 示例](./example-django-api.md)
