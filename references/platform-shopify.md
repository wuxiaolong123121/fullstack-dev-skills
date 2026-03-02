# Shopify Expert 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Shopify 开发、Liquid 模板、Storefront API、Checkout 扩展、Shopify 应用开发相关任务

## 核心特性

Shopify 是全球领先的电商平台，提供完整的电商解决方案：

- **Liquid**：Shopify 的模板语言，用于主题开发
- **Storefront API**：GraphQL API，用于构建自定义店面
- **Checkout 扩展**：自定义结账流程体验
- **Shopify App**：扩展平台功能的应用开发
- **Theme Development**：主题开发与定制
- **Webhooks & API**：事件通知与数据集成

## 最佳实践

### Liquid 模板示例

```liquid
{%- comment -%}
  产品卡片组件
  显示产品图片、标题、价格和添加到购物车按钮
{%- endcomment -%}

<div class="product-card" data-product-id="{{ product.id }}">
  <a href="{{ product.url }}" class="product-card__link">
    {%- if product.featured_image -%}
      <img 
        src="{{ product.featured_image | image_url: width: 400 }}"
        alt="{{ product.featured_image.alt | escape }}"
        loading="lazy"
        class="product-card__image"
        width="400"
        height="400"
      >
    {%- else -%}
      <div class="product-card__placeholder">
        {{ 'product-1' | placeholder_svg_tag }}
      </div>
    {%- endif -%}
  </a>
  
  <div class="product-card__info">
    <h3 class="product-card__title">
      <a href="{{ product.url }}">{{ product.title }}</a>
    </h3>
    
    <div class="product-card__price">
      {%- if product.compare_at_price > product.price -%}
        <span class="product-card__price--sale">
          {{ product.price | money }}
        </span>
        <span class="product-card__price--compare">
          {{ product.compare_at_price | money }}
        </span>
      {%- else -%}
        <span class="product-card__price--regular">
          {{ product.price | money }}
        </span>
      {%- endif -%}
    </div>
    
    {%- form 'product', product, class: 'product-card__form' -%}
      <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
      <button type="submit" class="product-card__button" {%- unless product.available -%}disabled{%- endunless -%}>
        {%- if product.available -%}
          {{ 'products.product.add_to_cart' | t }}
        {%- else -%}
          {{ 'products.product.sold_out' | t }}
        {%- endif -%}
      </button>
    {%- endform -%}
  </div>
</div>

{% schema %}
{
  "name": "产品卡片",
  "settings": [
    {
      "type": "checkbox",
      "id": "show_compare_price",
      "label": "显示对比价格",
      "default": true
    }
  ],
  "presets": [{ "name": "产品卡片" }]
}
{% endschema %}
```

### Storefront API GraphQL 查询

```javascript
/**
 * Shopify Storefront API 客户端
 * 提供 GraphQL 查询方法
 */

/**
 * 获取产品列表查询
 */
const GET_PRODUCTS_QUERY = `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      edges {
        node {
          id
          title
          handle
          description
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          images(first: 1) {
            edges {
              node {
                url
                altText
              }
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

/**
 * 创建购物车变更
 */
const CREATE_CART_MUTATION = `
  mutation CreateCart($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price { amount currencyCode }
                  product { title }
                }
              }
            }
          }
        }
        cost {
          totalAmount { amount currencyCode }
        }
      }
      userErrors { field message }
    }
  }
`;

/**
 * Shopify Storefront 客户端类
 */
class ShopifyStorefrontClient {
  /**
   * 构造函数
   * @param {Object} config - 配置对象
   * @param {string} config.storeDomain - 商店域名
   * @param {string} config.storefrontToken - Storefront API Token
   */
  constructor(config) {
    this.storeDomain = config.storeDomain;
    this.storefrontToken = config.storefrontToken;
    this.apiVersion = '2024-01';
  }

  /**
   * 执行 GraphQL 查询
   * @param {string} query - GraphQL 查询字符串
   * @param {Object} variables - 查询变量
   * @returns {Promise<Object>} 查询结果
   */
  async request(query, variables = {}) {
    const response = await fetch(
      `https://${this.storeDomain}/api/${this.apiVersion}/graphql.json`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken,
        },
        body: JSON.stringify({ query, variables }),
      }
    );
    const result = await response.json();
    if (result.errors) {
      throw new Error(result.errors[0].message);
    }
    return result.data;
  }

  /**
   * 获取产品列表
   * @param {number} limit - 获取数量
   * @param {string} cursor - 分页游标
   * @returns {Promise<Object>} 产品列表
   */
  async getProducts(limit = 20, cursor = null) {
    return this.request(GET_PRODUCTS_QUERY, { first: limit, after: cursor });
  }

  /**
   * 创建购物车
   * @param {Array} lines - 购物车商品行
   * @returns {Promise<Object>} 创建的购物车
   */
  async createCart(lines = []) {
    return this.request(CREATE_CART_MUTATION, { input: { lines } });
  }
}

export { ShopifyStorefrontClient };
```

### Checkout 扩展示例

```javascript
/**
 * Shopify Checkout 扩展
 * 在结账页面添加自定义功能
 */
import { Extension, Banner } from '@shopify/ui-extensions/checkout';

/**
 * 结账扩展入口点
 * @param {Object} extensionPoint - 扩展点API
 */
Extension.register('Checkout::Dynamic::Render', (extensionPoint) => {
  const { cost, settings } = extensionPoint;

  extensionPoint.render(() => {
    const subtotal = cost.subtotalAmount.current;
    const freeShippingThreshold = settings.get('freeShippingThreshold');
    const remainingAmount = freeShippingThreshold - subtotal.amount;

    if (remainingAmount > 0) {
      return (
        <Banner title="免运费提示" status="info">
          再购买 {formatCurrency(remainingAmount, subtotal.currencyCode)} 即可享受免运费！
        </Banner>
      );
    }
    return (
      <Banner title="恭喜！" status="success">
        您已获得免运费优惠！
      </Banner>
    );
  });
});

/**
 * 格式化货币金额
 * @param {number} amount - 金额
 * @param {string} currency - 货币代码
 * @returns {string} 格式化后的金额
 */
function formatCurrency(amount, currency) {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|-----|------|------|
| `{{ product.title }}` | 输出产品标题 | `{{ product.title \| escape }}` |
| `{% for %}` | 循环遍历 | `{% for product in collection.products %}` |
| `{% if %}` | 条件判断 | `{% if product.available %}...{% endif %}` |
| `\| money` | 货币格式化 | `{{ product.price \| money }}` |
| `\| image_url` | 图片URL生成 | `{{ image \| image_url: width: 400 }}` |
| `{% form 'product' %}` | 产品表单 | `{% form 'product', product %}...{% endform %}` |
| `{% schema %}` | 区块配置 | `{% schema %}{"name": "区块名"}{% endschema %}` |
| `product.selected_variant` | 当前选中变体 | `{{ product.selected_variant.price }}` |
| `cart.item_count` | 购物车商品数 | `{% if cart.item_count > 0 %}` |

## Liquid 过滤器速查

| 过滤器 | 用途 | 示例 |
|-------|------|------|
| `abs` | 绝对值 | `{{ -17 \| abs }}` → 17 |
| `append` | 追加字符串 | `{{ 'hello' \| append: ' world' }}` |
| `capitalize` | 首字母大写 | `{{ 'hello' \| capitalize }}` |
| `date` | 日期格式化 | `{{ now \| date: '%Y-%m-%d' }}` |
| `default` | 默认值 | `{{ product.price \| default: 0 }}` |
| `divided_by` | 除法 | `{{ 10 \| divided_by: 2 }}` |
| `downcase` | 转小写 | `{{ 'HELLO' \| downcase }}` |
| `escape` | HTML转义 | `{{ content \| escape }}` |
| `first` | 获取首个元素 | `{{ array \| first }}` |
| `join` | 数组连接 | `{{ tags \| join: ', ' }}` |
| `last` | 获取最后元素 | `{{ array \| last }}` |
| `map` | 映射属性 | `{{ products \| map: 'title' }}` |
| `minus` | 减法 | `{{ 10 \| minus: 3 }}` |
| `plus` | 加法 | `{{ 10 \| plus: 5 }}` |
| `remove` | 移除字符串 | `{{ 'hello' \| remove: 'l' }}` |
| `replace` | 替换字符串 | `{{ 'hello' \| replace: 'l', 'L' }}` |
| `size` | 获取长度 | `{{ array \| size }}` |
| `slice` | 切片 | `{{ 'hello' \| slice: 0, 3 }}` |
| `sort` | 排序 | `{{ products \| sort: 'price' }}` |
| `split` | 分割字符串 | `{{ 'a,b,c' \| split: ',' }}` |
| `strip` | 去除空白 | `{{ ' hello ' \| strip }}` |
| `times` | 乘法 | `{{ 5 \| times: 3 }}` |
| `truncate` | 截断 | `{{ text \| truncate: 50 }}` |
| `uniq` | 去重 | `{{ array \| uniq }}` |
| `upcase` | 转大写 | `{{ 'hello' \| upcase }}` |
| `where` | 条件过滤 | `{{ products \| where: 'available', true }}` |
