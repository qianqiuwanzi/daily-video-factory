/**
 * 抖音/小红书封面生成器
 * 
 * 用法: node make_cover.js --title "25.9万人" --subtitle "正在使用的AI助手" --output cover.png
 * 
 * 可选参数:
 *   --features "功能1|功能2|功能3|功能4"  功能亮点列表（|分隔）
 *   --cta "立即体验"                      CTA 按钮文字
 *   --brand "OpenClaw"                    品牌名
 *   --url "qclaw.app"                     品牌网址
 *   --w 1080 --h 1440                     尺寸
 */

const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
let title = '', subtitle = '', output = 'cover_douyin_3x4.png';
let features = [], cta = '立即体验 →', brand = '', url = '';
let W = 1080, H = 1440;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--title') title = args[++i];
  else if (args[i] === '--subtitle') subtitle = args[++i];
  else if (args[i] === '--output') output = args[++i];
  else if (args[i] === '--features') features = args[++i].split('|');
  else if (args[i] === '--cta') cta = args[++i];
  else if (args[i] === '--brand') brand = args[++i];
  else if (args[i] === '--url') url = args[++i];
  else if (args[i] === '--w') W = parseInt(args[++i]);
  else if (args[i] === '--h') H = parseInt(args[++i]);
}

if (!title) {
  console.log('用法: node make_cover.js --title "主标题" --subtitle "副标题" --output cover.png');
  process.exit(1);
}

const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');
const CX = W / 2;

// 工具函数
function rr(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r); ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h); ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r); ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}

function orb(cx, cy, r, inner, outer, alpha) {
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  g.addColorStop(0, `rgba(${inner},${alpha})`);
  g.addColorStop(1, `rgba(${outer},0)`);
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = g; ctx.fill();
}

// 背景
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, '#080818'); bg.addColorStop(0.35, '#0c1535');
bg.addColorStop(0.65, '#0f1f42'); bg.addColorStop(1, '#080f25');
ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);

// 星点
for (let i = 0; i < 120; i++) {
  ctx.beginPath();
  ctx.arc(Math.random() * W, Math.random() * H, Math.random() * 2.5 + 0.3, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${Math.round(Math.random() * 80 + 100)},${Math.round(Math.random() * 120 + 150)},255,${Math.random() * 0.5 + 0.05})`;
  ctx.fill();
}

// 光晕
orb(CX - 280, H * 0.18, 300, '0,200,255', '0,80,200', 0.12);
orb(CX + 300, H * 0.75, 340, '60,0,255', '0,0,0', 0.10);

// 主标题区域
const titleY = H * (1 / 3);

ctx.fillStyle = 'rgba(0,170,255,0.08)';
rr(80, titleY - 120, W - 160, 240, 20); ctx.fill();
ctx.strokeStyle = 'rgba(0,200,255,0.12)'; ctx.lineWidth = 1;
rr(80, titleY - 120, W - 160, 240, 20); ctx.stroke();

// 标题
ctx.save(); ctx.textAlign = 'center';
ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 40;
ctx.font = 'bold 108px "Microsoft YaHei"'; ctx.fillStyle = '#00e5ff';
ctx.fillText(title, CX, titleY - 18);
ctx.shadowBlur = 0; ctx.restore();

// 副标题
if (subtitle) {
  ctx.save(); ctx.textAlign = 'center';
  ctx.font = 'bold 78px "Microsoft YaHei"'; ctx.fillStyle = '#f0f8ff';
  ctx.shadowColor = 'rgba(0,0,0,0.7)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 5;
  ctx.fillText(subtitle, CX, titleY + 90);
  ctx.restore();
}

// 分隔线
const lineY = titleY + 125;
const lg = ctx.createLinearGradient(CX - 320, 0, CX + 320, 0);
lg.addColorStop(0, 'rgba(0,220,255,0)'); lg.addColorStop(0.5, 'rgba(0,220,255,0.7)');
lg.addColorStop(1, 'rgba(0,220,255,0)');
ctx.beginPath(); ctx.moveTo(CX - 320, lineY); ctx.lineTo(CX + 320, lineY);
ctx.strokeStyle = lg; ctx.lineWidth = 2; ctx.stroke();
ctx.fillStyle = '#00e5ff'; ctx.beginPath(); ctx.arc(CX, lineY, 4, 0, Math.PI * 2); ctx.fill();

// 功能亮点
if (features.length > 0) {
  const featY0 = lineY + 60, featH = 72, featGap = 16, featW = 560, featX = CX - featW / 2;
  features.forEach((f, i) => {
    const y = featY0 + i * (featH + featGap);
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,180,255,0.05)';
    rr(featX, y, featW, featH, 14); ctx.fill();
    ctx.fillStyle = i % 2 === 0 ? 'rgba(0,200,255,0.6)' : 'rgba(100,0,255,0.6)';
    rr(featX, y, 6, featH, 3); ctx.fill();
    ctx.font = 'bold 32px "Microsoft YaHei"'; ctx.textAlign = 'center';
    ctx.fillStyle = '#ddeeff'; ctx.fillText(f, CX, y + featH / 2 + 11);
  });
}

// CTA
const ctaY = H * 0.88, ctaW = 400;
ctx.fillStyle = 'rgba(0,200,255,0.10)'; rr(CX - ctaW / 2, ctaY, ctaW, 88, 18); ctx.fill();
ctx.strokeStyle = 'rgba(0,200,255,0.35)'; ctx.lineWidth = 1.5;
rr(CX - ctaW / 2, ctaY, ctaW, 88, 18); ctx.stroke();
ctx.save(); ctx.textAlign = 'center';
ctx.shadowColor = '#00e5ff'; ctx.shadowBlur = 20;
ctx.font = 'bold 40px "Microsoft YaHei"'; ctx.fillStyle = '#00e5ff';
ctx.fillText(cta, CX, ctaY + 58); ctx.restore();

// 品牌标识
if (brand) {
  ctx.font = 'bold 20px "Microsoft YaHei"'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(0,200,255,0.4)'; ctx.fillText(brand, W - 60, H - 52);
}
if (url) {
  ctx.font = '16px "Microsoft YaHei"'; ctx.textAlign = 'right';
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillText(url, W - 60, H - 30);
}

// 保存
ensureDir(path.dirname(output));
const buf = canvas.toBuffer('image/png', { compressionLevel: 6 });
fs.writeFileSync(output, buf);
console.log(`✅ 封面: ${output} (${Math.round(buf.length / 1024)}KB) ${W}x${H}`);

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
