// components/SpeechGenerator.js
"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

type AudioFormat = "wav" | "mp3" | "opus" | "flac" | "pcm";

export default function SpeechGenerator() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const generateSpeech = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/tts/test2", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });
      const data = await response.json();
      console.log("API response:", data);

      if (data.audio) {
        let audioUrl;
        // If the audio field is already a URL or data URL, use it directly
        if (data.audio.startsWith("http") || data.audio.startsWith("data:")) {
          audioUrl = data.audio;
        } else {
          // Assume it's a base64 string. Use the output_format from the response or default to 'wav'
          const format = (data.output_format || "wav") as AudioFormat;
          const mimeTypeMap: Record<AudioFormat, string> = {
            wav: "audio/wav",
            mp3: "audio/mpeg",
            opus: "audio/ogg",
            flac: "audio/flac",
            pcm: "audio/pcm",
          };
          const mimeType = mimeTypeMap[format] || "audio/wav";
          audioUrl = `data:${mimeType};base64,${data.audio}`;
        }

        const audio = new Audio(audioUrl);
        // Log to confirm the URL being used
        console.log("Playing audio from URL:", audioUrl);
        audio.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
      } else {
        console.error("No audio received:", data);
      }
    } catch (error) {
      console.error("Error generating speech:", error);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <form onSubmit={generateSpeech} className="space-y-4">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Enter text to convert to speech..."
          className="min-h-[100px] bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-400"
        />
        <Button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white hover:from-green-500 hover:to-emerald-600"
        >
          {loading ? "Generating Speech..." : "Convert to Speech"}
        </Button>
      </form>
    </div>
  );
}
