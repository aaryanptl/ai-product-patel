"use client";

import { useState, useEffect } from "react";

interface UseDebateSummaryProps {
  transcript: Array<{
    text: string;
    speaker: "AI" | "Human";
    timestamp?: number;
  }>;
  aiIsTyping: boolean;
  isAudioPlaying: boolean;
}

export default function useDebateSummary({
  transcript,
  aiIsTyping,
  isAudioPlaying,
}: UseDebateSummaryProps) {
  const [debateSummary, setDebateSummary] = useState<string>(
    "Hello! I am Product Patel, AI Product Manager at Build Fast with AI. I'm here at IIM Bangalore to demonstrate a simple truth: AI product management is not just the future, it is the present, because it is *better* than human product management."
  );
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Effect to fetch a summary whenever the transcript changes with new AI messages
  useEffect(() => {
    const fetchDebateSummary = async () => {
      // Only generate a summary if we have at least 2 messages (1 exchange)
      if (transcript.length < 2) return;

      // Check if the last message is from AI and is final (not being typed)
      const lastMessage = transcript[transcript.length - 1];
      if (lastMessage.speaker !== "AI" || aiIsTyping) return;

      // Don't update while audio is still playing
      if (isAudioPlaying) return;

      // Add a small delay after audio stops to ensure everything is processed
      const timeoutId = setTimeout(() => {
        // Only show loading indicator if we don't have a summary yet
        const shouldShowLoading = !debateSummary.trim();

        if (shouldShowLoading) {
          setIsLoadingSummary(true);
        } else {
          // Start transition animation if we already have text
          setIsTransitioning(true);
        }

        try {
          fetch("/api/summary", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ transcript }),
          })
            .then((response) => {
              if (!response.ok) throw new Error("Failed to fetch summary");
              return response.json();
            })
            .then((data) => {
              setDebateSummary(data.summary);
              setIsLoadingSummary(false);

              // End transition after a short delay
              setTimeout(() => {
                setIsTransitioning(false);
              }, 300);
            })
            .catch((error) => {
              console.error("Error fetching debate summary:", error);
              setIsLoadingSummary(false);
              setIsTransitioning(false);
            });
        } catch (error) {
          console.error("Error initiating debate summary fetch:", error);
          setIsLoadingSummary(false);
          setIsTransitioning(false);
        }
      }, 1500); // 1.5 second delay after audio stops playing

      return () => clearTimeout(timeoutId);
    };

    fetchDebateSummary();
  }, [transcript, aiIsTyping, isAudioPlaying, debateSummary]);

  const fetchSummary = async () => {
    if (transcript.length < 2) return;

    // Don't update while audio is still playing
    if (isAudioPlaying) return;

    // Only show loading indicator if we don't have a summary yet
    const shouldShowLoading = !debateSummary.trim();

    if (shouldShowLoading) {
      setIsLoadingSummary(true);
    } else {
      // Start transition animation if we already have text
      setIsTransitioning(true);
    }

    try {
      const response = await fetch("/api/summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ transcript }),
      });

      if (!response.ok) throw new Error("Failed to fetch summary");

      const data = await response.json();
      setDebateSummary(data.summary);
      setIsLoadingSummary(false);

      // End transition after a short delay
      setTimeout(() => {
        setIsTransitioning(false);
      }, 300);
    } catch (error) {
      console.error("Error fetching debate summary:", error);
      setIsLoadingSummary(false);
      setIsTransitioning(false);
    }
  };

  return {
    debateSummary,
    setDebateSummary,
    isLoadingSummary,
    isTransitioning,
    fetchSummary,
  };
}
