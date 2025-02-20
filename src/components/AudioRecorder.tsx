"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface AudioRecorderProps {
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void;
  onAudioResponse: (audioBlob: Blob) => void;
}

export default function AudioRecorder({
  onTranscriptReceived,
  onAudioResponse,
}: AudioRecorderProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const intentionalStopRef = useRef(false);

  const stopCurrentAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        alert("Speech recognition is not supported in this browser");
        return;
      }

      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then(() => {
          const SpeechRecognition =
            window.SpeechRecognition || window.webkitSpeechRecognition;
          const recognition = new SpeechRecognition();

          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.lang = "en-US";
          recognition.maxAlternatives = 1;

          let finalTranscript = "";
          intentionalStopRef.current = false;

          recognition.onresult = (event: any) => {
            let interimTranscript = "";

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript;
              if (event.results[i].isFinal) {
                finalTranscript += transcript + " ";
                handleVoiceInput(finalTranscript.trim());
                finalTranscript = ""; // Reset for next input
              } else {
                interimTranscript += transcript;
              }
            }
          };

          recognition.onerror = (event: any) => {
            console.error("Speech recognition error:", event.error);
            if (event.error !== "no-speech" && !intentionalStopRef.current) {
              // Only restart if it wasn't intentionally stopped
              recognition.start();
            }
          };

          recognition.onend = () => {
            if (isListening && !intentionalStopRef.current) {
              recognition.start(); // Restart if we're supposed to be listening
            } else {
              setIsListening(false);
            }
          };

          window.recognition = recognition;
        })
        .catch((err) => {
          console.error("Microphone permission denied:", err);
          alert("Please allow microphone access to use voice features");
        });
    }
  }, [isListening]);

  const handleVoiceInput = async (transcript: string) => {
    try {
      setIsProcessing(true);
      stopCurrentAudio();

      onTranscriptReceived(transcript, "Human");

      abortControllerRef.current = new AbortController();

      // Send the text to get AI response
      const chatResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: transcript }],
        }),
        signal: abortControllerRef.current.signal,
      });

      const chatData = await chatResponse.json();

      if (chatData.error) {
        throw new Error(chatData.error);
      }

      // Send the AI response to the transcript
      onTranscriptReceived(chatData.text, "AI");

      // Generate voice response
      const voiceResponse = await fetch("/api/voice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: chatData.text }),
        signal: abortControllerRef.current.signal,
      });

      if (!voiceResponse.ok) {
        throw new Error("Failed to generate voice response");
      }

      const responseBlob = await voiceResponse.blob();
      onAudioResponse(responseBlob);

      // Automatically play the response
      if (audioRef.current) {
        const url = URL.createObjectURL(responseBlob);
        audioRef.current.src = url;
        audioRef.current.onended = () => {
          URL.revokeObjectURL(url);
        };
        await audioRef.current.play();
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Error processing voice input:", error);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleMic = () => {
    if (isListening) {
      intentionalStopRef.current = true;
      window.recognition?.stop();
      stopCurrentAudio();
    } else {
      intentionalStopRef.current = false;
      window.recognition?.start();
    }
    setIsListening(!isListening);
  };

  return (
    <div className="flex items-center justify-center gap-4">
      <audio ref={audioRef} className="hidden" />
      <Button
        variant={isListening ? "destructive" : "default"}
        size="lg"
        onClick={toggleMic}
        disabled={isProcessing}
        className="w-40 h-14"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processing...
          </>
        ) : isListening ? (
          <>
            <MicOff className="w-5 h-5 mr-2" />
            Stop Recording
          </>
        ) : (
          <>
            <Mic className="w-5 h-5 mr-2" />
            Start Recording
          </>
        )}
      </Button>
    </div>
  );
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
    recognition: any;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: any) => void;
  onerror: (event: any) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
