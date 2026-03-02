# TypeScript 参考

> Reference for: fullstack-dev-skills
> Load when: 编写 TypeScript 代码、类型定义、泛型编程、类型体操

## 核心特性

TypeScript 是 JavaScript 的超集，添加了静态类型系统。其强大的类型推断、泛型系统和工具类型使得大型项目开发更加安全和高效。

### 基础类型与类型推断

```typescript
/**
 * 基础类型定义示例
 */
type PrimitiveTypes = {
  string: string;
  number: number;
  boolean: boolean;
  null: null;
  undefined: undefined;
  symbol: symbol;
  bigint: bigint;
  void: void;
  never: never;
  unknown: unknown;
  any: any;
};

/**
 * 字面量类型
 */
type Status = 'pending' | 'active' | 'completed' | 'failed';
type Direction = 'up' | 'down' | 'left' | 'right';
type NumericLiteral = 0 | 1 | 2 | 3;
type BooleanLiteral = true | false;

/**
 * 模板字面量类型
 */
type EventName<T extends string> = `on${Capitalize<T>}`;
type ClickEvent = EventName<'click'>;  // 'onClick'
type KeyEvent = EventName<'keydown'>;  // 'onKeydown'

type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type APIEndpoint = `/api/${string}`;
type Route = `/${string}`;

/**
 * 联合类型与交叉类型
 */
type ID = string | number;
type Nullable<T> = T | null;
type Optional<T> = T | undefined;

type User = {
  id: ID;
  name: string;
  email: string;
};

type Timestamps = {
  createdAt: Date;
  updatedAt: Date;
};

type UserWithTimestamps = User & Timestamps;

/**
 * 类型守卫
 */
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function isNumber(value: unknown): value is number {
  return typeof value === 'number';
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUser(value: unknown): value is User {
  return (
    isObject(value) &&
    'id' in value &&
    'name' in value &&
    'email' in value
  );
}

/**
 * 窄化类型示例
 */
function processValue(value: string | number): string {
  if (isString(value)) {
    return value.toUpperCase();
  }
  return value.toFixed(2);
}
```

### 泛型编程

```typescript
/**
 * 泛型函数
 */
function identity<T>(arg: T): T {
  return arg;
}

function map<T, U>(arr: T[], fn: (item: T, index: number) => U): U[] {
  return arr.map(fn);
}

function filter<T>(arr: T[], predicate: (item: T) => boolean): T[] {
  return arr.filter(predicate);
}

function reduce<T, U>(
  arr: T[],
  fn: (acc: U, item: T, index: number) => U,
  initial: U
): U {
  return arr.reduce(fn, initial);
}

/**
 * 泛型约束
 */
interface Lengthwise {
  length: number;
}

function logLength<T extends Lengthwise>(arg: T): T {
  console.log(`Length: ${arg.length}`);
  return arg;
}

interface KeyedCollection<K, V> {
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  has(key: K): boolean;
  delete(key: K): boolean;
  keys(): IterableIterator<K>;
  values(): IterableIterator<V>;
  entries(): IterableIterator<[K, V]>;
}

/**
 * 泛型类
 */
class Container<T> {
  private items: T[] = [];

  /**
   * 添加元素到容器
   * @param item - 要添加的元素
   */
  add(item: T): void {
    this.items.push(item);
  }

  /**
   * 获取指定索引的元素
   * @param index - 元素索引
   * @returns 找到的元素或 undefined
   */
  get(index: number): T | undefined {
    return this.items[index];
  }

  /**
   * 移除并返回最后一个元素
   * @returns 最后一个元素或 undefined
   */
  remove(): T | undefined {
    return this.items.pop();
  }

  /**
   * 获取容器大小
   * @returns 元素数量
   */
  get size(): number {
    return this.items.length;
  }

  /**
   * 遍历所有元素
   */
  *[Symbol.iterator](): Generator<T, void, unknown> {
    for (const item of this.items) {
      yield item;
    }
  }
}

/**
 * 多泛型参数
 */
class Pair<K, V> {
  constructor(
    public readonly key: K,
    public readonly value: V
  ) {}

  /**
   * 映射值
   * @param fn - 转换函数
   * @returns 新的 Pair 实例
   */
  mapValue<U>(fn: (value: V) => U): Pair<K, U> {
    return new Pair(this.key, fn(this.value));
  }

  /**
   * 映射键
   * @param fn - 转换函数
   * @returns 新的 Pair 实例
   */
  mapKey<U>(fn: (key: K) => U): Pair<U, V> {
    return new Pair(fn(this.key), this.value);
  }
}

/**
 * 泛型默认类型
 */
interface ApiResponse<T = unknown, E = Error> {
  data: T;
  error: E | null;
  status: number;
  message: string;
}

/**
 * 条件类型中的泛型
 */
type NonNullable<T> = T extends null | undefined ? never : T;
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
type Parameters<T> = T extends (...args: infer P) => any ? P : never;
```

### 高级类型与工具类型

```typescript
/**
 * 内置工具类型
 */

// Partial - 所有属性可选
interface User {
  id: number;
  name: string;
  email: string;
}
type PartialUser = Partial<User>;
// { id?: number; name?: string; email?: string; }

// Required - 所有属性必需
interface OptionalUser {
  id?: number;
  name?: string;
}
type RequiredUser = Required<OptionalUser>;
// { id: number; name: string; }

// Readonly - 所有属性只读
type ReadonlyUser = Readonly<User>;
// { readonly id: number; readonly name: string; readonly email: string; }

// Pick - 选取部分属性
type UserPreview = Pick<User, 'id' | 'name'>;
// { id: number; name: string; }

// Omit - 排除部分属性
type UserWithoutEmail = Omit<User, 'email'>;
// { id: number; name: string; }

// Record - 记录类型
type UserMap = Record<string, User>;
type NumberMatrix = Record<string, Record<string, number>>;

// Extract - 提取符合条件的类型
type StringOrNumber = string | number | boolean;
type OnlyString = Extract<StringOrNumber, string>;
// string

// Exclude - 排除符合条件类型
type WithoutBoolean = Exclude<StringOrNumber, boolean>;
// string | number

// NonNullable - 排除 null 和 undefined
type MaybeString = string | null | undefined;
type DefiniteString = NonNullable<MaybeString>;
// string

// ReturnType - 获取函数返回类型
function createUser() {
  return { id: 1, name: 'Test' };
}
type CreatedUser = ReturnType<typeof createUser>;
// { id: number; name: string; }

// Parameters - 获取函数参数类型
function greet(name: string, age: number): string {
  return `Hello ${name}, you are ${age}`;
}
type GreetParams = Parameters<typeof greet>;
// [name: string, age: number]

// InstanceType - 获取构造函数实例类型
class Person {
  constructor(public name: string) {}
}
type PersonInstance = InstanceType<typeof Person>;
// Person

/**
 * 自定义工具类型
 */

/**
 * 深层 Partial
 */
type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * 深层 Required
 */
type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * 深层 Readonly
 */
type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * 获取对象值的类型
 */
type ValueOf<T> = T[keyof T];

/**
 * 获取函数参数类型（元组形式）
 */
type ArgumentTypes<T> = T extends (...args: infer A) => any ? A : never;

/**
 * 将对象所有键转为可选，并保留原有可选性
 */
type OptionalKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? K : never;
}[keyof T];

/**
 * 将对象所有必需键提取
 */
type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

/**
 * 合并两个对象类型
 */
type Merge<A, B> = Omit<A, keyof B> & B;

/**
 * 将联合类型转为交叉类型
 */
type UnionToIntersection<U> = (
  U extends any ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * 获取联合类型的最后一个元素
 */
type LastOfUnion<U> = UnionToIntersection<
  U extends any ? () => U : never
> extends () => infer R
  ? R
  : never;
```

### 条件类型与 infer

```typescript
/**
 * 条件类型基础
 */
type IsString<T> = T extends string ? true : false;
type IsArray<T> = T extends any[] ? true : false;
type IsFunction<T> = T extends (...args: any[]) => any ? true : false;

/**
 * infer 关键字 - 类型推断
 */

// 提取数组元素类型
type ArrayElement<T> = T extends (infer E)[] ? E : never;
type StringArrayElement = ArrayElement<string[]>;  // string

// 提取 Promise 返回类型
type Awaited<T> = T extends Promise<infer U> ? Awaited<U> : T;
type PromiseResult = Awaited<Promise<string>>;  // string

// 提取函数返回类型
type GetReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

// 提取函数第一个参数类型
type FirstParam<T> = T extends (first: infer F, ...rest: any[]) => any
  ? F
  : never;

// 提取对象属性类型
type PropertyType<T, K extends keyof T> = T extends { [P in K]: infer V }
  ? V
  : never;

/**
 * 递归条件类型
 */

// 展开嵌套数组
type Flatten<T> = T extends (infer E)[]
  ? Flatten<E>
  : T;
type Flattened = Flatten<(string | number)[][]>;  // string | number

// 提取对象所有叶子节点的值类型
type LeafValues<T> = T extends object
  ? { [K in keyof T]: LeafValues<T[K]> }[keyof T]
  : T;

// 深层提取 Promise 值
type DeepAwaited<T> = T extends Promise<infer U>
  ? DeepAwaited<U>
  : T extends object
  ? { [K in keyof T]: DeepAwaited<T[K]> }
  : T;

/**
 * 分布式条件类型
 */
type ToArray<T> = T extends any ? T[] : never;
type StrOrNumArray = ToArray<string | number>;  // string[] | number[]

// 避免分布式行为
type ToArrayNonDist<T> = [T] extends [any] ? T[] : never;
type StrOrNumArrayNonDist = ToArrayNonDist<string | number>;  // (string | number)[]
```

### 映射类型

```typescript
/**
 * 基础映射类型
 */
type Mapped<T> = {
  [K in keyof T]: T[K];
};

/**
 * 添加前缀的键名
 */
type Prefixed<T, P extends string> = {
  [K in keyof T as `${P}${Capitalize<string & K>}`]: T[K];
};
type PrefixedUser = Prefixed<User, 'user'>;
// { userId: number; userName: string; userEmail: string; }

/**
 * 过滤属性
 */
type OnlyStrings<T> = {
  [K in keyof T as T[K] extends string ? K : never]: T[K];
};
type UserStrings = OnlyStrings<User>;
// { name: string; email: string; }

/**
 * 排除特定类型属性
 */
type ExcludeType<T, U> = {
  [K in keyof T as T[K] extends U ? never : K]: T[K];
};
type UserNonNumbers = ExcludeType<User, number>;
// { name: string; email: string; }

/**
 * 将所有属性变为可空
 */
type NullableProps<T> = {
  [K in keyof T]: T[K] | null;
};

/**
 * 将属性名转为 getter 方法名
 */
type Getters<T> = {
  [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K];
};
type UserGetters = Getters<User>;
// { getId: () => number; getName: () => string; getEmail: () => string; }

/**
 * 将属性名转为 setter 方法名
 */
type Setters<T> = {
  [K in keyof T as `set${Capitalize<string & K>}`]: (value: T[K]) => void;
};

/**
 * 完整的 getter/setter 类型
 */
type WithAccessors<T> = T & Getters<T> & Setters<T>;

/**
 * 将对象转为事件处理器类型
 */
type EventHandlers<T> = {
  [K in keyof T as `on${Capitalize<string & K>}Change`]: (
    newValue: T[K],
    oldValue: T[K]
  ) => void;
};

/**
 * 递归映射类型
 */
type RecursiveOptional<T> = T extends object
  ? {
      [K in keyof T]?: RecursiveOptional<T[K]>;
    }
  : T;
```

### 类型体操实战

```typescript
/**
 * 实现 TupleToUnion
 */
type TupleToUnion<T extends readonly any[]> = T[number];

/**
 * 实现 UnionToTuple（有限制版本）
 */
type UnionToTuple<T, Last = LastOfUnion<T>> = [T] extends [never]
  ? []
  : [...UnionToTuple<Exclude<T, Last>>, Last];

/**
 * 实现长度类型
 */
type Length<T extends readonly any[]> = T['length'];
type StrLength<S extends string> = S extends `${infer _}${infer Rest}`
  ? 1 extends 1
    ? 1 + StrLength<Rest>
    : never
  : 0;

/**
 * 实现字符串替换
 */
type Replace<
  S extends string,
  From extends string,
  To extends string
> = From extends ''
  ? S
  : S extends `${infer Before}${From}${infer After}`
  ? `${Before}${To}${After}`
  : S;

type ReplaceAll<
  S extends string,
  From extends string,
  To extends string
> = From extends ''
  ? S
  : S extends `${infer Before}${From}${infer After}`
  ? ReplaceAll<`${Before}${To}${After}`, From, To>
  : S;

/**
 * 实现字符串反转
 */
type Reverse<S extends string> = S extends `${infer First}${infer Rest}`
  ? `${Reverse<Rest>}${First}`
  : S;

/**
 * 实现对象路径类型
 */
type Path<T, K extends keyof T = keyof T> = K extends string | number
  ? T[K] extends object
    ? K | `${K}.${Path<T[K]>}`
    : K
  : never;

type DeepValue<T, P extends string> = P extends `${infer K}.${infer Rest}`
  ? K extends keyof T
    ? DeepValue<T[K], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

/**
 * 实现 RequiredByKeys
 */
type RequiredByKeys<T, K extends keyof T = keyof T> = Merge<
  { [P in Exclude<keyof T, K>]?: T[P] },
  { [P in K]-?: T[P] }
>;

/**
 * 实现 Mutable
 */
type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

/**
 * 实现 ReadonlyByKeys
 */
type ReadonlyByKeys<T, K extends keyof T = keyof T> = Merge<
  { [P in Exclude<keyof T, K>]: T[P] },
  { readonly [P in K]: T[P] }
>;
```

### 声明文件与模块

```typescript
/**
 * 全局声明
 */
declare global {
  interface Window {
    customProperty: string;
    customMethod(): void;
  }

  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      API_URL: string;
    }
  }
}

/**
 * 模块声明
 */
declare module 'my-library' {
  export interface Options {
    timeout: number;
    retries: number;
  }

  export function initialize(options: Options): void;
  export function destroy(): void;

  const _default: {
    initialize: typeof initialize;
    destroy: typeof destroy;
  };

  export default _default;
}

/**
 * 模块扩展
 */
declare module 'express' {
  interface Request {
    user?: {
      id: string;
      name: string;
    };
  }
}

/**
 * 类型导入导出
 */
export type { User, Status };
export type { default as UserService } from './services/user';

/**
 * 类型仅导入
 */
import type { User } from './types';
import { type User, type Status, createUser } from './user';
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `type` | 类型别名 | `type ID = string \| number;` |
| `interface` | 对象类型 | `interface User { name: string; }` |
| `extends` | 类型约束/继承 | `T extends string` |
| `infer` | 类型推断 | `T extends Promise<infer U> ? U : T` |
| `keyof` | 获取键类型 | `keyof User` |
| `typeof` | 获取值类型 | `typeof obj` |
| `Partial<T>` | 所有属性可选 | `Partial<User>` |
| `Required<T>` | 所有属性必需 | `Required<User>` |
| `Readonly<T>` | 所有属性只读 | `Readonly<User>` |
| `Pick<T, K>` | 选取属性 | `Pick<User, 'id' \| 'name'>` |
| `Omit<T, K>` | 排除属性 | `Omit<User, 'email'>` |
| `Record<K, V>` | 记录类型 | `Record<string, number>` |
| `Extract<T, U>` | 提取类型 | `Extract<T, string>` |
| `Exclude<T, U>` | 排除类型 | `Exclude<T, null>` |
| `NonNullable<T>` | 排除空值 | `NonNullable<T>` |
| `ReturnType<T>` | 返回类型 | `ReturnType<typeof fn>` |
| `Parameters<T>` | 参数类型 | `Parameters<typeof fn>` |
| `InstanceType<T>` | 实例类型 | `InstanceType<typeof Class>` |
| `as const` | 常量断言 | `['a', 'b'] as const` |
| `satisfies` | 类型满足 | `obj satisfies Type` |
| `is` | 类型谓词 | `value is string` |
| `asserts` | 断言函数 | `asserts condition` |
