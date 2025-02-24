"use client";

import { useRef, useState, useEffect } from "react";
import { Mic } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface AudioVisualizerProps {
  isActive?: boolean;
  audioData?: Uint8Array;
  isProcessing?: boolean;
  isGenerating?: boolean;
}

export default function AudioVisualizer({
  isActive,
  audioData,
  isProcessing,
  isGenerating = false,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    // Start the idle animation when component mounts
    if (!isActive) {
      drawIdle();
      scheduleBlink();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
    };
  }, [isActive]);

  useEffect(() => {
    if (!canvasRef.current || !audioData || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const baseRadius = Math.min(width, height) * 0.25;

    // Clear canvas
    ctx.fillStyle = "#0c0c0e";
    ctx.fillRect(0, 0, width, height);

    // Draw base circle (body)
    ctx.beginPath();
    ctx.arc(center.x, center.y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#0c0c0e";
    ctx.fill();
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw eyes
    const eyeSize = 8;
    const eyeSpacing = 30;
    ctx.fillStyle = "#14b8a6";
    ctx.fillRect(
      center.x - eyeSpacing - eyeSize / 2,
      center.y - eyeSize / 2,
      eyeSize,
      eyeSize
    );
    ctx.fillRect(
      center.x + eyeSpacing - eyeSize / 2,
      center.y - eyeSize / 2,
      eyeSize,
      eyeSize
    );

    // Draw spiky outline
    ctx.beginPath();
    const points = 100;
    const angleStep = (2 * Math.PI) / points;

    for (let i = 0; i < points; i++) {
      const angle = i * angleStep;
      const frequencyIndex = Math.floor((i / points) * (audioData.length / 2));
      const amplitude = audioData[frequencyIndex] / 255; // Normalize to 0-1

      // Calculate spike height based on frequency data
      const spikeHeight = baseRadius * 0.4 * amplitude;
      const radius = baseRadius + spikeHeight;

      // Add some randomness to make it more organic
      const noise = Math.sin(angle * 10 + Date.now() * 0.003) * 5;

      const x = center.x + Math.cos(angle) * (radius + noise);
      const y = center.y + Math.sin(angle) * (radius + noise);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        // Use quadratic curves for smoother spikes
        const prevAngle = (i - 1) * angleStep;
        const prevX = center.x + Math.cos(prevAngle) * (radius + noise);
        const prevY = center.y + Math.sin(prevAngle) * (radius + noise);

        const cpX = (x + prevX) / 2;
        const cpY = (y + prevY) / 2;
        ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
      }
    }

    ctx.closePath();

    // Add glow effect
    ctx.shadowColor = "rgba(20, 184, 166, 0.5)";
    ctx.shadowBlur = 15;
    ctx.strokeStyle = "#14b8a6";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Reset shadow
    ctx.shadowBlur = 0;

    if (isActive) {
      animationRef.current = requestAnimationFrame(() => {});
    }
  }, [isActive, audioData]);

  const drawIdle = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const baseRadius = Math.min(width, height) * 0.25;
    const startTime = Date.now();

    const draw = () => {
      if (isActive) return; // Stop idle animation if audio is active

      const elapsed = Date.now() - startTime;
      const time = elapsed * 0.001; // Convert to seconds

      // Clear canvas
      ctx.fillStyle = "#0c0c0e";
      ctx.fillRect(0, 0, width, height);

      // Calculate breathing effect
      const breathingScale = isGenerating
        ? 1 + Math.sin(time * 3) * 0.05 // Faster breathing during generation
        : 1 + Math.sin(time * 1.5) * 0.03; // Normal breathing
      const currentRadius = baseRadius * breathingScale;

      // Draw base circle (body)
      ctx.beginPath();
      ctx.arc(center.x, center.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#0c0c0e";
      ctx.fill();
      ctx.strokeStyle = isGenerating ? "#6366f1" : "#14b8a6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw eyes
      const eyeSize = 8;
      const eyeSpacing = 30;
      ctx.fillStyle = isGenerating ? "#6366f1" : "#14b8a6";

      if (!isBlinking) {
        if (isGenerating) {
          // Pulsing eyes during generation
          const pulseScale = 1 + Math.sin(time * 4) * 0.3;
          const currentEyeSize = eyeSize * pulseScale;
          ctx.fillRect(
            center.x - eyeSpacing - currentEyeSize / 2,
            center.y - currentEyeSize / 2,
            currentEyeSize,
            currentEyeSize
          );
          ctx.fillRect(
            center.x + eyeSpacing - currentEyeSize / 2,
            center.y - currentEyeSize / 2,
            currentEyeSize,
            currentEyeSize
          );
        } else {
          // Normal eyes
          ctx.fillRect(
            center.x - eyeSpacing - eyeSize / 2,
            center.y - eyeSize / 2,
            eyeSize,
            eyeSize
          );
          ctx.fillRect(
            center.x + eyeSpacing - eyeSize / 2,
            center.y - eyeSize / 2,
            eyeSize,
            eyeSize
          );
        }
      } else {
        // Closed eyes
        ctx.lineWidth = 2;
        ctx.strokeStyle = isGenerating ? "#6366f1" : "#14b8a6";
        ctx.beginPath();
        ctx.moveTo(center.x - eyeSpacing - eyeSize / 2, center.y);
        ctx.lineTo(center.x - eyeSpacing + eyeSize / 2, center.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center.x + eyeSpacing - eyeSize / 2, center.y);
        ctx.lineTo(center.x + eyeSpacing + eyeSize / 2, center.y);
        ctx.stroke();
      }

      // Draw animated spiky outline
      ctx.beginPath();
      const points = 100;
      const angleStep = (2 * Math.PI) / points;

      for (let i = 0; i < points; i++) {
        const angle = i * angleStep;
        // Create multiple wave patterns
        const wavePattern = isGenerating
          ? Math.sin(angle * 5 + time * 3) * 6 +
            Math.sin(angle * 3 - time * 2) * 8 +
            Math.sin(angle * 2 + time) * 4
          : Math.sin(angle * 3 + time * 2) * 4 +
            Math.sin(angle * 2 - time) * 6 +
            Math.sin(angle + time * 0.5) * 8;

        const radius = currentRadius + wavePattern;

        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevAngle = (i - 1) * angleStep;
          const prevWavePattern = isGenerating
            ? Math.sin(prevAngle * 5 + time * 3) * 6 +
              Math.sin(prevAngle * 3 - time * 2) * 8 +
              Math.sin(prevAngle * 2 + time) * 4
            : Math.sin(prevAngle * 3 + time * 2) * 4 +
              Math.sin(prevAngle * 2 - time) * 6 +
              Math.sin(prevAngle + time * 0.5) * 8;

          const prevRadius = currentRadius + prevWavePattern;
          const prevX = center.x + Math.cos(prevAngle) * prevRadius;
          const prevY = center.y + Math.sin(prevAngle) * prevRadius;

          const cpX = (x + prevX) / 2;
          const cpY = (y + prevY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      }

      ctx.closePath();

      // Add glow effect
      ctx.shadowColor = isGenerating
        ? "rgba(99, 102, 241, 0.5)"
        : "rgba(20, 184, 166, 0.5)";
      ctx.shadowBlur = 15;
      ctx.strokeStyle = isGenerating ? "#6366f1" : "#14b8a6";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
  };

  const scheduleBlink = () => {
    if (blinkTimeoutRef.current) {
      clearTimeout(blinkTimeoutRef.current);
    }
    blinkTimeoutRef.current = setTimeout(() => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        scheduleBlink();
      }, 150);
    }, 2000 + Math.random() * 4000);
  };

  return (
    <div className="flex flex-col items-center justify-center w-full">
      <canvas
        ref={canvasRef}
        width={600}
        height={350}
        className={`w-full h-full ${isProcessing ? "opacity-50" : ""}`}
      />
    </div>
  );
}
