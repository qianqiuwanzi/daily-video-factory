#!/usr/bin/env python3
"""
P2b 验收脚本 - 在写 phase_done_P2.txt 前强制运行
检查所有P2素材质量门禁，全部通过才允许进入P3。

用法: python validate_p2b.py [工作目录]
  工作目录默认: D:/workspace/MediaContentCreation/YYYY-MM-DD
  自动读取该目录下的 config.json + assets/ 目录
"""

import json
import os
import sys
import io
import subprocess
import hashlib
from pathlib import Path

# 🔧 Windows 控制台编码修复
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

FFPROBE = "D:/software/ffmpeg-4.4-essentials_build/bin/ffprobe.exe"


def get_md5(filepath):
    """计算文件 MD5"""
    h = hashlib.md5()
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            h.update(chunk)
    return h.hexdigest()


def ffprobe_dimensions(filepath):
    """用 ffprobe 获取视频宽高，返回 (width, height) 或 None"""
    try:
        result = subprocess.run([
            FFPROBE, "-v", "error",
            "-select_streams", "v:0",
            "-show_entries", "stream=width,height",
            "-of", "csv=p=0",
            str(filepath)
        ], capture_output=True, text=True, timeout=30)
        if result.returncode == 0 and result.stdout.strip():
            parts = result.stdout.strip().split(',')
            if len(parts) == 2:
                return int(parts[0]), int(parts[1])
    except Exception:
        pass
    return None


def validate_p2b(work_dir):
    """
    验证 P2b 产出，返回 (passed: bool, errors: list, warnings: list)
    """
    errors = []
    warnings = []
    work_dir = Path(work_dir)
    
    # ── 检查1: phase_done_P2a.txt 必须存在 ──────────────────
    p2a_done = work_dir / "phase_done_P2a.txt"
    if not p2a_done.exists():
        errors.append("❌ 门禁#0: phase_done_P2a.txt 不存在，P2a 未完成")
    
    # ── 检查2: assets 目录存在且有文件 ────────────────────────
    image_dir = work_dir / "assets" / "image"
    video_dir = work_dir / "assets" / "video"
    
    if not image_dir.exists():
        errors.append(f"❌ 门禁#1: 目录不存在: {image_dir}")
    elif not any(image_dir.iterdir()):
        errors.append(f"❌ 门禁#1: 目录为空: {image_dir}")
    
    if not video_dir.exists():
        errors.append(f"❌ 门禁#1: 目录不存在: {video_dir}")
    elif not any(video_dir.iterdir()):
        errors.append(f"❌ 门禁#1: 目录为空: {video_dir}")
    
    # ── 检查3: 收集实际文件，验证 size>0 和尺寸 ──────────────
    image_files = list(image_dir.glob("*")) if image_dir.exists() else []
    video_files = list(video_dir.glob("*")) if video_dir.exists() else []
    
    # 过滤掉非媒体文件（如 video_sources.json 不应在 video 目录）
    image_files = [f for f in image_files if f.suffix.lower() in ('.jpg', '.jpeg', '.png', '.webp', '.bmp')]
    video_files = [f for f in video_files if f.suffix.lower() in ('.mp4', '.mov', '.avi', '.mkv', '.webm')]
    
    print(f"📊 发现素材: 图片 {len(image_files)} 个, 视频 {len(video_files)} 个")
    
    # 验证每个文件 size > 0
    for f in image_files + video_files:
        if f.stat().st_size == 0:
            errors.append(f"❌ 门禁#1: 文件为空: {f.name}")
    
    # 验证视频文件尺寸（width > height，横屏）
    for vf in video_files:
        dims = ffprobe_dimensions(vf)
        if dims is None:
            warnings.append(f"⚠️  门禁#2: 无法获取视频尺寸: {vf.name}")
        else:
            w, h = dims
            if h > w:  # 竖屏，不合格
                errors.append(
                    f"❌ 门禁#2: 视频是竖屏({w}×{h}): {vf.name} — 必须横屏(w>h)，立即删除"
                )
            elif w < 1280 or h < 720:
                warnings.append(
                    f"⚠️  门禁#2: 视频尺寸偏低({w}×{h}): {vf.name}，建议≥1280×720"
                )
            else:
                print(f"  ✅ 视频尺寸合格: {vf.name} ({w}×{h})")
    
    # 验证图片文件尺寸（width > height，横屏，最小800×600）
    for imgf in image_files:
        try:
            from PIL import Image
            with Image.open(imgf) as im:
                w, h = im.size
                if h > w:
                    errors.append(
                        f"❌ 门禁#2: 图片是竖屏({w}×{h}): {imgf.name} — 必须横屏(w>h)"
                    )
                elif w < 800 or h < 600:
                    errors.append(
                        f"❌ 门禁#2: 图片尺寸太小({w}×{h}): {imgf.name} — 必须≥800×600"
                    )
                else:
                    print(f"  ✅ 图片尺寸合格: {imgf.name} ({w}×{h})")
        except ImportError:
            warnings.append(f"⚠️  PIL 未安装，跳过图片尺寸验证: {imgf.name}")
        except Exception as e:
            warnings.append(f"⚠️  图片尺寸验证失败: {imgf.name}: {e}")
    
    # ── 检查4: video_sources.json 存在且结构正确 ──────────────
    vs_json = work_dir / "assets" / "video_sources.json"
    if not vs_json.exists():
        warnings.append("⚠️  门禁#3: video_sources.json 不存在，无法验证URL记录")
    else:
        with open(vs_json, 'r', encoding='utf-8') as f:
            vs_data = json.load(f)
        scenes = vs_data.get("scenes", [])
        print(f"📊 video_sources.json: {len(scenes)} 个场景记录")
        
        missing_local = [s for s in scenes if not s.get("localPath")]
        if missing_local:
            errors.append(f"❌ 门禁#3: {len(missing_local)} 个场景 localPath 为空")
        
        # 验证 localPath 文件确实存在
        for s in scenes:
            lp = s.get("localPath")
            if lp and not Path(lp).exists():
                warnings.append(f"⚠️  门禁#3: localPath 文件不存在: {lp}")
    
    # ── 检查5: 视频素材占比 > 50% ────────────────────────────
    config_path = work_dir / "config.json"
    if config_path.exists():
        with open(config_path, 'r', encoding='utf-8') as f:
            config = json.load(f)
        
        # 只检查视频平台（合并后的）
        platforms = config.get("platforms", {})
        # 兼容旧字段名 platforms / platform
        if not platforms:
            platforms = config.get("platform", {})
        
        total_scenes = 0
        video_scenes = 0
        for p_name, p_data in platforms.items():
            scenes = p_data.get("scenes", [])
            total_scenes += len(scenes)
            video_scenes += sum(1 for s in scenes if s.get("assetType") == "video")
        
        if total_scenes > 0:
            video_ratio = video_scenes / total_scenes
            print(f"📊 视频场景占比: {video_scenes}/{total_scenes} = {video_ratio*100:.0f}%")
            if video_ratio < 0.5:
                errors.append(
                    f"❌ 门禁#4: 视频场景占比({video_ratio*100:.0f}%) < 50% "
                    f"({video_scenes}/{total_scenes})"
                )
        else:
            warnings.append("⚠️  门禁#4: config.json 中无场景，跳过视频占比检查")
    
    # ── 检查6: 文件 MD5 去重（防止同一文件凑数）────────────
    all_files = image_files + video_files
    if all_files:
        md5_map = {}
        for f in all_files:
            md5 = get_md5(f)
            if md5 in md5_map:
                errors.append(
                    f"❌ 门禁#5: 文件MD5重复: {f.name} 与 {md5_map[md5].name} 内容完全相同"
                )
            else:
                md5_map[md5] = f
        print(f"📊 MD5去重检查: {len(all_files)} 个文件, {len(md5_map)} 个唯一MD5")
    
    # ── 检查7: 真实素材 vs 生成素材（粗略检查）──────────────
    # 生成素材通常是 PIL 生成的纯色/文字卡片，文件较小
    generated_count = 0
    real_count = 0
    for f in image_files + video_files:
        size_mb = f.stat().st_size / (1024 * 1024)
        if size_mb < 0.05:  # < 50KB 可能是生成图
            generated_count += 1
        else:
            real_count += 1
    
    total = generated_count + real_count
    if total > 0:
        real_ratio = real_count / total
        print(f"📊 真实素材占比(粗略): {real_count}/{total} = {real_ratio*100:.0f}%")
        if real_ratio < 0.6:
            warnings.append(
                f"⚠️  门禁#6: 真实素材占比({real_ratio*100:.0f}%) < 60%，"
                f"生成素材({generated_count}个)可能过多"
            )
    
    return errors, warnings


def main():
    work_dir = sys.argv[1] if len(sys.argv) > 1 else ""
    
    # 自动推断工作目录
    if not work_dir:
        # 尝试从 .task-state.json 推断
        tstate = Path("D:/workspace/MediaContentCreation/2026-05-15/.task-state.json")
        if tstate.exists():
            with open(tstate, 'r', encoding='utf-8') as f:
                data = json.load(f)
            work_dir = data.get("outputDir", "")
    
    if not work_dir or not Path(work_dir).exists():
        print(f"❌ 无法推断工作目录，请手动指定: python validate_p2b.py <工作目录>")
        sys.exit(1)
    
    print(f"=== P2b 验收脚本 开始执行 ===")
    print(f"工作目录: {work_dir}")
    
    errors, warnings = validate_p2b(work_dir)
    
    print(f"\n=== 验收结果 ===")
    if warnings:
        print(f"⚠️  警告 ({len(warnings)} 项):")
        for w in warnings:
            print(f"  {w}")
    
    if errors:
        print(f"❌ 门禁不通过 ({len(errors)} 项错误) — 不要写 phase_done_P2.txt")
        for e in errors:
            print(f"  {e}")
        print(f"\n🔴 P2b 验收失败 — 请修复上述错误后重新运行")
        sys.exit(1)
    else:
        print(f"✅ P2b 验收全部通过！")
        print(f"📋 可以写 phase_done_P2.txt，进入 P3")
        sys.exit(0)


if __name__ == "__main__":
    main()
