# Flutter 参考

> Reference for: fullstack-dev-skills
> Load when: 用户提及 Flutter、Dart、Riverpod、Freezed、代码生成、Widget 最佳实践、状态管理

## 核心特性

### Riverpod 状态管理

Flutter 推荐的响应式状态管理方案，支持编译时安全。

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

part 'user_provider.g.dart';

/// 用户数据模型
/// @description 使用 Freezed 生成的不可变类
@freezed
class User with _$User {
  const factory User({
    required String id,
    required String name,
    required String email,
    String? avatarUrl,
    @Default(false) bool isActive,
  }) = _User;

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
}

/// 用户仓库接口
/// @description 抽象用户数据访问
abstract class UserRepository {
  Future<User> getUser(String id);
  Future<void> updateUser(User user);
  Stream<User> watchUser(String id);
}

/// 用户仓库提供者
/// @description 注入用户仓库实现
@riverpod
UserRepository userRepository(Ref ref) {
  return ApiUserRepository(ref.watch(apiClientProvider));
}

/// 用户状态提供者
/// @description 管理单个用户的状态
@riverpod
class UserNotifier extends _$UserNotifier {
  @override
  Future<User> build(String userId) async {
    /// 初始化时加载用户数据
    return ref.watch(userRepositoryProvider).getUser(userId);
  }

  /// 更新用户信息
  /// @param updates - 部分用户数据
  Future<void> updateUser(Map<String, dynamic> updates) async {
    final current = state.valueOrNull;
    if (current == null) return;

    state = const AsyncValue.loading();
    
    state = await AsyncValue.guard(() async {
      final updated = current.copyWith(
        name: updates['name'] ?? current.name,
        email: updates['email'] ?? current.email,
      );
      await ref.read(userRepositoryProvider).updateUser(updated);
      return updated;
    });
  }

  /// 刷新用户数据
  Future<void> refresh() async {
    ref.invalidateSelf();
    await future;
  }
}

/// 用户列表提供者
/// @description 获取所有用户列表
@riverpod
Future<List<User>> userList(Ref ref) async {
  final repository = ref.watch(userRepositoryProvider);
  return repository.getAllUsers();
}
```

### Freezed 数据模型

```dart
import 'package:freezed_annotation/freezed_annotation.dart';

part 'task.freezed.dart';
part 'task.g.dart';

/// 任务优先级枚举
/// @description 定义任务优先级级别
enum TaskPriority {
  @JsonValue('low')
  low,
  @JsonValue('medium')
  medium,
  @JsonValue('high')
  high,
}

/// 任务状态枚举
/// @description 定义任务生命周期状态
enum TaskStatus {
  @JsonValue('pending')
  pending,
  @JsonValue('in_progress')
  inProgress,
  @JsonValue('completed')
  completed,
  @JsonValue('cancelled')
  cancelled,
}

/// 任务数据模型
/// @description 不可变任务实体，支持 JSON 序列化
@freezed
class Task with _$Task {
  const Task._();

  const factory Task({
    /// 任务唯一标识
    required String id,
    
    /// 任务标题
    required String title,
    
    /// 任务描述
    String? description,
    
    /// 任务状态
    @Default(TaskStatus.pending) TaskStatus status,
    
    /// 任务优先级
    @Default(TaskPriority.medium) TaskPriority priority,
    
    /// 截止日期
    DateTime? dueDate,
    
    /// 创建时间
    required DateTime createdAt,
    
    /// 更新时间
    DateTime? updatedAt,
    
    /// 标签列表
    @Default([]) List<String> tags,
    
    /// 子任务列表
    @Default([]) List<SubTask> subTasks,
  }) = _Task;

  factory Task.fromJson(Map<String, dynamic> json) => _$TaskFromJson(json);

  /// 计算任务完成进度
  /// @returns 完成百分比 (0.0 - 1.0)
  double get progress {
    if (subTasks.isEmpty) {
      return status == TaskStatus.completed ? 1.0 : 0.0;
    }
    final completed = subTasks.where((s) => s.isCompleted).length;
    return completed / subTasks.length;
  }

  /// 检查任务是否过期
  /// @returns 是否已过期
  bool get isOverdue {
    if (dueDate == null) return false;
    return DateTime.now().isAfter(dueDate!) && 
           status != TaskStatus.completed;
  }
}

/// 子任务数据模型
/// @description 任务内的子项
@freezed
class SubTask with _$SubTask {
  const factory SubTask({
    required String id,
    required String title,
    @Default(false) bool isCompleted,
  }) = _SubTask;

  factory SubTask.fromJson(Map<String, dynamic> json) => _$SubTaskFromJson(json);
}
```

### Widget 最佳实践

```dart
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// 任务卡片组件
/// @description 展示单个任务信息的卡片
class TaskCard extends ConsumerWidget {
  /// 任务 ID
  final String taskId;

  const TaskCard({
    super.key,
    required this.taskId,
  });

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    /// 监听任务状态
    final taskAsync = ref.watch(taskNotifierProvider(taskId));

    return taskAsync.when(
      data: (task) => _TaskCardContent(
        task: task,
        onStatusChanged: (status) => _handleStatusChange(ref, task, status),
        onTap: () => _navigateToDetail(context, task),
      ),
      loading: () => const _LoadingCard(),
      error: (error, stack) => _ErrorCard(message: error.toString()),
    );
  }

  /// 处理状态变更
  /// @param ref - Widget 引用
  /// @param task - 任务对象
  /// @param status - 新状态
  void _handleStatusChange(WidgetRef ref, Task task, TaskStatus status) {
    ref.read(taskNotifierProvider(taskId).notifier).updateStatus(status);
  }

  /// 导航到详情页
  /// @param context - 构建上下文
  /// @param task - 任务对象
  void _navigateToDetail(BuildContext context, Task task) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (context) => TaskDetailPage(taskId: task.id),
      ),
    );
  }
}

/// 任务卡片内容组件
/// @description 私有组件，展示任务详细信息
class _TaskCardContent extends StatelessWidget {
  final Task task;
  final ValueChanged<TaskStatus> onStatusChanged;
  final VoidCallback onTap;

  const _TaskCardContent({
    required this.task,
    required this.onStatusChanged,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Card(
      elevation: task.isOverdue ? 4 : 1,
      color: task.isOverdue 
          ? colorScheme.errorContainer.withOpacity(0.3) 
          : null,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildHeader(context),
              const SizedBox(height: 8),
              _buildDescription(context),
              const SizedBox(height: 12),
              _buildProgress(context),
              const SizedBox(height: 12),
              _buildFooter(context),
            ],
          ),
        ),
      ),
    );
  }

  /// 构建头部
  Widget _buildHeader(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Text(
            task.title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  decoration: task.status == TaskStatus.completed
                      ? TextDecoration.lineThrough
                      : null,
                ),
          ),
        ),
        _PriorityBadge(priority: task.priority),
      ],
    );
  }

  /// 构建描述
  Widget _buildDescription(BuildContext context) {
    if (task.description == null || task.description!.isEmpty) {
      return const SizedBox.shrink();
    }

    return Text(
      task.description!,
      style: Theme.of(context).textTheme.bodySmall,
      maxLines: 2,
      overflow: TextOverflow.ellipsis,
    );
  }

  /// 构建进度条
  Widget _buildProgress(BuildContext context) {
    return LinearProgressIndicator(
      value: task.progress,
      backgroundColor: Theme.of(context).colorScheme.surfaceContainerHighest,
      borderRadius: BorderRadius.circular(4),
    );
  }

  /// 构建底部
  Widget _buildFooter(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        _StatusChip(
          status: task.status,
          onChanged: onStatusChanged,
        ),
        if (task.dueDate != null)
          _DueDateLabel(
            date: task.dueDate!,
            isOverdue: task.isOverdue,
          ),
      ],
    );
  }
}

/// 优先级徽章组件
/// @description 显示任务优先级标签
class _PriorityBadge extends StatelessWidget {
  final TaskPriority priority;

  const _PriorityBadge({required this.priority});

  @override
  Widget build(BuildContext context) {
    final (label, color) = switch (priority) {
      TaskPriority.low => ('低', Colors.green),
      TaskPriority.medium => ('中', Colors.orange),
      TaskPriority.high => ('高', Colors.red),
    };

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withOpacity(0.2),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Text(
        label,
        style: TextStyle(
          color: color,
          fontSize: 12,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
```

## 最佳实践

### 代码生成配置

```yaml
# pubspec.yaml
dependencies:
  flutter_riverpod: ^2.4.0
  riverpod_annotation: ^2.3.0
  freezed_annotation: ^2.4.0
  json_annotation: ^4.8.0

dev_dependencies:
  build_runner: ^2.4.0
  riverpod_generator: ^2.3.0
  freezed: ^2.4.0
  json_serializable: ^6.7.0
```

```bash
# 运行代码生成
dart run build_runner build --delete-conflicting-outputs

# 持续监听文件变化
dart run build_runner watch --delete-conflicting-outputs
```

### 组合式 Provider

```dart
/// 过滤后的任务列表提供者
/// @description 根据状态过滤任务
@riverpod
List<Task> filteredTasks(Ref ref, TaskStatus? status) {
  final allTasks = ref.watch(userTasksProvider);
  
  return allTasks.when(
    data: (tasks) {
      if (status == null) return tasks;
      return tasks.where((t) => t.status == status).toList();
    },
    loading: () => [],
    error: (_, __) => [],
  );
}

/// 搜索结果提供者
/// @description 根据关键词搜索任务
@riverpod
List<Task> searchResults(Ref ref, String query) {
  if (query.isEmpty) {
    return ref.watch(filteredTasksProvider(null));
  }
  
  final filtered = ref.watch(filteredTasksProvider(null));
  final lowerQuery = query.toLowerCase();
  
  return filtered.where((task) {
    return task.title.toLowerCase().contains(lowerQuery) ||
           (task.description?.toLowerCase().contains(lowerQuery) ?? false);
  }).toList();
}

/// 任务统计提供者
/// @description 计算任务统计数据
@riverpod
TaskStatistics taskStatistics(Ref ref) {
  final tasks = ref.watch(userTasksProvider).valueOrNull ?? [];
  
  return TaskStatistics(
    total: tasks.length,
    completed: tasks.where((t) => t.status == TaskStatus.completed).length,
    inProgress: tasks.where((t) => t.status == TaskStatus.inProgress).length,
    overdue: tasks.where((t) => t.isOverdue).length,
  );
}

/// 任务统计数据类
/// @description 任务统计结果
@freezed
class TaskStatistics with _$TaskStatistics {
  const factory TaskStatistics({
    required int total,
    required int completed,
    required int inProgress,
    required int overdue,
  }) = _TaskStatistics;
}
```

### 异步操作处理

```dart
/// 异步按钮组件
/// @description 处理异步操作的按钮
class AsyncButton extends StatefulWidget {
  final Future<void> Function() onPressed;
  final Widget child;
  final ButtonStyle? style;

  const AsyncButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.style,
  });

  @override
  State<AsyncButton> createState() => _AsyncButtonState();
}

class _AsyncButtonState extends State<AsyncButton> {
  bool _isLoading = false;

  /// 处理按钮点击
  Future<void> _handlePress() async {
    if (_isLoading) return;

    setState(() => _isLoading = true);
    
    try {
      await widget.onPressed();
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      style: widget.style,
      onPressed: _isLoading ? null : _handlePress,
      child: _isLoading
          ? const SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          : widget.child,
    );
  }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `@riverpod` | 生成 Provider | `@riverpod class MyNotifier extends _$MyNotifier` |
| `@freezed` | 不可变数据类 | `@freezed class User with _$User` |
| `AsyncValue` | 异步状态封装 | `AsyncValue.data(value)` / `AsyncValue.loading()` |
| `ref.watch` | 监听 Provider | `ref.watch(provider)` |
| `ref.read` | 读取 Provider | `ref.read(provider.notifier)` |
| `ref.listen` | 监听变化 | `ref.listen(provider, (prev, next) => ...)` |
| `ConsumerWidget` | 可监听 Widget | `class MyWidget extends ConsumerWidget` |
| `Consumer` | 局部重建 | `Consumer(builder: (context, ref, child) => ...)` |
| `ProviderScope` | Provider 作用域 | `ProviderScope(child: MyApp())` |
| `build_runner` | 代码生成工具 | `dart run build_runner build` |
| `copyWith` | 复制并修改 | `user.copyWith(name: 'New Name')` |
| `when` | 模式匹配 | `asyncValue.when(data: ..., loading: ..., error: ...)` |
| `switch` 表达式 | Dart 3 模式匹配 | `switch (value) { case A => ...; case B => ...; }` |
| `const` 构造器 | 编译时常量 | `const MyWidget()` |
| `const` 工厂 | Freezed 默认值 | `@Default(false) bool isActive` |
