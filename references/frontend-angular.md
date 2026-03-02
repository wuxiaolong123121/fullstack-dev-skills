# Angular 参考

> Reference for: fullstack-dev-skills
> Load when: 用户提及 Angular、Signals、RxJS、依赖注入、独立组件、Zone.js、Angular 17+

## 核心特性

### Angular Signals（响应式状态管理）

Angular 16+ 引入的细粒度响应式系统，替代 Zone.js 的变更检测。

```typescript
import { signal, computed, effect, Signal } from '@angular/core';

/**
 * 用户状态管理服务
 * @description 使用 Signals 管理用户认证状态
 */
@Injectable({ providedIn: 'root' })
export class UserStateService {
  /** 当前用户信号 */
  private readonly _currentUser = signal<User | null>(null);
  
  /** 只读用户信号 */
  readonly currentUser = this._currentUser.asReadonly();
  
  /** 计算属性：是否已登录 */
  readonly isLoggedIn = computed(() => this._currentUser() !== null);
  
  /** 计算属性：用户显示名称 */
  readonly displayName = computed(() => {
    const user = this._currentUser();
    return user ? `${user.firstName} ${user.lastName}` : '访客';
  });

  /**
   * 设置当前用户
   * @param user - 用户对象或 null
   */
  setUser(user: User | null): void {
    this._currentUser.set(user);
  }

  /**
   * 更新用户部分信息
   * @param updates - 部分用户数据
   */
  updateUser(updates: Partial<User>): void {
    this._currentUser.update(current => 
      current ? { ...current, ...updates } : null
    );
  }
}
```

### 独立组件（Standalone Components）

Angular 14+ 支持，无需 NgModule 的组件定义方式。

```typescript
import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * 用户列表组件
 * @description 独立组件，展示用户列表与操作
 */
@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    UserCardComponent,
    UserSearchPipe
  ],
  template: `
    <section class="user-list">
      <h2>用户管理</h2>
      
      @if (users(); as userList) {
        <ul>
          @for (user of userList; track user.id) {
            <li>
              <app-user-card [user]="user" />
            </li>
          } @empty {
            <p>暂无用户数据</p>
          }
        </ul>
      } @else {
        <p>加载中...</p>
      }
    </section>
  `,
  styles: [`
    .user-list { padding: 1rem; }
  `]
})
export class UserListComponent implements OnInit {
  /** 用户服务依赖注入 */
  private readonly userService = inject(UserService);
  
  /** 用户列表信号 */
  readonly users = this.userService.users;

  ngOnInit(): void {
    this.userService.loadUsers();
  }
}
```

### RxJS 操作符与模式

```typescript
import { Observable, Subject, BehaviorSubject, combineLatest, of } from 'rxjs';
import { 
  debounceTime, 
  distinctUntilChanged, 
  switchMap, 
  catchError,
  takeUntil,
  shareReplay 
} from 'rxjs/operators';

/**
 * 搜索服务
 * @description 使用 RxJS 实现防抖搜索
 */
@Injectable({ providedIn: 'root' })
export class SearchService {
  private readonly http = inject(HttpClient);
  
  /** 搜索词流 */
  private readonly searchTerms = new Subject<string>();
  
  /** 销毁信号 */
  private readonly destroy$ = new Subject<void>();

  /**
   * 搜索结果 Observable
   * @description 防抖 300ms，取消前序请求
   */
  readonly searchResults$: Observable<SearchResult[]> = this.searchTerms.pipe(
    debounceTime(300),
    distinctUntilChanged(),
    switchMap(term => this.fetchSearchResults(term)),
    catchError(error => {
      console.error('搜索失败:', error);
      return of([]);
    }),
    shareReplay(1)
  );

  /**
   * 触发搜索
   * @param term - 搜索关键词
   */
  search(term: string): void {
    this.searchTerms.next(term);
  }

  /**
   * 获取搜索结果
   * @param term - 搜索关键词
   * @returns 搜索结果 Observable
   */
  private fetchSearchResults(term: string): Observable<SearchResult[]> {
    if (!term.trim()) {
      return of([]);
    }
    return this.http.get<SearchResult[]>(`/api/search?q=${term}`);
  }
}
```

### 依赖注入（Dependency Injection）

```typescript
import { 
  Injectable, 
  InjectionToken, 
  inject, 
  Injectable 
} from '@angular/core';

/** 配置令牌 */
export const APP_CONFIG = new InjectionToken<AppConfig>('APP_CONFIG');

/**
 * 日志服务
 * @description 可配置的日志服务，支持多环境
 */
@Injectable({ providedIn: 'root' })
export class LoggerService {
  /** 应用配置 */
  private readonly config = inject(APP_CONFIG);
  
  /**
   * 记录信息日志
   * @param message - 日志消息
   * @param context - 上下文信息
   */
  log(message: string, context?: Record<string, unknown>): void {
    if (this.config.enableLogging) {
      console.log(`[${this.config.environment}] ${message}`, context ?? '');
    }
  }

  /**
   * 记录错误日志
   * @param error - 错误对象
   * @param message - 附加消息
   */
  error(error: Error, message?: string): void {
    console.error(`[${this.config.environment}] ${message ?? ''}`, error);
  }
}

/**
 * 数据仓库基类
 * @template T - 实体类型
 * @description 泛型依赖注入示例
 */
@Injectable()
export abstract class Repository<T extends { id: string }> {
  protected abstract readonly endpoint: string;
  protected readonly http = inject(HttpClient);
  protected readonly logger = inject(LoggerService);

  /**
   * 根据 ID 获取实体
   * @param id - 实体 ID
   * @returns 实体 Observable
   */
  getById(id: string): Observable<T> {
    this.logger.log(`获取实体: ${id}`);
    return this.http.get<T>(`${this.endpoint}/${id}`);
  }

  /**
   * 创建实体
   * @param entity - 实体数据
   * @returns 创建的实体 Observable
   */
  create(entity: Omit<T, 'id'>): Observable<T> {
    this.logger.log(`创建实体`, entity);
    return this.http.post<T>(this.endpoint, entity);
  }
}
```

## 最佳实践

### 新版控制流语法（Angular 17+）

```typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  template: `
    <!-- 条件渲染 -->
    @if (user(); as currentUser) {
      <welcome-message [user]="currentUser" />
    } @else if (isLoading()) {
      <loading-spinner />
    } @else {
      <login-prompt />
    }

    <!-- 循环渲染 -->
    @for (task of tasks(); track task.id; let i = $index, let e = $even) {
      <task-item 
        [task]="task" 
        [class.even]="e"
        [attr.data-index]="i" />
    } @empty {
      <empty-state message="暂无任务" />
    }

    <!-- Switch 语句 -->
    @switch (status()) {
      @case ('active') {
        <status-badge color="green">活跃</status-badge>
      }
      @case ('inactive') {
        <status-badge color="gray">未激活</status-badge>
      }
      @default {
        <status-badge color="blue">未知</status-badge>
      }
    }
  `
})
export class DashboardComponent {
  readonly user = signal<User | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly status = signal<'active' | 'inactive' | 'unknown'>('unknown');
  readonly isLoading = signal(false);
}
```

### Signal 输入与模型

```typescript
import { input, model, output } from '@angular/core';

/**
 * 任务卡片组件
 * @description 使用 Signal 输入/输出
 */
@Component({
  selector: 'app-task-card',
  standalone: true,
  template: `
    <div class="task-card">
      <h3>{{ title() }}</h3>
      <p>{{ description() }}</p>
      
      <button (click)="onComplete()">完成</button>
    </div>
  `
})
export class TaskCardComponent {
  /** 必填输入 */
  readonly title = input.required<string>();
  
  /** 可选输入（带默认值） */
  readonly description = input<string>('');
  
  /** 双向绑定模型 */
  readonly completed = model<boolean>(false);
  
  /** 输出事件 */
  readonly taskCompleted = output<Task>();

  /**
   * 处理完成操作
   */
  onComplete(): void {
    this.completed.set(true);
    this.taskCompleted.emit({
      title: this.title(),
      completed: true
    });
  }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `signal()` | 创建可变响应式状态 | `count = signal(0)` |
| `computed()` | 创建派生状态 | `double = computed(() => count() * 2)` |
| `effect()` | 副作用响应 | `effect(() => console.log(count()))` |
| `input()` | 组件输入属性 | `title = input<string>()` |
| `model()` | 双向绑定属性 | `value = model<string>()` |
| `output()` | 组件输出事件 | `changed = output<string>()` |
| `inject()` | 函数式依赖注入 | `service = inject(MyService)` |
| `@for` | 循环渲染 | `@for (item of items; track item.id)` |
| `@if` | 条件渲染 | `@if (condition) { ... }` |
| `@switch` | 多条件分支 | `@switch (value) { @case ... }` |
| `debounceTime` | 防抖操作符 | `.pipe(debounceTime(300))` |
| `switchMap` | 切换流 | `.pipe(switchMap(fn))` |
| `shareReplay` | 共享与缓存 | `.pipe(shareReplay(1))` |
