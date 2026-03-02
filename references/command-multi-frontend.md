# multi-frontend 命令参考

## 命令概述
`multi-frontend` 命令用于前端聚焦的多服务编排，通过协调多个前端服务和模型来共同完成复杂的前端开发任务。

## 命令语法
```bash
fullstack-dev-skills multi-frontend [选项] --task "前端任务描述"
```

## 参数说明
| 参数 | 类型 | 必需 | 描述 |
|------|------|------|------|
| `--task` | 字符串 | 是 | 前端任务描述，详细说明任务目标和要求 |
| `--framework` | 字符串 | 否 | 指定前端框架，支持 `react`、`vue`、`angular` 等，默认根据任务自动选择 |
| `--models` | 字符串数组 | 否 | 指定要使用的模型列表，默认为系统推荐的模型组合 |
| `--timeout` | 数字 | 否 | 任务超时时间（秒），默认 300 |
| `--output` | 字符串 | 否 | 输出格式，支持 `json` 和 `text`，默认 `text` |

## 工作原理
1. **框架识别**：根据任务类型识别最适合的前端框架
2. **模型分配**：根据任务性质分配给最适合的模型
3. **组件分解**：将复杂前端任务分解为多个组件
4. **代码生成**：生成符合最佳实践的前端代码
5. **样式整合**：生成美观、响应式的样式
6. **测试验证**：确保生成的代码能够正常工作

## 使用示例

### 示例 1：React 组件开发
```bash
fullstack-dev-skills multi-frontend --task "开发一个 React 电商商品列表组件，支持分页、筛选和排序功能"
```

#### 预期输出
```
# React 电商商品列表组件实现

## 1. 技术栈
- **框架**：React 18
- **状态管理**：React Hooks (useState, useEffect, useCallback)
- **样式**：CSS Modules
- **HTTP 客户端**：Axios
- **构建工具**：Vite

## 2. 项目结构
```
src/
├── components/
│   └── ProductList/
│       ├── index.jsx
│       ├── ProductItem.jsx
│       ├── FilterBar.jsx
│       ├── Pagination.jsx
│       └── styles.module.css
├── hooks/
│   └── useProducts.js
├── services/
│   └── api.js
└── App.jsx
```

## 3. 核心代码

### 商品列表组件 (index.jsx)
```jsx
import React, { useState, useEffect } from 'react';
import ProductItem from './ProductItem';
import FilterBar from './FilterBar';
import Pagination from './Pagination';
import { useProducts } from '../../hooks/useProducts';
import styles from './styles.module.css';

const ProductList = () => {
  const [filters, setFilters] = useState({
    category: '',
    priceRange: { min: 0, max: 1000 },
    sortBy: 'price',
    sortOrder: 'asc'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const { products, loading, error, totalProducts } = useProducts({
    ...filters,
    page: currentPage,
    pageSize
  });

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // 重置到第一页
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return <div className={styles.loading}>加载中...</div>;
  }

  if (error) {
    return <div className={styles.error}>错误: {error.message}</div>;
  }

  return (
    <div className={styles.container}>
      <FilterBar 
        filters={filters} 
        onChange={handleFilterChange} 
      />
      
      <div className={styles.productGrid}>
        {products.map((product) => (
          <ProductItem key={product.id} product={product} />
        ))}
      </div>

      {totalProducts > pageSize && (
        <Pagination
          currentPage={currentPage}
          totalItems={totalProducts}
          pageSize={pageSize}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
};

export default ProductList;
```

### 商品项组件 (ProductItem.jsx)
```jsx
import React from 'react';
import styles from './styles.module.css';

const ProductItem = ({ product }) => {
  return (
    <div className={styles.productItem}>
      <div className={styles.productImage}>
        <img src={product.image} alt={product.name} />
      </div>
      <div className={styles.productInfo}>
        <h3 className={styles.productName}>{product.name}</h3>
        <p className={styles.productDescription}>
          {product.description.substring(0, 100)}...
        </p>
        <div className={styles.productPrice}>¥{product.price.toFixed(2)}</div>
        <button className={styles.addToCartButton}>
          添加到购物车
        </button>
      </div>
    </div>
  );
};

export default ProductItem;
```

### 筛选栏组件 (FilterBar.jsx)
```jsx
import React from 'react';
import styles from './styles.module.css';

const FilterBar = ({ filters, onChange }) => {
  const handleCategoryChange = (e) => {
    onChange({
      ...filters,
      category: e.target.value
    });
  };

  const handleSortChange = (e) => {
    const [sortBy, sortOrder] = e.target.value.split('-');
    onChange({
      ...filters,
      sortBy,
      sortOrder
    });
  };

  return (
    <div className={styles.filterBar}>
      <div className={styles.filterGroup}>
        <label>分类:</label>
        <select 
          value={filters.category} 
          onChange={handleCategoryChange}
          className={styles.filterSelect}
        >
          <option value="">全部</option>
          <option value="electronics">电子产品</option>
          <option value="clothing">服装</option>
          <option value="home">家居</option>
          <option value="beauty">美妆</option>
        </select>
      </div>

      <div className={styles.filterGroup}>
        <label>排序:</label>
        <select 
          value={`${filters.sortBy}-${filters.sortOrder}`} 
          onChange={handleSortChange}
          className={styles.filterSelect}
        >
          <option value="price-asc">价格: 低到高</option>
          <option value="price-desc">价格: 高到低</option>
          <option value="name-asc">名称: A-Z</option>
          <option value="name-desc">名称: Z-A</option>
          <option value="rating-desc">评分: 高到低</option>
        </select>
      </div>
    </div>
  );
};

export default FilterBar;
```

### 分页组件 (Pagination.jsx)
```jsx
import React from 'react';
import styles from './styles.module.css';

const Pagination = ({ currentPage, totalItems, pageSize, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const maxVisiblePages = 5;

  const getVisiblePages = () => {
    const pages = [];
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    // 调整起始页以确保显示足够的页码
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={styles.pagination}>
      <button
        className={`${styles.pageButton} ${currentPage === 1 ? styles.disabled : ''}`}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        上一页
      </button>

      {visiblePages.map((page) => (
        <button
          key={page}
          className={`${styles.pageButton} ${currentPage === page ? styles.active : ''}`}
          onClick={() => onPageChange(page)}
        >
          {page}
        </button>
      ))}

      <button
        className={`${styles.pageButton} ${currentPage === totalPages ? styles.disabled : ''}`}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        下一页
      </button>
    </div>
  );
};

export default Pagination;
```

### 商品数据 Hook (useProducts.js)
```jsx
import { useState, useEffect, useCallback } from 'react';
import { fetchProducts } from '../services/api';

export const useProducts = (params) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalProducts, setTotalProducts] = useState(0);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchProducts(params);
      setProducts(response.data);
      setTotalProducts(response.total);
    } catch (err) {
      setError(err);
      setProducts([]);
      setTotalProducts(0);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  return { products, loading, error, totalProducts };
};
```

### API 服务 (api.js)
```jsx
import axios from 'axios';

const API_BASE_URL = 'https://api.example.com';

export const fetchProducts = async (params) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/products`, {
      params: {
        category: params.category,
        minPrice: params.priceRange.min,
        maxPrice: params.priceRange.max,
        sortBy: params.sortBy,
        sortOrder: params.sortOrder,
        page: params.page,
        pageSize: params.pageSize
      }
    });

    return {
      data: response.data.products,
      total: response.data.total
    };
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};
```

### 样式文件 (styles.module.css)
```css
/* 容器样式 */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 加载状态 */
.loading {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #666;
}

/* 错误状态 */
.error {
  text-align: center;
  padding: 40px;
  font-size: 18px;
  color: #ff4d4f;
}

/* 筛选栏 */
.filterBar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding: 20px;
  background-color: #f5f5f5;
  border-radius: 8px;
}

.filterGroup {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filterGroup label {
  font-weight: 500;
  color: #333;
}

.filterSelect {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  font-size: 14px;
}

/* 商品网格 */
.productGrid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

/* 商品项 */
.productItem {
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.productItem:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.productImage {
  width: 100%;
  height: 200px;
  overflow: hidden;
}

.productImage img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.productItem:hover .productImage img {
  transform: scale(1.05);
}

.productInfo {
  padding: 16px;
}

.productName {
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 500;
  color: #333;
  line-height: 1.4;
}

.productDescription {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #666;
  line-height: 1.4;
  height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.productPrice {
  margin: 0 0 16px 0;
  font-size: 18px;
  font-weight: 600;
  color: #ff4d4f;
}

.addToCartButton {
  width: 100%;
  padding: 10px;
  background-color: #1890ff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.addToCartButton:hover {
  background-color: #40a9ff;
}

/* 分页 */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 8px;
  margin-top: 30px;
}

.pageButton {
  padding: 8px 12px;
  border: 1px solid #d9d9d9;
  border-radius: 4px;
  background-color: #fff;
  color: #333;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.pageButton:hover:not(.disabled) {
  border-color: #1890ff;
  color: #1890ff;
}

.pageButton.active {
  background-color: #1890ff;
  color: #fff;
  border-color: #1890ff;
}

.pageButton.disabled {
  color: #d9d9d9;
  cursor: not-allowed;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .container {
    padding: 10px;
  }

  .filterBar {
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .productGrid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 15px;
  }

  .productImage {
    height: 150px;
  }

  .productInfo {
    padding: 12px;
  }

  .productName {
    font-size: 14px;
  }

  .productDescription {
    font-size: 12px;
    height: 32px;
  }

  .productPrice {
    font-size: 16px;
    margin-bottom: 12px;
  }

  .addToCartButton {
    padding: 8px;
    font-size: 12px;
  }
}
```

## 4. 安装和运行

### 安装依赖
```bash
npm install react react-dom axios
```

### 运行开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```
```

### 示例 2：Vue 响应式表单
```bash
fullstack-dev-skills multi-frontend --task "开发一个 Vue 响应式用户注册表单，支持表单验证和实时反馈"
```

#### 预期输出
```
# Vue 响应式用户注册表单实现

## 1. 技术栈
- **框架**：Vue 3
- **状态管理**：Vue Composition API
- **表单验证**：VeeValidate
- **样式**：Tailwind CSS
- **构建工具**：Vite

## 2. 项目结构
```
src/
├── components/
│   └── RegisterForm.vue
├── composables/
│   └── useValidation.js
├── utils/
│   └── validators.js
└── App.vue
```

## 3. 核心代码

### 注册表单组件 (RegisterForm.vue)
```vue
<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-3xl font-extrabold text-gray-900 text-center">
          创建新账户
        </h2>
        <p class="mt-2 text-sm text-gray-600 text-center">
          或 
          <a href="#" class="font-medium text-indigo-600 hover:text-indigo-500">
            使用已有账户登录
          </a>
        </p>
      </div>

      <form @submit.prevent="handleSubmit" class="mt-8 space-y-6">
        <!-- 名称输入 -->
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="name" class="block text-sm font-medium text-gray-700">
              姓名
            </label>
            <div class="mt-1">
              <input
                id="name"
                name="name"
                type="text"
                v-model="form.name"
                @blur="validateField('name')"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入您的姓名"
              />
              <p v-if="errors.name" class="mt-1 text-sm text-red-600">
                {{ errors.name }}
              </p>
            </div>
          </div>
        </div>

        <!-- 邮箱输入 -->
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="block text-sm font-medium text-gray-700">
              邮箱地址
            </label>
            <div class="mt-1">
              <input
                id="email"
                name="email"
                type="email"
                v-model="form.email"
                @blur="validateField('email')"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入您的邮箱"
              />
              <p v-if="errors.email" class="mt-1 text-sm text-red-600">
                {{ errors.email }}
              </p>
            </div>
          </div>
        </div>

        <!-- 密码输入 -->
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="password" class="block text-sm font-medium text-gray-700">
              密码
            </label>
            <div class="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                v-model="form.password"
                @blur="validateField('password')"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请输入密码"
              />
              <p v-if="errors.password" class="mt-1 text-sm text-red-600">
                {{ errors.password }}
              </p>
            </div>
          </div>
        </div>

        <!-- 确认密码输入 -->
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="password_confirmation" class="block text-sm font-medium text-gray-700">
              确认密码
            </label>
            <div class="mt-1">
              <input
                id="password_confirmation"
                name="password_confirmation"
                type="password"
                v-model="form.password_confirmation"
                @blur="validateField('password_confirmation')"
                class="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="请再次输入密码"
              />
              <p v-if="errors.password_confirmation" class="mt-1 text-sm text-red-600">
                {{ errors.password_confirmation }}
              </p>
            </div>
          </div>
        </div>

        <!-- 同意条款 -->
        <div class="flex items-center">
          <input
            id="terms"
            name="terms"
            type="checkbox"
            v-model="form.terms"
            @change="validateField('terms')"
            class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
          />
          <label for="terms" class="ml-2 block text-sm text-gray-900">
            我同意 
            <a href="#" class="text-indigo-600 hover:text-indigo-500">
              服务条款
            </a> 和 
            <a href="#" class="text-indigo-600 hover:text-indigo-500">
              隐私政策
            </a>
          </label>
        </div>
        <p v-if="errors.terms" class="mt-1 text-sm text-red-600">
          {{ errors.terms }}
        </p>

        <!-- 提交按钮 -->
        <div>
          <button
            type="submit"
            :disabled="isSubmitting"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="isSubmitting" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <svg class="h-5 w-5 text-indigo-700 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </span>
            <span :class="{ 'pl-10': isSubmitting }">
              {{ isSubmitting ? '注册中...' : '创建账户' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useValidation } from '../composables/useValidation';

const form = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  terms: false
});

const errors = reactive({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  terms: ''
});

const isSubmitting = ref(false);
const { validateField, validateForm } = useValidation();

const handleSubmit = async () => {
  const isValid = await validateForm(form, errors);
  
  if (isValid) {
    isSubmitting.value = true;
    
    // 模拟 API 调用
    setTimeout(() => {
      console.log('Form submitted:', form);
      alert('注册成功！');
      isSubmitting.value = false;
      
      // 重置表单
      Object.keys(form).forEach(key => {
        form[key] = key === 'terms' ? false : '';
      });
      
      Object.keys(errors).forEach(key => {
        errors[key] = '';
      });
    }, 1500);
  }
};
</script>
```

### 验证逻辑 (useValidation.js)
```javascript
import { ref } from 'vue';

export function useValidation() {
  const validateField = (fieldName, form, errors) => {
    switch (fieldName) {
      case 'name':
        if (!form.name.trim()) {
          errors.name = '姓名不能为空';
        } else if (form.name.trim().length < 2) {
          errors.name = '姓名至少需要 2 个字符';
        } else {
          errors.name = '';
        }
        break;
        
      case 'email':
        if (!form.email.trim()) {
          errors.email = '邮箱不能为空';
        } else if (!isValidEmail(form.email)) {
          errors.email = '请输入有效的邮箱地址';
        } else {
          errors.email = '';
        }
        break;
        
      case 'password':
        if (!form.password) {
          errors.password = '密码不能为空';
        } else if (form.password.length < 6) {
          errors.password = '密码至少需要 6 个字符';
        } else {
          errors.password = '';
        }
        break;
        
      case 'password_confirmation':
        if (!form.password_confirmation) {
          errors.password_confirmation = '请确认密码';
        } else if (form.password_confirmation !== form.password) {
          errors.password_confirmation = '两次输入的密码不一致';
        } else {
          errors.password_confirmation = '';
        }
        break;
        
      case 'terms':
        if (!form.terms) {
          errors.terms = '请同意服务条款和隐私政策';
        } else {
          errors.terms = '';
        }
        break;
        
      default:
        break;
    }
  };

  const validateForm = (form, errors) => {
    let isValid = true;
    
    Object.keys(errors).forEach(field => {
      validateField(field, form, errors);
      if (errors[field]) {
        isValid = false;
      }
    });
    
    return isValid;
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  return {
    validateField,
    validateForm
  };
}
```

## 4. 安装和运行

### 安装依赖
```bash
npm install vue@latest vee-validate
```

### 安装 Tailwind CSS
```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### 配置 Tailwind CSS
在 `tailwind.config.js` 文件中添加：
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

在 `src/style.css` 文件中添加：
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### 运行开发服务器
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```
```

## 常见问题

### Q: multi-frontend 命令与普通前端开发命令有什么区别？
A: `multi-frontend` 命令通过协调多个前端服务和模型来完成任务，可以处理更复杂的前端开发场景，提供更全面、更深入的解决方案。

### Q: 如何选择适合的前端框架？
A: 系统会根据任务类型自动推荐合适的前端框架。您也可以通过 `--framework` 参数手动指定框架。

### Q: 任务描述应该多详细？
A: 任务描述越详细，生成的代码质量越高。建议包含任务目标、具体要求、约束条件、预期成果等信息。

### Q: 如何处理生成的代码不符合预期的情况？
A: 可以尝试以下方法：
1. 提供更详细的任务描述
2. 指定更适合的前端框架和模型
3. 调整任务的范围和目标
4. 多次运行命令，比较不同的结果
