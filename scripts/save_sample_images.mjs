import fs from 'fs';
import path from 'path';

const inputFile = 'C:/Users/29093/.gemini/antigravity/brain/0b396b89-c8b2-4e9f-a48c-a79e9ab6f59c/.system_generated/steps/699/output.txt';
const raw = fs.readFileSync(inputFile, 'utf-8');

// 提取 JSON 部分
const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
if (!match) {
  console.error('No JSON match found in input file');
  process.exit(1);
}

const items = JSON.parse(match[0]);

const nameMap = {
  'two-bedroom-suite': '01_两室一厅经典户型_施工放线图.png',
  'l-shaped-loft': '02_L型大开间客餐厅_户型平面图.png',
  'master-bedroom-suite': '03_豪华南向大主卧套间_建筑图.png',
  'hand-drawn-sketch': '04_毛坯现场手绘实测草图.png'
};

const dirs = [
  'f:/document/pf/IT/projects/ARHome/sample-blueprints',
  'f:/document/pf/IT/projects/ARHome/public/sample-blueprints'
];

dirs.forEach(d => {
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
});

items.forEach(it => {
  const fileName = nameMap[it.id] || `${it.id}.png`;
  const base64Data = it.dataUrl.replace(/^data:image\/png;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  dirs.forEach(d => {
    const targetPath = path.join(d, fileName);
    fs.writeFileSync(targetPath, buffer);
    console.log(`Saved: ${targetPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
  });
});
