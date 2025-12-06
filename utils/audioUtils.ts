export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

export async function decodeAudioData(
  base64Data: string,
  audioContext: AudioContext
): Promise<AudioBuffer> {
  const uint8Array = base64ToUint8Array(base64Data);
  const int16Array = new Int16Array(uint8Array.buffer);
  
  // Gemini returns 24kHz audio
  const sampleRate = 24000; 
  const length = int16Array.length;
  
  const audioBuffer = audioContext.createBuffer(1, length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  
  for (let i = 0; i < length; i++) {
    // Convert Int16 to Float32 [-1.0, 1.0]
    channelData[i] = int16Array[i] / 32768.0;
  }
  
  return audioBuffer;
}