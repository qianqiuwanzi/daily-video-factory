/**
 * 素材图生成器 — Canvas 高仿真绘制
 * 
 * 用法: node gen_assets.js --input config.json --output ./assets/
 * 
 * config.json 中的 scenes 需包含 type 字段:
 *   type: "stars" | "code" | "app" | "terminal" | "community" | "generic"
 * 
 * 每张输出 1440×1920 PNG，供 Ken Burns 动画使用。
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1440, H = 1920;
const FONT = '"Microsoft YaHei", sans-serif';
const FONT_PATH = 'C:/Windows/Fonts/msyh.ttc';

// ============ 工具函数 ============
function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function darkBg(ctx) {
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0e1a'); bg.addColorStop(0.5, '#0d1a33');
  bg.addColorStop(1, '#060a14');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

  // 星点
  for (let i = 0; i < 80; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 1.5 + 0.3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(100,160,255,${Math.random() * 0.3 + 0.05})`;
    ctx.fill();
  }
}

function orb(ctx, cx, cy, r, color, alpha) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${color},${alpha})`);
  g.addColorStop(1, `rgba(${color},0)`);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
}

// ============ 场景绘制器 ============

/**
 * stars — GitHub Star 页面仿真
 * config: { number: "25.9万", label: "Stars", repo: "open-claw/openclaw" }
 */
function drawStars(ctx, cfg) {
  darkBg(ctx);
  orb(ctx, W / 2, H * 0.3, 400, '0,200,255', 0.08);

  // 大数字
  ctx.save(); ctx.textAlign = 'center';
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 60;
  ctx.font = `bold 180px ${FONT}`; ctx.fillStyle = '#00e5ff';
  ctx.fillText(cfg.number || '25.9万', W / 2, H * 0.35);
  ctx.shadowBlur = 0;

  // label
  ctx.font = `bold 56px ${FONT}`; ctx.fillStyle = 'rgba(0,230,255,0.7)';
  ctx.fillText(cfg.label || 'GitHub Stars', W / 2, H * 0.35 + 80);

  // repo 路径
  ctx.font = `36px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(cfg.repo || 'open-claw/openclaw', W / 2, H * 0.35 + 140);

  // 模拟 Star 按钮
  const btnX = W / 2 - 160, btnY = H * 0.55, btnW = 320, btnH = 70;
  ctx.fillStyle = 'rgba(0,200,100,0.12)'; rr(ctx, btnX, btnY, btnW, btnH, 12); ctx.fill();
  ctx.strokeStyle = 'rgba(0,200,100,0.35)'; ctx.lineWidth = 1.5;
  rr(ctx, btnX, btnY, btnW, btnH, 12); ctx.stroke();
  ctx.font = `bold 32px ${FONT}`; ctx.fillStyle = '#4ade80';
  ctx.fillText('⭐ Star', W / 2, btnY + 47);

  // 模拟增长曲线
  ctx.beginPath();
  const graphX = 160, graphY = H * 0.68, graphW = W - 320, graphH = 300;
  ctx.strokeStyle = 'rgba(0,200,255,0.15)'; ctx.lineWidth = 1;
  for (let i = 0; i <= 5; i++) {
    const y = graphY + (graphH / 5) * i;
    ctx.moveTo(graphX, y); ctx.lineTo(graphX + graphW, y); ctx.stroke();
  }
  // 曲线
  ctx.beginPath();
  ctx.moveTo(graphX, graphY + graphH);
  const pts = 20;
  for (let i = 1; i <= pts; i++) {
    const t = i / pts;
    const x = graphX + graphW * t;
    const y = graphY + graphH - graphH * Math.pow(t, 1.8) * (0.8 + Math.random() * 0.2);
    ctx.lineTo(x, y);
  }
  ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.stroke();

  // 曲线下方填充
  ctx.lineTo(graphX + graphW, graphY + graphH);
  ctx.lineTo(graphX, graphY + graphH);
  ctx.closePath();
  const fill = ctx.createLinearGradient(0, graphY, 0, graphY + graphH);
  fill.addColorStop(0, 'rgba(0,200,255,0.15)'); fill.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.fillStyle = fill; ctx.fill();

  ctx.restore();
}

/**
 * code — 代码编辑器界面仿真
 * config: { lines: ["npm install openclaw", "npx openclaw init", "..."], title: "terminal" }
 */
function drawCode(ctx, cfg) {
  darkBg(ctx);

  // 编辑器窗口
  const winX = 120, winY = 240, winW = W - 240, winH = H - 480;
  ctx.fillStyle = '#1a1b26'; rr(ctx, winX, winY, winW, winH, 16); ctx.fill();
  ctx.strokeStyle = 'rgba(100,100,255,0.15)'; ctx.lineWidth = 1;
  rr(ctx, winX, winY, winW, winH, 16); ctx.stroke();

  // 标题栏
  ctx.fillStyle = '#14151f'; rr(ctx, winX, winY, winW, 56, 16); ctx.fill();
  // 窗口按钮
  [['#ff5f57', winX + 24], ['#febc2e', winX + 56], ['#28c840', winX + 88]].forEach(([c, x]) => {
    ctx.beginPath(); ctx.arc(x, winY + 28, 10, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill();
  });
  // 标题
  ctx.font = `22px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.fillText(cfg.title || 'main.js — openclaw', winX + winW / 2, winY + 36);

  // 代码行
  const lines = cfg.lines || [
    'import { OpenClaw } from "openclaw";',
    '',
    'const claw = new OpenClaw({',
    '  model: "gpt-4o",',
    '  memory: true,',
    '  voice: "YunjianNeural"',
    '});',
    '',
    'claw.on("message", (msg) => {',
    '  console.log(msg.content);',
    '});',
    '',
    'await claw.start();'
  ];
  const lineH = 44, padTop = 90, padLeft = 40;
  const syntaxColors = ['#c792ea', '#82aaff', '#c3e88d', '#ffcb6b', '#f07178', '#89ddff', '#eeffff'];

  lines.forEach((line, i) => {
    const y = winY + padTop + i * lineH;
    if (y > winY + winH - 30) return;

    // 行号
    ctx.font = `20px ${FONT}`; ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.fillText(String(i + 1), winX + padLeft - 10, y);

    // 代码内容（简化高亮）
    ctx.font = `22px monospace`; ctx.textAlign = 'left';
    const color = line.trimStart().startsWith('//') ? '#546e7a'
      : line.includes('const ') || line.includes('import ') || line.includes('await ') ? '#c792ea'
      : line.includes('"') || line.includes("'") ? '#c3e88d'
      : '#eeffff';
    ctx.fillStyle = color;
    ctx.fillText(line, winX + padLeft + 10, y);
  });

  ctx.restore();
}

/**
 * app — 应用界面仿真（手机/桌面）
 * config: { features: ["AI对话", "记忆系统", "多模型", "开源免费"], appName: "OpenClaw" }
 */
function drawApp(ctx, cfg) {
  darkBg(ctx);
  orb(ctx, W / 2, H * 0.3, 350, '80,0,255', 0.08);

  const features = cfg.features || ['AI对话', '记忆系统', '多模型', '开源免费'];

  // 手机框
  const phoneW = 700, phoneH = 1100;
  const phoneX = (W - phoneW) / 2, phoneY = (H - phoneH) / 2;
  ctx.fillStyle = '#151828'; rr(ctx, phoneX, phoneY, phoneW, phoneH, 40); ctx.fill();
  ctx.strokeStyle = 'rgba(0,200,255,0.2)'; ctx.lineWidth = 2;
  rr(ctx, phoneX, phoneY, phoneW, phoneH, 40); ctx.stroke();

  // 顶部状态栏
  ctx.fillStyle = '#0e1220'; rr(ctx, phoneX, phoneY, phoneW, 80, 40); ctx.fill();
  ctx.font = `bold 30px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = '#00e5ff';
  ctx.fillText(cfg.appName || 'OpenClaw', W / 2, phoneY + 52);

  // 功能卡片
  features.forEach((f, i) => {
    const cardY = phoneY + 120 + i * 230, cardH = 190, cardW = phoneW - 80, cardX = phoneX + 40;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,150,255,0.06)' : 'rgba(100,0,255,0.06)';
    rr(ctx, cardX, cardY, cardW, cardH, 20); ctx.fill();
    ctx.strokeStyle = 'rgba(0,200,255,0.1)'; ctx.lineWidth = 1;
    rr(ctx, cardX, cardY, cardW, cardH, 20); ctx.stroke();

    // 图标区
    const iconR = 30;
    ctx.beginPath(); ctx.arc(cardX + 60, cardY + cardH / 2, iconR, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,${150 + i * 30},255,0.2)`; ctx.fill();
    ctx.font = `bold 28px ${FONT}`; ctx.fillStyle = '#00e5ff'; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), cardX + 60, cardY + cardH / 2 + 10);

    // 功能文字
    ctx.font = `bold 40px ${FONT}`; ctx.fillStyle = '#f0f8ff'; ctx.textAlign = 'left';
    ctx.fillText(f, cardX + 120, cardY + cardH / 2 + 8);
  });

  ctx.restore();
}

/**
 * terminal — 终端界面仿真
 * config: { commands: ["npm install -g openclaw", "openclaw init", "openclaw start"], prompt: "$" }
 */
function drawTerminal(ctx, cfg) {
  darkBg(ctx);

  const winX = 100, winY = 200, winW = W - 200, winH = H - 400;
  ctx.fillStyle = '#0c0c0c'; rr(ctx, winX, winY, winW, winH, 16); ctx.fill();

  // 标题栏
  ctx.fillStyle = '#1a1a1a'; rr(ctx, winX, winY, winW, 52, 16); ctx.fill();
  [['#ff5f57', winX + 22], ['#febc2e', winX + 50], ['#28c840', winX + 78]].forEach(([c, x]) => {
    ctx.beginPath(); ctx.arc(x, winY + 26, 9, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill();
  });
  ctx.font = `20px ${FONT}`; ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText('Terminal', winX + winW / 2, winY + 34);

  const commands = cfg.commands || [
    '$ npm install -g openclaw',
    '✓ installed openclaw@2.0.0',
    '',
    '$ openclaw init',
    '✓ config created: ~/.openclaw/config.yaml',
    '✓ memory initialized',
    '',
    '$ openclaw start',
    '🚀 OpenClaw running on http://localhost:3000',
    '',
    '$ _'
  ];

  const prompt = cfg.prompt || '$';
  commands.forEach((line, i) => {
    const y = winY + 80 + i * 52;
    if (y > winY + winH - 30) return;
    ctx.font = `28px monospace`; ctx.textAlign = 'left';
    const color = line.startsWith('✓') ? '#4ade80'
      : line.startsWith('🚀') ? '#fbbf24'
      : line.startsWith(prompt) ? '#00e5ff'
      : '#a0a0a0';
    ctx.fillStyle = color;
    ctx.fillText(line, winX + 36, y);
  });

  ctx.restore();
}

/**
 * community — 贡献者/社区页面仿真
 * config: { contributors: 128, forks: 256, title: "活跃社区" }
 */
function drawCommunity(ctx, cfg) {
  darkBg(ctx);
  orb(ctx, W / 2, H * 0.4, 500, '0,150,255', 0.06);

  const title = cfg.title || '活跃开源社区';
  ctx.save(); ctx.textAlign = 'center';
  ctx.font = `bold 64px ${FONT}`; ctx.fillStyle = '#f0f8ff';
  ctx.fillText(title, W / 2, H * 0.12);

  // 数据行
  const stats = [
    { label: 'Contributors', value: cfg.contributors || '128' },
    { label: 'Forks', value: cfg.forks || '256' },
    { label: 'Issues', value: cfg.issues || '42' }
  ];
  const statW = 340, statGap = 40, statY = H * 0.22;
  const totalW = stats.length * statW + (stats.length - 1) * statGap;
  const startX = (W - totalW) / 2;

  stats.forEach((s, i) => {
    const x = startX + i * (statW + statGap);
    ctx.fillStyle = 'rgba(0,150,255,0.08)'; rr(ctx, x, statY, statW, 160, 16); ctx.fill();
    ctx.font = `bold 56px ${FONT}`; ctx.fillStyle = '#00e5ff';
    ctx.fillText(s.value, x + statW / 2, statY + 72);
    ctx.font = `28px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.fillText(s.label, x + statW / 2, statY + 120);
  });

  // 头像网格
  const gridStartY = H * 0.42, cols = 8, rows = 6;
  const avatarSize = 80, gap = 24;
  const gridW = cols * avatarSize + (cols - 1) * gap;
  const gridStartX = (W - gridW) / 2;
  const avatarColors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#34d399', '#22d3ee', '#60a5fa',
    '#818cf8', '#a78bfa', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#38bdf8', '#2dd4bf'];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const ax = gridStartX + c * (avatarSize + gap);
      const ay = gridStartY + r * (avatarSize + gap);
      ctx.fillStyle = avatarColors[(r * cols + c) % avatarColors.length] + '40';
      ctx.beginPath(); ctx.arc(ax + avatarSize / 2, ay + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2); ctx.fill();
      // 首字母
      ctx.font = `bold 32px ${FONT}`; ctx.fillStyle = '#ffffff80';
      ctx.fillText(String.fromCharCode(65 + ((r * cols + c) % 26)), ax + avatarSize / 2, ay + avatarSize / 2 + 10);
    }
  }

  ctx.restore();
}

/**
 * generic — 通用场景（文字+装饰）
 * config: { heading: "开源免费", sub: "数据不上云", icon: "🔓" }
 */
function drawGeneric(ctx, cfg) {
  darkBg(ctx);
  orb(ctx, W / 2, H * 0.35, 350, '0,200,255', 0.06);

  ctx.save(); ctx.textAlign = 'center';

  // 图标
  if (cfg.icon) {
    ctx.font = `120px ${FONT}`;
    ctx.fillText(cfg.icon, W / 2, H * 0.32);
  }

  // 主标题
  ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 40;
  ctx.font = `bold 96px ${FONT}`; ctx.fillStyle = '#00e5ff';
  ctx.fillText(cfg.heading || '', W / 2, H * 0.48);
  ctx.shadowBlur = 0;

  // 副标题
  if (cfg.sub) {
    ctx.font = `bold 48px ${FONT}`; ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(cfg.sub, W / 2, H * 0.48 + 80);
  }

  // 装饰线
  const lineY = H * 0.58;
  const lg = ctx.createLinearGradient(W / 2 - 300, 0, W / 2 + 300, 0);
  lg.addColorStop(0, 'rgba(0,200,255,0)'); lg.addColorStop(0.5, 'rgba(0,200,255,0.5)');
  lg.addColorStop(1, 'rgba(0,200,255,0)');
  ctx.beginPath(); ctx.moveTo(W / 2 - 300, lineY); ctx.lineTo(W / 2 + 300, lineY);
  ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.stroke();

  ctx.restore();
}

// ============ 调度 ============
const DRAWERS = { stars: drawStars, code: drawCode, app: drawApp, terminal: drawTerminal, community: drawCommunity, generic: drawGeneric };

// ============ 主流程 ============
function main() {
  const args = process.argv.slice(2);
  let input = null, outputDir = './assets';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input') input = args[++i];
    else if (args[i] === '--output') outputDir = args[++i];
  }

  if (!input || !fs.existsSync(input)) {
    console.log('用法: node gen_assets.js --input config.json [--output ./assets/]');
    console.log('config.json 中每个 scene 需包含 type 字段: stars|code|app|terminal|community|generic');
    process.exit(1);
  }

  const config = JSON.parse(fs.readFileSync(input, 'utf8'));
  const scenes = config.scenes || [];
  ensureDir(outputDir);

  console.log(`\n🎨 生成 ${scenes.length} 张素材图 → ${outputDir}\n`);

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    const type = scene.type || 'generic';
    const drawer = DRAWERS[type] || drawGeneric;

    const canvas = createCanvas(W, H);
    const ctx = canvas.getContext('2d');
    // 传递 scene.config 作为绘制配置，同时保留 type 等字段
    const cfg = { ...scene, ...(scene.config || {}) };
    drawer(ctx, cfg);

    const outFile = path.join(outputDir, `scene_${String(i + 1).padStart(2, '0')}.png`);
    const buf = canvas.toBuffer('image/png', { compressionLevel: 6 });
    fs.writeFileSync(outFile, buf);
    console.log(`  [${i + 1}] ${type.padEnd(10)} → ${outFile} (${Math.round(buf.length / 1024)}KB)`);
  }

  console.log(`\n✅ ${scenes.length} 张素材图完成\n`);
}

main();
