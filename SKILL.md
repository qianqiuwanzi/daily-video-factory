---
name: daily-video-factory
description: 自媒体短视频全自动生产线。从选题研究、网感文案撰写、TTS配音、真实素材准备、Ken Burns动画视频合成、封面设计到云盘上传的全流程自动化。支持8种Ken Burns动画效果、字幕配音完美同步、真实截图优先规则。适用于每日短视频内容批量生产（抖音、小红书、视频号）。触发场景：每日视频、日更短视频、自媒体内容制作、视频流水线、批量生产视频、产品宣传视频、AI配音视频。
---

# 每日视频工厂 — 全自动短视频生产线 v7.2

从选题到上传，一站式完成每日短视频内容生产。

> **更新（v8.0）**：**强制子代理模式** — 主会话禁止直接执行重量级操作（P2/P3所有工作必须spawn子代理），从架构上彻底杜绝主会话步骤溢出
> **更新（v7.2）**：**单图时长≤5秒** — 每个图片素材在视频中的显示时长不超过5秒，超出则拆分场景
> **更新（v6.1）**：**P1 前置约束** — 文案阶段强制短句（≤15字/句）+ 强制规划视频素材场景（≥2段），从源头杜绝字幕超标和纯图片混剪
> **更新（v6.0）**：**子代理分阶段架构** — P2/P3/P4 由 `sessions_spawn` 独立执行，彻底解决"步骤过多自动中止"问题 + `.task-state.json` 状态机 + 心跳恢复
> **更新（v5.3）**：字幕单行强制 | 音画同步强制 | 视频素材≥2段强制 | 字体大小规范 | 8种动态效果强制覆盖

## ⚠️ 验收铁律（违反 = 拒绝发布）

**详细规则见：`ACCEPTANCE_RULES.md`**

| # | 规则 | 最低要求 | 原因 |
|---|------|---------|------|
| #0 | **素材唯一性+真实性** | 必须**网上下载真实截图，15张全不同** | 禁止重复素材、禁止 card 图 |
| #1 | **横屏视频** | **1920×1080（16:9）** | 禁止竖屏 1080×1920 |
| #2 | 文件大小 | ≥ 1MB | 有真实素材 > 5MB |
| #3 | 禁止纯色/生成图 | 必须有**真实照片/截图** | Canvas 文字卡片 = 不通过 |
| #4 | 动态效果 | **8种Ken Burns效果强制覆盖** | 禁止静态，禁止<8种 |
| #5 | **字幕** | ≤15字/行，**单行显示**，**音画同步**，FontSize=36-42 | 禁止多行，禁止不同步 |
| #6 | 视频时长 | **30-70秒** | 内容紧凑不拖沓 |
| #7 | **视频素材** | **≥2段真实视频素材**，禁止纯图片混剪 | 真实视频增强说服力 |
| #8 | 多重特效 | ≥ 8种（FFmpeg4.4兼容） | 见 ACCEPTANCE_RULES.md v5.1 |

## 流水线总览

```
P1 文案(主会话) → P2 素材(子代理) → P3 视频(子代理) → P4 交付(主会话)
   09:00              09:10              09:20              09:30
```

### 🔴 v8.0 主会话强制轻量规则（最高优先级）

**核心原则：主会话永远不直接执行重量级操作。**

当用户发起视频制作任务时，主会话的职责只有：
1. **P1**：生成文案 + config.json（轻量，约5-8步）
2. **立即 spawn**：为 P2 和 P3 各 spawn 一个子代理
3. **等待 + 验收**：检查子代理写的 `phase_done_P{n}.txt`
4. **P4**：封面 + 内容包 + 最终交付

**主会话绝对禁止做的事（违者 = 立即 spawn 子代理）：**
- ❌ 直接执行 FFmpeg 命令（写 Python/JS 脚本可以，但必须 spawn 子代理执行）
- ❌ 直接调用 edge-tts 生成 TTS（spawn 子代理做）
- ❌ 直接读写多个文件（spawn 子代理做）
- ❌ 直接下载素材（spawn 子代理做）
- ❌ 直接截图网页（spawn 子代理做）
- ❌ 直接执行 Python 脚本处理视频（spawn 子代理做）

**主会话可以做的事：**
- ✅ 生成文案 + config.json
- ✅ 写 phase_done 文件
- ✅ 更新 .task-state.json
- ✅ 读取并检查文件（验收）
- ✅ 生成封面（轻量）
- ✅ 写内容包.md

**为什么这个规则有效：**
- 子代理是独立会话，有自己的 step 额度
- 主会话被 SIGKILL → 下次心跳根据 .task-state.json 重新 spawn 子代理 → 不丢进度
- 主会话正常 → 收到子代理完成通知 → 验收 → 继续

### 🏗️ v6.0 子代理架构（核心变更）

**问题**：单会话 step 上限约 50 步，P3 视频构建（16场景×3步=48步）接近极限，经常"步骤过多自动中止"。

**解决方案**：每个阶段由独立子代理执行，拥有完整 step 额度。

```
主会话
  │
  ├─ P1 文案+TTS （主会话内执行，约10步）
  │    └─ 写 phase_done_P1.txt
  │
  ├─ sessions_spawn → P2 子代理（独立会话，约30步）
  │    │  任务：读取config.json → 下载/截图真实素材 → 生成TTS → 验收 → 写 phase_done_P2.txt
  │    └─ 更新 .task-state.json
  │
  ├─ sessions_spawn → P3 子代理（独立会话，约50步）
  │    │  任务：读取phase_done_P2 → 构建视频 → 烧字幕 → 混BGM → 验收 → 写 phase_done_P3.txt
  │    └─ 更新 .task-state.json
  │
  └─ P4 交付（主会话内执行，约10步）
       └─ 封面 + 内容包 + 最终验收
```

### .task-state.json 状态机

每个项目目录必须维护此文件，用于断点续传和心跳恢复：

```json
{
  "taskId": "deepseek-video-20260428",
  "date": "2026-04-28",
  "outputDir": "D:/workspace/MediaContentCreation/2026-04-28",
  "phases": {
    "P1": { "status": "done", "completedAt": "2026-04-28T09:05:00+08:00" },
    "P2": { "status": "running", "startedAt": "2026-04-28T09:10:00+08:00", "sessionId": "spawn-abc123" },
    "P3": { "status": "pending" },
    "P4": { "status": "pending" }
  },
  "currentPhase": "P2",
  "retryCount": { "P1": 0, "P2": 0, "P3": 0, "P4": 0 },
  "errors": []
}
```

**状态值**：`pending` | `running` | `done` | `failed`

**心跳恢复逻辑**：
```
心跳 → 读取 .task-state.json
  ├─ currentPhase=running 但无活跃子代理 → 重新 spawn 该阶段
  ├─ currentPhase=done 且下一阶段=pending → 自动 spawn 下一阶段
  ├─ currentPhase=failed → 通知用户，等待指示
  └─ currentPhase=running 且有活跃子代理 → 正常，跳过
```

### ⚠️ 子代理超时与恢复规范（v8.1 新增）

**强制参数：`runTimeoutSeconds`**
- P2 素材阶段：**必须**设置 `runTimeoutSeconds: 600`（10分钟）
- P3 视频构建：**必须**设置 `runTimeoutSeconds: 900`（15分钟）
- 禁止省略此参数，默认超时（120秒）会导致子代理被强制杀死

**检查点恢复（断点续传）**
子代理的 task 描述中**必须**包含以下检查逻辑：
1. 开始前检查 `phase_done_P{n}.txt` 是否存在 → 存在则跳过该阶段
2. 检查输出目录下已有文件（assets/, output/）→ 跳过已完成的下载/生成
3. 只执行未完成的工作，避免重复劳动
4. 失败后重新 spawn 时，从检查点继续，而非重头开始

**失败重试机制（主会话责任）**
主会话 spawn 子代理后，必须检查完成状态：
1. 用 `sessions_list` 检查子代理状态（是否 truly completed）
2. 读取 `phase_done_P{n}.txt` 是否真实存在
3. 如子代理失败/超时/输出异常（如 tokens=0、输出 Network connection lost）→ **自动重新 spawn，最多重试 3 次**
4. 每次重试递增 `runTimeoutSeconds`（600s → 900s → 1200s）
5. 重试 3 次仍失败 → 改由主会话直接执行该阶段工作，不依赖子代理
6. ⚠️ 禁止：子代理失败后直接标记 phase_done，或静默跳过阶段

---

### sessions_spawn 调用模板

**P2 素材阶段**（⚠️ v7.0 更新：自主完成，不依赖用户）**：
```json
{
  "task": "【检查点恢复】开始前执行：1) 如果 {outputDir}/phase_done_P2.txt 存在 → 直接写回并退出（已完成）；2) 检查 {outputDir}/assets/ 目录，跳过已存在的文件；3) 只执行未完成的工作。你是视频工厂P2素材阶段执行者。⚠️ 核心职责：自动完成所有素材收集/制作，严禁依赖用户手动提供。读取 {outputDir}/config.json，完成以下工作：
1) 为每个场景下载/截图真实素材（≥16张，禁止重复，真实截图≥80%）
2) 用edge-tts生成每段TTS配音（zh-CN-YunjianNeural +30%）
3) 用ffprobe获取每段TTS时长，更新config.json的scenes[].duration
4) 【强制】下载≥2段真实视频素材（对应config.json中assetType=video的场景）
   ⚠️ 视频素材获取方式（静默下载，禁止启动浏览器）：
   a) 优先：Pixabay/Coverr/Mixkit CDN直链下载（Invoke-WebRequest 静默下载）
   b) 次选：产品官网 Demo 视频（curl/wget 直接下载）
   c) 兜底：如下载失败，用 FFmpeg 生成 AI 主题动画视频
   d) 禁止：启动浏览器下载、依赖用户手动操作
5) 验收素材数量、唯一性、真实性、视频素材数量
6) 写 phase_done_P2.txt
7) 更新 .task-state.json P2=done
⚠️ 验收不通过则不写phase_done文件。工作目录：{outputDir}",
  "mode": "run",
  "runtime": "subagent",
  "label": "P2-assets-{date}",
  "runTimeoutSeconds": 600
}
```

**P3 视频构建阶段**：
```json
{
  "task": "【检查点恢复】开始前执行：1) 如果 {outputDir}/phase_done_P3.txt 存在 → 直接写回并退出（已完成）；2) 检查 {outputDir}/output/ 目录，跳过已生成的视频段（clip_XX.mp4）；3) 只执行未完成的工作。你是视频工厂P3视频构建阶段执行者。前提：{outputDir}/phase_done_P2.txt 已存在。读取 config.json，完成：1) 用FFmpeg zoompan为每个场景生成Ken Burns动画视频段（8种效果轮流分配，assetType=video的场景直接使用视频素材）2) 拼接所有视频段 3) 【强制】生成SRT字幕前先检查config.json每条text是否≤15字，如超标则先用smart_split断句再生成SRT（单行≤15字，音画同步）4) 烧录字幕 5) 混合BGM（音量≤0.15）6) 按ACCEPTANCE_RULES.md验收全项（重点检查#5字幕长度、#7视频素材数量）7) 写 phase_done_P3.txt 8) 更新 .task-state.json P3=done。⚠️ 验收不通过则不写phase_done文件。FFmpeg路径：D:\software\ffmpeg-4.4-essentials_build\bin\ffmpeg.exe。工作目录：{outputDir}",
  "mode": "run",
  "runtime": "subagent",
  "label": "P3-video-{date}",
  "runTimeoutSeconds": 900
}
```

### 执行流程（主会话代码）

```javascript
// 伪代码：主会话执行流水线
async function runPipeline(outputDir, date) {
  // P1: 主会话内执行
  await runP1(outputDir);  // 文案+TTS+config.json
  await writePhaseDone(outputDir, 'P1');
  await updateTaskState(outputDir, 'P1', 'done');
  
  // P2: 子代理
  await updateTaskState(outputDir, 'P2', 'running');
  const p2 = await sessions_spawn({
    task: `P2素材阶段...输出目录：${outputDir}`,
    mode: 'run', runtime: 'subagent',
    label: `P2-assets-${date}`,
    runTimeoutSeconds: 600
  });
  // 等待P2完成
  await waitForPhase(outputDir, 'P2');
  
  // P3: 子代理
  await updateTaskState(outputDir, 'P3', 'running');
  const p3 = await sessions_spawn({
    task: `P3视频构建...输出目录：${outputDir}`,
    mode: 'run', runtime: 'subagent',
    label: `P3-video-${date}`,
    runTimeoutSeconds: 900
  });
  await waitForPhase(outputDir, 'P3');
  
  // P4: 主会话内执行
  await runP4(outputDir);  // 封面+内容包+最终验收
}
```

---

## ⚠️ 流程铁律（违反 = 返工）

**TTS 是内容锚点，所有后续步骤以 TTS 为准。**

```
1. 写文案（网感8段式）
2. 生成 TTS 配音（用文案生成 mp3）
3. 【关键】将 TTS 的实际文字同步写入 config.json.scenes[].text
4. 准备素材（确保 ≥ 场景数量，禁止重复）
5. build_video（**每段图片视频时长 = min(对应 TTS 时长, 5秒)，图片场景不超过5秒**）
6. 封面 + 内容包
7. 质量检查
8. 交付
```

### 🔴 分步验收铁律（v5.2 新增，最高优先级）

**核心原则：每一步必须验收合格，才允许进入下一步。不合格立即返工，不允许跳过验收。**

| 步骤 | 验收项 | 不合格处理 |
|------|--------|-----------|
| 1. 文案 | 8段式结构完整？口语化？有互动结尾？**每句≤15字？≥2个视频场景标注？** | 重写文案/拆分长句 |
| 2. TTS | 每段mp3正常？总时长30-70秒？ | 重新生成 |
| 3. config | text=TTS原文？场景数正确？**text全部≤15字？assetType=video≥2？** | 修正配置 |
| 4. 素材 | ≥场景数？无重复？真实截图≥80%？语义匹配？**视频素材≥2段已下载？** | 补充/替换素材 |
| 5. 视频 | 按ACCEPTANCE_RULES.md全项检查（#0-#10） | 重新合成 |
| 6. 封面 | 1920×1080 PNG？ | 重新生成 |
| 7. 内容包 | 标题/正文/标签/时间轴完整？ | 补充 |
| 8. 交付 | 视频可播放？文件完整？ | 修复 |

**四阶段流水线（sessions_spawn 子代理架构，v6.0）：**
```
P1 文案  主会话    → 生成 config.json + 文案 + TTS → phase_done_P1.txt
P2 素材  子代理    → 检查 phase_done_P1 → 下载素材+TTS → phase_done_P2.txt
P3 视频  子代理    → 检查 phase_done_P2 → 8种特效视频合成 → phase_done_P3.txt
P4 发布  主会话    → 检查 phase_done_P3 → 封面 + 交付包
```
- P2/P3 由 `sessions_spawn` 创建独立子代理执行，每个子代理有完整 step 额度
- 各阶段通过 `phase_done_P{n}.txt` 传递状态
- `.task-state.json` 记录完整状态，用于心跳恢复和断点续传
- **如果主会话在等待子代理时被 compacted**，心跳会检测到并恢复

### 分步验收执行规则（cron 场景）

每个阶段完成后，**必须先执行验收，通过后才写 `phase_done_P{n}.txt`**。

```
P1 完成文案+TTS → 验收文案结构、TTS质量、**每句文案≤15字、≥2个视频场景标注** → ✅通过 → 写 phase_done_P1.txt
P2 完成素材   → 验收素材数、唯一性、真实性、**视频素材≥2段** → ✅通过 → 写 phase_done_P2.txt
P3 完成视频   → 验收全项 ACCEPTANCE_RULES（**重点检查#5字幕长度、#7视频素材**） → ✅通过 → 写 phase_done_P3.txt
P4 完成交付   → 验收文件完整性 → 交付
```

**如果某阶段验收不通过，立即返工该阶段，不写 phase_done 文件，不进入下一阶段。**

---

## 第一步：选题研究

### ⚠️ 小红书：必须调用 xhs-note-creator 技能
制作小红书图文内容时，必须先加载 `xhs-note-creator` 技能，按技能规范执行。

### 信息源
- **GitHub Trending** — 开源项目热门
- **ProductHunt** — 新产品发布
- **HackerNews** — 技术社区热议
- **微信公众号/知乎** — 国内热点
- **用户指定** — 品牌方提供产品/话题

### 信息收集清单
- [ ] GitHub 仓库地址 + Stars 数
- [ ] 官网链接
- [ ] 核心功能（3-5条，用"一句话说人话"）
- [ ] 目标用户痛点
- [ ] 部署方式（一行命令 / Docker / 云端）
- [ ] 社会证明（用户数、平台覆盖数）

### 选题标准
1. 目标受众感兴趣（AI、效率工具、开发相关）
2. 有具体数据/数字可引用（增强可信度）
3. 有痛点或亮点可放大
4. 适合 40-60 秒短视频表达（注：铁律 #6 要求 ≥ 40秒，规划 12-16 个场景）

---

## 第二步：文案撰写（网感规则 v3.0）

### ⚠️ v6.1 核心变更：两项前置约束（从源头杜绝返工）

**约束 1：每句文案必须 ≤ 15 字（字幕铁律前置到 P1）**
- **原因**：后续 TTS → 字幕流程中，每行字幕直接对应一句文案。如果 P1 写出长句，P3 再怎么 smart_split 也断不干净。
- **规则**：config.json 中每个 scene 的 `text` 字段 **必须 ≤ 15 字（含标点）**
- **验收**：P1 完成后逐条检查 scenes[].text 长度，超标的立即拆分
- **示例**：
  - ❌ `"text": "DeepSeek这波降价真的把我震惊到了"` （17字）
  - ✅ `"text": "DeepSeek这波降价太狠了"` （11字）
  - ✅ `"text": "直接降到原来的十分之一"` （12字）

**约束 2：场景数必须保证每张图片 ≤ 5 秒（v7.2 新增）**
- **原因**：超过 5 秒的静态图片会让观众失去注意力；时长限制 30-70s 内，若某段 TTS > 5s 就拆成 2 个场景
- **规则**：
  - P1 文案阶段：**建议 ≥ 12 个场景**，确保总时长 30-70s 内每张图片展示不超过 5s
  - 若某段 TTS 时长 > 5s 且只有图片素材 → 拆分该段为 2 个场景，素材独立
  - P3 构建阶段：图片场景每段时长 = min(TTS_该段时长, 5s)
- **计算公式**：总图片展示时长 = Σ min(scene_i.tts_duration, 5)，结果必须 ≤ 70s
- **验收**：检查 concat 列表中每个图片片段时长，确认全部 ≤ 5s


**约束 2：必须在 config.json 中标注 ≥ 2 个视频素材场景（铁律#7 前置到 P1）**
- **原因**：P2/P3 如果不知道哪些场景需要视频素材，就会默认全部用图片。
- **规则**：在 config.json 的 scenes 中，至少 2 个场景的 `assetType` 必须标记为 `"video"`
- **规划方法**：在写文案时就明确哪 2+ 个场景适合配视频（产品 Demo、功能录屏、官网动画等）
- **验收**：P1 完成后检查 config.json 中 assetType=video 的场景数 ≥ 2

### 风格要求
- **语气**：专业 + 网感，"朋友式分享"，敢于输出主观观点
- **语言**：大白话，专业词立刻通俗化
- **禁止**：说明书式内容、空洞口号、没有感情的陈述句

### 8段式结构

| 段 | 定位 | 话术风格 | 时长 |
|---|---|---|---|
| 1 | 钩子开头 | "说实话，我真的..." | 2.5-3.5s |
| 2 | 产品引入 | "直到我发现了这个..." | 2.5-3.5s |
| 3 | 卖点1 | "最戳我的是..." | 2.5-3.5s |
| 4 | 卖点2 | "以前XX，现在..." | 2.5-3.5s |
| 5 | 卖点3 | "目前已有X人在用" | 2.5-3.5s |
| 6 | 使用感受 | "用了X，我真香了" | 2-3s |
| 7 | 行动引导 | "一行命令就能跑起来" | 2.5-3.5s |
| 8 | 互动结尾 | "你更看重哪个？评论区告诉我" | 2-3s |

> **注意**：铁律 #6 要求视频 ≥ 40秒，需要 12-16 个场景才能满足。可拆分卖点段落或增加辅助场景。

### 必须包含元素
- ✅ **口语化开头**：`说实话 / 讲真 / 我之前一直以为 / 你们有没有遇到过`
- ✅ **主观观点**：`最戳我的是 / 我真香了 / 这功能太绝了`
- ✅ **专业词通俗化**：LLM → "监控AI聊天的工具"；舆情监控 → "帮你盯着全网热点"
- ✅ **对比吐槽**：`以前XX，现在XX`
- ✅ **互动钩子**：`评论区告诉我 / 关注我每天一个 / 你选哪个`

### 禁止出现
- ❌ 说明书式：`支持XX功能`、`提供XX能力`
- ❌ 空洞口号：`让XX更高效`、`提升XX体验`
- ❌ 没有感情的陈述句
- ❌ 没有互动的结尾

### 标题公式

```
A. 痛点吐槽型：{痛点吐槽}？{简单解决方案}，{惊喜结果}
   例：AI写的代码不敢用？这个工具帮你盯着，太香了

B. 反差型：GitHub {Stars} star 的{产品}，竟然{意外点}
   例：GitHub 53k star 的监控工具，竟然开源免费？

C. 场景型：{场景}+{情绪词}，{解决方案}
   例：产品上线翻车？用这个提前发现问题
```

### 互动结尾模板（必选其一）
- **选择题型**：`你更看重{A}还是{B}？评论区告诉我 👇`
- **场景提问型**：`你们团队用什么{场景}？求推荐 👀`
- **钩子型**：`关注我，每天带你发现一个{主题} 🔔`
- **二选一型**：`{A} vs {B}，你选哪个？`

### 发布时间建议
| 平台 | 最佳时间 |
|------|---------|
| 小红书 | 12:00 / 20:00 |
| 抖音 | 07:00 / 12:00 / 18:00 |
| 微信视频号 | 工作日 08:30 / 20:00 |
| B站 | 17:00 / 20:00 |

---

## 第三步：TTS 配音

### 工具
```bash
pip install edge-tts
```

### 推荐语音
| 语音 | 风格 | 适用场景 |
|------|------|---------|
| zh-CN-YunjianNeural | 成熟男声 | 科技产品、工具类（**默认**） |
| zh-CN-XiaoxiaoNeural | 温暖女声 | 生活方式、教育类 |
| zh-CN-YunxiNeural | 阳光男声 | 轻松活泼的内容 |

### 语速设置
```bash
# 默认 +30%（推荐，短视频最佳节奏）
python -m edge_tts --voice zh-CN-YunjianNeural --rate=+30% --text "文字内容" --write-media output.mp3
```

### ⚠️ 生成后必做
- [ ] 检查每段 mp3 是否正常生成
- [ ] 记录每段时长（用于 config.json）
- **最重要**：将 TTS 文字同步写入 `config.json.scenes[].text`

---

## 第四步：素材准备（不重复规则）

### ⚠️ 核心规则：素材数 ≥ 场景数，严格禁止重复使用

**严格禁止**：
- ❌ 同一张图片用于2个及以上场景
- ❌ 使用程序自动生成的 card 图/文字卡片作为素材（纯色背景+大字=不通过）
- ❌ Canvas 合成的伪截图

**必须**：
- ✅ 每张素材从网上下载真实来源（GitHub/raw、产品官网、新闻图片）
- ✅ 每张素材记录来源 URL（用于验收追溯）
- ✅ 素材主题与文案场景语义匹配（铁律 #0 最高优先级）
- ✅ 每张素材最多使用1次，重复使用需配合不同 Ken Burns 效果

### 素材来源优先级（v8.1 更新：国内站点优先 + Tavily 解决反爬）

**🆕 v8.1 永久性规则**：素材下载必须按以下优先级执行，违反导致素材获取失败的责任由执行者全责。

#### 国内站点（优先使用）

| 站点 | 类型 | 免费政策 | 说明 |
|------|------|----------|------|
| 新片场 (xinpianchang.com) | 视频 | 部分免费 | 国内最大创作者社区，直连稳定 |
| 站酷海洛 (hellorf.com) | 视频/图片 | 部分免费 | 设计师素材平台 |
| 千图网 (58pic.com) | 视频/图片 | 部分免费 | 综合素材站 |
| 包图网 (ibaotu.com) | 视频/图片 | 部分免费 | 商用素材 |
| 抖音/小红书/快手/B站 | 视频/图片 | 平台官方 | 平台素材可直接截图 |

#### 海外站点（备用）

| 站点 | 类型 | 免费政策 | 说明 |
|------|------|----------|------|
| Pexels | 视频/图片 | 免费 | 需设置 Referer/User-Agent，否则403 |
| Pixabay | 视频/图片 | 免费 | CDN防盗链，需官方API Key |
| Coverr | 视频 | 免费 | URL常失效需搜索获取 |

#### 反爬虫解决方案（v8.1 新增）

**遇到 403/404 反爬虫时，使用 Tavily 搜索解决**：

1. **先用 Tavily 搜索**目标站点的有效直链
2. **获取真实 URL** 后再下载
3. **设置请求头**：User-Agent、Referer

```javascript
// ✅ 正确：设置请求头
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; Apple)',
    'Referer': 'https://pixabay.com/'
  }
})

// ❌ 错误：裸请求（触发反爬）
https.get(url)
```

**Tavily API**（用于搜索网页获取有效链接）：
- **Endpoint**: `https://api.tavily.com/search`
- **用途**：搜索素材站点获取有效直链（搜索网页文本，无法直接下载二进制文件）
- **注意**：免费版有 Rate Limit（每月1000次）
- **⚠️ API Key 配置**：用户需自行在 `TOOLS.md` 中配置 `TAVILY_API_KEY`，技能执行时从环境变量或配置文件中读取，**禁止将 API Key 硬编码在技能文件中**

#### 下载优先级执行规则（v8.1 强制）

1. **先搜国内站**：新片场 → 站酷 → 千图 → 包图 → 抖音/小红书/B站/快手
2. **再fallback海外**：使用 Tavily 搜索获取有效直链 + 设置 Headers
3. **永远不一上来就硬编码URL**：URL常失效，必须动态获取

#### 兜底方案

- 如所有站点都无法下载：用 FFmpeg 生成 AI 主题动画视频（仅作为兜底，占比≤20%）

> **⚠️ v4.0 强制要求**：P2 素材阶段必须下载至少 80% 的真实素材。Canvas 生成的 card 图只能占 ≤ 20%，且不能是主要场景的素材。

### 素材规划流程
```
1. 列出该产品已有的真实截图
2. 统计场景数量（需满足 ≥ 40秒，通常 12-16 个），确保素材数 ≥ 场景数
3. 若素材不足：下载 GitHub README 图 / 官网截图 / 裁剪同一图不同区域
4. 规划分配：确保每张素材最多使用1次，搭配不同 Ken Burns 动画效果
```

### 真实截图下载 + 格式转换
```bash
# FFmpeg 转换 webp → png
ffmpeg -i input.webp output.png
```

### 素材检查清单（v7.0 更新）
- [ ] 素材数 ≥ 场景数？
- [ ] 没有素材重复使用？
- [ ] **真实视频素材 ≥ 2 段**？（⚠️ 必须自主完成，禁止依赖用户）
  - 下载来源：产品官网、视频平台、免费视频库等
  - 如下载失败：AI 文生视频兜底
- [ ] 每张素材有对应的 Ken Burns 动画效果？
- [ ] **8种效果全部覆盖**？（按index轮流分配）
- [ ] 素材主题与文案场景语义匹配？（铁律 #0）
- [ ] **验收记录**：视频素材获取方式（下载URL 或 AI 生成）

---

## 第五步：视频合成（核心）

### 技术方案
- **FFmpeg zoompan 滤镜** 生成 Ken Burns 动画（Canvas 在 isolated session 中被 SIGKILL 终止）
- **Node.js execSync** 调用 FFmpeg（需配置 stdio 避免 stderr 抛异常）
- **每段图片视频时长 = min(对应 TTS 时长, 5秒)**（超过5秒的纯图片会让观众失去注意力）
- **每段视频时长 = 对应 TTS 时长**（视频素材场景不受5秒限制）

### 关键决策

| 决策 | 原因 |
|------|------|
| FFmpeg zoompan 滤镜 | isolated session 中 Canvas 逐帧会被 SIGKILL 系统级终止 |
| execSync stdio: 'ignore' | FFmpeg stderr 触发 Node.js 异常，必须忽略或用 3-pipe 捕获 |
| TTS 时长决定视频时长 | 彻底解决音画同步 |
| H.264 + CRF 23 | 质量与体积平衡 |
| BGM 音量 ≤ 0.15 | 配音清晰度优先 |

### FFmpeg execSync 关键修复

```javascript
// ✅ 正确：忽略 stderr（推荐，用于无输出读取的命令）
require('child_process').execSync(cmd, { stdio: 'ignore' });

// ✅ 正确：捕获全部输出（需要读 stdout 时用）
const out = require('child_process').execSync(cmd, {
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe']  // 必须3个pipe
});

// ❌ 错误：这2种会因 stderr 抛异常
require('child_process').execSync(cmd, { stdio: 'pipe' });
require('child_process').execSync(cmd, { encoding: 'utf-8' });

// ffprobe 获取时长（推荐）
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "file.mp3"
```

### 8种 Ken Burns 动画效果（必须 ≥ 8种，FFmpeg 4.4 兼容）

> **⚠️ v4.0 关键更新**：以下表达式全部在 FFmpeg 4.4 上验证通过。**禁止使用 `t/浮点数`、`sin(t)`、`drawtext 中文`**。

| 效果名 | 描述 | zoompan 滤镜参数（FFmpeg 4.4 兼容）|
|--------|------|------------------|
| `zoom-in` | 经典 Ken Burns 放大 | `z='min(zoom+0.002,1.3)'` |
| `zoom-out` | 从局部拉远至全局 | `z='max(zoom-0.002,1.0)'` |
| `pan-left` | 镜头从右向左扫 | `x='iw/2-(iw/zoom/2)+0.5*on'` |
| `pan-right` | 镜头从左向右扫 | `x='iw/2-(iw/zoom/2)-0.5*on'` |
| `pan-up` | 镜头向上推 | `y='ih/2-(ih/zoom/2)-0.5*on'` |
| `pan-down` | 镜头向下推 | `y='ih/2-(ih/zoom/2)+0.5*on'` |
| `zoom-pulse` | 缩放脉冲节奏感 | `z='1+0.06*sin(ON)'` （**大写 ON**）|
| `diagonal` | 对角线移动 | `x-0.3*on, y-0.2*on` |

**分配规则**：按场景 index 轮流分配 effect 1-8，确保8种全覆盖。

### config.json 结构示例
```json
{
  "topic": "TrendRadar",
  "outputDir": "D:/workspace/MediaContentCreation/2026-04-23/TrendRadar",
  "assetsDir": "D:/workspace/MediaContentCreation/2026-04-23/TrendRadar/assets",
  "scenes": [
    {
      "id": 1,
      "text": "说实话，错过热点太亏了",
      "asset": "real_github_card.png",
      "assetType": "image",
      "effect": "pan-right"
    },
    {
      "id": 5,
      "text": "看看这个实时监控面板",
      "asset": "demo_screen_recording.mp4",
      "assetType": "video",
      "effect": "none"
    }
  ],
  "voice": "zh-CN-YunjianNeural",
  "speed": 30,
  "bgm": "D:/workspace/music-library/tech-corporate/005_innovation-drive.mp3",
  "bgmVolume": 0.15
}
```

> **⚠️ v6.1 新增 `assetType` 字段**：`"image"`（默认，Ken Burns 图片动画）或 `"video"`（真实视频素材，无需 Ken Burns）。**必须 ≥ 2 个场景标记为 `"video"`**。

### 字幕方案（v5.3 更新：单行强制 + 音画同步 + 字体大小）

> **⚠️ 永久性规则**：**禁止使用 drawtext 处理中文**（Windows Python/PowerShell subprocess 编码冲突导致全失败）

**唯一正确方案：SRT 文件 + subtitles 滤镜**

#### 字幕三大铁律（v5.3 新增，违反任一即返工）

**铁律 A：单行显示（禁止多行）**
- 每段字幕**只能显示一行**，禁止换行/多行
- SRT中每段只有一行文字，不含`\n`
- 验收：抽帧检查，确认画面只有一行字幕

**铁律 B：音画同步（时间轴严格匹配TTS）**
- 字幕出现时间 = 对应TTS音频开始时间
- 字幕结束时间 = TTS结束时间
- 实现：根据TTS每段实际时长计算累积时间轴
- 验收：播放视频，确认字幕与配音完全同步

**铁律 C：字体大小（横屏36-42px）**
- 横屏1920×1080下，FontSize **36-42px**
- SRT force_style 中设置FontSize=38
- 验收：抽帧检查，字幕占画面高度约5-8%

#### 智能断句规则（v5.1 保留）
- 单行字幕 **≤ 15 字**（含标点）
- 遇到句号 `。`、逗号 `，`、分号 `；`、顿号 `、` 等标点时**自动断句**
- **禁止行尾出现标点**（句号、逗号、顿号不能出现在行末）
- SRT 的 WrapStyle=0 由 FFmpeg subtitles 滤镜自动处理，**不需要也不应该手动插入换行符 `\n`**

**Smart Subtitle 示例**：
```
原文：说实话，错过热点真的太亏了，热点永远在追，追到一半就没了
❌ 错误：说实话，错过热点真的太亏了，热点永远在追，追到一半就没了
✅ 正确：说实话，错过热点真的太亏了
        热点永远在追，追到一半就没了

原文：我真香了，这个工具太好用了
❌ 错误：我真香了，这个工具太好用了。（行尾句号）
✅ 正确：我真香了，这个工具太好用了
```

**智能断句算法（Python 参考实现）**：
```python
import re

def smart_split(text, max_chars=15):
    """将长句切分为多行，每行 ≤ max_chars 字，行尾无标点"""
    # 按标点分段
    parts = re.split(r'([，、；，；。])', text)
    blocks = []
    group = ''
    i = 0
    while i < len(parts):
        seg = parts[i]
        is_punct = bool(re.match(r'^[，、；，；。.]$', seg))
        if is_punct:
            # 标点：加入当前行（如果当前为空则丢弃）
            test = group + seg
            if len(test) <= max_chars:
                group = test
                lines = []
                current = ''
                for b in blocks:
                    if len(current) + len(b) <= max_chars:
                        current += b
                    else:
                        if current:
                            lines.append(current)
                        current = b
                if current:
                    lines.append(current)
                return lines
            else:
                blocks.append(group)
                group = ''
                i += 1
                continue
        else:
            test = group + seg if group else seg
            if len(test) <= max_chars:
                group = test
            else:
                if group:
                    blocks.append(group)
                group = seg
        i += 1

    if group:
        blocks.append(group)

    # 合并超短行
    merged = []
    for b in blocks:
        if merged and len(merged[-1]) + len(b) <= max_chars:
            merged[-1] += b
        else:
            merged.append(b)

    # 去除行尾标点
    return [l.rstrip('，、；，；。.') for l in merged if l]
```

**构建 SRT 时按场景分 block，字幕行单独一行（不要加 `\n`）**：
```srt
1
00:00:01,000 --> 00:00:05,000
说实话，错过热点真的太亏了

2
00:00:05,001 --> 00:00:09,500
热点永远在追，追到一半就没了
```

#### SRT force_style 模板（v5.3 横屏 1920×1080）
```
Fontname=Microsoft YaHei Bold
FontSize=38            # 强制36-42px，推荐38
FontColor=&HFFFFFF     # 白色字
BorderStyle=1           # 描边
OutlineColour=&H000000 # 黑色描边
Outline=2             # 描边宽度
MarginV=60             # 距底部距离
WrapStyle=0            # 自动换行（交给FFmpeg处理）
```

**v5.3 字幕验收检查清单（全部必须通过）**：
- [ ] **单行显示**：每段字幕只有一行，无`\n`换行
- [ ] **音画同步**：字幕出现/结束时间与TTS完全匹配
- [ ] **字体大小**：FontSize=36-42px，字幕占画面高度5-8%
- [ ] **字数限制**：每行 ≤ 15 字
- [ ] **行尾无标点**：句号、逗号、顿号不在行末
- [ ] **画面内显示**：抽取3帧确认字幕完整可见

#### 字幕验收检查清单
- [ ] 抽取视频帧（至少3个时间点），确认字幕在画面内
- [ ] 每行字幕 ≤ 15 字
- [ ] 行尾无标点（句号、逗号、顿号）
- [ ] 字幕不遮挡素材关键内容
- [ ] 字幕与配音内容一致（最重要）

#### 构建脚本要求
- EFFECTS 数组使用函数动态生成 FFmpeg 滤镜字符串，**不要用模板字符串在模块加载时求值**
- 场景特效按 index 轮流分配 zoom-in / zoom-out 系列，确保8种特效全部覆盖
- 视频段时长 = 音频时长（ffprobe 获取），字幕时间轴基于累积时间计算

### BGM 混音参数
- **BGM 音量**：0.12-0.15（配音优先，BGM 仅作氛围）
- **淡入**：2s
- **淡出**：结束前 2s

---

## 第六步：封面设计

### 规格
- **尺寸**：1920×1080（横屏 16:9）
- **格式**：PNG（无损）
- **禁止**：竖屏 1080×1440 封面

### 封面生成
```bash
node scripts/make_cover.js \
  --title "53K+" --subtitle "GitHub Stars" \
  --highlights "35+平台|AI分析|开源免费" \
  --cta "评论区告诉我" \
  --output cover_douyin_3x4.png
```

---

## 第七步：交付检查（严格验收，不合格即返工）

### 🔴 验收流程（v5.2 强制执行）

**视频生成完成后，必须逐项执行以下验收，全部通过才可交付。任何一项不通过 → 立即返工 → 再次验收 → 直到全部通过。**

```bash
# 验收执行顺序（必须按此顺序）
1. 技术规格检查（#0-#4）：分辨率、大小、时长
2. 内容质量检查（#5-#7）：字幕、素材、动态效果
3. 最终交付检查（#8-#9）：封面、文件完整性
```

### 验收不通过的处理规则

- **返工上限**：单步骤最多返工 3 次
- **返工超限**：向用户报告问题，请求指示
- **每次返工**：必须记录问题原因和修复方案到任务摘要
- **禁止跳过**：不允许以"差不多就行"跳过任何验收项
- **自动重做**：验收不通过时，自动根据失败项重新执行对应步骤，无需用户逐一指示

**小红书图文笔记**
- [ ] 标题：爆款风格，包含数字/痛点/情绪词
- [ ] 正文文字：800字左右，分段落，带emoji，网感表达
- [ ] 发布标签建议：3-5个相关话题标签
- [ ] 图片：至少5张PNG图片（1080×1440px，3:4比例）
- [ ] 封面：1张封面图（主标题 + 吸睛设计）
- [ ] 所有图片直接生成PNG文件（不依赖用户截图）

**视频验收（9条铁律全部检查，逐项确认）**
- [ ] 铁律 #0：素材语义匹配（最重要）
- [ ] 铁律 #1：文件大小 ≥ 1MB
- [ ] 铁律 #2：素材数量 ≥ 场景数
- [ ] 铁律 #3：无纯色背景
- [ ] 铁律 #4：有 Ken Burns 动态效果
- [ ] 铁律 #5：字幕智能断句（≤15字/行，行尾无标点）
- [ ] 铁律 #6：视频时长 **30-70秒**
- [ ] 铁律 #7：**至少2段视频素材**，禁止纯图片混剪
- [ ] 铁律 #8：特效种类 ≥ 8种
- [ ] **字幕与配音内容一致**（最重要）
- [ ] BGM 不压过配音（音量 ≤ 0.15）

**⚠️ 验收结果处理**：
- ✅ 全部通过 → 进入交付环节
- ❌ 任何一项不通过 → **立即返工对应步骤，不交付** → 返工后重新验收 → 直到全部通过

**交付**
- [ ] 视频文件存在且可播放？
- [ ] 封面存在？
- [ ] 内容包.md 完整？
- [ ] 时间轴准确？

---

## 第八步：云盘上传（可选）

### 技术方案
Chrome DevTools Protocol (CDP) 控制已登录浏览器，直接操作 DOM。

### 前置条件
1. Chrome 由 xb init 自动启动并开启 CDP（`xb config set browser=chrome` + `xb init`），无需用户手动操作
2. 已登录腾讯微云：https://www.weiyun.com/disk

### 上传脚本
见 `scripts/upload_to_weiyun.js` 和 `scripts/screenshot.js`

---

## 交付物清单

| 文件 | 说明 |
|------|------|
| `{topic}_video_v{n}.mp4` | 最终视频 |
| `cover_douyin_3x4.png` | 封面图 |
| `内容包.md` | 文案、标题、标签、发布时间 |
| `task-summary_{date}.md` | 制作过程记录 |

---

## 环境依赖

```bash
# 工具路径
FFmpeg:   ffmpeg（系统 PATH 中查找，Windows 典型路径 `D:\software\ffmpeg-4.4-essentials_build\bin\ffmpeg.exe`）
Git:      git（系统 PATH 中查找，Windows 典型路径 `C:\Program Files\Git\cmd\git.exe`）
字体:     C:/Windows/Fonts/msyh.ttc（微软雅黑）
```

---

## 常见陷阱（v4.0 更新）

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| **FFmpeg execSync 抛异常** | stderr 被当作错误 | 用 `stdio: 'ignore'` 或 `['pipe','pipe','pipe']` |
| **isolated session Canvas SIGKILL** | CPU 密集触发系统终止 | 改用 FFmpeg zoompan 原生滤镜 |
| **drawtext 中文全失败** | Windows subprocess 编码冲突 | **用 SRT 文件 + subtitles 滤镜替代** |
| **zoompan `t/浮点数` 失败** | FFmpeg 4.4 不支持除法表达式 | 用预计算乘法或 `on` 变量替代 |
| **zoompan `sin(t)` 失败** | FFmpeg 4.4 zoompan 不支持 sin(t) | 用 `sin(ON)` 替代（**大写 ON**）|
| **字幕溢出竖屏屏幕** | 竖屏 1080px 宽度不够 | **改用横屏 1920×1080**，从根本上解决 |
| **"步骤过多自动中止"** | P3 视频构建 16场景×3步≈48步，超单会话 step 上限 | **v6.0 子代理架构**：P2/P3 由 `sessions_spawn` 独立执行 |
| **子代理超时** | 默认超时可能不够 | P2 设 600s，P3 设 900s (`runTimeoutSeconds`) |
| **会话 compacted 后状态丢失** | compaction 丢失 exec 结果 | 依赖 `.task-state.json` + `phase_done_P{n}.txt` 而非会话内存 |
| **子代理失败无法恢复** | 子代理崩溃无重试 | 心跳检测 → 重新 spawn（retryCount < 3）|
| **素材需裁剪成竖屏** | 下载的图大多是横屏 | **横屏视频 + 横屏素材 = 天然匹配** |
| **素材是程序生成的 card 图** | P2 阶段偷懒用了 Canvas 生成 | **必须从网上下载真实截图/照片** |
| 音画不同步 | 视频固定时长 ≠ TTS 时长 | 每段视频时长 = TTS 时长 |
| **视频时长 < 40秒** | 场景数太少/配音太短 | P1 规划 12-16 个场景 |
| **特效种类 < 8种** | 所有场景用同一种特效 | 按 index 轮流分配 8 种兼容效果 |
| **素材重复使用** | 未规划素材分配 | 先列素材清单，确保素材数 ≥ 场景数 |
| **字幕配音不匹配** | config.json 和 TTS 不同步 | 先生成 TTS → 再写 config.json → 最后 build |
| Canvas 中文路径报错 | `canvas` 模块限制 | 素材放英文路径 |
| PowerShell filtergraph 乱码 | `$_`/`??` 语法冲突 | 用 Python 执行 FFmpeg（不用 PowerShell/cmd） |
| BGM 压过配音 | 音量比例不当 | BGM ≤ 0.15 |
| **文案句子过长** | **P1 没有字数约束，导致后续字幕超标** | **v6.1: P1 强制每句≤15字** |
| **缺少视频素材** | **P1 没规划视频场景，P2 默认全用图片** | **v6.1: P1 强制标注≥2个assetType=video场景** |
| **smart_split 断不干净** | **原文太长或无标点，算法无法合理断句** | **从源头控制：P1 就写短句** |
