/**
 * 腾讯微云文件上传脚本 (CDP)
 * 用法: node upload_to_weiyun.js <tabId> <file1> [file2] ...
 */
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const CDP_PORT = 28800;

async function uploadFiles(tabId, files) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${CDP_PORT}/devtools/page/${tabId}`);
    let mid = 0, rootNodeId = null, fileInputNodeId = null;

    ws.on('open', () => {
      ws.send(JSON.stringify({ id: ++mid, method: 'DOM.getDocument', params: {} }));
    });

    ws.on('message', (data) => {
      const r = JSON.parse(data);
      if (r.id === 1 && r.result?.root) {
        rootNodeId = r.result.root.nodeId;
        ws.send(JSON.stringify({ id: ++mid, method: 'DOM.querySelector', params: { nodeId: rootNodeId, selector: 'input[type="file"]' } }));
      }
      if (r.id === 2 && r.result?.nodeId) {
        fileInputNodeId = r.result.nodeId;
        const normalizedFiles = files.map(f => path.resolve(f).replace(/\\/g, '\\\\'));
        ws.send(JSON.stringify({ id: ++mid, method: 'DOM.setFileInputFiles', params: { nodeId: fileInputNodeId, files: normalizedFiles } }));
      }
      if (r.id === 3) {
        r.result !== undefined ? resolve({ success: true, files }) : reject(new Error(r.error?.message || 'Unknown'));
        ws.close();
      }
      if (r.error && r.id <= 2) { reject(new Error(r.error.message)); ws.close(); }
    });
    ws.on('error', reject);
  });
}

async function clickUpload(tabId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${CDP_PORT}/devtools/page/${tabId}`);
    let mid = 0;
    ws.on('open', () => {
      ws.send(JSON.stringify({ id: ++mid, method: 'Runtime.evaluate', params: { expression: `(function(){const s=document.querySelectorAll('span');for(let e of s){if(e.textContent.trim()==='上传'){e.click();return 1}}return 0})()`, returnByValue: true } }));
    });
    ws.on('message', (data) => {
      const r = JSON.parse(data);
      if (r.id === 1 && r.result?.result?.value === 1) {
        setTimeout(() => {
          ws.send(JSON.stringify({ id: ++mid, method: 'Runtime.evaluate', params: { expression: `(function(){const l=document.querySelectorAll('li');for(let e of l){if(e.textContent.trim()==='文件'){e.click();return 1}}return 0})()`, returnByValue: true } }));
        }, 500);
      }
      if (r.id === 2) { resolve(r.result?.result?.value === 1); ws.close(); }
    });
    ws.on('error', reject);
  });
}

(async () => {
  const args = process.argv.slice(2);
  if (args.length < 2) { console.log('用法: node upload_to_weiyun.js <tabId> <file1> [file2]...'); process.exit(1); }
  const [tabId, ...files] = args;
  for (const f of files) if (!fs.existsSync(f)) { console.error(`文件不存在: ${f}`); process.exit(1); }
  try {
    await clickUpload(tabId);
    await uploadFiles(tabId, files);
    console.log('✅ 上传已触发');
  } catch (e) { console.error('❌', e.message); process.exit(1); }
})();
