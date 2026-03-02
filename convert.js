#!/usr/bin/env node

/**
 * FullStack Dev Skills - IDE Rules Converter
 * 
 * 将 SKILL.md 转换为各 IDE 支持的规则格式
 * 
 * 支持的 IDE:
 * - Cursor (.cursorrules)
 * - Windsurf (.windsurfrules)
 * - VS Code + Copilot (.github/copilot-instructions.md)
 * - Claude Desktop (.clauderules)
 * 
 * @author Trae AI
 * @version 2.6.0
 */

const fs = require('fs');
const path = require('path');

const SKILL_FILE = path.join(__dirname, 'SKILL.md');
const OUTPUT_DIR = __dirname;

const IDE_CONFIGS = {
  cursor: {
    file: '.cursorrules',
    header: '# FullStack Development Skills - Cursor IDE Rules\n\n> 84 Skills | 15 Categories | 9 Workflows | Version 2.6.0\n'
  },
  windsurf: {
    file: '.windsurfrules',
    header: '# FullStack Development Skills - Windsurf IDE Rules\n\n> 84 Skills | 15 Categories | 9 Workflows | Version 2.6.0\n'
  },
  copilot: {
    file: '.github/copilot-instructions.md',
    header: '# GitHub Copilot Instructions - FullStack Development Skills\n\n> 84 Skills | 15 Categories | 9 Workflows | Version 2.6.0\n'
  },
  claude: {
    file: '.clauderules',
    header: '# FullStack Development Skills - Claude Desktop Rules\n\n> 84 Skills | 15 Categories | 9 Workflows | Version 2.6.0\n'
  }
};

/**
 * 解析 SKILL.md 文件内容
 * @param {string} content - SKILL.md 文件内容
 * @returns {Object} 解析后的技能数据
 */
function parseSkillFile(content) {
  const lines = content.split('\n');
  const result = {
    metadata: {},
    roleDefinition: '',
    whenToUse: [],
    coreWorkflow: [],
    referenceGuide: {},
    expertRoles: {},
    knowledgeReference: []
  };

  let currentSection = '';
  let inYamlFrontmatter = false;
  let sectionContent = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line === '---' && i < 3) {
      inYamlFrontmatter = !inYamlFrontmatter;
      continue;
    }

    if (inYamlFrontmatter) {
      const match = line.match(/^(\w+):\s*"?([^"]*)"?$/);
      if (match) {
        result.metadata[match[1]] = match[2];
      }
      continue;
    }

    if (line.startsWith('## ')) {
      if (currentSection && sectionContent.length > 0) {
        processSection(result, currentSection, sectionContent);
      }
      currentSection = line.replace('## ', '').trim();
      sectionContent = [];
    } else if (line.startsWith('### ')) {
      if (currentSection && sectionContent.length > 0) {
        processSection(result, currentSection, sectionContent);
      }
      currentSection = line.replace('### ', '').trim();
      sectionContent = [];
    } else {
      sectionContent.push(line);
    }
  }

  if (currentSection && sectionContent.length > 0) {
    processSection(result, currentSection, sectionContent);
  }

  return result;
}

/**
 * 处理各个章节内容
 * @param {Object} result - 结果对象
 * @param {string} section - 章节名称
 * @param {Array} content - 章节内容
 */
function processSection(result, section, content) {
  const sectionLower = section.toLowerCase();

  if (sectionLower === 'role definition') {
    result.roleDefinition = content.join('\n').trim();
  } else if (sectionLower === 'when to use this skill') {
    result.whenToUse = content
      .filter(l => l.startsWith('- '))
      .map(l => l.replace('- ', '').trim());
  } else if (sectionLower === 'core workflow') {
    result.coreWorkflow = content
      .filter(l => l.match(/^\d+\./))
      .map(l => l.replace(/^\d+\.\s*/, '').trim());
  } else if (sectionLower === 'knowledge reference') {
    result.knowledgeReference = content.join('\n').trim();
  } else if (sectionLower.includes('expert roles') || sectionLower.includes('summary')) {
    result.expertRoles[section] = content.join('\n').trim();
  } else {
    result.referenceGuide[section] = content.join('\n').trim();
  }
}

/**
 * 生成 IDE 规则文件内容
 * @param {Object} skillData - 解析后的技能数据
 * @param {string} ide - IDE 类型
 * @returns {string} 生成的规则文件内容
 */
function generateIdeRules(skillData, ide) {
  const config = IDE_CONFIGS[ide];
  let output = config.header;

  output += '## Role\n\n';
  output += skillData.roleDefinition + '\n\n';

  output += '## When to Apply These Rules\n\n';
  output += 'Apply these rules when working on:\n';
  skillData.whenToUse.forEach(item => {
    output += `- ${item}\n`;
  });
  output += '\n';

  output += '## Core Workflow\n\n';
  skillData.coreWorkflow.forEach((item, index) => {
    output += `${index + 1}. **${item}**\n`;
  });
  output += '\n';

  output += '## Skills Reference\n\n';
  for (const [section, content] of Object.entries(skillData.referenceGuide)) {
    if (content.trim()) {
      output += `### ${section}\n\n`;
      output += content + '\n\n';
    }
  }

  output += '## Coding Standards\n\n';
  output += '- Use standard code blocks for all code output\n';
  output += '- All functions must have JSDoc comments\n';
  output += '- No compatibility code unless explicitly required\n';
  output += '- Never fabricate APIs, libraries, parameters, or solutions\n';
  output += '- Always state "uncertain" for uncertain content\n\n';

  output += '## Knowledge Reference\n\n';
  output += skillData.knowledgeReference + '\n';

  return output;
}

/**
 * 主函数
 */
function main() {
  const args = process.argv.slice(2);
  const targetIde = args[0] || 'all';

  console.log('FullStack Dev Skills - IDE Rules Converter v2.6.0');
  console.log('================================================\n');

  if (!fs.existsSync(SKILL_FILE)) {
    console.error('Error: SKILL.md not found');
    process.exit(1);
  }

  const skillContent = fs.readFileSync(SKILL_FILE, 'utf-8');
  const skillData = parseSkillFile(skillContent);

  const idesToProcess = targetIde === 'all' 
    ? Object.keys(IDE_CONFIGS) 
    : [targetIde];

  idesToProcess.forEach(ide => {
    if (!IDE_CONFIGS[ide]) {
      console.error(`Error: Unknown IDE "${ide}"`);
      console.log('Supported IDEs: cursor, windsurf, copilot, claude, all');
      return;
    }

    const config = IDE_CONFIGS[ide];
    const outputPath = path.join(OUTPUT_DIR, config.file);

    if (ide === 'copilot') {
      const githubDir = path.join(OUTPUT_DIR, '.github');
      if (!fs.existsSync(githubDir)) {
        fs.mkdirSync(githubDir, { recursive: true });
      }
    }

    const rules = generateIdeRules(skillData, ide);
    fs.writeFileSync(outputPath, rules, 'utf-8');

    console.log(`✓ Generated: ${config.file}`);
  });

  console.log('\nDone! IDE rules files have been generated.');
}

main();
