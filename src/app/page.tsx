"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Message } from "ai";
import Debater from "@/components/debater";
import AudiencePoll from "@/components/audience-poll";

// Import new components
import Header from "@/components/Layout/Header";
import Footer from "@/components/Layout/Footer";
import Background from "@/components/Layout/Background";
import AISpeakerDisplay from "@/components/AISpeakerDisplay";
import DebateTranscript from "@/components/DebateTranscript";

// Import custom hooks
import useAudioAnimation from "@/hooks/useAudioAnimation";
import useDebateInitialization from "@/hooks/useDebateInitialization";
import useDebateSummary from "@/hooks/useDebateSummary";
import AudioController from "@/components/AudioController";
import BeamsBackground from "@/components/background-beams";

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [recentUserAudio, setRecentUserAudio] = useState<string>("");
  const [recentAIAudio, setRecentAIAudio] = useState<string>("");
  const [audioAnalysis, setAudioAnalysis] = useState<string>("");
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);

  // Custom hooks
  const { currentDebateId, isDebateLoading } = useDebateInitialization();
  const { brainActivity } = useAudioAnimation({
    isAudioPlaying,
    isListening,
  });
  const { debateSummary, isLoadingSummary, isTransitioning, fetchSummary } =
    useDebateSummary({
      transcript,
      aiIsTyping,
      isAudioPlaying,
    });

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
        setIsPlaying(false);
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

      // Add to transcript with timestamp for ordering and duplicate detection
      setTranscript((prev) => {
        // Check for duplicates or very similar messages (AI often repeats with small changes)
        const isDuplicate = prev.some((item) => {
          if (item.speaker !== speaker) return false;

          // For AI, check if the message is very similar (fuzzy match)
          if (speaker === "AI") {
            // Compare removing spaces and punctuation
            const normalize = (str: string) =>
              str.toLowerCase().replace(/[^\w]/g, "");
            const similarity =
              normalize(item.text).includes(normalize(text)) ||
              normalize(text).includes(normalize(item.text));

            // If texts are similar and within 2 seconds, consider it a duplicate
            return (
              similarity && item.timestamp && Date.now() - item.timestamp < 2000
            );
          }

          // For humans, exact match is enough
          return item.text === text;
        });

        if (isDuplicate) return prev;

        return [...prev, { text, speaker, timestamp: Date.now() }];
      });

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

  // Keep the ref updated with the latest callback
  useEffect(() => {
    handleTranscriptReceivedRef.current = handleTranscriptReceived;
  }, [handleTranscriptReceived]);

  // Effect to fetch audio analysis when new audio is available
  useEffect(() => {
    const fetchAudioAnalysis = async () => {
      // Only proceed if we have at least one audio source and at least 2 messages
      if ((!recentUserAudio && !recentAIAudio) || transcript.length < 2) return;

      // Check if the last message is from AI (meaning an exchange just completed)
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage.speaker !== "AI") return;

      // Don't update while audio is still playing
      if (isAudioPlaying) return;

      // Add a small delay after audio stops to ensure everything is processed
      const timeoutId = setTimeout(() => {
        setIsLoadingAnalysis(true);
        try {
          fetch("/api/audio-analysis", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userAudio: recentUserAudio,
              aiAudio: recentAIAudio,
              transcript: transcript.slice(-4), // Send recent transcript for context
            }),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Failed to analyze audio");
              return response.json();
            })
            .then((data) => {
              setAudioAnalysis(data.analysis);
              setIsLoadingAnalysis(false);
            })
            .catch((error) => {
              console.error("Error analyzing audio:", error);
              setIsLoadingAnalysis(false);
            });
        } catch (error) {
          console.error("Error initiating audio analysis:", error);
          setIsLoadingAnalysis(false);
        }
      }, 1500); // 1.5 second delay after audio stops playing

      return () => clearTimeout(timeoutId);
    };

    fetchAudioAnalysis();
  }, [recentUserAudio, recentAIAudio, transcript, isAudioPlaying]);

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
    <div className="text-white flex flex-col">
      {/* Grid Pattern Background */}
      <div className="grid-background"></div>

      {/* Header */}
      <Header />

      <div className="flex-1 relative z-10 flex flex-col md:flex-row gap-6 p-6 max-w-4xl w-full mx-auto">
        {/* Main AI visualization */}
        <AISpeakerDisplay
          isAudioPlaying={isAudioPlaying}
          isListening={isListening}
          isDebateLoading={isDebateLoading}
          isProcessing={isProcessing}
          audioLevel={audioLevel}
          sessionStatus={sessionStatus}
          brainActivity={brainActivity}
          handleMicButtonClick={handleMicButtonClick}
          currentDebateId={currentDebateId}
        />

        {/* Right sidebar */}
      </div>
      <div className="md:w-96 mx-auto space-y-6">
        {/* Neural Analysis Panel */}
        <DebateTranscript
          transcript={transcript}
          debateSummary={debateSummary}
          isLoadingSummary={isLoadingSummary}
          isTransitioning={isTransitioning}
          isAudioPlaying={isAudioPlaying}
          fetchSummary={fetchSummary}
          setSessionStatus={setSessionStatus}
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
