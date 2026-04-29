/**
 * 批量 TTS 配音生成
 * 
 * 用法: node gen_tts.js --voice zh-CN-YunjianNeural --speed 30 --input scenes.json --output ./tts/
 * 
 * scenes.json 格式:
 * [
 *   { "id": 1, "text": "25.9万人正在使用的AI助手" },
 *   { "id": 2, "text": "开源免费，本地运行，数据不上云" },
 *   ...
 * ]
 * 
 * 或直接传文本参数:
 * node gen_tts.js "句子1" "句子2" "句子3"
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let voice = 'zh-CN-YunjianNeural';
let speed = 30;
let input = null;
let outputDir = './tts';

// 解析参数
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--voice') { voice = args[++i]; }
  else if (args[i] === '--speed') { speed = parseInt(args[++i]); }
  else if (args[i] === '--input') { input = args[++i]; }
  else if (args[i] === '--output') { outputDir = args[++i]; }
}

if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

let scenes = [];
if (input && fs.existsSync(input)) {
  const inputData = JSON.parse(fs.readFileSync(input, 'utf8'));
  // 支持两种格式：直接是数组，或包含 scenes 字段的对象
  scenes = Array.isArray(inputData) ? inputData : (inputData.scenes || []);
} else {
  // 直接从命令行参数收集文本
  scenes = args.filter(a => !a.startsWith('--')).map((text, i) => ({ id: i + 1, text }));
}

if (scenes.length === 0) {
  console.log('用法: node gen_tts.js "句子1" "句子2" ...');
  console.log('  或: node gen_tts.js --input scenes.json --output ./tts/');
  process.exit(1);
}

console.log(`\n🎤 生成 TTS: ${voice} +${speed}%\n`);

for (const scene of scenes) {
  const outFile = path.join(outputDir, `scene_${String(scene.id).padStart(2, '0')}.mp3`);
  
  if (fs.existsSync(outFile)) {
    console.log(`  [${scene.id}] 已存在: ${outFile}`);
    continue;
  }

  const cmd = `python -m edge_tts --voice ${voice} --rate=+${speed}% ` +
    `--text "${scene.text.replace(/"/g, '\\"')}" --write-media "${outFile}"`;
  
  try {
    execSync(cmd, { stdio: 'pipe' });
    console.log(`  [${scene.id}] ✓ ${scene.text.substring(0, 25)}...`);
  } catch (err) {
    console.error(`  [${scene.id}] ✗ ${scene.text.substring(0, 25)}...`);
    console.error(`    ${err.message}`);
  }
}

console.log(`\n✅ 生成 ${scenes.length} 段配音 → ${outputDir}\n`);
