/**
 * build_video.js - 视频构建脚本（含素材验收）
 * 
 * 核心要求：
 * 1. 每个场景必须有真实素材（图片/视频），禁止纯色背景
 * 2. 文件大小必须 ≥ 1MB
 * 3. 素材必须有动态效果（Ken Burns/过渡动画）
 * 
 * 验收规则参见：ACCEPTANCE_RULES.md
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ========== 工具路径查找（自动适配） ==========
function findExecutable(name) {
  try {
    const out = execSync(`where ${name}`, { encoding: 'utf8', shell: 'cmd.exe', stdio: ['pipe', 'pipe', 'pipe'] });
    const first = out.trim().split('\n')[0].trim().replace(/"/g, '');
    if (first) return first;
  } catch (e) { /* fall through */ }
  // 兜底常见路径
  // 兜底：常见安装路径
  const guess = 'D:\\software\\ffmpeg-4.4-essentials_build\\bin\\' + name + '.exe';
  if (fs.existsSync(guess)) return guess;
  return name; // 让系统 PATH 兜底
}

const FFMPEG = findExecutable('ffmpeg');
const FFPROBE = findExecutable('ffprobe');

// ========== 配置 ==========
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1440;
const FRAME_WIDTH = 1440;
const FRAME_HEIGHT = 1080;
const MIN_FILE_SIZE_MB = 1;

// ========== 验收检查 ==========
function validateAssets(assetsDir, sceneCount) {
  if (!fs.existsSync(assetsDir)) {
    return { pass: false, error: '素材目录不存在' };
  }
  
  const assets = fs.readdirSync(assetsDir)
    .filter(f => /^scene_\d+\.(png|jpg|jpeg)$/i.test(f));
  
  if (assets.length < sceneCount) {
    return { pass: false, error: `素材不足：需要${sceneCount}张，实际${assets.length}张` };
  }
  
  const emptyAssets = assets.filter(a => {
    const stat = fs.statSync(path.join(assetsDir, a));
    return stat.size < 10000;
  });
  
  if (emptyAssets.length > 0) {
    return { pass: false, error: `无效素材：${emptyAssets.join(', ')}` };
  }
  
  return { pass: true, assets };
}

function validateOutput(outputPath) {
  if (!fs.existsSync(outputPath)) {
    return { pass: false, error: '输出文件不存在' };
  }
  
  const stat = fs.statSync(outputPath);
  const sizeMB = stat.size / 1024 / 1024;
  
  if (sizeMB < MIN_FILE_SIZE_MB) {
    return { pass: false, error: `文件过小：${sizeMB.toFixed(2)}MB < ${MIN_FILE_SIZE_MB}MB（可能缺少素材）` };
  }
  
  return { pass: true, sizeMB };
}

function getDuration(file) {
  try {
    const out = execSync(`"${FFPROBE}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`, {
      encoding: 'utf8',
      shell: 'cmd.exe',
      stdio: ['pipe', 'pipe', 'pipe']
    });
    return parseFloat(out.trim());
  } catch (e) {
    return 0;
  }
}

function escText(t) {
  return t.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/\[/g, "\\[").replace(/\]/g, "\\]");
}

// ========== 主构建流程 ==========
async function buildVideo(configPath, outputDir) {
  console.log('\n=== 视频构建开始 ===\n');
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const sceneCount = config.scenes.length;
  const assetsDir = path.join(outputDir, 'assets');
  
  console.log(`场景数量：${sceneCount}`);
  console.log(`素材目录：${assetsDir}`);
  
  // 验收检查：素材
  console.log('\n[1/5] 检查素材...');
  const assetsCheck = validateAssets(assetsDir, sceneCount);
  if (!assetsCheck.pass) {
    console.error(`✗ 素材验收失败：${assetsCheck.error}`);
    console.error('\n请确保每个场景都有对应的素材图片：');
    console.error('  - scene_01.png/jpg');
    console.error('  - scene_02.png/jpg');
    console.error('  - ...');
    process.exit(1);
  }
  console.log(`✓ 素材检查通过：${assetsCheck.assets.length}张`);
  
  const workDir = path.join(outputDir, 'temp_build');
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }
  
  // 预处理素材
  console.log('\n[2/5] 预处理素材...');
  for (let i = 1; i <= sceneCount; i++) {
    const srcFiles = fs.readdirSync(assetsDir)
      .filter(f => f.startsWith(`scene_${String(i).padStart(2, '0')}`));
    if (srcFiles.length === 0) continue;
    
    const srcPath = path.join(assetsDir, srcFiles[0]);
    const dstPath = path.join(workDir, `pre_${i}.png`);
    
    const cmd = `"${FFMPEG}" -y -i "${srcPath}" ` +
      `-vf "scale=${TARGET_WIDTH}:${TARGET_HEIGHT}:force_original_aspect_ratio=increase,crop=${TARGET_WIDTH}:${TARGET_HEIGHT}" ` +
      `-frames:v 1 "${dstPath}"`;
    
    execSync(cmd, { encoding: 'utf8', shell: 'cmd.exe', stdio: 'pipe' });
    console.log(`  [${i}] ${srcFiles[0]} ✓`);
  }
  
  // 生成场景视频
  console.log('\n[3/5] 生成场景视频（Ken Burns动画）...');
  const sceneVideos = [];
  
  for (let i = 1; i <= sceneCount; i++) {
    const imgPath = path.join(workDir, `pre_${i}.png`);
    if (!fs.existsSync(imgPath)) {
      console.log(`  [${i}] 跳过（无素材）`);
      continue;
    }
    
    const mp3Path = path.join(outputDir, `scene_${String(i).padStart(2, '0')}.mp3`);
    const sceneOut = path.join(workDir, `scene_${i}.mp4`);
    const dur = getDuration(mp3Path) || 3;
    
    const text = escText(config.scenes[i-1].text);
    const subText = escText(config.scenes[i-1].subText || '');
    
    const kbFilter = `scale=${TARGET_WIDTH}:${TARGET_HEIGHT},zoompan=z='min(zoom+0.0015,1.1)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${Math.floor(dur*30)}:s=${FRAME_WIDTH}x${FRAME_HEIGHT}:fps=30`;
    
    const subFilter = `drawtext=text='${text}':fontfile='C\\:/Windows/Fonts/msyhbd.ttc':fontsize=52:fontcolor=white:x=(w-text_w)/2:y=h-160:shadowcolor=black:shadowx=2:shadowy=2` +
      (subText ? `,drawtext=text='${subText}':fontfile='C\\:/Windows/Fonts/msyh.ttc':fontsize=32:fontcolor=0xd4d4d4:x=(w-text_w)/2:y=h-90` : '');
    
    const cmd = `"${FFMPEG}" -y -loop 1 -i "${imgPath}" -i "${mp3Path}" ` +
      `-vf "${kbFilter},${subFilter}" ` +
      `-c:v libx264 -preset fast -crf 23 -c:a aac -shortest "${sceneOut}"`;
    
    execSync(cmd, { encoding: 'utf8', shell: 'cmd.exe', stdio: 'pipe' });
    sceneVideos.push(sceneOut);
    console.log(`  [${i}] ${dur.toFixed(1)}s ✓`);
  }
  
  // 合并场景
  console.log('\n[4/5] 合并场景...');
  const listFile = path.join(workDir, 'concat.txt');
  fs.writeFileSync(listFile, sceneVideos.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));
  
  const rawOutput = path.join(workDir, 'raw.mp4');
  const concatCmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${listFile}" -c copy "${rawOutput}"`;
  execSync(concatCmd, { encoding: 'utf8', shell: 'cmd.exe', stdio: 'pipe' });
  console.log(`✓ 合并完成：${sceneVideos.length}个场景`);
  
  // 添加 BGM
  console.log('\n[5/5] 添加 BGM...');
  const finalOutput = path.join(outputDir, 'final_video.mp4');
  // BGM 路径：从 config.json 的 bgm 字段读取，默认为空（不混 BGM）
  const bgmPath = config.bgm || null;
  if (bgmPath && fs.existsSync(bgmPath)) {
    const bgmCmd = `"${FFMPEG}" -y -i "${rawOutput}" -i "${bgmPath}" ` +
      `-filter_complex "[0:a][1:a]amix=inputs=2:duration=first[aout]" ` +
      `-map 0:v -map "[aout]" -c:v copy -c:a aac -shortest "${finalOutput}"`;
    execSync(bgmCmd, { encoding: 'utf8', shell: 'cmd.exe', stdio: 'pipe' });
    console.log('✓ BGM 添加完成');
  } else {
    fs.copyFileSync(rawOutput, finalOutput);
    if (!bgmPath) console.log('ℹ 无 BGM 配置，跳过');
    else console.log(`ℹ BGM 文件不存在（${bgmPath})，跳过`);
  }
  
  // 最终验收
  console.log('\n=== 最终验收 ===\n');
  const outputCheck = validateOutput(finalOutput);
  
  if (outputCheck.pass) {
    const duration = getDuration(finalOutput);
    console.log(`✓ 验收通过`);
    console.log(`  文件大小：${outputCheck.sizeMB.toFixed(2)}MB`);
    console.log(`  视频时长：${duration.toFixed(1)}秒`);
    console.log(`  视频路径：${finalOutput}`);
    return { success: true, output: finalOutput };
  } else {
    console.error(`✗ 验收失败：${outputCheck.error}`);
    return { success: false, error: outputCheck.error };
  }
}

module.exports = { buildVideo, validateAssets, validateOutput };

// CLI 入口
if (require.main === module) {
  const configPath = process.argv[2] || 'config.json';
  const outputDir = process.argv[3] || '.';
  buildVideo(configPath, outputDir);
}
