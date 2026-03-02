# NestJS 开发参考

> Reference for: fullstack-dev-skills
> Load when: NestJS 模块、依赖注入、微服务、TypeScript 后端

## 模块架构

### 目录结构

```
src/
├── app.module.ts       # 根模块
├── main.ts             # 入口文件
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── users.repository.ts
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   └── entities/
│       └── user.entity.ts
└── common/
    ├── guards/
    ├── interceptors/
    ├── filters/
    └── decorators/
```

### 模块定义

```typescript
import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'

/**
 * 用户模块
 * @description 封装用户相关功能
 */
@Module({
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService]
})
export class UsersModule {}
```

## 控制器

```typescript
import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  ParseUUIDPipe 
} from '@nestjs/common'
import { UsersService } from './users.service'
import { CreateUserDto } from './dto/create-user.dto'

/**
 * 用户控制器
 * @description 处理用户相关 HTTP 请求
 */
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * 获取所有用户
   */
  @Get()
  findAll() {
    return this.usersService.findAll()
  }

  /**
   * 根据 ID 获取用户
   * @param id 用户 ID
   */
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id)
  }

  /**
   * 创建用户
   * @param createUserDto 创建用户 DTO
   */
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto)
  }
}
```

## 服务层

```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { UsersRepository } from './users.repository'
import { CreateUserDto } from './dto/create-user.dto'

/**
 * 用户服务
 * @description 业务逻辑层
 */
@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  /**
   * 获取所有用户
   * @returns 用户列表
   */
  findAll() {
    return this.usersRepository.findAll()
  }

  /**
   * 根据 ID 获取用户
   * @param id 用户 ID
   * @returns 用户对象
   */
  async findOne(id: string) {
    const user = await this.usersRepository.findById(id)
    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`)
    }
    return user
  }

  /**
   * 创建用户
   * @param dto 创建用户 DTO
   * @returns 创建的用户
   */
  create(dto: CreateUserDto) {
    return this.usersRepository.create(dto)
  }
}
```

## DTO 与验证

```typescript
import { IsString, IsEmail, MinLength, IsOptional } from 'class-validator'

/**
 * 创建用户 DTO
 * @description 定义创建用户的输入结构
 */
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  name: string

  @IsEmail()
  email: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsString()
  avatar?: string
}
```

## 守卫 (Guards)

```typescript
import { 
  Injectable, 
  CanActivate, 
  ExecutionContext,
  UnauthorizedException 
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'

/**
 * JWT 认证守卫
 * @description 验证请求中的 JWT Token
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const token = this.extractToken(request)
    
    if (!token) {
      throw new UnauthorizedException('Token not found')
    }
    
    try {
      const payload = this.jwtService.verify(token)
      request.user = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid token')
    }
  }

  private extractToken(request: Request): string | null {
    const authHeader = request.headers['authorization']
    if (!authHeader?.startsWith('Bearer ')) {
      return null
    }
    return authHeader.slice(7)
  }
}
```

## 拦截器 (Interceptors)

```typescript
import { 
  Injectable, 
  NestInterceptor, 
  ExecutionContext, 
  CallHandler 
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { map } from 'rxjs/operators'

/**
 * 响应格式化拦截器
 * @description 统一响应格式
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(
    context: ExecutionContext, 
    next: CallHandler
  ): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        code: 200,
        message: 'Success',
        data,
        timestamp: Date.now()
      }))
    )
  }
}

interface ApiResponse<T> {
  code: number
  message: string
  data: T
  timestamp: number
}
```

## 异常过滤器

```typescript
import { 
  ExceptionFilter, 
  Catch, 
  ArgumentsHost, 
  HttpException,
  HttpStatus 
} from '@nestjs/common'
import { Response } from 'express'

/**
 * 全局异常过滤器
 * @description 统一异常处理
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    
    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR
    
    const message = exception instanceof HttpException
      ? exception.message
      : 'Internal server error'
    
    response.status(status).json({
      code: status,
      message,
      timestamp: new Date().toISOString()
    })
  }
}
```

## Quick Reference

| 组件 | 用途 | 装饰器 |
|------|------|--------|
| Controller | 处理 HTTP 请求 | @Controller() |
| Service | 业务逻辑 | @Injectable() |
| Module | 模块定义 | @Module() |
| Guard | 认证授权 | @UseGuards() |
| Interceptor | 响应转换 | @UseInterceptors() |
| Pipe | 数据验证 | @UsePipes() |
| Filter | 异常处理 | @Catch() |
| Decorator | 自定义装饰器 | @SetMetadata() |
