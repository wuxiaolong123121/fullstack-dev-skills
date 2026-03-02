# Git 工作流规则参考

Git 工作流最佳实践、提交消息规范、分支策略和 PR 流程，用于构建规范、高效、可追溯的版本控制流程。

## When to Activate

- 创建新的 Git 提交
- 创建或审查 Pull Request
- 规划分支策略
- 进行代码合并操作
- 处理版本发布流程

## Core Principles

### 1. 原子性提交

每个提交应该是一个独立的、完整的变更单元。

```bash
# Good: 单一职责的提交
git commit -m "feat(auth): 添加用户登录验证功能"

# Bad: 混合多个不相关的变更
git commit -m "添加登录功能、修复bug、更新文档"
```

### 2. 提交消息即文档

提交消息是项目历史的重要组成部分，应清晰描述变更内容和原因。

```bash
# Good: 清晰描述变更
git commit -m "fix(api): 修复用户查询时的空指针异常

当用户ID不存在时，getUserById 方法返回 null，
导致后续调用出现 NullPointerException。
现在返回 Optional<User> 以明确处理空值情况。

Closes #123"

# Bad: 模糊不清
git commit -m "修复问题"
```

### 3. 分支隔离

不同类型的变更应该在独立的分支上进行，避免相互干扰。

```bash
# Good: 按功能创建独立分支
git checkout -b feature/user-authentication
git checkout -b fix/login-timeout-issue
git checkout -b docs/api-documentation

# Bad: 在主分支直接开发
git checkout main
# 直接在 main 上进行开发...
```

## Conventional Commits 规范

### 提交消息格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型（Type）

| 类型 | 说明 | 示例 |
|------|------|------|
| `feat` | 新功能 | feat(user): 添加用户注册功能 |
| `fix` | Bug 修复 | fix(api): 修复请求超时问题 |
| `docs` | 文档更新 | docs(readme): 更新安装说明 |
| `style` | 代码格式（不影响逻辑） | style: 格式化代码缩进 |
| `refactor` | 重构（非新功能、非修复） | refactor(auth): 优化登录逻辑 |
| `perf` | 性能优化 | perf(query): 优化数据库查询 |
| `test` | 测试相关 | test(user): 添加用户服务单元测试 |
| `build` | 构建系统或依赖 | build(deps): 升级依赖版本 |
| `ci` | CI/CD 配置 | ci: 添加自动化测试流水线 |
| `chore` | 其他杂项 | chore: 更新 .gitignore |
| `revert` | 回滚提交 | revert: 回滚登录功能 |

### 范围（Scope）

范围是可选的，用于指定变更影响的模块。

```bash
# 常见范围示例
feat(auth): 添加 OAuth2 登录支持
fix(api/user): 修复用户查询接口
docs(api): 更新 API 文档
refactor(db): 重构数据库连接池
test(service): 添加服务层测试
```

### 主题（Subject）

主题是对变更的简短描述。

```bash
# Good: 动词开头，小写，不加句号
feat(auth): 添加 JWT token 刷新机制
fix(db): 解决连接池泄漏问题

# Bad: 大写开头，以句号结尾
feat(Auth): 添加 JWT token 刷新机制。
```

### 正文（Body）

正文详细描述变更的原因和内容。

```bash
git commit -m "feat(order): 添加订单状态机

实现订单状态流转的有限状态机：
- PENDING -> PAID -> SHIPPED -> COMPLETED
- PENDING -> CANCELLED
- PAID -> REFUNDED

状态转换规则：
1. 只有 PENDING 状态可以取消
2. 只有 PAID 状态可以申请退款
3. 已完成订单不可变更

Breaking Change: Order.status 类型从 string 改为 OrderStatus 枚举"
```

### 页脚（Footer）

页脚用于关联 Issue、标记破坏性变更等。

```bash
# 关联 Issue
Closes #123
Fixes #456
Refs #789

# 破坏性变更
BREAKING CHANGE: API 响应格式从 XML 改为 JSON

# 多个 Issue
Closes #123, #456
```

### 完整示例

```bash
feat(payment): 添加支付宝支付渠道

集成支付宝 SDK 实现支付功能：
- 支持扫码支付
- 支持手机网站支付
- 支持异步通知处理

配置项：
- ALIPAY_APP_ID: 应用ID
- ALIPAY_PRIVATE_KEY: 应用私钥
- ALIPAY_PUBLIC_KEY: 支付宝公钥

Closes #234
BREAKING CHANGE: PaymentConfig 接口新增 alipay 字段
```

## 分支策略

### Git Flow 模型

适用于有明确发布周期的项目。

```
master (main)     ──●────●────●────●────●──
                     \         /   \
release/v1.0          ●──●──●     \
                       /     \     \
develop      ●──●──●──●──────●──●──●──●──
            /              \
feature/    ●──●──●         \
auth            \            \
                 ●──●──●──●──●──●──●
feature/                      /
order       ●──●──●──●───────/
                  \
hotfix/            ●──●──●
critical-bug            \
master (main)     ──●────●──
```

**分支说明：**

| 分支类型 | 命名规则 | 说明 | 合并目标 |
|----------|----------|------|----------|
| `main/master` | main | 生产环境代码 | - |
| `develop` | develop | 开发主分支 | main |
| `feature/*` | feature/功能名 | 新功能开发 | develop |
| `release/*` | release/版本号 | 发布准备 | main + develop |
| `hotfix/*` | hotfix/问题描述 | 紧急修复 | main + develop |
| `bugfix/*` | bugfix/问题描述 | 非紧急修复 | develop |

**Git Flow 命令示例：**

```bash
# 初始化 Git Flow
git flow init

# 开始新功能
git flow feature start user-auth

# 完成功能开发
git flow feature finish user-auth

# 开始发布
git flow release start v1.0.0

# 完成发布
git flow release finish v1.0.0

# 紧急修复
git flow hotfix start critical-security-fix
git flow hotfix finish critical-security-fix
```

### GitHub Flow 模型

适用于持续部署的项目。

```
main          ●──●────●────●────●──
               \    /      /
feature/a       ●──●      /
                 \       /
feature/b         ●──●──●
```

**分支说明：**

| 分支类型 | 命名规则 | 说明 |
|----------|----------|------|
| `main` | main | 始终可部署的代码 |
| `feature/*` | feature/功能名 | 功能分支，完成后 PR 合并 |
| `fix/*` | fix/问题描述 | 修复分支 |
| `chore/*` | chore/任务描述 | 杂项任务分支 |

**GitHub Flow 命令示例：**

```bash
# 创建功能分支
git checkout -b feature/add-user-profile

# 开发完成后推送
git push origin feature/add-user-profile

# 创建 Pull Request（通过 GitHub 界面或 CLI）
gh pr create --title "添加用户资料功能" --body "..."

# 合并后删除分支
git branch -d feature/add-user-profile
git push origin --delete feature/add-user-profile
```

### 分支命名规范

```bash
# 功能分支
feature/user-authentication
feature/shopping-cart
feature/payment-integration

# 修复分支
fix/login-timeout
fix/memory-leak-in-parser
bugfix/incorrect-total-calculation

# 发布分支
release/v1.0.0
release/v2.1.0-rc1

# 热修复分支
hotfix/security-vulnerability
hotfix/database-connection-issue

# 文档分支
docs/api-documentation
docs/readme-update

# 重构分支
refactor/user-service
refactor/database-layer
```

## Pull Request 流程规范

### PR 标题格式

```markdown
<type>(<scope>): <subject>

示例：
feat(auth): 添加 OAuth2.0 登录支持
fix(api): 修复用户查询超时问题
docs(readme): 更新项目安装说明
refactor(db): 重构数据库连接管理
```

### PR 描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug 修复
- [ ] 重构
- [ ] 文档更新
- [ ] 性能优化
- [ ] 其他：

## 变更说明

### 背景
<!-- 描述为什么要做这个变更 -->

### 变更内容
<!-- 列出具体的变更点 -->

### 技术方案
<!-- 简要说明技术实现方案 -->

## 测试情况

### 测试类型
- [ ] 单元测试
- [ ] 集成测试
- [ ] E2E 测试
- [ ] 手动测试

### 测试覆盖
<!-- 说明测试覆盖范围和结果 -->

## 影响范围

### 影响的模块
<!-- 列出受影响的模块或组件 -->

### 破坏性变更
- [ ] 无破坏性变更
- [ ] 有破坏性变更（请说明）

<!-- 如有破坏性变更，详细说明迁移方案 -->

## 相关 Issue
Closes #

## 检查清单
- [ ] 代码符合项目规范
- [ ] 已添加必要的测试
- [ ] 文档已更新
- [ ] 无新增警告
- [ ] 自测通过
```

### PR 检查清单

**代码质量检查：**

```markdown
- [ ] 代码风格符合项目规范
- [ ] 无明显的代码坏味道
- [ ] 无硬编码的敏感信息
- [ ] 无未使用的导入和变量
- [ ] 无调试代码（console.log、print 等）
```

**测试检查：**

```markdown
- [ ] 单元测试覆盖新增代码
- [ ] 集成测试覆盖关键流程
- [ ] 边界条件已测试
- [ ] 异常情况已测试
- [ ] 所有测试通过
```

**文档检查：**

```markdown
- [ ] README 已更新（如需要）
- [ ] API 文档已更新（如需要）
- [ ] CHANGELOG 已更新（如需要）
- [ ] 注释清晰完整
```

**安全检查：**

```markdown
- [ ] 无 SQL 注入风险
- [ ] 无 XSS 漏洞
- [ ] 敏感数据已加密
- [ ] 权限校验完整
- [ ] 依赖无已知漏洞
```

### PR 审查规范

**审查者职责：**

```markdown
1. 代码正确性
   - 逻辑是否正确
   - 边界条件是否处理
   - 异常是否妥善处理

2. 代码质量
   - 可读性
   - 可维护性
   - 性能考量

3. 测试覆盖
   - 测试是否充分
   - 测试用例是否合理

4. 规范遵守
   - 命名规范
   - 注释规范
   - 文档规范
```

**审查反馈格式：**

```markdown
<!-- 必须修改 -->
**[必须]** 问题描述和建议

<!-- 建议修改 -->
**[建议]** 问题描述和建议

<!-- 问题讨论 -->
**[讨论]** 问题或疑问

<!-- 赞赏 -->
**[好]** 值得肯定的地方
```

### PR 合并要求

```markdown
合并前必须满足：
1. 至少 1 个审查者批准
2. 所有 CI 检查通过
3. 无未解决的审查意见
4. 分支与目标分支无冲突
5. 测试覆盖率达标

合并方式选择：
- Merge commit：保留完整历史
- Squash merge：压缩为单个提交
- Rebase merge：线性历史
```

## 提交消息模板

### Git 配置模板

```bash
# 配置提交消息模板
git config --local commit.template .git/commit-template

# 创建模板文件
cat > .git/commit-template << 'EOF'
# <type>(<scope>): <subject>
#
# <body>
#
# <footer>
#
# 类型说明：
# feat     - 新功能
# fix      - Bug 修复
# docs     - 文档更新
# style    - 代码格式
# refactor - 重构
# perf     - 性能优化
# test     - 测试
# build    - 构建/依赖
# ci       - CI/CD
# chore    - 杂项
# revert   - 回滚
#
# 示例：
# feat(auth): 添加用户登录功能
# fix(api): 修复请求超时问题
# docs(readme): 更新安装说明
#
# 注意：
# 1. 主题行不超过 50 字符
# 2. 正文每行不超过 72 字符
# 3. 使用中文描述
# 4. 动词开头，小写，不加句号
EOF
```

### commitlint 配置

```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert',
      ],
    ],
    'subject-max-length': [2, 'always', 50],
    'body-max-line-length': [2, 'always', 72],
    'subject-case': [0],
  },
};
```

### Husky Git Hooks 配置

```json
// package.json
{
  "scripts": {
    "prepare": "husky install"
  },
  "devDependencies": {
    "@commitlint/cli": "^18.0.0",
    "@commitlint/config-conventional": "^18.0.0",
    "husky": "^8.0.0"
  }
}
```

```bash
# .husky/commit-msg
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npx --no -- commitlint --edit "$1"
```

```bash
# .husky/pre-commit
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run lint
npm run test
```

```bash
# .husky/pre-push
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

npm run test:coverage
```

## 版本标签规范

### 语义化版本

```
MAJOR.MINOR.PATCH[-PRERELEASE][+BUILD]

示例：
1.0.0
2.1.3
1.0.0-alpha.1
1.0.0-beta.2
1.0.0-rc.1
2.0.0+build.123
```

**版本递增规则：**

| 变更类型 | 版本递增 | 示例 |
|----------|----------|------|
| 破坏性变更 | MAJOR | 1.0.0 -> 2.0.0 |
| 新功能（向后兼容） | MINOR | 1.0.0 -> 1.1.0 |
| Bug 修复 | PATCH | 1.0.0 -> 1.0.1 |

### 标签命名规范

```bash
# 正式版本
v1.0.0
v2.1.3

# 预发布版本
v1.0.0-alpha.1
v1.0.0-beta.1
v1.0.0-rc.1

# 创建标签
git tag -a v1.0.0 -m "发布版本 1.0.0"

# 推送标签
git push origin v1.0.0
git push origin --tags

# 删除标签
git tag -d v1.0.0
git push origin --delete v1.0.0
```

## 常用 Git 命令速查

### 分支操作

```bash
# 查看分支
git branch              # 本地分支
git branch -r           # 远程分支
git branch -a           # 所有分支

# 创建分支
git branch feature/new-feature
git checkout -b feature/new-feature

# 切换分支
git checkout feature/new-feature
git switch feature/new-feature

# 删除分支
git branch -d feature/new-feature
git branch -D feature/new-feature  # 强制删除

# 合并分支
git merge feature/new-feature
git merge --no-ff feature/new-feature  # 保留分支历史
```

### 提交操作

```bash
# 查看提交历史
git log --oneline
git log --graph --oneline --all
git log -p -2  # 最近2次提交的详细差异

# 修改最后一次提交
git commit --amend

# 交互式变基
git rebase -i HEAD~3

# 撤销提交（保留变更）
git reset --soft HEAD~1

# 撤销提交（丢弃变更）
git reset --hard HEAD~1
```

### 暂存操作

```bash
# 暂存当前变更
git stash
git stash save "描述信息"

# 查看暂存列表
git stash list

# 恢复暂存
git stash pop
git stash apply stash@{0}

# 删除暂存
git stash drop stash@{0}
git stash clear
```

### 远程操作

```bash
# 查看远程仓库
git remote -v

# 添加远程仓库
git remote add upstream https://github.com/org/repo.git

# 拉取更新
git fetch origin
git pull origin main

# 推送分支
git push origin feature/new-feature
git push -u origin feature/new-feature  # 设置上游

# 删除远程分支
git push origin --delete feature/new-feature
```

## Anti-Patterns to Avoid

```bash
# Bad: 直接在 main 分支提交
git checkout main
git commit -m "添加功能"

# Good: 创建功能分支
git checkout -b feature/new-feature
git commit -m "feat: 添加新功能"

# Bad: 提交消息过于简单
git commit -m "修复"
git commit -m "update"

# Good: 清晰描述变更
git commit -m "fix(api): 修复用户查询超时问题"

# Bad: 一次提交包含多个不相关变更
git add .
git commit -m "添加功能A、修复bug B、更新文档"

# Good: 分开提交
git add feature-a/
git commit -m "feat: 添加功能A"
git add bugfix-b/
git commit -m "fix: 修复bug B"

# Bad: 提交敏感信息
git add config/secrets.yml
git commit -m "添加配置文件"

# Good: 使用环境变量或配置模板
echo "secrets.yml" >> .gitignore
git add config/secrets.yml.example
git commit -m "chore: 添加配置文件模板"

# Bad: 强制推送到共享分支
git push --force origin main

# Good: 使用 --force-with-lease（更安全）
git push --force-with-lease origin feature-branch

# Bad: 合并时产生大量冲突未解决
git merge feature-branch
# 忽略冲突直接提交

# Good: 解决所有冲突后再提交
git merge feature-branch
# 解决冲突
git add .
git commit

# Bad: 长期不更新本地分支
# 本地 main 分支落后远程很多版本

# Good: 定期同步远程更新
git fetch origin
git checkout main
git pull --rebase origin main
```

**记住**: 良好的 Git 工作流是团队协作的基础。清晰的提交历史、规范的分支策略、完善的 PR 流程能够显著提升开发效率和代码质量。
