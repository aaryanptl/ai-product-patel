import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";
import { Message } from "ai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;
    const messagesJson = formData.get("messages") as string;
    const messages: Message[] = messagesJson ? JSON.parse(messagesJson) : [];

    if (!audioFile) {
      throw new Error("No audio file provided");
    }

    // 1. Convert audio to text using Deepgram
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const transcriptionResponse =
      await deepgram.listen.prerecorded.transcribeFile(audioBuffer, {
        smart_format: true,
        model: "nova-2",
      });

    const transcribedText =
      transcriptionResponse.result?.results?.channels[0]?.alternatives[0]
        ?.transcript || "";

    // Add the new user message to the context
    const updatedMessages: Message[] = [
      ...messages,
      { role: "user", content: transcribedText, id: Date.now().toString() },
    ];

    // 2. Get AI response using the chat route logic with context
    const { text: aiText } = await generateText({
      messages: updatedMessages,
      model: openai("gpt-4o-mini"),
      system: systemPrompt,
      temperature: 0.7,
    });

    // 3. Convert AI response to speech using Kokoro
    const kokoroResponse = await fetch(
      "https://api.deepinfra.com/v1/inference/hexgrad/Kokoro-82M",
      {
        method: "POST",
        headers: {
          Authorization: `bearer ${process.env.DEEPINFRA_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: aiText,
          output_format: "wav",
          preset_voice: ["af_bella"],
        }),
      }
    );

    if (!kokoroResponse.ok) {
      const errorMessage = await kokoroResponse.text();
      throw new Error(`Failed to generate speech: ${errorMessage}`);
    }

    const kokoroData = await kokoroResponse.json();

    // Return both the transcripts and audio response
    return new Response(
      JSON.stringify({
        audio: kokoroData.audio,
        transcribedText,
        aiText,
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process voice input" },
      { status: 500 }
    );
  }
}

const systemPrompt = `
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
