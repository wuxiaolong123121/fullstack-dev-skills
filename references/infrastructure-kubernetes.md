# Kubernetes 开发参考

> Reference for: fullstack-dev-skills
> Load when: K8s 部署、Helm、集群管理、容器编排

## 部署配置

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  labels:
    app: myapp
spec:
  replicas: 3
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
        image: myapp:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: myapp-secret
              key: database-url
```

### Service

```yaml
apiVersion: v1
kind: Service
metadata:
  name: myapp-service
spec:
  selector:
    app: myapp
  ports:
  - port: 80
    targetPort: 3000
  type: ClusterIP
```

### Ingress

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myapp-ingress
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - myapp.example.com
    secretName: myapp-tls
  rules:
  - host: myapp.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: myapp-service
            port:
              number: 80
```

## ConfigMap 与 Secret

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
data:
  APP_ENV: "production"
  LOG_LEVEL: "info"
---
apiVersion: v1
kind: Secret
metadata:
  name: myapp-secret
type: Opaque
stringData:
  database-url: "postgresql://user:pass@db:5432/myapp"
  jwt-secret: "your-jwt-secret"
```

## Helm Chart

### Chart 结构

```
myapp/
├── Chart.yaml
├── values.yaml
├── templates/
│   ├── deployment.yaml
│   ├── service.yaml
│   ├── ingress.yaml
│   ├── configmap.yaml
│   └── secrets.yaml
└── charts/
```

### values.yaml

```yaml
replicaCount: 3

image:
  repository: myapp
  tag: latest
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 80

ingress:
  enabled: true
  className: nginx
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  requests:
    memory: "128Mi"
    cpu: "100m"
  limits:
    memory: "512Mi"
    cpu: "500m"

autoscaling:
  enabled: true
  minReplicas: 2
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80
```

### 模板示例

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: {{ include "myapp.fullname" . }}
  labels:
    {{- include "myapp.labels" . | nindent 4 }}
spec:
  replicas: {{ .Values.replicaCount }}
  selector:
    matchLabels:
      {{- include "myapp.selectorLabels" . | nindent 6 }}
  template:
    spec:
      containers:
      - name: {{ .Chart.Name }}
        image: "{{ .Values.image.repository }}:{{ .Values.image.tag }}"
        ports:
        - containerPort: 3000
        resources:
          {{- toYaml .Values.resources | nindent 10 }}
```

## 常用命令

```bash
# 部署应用
kubectl apply -f deployment.yaml

# 查看部署状态
kubectl get deployments
kubectl get pods

# 查看日志
kubectl logs -f deployment/myapp

# 扩缩容
kubectl scale deployment myapp --replicas=5

# 自动扩缩容
kubectl autoscale deployment myapp --min=2 --max=10 --cpu-percent=80

# 滚动更新
kubectl set image deployment/myapp myapp=myapp:v2

# 回滚
kubectl rollout undo deployment/myapp

# Helm 操作
helm install myapp ./myapp
helm upgrade myapp ./myapp
helm rollback myapp 1
helm uninstall myapp
```

## Quick Reference

| 资源 | 用途 | 命令 |
|------|------|------|
| Deployment | 无状态应用 | `kubectl apply -f deployment.yaml` |
| Service | 服务发现 | `kubectl expose deployment myapp` |
| Ingress | 外部访问 | `kubectl get ingress` |
| ConfigMap | 配置管理 | `kubectl create configmap` |
| Secret | 敏感数据 | `kubectl create secret` |
| HPA | 自动扩缩容 | `kubectl autoscale` |
| Helm | 包管理 | `helm install/upgrade/rollback` |
