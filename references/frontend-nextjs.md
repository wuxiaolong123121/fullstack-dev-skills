# Next.js 开发参考

> Reference for: fullstack-dev-skills
> Load when: App Router、Server Components、SSR、Server Actions

## App Router 架构

### 目录结构

```
app/
├── layout.tsx          # 根布局
├── page.tsx            # 首页
├── loading.tsx         # 加载状态
├── error.tsx           # 错误处理
├── not-found.tsx       # 404 页面
├── (auth)/             # 路由组
│   ├── login/
│   │   └── page.tsx
│   └── register/
│       └── page.tsx
├── dashboard/
│   ├── layout.tsx      # 嵌套布局
│   └── page.tsx
└── api/
    └── users/
        └── route.ts    # API 路由
```

### Server Components

```typescript
/**
 * 服务端组件
 * @description 默认为服务端组件，可直接访问数据库
 */
async function ProductList() {
  const products = await db.product.findMany()
  
  return (
    <ul>
      {products.map(product => (
        <li key={product.id}>{product.name}</li>
      ))}
    </ul>
  )
}
```

### Client Components

```typescript
'use client'

import { useState } from 'react'

/**
 * 客户端组件
 * @description 需要 'use client' 指令
 */
function Counter() {
  const [count, setCount] = useState(0)
  
  return (
    <button onClick={() => setCount(count + 1)}>
      Count: {count}
    </button>
  )
}
```

## Server Actions

```typescript
'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

/**
 * 创建用户 Server Action
 * @param formData 表单数据
 */
async function createUser(formData: FormData) {
  const name = formData.get('name') as string
  const email = formData.get('email') as string
  
  await db.user.create({
    data: { name, email }
  })
  
  revalidatePath('/users')
  redirect('/users')
}

/**
 * 删除用户 Server Action
 * @param userId 用户 ID
 */
async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } })
  revalidatePath('/users')
}
```

### 表单集成

```typescript
/**
 * 使用 Server Action 的表单
 */
function CreateUserForm() {
  return (
    <form action={createUser}>
      <input name="name" type="text" required />
      <input name="email" type="email" required />
      <button type="submit">Create User</button>
    </form>
  )
}
```

## 数据获取

### 服务端获取

```typescript
/**
 * 页面级数据获取
 * @description 在服务端执行，支持直接数据库访问
 */
async function DashboardPage() {
  const [users, stats] = await Promise.all([
    db.user.findMany(),
    db.stats.findFirst()
  ])
  
  return (
    <div>
      <UserList users={users} />
      <StatsWidget stats={stats} />
    </div>
  )
}
```

### 客户端获取 (SWR)

```typescript
import useSWR from 'swr'

/**
 * 使用 SWR 进行客户端数据获取
 * @param key 数据键
 * @returns 数据和状态
 */
function useUser(id: string) {
  const { data, error, isLoading } = useSWR(
    `/api/users/${id}`,
    fetcher
  )
  
  return {
    user: data,
    isLoading,
    isError: error
  }
}
```

## 路由处理

### 动态路由

```typescript
/**
 * 动态路由页面
 * @description params 包含动态参数
 */
async function UserPage({ params }: { params: { id: string } }) {
  const user = await db.user.findUnique({
    where: { id: params.id }
  })
  
  if (!user) {
    notFound()
  }
  
  return <UserProfile user={user} />
}
```

### API 路由

```typescript
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET 处理器
 * @param request 请求对象
 */
export async function GET(request: NextRequest) {
  const users = await db.user.findMany()
  return NextResponse.json({ users })
}

/**
 * POST 处理器
 * @param request 请求对象
 */
export async function POST(request: NextRequest) {
  const body = await request.json()
  const user = await db.user.create({ data: body })
  return NextResponse.json(user, { status: 201 })
}
```

## 中间件

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * 认证中间件
 * @param request 请求对象
 */
export function middleware(request: NextRequest) {
  const token = request.cookies.get('token')
  
  if (!token && request.nextUrl.pathname.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/dashboard/:path*'
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| layout.tsx | 共享布局 | 嵌套布局、导航栏 |
| loading.tsx | 加载状态 | Suspense 边界 |
| error.tsx | 错误处理 | 错误边界 |
| not-found.tsx | 404 页面 | 自定义 404 |
| route.ts | API 路由 | RESTful API |
| Server Actions | 表单处理 | 数据变更 |
| revalidatePath | 缓存刷新 | 增量静态再生 |
| redirect | 重定向 | 导航控制 |
