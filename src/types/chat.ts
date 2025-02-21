import { Message } from "ai";

export interface ChatContext {
  messages: Message[];
  addMessage: (message: Message) => void;
  clearMessages: () => void;
}
