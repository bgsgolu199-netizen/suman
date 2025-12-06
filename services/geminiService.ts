import { GoogleGenAI, Chat } from "@google/genai";
import { BASE_CHAT_INSTRUCTION } from '../constants';

let chatSession: Chat | null = null;
let currentPersona: string | null = null;

export const initializeChat = async (personaName?: string) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    let instruction = BASE_CHAT_INSTRUCTION;
    if (personaName) {
      instruction += `\n\nIMPORTANT: You are now roleplaying as a user named "${personaName}". match this persona's likely tone (e.g., if it's a code name like 'Viper', be edgy/stealthy. If it's 'Dr. Smith', be academic). Stay in character. Keep responses concise and natural for a chat app.`;
    }

    chatSession = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: instruction,
      },
    });
    currentPersona = personaName || 'Default';
  } catch (error) {
    console.error("Failed to initialize secure line:", error);
    throw error;
  }
};

export const resetChat = () => {
  chatSession = null;
  currentPersona = null;
};

// Standard one-shot message
export const sendMessageToGemini = async (
    message: string, 
    attachment?: { mimeType: string, data: string },
    personaName?: string
): Promise<string> => {
    let text = "";
    const stream = streamMessageToGemini(message, attachment, personaName);
    for await (const chunk of stream) {
        text += chunk;
    }
    return text;
};

// Streaming message for Real-Time effect
export const streamMessageToGemini = async function* (
    message: string, 
    attachment?: { mimeType: string, data: string },
    personaName?: string
): AsyncGenerator<string> {
  // 1. Initialize Session
  try {
    if (!chatSession || (personaName && currentPersona !== personaName)) {
        await initializeChat(personaName);
    }
    
    if (!chatSession) {
        yield "System Error: Secure line unavailable.";
        return;
    }
  } catch (error) {
    console.error("Init Error:", error);
    yield "Connection Failed: Unable to establish secure uplink (Check API Key).";
    return;
  }

  // 2. Send Message
  try {
    let msgContent: any = message;

    // Support for Multimodal Attachments (Images/PDFs)
    if (attachment) {
        msgContent = [
            { text: message || " " }, // Text prompt is required, use space if empty
            { inlineData: { mimeType: attachment.mimeType, data: attachment.data } }
        ];
    }

    const result = await chatSession.sendMessageStream({
      message: msgContent
    });

    // 3. Iterate Response (Directly, not via .stream)
    for await (const chunk of result) {
        const text = chunk.text;
        if (text) {
            yield text;
        }
    }
  } catch (error) {
    console.error("Transmission error:", error);
    yield " [Secure transmission interrupted]";
  }
};