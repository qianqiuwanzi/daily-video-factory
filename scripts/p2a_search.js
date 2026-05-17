#!/usr/bin/env node
/**
 * P2a 搜索阶段脚本 (v13.9 主会话exec版)
 *
 * 用法: node p2a_search.js --output "D:/workspace/MediaContentCreation/YYYY-MM-DD"
 *
 * 核心规则:
 * 1. 视频场景只搜视频站点(素材站+视频平台)
 * 2. 图片场景可搜任意站点(新闻/官网/社交)
 * 3. 禁止搜索新闻文章站作为视频素材源
 * 4. 每个场景至少2个候选URL
 * 5. 搜索失败=记录=不编造URL
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const TAVILY = 'D:/workspace/scripts/tavily_search.cjs';
const PROSEARCH = 'D:/Program Files/QClaw/resources/openclaw/config/skills/online-search/scripts/prosearch.cjs';

// ── 站点分类 ──────────────────────────────────────────────

const VIDEO_SITES = [
  // 素材站(有直链可下载)
  'vjshi.com', 'aigei.com', 'xinpianchang.com', 'shipin520.com',
  // 视频平台(yt-dlp可下载)
  'bilibili.com', 'douyin.com', 'haokan.baidu.com',
  // 海外免费
  'pexels.com', 'pixabay.com', 'coverr.co',
];

const VIDEO_PLATFORMS = [
  'bilibili.com', 'douyin.com', 'haokan.baidu.com',
  'youtube.com', 'vimeo.com',
];

// 禁止作为视频素材源(新闻/文章站)
const BLOCKED_VIDEO_SITES = [
  'sohu.com', '163.com', 'sina.com.cn', 'zhihu.com',
  'qq.com', 'toutiao.com', 'thepaper.cn', 'baijiahao.baidu.com',
];

function isVideoSite(url) {
  return VIDEO_SITES.some(s => url.includes(s));
}

function isVideoPlatform(url) {
  return VIDEO_PLATFORMS.some(s => url.includes(s));
}

function isBlockedForVideo(url) {
  return BLOCKED_VIDEO_SITES.some(s => url.includes(s));
}

function isImageUrl(url) {
  return /\.(jpg|jpeg|png|webp|bmp)/i.test(url);
}

// ── 搜索函数 ──────────────────────────────────────────────

function tavilySearch(query) {
  try {
    const result = execSync(
      `node "${TAVILY}" --query "${query}" --max_results 5`,
      { encoding: 'utf8', timeout: 30000, shell: true }
    );
    // Tavily 输出是 JSON 数组 [{url, title, content}]
    const lines = result.trim().split('\n');
    const results = [];
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item && item.url) results.push(item);
      } catch (e) {
        // 可能有非JSON行,跳过
      }
    }
    return results;
  } catch (e) {
    console.log(`  Tavily failed: ${e.message.substring(0, 80)}`);
    return [];
  }
}

function prosearchBackup(query) {
  try {
    const result = execSync(
      `node "${PROSEARCH}" --keyword="${query}" --cnt=5`,
      { encoding: 'utf8', timeout: 30000, shell: true }
    );
    // ProSearch 输出可能是 JSON 或文本
    const results = [];
    const lines = result.trim().split('\n');
    for (const line of lines) {
      try {
        const item = JSON.parse(line);
        if (item && item.url) results.push(item);
      } catch (e) {
        // 尝试从文本中提取URL
        const urlMatch = line.match(/https?:\/\/[^\s"<>]+/);
        if (urlMatch) results.push({ url: urlMatch[0], title: '', content: '' });
      }
    }
    return results;
  } catch (e) {
    console.log(`  ProSearch failed: ${e.message.substring(0, 80)}`);
    return [];
  }
}

// ── 主逻辑 ─────────────────────────────────────────────────

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
    console.error(`config.json not found: ${configPath}`);
    process.exit(1);
  }

  // 确保目录存在
  if (!fs.existsSync(assetsDir)) fs.mkdirSync(assetsDir, { recursive: true });

  const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

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

  console.log(`=== P2a Search Stage ===`);
  console.log(`Output: ${outputDir}`);
  console.log(`Scenes: ${allScenes.length} total, ${allScenes.filter(s => s.assetType === 'video').length} video, ${allScenes.filter(s => s.assetType === 'image').length} image`);

  const searchResults = [];
  let failedScenes = [];

  for (const scene of allScenes) {
    const sceneId = scene.id;
    console.log(`\n[Scene ${sceneId}] ${scene.assetType} | keywords: "${scene.keywords}"`);

    let urls = [];
    let source = '';

    // ── 视频场景搜索 ──
    if (scene.assetType === 'video') {
      // Round 1: Tavily 搜视频站点
      const kw = scene.keywords || scene.text.substring(0, 30);
      let query = `${kw} 视频 演示`;

      // 优先搜视频站点
      const siteQuery = `${kw} site:bilibili.com OR site:pexels.com OR site:vjshi.com`;
      console.log(`  Tavily search: "${siteQuery.substring(0, 60)}..."`);
      let results = tavilySearch(siteQuery);

      // 过滤: 只保留视频站点URL
      const videoUrls = results
        .filter(r => isVideoSite(r.url) && !isBlockedForVideo(r.url))
        .map(r => r.url);

      if (videoUrls.length >= 2) {
        urls = videoUrls;
        source = 'tavily-video';
      } else {
        // Round 2: Tavily 宽泛搜索
        console.log(`  Tavily search (broad): "${query}"`);
        results = tavilySearch(query);
        const broadUrls = results
          .filter(r => isVideoSite(r.url) && !isBlockedForVideo(r.url))
          .map(r => r.url);
        urls = [...new Set([...videoUrls, ...broadUrls])];
        source = urls.length > 0 ? 'tavily-broad' : '';
      }

      // Round 3: ProSearch 兜底
      if (urls.length < 2) {
        console.log(`  ProSearch backup: "${kw}"`);
        const backupResults = prosearchBackup(`${kw} 视频`);
        const backupUrls = backupResults
          .filter(r => isVideoSite(r.url) && !isBlockedForVideo(r.url))
          .map(r => r.url);
        urls = [...new Set([...urls, ...backupUrls])];
        source = urls.length > 0 ? (source + '+prosearch') : 'prosearch';
      }

      // 去重
      urls = [...new Set(urls)];

      if (urls.length === 0) {
        console.log(`  WARN: No video URLs found for scene ${sceneId}`);
        failedScenes.push({ id: sceneId, reason: 'no-video-urls' });
      } else {
        console.log(`  OK: ${urls.length} video URL(s) found`);
        urls.forEach((u, i) => console.log(`    [${i + 1}] ${u.substring(0, 80)}`));
      }

    } else {
      // ── 图片场景搜索 ──
      const kw = scene.keywords || scene.text.substring(0, 30);
      let query = `${kw} 新闻 报道 截图`;

      console.log(`  Tavily search: "${query}"`);
      let results = tavilySearch(query);

      // 图片: 接受任意站点URL
      urls = results.map(r => r.url).filter(u => u.length > 10);
      source = 'tavily-image';

      // 优先找直接图片URL
      const directImages = urls.filter(u => isImageUrl(u));
      if (directImages.length > 0) {
        urls = directImages;
        source = 'tavily-image-direct';
      }

      // 兜底
      if (urls.length < 2) {
        console.log(`  ProSearch backup: "${kw} 截图"`);
        const backupResults = prosearchBackup(`${kw} 截图`);
        const backupUrls = backupResults.map(r => r.url).filter(u => u.length > 10);
        urls = [...new Set([...urls, ...backupUrls])];
        source = 'tavily+prosearch';
      }

      urls = [...new Set(urls)];

      if (urls.length === 0) {
        console.log(`  WARN: No image URLs found for scene ${sceneId}`);
        failedScenes.push({ id: sceneId, reason: 'no-image-urls' });
      } else {
        console.log(`  OK: ${urls.length} image URL(s) found`);
        urls.forEach((u, i) => console.log(`    [${i + 1}] ${u.substring(0, 80)}`));
      }
    }

    searchResults.push({
      sceneId: sceneId,
      assetType: scene.assetType,
      urls: urls,
      source: source,
      keywords: scene.keywords || '',
    });
  }

  // ── 写入搜索结果 ──────────────────────────
  const output = { scenes: searchResults, failedScenes: failedScenes, searchedAt: new Date().toISOString() };
  fs.writeFileSync(resultPath, JSON.stringify(output, null, 2), 'utf8');
  console.log(`\n=== Search Results ===`);
  console.log(`Written: ${resultPath}`);
  console.log(`Total scenes: ${searchResults.length}`);
  console.log(`Scenes with URLs: ${searchResults.filter(s => s.urls.length > 0).length}`);
  console.log(`Scenes failed: ${failedScenes.length}`);

  if (failedScenes.length > 0) {
    console.log(`\nWARN: ${failedScenes.length} scene(s) without valid URLs:`);
    failedScenes.forEach(f => console.log(`  - Scene ${f.id}: ${f.reason}`));
    console.log(`P2b will need to handle these scenes (may use PIL fallback)`);
    // 不阻止 — P2b可以PIL兜底(≤2个)
  }

  // ── 写 phase_done_P2a.txt ──
  const doneFile = path.join(outputDir, 'phase_done_P2a.txt');
  fs.writeFileSync(doneFile, `P2a completed at ${new Date().toISOString()}\n`, 'utf8');
  console.log(`\nDone: ${doneFile}`);
  console.log(`P2a search stage complete. Proceed to P2b download.`);
  process.exit(0);
}

main();
