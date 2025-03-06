"use client";

import Debater from "@/components/debater";
import { Message } from "ai";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Import new components
import AISpeakerDisplay from "@/components/AISpeakerDisplay";
import ChatConversation from "@/components/ChatConversation";
import Footer from "@/components/Layout/Footer";
import Header from "@/components/Layout/Header";

// Import custom hooks
import useDebateInitialization from "@/hooks/useDebateInitialization";

export default function Home() {
  // State
  const [transcript, setTranscript] = useState<
    Array<{ text: string; speaker: "AI" | "Human"; timestamp?: number }>
  >([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [audioData, setAudioData] = useState<Uint8Array | undefined>();
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiIsTyping, setAiIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [audioLevel, setAudioLevel] = useState(0);
  const [pendingAIMessage, setPendingAIMessage] = useState<string>("");
  const [recentUserAudio, setRecentUserAudio] = useState<string>("");

  // Custom hooks
  const { currentDebateId, isDebateLoading } = useDebateInitialization();

  // Create a ref for handleTranscriptReceived function
  const handleTranscriptReceivedRef = useRef<
    ((text: string, speaker: "AI" | "Human") => void) | null
  >(null);

  // Audio controller with direct reference to the current handleTranscriptReceived function
  const audioController = useMemo(() => {
    return {
      handleAudioResponse: (audioBlob: Blob) => {
        if (audioBlob.size === 0) {
          // Reset audio data when we get an empty blob
          setAudioData(undefined);
          setAudioLevel(0);
          return;
        }

        // Read the blob as an array buffer
        const reader = new FileReader();
        reader.onload = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          if (arrayBuffer) {
            const uint8Array = new Uint8Array(arrayBuffer);

            // Calculate audio level (average volume)
            let sum = 0;
            for (let i = 0; i < uint8Array.length; i++) {
              sum += uint8Array[i];
            }
            const avgLevel = sum / uint8Array.length / 255; // Normalize to 0-1

            // Update audio level with some smoothing
            setAudioLevel((prev: number) => prev * 0.3 + avgLevel * 0.7);

            // Set the audio data for visualization
            setAudioData(uint8Array);

            // Convert to base64 for transcription
            const base64Audio = btoa(
              String.fromCharCode.apply(null, Array.from(uint8Array))
            );
            setRecentUserAudio(base64Audio);
          }
        };
        reader.readAsArrayBuffer(audioBlob);
      },

      // Include this to handle references to this method
      handleTranscriptReceived: (text: string, speaker: "AI" | "Human") => {
        if (handleTranscriptReceivedRef.current) {
          handleTranscriptReceivedRef.current(text, speaker);
        }
      },
    };
  }, []);

  // Handle mic button click
  const handleMicButtonClick = useCallback(() => {
    if (isDebateLoading || !currentDebateId) return;

    if (isProcessing) {
      console.log("⏳ Cannot toggle mic while processing...");
      return;
    }

    // Stop all audio animations when toggling off the microphone
    if (isListening) {
      // Define a more thorough reset function
      const resetAnimations = () => {
        console.log("🛑 [Reset] Stopping all animations");
        setIsAudioPlaying(false);
        setAudioData(undefined);
        setAudioLevel(0);
      };

      // Execute reset immediately and with a delay to ensure it completes
      resetAnimations();
      setTimeout(resetAnimations, 50);
      setTimeout(resetAnimations, 200); // One more with longer timeout for safety
    }

    setIsListening(!isListening);
    // This should trigger the debater's handleStartStopClick
    const micButton = document.querySelector(".debater-mic-button");
    if (micButton) {
      (micButton as HTMLButtonElement).click();
    }
  }, [isListening, isDebateLoading, currentDebateId, isProcessing]);

  // Handle when a new transcript is received
  const handleTranscriptReceived = useCallback(
    (text: string, speaker: "AI" | "Human") => {
      if (!text.trim()) return;

      // For human messages, add them immediately
      if (speaker === "Human") {
        setTranscript((prev) => {
          // Check for exact duplicates
          const isDuplicate = prev.some(
            (item) =>
              item.speaker === "Human" &&
              item.text === text &&
              item.timestamp &&
              Date.now() - item.timestamp < 2000
          );

          if (isDuplicate) return prev;
          return [...prev, { text, speaker, timestamp: Date.now() }];
        });
      } else {
        // For AI messages, store them until audio is complete
        setPendingAIMessage(text);
      }

      // Add message to chat history
      const newMessage: Message = {
        id: `${speaker}-${Date.now()}`,
        role: speaker === "AI" ? "assistant" : "user",
        content: text,
      };

      setMessages((prev) => {
        // Check for exact duplicates in messages
        if (
          prev.some(
            (msg) => msg.content === text && msg.role === newMessage.role
          )
        ) {
          return prev;
        }
        return [...prev, newMessage];
      });
    },
    []
  );

  // Function to transcribe user audio
  const transcribeUserAudio = useCallback(
    async (userAudio: string) => {
      if (!userAudio) return;

      try {
        console.log("Sending audio to Groq Whisper for transcription...");

        const response = await fetch("/api/audio-analysis", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userAudio,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.details || "Failed to transcribe audio with Groq Whisper"
          );
        }

        const data = await response.json();
        console.log("Groq Whisper transcription result:", data);

        if (data.transcription && data.speaker) {
          // Add the transcription to the transcript
          handleTranscriptReceived(data.transcription, data.speaker);
          return data.transcription;
        } else {
          throw new Error("No transcription returned from Groq Whisper");
        }
      } catch (error) {
        console.error("Error transcribing audio with Groq Whisper:", error);
        throw error; // Re-throw to allow the calling component to handle it
      }
    },
    [handleTranscriptReceived]
  );

  // Effect to handle AI message after audio completes
  useEffect(() => {
    if (!isAudioPlaying && pendingAIMessage && !aiIsTyping) {
      setTranscript((prev) => [
        ...prev,
        { text: pendingAIMessage, speaker: "AI", timestamp: Date.now() },
      ]);
      setPendingAIMessage("");
    }
  }, [isAudioPlaying, pendingAIMessage, aiIsTyping]);

  // Keep the ref updated with the latest callback
  useEffect(() => {
    handleTranscriptReceivedRef.current = handleTranscriptReceived;
  }, [handleTranscriptReceived]);

  // Handle AI typing state changes
  const handleAiTypingChange = useCallback((isTyping: boolean) => {
    setAiIsTyping(isTyping);
  }, []);

  // Add handler for processing state changes
  const handleProcessingChange = useCallback((processing: boolean) => {
    console.log(
      `🔄 [Page] Processing state changed to: ${processing ? "ON" : "OFF"}`
    );
    setIsProcessing(processing);
  }, []);

  // Add handler for audio playing state changes
  const handleAudioPlayingChange = useCallback(
    (isPlaying: boolean) => {
      console.log(
        `🔊 [Page] Audio playing state changed to: ${
          isPlaying ? "PLAYING" : "STOPPED"
        }`
      );

      // Always update the audio playing state immediately
      setIsAudioPlaying(isPlaying);

      // Update related UI states based on audio playing
      if (isPlaying) {
        // When audio starts playing, make sure we have some data for visualization
        if (!audioData) {
          // Create dummy data for visualization when starting
          const dummyData = new Uint8Array(128);
          for (let i = 0; i < dummyData.length; i++) {
            dummyData[i] = Math.floor(Math.random() * 128);
          }
          setAudioData(dummyData);
        }
      } else if (!isListening) {
        // Only reset audio data when audio stops and we're not listening
        console.log(
          "🔄 [Page] Audio stopped and not listening, resetting audio data"
        );
        setAudioData(undefined);
      }
    },
    [isListening, audioData]
  );

  // New handler for session status changes
  const handleSessionStatusChange = useCallback((status: string) => {
    console.log(`🔄 [Page] Session status changed to: ${status}`);
    setSessionStatus(status);
  }, []);

  return (
    <div className="bg-[#f3f4f6] flex flex-col h-screen">
      {/* Grid Pattern Background */}
      <div className="grid-background"></div>

      {/* Header */}
      <Header />

      <div className="flex-1 relative z-10 flex flex-col md:flex-row gap-6 p-6 max-w-7xl w-full mx-auto min-h-[calc(100vh-20rem)]">
        {/* Main AI visualization */}
        <div className="flex-1">
          <AISpeakerDisplay
            isAudioPlaying={isAudioPlaying}
            isListening={isListening}
            isDebateLoading={isDebateLoading}
            isProcessing={isProcessing}
            audioLevel={audioLevel}
            sessionStatus={""}
            handleMicButtonClick={handleMicButtonClick}
            currentDebateId={currentDebateId}
          />
        </div>

        {/* Right sidebar */}
        <ChatConversation
          transcript={transcript}
          userAudio={recentUserAudio}
          onTranscribe={transcribeUserAudio}
        />
      </div>

      {/* Hidden Debater Component */}
      <div className="opacity-0 pointer-events-none absolute">
        <Debater
          onTranscriptReceived={handleTranscriptReceived}
          onAudioResponse={audioController.handleAudioResponse}
          messages={messages}
          onProcessingChange={handleProcessingChange}
          onAiTypingChange={handleAiTypingChange}
          onAudioPlayingChange={handleAudioPlayingChange}
          onSessionStatusChange={handleSessionStatusChange}
        />
      </div>

      {/* Footer */}
      <Footer />
    </div>
  );
}
