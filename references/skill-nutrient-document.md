# 文档处理技能 (Nutrient Document Processing)

## 概述

文档处理技能提供强大的文档转换和处理能力，支持 PDF 解析、格式转换、内容提取等功能，帮助开发者高效处理各类文档数据。

## 核心功能

### 1. PDF 处理
- PDF 文本提取
- PDF 表格解析
- PDF 图像提取
- PDF 合并与拆分

### 2. 格式转换
- PDF 转 Markdown
- PDF 转 HTML
- Word 转 PDF
- 图片转 PDF

### 3. 内容提取
- 文本内容提取
- 元数据提取
- 结构化数据提取
- OCR 文字识别

### 4. 文档分析
- 文档结构分析
- 内容摘要生成
- 关键信息提取
- 文档比对

## 使用方式

### 命令行调用
```bash
# PDF 转文本
/nutrient --input document.pdf --output document.txt

# PDF 转 Markdown
/nutrient --input document.pdf --output document.md --format markdown

# 提取表格
/nutrient --input report.pdf --extract tables --output tables.json

# OCR 识别
/nutrient --input scanned.pdf --ocr --output text.txt
```

### 配置文件
```json
{
  "nutrient": {
    "pdf": {
      "extractImages": true,
      "preserveFormatting": true,
      "ocrEnabled": false,
      "ocrLanguage": "chi_sim+eng"
    },
    "conversion": {
      "markdown": {
        "headingStyle": "atx",
        "codeBlockStyle": "fenced",
        "tableStyle": "github"
      }
    },
    "output": {
      "encoding": "utf-8",
      "lineEnding": "lf"
    }
  }
}
```

## PDF 处理

### 文本提取
```javascript
/**
 * 从 PDF 文件中提取文本内容
 * @param {string} filePath - PDF 文件路径
 * @param {Object} options - 提取选项
 * @returns {Promise<string>} 提取的文本内容
 */
async function extractText(filePath, options = {}) {
  const pdf = await loadPdf(filePath);
  const pages = [];
  
  for (const page of pdf.pages) {
    const text = await page.extractText({
      preserveWhitespace: options.preserveWhitespace ?? true,
      includeHidden: options.includeHidden ?? false
    });
    pages.push(text);
  }
  
  return pages.join('\n\n--- Page Break ---\n\n');
}
```

### 表格提取
```javascript
/**
 * 从 PDF 中提取表格数据
 * @param {string} filePath - PDF 文件路径
 * @param {Object} options - 提取选项
 * @returns {Promise<Array>} 表格数据数组
 */
async function extractTables(filePath, options = {}) {
  const pdf = await loadPdf(filePath);
  const tables = [];
  
  for (const page of pdf.pages) {
    const pageTables = await page.extractTables({
      detectBorders: true,
      mergeCells: options.mergeCells ?? true
    });
    tables.push(...pageTables);
  }
  
  return tables;
}

// 输出示例
[
  {
    page: 1,
    rows: [
      ['姓名', '年龄', '城市'],
      ['张三', '25', '北京'],
      ['李四', '30', '上海']
    ]
  }
]
```

### 图像提取
```javascript
/**
 * 从 PDF 中提取图像
 * @param {string} filePath - PDF 文件路径
 * @param {string} outputDir - 输出目录
 * @returns {Promise<Array>} 提取的图像信息
 */
async function extractImages(filePath, outputDir) {
  const pdf = await loadPdf(filePath);
  const images = [];
  
  for (let i = 0; i < pdf.pages.length; i++) {
    const pageImages = await pdf.pages[i].extractImages({
      format: 'png',
      quality: 90
    });
    
    for (let j = 0; j < pageImages.length; j++) {
      const filename = `page${i + 1}_image${j + 1}.png`;
      await saveImage(pageImages[j], path.join(outputDir, filename));
      images.push({
        page: i + 1,
        filename,
        width: pageImages[j].width,
        height: pageImages[j].height
      });
    }
  }
  
  return images;
}
```

## 格式转换

### PDF 转 Markdown
```javascript
/**
 * 将 PDF 转换为 Markdown 格式
 * @param {string} filePath - PDF 文件路径
 * @param {Object} options - 转换选项
 * @returns {Promise<string>} Markdown 内容
 */
async function pdfToMarkdown(filePath, options = {}) {
  const pdf = await loadPdf(filePath);
  let markdown = '';
  
  for (const page of pdf.pages) {
    // 提取标题
    const headings = await page.extractHeadings();
    for (const heading of headings) {
      const level = heading.level;
      const prefix = '#'.repeat(level);
      markdown += `${prefix} ${heading.text}\n\n`;
    }
    
    // 提取段落
    const paragraphs = await page.extractParagraphs();
    for (const para of paragraphs) {
      markdown += `${para.text}\n\n`;
    }
    
    // 提取表格
    const tables = await page.extractTables();
    for (const table of tables) {
      markdown += convertTableToMarkdown(table);
      markdown += '\n\n';
    }
    
    // 提取代码块
    const codeBlocks = await page.extractCodeBlocks();
    for (const block of codeBlocks) {
      markdown += `\`\`\`${block.language || ''}\n${block.code}\n\`\`\`\n\n`;
    }
  }
  
  return markdown;
}

// 表格转 Markdown
function convertTableToMarkdown(table) {
  let md = '';
  
  // 表头
  md += '| ' + table.rows[0].join(' | ') + ' |\n';
  md += '| ' + table.rows[0].map(() => '---').join(' | ') + ' |\n';
  
  // 数据行
  for (let i = 1; i < table.rows.length; i++) {
    md += '| ' + table.rows[i].join(' | ') + ' |\n';
  }
  
  return md;
}
```

### 转换输出示例
```markdown
# 产品需求文档

## 概述

本文档描述了用户认证系统的功能需求。

## 功能列表

| 功能 | 优先级 | 状态 |
| --- | --- | --- |
| 用户注册 | P0 | 已完成 |
| 用户登录 | P0 | 进行中 |
| 密码重置 | P1 | 待开始 |

## 技术方案

\`\`\`typescript
interface User {
  id: string;
  email: string;
  password: string;
}
\`\`\`

## 注意事项

1. 密码必须加密存储
2. 登录失败次数限制
3. 会话超时处理
```

## OCR 文字识别

### 配置 OCR
```json
{
  "ocr": {
    "engine": "tesseract",
    "languages": ["chi_sim", "eng"],
    "dpi": 300,
    "preprocessing": {
      "deskew": true,
      "denoise": true,
      "binarize": true
    }
  }
}
```

### OCR 处理
```javascript
/**
 * 对 PDF 进行 OCR 识别
 * @param {string} filePath - PDF 文件路径
 * @param {Object} options - OCR 选项
 * @returns {Promise<string>} 识别的文本
 */
async function performOcr(filePath, options = {}) {
  const pdf = await loadPdf(filePath);
  const results = [];
  
  for (const page of pdf.pages) {
    // 转换为图像
    const image = await page.toImage({
      dpi: options.dpi || 300,
      format: 'png'
    });
    
    // 预处理
    let processedImage = image;
    if (options.preprocessing) {
      if (options.preprocessing.deskew) {
        processedImage = await deskew(processedImage);
      }
      if (options.preprocessing.denoise) {
        processedImage = await denoise(processedImage);
      }
      if (options.preprocessing.binarize) {
        processedImage = await binarize(processedImage);
      }
    }
    
    // OCR 识别
    const text = await ocr(processedImage, {
      languages: options.languages || ['eng'],
      psm: 3  // 全自动页面分割
    });
    
    results.push(text);
  }
  
  return results.join('\n\n--- Page Break ---\n\n');
}
```

## 文档分析

### 结构分析
```javascript
/**
 * 分析文档结构
 * @param {string} filePath - 文档路径
 * @returns {Promise<Object>} 文档结构信息
 */
async function analyzeStructure(filePath) {
  const pdf = await loadPdf(filePath);
  
  return {
    pageCount: pdf.pages.length,
    metadata: {
      title: pdf.metadata.title,
      author: pdf.metadata.author,
      created: pdf.metadata.createdDate,
      modified: pdf.metadata.modifiedDate
    },
    structure: {
      headings: await extractAllHeadings(pdf),
      tables: await countTables(pdf),
      images: await countImages(pdf),
      links: await extractLinks(pdf)
    },
    statistics: {
      wordCount: await countWords(pdf),
      charCount: await countChars(pdf),
      avgWordsPerPage: await calcAvgWordsPerPage(pdf)
    }
  };
}
```

### 内容摘要
```javascript
/**
 * 生成文档摘要
 * @param {string} filePath - 文档路径
 * @param {Object} options - 摘要选项
 * @returns {Promise<string>} 文档摘要
 */
async function generateSummary(filePath, options = {}) {
  const text = await extractText(filePath);
  const maxLength = options.maxLength || 500;
  
  // 提取关键句子
  const sentences = text.split(/[。！？.!?]/);
  const keySentences = extractKeySentences(sentences, {
    count: options.sentenceCount || 5
  });
  
  // 生成摘要
  const summary = keySentences.join('。');
  
  if (summary.length > maxLength) {
    return summary.substring(0, maxLength) + '...';
  }
  
  return summary;
}
```

## 输出格式

### 处理报告
```markdown
## 文档处理报告

### 文件信息
- **文件名**: document.pdf
- **页数**: 15
- **大小**: 2.3 MB
- **处理时间**: 2024-01-15 10:00:00

### 提取结果
| 类型 | 数量 | 状态 |
|-----|------|------|
| 文本字符 | 45,230 | ✅ |
| 表格 | 8 | ✅ |
| 图像 | 12 | ✅ |
| 链接 | 25 | ✅ |

### 输出文件
- `document.txt` - 提取的文本
- `document.md` - Markdown 格式
- `images/` - 提取的图像
- `tables.json` - 表格数据

### 处理统计
- 文本提取耗时: 1.2s
- 表格提取耗时: 0.8s
- 图像提取耗时: 2.5s
- 总耗时: 4.5s

### 质量评估
- 文本完整度: 98%
- 表格识别率: 95%
- OCR 准确率: N/A (非扫描文档)
```

## 最佳实践

### 1. PDF 处理
- 先检查 PDF 是否包含可提取文本
- 对于扫描文档，启用 OCR
- 保留原始格式信息

### 2. 格式转换
- 选择合适的输出格式
- 处理特殊字符编码
- 验证转换结果

### 3. 性能优化
- 大文件分页处理
- 使用缓存机制
- 并行处理多文件

### 4. 错误处理
- 处理损坏的 PDF 文件
- 处理加密的 PDF
- 记录处理失败原因

## 相关参考

- [命令系统概述](./commands-overview.md)
- [代理系统概述](./agents-overview.md)
