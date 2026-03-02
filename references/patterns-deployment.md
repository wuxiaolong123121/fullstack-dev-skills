# 部署模式参考

现代软件部署策略、CI/CD 集成模式和零停机发布技术，用于构建可靠、安全、高效的应用程序发布流程。

## When to Activate

- 设计部署流水线
- 规划发布策略
- 实施零停机部署
- 配置 CI/CD 系统
- 处理生产环境发布

## Core Principles

### 1. 渐进式发布

避免一次性全量发布，通过渐进式策略降低风险。

```yaml
# Good: 渐进式发布
stages:
  - name: canary
    traffic: 5%
    duration: 10m
  - name: staging
    traffic: 20%
    duration: 30m
  - name: production
    traffic: 100%

# Bad: 直接全量发布
deploy:
  target: production
  traffic: 100%
```

### 2. 快速回滚能力

确保任何发布都可以快速安全地回滚。

```bash
# Good: 保留历史版本支持回滚
kubectl rollout undo deployment/myapp --to-revision=2

# Bad: 无回滚机制
kubectl delete deployment/myapp
kubectl apply -f deployment.yaml
```

### 3. 可观测性优先

部署决策基于实时监控数据。

```yaml
# Good: 基于指标自动判断
analysis:
  metrics:
    - name: error-rate
      threshold: 1%
    - name: latency-p99
      threshold: 500ms
  rollbackOn:
    - error-rate
    - latency-p99
```

## 蓝绿部署策略

### 基本概念

蓝绿部署维护两套完全相同的生产环境，通过流量切换实现零停机发布。

```yaml
# Kubernetes 蓝绿部署示例
apiVersion: v1
kind: Service
metadata:
  name: myapp-production
spec:
  selector:
    app: myapp
    version: blue
  ports:
    - port: 80
      targetPort: 8080
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-blue
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: blue
  template:
    metadata:
      labels:
        app: myapp
        version: blue
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp-green
spec:
  replicas: 3
  selector:
    matchLabels:
      app: myapp
      version: green
  template:
    metadata:
      labels:
        app: myapp
        version: green
    spec:
      containers:
        - name: myapp
          image: myapp:v2.1.0
```

### 流量切换脚本

```bash
#!/bin/bash
# blue-green-switch.sh - 蓝绿切换脚本

set -e

CURRENT_VERSION=$(kubectl get service myapp-production -o jsonpath='{.spec.selector.version}')
if [ "$CURRENT_VERSION" = "blue" ]; then
    TARGET_VERSION="green"
else
    TARGET_VERSION="blue"
fi

echo "切换流量从 $CURRENT_VERSION 到 $TARGET_VERSION"

# 等待目标版本就绪
kubectl rollout status deployment/myapp-$TARGET_VERSION --timeout=300s

# 执行流量切换
kubectl patch service myapp-production -p "{\"spec\":{\"selector\":{\"version\":\"$TARGET_VERSION\"}}}"

echo "流量已切换到 $TARGET_VERSION 版本"
```

### 蓝绿部署适用场景

```yaml
# 适合蓝绿部署的场景
suitable_for:
  - 需要快速回滚能力
  - 有足够的基础设施资源
  - 部署频率适中
  - 应用状态简单（无状态服务）

# 不适合蓝绿部署的场景
not_suitable_for:
  - 资源受限环境
  - 数据库迁移复杂的场景
  - 需要长时间预热的应用
```

## 金丝雀发布策略

### 基本概念

金丝雀发布逐步将流量导向新版本，通过小规模验证降低发布风险。

```yaml
# Argo Rollouts 金丝雀发布示例
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: myapp-rollout
spec:
  replicas: 10
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0
          ports:
            - containerPort: 8080
  strategy:
    canary:
      steps:
        - setWeight: 5
        - pause: {duration: 10m}
        - setWeight: 20
        - pause: {duration: 10m}
        - setWeight: 50
        - pause: {duration: 10m}
        - setWeight: 80
        - pause: {duration: 5m}
      analysis:
        templates:
          - templateName: success-rate
        startingStep: 2
        args:
          - name: service-name
            value: myapp-canary
```

### 金丝雀分析模板

```yaml
# 金丝雀分析模板
apiVersion: argoproj.io/v1alpha1
kind: AnalysisTemplate
metadata:
  name: success-rate
spec:
  args:
    - name: service-name
  metrics:
    - name: success-rate
      interval: 1m
      count: 5
      successCondition: result[0] >= 0.99
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            sum(rate(http_requests_total{service="{{args.service-name}}",status!~"5.."}[1m])) /
            sum(rate(http_requests_total{service="{{args.service-name}}"}[1m]))
    - name: latency-p99
      interval: 1m
      count: 5
      successCondition: result[0] <= 500
      provider:
        prometheus:
          address: http://prometheus:9090
          query: |
            histogram_quantile(0.99,
              sum(rate(http_request_duration_seconds_bucket{service="{{args.service-name}}"}[1m])) by (le)
            ) * 1000
```

### Istio 流量管理

```yaml
# Istio 金丝雀流量分割
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: myapp
spec:
  hosts:
    - myapp
  http:
    - route:
        - destination:
            host: myapp
            subset: stable
          weight: 90
        - destination:
            host: myapp
            subset: canary
          weight: 10
---
apiVersion: networking.istio.io/v1beta1
kind: DestinationRule
metadata:
  name: myapp
spec:
  host: myapp
  subsets:
    - name: stable
      labels:
        version: v1
    - name: canary
      labels:
        version: v2
```

## 滚动更新策略

### Kubernetes 滚动更新

```yaml
# Kubernetes 滚动更新配置
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%
      maxUnavailable: 0
  selector:
    matchLabels:
      app: myapp
  template:
    metadata:
      labels:
        app: myapp
    spec:
      containers:
        - name: myapp
          image: myapp:v2.0.0
          ports:
            - containerPort: 8080
          readinessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
          lifecycle:
            preStop:
              exec:
                command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 30
```

### 滚动更新参数说明

```yaml
# 滚动更新参数详解
strategy:
  type: RollingUpdate
  rollingUpdate:
    # maxSurge: 更新期间可创建的额外 Pod 数量
    # 可以是绝对数或百分比
    maxSurge: 25%
    
    # maxUnavailable: 更新期间不可用的 Pod 数量
    # 设为 0 确保零停机
    maxUnavailable: 0

# 不同场景的推荐配置
configurations:
  high_availability:
    maxSurge: 25%
    maxUnavailable: 0
  
  resource_constrained:
    maxSurge: 0
    maxUnavailable: 25%
  
  balanced:
    maxSurge: 25%
    maxUnavailable: 25%
```

### 滚动更新监控脚本

```bash
#!/bin/bash
# monitor-rollout.sh - 监控滚动更新状态

DEPLOYMENT_NAME="myapp"
NAMESPACE="default"

echo "监控 $DEPLOYMENT_NAME 滚动更新状态..."

while true; do
    STATUS=$(kubectl rollout status deployment/$DEPLOYMENT_NAME -n $NAMESPACE --timeout=1s 2>&1)
    
    if echo "$STATUS" | grep -q "successfully rolled out"; then
        echo "部署成功完成"
        break
    fi
    
    READY=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.status.readyReplicas}')
    DESIRED=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.spec.replicas}')
    UPDATED=$(kubectl get deployment $DEPLOYMENT_NAME -n $NAMESPACE -o jsonpath='{.status.updatedReplicas}')
    
    echo "就绪: $READY / 期望: $DESIRED / 已更新: $UPDATED"
    sleep 5
done
```

## 零停机部署

### 就绪探针配置

```yaml
# 就绪探针确保流量只路由到就绪的 Pod
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8080
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1

# 存活探针检测死锁或无响应
livenessProbe:
  httpGet:
    path: /health/live
    port: 8080
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3

# 启动探针处理慢启动应用
startupProbe:
  httpGet:
    path: /health/startup
    port: 8080
  initialDelaySeconds: 5
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 30
```

### 优雅关闭

```yaml
# 优雅关闭配置
spec:
  containers:
    - name: myapp
      lifecycle:
        preStop:
          exec:
            # 等待现有请求完成
            command: ["/bin/sh", "-c", "sleep 15 && curl -X POST http://localhost:8080/shutdown"]
  # 给应用足够时间处理关闭
  terminationGracePeriodSeconds: 60
```

### 应用层优雅关闭

```python
# Python 应用优雅关闭示例
import signal
import sys
from contextlib import asynccontextmanager
from fastapi import FastAPI

shutdown_event = False

def signal_handler(signum, frame):
    global shutdown_event
    print(f"收到信号 {signum}，开始优雅关闭...")
    shutdown_event = True

signal.signal(signal.SIGTERM, signal_handler)
signal.signal(signal.SIGINT, signal_handler)

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("应用启动")
    yield
    print("执行清理操作...")
    await cleanup_resources()

app = FastAPI(lifespan=lifespan)

@app.get("/health/ready")
async def ready():
    if shutdown_event:
        return {"status": "shutting_down"}, 503
    return {"status": "ready"}

async def cleanup_resources():
    pass
```

### 数据库迁移零停机

```yaml
# 数据库迁移策略
migration_phases:
  phase_1:
    description: "添加新列（可空）"
    action: "ALTER TABLE users ADD COLUMN new_field VARCHAR(255);"
    rollback: "ALTER TABLE users DROP COLUMN new_field;"
    
  phase_2:
    description: "部署新版本代码（双写）"
    action: "代码同时写入新旧字段"
    
  phase_3:
    description: "数据回填"
    action: "UPDATE users SET new_field = old_field WHERE new_field IS NULL;"
    
  phase_4:
    description: "添加非空约束"
    action: "ALTER TABLE users MODIFY new_field VARCHAR(255) NOT NULL;"
    
  phase_5:
    description: "移除旧字段代码"
    action: "代码停止使用旧字段"
    
  phase_6:
    description: "删除旧列"
    action: "ALTER TABLE users DROP COLUMN old_field;"
```

## 部署策略对比表

| 策略 | 资源消耗 | 回滚速度 | 风险程度 | 复杂度 | 适用场景 |
|------|----------|----------|----------|--------|----------|
| 蓝绿部署 | 高（2x资源） | 极快（秒级） | 低 | 中 | 关键服务、快速回滚需求 |
| 金丝雀发布 | 低 | 中等（分钟级） | 低 | 高 | 大规模服务、需要验证 |
| 滚动更新 | 低 | 慢（分钟级） | 中 | 低 | 资源受限、一般服务 |
| A/B 测试 | 中 | 中等 | 低 | 高 | 功能验证、用户体验测试 |
| 影子部署 | 高 | 快 | 最低 | 最高 | 关键系统、风险敏感场景 |

### 详细对比

```yaml
strategies:
  blue_green:
    pros:
      - 零停机时间
      - 即时回滚能力
      - 完整的生产环境测试
    cons:
      - 需要 2x 基础设施资源
      - 数据库迁移复杂
      - 长时间运行任务处理困难
    best_for:
      - 关键业务系统
      - 需要快速回滚的场景
      - 有充足资源的团队

  canary:
    pros:
      - 渐进式风险降低
      - 资源效率高
      - 真实流量验证
    cons:
      - 部署时间较长
      - 需要完善的监控
      - 配置复杂
    best_for:
      - 大规模分布式系统
      - 微服务架构
      - 有完善监控体系的团队

  rolling:
    pros:
      - 资源效率最高
      - 配置简单
      - Kubernetes 原生支持
    cons:
      - 回滚较慢
      - 版本混合期间可能有问题
      - 需要向后兼容
    best_for:
      - 无状态服务
      - 资源受限环境
      - 快迭代的开发团队
```

## CI/CD 集成示例

### GitHub Actions 完整流水线

```yaml
# .github/workflows/deploy.yml
name: Deploy Pipeline

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      
      - name: 安装依赖
        run: npm ci
      
      - name: 运行测试
        run: npm test -- --coverage
      
      - name: 上传覆盖率
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

  build:
    needs: test
    runs-on: ubuntu-latest
    outputs:
      image_tag: ${{ steps.meta.outputs.tags }}
    steps:
      - uses: actions/checkout@v4
      
      - name: 登录容器仓库
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: 提取 Docker 元数据
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix=
            type=raw,value=latest,enable=${{ github.ref == 'refs/heads/main' }}
      
      - name: 构建并推送镜像
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 kubectl
        uses: azure/setup-kubectl@v3
      
      - name: 配置 kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > ~/.kube/config
      
      - name: 部署到 Staging
        run: |
          kubectl set image deployment/myapp \
            myapp=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:${{ github.sha }} \
            --namespace staging
      
      - name: 等待部署完成
        run: |
          kubectl rollout status deployment/myapp \
            --namespace staging \
            --timeout=300s
      
      - name: 运行冒烟测试
        run: |
          npm run test:smoke -- --env STAGING_URL=${{ secrets.STAGING_URL }}

  deploy-production:
    needs: deploy-staging
    runs-on: ubuntu-latest
    environment: production
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      
      - name: 设置 kubectl
        uses: azure/setup-kubectl@v3
      
      - name: 配置 kubeconfig
        run: |
          mkdir -p ~/.kube
          echo "${{ secrets.KUBE_CONFIG_PRODUCTION }}" | base64 -d > ~/.kube/config
      
      - name: 金丝雀发布（10%流量）
        run: |
          kubectl patch virtualservice myapp \
            --type merge \
            -p '{"spec":{"http":[{"route":[{"destination":{"host":"myapp","subset":"stable"},"weight":90},{"destination":{"host":"myapp","subset":"canary"},"weight":10}]}]}}'
      
      - name: 等待并监控（5分钟）
        run: |
          sleep 300
          ./scripts/check-canary-health.sh
      
      - name: 完成金丝雀发布（100%流量）
        run: |
          kubectl patch virtualservice myapp \
            --type merge \
            -p '{"spec":{"http":[{"route":[{"destination":{"host":"myapp","subset":"canary"},"weight":100}]}]}}'
      
      - name: 清理旧版本
        run: |
          kubectl delete deployment myapp-stable --ignore-not-found=true

  rollback:
    runs-on: ubuntu-latest
    if: failure()
    needs: [deploy-production]
    steps:
      - name: 回滚到上一版本
        run: |
          kubectl rollout undo deployment/myapp --namespace production
          kubectl rollout status deployment/myapp --namespace production
```

### GitLab CI/CD 流水线

```yaml
# .gitlab-ci.yml
stages:
  - test
  - build
  - deploy-staging
  - deploy-production

variables:
  DOCKER_REGISTRY: registry.gitlab.com
  IMAGE_NAME: $CI_REGISTRY_IMAGE
  KUBERNETES_NAMESPACE: myapp

test:
  stage: test
  image: node:20
  script:
    - npm ci
    - npm test
  coverage: '/Lines\s*:\s*(\d+.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

build:
  stage: build
  image: docker:24
  services:
    - docker:24-dind
  script:
    - docker login -u $CI_REGISTRY_USER -p $CI_REGISTRY_PASSWORD $CI_REGISTRY
    - docker build -t $IMAGE_NAME:$CI_COMMIT_SHA .
    - docker push $IMAGE_NAME:$CI_COMMIT_SHA
    - |
      if [ "$CI_COMMIT_BRANCH" == "main" ]; then
        docker tag $IMAGE_NAME:$CI_COMMIT_SHA $IMAGE_NAME:latest
        docker push $IMAGE_NAME:latest
      fi

deploy-staging:
  stage: deploy-staging
  image: bitnami/kubectl:latest
  environment:
    name: staging
    url: https://staging.example.com
  script:
    - kubectl config use-context $KUBE_CONTEXT_STAGING
    - kubectl set image deployment/myapp myapp=$IMAGE_NAME:$CI_COMMIT_SHA -n $KUBERNETES_NAMESPACE
    - kubectl rollout status deployment/myapp -n $KUBERNETES_NAMESPACE --timeout=300s
  only:
    - main
    - merge_requests

deploy-production:
  stage: deploy-production
  image: bitnami/kubectl:latest
  environment:
    name: production
    url: https://example.com
  script:
    - kubectl config use-context $KUBE_CONTEXT_PRODUCTION
    - |
      kubectl apply -f - <<EOF
      apiVersion: argoproj.io/v1alpha1
      kind: Rollout
      metadata:
        name: myapp
      spec:
        replicas: 10
        strategy:
          canary:
            steps:
              - setWeight: 10
              - pause: {duration: 5m}
              - setWeight: 50
              - pause: {duration: 5m}
        selector:
          matchLabels:
            app: myapp
        template:
          spec:
            containers:
              - name: myapp
                image: $IMAGE_NAME:$CI_COMMIT_SHA
      EOF
    - kubectl rollout status rollout/myapp -n $KUBERNETES_NAMESPACE --timeout=600s
  only:
    - main
  when: manual
```

### Jenkins 流水线

```groovy
// Jenkinsfile
pipeline {
    agent {
        kubernetes {
            yaml '''
            apiVersion: v1
            kind: Pod
            spec:
              containers:
              - name: node
                image: node:20
                command: ['sleep', '99d']
              - name: docker
                image: docker:24
                command: ['sleep', '99d']
                volumeMounts:
                - name: docker-sock
                  mountPath: /var/run/docker.sock
              volumes:
              - name: docker-sock
                hostPath:
                  path: /var/run/docker.sock
            '''
        }
    }
    
    environment {
        REGISTRY = 'registry.example.com'
        IMAGE = "${REGISTRY}/myapp:${BUILD_NUMBER}"
    }
    
    stages {
        stage('测试') {
            steps {
                container('node') {
                    sh 'npm ci'
                    sh 'npm test'
                }
            }
            post {
                always {
                    junit 'test-results/*.xml'
                    publishCoverage adapters: [cobertura('coverage/cobertura-coverage.xml')]
                }
            }
        }
        
        stage('构建') {
            steps {
                container('docker') {
                    sh "docker build -t ${IMAGE} ."
                    sh "docker push ${IMAGE}"
                }
            }
        }
        
        stage('部署到 Staging') {
            steps {
                container('node') {
                    sh "kubectl set image deployment/myapp myapp=${IMAGE} --namespace staging"
                    sh "kubectl rollout status deployment/myapp --namespace staging --timeout=300s"
                }
            }
        }
        
        stage('集成测试') {
            steps {
                container('node') {
                    sh 'npm run test:integration'
                }
            }
        }
        
        stage('部署到生产') {
            when {
                branch 'main'
            }
            steps {
                input '确认部署到生产环境？'
                container('node') {
                    sh """
                        kubectl apply -f k8s/canary.yaml
                        sleep 300
                        kubectl patch virtualservice myapp --type merge -p '{"spec":{"http":[{"route":[{"destination":{"host":"myapp","subset":"canary"},"weight":100}]}]}}'
                    """
                }
            }
        }
    }
    
    post {
        failure {
            mail to: 'team@example.com',
                 subject: "部署失败: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                 body: "请检查: ${env.BUILD_URL}"
        }
    }
}
```

## 部署检查清单

```yaml
pre_deployment:
  - name: 代码审查
    required: true
  - name: 单元测试通过
    required: true
  - name: 集成测试通过
    required: true
  - name: 安全扫描
    required: true
  - name: 性能基准测试
    required: false
  - name: 变更日志更新
    required: true

during_deployment:
  - name: 健康检查通过
    required: true
  - name: 监控指标正常
    required: true
  - name: 日志无错误
    required: true
  - name: 流量验证
    required: true

post_deployment:
  - name: 冒烟测试
    required: true
  - name: 监控告警检查
    required: true
  - name: 用户反馈监控
    required: false
  - name: 文档更新
    required: false
```

## 快速参考：部署策略选择

| 场景 | 推荐策略 | 原因 |
|------|----------|------|
| 关键业务系统 | 蓝绿部署 | 快速回滚，零停机 |
| 微服务架构 | 金丝雀发布 | 渐进验证，资源高效 |
| 资源受限环境 | 滚动更新 | 最小资源需求 |
| 大流量服务 | 金丝雀 + 自动分析 | 自动化风险控制 |
| 数据库变更 | 扩展蓝绿/金丝雀 | 需要特殊迁移策略 |
| 快速迭代项目 | 滚动更新 | 简单快速 |

## 反模式警示

```yaml
# Bad: 直接在生产环境测试
deploy:
  target: production
  test: true

# Good: 先在 staging 环境验证
deploy:
  - target: staging
    test: true
  - target: production
    test: false

# Bad: 无回滚计划
deploy:
  strategy: rolling
  rollback: disabled

# Good: 配置自动回滚
deploy:
  strategy: canary
  rollback:
    enabled: true
    triggers:
      - error_rate > 1%
      - latency_p99 > 500ms

# Bad: 忽略健康检查
deployment:
  readinessProbe: null

# Good: 配置完善的健康检查
deployment:
  readinessProbe:
    httpGet:
      path: /health/ready
    initialDelaySeconds: 5
    periodSeconds: 10

# Bad: 手动部署无记录
deploy_script: |
  ssh prod-server "kubectl apply -f deployment.yaml"

# Good: 使用 CI/CD 流水线
deploy_pipeline:
  - build
  - test
  - deploy-staging
  - approve
  - deploy-production
```

**记住**: 部署策略的选择应基于业务需求、团队能力和基础设施资源。没有一种策略适合所有场景，关键是建立可观测性和快速回滚能力。
