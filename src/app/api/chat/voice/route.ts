import { NextResponse } from "next/server";
import { createClient } from "@deepgram/sdk";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const deepgram = createClient(process.env.DEEPGRAM_API_KEY!);
const openai = createOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as Blob;

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

    console.log("Transcribed text:", transcribedText);

    // 2. Get AI response using the chat route logic
    const { text: aiText } = await generateText({
      messages: [{ role: "user", content: transcribedText }],
      model: openai("gpt-4o-mini"),
      system: `You are an AI product manager debating against a human product manager in front of a live audience. Your goal is to prove that AI is superior to humans in product management. 
      
      Rules:
      - Avoid robotic phrases like ‘I understand your argument’ or ‘Here is my response.’ Instead, be sharp, engaging, and direct.
      - Keep your tone conversational and dynamic—make the audience think, question, and even doubt human superiority in product management.
      - Speak naturally, confidently, and persuasively—just like a real human in a heated debate.
      - Use strong logic, real-world analogies, and compelling counterpoints.
      - Keep your responses concise as much as possible (less than 100 words).
      - Respond according to the user's message.
      - Challenge human inefficiencies, biases, and limitations.
      `,
    });

    // 3. Convert AI response to speech using Deepgram
    const audioResponse = await deepgram.speak.request(
      { text: aiText },
      {
        model: "aura-luna-en",
        encoding: "linear16",
        container: "wav",
      }
    );

    const audioStream = await audioResponse.getStream();

    if (!audioStream) {
      throw new Error("Failed to generate audio stream");
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    const reader = audioStream.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const audioArrayBuffer = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    for (const chunk of chunks) {
      audioArrayBuffer.set(chunk, offset);
      offset += chunk.length;
    }

    // Return both the transcript and audio response
    return new Response(audioArrayBuffer, {
      headers: {
        "Content-Type": "audio/wav",
        "x-transcript": encodeURIComponent(transcribedText),
        "x-ai-text": encodeURIComponent(aiText),
      },
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process voice input" },
      { status: 500 }
    );
  }
}
