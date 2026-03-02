# Terraform 开发参考

> Reference for: fullstack-dev-skills
> Load when: IaC、多云配置、模块化、基础设施即代码

## 基础配置

### Provider 配置

```hcl
terraform {
  required_version = ">= 1.0.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "prod/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}
```

### 变量定义

```hcl
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be dev, staging, or prod."
  }
}

variable "instance_types" {
  description = "EC2 instance types"
  type        = list(string)
  default     = ["t3.micro", "t3.small"]
}

variable "tags" {
  description = "Resource tags"
  type        = map(string)
  default     = {}
}
```

## 资源定义

### VPC 模块

```hcl
module "vpc" {
  source = "./modules/vpc"
  
  name               = "${var.project_name}-vpc"
  cidr               = var.vpc_cidr
  availability_zones = var.availability_zones
  
  public_subnets  = var.public_subnets
  private_subnets = var.private_subnets
  
  enable_nat_gateway = true
  single_nat_gateway = var.environment != "prod"
  
  tags = var.tags
}
```

### EC2 实例

```hcl
resource "aws_instance" "web" {
  count         = var.instance_count
  ami           = data.aws_ami.ubuntu.id
  instance_type = var.instance_type
  
  subnet_id              = module.vpc.public_subnet_ids[count.index % length(module.vpc.public_subnet_ids)]
  vpc_security_group_ids = [aws_security_group.web.id]
  
  user_data = base64encode(templatefile("${path.module}/user_data.sh", {
    environment = var.environment
  }))
  
  tags = merge(var.tags, {
    Name = "${var.project_name}-web-${count.index + 1}"
  })
  
  lifecycle {
    create_before_destroy = true
  }
}
```

### 安全组

```hcl
resource "aws_security_group" "web" {
  name        = "${var.project_name}-web-sg"
  description = "Security group for web servers"
  vpc_id      = module.vpc.vpc_id
  
  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  ingress {
    description = "HTTPS"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = var.tags
}
```

## 输出

```hcl
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnet IDs"
  value       = module.vpc.public_subnet_ids
}

output "instance_ids" {
  description = "EC2 instance IDs"
  value       = aws_instance.web[*].id
}

output "load_balancer_dns" {
  description = "Load balancer DNS name"
  value       = aws_lb.web.dns_name
}
```

## 模块结构

```
modules/
├── vpc/
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── README.md
├── ec2/
│   ├── main.tf
│   ├── variables.tf
│   └── outputs.tf
└── rds/
    ├── main.tf
    ├── variables.tf
    └── outputs.tf
```

## 常用命令

```bash
# 初始化
terraform init

# 格式化
terraform fmt

# 验证
terraform validate

# 计划
terraform plan -out=tfplan

# 应用
terraform apply tfplan

# 销毁
terraform destroy

# 状态管理
terraform state list
terraform state show aws_instance.web[0]
terraform state mv aws_instance.web[0] aws_instance.web_old[0]

# 工作区
terraform workspace new staging
terraform workspace select prod
```

## Quick Reference

| 命令 | 用途 | 示例 |
|------|------|------|
| init | 初始化 | `terraform init` |
| plan | 预览变更 | `terraform plan -out=tfplan` |
| apply | 应用变更 | `terraform apply tfplan` |
| destroy | 销毁资源 | `terraform destroy` |
| state | 状态管理 | `terraform state list` |
| workspace | 工作区 | `terraform workspace new staging` |
| import | 导入资源 | `terraform import aws_instance.web i-xxx` |
| output | 查看输出 | `terraform output vpc_id` |
