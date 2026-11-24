import React, { useEffect, useRef } from 'react';

const DEFAULT_PALETTE = ['#163fa8', '#1e56d8', '#2f76f6', '#38bdf8', '#48cae4', '#ffffff'];

function readPalette(element) {
  const style = getComputedStyle(element);
  return DEFAULT_PALETTE.map((fallback, index) => {
    const val = style.getPropertyValue(`--particle-${index}`).trim();
    return val || fallback;
  });
}

function seededHash(x, y) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

/**
 * 蓝白晶格星芒粒子 Logo（与 ParticleTitle 视觉同源，去文字化独立品牌图形）
 * - 意象：四向 AI 晶格星芒（智能核心）+ 四角系统节点与右上逸散脉冲（把 AI 接入业务系统）
 * - 复用 --particle-0 ~ --particle-5 六阶蓝白晶格配色，边缘深蓝锚定、内核青白高光
 * - 鼠标悬停/移动时触发柔和局部径向斥力与提亮，离开后弹性回流锁定
 */
export function ParticleLogo({ size = 34, className = '' }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!host || !ctx) return undefined;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = Math.max(window.devicePixelRatio || 1, 3);
    const grid = 15; // 15×15 精密晶格矩阵
    const padding = 3.2;
    const cell = (size - padding * 2) / (grid - 1);
    const dot = cell * 0.82;
    const center = (grid - 1) / 2; // 7
    const radius = 11.5;

    canvas.width = Math.round(size * scale);
    canvas.height = Math.round(size * scale);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const palette = readPalette(host);
    const particles = [];

    // 判断网格点是否落在四向锐利星芒（超级椭圆 |dx|^0.68 + |dy|^0.68 <= R）内
    const starMetric = (gx, gy) => {
      const dx = Math.abs(gx - center);
      const dy = Math.abs(gy - center);
      return Math.pow(dx, 0.68) + Math.pow(dy, 0.68);
    };
    const threshold = Math.pow(6.15, 0.68);

    const inStar = (gx, gy) => starMetric(gx, gy) <= threshold;

    for (let gy = 0; gy < grid; gy += 1) {
      for (let gx = 0; gx < grid; gx += 1) {
        if (!inStar(gx, gy)) continue;

        const isEdge =
          !inStar(gx - 1, gy) ||
          !inStar(gx + 1, gy) ||
          !inStar(gx, gy - 1) ||
          !inStar(gx, gy + 1);

        const dist = Math.hypot(gx - center, gy - center);
        const r = seededHash(gx, gy);
        let tone;

        if (dist <= 0.6) {
          tone = 5; // 中心纯白晶核
        } else if (dist <= 1.55) {
          tone = r < 0.45 ? 5 : 4; // 内核电光青与纯白高光
        } else if (isEdge) {
          // 外轮廓深钴蓝 / 皇家蓝锚定，保持白底高对比锐利轮廓
          tone = r < 0.52 ? 0 : r < 0.88 ? 1 : 2;
        } else if (dist <= 2.9) {
          tone = r < 0.35 ? 3 : r < 0.72 ? 4 : 2;
        } else {
          tone = r < 0.32 ? 1 : r < 0.7 ? 2 : 3;
        }

        const px = padding + gx * cell;
        const py = padding + gy * cell;
        particles.push({
          tx: px,
          ty: py,
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          locked: true,
          tone,
          sizeMul: 1,
        });
      }
    }

    // 四角系统接入节点 + 右上角逸散晶格微粒（强化“AI 接入系统”与粒子聚散感）
    const orbitalNodes = [
      // 右上：双微粒逸散脉冲
      { gx: 11.4, gy: 2.6, tone: 3, sizeMul: 0.92 },
      { gx: 13.0, gy: 1.2, tone: 4, sizeMul: 0.76 },
      // 左上：系统锚点
      { gx: 2.6, gy: 2.6, tone: 1, sizeMul: 0.88 },
      // 左下：系统锚点
      { gx: 2.6, gy: 11.4, tone: 2, sizeMul: 0.88 },
      // 右下：系统锚点
      { gx: 11.4, gy: 11.4, tone: 1, sizeMul: 0.88 },
    ];

    for (const node of orbitalNodes) {
      const px = padding + node.gx * cell;
      const py = padding + node.gy * cell;
      particles.push({
        tx: px,
        ty: py,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        locked: true,
        tone: node.tone,
        sizeMul: node.sizeMul,
      });
    }

    let frame = 0;
    let pointer = null;

    const draw = () => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, size, size);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const px = p.locked ? p.tx : p.x;
        const py = p.locked ? p.ty : p.y;

        let displayTone = p.tone;
        let sizeNow = dot * p.sizeMul;

        if (!p.locked) {
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 1.8) {
            displayTone = 5;
            sizeNow *= 1.12;
          } else if (speed > 0.75) {
            displayTone = Math.min(5, Math.max(4, p.tone + 1));
            sizeNow *= 1.06;
          } else {
            displayTone = Math.min(5, Math.max(3, p.tone));
          }
        }

        ctx.fillStyle = palette[displayTone] ?? palette[1];
        ctx.fillRect(px - sizeNow / 2, py - sizeNow / 2, sizeNow, sizeNow);
      }
    };

    const tick = () => {
      frame = 0;
      let moving = false;

      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];

        if (pointer) {
          const dx = p.x - pointer.x;
          const dy = p.y - pointer.y;
          const dist = Math.hypot(dx, dy);
          if (dist < radius && dist > 0.0001) {
            const factor = (radius - dist) / radius;
            p.vx += (dx / dist) * factor * 1.65;
            p.vy += (dy / dist) * factor * 1.65;
            p.locked = false;
          }
        }

        if (!p.locked) {
          p.vx += (p.tx - p.x) * 0.18;
          p.vy += (p.ty - p.y) * 0.18;
          p.vx *= 0.76;
          p.vy *= 0.76;
          p.x = Math.min(size - 1.5, Math.max(1.5, p.x + p.vx));
          p.y = Math.min(size - 1.5, Math.max(1.5, p.y + p.vy));

          if (
            Math.abs(p.tx - p.x) < 0.18 &&
            Math.abs(p.ty - p.y) < 0.18 &&
            Math.abs(p.vx) < 0.18 &&
            Math.abs(p.vy) < 0.18
          ) {
            p.locked = true;
            p.x = p.tx;
            p.y = p.ty;
            p.vx = 0;
            p.vy = 0;
          } else {
            moving = true;
          }
        }
      }

      draw();
      if (moving || pointer) {
        frame = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (!frame && !reduced) {
        frame = requestAnimationFrame(tick);
      }
    };

    const onMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
      wake();
    };

    const onLeave = () => {
      pointer = null;
    };

    draw();
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointercancel', onLeave);

    return () => {
      cancelAnimationFrame(frame);
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointercancel', onLeave);
    };
  }, [size]);

  return (
    <span ref={hostRef} className={`brand-mark ${className}`.trim()} aria-hidden="true">
      <canvas ref={canvasRef} className="brand-mark-canvas" />
    </span>
  );
}

export default ParticleLogo;
