import React, { useEffect, useRef } from 'react';

// 不同层级标题的字号、马赛克晶格步长、方砖尺寸与鼠标斥力半径
const VARIANTS = {
  hero: { maxSize: 64, minSize: 34, lineHeight: 1.26, step: 2.35, dot: 2.08, radius: 72 },
  page: { maxSize: 56, minSize: 30, lineHeight: 1.28, step: 2.25, dot: 1.99, radius: 64 },
  section: { maxSize: 38, minSize: 24, lineHeight: 1.32, step: 1.95, dot: 1.73, radius: 52 },
  case: { maxSize: 32, minSize: 22, lineHeight: 1.34, step: 1.85, dot: 1.64, radius: 46 },
};

const FONT = "'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif";

const DEFAULT_PALETTE = ['#163fa8', '#1e56d8', '#2f76f6', '#38bdf8', '#48cae4', '#ffffff'];

function readPalette(element) {
  const style = getComputedStyle(element);
  return DEFAULT_PALETTE.map((fallback, index) => {
    const val = style.getPropertyValue(`--particle-${index}`).trim();
    return val || fallback;
  });
}

/**
 * 蓝白晶格磁流体文字粒子标题组件（Blue-White Mosaic Ferrofluid Title）
 * - 参照 TECHNOLOGY 晶格配色规律：深钴蓝 / 皇家蓝轮廓锚定 + 亮蔚蓝过渡 + 电光青蓝簇 + 纯白方砖高亮
 * - 使用高对比方形马赛克砖块并保留清晰晶格间隙，兼顾科技颗粒质感与白底高可读性
 * - 鼠标滑过时施加径向斥力并激活微粒提亮，回流锁定时恢复原有晶格色阶
 */
export function ParticleTitle({ as: Tag = 'h2', lines, text = '', variant = 'section', className = '' }) {
  const hostRef = useRef(null);
  const canvasRef = useRef(null);
  const textLines = lines?.length ? lines : [text];
  const label = textLines.join('');

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!host || !ctx) return undefined;

    const spec = VARIANTS[variant] ?? VARIANTS.section;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let particles = [];
    let width = 0;
    let height = 0;
    let scale = 1;
    let frame = 0;
    let pointer = null;
    let radius = spec.radius;
    let dot = spec.dot;
    let palette = readPalette(host);

    const fitFont = (measureCtx, available) => {
      let size = spec.maxSize;
      if (available < 640) size = Math.min(size, Math.max(spec.minSize, available * 0.088));
      while (size > spec.minSize) {
        measureCtx.font = `800 ${size}px ${FONT}`;
        const widest = Math.max(...textLines.map((line) => measureCtx.measureText(line).width));
        if (widest <= available) break;
        size -= 1;
      }
      return size;
    };

    const draw = () => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, height);
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const px = p.locked ? p.tx : p.x;
        const py = p.locked ? p.ty : p.y;

        let displayTone = p.tone;
        let sizeNow = dot;

        if (!p.locked) {
          const speed = Math.hypot(p.vx, p.vy);
          if (speed > 4.5) {
            displayTone = 5;
            sizeNow = dot * 1.12;
          } else if (speed > 1.8) {
            displayTone = Math.min(5, Math.max(4, p.tone + 1));
            sizeNow = dot * 1.06;
          } else {
            displayTone = Math.min(5, Math.max(3, p.tone));
          }
        }

        ctx.fillStyle = palette[displayTone] ?? palette[1];
        ctx.fillRect(px, py, sizeNow, sizeNow);
      }
    };

    const build = () => {
      width = Math.max(240, Math.floor(host.clientWidth));
      const measure = document.createElement('canvas').getContext('2d');
      const size = fitFont(measure, width - 4);
      const ratio = size / spec.maxSize;
      const lineBox = Math.round(size * spec.lineHeight);
      const step = Math.max(1.55, spec.step * Math.max(0.84, ratio));
      dot = Math.max(1.38, step * 0.885);
      radius = spec.radius * Math.max(0.75, ratio);
      height = lineBox * textLines.length + 8;
      scale = Math.max(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const sample = document.createElement('canvas');
      const sampleScale = 2;
      sample.width = Math.round(width * sampleScale);
      sample.height = Math.round(height * sampleScale);
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      sctx.scale(sampleScale, sampleScale);
      sctx.fillStyle = '#000';
      sctx.textBaseline = 'middle';
      sctx.font = `800 ${size}px ${FONT}`;
      textLines.forEach((line, index) => sctx.fillText(line, 1, 4 + lineBox * (index + 0.5)));
      const data = sctx.getImageData(0, 0, sample.width, sample.height).data;

      const sampleAlpha = (px, py) => {
        const sx = Math.round(px * sampleScale);
        const sy = Math.round(py * sampleScale);
        if (sx < 0 || sx >= sample.width || sy < 0 || sy >= sample.height) return 0;
        return data[(sy * sample.width + sx) * 4 + 3];
      };

      palette = readPalette(host);
      const next = [];
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          if (sampleAlpha(x, y) < 115) continue;

          // 检测是否为笔画边缘像素，边缘锁定在深/亮蓝以保持锐利外轮廓
          const isEdge =
            sampleAlpha(x - step, y) < 115 ||
            sampleAlpha(x + step, y) < 115 ||
            sampleAlpha(x, y - step) < 115 ||
            sampleAlpha(x, y + step) < 115;

          let tone;
          if (isEdge) {
            const edgeRoll = Math.random();
            tone = edgeRoll < 0.42 ? 0 : edgeRoll < 0.8 ? 1 : 2;
          } else {
            // 笔画内部结合空间簇波纹生成「蓝基 + 青蓝过渡 + 纯白点缀」的有机分布
            const cluster = Math.sin(x * 0.22 + y * 0.17) * Math.cos(x * 0.14 - y * 0.21);
            const score = Math.random() + cluster * 0.26;
            if (score > 0.945) {
              tone = 5; // 纯白高光方砖 (~13%)
            } else if (score > 0.805) {
              tone = 4; // 电光青蓝 (#48cae4, ~14%)
            } else if (score > 0.645) {
              tone = 3; // 天青蓝 (#38bdf8, ~16%)
            } else if (score > 0.42) {
              tone = 2; // 亮蔚蓝 (#2f76f6, ~22%)
            } else if (score > 0.14) {
              tone = 1; // 皇家蓝 (#1e56d8)
            } else {
              tone = 0; // 深钴蓝 (#163fa8)
            }
          }

          next.push({
            tx: x,
            ty: y,
            x,
            y,
            vx: 0,
            vy: 0,
            locked: true,
            tone,
          });
        }
      }
      particles = next;
      draw();
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
            p.vx += (dx / dist) * factor * 24;
            p.vy += (dy / dist) * factor * 24;
            p.locked = false;
          }
        }

        if (!p.locked) {
          p.vx += (p.tx - p.x) * 0.11;
          p.vy += (p.ty - p.y) * 0.11;
          if (Math.random() > 0.92) {
            p.x += (Math.random() - 0.5) * 10;
            p.y += (Math.random() - 0.5) * 10;
          }
          p.vx *= 0.81;
          p.vy *= 0.81;
          p.x += p.vx;
          p.y += p.vy;

          if (
            Math.abs(p.tx - p.x) < 0.45 &&
            Math.abs(p.ty - p.y) < 0.45 &&
            Math.abs(p.vx) < 0.45 &&
            Math.abs(p.vy) < 0.45
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

    let lastWidth = 0;
    const resize = new ResizeObserver(() => {
      const nextWidth = Math.floor(host.clientWidth);
      if (Math.abs(nextWidth - lastWidth) < 4) return;
      lastWidth = nextWidth;
      build();
    });

    build();
    canvas.addEventListener('pointermove', onMove, { passive: true });
    canvas.addEventListener('pointerdown', onMove, { passive: true });
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('pointercancel', onLeave);
    resize.observe(host);

    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerdown', onMove);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('pointercancel', onLeave);
    };
  }, [label, variant]);

  return (
    <Tag ref={hostRef} className={`particle-title particle-title-${variant} ${className}`}>
      <span className="particle-title-text">
        {textLines.map((line, index) => (
          <span key={index}>{line}</span>
        ))}
      </span>
      <canvas ref={canvasRef} className="particle-title-canvas" aria-hidden="true" />
    </Tag>
  );
}

export default ParticleTitle;
