"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { createClient } from "@supabase/supabase-js";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, Share2 } from "lucide-react";
import Link from "next/link";
import { Database } from "@/types/supabase";

// Initialize Supabase client (will be configured with environment variables)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// Define vote type
interface Vote {
  vote_for: "human" | "ai";
  [key: string]: any;
}

export default function VotePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const debateId = params.debateId as string;
  const initialVote = searchParams.get("vote");

  const [votes, setVotes] = useState({ human: 0, ai: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [hasVoted, setHasVoted] = useState(false);
  const [votedFor, setVotedFor] = useState<"human" | "ai" | null>(null);
  const [debateInfo, setDebateInfo] = useState<{ title: string } | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const totalVotes = votes.human + votes.ai;
  const getPercentage = (value: number) =>
    totalVotes === 0 ? 0 : (value / totalVotes) * 100;

  // Get voter ID from localStorage or create a new one
  const getVoterId = () => {
    const storageKey = "ai_debate_voter_id";
    let voterId = localStorage.getItem(storageKey);

    if (!voterId) {
      voterId = Math.random().toString(36).substring(2, 15);
      localStorage.setItem(storageKey, voterId);
    }

    return voterId;
  };

  // Check if user has already voted in this debate
  const checkIfVoted = () => {
    const storageKey = `ai_debate_voted_${debateId}`;
    const voted = localStorage.getItem(storageKey);

    if (voted) {
      setHasVoted(true);
      setVotedFor(voted as "human" | "ai");
      return true;
    }

    return false;
  };

  // Save vote to localStorage
  const saveVote = (vote: "human" | "ai") => {
    const storageKey = `ai_debate_voted_${debateId}`;
    localStorage.setItem(storageKey, vote);
    setHasVoted(true);
    setVotedFor(vote);
  };

  // Load votes from Supabase
  useEffect(() => {
    const fetchVotes = async () => {
      try {
        // Get debate info
        const { data: debateData, error: debateError } = await supabase
          .from("rt_debates")
          .select("title")
          .eq("id", debateId)
          .single();

        if (debateError) throw debateError;
        setDebateInfo(debateData);

        // Set share URL
        const url = `${window.location.origin}/vote/${debateId}`;
        setShareUrl(url);

        // Get vote counts
        const { count: humanCount, error: humanError } = await supabase
          .from("rt_votes")
          .select("*", { count: "exact", head: true })
          .eq("debate_id", debateId)
          .eq("vote_for", "human");

        const { count: aiCount, error: aiError } = await supabase
          .from("rt_votes")
          .select("*", { count: "exact", head: true })
          .eq("debate_id", debateId)
          .eq("vote_for", "ai");

        if (humanError) throw humanError;
        if (aiError) throw aiError;

        setVotes({
          human: humanCount || 0,
          ai: aiCount || 0,
        });

        console.log(
          `Fetched votes: human=${humanCount}, ai=${aiCount} for debate ${debateId}`
        );

        // Check if user has voted
        const hasAlreadyVoted = checkIfVoted();

        // If there's an initial vote parameter and user hasn't voted yet, cast the vote
        if (
          initialVote &&
          !hasAlreadyVoted &&
          (initialVote === "human" || initialVote === "ai")
        ) {
          await handleVote(initialVote as "human" | "ai");
        }
      } catch (error) {
        console.error("Error fetching votes:", error);
        // Reset votes to 0 in case of error
        setVotes({ human: 0, ai: 0 });
      } finally {
        setIsLoading(false);
      }
    };

    fetchVotes();

    // Set up real-time subscription for votes
    const votesSubscription = supabase
      .channel(`votes-channel-${debateId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "rt_votes",
          filter: `debate_id=eq.${debateId}`,
        },
        (payload) => {
          // Update vote count when new votes come in
          if (payload.eventType === "INSERT") {
            const voteData =
              payload.new as Database["public"]["Tables"]["rt_votes"]["Row"];

            console.log("New vote received:", voteData);

            if (voteData.vote_for === "human" || voteData.vote_for === "ai") {
              setVotes((prev) => {
                const newVotes = {
                  ...prev,
                  [voteData.vote_for]: prev[voteData.vote_for] + 1,
                };
                console.log("Updated votes:", newVotes);
                return newVotes;
              });
            }
          }
        }
      )
      .subscribe((status) => {
        console.log(`Realtime subscription status: ${status}`);
      });

    return () => {
      supabase.removeChannel(votesSubscription);
    };
  }, [debateId, initialVote]);

  const handleVote = async (voteFor: "human" | "ai") => {
    if (hasVoted) return;

    try {
      console.log(`Casting vote for ${voteFor} in debate ${debateId}`);

      // Record vote in Supabase
      const { data, error } = await supabase
        .from("rt_votes")
        .insert({
          debate_id: debateId,
          vote_for: voteFor,
          voter_id: getVoterId(),
          voter_ip: "anonymous", // In a real app, you might capture this server-side
        })
        .select();

      if (error) throw error;

      console.log("Vote recorded successfully:", data);

      // Update local state immediately
      setVotes((prev) => ({
        ...prev,
        [voteFor]: prev[voteFor] + 1,
      }));

      // Save to localStorage
      saveVote(voteFor);
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a1017] text-white flex items-center justify-center p-4">
      <motion.div
        className="max-w-md w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/"
            className="text-gray-400 hover:text-white flex items-center gap-1"
          >
            <ArrowLeft className="size-4" />
            <span>Back to Debate</span>
          </Link>

          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-gray-400 hover:text-white"
            onClick={handleShareLink}
          >
            {copied ? (
              <span className="text-xs text-emerald-500">Copied!</span>
            ) : (
              <Share2 className="size-4" />
            )}
          </Button>
        </div>

        <Card className="bg-zinc-900/50 border-zinc-800 backdrop-blur-xl p-6 rounded-3xl">
          <h2 className="text-xl text-white font-semibold mb-2 text-center">
            Voice Your Opinion
          </h2>

          <p className="text-gray-400 text-center mb-6">
            {debateInfo?.title || "Human vs AI: The Great Debate"}
          </p>

          {isLoading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-zinc-800 rounded-lg" />
              <div className="h-12 bg-zinc-800 rounded-lg" />
              <div className="grid grid-cols-2 gap-3 mt-6">
                <div className="h-12 bg-zinc-800 rounded-lg" />
                <div className="h-12 bg-zinc-800 rounded-lg" />
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4 mb-6">
                <div className="relative h-12">
                  <div className="absolute bg-zinc-900 inset-0 rounded-lg" />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-sky-700 rounded-lg"
                    initial={{ width: "0%" }}
                    animate={{ width: `${getPercentage(votes.human)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="font-medium">Human PMs</span>
                    <span>{getPercentage(votes.human).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="relative h-12">
                  <div className="absolute inset-0 bg-zinc-900 rounded-lg" />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-teal-700 rounded-lg"
                    initial={{ width: "0%" }}
                    animate={{ width: `${getPercentage(votes.ai)}%` }}
                    transition={{ duration: 0.5 }}
                  />
                  <div className="absolute inset-0 flex items-center justify-between px-3">
                    <span className="font-medium">AI</span>
                    <span>{getPercentage(votes.ai).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              {hasVoted ? (
                <div className="text-center py-2">
                  <p className="text-emerald-500 mb-2">
                    Thanks for voting! You voted for{" "}
                    {votedFor === "human" ? "Human PMs" : "AI"}.
                  </p>
                  <p className="text-gray-400 text-sm">
                    Total votes: {totalVotes}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-blue-500/50 hover:bg-sky-600 py-6"
                    onClick={() => handleVote("human")}
                  >
                    Vote Human
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="border-teal-500/50 hover:bg-teal-600 py-6"
                    onClick={() => handleVote("ai")}
                  >
                    Vote AI
                  </Button>
                </div>
              )}
            </>
          )}
        </Card>

        <p className="text-center text-gray-500 text-xs mt-4">
          Your vote is anonymous and stored securely.
        </p>
      </motion.div>
    </div>
  );
}
