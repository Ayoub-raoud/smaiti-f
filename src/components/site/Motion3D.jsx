// Motion3D.jsx
import React, { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

// CSS for perspective and 3D effects
const globalStyle = `
  .perspective {
    perspective: 1000px;
  }
  .preserve-3d {
    transform-style: preserve-3d;
  }
  .transition-transform {
    transition-property: transform;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  .duration-300 {
    transition-duration: 300ms;
  }
  .ease-out {
    transition-timing-function: cubic-bezier(0, 0, 0.2, 1);
  }
`;

// Inject style once (or include in each component; we'll include directly)
if (typeof document !== 'undefined') {
  const styleTag = document.createElement('style');
  styleTag.textContent = globalStyle;
  document.head.appendChild(styleTag);
}

export function ParallaxSection({ children, className = '' }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [10, 0, -10]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.85, 1], [0, 1, 1, 0.4]);

  return (
    <motion.div
      ref={ref}
      style={{ y, rotateX, opacity }}
      className={`perspective preserve-3d ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function FadeIn({ children, delay = 0, y = 30 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function TiltCard({ children, className = '' }) {
  const ref = useRef(null);

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(1000px) rotateX(${-y * 8}deg) rotateY(${x * 8}deg) translateZ(0)`;
  };

  const onLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(1000px) rotateX(0) rotateY(0)';
  };

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={`transition-transform duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
}