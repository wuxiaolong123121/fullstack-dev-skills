# Kotlin Specialist 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Android 开发、Kotlin 协程、Flow、Jetpack Compose

## 核心特性

### 协程 (Coroutines)

```kotlin
import kotlinx.coroutines.*
import kotlinx.coroutines.flow.*

/**
 * @brief 用户仓库类，演示协程使用
 */
class UserRepository {
    private val scope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    
    /**
     * @brief 获取用户信息
     * @param userId 用户ID
     * @return 用户对象或null
     */
    suspend fun fetchUser(userId: String): User? = withContext(Dispatchers.IO) {
        // 模拟网络请求
        delay(1000)
        User(id = userId, name = "John Doe")
    }
    
    /**
     * @brief 并行获取多个用户
     * @param userIds 用户ID列表
     * @return 用户列表
     */
    suspend fun fetchUsers(userIds: List<String>): List<User> = coroutineScope {
        userIds.map { id ->
            async { fetchUser(id) }
        }.awaitAll().filterNotNull()
    }
    
    /**
     * @brief 取消所有正在进行的任务
     */
    fun cancelAll() {
        scope.cancel()
    }
}

/**
 * @brief 用户数据类
 */
data class User(
    val id: String,
    val name: String
)
```

### Flow 响应式流

```kotlin
import kotlinx.coroutines.flow.*

/**
 * @brief 搜索视图模型，使用 Flow 处理搜索
 */
class SearchViewModel {
    private val _searchQuery = MutableStateFlow("")
    val searchQuery: StateFlow<String> = _searchQuery
    
    /**
     * @brief 搜索结果流
     * @discussion 使用 debounce 减少请求频率
     */
    val searchResults: Flow<List<String>> = searchQuery
        .debounce(300)
        .distinctUntilChanged()
        .mapLatest { query ->
            if (query.isBlank()) {
                emptyList()
            } else {
                performSearch(query)
            }
        }
        .catch { e ->
            emit(emptyList())
        }
    
    /**
     * @brief 更新搜索关键词
     * @param query 新的搜索词
     */
    fun updateQuery(query: String) {
        _searchQuery.value = query
    }
    
    /**
     * @brief 执行搜索
     * @param query 搜索关键词
     * @return 搜索结果列表
     */
    private fun performSearch(query: String): List<String> {
        return listOf("结果1: $query", "结果2: $query")
    }
}

/**
 * @brief 倒计时 Flow 示例
 * @param start 起始值
 * @return 倒计时 Flow
 */
fun countdown(start: Int): Flow<Int> = flow {
    for (i in start downTo 0) {
        emit(i)
        delay(1000)
    }
}
```

### Jetpack Compose UI

```kotlin
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle

/**
 * @brief 用户列表屏幕
 * @discussion 展示 Jetpack Compose 声明式 UI
 */
@Composable
fun UserListScreen(
    viewModel: UserViewModel = viewModel()
) {
    val users by viewModel.users.collectAsStateWithLifecycle()
    val isLoading by viewModel.isLoading.collectAsStateWithLifecycle()
    
    Column(modifier = Modifier.fillMaxSize()) {
        TopAppBar(title = { Text("用户列表") })
        
        when {
            isLoading -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    CircularProgressIndicator()
                }
            }
            users.isEmpty() -> {
                Box(
                    modifier = Modifier.fillMaxSize(),
                    contentAlignment = androidx.compose.ui.Alignment.Center
                ) {
                    Text("暂无数据")
                }
            }
            else -> {
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(16.dp)
                ) {
                    items(users) { user ->
                        UserItem(user = user)
                    }
                }
            }
        }
    }
}

/**
 * @brief 用户列表项组件
 * @param user 用户数据
 */
@Composable
fun UserItem(user: User) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp)
    ) {
        Column(modifier = Modifier.padding(16.dp)) {
            Text(
                text = user.name,
                style = MaterialTheme.typography.titleMedium
            )
            Text(
                text = user.id,
                style = MaterialTheme.typography.bodySmall
            )
        }
    }
}

/**
 * @brief 用户视图模型
 */
class UserViewModel : androidx.lifecycle.ViewModel() {
    private val _users = MutableStateFlow<List<User>>(emptyList())
    val users: StateFlow<List<User>> = _users
    
    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading
    
    init {
        loadUsers()
    }
    
    /**
     * @brief 加载用户列表
     */
    fun loadUsers() {
        viewModelScope.launch {
            _isLoading.value = true
            _users.value = listOf(
                User("1", "张三"),
                User("2", "李四")
            )
            _isLoading.value = false
        }
    }
}
```

### 扩展函数

```kotlin
/**
 * @brief String 扩展函数：判断是否为有效邮箱
 * @return 是否为有效邮箱格式
 */
fun String.isValidEmail(): Boolean {
    return this.matches(Regex("^[A-Za-z0-9+_.-]+@[A-Za-z0-9.-]+$"))
}

/**
 * @brief List 扩展函数：安全获取元素
 * @param index 索引
 * @return 元素或null
 */
fun <T> List<T>.getOrNull(index: Int): T? {
    return if (index in indices) this[index] else null
}

/**
 * @brief Context 扩展函数：显示 Toast
 * @param message 消息内容
 */
fun android.content.Context.showToast(message: String) {
    android.widget.Toast.makeText(this, message, android.widget.Toast.LENGTH_SHORT).show()
}

/**
 * @brief 扩展属性：计算列表是否为空
 */
val <T> List<T>.isNotEmpty: Boolean
    get() = this.isNotEmpty()
```

### 密封类 (Sealed Class)

```kotlin
/**
 * @brief UI 状态密封类
 * @discussion 用于表示不同加载状态
 */
sealed class UiState<out T> {
    /**
     * @brief 初始状态
     */
    object Initial : UiState<Nothing>()
    
    /**
     * @brief 加载中状态
     */
    object Loading : UiState<Nothing>()
    
    /**
     * @brief 成功状态
     * @param data 成功数据
     */
    data class Success<T>(val data: T) : UiState<T>()
    
    /**
     * @brief 错误状态
     * @param message 错误信息
     */
    data class Error(val message: String) : UiState<Nothing>()
}

/**
 * @brief 处理 UI 状态
 * @param state UI 状态
 */
fun handleState(state: UiState<String>) {
    when (state) {
        is UiState.Initial -> println("初始化")
        is UiState.Loading -> println("加载中")
        is UiState.Success -> println("成功: ${state.data}")
        is UiState.Error -> println("错误: ${state.message}")
    }
}
```

## 最佳实践

### 1. 使用 viewModelScope 管理协程

```kotlin
class MyViewModel : ViewModel() {
    fun loadData() {
        viewModelScope.launch {
            // 自动在 ViewModel 清除时取消
            val data = repository.fetchData()
            _data.value = data
        }
    }
}
```

### 2. 使用 StateFlow 替代 LiveData

```kotlin
class MyViewModel : ViewModel() {
    private val _state = MutableStateFlow(UiState.Initial)
    val state: StateFlow<UiState> = _state.asStateFlow()
}
```

### 3. 使用 by viewModels 委托

```kotlin
class MainActivity : ComponentActivity() {
    private val viewModel: MyViewModel by viewModels()
}
```

### 4. 使用 data class 表示不可变数据

```kotlin
/**
 * @brief 不可变用户数据类
 */
data class User(
    val id: String,
    val name: String,
    val email: String
) {
    /**
     * @brief 创建更新名称后的副本
     */
    fun withName(newName: String) = copy(name = newName)
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `suspend` | 挂起函数 | `suspend fun fetch()` |
| `launch` | 启动协程 | `scope.launch { }` |
| `async/await` | 并发执行 | `async { }.await()` |
| `Flow` | 响应式流 | `flow { emit(value) }` |
| `StateFlow` | 状态流 | `MutableStateFlow(0)` |
| `@Composable` | 组合函数 | `@Composable fun View()` |
| `remember` | 记住状态 | `remember { mutableStateOf(0) }` |
| `LaunchedEffect` | 副作用 | `LaunchedEffect(key) { }` |
| `sealed class` | 密封类 | `sealed class State` |
| `data class` | 数据类 | `data class User(val id: String)` |
| `by` | 属性委托 | `by viewModels()` |
