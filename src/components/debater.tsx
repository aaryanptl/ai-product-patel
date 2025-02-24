"use client";

import { useState, useRef } from "react";
import { Button } from "./ui/button";
import { Mic, Square } from "lucide-react";
import { Message } from "ai";
import AudioVisualizer from "./user-voice-visualizer";

interface DebaterProps {
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void;
  onAudioResponse: (audioBlob: Blob) => void;
  messages?: Message[];
  onProcessingChange?: (isProcessing: boolean) => void;
}

export default function Debater({
  onTranscriptReceived,
  onAudioResponse,
  messages = [],
  onProcessingChange,
}: DebaterProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array | undefined>();
  const [stream, setStream] = useState<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Function to handle audio recording
  const startRecording = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      const mediaRecorder = new MediaRecorder(mediaStream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setStream(mediaStream);

      // Set up audio analysis
      audioContextRef.current = new (window.AudioContext ||
        (window as any).webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;

      const source =
        audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);

      const animate = () => {
        if (!analyserRef.current || !isRecording) return;
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);
        onAudioResponse(
          new Blob([dataArray], { type: "application/octet-stream" })
        );
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        await handleAudioSubmission(audioBlob);
        mediaStream.getTracks().forEach((track) => track.stop());
        setStream(null);

        // Clean up audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
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
    onProcessingChange?.(true);
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
      }
    } catch (error) {
      console.error("Error processing audio:", error);
    } finally {
      setIsProcessing(false);
      onProcessingChange?.(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="w-full max-w-2xl mx-auto">
        <AudioVisualizer stream={stream} />
      </div>
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
    </div>
  );
}
