import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Upload, 
  Sparkles, 
  Ruler, 
  Layers, 
  Eye, 
  Check, 
  RotateCw, 
  FileText, 
  Image as ImageIcon,
  Sliders,
  Maximize2,
  AlertCircle,
  Download,
  Zap
} from 'lucide-react';
import { PRESET_BLUEPRINTS, renderBlueprintCanvas, parseFloorPlanImage } from '../engine/FloorPlanParser';

// 官方预置测试图纸样张库
const SAMPLE_TEST_BLUEPRINTS = [
  {
    id: 'two-bedroom-suite',
    name: '01_两室一厅经典户型_施工放线图',
    subTitle: '8.4m × 7.2m · 约 60.5㎡',
    fileName: '01_两室一厅经典户型_施工放线图.png',
    width: 8.4,
    desc: '全景客餐厅 + 南向主卧 + 次卧/书房，含门洞通道与落地采光大飘窗'
  },
  {
    id: 'l-shaped-loft',
    name: '02_L型大开间客餐厅_户型平面图',
    subTitle: '7.6m × 6.0m · 约 45.6㎡',
    fileName: '02_L型大开间客餐厅_户型平面图.png',
    width: 7.6,
    desc: 'L型通透大开间客餐厨一体，开阔动线与转角长岛台'
  },
  {
    id: 'master-bedroom-suite',
    name: '03_豪华南向大主卧套间_建筑图',
    subTitle: '5.4m × 4.6m · 约 24.8㎡',
    fileName: '03_豪华南向大主卧套间_建筑图.png',
    width: 5.4,
    desc: '标准主卧套房，含床位就寝区、步入式衣帽间隔墙与大飘窗'
  },
  {
    id: 'hand-drawn-sketch',
    name: '04_毛坯现场手绘实测草图',
    subTitle: '6.5m × 5.2m · 约 33.8㎡',
    fileName: '04_毛坯现场手绘实测草图.png',
    width: 6.5,
    desc: '模拟现场实测手绘黑白墨线草图，测试草图抗噪与自适应识别'
  }
];

export function FloorPlanImportModal({
  isOpen,
  onClose,
  onLoadFloorPlan,
  isOverlayVisible,
  onToggleOverlay,
  overlayOpacity,
  onChangeOverlayOpacity
}) {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'upload'
  const [selectedPresetId, setSelectedPresetId] = useState('two-bedroom-suite');
  const [wallFinish, setWallFinish] = useState('concrete');
  const [showOverlayOnFloor, setShowOverlayOnFloor] = useState(true);
  const [clearExistingFurniture, setClearExistingFurniture] = useState(true);

  // 本地上传状态
  const [uploadedImage, setUploadedImage] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [targetWidth, setTargetWidth] = useState(7.5);
  const [wallHeight, setWallHeight] = useState(2.8);
  const [threshold, setThreshold] = useState(130);
  const [parsedCustomPlan, setParsedCustomPlan] = useState(null);

  // 预览 Canvas Ref
  const presetCanvasRef = useRef(null);
  const uploadCanvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // 渲染当前选中的预置图纸预览
  useEffect(() => {
    if (activeTab === 'presets' && presetCanvasRef.current) {
      const preset = PRESET_BLUEPRINTS.find(p => p.id === selectedPresetId);
      if (preset) {
        const cvs = renderBlueprintCanvas(preset, { width: 640, height: 480, theme: 'cad_light' });
        const ctx = presetCanvasRef.current.getContext('2d');
        presetCanvasRef.current.width = 640;
        presetCanvasRef.current.height = 480;
        ctx.clearRect(0, 0, 640, 480);
        ctx.drawImage(cvs, 0, 0);
      }
    }
  }, [activeTab, selectedPresetId]);

  // 在预览 Canvas 上叠加绘制识别到的墙体骨骼与红绿标记
  const drawDetectionResult = (img, plan, wMeters) => {
    if (!uploadCanvasRef.current || !img || !plan) return;
    const cvs = uploadCanvasRef.current;
    cvs.width = 600;
    cvs.height = Math.round(600 * (img.height / img.width));
    const ctx = cvs.getContext('2d');
    ctx.drawImage(img, 0, 0, cvs.width, cvs.height);

    // 绿色高亮绘制识别提取出的墙体线段
    ctx.strokeStyle = '#22c55e';
    ctx.lineWidth = 4;
    const scale = cvs.width / wMeters;
    const cx = cvs.width / 2;
    const cy = cvs.height / 2;

    plan.walls.forEach(w => {
      const x1 = cx + w.start[0] * scale;
      const y1 = cy + w.start[1] * scale;
      const x2 = cx + w.end[0] * scale;
      const y2 = cy + w.end[1] * scale;

      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // 端点红圈
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x1, y1, 4, 0, Math.PI * 2);
      ctx.arc(x2, y2, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  // 保证 Canvas 挂载后及时重绘 CV 标记
  useEffect(() => {
    if (uploadedImage && parsedCustomPlan) {
      drawDetectionResult(uploadedImage, parsedCustomPlan, targetWidth);
    }
  }, [uploadedImage, parsedCustomPlan, targetWidth]);

  // 触发图片自动 CV 解析
  const runAutoDetection = async (img, wMeters, thresh) => {
    setIsProcessing(true);
    try {
      const plan = await parseFloorPlanImage(img, {
        targetWidthMeters: wMeters,
        threshold: thresh,
        wallHeightMeters: wallHeight
      });
      setParsedCustomPlan(plan);
    } catch (err) {
      console.error('Auto detection failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理文件上传
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setUploadedImage(img);
        runAutoDetection(img, targetWidth, threshold);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  // 下载当前选中的预置施工图纸
  const handleDownloadCurrentPreset = () => {
    const preset = PRESET_BLUEPRINTS.find(p => p.id === selectedPresetId);
    if (!preset) return;
    const cvs = renderBlueprintCanvas(preset, { 
      width: 1600, 
      height: Math.round(1600 * (preset.targetDepthMeters / preset.targetWidthMeters)), 
      theme: 'cad_light' 
    });
    const a = document.createElement('a');
    a.href = cvs.toDataURL('image/png');
    a.download = `${preset.name}_施工放线图.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 下载指定测试图纸样张 PNG
  const handleDownloadSample = (sample) => {
    const preset = PRESET_BLUEPRINTS.find(p => p.id === sample.id);
    if (!preset) return;
    const cvs = renderBlueprintCanvas(preset, { 
      width: 1600, 
      height: Math.round(1600 * (preset.targetDepthMeters / preset.targetWidthMeters)), 
      theme: 'cad_light' 
    });
    const a = document.createElement('a');
    a.href = cvs.toDataURL('image/png');
    a.download = sample.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 载入特定测试样张进入 CV 检测流
  const handleLoadSpecificSample = (sample) => {
    const preset = PRESET_BLUEPRINTS.find(p => p.id === sample.id);
    if (!preset) return;
    const cvs = renderBlueprintCanvas(preset, { 
      width: 800, 
      height: Math.round(800 * (preset.targetDepthMeters / preset.targetWidthMeters)), 
      theme: 'cad_light' 
    });
    const img = new Image();
    img.onload = () => {
      setUploadedImage(img);
      setTargetWidth(preset.targetWidthMeters);
      runAutoDetection(img, preset.targetWidthMeters, threshold);
    };
    img.src = cvs.toDataURL();
  };

  // 提交生成 3D 场景
  const handleGenerate3DScene = () => {
    let finalPlan = null;

    if (activeTab === 'presets') {
      const preset = PRESET_BLUEPRINTS.find(p => p.id === selectedPresetId);
      if (!preset) return;
      // 预生成 CAD 高清图纸作为地面贴图 (开启 forFloorOverlay: true，确保 1:1 无外边距、严格贴合)
      const cvs = renderBlueprintCanvas(preset, { 
        width: 1024, 
        forFloorOverlay: true 
      });
      finalPlan = {
        ...preset,
        blueprintCanvas: showOverlayOnFloor ? cvs : null,
        wallHeightMeters: wallHeight
      };
    } else {
      if (!parsedCustomPlan) return;
      finalPlan = {
        ...parsedCustomPlan,
        wallHeightMeters: wallHeight,
        overlayImage: showOverlayOnFloor ? parsedCustomPlan.overlayImage : null
      };
    }

    onLoadFloorPlan(finalPlan, {
      wallFinish,
      clearExistingFurniture,
      showOverlay: showOverlayOnFloor
    });
    onClose();
  };

  const currentPreset = PRESET_BLUEPRINTS.find(p => p.id === selectedPresetId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-4xl max-h-[92vh] glass-panel rounded-2xl border border-slate-700 shadow-2xl flex flex-col overflow-hidden">
        
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/80 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">户型图纸自动解析与 3D 重建</h3>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-700">
                  CV 墙体骨骼提取
                </span>
              </div>
              <p className="text-xs text-slate-400">
                导入 2D 户型图或草图，算法自动提取墙体、门窗与功能区，生成 1:1 三维真实毛坯房
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 标签切换栏 */}
        <div className="flex px-6 pt-3 border-b border-slate-800 bg-slate-950/40 gap-4">
          <button
            onClick={() => setActiveTab('presets')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
              activeTab === 'presets' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>标准工程户型库 (推荐)</span>
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 transition-all relative ${
              activeTab === 'upload' 
                ? 'text-cyan-400 border-b-2 border-cyan-400' 
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>本地上传自定义图纸 / 草图</span>
          </button>
        </div>

        {/* 核心内容区 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'presets' ? (
            /* TAB 1: 预置户型库 */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* 左侧选择卡片列表 */}
              <div className="lg:col-span-5 space-y-3">
                <label className="text-xs font-semibold text-slate-400 block uppercase tracking-wider">
                  选择标准户型样本:
                </label>
                {PRESET_BLUEPRINTS.map(preset => (
                  <button
                    key={preset.id}
                    onClick={() => setSelectedPresetId(preset.id)}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                      selectedPresetId === preset.id
                        ? 'bg-cyan-950/60 border-cyan-500 shadow-md shadow-cyan-950 text-white'
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-sm">{preset.name}</span>
                      <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-400">
                        {preset.targetWidthMeters}m × {preset.targetDepthMeters}m
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed line-clamp-2">
                      {preset.description}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>包含 {preset.rooms.length} 个功能区</span>
                      <span>·</span>
                      <span>{preset.walls.length} 段承重与内隔墙</span>
                    </div>
                  </button>
                ))}
              </div>

              {/* 右侧实时 CAD 图纸预览 */}
              <div className="lg:col-span-7 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-400">
                    📐 1:1 施工放线矢量图纸预览:
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-cyan-400 font-mono">
                      开间 {currentPreset?.targetWidthMeters}m · 进深 {currentPreset?.targetDepthMeters}m
                    </span>
                    <button
                      onClick={handleDownloadCurrentPreset}
                      className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] border border-slate-700 flex items-center gap-1.5 transition-colors shadow-sm"
                      title="下载此施工放线图 PNG 到本地"
                    >
                      <Download className="w-3.5 h-3.5 text-cyan-400" />
                      <span>下载图纸 PNG</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-slate-900/90 rounded-xl border border-slate-800 p-2 flex items-center justify-center overflow-hidden min-h-[300px]">
                  <canvas 
                    ref={presetCanvasRef} 
                    className="max-w-full max-h-[360px] object-contain rounded-lg shadow-inner"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: 本地上传与算法识别 */
            <div className="space-y-6">
              {!uploadedImage ? (
                /* 上传拖拽盒 + 官方实测图纸样张库 */
                <div className="space-y-5">
                  {/* 上传拖拽区 */}
                  <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-2xl p-6 text-center bg-slate-900/40 transition-all flex flex-col items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-950 border border-cyan-800/80 flex items-center justify-center mb-2">
                      <ImageIcon className="w-6 h-6 text-cyan-400" />
                    </div>
                    <h4 className="font-bold text-white text-sm mb-1">拖拽或点击上传本地户型图纸</h4>
                    <p className="text-xs text-slate-400 max-w-md mb-3">
                      支持地产户型图、施工图、CAD 导出的 PNG/JPG 或手机拍摄的毛坯房地面草图
                    </p>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition-colors flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>选择本地图纸文件</span>
                      </button>
                      <span className="text-xs text-slate-500">或直接使用下方测试图纸库 👇</span>
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/webp"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </div>

                  {/* 官方测试图纸样张库卡片 */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                        <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                          📁 官方实测图纸样张库 (即开即测)
                        </h4>
                      </div>
                      <span className="text-[11px] text-slate-400">
                        支持「一键填入识别」或「下载到电脑/手机体验真实拖拽上传」
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {SAMPLE_TEST_BLUEPRINTS.map((sample) => (
                        <div
                          key={sample.id}
                          className="bg-slate-900/80 border border-slate-800 hover:border-slate-700 rounded-xl p-3.5 flex flex-col justify-between transition-all hover:bg-slate-900 shadow-sm"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-1.5">
                              <h5 className="font-semibold text-xs text-white leading-tight">
                                {sample.name.replace(/^[0-9]+_/, '')}
                              </h5>
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800/60 whitespace-nowrap">
                                {sample.subTitle}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                              {sample.desc}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 pt-2 border-t border-slate-800/80">
                            <button
                              onClick={() => handleLoadSpecificSample(sample)}
                              className="flex-1 py-1.5 px-2.5 rounded-lg bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                            >
                              <Zap className="w-3.5 h-3.5 text-cyan-400" />
                              <span>⚡ 一键填入实测</span>
                            </button>
                            <button
                              onClick={() => handleDownloadSample(sample)}
                              className="py-1.5 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                              title="下载图纸PNG到电脑或手机"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-400" />
                              <span>📥 下载PNG</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                /* 已上传图片与算法微调调控台 */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* 左侧 CV 墙体识别预览 Canvas */}
                  <div className="lg:col-span-7 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-slate-300">CV 骨骼识别可视化:</span>
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" /> 绿色为识别墙线
                        </span>
                      </div>
                      <button
                        onClick={() => { setUploadedImage(null); setParsedCustomPlan(null); }}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        重新上传
                      </button>
                    </div>
                    <div className="bg-slate-900 rounded-xl border border-slate-800 p-2 flex items-center justify-center min-h-[300px]">
                      <canvas 
                        ref={uploadCanvasRef} 
                        className="max-w-full max-h-[360px] object-contain rounded-lg shadow-inner"
                      />
                    </div>
                    {parsedCustomPlan && (
                      <div className="mt-2 text-xs text-slate-400 flex items-center gap-3">
                        <span>提取墙体：<strong className="text-white">{parsedCustomPlan.walls.length}</strong> 段</span>
                        <span>·</span>
                        <span>估算套内面积：<strong className="text-cyan-400 font-mono">{(targetWidth * parsedCustomPlan.targetDepthMeters * 0.8).toFixed(1)} ㎡</strong></span>
                      </div>
                    )}
                  </div>

                  {/* 右侧比例尺与识别阈值校准 */}
                  <div className="lg:col-span-5 space-y-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400">
                      <Sliders className="w-4 h-4" />
                      <span>1:1 真实尺寸与算法校准</span>
                    </div>

                    {/* 开间物理总跨度 */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>设定图纸开间总宽度:</span>
                        <span className="font-mono text-cyan-400 font-bold">{targetWidth} 米</span>
                      </div>
                      <input
                        type="range"
                        min="3.0"
                        max="16.0"
                        step="0.2"
                        value={targetWidth}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setTargetWidth(val);
                          if (uploadedImage) runAutoDetection(uploadedImage, val, threshold);
                        }}
                        className="w-full accent-cyan-400"
                      />
                      <span className="text-[10px] text-slate-500">
                        建立 1:1 真实世界比例尺 (米/像素)
                      </span>
                    </div>

                    {/* 墙体灰度提取灵敏度 */}
                    <div>
                      <div className="flex justify-between text-xs text-slate-300 mb-1">
                        <span>墨线二值化识别阈值:</span>
                        <span className="font-mono text-emerald-400 font-bold">{threshold}</span>
                      </div>
                      <input
                        type="range"
                        min="60"
                        max="210"
                        step="5"
                        value={threshold}
                        onChange={(e) => {
                          const val = parseInt(e.target.value);
                          setThreshold(val);
                          if (uploadedImage) runAutoDetection(uploadedImage, targetWidth, val);
                        }}
                        className="w-full accent-emerald-400"
                      />
                      <span className="text-[10px] text-slate-500">
                        深色扫描线/粗墨线滤除与连通度阈值
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 场景构建通用选项 */}
          <div className="pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* 墙面装修状态 */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">毛坯房墙面施工质感:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setWallFinish('concrete')}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-center transition-all ${
                    wallFinish === 'concrete'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  裸水泥原貌
                </button>
                <button
                  type="button"
                  onClick={() => setWallFinish('skimcoat')}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-center transition-all ${
                    wallFinish === 'skimcoat'
                      ? 'bg-cyan-950 border-cyan-500 text-cyan-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  已刮白腻子
                </button>
              </div>
            </div>

            {/* 室内净层高 */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">净层高高度:</label>
              <select
                value={wallHeight}
                onChange={(e) => setWallHeight(parseFloat(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2 text-slate-200"
              >
                <option value={2.6}>2.60 米 (标准层高)</option>
                <option value={2.8}>2.80 米 (主流改善住宅)</option>
                <option value={3.0}>3.00 米 (阔景挑高层)</option>
                <option value={3.2}>3.20 米 (豪宅/Loft下层)</option>
              </select>
            </div>

            {/* 地面保留图纸投影 */}
            <div>
              <label className="text-slate-400 block mb-1.5 font-medium">3D 地面对照投影层:</label>
              <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900 border border-slate-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOverlayOnFloor}
                  onChange={(e) => setShowOverlayOnFloor(e.target.checked)}
                  className="rounded accent-cyan-400"
                />
                <span className="text-slate-300">地面投影 2D 图纸 (1:1 校对)</span>
              </label>
            </div>
          </div>
        </div>

        {/* 底部操作按钮 */}
        <div className="px-6 py-4 border-t border-slate-700/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>生成后可在设计视角拖拽摆放家具，或进入“真人走动”进行 1:1 室内漫游</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleGenerate3DScene}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all transform active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>生成 1:1 三维毛坯房场景</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
