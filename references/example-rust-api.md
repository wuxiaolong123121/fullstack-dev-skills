# Rust API 示例配置

## 项目结构

```
routes/
├── mod.rs
├── health.rs
├── users.rs
└── items.rs
schemas/
├── mod.rs
├── user.rs
└── item.rs
utils/
├── mod.rs
├── db.rs
└── auth.rs
middleware/
├── mod.rs
└── auth.rs
main.rs
Cargo.toml
.env.example
.gitignore
```

## 核心依赖

```toml
# Cargo.toml
[dependencies]
axum = "0.6"
tokio = { version = "1", features = ["full"] }
sqlx = { version = "0.6", features = ["postgres", "runtime-tokio-native-tls"] }
tower-http = { version = "0.4", features = ["cors"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
jwt = "0.16"
dotenv = "0.15"
argon2 = "0.4"
```

## 主应用配置

```rust
// main.rs
use axum::{routing::get, Router};
use std::net::SocketAddr;
use tower_http::cors::CorsLayer;

mod routes;
mod utils;
mod middleware;

#[tokio::main]
async fn main() {
    // 加载环境变量
    dotenv::dotenv().expect("Failed to load .env file");
    
    // 初始化数据库连接
    utils::db::init_db().await.expect("Failed to initialize database");
    
    // 配置 CORS
    let cors = CorsLayer::permissive();
    
    // 构建路由
    let app = Router::new()
        .route("/health", get(routes::health::check))
        .nest("/api", routes::api_routes())
        .layer(cors);
    
    // 启动服务器
    let addr = SocketAddr::from(([127, 0, 0, 1], 3000));
    println!("Server running at http://{}", addr);
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await
        .unwrap();
}
```

## 数据库配置

```rust
// utils/db.rs
use sqlx::{postgres::PgPoolOptions, PgPool};
use std::env;

pub async fn init_db() -> Result<PgPool, sqlx::Error> {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL not set");
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;
    
    // 运行迁移
    sqlx::migrate!("migrations").run(&pool).await?;
    
    Ok(pool)
}

pub fn get_pool() -> PgPool {
    let database_url = env::var("DATABASE_URL").expect("DATABASE_URL not set");
    
    PgPoolOptions::new()
        .max_connections(5)
        .connect_lazy(&database_url)
        .expect("Failed to create database pool")
}
```

## 认证中间件

```rust
// middleware/auth.rs
use axum::{http::StatusCode, Extension, Json};
use jwt::VerifyWithKey;
use std::env;
use std::sync::Arc;

#[derive(Debug, serde::Deserialize)]
pub struct Claims {
    user_id: i32,
}

pub async fn auth_middleware(
    Extension(state): Extension<Arc<AppState>>,
    mut req: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let auth_header = req.headers().get("Authorization");
    
    match auth_header {
        Some(header) => {
            let token = header.to_str().unwrap().replace("Bearer ", "");
            let key = env::var("JWT_SECRET").expect("JWT_SECRET not set");
            
            let claims: Claims = token
                .verify_with_key(&key.as_bytes())
                .map_err(|_| StatusCode::UNAUTHORIZED)?;
            
            // 将用户 ID 添加到请求扩展中
            req.extensions_mut().insert(claims.user_id);
            Ok(next.run(req).await)
        }
        None => Err(StatusCode::UNAUTHORIZED),
    }
}
```

## 路由配置

```rust
// routes/mod.rs
use axum::Router;

mod health;
mod users;
mod items;

pub fn api_routes() -> Router {
    Router::new()
        .nest("/users", users::routes())
        .nest("/items", items::routes())
}

// routes/users.rs
use axum::{routing::post, Router};

pub fn routes() -> Router {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}

// routes/items.rs
use axum::{routing::{get, post}, Router};
use crate::middleware::auth::auth_middleware;

pub fn routes() -> Router {
    Router::new()
        .route("/", get(list_items).post(create_item))
        .route("/:id", get(get_item).put(update_item).delete(delete_item))
        .layer(axum::middleware::from_fn(auth_middleware))
}
```

## 环境变量配置

```env
# .env.example
DATABASE_URL=postgres://username:password@localhost:5432/rust_api
JWT_SECRET=your_jwt_secret_key
PORT=3000
```

## 数据库迁移

```sql
-- migrations/000001_create_users_table.up.sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- migrations/000002_create_items_table.up.sql
CREATE TABLE items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

## 测试策略

- **单元测试**：测试核心功能和工具函数
- **集成测试**：测试 API 端点和数据库交互
- **E2E 测试**：测试完整的用户流程

## 部署配置

### Docker 配置

```dockerfile
# Dockerfile
FROM rust:1.67-alpine as builder

WORKDIR /app
COPY . .

RUN cargo build --release

FROM alpine:3.17

WORKDIR /app
COPY --from=builder /app/target/release/rust-api .
COPY .env.example .env

EXPOSE 3000

CMD ["./rust-api"]
```

### Docker Compose 配置

```yaml
# docker-compose.yml
version: "3"
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: rust_api
    ports:
      - "5432:5432"
  api:
    build: .
    ports:
      - "3000:3000"
    depends_on:
      - db
    environment:
      DATABASE_URL: postgres://postgres:postgres@db:5432/rust_api
      JWT_SECRET: your_jwt_secret_key
      PORT: 3000
```

## CI/CD 配置

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    - name: Setup Rust
      uses: actions-rs/toolchain@v1
      with:
        toolchain: stable
    - name: Build
      run: cargo build --verbose
    - name: Run tests
      run: cargo test --verbose
```

## 安全最佳实践

1. **密码加密**：使用 Argon2 进行密码哈希
2. **JWT 认证**：使用安全的 JWT 实现
3. **输入验证**：验证所有用户输入
4. **CORS 配置**：适当配置 CORS 策略
5. **环境变量**：使用环境变量存储敏感信息
6. **数据库查询**：使用 SQLx 防止 SQL 注入
7. **错误处理**：不暴露详细的错误信息给客户端

## 性能优化

1. **连接池**：使用数据库连接池
2. **异步编程**：充分利用 Tokio 的异步特性
3. **缓存**：对于频繁访问的数据使用缓存
4. **压缩**：启用 HTTP 压缩
5. **路由优化**：合理组织路由结构

## 监控与日志

1. **结构化日志**：使用结构化日志格式
2. **健康检查**：实现健康检查端点
3. **指标监控**：集成 Prometheus 等监控工具
4. **错误跟踪**：使用 Sentry 等错误跟踪服务

## 总结

此配置提供了一个完整的 Rust API 项目模板，包括：

- **基础架构**：Axum + SQLx + PostgreSQL
- **认证系统**：JWT + Argon2
- **路由组织**：模块化路由结构
- **数据库迁移**：SQLx 迁移工具
- **容器化**：Docker + Docker Compose
- **CI/CD**：GitHub Actions
- **安全实践**：密码加密、输入验证等
- **性能优化**：连接池、异步编程等

此配置可以作为构建各种 Rust API 项目的起点，根据具体需求进行调整和扩展。