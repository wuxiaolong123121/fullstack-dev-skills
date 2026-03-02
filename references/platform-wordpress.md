# WordPress Pro 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 WordPress 开发、主题开发、插件开发、Gutenberg 区块、WooCommerce 相关任务

## 核心特性

WordPress 是全球使用最广泛的内容管理系统：

- **主题开发**：自定义网站外观和布局
- **插件开发**：扩展 WordPress 核心功能
- **Gutenberg 区块**：现代可视化编辑器区块
- **REST API**：无头 CMS 和第三方集成
- **WooCommerce**：电商功能扩展
- **Hook 系统**：Actions 和 Filters 实现扩展性

## 最佳实践

### 主题开发示例

```php
<?php
/**
 * 主题设置类
 * 提供主题初始化和配置功能
 */
class ThemeSetup {
    
    /**
     * 初始化主题
     * 注册所有必要的钩子和功能
     */
    public static function init() {
        add_action('after_setup_theme', [__CLASS__, 'setupTheme']);
        add_action('wp_enqueue_scripts', [__CLASS__, 'enqueueAssets']);
        add_action('widgets_init', [__CLASS__, 'registerSidebars']);
    }
    
    /**
     * 主题基础设置
     * 启用主题支持功能
     */
    public static function setupTheme() {
        add_theme_support('title-tag');
        add_theme_support('post-thumbnails');
        add_theme_support('html5', [
            'search-form',
            'comment-form',
            'comment-list',
            'gallery',
            'caption'
        ]);
        add_theme_support('custom-logo', [
            'height'      => 100,
            'width'       => 400,
            'flex-height' => true,
            'flex-width'  => true,
        ]);
        
        register_nav_menus([
            'primary'   => __('主导航菜单', 'theme-textdomain'),
            'footer'    => __('页脚菜单', 'theme-textdomain'),
            'social'    => __('社交链接菜单', 'theme-textdomain'),
        ]);
    }
    
    /**
     * 加载前端资源
     * 注册并引入 CSS 和 JavaScript 文件
     */
    public static function enqueueAssets() {
        $version = wp_get_theme()->get('Version');
        
        wp_enqueue_style(
            'theme-main',
            get_template_directory_uri() . '/assets/css/main.css',
            [],
            $version
        );
        
        wp_enqueue_script(
            'theme-main',
            get_template_directory_uri() . '/assets/js/main.js',
            [],
            $version,
            true
        );
        
        wp_localize_script('theme-main', 'themeData', [
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce'   => wp_create_nonce('theme_nonce'),
        ]);
    }
    
    /**
     * 注册侧边栏
     * 创建小工具区域
     */
    public static function registerSidebars() {
        register_sidebar([
            'name'          => __('主侧边栏', 'theme-textdomain'),
            'id'            => 'sidebar-main',
            'description'   => __('主侧边栏小工具区域', 'theme-textdomain'),
            'before_widget' => '<section id="%1$s" class="widget %2$s">',
            'after_widget'  => '</section>',
            'before_title'  => '<h3 class="widget-title">',
            'after_title'   => '</h3>',
        ]);
    }
}

ThemeSetup::init();
```

### 插件开发示例

```php
<?php
/**
 * Plugin Name: 自定义文章推荐
 * Description: 基于标签的文章推荐功能
 * Version: 1.0.0
 */

if (!defined('ABSPATH')) {
    exit;
}

/**
 * 文章推荐类
 * 提供相关文章推荐功能
 */
class RelatedPosts {
    
    /**
     * 构造函数
     * 初始化插件钩子
     */
    public function __construct() {
        add_filter('the_content', [$this, 'appendRelatedPosts']);
        add_shortcode('related_posts', [$this, 'renderShortcode']);
    }
    
    /**
     * 获取相关文章
     * 基于标签匹配相关文章
     * 
     * @param int $postId 当前文章ID
     * @param int $count 返回数量
     * @return WP_Post[] 相关文章数组
     */
    public function getRelatedPosts($postId, $count = 4) {
        $tags = wp_get_post_tags($postId, ['fields' => 'ids']);
        
        if (empty($tags)) {
            return [];
        }
        
        $args = [
            'post_type'      => 'post',
            'post_status'    => 'publish',
            'post__not_in'   => [$postId],
            'posts_per_page' => $count,
            'tax_query'      => [
                [
                    'taxonomy' => 'post_tag',
                    'field'    => 'term_id',
                    'terms'    => $tags,
                ],
            ],
        ];
        
        return get_posts($args);
    }
    
    /**
     * 在文章内容后追加相关文章
     * 
     * @param string $content 文章内容
     * @return string 处理后的内容
     */
    public function appendRelatedPosts($content) {
        if (!is_single()) {
            return $content;
        }
        
        $relatedPosts = $this->getRelatedPosts(get_the_ID());
        
        if (empty($relatedPosts)) {
            return $content;
        }
        
        $html = '<div class="related-posts">';
        $html .= '<h3>' . __('相关文章', 'related-posts') . '</h3>';
        $html .= '<ul>';
        
        foreach ($relatedPosts as $post) {
            $html .= sprintf(
                '<li><a href="%s">%s</a></li>',
                get_permalink($post->ID),
                esc_html($post->post_title)
            );
        }
        
        $html .= '</ul></div>';
        
        return $content . $html;
    }
    
    /**
     * 渲染短代码
     * 
     * @param array $atts 短代码属性
     * @return string 渲染的HTML
     */
    public function renderShortcode($atts) {
        $atts = shortcode_atts([
            'count' => 4,
        ], $atts);
        
        $relatedPosts = $this->getRelatedPosts(get_the_ID(), (int) $atts['count']);
        
        if (empty($relatedPosts)) {
            return '';
        }
        
        ob_start();
        include plugin_dir_path(__FILE__) . 'templates/related-posts.php';
        return ob_get_clean();
    }
}

new RelatedPosts();
```

### Gutenberg 区块开发示例

```javascript
/**
 * 自定义卡片区块
 * 显示带图片、标题和描述的卡片组件
 */
import { registerBlockType } from '@wordpress/blocks';
import { useSelect } from '@wordpress/data';
import {
    MediaUpload,
    MediaUploadCheck,
    RichText,
    InspectorControls,
} from '@wordpress/block-editor';
import {
    PanelBody,
    TextControl,
    SelectControl,
    Button,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * 注册区块
 */
registerBlockType('custom/card', {
    title: __('自定义卡片', 'custom-blocks'),
    icon: 'index-card',
    category: 'common',
    attributes: {
        title: {
            type: 'string',
            default: '',
        },
        description: {
            type: 'string',
            default: '',
        },
        imageUrl: {
            type: 'string',
            default: '',
        },
        imageId: {
            type: 'number',
            default: 0,
        },
        linkUrl: {
            type: 'string',
            default: '',
        },
        style: {
            type: 'string',
            default: 'default',
        },
    },

    /**
     * 编辑组件
     * @param {Object} props - 组件属性
     * @returns {JSX.Element} 编辑界面
     */
    edit: (props) => {
        const { attributes, setAttributes } = props;
        const { title, description, imageUrl, imageId, linkUrl, style } = attributes;

        /**
         * 选择图片处理函数
         * @param {Object} media - 选中的媒体对象
         */
        const onSelectImage = (media) => {
            setAttributes({
                imageUrl: media.url,
                imageId: media.id,
            });
        };

        /**
         * 移除图片处理函数
         */
        const onRemoveImage = () => {
            setAttributes({
                imageUrl: '',
                imageId: 0,
            });
        };

        return (
            <>
                <InspectorControls>
                    <PanelBody title={__('卡片设置', 'custom-blocks')}>
                        <TextControl
                            label={__('链接地址', 'custom-blocks')}
                            value={linkUrl}
                            onChange={(value) => setAttributes({ linkUrl: value })}
                        />
                        <SelectControl
                            label={__('样式', 'custom-blocks')}
                            value={style}
                            options={[
                                { label: __('默认', 'custom-blocks'), value: 'default' },
                                { label: __('突出', 'custom-blocks'), value: 'featured' },
                                { label: __('简洁', 'custom-blocks'), value: 'minimal' },
                            ]}
                            onChange={(value) => setAttributes({ style: value })}
                        />
                    </PanelBody>
                </InspectorControls>

                <div className={`custom-card custom-card--${style}`}>
                    <MediaUploadCheck>
                        <MediaUpload
                            onSelect={onSelectImage}
                            allowedTypes={['image']}
                            value={imageId}
                            render={({ open }) => (
                                <div className="custom-card__image">
                                    {imageUrl ? (
                                        <>
                                            <img src={imageUrl} alt={title} />
                                            <Button
                                                isDestructive
                                                onClick={onRemoveImage}
                                            >
                                                {__('移除图片', 'custom-blocks')}
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={open}>
                                            {__('选择图片', 'custom-blocks')}
                                        </Button>
                                    )}
                                </div>
                            )}
                        />
                    </MediaUploadCheck>

                    <RichText
                        tagName="h3"
                        className="custom-card__title"
                        value={title}
                        onChange={(value) => setAttributes({ title: value })}
                        placeholder={__('输入标题...', 'custom-blocks')}
                    />

                    <RichText
                        tagName="p"
                        className="custom-card__description"
                        value={description}
                        onChange={(value) => setAttributes({ description: value })}
                        placeholder={__('输入描述...', 'custom-blocks')}
                    />
                </div>
            </>
        );
    },

    /**
     * 保存组件
     * @param {Object} props - 组件属性
     * @returns {JSX.Element} 前端渲染
     */
    save: (props) => {
        const { attributes } = props;
        const { title, description, imageUrl, linkUrl, style } = attributes;

        const CardWrapper = linkUrl ? 'a' : 'div';
        const wrapperProps = linkUrl
            ? { href: linkUrl, className: `custom-card custom-card--${style}` }
            : { className: `custom-card custom-card--${style}` };

        return (
            <CardWrapper {...wrapperProps}>
                {imageUrl && (
                    <div className="custom-card__image">
                        <img src={imageUrl} alt={title} />
                    </div>
                )}
                <div className="custom-card__content">
                    <RichText.Content
                        tagName="h3"
                        className="custom-card__title"
                        value={title}
                    />
                    <RichText.Content
                        tagName="p"
                        className="custom-card__description"
                        value={description}
                    />
                </div>
            </CardWrapper>
        );
    },
});
```

### WooCommerce 扩展示例

```php
<?php
/**
 * WooCommerce 自定义功能类
 * 扩展电商功能
 */
class WooCommerceCustom {
    
    /**
     * 初始化
     * 注册 WooCommerce 钩子
     */
    public static function init() {
        add_action('woocommerce_before_single_product', [__CLASS__, 'addCustomBadge']);
        add_filter('woocommerce_product_data_tabs', [__CLASS__, 'addProductTab']);
        add_action('woocommerce_product_data_panels', [__CLASS__, 'renderProductTabPanel']);
        add_action('woocommerce_process_product_meta', [__CLASS__, 'saveProductMeta']);
        add_filter('woocommerce_get_price_html', [__CLASS__, 'modifyPriceDisplay'], 10, 2);
    }
    
    /**
     * 添加自定义徽章
     * 在产品页面显示促销徽章
     */
    public static function addCustomBadge() {
        global $product;
        
        $badgeText = get_post_meta($product->get_id(), '_custom_badge_text', true);
        
        if ($badgeText) {
            echo sprintf(
                '<span class="custom-badge">%s</span>',
                esc_html($badgeText)
            );
        }
    }
    
    /**
     * 添加产品数据标签页
     * 
     * @param array $tabs 现有标签页
     * @return array 修改后的标签页
     */
    public static function addProductTab($tabs) {
        $tabs['custom_options'] = [
            'label'    => __('自定义选项', 'wc-custom'),
            'target'   => 'custom_product_options',
            'class'    => ['show_if_simple', 'show_if_variable'],
            'priority' => 80,
        ];
        return $tabs;
    }
    
    /**
     * 渲染产品标签页面板
     */
    public static function renderProductTabPanel() {
        global $post;
        
        $badgeText = get_post_meta($post->ID, '_custom_badge_text', true);
        $minQty = get_post_meta($post->ID, '_custom_min_quantity', true);
        ?>
        <div id="custom_product_options" class="panel woocommerce_options_panel">
            <div class="options_group">
                <?php
                woocommerce_wp_text_input([
                    'id'          => '_custom_badge_text',
                    'label'       => __('徽章文字', 'wc-custom'),
                    'placeholder' => __('如: 新品上市', 'wc-custom'),
                    'value'       => $badgeText,
                ]);
                
                woocommerce_wp_text_input([
                    'id'          => '_custom_min_quantity',
                    'label'       => __('最小购买数量', 'wc-custom'),
                    'type'        => 'number',
                    'custom_attributes' => [
                        'step' => '1',
                        'min'  => '1',
                    ],
                    'value'       => $minQty ? $minQty : 1,
                ]);
                ?>
            </div>
        </div>
        <?php
    }
    
    /**
     * 保存产品元数据
     * 
     * @param int $postId 产品ID
     */
    public static function saveProductMeta($postId) {
        $badgeText = isset($_POST['_custom_badge_text'])
            ? sanitize_text_field($_POST['_custom_badge_text'])
            : '';
        update_post_meta($postId, '_custom_badge_text', $badgeText);
        
        $minQty = isset($_POST['_custom_min_quantity'])
            ? absint($_POST['_custom_min_quantity'])
            : 1;
        update_post_meta($postId, '_custom_min_quantity', $minQty);
    }
    
    /**
     * 修改价格显示
     * 
     * @param string $price 价格HTML
     * @param WC_Product $product 产品对象
     * @return string 修改后的价格HTML
     */
    public static function modifyPriceDisplay($price, $product) {
        $minQty = get_post_meta($product->get_id(), '_custom_min_quantity', true);
        
        if ($minQty && $minQty > 1) {
            $price .= sprintf(
                ' <small class="min-quantity-note">(%s: %d)</small>',
                __('起购数量', 'wc-custom'),
                $minQty
            );
        }
        
        return $price;
    }
}

WooCommerceCustom::init();
```

## Quick Reference

| 特性 | 用途 | 示例 |
|-----|------|------|
| `add_action()` | 注册动作钩子 | `add_action('init', 'my_function')` |
| `add_filter()` | 注册过滤器钩子 | `add_filter('the_content', 'modify_content')` |
| `get_template_part()` | 加载模板片段 | `get_template_part('template-parts/header')` |
| `wp_enqueue_style()` | 加载样式表 | `wp_enqueue_style('style', get_stylesheet_uri())` |
| `wp_enqueue_script()` | 加载脚本 | `wp_enqueue_script('script', $src, [], '1.0', true)` |
| `register_post_type()` | 注册自定义文章类型 | `register_post_type('product', $args)` |
| `register_taxonomy()` | 注册自定义分类法 | `register_taxonomy('category', ['post'], $args)` |
| `get_post_meta()` | 获取文章元数据 | `get_post_meta($post_id, 'key', true)` |
| `update_post_meta()` | 更新文章元数据 | `update_post_meta($post_id, 'key', $value)` |
| `WP_Query` | 自定义查询 | `new WP_Query(['post_type' => 'product'])` |

## 常用钩子速查

| 钩子 | 类型 | 用途 |
|-----|------|------|
| `init` | Action | 初始化，注册文章类型/分类法 |
| `wp_enqueue_scripts` | Action | 加载前端资源 |
| `admin_enqueue_scripts` | Action | 加载后台资源 |
| `after_setup_theme` | Action | 主题功能设置 |
| `widgets_init` | Action | 注册小工具区域 |
| `the_content` | Filter | 修改文章内容 |
| `the_title` | Filter | 修改文章标题 |
| `wp_title` | Filter | 修改页面标题 |
| `excerpt_length` | Filter | 修改摘要长度 |
| `excerpt_more` | Filter | 修改摘要结尾 |
| `body_class` | Filter | 添加 body CSS 类 |
| `post_class` | Filter | 添加文章 CSS 类 |
| `wp_nav_menu_args` | Filter | 修改菜单参数 |
| `woocommerce_product_query` | Filter | 修改 WooCommerce 查询 |
