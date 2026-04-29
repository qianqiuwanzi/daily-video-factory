/**
 * CDP 截图脚本 — 通过 Chrome DevTools Protocol 截取页面快照
 * 
 * 用法: 
 *   node screenshot.js <tabId> [--output screenshot.png] [--quality 80] [--full]
 *   node screenshot.js --list                          # 列出所有 tab
 * 
 * 前置条件: Chrome 已启动并开启 CDP --remote-debugging-port=28800
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 28800;

// ============ 获取 Tab 列表 ============
function listTabs() {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${CDP_PORT}/json/list`, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const tabs = JSON.parse(data);
          resolve(tabs.filter(t => t.type === 'page').map(t => ({
            id: t.id,
            title: t.title || '(untitled)',
            url: t.url || ''
          })));
        } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

// ============ 截图 ============
function takeScreenshot(tabId, { quality = 80, fullPage = false } = {}) {
  return new Promise((resolve, reject) => {
    const WebSocket = require('ws');
    const ws = new WebSocket(`ws://localhost:${CDP_PORT}/devtools/page/${tabId}`);
    let mid = 0;

    ws.on('open', () => {
      // 先激活页面
      ws.send(JSON.stringify({ id: ++mid, method: 'Page.enable', params: {} }));
    });

    ws.on('message', (data) => {
      const r = JSON.parse(data);
      
      // Page.enable 响应后，触发截图
      if (r.id === 1) {
        ws.send(JSON.stringify({
          id: ++mid,
          method: 'Page.captureScreenshot',
          params: {
            format: 'png',
            quality: quality,
            captureBeyondViewport: fullPage
          }
        }));
      }

      // 截图结果
      if (r.id === 2 && r.result?.data) {
        const buffer = Buffer.from(r.result.data, 'base64');
        ws.close();
        resolve(buffer);
      }

      if (r.error) {
        reject(new Error(r.error.message));
        ws.close();
      }
    });

    ws.on('error', reject);
    setTimeout(() => { ws.close(); reject(new Error('截图超时 (10s)')); }, 10000);
  });
}

// ============ CLI ============
async function main() {
  const args = process.argv.slice(2);

  // --list: 列出所有 tab
  if (args.includes('--list')) {
    try {
      const tabs = await listTabs();
      console.log('\n📋 Chrome Tab 列表:\n');
      tabs.forEach((t, i) => {
        console.log(`  [${i}] ${t.id}`);
        console.log(`      ${t.title}`);
        console.log(`      ${t.url}\n`);
      });
    } catch (e) {
      console.error('❌ 无法连接 Chrome CDP:', e.message);
      console.error('   请确保 Chrome 已启动: chrome --remote-debugging-port=28800');
    }
    return;
  }

  // 解析参数
  let tabId = null, output = 'screenshot.png', quality = 80, fullPage = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output') output = args[++i];
    else if (args[i] === '--quality') quality = parseInt(args[++i]);
    else if (args[i] === '--full') fullPage = true;
    else if (!tabId) tabId = args[i];
  }

  if (!tabId) {
    console.log('用法: node screenshot.js <tabId> [--output screenshot.png] [--quality 80] [--full]');
    console.log('     node screenshot.js --list');
    process.exit(1);
  }

  try {
    const buffer = await takeScreenshot(tabId, { quality, fullPage });
    const dir = path.dirname(output);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(output, buffer);
    console.log(`✅ 截图: ${output} (${Math.round(buffer.length / 1024)}KB)`);
  } catch (e) {
    console.error('❌ 截图失败:', e.message);
    process.exit(1);
  }
}

main();
