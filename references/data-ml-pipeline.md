# ML Pipeline 参考

> Reference for: fullstack-dev-skills
> Load when: MLflow、Kubeflow、特征存储、实验追踪

## MLflow 集成

### 实验追踪

```python
from typing import Dict, Any
import mlflow
import mlflow.sklearn

def track_experiment(
    experiment_name: str,
    model_name: str,
    params: Dict[str, Any],
    metrics: Dict[str, float],
    artifacts: Dict[str, str]
) -> str:
    """
    追踪 ML 实验
    
    Args:
        experiment_name: 实验名称
        model_name: 模型名称
        params: 模型参数
        metrics: 评估指标
        artifacts: 工件路径
        
    Returns:
        实验运行 ID
    """
    mlflow.set_experiment(experiment_name)
    
    with mlflow.start_run() as run:
        # 记录参数
        mlflow.log_params(params)
        
        # 记录指标
        mlflow.log_metrics(metrics)
        
        # 记录工件
        for name, path in artifacts.items():
            mlflow.log_artifact(path, name)
        
        # 注册模型
        mlflow.sklearn.log_model(
            sk_model=model_name,
            artifact_path="model"
        )
        
        return run.info.run_id
```

### 模型注册

```python
from mlflow.tracking import MlflowClient

def register_model(
    model_name: str,
    run_id: str,
    stage: str = "Staging"
) -> str:
    """
    注册模型到 Model Registry
    
    Args:
        model_name: 模型名称
        run_id: 实验运行 ID
        stage: 部署阶段
        
    Returns:
        模型版本
    """
    client = MlflowClient()
    
    model_uri = f"runs:/{run_id}/model"
    model_version = mlflow.register_model(
        model_uri,
        model_name
    )
    
    client.transition_model_version_stage(
        name=model_name,
        version=model_version.version,
        stage=stage
    )
    
    return model_version.version
```

## 特征存储

### 特征定义

```python
from typing import List, Optional
from dataclasses import dataclass
from datetime import datetime

@dataclass
class Feature:
    """
    特征定义
    """
    name: str
    dtype: str
    description: str
    source: str
    transformation: Optional[str] = None
    default_value: Optional[Any] = None

@dataclass
class FeatureGroup:
    """
    特征组
    """
    name: str
    features: List[Feature]
    entity_keys: List[str]
    ttl_seconds: int
    online_store: bool = True
    offline_store: bool = True

def create_feature_group(
    name: str,
    features: List[Feature],
    entity_keys: List[str]
) -> FeatureGroup:
    """
    创建特征组
    
    Args:
        name: 特征组名称
        features: 特征列表
        entity_keys: 实体键
        
    Returns:
        特征组对象
    """
    return FeatureGroup(
        name=name,
        features=features,
        entity_keys=entity_keys,
        ttl_seconds=86400
    )
```

### 特征服务

```python
from typing import Dict, List
import pandas as pd

class FeatureStore:
    """
    特征存储服务
    """
    
    def __init__(self, store_uri: str):
        self.store_uri = store_uri
    
    def get_online_features(
        self,
        entity_rows: List[Dict[str, Any]],
        feature_names: List[str]
    ) -> pd.DataFrame:
        """
        获取在线特征
        
        Args:
            entity_rows: 实体行数据
            feature_names: 特征名称列表
            
        Returns:
            特征数据框
        """
        pass
    
    def get_historical_features(
        self,
        entity_df: pd.DataFrame,
        feature_names: List[str]
    ) -> pd.DataFrame:
        """
        获取历史特征
        
        Args:
            entity_df: 实体数据框
            feature_names: 特征名称列表
            
        Returns:
            特征数据框
        """
        pass
```

## Kubeflow Pipelines

### Pipeline 定义

```python
from kfp import dsl
from kfp.dsl import component, pipeline

@component(
    base_image="python:3.9",
    packages_to_install=["pandas", "scikit-learn"]
)
def preprocess_data(
    input_path: str,
    output_path: str
) -> str:
    """
    数据预处理组件
    
    Args:
        input_path: 输入数据路径
        output_path: 输出数据路径
        
    Returns:
        输出路径
    """
    import pandas as pd
    from sklearn.preprocessing import StandardScaler
    
    df = pd.read_csv(input_path)
    scaler = StandardScaler()
    df_scaled = scaler.fit_transform(df)
    pd.DataFrame(df_scaled).to_csv(output_path, index=False)
    
    return output_path

@component(
    base_image="python:3.9",
    packages_to_install=["scikit-learn", "mlflow"]
)
def train_model(
    data_path: str,
    model_path: str,
    experiment_name: str
) -> float:
    """
    模型训练组件
    
    Args:
        data_path: 数据路径
        model_path: 模型保存路径
        experiment_name: 实验名称
        
    Returns:
        模型准确率
    """
    import pandas as pd
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.model_selection import train_test_split
    import mlflow
    
    df = pd.read_csv(data_path)
    X = df.drop("target", axis=1)
    y = df["target"]
    
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2
    )
    
    model = RandomForestClassifier(n_estimators=100)
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    
    mlflow.log_metric("accuracy", accuracy)
    
    return accuracy

@pipeline(name="ml-training-pipeline")
def ml_pipeline(
    input_data: str,
    output_data: str,
    model_path: str
):
    """
    ML 训练流水线
    """
    preprocess = preprocess_data(
        input_path=input_data,
        output_path=output_data
    )
    
    train = train_model(
        data_path=preprocess.output,
        model_path=model_path,
        experiment_name="ml-pipeline"
    )
```

## Quick Reference

| 组件 | 用途 | 工具 |
|------|------|------|
| 实验追踪 | 记录参数和指标 | MLflow Tracking |
| 模型注册 | 版本管理 | MLflow Registry |
| 特征存储 | 特征管理 | Feast / Tecton |
| Pipeline | 工作流编排 | Kubeflow / Airflow |
| 模型服务 | 在线推理 | MLflow Serving / Seldon |
| 监控 | 模型监控 | Evidently / WhyLabs |
