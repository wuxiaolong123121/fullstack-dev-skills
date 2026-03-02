# Spark 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 PySpark、分布式处理、Spark SQL、大数据处理相关任务

## 核心特性

Apache Spark 是统一的大数据分析引擎，提供内存计算、分布式处理能力。本参考涵盖 PySpark 编程、Spark SQL、RDD 操作、性能优化等核心内容。

### Spark 核心组件

| 组件 | 功能 | 适用场景 |
|-----|------|---------|
| Spark Core | 基础引擎 | RDD 操作 |
| Spark SQL | 结构化数据 | DataFrame, SQL 查询 |
| Spark Streaming | 流处理 | 实时数据处理 |
| MLlib | 机器学习 | 分布式 ML |
| GraphX | 图计算 | 图算法 |

## 最佳实践

### 1. SparkSession 初始化与配置

```python
from pyspark.sql import SparkSession
from pyspark import SparkConf
from typing import Optional, Dict, Any

def create_spark_session(
    app_name: str,
    master: Optional[str] = None,
    config: Optional[Dict[str, Any]] = None
) -> SparkSession:
    """
    创建 SparkSession 实例
    
    Args:
        app_name: 应用名称
        master: 集群管理器地址 (如 'local[*]', 'yarn', 'spark://host:port')
        config: 额外配置项字典
        
    Returns:
        配置好的 SparkSession 实例
        
    Example:
        >>> spark = create_spark_session(
        ...     'MyApp',
        ...     'local[4]',
        ...     {'spark.driver.memory': '4g'}
        ... )
    """
    builder = SparkSession.builder.appName(app_name)
    
    if master:
        builder = builder.master(master)
    
    default_config = {
        'spark.sql.adaptive.enabled': 'true',
        'spark.sql.adaptive.coalescePartitions.enabled': 'true',
        'spark.sql.shuffle.partitions': '200',
        'spark.default.parallelism': '8'
    }
    
    all_config = {**default_config, **(config or {})}
    
    for key, value in all_config.items():
        builder = builder.config(key, value)
    
    return builder.getOrCreate()


def optimize_spark_config(
    spark: SparkSession,
    executor_memory: str = '4g',
    executor_cores: int = 2,
    driver_memory: str = '2g'
) -> None:
    """
    优化 Spark 运行配置
    
    Args:
        spark: SparkSession 实例
        executor_memory: 执行器内存
        executor_cores: 执行器核心数
        driver_memory: 驱动器内存
    """
    spark.conf.set('spark.executor.memory', executor_memory)
    spark.conf.set('spark.executor.cores', str(executor_cores))
    spark.conf.set('spark.driver.memory', driver_memory)
    spark.conf.set('spark.sql.execution.arrow.pyspark.enabled', 'true')
    spark.conf.set('spark.sql.execution.arrow.maxRecordsPerBatch', '10000')
```

### 2. DataFrame 操作

```python
from pyspark.sql import DataFrame
from pyspark.sql.functions import (
    col, lit, when, count, sum as spark_sum, 
    avg, max as spark_max, min as spark_min,
    countDistinct, upper, lower, trim, regexp_replace,
    to_date, to_timestamp, year, month, dayofmonth,
    concat, substring, length, split, explode
)
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, 
    DoubleType, BooleanType, DateType, TimestampType
)

def create_dataframe_from_data(
    spark: SparkSession,
    data: list,
    schema: Optional[StructType] = None
) -> DataFrame:
    """
    从数据列表创建 DataFrame
    
    Args:
        spark: SparkSession 实例
        data: 数据列表
        schema: 可选的 Schema 定义
        
    Returns:
        创建的 DataFrame
    """
    return spark.createDataFrame(data, schema=schema)


def define_schema(fields: list) -> StructType:
    """
    定义 DataFrame Schema
    
    Args:
        fields: 字段定义列表
            格式: [('字段名', '类型', True/False是否可空), ...]
            类型: 'string', 'int', 'double', 'boolean', 'date', 'timestamp'
        
    Returns:
        StructType Schema 对象
        
    Example:
        >>> schema = define_schema([
        ...     ('id', 'int', False),
        ...     ('name', 'string', True),
        ...     ('amount', 'double', True)
        ... ])
    """
    type_mapping = {
        'string': StringType(),
        'int': IntegerType(),
        'double': DoubleType(),
        'boolean': BooleanType(),
        'date': DateType(),
        'timestamp': TimestampType()
    }
    
    struct_fields = [
        StructField(name, type_mapping[dtype], nullable)
        for name, dtype, nullable in fields
    ]
    
    return StructType(struct_fields)


def select_columns(df: DataFrame, columns: list) -> DataFrame:
    """
    选择指定列
    
    Args:
        df: 源 DataFrame
        columns: 列名列表，支持表达式
        
    Returns:
        选定列的 DataFrame
    """
    return df.select(*columns)


def filter_dataframe(
    df: DataFrame,
    conditions: list,
    operator: str = 'and'
) -> DataFrame:
    """
    过滤 DataFrame
    
    Args:
        df: 源 DataFrame
        conditions: 条件表达式列表
        operator: 条件组合方式 ('and', 'or')
        
    Returns:
        过滤后的 DataFrame
        
    Example:
        >>> filtered = filter_dataframe(df, [
        ...     col('age') > 18,
        ...     col('city') == 'Beijing'
        ... ])
    """
    if not conditions:
        return df
    
    combined = conditions[0]
    for condition in conditions[1:]:
        if operator == 'and':
            combined = combined & condition
        else:
            combined = combined | condition
    
    return df.filter(combined)


def add_columns(
    df: DataFrame,
    column_definitions: Dict[str, Any]
) -> DataFrame:
    """
    添加新列
    
    Args:
        df: 源 DataFrame
        column_definitions: 列名到表达式的映射
        
    Returns:
        添加列后的 DataFrame
        
    Example:
        >>> df = add_columns(df, {
        ...     'total': col('price') * col('quantity'),
        ...     'category': when(col('amount') > 100, 'high').otherwise('low')
        ... })
    """
    result = df
    for col_name, expr in column_definitions.items():
        result = result.withColumn(col_name, expr)
    return result


def rename_columns(
    df: DataFrame,
    rename_map: Dict[str, str]
) -> DataFrame:
    """
    重命名列
    
    Args:
        df: 源 DataFrame
        rename_map: 旧列名到新列名的映射
        
    Returns:
        重命名后的 DataFrame
    """
    for old_name, new_name in rename_map.items():
        df = df.withColumnRenamed(old_name, new_name)
    return df


def drop_columns(df: DataFrame, columns: list) -> DataFrame:
    """
    删除列
    
    Args:
        df: 源 DataFrame
        columns: 要删除的列名列表
        
    Returns:
        删除列后的 DataFrame
    """
    return df.drop(*columns)
```

### 3. 数据清洗与转换

```python
from pyspark.sql.functions import coalesce, isnan, isnull

def handle_null_values(
    df: DataFrame,
    strategy: Dict[str, Any]
) -> DataFrame:
    """
    处理空值
    
    Args:
        df: 源 DataFrame
        strategy: 列名到处理策略的映射
            - 'drop': 删除含空值的行
            - {'fill': value}: 用指定值填充
            - {'fill_with': 'mean/median/mode'}: 用统计值填充
        
    Returns:
        处理后的 DataFrame
    """
    result = df
    
    for column, method in strategy.items():
        if column not in result.columns:
            continue
            
        if method == 'drop':
            result = result.na.drop(subset=[column])
        elif isinstance(method, dict):
            if 'fill' in method:
                result = result.na.fill({column: method['fill']})
            elif 'fill_with' in method:
                fill_type = method['fill_with']
                if fill_type == 'mean':
                    mean_val = result.select(avg(col(column))).collect()[0][0]
                    result = result.na.fill({column: mean_val})
                elif fill_type == 'median':
                    median_val = result.approxQuantile(column, [0.5], 0.01)[0]
                    result = result.na.fill({column: median_val})
    
    return result


def remove_duplicates(
    df: DataFrame,
    subset: Optional[list] = None
) -> DataFrame:
    """
    移除重复行
    
    Args:
        df: 源 DataFrame
        subset: 用于判断重复的列名列表
        
    Returns:
        去重后的 DataFrame
    """
    return df.dropDuplicates(subset=subset)


def standardize_string_columns(
    df: DataFrame,
    columns: list,
    operations: list = ['trim', 'lower']
) -> DataFrame:
    """
    标准化字符串列
    
    Args:
        df: 源 DataFrame
        columns: 要处理的列名列表
        operations: 操作列表 ('trim', 'upper', 'lower')
        
    Returns:
        标准化后的 DataFrame
    """
    result = df
    
    for column in columns:
        if column not in result.columns:
            continue
            
        col_expr = col(column)
        
        if 'trim' in operations:
            col_expr = trim(col_expr)
        if 'upper' in operations:
            col_expr = upper(col_expr)
        if 'lower' in operations:
            col_expr = lower(col_expr)
        
        result = result.withColumn(column, col_expr)
    
    return result


def convert_data_types(
    df: DataFrame,
    type_mapping: Dict[str, str]
) -> DataFrame:
    """
    转换数据类型
    
    Args:
        df: 源 DataFrame
        type_mapping: 列名到目标类型的映射
            支持: 'string', 'int', 'double', 'boolean', 'date', 'timestamp'
        
    Returns:
        类型转换后的 DataFrame
    """
    result = df
    
    for column, dtype in type_mapping.items():
        if column not in result.columns:
            continue
            
        if dtype == 'string':
            result = result.withColumn(column, col(column).cast(StringType()))
        elif dtype == 'int':
            result = result.withColumn(column, col(column).cast(IntegerType()))
        elif dtype == 'double':
            result = result.withColumn(column, col(column).cast(DoubleType()))
        elif dtype == 'boolean':
            result = result.withColumn(column, col(column).cast(BooleanType()))
        elif dtype == 'date':
            result = result.withColumn(column, to_date(col(column)))
        elif dtype == 'timestamp':
            result = result.withColumn(column, to_timestamp(col(column)))
    
    return result


def clean_text_column(
    df: DataFrame,
    column: str,
    patterns: list
) -> DataFrame:
    """
    清理文本列
    
    Args:
        df: 源 DataFrame
        column: 目标列名
        patterns: 要替换的正则表达式列表
        
    Returns:
        清理后的 DataFrame
        
    Example:
        >>> df = clean_text_column(df, 'text', [r'\\d+', r'[^a-zA-Z]'])
    """
    result = df
    col_expr = col(column)
    
    for pattern in patterns:
        col_expr = regexp_replace(col_expr, pattern, '')
    
    return result.withColumn(column, col_expr)
```

### 4. 聚合与分组

```python
from pyspark.sql.functions import collect_list, collect_set, first, last

def group_and_aggregate(
    df: DataFrame,
    group_by: list,
    aggregations: Dict[str, list]
) -> DataFrame:
    """
    分组聚合操作
    
    Args:
        df: 源 DataFrame
        group_by: 分组列名列表
        aggregations: 聚合配置
            格式: {'列名': ['聚合函数1', '聚合函数2'], ...}
            支持函数: 'sum', 'avg', 'count', 'min', 'max', 'countDistinct'
        
    Returns:
        聚合后的 DataFrame
        
    Example:
        >>> result = group_and_aggregate(df, ['region'], {
        ...     'sales': ['sum', 'avg'],
        ...     'customer_id': ['countDistinct']
        ... })
    """
    agg_exprs = []
    
    agg_functions = {
        'sum': spark_sum,
        'avg': avg,
        'count': count,
        'min': spark_min,
        'max': spark_max,
        'countDistinct': countDistinct,
        'collect_list': collect_list,
        'collect_set': collect_set,
        'first': first,
        'last': last
    }
    
    for column, funcs in aggregations.items():
        for func_name in funcs:
            func = agg_functions.get(func_name, count)
            agg_exprs.append(func(col(column)).alias(f'{column}_{func_name}'))
    
    return df.groupBy(*group_by).agg(*agg_exprs)


def pivot_table(
    df: DataFrame,
    group_by: list,
    pivot_column: str,
    value_column: str,
    agg_func: str = 'sum'
) -> DataFrame:
    """
    创建透视表
    
    Args:
        df: 源 DataFrame
        group_by: 行分组列
        pivot_column: 透视列
        value_column: 值列
        agg_func: 聚合函数
        
    Returns:
        透视表 DataFrame
    """
    agg_functions = {
        'sum': spark_sum,
        'avg': avg,
        'count': count,
        'min': spark_min,
        'max': spark_max
    }
    
    func = agg_functions.get(agg_func, spark_sum)
    
    return df.groupBy(*group_by).pivot(pivot_column).agg(func(col(value_column)))


def window_aggregation(
    df: DataFrame,
    partition_by: list,
    order_by: list,
    window_func: str,
    column: str,
    window_spec: Optional[str] = None
) -> DataFrame:
    """
    窗口函数聚合
    
    Args:
        df: 源 DataFrame
        partition_by: 分区列
        order_by: 排序列
        window_func: 窗口函数 ('row_number', 'rank', 'dense_rank', 'lag', 'lead', 'sum', 'avg')
        column: