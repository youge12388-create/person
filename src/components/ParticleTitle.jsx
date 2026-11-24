import React, { useEffect, useRef } from 'react';
import { hasPendingPageTransition, subscribeParticleBurst } from './particleTransition.js';

// 不同层级标题的字号、马赛克晶格步长、方砖尺寸与鼠标斥力半径
const VARIANTS = {
  hero: { maxSize: 64, minSize: 34, lineHeight: 1.26, step: 2.35, dot: 2.08, radius: 72 },
  heroMobile: { maxSize: 44, minSize: 19, lineHeight: 1.28, step: 1.65, dot: 1.48, radius: 48, minWidth: 150, fitWidth: true },
  page: { maxSize: 56, minSize: 30, lineHeight: 1.28, step: 2.25, dot: 1.99, radius: 64 },
  section: { maxSize: 38, minSize: 24, lineHeight: 1.32, step: 1.95, dot: 1.73, radius: 52 },
  case: { maxSize: 32, minSize: 22, lineHeight: 1.34, step: 1.85, dot: 1.64, radius: 46 },
};

const FONT = "'Inter', 'PingFang SC', 'Microsoft YaHei', 'Noto Sans SC', system-ui, sans-serif";

const DEFAULT_PALETTE = ['#163fa8', '#1e56d8', '#2f76f6', '#38bdf8', '#48cae4', '#ffffff'];
const VERTICAL_BLEED = 24;
const SHAKE_MS = 190;
const SCATTER_HOLD_MS = 150;

function readPalette(element) {
  const style = getComputedStyle(element);
  return DEFAULT_PALETTE.map((fallback, index) => {
    const val = style.getPropertyValue(`--particle-${index}`).trim();
    return val || fallback;
  });
}

function isElementInViewport(element) {
  const rect = element.getBoundingClientRect();
  const vh = window.innerHeight || document.documentElement.clientHeight;
  return rect.bottom > 24 && rect.top < vh - 24;
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
    let canvasHeight = 0;
    let scale = 1;
    let frame = 0;
    let pointer = null;
    let radius = spec.radius;
    let dot = spec.dot;
    let palette = readPalette(host);
    let currentSize = spec.maxSize;
    let textCenterX = 0;
    let textCenterY = 0;
    let burst = null;
    let pendingObserver = null;
    let pendingTimeout = 0;

    const clearPendingTrigger = () => {
      if (pendingObserver) {
        pendingObserver.disconnect();
        pendingObserver = null;
      }
      if (pendingTimeout) {
        window.clearTimeout(pendingTimeout);
        pendingTimeout = 0;
      }
    };

    const draw = () => {
      ctx.setTransform(scale, 0, 0, scale, 0, 0);
      ctx.clearRect(0, 0, width, canvasHeight);
      const isShaking = burst && burst.phase === 'shake';
      for (let i = 0; i < particles.length; i += 1) {
        const p = particles[i];
        const px = p.locked ? p.tx : p.x;
        const py = p.locked ? p.ty : p.y;

        let displayTone = p.tone;
        let sizeNow = dot;

        if (isShaking) {
          const flash = Math.sin(burst.elapsed * 0.08 + p.phase);
          if (flash > 0.72) {
            displayTone = 5;
            sizeNow = dot * 1.1;
          } else if (flash > 0.25) {
            displayTone = Math.min(5, Math.max(4, p.tone + 1));
            sizeNow = dot * 1.04;
          }
        } else if (!p.locked) {
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
      const minWidth = spec.minWidth ?? 240;
      width = Math.max(minWidth, Math.floor(host.clientWidth));
      const isNarrow = width < 520;
      const activeLines = lines?.length
        ? lines
        : isNarrow && text && /[\u4e00-\u9fa5]\s+[\u4e00-\u9fa5]/.test(text)
          ? text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1\n$2').split('\n')
          : textLines;
      const measure = document.createElement('canvas').getContext('2d');
      let size = spec.maxSize;
      if (!spec.fitWidth && width < 640) size = Math.min(size, Math.max(spec.minSize, width * 0.088));
      while (size > spec.minSize) {
        measure.font = `800 ${size}px ${FONT}`;
        const widest = Math.max(...activeLines.map((line) => measure.measureText(line).width));
        if (widest <= width - 4) break;
        size -= 1;
      }
      currentSize = size;
      const ratio = size / spec.maxSize;
      const lineBox = Math.round(size * spec.lineHeight);
      const ultraCompact = size <= 26;
      const compactText = size <= 32;
      const step = ultraCompact
        ? 1.05
        : compactText
          ? Math.max(1.25, spec.step * 0.72)
          : Math.max(1.55, spec.step * Math.max(0.84, ratio));
      dot = ultraCompact
        ? 0.96
        : compactText
          ? Math.max(1.18, step * 0.92)
          : Math.max(1.38, step * 0.885);
      radius = spec.radius * Math.max(0.75, ratio);
      height = lineBox * activeLines.length + 8;
      canvasHeight = height + VERTICAL_BLEED * 2;
      scale = Math.max(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(canvasHeight * scale);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${canvasHeight}px`;
      canvas.style.top = `-${VERTICAL_BLEED}px`;
      host.style.height = `${height}px`;

      const sample = document.createElement('canvas');
      const sampleScale = 2;
      sample.width = Math.round(width * sampleScale);
      sample.height = Math.round(height * sampleScale);
      const sctx = sample.getContext('2d', { willReadFrequently: true });
      sctx.scale(sampleScale, sampleScale);
      sctx.fillStyle = '#000';
      sctx.textBaseline = 'middle';
      sctx.font = `800 ${size}px ${FONT}`;
      activeLines.forEach((line, index) => sctx.fillText(line, 1, 4 + lineBox * (index + 0.5)));
      const data = sctx.getImageData(0, 0, sample.width, sample.height).data;

      const sampleAlpha = (px, py) => {
        const sx = Math.round(px * sampleScale);
        const sy = Math.round(py * sampleScale);
        if (sx < 0 || sx >= sample.width || sy < 0 || sy >= sample.height) return 0;
        return data[(sy * sample.width + sx) * 4 + 3];
      };

      const onDark = host.classList.contains('on-dark');
      const suppressWhite = !onDark && size <= 34;
      palette = readPalette(host);
      const next = [];
      let minX = width;
      let maxX = 0;
      let minY = canvasHeight;
      let maxY = 0;

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
              tone = suppressWhite ? 3 : 5; // 白底小字号用亮青蓝替代纯白，避免笔画镂空
            } else if (score > 0.805) {
              tone = suppressWhite ? 2 : 4;
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

          const ty = y + VERTICAL_BLEED;
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (ty < minY) minY = ty;
          if (ty > maxY) maxY = ty;

          next.push({
            tx: x,
            ty,
            x,
            y: ty,
            vx: 0,
            vy: 0,
            locked: true,
            tone,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
      textCenterX = next.length ? (minX + maxX) * 0.5 : width * 0.5;
      textCenterY = next.length ? (minY + maxY) * 0.5 : canvasHeight * 0.5;
      particles = next;
      burst = null;
      draw();
    };

    const tick = (now = performance.now()) => {
      frame = 0;
      let moving = false;

      if (burst) {
        const elapsed = now - burst.startTime;
        burst.elapsed = elapsed;

        if (elapsed < SHAKE_MS) {
          // 阶段 1：高频微震蓄力（振幅随时间快速放大）
          burst.phase = 'shake';
          const progress = elapsed / SHAKE_MS;
          const amp = (1.8 + progress * 3.8) * burst.scaleFactor;
          for (let i = 0; i < particles.length; i += 1) {
            const p = particles[i];
            p.locked = false;
            const jx = (Math.random() - 0.5) * amp * 2.2;
            const jy = (Math.random() - 0.5) * amp * 1.9;
            p.x = p.tx + jx;
            p.y = p.ty + jy;
            p.vx = jx * 0.6;
            p.vy = jy * 0.6;
          }
          moving = true;
        } else if (!burst.scattered) {
          // 阶段 2：瞬间爆发打散
          burst.phase = 'scatter';
          burst.scattered = true;
          const impulse = burst.scaleFactor;
          for (let i = 0; i < particles.length; i += 1) {
            const p = particles[i];
            const dx = p.tx - textCenterX;
            const dy = p.ty - textCenterY;
            const dist = Math.hypot(dx, dy) || 1;
            const angle = Math.random() * Math.PI * 2;
            const radial = (2.1 + Math.random() * 3.4) * impulse;
            const randomKick = (4.2 + Math.random() * 7.2) * impulse;
            const horizontalSweep = (Math.random() - 0.5) * 5.2 * impulse;
            p.vx = (dx / dist) * radial + Math.cos(angle) * randomKick + horizontalSweep;
            p.vy = (dy / dist) * radial * 0.78 + Math.sin(angle) * randomKick * 0.64;
            p.locked = false;
          }
          moving = true;
        } else {
          // 阶段 3：短暂漂移扩散后磁吸重组（节奏更舒展清晰）
          const afterScatter = elapsed - SHAKE_MS;
          const isHoldingScatter = afterScatter < SCATTER_HOLD_MS;
          burst.phase = isHoldingScatter ? 'scatter' : 'reassemble';
          const spring = isHoldingScatter ? 0.025 : 0.145;
          const damping = isHoldingScatter ? 0.9 : 0.79;

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
              p.vx += (p.tx - p.x) * spring;
              p.vy += (p.ty - p.y) * spring;
              p.vx *= damping;
              p.vy *= damping;
              p.x += p.vx;
              p.y += p.vy;

              if (
                !isHoldingScatter &&
                Math.abs(p.tx - p.x) < 0.4 &&
                Math.abs(p.ty - p.y) < 0.4 &&
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

          if (!moving) {
            burst = null;
          }
        }
      } else {
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
      }

      draw();
      if (moving || pointer || burst) {
        frame = requestAnimationFrame(tick);
      }
    };

    const wake = () => {
      if (!frame && !reduced) {
        frame = requestAnimationFrame(tick);
      }
    };

    const triggerBurst = () => {
      if (reduced || !particles.length) return;
      clearPendingTrigger();
      const scaleFactor = Math.max(0.72, Math.min(1.18, currentSize / 42));
      burst = {
        startTime: performance.now(),
        elapsed: 0,
        phase: 'shake',
        scattered: false,
        scaleFactor,
      };
      wake();
    };

    const scheduleBurstOnVisible = () => {
      if (reduced) return;
      clearPendingTrigger();
      if (isElementInViewport(host)) {
        triggerBurst();
        return;
      }
      pendingObserver = new IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            triggerBurst();
          }
        },
        { threshold: 0.15 },
      );
      pendingObserver.observe(host);
      // 避免用户中途手动取消滚动后在很久以后误触发
      pendingTimeout = window.setTimeout(clearPendingTrigger, 2200);
    };

    const onBurstEvent = (event) => {
      const detail = event.detail || {};
      if (detail.mode === 'anchor' && detail.targetId) {
        const targetEl = document.getElementById(detail.targetId);
        if (!targetEl) return;
        const targetSection = targetEl.closest('section');
        const matched = targetEl === host
          || targetEl.contains(host)
          || (targetSection ? targetSection.contains(host) : false);
        if (!matched) return;
        scheduleBurstOnVisible();
        return;
      }
      if (detail.mode === 'all') {
        if (isElementInViewport(host)) triggerBurst();
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
    lastWidth = Math.floor(host.clientWidth);
    if (hasPendingPageTransition()) {
      if (isElementInViewport(host)) {
        triggerBurst();
      } else {
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (isElementInViewport(host)) {
              triggerBurst();
            }
          });
        });
      }
    }

    const unsubscribeBurst = subscribeParticleBurst(onBurstEvent);
    host.addEventListener('pointermove', onMove, { passive: true });
    host.addEventListener('pointerdown', onMove, { passive: true });
    host.addEventListener('pointerup', onLeave);
    host.addEventListener('pointerleave', onLeave);
    host.addEventListener('pointercancel', onLeave);
    resize.observe(host);

    return () => {
      clearPendingTrigger();
      unsubscribeBurst();
      cancelAnimationFrame(frame);
      resize.disconnect();
      host.removeEventListener('pointermove', onMove);
      host.removeEventListener('pointerdown', onMove);
      host.removeEventListener('pointerup', onLeave);
      host.removeEventListener('pointerleave', onLeave);
      host.removeEventListener('pointercancel', onLeave);
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
