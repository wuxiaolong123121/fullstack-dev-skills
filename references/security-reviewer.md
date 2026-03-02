# [安全审计] 参考
> Reference for: fullstack-dev-skills
> Load when: 执行安全审计、渗透测试、代码安全审查、漏洞扫描

## 核心特性

### 安全审计方法论

| 方法 | 类型 | 适用场景 | 自动化程度 |
|-----|------|---------|----------|
| SAST | 静态分析 | 源代码审查 | 高 |
| DAST | 动态分析 | 运行时测试 | 中 |
| IAST | 交互分析 | 实时监控 | 中 |
| SCA | 依赖分析 | 第三方组件 | 高 |
| Pen Test | 人工测试 | 深度评估 | 低 |

### 安全审计流程

```
1. 范围定义 → 2. 信息收集 → 3. 漏洞识别 → 4. 漏洞验证 → 5. 风险评估 → 6. 报告生成
```

### 风险等级分类

| 等级 | CVSS分数 | 描述 | 处理优先级 |
|-----|---------|------|----------|
| 严重 | 9.0-10.0 | 可被直接利用，造成严重损失 | 立即修复 |
| 高危 | 7.0-8.9 | 可被利用，造成较大损失 | 24小时内 |
| 中危 | 4.0-6.9 | 需特定条件才能利用 | 7天内 |
| 低危 | 0.1-3.9 | 影响较小 | 下个版本 |
| 信息 | 0.0 | 无安全影响 | 可选 |

## 最佳实践

### SAST 静态代码分析

```python
import os
import re
import json
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from enum import Enum

class Severity(Enum):
    """漏洞严重程度枚举"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class Vulnerability:
    """
    漏洞数据类
    
    存储检测到的安全漏洞信息
    """
    rule_id: str
    severity: Severity
    title: str
    description: str
    file_path: str
    line_number: int
    code_snippet: str
    recommendation: str
    cwe_id: Optional[str] = None
    owasp_category: Optional[str] = None

class SASTScanner:
    """
    静态应用安全测试扫描器
    
    扫描源代码中的安全漏洞
    """
    
    def __init__(self, project_path: str) -> None:
        """
        初始化扫描器
        
        Args:
            project_path: 项目根目录路径
        """
        self.project_path = project_path
        self.vulnerabilities: List[Vulnerability] = []
        self._init_rules()
    
    def _init_rules(self) -> None:
        """初始化安全检测规则"""
        self.rules = {
            'sql_injection': {
                'pattern': r'(execute|exec|query)\s*\(\s*[f]?["\'].*\{.*\}.*["\']',
                'severity': Severity.CRITICAL,
                'title': 'SQL注入风险',
                'cwe': 'CWE-89',
                'owasp': 'A03:2021'
            },
            'hardcoded_secret': {
                'pattern': r'(password|secret|api_key|token)\s*=\s*["\'][^"\']{8,}["\']',
                'severity': Severity.HIGH,
                'title': '硬编码敏感信息',
                'cwe': 'CWE-798',
                'owasp': 'A07:2021'
            },
            'xss_risk': {
                'pattern': r'innerHTML\s*=|document\.write\s*\(',
                'severity': Severity.HIGH,
                'title': 'XSS风险',
                'cwe': 'CWE-79',
                'owasp': 'A03:2021'
            },
            'unsafe_deserialize': {
                'pattern': r'pickle\.loads?|yaml\.load\s*\([^)]*\)',
                'severity': Severity.HIGH,
                'title': '不安全的反序列化',
                'cwe': 'CWE-502',
                'owasp': 'A08:2021'
            },
            'weak_crypto': {
                'pattern': r'(MD5|SHA1)\s*\(|hashlib\.(md5|sha1)\s*\(',
                'severity': Severity.MEDIUM,
                'title': '弱加密算法',
                'cwe': 'CWE-328',
                'owasp': 'A02:2021'
            }
        }
    
    def scan(self) -> List[Vulnerability]:
        """
        执行安全扫描
        
        Returns:
            检测到的漏洞列表
        """
        for root, _, files in os.walk(self.project_path):
            for file in files:
                if self._is_source_file(file):
                    file_path = os.path.join(root, file)
                    self._scan_file(file_path)
        
        return self.vulnerabilities
    
    def _is_source_file(self, filename: str) -> bool:
        """
        判断是否为源代码文件
        
        Args:
            filename: 文件名
            
        Returns:
            是否为源代码文件
        """
        extensions = {'.py', '.js', '.ts', '.jsx', '.tsx', '.java', '.go', '.php'}
        return any(filename.endswith(ext) for ext in extensions)
    
    def _scan_file(self, file_path: str) -> None:
        """
        扫描单个文件
        
        Args:
            file_path: 文件路径
        """
        try:
            with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
            
            for line_num, line in enumerate(lines, 1):
                for rule_name, rule in self.rules.items():
                    if re.search(rule['pattern'], line, re.IGNORECASE):
                        vuln = Vulnerability(
                            rule_id=f'SAST-{rule_name.upper()}',
                            severity=rule['severity'],
                            title=rule['title'],
                            description=f'检测到{rule["title"]}模式',
                            file_path=file_path,
                            line_number=line_num,
                            code_snippet=line.strip(),
                            recommendation=self._get_recommendation(rule_name),
                            cwe_id=rule.get('cwe'),
                            owasp_category=rule.get('owasp')
                        )
                        self.vulnerabilities.append(vuln)
        except Exception as e:
            print(f"扫描文件失败 {file_path}: {e}")
    
    def _get_recommendation(self, rule_name: str) -> str:
        """
        获取修复建议
        
        Args:
            rule_name: 规则名称
            
        Returns:
            修复建议文本
        """
        recommendations = {
            'sql_injection': '使用参数化查询或ORM框架，避免字符串拼接SQL',
            'hardcoded_secret': '使用环境变量或密钥管理服务存储敏感信息',
            'xss_risk': '使用安全的DOM操作API，对用户输入进行编码',
            'unsafe_deserialize': '使用安全的序列化格式如JSON，避免加载不可信数据',
            'weak_crypto': '使用SHA-256或更强的加密算法'
        }
        return recommendations.get(rule_name, '请参考安全编码规范')
    
    def generate_report(self, output_path: str) -> None:
        """
        生成扫描报告
        
        Args:
            output_path: 报告输出路径
        """
        report = {
            'summary': {
                'total': len(self.vulnerabilities),
                'critical': sum(1 for v in self.vulnerabilities if v.severity == Severity.CRITICAL),
                'high': sum(1 for v in self.vulnerabilities if v.severity == Severity.HIGH),
                'medium': sum(1 for v in self.vulnerabilities if v.severity == Severity.MEDIUM),
                'low': sum(1 for v in self.vulnerabilities if v.severity == Severity.LOW)
            },
            'vulnerabilities': [
                {
                    'rule_id': v.rule_id,
                    'severity': v.severity.value,
                    'title': v.title,
                    'file': v.file_path,
                    'line': v.line_number,
                    'code': v.code_snippet,
                    'recommendation': v.recommendation,
                    'cwe': v.cwe_id,
                    'owasp': v.owasp_category
                }
                for v in self.vulnerabilities
            ]
        }
        
        with open(output_path, 'w', encoding='utf-8') as f:
            json.dump(report, f, ensure_ascii=False, indent=2)
```

### DAST 动态应用安全测试

```python
import requests
import urllib.parse
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class DASTFinding:
    """
    DAST发现数据类
    
    存储动态测试发现的安全问题
    """
    test_type: str
    url: str
    method: str
    payload: str
    response_code: int
    evidence: str
    severity: str

class DASTScanner:
    """
    动态应用安全测试扫描器
    
    对运行中的应用进行安全测试
    """
    
    def __init__(self, base_url: str, timeout: int = 10) -> None:
        """
        初始化DAST扫描器
        
        Args:
            base_url: 目标应用基础URL
            timeout: 请求超时时间（秒）
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.findings: List[DASTFinding] = []
        self.session = requests.Session()
    
    def test_sql_injection(self, endpoint: str, params: Dict[str, str]) -> None:
        """
        SQL注入测试
        
        Args:
            endpoint: API端点
            params: 请求参数
        """
        payloads = [
            "' OR '1'='1",
            "1; DROP TABLE users--",
            "1 UNION SELECT NULL--",
            "' UNION SELECT username,password FROM users--",
            "1' AND '1'='1"
        ]
        
        for param_name, param_value in params.items():
            for payload in payloads:
                test_params = params.copy()
                test_params[param_name] = payload
                
                try:
                    response = self.session.get(
                        f"{self.base_url}{endpoint}",
                        params=test_params,
                        timeout=self.timeout
                    )
                    
                    if self._is_sql_error(response.text):
                        self.findings.append(DASTFinding(
                            test_type='SQL Injection',
                            url=f"{self.base_url}{endpoint}",
                            method='GET',
                            payload=f"{param_name}={payload}",
                            response_code=response.status_code,
                            evidence='检测到SQL错误信息',
                            severity='high'
                        ))
                except requests.RequestException:
                    pass
    
    def test_xss(self, endpoint: str, params: Dict[str, str]) -> None:
        """
        XSS漏洞测试
        
        Args:
            endpoint: API端点
            params: 请求参数
        """
        payloads = [
            '<script>alert("XSS")</script>',
            '<img src=x onerror=alert("XSS")>',
            '"><script>alert("XSS")</script>',
            "javascript:alert('XSS')",
            '<svg onload=alert("XSS")>'
        ]
        
        for param_name in params:
            for payload in payloads:
                test_params = params.copy()
                test_params[param_name] = payload
                
                try:
                    response = self.session.get(
                        f"{self.base_url}{endpoint}",
                        params=test_params,
                        timeout=self.timeout
                    )
                    
                    if payload in response.text:
                        self.findings.append(DASTFinding(
                            test_type='Reflected XSS',
                            url=f"{self.base_url}{endpoint}",
                            method='GET',
                            payload=f"{param_name}={payload}",
                            response_code=response.status_code,
                            evidence='Payload在响应中未被编码',
                            severity='high'
                        ))
                except requests.RequestException:
                    pass
    
    def test_path_traversal(self, endpoint: str, param_name: str) -> None:
        """
        路径遍历测试
        
        Args:
            endpoint: API端点
            param_name: 文件路径参数名
        """
        payloads = [
            '../../../etc/passwd',
            '....//....//....//etc/passwd',
            '%2e%2e%2f%2e%2e%2f%2e%2e%2fetc/passwd',
            '..\\..\\..\\windows\\system32\\config\\sam'
        ]
        
        for payload in payloads:
            try:
                response = self.session.get(
                    f"{self.base_url}{endpoint}",
                    params={param_name: payload},
                    timeout=self.timeout
                )
                
                if 'root:' in response.text or '[extensions]' in response.text:
                    self.findings.append(DASTFinding(
                        test_type='Path Traversal',
                        url=f"{self.base_url}{endpoint}",
                        method='GET',
                        payload=f"{param_name}={payload}",
                        response_code=response.status_code,
                        evidence='检测到敏感文件内容',
                        severity='critical'
                    ))
            except requests.RequestException:
                pass
    
    def test_security_headers(self) -> List[Dict]:
        """
        安全头测试
        
        Returns:
            缺失的安全头列表
        """
        required_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
            'Strict-Transport-Security': 'max-age=',
            'Content-Security-Policy': None,
            'X-XSS-Protection': '1'
        }
        
        missing_headers = []
        
        try:
            response = self.session.get(self.base_url, timeout=self.timeout)
            
            for header, expected in required_headers.items():
                if header not in response.headers:
                    missing_headers.append({
                        'header': header,
                        'status': 'missing',
                        'recommendation': f'添加 {header} 响应头'
                    })
                elif expected:
                    actual = response.headers[header]
                    if isinstance(expected, list):
                        if not any(exp in actual for exp in expected):
                            missing_headers.append({
                                'header': header,
                                'status': 'misconfigured',
                                'actual': actual,
                                'expected': expected
                            })
                    elif expected not in actual:
                        missing_headers.append({
                            'header': header,
                            'status': 'misconfigured',
                            'actual': actual,
                            'expected': expected
                        })
        except requests.RequestException:
            pass
        
        return missing_headers
    
    def _is_sql_error(self, response_text: str) -> bool:
        """
        检测SQL错误信息
        
        Args:
            response_text: 响应文本
            
        Returns:
            是否包含SQL错误
        """
        error_patterns = [
            'sql syntax',
            'mysql_fetch',
            'ora-',
            'postgresql',
            'sqlite_',
            'odbc',
            'unclosed quotation'
        ]
        return any(pattern in response_text.lower() for pattern in error_patterns)
```

### 渗透测试工具集

```python
import socket
import ssl
import subprocess
from typing import List, Dict, Tuple
from datetime import datetime

class PenetrationTester:
    """
    渗透测试工具集
    
    提供常用渗透测试功能
    """
    
    def __init__(self, target: str) -> None:
        """
        初始化渗透测试器
        
        Args:
            target: 目标主机或IP
        """
        self.target = target
        self.results: Dict[str, any] = {}
    
    def port_scan(self, ports: List[int] = None) -> Dict[int, str]:
        """
        端口扫描
        
        Args:
            ports: 要扫描的端口列表
            
        Returns:
            开放端口及服务信息
        """
        if ports is None:
            ports = [21, 22, 23, 25, 80, 443, 3306, 5432, 6379, 8080, 8443]
        
        open_ports = {}
        
        for port in ports:
            try:
                sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
                sock.settimeout(2)
                result = sock.connect_ex((self.target, port))
                
                if result == 0:
                    service = self._identify_service(port)
                    open_ports[port] = service
                sock.close()
            except socket.error:
                pass
        
        self.results['port_scan'] = open_ports
        return open_ports
    
    def ssl_audit(self, port: int = 443) -> Dict:
        """
        SSL/TLS安全审计
        
        Args:
            port: HTTPS端口
            
        Returns:
            SSL配置信息
        """
        ssl_info = {
            'valid': False,
            'protocol': None,
            'cipher': None,
            'issuer': None,
            'expires': None,
            'issues': []
        }
        
        try:
            context = ssl.create_default_context()
            with socket.create_connection((self.target, port), timeout=5) as sock:
                with context.wrap_socket(sock, server_hostname=self.target) as ssock:
                    cert = ssock.getpeercert()
                    
                    ssl_info['valid'] = True
                    ssl_info['protocol'] = ssock.version()
                    ssl_info['cipher'] = ssock.cipher()
                    ssl_info['issuer'] = dict(x[0] for x in cert.get('issuer', []))
                    
                    expires = datetime.strptime(cert['notAfter'], '%b %d %H:%M:%S %Y %Z')
                    ssl_info['expires'] = expires.isoformat()
                    
                    days_until_expiry = (expires - datetime.now()).days
                    if days_until_expiry < 30:
                        ssl_info['issues'].append(f'证书将在{days_until_expiry}天内过期')
                    
                    if ssl_info['protocol'] in ['TLSv1', 'TLSv1.1']:
                        ssl_info['issues'].append(f'使用不安全的协议: {ssl_info["protocol"]}')
                    
        except ssl.SSLCertVerificationError as e:
            ssl_info['issues'].append(f'证书验证失败: {str(e)}')
        except Exception as e:
            ssl_info['issues'].append(f'SSL检查失败: {str(e)}')
        
        self.results['ssl_audit'] = ssl_info
        return ssl_info
    
    def check_vulnerabilities(self) -> List[Dict]:
        """
        检查已知漏洞
        
        Returns:
            检测到的漏洞列表
        """
        vulnerabilities = []
        
        if 'port_scan' not in self.results:
            self.port_scan()
        
        open_ports = self.results['port_scan']
        
        for port, service in open_ports.items():
            if 'ssh' in service.lower() and port == 22:
                vulnerabilities.append({
                    'port': port,
                    'service': service,
                    'check': 'SSH配置',
                    'recommendation': '确保禁用root登录，使用密钥认证'
                })
            
            if 'mysql' in service.lower():
                vulnerabilities.append({
                    'port': port,
                    'service': service,
                    'check': 'MySQL暴露',
                    'recommendation': '限制MySQL访问，不对外暴露'
                })
            
            if 'redis' in service.lower():
                vulnerabilities.append({
                    'port': port,
                    'service': service,
                    'check': 'Redis未授权',
                    'recommendation': '启用认证，绑定内网地址'
                })
        
        self.results['vulnerabilities'] = vulnerabilities
        return vulnerabilities
    
    def _identify_service(self, port: int) -> str:
        """
        识别端口服务
        
        Args:
            port: 端口号
            
        Returns:
            服务名称
        """
        services = {
            21: 'FTP',
            22: 'SSH',
            23: 'Telnet',
            25: 'SMTP',
            80: 'HTTP',
            443: 'HTTPS',
            3306: 'MySQL',
            5432: 'PostgreSQL',
            6379: 'Redis',
            8080: 'HTTP-Proxy',
            8443: 'HTTPS-Alt'
        }
        return services.get(port, 'Unknown')
    
    def generate_report(self) -> Dict:
        """
        生成渗透测试报告
        
        Returns:
            完整测试报告
        """
        return {
            'target': self.target,
            'timestamp': datetime.now().isoformat(),
            'results': self.results
        }
```

### 依赖漏洞扫描 (SCA)

```python
import json
import subprocess
from typing import List, Dict, Optional
from dataclasses import dataclass

@dataclass
class DependencyVulnerability:
    """
    依赖漏洞数据类
    
    存储第三方依赖的漏洞信息
    """
    package: str
    installed_version: str
    vulnerable_versions: str
    patched_version: str
    severity: str
    cve_id: str
    description: str
    recommendation: str

class SCAScanner:
    """
    软件成分分析扫描器
    
    扫描第三方依赖的安全漏洞
    """
    
    def __init__(self, project_path: str) -> None:
        """
        初始化SCA扫描器
        
        Args:
            project_path: 项目路径
        """
        self.project_path = project_path
        self.vulnerabilities: List[DependencyVulnerability] = []
    
    def scan_npm(self) -> List[DependencyVulnerability]:
        """
        扫描NPM依赖
        
        Returns:
            发现的漏洞列表
        """
        try:
            result = subprocess.run(
                ['npm', 'audit', '--json'],
                cwd=self.project_path,
                capture_output=True,
                text=True
            )
            
            if result.stdout:
                audit_data = json.loads(result.stdout)
                
                for advisory_id, advisory in audit_data.get('advisories', {}).items():
                    self.vulnerabilities.append(DependencyVulnerability(
                        package=advisory['module_name'],
                        installed_version=advisory.get('findings', [{}])[0].get('version', 'unknown'),
                        vulnerable_versions=advisory['vulnerable_versions'],
                        patched_version=advisory['patched_versions'],
                        severity=advisory['severity'],
                        cve_id=advisory.get('cves', ['N/A'])[0],
                        description=advisory['title'],
                        recommendation=f'升级到 {advisory["patched_versions"]}'
                    ))
        except Exception as e:
            print(f"NPM扫描失败: {e}")
        
        return self.vulnerabilities
    
    def scan_pip(self) -> List[DependencyVulnerability]:
        """
        扫描Python依赖
        
        Returns:
            发现的漏洞列表
        """
        try:
            result = subprocess.run(
                ['pip', 'audit', '--format', 'json'],
                cwd=self.project_path,
                capture_output=True,
                text=True
            )
            
            if result.stdout:
                audit_data = json.loads(result.stdout)
                
                for vuln in audit_data:
                    self.vulnerabilities.append(DependencyVulnerability(
                        package=vuln['package'],
                        installed_version=vuln['installed_version'],
                        vulnerable_versions=vuln.get('vulnerable_versions', 'all'),
                        patched_version=vuln.get('fix_versions', ['unknown'])[0],
                        severity=vuln.get('severity', 'unknown'),
                        cve_id=vuln.get('cve', 'N/A'),
                        description=vuln.get('description', ''),
                        recommendation=f'升级到 {vuln.get("fix_versions", ["unknown"])[0]}'
                    ))
        except Exception as e:
            print(f"PIP扫描失败: {e}")
        
        return self.vulnerabilities
    
    def check_license_compliance(self) -> List[Dict]:
        """
        检查许可证合规性
        
        Returns:
            许可证检查结果
        """
        license_issues = []
        
        prohibited_licenses = {
            'GPL-3.0': '传染性许可证，可能影响商业使用',
            'AGPL-3.0': '网络传染性许可证',
            'SSPL': '非OSI批准许可证'
        }
        
        return license_issues
```

## Quick Reference

| 审计类型 | 工具 | 用途 |
|---------|-----|------|
| SAST | SonarQube, Semgrep | 源代码静态分析 |
| DAST | OWASP ZAP, Burp Suite | 运行时动态测试 |
| SCA | Snyk, Dependabot | 依赖漏洞扫描 |
| IAST | Contrast Security | 实时交互分析 |
| Secret Scan | GitLeaks, TruffleHog | 敏感信息扫描 |
| Container Scan | Trivy, Clair | 容器镜像扫描 |
| Infrastructure | Checkov, tfsec | IaC安全扫描 |

### 安全审计检查清单

- [ ] 执行SAST静态代码分析
- [ ] 执行DAST动态应用测试
- [ ] 扫描第三方依赖漏洞
- [ ] 检查安全响应头配置
- [ ] 验证SSL/TLS配置
- [ ] 测试认证和授权机制
- [ ] 检查敏感数据暴露
- [ ] 验证输入验证机制
- [ ] 测试会话管理
- [ ] 检查错误处理和信息泄露
- [ ] 审计日志和监控
- [ ] 检查API安全配置

### 常用安全测试命令

```bash
# NPM依赖审计
npm audit

# Python依赖审计
pip-audit

# 使用Trivy扫描容器
trivy image myapp:latest

# 使用Semgrep扫描代码
semgrep --config=auto .

# 使用GitLeaks扫描密钥
gitleaks detect --source .

# 使用Nuclei扫描Web应用
nuclei -u https://example.com -t cves/
```
