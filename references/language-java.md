# Java Architect 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Java 开发、Spring 生态、设计模式、虚拟线程、企业级应用

## 核心特性

### Spring Boot 核心

```java
package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;
import org.springframework.stereotype.Service;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;
import lombok.*;

/**
 * 用户实体类
 */
@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String name;
    
    @Column(unique = true, nullable = false)
    private String email;
    
    @Enumerated(EnumType.STRING)
    private UserStatus status;
    
    @CreatedDate
    private LocalDateTime createdAt;
    
    @LastModifiedDate
    private LocalDateTime updatedAt;
}

/**
 * 用户状态枚举
 */
public enum UserStatus {
    ACTIVE,
    INACTIVE,
    SUSPENDED
}

/**
 * 用户仓储接口
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    /**
     * 根据邮箱查找用户
     */
    Optional<User> findByEmail(String email);
    
    /**
     * 根据状态查找用户列表
     */
    List<User> findByStatus(UserStatus status);
    
    /**
     * 检查邮箱是否存在
     */
    boolean existsByEmail(String email);
}
```

### 服务层设计

```java
package com.example.demo.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.cache.annotation.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

/**
 * 用户服务接口
 */
public interface UserService {
    User createUser(UserCreateRequest request);
    Optional<User> getUserById(Long id);
    User updateUser(Long id, UserUpdateRequest request);
    void deleteUser(Long id);
    Page<User> getUsers(Pageable pageable);
}

/**
 * 用户服务实现类
 */
@Service
@Transactional
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {
    
    private final UserRepository userRepository;
    private final UserMapper userMapper;
    private final ApplicationEventPublisher eventPublisher;
    
    /**
     * 创建新用户
     *
     * @param request 用户创建请求
     * @return 创建的用户实体
     * @throws DuplicateEmailException 邮箱重复时抛出
     */
    @Override
    @CacheEvict(value = "users", allEntries = true)
    public User createUser(UserCreateRequest request) {
        log.info("创建用户: {}", request.getEmail());
        
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("邮箱已被注册: " + request.getEmail());
        }
        
        User user = userMapper.toEntity(request);
        user.setStatus(UserStatus.ACTIVE);
        
        User savedUser = userRepository.save(user);
        
        // 发布用户创建事件
        eventPublisher.publishEvent(new UserCreatedEvent(savedUser.getId()));
        
        return savedUser;
    }
    
    /**
     * 根据ID获取用户
     *
     * @param id 用户ID
     * @return 用户实体（可选）
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#id")
    public Optional<User> getUserById(Long id) {
        return userRepository.findById(id);
    }
    
    /**
     * 更新用户信息
     *
     * @param id 用户ID
     * @param request 更新请求
     * @return 更新后的用户实体
     */
    @Override
    @CachePut(value = "users", key = "#id")
    public User updateUser(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用户不存在: " + id));
        
        userMapper.updateEntity(user, request);
        return userRepository.save(user);
    }
    
    /**
     * 删除用户
     *
     * @param id 用户ID
     */
    @Override
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new UserNotFoundException("用户不存在: " + id);
        }
        userRepository.deleteById(id);
    }
    
    /**
     * 分页获取用户列表
     *
     * @param pageable 分页参数
     * @return 用户分页数据
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#pageable")
    public Page<User> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable);
    }
}
```

### RESTful API 控制器

```java
package com.example.demo.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.http.ResponseEntity;
import org.springframework.data.domain.*;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;

/**
 * 用户控制器
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {
    
    private final UserService userService;
    
    /**
     * 创建用户
     *
     * @param request 用户创建请求
     * @return 创建的用户响应
     */
    @PostMapping
    public ResponseEntity<UserResponse> createUser(
            @Valid @RequestBody UserCreateRequest request) {
        User user = userService.createUser(request);
        return ResponseEntity
            .status(HttpStatus.CREATED)
            .body(UserResponse.from(user));
    }
    
    /**
     * 获取用户详情
     *
     * @param id 用户ID
     * @return 用户响应
     */
    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return userService.getUserById(id)
            .map(user -> ResponseEntity.ok(UserResponse.from(user)))
            .orElse(ResponseEntity.notFound().build());
    }
    
    /**
     * 更新用户
     *
     * @param id 用户ID
     * @param request 更新请求
     * @return 更新后的用户响应
     */
    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        User user = userService.updateUser(id, request);
        return ResponseEntity.ok(UserResponse.from(user));
    }
    
    /**
     * 删除用户
     *
     * @param id 用户ID
     * @return 无内容响应
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * 分页获取用户列表
     *
     * @param page 页码
     * @param size 每页大小
     * @return 用户分页响应
     */
    @GetMapping
    public ResponseEntity<Page<UserResponse>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("createdAt").descending());
        Page<User> users = userService.getUsers(pageable);
        return ResponseEntity.ok(users.map(UserResponse::from));
    }
}
```

### 虚拟线程 (Java 21+)

```java
package com.example.demo.concurrent;

import java.util.concurrent.*;
import java.util.List;

/**
 * 虚拟线程示例服务
 */
@Service
public class VirtualThreadService {
    
    /**
     * 使用虚拟线程执行并发任务
     *
     * @param tasks 任务列表
     * @return 结果列表
     */
    public <T> List<T> executeConcurrently(List<Callable<T>> tasks) {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            var futures = executor.invokeAll(tasks);
            return futures.stream()
                .map(this::getFutureResult)
                .toList();
        }
    }
    
    /**
     * 使用结构化并发处理多个数据源
     *
     * @param userIds 用户ID列表
     * @return 用户详情列表
     */
    public List<UserDetail> fetchUserDetails(List<Long> userIds) {
        try (var scope = new StructuredTaskScope.ShutdownOnFailure()) {
            List<StructuredTaskScope.Subtask<UserDetail>> subtasks = userIds.stream()
                .map(id -> scope.fork(() -> fetchUserDetail(id)))
                .toList();
            
            scope.join();
            scope.throwIfFailed();
            
            return subtasks.stream()
                .map(StructuredTaskScope.Subtask::get)
                .toList();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("任务被中断", e);
        }
    }
    
    /**
     * 获取单个用户详情
     */
    private UserDetail fetchUserDetail(Long userId) {
        // 模拟耗时操作
        Thread.sleep(Duration.ofMillis(100));
        return new UserDetail(userId, "User " + userId);
    }
    
    @SuppressWarnings("unchecked")
    private <T> T getFutureResult(Future<T> future) {
        try {
            return future.get();
        } catch (Exception e) {
            throw new RuntimeException("获取结果失败", e);
        }
    }
}

/**
 * 用户详情记录类
 */
public record UserDetail(Long id, String name) {}
```

### 设计模式实现

```java
package com.example.demo.patterns;

/**
 * 策略模式：支付处理器
 */
public interface PaymentProcessor {
    /**
     * 处理支付
     *
     * @param amount 支付金额
     * @return 支付结果
     */
    PaymentResult process(BigDecimal amount);
    
    /**
     * 获取处理器类型
     */
    PaymentType getType();
}

/**
 * 支付处理器工厂
 */
@Component
public class PaymentProcessorFactory {
    
    private final Map<PaymentType, PaymentProcessor> processors;
    
    public PaymentProcessorFactory(List<PaymentProcessor> processorList) {
        this.processors = processorList.stream()
            .collect(Collectors.toMap(
                PaymentProcessor::getType,
                Function.identity()
            ));
    }
    
    /**
     * 获取指定类型的支付处理器
     *
     * @param type 支付类型
     * @return 支付处理器
     */
    public PaymentProcessor getProcessor(PaymentType type) {
        PaymentProcessor processor = processors.get(type);
        if (processor == null) {
            throw new IllegalArgumentException("不支持的支付类型: " + type);
        }
        return processor;
    }
}

/**
 * 建造者模式：复杂对象构建
 */
@Builder
public record Order(
    Long id,
    String orderNo,
    Long userId,
    List<OrderItem> items,
    BigDecimal totalAmount,
    OrderStatus status,
    Address shippingAddress,
    LocalDateTime createdAt
) {
    /**
     * 订单建造者扩展
     */
    public static class OrderBuilder {
        private List<OrderItem> items = new ArrayList<>();
        
        /**
         * 添加订单项
         */
        public OrderBuilder addItem(OrderItem item) {
            this.items.add(item);
            return this;
        }
        
        /**
         * 自动计算总金额
         */
        public OrderBuilder calculateTotal() {
            this.totalAmount = items.stream()
                .map(OrderItem::subtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            return this;
        }
    }
}

/**
 * 观察者模式：事件监听
 */
@Component
public class UserEventListener {
    
    private final NotificationService notificationService;
    
    /**
     * 监听用户创建事件
     *
     * @param event 用户创建事件
     */
    @EventListener
    @Async
    public void onUserCreated(UserCreatedEvent event) {
        notificationService.sendWelcomeEmail(event.getUserId());
    }
    
    /**
     * 监听用户创建事件（事务提交后）
     *
     * @param event 用户创建事件
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onUserCreatedAfterCommit(UserCreatedEvent event) {
        // 事务提交后执行
        log.info("用户创建事务已提交: {}", event.getUserId());
    }
}
```

## 最佳实践

### 1. 使用 Optional 避免 NPE

```java
/**
 * 安全获取用户名称
 */
public String getUserName(Long userId) {
    return userRepository.findById(userId)
        .map(User::getName)
        .orElse("未知用户");
}

/**
 * 链式调用处理
 */
public String getUserEmail(Long userId) {
    return userRepository.findById(userId)
        .flatMap(u -> Optional.ofNullable(u.getEmail()))
        .filter(email -> !email.isEmpty())
        .orElseThrow(() -> new IllegalStateException("用户邮箱无效"));
}
```

### 2. 使用 Record 简化 DTO

```java
/**
 * 用户响应记录
 */
public record UserResponse(
    Long id,
    String name,
    String email,
    String status,
    LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getStatus().name(),
            user.getCreatedAt()
        );
    }
}
```

### 3. 使用 Stream API 处理集合

```java
/**
 * 获取活跃用户的邮箱列表
 */
public List<String> getActiveUserEmails() {
    return userRepository.findAll().stream()
        .filter(u -> u.getStatus() == UserStatus.ACTIVE)
        .map(User::getEmail)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
}
```

### 4. 使用 @Transactional 管理事务

```java
/**
 * 批量创建用户
 */
@Transactional
public List<User> createUsers(List<UserCreateRequest> requests) {
    return requests.stream()
        .map(this::createUser)
        .toList();
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `@Service` | 服务层组件 | `@Service public class UserService` |
| `@Repository` | 数据访问层 | `@Repository interface UserRepo` |
| `@Transactional` | 事务管理 | `@Transactional public void save()` |
| `@Cacheable` | 缓存结果 | `@Cacheable("users")` |
| `Optional` | 空值处理 | `Optional.ofNullable(value)` |
| `record` | 不可变数据类 | `record User(Long id, String name)` |
| `Stream` | 函数式处理 | `list.stream().filter().map()` |
| `var` | 类型推断 | `var user = userRepository.save(u)` |
| `sealed` | 密封类 | `sealed interface Shape` |
| `virtual threads` | 轻量线程 | `Executors.newVirtualThreadPerTaskExecutor()` |
