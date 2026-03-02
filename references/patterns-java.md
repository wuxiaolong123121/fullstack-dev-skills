# Java 开发模式参考

Java 编码标准、JPA 模式、Spring Boot 最佳实践，用于构建健壮、高效、可维护的企业级 Java 应用程序。

## When to Activate

- 编写新的 Java 代码
- 审查 Java 代码
- 重构现有 Java 代码
- 设计 Spring Boot 应用
- 实现 JPA 实体和仓储

## Core Principles

### 1. 面向对象设计原则

Java 是面向对象语言，代码应遵循 SOLID 原则。

```java
/**
 * 单一职责原则示例
 * 用户服务只负责用户相关业务逻辑
 */
@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final EmailService emailService;
    
    /**
     * 创建用户
     *
     * @param request 用户创建请求
     * @return 创建的用户实体
     */
    public User createUser(UserCreateRequest request) {
        User user = User.builder()
            .email(request.getEmail())
            .name(request.getName())
            .status(UserStatus.ACTIVE)
            .build();
        User savedUser = userRepository.save(user);
        emailService.sendWelcomeEmail(savedUser.getEmail());
        return savedUser;
    }
}
```

### 2. 优先使用不可变对象

不可变对象线程安全，易于理解和测试。

```java
/**
 * 不可变用户响应记录
 * 使用 record 创建不可变数据载体
 */
public record UserResponse(
    Long id,
    String name,
    String email,
    UserStatus status,
    LocalDateTime createdAt
) {
    /**
     * 从实体创建响应对象
     *
     * @param user 用户实体
     * @return 用户响应记录
     */
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getName(),
            user.getEmail(),
            user.getStatus(),
            user.getCreatedAt()
        );
    }
}
```

### 3. 使用 Optional 避免 NPE

```java
/**
 * 安全获取用户信息
 */
public Optional<User> findUserById(Long id) {
    return userRepository.findById(id);
}

/**
 * 链式调用处理空值
 */
public String getUserEmailSafe(Long userId) {
    return userRepository.findById(userId)
        .map(User::getEmail)
        .filter(email -> !email.isEmpty())
        .orElse("unknown@example.com");
}

/**
 * 抛出业务异常
 */
public User getUserOrThrow(Long userId) {
    return userRepository.findById(userId)
        .orElseThrow(() -> new UserNotFoundException("用户不存在: " + userId));
}
```

## JPA Entity Patterns

### 基础实体定义

```java
package com.example.domain.entity;

import jakarta.persistence.*;
import lombok.*;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.jpa.domain.support.AuditingEntityListener;

import java.time.LocalDateTime;

/**
 * 用户实体类
 * 包含基础字段映射和审计功能
 */
@Entity
@Table(name = "users", indexes = {
    @Index(name = "idx_user_email", columnList = "email", unique = true),
    @Index(name = "idx_user_status", columnList = "status")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EntityListeners(AuditingEntityListener.class)
public class User {

    /**
     * 主键ID
     */
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 用户名称
     */
    @Column(nullable = false, length = 100)
    private String name;

    /**
     * 邮箱地址（唯一）
     */
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    /**
     * 用户状态
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserStatus status;

    /**
     * 创建时间
     */
    @CreatedDate
    @Column(nullable = false, updatable = false)
    private LocalDateTime createdAt;

    /**
     * 更新时间
     */
    @LastModifiedDate
    @Column(nullable = false)
    private LocalDateTime updatedAt;

    /**
     * 软删除标记
     */
    @Column(nullable = false)
    @Builder.Default
    private Boolean deleted = false;
}
```

### 实体关联关系

```java
/**
 * 订单实体
 * 演示多对一关联
 */
@Entity
@Table(name = "orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Order {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * 订单编号
     */
    @Column(nullable = false, unique = true, length = 50)
    private String orderNo;

    /**
     * 所属用户（多对一）
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    /**
     * 订单项列表（一对多）
     */
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private List<OrderItem> items = new ArrayList<>();

    /**
     * 添加订单项（双向关联维护）
     *
     * @param item 订单项
     */
    public void addItem(OrderItem item) {
        items.add(item);
        item.setOrder(this);
    }

    /**
     * 移除订单项
     *
     * @param item 订单项
     */
    public void removeItem(OrderItem item) {
        items.remove(item);
        item.setOrder(null);
    }
}

/**
 * 订单项实体
 */
@Entity
@Table(name = "order_items")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @Column(nullable = false)
    private String productName;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 19, scale = 2)
    private BigDecimal unitPrice;

    /**
     * 计算小计金额
     *
     * @return 小计金额
     */
    public BigDecimal getSubtotal() {
        return unitPrice.multiply(BigDecimal.valueOf(quantity));
    }
}
```

### 复合主键实体

```java
/**
 * 复合主键类
 */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class OrderProductId implements Serializable {

    @Column(name = "order_id")
    private Long orderId;

    @Column(name = "product_id")
    private Long productId;
}

/**
 * 使用复合主键的实体
 */
@Entity
@Table(name = "order_products")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderProduct {

    @EmbeddedId
    private OrderProductId id;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("orderId")
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @MapsId("productId")
    @JoinColumn(name = "product_id")
    private Product product;

    @Column(nullable = false)
    private Integer quantity;
}
```

## Repository Patterns

### 基础仓储接口

```java
package com.example.domain.repository;

import com.example.domain.entity.User;
import com.example.domain.entity.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 用户仓储接口
 * 继承 JpaRepository 获得基础 CRUD 功能
 */
@Repository
public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    /**
     * 根据邮箱查找用户
     *
     * @param email 邮箱地址
     * @return 用户实体（可选）
     */
    Optional<User> findByEmail(String email);

    /**
     * 根据状态查找用户列表
     *
     * @param status 用户状态
     * @return 用户列表
     */
    List<User> findByStatus(UserStatus status);

    /**
     * 检查邮箱是否存在
     *
     * @param email 邮箱地址
     * @return 是否存在
     */
    boolean existsByEmail(String email);

    /**
     * 分页查询活跃用户
     *
     * @param status 用户状态
     * @param pageable 分页参数
     * @return 用户分页数据
     */
    Page<User> findByStatus(UserStatus status, Pageable pageable);

    /**
     * 查找指定时间后创建的用户
     *
     * @param createdAt 创建时间
     * @return 用户列表
     */
    List<User> findByCreatedAtAfter(LocalDateTime createdAt);

    /**
     * 统计指定状态的用户数量
     *
     * @param status 用户状态
     * @return 用户数量
     */
    long countByStatus(UserStatus status);
}
```

### 自定义查询方法

```java
/**
 * 用户仓储扩展接口
 */
public interface UserRepositoryCustom {
    
    /**
     * 批量更新用户状态
     *
     * @param userIds 用户ID列表
     * @param status 新状态
     * @return 更新数量
     */
    int batchUpdateStatus(List<Long> userIds, UserStatus status);
    
    /**
     * 搜索用户（复杂条件）
     *
     * @param keyword 关键词
     * @param status 状态
     * @return 用户列表
     */
    List<User> searchUsers(String keyword, UserStatus status);
}

/**
 * 用户仓储扩展实现
 */
@Repository
@RequiredArgsConstructor
public class UserRepositoryImpl implements UserRepositoryCustom {

    private final EntityManager entityManager;

    @Override
    @Transactional
    public int batchUpdateStatus(List<Long> userIds, UserStatus status) {
        return entityManager.createQuery(
                "UPDATE User u SET u.status = :status WHERE u.id IN :ids")
            .setParameter("status", status)
            .setParameter("ids", userIds)
            .executeUpdate();
    }

    @Override
    public List<User> searchUsers(String keyword, UserStatus status) {
        CriteriaBuilder cb = entityManager.getCriteriaBuilder();
        CriteriaQuery<User> query = cb.createQuery(User.class);
        Root<User> root = query.from(User.class);

        List<Predicate> predicates = new ArrayList<>();

        if (keyword != null && !keyword.isEmpty()) {
            predicates.add(cb.or(
                cb.like(root.get("name"), "%" + keyword + "%"),
                cb.like(root.get("email"), "%" + keyword + "%")
            ));
        }

        if (status != null) {
            predicates.add(cb.equal(root.get("status"), status));
        }

        query.where(predicates.toArray(new Predicate[0]));

        return entityManager.createQuery(query).getResultList();
    }
}
```

### 使用 @Query 注解

```java
/**
 * 订单仓储接口
 */
@Repository
public interface OrderRepository extends JpaRepository<Order, Long> {

    /**
     * 根据用户ID查询订单（JPQL）
     *
     * @param userId 用户ID
     * @return 订单列表
     */
    @Query("SELECT o FROM Order o WHERE o.user.id = :userId AND o.deleted = false")
    List<Order> findByUserId(@Param("userId") Long userId);

    /**
     * 统计用户订单数量
     *
     * @param userId 用户ID
     * @return 订单数量
     */
    @Query("SELECT COUNT(o) FROM Order o WHERE o.user.id = :userId")
    long countByUserId(@Param("userId") Long userId);

    /**
     * 原生SQL查询
     *
     * @param startDate 开始日期
     * @param endDate 结束日期
     * @return 订单统计结果
     */
    @Query(value = """
        SELECT DATE(created_at) as date, COUNT(*) as count
        FROM orders
        WHERE created_at BETWEEN :startDate AND :endDate
        GROUP BY DATE(created_at)
        ORDER BY date
        """, nativeQuery = true)
    List<Object[]> countOrdersByDate(
        @Param("startDate") LocalDateTime startDate,
        @Param("endDate") LocalDateTime endDate
    );

    /**
     * 更新查询
     *
     * @param orderId 订单ID
     * @param status 新状态
     * @return 更新数量
     */
    @Modifying
    @Transactional
    @Query("UPDATE Order o SET o.status = :status WHERE o.id = :orderId")
    int updateStatus(@Param("orderId") Long orderId, @Param("status") OrderStatus status);
}
```

## Service Patterns

### 服务层设计

```java
package com.example.application.service;

import com.example.application.dto.*;
import com.example.domain.entity.User;
import com.example.domain.entity.UserStatus;
import com.example.domain.repository.UserRepository;
import com.example.infrastructure.exception.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.cache.annotation.*;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;

import java.util.List;

/**
 * 用户服务接口
 */
public interface UserService {

    /**
     * 创建用户
     */
    UserResponse createUser(UserCreateRequest request);

    /**
     * 根据ID获取用户
     */
    UserResponse getUserById(Long id);

    /**
     * 更新用户
     */
    UserResponse updateUser(Long id, UserUpdateRequest request);

    /**
     * 删除用户
     */
    void deleteUser(Long id);

    /**
     * 分页获取用户列表
     */
    Page<UserResponse> getUsers(Pageable pageable);

    /**
     * 搜索用户
     */
    List<UserResponse> searchUsers(String keyword);
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
     * @return 创建的用户响应
     * @throws DuplicateEmailException 邮箱重复时抛出
     */
    @Override
    @CacheEvict(value = "users", allEntries = true)
    public UserResponse createUser(UserCreateRequest request) {
        log.info("创建用户: {}", request.getEmail());

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateEmailException("邮箱已被注册: " + request.getEmail());
        }

        User user = userMapper.toEntity(request);
        user.setStatus(UserStatus.ACTIVE);

        User savedUser = userRepository.save(user);

        eventPublisher.publishEvent(new UserCreatedEvent(savedUser.getId()));

        return UserResponse.from(savedUser);
    }

    /**
     * 根据ID获取用户
     *
     * @param id 用户ID
     * @return 用户响应
     * @throws UserNotFoundException 用户不存在时抛出
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#id")
    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用户不存在: " + id));
        return UserResponse.from(user);
    }

    /**
     * 更新用户信息
     *
     * @param id 用户ID
     * @param request 更新请求
     * @return 更新后的用户响应
     */
    @Override
    @CachePut(value = "users", key = "#id")
    public UserResponse updateUser(Long id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用户不存在: " + id));

        userMapper.updateEntity(user, request);
        User updatedUser = userRepository.save(user);

        return UserResponse.from(updatedUser);
    }

    /**
     * 删除用户（软删除）
     *
     * @param id 用户ID
     */
    @Override
    @CacheEvict(value = "users", key = "#id")
    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
            .orElseThrow(() -> new UserNotFoundException("用户不存在: " + id));

        user.setDeleted(true);
        userRepository.save(user);
    }

    /**
     * 分页获取用户列表
     *
     * @param pageable 分页参数
     * @return 用户分页响应
     */
    @Override
    @Transactional(readOnly = true)
    @Cacheable(value = "users", key = "#pageable.pageNumber + '-' + #pageable.pageSize")
    public Page<UserResponse> getUsers(Pageable pageable) {
        return userRepository.findAll(pageable)
            .map(UserResponse::from);
    }

    /**
     * 搜索用户
     *
     * @param keyword 搜索关键词
     * @return 用户响应列表
     */
    @Override
    @Transactional(readOnly = true)
    public List<UserResponse> searchUsers(String keyword) {
        return userRepository.searchUsers(keyword, UserStatus.ACTIVE)
            .stream()
            .map(UserResponse::from)
            .toList();
    }
}
```

### 事务管理

```java
/**
 * 订单服务实现
 * 演示事务传播和隔离级别
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class OrderServiceImpl implements OrderService {

    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final InventoryService inventoryService;

    /**
     * 创建订单
     * 使用默认事务配置
     *
     * @param request 订单创建请求
     * @return 订单响应
     */
    @Override
    @Transactional
    public OrderResponse createOrder(OrderCreateRequest request) {
        Order order = Order.builder()
            .orderNo(generateOrderNo())
            .status(OrderStatus.PENDING)
            .build();

        for (OrderItemRequest item : request.getItems()) {
            productService.validateProduct(item.getProductId());
            inventoryService.reserveStock(item.getProductId(), item.getQuantity());
            order.addItem(createOrderItem(item));
        }

        Order savedOrder = orderRepository.save(order);
        return OrderResponse.from(savedOrder);
    }

    /**
     * 批量处理订单
     * 使用新事务，独立于调用方事务
     *
     * @param orderIds 订单ID列表
     */
    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void batchProcessOrders(List<Long> orderIds) {
        for (Long orderId : orderIds) {
            try {
                processOrder(orderId);
            } catch (Exception e) {
                log.error("处理订单失败: {}", orderId, e);
            }
        }
    }

    /**
     * 只读事务
     * 优化数据库读取性能
     *
     * @param orderId 订单ID
     * @return 订单详情
     */
    @Override
    @Transactional(readOnly = true)
    public OrderDetailResponse getOrderDetail(Long orderId) {
        Order order = orderRepository.findById(orderId)
            .orElseThrow(() -> new OrderNotFoundException("订单不存在: " + orderId));
        return OrderDetailResponse.from(order);
    }

    /**
     * 超时控制
     *
     * @param orderId 订单ID
     */
    @Override
    @Transactional(timeout = 30)
    public void processOrder(Long orderId) {
        Order order = orderRepository.findByIdWithLock(orderId)
            .orElseThrow(() -> new OrderNotFoundException("订单不存在"));

        order.setStatus(OrderStatus.PROCESSING);
        orderRepository.save(order);
    }
}
```

## REST Controller Patterns

### 标准 RESTful 控制器

```java
package com.example.presentation.controller;

import com.example.application.dto.*;
import com.example.application.service.UserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

/**
 * 用户控制器
 * 提供用户相关的 RESTful API
 */
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Tag(name = "用户管理", description = "用户增删改查接口")
public class UserController {

    private final UserService userService;

    /**
     * 创建用户
     *
     * @param request 用户创建请求
     * @return 创建的用户响应
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "创建用户", description = "创建新用户并返回用户信息")
    public UserResponse createUser(@Valid @RequestBody UserCreateRequest request) {
        return userService.createUser(request);
    }

    /**
     * 获取用户详情
     *
     * @param id 用户ID
     * @return 用户响应
     */
    @GetMapping("/{id}")
    @Operation(summary = "获取用户", description = "根据ID获取用户详情")
    public ResponseEntity<UserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    /**
     * 更新用户
     *
     * @param id 用户ID
     * @param request 更新请求
     * @return 更新后的用户响应
     */
    @PutMapping("/{id}")
    @Operation(summary = "更新用户", description = "更新用户信息")
    public UserResponse updateUser(
            @PathVariable Long id,
            @Valid @RequestBody UserUpdateRequest request) {
        return userService.updateUser(id, request);
    }

    /**
     * 删除用户
     *
     * @param id 用户ID
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "删除用户", description = "删除指定用户")
    public void deleteUser(@PathVariable Long id) {
        userService.deleteUser(id);
    }

    /**
     * 分页获取用户列表
     *
     * @param page 页码（从0开始）
     * @param size 每页大小
     * @param sort 排序字段
     * @return 用户分页响应
     */
    @GetMapping
    @Operation(summary = "获取用户列表", description = "分页获取用户列表")
    public Page<UserResponse> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String sort) {

        Pageable pageable = PageRequest.of(page, size, Sort.by(parseSort(sort)));
        return userService.getUsers(pageable);
    }

    /**
     * 搜索用户
     *
     * @param keyword 搜索关键词
     * @return 用户响应列表
     */
    @GetMapping("/search")
    @Operation(summary = "搜索用户", description = "根据关键词搜索用户")
    public List<UserResponse> searchUsers(@RequestParam String keyword) {
        return userService.searchUsers(keyword);
    }

    /**
     * 解析排序参数
     */
    private Sort.Order parseSort(String sort) {
        String[] parts = sort.split(",");
        return new Sort.Order(
            Sort.Direction.fromString(parts.length > 1 ? parts[1] : "asc"),
            parts[0]
        );
    }
}
```

### 全局异常处理

```java
package com.example.infrastructure.exception;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.*;

/**
 * 全局异常处理器
 */
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    /**
     * 处理资源未找到异常
     */
    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ErrorResponse> handleEntityNotFound(EntityNotFoundException ex) {
        log.warn("资源未找到: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.NOT_FOUND.value())
            .error("Not Found")
            .message(ex.getMessage())
            .build();

        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(error);
    }

    /**
     * 处理参数校验异常
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        List<String> errors = ex.getBindingResult()
            .getFieldErrors()
            .stream()
            .map(error -> error.getField() + ": " + error.getDefaultMessage())
            .toList();

        ErrorResponse errorResponse = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Validation Failed")
            .message("参数校验失败")
            .errors(errors)
            .build();

        return ResponseEntity.badRequest().body(errorResponse);
    }

    /**
     * 处理业务异常
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException ex) {
        log.warn("业务异常: {}", ex.getMessage());

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.BAD_REQUEST.value())
            .error("Business Error")
            .message(ex.getMessage())
            .code(ex.getCode())
            .build();

        return ResponseEntity.badRequest().body(error);
    }

    /**
     * 处理未知异常
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception ex) {
        log.error("系统异常", ex);

        ErrorResponse error = ErrorResponse.builder()
            .timestamp(LocalDateTime.now())
            .status(HttpStatus.INTERNAL_SERVER_ERROR.value())
            .error("Internal Server Error")
            .message("系统繁忙，请稍后重试")
            .build();

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(error);
    }
}

/**
 * 错误响应记录
 */
@Builder
public record ErrorResponse(
    LocalDateTime timestamp,
    int status,
    String error,
    String message,
    String code,
    List<String> errors
) {
    public ErrorResponse {
        errors = errors != null ? errors : Collections.emptyList();
    }
}
```

## Best Practices

### 1. 使用 Stream API 处理集合

```java
/**
 * 获取活跃用户的邮箱列表
 */
public List<String> getActiveUserEmails() {
    return userRepository.findAll().stream()
        .filter(user -> user.getStatus() == UserStatus.ACTIVE)
        .filter(user -> !user.getDeleted())
        .map(User::getEmail)
        .filter(Objects::nonNull)
        .distinct()
        .toList();
}

/**
 * 按状态分组统计
 */
public Map<UserStatus, Long> countByStatus() {
    return userRepository.findAll().stream()
        .collect(Collectors.groupingBy(
            User::getStatus,
            Collectors.counting()
        ));
}

/**
 * 转换为Map
 */
public Map<Long, String> getUserIdNameMap() {
    return userRepository.findAll().stream()
        .collect(Collectors.toMap(
            User::getId,
            User::getName,
            (existing, replacement) -> existing
        ));
}
```

### 2. 使用 Builder 模式构建复杂对象

```java
/**
 * 订单建造者扩展
 */
@Builder
public record Order(
    Long id,
    String orderNo,
    Long userId,
    List<OrderItem> items,
    BigDecimal totalAmount,
    OrderStatus status
) {
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
                .map(OrderItem::getSubtotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
            return this;
        }
    }
}

// 使用示例
Order order = Order.builder()
    .orderNo("ORD-001")
    .userId(1L)
    .addItem(item1)
    .addItem(item2)
    .calculateTotal()
    .status(OrderStatus.PENDING)
    .build();
```

### 3. 使用策略模式处理多类型业务

```java
/**
 * 支付处理器接口
 */
public interface PaymentProcessor {
    /**
     * 处理支付
     *
     * @param request 支付请求
     * @return 支付结果
     */
    PaymentResult process(PaymentRequest request);

    /**
     * 获取支付类型
     */
    PaymentType getType();
}

/**
 * 支付宝支付处理器
 */
@Component
public class AlipayProcessor implements PaymentProcessor {

    @Override
    public PaymentResult process(PaymentRequest request) {
        // 支付宝支付逻辑
        return PaymentResult.success("ALI-" + request.getOrderId());
    }

    @Override
    public PaymentType getType() {
        return PaymentType.ALIPAY;
    }
}

/**
 * 微信支付处理器
 */
@Component
public class WechatPayProcessor implements PaymentProcessor {

    @Override
    public PaymentResult process(PaymentRequest request) {
        // 微信支付逻辑
        return PaymentResult.success("WX-" + request.getOrderId());
    }

    @Override
    public PaymentType getType() {
        return PaymentType.WECHAT;
    }
}

/**
 * 支付处理器工厂
 */
@Component
@RequiredArgsConstructor
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
     * 获取支付处理器
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
```

### 4. 使用事件驱动解耦

```java
/**
 * 用户创建事件
 */
public record UserCreatedEvent(Long userId, String email, LocalDateTime createdAt) {}

/**
 * 用户事件监听器
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class UserEventListener {

    private final EmailService emailService;
    private final NotificationService notificationService;

    /**
     * 同步监听用户创建事件
     */
    @EventListener
    public void onUserCreated(UserCreatedEvent event) {
        log.info("用户创建事件: {}", event.userId());
    }

    /**
     * 异步发送欢迎邮件
     */
    @EventListener
    @Async
    public void sendWelcomeEmail(UserCreatedEvent event) {
        emailService.sendWelcomeEmail(event.email());
    }

    /**
     * 事务提交后执行
     */
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void afterUserCreated(UserCreatedEvent event) {
        notificationService.notifyAdmin("新用户注册: " + event.email());
    }
}
```

## Virtual Threads (Java 21+)

### 虚拟线程基础

```java
/**
 * 虚拟线程服务
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
     * 结构化并发处理
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

    private UserDetail fetchUserDetail(Long userId) {
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
```

## Anti-Patterns to Avoid

```java
/**
 * 错误示例：N+1 查询问题
 */
// Bad: 每个订单都会额外查询用户
List<Order> orders = orderRepository.findAll();
for (Order order : orders) {
    String userName = order.getUser().getName(); // 触发额外查询
}

// Good: 使用 JOIN FETCH 一次性加载
@Query("SELECT o FROM Order o JOIN FETCH o.user WHERE o.deleted = false")
List<Order> findAllWithUser();

/**
 * 错误示例：在循环中执行数据库操作
 */
// Bad: 循环中逐个保存
for (UserCreateRequest request : requests) {
    User user = mapper.toEntity(request);
    userRepository.save(user); // 每次都开启新事务
}

// Good: 批量保存
List<User> users = requests.stream()
    .map(mapper::toEntity)
    .toList();
userRepository.saveAll(users);

/**
 * 错误示例：忽略 Optional 的空值处理
 */
// Bad: 直接 get() 可能抛出异常
User user = userRepository.findById(id).get();

// Good: 使用 orElse 或 orElseThrow
User user = userRepository.findById(id)
    .orElseThrow(() -> new UserNotFoundException("用户不存在"));

/**
 * 错误示例：使用 @Autowired 字段注入
 */
// Bad: 字段注入
@Autowired
private UserRepository userRepository;

// Good: 构造器注入
@RequiredArgsConstructor
public class UserService {
    private final UserRepository userRepository;
}

/**
 * 错误示例：捕获异常后不处理
 */
// Bad: 吞掉异常
try {
    riskyOperation();
} catch (Exception e) {
    // 什么都不做
}

// Good: 至少记录日志
try {
    riskyOperation();
} catch (Exception e) {
    log.error("操作失败", e);
    throw new BusinessException("操作失败: " + e.getMessage(), e);
}
```

## Quick Reference

| 模式 | 用途 | 示例 |
|------|------|------|
| `@Entity` | JPA 实体 | `@Entity public class User` |
| `@Repository` | 数据访问层 | `@Repository interface UserRepo` |
| `@Service` | 服务层组件 | `@Service public class UserService` |
| `@Transactional` | 事务管理 | `@Transactional public void save()` |
| `@Cacheable` | 缓存结果 | `@Cacheable("users")` |
| `Optional` | 空值处理 | `Optional.ofNullable(value)` |
| `record` | 不可变数据类 | `record User(Long id, String name)` |
| `Stream` | 函数式处理 | `list.stream().filter().map()` |
| `var` | 类型推断 | `var user = userRepository.save(u)` |
| `@Builder` | 建造者模式 | `User.builder().name("test").build()` |
| `@EventListener` | 事件监听 | `@EventListener public void onEvent()` |
| `virtual threads` | 轻量线程 | `Executors.newVirtualThreadPerTaskExecutor()` |

## 项目结构参考

```
src/main/java/com/example/
├── application/              # 应用层
│   ├── dto/                  # 数据传输对象
│   │   ├── UserCreateRequest.java
│   │   └── UserResponse.java
│   ├── mapper/               # 对象映射器
│   │   └── UserMapper.java
│   └── service/              # 应用服务
│       ├── UserService.java
│       └── UserServiceImpl.java
├── domain/                   # 领域层
│   ├── entity/               # 实体
│   │   └── User.java
│   ├── repository/           # 仓储接口
│   │   └── UserRepository.java
│   └── event/                # 领域事件
│       └── UserCreatedEvent.java
├── infrastructure/           # 基础设施层
│   ├── config/               # 配置
│   │   └── SecurityConfig.java
│   └── exception/            # 异常处理
│       └── GlobalExceptionHandler.java
└── presentation/             # 表现层
    └── controller/           # 控制器
        └── UserController.java
```

**Remember**: Java 代码应遵循面向对象原则，优先使用不可变对象，合理使用设计模式，保持代码简洁可读。
