#!/usr/bin/env node
/**
 * P2b 下载阶段脚本 (v13.9 主会话exec版)
 * 
 * 用法: node p2b_download.js --output "D:/workspace/MediaContentCreation/YYYY-MM-DD"
 * 
 * 强制规则:
 * 1. 禁止创建 placeholder 视频/图片
 * 2. 禁止标记 verified=true 给生成内容
 * 3. PIL生成兜底 ≤20% (≤2个场景)
 * 4. 下载失败=报告=不写 video_sources.json
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const TAVILY_SCRIPT = 'D:/workspace/scripts/tavily_search.cjs';
const PROSEARCH_SCRIPT = 'D:/Program Files/QClaw/resources/openclaw/config/skills/online-search/scripts/prosearch.cjs';
const FFPROBE = 'D:/software/ffmpeg-4.4-essentials_build/bin/ffprobe.exe';
const MAX_GENERATED = 2; // PIL生成最多2个场景

// ── 工具函数 ────────────────────────────────────────────────

function getMd5(filePath) {
  const crypto = require('crypto');
  const hash = crypto.createHash('md5');
  const buf = fs.readFileSync(filePath);
  hash.update(buf);
  return hash.digest('hex');
}

function ffprobeDimensions(filePath) {
  try {
    const result = execSync(
      `"${FFPROBE}" -v error -select_streams v:0 ` +
      `-show_entries stream=width,height -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    const parts = result.trim().split(',');
    if (parts.length === 2) return { w: parseInt(parts[0]), h: parseInt(parts[1]) };
  } catch (e) {}
  return null;
}

function getDuration(filePath) {
  try {
    const result = execSync(
      `"${FFPROBE}" -v error -show_entries format=duration -of csv=p=0 "${filePath}"`,
      { encoding: 'utf8', timeout: 30000 }
    );
    return parseFloat(result.trim());
  } catch (e) {}
  return null;
}

// ── 图片处理辅助函数 ─────────────────────────────────────

function checkImageDims(filePath) {
  try {
    const result = execSync(
      `python -c "from PIL import Image; img=Image.open(r'${filePath}'); print(img.size[0],img.size[1])"`,
      { encoding: 'utf8', timeout: 10000, shell: true }
    );
    const parts = result.trim().split(/\s+/);
    if (parts.length === 2) return { w: parseInt(parts[0]), h: parseInt(parts[1]) };
  } catch (e) {}
  return null;
}

async function scrapeMainImage(pageUrl) {
  return new Promise((resolve, reject) => {
    const proto = pageUrl.startsWith('https') ? https : http;
    const req = proto.get(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      timeout: 15000,
    }, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      let html = '';
      res.on('data', chunk => { html += chunk.toString(); });
      res.on('end', () => {
        // 提取所有img src，优先og:image/meta, 然后较大的图片
        const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
          || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+og:image/i);
        if (ogMatch) { resolve(makeAbsolute(ogMatch[1], pageUrl)); return; }
        
        // 提取所有 img 标签
        const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
        const imgUrls = [];
        let m;
        while ((m = imgRegex.exec(html)) !== null) {
          const src = makeAbsolute(m[1], pageUrl);
          // 跳过小图标和logo
          if (!src.match(/(icon|logo|avatar|emoji|loading|header|footer|pixel|tracking|beacon)/i)
              && src.match(/^https?:\/\/.+\.(jpg|jpeg|png|webp)/i)) {
            imgUrls.push(src);
          }
        }
        if (imgUrls.length > 0) { resolve(imgUrls[0]); return; }
        reject(new Error('No image found'));
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function makeAbsolute(imgUrl, pageUrl) {
  if (imgUrl.startsWith('http')) return imgUrl;
  if (imgUrl.startsWith('//')) return 'https:' + imgUrl;
  const base = new URL(pageUrl);
  if (imgUrl.startsWith('/')) return base.origin + imgUrl;
  return base.origin + '/' + imgUrl;
}

// ── 下载函数 ────────────────────────────────────────────────

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const destDir = path.dirname(dest);
    if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
    
    const proto = url.startsWith('https') ? https : http;
    const referer = new URL(url).origin + '/';
    
    const req = proto.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': referer,
        'Accept': '*/*',
      },
      timeout: 30000,
    }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
      file.on('error', (err) => { fs.unlinkSync(dest); reject(err); });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function downloadWithYtDlp(url, outputTemplate) {
  try {
    // 先查可用格式
    const listResult = spawnSync('yt-dlp', ['--list-formats', url], {
      encoding: 'utf8', timeout: 30000, shell: true
    });
    
    let formatId = 'best';
    if (listResult.stdout) {
      const lines = listResult.stdout.split('\n');
      // 找免费格式（通常480P或更低）
      for (const line of lines) {
        if (line.includes('480') || line.includes('360') || line.match(/^\d+:/)) {
          const match = line.match(/^(\d+)/);
          if (match) { formatId = match[1]; break; }
        }
      }
    }
    
    const result = spawnSync(
      'yt-dlp',
      ['--no-playlist', '-f', formatId, '-o', outputTemplate, url],
      { encoding: 'utf8', timeout: 120000, shell: true }
    );
    
    if (result.status === 0) {
      // yt-dlp 输出的文件名可能带扩展名，用 readdirSync 查找
      const outDir = path.dirname(outputTemplate.replace('%(ext)s', ''));
      const baseName = path.basename(outputTemplate.replace('%(ext)s', ''));
      const files = fs.readdirSync(outDir).filter(f => f.startsWith(baseName));
      return files.length > 0 ? path.join(outDir, files[0]) : null;
    }
    return null;
  } catch (e) {
    console.log(`  ⚠️  yt-dlp 失败: ${e.message}`);
    return null;
  }
}

// ── PIL 生成文字卡片（兜底，≤20%）────────────────────────

function generatePilCard(sceneId, text, outputPath, isVideo) {
  try {
    const isVid = isVideo === true;
    // 统一先保存为 PNG
    const pngPath = isVid ? outputPath.replace('.mp4', '.png') : outputPath;
    const pyCode = [
      'from PIL import Image,ImageDraw,ImageFont',
      'img=Image.new("RGB",(1280,720),"#1a1a2e")',
      'd=ImageDraw.Draw(img)',
      'try: fnt=ImageFont.truetype("msyhbd.ttc",60)',
      'except: fnt=ImageFont.load_default()',
      't=' + JSON.stringify(text),
      'bx=d.textbbox((0,0),t,font=fnt)',
      'tw,th=bx[2]-bx[0],bx[3]-bx[1]',
      'd.text(((1280-tw)//2,(720-th)//2),t,font=fnt,fill="white")',
      'img.save(r"' + pngPath.replace(/\\/g, '\\\\') + '")',
      'print("OK")',
    ].join('\n');
    const tmpPy = outputPath + '.tmp.py';
    fs.writeFileSync(tmpPy, pyCode);
    execSync('python "' + tmpPy + '"', { encoding: 'utf8', timeout: 30000, shell: true });
    fs.unlinkSync(tmpPy);
    if (!fs.existsSync(pngPath)) return false;
    // 视频场景：FFmpeg 将 PNG 转 mp4（loop 5秒）
    if (isVid) {
      const ffmpeg = FFPROBE.replace('ffprobe.exe', 'ffmpeg.exe');
      const cmd = '"' + ffmpeg + '" -y -loop 1 -i "' + pngPath + '" -c:v libx264 -t 5 -pix_fmt yuv420p "' + outputPath + '"';
      execSync(cmd, { timeout: 60000, shell: true });
      try { fs.unlinkSync(pngPath); } catch(e) {}
      return fs.existsSync(outputPath) && fs.statSync(outputPath).size > 50000;
    }
    return true;
  } catch (e) {
    console.log('  ⚠️  PIL 生成失败: ' + e.message.substring(0, 80));
    return false;
  }
}

// ── 主逻辑 ──────────────────────────────────────────────────

async function main() {
  const args = process.argv.slice(2);
  let outputDir = '';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = args[i + 1];
      i++;
    }
  }
  
  if (!outputDir) {
    console.error('用法: node p2b_download.js --output <工作目录>');
    process.exit(1);
  }
  
  const configPath = path.join(outputDir, 'config.json');
  const searchResultsPath = path.join(outputDir, 'assets', 'video_search_results.json');
  const sourcesPath = path.join(outputDir, 'assets', 'video_sources.json');
  const videoDir = path.join(outputDir, 'assets', 'video');
  const imageDir = path.join(outputDir, 'assets', 'image');
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ config.json 不存在: ${configPath}`);
    process.exit(1);
  }
  if (!fs.existsSync(searchResultsPath)) {
    console.error(`❌ video_search_results.json 不存在: ${searchResultsPath}`);
    console.error('   请先运行 P2a 搜索阶段');
    process.exit(1);
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  const searchResults = JSON.parse(fs.readFileSync(searchResultsPath, 'utf8'));
  
  // 收集所有场景
  const platforms = config.platforms || config.platform || {};
  const allScenes = [];
  for (const [pName, pData] of Object.entries(platforms)) {
    const scenes = pData.scenes || [];
    scenes.forEach((s, i) => {
      allScenes.push({
        id: s.id || (i + 1),
        assetType: s.assetType || 'video',
        keywords: s.keywords || '',
        text: s.text || '',
      });
    });
  }
  
  console.log(`📊 P2b 下载阶段开始`);
  console.log(`  场景总数: ${allScenes.length}`);
  console.log(`  视频场景: ${allScenes.filter(s => s.assetType === 'video').length}`);
  console.log(`  图片场景: ${allScenes.filter(s => s.assetType === 'image').length}`);
  
  // ── 按场景下载 ────────────────────────────────
  const sources = [];
  let generatedCount = 0;
  const downloadedFiles = []; // 用于MD5去重
  
  for (const scene of allScenes) {
    console.log(`\n[场景 ${scene.id}] assetType=${scene.assetType} 开始处理...`);
    
    let localPath = '';
    let sourceUrl = '';
    let note = '';
    let verified = false;
    let isReal = false;
    
    if (scene.assetType === 'video') {
      // ── 视频下载：3级流程 ──
      const sceneId = String(scene.id).padStart(2, '0');
      const outputTemplate = path.join(videoDir, `scene_${sceneId}.%(ext)s`);
      const finalPath = path.join(videoDir, `scene_${sceneId}.mp4`);
      
      // 从 searchResults 找对应URL
      const searchEntry = searchResults.scenes
        ? searchResults.scenes.find(s => s.sceneId === scene.id)
        : null;
      const urls = searchEntry ? (searchEntry.urls || []) : [];
      
      // Level 1: 直接HTTP下载（素材站）
      const directSites = ['vjshi.com', 'aigei.com', 'xinpianchang.com', 'shipin520.com', 'pexels.com', 'pixabay.com'];
      for (const url of urls) {
        if (directSites.some(s => url.includes(s))) {
          console.log(`  Level1 尝试直接下载: ${url.substring(0, 60)}...`);
          try {
            fs.rmSync(finalPath, { force: true });
            execSync(`powershell -Command "[System.Console]::OutputEncoding=[System.Text.Encoding]::UTF8; $OutputEncoding=[System.Text.Encoding]::UTF8"`, { stdio: 'ignore' });
            await downloadFile(url, finalPath);
            await new Promise(r => setTimeout(r, 1000)); // 等待文件写入
            
            if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 100 * 1024) {
              const dims = ffprobeDimensions(finalPath);
              const dur = getDuration(finalPath);
              if (dims && dims.w > dims.h && dims.w >= 1280 && dur && dur >= 3) {
                console.log(`  ✅ Level1 成功: ${path.basename(finalPath)} (${dims.w}x${dims.h}, ${dur.toFixed(1)}s)`);
                localPath = `assets/video/scene_${sceneId}.mp4`;
                sourceUrl = url;
                note = 'real download (Level1)';
                verified = true;
                isReal = true;
                break;
              } else {
                console.log(`  ⚠️  Level1 文件不合格，删除`);
                fs.rmSync(finalPath, { force: true });
              }
            }
          } catch (e) {
            console.log(`  ⚠️  Level1 失败: ${e.message}`);
            fs.rmSync(finalPath, { force: true });
          }
        }
      }
      
      // Level 2: yt-dlp下载（视频平台）
      if (!isReal) {
        const videoSites = ['bilibili.com', 'douyin.com', 'haokan.baidu.com'];
        for (const url of urls) {
          if (videoSites.some(s => url.includes(s))) {
            console.log(`  Level2 尝试 yt-dlp: ${url.substring(0, 60)}...`);
            try {
              const result = downloadWithYtDlp(url, outputTemplate);
              if (result && fs.existsSync(result)) {
                // 重命名为标准文件名
                if (result !== finalPath) fs.renameSync(result, finalPath);
                
                const dims = ffprobeDimensions(finalPath);
                const dur = getDuration(finalPath);
                if (dims && dims.w > dims.h && fs.statSync(finalPath).size > 100 * 1024 && dur && dur >= 3) {
                  console.log(`  ✅ Level2 成功: ${path.basename(finalPath)} (${dims.w}x${dims.h}, ${dur.toFixed(1)}s)`);
                  localPath = `assets/video/scene_${sceneId}.mp4`;
                  sourceUrl = url;
                  note = 'real download (Level2/yt-dlp)';
                  verified = true;
                  isReal = true;
                  break;
                } else {
                  console.log(`  ⚠️  Level2 文件不合格，删除`);
                  fs.rmSync(finalPath, { force: true });
                }
              }
            } catch (e) {
              console.log(`  ⚠️  Level2 失败: ${e.message}`);
            }
          }
        }
      }
      
      // Level 3: PIL生成（最后兜底，≤20%）【v13.9 强制】
      if (!isReal) {
        if (generatedCount >= MAX_GENERATED) {
          console.log(`  ❌ 已达到PIL生成上限(${MAX_GENERATED}个)，禁止继续生成`);
          console.log(`  ❌ 场景 ${scene.id} 无法下载真实素材，报告失败`);
          // 不写localPath，不标记verified
          sources.push({
            id: scene.id,
            assetType: 'video',
            sourceUrl: '',
            localPath: '',
            filename: `scene_${sceneId}.mp4`,
            note: 'FAILED: 无真实素材+PIL已达上限',
            verified: false,
          });
          continue;
        }
        
        console.log(`  Level3 PIL兜底生成: scene_${sceneId}.mp4`);
        const text = (scene.text || '素材').substring(0, 20);
        const success = generatePilCard(scene.id, text, finalPath);
        if (success && fs.existsSync(finalPath)) {
          console.log(`  ✅ Level3 PIL生成: ${path.basename(finalPath)} (${fs.statSync(finalPath).size} bytes)`);
          localPath = `assets/video/scene_${sceneId}.mp4`;
          sourceUrl = 'PIL';
          note = 'PIL card (placeholder)';
          verified = false; // 【v13.9 强制】生成内容标记 verified=false
          isReal = false;
          generatedCount++;
        } else {
          console.log(`  ❌ PIL生成也失败，场景 ${scene.id} 无法完成`);
          sources.push({
            id: scene.id,
            assetType: 'video',
            sourceUrl: '',
            localPath: '',
            filename: `scene_${sceneId}.mp4`,
            note: 'FAILED: 所有下载方式均失败',
            verified: false,
          });
          continue;
        }
      }
      
    } else {
      // ── 图片下载 ───────────────────────
      const sceneId = String(scene.id).padStart(2, '0');
      const finalPath = path.join(imageDir, `scene_${sceneId}.png`);
      
      const searchEntry = searchResults.scenes
        ? searchResults.scenes.find(s => s.sceneId === scene.id)
        : null;
      const urls = searchEntry ? (searchEntry.urls || []) : [];
      
      // 尝试从页面HTML抓取图片 + 直接下载
      let downloaded = false;
      for (const url of urls) {
        // 跳过已知的视频/音频URL
        if (url.match(/\.(mp4|m4a|webm|mp3)/i)) continue;
        
        // 优先级1: 如果是直接图片URL，直接下载
        if (url.match(/\.(jpg|jpeg|png|webp|gif)/i)) {
          console.log(`  尝试下载图片: ${url.substring(0, 60)}...`);
          try {
            fs.rmSync(finalPath, { force: true });
            await downloadFile(url, finalPath);
            await new Promise(r => setTimeout(r, 2000));
            if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 10 * 1024) {
              const dims = checkImageDims(finalPath);
              if (dims && dims.w > dims.h && dims.w >= 800) {
                console.log(`  ✅ 直接下载成功: ${dims.w}x${dims.h}`);
                localPath = `assets/image/scene_${sceneId}.png`;
                sourceUrl = url;
                note = 'real download';
                verified = true;
                isReal = true;
                downloaded = true;
                break;
              }
            }
          } catch (e) { fs.rmSync(finalPath, { force: true }); }
        }
        
        // 优先级2: 尝试从页面HTML提取主图
        if (!downloaded) {
          console.log(`  尝试抓取页面主图: ${url.substring(0, 60)}...`);
          try {
            const imgUrl = await scrapeMainImage(url);
            if (imgUrl) {
              console.log(`  发现图片: ${imgUrl.substring(0, 60)}...`);
              fs.rmSync(finalPath, { force: true });
              await downloadFile(imgUrl, finalPath);
              await new Promise(r => setTimeout(r, 2000));
              if (fs.existsSync(finalPath) && fs.statSync(finalPath).size > 10 * 1024) {
                const dims = checkImageDims(finalPath);
                if (dims && dims.w > dims.h && dims.w >= 800) {
                  console.log(`  ✅ HTML抓取成功: ${dims.w}x${dims.h}`);
                  localPath = `assets/image/scene_${sceneId}.png`;
                  sourceUrl = url;
                  note = 'real download (scraped)';
                  verified = true;
                  isReal = true;
                  downloaded = true;
                  break;
                }
              }
              fs.rmSync(finalPath, { force: true });
            }
          } catch (e) { console.log(`  ⚠️  页面抓取失败: ${e.message.substring(0,60)}`); }
        }
      }
      
      // PIL兜底（≤20%）【v13.9 强制】
      if (!downloaded) {
        if (generatedCount >= MAX_GENERATED) {
          console.log(`  ❌ 已达到PIL生成上限(${MAX_GENERATED}个)，禁止继续生成`);
          sources.push({
            id: scene.id,
            assetType: 'image',
            sourceUrl: '',
            localPath: '',
            filename: `scene_${sceneId}.png`,
            note: 'FAILED: 无真实图片+PIL已达上限',
            verified: false,
          });
          continue;
        }
        
        console.log(`  PIL兜底生成图片: scene_${sceneId}.png`);
        const text = (scene.text || '素材').substring(0, 20);
        const success = generatePilCard(scene.id, text, finalPath);
        if (success && fs.existsSync(finalPath)) {
          localPath = `assets/image/scene_${sceneId}.png`;
          sourceUrl = 'PIL';
          note = 'PIL card (placeholder)';
          verified = false; // 【v13.9 强制】
          generatedCount++;
        } else {
          console.log(`  ❌ 图片场景 ${scene.id} 无法完成`);
          sources.push({
            id: scene.id,
            assetType: 'image',
            sourceUrl: '',
            localPath: '',
            filename: `scene_${sceneId}.png`,
            note: 'FAILED: 所有图片下载均失败',
            verified: false,
          });
          continue;
        }
      }
    }
    
    // 记录结果
    sources.push({
      id: scene.id,
      assetType: scene.assetType,
      sourceUrl: sourceUrl,
      localPath: localPath,
      filename: path.basename(localPath),
      note: note,
      verified: verified,
    });
    
    if (localPath && fs.existsSync(path.join(outputDir, localPath))) {
      downloadedFiles.push(path.join(outputDir, localPath));
    }
  }
  
  // ── 写入 video_sources.json ───────────────────────
  const failedScenes = sources.filter(s => !s.verified || !s.localPath);
  if (failedScenes.length > 0) {
    console.log(`\n❌ P2b 下载失败: ${failedScenes.length} 个场景未通过验证`);
    failedScenes.forEach(s => {
      console.log(`  - 场景 ${s.id}: ${s.note}`);
    });
    console.log(`\n⚠️  禁止写 phase_done_P2.txt，请修复后重跑`);
    
    // 仍然写入 video_sources.json（包含所有场景，失败场景 verified=false）
    fs.writeFileSync(sourcesPath, JSON.stringify({ scenes: sources }, null, 2), 'utf8');
    console.log(`⚠️  已写入 ${sourcesPath}（含失败场景，verified=false）`);
    process.exit(1);
  }
  
  // 成功：写入 video_sources.json
  fs.writeFileSync(sourcesPath, JSON.stringify({ scenes: sources }, null, 2), 'utf8');
  console.log(`\n✅ video_sources.json 已写入: ${sourcesPath}`);
  console.log(`  真实素材: ${sources.filter(s => s.verified).length}/${sources.length}`);
  console.log(`  生成素材(PIL): ${sources.filter(s => !s.verified && s.localPath).length}/${sources.length}`);
  
  // ── 运行 validate_p2b.py 自动化验收 ──
  console.log(`\n🔍 运行 validate_p2b.py 验收...`);
  try {
    const { status } = spawnSync(
      'python',
      [`${process.env.SKILL_DIR || 'C:/Users/qianq/.qclaw/skills/daily-video-factory'}/scripts/validate_p2b.py`, outputDir],
      { encoding: 'utf8', timeout: 60000, stdio: 'inherit', shell: true }
    );
    
    if (status === 0) {
      console.log(`\n✅ P2b 全部完成，可以写 phase_done_P2.txt`);
      process.exit(0);
    } else {
      console.log(`\n❌ validate_p2b.py 验收失败 (exit ${status})，禁止写 phase_done_P2.txt`);
      process.exit(1);
    }
  } catch (e) {
    console.log(`\n❌ validate_p2b.py 运行失败: ${e.message}`);
    process.exit(1);
  }
}

main();
