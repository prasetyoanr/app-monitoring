"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  baseAlpha: number;
  pulseSpeed: number;
  pulseOffset: number;
}

const PARTICLE_COLORS = [
  "rgba(16, 185, 129, ", // Emerald
  "rgba(20, 184, 166, ", // Teal
  "rgba(245, 158, 11, ", // Amber/Orange
  "rgba(59, 130, 246, ", // Blue
];

export function AuthInteractiveBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let animationFrameId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    let particles: Particle[] = [];

    function initParticles() {
      const area = width * height;
      const count = Math.min(Math.max(Math.floor(area / 24000), 20), 42);
      particles = [];

      for (let i = 0; i < count; i++) {
        const colorBase =
          PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
        const speed = prefersReducedMotion
          ? 0.05
          : 0.18 + Math.random() * 0.3;
        const angle = Math.random() * Math.PI * 2;

        particles.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          radius: 1.5 + Math.random() * 1.8,
          color: colorBase,
          baseAlpha: 0.28 + Math.random() * 0.35,
          pulseSpeed: 0.012 + Math.random() * 0.02,
          pulseOffset: Math.random() * Math.PI * 2,
        });
      }
    }

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx?.scale(dpr, dpr);
      initParticles();
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    let time = 0;

    function render() {
      if (!ctx) return;
      time += 0.016;

      ctx.clearRect(0, 0, width, height);

      const maxConnectDist = 120;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Move smoothly
        p.x += p.vx;
        p.y += p.vy;

        // Boundary wrap
        if (p.x < -20) p.x = width + 20;
        if (p.x > width + 20) p.x = -20;
        if (p.y < -20) p.y = height + 20;
        if (p.y > height + 20) p.y = -20;

        // Connect nearby particles
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.hypot(dx, dy);

          if (dist < maxConnectDist) {
            const lineAlpha = (1 - dist / maxConnectDist) * 0.16;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = `rgba(74, 222, 128, ${lineAlpha})`;
            ctx.lineWidth = 0.7;
            ctx.stroke();
          }
        }

        // Draw particle node
        const pulse = Math.sin(time * p.pulseSpeed * 60 + p.pulseOffset);
        const currentAlpha = Math.max(0.1, p.baseAlpha + pulse * 0.1);
        const currentRadius = p.radius + pulse * 0.25;

        ctx.beginPath();
        ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${currentAlpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(animationFrameId);
      } else {
        animationFrameId = requestAnimationFrame(render);
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    animationFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div className="auth-grid-pattern absolute inset-0 opacity-[0.35]" />
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
