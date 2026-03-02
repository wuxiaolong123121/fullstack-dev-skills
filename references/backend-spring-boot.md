# Spring Boot 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Spring Boot/Java 后端、微服务、Spring Cloud、Actuator

## 核心特性

Spring Boot 是 Java 生态最流行的微服务框架，以"约定优于配置"和"自动配置"著称。

### 主要特性
- **自动配置**：根据依赖自动配置 Spring 应用
- **Starter POMs**：简化依赖管理
- **Actuator**：生产级监控和管理端点
- **Spring Cloud**：分布式系统解决方案
- **响应式编程**：WebFlux 响应式支持

## 最佳实践

### 自动配置与条件装配

```java
package com.example.config;

import org.springframework.boot.autoconfigure.condition.*;
import org.springframework.context.annotation.*;
import org.springframework.boot.context.properties.*;
import org.springframework.stereotype.Component;

/**
 * 数据源自动配置类
 * 
 * 根据配置和类路径条件自动配置数据源，
 * 支持多数据源切换和连接池优化。
 * 
 * @author System
 * @version 1.0
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
     * @param properties 数据源配置属性
     * @return DataSource 数据源实例
     */
    @Bean
    @ConfigurationProperties(prefix = "spring.datasource.primary")
    @ConditionalOnProperty(prefix = "spring.datasource.primary", name = "url")
    public DataSource primaryDataSource(DataSourceProperties properties) {
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
 * 数据源上下文持有者
 * 
 * 使用 ThreadLocal 存储当前线程的数据源标识，
 * 确保多线程环境下数据源隔离。
 */
public class DataSourceContextHolder {
    
    private static final ThreadLocal<String> CONTEXT = new ThreadLocal<>();
    
    /**
     * 设置当前数据源
     * 
     * @param dataSource 数据源标识
     */
    public static void setDataSource(String dataSource) {
        CONTEXT.set(dataSource);
    }
    
    /**
     * 获取当前数据源
     * 
     * @return String 当前数据源标识
     */
    public static String getDataSource() {
        return CONTEXT.get();
    }
    
    /**
     * 清除数据源上下文
     * 
     * 必须在请求结束时调用，防止内存泄漏。
     */
    public static void clear() {
        CONTEXT.remove();
    }
}
```

### Actuator 监控端点

```java
package com.example.actuator;

import org.springframework.boot.actuate.endpoint.annotation.*;
import org.springframework.boot.actuate.health.*;
import org.springframework.stereotype.Component;
import java.util.Map;
import java.util.HashMap;

/**
 * 自定义健康检查端点
 * 
 * 扩展 Actuator 健康检查功能，
 * 检查应用关键组件状态。
 * 
 * @author System
 * @version 1.0
 */
@Component
@Endpoint(id = "app-health")
public class AppHealthEndpoint {
    
    private final List<HealthIndicator> indicators;
    
    public AppHealthEndpoint(List<HealthIndicator> indicators) {
        this.indicators = indicators;
    }
    
    /**
     * 获取应用健康状态
     * 
     * 聚合所有健康检查指标，
     * 返回详细的状态信息。
     * 
     * @return Map 健康状态详情
     */
    @ReadOperation
    public Map<String, Object> health() {
        Map<String, Object> health = new HashMap<>();
        health.put("status", "UP");
        health.put("timestamp", System.currentTimeMillis());
        
        Map<String, Object> components = new HashMap<>();
        for (HealthIndicator indicator : indicators) {
            Health h = indicator.health();
            components.put(
                indicator.getClass().getSimpleName(),
                Map.of("status", h.getStatus().getCode())
            );
        }
        health.put("components", components);
        
        return health;
    }
    
    /**
     * 获取指定组件健康状态
     * 
     * @param component 组件名称
     * @return Map 组件健康详情
     */
    @ReadOperation
    public Map<String, Object> healthComponent(@Selector String component) {
        return Map.of(
            "component", component,
            "status", "UP",
            "details", "组件运行正常"
        );
    }
}

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
 * 自定义指标端点
 * 
 * 收集和暴露自定义业务指标，
 * 支持动态更新和聚合统计。
 */
@Component
@Endpoint(id = "app-metrics")
public class AppMetricsEndpoint {
    
    private final MeterRegistry meterRegistry;
    
    public AppMetricsEndpoint(MeterRegistry meterRegistry) {
        this.meterRegistry = meterRegistry;
    }
    
    /**
     * 获取业务指标
     * 
     * @return Map 指标数据
     */
    @ReadOperation
    public Map<String, Object> metrics() {
        Map<String, Object> metrics = new HashMap<>();
        
        meterRegistry.getMeters().forEach(meter -> {
            String name = meter.getId().getName();
            if (name.startsWith("app.")) {
                metrics.put(name, measure(meter));
            }
        });
        
        return metrics;
    }
    
    private Object measure(Meter meter) {
        if (meter instanceof Gauge) {
            return ((Gauge) meter).value();
        } else if (meter instanceof Counter) {
            return ((Counter) meter).count();
        }
        return null;
    }
}
```

### 微服务配置

```java
package com.example.service;

import org.springframework.cloud.client.*;
import org.springframework.cloud.client.discovery.*;
import org.springframework.cloud.client.loadbalancer.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.*;
import io.github.resilience4j.*;
import io.github.resilience4j.circuitbreaker.annotation.*;

/**
 * 微服务客户端服务
 * 
 * 封装服务间调用逻辑，集成服务发现、
 * 负载均衡和熔断器模式。
 * 
 * @author System
 * @version 1.0
 */
@Service
public class MicroserviceClient {
    
    private final DiscoveryClient discoveryClient;
    private final RestTemplate restTemplate;
    private final LoadBalancerClient loadBalancer;
    
    public MicroserviceClient(
            DiscoveryClient discoveryClient,
            RestTemplate restTemplate,
            LoadBalancerClient loadBalancer) {
        this.discoveryClient = discoveryClient;
        this.restTemplate = restTemplate;
        this.loadBalancer = loadBalancer;
    }
    
    /**
     * 获取服务实例列表
     * 
     * 从服务注册中心获取指定服务的所有实例，
     * 用于服务发现和健康检查。
     * 
     * @param serviceName 服务名称
     * @return List 服务实例列表
     */
    public List<ServiceInstance> getInstances(String serviceName) {
        return discoveryClient.getInstances(serviceName);
    }
    
    /**
     * 调用远程服务
     * 
     * 使用负载均衡选择服务实例，
     * 配合熔断器防止级联故障。
     * 
     * @param serviceName 目标服务名称
     * @param path 请求路径
     * @param responseType 响应类型
     * @return T 响应数据
     */
    @CircuitBreaker(name = "remoteService", fallbackMethod = "fallback")
    @Retry(name = "remoteService")
    public <T> T callService(
            String serviceName, 
            String path, 
            Class<T> responseType) {
        ServiceInstance instance = loadBalancer.choose(serviceName);
        if (instance == null) {
            throw new IllegalStateException("服务不可用: " + serviceName);
        }
        
        String url = instance.getUri() + path;
        return restTemplate.getForObject(url, responseType);
    }
    
    /**
     * 熔断降级方法
     * 
     * 当远程服务调用失败时执行，
     * 返回默认值或缓存数据。
     * 
     * @param serviceName 服务名称
     * @param path 请求路径
     * @param responseType 响应类型
     * @param e 异常对象
     * @return T 降级响应
     */
    public <T> T fallback(
            String serviceName, 
            String path, 
            Class<T> responseType, 
            Exception e) {
        log.warn("服务调用降级: {} - {}", serviceName, e.getMessage());
        return null;
    }
}

/**
 * Feign 客户端接口
 * 
 * 声明式 HTTP 客户端，简化服务间调用，
 * 自动集成负载均衡和熔断器。
 */
@FeignClient(
    name = "user-service",
    fallbackFactory = UserServiceFallbackFactory.class
)
public interface UserClient {
    
    /**
     * 获取用户信息
     * 
     * @param userId 用户ID
     * @return User 用户信息
     */
    @GetMapping("/api/users/{userId}")
    User getUser(@PathVariable("userId") Long userId);
    
    /**
     * 批量获取用户
     * 
     * @param userIds 用户ID列表
     * @return List 用户列表
     */
    @PostMapping("/api/users/batch")
    List<User> getUsers(@RequestBody List<Long> userIds);
}

/**
 * Feign 降级工厂
 * 
 * 创建带有异常信息的降级实例，
 * 支持日志记录和监控告警。
 */
@Component
public class UserServiceFallbackFactory implements FallbackFactory<UserClient> {
    
    @Override
    public UserClient create(Throwable cause) {
        return new UserClient() {
            @Override
            public User getUser(Long userId) {
                log.error("用户服务调用失败: userId={}, error={}", userId, cause.getMessage());
                return User.builder()
                    .id(userId)
                    .name("默认用户")
                    .build();
            }
            
            @Override
            public List<User> getUsers(List<Long> userIds) {
                log.error("批量获取用户失败: userIds={}", userIds);
                return Collections.emptyList();
            }
        };
    }
}
```

### Spring Cloud 配置

```yaml
spring:
  application:
    name: my-service
  cloud:
    nacos:
      discovery:
        server-addr: localhost:8848
        namespace: dev
        group: DEFAULT_GROUP
      config:
        server-addr: localhost:8848
        file-extension: yaml
        shared-configs:
          - data-id: common.yaml
            group: DEFAULT_GROUP
            refresh: true
    sentinel:
      transport:
        dashboard: localhost:8080
      eager: true
    gateway:
      routes:
        - id: user-service
          uri: lb://user-service
          predicates:
            - Path=/api/users/**
          filters:
            - StripPrefix=1
            - name: RequestRateLimiter
              args:
                redis-rate-limiter.replenishRate: 10
                redis-rate-limiter.burstCapacity: 20
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `@SpringBootApplication` | 启动类注解 | `@SpringBootApplication` |
| `@ConfigurationProperties` | 配置属性绑定 | `@ConfigurationProperties(prefix="app")` |
| `@ConditionalOnProperty` | 条件装配 | `@ConditionalOnProperty(name="feature.enabled")` |
| `@Endpoint` | 自定义 Actuator 端点 | `@Endpoint(id="custom")` |
| `@CircuitBreaker` | 熔断器 | `@CircuitBreaker(name="service")` |
| `@Retry` | 重试机制 | `@Retry(name="service")` |
| `@FeignClient` | 声明式客户端 | `@FeignClient(name="service")` |
| `@LoadBalanced` | 负载均衡 | `@LoadBalanced RestTemplate` |
| `@EnableDiscoveryClient` | 服务发现 | `@EnableDiscoveryClient` |
| `HealthIndicator` | 健康检查 | `implements HealthIndicator` |
| `MeterRegistry` | 指标注册 | `meterRegistry.counter("name")` |
| `@RefreshScope` | 配置刷新 | `@RefreshScope` |
