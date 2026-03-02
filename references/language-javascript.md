# JavaScript 参考

> Reference for: fullstack-dev-skills
> Load when: 编写 JavaScript 代码、ES2024+ 特性、异步编程、模块化

## 核心特性

JavaScript 是一门动态类型的脚本语言，ES2024+ 带来了许多现代特性，包括模式匹配提案、管道操作符、Records & Tuples 等。掌握现代 JavaScript 是前端开发的基础。

### ES2024+ 新特性

```javascript
/**
 * 数组分组 (ES2024)
 * @type {Array<{name: string, category: string, price: number}>}
 */
const products = [
  { name: 'Apple', category: 'fruit', price: 1.5 },
  { name: 'Carrot', category: 'vegetable', price: 0.8 },
  { name: 'Banana', category: 'fruit', price: 2.0 },
  { name: 'Broccoli', category: 'vegetable', price: 1.2 }
];

/**
 * 使用 Object.groupBy 分组
 * @param {Array} items - 要分组的数组
 * @param {Function} keyFn - 分组键函数
 * @returns {Object} 分组后的对象
 */
const groupedByCategory = Object.groupBy(products, ({ category }) => category);
// { fruit: [...], vegetable: [...] }

/**
 * 使用 Map.groupBy 分组
 * @param {Array} items - 要分组的数组
 * @param {Function} keyFn - 分组键函数
 * @returns {Map} 分组后的 Map
 */
const groupedMap = Map.groupBy(products, ({ category }) => category);

/**
 * Promise.withResolvers (ES2024)
 * 创建一个包含 promise、resolve、reject 的对象
 * @returns {{promise: Promise, resolve: Function, reject: Function}}
 */
function createDeferred() {
  return Promise.withResolvers();
}

/**
 * 使用 withResolvers 的异步任务
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Promise<string>}
 */
function delayWithAbort(delay, signal) {
  const { promise, resolve, reject } = Promise.withResolvers();
  
  const timeoutId = setTimeout(() => {
    resolve(`Completed after ${delay}ms`);
  }, delay);
  
  signal?.addEventListener('abort', () => {
    clearTimeout(timeoutId);
    reject(new Error('Aborted'));
  });
  
  return promise;
}

/**
 * Atomics.waitAsync (ES2024)
 * 异步等待共享内存状态变化
 * @param {Int32Array} buffer - 共享缓冲区
 * @param {number} index - 等待的索引
 * @param {number} expected - 期望值
 * @param {number} timeout - 超时时间
 * @returns {Promise<string>}
 */
async function waitForValue(buffer, index, expected, timeout = 1000) {
  const result = Atomics.waitAsync(buffer, index, expected, timeout);
  if (result.async) {
    return result.value;
  }
  return result;
}

/**
 * String.prototype.isWellFormed / toWellFormed (ES2024)
 * 处理孤立的代理对
 * @param {string} str - 输入字符串
 * @returns {string} 格式正确的字符串
 */
function ensureWellFormed(str) {
  if (!str.isWellFormed()) {
    return str.toWellFormed();
  }
  return str;
}
```

### 异步编程

```javascript
/**
 * Promise 基础封装
 * @param {string} url - 请求地址
 * @param {Object} options - 请求选项
 * @returns {Promise<Object>}
 */
function fetchData(url, options = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(options.method || 'GET', url);
    
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch (e) {
          resolve(xhr.responseText);
        }
      } else {
        reject(new Error(`HTTP ${xhr.status}: ${xhr.statusText}`));
      }
    };
    
    xhr.onerror = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Request timeout'));
    
    xhr.timeout = options.timeout || 10000;
    xhr.send(options.body);
  });
}

/**
 * Async/Await 基础用法
 * @param {string} url - 请求地址
 * @returns {Promise<Object>}
 */
async function getData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

/**
 * 并发控制
 * @param {Array<Function>} tasks - 任务函数数组
 * @param {number} concurrency - 并发数
 * @returns {Promise<Array>}
 */
async function parallelLimit(tasks, concurrency = 5) {
  const results = [];
  const executing = new Set();
  
  for (const [index, task] of tasks.entries()) {
    const promise = Promise.resolve().then(() => task());
    results[index] = promise;
    executing.add(promise);
    
    const cleanup = () => executing.delete(promise);
    promise.then(cleanup, cleanup);
    
    if (executing.size >= concurrency) {
      await Promise.race(executing);
    }
  }
  
  return Promise.all(results);
}

/**
 * 带重试的异步请求
 * @param {Function} fn - 异步函数
 * @param {number} retries - 重试次数
 * @param {number} delay - 重试延迟
 * @returns {Promise}
 */
async function retry(fn, retries = 3, delay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
}

/**
 * Promise 超时控制
 * @param {Promise} promise - 原始 Promise
 * @param {number} ms - 超时时间（毫秒）
 * @returns {Promise}
 */
function timeout(promise, ms) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * 异步迭代器
 * @param {Array} items - 数据项数组
 * @param {Function} asyncFn - 异步处理函数
 * @param {number} concurrency - 并发数
 */
async function asyncPool(items, asyncFn, concurrency = 5) {
  const results = [];
  const iterator = items[Symbol.iterator]();
  
  async function worker() {
    for (const item of iterator) {
      const index = results.length;
      results.push(null);
      results[index] = await asyncFn(item, index);
    }
  }
  
  const workers = Array(Math.min(concurrency, items.length))
    .fill(null)
    .map(() => worker());
  
  await Promise.all(workers);
  return results;
}
```

### 模块化

```javascript
/**
 * ES Module 导出
 */

// 命名导出
export const PI = 3.14159;

/**
 * 计算圆面积
 * @param {number} radius - 半径
 * @returns {number} 面积
 */
export function circleArea(radius) {
  return PI * radius * radius;
}

/**
 * 用户类
 */
export class User {
  /**
   * @param {string} name - 用户名
   * @param {string} email - 邮箱
   */
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }

  /**
   * 获取用户信息
   * @returns {string}
   */
  getInfo() {
    return `${this.name} <${this.email}>`;
  }
}

// 默认导出
export default class Calculator {
  /**
   * 加法
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  add(a, b) {
    return a + b;
  }

  /**
   * 减法
   * @param {number} a
   * @param {number} b
   * @returns {number}
   */
  subtract(a, b) {
    return a - b;
  }
}

/**
 * 动态导入
 * @param {string} moduleName - 模块名
 * @returns {Promise<Object>}
 */
async function loadModule(moduleName) {
  try {
    const module = await import(`./modules/${moduleName}.js`);
    return module;
  } catch (error) {
    console.error(`Failed to load module: ${moduleName}`, error);
    throw error;
  }
}

/**
 * 条件动态导入
 * @param {string} feature - 功能名
 * @returns {Promise<Object|null>}
 */
async function loadFeature(feature) {
  if (feature === 'chart') {
    return import('./features/chart.js');
  } else if (feature === 'map') {
    return import('./features/map.js');
  }
  return null;
}

/**
 * 模块单例模式
 */
let instance = null;

export function getInstance() {
  if (!instance) {
    instance = createInstance();
  }
  return instance;
}

function createInstance() {
  return {
    data: new Map(),
    /**
     * 设置数据
     * @param {string} key
     * @param {*} value
     */
    set(key, value) {
      this.data.set(key, value);
    },
    /**
     * 获取数据
     * @param {string} key
     * @returns {*}
     */
    get(key) {
      return this.data.get(key);
    }
  };
}
```

### 函数式编程

```javascript
/**
 * 柯里化函数
 * @param {Function} fn - 原始函数
 * @returns {Function} 柯里化后的函数
 */
function curry(fn) {
  return function curried(...args) {
    if (args.length >= fn.length) {
      return fn.apply(this, args);
    }
    return function (...nextArgs) {
      return curried.apply(this, [...args, ...nextArgs]);
    };
  };
}

/**
 * 柯里化示例
 */
const add = curry((a, b, c) => a + b + c);
const add5 = add(5);
const add5and10 = add5(10);
console.log(add5and10(3));  // 18

/**
 * 函数组合
 * @param {...Function} fns - 函数数组
 * @returns {Function} 组合后的函数
 */
function compose(...fns) {
  return function (initialValue) {
    return fns.reduceRight((acc, fn) => fn(acc), initialValue);
  };
}

/**
 * 管道函数
 * @param {...Function} fns - 函数数组
 * @returns {Function} 管道函数
 */
function pipe(...fns) {
  return function (initialValue) {
    return fns.reduce((acc, fn) => fn(acc), initialValue);
  };
}

/**
 * 函数组合示例
 */
const double = x => x * 2;
const increment = x => x + 1;
const square = x => x * x;

const calculate = pipe(double, increment, square);
console.log(calculate(3));  // ((3 * 2) + 1) ^ 2 = 49

/**
 * 记忆化
 * @param {Function} fn - 要记忆化的函数
 * @returns {Function} 记忆化后的函数
 */
function memoize(fn) {
  const cache = new Map();
  
  return function (...args) {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key);
    }
    
    const result = fn.apply(this, args);
    cache.set(key, result);
    return result;
  };
}

/**
 * 斐波那契数列（记忆化）
 */
const fibonacci = memoize(function (n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

/**
 * 偏函数应用
 * @param {Function} fn - 原始函数
 * @param {...*} presetArgs - 预设参数
 * @returns {Function}
 */
function partial(fn, ...presetArgs) {
  return function (...laterArgs) {
    return fn(...presetArgs, ...laterArgs);
  };
}

/**
 * 防抖
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间
 * @param {boolean} immediate - 是否立即执行
 * @returns {Function}
 */
function debounce(fn, delay, immediate = false) {
  let timeoutId = null;
  
  return function (...args) {
    const later = () => {
      timeoutId = null;
      if (!immediate) {
        fn.apply(this, args);
      }
    };
    
    const callNow = immediate && !timeoutId;
    clearTimeout(timeoutId);
    timeoutId = setTimeout(later, delay);
    
    if (callNow) {
      fn.apply(this, args);
    }
  };
}

/**
 * 节流
 * @param {Function} fn - 要节流的函数
 * @param {number} limit - 时间限制
 * @returns {Function}
 */
function throttle(fn, limit) {
  let inThrottle = false;
  let lastArgs = null;
  
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => {
        inThrottle = false;
        if (lastArgs) {
          fn.apply(this, lastArgs);
          lastArgs = null;
        }
      }, limit);
    } else {
      lastArgs = args;
    }
  };
}
```

### 数据结构

```javascript
/**
 * Map 操作
 */
const userMap = new Map();

/**
 * 设置用户
 * @param {string} id
 * @param {Object} user
 */
function setUser(id, user) {
  userMap.set(id, user);
}

/**
 * 获取用户
 * @param {string} id
 * @returns {Object|undefined}
 */
function getUser(id) {
  return userMap.get(id);
}

/**
 * 遍历 Map
 */
function iterateMap() {
  for (const [key, value] of userMap) {
    console.log(`${key}: ${value.name}`);
  }
}

/**
 * Set 操作
 */
const uniqueTags = new Set(['javascript', 'typescript', 'python']);

/**
 * 添加标签
 * @param {string} tag
 */
function addTag(tag) {
  uniqueTags.add(tag.toLowerCase());
}

/**
 * 检查标签是否存在
 * @param {string} tag
 * @returns {boolean}
 */
function hasTag(tag) {
  return uniqueTags.has(tag.toLowerCase());
}

/**
 * WeakMap 用于私有数据
 */
const privateData = new WeakMap();

class SecretHolder {
  constructor(secret) {
    privateData.set(this, { secret });
  }

  /**
   * 获取秘密
   * @returns {*}
   */
  getSecret() {
    return privateData.get(this)?.secret;
  }
}

/**
 * LRU 缓存实现
 */
class LRUCache {
  /**
   * @param {number} capacity - 缓存容量
   */
  constructor(capacity) {
    this.capacity = capacity;
    this.cache = new Map();
  }

  /**
   * 获取缓存值
   * @param {string} key
   * @returns {*}
   */
  get(key) {
    if (!this.cache.has(key)) return undefined;
    
    const value = this.cache.get(key);
    this.cache.delete(key);
    this.cache.set(key, value);
    return value;
  }

  /**
   * 设置缓存值
   * @param {string} key
   * @param {*} value
   */
  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.capacity) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}
```

### Proxy 与 Reflect

```javascript
/**
 * 响应式对象代理
 * @param {Object} target - 目标对象
 * @param {Function} onChange - 变化回调
 * @returns {Proxy}
 */
function reactive(target, onChange) {
  return new Proxy(target, {
    /**
     * 读取拦截
     * @param {Object} obj
     * @param {string} prop
     * @returns {*}
     */
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      if (typeof value === 'object' && value !== null) {
        return reactive(value, onChange);
      }
      return value;
    },

    /**
     * 设置拦截
     * @param {Object} obj
     * @param {string} prop
     * @param {*} value
     * @returns {boolean}
     */
    set(obj, prop, value) {
      const oldValue = Reflect.get(obj, prop);
      const result = Reflect.set(obj, prop, value);
      if (result && oldValue !== value) {
        onChange(prop, value, oldValue);
      }
      return result;
    },

    /**
     * 删除拦截
     * @param {Object} obj
     * @param {string} prop
     * @returns {boolean}
     */
    deleteProperty(obj, prop) {
      const had = Reflect.has(obj, prop);
      const result = Reflect.deleteProperty(obj, prop);
      if (result && had) {
        onChange(prop, undefined, Reflect.get(obj, prop));
      }
      return result;
    }
  });
}

/**
 * 只读代理
 * @param {Object} target
 * @returns {Proxy}
 */
function readonly(target) {
  return new Proxy(target, {
    get(obj, prop) {
      const value = Reflect.get(obj, prop);
      if (typeof value === 'object' && value !== null) {
        return readonly(value);
      }
      return value;
    },
    set() {
      throw new Error('Cannot modify readonly object');
    },
    deleteProperty() {
      throw new Error('Cannot delete from readonly object');
    }
  });
}

/**
 * 验证代理
 * @param {Object} target
 * @param {Object} schema
 * @returns {Proxy}
 */
function validate(target, schema) {
  return new Proxy(target, {
    set(obj, prop, value) {
      if (prop in schema) {
        const validator = schema[prop];
        if (!validator(value)) {
          throw new Error(`Invalid value for ${prop}`);
        }
      }
      return Reflect.set(obj, prop, value);
    }
  });
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `async/await` | 异步编程 | `await fetch(url)` |
| `Promise.all()` | 并行执行 | `Promise.all([p1, p2])` |
| `Promise.race()` | 竞争执行 | `Promise.race([p1, p2])` |
| `Promise.allSettled()` | 全部完成 | `Promise.allSettled([...])` |
| `Promise.withResolvers()` | Promise 构造 | `const {promise, resolve} = Promise.withResolvers()` |
| `Object.groupBy()` | 对象分组 | `Object.groupBy(arr, fn)` |
| `Map.groupBy()` | Map 分组 | `Map.groupBy(arr, fn)` |
| `import()` | 动态导入 | `import('./module.js')` |
| `export *` | 全部导出 | `export * from './module'` |
| `Map` | 键值映射 | `new Map([['k', 'v']])` |
| `Set` | 唯一集合 | `new Set([1, 2, 3])` |
| `WeakMap` | 弱引用映射 | `new WeakMap()` |
| `Proxy` | 对象代理 | `new Proxy(obj, handler)` |
| `Reflect` | 反射操作 | `Reflect.get(obj, key)` |
| `Symbol` | 唯一标识 | `Symbol('desc')` |
| `...` | 展开/剩余 | `[...arr]` / `fn(...args)` |
| `??` | 空值合并 | `value ?? default` |
| `?.` | 可选链 | `obj?.prop?.method?.()` |
| `\|\|` | 逻辑或 | `value \|\| default` |
| `&&` | 逻辑与 | `condition && action()` |
