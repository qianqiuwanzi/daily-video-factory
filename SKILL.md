---
name: daily-video-factory
description: 自媒体短视频全自动生产线 v12.0（最新：P2a搜索+P2b下载串联拆分+URL白名单验收，解决子代理跳过搜索问题）。从选题研究、网感文案撰写、TTS配音、真实素材准备、Ken Burns动画视频合成、封面设计到云盘上传的全流程自动化。支持8种稳态Ken Burns动画效果、字幕配音完美同步、真实截图优先规则。适用于每日短视频内容批量生产（抖音、小红书、视频号）。触发场景：每日视频、日更短视频、自媒体内容创作、视频流水线、批量生产视频、产品宣传视频、AI配音视频。
---

# 每日视频工厂 — 全自动短视频生产线 v12.0

从选题到上传，一站式完成每日短视频内容生产。

> **更新（v12.0）**：①**P2a搜索+P2b下载串联拆分**（搜索独立化，文件交接点强制串联）②**URL白名单验收**（视频场景URL必须来自B站/抖音/好看/VJshi/新片场/爱给/潮点）③**主会话P2a验收**（搜索结果不足则拒绝进入P2b）④视频素材占比>50%

## ⚠️ 验收铁律（违反 = 拒绝发布）

**详细规则见：`ACCEPTANCE_RULES.md`**

| # | 规则 | 最低要求 | 原因 |
|---|------|---------|------|
| #0 | **素材唯一性+真实性** | 必须**网上下载真实截图，15张全不同**，真实≥60% | 禁止重复素材、禁止100%生成 |
| #1 | **视频格式** | 横屏 **1920×1080（16:9）** 或竖屏 **1080×1920（9:16）**，由用户指定 | 禁止方形或其他错误比例 |
| #2 | 文件大小 | ≥ 1MB | 有真实素材 > 5MB |
| #3 | 禁止纯色/生成图 | 必须有**真实照片/截图**，生成图≤40%，纯色≤20% | Canvas 文字卡片 = 不通过 |
| #4 | 动态效果 | **8种Ken Burns效果强制覆盖** | 禁止静态，禁止<8种 |
| #5 | **字幕** | ≤15字/行，**单行显示**，**音画同步**，横屏56-72px/竖屏40-48px | 禁止多行，禁止不同步 |
| #6 | 视频时长 | **30-70秒** | 内容紧凑不拖沓 |
| #7 | **视频素材** | **>50%视频场景**，真实视频素材 | 真实视频增强说服力 |
| #8 | 多重特效 | ≥ 8种（FFmpeg4.4兼容） | 见 ACCEPTANCE_RULES.md v5.1 |
| #11 | **真实素材比例** | **真实素材≥60%，生成≤40%，纯色≤20%** | 禁止100%生成凑数 |

## 流水线总览

```
P1 文案(主会话) → P2a 搜索(子代理) → P2b 素材(子代理) → P3 视频(子代理) → P4 交付(主会话)
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
    "P1": { "status": "done", "completedAt": "2026-05-09T09:05:00+08:00" },
  "P2a": { "status": "pending" },
  "P2b": { "status": "pending" },
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

**P2 素材阶段 v12.0 重构（方案A+方案B组合 — 搜索独立化 + URL白名单验收）**

P2 拆分为两个强制串联的子代理，用文件交接点防止跳过搜索。

```json
// === P2a：搜索阶段（必须先完成）===
{
  "task": "你是视频工厂P2a搜索阶段执行者。工作目录：{outputDir}\n\n⚠️ 核心原则：必须完成搜索并验证URL来源，才能进入P2b下载阶段。禁止跳过搜索。\n\n## 【搜索任务】\n1. 读取 {outputDir}/config.json，获取所有 assetType=\"video\" 的场景（共N个）\n2. 对每个视频场景，用 online-search 搜索相关视频：\n   - 命令：node prosearch.cjs --keyword=\"场景关键词 AI视频 功能演示\" --cnt=5\n   - 路径：D:/Program Files/QClaw/resources/openclaw/config/skills/online-search/scripts/prosearch.cjs\n3. 从搜索结果中提取视频URL，优先取以下域名：\n   bilibili.com | douyin.com | haokan.baidu.com | vjshi.com | xinpianchang.com | aigei.com | shipin520.com\n4. 写入 {outputDir}/assets/video_search_results.json，格式：\n   {\"scenes\": [{\"sceneId\": 1, \"urls\": [\"url1\", "url2\"], \"source\": \"域名\"}]}\n5. 验证：video_search_results.json 中来自白名单域名的URL数量 >= config.json中assetType=video的场景数\n6. 全部通过后写 {outputDir}/phase_done_P2a.txt\n工作目录：{outputDir}",
  "mode": "run",
  "runtime": "subagent",
  "label": "P2a-search-{date}",
  "runTimeoutSeconds": 300
}

// === P2b：下载阶段（必须等P2a完成）===
{
  "task": "你是视频工厂P2b下载阶段执行者。工作目录：{outputDir}\n\n⚠️ 核心原则：素材获取失败 = 如实报告 = 不写phase_done_P2.txt。禁止越权兜底。\n\n前提：phase_done_P2a.txt 已存在，assets/video_search_results.json 已生成。\n\n## 【第一步：读取搜索结果】\n读取 {outputDir}/assets/video_search_results.json，获取白名单域名URL列表。\n\n## 【第二步：下载视频】\n对 video_search_results.json 中的每个URL，依次尝试下载：\n① bilibili.com / douyin.com（搜索结果URL）\n② haokan.baidu.com\n③ vjshi.com / xinpianchang.com\n④ aigei.com\n⑤ shipin520.com\n**一个站点403≠失败，继续尝试下一个**。\n全部失败 → 报告用户 → 不写 phase_done_P2.txt。\n\n## 【第三步：下载图片】\n对 assetType=\"image\" 的场景：用 online-search 搜索图片URL并下载（允许来自新闻/知乎等）。\n\n## 【第四步：验收】必须通过全部7项门禁\n① assets/ 目录下每个 scene 都有对应文件\n② assets/video_sources.json 记录了每个素材的来源URL\n③ 用 ffprobe 验证每个视频 ≥ 3秒\n④ **MD5去重**：任意两个视频MD5相同=不通过\n⑤ **视频场景占比**：视频场景数 / 总场景数 > 50%\n⑥ **🔴 URL白名单验收（v12.0新增）**：\n   video_sources.json 中所有 assetType=video 场景的URL，\n   必须来自以下白名单域名之一：\n   bilibili.com | douyin.com | haokan.baidu.com | vjshi.com | xinpianchang.com | aigei.com | shipin520.com\n   来自以下域名的URL **不计入视频场景**：\n   sohu.com | sinaimg.cn | csdn.net | zhihu.com | 126.net | blog.csdn.net | mydrivers.com | thepaper.cn | toutiao.com | 任意新闻/博客/图片站\n   （图片素材不受此限制）\n⑦ 真实素材占比 ≥ 60%\n\n## 【禁止越权兜底】\n❌ 禁止用 FFmpeg testsrc/color 生成视频\n❌ 禁止用图片+zoompan替代真实视频\n❌ video_sources.json 中视频场景的URL来自新闻/图片站（见上方白名单）\n\n⚠️ 任一不通过 → 立即报告 → 不写 phase_done_P2.txt\n全部通过后写 phase_done_P2.txt 并更新 .task-state.json。\n工作目录：{outputDir}",
  "mode": "run",
  "runtime": "subagent",
  "label": "P2b-download-{date}",
  "runTimeoutSeconds": 600
}
```

**P3 视频构建阶段**：
```json
{
  "task": "【检查点恢复】检查 phase_done_P3.txt 和 output/ 目录，跳过已生成视频段。你是视频工厂P3视频构建阶段执行者。前提：phase_done_P2.txt 已存在。读取 config.json，严格按照 daily-video-factory SKILL.md 和 ACCEPTANCE_RULES.md 执行视频构建、字幕烧录、BGM混合。验收通过后写 phase_done_P3.txt 并更新 .task-state.json。工作目录：{outputDir}",
  "mode": "run",
  "runtime": "subagent",
  "label": "P3-video-{date}",
  "runTimeoutSeconds": 1800
}
```

### 执行流程（主会话代码）v12.0 — P2a/P2b 串联

```javascript
// 伪代码：主会话执行流水线 v12.0
async function runPipeline(outputDir, date) {
  // P1: 主会话内执行（文案+TTS+config.json）
  await runP1(outputDir);
  await writePhaseDone(outputDir, 'P1');
  await updateTaskState(outputDir, 'P1', 'done');

  // ========== P2a: 搜索阶段（强制先完成）==========
  await updateTaskState(outputDir, 'P2a', 'running');
  await sessions_spawn({
    task: `P2a搜索阶段...输出目录：${outputDir}`,
    mode: 'run', runtime: 'subagent',
    label: `P2a-search-${date}`,
    runTimeoutSeconds: 300
  });
  // 等待P2a完成（检查 phase_done_P2a.txt）
  await waitForPhase(outputDir, 'P2a');
  // 【关键】主会话验收P2a搜索结果
  const searchResults = readJson(outputDir + '/assets/video_search_results.json');
  const config = readJson(outputDir + '/config.json');
  const videoSceneCount = config.platforms.douyin.scenes.filter(s => s.assetType === 'video').length;
  const whitelistUrls = searchResults.scenes.flatMap(s => s.urls)
    .filter(u => /bilibili\.com|douyin\.com|haokan\.baidu|vjshi\.com|xinpianchang\.com|aigei\.com|shipin520\.com/.test(u));
  if (whitelistUrls.length < videoSceneCount) {
    throw new Error(`P2a验收失败：白名单视频URL=${whitelistUrls.length}，需要=${videoSceneCount}`);
  }

  // ========== P2b: 下载阶段（必须等P2a通过）==========
  await updateTaskState(outputDir, 'P2b', 'running');
  await sessions_spawn({
    task: `P2b下载阶段...输出目录：${outputDir}`,
    mode: 'run', runtime: 'subagent',
    label: `P2b-download-${date}`,
    runTimeoutSeconds: 600
  });
  // 等待P2b完成（检查 phase_done_P2.txt）
  await waitForPhase(outputDir, 'P2b');

  // P3: 子代理
  await updateTaskState(outputDir, 'P3', 'running');
  const p3 = await sessions_spawn({
    task: `P3视频构建...输出目录：${outputDir}`,
    mode: 'run', runtime: 'subagent',
    label: `P3-video-${date}`,
    runTimeoutSeconds: 900
  });
  await waitForPhase(outputDir, 'P3');

  // P4: 主会话内执行（封面+内容包+最终验收）
  await runP4(outputDir);
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
P2 完成素材   → **质量门禁6项全检**：①asset文件齐全 ②URL记录存在 ③ffprobe验证 ④视频场景>50% ⑤真实素材≥60% ⑥生成≤40% → ✅通过 → 写 phase_done_P2.txt | ❌任一不通过 → 返工，不写phase_done，不进P3
P3 完成视频   → 验收全项 ACCEPTANCE_RULES（**重点检查#5字幕长度、#7视频素材**） → ✅通过 → 写 phase_done_P3.txt
P4 完成交付   → 验收文件完整性 → 交付
```

**如果某阶段验收不通过，立即返工该阶段，不写 phase_done 文件，不进入下一阶段。**

**🔴 完成标记诚信规则（v11.8 新增 — 解决"video_ratio_pass: false仍写phase_done"问题）**：
- ❌ **严格禁止**：在6项质量门禁**全部通过之前**写 `phase_done_P2.txt`
- ❌ **严格禁止**：验收过程中发现任意一项不通过，仍写 `phase_done_P2.txt`
- ❌ **严格禁止**：子代理因超时退出时，将已有文件当作"完成"标记
- ✅ **正确行为**：
  1. 先执行全部门禁验证（①②③④⑤⑥）
  2. 全部PASS → 才写 `phase_done_P2.txt`
  3. 任意一项FAIL → **不写** → 如实报告哪项失败 → 等待指示
- **典型错误案例（2026-05-08）**：
  - ❌ `video_sources.json` 写了 `video_ratio_pass: false`，但仍写 `phase_done_P2.txt`（明知不通过还写=诚信问题）
  - ❌ 4个视频MD5完全相同（同一视频复制4次），但仍写 `phase_done_P2.txt`（自欺欺人）
  - ✅ MD5检查发现重复 → 停止 → 报告"视频MD5重复，验收不通过" → 等待指示

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

**约束 3：视频素材占比 >50%，图片素材 <50%（v10.0 新增）**
- **原因**：纯图片混剪缺乏说服力，视频素材能显著提升内容质感
- **规则**：
  - P1 文案阶段：**至少 50%** 的场景标记为 `assetType: "video"`
  - 图片素材占比 < 50%
  - 例：14个场景 → 至少7个视频场景，图片≤7个
- **验收**：P2/P3 完成后检查（视频场景数 / 总场景数）> 50%

### 🔴 v11.3 核心变更：四大源头控制原则（防止返工的根本）

> **核心思想**：在生产阶段严格执行规则，而不是验收时发现问题频繁返工。

#### 规则1：素材时长由文案决定，视频≥3秒、图片≤5秒 + 语义分组原则
- **原因**：视频素材应该有足够时间展示内容（<3秒看不清），图片素材过长会让观众失去注意力
- **规则**：
  - **视频素材**：每段 **≥ 3秒**（最小展示时长）
  - **图片素材**：每段 **≤ 3秒**（防止静态画面停留过久）
  - **语义分组原则（v11.8新增）**：**禁止"一句话 = 一个scene"的机械拆分**。场景拆分应按语义单元进行：
    - ✅ **正确**：同一话题的多句话合并为一个scene（如"抖音AI搜索上线了→它能直接给答案→比刷视频快"合并为1个scene，配1段视频素材）
    - ❌ **错误**：每句话单独一个scene（导致13个scene全是短句，图片素材无处放，视频素材占比天然不足）
    - **判断标准**：若2-3句话在说同一件事，且总TTS时长≤15秒 → 合并为1个scene
    - **视频素材场景**：视频场景的TTS时长可适当放宽（视频本身有内容），但单个scene的TTS不建议超过10秒
  - **分镜拆分**：当某段文案对应的TTS > 5秒且为图片素材 → 必须拆分为多个scene
- **示例**：
  - ❌ 图片素材配5秒TTS → 拆分为2个分镜（2s+3s）或换视频素材
  - ✅ 2秒TTS配图片素材 → 保留（2s<3s）
  - ✅ 4秒TTS配视频素材 → 保留（4s≥3s）

#### 规则2：音频完整性优先，调整素材长短适配音频
- **原因**：音频（配音）是内容核心，不能被截断或加速
- **规则**：
  - ✅ **始终以TTS音频时长为基准**
  - ✅ 素材时长 = min(TTS时长, 上限) — 素材配合音频，不是音频配合素材
  - ❌ **禁止调整音频长短** 来适应素材（禁止变速/截断配音）
  - ❌ 音频结束时画面仍在播放 → 音画不同步
- **正确做法**：
  - 音频4秒，图片素材 → 截取图片视频长度为4秒
  - 音频2秒，视频素材 → 视频播放2秒后切换（不截断视频）

#### 规则3：字幕单行强制 + 大小规范
- **原因**：多行字幕遮挡画面，字体过小看不清，过大占用画面
- **规则**：
  - ✅ **单行显示**：每段字幕只能一行，禁止换行
  - ✅ **字数限制**：≤15字/行
  - ✅ **字体大小**：横屏 **56-72px**（推荐64px），竖屏 **40-48px**（推荐44px）
  - ✅ **距底部距离**：横屏 60-80px，竖屏 80-120px
  - ❌ **禁止**：多行字幕；横屏字号56-72px，竖屏字号40-48px
- **验收**：抽帧检查字幕占画面高度约5-8%，不遮挡素材主体

#### 规则4：生产即验收，源头控制不返工
- **原因**：在每个阶段结束时立即验收，不让问题进入下一阶段
- **规则**：
  - ✅ P1 文案完成后：**逐句检查字数≤15字、根据文案语义拆分确定，无固定数量**
  - ✅ P2 素材完成后：**检查视频素材占比>50%、图片素材占比<50%、时长符合规则1**
  - ✅ P3 视频构建前：**验证所有素材时长符合规则1**
  - ✅ P4 字幕烧录后：**立即抽帧检查单行显示 + 字体大小**
  - ❌ **禁止**：带着问题进入下一阶段
- **硬性标准**：
  - 单步骤返工上限：3次
  - 超过3次仍失败 → 向用户报告，等待指示
  - 每次返工必须记录原因和修复方案

---

### 🔴 文案开头三句改革（v10.0 新增 — 取代固定8段式）

**核心原则**：前三句必须直接点明主题/问题/价值，禁止无意义寒暄。

**前三句结构**：

| 句次 | 必须包含 | 示例 |
|------|---------|------|
| **第一句** | 核心问题或痛点 | "自媒体人最头疼的就是内容创作效率" |
| **第二句** | 解决方案（产品名） | "有了美图 RoboNeo，一个人搞定一个团队" |
| **第三句** | 核心价值 | "AI自动生成内容，速度快10倍" |

**强制规则**：
- ❌ **禁止**在开头强加"说实话"、"讲真"、"你们有没有遇到过"等无意义寒暄
- ✅ **只在需要时才使用**寒暄词（如需强调情绪对比时）
- ✅ 每句 **≤ 15 字**
- ✅ **产品名/品牌名**必须在文案中出现（如"RoboNeo"、"美图"）

**示例对比**：

```
❌ 旧（无效寒暄）：
"说实话，自媒体真的越来越难做了"
"以前我一个人又写又拍又剪"
"每天肝到凌晨数据还上不去"

✅ 新（直接有价值）：
"一个人做自媒体效率太低？"
"美图 RoboNeo 让AI帮你搞定"
"内容产出速度提升10倍"
```

**后续句式**：保持网感风格，可用8段式结构，但必须基于前三句的价值主张展开。

### 风格要求
- **语气**：专业 + 网感，敢于输出主观观点
- **语言**：大白话，专业词立刻通俗化
- **禁止**：说明书式内容、空洞口号、没有感情的陈述句
- **禁止**：无意义寒暄（"说实话"等只在需要时才用）

### 8段式结构

| 1 | 钩子开头 | 直接点明主题/问题 | 直接说问题或痛点 |
| 2 | 产品引入 | 直接引入解决方案 | "有了XX，YY变简单" |
| 3 | 核心价值 | 直接给出核心价值 | "效果Z，效率提升N倍" |
| 4 | 卖点展开 | 展开具体功能 | 逐条说明产品能力 |
| 5 | 社会证明 | 数据/用户量支撑 | "已有X人在用" |
| 6 | 使用感受 | 主观体验评价 | "用了X，我真香了" |
| 7 | 行动引导 | 引导试用/行动 | "一行命令就能跑起来" |
| 8 | 互动结尾 | 引导评论/关注 | "你更看重哪个？评论区告诉我" |

> **注意**：铁律 #6 要求视频 ≥ 40秒，需要 12-16 个场景才能满足。可拆分卖点段落或增加辅助场景。

**必须包含元素**
- ✅ **直接点明主题/问题/价值**（前三句必须，不允许跳过）
- ✅ **产品名/品牌名**在文案中出现（如"RoboNeo"、"美图"）
- ✅ **主观观点**：`最戳我的是 / 我真香了 / 这功能太绝了`
- ✅ **专业词通俗化**：LLM → "监控AI聊天的工具"；舆情监控 → "帮你盯着全网热点"
- ✅ **对比吐槽**：`以前XX，现在XX`
- ✅ **互动钩子**：`评论区告诉我 / 关注我每天一个 / 你选哪个`

**禁止出现**
- ❌ 无意义寒暄（"说实话"、"讲真"、"你们有没有遇到过" — 仅在需要时才用）
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

### 🌐 素材下载站点与搜索规则（v11.2 新增 — 从 TOOLS.md 迁移统一管理）

> ⚠️ **强制规则：必须优先搜索并使用国内站点！海外站点仅作最后备用！**
> 海外站点（Pexels/Pixabay/Coverr）常返回403/404，本机网络不稳定，禁止一上来就去海外站。
> **违反此规则 = 重复犯错，必须先搜国内再考虑海外。**

#### 国内站点（⚠️ 强制优先，必须先搜这些）

| 站点 | 网址 | 类型 | 免费政策 | 说明 |
|------|------|------|----------|------|
| 新片场 | xinpianchang.com | 视频 | 部分免费 | 国内最大创作者社区，直连稳定 |
| 新片场素材 | xinpianchang.com/square | 视频/图片 | 部分免费 | 新片场素材专区 |
| 站酷海洛 | hellorf.com | 视频/图片 | 部分免费 | 设计师素材平台 |
| 千图网 | 58pic.com | 视频/图片 | 部分免费 | 综合素材站 |
| 包图网 | ibaotu.com | 视频/图片 | 部分免费 | 商用素材 |
| 光厂 VJshi | vjshi.com | 视频 | 部分免费 | 专业视频素材平台 |
| 爱给网 | aigei.com | 视频/图片/音效 | 免费为主 | 综合免费素材站 |
| 场选素材 | changxuan.com | 视频/图片 | 部分免费 | 商用视频素材 |
| 潮点视频 | shipin520.com | 视频 | 部分免费 | 短视频素材 |
| 卓特视觉 | drore.com | 视频/图片 | 部分免费 | 专业视觉素材 |
| 抖音 | douyin.com | 短视频 | 免费 | 搜索关键词可找到实拍素材 |
| B站 | bilibili.com | 视频 | 免费 | 大量免费视频素材可下载 |
| 小红书 | xiaohongshu.com | 图片/短视频 | 免费 | 图文视频素材丰富 |
| 好看视频 | haokan.baidu.com | 视频 | 免费 | 百度旗下视频平台 |
| 网易新闻 | news.163.com | 图片/视频 | 免费 | 新闻图片视频素材 |
| 腾讯新闻 | news.qq.com | 图片/视频 | 免费 | 新闻图片视频素材 |

#### 海外站点（⚠️ 仅在国内站点全部搜完后作备用）

| 站点 | 类型 | 免费政策 | 说明 |
|------|------|----------|------|
| Pexels | 视频/图片 | 免费 | 需设置 Referer/User-Agent，否则403 |
| Pixabay | 视频/图片 | 免费 | CDN防盗链，需官方API Key |
| Coverr | 视频 | 免费 | URL常失效需搜索获取 |

#### 下载方式规范

```javascript
// ✅ 正确：设置请求头
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; Apple)',
    'Referer': 'https://www.aigei.com/'  // ← 用实际来源站
  }
})

// ❌ 错误：裸请求（触发反爬）
https.get(url)

// ❌ 错误：直接硬编码海外URL
const url = 'https://cdn.coverr.co/videos/...'
```

#### 搜索优先级（⚠️ 强制执行 — 必须先搜索后下载，禁止跳过）

1. **第一步：搜国内素材站** — 用 Tavily 搜索「AI视频评测 演示」「site:vjshi.com」「site:aigei.com」等关键词，**必须获取URL列表**
2. **第二步：搜国内平台** — 搜索结果优先取 **B站、抖音、好看视频** 等免费平台视频URL
3. **第三步：搜国内新闻站** — 网易新闻/腾讯新闻搜相关新闻配图配视频
4. **第四步：才考虑海外** — Pexels/Pixabay 需搜索后获取真实直链
5. **永远不一上来就硬编码URL**：URL常失效，必须动态获取

**🔴 强制规则：先搜索后下载，禁止跳过搜索环节**
- ❌ 禁止：直接打开 vjshi/aigei 等站点找视频（触发反爬403）
- ❌ 禁止：搜索结果还没看就尝试下载固定URL
- ❌ **禁止：遇到403/406就放弃！必须调用Tavily搜索获取新URL**
- ✅ **必须：Tavily搜索 → 获取URL列表 → 按优先级尝试下载 → 全部失败才换站点**
- ⚠️ **强制执行顺序**：遇到任何下载失败 → Tavily搜索 → 获取新URL → 继续尝试

#### 搜索工具配置

- **Tavily API Key**: `YOUR_TAVILY_API_KEY` （用户自行配置，禁止硬编码）
- **Endpoint**: `https://api.tavily.com/search`
- **用途**: 实时网络搜索，绕过反爬虫限制（搜索网页文本，无法直接下载二进制文件）
- **注意**: 免费版有 Rate Limit（每月1000次），搜索结果仅为网页链接，下载仍需其他方式
- **⚠️ 素材下载必须优先使用国内站点，Tavily 仅辅助搜索不可直接下载视频**
- **违反此规则 = 重复犯错！已第二次犯错，第三次必须主动报告！**

---

### 素材来源优先级（v10.0 更新：视频素材优先 + 三级获取方式）

**🆕 v10.0 核心变更**：视频素材占比必须 >50%，获取优先级明确。

#### 视频素材获取优先级（v10.0 强制）

| 优先级 | 获取方式 | 说明 |
|--------|---------|------|
| **P1** | 网站直接下载原文件 | CDN直链、官网下载、新闻视频URL |
| **P2** | 网页录屏 | 在相关页面进行滚屏/点击操作录屏（≤10秒/段）|
| **P3** | 文生视频兜底 | AI生成提示词生成视频（仅兜底，占比≤20%）|

**录屏操作规范**：
- 使用 FFmpeg 录屏工具或系统录屏功能
- 时长：5-15秒/段（不超过总时长的50%）
- 内容：产品界面、功能演示、操作流程
- 格式：横屏 MP4 或竖屏 MP4（H.264 + AAC）

**视频素材禁止**：
- ❌ FFmpeg testsrc/color 纯色生成视频作为视频素材
- ❌ 重复使用同一视频内容
- ❌ 视频素材占比 < 50%
- ❌ **用图片生成视频替代真实视频**（这是越权行为，见下方闭环逻辑）

#### 🔴 视频素材闭环逻辑（v11.4 新增 — 解决"遇到403就放弃"问题）

**核心原则**：一个站点失败 ≠ 视频获取失败，必须尝试完所有站点。

**获取流程（强制执行）**：


```
1. 搜索：Tavily / online-search 搜索「AI视频工具 评测 演示」等关键词
   ↓
2. 尝试下载（按以下顺序，必须全部尝试）：
   ┌─ 优先级1：网站直接下载
   │  ① 新片场 xinpianchang.com（视频/免费区）
   │  ② 光厂 VJshi vjshi.com（视频/免费区）
   │  ③ 爱给网 aigei.com（视频/免费区）
   │  ④ 抖音 douyin.com（实拍短视频）
   │  ⑤ B站 bilibili.com（评测视频）
   │  ⑥ 好看视频 haokan.baidu.com（视频）
   │  ⑦ 场选素材 changxuan.com
   │  ⑧ 潮点视频 shipin520.com
   │  ⑨ 站酷海洛 hellorf.com
   │  ⑩ 网易新闻 news.163.com
   │  ⑪ 腾讯新闻 news.qq.com
   │  ⑫ 知乎 zhuanlan.zhihu.com
   │  ⑬ 小红书 xiaohongshu.com
   │  ⑭ 卓特视觉 drore.com
   ├─ 优先级2：设置正确请求头重试（Referer/User-Agent）
   │  ① Pexels（需 Referer）
   │  ② Pixabay（需 Referer）
   │  ③ Coverr（需获取直链）
   └─ 优先级3：网页录屏兜底
       ① 产品官网演示页录屏
       ② 新闻报道页面录屏
       ※ 录屏占比 ≤ 总视频素材的 50%

   ↓
3. 全部尝试后仍失败 → 报告用户，等待指示（见下方禁止兜底规则）
```

**⚠️ 禁止兜底规则（最高优先级）**：

| 行为 | 判定 | 后果 |
|------|------|------|
| ❌ 用图片 + FFmpeg zoompan 生成"动态视频" | **越权兜底** | P2 阶段失败，返工 |
| ❌ 用 FFmpeg testsrc/color 生成视频 | **越权兜底** | P2 阶段失败，返工 |
| ❌ 用文生视频 AI 生成视频 | **越权兜底**（占20%限制仅用于图片场景的兜底，视频场景禁止） | P2 阶段失败，返工 |
| ❌ 一个站点403就停止尝试 | **越权停止** | 必须继续尝试其他站点 |

✅ **正确做法**：
- 一个站点403 → 换下一个站点继续尝试
- 所有站点都403 → **停止工作，报告用户"视频素材获取全部失败，等待指示"**
- 不写 `phase_done_P2.txt`
- 不进入 P3

**P2 验收强制检查项（v12.0 新增 - 7项全检，任一不通过 = 返工）**：

| # | 检查项 | 验收标准 | 如何检查 |
|---|--------|---------|---------|
| ① | asset文件齐全 | assets/ 下每个 scene 都有对应文件 | 检查文件存在性 |
| ② | URL来源记录 | 每个视频有 download 来源 URL 记录 | 读 video_sources.json |
| ③ | 视频时长验证 | 每个视频 ≥ 3秒，内容非 testsrc/color/纯色 | ffprobe -show_entries format=duration |
| ④ | 视频场景占比 | 视频场景数 / 总场景数 > 50% | 统计 assetType=video 数量 |
| ⑤ | 真实素材占比 | 下载的截图+视频 / 总素材数 ≥ 60% | 统计 video_sources.json + 下载截图 |
| ⑥ | 生成素材上限 | PIL/FFmpeg生成 ≤ 40% | 统计 generated 标记 |
| ⑦ | 🔴 URL白名单(v12.0) | 视频场景URL必须来自白名单域名 | bilibili/douyin/haokan/vjshi/xinpianchang/aigei/shipin520 |

⚠️ **禁止兜底（越权行为，发现即返工）**：
- ❌ 用 FFmpeg testsrc/color 生成"动态视频"
- ❌ 用纯色+文字图替代真实图片素材
- ❌ 一个站点403就停止（必须尝试完所有站点）
- ❌ 不写 video_sources.json 就标记 P2 完成
- ❌ 视频场景URL来自新闻/图片站（sohu/csdn/sina/zhihu等），见上方白名单

✅ 正确兜底策略：所有站点全部失败 → 报告用户，等待指示 → 不写 phase_done_P2.txt
| 视频时长 | 每个视频 ≥ 3秒 | ffprobe 检查 duration |
| 视频内容不同 | 任意两段视频的画面/内容必须不同 | 抽帧对比 |


**P2 子代理输出要求**：
- 必须创建 `assets/video_sources.json`，记录每个视频的下载URL
- 格式：`{ "filename.mp4": "https://source-site.com/video-url" }`
- **没有URL记录的视频 = 无法证明是真实下载 = 验收不通过**

#### 图片素材获取优先级

| 优先级 | 获取方式 | 说明 |
|--------|---------|------|
| **P1** | 产品官网截图 | 截图保存为 PNG |
| **P2** | 新闻网站配图 | 腾讯新闻/新浪/网易 搜索产品相关图 |
| **P3** | 使用搜索类 Skill 精准获取 | multi-search-engine 等 |
| **P4** | Python PIL 生成（兜底） | 仅占图片素材 ≤20%，必须使用中文字体 |

**永久禁止**：
- 🔴🔴🔴 启动浏览器获取素材（browser工具、xbrowser）
- 🔴🔴🔴 FFmpeg drawtext 处理中文（乱码）
- ❌ 通用图配特定产品文案

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

### 🔴 素材语义关键词匹配流程（v10.0 新增）

**目的**：确保素材与文案高度匹配，而非"通用好看图"。

**执行流程（P2 素材获取前必须执行）**：

1. **提取关键词**：读取文案每句，提取：
   - 产品名（如"RoboNeo"、"美图"）
   - 功能词（如"AI生成"、"多Agent"、"品牌沉淀"）
   - 场景词（如"创作者办公"、"数据看板"）

2. **搜索素材**（按优先级）：
   - 优先级1：产品官网截图/视频
   - 优先级2：新闻报道（含产品图）
   - 优先级3：搜索产品名获取相关图/视频
   - 优先级4：搜索功能词获取相关图/视频
   - **禁止**：用"AI机器人"通用图配"RoboNeo"产品文案

3. **验收匹配度**：
   - 每个场景的素材必须包含该场景的**核心关键词元素**
   - 如文案提到"RoboNeo"，素材必须有产品界面/logo/截图
   - 如文案提到"多Agent协作"，素材必须有Agent界面/协作图

**示例（RoboNeo 视频）**：

| 文案场景 | 关键词 | 素材要求 |
|---------|--------|---------|
| "直到我发现美图新出的 RoboNeo" | RoboNeo、美图 | ✅ 产品官网截图/Logo
| "多AI Agent 配合干活" | 多Agent、协作 | ✅ Agent界面/协作动画
| "品牌资产自动沉淀" | 品牌、数据看板 | ✅ 数据管理界面截图 |
| ❌ "一个人就是一个团队" | 通用 | ❌ 禁止用通用AI机器人图

**工具建议**：使用搜索类 Skill（如 multi-search-engine）获取精准素材 URL，再下载。

**视频素材强制规则（v9.0）**：
- ✅ 必须 ≥ 2 段**内容不同**的真实视频素材
- ✅ 两段视频的内容/场景/视觉效果**必须不同**
- ❌ **禁止**：同一段视频素材（如同一个 testsrc）用于 2 个场景
- ❌ **禁止**：两段视频内容/画面完全相同
- **视频素材来源优先级**：产品官网 Demo > 新闻报道 > 官方账号 > YouTube/B站评测 > Pexels/Pixabay > FFmpeg AI生成（兜底≤20%）

### 素材检查清单（v9.0 更新）
- [ ] 素材数 ≥ 场景数？
- [ ] 没有素材重复使用？
- [ ] **真实视频素材 ≥ 2 段，内容不同**？
- [ ] **每张图片素材语义匹配文案**（产品/品牌/功能关键词优先官网/新闻获取）？
- [ ] 每张素材有对应的 Ken Burns 动画效果？
- [ ] **8种效果全部覆盖**？（按index轮流分配，v9.0稳态参数）
- [ ] **验收记录**：每个场景的文案关键词 → 素材来源 URL

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

### 8种 Ken Burns 动画效果（v9.0 更新：缓速无晃动，永久替代 v4.0）

> **⚠️ v9.0 永久替代 v4.0 参数**：旧参数（+0.002/帧、0.5*on）导致 zoom 快速触达上限后重置，产生明显画面晃动。
> **v11.1 新增**：`zoom-out` 条件表达式 `if(eq(on,0),...)` 在 FFmpeg 4.4 的 zoompan 滤镜中不稳定，改为简化写法 `max(zoom-0.0002,1.0)`。
> **效果对比**：以 2.5s@30fps 图片为例，旧参数走150步→触发1.3重置→跳帧；新参数走15步→全程平稳无重置。

| 效果名 | 描述 | zoompan 滤镜参数（FFmpeg 4.4 兼容）|
|--------|------|------------------|
| `zoom-in` | 经典 Ken Burns 放大（缓慢，无晃动） | `z='min(zoom+0.0002,1.3)':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)` |
| `zoom-out` | 从局部拉远至全局（缓慢） | `z='max(zoom-0.0002,1.0)':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)` |
| `pan-left` | 镜头从右向左扫 | `x='iw/2-(iw/zoom/2)+0.08*on':y='ih/2-(ih/zoom/2)'` |
| `pan-right` | 镜头从左向右扫 | `x='iw/2-(iw/zoom/2)-0.08*on':y='ih/2-(ih/zoom/2)'` |
| `pan-up` | 镜头向上推 | `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-0.08*on'` |
| `pan-down` | 镜头向下推 | `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+0.08*on'` |
| `zoom-pulse` | 缩放脉冲节奏感（v9.0缓） | `z='1+0.008*sin(1*n)':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)` |
| `diagonal` | 对角线移动（轻微，无剧烈晃动） | `x='iw/2-(iw/zoom/2)-0.04*on':y='ih/2-(ih/zoom/2)-0.03*on'` |

**⚠️ zoom-out 简化写法（v11.1 强制）**：
- ❌ 旧：`z='if(eq(on,0),1.3,max(zoom-0.0002,1.0))'` — 条件表达式不稳定
- ✅ 新：`z='max(zoom-0.0002,1.0)'` — 线性递减，永不重置

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

**铁律 C：字体大小（按视频格式区分）**
- 横屏1920x1080下，FontSize **56-72px**（推荐64px）
- 竖屏1080x1920下，FontSize **40-48px**（推荐44px）
- 验收：抽帧检查，字幕占画面高度约5-8%（横屏），5-8%（竖屏）

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
FontSize=64            # 横屏64px，竖屏44px（按视频格式选择）
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
- [ ] **字体大小**：横屏56-72px，竖屏40-48px
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
- **尺寸**：横屏 **1920×1080（16:9）** 或竖屏 **1080×1920（9:16）**，格式与视频一致
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

### 🔴 竖屏布局规范（v11.8 新增）

**三区域结构（1080×1920）**：

| 区域 | 高度范围 | 占比 | 内容 |
|------|---------|------|------|
| 标题区 | y=0..384px | 20% | **显示当前场景的文案标题**（drawtext 或 overlay PNG） |
| 素材区 | y=384..1248px | 65% | 素材居中显示，左右黑边填充 |
| 字幕区 | y=1248..1920px | 15% | 字幕（SRT烧录，距底部80-120px） |

**标题显示规则**：
- **标题内容**：取 config.json 中该场景的 `text` 字段（智能断句后的第一句）
- **标题位置**：y=180px（标题区中心），水平居中
- **标题样式**：FontSize=36px，白色+黑色描边，FontName=SimHei
- **FFmpeg 实现**：
  ```
  drawtext=text='标题内容':fontfile=SimHei.ttf:fontsize=36:fontcolor=white:x=(w-text_w)/2:y=180:borderw=2:bordercolor=black
  ```

**素材处理规则**：
- 图片：`scale=1080:-1` 后 overlay 到黑底 `(W-w)/2:(H-h)/2`
- 视频：`scale=w=min(1080,iw*1920/ih):h=min(1920,ih*1080/iw)` + `pad=1080:1920:(ow-iw)/2:(oh-ih)/2=black`

**字幕位置规则**：
- 竖屏字幕距底部 80-120px（MarginV=100）
- 字号 40-48px（推荐44px）
- 单行显示，≤15字

---

## 常见陷阱（v4.0 更新）

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| **FFmpeg execSync 抛异常** | stderr 被当作错误 | 用 `stdio: 'ignore'` 或 `['pipe','pipe','pipe']` |
| **isolated session Canvas SIGKILL** | CPU 密集触发系统终止 | 改用 FFmpeg zoompan 原生滤镜 |
| **drawtext 中文全失败** | Windows subprocess 编码冲突 | **用 SRT 文件 + subtitles 滤镜替代** |
| **zoompan `t/浮点数` 失败** | FFmpeg 4.4 不支持除法表达式 | 用预计算乘法或 `on` 变量替代 |
| **zoompan `sin(t)` 失败** | FFmpeg 4.4 zoompan 不支持 sin(t) | 用 `sin(ON)` 替代（**大写 ON**）|
| **竖屏布局设计** | 需要分区域（标题/素材/字幕） | **按竖屏布局规范**：上方针题区+中间素材居中+下方字幕区 |
| **"步骤过多自动中止"** | P3 视频构建 16场景×3步≈48步，超单会话 step 上限 | **v6.0 子代理架构**：P2/P3 由 `sessions_spawn` 独立执行 |
| **子代理超时** | 默认超时可能不够 | P2 设 600s，P3 设 900s (`runTimeoutSeconds`) |
| **会话 compacted 后状态丢失** | compaction 丢失 exec 结果 | 依赖 `.task-state.json` + `phase_done_P{n}.txt` 而非会话内存 |
| **子代理失败无法恢复** | 子代理崩溃无重试 | 心跳检测 → 重新 spawn（retryCount < 3）|
| **竖屏素材处理** | 下载的图大多是横屏 | **居中适应宽度，上下黑边填充**，横屏素材完全兼容 |
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


## 🚨 硬性规则：禁止截断配音
- **绝对禁止**使用 -shortest 或任何截断音频的选项
- 最终视频时长 **必须等于或大于** TTS配音时长
- 如果视频素材不够长，**必须循环/扩展**而非截断配音
- 验收时必须检查：最终视频时长 >= TTS时长

