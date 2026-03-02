# Game Developer 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求游戏开发、游戏引擎、图形渲染、物理模拟、ECS 架构相关任务

## 核心特性

游戏开发是技术与创意结合的专业领域：

- **游戏引擎**：Unity、Unreal Engine、Godot
- **图形渲染**：OpenGL、DirectX、Vulkan、WebGL
- **物理引擎**：Box2D、PhysX、Bullet
- **ECS 架构**：实体-组件-系统设计模式
- **游戏循环**：帧更新、固定时间步长
- **资源管理**：纹理、模型、音频加载与缓存

## 最佳实践

### ECS 架构实现

```typescript
/**
 * ECS 核心模块
 * 实现实体-组件-系统架构
 */

/**
 * 组件基类
 * 所有组件必须继承此类
 */
abstract class Component {
    /** 组件所属实体 */
    public entity: Entity | null = null;

    /**
     * 组件初始化
     */
    public onInit(): void {}

    /**
     * 组件销毁
     */
    public onDestroy(): void {}
}

/**
 * 实体类
 * 代表游戏中的一个对象
 */
class Entity {
    /** 实体唯一ID */
    public readonly id: number;

    /** 实体名称 */
    public name: string;

    /** 组件映射表 */
    private components: Map<Function, Component> = new Map();

    /** 是否激活 */
    public active: boolean = true;

    /** 静态ID计数器 */
    private static nextId: number = 0;

    /**
     * 构造函数
     * @param name 实体名称
     */
    constructor(name: string = 'Entity') {
        this.id = Entity.nextId++;
        this.name = name;
    }

    /**
     * 添加组件
     * @param componentClass 组件类
     * @param args 组件构造参数
     * @returns 添加的组件实例
     */
    public addComponent<T extends Component>(
        componentClass: new (...args: any[]) => T,
        ...args: any[]
    ): T {
        if (this.hasComponent(componentClass)) {
            console.warn(`实体 ${this.name} 已拥有组件 ${componentClass.name}`);
            return this.getComponent(componentClass)!;
        }

        const component = new componentClass(...args);
        component.entity = this;
        component.onInit();
        this.components.set(componentClass, component);

        return component;
    }

    /**
     * 获取组件
     * @param componentClass 组件类
     * @returns 组件实例或 undefined
     */
    public getComponent<T extends Component>(
        componentClass: new (...args: any[]) => T
    ): T | undefined {
        return this.components.get(componentClass) as T | undefined;
    }

    /**
     * 检查是否拥有组件
     * @param componentClass 组件类
     * @returns 是否拥有
     */
    public hasComponent<T extends Component>(
        componentClass: new (...args: any[]) => T
    ): boolean {
        return this.components.has(componentClass);
    }

    /**
     * 移除组件
     * @param componentClass 组件类
     */
    public removeComponent<T extends Component>(
        componentClass: new (...args: any[]) => T
    ): void {
        const component = this.components.get(componentClass);
        if (component) {
            component.onDestroy();
            component.entity = null;
            this.components.delete(componentClass);
        }
    }

    /**
     * 销毁实体
     */
    public destroy(): void {
        this.components.forEach((component) => {
            component.onDestroy();
            component.entity = null;
        });
        this.components.clear();
        this.active = false;
    }
}

/**
 * 系统基类
 * 所有系统必须继承此类
 */
abstract class System {
    /** 系统优先级 */
    public priority: number = 0;

    /** 所需组件类型 */
    protected requiredComponents: Function[] = [];

    /**
     * 系统更新
     * @param deltaTime 帧间隔时间
     * @param entities 实体列表
     */
    public abstract update(deltaTime: number, entities: Entity[]): void;

    /**
     * 过滤符合条件的实体
     * @param entities 实体列表
     * @returns 符合条件的实体
     */
    protected filterEntities(entities: Entity[]): Entity[] {
        return entities.filter((entity) => {
            if (!entity.active) return false;
            return this.requiredComponents.every((comp) => entity.hasComponent(comp as any));
        });
    }
}

/**
 * 世界类
 * 管理所有实体和系统
 */
class World {
    /** 实体列表 */
    private entities: Entity[] = [];

    /** 系统列表 */
    private systems: System[] = [];

    /** 待添加实体队列 */
    private pendingAddEntities: Entity[] = [];

    /** 待移除实体队列 */
    private pendingRemoveEntities: Entity[] = [];

    /**
     * 创建实体
     * @param name 实体名称
     * @returns 创建的实体
     */
    public createEntity(name: string = 'Entity'): Entity {
        const entity = new Entity(name);
        this.pendingAddEntities.push(entity);
        return entity;
    }

    /**
     * 销毁实体
     * @param entity 要销毁的实体
     */
    public destroyEntity(entity: Entity): void {
        this.pendingRemoveEntities.push(entity);
    }

    /**
     * 添加系统
     * @param system 系统实例
     */
    public addSystem(system: System): void {
        this.systems.push(system);
        this.systems.sort((a, b) => a.priority - b.priority);
    }

    /**
     * 移除系统
     * @param systemClass 系统类
     */
    public removeSystem<T extends System>(systemClass: new (...args: any[]) => T): void {
        const index = this.systems.findIndex((s) => s instanceof systemClass);
        if (index !== -1) {
            this.systems.splice(index, 1);
        }
    }

    /**
     * 更新世界
     * @param deltaTime 帧间隔时间
     */
    public update(deltaTime: number): void {
        this.processPendingEntities();

        for (const system of this.systems) {
            system.update(deltaTime, this.entities);
        }
    }

    /**
     * 处理待处理实体
     */
    private processPendingEntities(): void {
        for (const entity of this.pendingAddEntities) {
            this.entities.push(entity);
        }
        this.pendingAddEntities = [];

        for (const entity of this.pendingRemoveEntities) {
            const index = this.entities.indexOf(entity);
            if (index !== -1) {
                this.entities.splice(index, 1);
                entity.destroy();
            }
        }
        this.pendingRemoveEntities = [];
    }

    /**
     * 获取所有实体
     * @returns 实体列表
     */
    public getEntities(): Entity[] {
        return [...this.entities];
    }
}

export { Component, Entity, System, World };
```

### 游戏组件示例

```typescript
/**
 * 游戏常用组件定义
 */

/**
 * 变换组件
 * 存储实体的位置、旋转、缩放
 */
class TransformComponent extends Component {
    /** 位置X */
    public x: number = 0;

    /** 位置Y */
    public y: number = 0;

    /** 旋转角度（弧度） */
    public rotation: number = 0;

    /** 缩放X */
    public scaleX: number = 1;

    /** 缩放Y */
    public scaleY: number = 1;

    /**
     * 设置位置
     * @param x X坐标
     * @param y Y坐标
     */
    public setPosition(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    /**
     * 设置缩放
     * @param scale 统一缩放值
     */
    public setScale(scale: number): void {
        this.scaleX = scale;
        this.scaleY = scale;
    }
}

/**
 * 速度组件
 * 存储实体的速度信息
 */
class VelocityComponent extends Component {
    /** X方向速度 */
    public vx: number = 0;

    /** Y方向速度 */
    public vy: number = 0;

    /** 最大速度 */
    public maxSpeed: number = 100;

    /**
     * 设置速度
     * @param vx X方向速度
     * @param vy Y方向速度
     */
    public setVelocity(vx: number, vy: number): void {
        const speed = Math.sqrt(vx * vx + vy * vy);
        if (speed > this.maxSpeed) {
            const ratio = this.maxSpeed / speed;
            this.vx = vx * ratio;
            this.vy = vy * ratio;
        } else {
            this.vx = vx;
            this.vy = vy;
        }
    }

    /**
     * 获取速度大小
     * @returns 速度值
     */
    public getSpeed(): number {
        return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    }
}

/**
 * 精灵渲染组件
 * 存储实体的渲染信息
 */
class SpriteComponent extends Component {
    /** 精灵图片 */
    public image: HTMLImageElement | null = null;

    /** 图片路径 */
    public imagePath: string = '';

    /** 宽度 */
    public width: number = 32;

    /** 高度 */
    public height: number = 32;

    /** 渲染层级 */
    public zIndex: number = 0;

    /** 是否可见 */
    public visible: boolean = true;

    /** 透明度 */
    public alpha: number = 1;

    /**
     * 设置精灵图片
     * @param path 图片路径
     */
    public async setImage(path: string): Promise<void> {
        this.imagePath = path;
        this.image = await this.loadImage(path);
    }

    /**
     * 加载图片
     * @param path 图片路径
     * @returns 图片元素
     */
    private loadImage(path: string): Promise<HTMLImageElement> {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = path;
        });
    }
}

/**
 * 碰撞体组件
 * 存储实体的碰撞信息
 */
class ColliderComponent extends Component {
    /** 碰撞体类型 */
    public type: 'rectangle' | 'circle' = 'rectangle';

    /** 碰撞体宽度 */
    public width: number = 32;

    /** 碰撞体高度 */
    public height: number = 32;

    /** 碰撞体半径（圆形） */
    public radius: number = 16;

    /** 偏移X */
    public offsetX: number = 0;

    /** 偏移Y */
    public offsetY: number = 0;

    /** 是否为触发器 */
    public isTrigger: boolean = false;

    /** 碰撞层 */
    public layer: number = 0;

    /**
     * 获取碰撞边界
     * @param transform 变换组件
     * @returns 边界对象
     */
    public getBounds(transform: TransformComponent): { left: number; top: number; right: number; bottom: number } {
        if (this.type === 'rectangle') {
            return {
                left: transform.x - this.width / 2 + this.offsetX,
                top: transform.y - this.height / 2 + this.offsetY,
                right: transform.x + this.width / 2 + this.offsetX,
                bottom: transform.y + this.height / 2 + this.offsetY,
            };
        }
        return {
            left: transform.x - this.radius + this.offsetX,
            top: transform.y - this.radius + this.offsetY,
            right: transform.x + this.radius + this.offsetX,
            bottom: transform.y + this.radius + this.offsetY,
        };
    }
}

/**
 * 动画组件
 * 存储实体的动画状态
 */
class AnimationComponent extends Component {
    /** 动画帧列表 */
    public frames: string[] = [];

    /** 当前帧索引 */
    public currentFrame: number = 0;

    /** 帧间隔时间（毫秒） */
    public frameInterval: number = 100;

    /** 累计时间 */
    private elapsedTime: number = 0;

    /** 是否循环播放 */
    public loop: boolean = true;

    /** 是否播放中 */
    public playing: boolean = true;

    /**
     * 更新动画
     * @param deltaTime 帧间隔时间（秒）
     * @returns 当前帧图片路径
     */
    public update(deltaTime: number): string {
        if (!this.playing || this.frames.length === 0) {
            return this.frames[this.currentFrame] || '';
        }

        this.elapsedTime += deltaTime * 1000;

        if (this.elapsedTime >= this.frameInterval) {
            this.elapsedTime = 0;
            this.currentFrame++;

            if (this.currentFrame >= this.frames.length) {
                if (this.loop) {
                    this.currentFrame = 0;
                } else {
                    this.currentFrame = this.frames.length - 1;
                    this.playing = false;
                }
            }
        }

        return this.frames[this.currentFrame];
    }

    /**
     * 播放动画
     * @param frames 动画帧列表
     * @param frameInterval 帧间隔
     * @param loop 是否循环
     */
    public play(frames: string[], frameInterval: number = 100, loop: boolean = true): void {
        this.frames = frames;
        this.frameInterval = frameInterval;
        this.loop = loop;
        this.currentFrame = 0;
        this.elapsedTime = 0;
        this.playing = true;
    }
}

export {
    TransformComponent,
    VelocityComponent,
    SpriteComponent,
    ColliderComponent,
    AnimationComponent,
};
```

### 游戏系统示例

```typescript
/**
 * 游戏系统实现
 */

/**
 * 移动系统
 * 处理实体移动逻辑
 */
class MovementSystem extends System {
    public priority: number = 10;

    protected requiredComponents = [TransformComponent, VelocityComponent];

    /**
     * 更新移动
     * @param deltaTime 帧间隔时间
     * @param entities 实体列表
     */
    public update(deltaTime: number, entities: Entity[]): void {
        const filteredEntities = this.filterEntities(entities);

        for (const entity of filteredEntities) {
            const transform = entity.getComponent(TransformComponent)!;
            const velocity = entity.getComponent(VelocityComponent)!;

            transform.x += velocity.vx * deltaTime;
            transform.y += velocity.vy * deltaTime;
        }
    }
}

/**
 * 渲染系统
 * 处理实体渲染逻辑
 */
class RenderSystem extends System {
    public priority: number = 100;

    protected requiredComponents = [TransformComponent, SpriteComponent];

    private ctx: CanvasRenderingContext2D;

    /**
     * 构造函数
     * @param ctx Canvas 渲染上下文
     */
    constructor(ctx: CanvasRenderingContext2D) {
        super();
        this.ctx = ctx;
    }

    /**
     * 渲染实体
     * @param deltaTime 帧间隔时间
     * @param entities 实体列表
     */
    public update(deltaTime: number, entities: Entity[]): void {
        const filteredEntities = this.filterEntities(entities);

        filteredEntities.sort((a, b) => {
            const spriteA = a.getComponent(SpriteComponent)!;
            const spriteB = b.getComponent(SpriteComponent)!;
            return spriteA.zIndex - spriteB.zIndex;
        });

        for (const entity of filteredEntities) {
            const transform = entity.getComponent(TransformComponent)!;
            const sprite = entity.getComponent(SpriteComponent)!;

            if (!sprite.visible) continue;

            this.ctx.save();
            this.ctx.globalAlpha = sprite.alpha;
            this.ctx.translate(transform.x, transform.y);
            this.ctx.rotate(transform.rotation);
            this.ctx.scale(transform.scaleX, transform.scaleY);

            if (sprite.image) {
                this.ctx.drawImage(
                    sprite.image,
                    -sprite.width / 2,
                    -sprite.height / 2,
                    sprite.width,
                    sprite.height
                );
            } else {
                this.ctx.fillStyle = '#ff0000';
                this.ctx.fillRect(
                    -sprite.width / 2,
                    -sprite.height / 2,
                    sprite.width,
                    sprite.height
                );
            }

            this.ctx.restore();
        }
    }
}

/**
 * 碰撞系统
 * 处理实体碰撞检测
 */
class CollisionSystem extends System {
    public priority: number = 20;

    protected requiredComponents = [TransformComponent, ColliderComponent];

    /** 碰撞回调映射 */
    private collisionCallbacks: Map<string, (a: Entity, b: Entity) => void> = new Map();

    /**
     * 检测碰撞
     * @param deltaTime 帧间隔时间
     * @param entities 实体列表
     */
    public update(deltaTime: number, entities: Entity[]): void {
        const filteredEntities = this.filterEntities(entities);

        for (let i = 0; i < filteredEntities.length; i++) {
            for (let j = i + 1; j < filteredEntities.length; j++) {
                const entityA = filteredEntities[i];
                const entityB = filteredEntities[j];

                if (this.checkCollision(entityA, entityB)) {
                    this.handleCollision(entityA, entityB);
                }
            }
        }
    }

    /**
     * 检查两个实体是否碰撞
     * @param a 实体A
     * @param b 实体B
     * @returns 是否碰撞
     */
    private checkCollision(a: Entity, b: Entity): boolean {
        const transformA = a.getComponent(TransformComponent)!;
        const transformB = b.getComponent(TransformComponent)!;
        const colliderA = a.getComponent(ColliderComponent)!;
        const colliderB = b.getComponent(ColliderComponent)!;

        if (colliderA.type === 'rectangle' && colliderB.type === 'rectangle') {
            return this.checkRectCollision(transformA, colliderA, transformB, colliderB);
        }

        if (colliderA.type === 'circle' && colliderB.type === 'circle') {
            return this.checkCircleCollision(transformA, colliderA, transformB, colliderB);
        }

        return this.checkMixedCollision(transformA, colliderA, transformB, colliderB);
    }

    /**
     * 检查矩形碰撞
     */
    private checkRectCollision(
        transformA: TransformComponent,
        colliderA: ColliderComponent,
        transformB: TransformComponent,
        colliderB: ColliderComponent
    ): boolean {
        const boundsA = colliderA.getBounds(transformA);
        const boundsB = colliderB.getBounds(transformB);

        return (
            boundsA.left < boundsB.right &&
            boundsA.right > boundsB.left &&
            boundsA.top < boundsB.bottom &&
            boundsA.bottom > boundsB.top
        );
    }

    /**
     * 检查圆形碰撞
     */
    private checkCircleCollision(
        transformA: TransformComponent,
        colliderA: ColliderComponent,
        transformB: TransformComponent,
        colliderB: ColliderComponent
    ): boolean {
        const dx = transformA.x - transformB.x;
        const dy = transformA.y - transformB.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance < colliderA.radius + colliderB.radius;
    }

    /**
     * 检查混合碰撞
     */
    private checkMixedCollision(
        transformA: TransformComponent,
        colliderA: ColliderComponent,
        transformB: TransformComponent,
        colliderB: ColliderComponent
    ): boolean {
        return false;
    }

    /**
     * 处理碰撞
     */
    private handleCollision(a: Entity, b: Entity): void {
        const key = `${a.id}-${b.id}`;
        const callback = this.collisionCallbacks.get(key);
        if (callback) {
            callback(a, b);
        }
    }

    /**
     * 注册碰撞回调
     */
    public onCollision(a: Entity, b: Entity, callback: (a: Entity, b: Entity) => void): void {
        const key = `${a.id}-${b.id}`;
        this.collisionCallbacks.set(key, callback);
    }
}

export { MovementSystem, RenderSystem, CollisionSystem };
```

### 游戏循环实现

```typescript
/**
 * 游戏循环管理器
 * 实现固定时间步长的游戏循环
 */
class GameLoop {
    /** 目标帧率 */
    private targetFps: number;

    /** 固定时间步长 */
    private fixedDeltaTime: number;

    /** 最大帧时间 */
    private maxFrameTime: number;

    /** 上次更新时间 */
    private lastTime: number = 0;

    /** 累积时间 */
    private accumulator: number = 0;

    /** 是否运行中 */
    private running: boolean = false;

    /** 更新回调 */
    private updateCallback: (deltaTime: number) => void;

    /** 渲染回调 */
    private renderCallback: () => void;

    /** FPS 计数器 */
    private fpsCounter: number = 0;

    /** FPS 更新时间 */
    private fpsUpdateTime: number = 0;

    /** 当前 FPS */
    public currentFps: number = 0;

    /**
     * 构造函数
     * @param config 配置对象
     */
    constructor(config: {
        targetFps?: number;
        update: (deltaTime: number) => void;
        render: () => void;
    }) {
        this.targetFps = config.targetFps || 60;
        this.fixedDeltaTime = 1 / this.targetFps;
        this.maxFrameTime = this.fixedDeltaTime * 5;
        this.updateCallback = config.update;
        this.renderCallback = config.render;
    }

    /**
     * 启动游戏循环
     */
    public start(): void {
        if (this.running) return;

        this.running = true;
        this.lastTime = performance.now() / 1000;
        this.accumulator = 0;
        this.fpsCounter = 0;
        this.fpsUpdateTime = this.lastTime;

        requestAnimationFrame(this.loop.bind(this));
    }

    /**
     * 停止游戏循环
     */
    public stop(): void {
        this.running = false;
    }

    /**
     * 主循环
     * @param timestamp 当前时间戳
     */
    private loop(timestamp: number): void {
        if (!this.running) return;

        const currentTime = timestamp / 1000;
        let frameTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        if (frameTime > this.maxFrameTime) {
            frameTime = this.maxFrameTime;
        }

        this.accumulator += frameTime;

        while (this.accumulator >= this.fixedDeltaTime) {
            this.updateCallback(this.fixedDeltaTime);
            this.accumulator -= this.fixedDeltaTime;
        }

        this.renderCallback();

        this.fpsCounter++;
        if (currentTime - this.fpsUpdateTime >= 1) {
            this.currentFps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsUpdateTime = currentTime;
        }

        requestAnimationFrame(this.loop.bind(this));
    }
}

export { GameLoop };
```

## Quick Reference

### 游戏循环模式

| 模式 | 说明 | 适用场景 |
|-----|------|---------|
| 固定时间步长 | 每帧固定时间 | 物理模拟 |
| 可变时间步长 | 根据实际时间 | 简单游戏 |
| 半固定步长 | 混合模式 | 大多数游戏 |

### 常用数学公式

| 公式 | 说明 |
|-----|------|
| `距离 = √((x2-x1)² + (y2-y1)²)` | 两点距离 |
| `角度 = atan2(dy, dx)` | 方向角 |
| `插值 = a + (b-a) * t` | 线性插值 |
| `平滑 = lerp(current, target, speed * dt)` | 平滑移动 |

### 碰撞检测类型

| 类型 | 复杂度 | 精度 |
|-----|--------|------|
| AABB | O(1) | 低 |
| 圆形 | O(1) | 中 |
| SAT | O(n) | 高 |
| 像素级 | O(n²) | 最高 |

### 常用设计模式

| 模式 | 用途 |
|-----|------|
| 单例 | 游戏管理器、资源管理器 |
| 工厂 | 实体创建 |
| 对象池 | 子弹、粒子等频繁创建销毁的对象 |
| 观察者 | 事件系统、成就系统 |
| 状态机 | AI 行为、游戏状态 |
