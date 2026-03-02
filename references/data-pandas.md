# Pandas 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Pandas、DataFrame、数据清洗、数据分析相关任务

## 核心特性

Pandas 是 Python 数据分析的核心库，提供高性能、易用的数据结构和数据分析工具。本参考涵盖 DataFrame 操作、数据清洗、聚合分析、时间序列处理等核心功能。

### Pandas 数据结构

| 结构 | 维度 | 用途 | 特点 |
|-----|------|-----|------|
| Series | 1D | 单列数据 | 带标签的一维数组 |
| DataFrame | 2D | 表格数据 | 带行列标签的二维表格 |
| Index | - | 标签索引 | 支持多种索引类型 |
| MultiIndex | - | 层级索引 | 多级索引结构 |

## 最佳实践

### 1. DataFrame 创建与基础操作

```python
import pandas as pd
import numpy as np
from typing import List, Dict, Any, Optional, Union

def create_dataframe_from_dict(
    data: Dict[str, List[Any]],
    index: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    从字典创建 DataFrame
    
    Args:
        data: 列名到数据列表的映射字典
        index: 行索引标签列表
        
    Returns:
        创建的 DataFrame 对象
        
    Example:
        >>> data = {'name': ['Alice', 'Bob'], 'age': [25, 30]}
        >>> df = create_dataframe_from_dict(data)
    """
    df = pd.DataFrame(data, index=index)
    return df


def create_dataframe_from_records(
    records: List[Dict[str, Any]],
    columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    从记录列表创建 DataFrame
    
    Args:
        records: 字典列表，每个字典代表一行
        columns: 指定列名顺序
        
    Returns:
        创建的 DataFrame 对象
    """
    df = pd.DataFrame.from_records(records, columns=columns)
    return df


def get_dataframe_info(df: pd.DataFrame) -> Dict[str, Any]:
    """
    获取 DataFrame 基本信息
    
    Args:
        df: 目标 DataFrame
        
    Returns:
        包含基本信息的字典
    """
    info = {
        'shape': df.shape,
        'columns': df.columns.tolist(),
        'dtypes': df.dtypes.to_dict(),
        'memory_usage': df.memory_usage(deep=True).sum(),
        'null_counts': df.isnull().sum().to_dict(),
        'duplicate_rows': df.duplicated().sum()
    }
    return info


def select_columns(
    df: pd.DataFrame,
    columns: Union[List[str], str],
    regex: Optional[str] = None
) -> pd.DataFrame:
    """
    选择指定列
    
    Args:
        df: 源 DataFrame
        columns: 列名列表或单个列名
        regex: 正则表达式匹配列名
        
    Returns:
        包含选定列的 DataFrame
    """
    if regex:
        return df.filter(regex=regex)
    
    if isinstance(columns, str):
        columns = [columns]
    
    return df[columns].copy()


def filter_rows(
    df: pd.DataFrame,
    conditions: Dict[str, Any],
    operator: str = 'and'
) -> pd.DataFrame:
    """
    根据条件过滤行
    
    Args:
        df: 源 DataFrame
        conditions: 列名到条件的映射
        operator: 条件组合方式 ('and' 或 'or')
        
    Returns:
        过滤后的 DataFrame
        
    Example:
        >>> conditions = {'age': ('>', 18), 'city': ('==', 'Beijing')}
        >>> filtered = filter_rows(df, conditions)
    """
    masks = []
    
    for column, condition in conditions.items():
        if isinstance(condition, tuple):
            op, value = condition
            if op == '>':
                masks.append(df[column] > value)
            elif op == '<':
                masks.append(df[column] < value)
            elif op == '>=':
                masks.append(df[column] >= value)
            elif op == '<=':
                masks.append(df[column] <= value)
            elif op == '==':
                masks.append(df[column] == value)
            elif op == '!=':
                masks.append(df[column] != value)
            elif op == 'in':
                masks.append(df[column].isin(value))
            elif op == 'contains':
                masks.append(df[column].str.contains(value, na=False))
        else:
            masks.append(df[column] == condition)
    
    if operator == 'and':
        combined_mask = pd.concat(masks, axis=1).all(axis=1)
    else:
        combined_mask = pd.concat(masks, axis=1).any(axis=1)
    
    return df[combined_mask].copy()
```

### 2. 数据清洗

```python
def handle_missing_values(
    df: pd.DataFrame,
    strategy: Dict[str, str],
    fill_values: Optional[Dict[str, Any]] = None
) -> pd.DataFrame:
    """
    处理缺失值
    
    Args:
        df: 源 DataFrame
        strategy: 列名到处理策略的映射
            - 'drop': 删除含缺失值的行
            - 'mean': 用均值填充
            - 'median': 用中位数填充
            - 'mode': 用众数填充
            - 'ffill': 前向填充
            - 'bfill': 后向填充
            - 'constant': 用指定值填充
        fill_values: 使用 constant 策略时的填充值
        
    Returns:
        处理后的 DataFrame
    """
    df_clean = df.copy()
    fill_values = fill_values or {}
    
    for column, method in strategy.items():
        if column not in df_clean.columns:
            continue
            
        if method == 'drop':
            df_clean = df_clean.dropna(subset=[column])
        elif method == 'mean':
            df_clean[column] = df_clean[column].fillna(df_clean[column].mean())
        elif method == 'median':
            df_clean[column] = df_clean[column].fillna(df_clean[column].median())
        elif method == 'mode':
            mode_val = df_clean[column].mode()[0] if not df_clean[column].mode().empty else None
            if mode_val is not None:
                df_clean[column] = df_clean[column].fillna(mode_val)
        elif method == 'ffill':
            df_clean[column] = df_clean[column].ffill()
        elif method == 'bfill':
            df_clean[column] = df_clean[column].bfill()
        elif method == 'constant':
            df_clean[column] = df_clean[column].fillna(fill_values.get(column))
    
    return df_clean


def remove_duplicates(
    df: pd.DataFrame,
    subset: Optional[List[str]] = None,
    keep: str = 'first'
) -> pd.DataFrame:
    """
    移除重复行
    
    Args:
        df: 源 DataFrame
        subset: 用于判断重复的列名列表
        keep: 保留策略 ('first', 'last', False)
        
    Returns:
        去重后的 DataFrame
    """
    return df.drop_duplicates(subset=subset, keep=keep).reset_index(drop=True)


def standardize_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """
    标准化列名格式
    
    Args:
        df: 源 DataFrame
        
    Returns:
        列名标准化后的 DataFrame
    """
    df_clean = df.copy()
    df_clean.columns = (
        df_clean.columns
        .str.strip()
        .str.lower()
        .str.replace(' ', '_')
        .str.replace(r'[^\w]', '', regex=True)
    )
    return df_clean


def convert_data_types(
    df: pd.DataFrame,
    type_mapping: Dict[str, str]
) -> pd.DataFrame:
    """
    转换数据类型
    
    Args:
        df: 源 DataFrame
        type_mapping: 列名到目标类型的映射
            支持类型: 'int', 'float', 'str', 'bool', 'datetime', 'category'
        
    Returns:
        类型转换后的 DataFrame
    """
    df_converted = df.copy()
    
    for column, dtype in type_mapping.items():
        if column not in df_converted.columns:
            continue
            
        if dtype == 'int':
            df_converted[column] = pd.to_numeric(df_converted[column], errors='coerce').astype('Int64')
        elif dtype == 'float':
            df_converted[column] = pd.to_numeric(df_converted[column], errors='coerce')
        elif dtype == 'str':
            df_converted[column] = df_converted[column].astype(str)
        elif dtype == 'bool':
            df_converted[column] = df_converted[column].astype('boolean')
        elif dtype == 'datetime':
            df_converted[column] = pd.to_datetime(df_converted[column], errors='coerce')
        elif dtype == 'category':
            df_converted[column] = df_converted[column].astype('category')
    
    return df_converted


def detect_outliers(
    df: pd.DataFrame,
    column: str,
    method: str = 'iqr',
    threshold: float = 1.5
) -> pd.DataFrame:
    """
    检测异常值
    
    Args:
        df: 源 DataFrame
        column: 目标列名
        method: 检测方法 ('iqr', 'zscore')
        threshold: 阈值系数
        
    Returns:
        包含异常值标记的 DataFrame
    """
    df_result = df.copy()
    
    if method == 'iqr':
        Q1 = df[column].quantile(0.25)
        Q3 = df[column].quantile(0.75)
        IQR = Q3 - Q1
        lower_bound = Q1 - threshold * IQR
        upper_bound = Q3 + threshold * IQR
        df_result['is_outlier'] = (df[column] < lower_bound) | (df[column] > upper_bound)
        
    elif method == 'zscore':
        mean = df[column].mean()
        std = df[column].std()
        z_scores = (df[column] - mean) / std
        df_result['is_outlier'] = abs(z_scores) > threshold
    
    return df_result


def remove_outliers(
    df: pd.DataFrame,
    column: str,
    method: str = 'iqr',
    threshold: float = 1.5
) -> pd.DataFrame:
    """
    移除异常值
    
    Args:
        df: 源 DataFrame
        column: 目标列名
        method: 检测方法 ('iqr', 'zscore')
        threshold: 阈值系数
        
    Returns:
        移除异常值后的 DataFrame
    """
    df_with_outliers = detect_outliers(df, column, method, threshold)
    return df_with_outliers[~df_with_outliers['is_outlier']].drop(columns=['is_outlier'])
```

### 3. 数据聚合与分组

```python
def group_and_aggregate(
    df: pd.DataFrame,
    group_by: Union[str, List[str]],
    aggregations: Dict[str, Union[str, List[str]]]
) -> pd.DataFrame:
    """
    分组聚合操作
    
    Args:
        df: 源 DataFrame
        group_by: 分组列名
        aggregations: 聚合配置
            格式: {'列名': '聚合函数'} 或 {'列名': ['函数1', '函数2']}
            支持函数: 'sum', 'mean', 'count', 'min', 'max', 'std', 'var', 'first', 'last'
        
    Returns:
        聚合后的 DataFrame
        
    Example:
        >>> agg_config = {'sales': ['sum', 'mean'], 'quantity': 'sum'}
        >>> result = group_and_aggregate(df, 'region', agg_config)
    """
    grouped = df.groupby(group_by, as_index=False)
    result = grouped.agg(aggregations)
    
    if isinstance(result.columns, pd.MultiIndex):
        result.columns = [
            '_'.join(col).strip('_') if col[1] else col[0]
            for col in result.columns.values
        ]
    
    return result


def pivot_table_advanced(
    df: pd.DataFrame,
    index: Union[str, List[str]],
    columns: Union[str, List[str]],
    values: str,
    aggfunc: str = 'mean',
    fill_value: Any = None
) -> pd.DataFrame:
    """
    创建高级透视表
    
    Args:
        df: 源 DataFrame
        index: 行索引列
        columns: 列索引列
        values: 值列
        aggfunc: 聚合函数
        fill_value: 填充空值
        
    Returns:
        透视表 DataFrame
    """
    pivot = pd.pivot_table(
        df,
        index=index,
        columns=columns,
        values=values,
        aggfunc=aggfunc,
        fill_value=fill_value
    )
    return pivot


def calculate_statistics(
    df: pd.DataFrame,
    columns: Optional[List[str]] = None
) -> pd.DataFrame:
    """
    计算描述性统计
    
    Args:
        df: 源 DataFrame
        columns: 目标列名列表，默认为所有数值列
        
    Returns:
        统计信息 DataFrame
    """
    if columns:
        df_stats = df[columns]
    else:
        df_stats = df.select_dtypes(include=[np.number])
    
    stats = df_stats.describe().T
    stats['median'] = df_stats.median()
    stats['skew'] = df_stats.skew()
    stats['kurtosis'] = df_stats.kurtosis()
    stats['missing'] = df_stats.isnull().sum()
    stats['missing_pct'] = (df_stats.isnull().sum() / len(df_stats) * 100).round(2)
    
    return stats


def apply_custom_aggregation(
    df: pd.DataFrame,
    group_by: str,
    column: str,
    custom_func: callable
) -> pd.DataFrame:
    """
    应用自定义聚合函数
    
    Args:
        df: 源 DataFrame
        group_by: 分组列名
        column: 目标列名
        custom_func: 自定义聚合函数
        
    Returns:
        聚合结果 DataFrame
        
    Example:
        >>> def range_func(x):
        ...     return x.max() - x.min()
        >>> result = apply_custom_aggregation(df, 'category', 'price', range_func)
    """
    result = df.groupby(group_by)[column].agg(custom_func).reset_index()
    result.columns = [group_by, f'{column}_custom']
    return result
```

### 4. 时间序列处理

```python
def create_time_series(
    df: pd.DataFrame,
    date_column: str,
    value_column: str,
    freq: str = 'D'
) -> pd.DataFrame:
    """
    创建时间序列
    
    Args:
        df: 源 DataFrame
        date_column: 日期列名
        value_column: 值列名
        freq: 时间频率 ('D'=日, 'W'=周, 'M'=月, 'Q'=季, 'Y'=年)
        
    Returns:
        时间序列 DataFrame
    """
    df_ts = df.copy()
    df_ts[date_column] = pd.to_datetime(df_ts[date_column])
    df_ts = df_ts.set_index(date_column)
    df_ts = df_ts[[value_column]].sort_index()
    df_ts = df_ts.resample(freq).mean()
    return df_ts


def resample_time_series(
    df: pd.DataFrame,
    date_column: str,
    freq: str,
    aggregation: str = 'mean'
) -> pd.DataFrame:
    """
    重采样时间序列
    
    Args:
        df: 源 DataFrame
        date_column: 日期列名
        freq: 目标频率
        aggregation: 聚合方法
        
    Returns:
        重采样后的 DataFrame
    """
    df_resampled = df.copy()
    df_resampled[date_column] = pd.to_datetime(df_resampled[date_column])
    df_resampled = df_resampled.set_index(date_column)
    
    agg_methods = {
        'sum': df_resampled.resample(freq).sum(),
        'mean': df_resampled.resample(freq).mean(),
        'count': df_resampled.resample(freq).count(),
        'first': df_resampled.resample(freq).first(),
        'last': df_resampled.resample(freq).last(),
        'max': df_resampled.resample(freq).max(),
        'min': df_resampled.resample(freq).min()
    }
    
    result = agg_methods.get(aggregation, df_resampled.resample(freq).mean())
    return result.reset_index()


def add_time_features(df: pd.DataFrame, date_column: str) -> pd.DataFrame:
    """
    添加时间特征
    
    Args:
        df: 源 DataFrame
        date_column: 日期列名
        
    Returns:
        添加时间特征后的 DataFrame
    """
    df_features = df.copy()
    df_features[date_column] = pd.to_datetime(df_features[date_column])
    
    df_features['year'] = df_features[date_column].dt.year
    df_features['month'] = df_features[date_column].dt.month
    df_features['day'] = df_features[date_column].dt.day
    df_features['day_of_week'] = df_features[date_column].dt.dayofweek
    df_features['day_of_year'] = df_features[date_column].dt.dayofyear
    df_features['week_of_year'] = df_features[date_column].dt.isocalendar().week
    df_features['quarter'] = df_features[date_column].dt.quarter
    df_features['is_weekend'] = df_features[date_column].dt.dayofweek.isin([5, 6])
    df_features['is_month_start'] = df_features[date_column].dt.is_month_start
    df_features['is_month_end'] = df_features[date_column].dt.is_month_end
    
    return df_features


def calculate_rolling_statistics(
    df: pd.DataFrame,
    column: str,
    window: int = 7,
    statistics: List[str] = ['mean', 'std']
) -> pd.DataFrame:
    """
    计算滚动统计量
    
    Args:
        df: 源 DataFrame
        column: 目标列名
        window: 滚动窗口大小
        statistics: 统计量列表
        
    Returns:
        添加滚动统计量后的 DataFrame
    """
    df_rolling = df.copy()
    
    for stat in statistics:
        if stat == 'mean':
            df_rolling[f'{column}_rolling_mean_{window}'] = df_rolling[column].rolling(window=window).mean()
        elif stat == 'std':
            df_rolling[f'{column}_rolling_std_{window}'] = df_rolling[column].rolling(window=window).std()
        elif stat == 'min':
            df_rolling[f'{column}_rolling_min_{window}'] = df_rolling[column].rolling(window=window).min()
        elif stat == 'max':
            df_rolling[f'{column}_rolling_max_{window}'] = df_rolling[column].rolling(window=window).max()
        elif stat == 'sum':
            df_rolling[f'{column}_rolling_sum_{window}'] = df_rolling[column].rolling(window=window).sum()
    
    return df_rolling


def fill_time_gaps(
    df: pd.DataFrame,
    date_column: str,
    freq: str = 'D',
    fill_method: str = 'ffill'
) -> pd.DataFrame:
    """
    填充时间序列空缺
    
    Args:
        df: 源 DataFrame
        date_column: 日期列名
        freq: 时间频率
        fill_method: 填充方法 ('ffill', 'bfill', 'interpolate')
        
    Returns:
        填充后的 DataFrame
    """
    df_filled = df.copy()
    df_filled[date_column] = pd.to_datetime(df_filled[date_column])
    df_filled = df_filled.set_index(date_column)
    
    full_range = pd.date_range(
        start=df_filled.index.min(),
        end=df_filled.index.max(),
        freq=freq
    )
    
    df_filled = df_filled.reindex(full_range)
    
    if fill_method == 'ffill':
        df_filled = df_filled.ffill()
    elif fill_method == 'bfill':
        df_filled = df_filled.bfill()
    elif fill_method == 'interpolate':
        df_filled = df_filled.interpolate()
    
    return df_filled.reset_index().rename(columns={'index': date_column})
```

### 5. 数据合并与连接

```python
def merge_dataframes(
    left: pd.DataFrame,
    right: pd.DataFrame,
    on: Union[str, List[str]],
    how: str = 'inner',
    suffixes: tuple = ('_left', '_right')
) -> pd.DataFrame:
    """
    合并两个 DataFrame
    
    Args:
        left: 左侧 DataFrame
        right: 右侧 DataFrame
        on: 连接键
        how: 连接方式 ('inner', 'left', 'right', 'outer')
        suffixes: 列名冲突时的后缀
        
    Returns:
        合并后的 DataFrame
    """
    return pd.merge(left, right, on=on, how=how, suffixes=suffixes)


def concat_dataframes(
    dfs: List[pd.DataFrame],
    axis: int = 0,
    ignore_index: bool = True
) -> pd.DataFrame:
    """
    拼接多个 DataFrame
    
    Args:
        dfs: DataFrame 列表
        axis: 拼接轴 (0=纵向, 1=横向)
        ignore_index: 是否重置索引
        
    Returns:
        拼接后的 DataFrame
    """
    return pd.concat(dfs, axis=axis, ignore_index=ignore_index)


def join_on_index(
    left: pd.DataFrame,
    right: pd.DataFrame,
    how: str = 'left',
    lsuffix: str = '_left',
    rsuffix: str = '_right'
) -> pd.DataFrame:
    """
    基于索引连接
    
    Args:
        left: 左侧 DataFrame
        right: 右侧 DataFrame
        how: 连接方式
        lsuffix: 左侧列名后缀
        rsuffix: 右侧列名后缀
        
    Returns:
        连接后的 DataFrame
    """
    return left.join(right, how=how, lsuffix=lsuffix, rsuffix=rsuffix)
```

## Quick Reference

| 操作 | 用途 | 示例 |
|-----|------|-----|
| 创建 | 从字典/列表创建 | `pd.DataFrame(data)` |
| 选择 | 选择列/行 | `df[['col1', 'col2']]`, `df.loc[]` |
| 过滤 | 条件筛选 | `df[df['col'] > 0]` |
| 缺失值 | 处理空值 | `fillna()`, `dropna()` |
| 分组聚合 | 分组统计 | `groupby().agg()` |
| 透视表 | 数据透视 | `pivot_table()` |
| 合并 | 连接表 | `merge()`, `concat()` |
| 时间序列 | 时间处理 | `resample()`, `rolling()` |
| 类型转换 | 转换数据类型 | `astype()`, `to_datetime()` |
| 排序 | 排序数据 | `sort_values()`, `sort_index()` |
