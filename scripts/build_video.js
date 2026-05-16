/**
 * build_video.js - 视频构建脚本 v12.2
 *
 * 核心修复（v12.2）：
 * 1. 不裁剪：scale+pad 保持原始比例，竖屏1920×1920
 * 2. 字幕缩小：改用 ASS 文件，字号42px，PlayResY=1920
 * 3. 字幕移到画面底部：Alignment=5（底部居中）
 *
 * 重要：drawtext 不支持中文，用 Python 生成 ASS + FFmpeg subtitles 滤镜烧录
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
  const guess = 'D:\\software\\ffmpeg-4.4-essentials_build\\bin\\' + name + '.exe';
  if (fs.existsSync(guess)) return guess;
  return name;
}

const FFMPEG = findExecutable('ffmpeg');
const FFPROBE = findExecutable('ffprobe');
const PYTHON = 'python';

// ========== 配置（v12.2 竖屏1920×1920） ==========
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1920;

// ========== 验收检查 ==========
function validateAssets(assetsDir, sceneCount) {
  // 支持 assets/ 和 assets/images 两个路径
  const imagePath1 = assetsDir;
  const imagePath2 = path.join(assetsDir, 'images');
  const imageDir = fs.existsSync(imagePath2) ? imagePath2 : (fs.existsSync(imagePath1) ? imagePath1 : null);
  
  if (!imageDir) {
    return { pass: false, error: '素材目录不存在（尝试了 assets/ 和 assets/images/）' };
  }

  const assets = fs.readdirSync(imageDir)
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
  const sizeMB = fs.statSync(outputPath).size / 1024 / 1024;
  if (sizeMB < 1) {
    return { pass: false, error: `文件过小：${sizeMB.toFixed(2)}MB < 1MB` };
  }
  return { pass: true, sizeMB };
}

function getDuration(file) {
  try {
    const out = execSync(`"${FFPROBE}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${file}"`, {
      encoding: 'utf8', shell: 'cmd.exe', stdio: ['pipe', 'pipe', 'pipe']
    });
    return parseFloat(out.trim());
  } catch (e) {
    return 0;
  }
}

function getVideoResolution(file) {
  try {
    const out = execSync(`"${FFPROBE}" -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "${file}"`, {
      encoding: 'utf8', shell: 'cmd.exe', stdio: ['pipe', 'pipe', 'pipe']
    });
    return out.trim();
  } catch (e) {
    return null;
  }
}

function runCmd(cmd, label) {
  try {
    execSync(cmd, { encoding: 'utf8', shell: 'cmd.exe', stdio: 'pipe' });
    return true;
  } catch (e) {
    console.error(`  ⚠ ${label}：${e.message.split('\n').slice(-2).join(' ')}`);
    return false;
  }
}

// ========== 生成 ASS 字幕文件（v12.2：底部居中，1920×1920） ==========
function generateAssForScene(text, startTime, endTime, outputPath) {
  const h1 = Math.floor(startTime / 3600);
  const m1 = Math.floor((startTime % 3600) / 60);
  const s1 = Math.floor(startTime % 60);
  const cs1 = Math.floor((startTime - Math.floor(startTime)) * 100);
  const h2 = Math.floor(endTime / 3600);
  const m2 = Math.floor((endTime % 3600) / 60);
  const s2 = Math.floor(endTime % 60);
  const cs2 = Math.floor((endTime - Math.floor(endTime)) * 100);

  const content = [
    '[Script Info]',
    'Title=SceneSubtitle',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    `Style: Default,Microsoft YaHei,42,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,5,30,30,120,1`,
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text',
    `Dialogue: 0,${h1}:${String(m1).padStart(2,'0')}:${String(s1).padStart(2,'0')}.${String(cs1).padStart(2,'0')},${h2}:${String(m2).padStart(2,'0')}:${String(s2).padStart(2,'0')}.${String(cs2).padStart(2,'0')},Default,*,30,30,120,,${text}`
  ].join('\r\n');

  fs.writeFileSync(outputPath, content, 'utf8');
}

// ========== 主构建流程 ==========
async function buildVideo(configPath, outputDir) {
  console.log('\n=== 视频构建开始 (v12.2) ===\n');

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const sceneCount = config.scenes.length;
  const assetsDir = path.join(outputDir, 'assets');
  const workDir = path.join(outputDir, 'temp_build');

  console.log(`场景数量：${sceneCount}`);
  console.log(`输出分辨率：${TARGET_WIDTH}×${TARGET_HEIGHT}（竖屏）`);

  // 验收检查
  console.log('\n[1/6] 检查素材...');
  const assetsCheck = validateAssets(assetsDir, sceneCount);
  if (!assetsCheck.pass) {
    console.error(`✗ 素材验收失败：${assetsCheck.error}`);
    process.exit(1);
  }
  console.log(`✓ 素材检查通过：${assetsCheck.assets.length}张`);

  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }

  // ========== [2/6] 预处理素材（scale+pad 不裁剪） ==========
  console.log('\n[2/6] 预处理素材（scale+pad 不裁剪）...');
  const ttsDurations = [];
  let currentTime = 0;

  for (let i = 1; i <= sceneCount; i++) {
    const mp3Path = path.join(assetsDir, `scene_${String(i).padStart(2,'0')}.mp3`);
    const dur = getDuration(mp3Path) || 2.5;
    ttsDurations.push({ scene: i, start: currentTime, end: currentTime + dur, dur });
    currentTime += dur;

    // 支持 assets/ 和 assets/images 两个路径
    const imagePath1 = assetsDir;
    const imagePath2 = path.join(assetsDir, 'images');
    const imageDir = fs.existsSync(imagePath2) ? imagePath2 : (fs.existsSync(imagePath1) ? imagePath1 : assetsDir);
    
    const srcFiles = fs.readdirSync(imageDir)
      .filter(f => f.startsWith(`scene_${String(i).padStart(2,'0')}`))
      .filter(f => /\.(png|jpg|jpeg)$/i.test(f));
    if (srcFiles.length === 0) continue;

    const srcPath = path.join(imageDir, srcFiles[0]);
    const dstPath = path.join(workDir, `pre_${i}.png`);

    // 【v12.2修复】scale+pad 等比缩放，不裁剪
    // 竖屏：横屏素材在两侧加黑边，竖屏素材直接放大
    const cmd = `"${FFMPEG}" -y -i "${srcPath}" ` +
      `-vf "scale=w='min(iw*${TARGET_HEIGHT}/ih,${TARGET_WIDTH}):h=min(ih,${TARGET_HEIGHT})',` +
      `pad=${TARGET_WIDTH}:${TARGET_HEIGHT}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1" ` +
      `-frames:v 1 "${dstPath}"`;

    runCmd(cmd, `[${i}] ${srcFiles[0]}`);
    console.log(`  [${i}] ${srcFiles[0]} ✓ (${dur.toFixed(1)}s)`);
  }

  // ========== [3/6] 生成场景视频（Ken Burns 1920×1920） ==========
  console.log('\n[3/6] 生成场景视频（Ken Burns 1920×1920）...');
  const sceneVideos = [];

  for (let i = 0; i < sceneCount; i++) {
    const imgPath = path.join(workDir, `pre_${i+1}.png`);
    if (!fs.existsSync(imgPath)) {
      console.log(`  [${i+1}] 跳过（无素材）`);
      continue;
    }

    const mp3Path = path.join(assetsDir, `scene_${String(i+1).padStart(2,'0')}.mp3`);
    const sceneOut = path.join(workDir, `scene_${i+1}.mp4`);
    const dur = ttsDurations[i].dur;
    const frames = Math.floor(dur * 30);

    // 【v12.2】Ken Burns 动画在 1920×1920 上运行
    const kbFilter = `scale=${TARGET_WIDTH}:${TARGET_HEIGHT},` +
      `zoompan=z='min(zoom+0.0002,1.25)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':` +
      `d=${frames}:s=${TARGET_WIDTH}x${TARGET_HEIGHT}:fps=30:disable=lt(t\\,0.5)`;

    const cmd = `"${FFMPEG}" -y -loop 1 -i "${imgPath}" -i "${mp3Path}" ` +
      `-vf "${kbFilter}" ` +
      `-c:v libx264 -preset fast -crf 23 -r 30 ` +
      `-c:a aac -shortest "${sceneOut}"`;

    runCmd(cmd, `[${i+1}] Ken Burns`);
    sceneVideos.push(sceneOut);
    console.log(`  [${i+1}] ${dur.toFixed(1)}s ✓`);
  }

  // ========== [4/6] 合并场景（强制重编码，避免分辨率丢失） ==========
  console.log('\n[4/6] 合并场景（强制重编码）...');
  const concatFile = path.join(workDir, 'concat.txt');
  // 【v12.2修复】concat 必须用重编码，不用 -c copy
  fs.writeFileSync(concatFile, sceneVideos.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n'));

  const mergedVideo = path.join(workDir, 'merged.mp4');
  const concatCmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${concatFile}" ` +
    `-c:v libx264 -preset fast -crf 23 -r 30 -an "${mergedVideo}"`;
  runCmd(concatCmd, '合并');

  const mergedRes = getVideoResolution(mergedVideo);
  const mergedDur = getDuration(mergedVideo);
  console.log(`  ✓ 合并完成：${sceneVideos.length}个场景 | ${mergedRes} | ${mergedDur.toFixed(1)}s`);

  // ========== [5/6] 生成 ASS 字幕 + FFmpeg subtitles 滤镜烧录 ==========
  console.log('\n[5/6] 生成 ASS 字幕并烧录...');

  // 生成全视频 ASS 字幕文件
  const assFile = path.join(workDir, 'subtitles.ass');
  const assLines = [
    '[Script Info]',
    'Title=FullVideoSubtitle',
    '',
    '[V4+ Styles]',
    'Format: Name,Fontname,Fontsize,PrimaryColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding',
    `Style: Default,Microsoft YaHei,42,&H00FFFFFF,&H00000000,-1,0,0,0,100,100,0,0,1,2,2,5,30,30,120,1`,
    '',
    '[Events]',
    'Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text'
  ];

  for (const seg of ttsDurations) {
    const text = config.scenes[seg.scene - 1].text || '';
    if (!text) continue;

    const fmtTime = (t) => {
      const h = Math.floor(t / 3600);
      const m = Math.floor((t % 3600) / 60);
      const s = Math.floor(t % 60);
      const cs = Math.floor((t - Math.floor(t)) * 100);
      return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(cs).padStart(2,'0')}`;
    };

    const escaped = text.replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    assLines.push(`Dialogue: 0,${fmtTime(seg.start)},${fmtTime(seg.end)},Default,*,30,30,120,,${escaped}`);
  }

  fs.writeFileSync(assFile, assLines.join('\r\n'), 'utf8');
  console.log(`  ✓ 字幕文件生成：${assLines.length - 4} 段`);

  // FFmpeg subtitles 滤镜烧录（复制 ASS 到 output 目录，用相对路径）
  const outputAssFile = path.join(outputDir, 'subtitles.ass');
  fs.copyFileSync(assFile, outputAssFile);

  const mergedWithSubs = path.join(workDir, 'merged_with_subs.mp4');
  // subtitles 滤镜使用相对路径，避免 D: 盘符解析问题
  const subCmd = `"${FFMPEG}" -y -i "${mergedVideo}" -i "${outputAssFile}" ` +
    `-vf "subtitles='subtitles.ass':charsets='UTF-8':force_style='Fontname=Microsoft YaHei,Fontsize=42,Alignment=5,MarginV=120'" ` +
    `-map 0:v -map 0:a -c:v libx264 -preset fast -crf 22 -c:a copy "${mergedWithSubs}"`;
  runCmd(subCmd, '字幕烧录');

  // ========== [6/6] 混音 BGM + 最终输出 ==========
  console.log('\n[6/6] 混音 BGM + 最终输出...');
  const finalOutput = path.join(outputDir, 'final_video.mp4');
  const bgmPath = config.bgm || null;

  if (bgmPath && fs.existsSync(bgmPath)) {
    const bgmCmd = `"${FFMPEG}" -y -i "${mergedWithSubs}" -i "${bgmPath}" ` +
      `-filter_complex "[0:a][1:a]amix=inputs=2:duration=first:weights=1 0.12[aout]" ` +
      `-map 0:v -map "[aout]" -c:v copy -c:a aac -b:a 192k -shortest "${finalOutput}"`;
    runCmd(bgmCmd, 'BGM混音');
    console.log('  ✓ BGM 混音完成（权重：配音1.0，BGM 0.12）');
  } else {
    fs.copyFileSync(mergedWithSubs, finalOutput);
    if (!bgmPath) console.log('  ℹ 无 BGM 配置');
    else console.log(`  ℹ BGM 不存在：${bgmPath}`);
  }

  // 最终验收
  console.log('\n=== 最终验收 ===\n');
  const check = validateOutput(finalOutput);
  if (check.pass) {
    const dur = getDuration(finalOutput);
    const res = getVideoResolution(finalOutput);
    console.log(`✓ 验收通过`);
    console.log(`  文件大小：${check.sizeMB.toFixed(2)}MB`);
    console.log(`  分辨率：${res}`);
    console.log(`  视频时长：${dur.toFixed(1)}秒`);
    console.log(`  路径：${finalOutput}`);
    return { success: true, output: finalOutput };
  } else {
    console.error(`✗ 验收失败：${check.error}`);
    return { success: false, error: check.error };
  }
}

module.exports = { buildVideo, validateAssets, validateOutput };

// CLI 入口
if (require.main === module) {
  const configPath = process.argv[2] || 'config.json';
  const outputDir = process.argv[3] || '.';
  buildVideo(configPath, outputDir);
}
