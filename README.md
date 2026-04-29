# daily-video-factory 🤖

> 自媒体短视频全自动生产线 v8.1 — 选题 → 网感文案 → TTS配音 → 真实素材 → Ken Burns视频合成 → 封面设计，一站式完成。

专为抖音、小红书、视频号等短视频平台设计，支持每日批量内容生产。

---

## 🆕 最新更新 (v8.1)

- **国内站点优先**：素材下载优先使用新片场、站酷、千图、包图等国内站点
- **Tavily 反爬**：遇到 403/404 时使用 Tavily 搜索获取有效直链
- **子代理架构**：P2/P3 阶段由独立子代理执行，解决步骤溢出
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
| **子代理架构** | P2/P3 独立执行，断点续传，心跳恢复 |

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

## 核心规则

### ⚠️ 流程铁律（违反 = 返工）

```
P1 文案(主会话) → P2 素材(子代理) → P3 视频(子代理) → P4 交付(主会话)
   09:00              09:10              09:20              09:30
```

1. **写文案**（网感8段式，每句 ≤15 字）
2. **生成 TTS 配音**
3. **【关键】将 TTS 的实际文字同步写入 config.json.scenes[].text**
4. **准备素材**（确保 ≥ 场景数量，禁止重复，≥2 段视频素材）
5. **build_video**（每段图片视频时长 = min(TTS时长, 5秒)）
6. **封面 + 内容包**
7. **质量检查**（按 ACCEPTANCE_RULES.md 全项验收）
8. **交付**

### 文案规则（v6.1）

**强制约束**：
- ✅ 每句文案 **≤ 15 字**（含标点）
- ✅ 至少 **≥ 2 个视频场景** 标注（assetType=video）
- ✅ 建议 **≥ 12 个场景**，确保总时长 30-70 秒

**风格**：专业 + 网感，朋友式分享，敢于输出主观观点

**8段式结构**：

| 段 | 定位 | 话术风格 | 示例 |
|---|---|---|---|
| 1 | 钩子开头 | "说实话，我真的..." | 说实话，错过热点真的太亏了 |
| 2 | 产品引入 | "直到我发现了这个..." | 直到我发现了这个监控神器 |
| 3 | 卖点1 | "最戳我的是..." | 最戳我的是自动整理热点日报 |
| 4 | 卖点2 | "以前XX，现在..." | 以前刷十个平台，现在只看一个 |
| 5 | 卖点3 | "目前已有X人在用" | 53k用户都在用，开源免费 |
| 6 | 使用感受 | "用了X，我真香了" | 用了一周，信息焦虑都好了 |
| 7 | 行动引导 | "一行命令就能跑起来" | 一行命令，本地跑起来 |
| 8 | 互动结尾 | "你更看重哪个？评论区告诉我" | 邮件还是微信推送？评论区告诉我 |

**必须包含**：口语化开头 + 主观观点 + 专业词通俗化 + 对比吐槽 + 互动钩子

**禁止**：说明书式内容、空洞口号、无感情陈述句、无互动结尾、长句不拆分

### 素材规则（v8.1）

**下载优先级**：
1. **国内站点**（优先）：新片场 → 站酷 → 千图 → 包图 → 抖音/小红书/B站/快手
2. **海外站点**（备用）：Pexels / Pixabay / Coverr（需设置 Headers）
3. **反爬解决**：使用 Tavily 搜索获取有效直链

**强制要求**：
- ✅ 素材数 ≥ 场景数
- ✅ **≥ 2 段真实视频素材**（禁止纯图片混剪）
- ✅ 严格禁止同一张图用于多个场景
- ✅ 真实截图优先（GitHub README / 产品官网）
- ✅ 程序化素材仅作为兜底（≤20%）

### Ken Burns 动画效果（8种强制覆盖）

| 效果 | 描述 | FFmpeg 4.4 兼容 |
|------|------|-----------------|
| `zoom-in` | 经典 Ken Burns 放大 | ✅ |
| `zoom-out` | 从局部拉远 | ✅ |
| `pan-left` | 镜头从右向左扫 | ✅ |
| `pan-right` | 镜头从左向右扫 | ✅ |
| `pan-up` | 镜头向上推 | ✅ |
| `pan-down` | 镜头向下推 | ✅ |
| `zoom-pulse` | 缩放脉冲节奏感 | ✅ |
| `diagonal` | 对角线移动 | ✅ |

每场景按 index 轮流分配 effect 1-8，确保 8 种全覆盖。

### 字幕规则（v5.3）

**三大铁律**：
1. **单行显示**：每段字幕只能显示一行，禁止换行/多行
2. **音画同步**：字幕时间轴严格匹配 TTS 时长
3. **字体大小**：横屏 1920×1080 下 FontSize = 36-42px

**智能断句**：
- 单行字幕 ≤ 15 字（含标点）
- 遇标点自动断句
- 禁止行尾出现标点

---

## 子代理架构（v6.0/v8.0）

**问题**：单会话 step 上限约 50 步，P3 视频构建经常"步骤过多自动中止"。

**解决方案**：
- P2 素材阶段：独立子代理执行（`runTimeoutSeconds: 600`）
- P3 视频构建：独立子代理执行（`runTimeoutSeconds: 900`）
- 断点续传：通过 `.task-state.json` + `phase_done_P{n}.txt` 恢复

**状态文件**：
```json
{
  "taskId": "deepseek-video-20260428",
  "currentPhase": "P2",
  "phases": {
    "P1": { "status": "done" },
    "P2": { "status": "running" },
    "P3": { "status": "pending" },
    "P4": { "status": "pending" }
  }
}
```

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

---

## 常见问题

| 问题 | 原因 | 解决 |
|------|------|------|
| Canvas 中文路径报错 | canvas 模块限制 | 素材放英文路径 |
| FFmpeg zoompan 静止 | v4.4 兼容性 | 改用 FFmpeg 滤镜表达式 |
| 音画不同步 | 视频固定时长 ≠ TTS 时长 | 每段视频时长 = TTS 时长 |
| BGM 压过配音 | 音量比例不当 | BGM ≤ 0.15 |
| 素材重复使用 | 未规划素材分配 | 先列素材清单，确保素材数 ≥ 场景数 |
| 字幕配音不匹配 | config.json 和 TTS 不同步 | 先生成 TTS → 再写 config.json → 最后 build |
| 字幕换行/溢出 | 文案句子过长 | P1 阶段强制每句 ≤15 字 |
| 纯图片混剪 | 未规划视频场景 | P1 阶段强制标注 ≥2 个 video 场景 |
| 步骤溢出中止 | P3 步骤过多 | 使用子代理架构 |
| 素材下载 403 | 反爬虫 | 使用 Tavily 搜索 + 设置 Headers |

---

## 更新日志

### v8.1（2026-04-29）
- ✨ 国内站点优先：新片场、站酷、千图、包图等
- ✨ Tavily 反爬：搜索获取有效直链
- 🔒 安全修复：移除硬编码 API Key，用户自行配置

### v8.0（2026-04-29）
- ✨ 强制子代理模式：P2/P3 必须 spawn 子代理执行
- ✨ 主会话轻量规则：禁止直接执行重量级操作

### v7.2（2026-04-28）
- ✨ 单图时长限制：≤5 秒，超时自动拆分场景

### v7.0（2026-04-28）
- ✨ 自主素材获取：自动完成，不依赖用户手动提供

### v6.1（2026-04-28）
- ✨ P1 前置约束：强制短句（≤15 字）+ 强制视频场景（≥2 段）

### v6.0（2026-04-28）
- ✨ 子代理分阶段架构：解决步骤溢出
- ✨ .task-state.json 状态机 + 心跳恢复

### v5.3（2026-04-27）
- ✨ 字幕单行强制 | 音画同步强制 | 字体大小规范

### v2.0（2026-04-23）
- ✨ 8 种 Ken Burns 动画效果
- ✨ 网感文案规则
- ✨ 素材不重复规则

### v1.0（2026-04-22）
- 🎉 初始版本：TTS + Ken Burns + FFmpeg 合成
