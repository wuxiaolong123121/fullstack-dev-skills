# React Native 参考

> Reference for: fullstack-dev-skills
> Load when: 用户提及 React Native、新架构、Fabric、TurboModules、性能优化、移动端开发

## 核心特性

### 新架构（New Architecture）

React Native 0.76+ 默认启用新架构，包含 Fabric 渲染器和 TurboModules。

```typescript
import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable,
  requireNativeComponent,
  NativeModules
} from 'react-native';

/**
 * 原生模块接口定义
 * @description TurboModules 类型安全接口
 */
interface NativeStorageInterface {
  /**
   * 存储数据
   * @param key - 键名
   * @param value - 值
   * @returns Promise 表示操作完成
   */
  setItem(key: string, value: string): Promise<void>;
  
  /**
   * 获取数据
   * @param key - 键名
   * @returns Promise 包含存储的值
   */
  getItem(key: string): Promise<string | null>;
  
  /**
   * 删除数据
   * @param key - 键名
   * @returns Promise 表示操作完成
   */
  removeItem(key: string): Promise<void>;
}

/** TurboModule 实例 */
const NativeStorage = NativeModules.NativeStorage as NativeStorageInterface;
```

### Fabric 原生组件

```typescript
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';
import type { ViewProps } from 'react-native';

/**
 * 自定义地图组件属性
 * @description 定义 Fabric 组件的 Props 接口
 */
interface MapViewProps extends ViewProps {
  /** 地图中心纬度 */
  latitude: number;
  /** 地图中心经度 */
  longitude: number;
  /** 缩放级别 */
  zoom?: number;
  /** 地图点击事件 */
  onMapPress?: (event: { latitude: number; longitude: number }) => void;
  /** 标记点数据 */
  markers?: Array<{
    id: string;
    latitude: number;
    longitude: number;
    title: string;
  }>;
}

/** Fabric 原生组件注册 */
export const MapView = codegenNativeComponent<MapViewProps>('MapView');
```

### 性能优化模式

```typescript
import React, { 
  memo, 
  useCallback, 
  useMemo, 
  useState,
  useReducer,
  useRef,
  useEffect,
  useLayoutEffect
} from 'react';
import { 
  FlatList, 
  StyleSheet, 
  View, 
  Text,
  Pressable,
  InteractionManager,
  LayoutAnimation,
  UIManager
} from 'react-native';

/** 启用 Android 布局动画 */
if (UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

/**
 * 用户列表项组件
 * @description 使用 memo 优化重渲染
 */
const UserListItem = memo<{
  user: User;
  onPress: (user: User) => void;
}>(({ user, onPress }) => {
  const handlePress = useCallback(() => {
    onPress(user);
  }, [user, onPress]);

  return (
    <Pressable 
      style={styles.listItem}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`用户 ${user.name}`}
    >
      <Text style={styles.userName}>{user.name}</Text>
      <Text style={styles.userEmail}>{user.email}</Text>
    </Pressable>
  );
}, (prevProps, nextProps) => {
  /** 自定义比较函数 */
  return prevProps.user.id === nextProps.user.id;
});

UserListItem.displayName = 'UserListItem';

/**
 * 虚拟化列表组件
 * @description 高性能长列表实现
 */
export const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const pageRef = useRef(1);

  /**
   * 加载用户数据
   */
  const loadUsers = useCallback(async () => {
    if (loading) return;
    
    setLoading(true);
    try {
      const response = await fetchUsers(pageRef.current);
      
      /** 使用 InteractionManager 确保动画完成 */
      InteractionManager.runAfterInteractions(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setUsers(prev => [...prev, ...response.data]);
        pageRef.current += 1;
      });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  /**
   * 渲染列表项
   */
  const renderItem = useCallback(
    ({ item }: { item: User }) => (
      <UserListItem 
        user={item} 
        onPress={handleUserPress} 
      />
    ),
    []
  );

  /**
   * 提取唯一键
   */
  const keyExtractor = useCallback(
    (item: User) => item.id,
    []
  );

  /**
   * 计算列表项布局（固定高度优化）
   */
  const getItemLayout = useMemo(
    () => (_: any, index: number) => ({
      length: ITEM_HEIGHT,
      offset: ITEM_HEIGHT * index,
      index,
    }),
    []
  );

  return (
    <FlatList
      data={users}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      onEndReached={loadUsers}
      onEndReachedThreshold={0.5}
      initialNumToRender={10}
      maxToRenderPerBatch={5}
      windowSize={5}
      removeClippedSubviews={true}
      ListFooterComponent={loading ? <LoadingSpinner /> : null}
    />
  );
};
```

### 状态管理最佳实践

```typescript
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

/**
 * 用户状态接口
 */
interface UserState {
  /** 当前用户 */
  user: User | null;
  /** 认证令牌 */
  token: string | null;
  /** 是否已认证 */
  isAuthenticated: boolean;
  /** 登录操作 */
  login: (credentials: Credentials) => Promise<void>;
  /** 登出操作 */
  logout: () => void;
  /** 更新用户信息 */
  updateUser: (updates: Partial<User>) => void;
}

/**
 * 用户状态 Store
 * @description 使用 Zustand 管理全局用户状态
 */
export const useUserStore = create<UserState>()(
  subscribeWithSelector((set, get) => ({
    user: null,
    token: null,
    isAuthenticated: false,

    /**
     * 用户登录
     * @param credentials - 登录凭证
     */
    login: async (credentials) => {
      const response = await authApi.login(credentials);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
      });
    },

    /**
     * 用户登出
     */
    logout: () => {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
      });
    },

    /**
     * 更新用户信息
     * @param updates - 部分用户数据
     */
    updateUser: (updates) => {
      const { user } = get();
      if (user) {
        set({ user: { ...user, ...updates } });
      }
    },
  }))
);
```

## 最佳实践

### 手势处理

```typescript
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';

/**
 * 可拖拽卡片组件
 * @description 使用 Reanimated 和 Gesture Handler
 */
export const DraggableCard: React.FC<{ children: React.ReactNode }> = ({ 
  children 
}) => {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);

  /**
   * 处理拖拽结束
   */
  const handleDragEnd = useCallback(() => {
    'worklet';
    translateX.value = withSpring(0);
    translateY.value = withSpring(0);
    scale.value = withSpring(1);
  }, []);

  /** 平移手势 */
  const panGesture = Gesture.Pan()
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
    })
    .onEnd(() => {
      runOnJS(handleDragEnd)();
    });

  /** 点击手势 */
  const tapGesture = Gesture.Tap()
    .onBegin(() => {
      scale.value = withSpring(0.95);
    })
    .onFinalize(() => {
      scale.value = withSpring(1);
    });

  /** 组合手势 */
  const composedGesture = Gesture.Simultaneous(panGesture, tapGesture);

  /** 动画样式 */
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={composedGesture}>
      <Animated.View style={[styles.card, animatedStyle]}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
```

### 深度链接处理

```typescript
import { Linking } from 'react-native';
import { useURL } from 'expo-linking';

/**
 * 深度链接处理器
 * @description 处理应用内外部链接
 */
export const useDeepLink = () => {
  const url = useURL();
  const navigation = useNavigation();

  useEffect(() => {
    if (!url) return;

    /**
     * 解析并处理链接
     * @param deepLink - 深度链接 URL
     */
    const handleDeepLink = (deepLink: string) => {
      const parsedUrl = new URL(deepLink);
      const { pathname, searchParams } = parsedUrl;

      switch (pathname) {
        case '/user':
          const userId = searchParams.get('id');
          if (userId) {
            navigation.navigate('UserProfile', { userId });
          }
          break;
        case '/product':
          const productId = searchParams.get('id');
          if (productId) {
            navigation.navigate('ProductDetail', { productId });
          }
          break;
        default:
          console.warn('未知的深度链接:', pathname);
      }
    };

    handleDeepLink(url);
  }, [url, navigation]);

  /**
   * 处理应用启动时的初始链接
   */
  useEffect(() => {
    Linking.getInitialURL().then((initialUrl) => {
      if (initialUrl) {
        handleDeepLink(initialUrl);
      }
    });
  }, []);
};
```

## Quick Reference

| 特性 | 用途 | 示例 |
|------|------|------|
| `memo` | 组件记忆化 | `memo(Component, compareFn)` |
| `useCallback` | 函数缓存 | `useCallback(fn, deps)` |
| `useMemo` | 值缓存 | `useMemo(() => compute(), deps)` |
| `FlatList` | 虚拟化列表 | `<FlatList data={items} renderItem={renderItem} />` |
| `getItemLayout` | 固定高度优化 | `getItemLayout={(_, i) => ({ length: 50, offset: 50 * i, index: i })}` |
| `InteractionManager` | 延迟执行 | `InteractionManager.runAfterInteractions(fn)` |
| `LayoutAnimation` | 布局动画 | `LayoutAnimation.configureNext(config)` |
| `Gesture.Pan` | 平移手势 | `Gesture.Pan().onUpdate(fn)` |
| `useSharedValue` | 共享动画值 | `const x = useSharedValue(0)` |
| `useAnimatedStyle` | 动画样式 | `useAnimatedStyle(() => ({ transform: [...] }))` |
| `withSpring` | 弹簧动画 | `withSpring(0, { damping: 15 })` |
| `runOnJS` | 工作线程调用 JS | `runOnJS(callback)()` |
| `codegenNativeComponent` | Fabric 组件 | `codegenNativeComponent<Props>('Name')` |
| `NativeModules` | 原生模块访问 | `NativeModules.ModuleName.method()` |
