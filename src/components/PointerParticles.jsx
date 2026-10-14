import { useEffect, useRef } from 'react';
import { Renderer, Camera, Geometry, Program, Mesh } from 'ogl';
import { createParticleField, FIELD_DEPTH, resetParticleField, stepParticleField } from './Particles/particleField.js';
import './PointerParticles.css';

const vertex = /* glsl */ `
  precision highp float;
  attribute vec3 position;
  attribute vec3 color;
  attribute float size;
  attribute float opacity;
  attribute float angle;
  uniform mat4 modelViewMatrix;
  uniform mat4 projectionMatrix;
  uniform float uPixelRatio;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vAngle;

  void main() {
    vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
    float perspective = ${FIELD_DEPTH.toFixed(1)} / -viewPosition.z;
    gl_Position = projectionMatrix * viewPosition;
    gl_PointSize = size * perspective * uPixelRatio;
    vOpacity = opacity;
    vColor = color;
    vAngle = angle;
  }
`;

const fragment = /* glsl */ `
  precision highp float;
  varying vec3 vColor;
  varying float vOpacity;
  varying float vAngle;

  float segmentDistance(vec2 point, vec2 start, vec2 end) {
    vec2 relative = point - start;
    vec2 direction = end - start;
    float along = clamp(dot(relative, direction) / dot(direction, direction), 0.0, 1.0);
    return length(relative - direction * along);
  }

  void main() {
    vec2 point = (gl_PointCoord - 0.5) * 2.0;
    float distance = 1.0;
    for (int arm = 0; arm < 6; arm++) {
      float angle = float(arm) * 1.04719755 + vAngle;
      vec2 direction = vec2(cos(angle), sin(angle));
      vec2 normal = vec2(-direction.y, direction.x);
      distance = min(distance, segmentDistance(point, vec2(0.0), direction * 0.84));
      distance = min(distance, segmentDistance(point, direction * 0.43, direction * 0.62 + normal * 0.19));
      distance = min(distance, segmentDistance(point, direction * 0.43, direction * 0.62 - normal * 0.19));
    }
    float alpha = (1.0 - smoothstep(0.045, 0.09, distance)) * vOpacity;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export default function PointerParticles() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const finePointer = window.matchMedia('(any-hover: hover) and (any-pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const print = window.matchMedia('print');
    let renderer;
    let camera;
    let program;
    let geometry;
    let mesh;
    let field;
    let pointer = null;
    let frame = 0;
    let lastDraw = 0;
    let lastMove = -Infinity;
    let activeUntil = 0;
    let enabled = false;
    let contextLost = false;

    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      lastDraw = 0;
      pointer = null;
      activeUntil = 0;
    };

    const releasePointer = () => {
      pointer = null;
      activeUntil = performance.now() + 1500;
    };

    const finishMotion = () => {
      renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
      resetParticleField(field);
      stop();
    };

    const init = () => {
      if (renderer) return true;
      const attributes = { alpha: true, depth: false, antialias: false, premultipliedAlpha: false, powerPreference: 'low-power' };
      try {
        // Check support before OGL initialization so unavailable WebGL is quiet.
        const gl = canvas.getContext('webgl2', attributes) || canvas.getContext('webgl', attributes);
        if (!gl) return false;
        renderer = new Renderer({ canvas, ...attributes, dpr: Math.min(window.devicePixelRatio || 1, 1.5) });
        gl.clearColor(0, 0, 0, 0);
        camera = new Camera(gl, { near: 1, far: 2200 });
        camera.position.z = FIELD_DEPTH;
        program = new Program(gl, {
          vertex,
          fragment,
          uniforms: { uPixelRatio: { value: renderer.dpr } },
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        return true;
      } catch {
        program?.remove();
        renderer = null;
        return false;
      }
    };

    const resize = () => {
      if (!enabled || !renderer || contextLost) return;
      const width = window.innerWidth;
      const height = window.innerHeight;
      renderer.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setSize(width, height);
      camera.perspective({ aspect: width / height, fov: 2 * Math.atan(height / (2 * FIELD_DEPTH)) * 180 / Math.PI });
      field = createParticleField(width, height);
      geometry?.remove();
      const gl = renderer.gl;
      geometry = new Geometry(gl, {
        position: { size: 3, data: field.positions, usage: gl.DYNAMIC_DRAW },
        color: { size: 3, data: field.colors },
        size: { size: 1, data: field.sizes, usage: gl.DYNAMIC_DRAW },
        opacity: { size: 1, data: field.opacities, usage: gl.DYNAMIC_DRAW },
        angle: { size: 1, data: field.angles, usage: gl.DYNAMIC_DRAW },
      });
      mesh = new Mesh(gl, { mode: gl.POINTS, geometry, program, frustumCulled: false });
      program.uniforms.uPixelRatio.value = renderer.dpr;
      pointer = null;
    };

    const render = (time) => {
      frame = 0;
      if (!enabled || contextLost) return;
      if (time >= activeUntil) {
        finishMotion();
        return;
      }
      frame = requestAnimationFrame(render);
      if (time - lastDraw < 8) return;
      const delta = Math.min((time - (lastDraw || time - 16)) / 1000, 0.04);
      lastDraw = time;
      const active = stepParticleField(field, delta, pointer);
      if (!active) {
        finishMotion();
        return;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.opacity.needsUpdate = true;
      geometry.attributes.size.needsUpdate = true;
      geometry.attributes.angle.needsUpdate = true;
      if (pointer) {
        pointer.previousX = pointer.x;
        pointer.previousY = pointer.y;
        pointer.fresh = false;
      }
      renderer.render({ scene: mesh, camera });
    };

    const sync = () => {
      stop();
      enabled = finePointer.matches && !reducedMotion.matches && !print.matches && !document.hidden && !contextLost;
      if (enabled) {
        enabled = init();
        if (enabled) {
          if (!field || field.width !== window.innerWidth || field.height !== window.innerHeight) resize();
          else resetParticleField(field);
          geometry.attributes.position.needsUpdate = true;
          geometry.attributes.opacity.needsUpdate = true;
          renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
        }
      }
      canvas.hidden = !enabled;
    };

    const move = (event) => {
      if (!enabled) return;
      if (event.pointerType !== 'mouse' || event.target.closest?.('dialog, iframe, input, textarea, [contenteditable="true"]')) {
        releasePointer();
        return;
      }
      const now = performance.now();
      const elapsed = Math.max(now - lastMove, 8) / 1000;
      const continuous = pointer && now - lastMove < 150;
      const previousX = continuous ? pointer.x : event.clientX;
      const previousY = continuous ? pointer.y : event.clientY;
      const vx = Math.max(-1600, Math.min(1600, (event.clientX - previousX) / elapsed));
      const vy = Math.max(-1600, Math.min(1600, (event.clientY - previousY) / elapsed));
      pointer = {
        x: event.clientX, y: event.clientY,
        fresh: !continuous,
        previousX: continuous ? pointer.previousX : previousX,
        previousY: continuous ? pointer.previousY : previousY,
        vx: continuous ? pointer.vx * 0.35 + vx * 0.65 : 0,
        vy: continuous ? pointer.vy * 0.35 + vy * 0.65 : 0,
      };
      lastMove = now;
      activeUntil = now + 1600;
      if (!frame) {
        lastDraw = now - 16;
        frame = requestAnimationFrame(render);
      }
    };

    const leave = (event) => { if (!event.relatedTarget) releasePointer(); };
    const keyboard = (event) => { if (event.key === 'Tab') releasePointer(); };
    const beforePrint = () => { enabled = false; stop(); };
    const loseContext = (event) => {
      event.preventDefault();
      contextLost = true;
      enabled = false;
      stop();
      canvas.hidden = true;
    };
    const restoreContext = () => {
      renderer = geometry = program = field = null;
      contextLost = false;
      sync();
    };

    finePointer.addEventListener('change', sync);
    reducedMotion.addEventListener('change', sync);
    print.addEventListener('change', sync);
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', releasePointer, { passive: true });
    window.addEventListener('pointercancel', releasePointer);
    window.addEventListener('pointerout', leave);
    window.addEventListener('blur', releasePointer);
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('keydown', keyboard);
    window.addEventListener('beforeprint', beforePrint);
    window.addEventListener('afterprint', sync);
    document.addEventListener('visibilitychange', sync);
    canvas.addEventListener('webglcontextlost', loseContext);
    canvas.addEventListener('webglcontextrestored', restoreContext);
    sync();

    return () => {
      enabled = false;
      stop();
      finePointer.removeEventListener('change', sync);
      reducedMotion.removeEventListener('change', sync);
      print.removeEventListener('change', sync);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerdown', releasePointer);
      window.removeEventListener('pointercancel', releasePointer);
      window.removeEventListener('pointerout', leave);
      window.removeEventListener('blur', releasePointer);
      window.removeEventListener('resize', resize);
      window.removeEventListener('keydown', keyboard);
      window.removeEventListener('beforeprint', beforePrint);
      window.removeEventListener('afterprint', sync);
      document.removeEventListener('visibilitychange', sync);
      canvas.removeEventListener('webglcontextlost', loseContext);
      canvas.removeEventListener('webglcontextrestored', restoreContext);
      geometry?.remove();
      program?.remove();
      renderer?.gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-particles" aria-hidden="true" hidden />;
}
