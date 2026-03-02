# Cloud Architect 参考

> Reference for: fullstack-dev-skills
> Load when: 用户提及 AWS、Azure、GCP、云架构、多云策略、成本优化、云服务选型

## 核心特性

### 1. AWS 核心服务

#### 计算服务

```yaml
# EC2 实例类型选择指南
计算优化型:
  实例: C6i, C6g
  用途: 高性能计算、批处理、游戏服务器
  特点: 高处理器性能

内存优化型:
  实例: R6i, X2iezn
  用途: 数据库、大数据分析、缓存
  特点: 高内存带宽

存储优化型:
  实例: I4i, D3
  用途: 数据仓库、Hadoop/Spark
  特点: 高顺序读写性能

GPU 计算:
  实例: P4d, G5
  用途: 机器学习、图形渲染
  特点: NVIDIA GPU 加速
```

```javascript
/**
 * AWS SDK EC2 实例管理
 * @description 创建和管理 EC2 实例
 * @param {Object} config - 实例配置
 * @returns {Promise<Object>} 实例信息
 */
const { EC2Client, RunInstancesCommand, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');

const ec2Client = new EC2Client({ region: 'ap-northeast-1' });

async function createInstance(config) {
    const command = new RunInstancesCommand({
        ImageId: 'ami-0abcdef1234567890',
        InstanceType: config.instanceType || 't3.medium',
        MinCount: 1,
        MaxCount: 1,
        KeyName: config.keyName,
        SecurityGroupIds: config.securityGroups,
        SubnetId: config.subnetId,
        TagSpecifications: [{
            ResourceType: 'instance',
            Tags: [
                { Key: 'Name', Value: config.name },
                { Key: 'Environment', Value: config.environment }
            ]
        }],
        BlockDeviceMappings: [{
            DeviceName: '/dev/sda1',
            Ebs: {
                VolumeSize: config.volumeSize || 50,
                VolumeType: 'gp3',
                DeleteOnTermination: true
            }
        }]
    });
    
    const response = await ec2Client.send(command);
    return response.Instances[0];
}
```

#### 存储服务

```javascript
/**
 * S3 存储桶管理
 * @description 创建配置 S3 存储桶
 * @param {string} bucketName - 存储桶名称
 * @param {string} storageClass - 存储类别
 */
const { S3Client, CreateBucketCommand, PutBucketLifecycleConfigurationCommand } = require('@aws-sdk/client-s3');

const s3Client = new S3Client({ region: 'ap-northeast-1' });

async function createBucketWithLifecycle(bucketName) {
    // 创建存储桶
    await s3Client.send(new CreateBucketCommand({
        Bucket: bucketName,
        CreateBucketConfiguration: {
            LocationConstraint: 'ap-northeast-1'
        }
    }));

    // 配置生命周期规则
    await s3Client.send(new PutBucketLifecycleConfigurationCommand({
        Bucket: bucketName,
        LifecycleConfiguration: {
            Rules: [
                {
                    ID: 'TransitionToIA',
                    Status: 'Enabled',
                    Filter: { Prefix: 'logs/' },
                    Transitions: [{
                        Days: 30,
                        StorageClass: 'STANDARD_IA'
                    }, {
                        Days: 90,
                        StorageClass: 'GLACIER'
                    }],
                    Expiration: { Days: 365 }
                },
                {
                    ID: 'IntelligentTiering',
                    Status: 'Enabled',
                    Filter: { Prefix: 'data/' },
                    Transitions: [{
                        Days: 0,
                        StorageClass: 'INTELLIGENT_TIERING'
                    }]
                }
            ]
        }
    }));
}
```

### 2. Azure 核心服务

```javascript
/**
 * Azure SDK 虚拟机管理
 * @description 使用 Azure SDK 管理计算资源
 */
const { ComputeManagementClient } = require('@azure/arm-compute');
const { DefaultAzureCredential } = require('@azure/identity');

/**
 * 创建 Azure 虚拟机
 * @param {string} resourceGroup - 资源组名称
 * @param {string} vmName - 虚拟机名称
 * @param {Object} config - 虚拟机配置
 * @returns {Promise<Object>} 创建结果
 */
async function createAzureVM(resourceGroup, vmName, config) {
    const credential = new DefaultAzureCredential();
    const computeClient = new ComputeManagementClient(credential, config.subscriptionId);

    const vmParameters = {
        location: config.location || 'eastasia',
        hardwareProfile: {
            vmSize: config.vmSize || 'Standard_D2s_v3'
        },
        storageProfile: {
            imageReference: {
                publisher: 'Canonical',
                offer: 'UbuntuServer',
                sku: '20_04-lts',
                version: 'latest'
            },
            osDisk: {
                name: `${vmName}_osdisk`,
                caching: 'ReadWrite',
                createOption: 'FromImage',
                managedDisk: {
                    storageAccountType: 'Premium_LRS'
                }
            }
        },
        osProfile: {
            computerName: vmName,
            adminUsername: config.adminUsername,
            ssh: {
                publicKeys: [{
                    path: `/home/${config.adminUsername}/.ssh/authorized_keys`,
                    keyData: config.sshPublicKey
                }]
            }
        },
        networkProfile: {
            networkInterfaces: [{
                id: config.networkInterfaceId,
                primary: true
            }]
        },
        tags: {
            Environment: config.environment,
            Project: config.project
        }
    };

    return await computeClient.virtualMachines.beginCreateOrUpdateAndWait(
        resourceGroup,
        vmName,
        vmParameters
    );
}
```

### 3. GCP 核心服务

```javascript
/**
 * GCP Compute Engine 管理
 * @description 使用 Google Cloud SDK 管理计算实例
 */
const { InstancesClient } = require('@google-cloud/compute');

/**
 * 创建 GCP 计算实例
 * @param {string} projectId - GCP 项目 ID
 * @param {string} zone - 可用区
 * @param {string} instanceName - 实例名称
 * @param {Object} config - 实例配置
 * @returns {Promise<Object>} 操作结果
 */
async function createGCPInstance(projectId, zone, instanceName, config) {
    const instancesClient = new InstancesClient();

    const instanceResource = {
        name: instanceName,
        machineType: `zones/${zone}/machineTypes/${config.machineType || 'e2-medium'}`,
        disks: [{
            boot: true,
            autoDelete: true,
            initializeParams: {
                sourceImage: `projects/ubuntu-os-cloud/global/images/family/ubuntu-2004-lts`,
                diskSizeGb: config.diskSizeGb || 50,
                diskType: `zones/${zone}/diskTypes/pd-ssd`
            }
        }],
        networkInterfaces: [{
            accessConfigs: [{
                name: 'External NAT',
                type: 'ONE_TO_ONE_NAT'
            }],
            network: `projects/${projectId}/global/networks/${config.network || 'default'}`
        }],
        labels: {
            environment: config.environment || 'development',
            project: config.project || 'default'
        },
        scheduling: {
            preemptible: config.preemptible || false,
            automaticRestart: !config.preemptible
        }
    };

    const [response] = await instancesClient.insert({
        project: projectId,
        zone: zone,
        instanceResource: instanceResource
    });

    return response;
}
```

### 4. 多云策略

```yaml
# 多云架构设计原则
设计原则:
  可移植性:
    - 使用容器化部署 (Docker/Kubernetes)
    - 采用基础设施即代码 (Terraform)
    - 避免云厂商锁定 API

  数据策略:
    - 统一数据格式和协议
    - 跨云数据同步方案
    - 数据主权合规考虑

  网络架构:
    - 云间专线连接
    - 统一 DNS 和负载均衡
    - 安全组规则一致性
```

```hcl
# Terraform 多云资源配置示例
# AWS Provider
provider "aws" {
  region = "ap-northeast-1"
  alias  = "tokyo"
}

# Azure Provider
provider "azurerm" {
  features {}
  subscription_id = var.azure_subscription_id
  alias           = "eastasia"
}

# GCP Provider
provider "google" {
  project = var.gcp_project_id
  region  = "asia-east1"
  alias   = "taiwan"
}

# 跨云资源统一管理
module "web_app_aws" {
  source  = "./modules/web_app"
  providers = { aws = aws.tokyo }
  environment = "production"
  region      = "ap-northeast-1"
}

module "web_app_azure" {
  source  = "./modules/web_app"
  providers = { azurerm = azurerm.eastasia }
  environment = "production"
  region      = "eastasia"
}
```

### 5. 成本优化

```javascript
/**
 * 云成本分析与优化
 * @description 分析和优化云资源成本
 */

/**
 * 计算资源利用率分析
 * @param {Array} metrics - CloudWatch 监控指标
 * @returns {Object} 优化建议
 */
function analyzeResourceUtilization(metrics) {
    const recommendations = [];
    
    // CPU 利用率分析
    const avgCpu = metrics.reduce((sum, m) => sum + m.cpu, 0) / metrics.length;
    if (avgCpu < 20) {
        recommendations.push({
            type: 'downsize',
            reason: `CPU 平均利用率 ${avgCpu.toFixed(1)}%，建议缩小实例规格`,
            estimatedSaving: '30-50%'
        });
    } else if (avgCpu > 80) {
        recommendations.push({
            type: 'upsize',
            reason: `CPU 平均利用率 ${avgCpu.toFixed(1)}%，建议升级实例规格`,
            priority: 'high'
        });
    }

    // 内存利用率分析
    const avgMemory = metrics.reduce((sum, m) => sum + m.memory, 0) / metrics.length;
    if (avgMemory < 30) {
        recommendations.push({
            type: 'memory_optimize',
            reason: `内存利用率 ${avgMemory.toFixed(1)}%，可考虑内存优化型实例`
        });
    }

    return {
        currentUtilization: { cpu: avgCpu, memory: avgMemory },
        recommendations: recommendations
    };
}

/**
 * 预留实例购买建议
 * @param {Array} usageHistory - 历史使用数据
 * @returns {Object} 预留实例建议
 */
function recommendReservedInstances(usageHistory) {
    const stableWorkloads = usageHistory.filter(w => 
        w.uptime > 0.8 && w.age > 90
    );

    return stableWorkloads.map(workload => ({
        instanceType: workload.instanceType,
        region: workload.region,
        term: '1year',
        paymentOption: 'partial_upfront',
        estimatedSaving: '30-40%',
        breakEvenMonths: 7
    }));
}

/**
 * 存储成本优化
 * @param {Array} storageMetrics - 存储指标数据
 * @returns {Array} 优化建议列表
 */
function optimizeStorageCosts(storageMetrics) {
    return storageMetrics.map(storage => {
        const recommendations = [];
        
        // 冷数据检测
        if (storage.accessFrequency < 0.1 && storage.age > 30) {
            recommendations.push({
                action: 'transition_to_glacier',
                reason: '访问频率低，建议转为 Glacier 存储',
                saving: '80%'
            });
        }

        // 未挂载卷检测
        if (!storage.attached && storage.age > 7) {
            recommendations.push({
                action: 'delete_or_snapshot',
                reason: '未挂载存储卷，建议删除或创建快照后删除',
                saving: '100%'
            });
        }

        return {
            storageId: storage.id,
            type: storage.type,
            size: storage.size,
            recommendations: recommendations
        };
    });
}
```

## 最佳实践

### 架构设计原则

```yaml
# 云原生架构设计原则
可扩展性:
  水平扩展: 优先使用无状态服务，支持自动伸缩
  垂直扩展: 预留升级路径，避免单点瓶颈

高可用性:
  多可用区部署: 跨 AZ 部署关键服务
  健康检查: 配置负载均衡器健康检查
  故障转移: 设计自动故障恢复机制

安全性:
  最小权限: IAM 角色按最小权限原则配置
  网络隔离: VPC 分层设计，安全组白名单
  数据加密: 静态和传输数据加密

成本控制:
  资源标签: 统一标签策略便于成本追踪
  自动伸缩: 根据负载动态调整资源
  预留资源: 稳定工作负载使用预留实例
```

### 监控与告警

```javascript
/**
 * 云资源监控配置
 * @description 配置跨云监控和告警
 */
const monitoringConfig = {
    metrics: [
        {
            name: 'CPUUtilization',
            threshold: 80,
            period: 300,
            evaluationPeriods: 3,
            action: 'scale_out'
        },
        {
            name: 'MemoryUtilization',
            threshold: 85,
            period: 300,
            evaluationPeriods: 2,
            action: 'alert'
        },
        {
            name: 'DiskSpaceUtilization',
            threshold: 90,
            period: 600,
            evaluationPeriods: 1,
            action: 'critical_alert'
        }
    ],
    notifications: {
        channels: ['email', 'slack', 'pagerduty'],
        escalation: {
            warning: ['email'],
            critical: ['email', 'slack', 'pagerduty']
        }
    }
};
```

## Quick Reference

| 服务类型 | AWS | Azure | GCP |
|---------|-----|-------|-----|
| 计算 | EC2 | Virtual Machines | Compute Engine |
| 容器 | EKS | AKS | GKE |
| 无服务器 | Lambda | Functions | Cloud Functions |
| 存储 | S3 | Blob Storage | Cloud Storage |
| 数据库 | RDS/DynamoDB | SQL Database/CosmosDB | Cloud SQL/Firestore |
| 缓存 | ElastiCache | Redis Cache | Memorystore |
| 消息队列 | SQS/SNS | Service Bus | Pub/Sub |
| CDN | CloudFront | CDN | Cloud CDN |
| DNS | Route 53 | DNS | Cloud DNS |
| 监控 | CloudWatch | Monitor | Cloud Monitoring |
| IAM | IAM | Azure AD/RBAC | Cloud IAM |
| 网络 | VPC | VNet | VPC |
