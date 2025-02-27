# Human vs AI: The Great Debate

A real-time AI debating application that uses OpenAI's real-time voice-to-voice capabilities. This application enables users to have a natural conversation with an AI debater that responds with personality and wit.

## Features

- Real-time voice-to-voice interaction using OpenAI's Realtime API
- WebRTC-based audio streaming for low-latency communication
- Live transcript display of the conversation
- Interactive audio visualizer for voice input and output
- Audience poll system

## Technology Stack

- **Frontend**: React, Next.js, TailwindCSS
- **Real-time Communication**: WebRTC, OpenAI Realtime API
- **State Management**: React Hooks
- **Styling**: TailwindCSS, Framer Motion for animations

## Getting Started

### Prerequisites

- Node.js 18.x or higher
- OpenAI API key with access to the Realtime API

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/Aaryan6/realtime-ai-debater.git
   cd human-vs-ai-debate
   ```

2. Install dependencies:

   ```bash
   npm install
   # or if you use pnpm
   pnpm install
   ```

3. Create a `.env.local` file in the root directory with the following:

   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

4. Start the development server:

   ```bash
   npm run dev
   # or if you use pnpm
   pnpm dev
   ```

5. Open your browser and navigate to `http://localhost:3000`

## How It Works

1. The application establishes a WebRTC connection with OpenAI's Realtime API when you click the microphone button.
2. Your voice is streamed directly to OpenAI's servers for real-time processing.
3. The AI model processes your speech, generates a response, and speaks back to you through the same WebRTC connection.
4. All transcripts of the conversation are displayed in the live transcript panel.

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key with access to the Realtime API

## Project Structure

- `src/app`: Contains the Next.js pages and API routes
- `src/components`: React components including the debater interface
- `src/lib`: Utility functions for WebRTC and the Realtime API

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
