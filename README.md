# ARHome - 1:1 毛坯房 AR 家居试摆与真实空间漫游系统

> **核心目标**：解决毛坯房/毛坯大平层现场“无尺寸参照物、空间尺度认知失真、2D图纸无法感知过道动线”的行业痛点。通过 1:1 毫米级绝对物理尺度标定，在真实现场或高保真仿真空间中，虚拟透视摆放已知尺寸真实家具，并支持真人在物理空间自由行走漫游。

---

## 🌟 核心功能特性

### 1. 真实 1:1 毫米级物理尺寸标定 (CAD / Metric Precision)
- **严格按照国家家具标准与实际出厂尺寸建模**：
  - 1.8m 现代大双人床（1880 × 2180 × 980 mm，含床头与包边）
  - 1.5m 实木双人床、4门对开定制大衣柜（2000 × 600 × 2400 mm）
  - 2.8米 L 型转角大沙发、岩板茶几、悬空电视柜、65寸壁挂电视
  - 1.6米岩板餐桌椅组合、人体工学升降电脑桌、大书架、落地灯与琴叶榕绿植
- **3D 空间动态工程尺寸标注**：
  - 选中家具即刻弹出长宽高毫米数据、占地投影面积（㎡）、到北/南/西/东四面物理墙体的实时距离虚线。
- **设计模式实时防穿墙与智能磁吸对齐 (Wall Clamping & Magnetic Snapping)**：
  - 拖拽移动家具时自动计算旋转后的精准 AABB 物理外轮廓，**100% 严禁家具穿入水泥墙体或角柱内部**；
  - 边缘靠近墙体 ≤ 10cm 时**自动磁吸贴紧墙面**，让床头靠墙、衣柜贴墙操作极其顺畅精准；
  - 拖入与其他家具发生位置重叠时，包围盒线框即刻变红警示，避免硬穿模。

### 2. 模拟真人在毛坯房内走动漫游 (First-Person Walkthrough)
- **真实人眼视线高度**：严格标定 1.68m 人眼视角（可在 1.50m ~ 1.90m 间自由滑块调节）。
- **键盘鼠标平滑操作**：点击画面锁定鼠标（Pointer Lock），使用 `W / A / S / D` 自由走动，按 `Esc` 退出。
- **物理防穿模碰撞检测**：系统将人体抽象为半径 25cm 的物理柱体，行走靠近大床、衣柜或墙体时会受到阻挡，真实体验过道拥挤度！

### 3. AR 眼镜主视角与实景穿透模拟 (AR Glasses POV)
- **模拟光波导视场角 (52° OST FOV)** 与工程十字准心、空间扫描线。
- **空间感知遥测仪表盘**：`SLAM 6DoF: LOCKED`、`1:1 物理尺度标定`、`SPATIAL MESH: ON`。
- **真实摄像头穿透模式 (Webcam Passthrough)**：支持调用电脑/手机后置摄像头，将真实房间作为背景，实现低门槛实景 AR 试摆！
- **LiDAR 空间网格扫描脉冲**：一键开启，模拟 Apple RoomPlan / Quest 3 激光雷达扫描毛坯房时的青色点阵网格。

### 4. 人体工程学通行动线实时安全预警 (Clearance Safety)
- 遵循室内设计动线标准（主通道 ≥ 800mm，床侧通道 ≥ 600mm）。
- 当家具与墙体、家具与家具之间通道小于 600mm 或发生碰撞时，地面实时标红警告，并弹出拥挤诊断横幅。

### 5. 自然采光与阴影模拟
- 模拟大落地窗自然采光（晨光朝阳、正午艳阳、傍晚晚霞、静谧夜景），在水泥毛坯地面投射真实软阴影。

### 6. 方案管理与采购清单 (BOM)
- **一键样板布局**：主卧方案、大开间客餐厅方案、纯净毛坯房方案。
- **毛坯房尺寸定制**：自由调节开间宽度（3~10m）、进深跨度（3~10m）、层高净高（2.5~4.0m）、墙面裸水泥/腻子白墙。
- **BOM 采购清单与空间容积率核算**：导出完整家具尺寸表、占地率、预估总价，支持复制清单及下载布局 JSON。

---

## 🚀 极速启动与体验指南

本地开发服务已在后台运行中，可直接在浏览器打开：
```
http://localhost:3000/
```

### 命令说明
```bash
# 启动本地开发服务 (支持局域网设备如手机/iPad访问)
npm run dev

# 生产环境打包构建
npm run build

# 预览生产构建包
npm run preview
```

---

## 📁 项目目录结构

```
ARHome/
├── docs/
│   └── AR_Interior_Design_Research_and_Architecture.md  # 详细调研与技术架构报告
├── src/
│   ├── components/
│   │   ├── Header.jsx                 # 顶部主导航与模式切换胶囊
│   │   ├── FurnitureCatalog.jsx       # 左侧 1:1 标准尺寸家居库
│   │   ├── InspectorPanel.jsx         # 右侧已选中家具属性与变换面板
│   │   ├── ARGlassesHUD.jsx           # AR 眼镜光波导 HUD 界面
│   │   ├── WalkthroughControlsGuide.jsx# 真人漫游按键指引
│   │   ├── ClearanceWarningBanner.jsx # 通道动线安全预警条
│   │   ├── RoomSettingsModal.jsx      # 毛坯房长宽高参数配置模态框
│   │   └── BOMExportModal.jsx         # 软装采购物料清单与占地率统计
│   ├── engine/
│   │   ├── SceneManager.js            # 3D 渲染与场景总调度核
│   │   ├── RoomBuilder.js             # 毛坯房水泥地面、梁柱、窗景构建器
│   │   ├── FurnitureModels.js         # 1:1 毫米级程序化 PBR 家具模型生成器
│   │   ├── DimensionVisualizer.js     # 3D CAD 尺寸线、面积标牌、距墙测距
│   │   ├── ClearanceChecker.js        # 动线净宽与防碰撞检测器
│   │   └── FirstPersonWalkController.js # 真人 1.68m 漫游与物理碰撞控制器
│   ├── data/
│   │   ├── furnitureCatalogData.js    # 标准家具数据库 (含精准毫米尺寸)
│   │   └── samplePresets.js           # 预设经典户型布局
│   ├── App.jsx                        # 顶层应用协调逻辑
│   ├── main.jsx                       # React 入口
│   └── index.css                      # Tailwind 与 AR 风格样式
├── index.html
├── package.json
├── vite.config.js
└── README.md
```

---

## 📚 详细技术调研与商业化沉淀文档
系统完整调研报告位于：  
👉 [docs/AR_Interior_Design_Research_and_Architecture.md](./docs/AR_Interior_Design_Research_and_Architecture.md)

报告涵盖：
1. **国内外商业化产品与开源方案对标**（Apple RoomPlan + Vision Pro、Meta Quest 3、酷家乐、贝壳如视、XREAL、Rokid、WebXR）。
2. **毛坯房特性攻关**（弱纹理地面 SLAM 定位漂移、1:1 尺度标定、虚实遮挡、动线安全）。
3. **硬件选型矩阵**（VST 穿透头显 vs OST 光学透视眼镜 vs 手机 LiDAR 协同）。
4. **全套软硬件成本与采购清单**（探索原型 MVP 预算约 3,500 元，双端专业套件约 15,000 元）。
5. **系统分层架构与双端协同方案**（手机触屏选款调参 + AR 眼镜主视沉浸）。
