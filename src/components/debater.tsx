"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, Square } from "lucide-react";
import { Message } from "ai";

interface DebaterProps {
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void;
  onAudioResponse: (audioBlob: Blob) => void;
  messages?: Message[];
}

export default function Debater({
  onTranscriptReceived,
  onAudioResponse,
  messages = [],
}: DebaterProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Function to handle audio recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleAudioSubmission(audioBlob);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error("Error accessing microphone:", error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Function to handle audio submission and transcription
  const handleAudioSubmission = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("messages", JSON.stringify(messages));

      const response = await fetch("/api/chat/debater", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process audio");
      }

      const data = await response.json();

      // Handle transcribed text
      if (data.transcribedText) {
        onTranscriptReceived(data.transcribedText, "Human");
      }

      // Handle AI response text
      if (data.aiText) {
        onTranscriptReceived(data.aiText, "AI");
      }

      // Handle audio response
      if (data.audio) {
        let audioUrl;
        if (data.audio.startsWith("http") || data.audio.startsWith("data:")) {
          audioUrl = data.audio;
        } else {
          const mimeType = "audio/wav";
          audioUrl = `data:${mimeType};base64,${data.audio}`;
        }

        // Convert base64 to blob
        const response = await fetch(audioUrl);
        const audioBlob = await response.blob();
        onAudioResponse(audioBlob);

        // Play the audio
        const audio = new Audio(audioUrl);
        audio.play().catch((err) => {
          console.error("Error playing audio:", err);
        });
      }
    } catch (error) {
      console.error("Error processing audio:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-center items-center">
        <Button
          onClick={isRecording ? stopRecording : startRecording}
          disabled={isProcessing}
          variant="ghost"
          size="lg"
          className={`
            relative w-16 h-16 rounded-full p-0 
            transition-all duration-200 ease-in-out
            hover:bg-slate-100 dark:hover:bg-slate-800
            ${isRecording ? "bg-red-500/10" : "bg-slate-50 dark:bg-slate-900"}
            ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
          `}
        >
          <div
            className={`
            absolute inset-0 rounded-full
            ${isRecording ? "animate-ping bg-red-500/30" : ""}
          `}
          />
          {isRecording ? (
            <Square className="w-5 h-5 text-red-500 relative z-10" />
          ) : (
            <Mic
              className={`
              w-5 h-5 relative z-10
              ${
                isProcessing
                  ? "text-slate-400"
                  : "text-slate-700 dark:text-slate-300"
              }
            `}
            />
          )}
        </Button>
      </div>
      <audio ref={audioRef} className="hidden" />

      {isProcessing && (
        <div className="text-center text-sm text-zinc-400">
          Processing your speech...
        </div>
      )}
    </div>
  );
}
