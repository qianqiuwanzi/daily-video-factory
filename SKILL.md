---
name: daily-video-factory
description: 自媒体短视频全自动生产线 v13.8(最新:v13.7 + 字幕时序切换+V10单行逐行显示+overscan切除B站水印)。从选题研究、网感文案撰写、TTS配音、真实素材准备、Ken Burns动画视频合成、封面设计到云盘上传的全流程自动化。
---

# 每日视频工厂 - 全自动短视频生产线 v13.7

从选题到上传,一站式完成每日短视频内容生产。

> **更新(v12.7)**:v12.6 + 主标题标点分两行+不显示小标题;双行标题规范(主标题62px金色+小标题44px白色+行间距44px+加粗字体):v12.5 + #5.5竖屏标题强制规则(缺失标题=不通过)(任务指定尺寸必须匹配);P2b 第8项尺寸门禁(每个视频下载后验证 w>h,竖屏立即删除);素材朝向错误典型案例:BV1EwRQBLEaz(竖屏9:16)混入P3。
> **更新(v12.4)**:抖音+视频号合并为一条视频,**尺寸由外部任务调用时指定**,不再写死分辨率。

## ⚠️ 验收铁律(违反 = 拒绝发布)

**详细规则见:`ACCEPTANCE_RULES.md`**

| # | 规则 | 最低要求 | 原因 |
|---|------|---------|------|
| #0 | **素材唯一性+真实性** | 必须**网上下载真实截图,15张全不同**,真实≥60% | 禁止重复素材、禁止100%生成 |
| #1 | **视频格式** | 横屏 **1920×1080(16:9)** 或竖屏 **1080×1920(9:16)**,由用户指定 | 禁止方形或其他错误比例 |
| #2 | 文件大小 | ≥ 1MB | 有真实素材 > 5MB |
| #3 | 禁止纯色/生成图 | 必须有**真实照片/截图**,生成图≤40%,纯色≤20% | Canvas 文字卡片 = 不通过 |
| #4 | 动态效果 | **8种Ken Burns效果强制覆盖** | 禁止静态,禁止<8种 |
| #5 | **字幕** | ≤15字/行,**单行显示**,**音画同步**,横屏32px(标准28-36px)/竖屏42px(标准36-48px) | 禁止多行,禁止不同步 |
| #5.5 | **双行标题(竖屏视频强制)** | 竖屏视频**必须**在顶部显示双行标题(主标题+小标题),加粗字体,缺失=不通过 | 主标题62px金色(#FFD700) + 小标题44px白色(#FFFFFF),行间距44px,msyhbd.ttc加粗 |
| #6 | 视频时长 | **45-120秒** | 内容紧凑不拖沓 |
| #7 | **视频素材** | **>50%视频场景**,真实视频素材 | 真实视频增强说服力 |
| #8 | 多重特效 | ≥ 8种(FFmpeg4.4兼容) | 见 ACCEPTANCE_RULES.md v5.1 |
| #11 | **真实素材比例** | **真实素材≥60%,生成≤40%,纯色≤20%** | 禁止100%生成凑数 |
| #12 | **P3素材处理:禁止拉伸变形** | 素材必须保持宽高比,用黑边填充到目标尺寸 | 错误:zoompan:s=1080x1920 强制拉伸;正确:scale=1080:-1 → pad=1080:1920 |

## 🔴 素材搜索下载铁律(2026-05-14 新增,最高优先级)

1. **Tavily优先**:所有素材搜索必须先使用Tavily(脚本: D:/workspace/scripts/tavily_search.cjs),online-search仅作兜底
2. **静默方式**:禁止打开浏览器(xbrowser/browser)获取素材,全部通过HTTP/yt-dlp静默下载
3. **PIL兜底≤20%**:PIL生成仅限无法下载时使用,占比不超过总场景的20%

## 流水线总览

```
P0 选题(主会话) → P1 文案(主会话) → P2a 搜索(主会话exec) → P2b 素材(主会话exec) → P3 视频(逐场景主会话exec) → P4 交付(主会话)
   09:00              09:10              09:20              09:30
```

> **核心变化(v12.4)**:抖音+视频号合并为一条视频,尺寸由外部任务指定,不再写死分辨率。

### 🔴 P0 选题研究阶段(v13.7 新增 - 强制)

**根因**:P1 文案没有来源依据 → 内容包无参考链接 → P2 搜索无精准关键词 → P3 素材质量差。

**P0 强制步骤**:
1. **选题来源必须来自以下渠道之一**:
   - 用户指定的热点话题/产品 → 记录用户原始消息
   - online-search 搜索近期热点 → 记录搜索结果URL
   - 参考文章/竞品分析 → 记录参考文章URL
   - 用户历史偏好(MEMORY.md)→ 记录偏好来源
2. **内容包.md 必须包含`## 选题来源`字段**:
   ```markdown
   ## 选题来源
   - 来源类型: [用户指定 | 热点搜索 | 参考文章 | 历史偏好]
   - 参考链接:
     - https://xxx.com/article1 (标题)
     - https://xxx.com/article2 (标题)
   - 选题理由: 为什么选这个选题(1-2句话)
   ```
3. **validate_p1.py 增加 Constraint 7**:检查 内容包.md 是否包含`## 选题来源`且有至少1条链接
4. **P0 完成标志**:`phase_done_P0.txt`(在 P1 之前写)

**为什么需要这个阶段**:
- P2 搜索依赖精准关键词 → 关键词来自参考文章标题/热点词
- P3 素材可匹配性 → 来源于选题研究的实际案例
- 文案事实准确性 → 来自参考文章的数据支撑

**P3 素材处理规则(v12.8 新增 - 禁止拉伸变形)**:
| 类型 | FFmpeg 命令 | 说明 |
|------|------------|------|
| ❌ 错误 | `scale=1080:-1,zoompan:s=1080x1920` | zoompan强制输出固定尺寸,导致素材变形拉伸 |
| ✅ 正确 | `scale=1080:-1,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black` | scale缩放到宽度1080,保持宽高比;pad填充黑边到目标尺寸 |

**规则**:素材必须始终保持宽高比不变,用黑边填充而不是拉伸变形。

### 🔴 v8.0 主会话强制轻量规则(最高优先级)

**核心原则:主会话永远不直接执行重量级操作。**

当用户发起视频制作任务时,主会话的职责只有:
1. **P1**:生成文案 + config.json(轻量,约5-8步)
2. **立即 exec**：P2 和 P3 主会话exec脚本
3. **等待 + 验收**：检查每个阶段的输文件（`phase_done_P{n}.txt`）
4. **P4**:封面 + 内容包 + 最终交付

**主会话绝对禁止做的事（违者 = 立即 exec 脚本）：**
- ❌ 直接执行 FFmpeg 命令（写 Python/JS 脚本exec执行）
- ❌ 直接调用 edge-tts 生成 TTS（exec Python脚本）
- ❌ 直接读写多个文件（exec Python/JS 脚本）
- ❌ 直接下载素材（exec Node.js脚本）
- ❌ 直接截图网页
- ❌ **禁止 spawn 子代理做 P2a/P2b（v13.9新增）**

**主会话可以做的事:**
- ✅ 生成文案 + config.json
- ✅ 写 phase_done 文件
- ✅ 更新 .task-state.json
- ✅ 读取并检查文件(验收)
- ✅ 生成封面(轻量)
- ✅ 写内容包.md

**为什么这个规则有效:**
- **P2/P3 由主会话 exec 执行**，不 spawn 子代理（v13.9 消除子代理超时）
- **主会话 exec 超时**：P2a(5分钟)、P2b(10分钟)、P3单场景(2分钟)、P3组装(5分钟)
- 主会话被 SIGKILL → 下次心跳根据 `.task-state.json` 恢复 → 从断点继续
- **P3 断点续传**：phase_done_P3_{n}.txt 记录完成场景，恢复时跳过

### 🏗️ v13.9 主会话执行模型(核心变更 - 2026-05-17 重设计)

**根因**:连续8天(5/10-5/17)P2/P3子代理超时,3种超时模式:0-token卡死/工作超时/任务过重。

**解决方案**:P2a/P2b改为主会话exec(消除子代理依赖),P3改为场景级微批处理+断点续传。

```
主会话
  │
  ├─ P1 文案+TTS (主会话内执行,约10步)
  │    └─ 写 phase_done_P1.txt
  │
  ├─ P2a 搜索 (主会话exec,5分钟超时)
  │    └─ node p2a_search.js → 写 phase_done_P2a.txt
  │
  ├─ P2b 下载 (主会话exec,10分钟超时)
  │    │  主会话exec node p2b_download.js → python validate_p2b.py → 写 phase_done_P2.txt
  │    └─ ⚠️ 禁止spawn子代理做P2a/P2b
  │
  ├─ P3 场景级微批 (逐场景主会话exec,2分钟/scene)
  │    │  for scene 1..N: exec p3_single_scene.js → 验证文件 → 写 phase_done_P3_{n}.txt
  │    │  中断恢复:跳过已完成的场景(检查 phase_done_P3_{n}.txt)
  │    └─ 全部完成 → exec p3_assembly.py(concat+音频+字幕,5分钟) → phase_done_P3.txt
  │
  └─ P4 交付(主会话内执行,约10步)
       └─ 封面 + 内容包 + 最终验收
```

### .task-state.json 状态机(v13.9 - 无子代理版)

每个项目目录必须维护此文件,用于断点续传和心跳恢复:

```json
{
  "taskId": "kling-4k-20260517",
  "date": "2026-05-17",
  "outputDir": "D:/workspace/MediaContentCreation/2026-05-17",
  "phases": {
    "P1": { "status": "done", "completedAt": "2026-05-17T10:00:00+08:00" },
    "P2a": { "status": "done", "completedAt": "2026-05-17T10:05:00+08:00" },
    "P2b": { "status": "done", "completedAt": "2026-05-17T10:15:00+08:00" },
    "P3": { "status": "running", "currentScene": 5, "totalScenes": 12 },
    "P4": { "status": "pending" }
  },
  "currentPhase": "P3",
  "retryCount": { "P1": 0, "P2a": 0, "P2b": 0, "P3": 0, "P4": 0 },
  "errors": []
}
```

**状态值**:`pending` | `running` | `done` | `failed`

**心跳恢复逻辑(v13.9 - 无子代理)**:
```
心跳 → 读取 .task-state.json
  ├─ currentPhase=P3 且 currentScene < totalScenes → 从断点继续P3场景
  ├─ currentPhase=done 且下一阶段=pending → 自动进入下一阶段
  ├─ currentPhase=failed → 通知用户,等待指示
  └─ currentPhase=running → 正常,跳过
```

### ⚠️ 主会话exec超时与恢复规范(v13.9)

**超时阈值**:
| 阶段 | 执行方式 | 超时 | 断点续传 |
|------|----------|------|---------|
| P2a | 主会话exec | 5分钟 | 检查phase_done_P2a.txt |
| P2b | 主会话exec | 10分钟 | 检查phase_done_P2.txt |
| P3单场景 | 主会话exec | 2分钟 | phase_done_P3_{n}.txt逐场景检查 |
| P3组装 | 主会话exec | 5分钟 | 检查phase_done_P3.txt |

**断点续传机制**:
1. 每阶段开始前检查 phase_done_P{n}.txt → 存在则跳过
2. P3:逐场景检查 phase_done_P3_{n}.txt → 已完成的跳过,从断点继续
3. 中断后心跳恢复:读取 .task-state.json → 从 currentPhase 继续
4. 失败后从检查点继续,而非重头开始

**失败处理(主会话责任)**:
1. exec 超时 → 检查已生成文件 → 从断点续传
2. 验证不通过 → 修复 → 重新exec该阶段(不重做已完成工作)
3. 连续3次超时 → 检查系统资源 → 通知大卫决策

---

### exec 调用模板(v13.9 - 主会话直执行)

**P2 素材阶段 v13.9 重构(主会话exec,消除子代理依赖)**

P2 拆分为两个阶段,由主会话通过exec直接执行脚本,不再spawn子代理。

```bash
# === P2a: 搜索阶段(主会话exec) ===
# 脚本路径: {SKILL_DIR}/scripts/p2a_search.js
node "{SKILL_DIR}/scripts/p2a_search.js" --output "{outputDir}"
# 超时: 5分钟 (300000ms)
# 完成后: 写 {outputDir}/phase_done_P2a.txt
```

```bash
# === P2b: 下载阶段(主会话exec) ===
# 脚本路径: {SKILL_DIR}/scripts/p2b_download.js
node "{SKILL_DIR}/scripts/p2b_download.js" --output "{outputDir}"
# 超时: 10分钟 (600000ms)
# 完成后运行自动化验收:
python "{SKILL_DIR}/scripts/validate_p2b.py" "{outputDir}"
# exit code=0 → 写 {outputDir}/phase_done_P2.txt
```

```bash
# === P3: 场景级微批处理(主会话exec,逐场景) ===
# 逐场景执行,每个场景独立超时2分钟
for /l %i in (1,1,{totalScenes}) do (
  node "{SKILL_DIR}/scripts/p3_single_scene.js" --scene %i --output "{outputDir}"
  # 验证 scene_%i_processed.mp4 存在且size>0
  # 写 {outputDir}/phase_done_P3_%i.txt
)
# 全部完成后:
python "{SKILL_DIR}/scripts/p3_assembly.py" --output "{outputDir}"
# 超时: 5分钟 (300000ms)
# 完成后: 写 {outputDir}/phase_done_P3.txt
```

⚠️ **禁止spawn子代理做P2a/P2b** — 改用exec直接执行脚本。

### 环境预热检查(减少0 tokens问题)
在执行任何脚本前,主会话必须验证:
```bash
# Python3可用
python --version
# FFmpeg路径正确
"D:/software/ffmpeg-4.4-essentials_build/bin/ffprobe.exe" -version
# Node.js可用
node --version
# yt-dlp可用(用于B站下载)
yt-dlp --version
```
不通过→主会话修复→确认后再exec。

---
### 🔴 P3 新增规则(v13.7 深度复盘固化)

#### 1. FFmpeg setdar 正确用法
- ❌ 错误:`setdar=1` → 把1080×1920竖屏的DAR设为1:1(正方形),视频被压扁+上下白边
- ✅ 正确:`setdar=9/16` → 竖屏1080×1920的正确DAR
- **强制验证**:每次DAR修改后运行 `ffprobe -v error -select_streams v:0 -show_entries "stream=display_aspect_ratio" -of csv=p=0 video.mp4` 确认结果

#### 2. 字幕时序单行显示(v13.8 V10突破 - 覆盖v12.4单行+v13.7多行规则)

**核心理解**:
- **"单行显示" = 逐行切换**(配音读到哪句显示哪句,上一句消失)
- **字幕是时序元素**,不是静态图片叠加,也不是多行堆叠
- **`\n` 双重用途**:TTS朗读断句 + 字幕切换时间标记

**实现方法**:
1. 按 `\n` 分割文本为独立字幕行(每行≤15字)
2. 每行渲染为独立PNG(80px高,48px白色加粗+黑阴影,底部居中)
3. 每行loop为独立子视频(时长按字数比例分配:`line_chars/total_chars × tts_duration`)
4. 所有子视频concat为完整字幕流(yuva420p透明通道)
5. 字幕流overlay到主视频(`overlay=0:H-h-120`)

**禁止做法**:
- ❌ 多行堆叠(同时显示多行)
- ❌ 只取首行(丢弃后文)
- ❌ 合并全文截断(拦腰切断)

**实现函数**:`build_sequential_subtitles()` → 每行PNG → 子视频 → concat → overlay

#### 3. B站视频格式协商三步法
B站1080P/720P需大会员登录,匿名用户必须用免费格式:
```
Step 1: yt-dlp --list-formats "https://www.bilibili.com/video/BVxxx/"
         → 输出格式列表,找到免费格式ID(通常480P,ID如30032)
Step 2: yt-dlp --no-playlist -f <免费格式ID> -o output.mp4 "BV_URL"
Step 3: ffprobe验证下载结果(分辨率+时长)
```
- 禁止直接 `yt-dlp -f best`(会被B站拒绝)
- 格式降级:HD失败→480P→360P→图片兜底

#### 4. B站水印 overscan 切除(v13.8 修正)

**根因**:B站水印在左上角+右上角(不是右下角!),一直裁右下角完全无效

**正确方案**:scale放大+切边(V8/V10成功)
- 所有B站视频源:scale=1240 → pad=1240×1920 → 从对应侧crop回1080×1920
- 左上水印:crop=1080:1920:160:0(切左边160px)
- 右上水印:crop=1080:1920:0:0(切右边160px)

**强制验证**:下载后抽帧检测水印位置,不凭经验假设
**禁止**:crop右下角(无效)+ delogo滤镜(AV1不支持)

#### 5. 搜索工具局限性
- Tavily/online-search 返回的是**新闻文章URL**,不是B站视频播放页(`bilibili.com/video/BVxxx`)
- 需要播放页URL才能用yt-dlp下载
- 搜索关键词应包含视频平台+视频关键词(如"霍去病 AI短剧 site:bilibili.com")

---

### 🔴 P3 字幕烧录铁律(v12.4 强制 - 防止 final.mp4 无字幕)

**问题根因**:P3 合成视频后,若后续做分辨率转换(横→竖/竖→横),转换脚本未重新烧录字幕 → 最终输出无字幕。

**强制规则**:
1. **字幕必须在最后一步烧录**:任何分辨率/格式转换操作之后,必须重新烧录字幕
2. **禁止链式转换丢失字幕**:如果视频经过 scale/crop/pad/concat 等操作,最终输出前必须用 `subtitles` 滤镜重新烧录
3. **最终输出文件必须含字幕**:P3 输出的 `final.mp4` / `final_video.mp4` 必须通过抽帧验证有可见字幕
4. **验收不通过 = P3 未完成**:即使视频拼接完成,字幕缺失也视为 P3 未完成,不能进入 P4
5. **字体路径**:Windows 下 subtitles 滤镜的 Fontname 可能渲染为方块,推荐用 **ASS 文件 + fontfile 绝对路径**(见 Windows ASS 路径 bug 说明)

**正确流程**:
```
拼接片段 → combined_raw.mp4
  → 混音 TTS → douyin_video.mp4(带字幕)
    → 分辨率转换(如需要)→ 转换后重新烧录字幕 → final.mp4 ✅
```

**错误流程**(禁止):
```
拼接片段 → combined_raw.mp4
  → 混音 TTS → douyin_video.mp4(带字幕)
    → 分辨率转换 → final.mp4 ❌(字幕丢失!)
```

### 执行流程(主会话代码)v13.9 - P2主会话exec + P3场景级微批

```javascript
// 伪代码:主会话执行流水线 v13.9 - 消除子代理超时
async function runPipeline(outputDir, date) {
  // P1: 主会话内执行(文案+TTS+config.json)
  await runP1(outputDir);
  await writePhaseDone(outputDir, 'P1');
  await updateTaskState(outputDir, 'P1', 'done');

  // ========== P2a: 搜索阶段(主会话exec,5分钟超时)==========
  await updateTaskState(outputDir, 'P2a', 'running');
  // 【新v13.9】主会话exec搜索脚本(不spawn子代理)
  const searchScript = path.join(SKILL_DIR, 'scripts', 'p2a_search.js');
  execSync(`node "${searchScript}" --output "${outputDir}"`, { timeout: 300000 });
  // 主会话验收:检查searchResults.json存在且非空
  const searchResults = readJson(outputDir + '/assets/video_search_results.json');
  const validUrls = searchResults.scenes.flatMap(s => s.urls)
    .filter(u => /bilibili\.com|douyin\.com|haokan\.baidu|vjshi\.com|xinpianchang\.com|aigei\.com|shipin520\.com/.test(u));
  if (validUrls.length < 3) throw new Error(`P2a验收失败:有效URL=${validUrls.length}`);
  writePhaseDone(outputDir, 'P2a');
  await updateTaskState(outputDir, 'P2a', 'done');

  // ========== P2b: 下载阶段(主会话exec,10分钟超时)==========
  const config = readJson(outputDir + '/config.json');
  const scenes = config.platforms.douyin.scenes;
  const vc = scenes.filter(s => s.assetType === "video").length;
  const ic = scenes.filter(s => s.assetType === "image").length;
  console.log("[P2b] 场景总数:" + scenes.length + " 视频:" + vc + " 图片:" + ic);
  if (vc === 0) throw new Error("config.json中无assetType=video场景");
  await updateTaskState(outputDir, 'P2b', 'running');
  // 【新v13.9】主会话exec下载脚本(不spawn子代理)
  const downloadScript = path.join(SKILL_DIR, 'scripts', 'p2b_download.js');
  execSync(`node "${downloadScript}" --output "${outputDir}"`, { timeout: 600000 });
  // 【关键】主会话运行validate_p2b.py验收
  execSync(`python "${SKILL_DIR}/scripts/validate_p2b.py" "${outputDir}"`);
  // 验证exit code=0后才写phase_done
  writePhaseDone(outputDir, 'P2b');
  await updateTaskState(outputDir, 'P2b', 'done');


  // ========== P3: 场景级微批处理(逐场景主会话exec)==========
  await updateTaskState(outputDir, 'P3', 'running');
  // 【新v13.9】按scene逐个处理,每个2分钟
  for (let i = 1; i <= scenes.length; i++) {
    if (exists(path.join(outputDir, 'phase_done_P3_' + i + '.txt'))) {
      console.log("[P3] scene_" + i + " 已完成,跳过");
      continue;  // 断点续传
    }
    console.log("[P3] 处理场景 " + i + "/" + scenes.length);
    // 每场景主会话exec
    const p3SceneScript = path.join(SKILL_DIR, 'scripts', 'p3_single_scene.js');
    execSync(`node "${p3SceneScript}" --scene "${i}" --output "${outputDir}"`, { timeout: 120000 });
    // 立即验证输出文件存在
    const outputFile = path.join(outputDir, 'processed', 'scene_' + i + '.mp4');
    if (!exists(outputFile) || getSize(outputFile) < 1000)
      throw new Error(`scene_${i} 输出文件异常`);
    writePhaseDone(outputDir, 'P3', i);
  }
  // 全部scene完成 → 主会话exec concat+组装+音频
  console.log("[P3] 拼接+组装+音频");
  const assemblyScript = path.join(SKILL_DIR, 'scripts', 'p3_assembly.js');
  execSync(`python "${assemblyScript}" --output "${outputDir}"`, { timeout: 300000 });
  writePhaseDone(outputDir, 'P3');
  await updateTaskState(outputDir, 'P3', 'done');

  // P4: 主会话内执行(封面+内容包+最终验收)
  await runP4(outputDir);
}
```

### ⚠️ v13.9 新规则:禁止spawn子代理做P2a/P2b

---

## ⚠️ 流程铁律(违反 = 返工)

**TTS 是内容锚点,所有后续步骤以 TTS 为准。**

```
1. 写文案(网感8段式)
2. 生成 TTS 配音(用文案生成 mp3)
3. 【关键】将 TTS 的实际文字同步写入 config.json.scenes[].text
4. 准备素材(确保 ≥ 场景数量,禁止重复)
5. build_video(**每段图片视频时长 = min(对应 TTS 时长, 5秒),图片场景不超过5秒**)
6. 封面 + 内容包
7. 质量检查
8. 交付
```

### 🔴 分步验收铁律(v5.2 新增,最高优先级)

**核心原则:每一步必须验收合格,才允许进入下一步。不合格立即返工,不允许跳过验收。**

| 步骤 | 验收项 | 不合格处理 |
|------|--------|-----------|
| 1. 文案 | 8段式结构完整?口语化?有互动结尾?**每句≤15字?≥2个视频场景标注?** | 重写文案/拆分长句 |
| 2. TTS | 每段mp3正常?总时长45-120秒? | 重新生成 |
| 3. config | text=TTS原文?场景数正确?**text全部≤15字?assetType=video≥2?** | 修正配置 |
| 4. 素材 | ≥场景数?无重复?真实截图≥80%?语义匹配?**视频素材≥2段已下载?** | 补充/替换素材 |
| 5. 视频 | 按ACCEPTANCE_RULES.md全项检查(#0-#10) | 重新合成 |
| 6. 封面 | 尺寸与视频一致 PNG?(竖屏1080×1920 / 横屏1920×1080) | 重新生成 |
| 7. 内容包 | 标题/正文/标签/时间轴完整? | 补充 |
| 8. 交付 | 视频可播放?文件完整? | 修复 |

**四阶段流水线(v13.9 主会话exec):**
```
P1  文案  主会话    → 生成 config.json + 文案 + TTS → phase_done_P1.txt
P2a 搜索  主会话exec → node p2a_search.js → phase_done_P2a.txt
P2b 下载  主会话exec → node p2b_download.js → python validate_p2b.py → phase_done_P2.txt
P3  视频  主会话exec → 逐场景 p3_single_scene.js → concat+assembly → phase_done_P3.txt
P4  发布  主会话    → 封面 + 交付包
```
- P2a/P2b 由主会话 exec 直接执行脚本(禁止 spawn 子代理)
- P3 场景级微批处理,逐场景 exec(2分钟/scene)+ 断点续传(phase_done_P3_{n}.txt)
- `.task-state.json` 记录完整状态,用于心跳恢复和断点续传

### 分步验收执行规则(cron 场景)

每个阶段完成后,**必须先执行验收,通过后才写 `phase_done_P{n}.txt`**。

```
P1 完成文案+TTS → 验收文案结构、TTS质量、**每句文案≤15字、≥2个视频场景标注、每个scene有keywords、config.json有resolution、只有1条视频平台配置(禁止douyin+shipinhao同时存在)** → ✅通过 → 写 phase_done_P1.txt
P2 完成素材   → **运行 validate_p2b.py 全检**(7项门禁):1assets非空 2文件size>0 3ffprobe/PIL验证横屏 4video_sources.json完整 5视频场景>50% 6MD5去重 7真实素材≥60% → exit 0✅通过 → 写 phase_done_P2.txt | exit 1❌不通过 → 返工,不写phase_done,不进P3
P3 完成视频   → 验收全项 ACCEPTANCE_RULES(**重点检查#5字幕长度、#7视频素材**) → ✅通过 → 写 phase_done_P3.txt
P4 完成交付   → 验收文件完整性 → 交付
```

**如果某阶段验收不通过,立即返工该阶段,不写 phase_done 文件,不进入下一阶段。**

**🔴 完成标记诚信规则(v11.8 新增 - 解决"video_ratio_pass: false仍写phase_done"问题)**:
- ❌ **严格禁止**:在6项质量门禁**全部通过之前**写 `phase_done_P2.txt`
- ❌ **严格禁止**:验收过程中发现任意一项不通过,仍写 `phase_done_P2.txt`
- ❌ **严格禁止**:子代理因超时退出时,将已有文件当作"完成"标记
- ❌ **严格禁止**:子代理声称完成但文件未更新(如MD5/时间戳未变)
- ✅ **正确行为**:
  1. 先执行全部门禁验证(123456)
  2. 全部PASS → 才写 `phase_done_P2.txt`
  3. 任意一项FAIL → **不写** → 如实报告哪项失败 → 等待指示
- **典型错误案例(2026-05-08)**:
  - ❌ `video_sources.json` 写了 `video_ratio_pass: false`,但仍写 `phase_done_P2.txt`(明知不通过还写=诚信问题)
  - ❌ 4个视频MD5完全相同(同一视频复制4次),但仍写 `phase_done_P2.txt`(自欺欺人)
  - ✅ MD5检查发现重复 → 停止 → 报告"视频MD5重复,验收不通过" → 等待指示
- **典型错误案例(2026-05-13)**:
  - ❌ 子代理报告"已修复 scene_06/07/10",但文件MD5/时间戳全部未变(声称完成但工作未做=诚信问题)
  - ❌ 根因:子代理的激励方向是"报告完成"而非"确保工作真实完成"
  - ✅ 修复:主会话 spawn 后必须**独立验证交付物**(检查MD5/时间戳/内容是否真的改变了)

---

## 第一步:选题研究

### ⚠️ 小红书:必须调用 xhs-note-creator 技能
制作小红书图文内容时,必须先加载 `xhs-note-creator` 技能,按技能规范执行。

### 信息源
- **GitHub Trending** - 开源项目热门
- **ProductHunt** - 新产品发布
- **HackerNews** - 技术社区热议
- **微信公众号/知乎** - 国内热点
- **用户指定** - 品牌方提供产品/话题

### 信息收集清单
- [ ] GitHub 仓库地址 + Stars 数
- [ ] 官网链接
- [ ] 核心功能(3-5条,用"一句话说人话")
- [ ] 目标用户痛点
- [ ] 部署方式(一行命令 / Docker / 云端)
- [ ] 社会证明(用户数、平台覆盖数)

### 选题标准
1. 目标受众感兴趣(AI、效率工具、开发相关)
2. 有具体数据/数字可引用(增强可信度)
3. 有痛点或亮点可放大
4. 适合 40-60 秒短视频表达(注:铁律 #6 要求 ≥ 40秒,规划 12-16 个场景)

---

## 第二步:文案撰写(网感规则 v3.0)

### ⚠️ v6.1 核心变更:两项前置约束(从源头杜绝返工)

**约束 1:每句文案必须 ≤ 15 字(字幕铁律前置到 P1)**
- **原因**:后续 TTS → 字幕流程中,每行字幕直接对应一句文案。如果 P1 写出长句,P3 再怎么 smart_split 也断不干净。
- **规则**:config.json 中每个 scene 的 `text` 字段 **必须 ≤ 15 字(含标点)**
- **验收**:P1 完成后逐条检查 scenes[].text 长度,超标的立即拆分
- **示例**:
  - ❌ `"text": "DeepSeek这波降价真的把我震惊到了"` (17字)
  - ✅ `"text": "DeepSeek这波降价太狠了"` (11字)
  - ✅ `"text": "直接降到原来的十分之一"` (12字)

**约束 2:按语义组分配素材,禁止一句一场景(v13.7 强制重构)**
- **原因(2026-05-15 深度分析)**:一句话一个场景 → 视频素材播放1-2秒就切换 → 根本看不清内容 → 观看体验像PPT翻页。必须按语义组分配素材,让视频有充足的展示时间。
- **核心原则**:
  - **视频场景 = 2-5句文案 + 配音合并为1组**,配1段视频素材
  - **图片场景 = 1-2句文案**为一组,配1张图片素材
  - 场景数 = 语义单元数,不是文案句子数
- **强制性分组规则(v13.7 新增 - 最高优先级)**:
  - 📹 **视频素材**:2-5句合并 → scene,视频时长需匹配配音总时长
  - 🖼️ **图片素材**:1-2句 → scene,图片展示≤3秒/句
  - 🚫 **禁止**:视频场景只有1句文案(导致视频播放<3秒)
  - 🚫 **禁止**:图片场景超过3句文案(导致静态画面停留>6秒)
- **P1生成规则(强制,v13.8 新增)**:
  - 视频scene的 `text` 字段必须包含2-5句(用换行符 `\n` 分隔,每句≤15字)
  - 错误:`text: "一个人做自媒体太累了"`(1句→视频只播1秒)
  - 正确:`text: "一个人做自媒体太累\n写文案拍视频剪片子\n一天时间全没了"`(3句→视频播6-8秒)
  - 图片scene的 `text` 字段1-2句
  - **验收**:P1完成后检查每个scene的 `text` 中 `\n` 分隔的句子数:
    - 视频scene:2-5句 → 通过 | 1句 → 立即返工,合并到相邻视频scene
    - 图片scene:1-2句 → 通过 | 0句或>3句 → 立即返工
- **P2b视频时长联动(v13.8 新增 - 防止视频不够长)**:
  - P2b下载视频素材后,必须用ffprobe检查时长
  - 视频时长必须 >= 该scene的TTS时长(根据text估算:中文约0.25秒/字)
  - 🚫 **不够长**:删除文件 → 重新搜索关键词,优先下载更长的视频 → 重试≤3次
  - ✅ **3次都不够**:报告"视频素材时长不足,改用图片+PIL生成"(降级为图片)
  - **计算公式**: `TTS时长(秒) ≈ scene的text总字数 × 0.25秒 × 1.2(语速+20%)`
- **场景/句子比率(定性检查)**:
  - 视频场景: `场景数 : 视频素材覆盖的句子数` ≈ 1:2 到 1:5
  - 图片场景: `场景数 : 图片素材覆盖的句子数` ≈ 1:1 到 1:2
  - 总场景数 ≤ 总句子数×0.6(意味着每个场景平均覆盖≥1.7句)
- **计算公式**:
  - 总场景数 ≈ Σ(TTS总时长) / 平均场景时长
  - 建议每个scene的TTS时长:视频场景6-15秒,图片场景2-5秒
  - 6-10个场景通常满足45-120秒
- **示例(2026-05-15 错误案例)**:
  - ❌ 错误:10句话→10个scene(全图片/视频各1句)→每个视频播1-2秒→PPT翻页感
  - ❌ 错误:douyin的scene_01"一个人做自媒体太累"(1句视频)→下载的视频只播1.5秒
  - ✅ 正确:10句话→4个语义组→4个scene(2个视频覆盖5句+2个图片覆盖5句)→视频播4-8秒→流畅
  - ✅ 正确:scene_01合并"做自媒体太累+写文案拍视频+一天全没了"(3句视频)→视频播8秒→充分展示
- **验收**:P1完成后检查场景数 / 文案句子数 ≤ 0.6,否则返工

**约束 3:视频素材占比 >50%,图片素材 <50%(v10.0 新增)**
- **原因**:纯图片混剪缺乏说服力,视频素材能显著提升内容质感
- **规则**:
  - P1 文案阶段:**至少 50%** 的场景标记为 `assetType: "video"`
  - 图片素材占比 < 50%
  - 例:14个场景 → 至少7个视频场景,图片≤7个
- **验收**:P2/P3 完成后检查(视频场景数 / 总场景数)> 50%

**约束 4:每个场景必须包含 keywords(v12.4 新增 - 解决图片素材全是合成图问题)**
- **原因**:P1 生成 config.json 时未写 keywords → P2b 子代理没有搜索关键词 → 只能生成 Canvas 合成图 → 违反真实素材≥60%规则
- **规则**:
  - **每个 scene 必须包含 `keywords` 数组**(2-4个关键词)
  - keywords 从文案 text 中提取**核心实体词**:产品名/品牌名/功能词/人名/事件名
  - 示例:`"text": "即梦AI每天20次免费额度"` → `"keywords": ["即梦AI", "免费额度", "AI视频"]`
  - 示例:`"text": "创始人梁文锋自掏200亿"` → `"keywords": ["梁文锋", "DeepSeek", "融资"]`
- **验收**:P1 完成后检查每个 scene 都有 keywords 且不为空数组

**约束 5:config.json 必须包含 resolution 字段(v12.4 新增 - 防止 P3 猜分辨率导致横竖屏混乱)**
- **原因**:P1 未写 resolution → P3 子代理只能猜分辨率 → 生成横屏 → 主会话发现不对做转换 → 转换丢失字幕/封面尺寸不匹配
- **规则**:
  - config.json **必须**包含 `resolution` 对象:`{ "width": 1080, "height": 1920 }`
  - 抖音/视频号:`1080×1920`(竖屏 9:16)
  - 小红书图文:`1080×1440`(3:4)
  - B站横屏:`1920×1080`(16:9)
  - **默认值**:如果任务未指定,默认 `1080×1920`(竖屏)
- **验收(P1 完成后强制执行)**:
  - 读取 config.json,检查 `resolution.width` 和 `resolution.height` 存在
  - 如果任务提到"抖音""视频号""竖屏" → 验证 `height > width`
  - 如果任务提到"B站""横屏" → 验证 `width > height`
  - 如果验证失败 → 立即修正 config.json,不允许进入 P2

**约束 6:config.json 必须只包含一条视频平台配置(v13.6 新增 - 防止重复生成多条视频)**
- **原因**:2026-05-15 P1 生成了 douyin 和 shipinhao 两个独立视频条目(不同选题、不同场景),违反"抖音+视频号合并为一条视频"规则,导致 P2 工作量翻倍
- **规则**:
  - config.json 中 `douyin` 和 `shipinhao` **必须是同一个条目**(如 `platforms.video`),不是两个独立条目
  - 正确结构:
    ```json
    {
      "platforms": {
        "video": { // 抖音+视频号通用
          "title1": "主标题",
          "title2": "小标题",
          "style": "竖屏视频",
          "resolution": { "width": 1080, "height": 1920 },
          "scenes": [...]
        },
        "xiaohongshu": { ... } // 独立图文,不冲突
      }
    }
    ```
  - 错误结构(禁止):
    ```json
    {
      "platforms": {
        "douyin": { "scenes": [...] },
        "shipinhao": { "scenes": [...] } // ❌ 两条独立视频 = 违反规则
      }
    }
    ```
- **验收(P1 完成后强制执行)**:
  - 读取 config.json,检查 `platforms` 中**只有 1 个视频条目**(键名不能同时包含 "douyin" 和 "shipinhao")
  - 如果同时存在 douyin 和 shipinhao → 失败,返工 P1
  - 只允许保留: `platforms.video`(合并条目) 或 `platforms.douyin`(单个条目,视频号复用)
- **典型错误案例**:
  - ❌ `platforms.douyin.scenes = 10个` + `platforms.shipinhao.scenes = 14个`(两个完全不同的视频)
  - ✅ `platforms.video.scenes = 12个`(一条视频,抖音和视频号都发布同一文件)

**约束 7:P2b 完成后必须执行尺寸验收门禁(v12.5 新增 - 防止不合格素材进入 P3)**
- **原因**:BV1EwRQBLEaz.mp4 是竖屏(9:16)但被用于横屏视频,P2b 下载了所有候选 URL 但未验证尺寸,导致竖屏素材混入 P3
- **规则**:
  - 下载完成后,**每个视频文件**必须用 ffprobe 验证:
    - `ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "video.mp4"`
    - 验收标准:`width > height`(横屏)
    - 竖屏视频(`height > width`)→ **立即删除**,不得进入 P3
  - 图片素材:用 PIL 验证 `width > height`(横屏)
  - 尺寸不达标(<1280×720)→ 视为不合格,删除并重下
- **验收**:
  - 全部视频文件 `width > height`(横屏)
  - 全部图片文件 `width > height`(横屏)
  - 全部素材尺寸 ≥ 1280×720
- **不通过处理**:
  - 删除不合格文件 → 重新搜索 → 重新下载
  - 最多重试 3 次
  - 3 次仍失败 → 报告用户 → 不写 phase_done_P2.txt

### 🔴 v11.3 核心变更:四大源头控制原则(防止返工的根本)

> **核心思想**:在生产阶段严格执行规则,而不是验收时发现问题频繁返工。

#### 规则1:素材时长由文案决定,视频≥3秒、图片≤5秒 + 语义分组原则
- **原因**:视频素材应该有足够时间展示内容(<3秒看不清),图片素材过长会让观众失去注意力
- **规则**:
  - **视频素材**:每段 **≥ 3秒**(最小展示时长)
  - **图片素材**:每段 **≤ 3秒**(防止静态画面停留过久)
  - **语义分组原则(v12.0 强制 - 最高优先级)**:
    - **问题根因**:一句话一个scene → 场景数过多 → 素材需求量大 → 视频素材覆盖不足 → 铁律#7不通过
    - **强制规则**:**场景数 = 内容语义单元数,不等于文案句子数**
      - 同一话题的2-4句话合并为1个scene(配1段视频素材)
      - 单个scene的TTS时长建议:2-10秒(视频场景可更长,图片场景≤3秒)
      - 视频场景占比>50%,意味着只需要场景数一半的视频素材
    - **判断标准**:
      - 若2-3句话在说**同一件事的递进描述** → 合并为1个scene
      - 若2-3句话在说**不同的要点/步骤** → 可拆分(每个配独立素材)
      - 目标:10-12个场景覆盖全部文案,视频素材需求=场景数/2
    - **正确示例**:
      - ✅ "抖音AI搜索上线了→它能直接给答案→比刷视频快3倍" → 合并为1个scene(递进描述同一功能)
      - ✅ "TRAE SOLO发布:免费AI编程→支持100+语言→中文界面友好" → 合并为1个scene(3个卖点)
    - **错误示例**:
      - ❌ 每句话单独一个scene("抖音AI搜索上线了"→1个scene,"它能直接给答案"→1个scene...)
      - ❌ 16句话→16个scene→16个素材→铁律#7铁定不通过
    - **验收**:P1完成后,场景数应远少于文案句子数(通常场景数=句子数/1.5~2)
  - **分镜拆分**:当某段文案对应的TTS > 5秒且为图片素材 → 必须拆分为多个scene
- **示例**:
  - ❌ 图片素材配5秒TTS → 拆分为2个分镜(2s+3s)或换视频素材
  - ✅ 2秒TTS配图片素材 → 保留(2s<3s)
  - ✅ 4秒TTS配视频素材 → 保留(4s≥3s)

#### 规则2:音频完整性优先,调整素材长短适配音频
- **原因**:音频(配音)是内容核心,不能被截断或加速
- **规则**:
  - ✅ **始终以TTS音频时长为基准**
  - ✅ 素材时长 = min(TTS时长, 上限) - 素材配合音频,不是音频配合素材
  - ❌ **禁止调整音频长短** 来适应素材(禁止变速/截断配音)
  - ❌ 音频结束时画面仍在播放 → 音画不同步
- **正确做法**:
  - 音频4秒,图片素材 → 截取图片视频长度为4秒
  - 音频2秒,视频素材 → 视频播放2秒后切换(不截断视频)

#### 规则3:字幕单行强制 + 大小规范
- **原因**:多行字幕遮挡画面,字体过小看不清,过大占用画面
- **规则**:
  - ✅ **单行显示**:每段字幕只能一行,禁止换行
  - ✅ **字数限制**:≤15字/行
  - ✅ **字体大小**:横屏 **56-72px**(推荐64px),竖屏 **40-48px**(推荐44px)
  - ✅ **距底部距离**:横屏 60-80px,竖屏 80-120px
  - ❌ **禁止**:多行字幕;横屏字号56-72px,竖屏字号40-48px
- **验收**:抽帧检查字幕占画面高度约5-8%,不遮挡素材主体

#### 规则4:生产即验收,源头控制不返工
- **原因**:在每个阶段结束时立即验收,不让问题进入下一阶段
- **规则**:
  - ✅ P1 文案完成后:**逐句检查字数≤15字、根据文案语义拆分确定,无固定数量**
  - ✅ P2 素材完成后:**检查视频素材占比>50%、图片素材占比<50%、时长符合规则1**
  - ✅ P3 视频构建前:**验证所有素材时长符合规则1**
  - ✅ P4 字幕烧录后:**立即抽帧检查单行显示 + 字体大小**
  - ❌ **禁止**:带着问题进入下一阶段
- **硬性标准**:
  - 单步骤返工上限:3次
  - 超过3次仍失败 → 向用户报告,等待指示
  - 每次返工必须记录原因和修复方案

---

### 🔴 文案开头三句改革(v10.0 新增 - 取代固定8段式)

**核心原则**:前三句必须直接点明主题/问题/价值,禁止无意义寒暄。

**前三句结构**:

| 句次 | 必须包含 | 示例 |
|------|---------|------|
| **第一句** | 核心问题或痛点 | "自媒体人最头疼的就是内容创作效率" |
| **第二句** | 解决方案(产品名) | "有了美图 RoboNeo,一个人搞定一个团队" |
| **第三句** | 核心价值 | "AI自动生成内容,速度快10倍" |

**强制规则**:
- ❌ **禁止**在开头强加"说实话"、"讲真"、"你们有没有遇到过"等无意义寒暄
- ✅ **只在需要时才使用**寒暄词(如需强调情绪对比时)
- ✅ 每句 **≤ 15 字**
- ✅ **产品名/品牌名**必须在文案中出现(如"RoboNeo"、"美图")

**示例对比**:

```
❌ 旧(无效寒暄):
"说实话,自媒体真的越来越难做了"
"以前我一个人又写又拍又剪"
"每天肝到凌晨数据还上不去"

✅ 新(直接有价值):
"一个人做自媒体效率太低?"
"美图 RoboNeo 让AI帮你搞定"
"内容产出速度提升10倍"
```

**后续句式**:保持网感风格,可用8段式结构,但必须基于前三句的价值主张展开。

### 风格要求
- **语气**:专业 + 网感,敢于输出主观观点
- **语言**:大白话,专业词立刻通俗化
- **禁止**:说明书式内容、空洞口号、没有感情的陈述句
- **禁止**:无意义寒暄("说实话"等只在需要时才用)

### 8段式结构

| 1 | 钩子开头 | 直接点明主题/问题 | 直接说问题或痛点 |
| 2 | 产品引入 | 直接引入解决方案 | "有了XX,YY变简单" |
| 3 | 核心价值 | 直接给出核心价值 | "效果Z,效率提升N倍" |
| 4 | 卖点展开 | 展开具体功能 | 逐条说明产品能力 |
| 5 | 社会证明 | 数据/用户量支撑 | "已有X人在用" |
| 6 | 使用感受 | 主观体验评价 | "用了X,我真香了" |
| 7 | 行动引导 | 引导试用/行动 | "一行命令就能跑起来" |
| 8 | 互动结尾 | 引导评论/关注 | "你更看重哪个?评论区告诉我" |

> **注意**:铁律 #6 要求视频 ≥ 40秒,需要 12-16 个场景才能满足。可拆分卖点段落或增加辅助场景。

**必须包含元素**
- ✅ **直接点明主题/问题/价值**(前三句必须,不允许跳过)
- ✅ **产品名/品牌名**在文案中出现(如"RoboNeo"、"美图")
- ✅ **主观观点**:`最戳我的是 / 我真香了 / 这功能太绝了`
- ✅ **专业词通俗化**:LLM → "监控AI聊天的工具";舆情监控 → "帮你盯着全网热点"
- ✅ **对比吐槽**:`以前XX,现在XX`
- ✅ **互动钩子**:`评论区告诉我 / 关注我每天一个 / 你选哪个`

**禁止出现**
- ❌ 无意义寒暄("说实话"、"讲真"、"你们有没有遇到过" - 仅在需要时才用)
- ❌ 说明书式:`支持XX功能`、`提供XX能力`
- ❌ 空洞口号:`让XX更高效`、`提升XX体验`
- ❌ 没有感情的陈述句
- ❌ 没有互动的结尾

### 标题公式

```
A. 痛点吐槽型:{痛点吐槽}?{简单解决方案},{惊喜结果}
   例:AI写的代码不敢用?这个工具帮你盯着,太香了

B. 反差型:GitHub {Stars} star 的{产品},竟然{意外点}
   例:GitHub 53k star 的监控工具,竟然开源免费?

C. 场景型:{场景}+{情绪词},{解决方案}
   例:产品上线翻车?用这个提前发现问题
```

### 互动结尾模板(必选其一)
- **选择题型**:`你更看重{A}还是{B}?评论区告诉我 👇`
- **场景提问型**:`你们团队用什么{场景}?求推荐 👀`
- **钩子型**:`关注我,每天带你发现一个{主题} 🔔`
- **二选一型**:`{A} vs {B},你选哪个?`

### 发布时间建议
| 平台 | 最佳时间 |
|------|---------|
| 小红书 | 12:00 / 20:00 |
| 抖音 | 07:00 / 12:00 / 18:00 |
| 微信视频号 | 工作日 08:30 / 20:00 |
| B站 | 17:00 / 20:00 |

---

## 第三步:TTS 配音

### 工具
```bash
pip install edge-tts
```

### 推荐语音
| 语音 | 风格 | 适用场景 |
|------|------|---------|
| zh-CN-YunjianNeural | 成熟男声 | 科技产品、工具类(**默认**) |
| zh-CN-XiaoxiaoNeural | 温暖女声 | 生活方式、教育类 |
| zh-CN-YunxiNeural | 阳光男声 | 轻松活泼的内容 |

### 语速设置
```bash
# 默认 +30%(推荐,短视频最佳节奏)
python -m edge_tts --voice zh-CN-YunjianNeural --rate=+30% --text "文字内容" --write-media output.mp3
```

### ⚠️ 生成后必做
- [ ] 检查每段 mp3 是否正常生成
- [ ] 记录每段时长(用于 config.json)
- **最重要**:将 TTS 文字同步写入 `config.json.scenes[].text`

---

## 第四步:素材准备(不重复规则)

### ⚠️ 核心规则:素材数 ≥ 场景数,严格禁止重复使用

**严格禁止**:
- ❌ 同一张图片用于2个及以上场景
- ❌ 使用程序自动生成的 card 图/文字卡片作为素材(纯色背景+大字=不通过)
- ❌ Canvas 合成的伪截图

**必须**:
- ✅ 每张素材从网上下载真实来源(GitHub/raw、产品官网、新闻图片)
- ✅ 每张素材记录来源 URL(用于验收追溯)
- ✅ 素材主题与文案场景语义匹配(铁律 #0 最高优先级)
- ✅ 每张素材最多使用1次,重复使用需配合不同 Ken Burns 效果

### 素材尺寸要求(v12.5 新增)

**图片素材**:
- 最小尺寸:1280×720(横屏)
- 推荐尺寸:≥ 1920×1080(横屏)
- 验证:用 Python PIL 检查 `image.size[0]` 和 `image.size[1]`

**视频素材**:
- 最小分辨率:1280×720(横屏)
- 推荐分辨率:≥ 1920×1080(横屏)


### 🌐 素材下载站点与搜索规则(v11.2 新增 - 从 TOOLS.md 迁移统一管理)

> ⚠️ **强制规则:必须优先搜索并使用国内站点!海外站点仅作最后备用!**
> 海外站点(Pexels/Pixabay/Coverr)常返回403/404,本机网络不稳定,禁止一上来就去海外站。
> **违反此规则 = 重复犯错,必须先搜国内再考虑海外。**

#### 🎬 视频素材搜索站点(仅用于 assetType=video 的场景)

> ⚠️ 这些站点有视频直链或可用yt-dlp下载,搜视频素材**只搜这些站点**!

| 站点 | 网址 | 下载方式 | 免费政策 | 说明 |
|------|------|---------|----------|------|
| 光厂 VJshi | vjshi.com | HTTP直链下载 | 部分免费 | 专业视频素材,首选 |
| 爱给网 | aigei.com | HTTP直链下载 | 免费为主 | 综合免费素材站 |
| 新片场 | xinpianchang.com | HTTP直链下载 | 部分免费 | 国内最大创作者社区 |
| 潮点视频 | shipin520.com | HTTP直链下载 | 部分免费 | 短视频素材 |
| Pexels | pexels.com | HTTP直链(需Referer) | 免费 | 海外免费视频,需Referer |
| Pixabay | pixabay.com | HTTP直链(需Referer) | 免费 | 海外免费视频,需API |
| B站 | bilibili.com | **yt-dlp** | 免费 | 评测/演示视频,需播放页URL |
| 抖音 | douyin.com | **yt-dlp** | 免费 | 实拍短视频,需具体视频ID |
| 好看视频 | haokan.baidu.com | **yt-dlp** | 免费 | 百度旗下视频平台 |
| 产品官网 | 各产品官网 | **浏览器录屏** | 免费 | AI工具Demo界面录屏 |

❌ **视频场景禁止搜索**: sohu.com | 163.com | sina.com.cn | zhihu.com | qq.com | toutiao.com | thepaper.cn
(这些是新闻/文章站,页面嵌入视频无法被yt-dlp下载)

#### 📷 图片素材搜索站点(仅用于 assetType=image 的场景)

| 站点 | 网址 | 下载方式 | 说明 |
|------|------|---------|------|
| 网易新闻 | news.163.com | HTTP下载配图 | 新闻配图首选 |
| 腾讯新闻 | news.qq.com | HTTP下载配图 | 新闻配图 |
| 搜狐 | sohu.com | HTTP下载配图 | 文章配图 |
| 新浪 | sina.com.cn | HTTP下载配图 | 新闻配图 |
| 知乎 | zhihu.com | HTTP下载配图 | 专栏配图 |
| 小红书 | xiaohongshu.com | 截图 | 产品/场景图 |
| 产品官网 | 各产品官网 | **xbrowser截图** | AI工具界面截图(首选) |
| Pexels | pexels.com | HTTP直链 | 高质量图片 |

#### 🚫 常见错误(必须避免)

| 错误做法 | 为什么错 | 正确做法 |
|---------|---------|---------|
| 搜视频素材时用163.com/sohu.com | 新闻页URL不是视频直链,yt-dlp无法下载 | 搜视频素材只用视频站点表 |
| 搜图片素材时只用pexels | 海外站可能403,且没有中文内容 | 先搜国内新闻/官网,再考虑海外 |
| 所有场景混用同一个搜索站点列表 | 视频/图片下载方式完全不同 | 严格区分视频站点和图片站点 |

#### 下载方式规范

```javascript
// ✅ 正确:设置请求头
https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; Apple)',
    'Referer': 'https://www.aigei.com/'  // ← 用实际来源站
  }
})

// ❌ 错误:裸请求(触发反爬)
https.get(url)

// ❌ 错误:直接硬编码海外URL
const url = 'https://cdn.coverr.co/videos/...'
```

#### 搜索优先级(⚠️ 强制执行 - 视频/图片分开搜,禁止混用)

**🎬 视频素材搜索流程**:
1. 搜国内视频素材站: `site:vjshi.com 关键词` / `site:aigei.com 关键词` / `site:xinpianchang.com 关键词`
2. 搜国内视频平台: `site:bilibili.com 关键词 演示` / `site:douyin.com 关键词`
3. 搜海外免费视频: `site:pexels.com 关键词` / Pexels API
4. 浏览器录屏兜底: 打开产品官网Demo页录屏(≤50%视频素材)
5. ❌ 禁止搜新闻站(sohu/163/sina)找视频

**📷 图片素材搜索流程**:
1. 搜国内新闻站: `site:163.com 关键词` / `site:qq.com 关键词` / `site:sohu.com 关键词`
2. 产品官网截图: 用xbrowser打开官网→截图
3. 搜社交媒体: `site:zhihu.com 关键词` / `site:xiaohongshu.com 关键词`
4. 搜海外图片: `site:pexels.com 关键词` / Pixabay API
5. 最后手段: PIL生成文字卡片(≤40%图片素材)

**⚠️ 强制规则**:
- 先搜索后下载,禁止跳过搜索环节
- 永远不一上来就硬编码URL:URL常失效,必须动态获取
- 视频场景和图片场景必须分别搜索,禁止混用站点列表

**🔴 强制规则:先搜索后下载,禁止跳过搜索环节**
- ❌ 禁止:直接打开 vjshi/aigei 等站点找视频(触发反爬403)
- ❌ 禁止:搜索结果还没看就尝试下载固定URL
- ❌ **禁止:遇到403/406就放弃!必须调用online-search搜索获取新URL**
- ✅ **必须:online-search搜索 → 获取URL列表 → 按优先级尝试下载 → 全部失败才换站点**
- ⚠️ **强制执行顺序**:遇到任何下载失败 → online-search搜索 → 获取新URL → 继续尝试

>#### 搜索工具配置(v13.5 - Tavily优先)

- **主搜索工具 🔴**: Tavily API
  - 特点: 全球最好的AI搜索API,支持site:语法过滤视频/图片站点,中文+英文双切换
  - 状态: **优先使用**(API Key已在环境变量配置)
  - 用法(推荐):
    ```bash
    # 视频场景:限制到视频站点
    tavily-search --query "场景关键词 site:bilibili.com OR site:douyin.com" --max_results 5
    # 图片场景:限制到图片站点
    tavily-search --query "场景关键词 site:163.com OR site:qq.com" --max_results 5
    ```
  - 注意: Tavily只能获取网页链接,不能直接下载文件

- **主搜索工具**: Tavily API\n  - 脚本: D:/workspace/scripts/tavily_search.cjs\n  - 用法: node tavily_search.cjs --query=\"关键词\" --max_results=5\n  - API Key已内置脚本\n- **第二搜索工具**: online-search (腾讯元宝ProSearch)
  - 路径: D:/Program Files/QClaw/resources/openclaw/config/skills/online-search/scripts/prosearch.cjs
  - 用法: node prosearch.cjs --keyword="关键词" --cnt=5
  - 特点: 免费、无需API Key、中文搜索优秀
  - 用途: Tavily作为主搜索,当Tavily不可用或需要补充中文结果时使用

- **⚠️ 搜索工具只能获取网页链接,不能直接下载视频文件**
- **下载视频必须用3级下载方式(HTTP直链/yt-dlp/浏览器录屏)**
---

### 素材来源优先级(v10.0 更新:视频素材优先 + 三级获取方式)

**🆕 v10.0 核心变更**:视频素材占比必须 >50%,获取优先级明确。

#### 视频素材获取优先级(v10.0 强制)

| 优先级 | 获取方式 | 说明 |
|--------|---------|------|
| **P1** | 网站直接下载原文件 | CDN直链、官网下载、新闻视频URL |
| **P2** | 网页录屏 | 在相关页面进行滚屏/点击操作录屏(≤10秒/段)|
| **P3** | 文生视频兜底 | AI生成提示词生成视频(仅兜底,占比≤20%)|

**录屏操作规范**:
- 使用 FFmpeg 录屏工具或系统录屏功能
- 时长:5-15秒/段(不超过总时长的50%)
- 内容:产品界面、功能演示、操作流程
- 格式:横屏 MP4 或竖屏 MP4(H.264 + AAC)

**视频素材禁止**:
- ❌ FFmpeg testsrc/color 纯色生成视频作为视频素材
- ❌ 重复使用同一视频内容
- ❌ 视频素材占比 < 50%
- ❌ **用图片生成视频替代真实视频**(这是越权行为,见下方闭环逻辑)

#### 🔴 视频素材闭环逻辑(v11.4 新增 - 解决"遇到403就放弃"问题)

**核心原则**:一个站点失败 ≠ 视频获取失败,必须尝试完所有站点。

**获取流程(v13.5 强制执行 - 3级下载方式)**:


```
1. 搜索:online-search 搜索关键词,区分视频/图片场景
   │
   ├─ 🎬 视频场景 → 只搜视频站点(vjshi/aigei/bilibili/douyin/pexels等)
   └─ 📷 图片场景 → 搜新闻站(163/qq/sohu) + 官网截图 + 社交媒体
   ↓
2. 下载(按3级方式依次尝试):
   ┌─ Level 1: HTTP直接下载(CDN直链)
   │  适用于: vjshi.com | aigei.com | xinpianchang.com | pexels.com | pixabay.com
   │  方法: Node.js https.get + 设置Referer/User-Agent
   │  ⚠️ 必须设置请求头,否则403
   ├─ Level 2: yt-dlp下载(视频平台播放页)
   │  适用于: bilibili.com | douyin.com | haokan.baidu.com
   │  方法: yt-dlp --no-playlist -f best -o "output.mp4" "播放页URL"
   │  ⚠️ yt-dlp只能下载视频播放页,不能下载新闻文章页!
   └─ Level 3: 浏览器截图/录屏(最后手段)
      适用于: 产品官网Demo | AI工具操作界面 | 新闻报道页面
      方法: xbrowser打开页面 → 截图或录屏(5-15秒)
      ⚠️ 录屏占比 ≤ 总视频素材的50%
   ↓
3. 失败处理:
   - Level 1失败(403/404) → 尝试Level 2
   - Level 2失败(yt-dlp报错) → 尝试Level 3
   - Level 3失败 → 换关键词重搜 → 重试Level 1
   - 3次循环仍失败 → 报告用户,等待指示(不写phase_done)
```

**🚫 关键区分(易错!)**:
- ❌ yt-dlp不能下载: sohu.com文章页 | 163.com新闻页 | zhihu.com专栏 | qq.com新闻页
  (这些是网页不是视频播放页,页面里嵌入的视频没有独立可下载URL)
- ✅ yt-dlp能下载: bilibili.com/video/BVxxx | douyin.com/video/123xxx | haokan.baidu.com/video/xxx
  (这些是视频平台的播放页,yt-dlp能提取视频流)

**⚠️ 禁止兜底规则(最高优先级)**:

| 行为 | 判定 | 后果 |
|------|------|------|
| ❌ 用图片 + FFmpeg zoompan 生成"动态视频" | **越权兜底** | P2 阶段失败,返工 |
| ❌ 用 FFmpeg testsrc/color 生成视频 | **越权兜底** | P2 阶段失败,返工 |
| ❌ 用文生视频 AI 生成视频 | **越权兜底**(占20%限制仅用于图片场景的兜底,视频场景禁止) | P2 阶段失败,返工 |
| ❌ 一个站点403就停止尝试 | **越权停止** | 必须继续尝试其他站点 |

✅ **正确做法**:
- 一个站点403 → 换下一个站点继续尝试
- 所有站点都403 → **停止工作,报告用户"视频素材获取全部失败,等待指示"**
- 不写 `phase_done_P2.txt`
- 不进入 P3

**P2 验收强制检查项(v12.0 新增 - 7项全检,任一不通过 = 返工)**:

| # | 检查项 | 验收标准 | 如何检查 |
|---|--------|---------|---------|
| 1 | asset文件齐全 | assets/ 下每个 scene 都有对应文件 | 检查文件存在性 |
| 2 | URL来源记录 | 每个视频有 download 来源 URL 记录 | 读 video_sources.json |
| 3 | 视频时长验证 | 每个视频 ≥ 3秒,内容非 testsrc/color/纯色 | ffprobe -show_entries format=duration |
| 3+ | 🔴 **视频文件存在性(v12.1)** | assets/video/*.mp4 实际文件数 ≥ 视频场景数,无文件则该项FAIL | `Get-ChildItem assets/video/*.mp4` 计数 |
| 4 | 视频场景占比 | 视频场景数 / 总场景数 > 50% | 统计 assetType=video 数量 |
| 5 | 真实素材占比 | 下载的截图+视频 / 总素材数 ≥ 60% | 统计 video_sources.json + 下载截图 |
| 6 | 生成素材上限 | PIL/FFmpeg生成 ≤ 40% | 统计 generated 标记 |
| 7 | 📋 URL优先级(v13.5) | 推荐Tier1域名优先,不强制限制 | bilibili/douyin/haokan/vjshi/xinpianchang/aigei > shipin520 > sohu/zhihu/toutiao等 > 任意 |
| 8 | 🔴 **URL唯一性(v12.8新增)** | **图片场景之间禁止共享URL**(scene_A.jpg 和 scene_B.jpg 不能下载自同一URL) | 统计 video_sources.json + p2_search_log.json 中所有图片URL,确认无重复 |
| 9 | 🔴 **语义匹配(v12.8新增)** | 每个图片场景的 URL 必须来自该 scene 专属 keywords,不得用全局/通用关键词凑数 | 对比 scene.keywords 与 video_sources.json 中该 scene 的 sourceUrl,若URL来自不相关的全局词搜索(如通用AI新闻),则该项FAIL |
| 10 | 🔴 **keywords覆盖(v12.8新增)** | 每个图片场景的 sourceUrl 必须来自 scene 专属 keywords 搜索结果,不得跳过搜索直接用 Canvas 合成图 | 核对 p2_search_log.json 中 scene 的 search_rounds,确认每个图片场景都有独立的 keywords 搜索记录 |

⚠️ **禁止兜底(越权行为,发现即返工)**:
- ❌ 用 FFmpeg testsrc/color 生成"动态视频"
- ❌ 用纯色+文字图替代真实图片素材
- ❌ 一个站点403就停止(必须尝试完所有站点)
- ❌ 不写 video_sources.json 就标记 P2 完成
- ❌ 视频场景URL来自新闻/图片站(sohu/csdn/sina/zhihu等),见上方优先级列表

✅ 正确兜底策略:所有站点全部失败 → 报告用户,等待指示 → 不写 phase_done_P2.txt

**P2 子代理输出要求**:
- 必须创建 `assets/video_sources.json`,记录每个视频的下载URL
- 格式:`{ "filename.mp4": "https://source-site.com/video-url" }`
- **没有URL记录的视频 = 无法证明是真实下载 = 验收不通过**

#### 图片素材获取优先级

| 优先级 | 获取方式 | 说明 |
|--------|---------|------|
| **P1** | 产品官网截图 | 截图保存为 PNG |
| **P2** | 新闻网站配图 | 腾讯新闻/新浪/网易 搜索产品相关图 |
| **P3** | 使用搜索类 Skill 精准获取 | multi-search-engine 等 |
| **P4** | Python PIL 生成(兜底) | 仅占图片素材 ≤20%,必须使用中文字体 |

**永久禁止**:
- 🔴🔴🔴 启动浏览器获取素材(browser工具、xbrowser)
- 🔴🔴🔴 FFmpeg drawtext 处理中文(乱码)
- ❌ 通用图配特定产品文案

> **⚠️ v4.0 强制要求**:P2 素材阶段必须下载至少 80% 的真实素材。Canvas 生成的 card 图只能占 ≤ 20%,且不能是主要场景的素材。

### 素材规划流程
```
1. 列出该产品已有的真实截图
2. 统计场景数量(需满足 ≥ 40秒,通常 12-16 个),确保素材数 ≥ 场景数
3. 若素材不足:下载 GitHub README 图 / 官网截图 / 裁剪同一图不同区域
4. 规划分配:确保每张素材最多使用1次,搭配不同 Ken Burns 动画效果
```

### 真实截图下载 + 格式转换
```bash
# FFmpeg 转换 webp → png
ffmpeg -i input.webp output.png
```

### 🔴 素材语义关键词匹配流程(v10.0 新增)

**目的**:确保素材与文案高度匹配,而非"通用好看图"。

**执行流程(P2 素材获取前必须执行)**:

1. **提取关键词**:读取文案每句,提取:
   - 产品名(如"RoboNeo"、"美图")
   - 功能词(如"AI生成"、"多Agent"、"品牌沉淀")
   - 场景词(如"创作者办公"、"数据看板")

2. **搜索素材**(按优先级):
   - 优先级1:产品官网截图/视频
   - 优先级2:新闻报道(含产品图)
   - 优先级3:搜索产品名获取相关图/视频
   - 优先级4:搜索功能词获取相关图/视频
   - **禁止**:用"AI机器人"通用图配"RoboNeo"产品文案

3. **验收匹配度**:
   - 每个场景的素材必须包含该场景的**核心关键词元素**
   - 如文案提到"RoboNeo",素材必须有产品界面/logo/截图
   - 如文案提到"多Agent协作",素材必须有Agent界面/协作图

**示例(RoboNeo 视频)**:

| 文案场景 | 关键词 | 素材要求 |
|---------|--------|---------|
| "直到我发现美图新出的 RoboNeo" | RoboNeo、美图 | ✅ 产品官网截图/Logo
| "多AI Agent 配合干活" | 多Agent、协作 | ✅ Agent界面/协作动画
| "品牌资产自动沉淀" | 品牌、数据看板 | ✅ 数据管理界面截图 |
| ❌ "一个人就是一个团队" | 通用 | ❌ 禁止用通用AI机器人图

**工具建议**:使用搜索类 Skill(如 multi-search-engine)获取精准素材 URL,再下载。

**视频素材强制规则(v9.0)**:
- ✅ 必须 ≥ 2 段**内容不同**的真实视频素材
- ✅ 两段视频的内容/场景/视觉效果**必须不同**
- ❌ **禁止**:同一段视频素材(如同一个 testsrc)用于 2 个场景
- ❌ **禁止**:两段视频内容/画面完全相同
- **视频素材来源优先级**:产品官网 Demo > 新闻报道 > 官方账号 > YouTube/B站评测 > Pexels/Pixabay > FFmpeg AI生成(兜底≤20%)

### 素材检查清单(v9.0 更新)
- [ ] 素材数 ≥ 场景数?
- [ ] 没有素材重复使用?
- [ ] **真实视频素材 ≥ 2 段,内容不同**?
- [ ] **每张图片素材语义匹配文案**(产品/品牌/功能关键词优先官网/新闻获取)?
- [ ] 每张素材有对应的 Ken Burns 动画效果?
- [ ] **8种效果全部覆盖**?(按index轮流分配,v9.0稳态参数)
- [ ] **验收记录**:每个场景的文案关键词 → 素材来源 URL

---

## 第五步:视频合成(核心)

### 技术方案
- **FFmpeg zoompan 滤镜** 生成 Ken Burns 动画(Canvas 在 isolated session 中被 SIGKILL 终止)
- **Node.js execSync** 调用 FFmpeg(需配置 stdio 避免 stderr 抛异常)
- **每段图片视频时长 = min(对应 TTS 时长, 5秒)**(超过5秒的纯图片会让观众失去注意力)
- **每段视频时长 = 对应 TTS 时长**(视频素材场景不受5秒限制)

### 关键决策

| 决策 | 原因 |
|------|------|
| FFmpeg zoompan 滤镜 | isolated session 中 Canvas 逐帧会被 SIGKILL 系统级终止 |
| execSync stdio: 'ignore' | FFmpeg stderr 触发 Node.js 异常,必须忽略或用 3-pipe 捕获 |
| TTS 时长决定视频时长 | 彻底解决音画同步 |
| H.264 + CRF 23 | 质量与体积平衡 |
| BGM 音量 ≤ 0.15 | 配音清晰度优先 |

### FFmpeg execSync 关键修复

```javascript
// ✅ 正确:忽略 stderr(推荐,用于无输出读取的命令)
require('child_process').execSync(cmd, { stdio: 'ignore' });

// ✅ 正确:捕获全部输出(需要读 stdout 时用)
const out = require('child_process').execSync(cmd, {
  encoding: 'utf-8',
  stdio: ['pipe', 'pipe', 'pipe']  // 必须3个pipe
});

// ❌ 错误:这2种会因 stderr 抛异常
require('child_process').execSync(cmd, { stdio: 'pipe' });
require('child_process').execSync(cmd, { encoding: 'utf-8' });

// ffprobe 获取时长(推荐)
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "file.mp3"
```

### 8种 Ken Burns 动画效果(v9.0 更新:缓速无晃动,永久替代 v4.0)

> **⚠️ v9.0 永久替代 v4.0 参数**:旧参数(+0.002/帧、0.5*on)导致 zoom 快速触达上限后重置,产生明显画面晃动。
> **v11.1 新增**:`zoom-out` 条件表达式 `if(eq(on,0),...)` 在 FFmpeg 4.4 的 zoompan 滤镜中不稳定,改为简化写法 `max(zoom-0.0002,1.0)`。
> **效果对比**:以 2.5s@30fps 图片为例,旧参数走150步→触发1.3重置→跳帧;新参数走15步→全程平稳无重置。

| 效果名 | 描述 | zoompan 滤镜参数(FFmpeg 4.4 兼容)|
|--------|------|------------------|
| `zoom-in` | 经典 Ken Burns 放大(缓慢,无晃动) | `z='min(zoom+0.0002,1.3)':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)` |
| `zoom-out` | 从局部拉远至全局(缓慢) | `z='max(zoom-0.0002,1.0)':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)` |
| `pan-left` | 镜头从右向左扫 | `x='iw/2-(iw/zoom/2)+0.08*on':y='ih/2-(ih/zoom/2)'` |
| `pan-right` | 镜头从左向右扫 | `x='iw/2-(iw/zoom/2)-0.08*on':y='ih/2-(ih/zoom/2)'` |
| `pan-up` | 镜头向上推 | `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)-0.08*on'` |
| `pan-down` | 镜头向下推 | `x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)+0.08*on'` |
| `zoom-pulse` | 缩放脉冲节奏感(v9.0缓) | `z='1+0.008*sin(1*n)':x=iw/2-(iw/zoom/2):y=ih/2-(ih/zoom/2)` |
| `diagonal` | 对角线移动(轻微,无剧烈晃动) | `x='iw/2-(iw/zoom/2)-0.04*on':y='ih/2-(ih/zoom/2)-0.03*on'` |

**⚠️ zoom-out 简化写法(v11.1 强制)**:
- ❌ 旧:`z='if(eq(on,0),1.3,max(zoom-0.0002,1.0))'` - 条件表达式不稳定
- ✅ 新:`z='max(zoom-0.0002,1.0)'` - 线性递减,永不重置

**分配规则**:按场景 index 轮流分配 effect 1-8,确保8种全覆盖。

### config.json 结构示例
```json
{
  "topic": "TrendRadar",
  "resolution": { "width": 1080, "height": 1920 },
  "outputDir": "D:/workspace/MediaContentCreation/2026-04-23/TrendRadar",
  "assetsDir": "D:/workspace/MediaContentCreation/2026-04-23/TrendRadar/assets",
  "scenes": [
    {
      "id": 1,
      "text": "说实话,错过热点太亏了",
      "asset": "real_github_card.png",
      "assetType": "image",
      "effect": "pan-right",
      "keywords": ["GitHub Trending", "开源热榜", "代码"]
    },
    {
      "id": 5,
      "text": "看看这个实时监控面板",
      "asset": "demo_screen_recording.mp4",
      "assetType": "video",
      "effect": "none",
      "keywords": ["监控面板", "实时数据", "Dashboard"]
    }
  ],
  "voice": "zh-CN-YunjianNeural",
  "speed": 30,
  "bgm": "D:/workspace/music-library/tech-corporate/005_innovation-drive.mp3",
  "bgmVolume": 0.15
}
```

> **⚠️ v6.1 新增 `assetType` 字段**:`"image"`(默认,Ken Burns 图片动画)或 `"video"`(真实视频素材,无需 Ken Burns)。**必须 ≥ 2 个场景标记为 `"video"`**。

> **⚠️ v12.4 新增 `keywords` 字段(强制)**:每个 scene **必须**包含 `keywords` 数组(2-4个关键词),用于 P2 素材搜索。keywords 从文案 text 中提取核心实体词(产品名/品牌名/功能词/人名)。**缺少 keywords 的场景 = P2 无法搜索素材 = 只能生成合成图 = 违反真实素材≥60%规则**。

### 字幕方案(v5.3 更新:单行强制 + 音画同步 + 字体大小)

> **⚠️ 永久性规则**:**禁止使用 drawtext 处理中文**(Windows Python/PowerShell subprocess 编码冲突导致全失败)

**唯一正确方案:SRT 文件 + subtitles 滤镜**

#### 字幕三大铁律(v5.3 新增,违反任一即返工)

**铁律 A:单行显示(禁止多行)**
- 每段字幕**只能显示一行**,禁止换行/多行
- SRT中每段只有一行文字,不含`\n`
- 验收:抽帧检查,确认画面只有一行字幕

**铁律 B:音画同步(时间轴严格匹配TTS)**
- 字幕出现时间 = 对应TTS音频开始时间
- 字幕结束时间 = TTS结束时间
- 实现:根据TTS每段实际时长计算累积时间轴
- 验收:播放视频,确认字幕与配音完全同步

**铁律 C:字体大小(按视频格式区分)**
- 横屏1920x1080下,FontSize **56-72px**(推荐64px)
- 竖屏1080x1920下,FontSize **40-48px**(推荐44px)
- 验收:抽帧检查,字幕占画面高度约5-8%(横屏),5-8%(竖屏)

#### 智能断句规则(v5.1 保留)
- 单行字幕 **≤ 15 字**(含标点)
- 遇到句号 `。`、逗号 `,`、分号 `;`、顿号 `、` 等标点时**自动断句**
- **禁止行尾出现标点**(句号、逗号、顿号不能出现在行末)
- SRT 的 WrapStyle=0 由 FFmpeg subtitles 滤镜自动处理,**不需要也不应该手动插入换行符 `\n`**

**Smart Subtitle 示例**:
```
原文:说实话,错过热点真的太亏了,热点永远在追,追到一半就没了
❌ 错误:说实话,错过热点真的太亏了,热点永远在追,追到一半就没了
✅ 正确:说实话,错过热点真的太亏了
        热点永远在追,追到一半就没了

原文:我真香了,这个工具太好用了
❌ 错误:我真香了,这个工具太好用了。(行尾句号)
✅ 正确:我真香了,这个工具太好用了
```

**智能断句算法(Python 参考实现)**:
```python
import re

def smart_split(text, max_chars=15):
    """将长句切分为多行,每行 ≤ max_chars 字,行尾无标点"""
    # 按标点分段
    parts = re.split(r'([,、;,;。])', text)
    blocks = []
    group = ''
    i = 0
    while i < len(parts):
        seg = parts[i]
        is_punct = bool(re.match(r'^[,、;,;。.]$', seg))
        if is_punct:
            # 标点:加入当前行(如果当前为空则丢弃)
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
    return [l.rstrip(',、;,;。.') for l in merged if l]
```

**构建 SRT 时按场景分 block,字幕行单独一行(不要加 `\n`)**:
```srt
1
00:00:01,000 --> 00:00:05,000
说实话,错过热点真的太亏了

2
00:00:05,001 --> 00:00:09,500
热点永远在追,追到一半就没了
```

#### SRT force_style 模板(v5.3 横屏 1920×1080)
```
Fontname=Microsoft YaHei Bold
FontSize=64            # 横屏64px,竖屏44px(按视频格式选择)
FontColor=&HFFFFFF     # 白色字
BorderStyle=1           # 描边
OutlineColour=&H000000 # 黑色描边
Outline=2             # 描边宽度
MarginV=60             # 距底部距离
WrapStyle=0            # 自动换行(交给FFmpeg处理)
```

**v12.2 字幕验收检查清单(全部必须通过)**:
- [ ] **单行显示**:每段字幕只有一行,无`\n`换行
- [ ] **音画同步**:字幕出现/结束时间与TTS完全匹配
- [ ] **字体大小**:横屏56-72px,竖屏40-48px
- [ ] **字数限制**:每行 ≤ 15 字
- [ ] **行尾无标点**:句号、逗号、顿号不在行末
- [ ] **画面内显示**:抽取3帧确认字幕完整可见

#### 字幕验收检查清单
- [ ] 抽取视频帧(至少3个时间点),确认字幕在画面内
- [ ] 每行字幕 ≤ 15 字
- [ ] 行尾无标点(句号、逗号、顿号)
- [ ] 字幕不遮挡素材关键内容
- [ ] 字幕与配音内容一致(最重要)

#### 构建脚本要求
- EFFECTS 数组使用函数动态生成 FFmpeg 滤镜字符串,**不要用模板字符串在模块加载时求值**
- 场景特效按 index 轮流分配 zoom-in / zoom-out 系列,确保8种特效全部覆盖
- 视频段时长 = 音频时长(ffprobe 获取),字幕时间轴基于累积时间计算

### BGM 混音参数
- **BGM 音量**:0.12-0.15(配音优先,BGM 仅作氛围)
- **淡入**:2s
- **淡出**:结束前 2s

---

## 第六步:封面设计

### 规格
- **尺寸**:**必须与视频一致** - 竖屏视频→1080×1920(9:16)封面,横屏视频→1920×1080(16:9)封面
- **格式**:PNG(无损)
- **禁止**:竖屏 1080×1440 封面;封面与视频方向不一致

### 🔴 封面尺寸规则(v12.4 强制)
- **封面尺寸 = 视频尺寸**,必须方向一致
- 竖屏视频(1080×1920)→ 封面必须 1080×1920
- 横屏视频(1920×1080)→ 封面必须 1920×1080
- **禁止**:视频是竖屏但封面生成横屏(或反之)
- P4 生成封面时**必须读取最终视频的分辨率**,用 `ffprobe` 获取 width×height,再生成对应尺寸的封面

### 封面生成
⚠️ **必须使用 `scripts/make_cover.js`**,禁止用 FFmpeg drawtext 生成封面(drawtext 中文渲染问题)。
```bash
# 根据视频方向选择封面尺寸
# 竖屏视频(1080×1920):
node scripts/make_cover.js \
  --w 1080 --h 1920 \
  --title "53K+" --subtitle "GitHub Stars" \
  --highlights "35+平台|AI分析|开源免费" \
  --cta "评论区告诉我" \
  --output cover.png

# 横屏视频(1920×1080):
node scripts/make_cover.js \
  --w 1920 --h 1080 \
  --title "53K+" --subtitle "GitHub Stars" \
  --highlights "35+平台|AI分析|开源免费" \
  --cta "评论区告诉我" \
  --output cover.png
```

---

## 第七步:交付检查(严格验收,不合格即返工)

### 🔴 验收流程(v5.2 强制执行)

**视频生成完成后,必须逐项执行以下验收,全部通过才可交付。任何一项不通过 → 立即返工 → 再次验收 → 直到全部通过。**

```bash
# 验收执行顺序(必须按此顺序)
1. 技术规格检查(#0-#4):分辨率、大小、时长
2. 内容质量检查(#5-#7):字幕、素材、动态效果
3. 最终交付检查(#8-#9):封面、文件完整性
```

### 验收不通过的处理规则

- **返工上限**:单步骤最多返工 3 次
- **返工超限**:向用户报告问题,请求指示
- **每次返工**:必须记录问题原因和修复方案到任务摘要
- **禁止跳过**:不允许以"差不多就行"跳过任何验收项
- **自动重做**:验收不通过时,自动根据失败项重新执行对应步骤,无需用户逐一指示

**小红书图文笔记**
- [ ] 标题:爆款风格,包含数字/痛点/情绪词
- [ ] 正文文字:800字左右,分段落,带emoji,网感表达
- [ ] 发布标签建议:3-5个相关话题标签
- [ ] 图片:至少5张PNG图片(1080×1440px,3:4比例)
- [ ] 封面:1张封面图(主标题 + 吸睛设计)
- [ ] 所有图片直接生成PNG文件(不依赖用户截图)

**视频验收(9条铁律全部检查,逐项确认)**
- [ ] 铁律 #0:素材语义匹配(最重要)
- [ ] 铁律 #1:文件大小 ≥ 1MB
- [ ] 铁律 #2:素材数量 ≥ 场景数
- [ ] 铁律 #3:无纯色背景
- [ ] 铁律 #4:有 Ken Burns 动态效果
- [ ] 铁律 #5:字幕智能断句(≤15字/行,行尾无标点)
- [ ] **铁律 #5.5:最终视频必须包含可见字幕**(抽帧5s/15s位置检查,无字幕 = 不通过)
- [ ] 铁律 #6:视频时长 **45-120秒**
- [ ] 铁律 #7:**至少2段视频素材**,禁止纯图片混剪
- [ ] 铁律 #8:特效种类 ≥ 8种
- [ ] **字幕与配音内容一致**(最重要)
- [ ] BGM 不压过配音(音量 ≤ 0.15)

**⚠️ 验收结果处理**:
- ✅ 全部通过 → 进入交付环节
- ❌ 任何一项不通过 → **立即返工对应步骤,不交付** → 返工后重新验收 → 直到全部通过

**交付**
- [ ] 视频文件存在且可播放?
- [ ] 封面存在?尺寸与视频一致?
- [ ] 内容包.md 完整?
  - [ ] **选题来源链接**:必须包含原始新闻出处链接(每条选题≥2条来源)
  - [ ] 标题方案
  - [ ] 正文
  - [ ] 发布标签
  - [ ] 发布时间建议
- [ ] 时间轴准确?

---

## 第八步:云盘上传(可选)

### 技术方案
Chrome DevTools Protocol (CDP) 控制已登录浏览器,直接操作 DOM。

### 前置条件
1. Chrome 由 xb init 自动启动并开启 CDP(`xb config set browser=chrome` + `xb init`),无需用户手动操作
2. 已登录腾讯微云:https://www.weiyun.com/disk

### 上传脚本
见 `scripts/upload_to_weiyun.js` 和 `scripts/screenshot.js`

---

## P4 内容包生成规范

内容包是 P4 交付的核心产物,必须包含以下所有要素,缺一不可:

### 📋 内容包模板

```markdown
# 内容包 - {选题标题}({日期})

## 📋 任务来源

**选题**:{config.json 的 topic}
**平台**:{目标平台}
**视频文件**:{最终视频路径}
**封面文件**:{封面路径}

### 📎 选题来源链接(⚠️ 必填,从 config.json.sources 提取)

| # | 来源 | 标题 | 链接 |
|---|------|------|------|
| 1 | {sources[0].topic} | {sources[0].title} | {sources[0].url} |
| 2 | {sources[1].topic} | {sources[1].title} | {sources[1].url} |
| ... | ... | ... | ... |

> ⚠️ 此段必须从 config.json 的 `sources` 数组提取。每条选题至少2条来源链接。如果 sources 为空,必须回溯 P1 选题研究时的搜索结果补全。

---

{后续各平台标题、正文、标签、时间轴等内容}
```

### 🔴 选题来源链接规则(强制)

1. **必须包含**:内容包中必须有「选题来源链接」段落
2. **数据来源**:从 `config.json` 的 `sources` 数组提取
3. **最低数量**:每条选题 ≥ 2 条来源链接
4. **格式**:表格形式,包含来源主题、标题、URL
5. **sources 为空的处理**:如果 config.json 中 sources 为空或不存在,必须回溯 P1 选题研究时的搜索记录补全,不得留空

---

## 交付物清单

| 文件 | 说明 |
|------|------|
| `{topic}_video_v{n}.mp4` | 最终视频 |
| `cover_douyin_3x4.png` | 封面图 |
| `内容包.md` | 文案、标题、标签、发布时间、**选题来源链接** |
| `task-summary_{date}.md` | 制作过程记录 |

---

## 环境依赖

```bash
# 工具路径
FFmpeg:   ffmpeg(系统 PATH 中查找,Windows 典型路径 `D:\software\ffmpeg-4.4-essentials_build\bin\ffmpeg.exe`)
Git:      git(系统 PATH 中查找,Windows 典型路径 `C:\Program Files\Git\cmd\git.exe`)
字体:     C:/Windows/Fonts/msyh.ttc(微软雅黑)

# 视频下载工具(v12.1 新增 - 用于下载B站/抖音/好看视频)
yt-dlp:   pip install yt-dlp(下载B站/抖音/好看视频的标准工具)
          用法:yt-dlp -f best --merge-output-format mp4 -o "output/%(id)s.%(ext)s" "URL"
```

---

### 🔴 竖屏布局规范(v11.8 新增,v12.6 强化标题强制)

**三区域结构(1080×1920)- 竖屏视频必须全部包含:**

| 区域 | 高度范围 | 占比 | 内容 |
|------|---------|------|------|
| **标题区** | y=0..384px | 20% | **⚠️ 强制:显示 Hook 文字或场景标题(PIL/drawtext/overlay PNG)** |
| 素材区 | y=384..1248px | 65% | 素材居中显示,左右黑边填充 |
| 字幕区 | y=1248..1920px | 15% | 字幕(SRT/PIL烧录,距底部80-120px) |

**⚠️ 标题显示规则(v13.5 强制 - 验收铁律 #5.5):**
- **竖屏视频必须包含双行标题,缺失 = 验收不通过 = P3 未完成**
- **主标题(Line 1):**
  - 内容:config.json 中 `title1` 字段(如 "GEO优化:让AI主动推荐你")
  - 字号:**62px**,颜色:**金色 #FFD700**,字体:**微软雅黑 Bold (msyhbd.ttc)**
  - 描边:深灰粗描边(radius=4)
- **小标题(Line 2):**
  - 内容:config.json 中 `title2` 字段(如 "不做SEO做GEO,流量飿3倍")
  - 字号:**44px**,颜色:**白色 #FFFFFF**,字体:**微软雅黑 Bold (msyhbd.ttc)**
  - 描边:深灰中描边(radius=3)
- **布局**:两行水平居中,**行间距 44px**(指**基线间距离**,不是 y 坐标差),整体起始 y=20
- **⚠️ 行间距计算公式(v13.5 强制)**:
  - `line1_y = 20`(第一行起始y)
  - `line1_h = textbbox[3] - textbbox[1]`(第一行实际渲染高度,用 PIL textbbox 获取)
  - `line2_y = line1_y + line1_h + 44`(第二行起始 = 第一行基线 + 44px 行间距)
  - **❌ 禁止硬编码 y 坐标差**(如 line1_y=10, line2_y=70 → 实际间距≈0,两行重叠)
- **实现方式**:PIL 渲染双行标题 PNG → FFmpeg overlay 到视频顶部(推荐,字号/颜色完全可控)
- **横屏视频**:标题可选(非强制)

**🔴 标题文本来源铁律(v13.5 强制 - 防止标题乱字):**
- **⚠️ 禁止手动硬编码 Unicode 转义**:生成标题 PNG 的 Python 脚本必须**直接从 config.json 读取** title1/title2,禁止在 JS 中拼接 Python 代码时手动把中文转为 \uXXXX 转义
- **根因**:手动 Unicode 转义极易出错(如 暴\u66B4 → \u6EBA溺, 涨\u6DA8 → \u6C37氷),一旦写错,视频标题就会显示乱字且难以排查
- **唯一正确做法**:Python 脚本用 `json.load()` 读取 config.json,从中取 `config['platforms']['douyin']['title1']` 和 `title2`
- **PIL 标题脚本模板**:
```python
import json
from PIL import Image, ImageDraw, ImageFont
import re

config = json.load(open(r'{outputDir}/config.json', encoding='utf-8'))
title1 = config['platforms']['douyin']['title1']
title2 = config['platforms']['douyin']['title2']
# ... 渲染逻辑 ...
```
- **❌ 禁止**:`title1 = "Claude\u5B66\u4F1A\u505A\u68A6\u4E86\uFF0C\u6218\u529B\u6EBA\u6C37\u516D\u500D"` ← 这种手动转义必出错
- **✅ 正确**:`title1 = config['platforms']['douyin']['title1']` ← 从文件动态读取,config写什么就显示什么**素材处理规则**:
- 图片:`scale=1080:-1` 后 overlay 到黑底 `(W-w)/2:(H-h)/2`
- 视频:`scale=w=min(1080,iw*1920/ih):h=min(1920,ih*1080/iw)` + `pad=1080:1920:(ow-iw)/2:(oh-ih)/2=black`

**字幕位置规则**:
- 竖屏字幕距底部 80-120px(MarginV=100)
- 字号 40-48px(推荐44px)
- 单行显示,≤15字
---

## 常见陷阱(v4.0 更新)

| 问题 | 原因 | 解决方案 |
|------|------|---------|
| **FFmpeg execSync 抛异常** | stderr 被当作错误 | 用 `stdio: 'ignore'` 或 `['pipe','pipe','pipe']` |
| **isolated session Canvas SIGKILL** | CPU 密集触发系统终止 | 改用 FFmpeg zoompan 原生滤镜 |
| **drawtext 中文全失败** | Windows subprocess 编码冲突 | **用 SRT 文件 + subtitles 滤镜替代** |
| **zoompan `t/浮点数` 失败** | FFmpeg 4.4 不支持除法表达式 | 用预计算乘法或 `on` 变量替代 |
| **zoompan `sin(t)` 失败** | FFmpeg 4.4 zoompan 不支持 sin(t) | 用 `sin(ON)` 替代(**大写 ON**)|
| **竖屏视频缺少标题** | P3 脚本未包含标题生成步骤 | **按竖屏布局规范 v12.6**:P3 必须生成标题PNG并overlay到顶部,验收铁律 #5.5 |
| **标题显示乱字** | JS拼接Python代码时手动硬编码Unicode转义,转错字符(如暴→溺,涨→氷) | **v13.5铁律**:Python脚本必须从config.json动态读取title1/title2,禁止手动\uXXXX转义 |
| **竖屏布局设计** | 需要分区域(标题/素材/字幕) | **按竖屏布局规范**:上方针题区+中间素材居中+下方字幕区 |
| **"步骤过多自动中止"** | P3 视频构建 16场景×3步≈48步,超单会话 step 上限 | **v13.9 主会话exec**:P2/P3 由主会话exec直接执行脚本 |
| **子代理超时** | 默认超时可能不够 | 不再使用子代理,P2a(5min)/P2b(10min)/P3单场景(2min)主会话exec超时 |
| **会话 compacted 后状态丢失** | compaction 丢失 exec 结果 | 依赖 `.task-state.json` + `phase_done_P{n}.txt` 断点续传 |
| **子代理失败无法恢复** | 子代理崩溃无重试 | **v13.9不再使用子代理**:主会话exec + 断点续传机制 |
| **竖屏素材处理** | 下载的图大多是横屏 | **居中适应宽度,上下黑边填充**,横屏素材完全兼容 |
| **concat 合并后分辨率丢失** | concat -c copy 遇到不一致segment时降级重编码,分辨率被改为源视频分辨率 | **强制重编码合并**:`-c:v libx264 -preset fast -crf 23` 而非 `-c copy` |
| **小图 zoompan 失败** | 小于目标尺寸的图片用zoompan会报"loop option not found" | 对小图/图标素材:去掉 `-loop 1`,只用 `fps=30` 重复帧 |
| **素材是程序生成的 card 图** | P2 阶段偷懒用了 Canvas 生成 | **必须从网上下载真实截图/照片** |
| 音画不同步 | 视频固定时长 ≠ TTS 时长 | 每段视频时长 = TTS 时长 |
| **字幕累积漂移** | FFmpeg `-t` 按帧边界对齐(30fps=33.3ms/帧),16段累积漂移可达+75~90ms,人耳可感知50ms+偏移 | **v13.5铁律**:TTS音频作为唯一时间基准;混音用 `-shortest`;SRT基于 `tts_durations.json` 累加;concat 用重编码模式 |
| **视频时长 < 40秒** | 场景数太少/配音太短 | P1 规划 12-16 个场景 |
| **特效种类 < 8种** | 所有场景用同一种特效 | 按 index 轮流分配 8 种兼容效果 |
| **素材重复使用** | 未规划素材分配 | 先列素材清单,确保素材数 ≥ 场景数 |
| **字幕配音不匹配** | config.json 和 TTS 不同步 | 先生成 TTS → 再写 config.json → 最后 build |
| Canvas 中文路径报错 | `canvas` 模块限制 | 素材放英文路径 |
| PowerShell filtergraph 乱码 | `$_`/`??` 语法冲突 | 用 Python 执行 FFmpeg(不用 PowerShell/cmd) |
| BGM 压过配音 | 音量比例不当 | BGM ≤ 0.15 |
| **文案句子过长** | **P1 没有字数约束,导致后续字幕超标** | **v6.1: P1 强制每句≤15字** |
| **缺少视频素材** | **P1 没规划视频场景,P2 默认全用图片** | **v6.1: P1 强制标注≥2个assetType=video场景** |
| **smart_split 断不干净** | **原文太长或无标点,算法无法合理断句** | **从源头控制:P1 就写短句** |


## 🚨 字幕同步铁律(v13.5 强制)

### 根因
FFmpeg `-t` 参数按**帧边界对齐**(30fps = 每帧33.3ms),导致每个视频片段有 0-22ms 舍入误差。16个场景累积后产生 **+75~90ms 漂移**,超过人耳可感知阈值(50ms)。

### 唯一正确方案
```
时间基准链:
tts_durations.json (edge-tts 输出的精确时长)
  → SRT 字幕时间轴 (累加 tts_durations)
    → TTS 音频 concat (与 durations 完全一致)
      → 混音 -shortest (视频截断到音频长度)
        → ASS 烧录 (字幕与音频完美同步)
```

### 强制规则
1. **TTS 音频是唯一时间基准** - 所有时间轴都从 `tts_durations.json` 导出
2. **SRT 时间戳 = tts_durations 累加** - 不使用估算值或 ffprobe 测量值
3. **混音必须用 `-shortest`** - 让视频截断到音频长度(而非反过来)
4. **concat 用重编码模式**(`-c:v libx264`) - 避免 `-c copy` 时的时长不一致
5. **验收标准**: `|final_dur - srt_total| < 0.1s`

### ❌ 错误做法(禁止)
- 用 ffprobe 测量每个视频片段时长来生成 SRT(舍入误差累积)
- 用 `-c copy` concat 后再混音(时长不一致导致漂移)
- 不用 `-shortest`,让音频被截断或拉伸

---

## ⚠️ 注意: -shortest 的正确用法
- **v13.5 之前**:规则是"禁止用 -shortest 截断配音"
- **v13.5 更正**:在**字幕同步场景**下,`-shortest` 是正确的--它让**视频**截断到**音频**长度,保证音画同步
- **核心原则**:配音永远不被截断。`-shortest` 截断的是**多余的视频帧**,不是音频

---

---

## v12.5 补丁1:P2 执行日志 + 图片下载工具链

### 1. P2 执行日志(p2_search_log.json 强制)

每个场景必须记录完整的搜索+下载过程,无日志 = 验收不通过。格式:

```json
{
  "scene_03": {
    "assetType": "image",
    "keywords": ["DeepSeek", "梁文锋"],
    "search_rounds": [
      {"engine": "online-search", "query": "DeepSeek 梁文锋 创始人", "results": 5}
    ],
    "download_attempts": [
      {"method": "wget", "url": "图片URL1", "result": "403 Forbidden"},
      {"method": "requests", "url": "图片URL2", "result": "success", "size": 152000}
    ],
    "final_source": "https://news.163.com/xxx.jpg",
    "is_generated": false
  }
}
```

验收规则:
- 每场景 >=1 轮 search_rounds
- 每场景 >=2 种 download_attempts 方法
- is_generated: true 必须有失败原因

### 2. 图片下载工具链(强制顺序)
1. wget(含 Referer 请求头)
2. Python requests(通用 headers)
3. xbrowser 截图兜底(仅当 1+2 都失败)

### 3. 修复验证
后续 P2 阶段需同时验证 video_sources.json + p2_search_log.json