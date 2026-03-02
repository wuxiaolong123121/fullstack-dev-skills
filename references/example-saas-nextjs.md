# SaaS Next.js 示例 (SaaS Next.js Example)

## 概述

本文档提供一个完整的 SaaS 应用配置示例，使用 Next.js + Supabase + Stripe 技术栈。

## 技术栈

| 类别 | 技术 | 版本 |
|-----|------|------|
| 框架 | Next.js | 14.x |
| 语言 | TypeScript | 5.x |
| 样式 | Tailwind CSS | 3.x |
| 数据库 | PostgreSQL (Supabase) | - |
| ORM | Prisma | 5.x |
| 认证 | NextAuth.js | 4.x |
| 支付 | Stripe | - |
| 部署 | Vercel | - |

## 项目结构

```
saas-app/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── settings/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts
│   │   │   ├── webhooks/
│   │   │   │   └── stripe/
│   │   │   │       └── route.ts
│   │   │   └── trpc/
│   │   │       └── [trpc]/
│   │   │           └── route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   └── card.tsx
│   │   ├── features/
│   │   │   ├── auth/
│   │   │   │   └── login-form.tsx
│   │   │   └── dashboard/
│   │   │       └── stats-card.tsx
│   │   └── layout/
│   │       ├── header.tsx
│   │       ├── sidebar.tsx
│   │       └── footer.tsx
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── stripe.ts
│   │   └── utils.ts
│   ├── hooks/
│   │   ├── use-user.ts
│   │   └── use-subscription.ts
│   └── types/
│       └── index.ts
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
│   └── ...
├── .env.local
├── .env.example
├── next.config.js
├── tailwind.config.js
├── tsconfig.json
└── package.json
```

## CLAUDE.md 配置

```markdown
# SaaS Dashboard 应用

## 项目概述

B2B SaaS 仪表板应用，提供团队协作和数据分析功能。

## 技术栈

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Prisma + PostgreSQL (Supabase)
- NextAuth.js
- Stripe
- tRPC

## 代码规范

### 组件结构
```tsx
// 组件导入
import { useState } from 'react'

// 类型定义
interface Props {
  title: string
  onSubmit: () => void
}

// 组件实现
export function MyComponent({ title, onSubmit }: Props) {
  // Hooks
  const [value, setValue] = useState('')
  
  // 事件处理
  const handleClick = () => {
    onSubmit()
  }
  
  // 渲染
  return (
    <div>
      <h1>{title}</h1>
      <button onClick={handleClick}>提交</button>
    </div>
  )
}
```

### API 路由
```ts
// 使用 NextAuth 保护路由
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  // 处理请求
}
```

## 常用命令

```bash
# 开发
npm run dev

# 数据库
npx prisma migrate dev --name description
npx prisma studio

# 测试
npm run test
npm run test:e2e

# 构建
npm run build
```

## 环境变量

必需的环境变量:
- DATABASE_URL
- NEXTAUTH_SECRET
- NEXTAUTH_URL
- STRIPE_SECRET_KEY
- STRIPE_WEBHOOK_SECRET
- NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

## 认证流程

1. 用户访问受保护页面
2. 检查 session
3. 无 session 重定向到登录页
4. 登录成功创建 session
5. 重定向回原页面

## 支付流程

1. 用户选择订阅计划
2. 创建 Stripe Checkout Session
3. 重定向到 Stripe 支付页面
4. 支付成功触发 webhook
5. 更新用户订阅状态
```

## 数据库 Schema

### prisma/schema.prisma

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  password      String?
  
  accounts      Account[]
  sessions      Session[]
  subscriptions Subscription[]
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model Subscription {
  id                   String   @id @default(cuid())
  userId               String
  stripeCustomerId     String?  @unique
  stripeSubscriptionId String?  @unique
  stripePriceId        String?
  stripeCurrentPeriodEnd DateTime?
  status               String   @default("inactive")
  
  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

## 认证配置

### src/lib/auth.ts

```typescript
import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }
        
        const user = await prisma.user.findUnique({
          where: { email: credentials.email }
        })
        
        if (!user || !user.password) {
          return null
        }
        
        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password
        )
        
        if (!passwordMatch) {
          return null
        }
        
        return {
          id: user.id,
          email: user.email,
          name: user.name
        }
      }
    })
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login'
  }
}
```

## Stripe 集成

### src/lib/stripe.ts

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
})

export const PLANS = {
  basic: {
    name: 'Basic',
    price: 9.99,
    priceId: 'price_basic_monthly'
  },
  pro: {
    name: 'Pro',
    price: 29.99,
    priceId: 'price_pro_monthly'
  },
  enterprise: {
    name: 'Enterprise',
    price: 99.99,
    priceId: 'price_enterprise_monthly'
  }
}

export async function createCheckoutSession(
  userId: string,
  priceId: string
) {
  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1
      }
    ],
    success_url: `${process.env.NEXTAUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.NEXTAUTH_URL}/pricing?canceled=true`,
    metadata: {
      userId
    }
  })
  
  return session
}
```

### Webhook 处理

```typescript
// src/app/api/webhooks/stripe/route.ts
import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { prisma } from '@/lib/prisma'
import { stripe } from '@/lib/stripe'

export async function POST(request: Request) {
  const body = await request.text()
  const signature = headers().get('stripe-signature')!
  
  let event: Stripe.Event
  
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (error) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }
  
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    
    await prisma.subscription.update({
      where: { userId: session.metadata!.userId },
      data: {
        stripeSubscriptionId: session.subscription as string,
        stripeCustomerId: session.customer as string,
        status: 'active'
      }
    })
  }
  
  return NextResponse.json({ received: true })
}
```

## 部署配置

### vercel.json

```json
{
  "framework": "nextjs",
  "regions": ["sin1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "STRIPE_SECRET_KEY": "@stripe_secret_key"
  }
}
```

## 相关参考

- [项目级配置示例](./example-project-config.md)
- [MCP 服务器配置](./mcp-servers-config.md)
- [Django API 示例](./example-django-api.md)
