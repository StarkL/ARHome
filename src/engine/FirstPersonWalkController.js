import * as THREE from 'three';

/**
 * 真人走动漫游控制器 (FirstPersonWalkController)
 * 严格模拟佩戴 AR 眼镜的人在毛坯房中行走的体感
 * - 真实人眼视线高度：默认 1.68m
 * - 键盘 WASD / 箭头按键 / 鼠标平滑转头 / 虚拟按键
 * - 轴分离滑动碰撞 (Wall/Furniture Sliding) 与防卡死反向逃逸算法
 */
export class FirstPersonWalkController {
  constructor(camera, domElement, onLockChange) {
    this.camera = camera;
    this.domElement = domElement;
    this.onLockChange = onLockChange;

    this.enabled = false;
    this.isLocked = false;

    // 人体工学参数
    this.eyeHeight = 1.68; // 真实眼高 (米)
    this.bodyRadius = 0.25; // 人体碰撞圆柱体半径 25cm
    this.moveSpeed = 2.4;  // 漫游步速 2.4 m/s (约正常散步速度)
    
    // 摄像机旋转角
    this.pitch = 0; // 上下俯仰
    this.yaw = 0;   // 左右转向

    // 移动输入状态
    this.moveState = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // 虚拟摇杆输入 (移动端)
    this.joystickDelta = { x: 0, y: 0 };

    this.velocity = new THREE.Vector3();
    this.position = new THREE.Vector3(0, this.eyeHeight, 1.3);

    this._bindEvents();
  }

  _bindEvents() {
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onPointerLockChange = this._onPointerLockChange.bind(this);

    window.addEventListener('keydown', this._onKeyDown, { capture: true });
    window.addEventListener('keyup', this._onKeyUp, { capture: true });
    document.addEventListener('pointerlockchange', this._onPointerLockChange);
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown, { capture: true });
    window.removeEventListener('keyup', this._onKeyUp, { capture: true });
    document.removeEventListener('pointerlockchange', this._onPointerLockChange);
    document.removeEventListener('mousemove', this._onMouseMove);
  }

  requestLock() {
    if (!this.isLocked && this.domElement.requestPointerLock) {
      this.domElement.requestPointerLock();
      this.domElement.focus();
    }
  }

  exitLock() {
    if (this.isLocked && document.exitPointerLock) {
      document.exitPointerLock();
    }
  }

  _onPointerLockChange() {
    this.isLocked = document.pointerLockElement === this.domElement;
    if (this.isLocked) {
      document.addEventListener('mousemove', this._onMouseMove);
    } else {
      document.removeEventListener('mousemove', this._onMouseMove);
      // 清空移动状态，避免卡键
      this.moveState.forward = false;
      this.moveState.backward = false;
      this.moveState.left = false;
      this.moveState.right = false;
    }
    if (this.onLockChange) {
      this.onLockChange(this.isLocked);
    }
  }

  _onMouseMove(event) {
    if (!this.enabled || !this.isLocked) return;

    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    // 灵敏度
    const sensitivity = 0.0022;
    this.yaw -= movementX * sensitivity;
    this.pitch -= movementY * sensitivity;

    // 限制垂直抬头/低头角度 (-85度 到 +85度)
    const maxPitch = Math.PI / 2 - 0.05;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this._updateCameraRotation();
  }

  _updateCameraRotation() {
    const euler = new THREE.Euler(0, 0, 0, 'YXZ');
    euler.x = this.pitch;
    euler.y = this.yaw;
    this.camera.quaternion.setFromEuler(euler);
  }

  _onKeyDown(e) {
    if (!this.enabled) return;
    const code = e.code || '';
    const key = (e.key || '').toLowerCase();

    if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') {
      this.moveState.forward = true;
    }
    if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') {
      this.moveState.backward = true;
    }
    if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft' || key === 'arrowleft') {
      this.moveState.left = true;
    }
    if (code === 'KeyD' || key === 'd' || code === 'ArrowRight' || key === 'arrowright') {
      this.moveState.right = true;
    }
  }

  _onKeyUp(e) {
    const code = e.code || '';
    const key = (e.key || '').toLowerCase();

    if (code === 'KeyW' || key === 'w' || code === 'ArrowUp' || key === 'arrowup') {
      this.moveState.forward = false;
    }
    if (code === 'KeyS' || key === 's' || code === 'ArrowDown' || key === 'arrowdown') {
      this.moveState.backward = false;
    }
    if (code === 'KeyA' || key === 'a' || code === 'ArrowLeft' || key === 'arrowleft') {
      this.moveState.left = false;
    }
    if (code === 'KeyD' || key === 'd' || code === 'ArrowRight' || key === 'arrowright') {
      this.moveState.right = false;
    }
  }

  setEyeHeight(height) {
    this.eyeHeight = height;
    this.position.y = this.eyeHeight;
  }

  setPosition(x, z) {
    this.position.set(x, this.eyeHeight, z);
    this.camera.position.copy(this.position);
  }

  setJoystickDelta(x, y) {
    this.joystickDelta = { x, y };
  }

  setDirectionState(direction, active) {
    if (direction in this.moveState) {
      this.moveState[direction] = active;
    }
  }

  /**
   * 每帧物理更新与防穿模碰撞检测
   * 采用轴分离滑动碰撞 (Axis-separated sliding) 与反向逃逸算法
   * @param {number} delta 秒
   * @param {Object} bounds 墙壁边界 { minX, maxX, minZ, maxZ }
   * @param {Array<THREE.Object3D>} obstacles 家具列表
   */
  update(delta, bounds, obstacles = []) {
    if (!this.enabled) return;

    // 计算水平朝向向量
    const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);
    const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.yaw);

    const moveDir = new THREE.Vector3();

    // 键盘输入
    if (this.moveState.forward) moveDir.add(forward);
    if (this.moveState.backward) moveDir.sub(forward);
    if (this.moveState.right) moveDir.add(right);
    if (this.moveState.left) moveDir.sub(right);

    // 摇杆输入 (若有)
    if (Math.abs(this.joystickDelta.x) > 0.05 || Math.abs(this.joystickDelta.y) > 0.05) {
      moveDir.add(right.clone().multiplyScalar(this.joystickDelta.x));
      moveDir.add(forward.clone().multiplyScalar(-this.joystickDelta.y));
    }

    if (moveDir.lengthSq() > 0.0001) {
      moveDir.normalize();
      const step = moveDir.multiplyScalar(this.moveSpeed * delta);

      // 轴分离测试 (分别测试 X 与 Z 轴，支持沿床边/墙体顺滑滑动，并支持从障碍物内部走出逃逸)
      const testMoveAxis = (axis, deltaVal) => {
        if (Math.abs(deltaVal) < 0.00001) return;

        let nextPos = this.position[axis] + deltaVal;

        // 1. 墙面物理边界限制
        if (bounds) {
          if (axis === 'x') {
            nextPos = Math.max(bounds.minX + this.bodyRadius, Math.min(bounds.maxX - this.bodyRadius, nextPos));
          } else if (axis === 'z') {
            nextPos = Math.max(bounds.minZ + this.bodyRadius, Math.min(bounds.maxZ - this.bodyRadius, nextPos));
          }
        }

        // 2. 检测家具障碍物碰撞
        let canMove = true;
        const testCandidate = this.position.clone();
        testCandidate[axis] = nextPos;

        for (const obj of obstacles) {
          if (obj.userData.catalogId === 'wall-tv-65inch') continue;

          const box = new THREE.Box3().setFromObject(obj);

          // 当前位置到该包围盒的最短距离
          const curClampedX = Math.max(box.min.x, Math.min(box.max.x, this.position.x));
          const curClampedZ = Math.max(box.min.z, Math.min(box.max.z, this.position.z));
          const curDistSq = (this.position.x - curClampedX) ** 2 + (this.position.z - curClampedZ) ** 2;

          // 候选新位置到该包围盒的最短距离
          const newClampedX = Math.max(box.min.x, Math.min(box.max.x, testCandidate.x));
          const newClampedZ = Math.max(box.min.z, Math.min(box.max.z, testCandidate.z));
          const newDistSq = (testCandidate.x - newClampedX) ** 2 + (testCandidate.z - newClampedZ) ** 2;

          const minDistSq = this.bodyRadius ** 2;

          // 若目标位置侵入了碰撞半径
          if (newDistSq < minDistSq) {
            // 核心逃逸法则：如果新位置的距离比当前位置更远（即正在往远离物体的方向走），允许通行！
            if (newDistSq >= curDistSq - 0.0001) {
              // 正在走出碰撞体或保持平行，允许通过
            } else {
              // 正在更深地钻进碰撞体，阻止该轴移动
              canMove = false;
              break;
            }
          }
        }

        // 3. 检测内墙隔断碰撞 (Interior Wall Segments & Openings)
        if (canMove && bounds && Array.isArray(bounds.wallSegments) && bounds.wallSegments.length > 0) {
          for (const wall of bounds.wallSegments) {
            if (wall.isExterior) continue; // 外墙已由 bounds.min/max 处理
            const x1 = wall.start[0], z1 = wall.start[1];
            const x2 = wall.end[0], z2 = wall.end[1];
            const dx = x2 - x1, dz = z2 - z1;
            const lenSq = dx * dx + dz * dz;
            if (lenSq < 0.001) continue;

            const len = Math.sqrt(lenSq);
            // 投影计算
            const u = Math.max(0, Math.min(1, ((testCandidate.x - x1) * dx + (testCandidate.z - z1) * dz) / lenSq));
            const distAlong = u * len;

            // 检查是否走在门洞/通道范围内 (若是门洞，则允许通行)
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
            const limitDistSq = (this.bodyRadius + wallThick / 2) ** 2;

            if (newDistSq < limitDistSq) {
              // 逃逸法则
              const curU = Math.max(0, Math.min(1, ((this.position.x - x1) * dx + (this.position.z - z1) * dz) / lenSq));
              const curClosestX = x1 + curU * dx;
              const curClosestZ = z1 + curU * dz;
              const curDistSq = (this.position.x - curClosestX) ** 2 + (this.position.z - curClosestZ) ** 2;
              if (newDistSq < curDistSq - 0.0001) {
                // 正在钻入内隔墙，阻挡移动
                canMove = false;
                break;
              }
            }
          }
        }

        if (canMove) {
          this.position[axis] = nextPos;
        }
      };

      testMoveAxis('x', step.x);
      testMoveAxis('z', step.z);
    }

    this.position.y = this.eyeHeight;
    this.camera.position.copy(this.position);
  }
}
