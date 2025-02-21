"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, Square } from "lucide-react";
import { Message } from "ai";

interface AudioRecorderProps {
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void;
  onAudioResponse: (audioBlob: Blob) => void;
  messages?: Message[];
}

export default function AudioRecorder({
  onTranscriptReceived,
  onAudioResponse,
  messages = [],
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const playAudioResponse = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.play();
    }
  };

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

        // Clean up the stream
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

  const handleAudioSubmission = async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob);
      formData.append("messages", JSON.stringify(messages));

      const response = await fetch("/api/chat/voice", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to process audio");
      }

      // Get the transcripts from headers
      const transcript = response.headers.get("x-transcript");
      const aiText = response.headers.get("x-ai-text");

      // Handle the transcript if available
      if (transcript) {
        onTranscriptReceived(decodeURIComponent(transcript), "Human");
      }

      // Handle AI response
      if (aiText) {
        onTranscriptReceived(decodeURIComponent(aiText), "AI");
      }

      // Get the audio response
      const audioArrayBuffer = await response.arrayBuffer();
      const audioResponseBlob = new Blob([audioArrayBuffer], {
        type: "audio/wav",
      });
      onAudioResponse(audioResponseBlob);
      playAudioResponse(audioResponseBlob);
    } catch (error) {
      console.error("Error processing audio:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
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
      <audio ref={audioRef} className="hidden" />
    </div>
  );
}
