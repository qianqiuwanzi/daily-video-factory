#!/usr/bin/env python3
"""
P1验收脚本 - 在写 phase_done_P1.txt 前运行
检查所有5项P1约束 + 新增的"单视频"约束
用法: python validate_p1.py [config.json路径]
"""

import json
import sys
import os
import io

# 🔧 Windows 控制台编码修复
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def validate_p1(config_path):
    """验证 P1 产出，返回 (passed: bool, errors: list)"""
    errors = []
    
    if not os.path.exists(config_path):
        return False, [f"config.json 不存在: {config_path}"]
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    platforms = config.get("platforms", {})
    if not platforms:
        return False, ["platforms 字段为空"]
    
    # === 新增:检查 1 条视频（抖音+视频号合并）===
    video_keys = [k for k in platforms.keys() if any(v in k for v in ("douyin", "shipinhao", "video"))]
    
    if len(video_keys) > 1:
        errors.append(
            f"❌ 违反 Constraint 6: config 包含多个视频平台({video_keys})。"
            f"规则要求抖音+视频号合并为1条视频。"
        )
    elif len(video_keys) == 0:
        errors.append("⚠️  未找到视频平台配置 (douyin/shipinhao/video)")
    
    # 检查每个平台
    for platform_name, platform in platforms.items():
        # === Constraint 1: 场景数合理 ===
        scenes = platform.get("scenes", [])
        if len(scenes) < 3:
            errors.append(f"❌ [{platform_name}] 场景数({len(scenes)})太少")
        if len(scenes) > 20:
            errors.append(f"⚠️  [{platform_name}] 场景数({len(scenes)})过多，建议≤16")
        
        # === Constraint 2: 每句≤15字 ===
        for scene in scenes:
            text = scene.get("text", "")
            lines = text.split("\n")
            for li, line in enumerate(lines):
                if len(line) > 15:
                    errors.append(
                        f"❌ [{platform_name}] scene_{scene['id']}: "
                        f"第{li+1}行\"{line}\" ({len(line)}字) > 15字上限"
                    )
        
        # === Constraint 2: 语义分组 — 禁止一句一场景(v13.8) ===
        for scene in scenes:
            text = scene.get("text", "")
            # 按换行符分隔句子
            sentences = [s.strip() for s in text.split("\n") if s.strip()]
            num_sentences = len(sentences)
            asset_type = scene.get("assetType", "image")
            
            if asset_type == "video":
                if num_sentences < 2:
                    errors.append(
                        f"❌ [{platform_name}] scene_{scene['id']}: "
                        f"视频场景只有{num_sentences}句,违反'2-5句'规则。"
                        f"text=\"{text[:40]}...\" → 视频将只播1-2秒,像PPT翻页。"
                    )
                elif num_sentences > 5:
                    errors.append(
                        f"⚠️  [{platform_name}] scene_{scene['id']}: "
                        f"视频场景有{num_sentences}句(建议≤5),过长可能导致素材难找。"
                    )
            elif asset_type == "image":
                if num_sentences == 0:
                    errors.append(
                        f"❌ [{platform_name}] scene_{scene['id']}: "
                        f"图片场景句子数为0,text为空。"
                    )
                elif num_sentences > 3:
                    errors.append(
                        f"⚠️  [{platform_name}] scene_{scene['id']}: "
                        f"图片场景有{num_sentences}句(建议≤3),静态停留可能过长。"
                    )
        
        # === Constraint 2b: 总场景数/总句子数 ≤ 0.6 ===
        total_sentences = sum(
            len([s.strip() for s in scene.get("text","").split("\n") if s.strip()])
            for scene in scenes
        )
        if total_sentences > 0:
            ratio = len(scenes) / total_sentences
            if ratio > 0.6:
                errors.append(
                    f"❌ [{platform_name}] 场景数/句子数={ratio:.2f}>0.6," 
                    f"说明场景数过多(=句子数),违反语义分组原则。"
                )
        
        # === Constraint 3: 视频>50% ===
        video_count = sum(1 for s in scenes if s.get("assetType") == "video")
        if len(scenes) > 0 and (video_count / len(scenes)) < 0.5:
            errors.append(
                f"❌ [{platform_name}] 视频场景({video_count}/{len(scenes)}={video_count/len(scenes)*100:.0f}%) < 50%"
            )
        
        # === Constraint 4: keywords ===
        for scene in scenes:
            keywords = scene.get("keywords", [])
            if not keywords or len(keywords) == 0:
                errors.append(
                    f"❌ [{platform_name}] scene_{scene['id']}: keywords 为空"
                )
        
        # === Constraint 5: resolution ===
        resolution = platform.get("resolution", {})
        if not resolution.get("width") or not resolution.get("height"):
            errors.append(f"❌ [{platform_name}] resolution 缺失")
        elif resolution["width"] <= 0 or resolution["height"] <= 0:
            errors.append(f"❌ [{platform_name}] resolution 无效")
    
    # 总结
    if errors:
        return False, errors
    
    total_scenes = sum(len(p.get("scenes", [])) for p in platforms.values())
    video_scenes = sum(
        sum(1 for s in p.get("scenes", []) if s.get("assetType") == "video")
        for p in platforms.values()
    )
    
    print(f"✅ P1 验收通过")
    print(f"   平台: {len(platforms)} 个")
    print(f"   视频配置: {len(video_keys)} 条 ✅ (抖音+视频号合并)")
    print(f"   总场景: {total_scenes} 个 (视频:{video_scenes} 图片:{total_scenes-video_scenes})")
    return True, []

if __name__ == "__main__":
    config_path = sys.argv[1] if len(sys.argv) > 1 else "config.json"
    passed, errors = validate_p1(config_path)
    
    for err in errors:
        print(err, file=sys.stderr)
    
    if not passed:
        print(f"\n🔴 P1 验收不通过 ({len(errors)} 项错误) — 不要写 phase_done_P1.txt")
        sys.exit(1)
    else:
        sys.exit(0)