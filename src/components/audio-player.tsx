"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface AudioPlayerProps {
  audioBlob?: Blob | null;
  stream?: MediaStream | null;
  isActive?: boolean;
}

export default function AudioPlayer({
  audioBlob,
  stream,
  isActive = false,
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasAttachedStreamRef = useRef(false);

  // If we have a stream, attach it to the audio element ONCE
  useEffect(() => {
    if (stream && audioRef.current && !hasAttachedStreamRef.current) {
      // Set the flag first to prevent repeated attempts if play() fails
      hasAttachedStreamRef.current = true;

      audioRef.current.srcObject = stream;

      // Play with error handling
      audioRef.current.play().catch((err) => {
        console.error("Error playing audio stream:", err);
        // Reset the flag if play fails
        hasAttachedStreamRef.current = false;
      });

      setIsPlaying(true);
    }

    // Cleanup function
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.srcObject) {
          audioRef.current.srcObject = null;
        }
      }
      hasAttachedStreamRef.current = false;
    };
  }, [stream]);

  // For blob-based audio playback
  const togglePlayback = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      if (audioBlob) {
        const audioUrl = URL.createObjectURL(audioBlob);
        audioRef.current.src = audioUrl;
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.error("Error playing audio blob:", err));
      } else if (stream && audioRef.current.srcObject === stream) {
        audioRef.current
          .play()
          .then(() => setIsPlaying(true))
          .catch((err) => console.error("Error playing stream:", err));
      }
    }
  }, [audioBlob, isPlaying, stream]);

  // Toggle mute - use the callback to prevent unnecessary re-renders
  const toggleMute = useCallback(() => {
    if (!audioRef.current) return;

    const newMutedState = !audioRef.current.muted;
    audioRef.current.muted = newMutedState;
    setIsMuted(newMutedState);
  }, []);

  // Handle playback end
  const handlePlaybackEnd = useCallback(() => {
    setIsPlaying(false);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        onEnded={handlePlaybackEnd}
        onPause={handlePlaybackEnd}
        className="hidden"
      />
      {audioBlob && (
        <Button
          variant="outline"
          size="icon"
          onClick={togglePlayback}
          disabled={!audioBlob && !stream}
          className="size-8 rounded-full"
        >
          {isPlaying ? (
            <Pause className="w-4 h-4" />
          ) : (
            <Play className="w-4 h-4" />
          )}
        </Button>
      )}

      {stream && (
        <Button
          variant="outline"
          size="icon"
          onClick={toggleMute}
          className={`size-8 rounded-full ${
            isActive ? "bg-emerald-500/20 text-emerald-400" : ""
          }`}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4" />
          ) : (
            <Volume2 className="w-4 h-4" />
          )}
        </Button>
      )}
    </div>
  );
}
