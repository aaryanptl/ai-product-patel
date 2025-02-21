"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause } from "lucide-react";

interface AudioPlayerProps {
  audioBlob: Blob | null;
  onPlayingChange?: (isPlaying: boolean) => void;
}

export default function AudioPlayer({
  audioBlob,
  onPlayingChange,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const togglePlayback = () => {
    if (!audioRef.current || !audioBlob) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      const audioUrl = URL.createObjectURL(audioBlob);
      audioRef.current.src = audioUrl;
      audioRef.current.play();
    }
    const newPlayingState = !isPlaying;
    setIsPlaying(newPlayingState);
    onPlayingChange?.(newPlayingState);
  };

  const handlePlaybackEnd = () => {
    setIsPlaying(false);
    onPlayingChange?.(false);
  };

  return (
    <div className="flex items-center gap-4">
      <audio
        ref={audioRef}
        onEnded={handlePlaybackEnd}
        onPause={handlePlaybackEnd}
      />
      <Button
        variant="outline"
        size="icon"
        onClick={togglePlayback}
        disabled={!audioBlob}
        className="size-8 rounded-full"
      >
        {isPlaying ? (
          <Pause className="w-5 h-5" />
        ) : (
          <Play className="w-5 h-5" />
        )}
      </Button>
    </div>
  );
}
