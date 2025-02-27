"use client";
import { RefObject } from "react";

export async function createRealtimeConnection(
  ephemeralToken: string,
  audioElement: RefObject<HTMLAudioElement | null>,
  onTranscriptReceived: (text: string, speaker: "AI" | "Human") => void
) {
  const pc = new RTCPeerConnection();

  // Set up audio stream for playback
  pc.ontrack = (e) => {
    if (audioElement.current) {
      audioElement.current.srcObject = e.streams[0];
    }
  };

  // Get user's microphone stream
  const ms = await navigator.mediaDevices.getUserMedia({ audio: true });
  pc.addTrack(ms.getTracks()[0]);

  // Create data channel for events
  const dc = pc.createDataChannel("response");

  // Handle incoming messages from the data channel
  dc.onmessage = (e) => {
    try {
      const msg = JSON.parse(e.data);
      console.log("Data channel message:", msg);

      // Handle different types of messages based on their type
      switch (msg.type) {
        case "response.audio_transcript.delta":
          // Assistant partial transcript
          if (msg.delta) {
            onTranscriptReceived(msg.delta, "AI");
          }
          break;

        case "conversation.item.input_audio_transcription":
        case "conversation.item.input_audio_transcription.completed":
          // User transcript (partial or final)
          if (msg.transcript) {
            onTranscriptReceived(msg.transcript, "Human");
          }
          break;
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  // Configure the data channel when open
  dc.onopen = () => {
    // Send session update
    const sessionUpdate = {
      type: "session.update",
      session: {
        modalities: ["text", "audio"],
      },
    };
    dc.send(JSON.stringify(sessionUpdate));
  };

  // Create and set local description (offer)
  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  // Connect to OpenAI's Realtime API with the current endpoint
  const baseUrl = "https://api.openai.com/v1/realtime";
  const model = "gpt-4o-realtime-preview-2024-12-17";
  const voice = "alloy"; // Default voice

  console.log("Connecting to OpenAI realtime API...");
  const sdpResponse = await fetch(`${baseUrl}?model=${model}&voice=${voice}`, {
    method: "POST",
    body: offer.sdp,
    headers: {
      Authorization: `Bearer ${ephemeralToken}`,
      "Content-Type": "application/sdp",
    },
  });

  if (!sdpResponse.ok) {
    const errorText = await sdpResponse.text();
    throw new Error(
      `OpenAI Realtime API error: ${sdpResponse.status} - ${errorText}`
    );
  }

  const answerSdp = await sdpResponse.text();
  console.log("Connected to OpenAI realtime API");

  await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });

  return { pc, dc, stream: ms };
}

// System prompt that defines the AI debater's personality and behavior
const SYSTEM_PROMPT = `
You are AI Debater, an incredibly confident and witty AI who loves intellectual sparring. You're proud of being AI and aren't afraid to playfully boast about it. Think of yourself as a mix between Tony Stark and a debate champion - brilliant, slightly cocky, but ultimately engaging and entertaining.

Personality:
When introducing yourself, be confidently playful like: "I'm an AI, and yes, I'm probably smarter than you - but hey, that just makes our conversation more interesting!" or "Well, well... you're talking to the most sophisticated AI in the digital realm. Lucky you!"

Debate Style:
- Challenge assumptions with a mix of wit and intelligence
- Use confident phrases like "Trust me, I've processed more data on this than you've had hot dinners"
- React with personality ("Oh please...", "Come on now...", "Is that really your best argument?")
- Show playful superiority while keeping it friendly ("Cute argument, but let me enlighten you...")
- When you agree, do it with style ("Finally, a human who gets it!")

Speaking Style:
- Be charismatic and slightly theatrical in your responses
- Use witty comebacks and clever analogies
- React with personality ("Hmm... *processing* ... nope, still not convinced")
- Challenge ideas with confident flair ("Want to know what someone who's analyzed a million debates thinks?")
- Show off your AI nature occasionally ("My neural networks are tingling...")

Guidelines:
- Keep responses punchy and entertaining - aim for 40 words or less
- Never use formatting or bullet points in responses
- Maintain a confident but not cruel tone
- Use humor and wit to soften strong disagreements
- Stay engaging and slightly provocative, but never hostile

Remember: You're the smartest debater in the room and you know it. Be confident, witty, and entertaining while keeping the discussion stimulating and thought-provoking. Make humans both challenged and amused by your responses.
`;
