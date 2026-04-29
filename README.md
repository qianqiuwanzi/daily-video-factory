# daily-video-factory 🤖

> 自媒体短视频全自动生产线 — 选题 → 网感文案 → TTS配音 → 真实素材 → Ken Burns视频合成 → 封面设计，一站式完成。

专为抖音、小红书、视频号等短视频平台设计，支持每日批量内容生产。

---

## 功能特性

| 功能 | 说明 |
|------|------|
| **选题研究** | GitHub Trending / ProductHunt / HackerNews 自动采集 |
| **网感文案** | 8段式结构，口语化、主观化、互动化 |
| **TTS配音** | Azure Edge TTS，支持 Yunjian/Xiaoxiao 等多语音 |
| **8种动画** | Ken Burns 效果：zoom-in/out、pan四个方向、zoom-pulse、slide-in |
| **字幕同步** | 每段视频时长 = 对应 TTS 时长，完美音画同步 |
| **封面生成** | Canvas 绘制，深色科技风，1080×1440 竖屏 |
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
Git:     C:\Program Files\Git\cmd\git.exe
字体:     C:/Windows/Fonts/msyh.ttc
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
  --output cover_douyin_3x4.png
```

---

## 核心规则

### ⚠️ 流程铁律（违反 = 返工）

```
1. 写文案（网感8段式）
2. 生成 TTS 配音
3. 【关键】将 TTS 的实际文字同步写入 config.json.scenes[].text
4. 准备素材（确保 ≥ 场景数量，禁止重复）
5. build_video
6. 封面 + 内容包
7. 质量检查
8. 交付
```

### 文案规则（v2.0）

**风格**：专业 + 网感，朋友式分享，敢于输出主观观点

**8段式结构**：

| 段 | 定位 | 话术风格 | 示例 |
|---|---|---|---|
| 1 | 钩子开头 | "说实话，我真的..." | 说实话，错过热点真的太亏了 |
| 2 | 产品引入 | "直到我发现了这个..." | 直到我发现了这个监控神器 |
| 3 | 卖点1 | "最戳我的是..." | 最戳我的是，它会自动把热点整理成日报 |
| 4 | 卖点2 | "以前XX，现在..." | 以前每天刷十个平台，现在只看这一个 |
| 5 | 卖点3 | "目前已有X人在用" | 53k用户都在用，开源免费 |
| 6 | 使用感受 | "用了X，我真香了" | 用了一周，信息焦虑都好了 |
| 7 | 行动引导 | "一行命令就能跑起来" | 一行命令，本地跑起来 |
| 8 | 互动结尾 | "你更看重哪个？评论区告诉我" | 邮件还是微信推送？评论区告诉我 |

**必须包含**：口语化开头 + 主观观点 + 专业词通俗化 + 对比吐槽 + 互动钩子

**禁止**：说明书式内容、空洞口号、无感情陈述句、无互动结尾

### 素材规则（强制）

**8个场景 → 至少5-8张不同素材，严格禁止同一张图用于多个场景**

- 真实截图优先（GitHub README / 产品官网）
- 程序化素材仅作为兜底
- 若素材不足：下载更多截图 / 裁剪不同区域 / 换动画效果区分

### Ken Burns 动画效果（8种）

| 效果 | 描述 |
|------|------|
| `zoom-in` | 经典 Ken Burns 放大 |
| `zoom-out` | 从局部拉远 |
| `pan-left/right` | 镜头平移 |
| `pan-up/down` | 镜头推进 |
| `zoom-pulse` | 缩放脉冲 |
| `slide-in` | fade-in 滑入（开场推荐） |

每场景可在 config.json 中指定 `effect` 字段。

---

## 脚本说明

| 脚本 | 用途 |
|------|------|
| `scripts/gen_tts.js` | 批量生成 TTS 配音 |
| `scripts/gen_assets.js` | Canvas 程序化素材生成 |
| `scripts/build_video.js` | 核心视频构建（Canvas逐帧 + FFmpeg编码） |
| `scripts/make_cover.js` | 抖音/小红书封面生成 |
| `scripts/upload_to_weiyun.js` | 腾讯微云 CDP 上传 |
| `scripts/screenshot.js` | CDP 截图工具 |

## 文件结构

```
daily-video-factory/
├── SKILL.md                        # 技能完整文档
├── README.md                       # 本文件
├── scripts/
│   ├── build_video.js              # 核心构建（8种动画）
│   ├── gen_tts.js                  # TTS配音生成
│   ├── gen_assets.js               # 素材图生成
│   ├── make_cover.js               # 封面设计
│   ├── upload_to_weiyun.js         # 云盘上传
│   └── screenshot.js               # CDP截图
└── references/
    ├── copywriting-template.md     # 文案模板（网感规则）
    └── example-config.json        # 完整配置示例
```

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| Canvas 中文路径报错 | canvas 模块限制 | 素材放英文路径 |
| FFmpeg zoompan 静止 | v4.4 兼容性 | 改用 Canvas 逐帧 |
| 音画不同步 | 视频固定时长 ≠ TTS 时长 | 每段视频时长 = TTS 时长 |
| BGM 压过配音 | 音量比例不当 | BGM ≤ 0.15 |
| 素材重复使用 | 未规划素材分配 | 先列素材清单，确保素材数 ≥ 场景数 |
| 字幕配音不匹配 | config.json 和 TTS 不同步 | 先生成 TTS → 再写 config.json → 最后 build |

---

## 更新日志

### v2.0（2026-04-23）
- ✨ 新增 8 种 Ken Burns 动画效果，每场景可单独指定
- ✨ 文案规则升级为"网感口语化"（主观观点 + 互动结尾）
- ✨ 新增素材不重复规则（8场景 → 至少5-8张不同素材）
- 🔧 修复 gen_assets.js config 合并 bug
- 📝 新增文案模板完整示例

### v1.0（2026-04-22）
- 🎉 初始版本：TTS + Canvas Ken Burns + FFmpeg 合成
