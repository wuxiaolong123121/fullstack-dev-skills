# 包管理器检测脚本参考

## 概述

本文档提供包管理器自动检测脚本的实现参考，用于在不同项目中自动识别和配置正确的包管理器。

## 检测逻辑

### JavaScript/TypeScript 项目

```javascript
/**
 * 检测 JavaScript/TypeScript 项目的包管理器
 * @param {string} projectRoot - 项目根目录路径
 * @returns {Object} 检测结果，包含包管理器类型和配置
 */
function detectJSPackageManager(projectRoot) {
  const fs = require('fs');
  const path = require('path');

  const lockFiles = {
    'pnpm-lock.yaml': 'pnpm',
    'yarn.lock': 'yarn',
    'package-lock.json': 'npm',
    'bun.lockb': 'bun'
  };

  for (const [lockFile, manager] of Object.entries(lockFiles)) {
    if (fs.existsSync(path.join(projectRoot, lockFile))) {
      return {
        manager,
        lockFile,
        installCmd: getInstallCommand(manager),
        runCmd: getRunCommand(manager)
      };
    }
  }

  return {
    manager: 'npm',
    lockFile: null,
    installCmd: 'npm install',
    runCmd: 'npm run'
  };
}

/**
 * 获取安装命令
 * @param {string} manager - 包管理器名称
 * @returns {string} 安装命令
 */
function getInstallCommand(manager) {
  const commands = {
    npm: 'npm install',
    yarn: 'yarn install',
    pnpm: 'pnpm install',
    bun: 'bun install'
  };
  return commands[manager] || 'npm install';
}

/**
 * 获取运行命令
 * @param {string} manager - 包管理器名称
 * @returns {string} 运行命令前缀
 */
function getRunCommand(manager) {
  const commands = {
    npm: 'npm run',
    yarn: 'yarn',
    pnpm: 'pnpm run',
    bun: 'bun run'
  };
  return commands[manager] || 'npm run';
}
```

### Python 项目

```python
"""
检测 Python 项目的包管理器
"""
import os
from pathlib import Path
from typing import Optional, Dict

def detect_python_package_manager(project_root: str) -> Dict:
    """
    检测 Python 项目的包管理器
    
    Args:
        project_root: 项目根目录路径
        
    Returns:
        包含包管理器类型和配置的字典
    """
    root = Path(project_root)
    
    lock_files = {
        'poetry.lock': 'poetry',
        'Pipfile.lock': 'pipenv',
        'pdm.lock': 'pdm',
        'uv.lock': 'uv',
        'requirements.txt': 'pip'
    }
    
    for lock_file, manager in lock_files.items():
        if (root / lock_file).exists():
            return {
                'manager': manager,
                'lock_file': lock_file,
                'install_cmd': get_python_install_command(manager),
                'run_cmd': get_python_run_command(manager)
            }
    
    if (root / 'pyproject.toml').exists():
        return {
            'manager': 'pip',
            'lock_file': None,
            'install_cmd': 'pip install -e .',
            'run_cmd': 'python'
        }
    
    return {
        'manager': 'pip',
        'lock_file': None,
        'install_cmd': 'pip install -r requirements.txt',
        'run_cmd': 'python'
    }

def get_python_install_command(manager: str) -> str:
    """获取 Python 包管理器的安装命令"""
    commands = {
        'poetry': 'poetry install',
        'pipenv': 'pipenv install',
        'pdm': 'pdm install',
        'uv': 'uv pip install -e .',
        'pip': 'pip install -r requirements.txt'
    }
    return commands.get(manager, 'pip install -r requirements.txt')

def get_python_run_command(manager: str) -> str:
    """获取 Python 包管理器的运行命令"""
    commands = {
        'poetry': 'poetry run python',
        'pipenv': 'pipenv run python',
        'pdm': 'pdm run python',
        'uv': 'uv run python',
        'pip': 'python'
    }
    return commands.get(manager, 'python')
```

### Go 项目

```go
// Package manager detection for Go projects
package detector

import (
	"os"
	"path/filepath"
)

// PackageManager represents a Go package manager
type PackageManager struct {
	Name       string
	LockFile   string
	InstallCmd string
	RunCmd     string
}

// DetectGoPackageManager detects the package manager for a Go project
func DetectGoPackageManager(projectRoot string) PackageManager {
	managers := []struct {
		lockFile string
		manager  PackageManager
	}{
		{"go.sum", PackageManager{"go", "go.sum", "go mod download", "go run"}},
		{"go.mod", PackageManager{"go", "go.mod", "go mod download", "go run"}},
	}

	for _, m := range managers {
		if _, err := os.Stat(filepath.Join(projectRoot, m.lockFile)); err == nil {
			return m.manager
		}
	}

	return PackageManager{"go", "", "go mod download", "go run"}
}
```

### Rust 项目

```rust
use std::path::Path;
use std::collections::HashMap;

/// 包管理器信息
#[derive(Debug, Clone)]
pub struct PackageManager {
    pub name: String,
    pub lock_file: String,
    pub install_cmd: String,
    pub run_cmd: String,
}

/// 检测 Rust 项目的包管理器
pub fn detect_rust_package_manager(project_root: &Path) -> PackageManager {
    let lock_files: HashMap<&str, PackageManager> = [
        ("Cargo.lock", PackageManager {
            name: "cargo".to_string(),
            lock_file: "Cargo.lock".to_string(),
            install_cmd: "cargo build".to_string(),
            run_cmd: "cargo run".to_string(),
        }),
    ].iter().cloned().collect();

    for (lock_file, manager) in &lock_files {
        if project_root.join(lock_file).exists() {
            return manager.clone();
        }
    }

    PackageManager {
        name: "cargo".to_string(),
        lock_file: String::new(),
        install_cmd: "cargo build".to_string(),
        run_cmd: "cargo run".to_string(),
    }
}
```

## 统一检测接口

```javascript
/**
 * 统一的项目包管理器检测
 * @param {string} projectRoot - 项目根目录
 * @returns {Object} 检测结果
 */
function detectPackageManager(projectRoot) {
  const fs = require('fs');
  const path = require('path');

  const detectors = {
    javascript: detectJSPackageManager,
    python: detectPythonPackageManager,
    go: detectGoPackageManager,
    rust: detectRustPackageManager,
    ruby: detectRubyPackageManager,
    php: detectPHPPackageManager,
    java: detectJavaPackageManager,
    dotnet: detectDotNetPackageManager
  };

  const projectType = detectProjectType(projectRoot);
  const detector = detectors[projectType];

  if (detector) {
    return {
      projectType,
      ...detector(projectRoot)
    };
  }

  return {
    projectType: 'unknown',
    manager: 'unknown',
    lockFile: null,
    installCmd: null,
    runCmd: null
  };
}

/**
 * 检测项目类型
 * @param {string} projectRoot - 项目根目录
 * @returns {string} 项目类型
 */
function detectProjectType(projectRoot) {
  const fs = require('fs');
  const path = require('path');

  const typeIndicators = {
    javascript: ['package.json', 'tsconfig.json', 'jsconfig.json'],
    python: ['pyproject.toml', 'setup.py', 'requirements.txt', 'Pipfile'],
    go: ['go.mod', 'go.sum'],
    rust: ['Cargo.toml', 'Cargo.lock'],
    ruby: ['Gemfile', 'Gemfile.lock'],
    php: ['composer.json', 'composer.lock'],
    java: ['pom.xml', 'build.gradle', 'build.gradle.kts'],
    dotnet: ['*.csproj', '*.fsproj', '*.vbproj', 'global.json']
  };

  for (const [type, indicators] of Object.entries(typeIndicators)) {
    for (const indicator of indicators) {
      const files = fs.readdirSync(projectRoot);
      if (indicator.includes('*')) {
        const pattern = indicator.replace('*', '');
        if (files.some(f => f.endsWith(pattern.slice(1)))) {
          return type;
        }
      } else if (files.includes(indicator)) {
        return type;
      }
    }
  }

  return 'unknown';
}
```

## Ruby 项目检测

```ruby
# 检测 Ruby 项目的包管理器
class PackageManagerDetector
  LOCK_FILES = {
    'Gemfile.lock' => 'bundler',
    'gems.locked' => 'bundler'
  }.freeze

  def initialize(project_root)
    @project_root = Pathname.new(project_root)
  end

  def detect
    LOCK_FILES.each do |lock_file, manager|
      if @project_root.join(lock_file).exist?
        return {
          manager: manager,
          lock_file: lock_file,
          install_cmd: install_command(manager),
          run_cmd: run_command(manager)
        }
      end
    end

    {
      manager: 'bundler',
      lock_file: nil,
      install_cmd: 'bundle install',
      run_cmd: 'bundle exec'
    }
  end

  private

  def install_command(manager)
    case manager
    when 'bundler' then 'bundle install'
    else 'bundle install'
    end
  end

  def run_command(manager)
    case manager
    when 'bundler' then 'bundle exec'
    else 'bundle exec'
    end
  end
end
```

## PHP 项目检测

```php
<?php

/**
 * 检测 PHP 项目的包管理器
 */
class PackageManagerDetector
{
    private const LOCK_FILES = [
        'composer.lock' => 'composer',
    ];

    private string $projectRoot;

    public function __construct(string $projectRoot)
    {
        $this->projectRoot = $projectRoot;
    }

    /**
     * 检测包管理器
     * @return array 检测结果
     */
    public function detect(): array
    {
        foreach (self::LOCK_FILES as $lockFile => $manager) {
            if (file_exists($this->projectRoot . '/' . $lockFile)) {
                return [
                    'manager' => $manager,
                    'lock_file' => $lockFile,
                    'install_cmd' => $this->getInstallCommand($manager),
                    'run_cmd' => $this->getRunCommand($manager),
                ];
            }
        }

        return [
            'manager' => 'composer',
            'lock_file' => null,
            'install_cmd' => 'composer install',
            'run_cmd' => 'php',
        ];
    }

    private function getInstallCommand(string $manager): string
    {
        return match ($manager) {
            'composer' => 'composer install',
            default => 'composer install',
        };
    }

    private function getRunCommand(string $manager): string
    {
        return match ($manager) {
            'composer' => 'php',
            default => 'php',
        };
    }
}
```

## Java 项目检测

```java
import java.io.File;
import java.util.HashMap;
import java.util.Map;

/**
 * 检测 Java 项目的包管理器
 */
public class PackageManagerDetector {
    
    private static final Map<String, String> LOCK_FILES = Map.of(
        "pom.xml", "maven",
        "build.gradle", "gradle",
        "build.gradle.kts", "gradle"
    );
    
    private final String projectRoot;
    
    public PackageManagerDetector(String projectRoot) {
        this.projectRoot = projectRoot;
    }
    
    /**
     * 检测包管理器
     * @return 检测结果
     */
    public Map<String, String> detect() {
        for (Map.Entry<String, String> entry : LOCK_FILES.entrySet()) {
            File file = new File(projectRoot, entry.getKey());
            if (file.exists()) {
                String manager = entry.getValue();
                Map<String, String> result = new HashMap<>();
                result.put("manager", manager);
                result.put("lock_file", entry.getKey());
                result.put("install_cmd", getInstallCommand(manager));
                result.put("run_cmd", getRunCommand(manager));
                return result;
            }
        }
        
        Map<String, String> result = new HashMap<>();
        result.put("manager", "maven");
        result.put("lock_file", null);
        result.put("install_cmd", "mvn install");
        result.put("run_cmd", "mvn exec:java");
        return result;
    }
    
    private String getInstallCommand(String manager) {
        return switch (manager) {
            case "maven" -> "mvn install";
            case "gradle" -> "./gradlew build";
            default -> "mvn install";
        };
    }
    
    private String getRunCommand(String manager) {
        return switch (manager) {
            case "maven" -> "mvn exec:java";
            case "gradle" -> "./gradlew run";
            default -> "mvn exec:java";
        };
    }
}
```

## .NET 项目检测

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;

/// <summary>
/// 检测 .NET 项目的包管理器
/// </summary>
public class PackageManagerDetector
{
    private static readonly Dictionary<string, string> LockFiles = new()
    {
        ["packages.lock.json"] = "nuget",
        ["project.assets.json"] = "nuget"
    };

    private readonly string _projectRoot;

    public PackageManagerDetector(string projectRoot)
    {
        _projectRoot = projectRoot;
    }

    /// <summary>
    /// 检测包管理器
    /// </summary>
    public PackageManagerResult Detect()
    {
        foreach (var (lockFile, manager) in LockFiles)
        {
            if (File.Exists(Path.Combine(_projectRoot, lockFile)))
            {
                return new PackageManagerResult
                {
                    Manager = manager,
                    LockFile = lockFile,
                    InstallCmd = GetInstallCommand(manager),
                    RunCmd = GetRunCommand(manager)
                };
            }
        }

        var csprojFiles = Directory.GetFiles(_projectRoot, "*.csproj");
        if (csprojFiles.Any())
        {
            return new PackageManagerResult
            {
                Manager = "nuget",
                LockFile = null,
                InstallCmd = "dotnet restore",
                RunCmd = "dotnet run"
            };
        }

        return new PackageManagerResult
        {
            Manager = "unknown",
            LockFile = null,
            InstallCmd = null,
            RunCmd = null
        };
    }

    private static string GetInstallCommand(string manager) => manager switch
    {
        "nuget" => "dotnet restore",
        _ => "dotnet restore"
    };

    private static string GetRunCommand(string manager) => manager switch
    {
        "nuget" => "dotnet run",
        _ => "dotnet run"
    };
}

public record PackageManagerResult
{
    public string Manager { get; init; }
    public string? LockFile { get; init; }
    public string? InstallCmd { get; init; }
    public string? RunCmd { get; init; }
}
```

## 配置方法

### CLAUDE.md 集成

```markdown
# 项目配置

## 包管理器自动检测

本项目使用自动检测脚本识别包管理器：

- 检测逻辑：优先识别锁文件
- 支持的包管理器：npm, yarn, pnpm, bun, pip, poetry, cargo, go mod, bundler, composer, maven, gradle, nuget

## 常用命令

### 安装依赖
```bash
# 脚本会自动检测并使用正确的命令
./scripts/install.sh
```

### 运行项目
```bash
# 脚本会自动检测并使用正确的命令
./scripts/run.sh
```
```

### 安装脚本示例

```bash
#!/bin/bash

# install.sh - 自动检测包管理器并安装依赖

PROJECT_ROOT="${1:-.}"

detect_and_install() {
    local root="$1"
    
    if [ -f "$root/pnpm-lock.yaml" ]; then
        echo "检测到 pnpm，执行 pnpm install"
        pnpm install
    elif [ -f "$root/yarn.lock" ]; then
        echo "检测到 yarn，执行 yarn install"
        yarn install
    elif [ -f "$root/package-lock.json" ]; then
        echo "检测到 npm，执行 npm install"
        npm install
    elif [ -f "$root/bun.lockb" ]; then
        echo "检测到 bun，执行 bun install"
        bun install
    elif [ -f "$root/poetry.lock" ]; then
        echo "检测到 poetry，执行 poetry install"
        poetry install
    elif [ -f "$root/Pipfile.lock" ]; then
        echo "检测到 pipenv，执行 pipenv install"
        pipenv install
    elif [ -f "$root/go.sum" ]; then
        echo "检测到 go modules，执行 go mod download"
        go mod download
    elif [ -f "$root/Cargo.lock" ]; then
        echo "检测到 cargo，执行 cargo build"
        cargo build
    elif [ -f "$root/Gemfile.lock" ]; then
        echo "检测到 bundler，执行 bundle install"
        bundle install
    elif [ -f "$root/composer.lock" ]; then
        echo "检测到 composer，执行 composer install"
        composer install
    elif [ -f "$root/pom.xml" ]; then
        echo "检测到 maven，执行 mvn install"
        mvn install
    elif [ -f "$root/build.gradle" ] || [ -f "$root/build.gradle.kts" ]; then
        echo "检测到 gradle，执行 ./gradlew build"
        ./gradlew build
    elif [ -f "$root/*.csproj" ]; then
        echo "检测到 .NET，执行 dotnet restore"
        dotnet restore
    else
        echo "无法检测到包管理器，请手动安装依赖"
        exit 1
    fi
}

detect_and_install "$PROJECT_ROOT"
```

## 多平台支持

### Windows PowerShell

```powershell
# detect-package-manager.ps1

param(
    [string]$ProjectRoot = "."
)

function Detect-PackageManager {
    param([string]$Root)
    
    if (Test-Path "$Root\pnpm-lock.yaml") {
        return @{ Manager = "pnpm"; InstallCmd = "pnpm install"; RunCmd = "pnpm run" }
    }
    elseif (Test-Path "$Root\yarn.lock") {
        return @{ Manager = "yarn"; InstallCmd = "yarn install"; RunCmd = "yarn" }
    }
    elseif (Test-Path "$Root\package-lock.json") {
        return @{ Manager = "npm"; InstallCmd = "npm install"; RunCmd = "npm run" }
    }
    elseif (Test-Path "$Root\poetry.lock") {
        return @{ Manager = "poetry"; InstallCmd = "poetry install"; RunCmd = "poetry run" }
    }
    elseif (Test-Path "$Root\go.sum") {
        return @{ Manager = "go"; InstallCmd = "go mod download"; RunCmd = "go run" }
    }
    elseif (Test-Path "$Root\Cargo.lock") {
        return @{ Manager = "cargo"; InstallCmd = "cargo build"; RunCmd = "cargo run" }
    }
    elseif (Test-Path "$Root\pom.xml") {
        return @{ Manager = "maven"; InstallCmd = "mvn install"; RunCmd = "mvn exec:java" }
    }
    elseif (Test-Path "$Root\*.csproj") {
        return @{ Manager = "nuget"; InstallCmd = "dotnet restore"; RunCmd = "dotnet run" }
    }
    
    return @{ Manager = "unknown"; InstallCmd = $null; RunCmd = $null }
}

$result = Detect-PackageManager -Root $ProjectRoot
Write-Host "检测到包管理器: $($result.Manager)"
Write-Host "安装命令: $($result.InstallCmd)"
Write-Host "运行命令: $($result.RunCmd)"
```

## 最佳实践

1. **优先检测锁文件** - 锁文件是最可靠的包管理器标识
2. **支持多语言项目** - monorepo 可能包含多种语言
3. **提供回退机制** - 无法检测时提供默认选项
4. **记录检测结果** - 便于调试和问题排查
5. **支持环境变量覆盖** - 允许用户手动指定包管理器

## 相关文档

- [hooks-overview.md](./hooks-overview.md) - Hooks 系统概述
- [example-project-config.md](./example-project-config.md) - 项目配置示例
- [mcp-servers-config.md](./mcp-servers-config.md) - MCP 服务器配置
