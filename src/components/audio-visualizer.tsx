"use client";

import { useRef, useState, useEffect } from "react";
import { Mic } from "lucide-react";

export interface AudioVisualizerProps {
  isActive?: boolean;
  audioData?: Uint8Array;
  isProcessing?: boolean;
  isGenerating?: boolean;
  audioPaused?: boolean;
}

export default function AudioVisualizer({
  isActive = false,
  audioData,
  isProcessing = false,
  isGenerating = false,
  audioPaused = false,
}: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const blinkTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const animationStopTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isBlinking, setIsBlinking] = useState(false);
  const prevIsGeneratingRef = useRef(false);
  const prevAudioPausedRef = useRef(false);
  const [waveActive, setWaveActive] = useState(false);
  // Track if we've explicitly received the "buffer stopped" signal
  const [bufferExplicitlyStopped, setBufferExplicitlyStopped] = useState(false);

  // Debug changes to audioPaused prop
  useEffect(() => {
    if (audioPaused !== prevAudioPausedRef.current) {
      console.log(
        `🎵 [Visualizer] audioPaused changed: ${
          audioPaused ? "PAUSED" : "PLAYING"
        }`
      );

      // IMPORTANT: If audio goes from playing to paused, log this as our signal
      // that the buffer has explicitly stopped
      if (audioPaused === true && prevAudioPausedRef.current === false) {
        console.log("📢 [Visualizer] EXPLICIT BUFFER STOP SIGNAL RECEIVED");
        setBufferExplicitlyStopped(true);
      } else if (audioPaused === false) {
        // Reset the flag when audio starts playing again
        setBufferExplicitlyStopped(false);
      }

      prevAudioPausedRef.current = audioPaused;
    }
  }, [audioPaused]);

  // Handle transitions when AI speaking state changes
  useEffect(() => {
    // If AI just started speaking, start wave animation
    if (isGenerating && !prevIsGeneratingRef.current) {
      console.log("🎤 AI started speaking, activating wave animation");
      setWaveActive(true);
      setBufferExplicitlyStopped(false); // Reset stop flag when AI starts speaking
      if (canvasRef.current) {
        cancelAnimationFrame(animationRef.current);
        drawAiSpeaking();
      }
    }

    // If AI just stopped speaking but we still need to wait for audio buffer
    else if (!isGenerating && prevIsGeneratingRef.current) {
      console.log(
        "🔄 AI stopped generating, but waiting for audio buffer to complete"
      );
      // Don't stop the animation yet - we'll wait for audioPaused to be true
    }

    prevIsGeneratingRef.current = isGenerating;
  }, [isGenerating]);

  // Force continuous animation while audio is playing
  useEffect(() => {
    const checkAnimation = () => {
      // If audio is playing and animation should be active, but isn't running, force restart
      if (
        !audioPaused &&
        waveActive &&
        animationRef.current === 0 &&
        canvasRef.current
      ) {
        console.log(
          "⚠️ [Visualizer] FORCED ANIMATION RESTART - animation stopped but audio playing"
        );
        drawAiSpeaking();
      }
    };

    // Check every 100ms to make absolutely sure animation continues while audio is playing
    const intervalId = setInterval(checkAnimation, 100);

    return () => clearInterval(intervalId);
  }, [audioPaused, waveActive]);

  // Failsafe to ensure animation stays active during audio playback
  useEffect(() => {
    // If audio is playing (not paused) and animation should be active,
    // but the animation isn't running, restart it
    if (
      !bufferExplicitlyStopped && // Only restart if we haven't received the stop signal
      (isGenerating || waveActive) &&
      canvasRef.current &&
      animationRef.current === 0
    ) {
      console.log(
        "🔄 [Failsafe] Animation not running during active audio - restarting"
      );
      drawAiSpeaking();
    }
  }, [audioPaused, isGenerating, waveActive, bufferExplicitlyStopped]);

  // Monitor explicit buffer stop signal
  useEffect(() => {
    // ONLY consider stopping animation when we've received the explicit buffer stopped signal
    if (waveActive && bufferExplicitlyStopped && !isGenerating) {
      console.log(
        "🛑 [Visualizer] Explicit buffer stop received, delaying animation stop..."
      );

      // Clear any existing timeout to avoid conflicts
      if (animationStopTimeoutRef.current) {
        clearTimeout(animationStopTimeoutRef.current);
      }

      // Add a much longer delay before stopping the animation to ensure audio buffer is completely done
      // This gives plenty of time for any remaining audio to finish playing
      animationStopTimeoutRef.current = setTimeout(() => {
        // Double-check we're still not generating before stopping
        if (isGenerating) {
          console.log(
            "🔄 Not stopping animation because AI is generating again"
          );
          if (animationStopTimeoutRef.current) {
            clearTimeout(animationStopTimeoutRef.current);
            animationStopTimeoutRef.current = null;
          }
          return;
        }

        console.log(
          "⏱️ Animation stop delay complete, now stopping wave animation and transitioning to green idle face"
        );
        // First set wave as inactive
        setWaveActive(false);

        // Then ensure we cancel any existing animation frame
        if (canvasRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = 0;

          // Finally, explicitly draw the idle state with green face
          drawIdle();
          console.log("🟢 Transitioned to idle green face");
        }

        animationStopTimeoutRef.current = null;
      }, 2000); // Even longer delay (2 seconds) after explicit stop signal
    } else if (!bufferExplicitlyStopped || isGenerating) {
      // If the buffer is not explicitly stopped or we're generating, cancel any pending animation stop
      if (animationStopTimeoutRef.current) {
        console.log(
          "🔄 Cancelling pending animation stop - buffer still active or AI generating"
        );
        clearTimeout(animationStopTimeoutRef.current);
        animationStopTimeoutRef.current = null;
      }

      // Ensure animation is running if it should be
      if (waveActive && animationRef.current === 0 && canvasRef.current) {
        console.log("🔄 Ensuring animation is running");
        drawAiSpeaking();
      }
    }
  }, [bufferExplicitlyStopped, waveActive, isGenerating]);

  useEffect(() => {
    // Start the idle animation when component mounts if not in speaking mode
    if (!isActive && !waveActive) {
      drawIdle();
      scheduleBlink();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      if (blinkTimeoutRef.current) {
        clearTimeout(blinkTimeoutRef.current);
      }
      if (animationStopTimeoutRef.current) {
        clearTimeout(animationStopTimeoutRef.current);
        animationStopTimeoutRef.current = null;
      }
    };
  }, [isActive, waveActive]);

  useEffect(() => {
    // Only process audio data if active but not in AI speaking mode
    if (!canvasRef.current || !audioData || !isActive || waveActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const baseRadius = Math.min(width, height) * 0.25;

    // Clear canvas
    ctx.fillStyle = "#111827";
    ctx.fillRect(0, 0, width, height);

    // Draw base circle (body)
    ctx.beginPath();
    ctx.arc(center.x, center.y, baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#111827";
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
  }, [isActive, audioData, waveActive]);

  // Special animation for AI speaking
  const drawAiSpeaking = () => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = { x: width / 2, y: height / 2 };
    const baseRadius = Math.min(width, height) * 0.25;
    const startTime = Date.now();
    // Track when animation was requested to stop
    let stopRequestedTime = 0;
    // Count consecutive frames where waveActive was false
    let stopFrameCount = 0;
    // Reference the buffer stop state at animation start
    let initialBufferStoppedState = bufferExplicitlyStopped;

    const drawFrame = () => {
      // Check if we have a new buffer stop signal that wasn't there when animation started
      const newStopSignal =
        !initialBufferStoppedState && bufferExplicitlyStopped;

      // Add a grace period after waveActive becomes false
      // This ensures smooth transition even when multiple stop/start events happen
      const now = Date.now();

      if (waveActive) {
        // Reset the stop counters when waveActive is true
        stopRequestedTime = 0;
        stopFrameCount = 0;
      } else {
        // First time we're seeing waveActive as false
        if (stopRequestedTime === 0) {
          console.log(
            "👀 [Visualizer] Wave stop requested, starting grace period"
          );
          stopRequestedTime = now;
        }

        // Count frames where waveActive is false
        stopFrameCount++;
      }

      // ONLY stop animation if ALL of these are true:
      // 1. waveActive is false
      // 2. We've waited at least 2000ms
      // 3. We've seen at least 60 consecutive frames with waveActive=false
      // 4. We've received an explicit buffer stop signal at some point
      if (
        !waveActive &&
        stopRequestedTime > 0 &&
        now - stopRequestedTime > 2000 &&
        stopFrameCount > 60 &&
        bufferExplicitlyStopped
      ) {
        console.log(
          "⏹️ [Visualizer] Animation terminated after grace period AND explicit buffer stop"
        );
        // Reset animation frame reference
        animationRef.current = 0;

        // Explicitly transition to green idle face
        drawIdle();
        console.log(
          "🟢 [Animation] Transitioned to idle green face from animation loop"
        );
        return;
      }

      const elapsed = now - startTime;
      const time = elapsed * 0.001; // Convert to seconds

      // Clear canvas
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, width, height);

      // Calculate pulsing effect
      const pulseScale = 1 + Math.sin(time * 2.5) * 0.05;
      const currentRadius = baseRadius * pulseScale;

      // Draw base circle (body)
      ctx.beginPath();
      ctx.arc(center.x, center.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();
      ctx.strokeStyle = "#6366f1"; // Purple for AI speaking
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw eyes - pulsing during AI speech
      const eyeSize = 8;
      const eyeSpacing = 30;
      ctx.fillStyle = "#6366f1";

      // Pulsing eyes animation
      if (!isBlinking) {
        const pulseEyeScale = 1 + Math.sin(time * 4) * 0.3;
        const currentEyeSize = eyeSize * pulseEyeScale;
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
        // Blinking eyes
        ctx.lineWidth = 2;
        ctx.strokeStyle = "#6366f1";
        ctx.beginPath();
        ctx.moveTo(center.x - eyeSpacing - eyeSize / 2, center.y);
        ctx.lineTo(center.x - eyeSpacing + eyeSize / 2, center.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(center.x + eyeSpacing - eyeSize / 2, center.y);
        ctx.lineTo(center.x + eyeSpacing + eyeSize / 2, center.y);
        ctx.stroke();
      }

      // Draw animated wave outline specifically for AI speaking
      ctx.beginPath();
      const points = 100;
      const angleStep = (2 * Math.PI) / points;

      for (let i = 0; i < points; i++) {
        const angle = i * angleStep;

        // Create more dynamic wave patterns for AI speech
        // Use different wave frequencies and amplitudes for a more active pattern
        const wavePattern =
          Math.sin(angle * 5 + time * 4) * 8 +
          Math.cos(angle * 7 - time * 3) * 6 +
          Math.sin(angle * 3 + time * 6) * 4 +
          Math.cos(angle * 10 - time * 2) * 2;

        const radius = currentRadius + wavePattern;

        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevAngle = (i - 1) * angleStep;
          const prevWavePattern =
            Math.sin(prevAngle * 5 + time * 4) * 8 +
            Math.cos(prevAngle * 7 - time * 3) * 6 +
            Math.sin(prevAngle * 3 + time * 6) * 4 +
            Math.cos(prevAngle * 10 - time * 2) * 2;

          const prevRadius = currentRadius + prevWavePattern;
          const prevX = center.x + Math.cos(prevAngle) * prevRadius;
          const prevY = center.y + Math.sin(prevAngle) * prevRadius;

          const cpX = (x + prevX) / 2;
          const cpY = (y + prevY) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, cpY);
        }
      }

      ctx.closePath();

      // Enhanced glow effect for AI speaking
      ctx.shadowColor = "rgba(99, 102, 241, 0.6)";
      ctx.shadowBlur = 20;
      ctx.strokeStyle = "#6366f1";
      ctx.lineWidth = 3;
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = 0;

      // Continue animation loop
      animationRef.current = requestAnimationFrame(drawFrame);
    };

    drawFrame();
  };

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
    // Animation fade-in effect
    let fadeInProgress = 0;

    // Clear any existing animation reference
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }

    const draw = () => {
      if (isActive || waveActive) {
        console.log("⏹️ [Visualizer] Idle animation loop terminated");
        animationRef.current = 0;
        return;
      }

      const elapsed = Date.now() - startTime;
      const time = elapsed * 0.001; // Convert to seconds

      // Calculate fade-in effect (0 to 1 over 500ms)
      fadeInProgress = Math.min(1, elapsed / 500);

      // Clear canvas with dark background
      ctx.fillStyle = "#111827";
      ctx.fillRect(0, 0, width, height);

      // Calculate breathing effect
      const breathingScale = 1 + Math.sin(time * 1.5) * 0.03; // Normal breathing
      const currentRadius = baseRadius * breathingScale;

      // Draw base circle (body)
      ctx.beginPath();
      ctx.arc(center.x, center.y, currentRadius, 0, Math.PI * 2);
      ctx.fillStyle = "#111827";
      ctx.fill();

      // Transition from purple to green using fade effect
      const r = Math.round(99 + (20 - 99) * fadeInProgress);
      const g = Math.round(102 + (184 - 102) * fadeInProgress);
      const b = Math.round(241 + (166 - 241) * fadeInProgress);
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw eyes - transitioning from purple to green squares
      const eyeSize = 8;
      const eyeSpacing = 30;
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;

      if (!isBlinking) {
        // Normal square eyes
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
      } else {
        // Closed eyes (horizontal lines)
        ctx.lineWidth = 2;
        ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
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
        const wavePattern =
          Math.sin(angle * 3 + time * 2) * 4 +
          Math.sin(angle * 2 - time) * 6 +
          Math.sin(angle + time * 0.5) * 8;

        const radius = currentRadius + wavePattern;

        const x = center.x + Math.cos(angle) * radius;
        const y = center.y + Math.sin(angle) * radius;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          const prevAngle = (i - 1) * angleStep;
          const prevWavePattern =
            Math.sin(prevAngle * 3 + time * 2) * 4 +
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

      // Add glow effect with color transition
      // Transition shadow from purple to teal green
      const shadowR = Math.round(99 + (20 - 99) * fadeInProgress);
      const shadowG = Math.round(102 + (184 - 102) * fadeInProgress);
      const shadowB = Math.round(241 + (166 - 241) * fadeInProgress);
      ctx.shadowColor = `rgba(${shadowR}, ${shadowG}, ${shadowB}, 0.5)`;
      ctx.shadowBlur = 15;
      ctx.strokeStyle = `rgb(${r}, ${g}, ${b})`;
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
