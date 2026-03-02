# Vue 3 最佳实践参考

## Composition API 核心模式

### 响应式系统

```typescript
import { ref, reactive, computed, watch, watchEffect } from 'vue'

const count = ref(0)
const state = reactive({
  user: { name: '', email: '' },
  items: []
})

const doubled = computed(() => count.value * 2)

watch(count, (newVal, oldVal) => {
  console.log(`count changed: ${oldVal} -> ${newVal}`)
})

watchEffect(() => {
  console.log(`count is ${count.value}`)
})
```

### 组件设计原则

1. **单一职责**: 每个组件只做一件事
2. **Props Down, Events Up**: 数据向下，事件向上
3. **插槽优先**: 使用插槽提供灵活性
4. **组合式函数**: 提取可复用逻辑

### 组合式函数 (Composables)

```typescript
import { ref, onMounted, onUnmounted } from 'vue'

function useMousePosition() {
  const x = ref(0)
  const y = ref(0)

  function update(e: MouseEvent) {
    x.value = e.pageX
    y.value = e.pageY
  }

  onMounted(() => window.addEventListener('mousemove', update))
  onUnmounted(() => window.removeEventListener('mousemove', update))

  return { x, y }
}
```

## 性能优化

### 1. 懒加载组件

```typescript
const AsyncComponent = defineAsyncComponent(() =>
  import('./components/HeavyComponent.vue')
)
```

### 2. 虚拟列表

```vue
<template>
  <RecycleScroller
    :items="items"
    :item-size="50"
    key-field="id"
  >
    <template #default="{ item }">
      <ItemCard :item="item" />
    </template>
  </RecycleScroller>
</template>
```

### 3. 响应式优化

```typescript
import { shallowRef, shallowReactive, markRaw } from 'vue'

const largeData = shallowRef(largeArray)
const state = shallowReactive({ nested: { deep: 'value' } })
const staticData = markRaw(immutableObject)
```

### 4. 计算属性缓存

```typescript
const expensiveValue = computed(() => {
  return heavyCalculation(props.data)
})
```

## 状态管理

### Pinia 最佳实践

```typescript
import { defineStore } from 'pinia'

export const useUserStore = defineStore('user', {
  state: () => ({
    user: null as User | null,
    token: ''
  }),
  
  getters: {
    isLoggedIn: (state) => !!state.token,
    userName: (state) => state.user?.name ?? 'Guest'
  },
  
  actions: {
    async login(credentials: Credentials) {
      const { user, token } = await authApi.login(credentials)
      this.user = user
      this.token = token
    },
    
    logout() {
      this.user = null
      this.token = ''
    }
  }
})
```

## 组件通信模式

### 1. Props + Emits

```vue
<script setup lang="ts">
interface Props {
  modelValue: string
}

const props = defineProps<Props>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>
```

### 2. Provide/Inject

```typescript
import { provide, inject, type InjectionKey } from 'vue'

const ThemeKey: InjectionKey<Theme> = Symbol('theme')

provide(ThemeKey, theme)
const theme = inject(ThemeKey)
```

### 3. 事件总线 (mitt)

```typescript
import mitt from 'mitt'
const emitter = mitt()

emitter.emit('event', { data: 'value' })
emitter.on('event', (e) => console.log(e))
```

## 错误处理

### 全局错误处理

```typescript
app.config.errorHandler = (err, instance, info) => {
  console.error('Global error:', err)
  reportError(err)
}
```

### 组件级错误边界

```vue
<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const error = ref<Error | null>(null)

onErrorCaptured((e) => {
  error.value = e
  return false
})
</script>
```

## TypeScript 集成

### 类型化 Props

```typescript
interface Props {
  id: number
  title: string
  items?: Item[]
  onUpdate?: (id: number) => void
}

const props = withDefaults(defineProps<Props>(), {
  items: () => [],
  onUpdate: undefined
})
```

### 类型化 Emits

```typescript
const emit = defineEmits<{
  change: [id: number]
  update: [value: string]
}>()
```

## 测试策略

### Vitest 单元测试

```typescript
import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test' }
    })
    expect(wrapper.text()).toContain('Test')
  })
})
```
