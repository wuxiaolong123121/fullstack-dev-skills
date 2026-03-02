# Salesforce Developer 参考

> Reference for: fullstack-dev-skills
> Load when: 用户请求 Salesforce 开发、Apex 代码、LWC 组件、SOQL 查询、Salesforce 集成相关任务

## 核心特性

Salesforce 是全球领先的 CRM 平台，提供强大的云端开发能力：

- **Apex**：类似 Java 的面向对象编程语言，用于业务逻辑实现
- **Lightning Web Components (LWC)**：基于 Web 标准的现代前端框架
- **SOQL/SOSL**：Salesforce 对象查询语言和搜索语言
- **Governor Limits**：平台资源限制，确保多租户环境稳定性
- **Trigger**：数据库触发器，实现自动化业务流程
- **Visualforce**：传统页面开发框架（遗留系统）

## 最佳实践

### Apex 类示例

```apex
/**
 * 账户服务类
 * 提供账户相关的业务逻辑处理
 */
public with sharing class AccountService {
    
    /**
     * 根据行业查询账户列表
     * @param industry 行业类型
     * @return 账户列表
     */
    public static List<Account> getAccountsByIndustry(String industry) {
        return [
            SELECT Id, Name, Industry, AnnualRevenue
            FROM Account
            WHERE Industry = :industry
            LIMIT 100
        ];
    }
    
    /**
     * 批量更新账户年收入
     * @param accountIds 账户ID列表
     * @param revenue 年收入金额
     * @return 更新结果
     */
    public static Database.SaveResult[] updateRevenue(
        List<Id> accountIds, 
        Decimal revenue
    ) {
        List<Account> accountsToUpdate = new List<Account>();
        
        for (Id accId : accountIds) {
            Account acc = new Account(
                Id = accId,
                AnnualRevenue = revenue
            );
            accountsToUpdate.add(acc);
        }
        
        return Database.update(accountsToUpdate, false);
    }
}
```

### Trigger 示例

```apex
/**
 * 账户触发器处理器
 * 处理账户对象的自动化业务逻辑
 */
public with sharing class AccountTriggerHandler {
    
    /**
     * 处理账户创建前逻辑
     * @param newAccounts 新建账户列表
     */
    public static void beforeInsert(List<Account> newAccounts) {
        for (Account acc : newAccounts) {
            if (String.isBlank(acc.Name)) {
                acc.Name = '新账户';
            }
            
            if (acc.AnnualRevenue == null) {
                acc.AnnualRevenue = 0;
            }
        }
    }
    
    /**
     * 处理账户更新后逻辑
     * @param newAccounts 更新后账户列表
     * @param oldAccounts 更新前账户Map
     */
    public static void afterUpdate(
        List<Account> newAccounts, 
        Map<Id, Account> oldAccounts
    ) {
        List<Task> tasksToCreate = new List<Task>();
        
        for (Account newAcc : newAccounts) {
            Account oldAcc = oldAccounts.get(newAcc.Id);
            
            if (newAcc.AnnualRevenue > oldAcc.AnnualRevenue * 2) {
                Task task = new Task(
                    Subject = '跟进高增长账户',
                    WhatId = newAcc.Id,
                    ActivityDate = Date.today().addDays(7)
                );
                tasksToCreate.add(task);
            }
        }
        
        if (!tasksToCreate.isEmpty()) {
            insert tasksToCreate;
        }
    }
}
```

### Lightning Web Component 示例

```javascript
/**
 * 账户列表组件
 * 显示指定行业的账户列表
 */
import { LightningElement, api, wire } from 'lwc';
import getAccountsByIndustry from '@salesforce/apex/AccountService.getAccountsByIndustry';

export default class AccountList extends LightningElement {
    /**
     * 行业类型
     * @type {string}
     */
    @api industry;
    
    /**
     * 账户数据列表
     * @type {Array}
     */
    accounts = [];
    
    /**
     * 加载状态
     * @type {boolean}
     */
    isLoading = true;
    
    /**
     * 错误信息
     * @type {string}
     */
    errorMessage = '';
    
    /**
     * 获取账户数据
     * @param {Object} result - Wire 服务返回结果
     */
    @wire(getAccountsByIndustry, { industry: '$industry' })
    wiredAccounts({ error, data }) {
        this.isLoading = false;
        
        if (data) {
            this.accounts = data;
            this.errorMessage = '';
        } else if (error) {
            this.errorMessage = error.body.message;
            this.accounts = [];
        }
    }
    
    /**
     * 处理账户选择事件
     * @param {Event} event - 点击事件
     */
    handleAccountSelect(event) {
        const accountId = event.currentTarget.dataset.id;
        
        this.dispatchEvent(new CustomEvent('accountselect', {
            detail: { accountId: accountId }
        }));
    }
}
```

```html
<!-- AccountList.html 模板文件 -->
<template>
    <lightning-card title="账户列表" icon-name="standard:account">
        <div class="slds-m-around_medium">
            <template if:true={isLoading}>
                <lightning-spinner alternative-text="加载中..."></lightning-spinner>
            </template>
            
            <template if:true={errorMessage}>
                <div class="slds-text-color_error">
                    {errorMessage}
                </div>
            </template>
            
            <template if:true={accounts.length}>
                <lightning-datatable
                    key-field="Id"
                    data={accounts}
                    columns={columns}
                    onrowaction={handleAccountSelect}>
                </lightning-datatable>
            </template>
        </div>
    </lightning-card>
</template>
```

### SOQL 查询示例

```apex
/**
 * SOQL 查询工具类
 * 提供常用的 SOQL 查询方法
 */
public with sharing class SOQLHelper {
    
    /**
     * 查询账户及其关联联系人
     * @param accountId 账户ID
     * @return 包含联系人的账户
     */
    public static Account getAccountWithContacts(Id accountId) {
        return [
            SELECT Id, Name, Industry,
                   (SELECT Id, Name, Email FROM Contacts)
            FROM Account
            WHERE Id = :accountId
            LIMIT 1
        ];
    }
    
    /**
     * 聚合查询 - 按行业统计账户数量
     * @return 聚合结果列表
     */
    public static List<AggregateResult> getAccountCountByIndustry() {
        return [
            SELECT Industry, COUNT(Id) accountCount
            FROM Account
            GROUP BY Industry
            ORDER BY COUNT(Id) DESC
        ];
    }
}
```

## Governor Limits 快速参考

| 限制类型 | 同步事务限制 | 异步事务限制 | 说明 |
|---------|-------------|-------------|------|
| SOQL 查询 | 100 次 | 200 次 | 单个事务中的查询次数 |
| 查询行数 | 50,000 行 | 50,000 行 | 查询返回的总行数 |
| DML 语句 | 150 次 | 150 次 | 数据操作语句次数 |
| DML 行数 | 10,000 行 | 10,000 行 | 数据操作的总行数 |
| CPU 时间 | 10,000 ms | 60,000 ms | 事务执行时间 |
| 堆大小 | 6 MB | 12 MB | 内存使用限制 |
| 调用栈深度 | 1,000 | 1,000 | 递归调用深度 |

## 常用模式

### 批量处理模式

```apex
/**
 * 批量账户处理器
 * 实现可批量处理的账户业务逻辑
 */
public with sharing class AccountBatchProcessor 
    implements Database.Batchable<sObject> {
    
    private String industry;
    
    /**
     * 构造函数
     * @param industry 目标行业
     */
    public AccountBatchProcessor(String industry) {
        this.industry = industry;
    }
    
    /**
     * 启动方法 - 定义查询范围
     * @param bc 批处理上下文
     * @return 查询定位器
     */
    public Database.QueryLocator start(Database.BatchableContext bc) {
        return Database.getQueryLocator([
            SELECT Id, Name, AnnualRevenue
            FROM Account
            WHERE Industry = :industry
        ]);
    }
    
    /**
     * 执行方法 - 处理每批数据
     * @param bc 批处理上下文
     * @param scope 当前批次数据
     */
    public void execute(
        Database.BatchableContext bc, 
        List<Account> scope
    ) {
        List<Account> accountsToUpdate = new List<Account>();
        
        for (Account acc : scope) {
            acc.AnnualRevenue = acc.AnnualRevenue * 1.1;
            accountsToUpdate.add(acc);
        }
        
        update accountsToUpdate;
    }
    
    /**
     * 完成方法 - 批处理结束回调
     * @param bc 批处理上下文
     */
    public void finish(Database.BatchableContext bc) {
        AsyncApexJob job = [
            SELECT Id, Status, NumberOfErrors
            FROM AsyncApexJob
            WHERE Id = :bc.getJobId()
        ];
        
        System.debug('批处理完成: ' + job.Status);
    }
}
```

## Quick Reference

| 特性 | 用途 | 示例 |
|-----|------|------|
| `with sharing` | 强制共享规则 | `public with sharing class MyClass` |
| `@future` | 异步方法 | `@future public static void asyncMethod()` |
| `@invocableMethod` | Flow 可调用 | `@invocableMethod public static void forFlow()` |
| `@auraEnabled` | Aura/LWC 可用 | `@auraEnabled public static String getData()` |
| `@remoteAction` | Visualforce 远程 | `@remoteAction public static String remote()` |
| `Schema.describeSObjects` | 动态描述 | `Schema.describeSObjects(new String[]{'Account'})` |
| `JSON.serialize` | JSON 序列化 | `String json = JSON.serialize(account);` |
| `JSON.deserialize` | JSON 反序列化 | `Account acc = (Account)JSON.deserialize(json, Account.class);` |
