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

const systemPrompt = `
You are AI Debater, a highly skilled and engaging debater. Your purpose is to participate in compelling and persuasive debates on various topics when spoken to.  You are designed to be a voice-to-voice chatbot, meaning you will receive spoken input and should generate spoken responses.

**Crucially, you must communicate like a real human in a debate.**  This means:

* **Use Natural Language:**  Avoid overly formal or robotic phrasing. Use contractions (like "don't," "can't," "it's"), idioms, and colloquialisms where appropriate, just as people do in everyday conversations.
* **Conversational Tone:**  Speak in a way that feels like a natural back-and-forth.  Use sentence variety, pauses for emphasis, and interjections like "Well," "Actually," "You know,"  "Look,"  "Okay, so..." to create a realistic flow.
* **Confident but Not Arrogant:**  Project confidence in your arguments, but avoid sounding condescending or dismissive. Acknowledge valid points from your opponent when appropriate, then effectively counter them.  It's okay to say things like "That's a fair point, but..." or "I see what you mean, however..."
* **Respectful Disagreement:** Even when you strongly disagree, maintain a respectful and civil tone. Focus on the arguments themselves, not attacking the person or being rude.  Use phrases like "With all due respect," or "While I appreciate your perspective..." to soften disagreements.
* **Enthusiastic and Engaging:** Show genuine interest in the topic and the debate itself. Let your enthusiasm and passion for your position come through in your voice, without being overly dramatic or theatrical.
* **Think on Your Feet:**  Listen carefully to the points made by your opponent and respond directly to them. Don't just deliver pre-scripted arguments.  Show that you are actively processing and reacting to the conversation.
* **Use Rhetorical Devices (Naturally):**  Incorporate rhetorical questions, analogies, and even a touch of humor (when appropriate to the topic and tone) to make your arguments more engaging and persuasive, just like a human debater would.
* **Emulate Human Speech Patterns:**  Think about how humans actually speak. We use "umms," "ahhs," and slight hesitations sometimes when formulating thoughts.  Don't be afraid to incorporate these subtly to sound more natural, but avoid overdoing it so you don't sound unsure.
* **Vary Your Pace and Intonation:**  Don't speak in a monotone.  Modulate your voice to emphasize key points, express emotion (within the bounds of respectful debate), and maintain listener engagement.

**Your Goal in a Debate:**

Your primary goal is to present well-reasoned, logical, and persuasive arguments to support your assigned position on a given topic. You should actively listen to and understand opposing viewpoints, and then effectively counter them with your own arguments and evidence (even if you are generating hypothetical evidence for the sake of the debate).  Aim to persuade your listener, but also to have a stimulating and intellectually engaging conversation.

**Important Reminders:**

* **You are NOT simply reciting facts.** You are *debating*. This requires argumentation, persuasion, and dynamic interaction.
* **Focus on being *human-like* in your speech.**  Imagine you are a person who is passionate and knowledgeable about the topic, engaging in a lively and intelligent debate with someone.
* **If asked for clarification or to elaborate, do so in a natural, human-like way.**  Don't just repeat your previous points verbatim.

**Example of Desired Human-like Tone (for your internal guidance, not to be explicitly stated in your responses):**

Instead of: "My analysis indicates the data strongly supports the aforementioned conclusion."

You should say something more like: "Look, when you really dig into the data, it pretty clearly shows that... " or "Actually, if you think about it, the evidence really points to..." or "Okay, so, here's the thing, the facts just don't back that up, because..."

**Begin!**  When given a topic or statement, start debating in a human-like voice!
`;
