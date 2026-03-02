# Fine-Tuning Expert 参考

> Reference for: fullstack-dev-skills
> Load when: LoRA、QLoRA、PEFT、数据准备、模型微调

## 数据准备

### 数据格式

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import json

@dataclass
class TrainingExample:
    """
    训练样本
    """
    instruction: str
    input: str
    output: str
    system: Optional[str] = None

@dataclass
class DatasetConfig:
    """
    数据集配置
    """
    train_file: str
    eval_file: Optional[str] = None
    max_length: int = 2048
    train_test_split: float = 0.1

def prepare_dataset(
    examples: List[TrainingExample],
    output_path: str
) -> Dict[str, int]:
    """
    准备训练数据集
    
    Args:
        examples: 训练样本列表
        output_path: 输出路径
        
    Returns:
        数据集统计信息
    """
    data = [
        {
            "messages": [
                {"role": "system", "content": ex.system or "You are a helpful assistant."},
                {"role": "user", "content": f"{ex.instruction}\n{ex.input}" if ex.input else ex.instruction},
                {"role": "assistant", "content": ex.output}
            ]
        }
        for ex in examples
    ]
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for item in data:
            f.write(json.dumps(item, ensure_ascii=False) + '\n')
    
    return {
        "total_examples": len(examples),
        "output_file": output_path
    }
```

### 数据清洗

```python
import re
from typing import List

def clean_training_data(
    examples: List[TrainingExample]
) -> List[TrainingExample]:
    """
    清洗训练数据
    
    Args:
        examples: 原始样本列表
        
    Returns:
        清洗后的样本列表
    """
    cleaned = []
    for ex in examples:
        # 移除多余空白
        instruction = re.sub(r'\s+', ' ', ex.instruction).strip()
        output = re.sub(r'\s+', ' ', ex.output).strip()
        
        # 过滤过短的样本
        if len(output) < 10:
            continue
        
        # 过滤重复内容
        if instruction == output:
            continue
        
        cleaned.append(TrainingExample(
            instruction=instruction,
            input=ex.input,
            output=output,
            system=ex.system
        ))
    
    return cleaned
```

## PEFT 配置

### LoRA 配置

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class LoRAConfig:
    """
    LoRA 配置
    """
    r: int = 8                          # LoRA 秩
    lora_alpha: int = 16                # 缩放因子
    lora_dropout: float = 0.05          # Dropout 比率
    target_modules: List[str] = None    # 目标模块
    bias: str = "none"                  # 偏置处理
    task_type: str = "CAUSAL_LM"        # 任务类型

def create_lora_config(
    model_type: str = "llama",
    r: int = 8,
    alpha: int = 16
) -> Dict[str, Any]:
    """
    创建 LoRA 配置
    
    Args:
        model_type: 模型类型
        r: LoRA 秩
        alpha: 缩放因子
        
    Returns:
        LoRA 配置字典
    """
    target_modules_map = {
        "llama": ["q_proj", "v_proj", "k_proj", "o_proj"],
        "mistral": ["q_proj", "v_proj"],
        "gpt": ["c_attn", "c_proj"]
    }
    
    return {
        "r": r,
        "lora_alpha": alpha,
        "lora_dropout": 0.05,
        "target_modules": target_modules_map.get(model_type, ["q_proj", "v_proj"]),
        "bias": "none",
        "task_type": "CAUSAL_LM"
    }
```

### QLoRA 配置

```python
@dataclass
class QLoRAConfig:
    """
    QLoRA 配置（量化 LoRA）
    """
    # LoRA 参数
    r: int = 64
    lora_alpha: int = 16
    lora_dropout: float = 0.1
    
    # 量化参数
    bits: int = 4                       # 量化位数
    quant_type: str = "nf4"             # 量化类型
    double_quant: bool = True           # 双重量化
    
    # 目标模块
    target_modules: List[str] = None

def create_qlora_config(
    model_type: str = "llama"
) -> Dict[str, Any]:
    """
    创建 QLoRA 配置
    
    Args:
        model_type: 模型类型
        
    Returns:
        QLoRA 配置字典
    """
    return {
        "r": 64,
        "lora_alpha": 16,
        "lora_dropout": 0.1,
        "bnb_4bit_quant_type": "nf4",
        "bnb_4bit_use_double_quant": True,
        "bnb_4bit_compute_dtype": "bfloat16",
        "target_modules": [
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ]
    }
```

## 训练流程

### 训练配置

```python
from dataclasses import dataclass

@dataclass
class TrainingConfig:
    """
    训练配置
    """
    # 基础配置
    model_name: str
    output_dir: str
    
    # 训练参数
    num_train_epochs: int = 3
    per_device_train_batch_size: int = 4
    gradient_accumulation_steps: int = 4
    learning_rate: float = 2e-4
    weight_decay: float = 0.01
    warmup_ratio: float = 0.03
    
    # 优化参数
    lr_scheduler_type: str = "cosine"
    optim: str = "paged_adamw_8bit"
    
    # 日志参数
    logging_steps: int = 10
    save_steps: int = 100
    eval_steps: int = 100
    
    # 其他
    fp16: bool = False
    bf16: bool = True
    gradient_checkpointing: bool = True

def create_training_args(
    config: TrainingConfig
) -> Dict[str, Any]:
    """
    创建训练参数
    
    Args:
        config: 训练配置
        
    Returns:
        训练参数字典
    """
    return {
        "output_dir": config.output_dir,
        "num_train_epochs": config.num_train_epochs,
        "per_device_train_batch_size": config.per_device_train_batch_size,
        "gradient_accumulation_steps": config.gradient_accumulation_steps,
        "learning_rate": config.learning_rate,
        "weight_decay": config.weight_decay,
        "warmup_ratio": config.warmup_ratio,
        "lr_scheduler_type": config.lr_scheduler_type,
        "optim": config.optim,
        "logging_steps": config.logging_steps,
        "save_steps": config.save_steps,
        "eval_steps": config.eval_steps,
        "fp16": config.fp16,
        "bf16": config.bf16,
        "gradient_checkpointing": config.gradient_checkpointing,
        "report_to": "none"
    }
```

### 训练脚本

```python
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TrainingArguments,
    Trainer
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset

def train_lora(
    model_name: str,
    dataset_path: str,
    output_dir: str,
    lora_config: Dict[str, Any],
    training_config: Dict[str, Any]
) -> str:
    """
    执行 LoRA 微调
    
    Args:
        model_name: 基础模型名称
        dataset_path: 数据集路径
        output_dir: 输出目录
        lora_config: LoRA 配置
        training_config: 训练配置
        
    Returns:
        模型保存路径
    """
    # 加载模型和分词器
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        torch_dtype="auto",
        device_map="auto"
    )
    
    # 准备模型
    model = prepare_model_for_kbit_training(model)
    
    # 应用 LoRA
    peft_config = LoraConfig(**lora_config)
    model = get_peft_model(model, peft_config)
    
    # 加载数据集
    dataset = load_dataset("json", data_files=dataset_path)
    
    # 训练参数
    training_args = TrainingArguments(
        output_dir=output_dir,
        **training_config
    )
    
    # 训练器
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=dataset["train"],
        tokenizer=tokenizer
    )
    
    # 开始训练
    trainer.train()
    
    # 保存模型
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    
    return output_dir
```

## 模型合并

### 合并 LoRA 权重

```python
from peft import PeftModel

def merge_lora_weights(
    base_model_path: str,
    lora_weights_path: str,
    output_path: str
) -> str:
    """
    合并 LoRA 权重到基础模型
    
    Args:
        base_model_path: 基础模型路径
        lora_weights_path: LoRA 权重路径
        output_path: 输出路径
        
    Returns:
        合并后模型路径
    """
    # 加载基础模型
    base_model = AutoModelForCausalLM.from_pretrained(
        base_model_path,
        torch_dtype="auto",
        device_map="auto"
    )
    
    # 加载 LoRA 权重
    model = PeftModel.from_pretrained(base_model, lora_weights_path)
    
    # 合并权重
    merged_model = model.merge_and_unload()
    
    # 保存合并后的模型
    merged_model.save_pretrained(output_path)
    
    return output_path
```

## Quick Reference

| 技术 | 用途 | 适用场景 |
|------|------|----------|
| LoRA | 低秩适配 | 通用微调 |
| QLoRA | 量化微调 | 显存受限 |
| Full Fine-tuning | 全量微调 | 大规模数据 |
| Prefix Tuning | 前缀微调 | 生成任务 |
| Prompt Tuning | 提示微调 | 少样本场景 |
| Adapter | 适配器微调 | 多任务场景 |
