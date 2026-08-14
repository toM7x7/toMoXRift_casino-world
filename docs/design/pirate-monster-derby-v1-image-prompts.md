# 海賊魔獣ダービー v1 画像生成プロンプト記録

## 使用方式

Codex組み込み画像生成を使用。技術寸法の原本には使わず、YAML/JSONから作成した三面図と操作盤図を優先する。

## 初回・空間コンセプト

```text
Use case: stylized-concept
Asset type: XRift WebXR world spatial concept render for design review
Primary request: Create a polished wide 16:9 three-quarter elevated concept render of an open-air voxel pirate monster derby that fits one compact 12m by 10m rectangular plot in a Minecraft-inspired sandbox casino village.
Input images: Images 1-4 are visual references for the chunky voxel creature language, proportions, faceted materials, and playful pirate-fantasy mood. Use them as style and creature references, not as a request to reproduce the black thumbnail backgrounds.
Scene/backdrop: Twilight open-sky block village plaza, continuous walkable stone ground, distant palm trees and warm lanterns, but no enclosing building.
Subject: A raised dark-navy race deck measuring visually about 10.4m by 5m, containing exactly four parallel straight lanes running left-to-right. Lane colors in order from back to front: cyan, earth brown, fiery orange-red, deep blue. Exactly four compact voxel hippogriff-like fantasy racers, one per lane, clearly separated and facing the finish at right. Foreground approach side has a wide uncluttered spectator walkway, a low viewing rail, one angled physical betting console with chunky buttons, a friendly voxel pirate GM on the front-left, and a slim result tower on the front-right. Use large lane numbers 1, 2, 3, 4 as simple physical markers; no other text is necessary.
Style/medium: High-quality stylized 3D voxel game concept art, readable geometry suitable for implementation in React Three Fiber, coherent block scale, playful but designed rather than toy clutter.
Composition/framing: Show the complete plot boundary, all four full lanes, the entire spectator walkway, GM, console, and result tower in one shot. Camera from the approach side at moderate height, 28mm equivalent, no dramatic crop.
Lighting/mood: Warm lantern light against cool twilight sky, festive race-day energy, clear silhouettes, soft ambient shadows.
Color palette: Dark navy and sandstone structure, gold accents, cyan/brown/orange-red/blue lanes.
Materials/textures: Chunky voxel stone, wood, brass, painted blocks, lightly worn but clean.
Constraints: No walls, no roof, no grandstand, no forced seating, no giant floating HUD, no screen blocking the course, no narrow passage, no more than four racers, generous pedestrian clearance, result tower must not obscure the track. Keep the track straight, not oval. The accurate technical drawing is separate, so prioritize spatial clarity over written labels.
Avoid: photorealistic horses, modern racetrack architecture, casino slot-machine clutter, stadium seating, crowded NPC audience, giant banners, illegible pseudo-Japanese text, watermark.
```

初回画像は4体が別種になったため、正式コンセプトから除外した。

## 採用版・同一種4属性への修正

```text
Use case: precise-object-edit
Asset type: XRift WebXR world spatial concept render for design review
Input images: Image 1 is the edit target and its complete scene composition must be preserved. Image 2 is the required Hippogriff species reference.
Primary request: In Image 1, replace only the four racing creatures so all four have the same compact voxel Hippogriff species silhouette and proportions based on Image 2, while keeping one creature centered in each existing lane and facing right. Give the four racers distinct element treatments matching their lanes: lane 1 cyan Air with pale cyan mane or wings; lane 2 Earth brown with ochre details; lane 3 Fire orange-red with ember-colored details; lane 4 Water deep blue with light blue details.
Constraints: Preserve the track geometry, exact four straight lanes, lane colors and order, number boards 1-4, finish line, foreground walkway, low rail, betting console, pirate GM, result tower, background plaza, camera angle, lighting, and overall framing from Image 1. Change only the four racers. Exactly four racers total, one per lane. All four must read as variants of the same species and be similar in body size. No extra characters, no new signs, no text changes, no floating UI, no roof, no walls, no crowd.
Avoid: four different monster species, lion, crocodile, wyvern, photorealistic horse, inconsistent scale, missing racer, duplicated racer, watermark.
```
