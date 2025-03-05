"use client";

import { useState, useEffect, useCallback } from "react";
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

  // Custom hooks
  const { currentDebateId, isDebateLoading } = useDebateInitialization();
  const { audioLevel, brainActivity } = useAudioAnimation({
    isAudioPlaying,
    isListening,
  });
  const { debateSummary, isLoadingSummary, isTransitioning, fetchSummary } =
    useDebateSummary({
      transcript,
      aiIsTyping,
      isAudioPlaying,
    });

  // Get the audio controller methods
  const audioController = AudioController({
    isListening,
    isAudioPlaying,
    setRecentUserAudio,
    setRecentAIAudio,
  });

  // Handle mic button click
  const handleMicButtonClick = useCallback(() => {
    if (isDebateLoading || !currentDebateId || isProcessing) return;

    // Stop all audio animations when toggling off the microphone
    if (isListening) {
      // Immediately stop all audio animations
      setIsAudioPlaying(false);
      setIsPlaying(false);
      setAudioData(undefined);

      // Make sure any ongoing effects are cleared
      const resetAnimations = () => {
        setIsAudioPlaying(false);
        setIsPlaying(false);
        setAudioData(undefined);
      };

      // Double cleanup with small delay to ensure everything is reset
      resetAnimations();
      setTimeout(resetAnimations, 50);
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

      audioController.handleTranscriptReceived(text, speaker);

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
    [audioController]
  );

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

  // Add handler for audio playing state changes
  const handleAudioPlayingChange = useCallback(
    (isPlaying: boolean) => {
      console.log(
        `🔊 [Page] Audio playing state changed to: ${
          isPlaying ? "PLAYING" : "STOPPED"
        }`
      );

      // Only update audio playing state if we're still listening
      if (isListening) {
        // Immediately update the playing state so UI can react
        setIsAudioPlaying(isPlaying);
      }
      // When audio stops playing or not listening, ensure we clean up immediately
      else {
        console.log(
          "🔄 [Page] Audio stopped or not listening, resetting audio data"
        );
        // Reset audio data immediately for UI
        setIsAudioPlaying(false);
        setAudioData(undefined);
        setIsPlaying(false);
      }
    },
    [isListening]
  );

  // New handler for session status changes
  const handleSessionStatusChange = useCallback((status: string) => {
    console.log(`🔄 [Page] Session status changed to: ${status}`);
    setSessionStatus(status);
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Animated background */}
      <Background />

      {/* Header */}
      <Header />

      <div className="flex-1 relative z-10 flex flex-col md:flex-row gap-6 p-6 container w-full mx-auto">
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
        <div className="md:w-96 space-y-6">
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

          {/* Audience Consensus */}
          <AudiencePoll debateId={currentDebateId!} />
        </div>
      </div>

      {/* Hidden Debater Component */}
      <div className="opacity-0 pointer-events-none absolute">
        <Debater
          onTranscriptReceived={handleTranscriptReceived}
          onAudioResponse={audioController.handleAudioResponse}
          messages={messages}
          onProcessingChange={setIsProcessing}
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
