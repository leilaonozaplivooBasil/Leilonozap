import React from "react";

export default function LiquidGlassStyles() {
  return (
    <style>{`
      /* ============================================
         LIQUID GLASS DESIGN SYSTEM
         ============================================ */

      /* Glass Card Base */
      .glass-card {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.05) 0%,
          rgba(255, 255, 255, 0.02) 50%,
          rgba(255, 255, 255, 0.05) 100%
        );
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow:
          0 8px 32px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(255, 255, 255, 0.02);
        transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .glass-card:hover {
        border-color: rgba(255, 255, 255, 0.15);
        box-shadow:
          0 12px 48px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.15),
          inset 0 -1px 0 rgba(255, 255, 255, 0.03);
        transform: translateY(-2px);
      }

      /* Glass Card Elevated */
      .glass-card-elevated {
        background: linear-gradient(
          145deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.03) 40%,
          rgba(16, 185, 129, 0.04) 100%
        );
        backdrop-filter: blur(24px) saturate(200%);
        -webkit-backdrop-filter: blur(24px) saturate(200%);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 12px 40px rgba(0, 0, 0, 0.35),
          inset 0 1px 0 rgba(255, 255, 255, 0.12),
          inset 0 -1px 0 rgba(255, 255, 255, 0.02),
          0 0 80px rgba(16, 185, 129, 0.03);
      }

      /* Glass Hero */
      .glass-hero {
        background: linear-gradient(
          160deg,
          rgba(16, 185, 129, 0.08) 0%,
          rgba(255, 255, 255, 0.04) 30%,
          rgba(255, 255, 255, 0.02) 60%,
          rgba(16, 185, 129, 0.05) 100%
        );
        backdrop-filter: blur(30px) saturate(200%);
        -webkit-backdrop-filter: blur(30px) saturate(200%);
        border: 1px solid rgba(16, 185, 129, 0.15);
        box-shadow:
          0 16px 64px rgba(0, 0, 0, 0.4),
          inset 0 1px 0 rgba(255, 255, 255, 0.12),
          inset 0 -1px 0 rgba(255, 255, 255, 0.02),
          0 0 120px rgba(16, 185, 129, 0.05);
      }

      /* Glass Button */
      .glass-btn {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.08) 0%,
          rgba(255, 255, 255, 0.03) 100%
        );
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow:
          0 4px 16px rgba(0, 0, 0, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .glass-btn:hover {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.12) 0%,
          rgba(255, 255, 255, 0.06) 100%
        );
        border-color: rgba(255, 255, 255, 0.2);
        box-shadow:
          0 8px 24px rgba(0, 0, 0, 0.3),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      /* Glass Button Green Accent */
      .glass-btn-green {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.2) 0%,
          rgba(16, 185, 129, 0.08) 100%
        );
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(16, 185, 129, 0.25);
        box-shadow:
          0 4px 20px rgba(16, 185, 129, 0.15),
          inset 0 1px 0 rgba(255, 255, 255, 0.1);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .glass-btn-green:hover {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.3) 0%,
          rgba(16, 185, 129, 0.12) 100%
        );
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow:
          0 8px 32px rgba(16, 185, 129, 0.25),
          inset 0 1px 0 rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      /* Category Pill Glass */
      .glass-pill {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.06) 0%,
          rgba(255, 255, 255, 0.02) 100%
        );
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .glass-pill:hover {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.1) 0%,
          rgba(255, 255, 255, 0.04) 100%
        );
        border-color: rgba(255, 255, 255, 0.15);
        transform: translateY(-1px);
      }

      .glass-pill-active {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.15) 0%,
          rgba(16, 185, 129, 0.05) 100%
        );
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        border: 1px solid rgba(16, 185, 129, 0.3);
        box-shadow:
          0 2px 12px rgba(16, 185, 129, 0.2),
          inset 0 1px 0 rgba(255, 255, 255, 0.08);
      }

      /* Orb Animations */
      @keyframes orb-float-1 {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.4; }
        33% { transform: translate(30px, -40px) scale(1.1); opacity: 0.6; }
        66% { transform: translate(-20px, 20px) scale(0.9); opacity: 0.3; }
      }

      @keyframes orb-float-2 {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.3; }
        33% { transform: translate(-40px, 30px) scale(1.15); opacity: 0.5; }
        66% { transform: translate(25px, -15px) scale(0.85); opacity: 0.25; }
      }

      @keyframes orb-float-3 {
        0%, 100% { transform: translate(0, 0) scale(1); opacity: 0.2; }
        50% { transform: translate(15px, -25px) scale(1.08); opacity: 0.35; }
      }

      .orb-1 { animation: orb-float-1 12s ease-in-out infinite; }
      .orb-2 { animation: orb-float-2 15s ease-in-out infinite; }
      .orb-3 { animation: orb-float-3 10s ease-in-out infinite; }

      /* Grid Overlay */
      .grid-overlay {
        background-image: 
          linear-gradient(rgba(16, 185, 129, 0.03) 1px, transparent 1px),
          linear-gradient(90deg, rgba(16, 185, 129, 0.03) 1px, transparent 1px);
        background-size: 60px 60px;
      }

      /* Glow Line */
      .glow-line {
        height: 1px;
        background: linear-gradient(
          90deg,
          transparent 0%,
          rgba(16, 185, 129, 0.4) 20%,
          rgba(16, 185, 129, 0.8) 50%,
          rgba(16, 185, 129, 0.4) 80%,
          transparent 100%
        );
        box-shadow: 0 0 12px rgba(16, 185, 129, 0.3);
      }

      /* Shimmer Effect */
      @keyframes shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }

      .glass-shimmer {
        position: relative;
        overflow: hidden;
      }

      .glass-shimmer::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
          105deg,
          transparent 40%,
          rgba(255, 255, 255, 0.03) 45%,
          rgba(255, 255, 255, 0.06) 50%,
          rgba(255, 255, 255, 0.03) 55%,
          transparent 60%
        );
        animation: shimmer 8s ease-in-out infinite;
        pointer-events: none;
      }

      /* Category Scroller */
      .category-scroller {
        overflow-x: scroll;
        cursor: grab;
        -webkit-mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        mask-image: linear-gradient(to right, transparent, black 8%, black 92%, transparent);
        scrollbar-width: none;
      }
      .category-scroller::-webkit-scrollbar { display: none; }
      .category-scroller.grabbing { cursor: grabbing; }
      .category-scroller__inner {
        display: flex;
        gap: 10px;
        width: fit-content;
        animation: scroll 45s linear infinite;
      }
      .category-scroller:hover .category-scroller__inner,
      .category-scroller.grabbing .category-scroller__inner {
        animation-play-state: paused;
      }
      @keyframes scroll {
        0% { transform: translateX(0); }
        100% { transform: translateX(-50%); }
      }

      /* Fire Animation */
      @keyframes fire {
        0% { transform: scale(1) rotate(0deg); opacity: 1; }
        25% { transform: scale(1.05) rotate(2deg); opacity: 0.95; }
        50% { transform: scale(1) rotate(-1deg); opacity: 1; }
        75% { transform: scale(1.03) rotate(1deg); opacity: 0.98; }
        100% { transform: scale(1) rotate(0deg); opacity: 1; }
      }
      .animate-fire { animation: fire 1.8s ease-in-out infinite; }

      /* Skeleton Loading Glass */
      .skeleton-glass {
        background: linear-gradient(
          135deg,
          rgba(255, 255, 255, 0.04) 0%,
          rgba(255, 255, 255, 0.02) 100%
        );
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.06);
      }

      @keyframes skeleton-pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }

      .skeleton-glass .skeleton-inner {
        background: linear-gradient(
          90deg,
          rgba(255, 255, 255, 0.03) 0%,
          rgba(255, 255, 255, 0.08) 50%,
          rgba(255, 255, 255, 0.03) 100%
        );
        animation: skeleton-pulse 2s ease-in-out infinite;
      }

      /* Text Gradient */
      .text-gradient-green {
        background: linear-gradient(135deg, #10b981, #34d399, #6ee7b7);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
    `}</style>
  );
}