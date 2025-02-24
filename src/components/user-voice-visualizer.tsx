"use client";

import { useState, useEffect } from "react";
import { Visualizer } from "react-sound-visualizer";

interface VisualizerRenderProps {
  canvasRef: (canvas: HTMLCanvasElement) => void;
  stop?: () => void;
  start?: () => void;
  reset?: () => void;
}

export default function AudioVisualizer({
  stream,
}: {
  stream: MediaStream | null;
}) {
  const [audio, setAudio] = useState<MediaStream | null>(null);

  useEffect(() => {
    setAudio(stream);
  }, [stream]);

  return (
    <div className="relative max-w-md mx-auto">
      <Visualizer
        audio={audio}
        mode="current"
        strokeColor="#14b8a6"
        autoStart={true}
        rectWidth={2}
      >
        {({ canvasRef }: VisualizerRenderProps) => (
          <canvas
            ref={canvasRef}
            width={500}
            height={100}
            className="w-full rounded-lg"
          />
        )}
      </Visualizer>
    </div>
  );
}
