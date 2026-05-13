const fs = require('fs');
const path = require('path');

const skillName = process.argv[2];

if (!skillName) {
  console.error('\n❌ Error: Please provide a skill name\n');
  console.log('Usage: npm run agents:info [skill-name]\n');
  console.log('Available skills:');
  console.log('  - subagent-driven-development');
  console.log('  - executing-plans');
  console.log('  - using-git-worktrees\n');
  process.exit(1);
}

const skillsDir = path.join(__dirname, '..', '..', '.agents', 'skills');
const skillPath = path.join(skillsDir, skillName);
const skillFile = path.join(skillPath, 'SKILL.md');

if (!fs.existsSync(skillPath)) {
  console.error(`\n❌ Skill not found: ${skillName}\n`);
  console.log('Available skills:');
  const skills = fs.readdirSync(skillsDir);
  skills.forEach((s) => console.log(`  - ${s}`));
  console.log('');
  process.exit(1);
}

if (!fs.existsSync(skillFile)) {
  console.error(`\n❌ SKILL.md not found for: ${skillName}\n`);
  process.exit(1);
}

const content = fs.readFileSync(skillFile, 'utf-8');

console.log('\n📄 Skill Details:\n');
console.log(`Skill: ${skillName}`);
console.log('');

const lines = content.split('\n');
let inSection = false;
let sectionContent = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];

  if (line.startsWith('##')) {
    if (inSection && sectionContent.length > 0) {
      console.log(sectionContent.join('\n'));
      console.log('');
    }
    console.log(`\n### ${line}`);
    inSection = true;
    sectionContent = [];
  } else if (inSection && !line.startsWith('#') && line.trim()) {
    sectionContent.push(line);
  }
}

if (sectionContent.length > 0) {
  console.log(sectionContent.join('\n'));
}

console.log('\n');
