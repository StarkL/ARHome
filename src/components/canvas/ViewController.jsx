import React, { useEffect, useRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

export function ViewController({
  viewMode = 'orbit',
  eyeHeight = 1.68,
  isLocked,
  onLockChange,
  wallBounds,
  placedItems = [],
  directionState = {}
}) {
  const { camera, gl } = useThree();
  const orbitRef = useRef();

  // 第一人称移动状态
  const moveState = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  });

  const rotation = useRef({ yaw: 0, pitch: 0 });
  const position = useRef(new THREE.Vector3(0, eyeHeight, 2.0));
  const isLockedRef = useRef(false);

  // 1. 响应视角模式切换
  useEffect(() => {
    if (viewMode === 'orbit') {
      if (document.pointerLockElement) {
        document.exitPointerLock();
      }
      camera.fov = 45;
      camera.updateProjectionMatrix();
      if (orbitRef.current) {
        orbitRef.current.target.set(0, 0.6, 0);
      }
    } else {
      // 漫游或 AR 模式
      camera.fov = viewMode === 'ar_pov' ? 52 : 65;
      camera.updateProjectionMatrix();
      position.current.y = eyeHeight;
      camera.position.copy(position.current);
    }
  }, [viewMode, camera, eyeHeight]);

  // 2. 外部虚拟方向盘 (D-Pad) 状态同步
  useEffect(() => {
    moveState.current.forward = !!directionState.forward;
    moveState.current.backward = !!directionState.backward;
    moveState.current.left = !!directionState.left;
    moveState.current.right = !!directionState.right;
  }, [directionState]);

  // 3. 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (viewMode === 'orbit') return;
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') moveState.current.forward = true;
      if (code === 'KeyS' || key === 's' || code === 'ArrowDown') moveState.current.backward = true;
      if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') moveState.current.left = true;
      if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') moveState.current.right = true;
    };

    const handleKeyUp = (e) => {
      const code = e.code || '';
      const key = (e.key || '').toLowerCase();
      if (code === 'KeyW' || key === 'w' || code === 'ArrowUp') moveState.current.forward = false;
      if (code === 'KeyS' || key === 's' || code === 'ArrowDown') moveState.current.backward = false;
      if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft') moveState.current.left = false;
      if (code === 'KeyD' || key === 'd' || code === 'ArrowRight') moveState.current.right = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [viewMode]);

  // 4. 指针锁定 (Pointer Lock) 与鼠标转头
  useEffect(() => {
    const domElement = gl.domElement;

    const handlePointerLockChange = () => {
      const locked = document.pointerLockElement === domElement;
      isLockedRef.current = locked;
      if (onLockChange) onLockChange(locked);
    };

    const handleMouseMove = (e) => {
      if (!isLockedRef.current || viewMode === 'orbit') return;
      const movementX = e.movementX || 0;
      const movementY = e.movementY || 0;
      const sensitivity = 0.0022;

      rotation.current.yaw -= movementX * sensitivity;
      rotation.current.pitch -= movementY * sensitivity;

      const maxPitch = Math.PI / 2 - 0.05;
      rotation.current.pitch = Math.max(-maxPitch, Math.min(maxPitch, rotation.current.pitch));

      const euler = new THREE.Euler(0, 0, 0, 'YXZ');
      euler.x = rotation.current.pitch;
      euler.y = rotation.current.yaw;
      camera.quaternion.setFromEuler(euler);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gl, viewMode, camera, onLockChange]);

  // 5. 每帧物理更新与防穿模滑动测试 (useFrame)
  useFrame((_, delta) => {
    if (viewMode === 'orbit') return;

    const bodyRadius = 0.35;
    const moveSpeed = 2.4;

    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rotation.current.yaw);

    const moveDir = new THREE.Vector3();
    if (moveState.current.forward) moveDir.add(forward);
    if (moveState.current.backward) moveDir.sub(forward);
    if (moveState.current.right) moveDir.add(right);
    if (moveState.current.left) moveDir.sub(right);

    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      const step = moveDir.multiplyScalar(moveSpeed * delta);

      // 轴分离滑动测试
      const testMoveAxis = (axis, deltaVal) => {
        if (Math.abs(deltaVal) < 0.00001) return;

        let nextVal = position.current[axis] + deltaVal;

        // 1. 外墙硬阻挡
        if (wallBounds) {
          if (axis === 'x') {
            nextVal = Math.max(wallBounds.minX + bodyRadius, Math.min(wallBounds.maxX - bodyRadius, nextVal));
          } else if (axis === 'z') {
            nextVal = Math.max(wallBounds.minZ + bodyRadius, Math.min(wallBounds.maxZ - bodyRadius, nextVal));
          }
        }

        // 2. 家具碰撞与逃逸法则
        let canMove = true;
        const testCandidate = position.current.clone();
        testCandidate[axis] = nextVal;

        for (const item of placedItems) {
          if (item.userData?.catalogId === 'wall-tv-65inch') continue;
          const box = new THREE.Box3().setFromObject(item.group || item);

          const curClampedX = Math.max(box.min.x, Math.min(box.max.x, position.current.x));
          const curClampedZ = Math.max(box.min.z, Math.min(box.max.z, position.current.z));
          const curDistSq = (position.current.x - curClampedX) ** 2 + (position.current.z - curClampedZ) ** 2;

          const newClampedX = Math.max(box.min.x, Math.min(box.max.x, testCandidate.x));
          const newClampedZ = Math.max(box.min.z, Math.min(box.max.z, testCandidate.z));
          const newDistSq = (testCandidate.x - newClampedX) ** 2 + (testCandidate.z - newClampedZ) ** 2;

          if (newDistSq < bodyRadius ** 2) {
            if (newDistSq >= curDistSq - 0.0001) {
              // 逃逸中，允许
            } else {
              canMove = false;
              break;
            }
          }
        }

        // 3. 内隔墙碰撞与门洞通行
        if (canMove && wallBounds?.wallSegments) {
          for (const wall of wallBounds.wallSegments) {
            if (wall.isExterior) continue;
            const x1 = wall.start[0], z1 = wall.start[1];
            const x2 = wall.end[0], z2 = wall.end[1];
            const dx = x2 - x1, dz = z2 - z1;
            const lenSq = dx * dx + dz * dz;
            if (lenSq < 0.001) continue;

            const len = Math.sqrt(lenSq);
            const u = Math.max(0, Math.min(1, ((testCandidate.x - x1) * dx + (testCandidate.z - z1) * dz) / lenSq));
            const distAlong = u * len;

            let inOpening = false;
            if (wall.openings) {
              for (const op of wall.openings) {
                if (distAlong >= (op.offset || 0) && distAlong <= (op.offset || 0) + (op.width || 0.9)) {
                  inOpening = true;
                  break;
                }
              }
            }
            if (inOpening) continue;

            const closestX = x1 + u * dx;
            const closestZ = z1 + u * dz;
            const newDistSq = (testCandidate.x - closestX) ** 2 + (testCandidate.z - closestZ) ** 2;
            const wallThick = wall.thickness || 0.2;
            if (newDistSq < (bodyRadius + wallThick / 2) ** 2) {
              const curU = Math.max(0, Math.min(1, ((position.current.x - x1) * dx + (position.current.z - z1) * dz) / lenSq));
              const curClosestX = x1 + curU * dx;
              const curClosestZ = z1 + curU * dz;
              const curDistSq = (position.current.x - curClosestX) ** 2 + (position.current.z - curClosestZ) ** 2;
              if (newDistSq < curDistSq - 0.0001) {
                canMove = false;
                break;
              }
            }
          }
        }

        if (canMove) {
          position.current[axis] = nextVal;
        }
      };

      testMoveAxis('x', step.x);
      testMoveAxis('z', step.z);
    }

    position.current.y = eyeHeight;
    camera.position.copy(position.current);
  });

  return viewMode === 'orbit' ? (
    <OrbitControls
      ref={orbitRef}
      makeDefault
      enableDamping
      dampingFactor={0.05}
      maxPolarAngle={Math.PI / 2 - 0.02}
      minDistance={1.0}
      maxDistance={25.0}
    />
  ) : null;
}
