import React, { useMemo } from 'react';
import * as THREE from 'three';

/**
 * 动态生成高质量水泥毛坯材质贴图 (Procedural Concrete Texture)
 */
function createProceduralConcreteTexture(isFloor = false) {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  const baseGray = isFloor ? 120 : 135;
  ctx.fillStyle = `rgb(${baseGray}, ${baseGray}, ${baseGray})`;
  ctx.fillRect(0, 0, 512, 512);

  const imgData = ctx.getImageData(0, 0, 512, 512);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 35;
    const v = Math.min(255, Math.max(0, data[i] + noise));
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }
  ctx.putImageData(imgData, 0, 0);

  if (isFloor) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, 512, 512);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(256, 0); ctx.lineTo(256, 512);
    ctx.moveTo(0, 256); ctx.lineTo(512, 256);
    ctx.stroke();

    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
    ctx.font = '14px monospace';
    ctx.fillText('REF-1M', 10, 24);
  } else {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, 256); ctx.lineTo(512, 256);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export function RoomMesh({
  roomConfig,
  viewMode = 'orbit',
  isLidarActive = false,
  isOverlayVisible = true,
  overlayOpacity = 0.65
}) {
  const isOrbit = viewMode === 'orbit';
  const width = roomConfig.width || 5.0;
  const depth = roomConfig.depth || 4.2;
  const height = roomConfig.height || 2.8;
  const wallFinish = roomConfig.wallFinish || 'concrete';
  const floorPlan = roomConfig.floorPlan;

  // 1. 水泥贴图
  const floorTexture = useMemo(() => {
    const tex = createProceduralConcreteTexture(true);
    tex.repeat.set(Math.max(width, 4), Math.max(depth, 4));
    return tex;
  }, [width, depth]);

  const wallTexture = useMemo(() => {
    const tex = createProceduralConcreteTexture(false);
    tex.repeat.set(Math.max(width, depth), height);
    return tex;
  }, [width, depth, height]);

  // 2. 材质
  const isSkimCoat = wallFinish === 'skimcoat';
  const floorMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: floorTexture,
    color: new THREE.Color('#737373'),
    roughness: 0.85,
    metalness: 0.05
  }), [floorTexture]);

  const wallMat = useMemo(() => new THREE.MeshStandardMaterial({
    map: isSkimCoat ? null : wallTexture,
    color: new THREE.Color(isSkimCoat ? '#f1f5f9' : '#888888'),
    roughness: isSkimCoat ? 0.95 : 0.8,
    metalness: 0.02,
    side: THREE.DoubleSide
  }), [isSkimCoat, wallTexture]);

  const ceilingMat = useMemo(() => new THREE.MeshStandardMaterial({
    color: new THREE.Color('#666666'),
    roughness: 0.9,
    side: THREE.DoubleSide
  }), []);

  const glassMat = useMemo(() => new THREE.MeshPhysicalMaterial({
    color: '#ffffff',
    transmission: 0.9,
    opacity: 1,
    transparent: true,
    roughness: 0.1,
    ior: 1.5
  }), []);

  // 3. 地面 2D 图纸对照投影贴图
  const overlayTexture = useMemo(() => {
    if (!floorPlan) return null;
    if (floorPlan.blueprintCanvas) {
      return new THREE.CanvasTexture(floorPlan.blueprintCanvas);
    }
    if (floorPlan.overlayImage) {
      return new THREE.TextureLoader().load(floorPlan.overlayImage);
    }
    return null;
  }, [floorPlan]);

  // 4. 窗外城市天际线背景
  const backdropTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#38bdf8');
    grad.addColorStop(0.6, '#bae6fd');
    grad.addColorStop(1, '#94a3b8');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 256);

    ctx.fillStyle = '#64748b';
    for (let x = 0; x < 512; x += 32) {
      const bh = 30 + Math.random() * 45;
      ctx.fillRect(x, 256 - bh, 28, bh);
    }
    return new THREE.CanvasTexture(canvas);
  }, []);

  return (
    <group name="room-group">
      {/* 1. 水泥地面 */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 0]}
        material={floorMat}
        receiveShadow
      >
        <planeGeometry args={[width, depth]} />
      </mesh>

      {/* 2. 地面 2D 工程图纸半透明投影层 */}
      {overlayTexture && isOverlayVisible && (
        <mesh
          rotation={[-Math.PI / 2, 0, 0]}
          position={[0, 0.003, 0]}
        >
          <planeGeometry args={[width, depth]} />
          <meshBasicMaterial
            map={overlayTexture}
            transparent
            opacity={overlayOpacity}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* 3. 水泥天花板 (俯视设计视角剖切隐藏) */}
      {!isOrbit && (
        <mesh
          rotation={[Math.PI / 2, 0, 0]}
          position={[0, height, 0]}
          material={ceilingMat}
          receiveShadow
        >
          <planeGeometry args={[width, depth]} />
        </mesh>
      )}

      {/* 4. 结构梁 */}
      {!isOrbit && !floorPlan && (
        <mesh
          position={[width / 4, height - 0.225, 0]}
          material={ceilingMat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.35, 0.45, depth]} />
        </mesh>
      )}

      {/* 5. 毛坯房结构立柱 */}
      {!floorPlan && (
        <mesh
          position={[-width / 2 + 0.21, height / 2, -depth / 2 + 0.21]}
          material={wallMat}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.42, height, 0.42]} />
        </mesh>
      )}

      {/* 6. 墙体系统 (区分多房间图纸模式与单间模式) */}
      {floorPlan && Array.isArray(floorPlan.walls) ? (
        // A. 户型图纸多房间模式
        floorPlan.walls.map((wall, idx) => {
          const x1 = wall.start[0], z1 = wall.start[1];
          const x2 = wall.end[0], z2 = wall.end[1];
          const dx = x2 - x1, dz = z2 - z1;
          const length = Math.hypot(dx, dz);
          if (length < 0.05) return null;

          const angle = Math.atan2(dz, dx);
          const midX = (x1 + x2) / 2;
          const midZ = (z1 + z2) / 2;
          const thickness = wall.thickness || 0.2;
          const isSouth = wall.isExterior && Math.abs(midZ - depth / 2) < 0.8;

          // 设计视角下剖切南外墙
          if (isOrbit && isSouth) return null;

          // 墙体包含门窗开洞
          if (wall.openings && wall.openings.length > 0) {
            return (
              <group key={`wall-${idx}`} position={[x1, 0, z1]} rotation={[0, -angle, 0]}>
                {wall.openings.map((op, opIdx) => {
                  const opOffset = op.offset || 0;
                  const opWidth = Math.min(op.width || 1.8, length * 0.9);
                  const opH = op.height || 1.8;
                  const sillH = op.type === 'window' ? (op.sillHeight || 0.5) : 0;
                  const topH = Math.max(0.1, height - (sillH + opH));
                  const postStart = opOffset + opWidth;
                  const postLen = length - postStart;

                  return (
                    <group key={`op-${opIdx}`}>
                      {/* 前段实体墙 */}
                      {opOffset > 0.05 && (
                        <mesh position={[opOffset / 2, height / 2, 0]} material={wallMat} castShadow receiveShadow>
                          <boxGeometry args={[opOffset, height, thickness]} />
                        </mesh>
                      )}
                      {/* 后段实体墙 */}
                      {postLen > 0.05 && (
                        <mesh position={[postStart + postLen / 2, height / 2, 0]} material={wallMat} castShadow receiveShadow>
                          <boxGeometry args={[postLen, height, thickness]} />
                        </mesh>
                      )}
                      {/* 门窗过梁 */}
                      {topH > 0.05 && (
                        <mesh position={[opOffset + opWidth / 2, height - topH / 2, 0]} material={wallMat} castShadow receiveShadow>
                          <boxGeometry args={[opWidth, topH, thickness]} />
                        </mesh>
                      )}
                      {/* 窗台与玻璃 */}
                      {op.type === 'window' && sillH > 0.05 && (
                        <>
                          <mesh position={[opOffset + opWidth / 2, sillH / 2, 0]} material={wallMat} castShadow receiveShadow>
                            <boxGeometry args={[opWidth, sillH, thickness]} />
                          </mesh>
                          <mesh position={[opOffset + opWidth / 2, sillH + opH / 2, 0]} material={glassMat}>
                            <planeGeometry args={[opWidth * 0.98, opH * 0.98]} />
                          </mesh>
                        </>
                      )}
                    </group>
                  );
                })}
              </group>
            );
          }

          // 实体平整墙体
          return (
            <mesh
              key={`wall-${idx}`}
              position={[midX, height / 2, midZ]}
              rotation={[0, -angle, 0]}
              material={wallMat}
              castShadow
              receiveShadow
            >
              <boxGeometry args={[length, height, thickness]} />
            </mesh>
          );
        })
      ) : (
        // B. 单矩形房间常规四面墙
        <>
          {/* 南墙 (设计模式剖切隐藏) */}
          {!isOrbit && (
            <mesh position={[0, height / 2, depth / 2 + 0.1]} material={wallMat} receiveShadow>
              <boxGeometry args={[width, height, 0.2]} />
            </mesh>
          )}

          {/* 东墙 */}
          <mesh position={[width / 2 + 0.1, height / 2, 0]} material={wallMat} receiveShadow>
            <boxGeometry args={[0.2, height, depth]} />
          </mesh>

          {/* 西墙 */}
          <mesh position={[-width / 2 - 0.1, height / 2, 0]} material={wallMat} receiveShadow>
            <boxGeometry args={[0.2, height, depth]} />
          </mesh>

          {/* 北墙：落地大采光窗与窗台 */}
          <group position={[0, 0, -depth / 2 - 0.1]}>
            {/* 窗台 */}
            <mesh position={[0, 0.225, 0]} material={wallMat} receiveShadow>
              <boxGeometry args={[width, 0.45, 0.2]} />
            </mesh>
            {/* 窗顶梁 */}
            <mesh position={[0, height - (height - 0.45 - height * 0.75) / 2, 0]} material={wallMat} receiveShadow>
              <boxGeometry args={[width, height - 0.45 - height * 0.75, 0.2]} />
            </mesh>
            {/* 窗户高透玻璃 */}
            <mesh position={[0, 0.45 + (height * 0.75) / 2, 0.1]} material={glassMat}>
              <planeGeometry args={[Math.min(width * 0.7, 3.2), height * 0.75]} />
            </mesh>
          </group>
        </>
      )}

      {/* 7. 窗外城市天际线远景 */}
      <mesh position={[0, 3.5, -depth / 2 - 4.5]}>
        <planeGeometry args={[16, 10]} />
        <meshBasicMaterial map={backdropTexture} />
      </mesh>

      {/* 8. LiDAR 雷达空间网格扫描层 */}
      {isLidarActive && (
        <gridHelper
          args={[Math.max(width, depth) * 1.2, Math.round(Math.max(width, depth) * 4), 0x06b6d4, 0x0e7490]}
          position={[0, 0.005, 0]}
        />
      )}
    </group>
  );
}
