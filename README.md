# daily-video-factory 🤖

> 自媒体短视频全自动生产线 v8.1 — 选题 → 网感文案 → TTS配音 → 真实素材 → Ken Burns视频合成 → 封面设计，一站式完成。

专为抖音、小红书、视频号等短视频平台设计，支持每日批量内容生产。

---

## 🆕 最新更新 (v8.1)

- **国内站点优先**：素材下载优先使用新片场、站酷、千图、包图等国内站点
- **Tavily 反爬**：遇到 403/404 时使用 Tavily 搜索获取有效直链
- **强制短句**：文案每句 ≤15 字，从源头杜绝字幕超标
- **强制视频素材**：必须规划 ≥2 个视频场景，禁止纯图片混剪
- **单图时长限制**：每张图片展示 ≤5 秒，超时自动拆分场景

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **选题研究** | GitHub Trending / ProductHunt / HackerNews 自动采集 |
| **网感文案** | 8段式结构，口语化、主观化、互动化，每句 ≤15 字 |
| **TTS配音** | Azure Edge TTS，支持 Yunjian/Xiaoxiao 等多语音 |
| **8种动画** | Ken Burns 效果：zoom-in/out、pan四个方向、zoom-pulse、diagonal |
| **字幕同步** | 每段视频时长 = 对应 TTS 时长，完美音画同步，单行显示 |
| **封面生成** | Canvas 绘制，深色科技风，1920×1080 横屏 |
| **云盘上传** | CDP 协议自动上传腾讯微云 |

---

## 快速开始

### 环境要求

```bash
# 必需工具
Node.js 18+
Python 3.8+
FFmpeg 4.4+

# 必需依赖
pip install edge-tts
npm install canvas

# 工具路径（Windows）
FFmpeg:   D:\software\ffmpeg-4.4-essentials_build\bin\ffmpeg.exe
Git:      C:\Program Files\Git\cmd\git.exe
字体:      C:/Windows/Fonts/msyh.ttc
```

### 安装

```bash
# 克隆仓库
git clone https://github.com/qianqiuwanzi/daily-video-factory.git
cd daily-video-factory

# 安装依赖
npm install
pip install edge-tts
```

### 配置 API Key（必需）

在您的 `TOOLS.md` 或环境变量中配置：

```bash
# Tavily API Key（用于反爬虫搜索）
export TAVILY_API_KEY="your-tavily-api-key"
```

### 制作第一个视频

```bash
# 1. 准备配置文件（参考 references/example-config.json）
# 2. 生成 TTS 配音
node scripts/gen_tts.js --input your-config.json

# 3. 准备素材（真实截图优先，禁止重复）
# 4. 合成视频
node scripts/build_video.js your-config.json

# 5. 生成封面
node scripts/make_cover.js --title "53K+" --subtitle "GitHub Stars" \
  --highlights "35+平台|AI分析|开源免费" \
  --cta "评论区告诉我" \
  --output cover.png
```

---

---

## 脚本说明

| 脚本 | 用途 |
|------|------|
| `scripts/gen_tts.js` | 批量生成 TTS 配音 |
| `scripts/gen_assets.js` | 素材下载/生成（国内站点优先） |
| `scripts/build_video.js` | 核心视频构建（FFmpeg + Ken Burns） |
| `scripts/make_cover.js` | 封面生成（1920×1080 横屏） |
| `scripts/upload_to_weiyun.js` | 腾讯微云 CDP 上传 |
| `scripts/screenshot.js` | CDP 截图工具 |

## 文件结构

```
daily-video-factory/
├── SKILL.md                        # 技能完整文档（详细规则）
├── README.md                       # 本文件
├── ACCEPTANCE_RULES.md             # 验收铁律（必须阅读）
├── scripts/
│   ├── build_video.js              # 核心构建（8种动画）
│   ├── gen_tts.js                  # TTS配音生成
│   ├── gen_assets.js               # 素材下载（国内优先）
│   ├── make_cover.js               # 封面设计
│   ├── upload_to_weiyun.js         # 云盘上传
│   └── screenshot.js               # CDP截图
└── references/
    ├── copywriting-template.md     # 文案模板
    └── example-config.json         # 配置示例
```


