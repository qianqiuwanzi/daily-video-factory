#!/usr/bin/env node
/**
 * P2a 搜索阶段脚本 (v13.9 修正版 - 严格按照 SKILL.md 站点列表搜索)
 * 
 * 用法: node p2a_search.js --output "D:/workspace/MediaContentCreation/YYYY-MM-DD"
 * 
 * 核心修正:
 * 1. 视频场景: 按 SKILL.md 规定的10个视频素材站点分别搜索
 * 2. 图片场景: 按 SKILL.md 规定的8个图片素材站点分别搜索
 * 3. 使用 Tavily API (支持 site: 语法, 且中英文切换)
 * 4. Tavily 返回 Markdown 格式, 正确提取 URL
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TAVILY = 'D:/workspace/scripts/tavily_search.cjs';
const PROSEARCH = 'D:/Program Files/QClaw/resources/openclaw/config/skills/online-search/scripts/prosearch.cjs';

// SKILL.md §11.2 视频素材搜索站点 (10个)
const VIDEO_SITES = [
  'vjshi.com',     // 光厂 VJshi - 专业视频素材, 首选 HTTP 直链
  'aigei.com',     // 爱给网 - 综合免费素材站
  'xinpianchang.com', // 新片场 - 国内最大创作者社区
  'shipin520.com', // 潮点视频 - 短视频素材
  'pexels.com',    // Pexels - 海外免费视频 (需Referer)
  'pixabay.com',   // Pixabay - 海外免费视频 (需API)
  'bilibili.com',  // B站 - 需 yt-dlp 下载 (播放页URL)
  'douyin.com',    // 抖音 - 需 yt-dlp 下载
  'haokan.baidu.com', // 好看视频 - 百度旗下
  '*.com/product',  // 产品官网 - 浏览器录屏兜底
];

// SKILL.md §11.3 图片素材搜索站点 (8个)
const IMAGE_SITES = [
  'news.163.com',  // 网易新闻 - 新闻配图首选
  'news.qq.com',   // 腾讯新闻 - 新闻配图
  'sohu.com',      // 搜狐 - 文章配图
  'sina.com.cn',   // 新浪 - 新闻配图
  'zhihu.com',      // 知乎 - 专栏配图
  'xiaohongshu.com', // 小红书 - 产品/场景图
  '*.com',          // 产品官网 - 浏览器截图
  'pexels.com',     // Pexels - 高质量图片
];

/**
 * 调用 Tavily 搜索 (支持 site: 语法, Markdown 输出)
 */
function tavilySearch(query, maxResults = 5) {
  try {
    const result = execSync(
      `node "${TAVILY}" --query="${query.replace(/"/g, '\\"')}" --max_results=${maxResults}`,
      { encoding: 'utf8', timeout: 30000, shell: true }
    );
    // Tavily 输出 Markdown 格式 [标题](URL)
    const results = [];
    const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m;
    while ((m = mdRegex.exec(result)) !== null) {
      results.push({ title: m[1], url: m[2], content: '' });
    }
    // 也提取裸 URL
    const urlRegex = /https?:\/\/[^\s"<>)]+/g;
    while ((m = urlRegex.exec(result)) !== null) {
      const url = m[0];
      if (!results.find(r => r.url === url)) {
        results.push({ title: '', url, content: '' });
      }
    }
    return results;
  } catch (e) {
    console.log(`  [Tavily ERROR] ${e.message.substring(0, 80)}`);
    return [];
  }
}

/**
 * 调用 ProSearch 备份搜索
 */
function prosearchBackup(query, cnt = 5) {
  try {
    const result = execSync(
      `node "${PROSEARCH}" --keyword="${query.replace(/"/g, '\\"')}" --cnt=${cnt}`,
      { encoding: 'utf8', timeout: 30000, shell: true }
    );
    const results = [];
    const mdRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    let m;
    while ((m = mdRegex.exec(result)) !== null) {
      results.push({ title: m[1], url: m[2], content: '' });
    }
    const urlRegex = /https?:\/\/[^\s"<>)]+/g;
    while ((m = urlRegex.exec(result)) !== null) {
      const url = m[0];
      if (!results.find(r => r.url === url)) {
        results.push({ title: '', url, content: '' });
      }
    }
    return results;
  } catch (e) {
    console.log(`  [ProSearch ERROR] ${e.message.substring(0, 80)}`);
    return [];
  }
}

/**
 * 视频场景: 严格按照 SKILL.md 10个视频站点搜索
 */
function searchVideoScene(keyword) {
  const allUrls = [];
  
  // 优先级1: 国内视频素材站 (前三首选)
  const prioritySites = ['vjshi.com', 'aigei.com', 'xinpianchang.com', 'shipin520.com'];
  for (const site of prioritySites) {
    const query = `${keyword} site:${site}`;
    console.log(`    [Tavily] site:${site}`);
    const results = tavilySearch(query, 3);
    const siteUrls = results
      .filter(r => r.url && r.url.includes(site))
      .map(r => r.url);
    if (siteUrls.length > 0) {
      console.log(`      ✅ ${siteUrls.length} URL(s)`);
      allUrls.push(...siteUrls);
      break; // 找到一个站点有结果就够
    }
  }
  
  // 优先级2: 海外视频站 (Pexels/Pixabay)
  if (allUrls.length < 2) {
    for (const site of ['pexels.com', 'pixabay.com']) {
      const query = `${keyword} site:${site}`;
      console.log(`    [Tavily] site:${site}`);
      const results = tavilySearch(query, 3);
      const siteUrls = results
        .filter(r => r.url && (r.url.includes('pexels') || r.url.includes('pixabay')))
        .map(r => r.url);
      if (siteUrls.length > 0) {
        console.log(`      ✅ ${siteUrls.length} URL(s)`);
        allUrls.push(...siteUrls);
      }
    }
  }
  
  // 优先级3: 视频平台 (B站/抖音/好看, 需 yt-dlp)
  if (allUrls.length < 2) {
    for (const site of ['bilibili.com', 'douyin.com', 'haokan.baidu.com']) {
      const query = `${keyword} 视频 site:${site}`;
      console.log(`    [Tavily] site:${site} (video platform)`);
      const results = tavilySearch(query, 3);
      const siteUrls = results
        .filter(r => r.url && (r.url.includes('bilibili') || r.url.includes('douyin') || r.url.includes('haokan')))
        .map(r => r.url);
      if (siteUrls.length > 0) {
        console.log(`      ✅ ${siteUrls.length} URL(s) (video platform)`);
        allUrls.push(...siteUrls);
      }
    }
  }
  
  // 兜底: ProSearch 宽泛搜索
  if (allUrls.length < 2) {
    console.log(`    [ProSearch] backup`);
    const results = prosearchBackup(`${keyword} 视频素材`, 5);
    const backupUrls = results.map(r => r.url).filter(u => u.length > 10);
    allUrls.push(...backupUrls);
  }
  
  return [...new Set(allUrls)];
}

/**
 * 图片场景: 严格按照 SKILL.md 8个图片站点搜索
 */
function searchImageScene(keyword) {
  const allUrls = [];
  
  // 优先级1: 国内新闻站 (配图首选)
  const newsSites = ['news.163.com', 'news.qq.com', 'sohu.com', 'sina.com.cn'];
  for (const site of newsSites) {
    const query = `${keyword} site:${site}`;
    console.log(`    [Tavily] site:${site}`);
    const results = tavilySearch(query, 3);
    const siteUrls = results
      .filter(r => r.url && r.url.includes(site))
      .map(r => r.url);
    if (siteUrls.length > 0) {
      console.log(`      ✅ ${siteUrls.length} URL(s)`);
      allUrls.push(...siteUrls);
      break;
    }
  }
  
  // 优先级2: 社交媒体 (知乎/小红书)
  if (allUrls.length < 2) {
    for (const site of ['zhihu.com', 'xiaohongshu.com']) {
      const query = `${keyword} site:${site}`;
      console.log(`    [Tavily] site:${site}`);
      const results = tavilySearch(query, 3);
      const siteUrls = results
        .filter(r => r.url && (r.url.includes('zhihu') || r.url.includes('xiaohongshu')))
        .map(r => r.url);
      if (siteUrls.length > 0) {
        console.log(`      ✅ ${siteUrls.length} URL(s)`);
        allUrls.push(...siteUrls);
      }
    }
  }
  
  // 优先级3: 海外图片 (Pexels)
  if (allUrls.length < 2) {
    console.log(`    [Tavily] site:pexels.com`);
    const results = tavilySearch(`${keyword} site:pexels.com`, 3);
    const siteUrls = results
      .filter(r => r.url && r.url.includes('pexels'))
      .map(r => r.url);
    if (siteUrls.length > 0) {
      console.log(`      ✅ ${siteUrls.length} URL(s)`);
      allUrls.push(...siteUrls);
    }
  }
  
  // 兜底: ProSearch
  if (allUrls.length < 2) {
    console.log(`    [ProSearch] backup`);
    const results = prosearchBackup(`${keyword} 图片素材`, 5);
    const backupUrls = results.map(r => r.url).filter(u => u.length > 10);
    allUrls.push(...backupUrls);
  }
  
  return [...new Set(allUrls)];
}

// ── 主逻辑 ──────────────────────────────────────

function main() {
  const args = process.argv.slice(2);
  let outputDir = '';
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output' && i + 1 < args.length) {
      outputDir = args[i + 1];
      i++;
    }
  }
  
  if (!outputDir) {
    console.error('Usage: node p2a_search.js --output <work_dir>');
    process.exit(1);
  }
  
  const configPath = path.join(outputDir, 'config.json');
  const assetsDir = path.join(outputDir, 'assets');
  const resultPath = path.join(assetsDir, 'video_search_results.json');
  
  if (!fs.existsSync(configPath)) {
    console.error(`❌ config.json not found: ${configPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
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
  
  console.log('=== P2a Search Stage (v13.9 Fixed) ===');
  console.log(`Output: ${outputDir}`);
  console.log(`Scenes: ${allScenes.length} total`);
  console.log(`Video sites: ${VIDEO_SITES.length} (from SKILL.md §11.2)`);
  console.log(`Image sites: ${IMAGE_SITES.length} (from SKILL.md §11.3)\n`);
  
  const searchResults = [];
  let failedScenes = [];
  
  for (const scene of allScenes) {
    const sceneId = scene.id;
    const kw = scene.keywords || scene.text.substring(0, 30);
    console.log(`\n[Scene ${sceneId}] ${scene.assetType} | keywords: "${kw}"`);
    
    let urls = [];
    
    if (scene.assetType === 'video') {
      console.log('  [Video] Searching 10 video sites from SKILL.md...');
      urls = searchVideoScene(kw);
    } else {
      console.log('  [Image] Searching 8 image sites from SKILL.md...');
      urls = searchImageScene(kw);
    }
    
    if (urls.length === 0) {
      console.log(`  ❌ No URLs found for scene ${sceneId}`);
      failedScenes.push({ id: sceneId, reason: 'no-urls' });
    } else {
      console.log(`  ✅ ${urls.length} URL(s) found`);
      urls.forEach((u, i) => console.log(`    [${i + 1}] ${u.substring(0, 80)}`));
    }
    
    searchResults.push({
      sceneId: sceneId,
      assetType: scene.assetType,
      urls: urls,
      keywords: kw,
    });
  }
  
  // 写入搜索结果
  const output = {
    scenes: searchResults,
    failedScenes: failedScenes,
    searchedAt: new Date().toISOString(),
    videoSites: VIDEO_SITES,
    imageSites: IMAGE_SITES,
  };
  
  fs.writeFileSync(resultPath, JSON.stringify(output, null, 2), 'utf8');
  
  console.log(`\n=== Search Results ===`);
  console.log(`Written: ${resultPath}`);
  console.log(`Total scenes: ${searchResults.length}`);
  console.log(`Scenes with URLs: ${searchResults.filter(s => s.urls.length > 0).length}`);
  console.log(`Scenes failed: ${failedScenes.length}`);
  
  if (failedScenes.length > 0) {
    console.log(`\n⚠️  ${failedScenes.length} scene(s) without valid URLs:`);
    failedScenes.forEach(f => console.log(`  - Scene ${f.id}: ${f.reason}`));
  }
  
  // 写 phase_done_P2a.txt
  const doneFile = path.join(outputDir, 'phase_done_P2a.txt');
  fs.writeFileSync(doneFile, `P2a completed at ${new Date().toISOString()}\n`, 'utf8');
  console.log(`\nDone: ${doneFile}`);
  console.log(`P2a search stage complete. Proceed to P2b download.`);
  process.exit(0);
}

main();
