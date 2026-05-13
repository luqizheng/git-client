const fs = require('fs');
const path = require('path');

const skillsDir = path.join(__dirname, '..', '..', '.agents', 'skills');

function listSkills() {
  console.log('\n📦 Available Agents/Skills:\n');

  if (!fs.existsSync(skillsDir)) {
    console.log('No skills directory found at:', skillsDir);
    return;
  }

  const skills = fs.readdirSync(skillsDir);

  skills.forEach((skill) => {
    const skillPath = path.join(skillsDir, skill);
    const skillFile = path.join(skillPath, 'SKILL.md');

    if (fs.statSync(skillPath).isDirectory() && fs.existsSync(skillFile)) {
      const content = fs.readFileSync(skillFile, 'utf-8');
      const nameMatch = content.match(/^name:\s*(.+)$/m);
      const descMatch = content.match(/^description:\s*(.+)$/m);

      const name = nameMatch ? nameMatch[1] : skill;
      const description = descMatch ? descMatch[1] : 'No description';

      console.log(`  🎯 ${skill}`);
      console.log(`     Name: ${name}`);
      console.log(`     Desc: ${description}`);
      console.log('');
    }
  });

  console.log('Usage:');
  console.log('  npm run agents:list              - List all agents');
  console.log('  npm run agents:info [skill-name] - Show skill details');
  console.log('');
}

listSkills();
