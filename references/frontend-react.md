# React 开发参考

> Reference for: fullstack-dev-skills
> Load when: React Hooks、状态管理、性能优化、Server Components

## React 19 核心特性

### Server Components

```typescript
/**
 * 服务端组件示例
 * @description 在服务端渲染，减少客户端 JS 体积
 */
async function UserProfile({ userId }: { userId: string }) {
  const user = await db.user.findUnique({ where: { id: userId } })
  
  return (
    <div>
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  )
}
```

### use() Hook

```typescript
import { use } from 'react'

/**
 * use Hook 示例
 * @description 用于读取 Promise 或 Context 的值
 */
function Comments({ commentsPromise }: { commentsPromise: Promise<Comment[]> }) {
  const comments = use(commentsPromise)
  
  return comments.map(comment => (
    <div key={comment.id}>{comment.content}</div>
  ))
}
```

## Hooks 最佳实践

### 自定义 Hook

```typescript
/**
 * 使用本地存储的 Hook
 * @param key 存储键名
 * @param initialValue 初始值
 * @returns 当前值和设置函数
 */
function useLocalStorage<T>(
  key: string, 
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch {
      return initialValue
    }
  })

  const setValue = (value: T | ((prev: T) => T)) => {
    const valueToStore = value instanceof Function ? value(storedValue) : value
    setStoredValue(valueToStore)
    window.localStorage.setItem(key, JSON.stringify(valueToStore))
  }

  return [storedValue, setValue]
}
```

### useReducer 复杂状态

```typescript
interface State {
  count: number
  history: number[]
}

type Action = 
  | { type: 'increment' }
  | { type: 'decrement' }
  | { type: 'reset'; payload: number }

/**
 * Reducer 函数
 * @param state 当前状态
 * @param action 动作对象
 * @returns 新状态
 */
function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'increment':
      return { 
        count: state.count + 1, 
        history: [...state.history, state.count + 1] 
      }
    case 'decrement':
      return { 
        count: state.count - 1, 
        history: [...state.history, state.count - 1] 
      }
    case 'reset':
      return { count: action.payload, history: [action.payload] }
    default:
      return state
  }
}
```

## 性能优化

### memo 和 useMemo

```typescript
import { memo, useMemo } from 'react'

/**
 * 使用 memo 优化组件重渲染
 */
const ExpensiveComponent = memo(({ data }: { data: Item[] }) => {
  const processedData = useMemo(() => {
    return data.map(item => transformItem(item))
  }, [data])

  return <List items={processedData} />
})
```

### useCallback

```typescript
/**
 * 使用 useCallback 缓存回调函数
 * @param items 数据列表
 * @returns 组件
 */
function ParentComponent({ items }: { items: Item[] }) {
  const [selected, setSelected] = useState<string[]>([])

  const handleSelect = useCallback((id: string) => {
    setSelected(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }, [])

  return items.map(item => (
    <Item 
      key={item.id} 
      item={item} 
      onSelect={handleSelect}
      isSelected={selected.includes(item.id)}
    />
  ))
}
```

## 状态管理

### Zustand

```typescript
import { create } from 'zustand'

interface UserStore {
  user: User | null
  token: string
  login: (credentials: Credentials) => Promise<void>
  logout: () => void
}

/**
 * 用户状态管理 Store
 */
const useUserStore = create<UserStore>((set) => ({
  user: null,
  token: '',
  
  login: async (credentials) => {
    const { user, token } = await authApi.login(credentials)
    set({ user, token })
  },
  
  logout: () => set({ user: null, token: '' })
}))
```

## 错误边界

```typescript
import { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

/**
 * 错误边界组件
 * @description 捕获子组件树中的 JavaScript 错误
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong</div>
    }
    return this.props.children
  }
}
```

## Quick Reference

| 模式 | 用途 | 示例 |
|------|------|------|
| useState | 简单状态 | `const [count, setCount] = useState(0)` |
| useReducer | 复杂状态 | `const [state, dispatch] = useReducer(reducer, init)` |
| useEffect | 副作用 | `useEffect(() => { ... }, [deps])` |
| useMemo | 计算缓存 | `const value = useMemo(() => compute(), [deps])` |
| useCallback | 函数缓存 | `const fn = useCallback(() => {}, [deps])` |
| useRef | DOM 引用 | `const ref = useRef<HTMLInputElement>(null)` |
| useContext | 跨组件共享 | `const value = useContext(MyContext)` |
