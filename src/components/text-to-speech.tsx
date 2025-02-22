"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface TextToSpeechProps {
  onAudioGenerated?: (audioBlob: Blob) => void;
}

export default function TextToSpeech({ onAudioGenerated }: TextToSpeechProps) {
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!text.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/tts/kokoro", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text,
          outputFormat: "wav",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to generate speech");
      }

      // Get the audio data as an array buffer
      const arrayBuffer = await response.arrayBuffer();
      const audioBlob = new Blob([arrayBuffer], { type: "audio/wav" });

      if (onAudioGenerated) {
        onAudioGenerated(audioBlob);
      }

      // Clean up previous audio element if it exists
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      // Create new audio element
      const audio = new Audio();

      // Set up promise to handle audio loading
      const canPlayPromise = new Promise((resolve, reject) => {
        audio.oncanplaythrough = resolve;
        audio.onerror = reject;
      });

      // Create object URL and set it as the source
      const audioUrl = URL.createObjectURL(audioBlob);
      audio.src = audioUrl;
      audioRef.current = audio;

      // Wait for the audio to be ready
      await canPlayPromise;

      // Play the audio
      await audio.play();
    } catch (error: any) {
      console.error("Error generating speech:", error);
      setError(error.message || "Failed to generate speech");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="min-h-[100px] bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
        />
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-600"
        >
          {isLoading ? "Generating Speech..." : "Convert to Speech"}
        </Button>
      </form>
      {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
    </div>
  );
}
