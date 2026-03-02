# Spring Boot 开发模式参考

Spring Boot 最佳实践、自动配置、配置管理和监控集成，用于构建企业级 Java 微服务应用程序。

## When to Activate

- 编写新的 Spring Boot 应用
- 配置 Spring Boot 项目
- 集成监控和健康检查
- 设计微服务架构
- 实现条件装配和 Starter

## Core Principles

### 1. 约定优于配置

Spring Boot 通过合理的默认值减少配置工作。

```java
/**
 * 标准启动类
 * 
 * @SpringBootApplication 组合了三个注解：
 * - @Configuration: 标识配置类
 * - @EnableAutoConfiguration: 启用自动配置
 * - @ComponentScan: 启用组件扫描
 */
@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}

// Good: 遵循约定，无需额外配置
// 应用自动扫描当前包及子包下的所有组件

// Bad: 过度配置，破坏约定
@SpringBootApplication
@ComponentScan(basePackages = {"com.example", "com.other"})
@EnableAutoConfiguration(exclude = {DataSourceAutoConfiguration.class})
public class Application {
    // 不必要的显式配置
}
```

### 2. 自动配置优先

利用 Spring Boot 的自动配置机制，避免手动配置。

```java
// Good: 使用自动配置，只需添加依赖
// pom.xml 添加 spring-boot-starter-data-jpa 即可

// Bad: 手动配置数据源
@Configuration
public class DataSourceConfig {
    @Bean
    public DataSource dataSource() {
        HikariDataSource ds = new HikariDataSource();
        ds.setJdbcUrl("jdbc:mysql://localhost:3306/mydb");
        ds.setUsername("root");
        ds.setPassword("password");
        return ds;
    }
}

// Good: 使用配置属性
// application.yml
// spring:
//   datasource:
//     url: jdbc:mysql://localhost:3306/mydb
//     username: root
//     password: password
```

### 3. 配置外部化

所有配置应支持外部化，便于不同环境部署。

```java
/**
 * 配置属性类
 * 
 * 使用 @ConfigurationProperties 绑定外部配置，
 * 支持类型安全的配置访问和验证。
 */
@ConfigurationProperties(prefix = "app")
@Validated
public class AppProperties {
    
    @NotBlank(message = "应用名称不能为空")
    private String name;
    
    @Min(value = 1, message = "线程池大小至少为1")
    private int threadPoolSize = 10;
    
    private Duration timeout = Duration.ofSeconds(30);
    
    private Map<String, String> features = new HashMap<>();
    
    // getters and setters
}
```

## Auto-configuration 模式

### 条件装配注解

```java
package com.example.config;

import org.springframework.boot.autoconfigure.*;
import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.boot.context.properties.*;

/**
 * 数据源自动配置类
 * 
 * 根据配置和类路径条件自动配置数据源，
 * 支持多数据源切换和连接池优化。
 */
@Configuration
@EnableConfigurationProperties(DataSourceProperties.class)
public class DataSourceAutoConfiguration {
    
    /**
     * 主数据源配置
     * 
     * 当存在主数据源配置时自动创建，
     * 使用 HikariCP 连接池优化性能。
     * 
     * @return DataSource 数据源实例
     */
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.primary")
    @ConditionalOnProperty(prefix = "spring.datasource.primary", name = "url")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create()
            .type(HikariDataSource.class)
            .build();
    }
    
    /**
     * 只读数据源配置
     * 
     * 配置只读副本数据源，用于读写分离场景，
     * 仅在配置了只读数据源时生效。
     * 
     * @return DataSource 只读数据源实例
     */
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.readonly")
    @ConditionalOnProperty(prefix = "spring.datasource.readonly", name = "url")
    @ConditionalOnMissingBean(name = "readonlyDataSource")
    public DataSource readonlyDataSource() {
        return DataSourceBuilder.create()
            .type(HikariDataSource.class)
            .build();
    }
    
    /**
     * 动态数据源路由
     * 
     * 实现运行时数据源动态切换，
     * 支持基于注解或上下文的路由策略。
     * 
     * @param primary 主数据源
     * @param readonly 只读数据源
     * @return RoutingDataSource 路由数据源
     */
    @Bean
    @Primary
    @ConditionalOnBean(name = {"primaryDataSource", "readonlyDataSource"})
    public RoutingDataSource routingDataSource(
            DataSource primaryDataSource,
            DataSource readonlyDataSource) {
        Map<Object, Object> targetDataSources = new HashMap<>();
        targetDataSources.put("primary", primaryDataSource);
        targetDataSources.put("readonly", readonlyDataSource);
        
        RoutingDataSource routing = new RoutingDataSource();
        routing.setDefaultTargetDataSource(primaryDataSource);
        routing.setTargetDataSources(targetDataSources);
        return routing;
    }
}

/**
 * 条件装配注解速查表
 * 
 * | 注解 | 触发条件 |
 * |------|----------|
 * | @ConditionalOnClass | 类路径存在指定类 |
 * | @ConditionalOnMissingClass | 类路径不存在指定类 |
 * | @ConditionalOnBean | 容器中存在指定 Bean |
 * | @ConditionalOnMissingBean | 容器中不存在指定 Bean |
 * | @ConditionalOnProperty | 配置属性满足条件 |
 * | @ConditionalOnResource | 存在指定资源文件 |
 * | @ConditionalOnWebApplication | 是 Web 应用 |
 * | @ConditionalOnExpression | SpEL 表达式为真 |
 */
```

### 自定义 Starter

```java
package com.example.starter;

import org.springframework.boot.autoconfigure.*;
import org.springframework.boot.context.properties.*;
import org.springframework.context.annotation.*;

/**
 * 自定义 Starter 自动配置类
 * 
 * 创建可复用的 Spring Boot Starter，
 * 遵循自动配置命名规范和条件装配原则。
 */
@AutoConfiguration
@EnableConfigurationProperties(ExampleProperties.class)
@ConditionalOnClass(ExampleService.class)
public class ExampleAutoConfiguration {
    
    /**
     * 创建示例服务 Bean
     * 
     * 仅在配置启用时创建，
     * 支持自定义属性注入。
     * 
     * @param properties 配置属性
     * @return ExampleService 服务实例
     */
    @Bean
    @ConditionalOnMissingBean
    @ConditionalOnProperty(prefix = "example", name = "enabled", havingValue = "true")
    public ExampleService exampleService(ExampleProperties properties) {
        return new ExampleService(properties);
    }
}

/**
 * Starter 配置属性类
 * 
 * 定义 Starter 的可配置属性，
 * 支持默认值和验证。
 */
@ConfigurationProperties(prefix = "example")
public class ExampleProperties {
    
    private boolean enabled = false;
    
    private String message = "Hello, World!";
    
    private int retryTimes = 3;
    
    // getters and setters
}

// resources/META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports
// com.example.starter.ExampleAutoConfiguration
```

## 配置管理模式

### application.yml 配置

```yaml
# 基础配置
spring:
  application:
    name: my-service
  profiles:
    active: dev
    
  # 数据源配置
  datasource:
    url: jdbc:mysql://localhost:3306/mydb?useSSL=false&serverTimezone=UTC
    username: ${DB_USERNAME:root}
    password: ${DB_PASSWORD:password}
    driver-class-name: com.mysql.cj.jdbc.Driver
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      idle-timeout: 300000
      connection-timeout: 20000
      pool-name: MyHikariCP
      
  # JPA 配置
  jpa:
    hibernate:
      ddl-auto: validate
    show-sql: false
    properties:
      hibernate:
        format_sql: true
        dialect: org.hibernate.dialect.MySQL8Dialect
        
  # 缓存配置
  cache:
    type: redis
    redis:
      time-to-live: 600000
      
  # Redis 配置
  redis:
    host: ${REDIS_HOST:localhost}
    port: ${REDIS_PORT:6379}
    password: ${REDIS_PASSWORD:}
    lettuce:
      pool:
        max-active: 8
        max-idle: 8
        min-idle: 0

# 服务器配置
server:
  port: 8080
  servlet:
    context-path: /api
  compression:
    enabled: true
    mime-types: application/json,text/html,text/xml,text/plain

# 日志配置
logging:
  level:
    root: INFO
    com.example: DEBUG
    org.hibernate.SQL: DEBUG
  pattern:
    console: "%d{yyyy-MM-dd HH:mm:ss} [%thread] %-5level %logger{36} - %msg%n"
  file:
    name: logs/application.log
    max-size: 10MB
    max-history: 30

# 自定义配置
app:
  name: 我的应用
  version: 1.0.0
  features:
    cache-enabled: true
    audit-enabled: true
  security:
    jwt-secret: ${JWT_SECRET:default-secret-key}
    token-expiration: 86400000
```

### Profile 环境配置

```yaml
# application-dev.yml - 开发环境
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/mydb_dev
    username: dev_user
    password: dev_password
    
  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true
    
logging:
  level:
    com.example: DEBUG
    
app:
  debug: true
  mock-enabled: true

---
# application-test.yml - 测试环境
spring:
  datasource:
    url: jdbc:mysql://test-db:3306/mydb_test
    username: test_user
    password: test_password
    
  jpa:
    hibernate:
      ddl-auto: validate
      
logging:
  level:
    com.example: INFO
    
app:
  debug: false
  mock-enabled: false

---
# application-prod.yml - 生产环境
spring:
  datasource:
    url: jdbc:mysql://${DB_HOST}:3306/${DB_NAME}
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    
  jpa:
    hibernate:
      ddl-auto: none
    show-sql: false
    
logging:
  level:
    root: WARN
    com.example: INFO
    
app:
  debug: false
  mock-enabled: false
  security:
    jwt-secret: ${JWT_SECRET}
```

### Profile 激活方式

```java
/**
 * Profile 配置类
 * 
 * 根据不同环境加载不同的 Bean 配置，
 * 支持开发、测试、生产环境切换。
 */
@Configuration
public class ProfileConfig {
    
    /**
     * 开发环境数据初始化
     * 
     * 仅在 dev profile 激活时执行，
     * 用于加载测试数据。
     */
    @Bean
    @Profile("dev")
    public DataInitializer devDataInitializer() {
        return new DevDataInitializer();
    }
    
    /**
     * 生产环境数据初始化
     * 
     * 仅在 prod profile 激活时执行，
     * 用于验证必要数据。
     */
    @Bean
    @Profile("prod")
    public DataInitializer prodDataInitializer() {
        return new ProdDataInitializer();
    }
}

// 激活 Profile 的方式：
// 1. 配置文件: spring.profiles.active=dev
// 2. 环境变量: SPRING_PROFILES_ACTIVE=dev
// 3. 启动参数: java -jar app.jar --spring.profiles.active=dev
// 4. 代码设置: SpringApplication.setAdditionalProfiles("dev")
```

## 监控集成模式

### Actuator 配置

```yaml
# application.yml - Actuator 配置
management:
  endpoints:
    web:
      exposure:
        include: health,info,metrics,prometheus,env,loggers
      base-path: /actuator
    jmx:
      exposure:
        include: health,info
        
  endpoint:
    health:
      show-details: when-authorized
      show-components: always
      probes:
        enabled: true
    info:
      enabled: true
    metrics:
      enabled: true
    prometheus:
      enabled: true
      
  health:
    db:
      enabled: true
    redis:
      enabled: true
    diskspace:
      enabled: true
      threshold: 10GB
      
  metrics:
    tags:
      application: ${spring.application.name}
      environment: ${spring.profiles.active}
    export:
      prometheus:
        enabled: true
    distribution:
      percentiles-histogram:
        http.server.requests: true
      percentiles:
        http.server.requests: 0.5,0.95,0.99
        
  info:
    env:
      enabled: true
    git:
      mode: full
```

### 自定义健康检查

```java
package com.example.actuator;

import org.springframework.boot.actuate.health.*;
import org.springframework.stereotype.Component;
import java.sql.Connection;

/**
 * 自定义健康指示器
 * 
 * 检查数据库连接状态，
 * 支持配置超时和重试策略。
 */
@Component
public class DatabaseHealthIndicator implements HealthIndicator {
    
    private final DataSource dataSource;
    
    public DatabaseHealthIndicator(DataSource dataSource) {
        this.dataSource = dataSource;
    }
    
    /**
     * 执行健康检查
     * 
     * @return Health 健康状态对象
     */
    @Override
    public Health health() {
        try (Connection conn = dataSource.getConnection()) {
            if (conn.isValid(2)) {
                return Health.up()
                    .withDetail("database", "MySQL")
                    .withDetail("validationQuery", "SELECT 1")
                    .withDetail("connectionPool", "HikariCP")
                    .build();
            }
        } catch (SQLException e) {
            return Health.down()
                .withException(e)
                .withDetail("error", e.getMessage())
                .build();
        }
        return Health.unknown().build();
    }
}

/**
 * 组合健康检查指示器
 * 
 * 检查多个依赖服务的状态，
 * 聚合返回整体健康状态。
 */
@Component
public class CompositeHealthIndicator implements HealthIndicator {
    
    private final RestTemplate restTemplate;
    
    @Value("${app.dependencies.user-service.url}")
    private String userServiceUrl;
    
    /**
     * 执行组合健康检查
     * 
     * @return Health 聚合健康状态
     */
    @Override
    public Health health() {
        Health.Builder builder = Health.up();
        
        // 检查用户服务
        try {
            restTemplate.getForObject(userServiceUrl + "/health", String.class);
            builder.withDetail("userService", "UP");
        } catch (Exception e) {
            builder.withDetail("userService", "DOWN: " + e.getMessage());
            builder.status(Status.DOWN);
        }
        
        return builder.build();
    }
}
```

### 自定义 Actuator 端点

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.*;
import org.springframework.stereotype.Component;
import java.util.*;

/**
 * 自定义应用信息端点
 * 
 * 扩展 Actuator 功能，
 * 暴露自定义业务指标和状态信息。
 */
@Component
@Endpoint(id = "app-info")
public class AppInfoEndpoint {
    
    private final BuildProperties buildProperties;
    
    public AppInfoEndpoint(BuildProperties buildProperties) {
        this.buildProperties = buildProperties;
    }
    
    /**
     * 获取应用信息
     * 
     * @return Map 应用信息详情
     */
    @ReadOperation
    public Map<String, Object> info() {
        Map<String, Object> info = new LinkedHashMap<>();
        info.put("name", buildProperties.getName());
        info.put("version", buildProperties.getVersion());
        info.put("buildTime", buildProperties.getTime());
        info.put("java", System.getProperty("java.version"));
        info.put("os", System.getProperty("os.name"));
        return info;
    }
    
    /**
     * 获取指定信息项
     * 
     * @param key 信息键名
     * @return Map 信息详情
     */
    @ReadOperation
    public Map<String, Object> infoItem(@Selector String key) {
        return Map.of("key", key, "value", System.getProperty(key, "unknown"));
    }
}

/**
 * 自定义业务指标端点
 * 
 * 收集和暴露自定义业务指标，
 * 支持动态更新和聚合统计。
 */
@Component
@Endpoint(id = "business-metrics")
public class BusinessMetricsEndpoint {
    
    private final AtomicLong orderCount = new AtomicLong(0);
    private final AtomicLong revenue = new AtomicLong(0);
    
    /**
     * 获取业务指标
     * 
     * @return Map 业务指标数据
     */
    @ReadOperation
    public Map<String, Object> metrics() {
        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("orderCount", orderCount.get());
        metrics.put("revenue", revenue.get());
        metrics.put("avgOrderValue", 
            orderCount.get() > 0 ? revenue.get() / orderCount.get() : 0);
        metrics.put("timestamp", System.currentTimeMillis());
        return metrics;
    }
    
    /**
     * 重置指标
     * 
     * @return Map 操作结果
     */
    @WriteOperation
    public Map<String, Object> reset() {
        orderCount.set(0);
        revenue.set(0);
        return Map.of("status", "reset", "timestamp", System.currentTimeMillis());
    }
    
    /**
     * 增加订单计数
     * 
     * @param amount 订单金额
     */
    public void recordOrder(long amount) {
        orderCount.incrementAndGet();
        revenue.addAndGet(amount);
    }
}
```

### Prometheus 集成

```java
package com.example.metrics;

import io.micrometer.core.instrument.*;
import io.micrometer.prometheus.*;
import org.springframework.context.annotation.*;

/**
 * Prometheus 指标配置类
 * 
 * 配置 Micrometer 指标收集，
 * 集成 Prometheus 监控系统。
 */
@Configuration
public class MetricsConfig {
    
    /**
     * 配置 Prometheus 指标注册器
     * 
     * @return MeterRegistry 指标注册器
     */
    @Bean
    MeterRegistry meterRegistry() {
        PrometheusMeterRegistry registry = new PrometheusMeterRegistry(
            PrometheusConfig.DEFAULT
        );
        
        // 配置通用标签
        registry.config().commonTags(
            "application", "my-service",
            "environment", System.getProperty("spring.profiles.active", "unknown")
        );
        
        return registry;
    }
}

/**
 * 业务指标收集服务
 * 
 * 使用 Micrometer 收集自定义业务指标，
 * 支持计数器、计量器和分布摘要。
 */
@Service
public class BusinessMetricsService {
    
    private final MeterRegistry meterRegistry;
    private final Counter orderCounter;
    private final Timer requestTimer;
    private final Gauge activeUsersGauge;
    
    public BusinessMetricsService(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
        
        // 创建订单计数器
        this.orderCounter = Counter.builder("app.orders.total")
            .description("订单总数")
            .tag("type", "all")
            .register(meterRegistry);
            
        // 创建请求计时器
        this.requestTimer = Timer.builder("app.request.duration")
            .description("请求处理时间")
            .publishPercentiles(0.5, 0.95, 0.99)
            .register(meterRegistry);
            
        // 创建活跃用户计量器
        this.activeUsersGauge = Gauge.builder("app.users.active", this::getActiveUserCount)
            .description("活跃用户数")
            .register(meterRegistry);
    }
    
    /**
     * 记录订单
     * 
     * @param amount 订单金额
     */
    public void recordOrder(double amount) {
        orderCounter.increment();
        meterRegistry.counter("app.orders.amount").increment(amount);
    }
    
    /**
     * 记录请求耗时
     * 
     * @param operation 业务操作
     * @param <T> 返回类型
     * @return T 操作结果
     */
    public <T> T recordRequest(Supplier<T> operation) {
        return requestTimer.record(operation);
    }
    
    /**
     * 获取活跃用户数
     * 
     * @return double 活跃用户数
     */
    private double getActiveUserCount() {
        // 实际实现从缓存或数据库获取
        return 0;
    }
}

/**
 * HTTP 请求指标拦截器
 * 
 * 自动收集 HTTP 请求指标，
 * 记录请求路径、方法和状态码。
 */
@Component
public class RequestMetricsInterceptor implements HandlerInterceptor {
    
    private final MeterRegistry meterRegistry;
    
    public RequestMetricsInterceptor(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    @Override
    public void afterCompletion(
            HttpServletRequest request, 
            HttpServletResponse response, 
            Object handler, 
            Exception ex) {
        
        String method = request.getMethod();
        String uri = request.getRequestURI();
        int status = response.getStatus();
        
        Timer.builder("http.server.requests")
            .tag("method", method)
            .tag("uri", uri)
            .tag("status", String.valueOf(status))
            .register(meterRegistry)
            .record(() -> {});
    }
}
```

## 错误处理模式

### 全局异常处理

```java
package com.example.exception;

import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.context.request.*;
import java.time.LocalDateTime;
import java.util.*;

/**
 * 全局异常处理器
 * 
 * 统一处理应用异常，
 * 返回标准化的错误响应格式。
 */
@RestControllerAdvice
public class GlobalExceptionHandler {
    
    /**
     * 处理资源未找到异常
     * 
     * @param ex 异常对象
     * @param request 请求对象
     * @return ResponseEntity 错误响应
     */
    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleResourceNotFound(
            ResourceNotFoundException ex, 
            WebRequest request) {
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("资源未找到")
            .message(ex.getMessage())
            .path(((ServletWebRequest) request).getRequest().getRequestURI())
            .build();
            
        return new ResponseEntity<>(error, HttpStatus.NOT_FOUND);
    }
    
    /**
     * 处理参数验证异常
     * 
     * @param ex 异常对象
     * @param request 请求对象
     * @return ResponseEntity 错误响应
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationException(
            MethodArgumentNotValidException ex, 
            WebRequest request) {
        
        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .toList();
            
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("参数验证失败")
            .message("输入参数不符合要求")
            .path(((ServletWebRequest) request).getRequest().getRequestURI())
            .details(errors)
            .build();
            
        return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
    }
    
    /**
     * 处理业务异常
     * 
     * @param ex 异常对象
     * @param request 请求对象
     * @return ResponseEntity 错误响应
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(
            BusinessException ex, 
            WebRequest request) {
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.UNPROCESSABLE_ENTITY.value())
            .error("业务处理失败")
            .message(ex.getMessage())
            .code(ex.getCode())
            .path(((ServletWebRequest) request).getRequest().getRequestURI())
            .build();
            
        return new ResponseEntity<>(error, HttpStatus.UNPROCESSABLE_ENTITY);
    }
    
    /**
     * 处理未知异常
     * 
     * @param ex 异常对象
     * @param request 请求对象
     * @return ResponseEntity 错误响应
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(
            Exception ex, 
            WebRequest request) {
        
        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("服务器内部错误")
            .message("系统繁忙，请稍后重试")
            .path(((ServletWebRequest) request).getRequest().getRequestURI())
            .build();
            
        return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}

/**
 * 标准错误响应
 */
@Data
@Builder
public class ErrorResponse {
    private LocalDateTime timestamp;
    private int status;
    private String error;
    private String message;
    private String path;
    private String code;
    private List<String> details;
}

/**
 * 业务异常基类
 */
public class BusinessException extends RuntimeException {
    private final String code;
    
    public BusinessException(String message, String code) {
        super(message);
        this.code = code;
    }
    
    public String getCode() {
        return code;
    }
}

/**
 * 资源未找到异常
 */
public class ResourceNotFoundException extends RuntimeException {
    public ResourceNotFoundException(String message) {
        super(message);
    }
}
```

## 项目结构规范

### 标准项目布局

```
my-springboot-project/
├── src/
│   ├── main/
│   │   ├── java/
│   │   │   └── com/example/
│   │   │       ├── Application.java
│   │   │       ├── config/
│   │   │       │   ├── SecurityConfig.java
│   │   │       │   ├── DataSourceConfig.java
│   │   │       │   └── WebConfig.java
│   │   │       ├── controller/
│   │   │       │   └── UserController.java
│   │   │       ├── service/
│   │   │       │   ├── UserService.java
│   │   │       │   └── impl/
│   │   │       │       └── UserServiceImpl.java
│   │   │       ├── repository/
│   │   │       │   └── UserRepository.java
│   │   │       ├── entity/
│   │   │       │   └── User.java
│   │   │       ├── dto/
│   │   │       │   ├── UserRequest.java
│   │   │       │   └── UserResponse.java
│   │   │       ├── exception/
│   │   │       │   └── GlobalExceptionHandler.java
│   │   │       ├── actuator/
│   │   │       │   └── CustomHealthIndicator.java
│   │   │       └── util/
│   │   │           └── DateUtils.java
│   │   └── resources/
│   │       ├── application.yml
│   │       ├── application-dev.yml
│   │       ├── application-prod.yml
│   │       ├── static/
│   │       └── templates/
│   └── test/
│       └── java/
│           └── com/example/
│               ├── controller/
│               │   └── UserControllerTest.java
│               └── service/
│                   └── UserServiceTest.java
├── pom.xml
├── README.md
└── .gitignore
```

## Quick Reference: Spring Boot 注解

| 注解 | 用途 | 示例 |
|------|------|------|
| `@SpringBootApplication` | 启动类注解 | `@SpringBootApplication` |
| `@ConfigurationProperties` | 配置属性绑定 | `@ConfigurationProperties(prefix="app")` |
| `@ConditionalOnProperty` | 条件装配 | `@ConditionalOnProperty(name="feature.enabled")` |
| `@ConditionalOnClass` | 类存在时装配 | `@ConditionalOnClass(DataSource.class)` |
| `@ConditionalOnBean` | Bean存在时装配 | `@ConditionalOnBean(DataSource.class)` |
| `@Profile` | 环境配置 | `@Profile("dev")` |
| `@Endpoint` | 自定义Actuator端点 | `@Endpoint(id="custom")` |
| `@ReadOperation` | 端点读取操作 | `@ReadOperation` |
| `@WriteOperation` | 端点写入操作 | `@WriteOperation` |
| `@RestControllerAdvice` | 全局异常处理 | `@RestControllerAdvice` |
| `@ExceptionHandler` | 异常处理方法 | `@ExceptionHandler(Exception.class)` |
| `@Validated` | 参数验证 | `@Validated` |

## Anti-Patterns to Avoid

```java
// Bad: 硬编码配置
@Service
public class UserService {
    private String apiUrl = "http://localhost:8080/api";
}

// Good: 使用配置属性
@Service
public class UserService {
    @Value("${api.url}")
    private String apiUrl;
}

// Bad: 忽略自动配置
@Configuration
public class DataSourceConfig {
    @Bean
    public DataSource dataSource() {
        // 手动配置，忽略 Spring Boot 自动配置
    }
}

// Good: 利用自动配置
// 只需在 application.yml 中配置
// spring.datasource.url=jdbc:mysql://...

// Bad: 过度使用 @Autowired 字段注入
@Service
public class UserService {
    @Autowired
    private UserRepository userRepository;
}

// Good: 构造器注入
@Service
public class UserService {
    private final UserRepository userRepository;
    
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
}

// Bad: 捕获所有异常
@ExceptionHandler(Exception.class)
public void handle(Exception e) {
    // 吞掉异常
}

// Good: 记录并处理异常
@ExceptionHandler(Exception.class)
public ResponseEntity<ErrorResponse> handle(Exception e) {
    log.error("处理请求时发生错误", e);
    return ResponseEntity.internalServerError()
        .body(new ErrorResponse("服务器错误"));
}

// Bad: 敏感信息暴露
@GetMapping("/config")
public Map<String, Object> getConfig() {
    return environment.getSystemProperties();
}

// Good: 过滤敏感信息
@GetMapping("/config")
public Map<String, Object> getConfig() {
    return Map.of("version", buildProperties.getVersion());
}
```

**记住**: Spring Boot 的核心价值是简化配置。优先使用自动配置和约定，避免过度设计和手动配置。配置应外部化，便于不同环境部署。监控和健康检查是生产必备功能。
