import React, { useEffect, useRef } from 'react';

// 不同层级标题的字号、晶格步长与鼠标斥力半径
const VARIANTS = {
  hero: { maxSize: 62, minSize: 32, lineHeight: 1.28, step: 2.2, dot: 1.95, radius: 64 },
  page: { maxSize: 54, minSize: 28, lineHeight: 1.3, step: 2.1, dot: 1.85, radius: 58 },
  section: { maxSize: 38, minSize: 24, lineHeight: 1.34, step: 1.85, dot: 1.65, radius: 48 },
  case: { maxSize: 32, minSize: 22, lineHeight: 1.36, step: 1.75, dot: 1.55, radius: 42 },
};

const FONT = "'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif";

function readPalette(element) {
  const style = getComputedStyle(element);
  const ink = style.getPropertyValue('--particle-ink').trim() || '#090d16';
  const soft = style.getPropertyValue('--particle-soft').trim() || '#334155';
  const accent = style.getPropertyValue('--particle-accent').trim() || '#1d4ed8';
  return { ink, soft, accent };
}

/**
 * 磁流体文字粒子标题组件（Ferrofluid Particle Title）
 * - 复刻 silith.com/tech 的物理机制：鼠标滑过时对半径内粒子施加径向冲量推开并解锁（locked = false）
 * - 解锁粒子在弹簧拉力（0.1）、阻尼（0.8）与随机高频微跳动（Math.random() > 0.91）共同作用下，
 *   呈现类似磁流体沸腾跳动并回流吸附成字的质感
 * - 支持监听根节点 data-theme 切换，实时同步大厂主题粒子配色
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
      if (available < 640) size = Math.min(size, Math.max(spec.minSize, available * 0.085));
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
        if (p.locked) {
          ctx.fillStyle = palette.ink;
          ctx.fillRect(p.tx, p.ty, dot, dot);
        } else {
          ctx.fillStyle = p.isAccent ? palette.accent : p.isSoft ? palette.soft : palette.ink;
          const activeDot = p.isAccent ? dot * 1.15 : dot;
          ctx.fillRect(p.x, p.y, activeDot, activeDot);
        }
      }
    };

    const refreshPalette = () => {
      palette = readPalette(host);
      draw();
    };

    const build = () => {
      width = Math.max(240, Math.floor(host.clientWidth));
      const measure = document.createElement('canvas').getContext('2d');
      const size = fitFont(measure, width - 4);
      const ratio = size / spec.maxSize;
      const lineBox = Math.round(size * spec.lineHeight);
      const step = Math.max(1.5, spec.step * Math.max(0.84, ratio));
      dot = Math.max(1.35, spec.dot * Math.max(0.84, ratio));
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

      palette = readPalette(host);
      const next = [];
      for (let y = 0; y < height; y += step) {
        for (let x = 0; x < width; x += step) {
          const index = (Math.round(y * sampleScale) * sample.width + Math.round(x * sampleScale)) * 4 + 3;
          if (data[index] < 115) continue;
          const roll = Math.random();
          const isAccent = roll > 0.78;
          const isSoft = !isAccent && roll > 0.42;
          next.push({
            tx: x,
            ty: y,
            x,
            y,
            vx: 0,
            vy: 0,
            locked: true,
            isAccent,
            isSoft,
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
            p.vx += (dx / dist) * factor * 28;
            p.vy += (dy / dist) * factor * 28;
            p.locked = false;
          }
        }

        if (!p.locked) {
          p.vx += (p.tx - p.x) * 0.1;
          p.vy += (p.ty - p.y) * 0.1;
          if (Math.random() > 0.91) {
            p.x += (Math.random() - 0.5) * 14;
            p.y += (Math.random() - 0.5) * 14;
          }
          p.vx *= 0.8;
          p.vy *= 0.8;
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

    const themeObserver = new MutationObserver(() => {
      requestAnimationFrame(refreshPalette);
    });
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
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
      themeObserver.disconnect();
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
