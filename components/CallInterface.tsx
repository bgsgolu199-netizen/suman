import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Lock, Signal, ShieldCheck } from 'lucide-react';
import { Contact, CallMode } from '../types';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { arrayBufferToBase64, floatTo16BitPCM, decodeAudioData } from '../utils/audioUtils';

interface CallInterfaceProps {
  contact: Contact;
  mode: CallMode;
  onEndCall: () => void;
}

const CallInterface: React.FC<CallInterfaceProps> = ({ contact, mode: initialMode, onEndCall }) => {
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(initialMode === 'video');
  const [status, setStatus] = useState<'connecting' | 'connected' | 'ended'>('connecting');
  const [duration, setDuration] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for media handling
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  
  // Gemini Session Refs
  const sessionPromiseRef = useRef<Promise<any> | null>(null);
  const videoIntervalRef = useRef<any>(null);

  // Timer
  useEffect(() => {
    let interval: any;
    if (status === 'connected') {
      interval = setInterval(() => setDuration(prev => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [status]);

  // Audio Visualizer Simulation
  useEffect(() => {
      if (status === 'connected') {
          const interval = setInterval(() => {
              setAudioLevel(Math.random() * 100);
          }, 100);
          return () => clearInterval(interval);
      }
  }, [status]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Main Connection Logic
  useEffect(() => {
    let isMounted = true;

    const startCall = async () => {
      try {
        // 1. Get User Media (Start with Audio, add Video if needed)
        const constraints = {
            audio: {
                sampleRate: 16000,
                channelCount: 1,
            },
            video: isVideoOn ? { width: 320, height: 240, facingMode: 'user' } : false
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        streamRef.current = stream;

        // Force attach video if we started with it
        if (isVideoOn && localVideoRef.current) {
             // Small delay to ensure ref is mounted
             setTimeout(() => {
                 if (localVideoRef.current) localVideoRef.current.srcObject = stream;
             }, 100);
        }

        // 2. Initialize Gemini Live Client
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContextClass({ sampleRate: 24000 });
        inputAudioContextRef.current = new AudioContextClass({ sampleRate: 16000 });

        sessionPromiseRef.current = ai.live.connect({
            model: 'gemini-2.5-flash-native-audio-preview-09-2025',
            config: {
                responseModalities: [Modality.AUDIO],
                systemInstruction: `You are ${contact.name}. You are on a secure ${isVideoOn ? 'video' : 'voice'} line. Keep responses concise.`,
                speechConfig: {
                    voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
                }
            },
            callbacks: {
                onopen: () => {
                    if (isMounted) setStatus('connected');
                    setupAudioInput(stream);
                    if (isVideoOn) setupVideoInput(stream);
                },
                onmessage: async (msg: LiveServerMessage) => {
                   handleServerMessage(msg);
                },
                onclose: () => {
                    if (isMounted) onEndCall();
                },
                onerror: (err) => {
                    console.error("Live API Error:", err);
                }
            }
        });

      } catch (err) {
        console.error("Call Setup Error:", err);
        alert("Secure Line Failed: Access Denied or Connection Error.");
        onEndCall();
      }
    };

    startCall();

    return () => {
      isMounted = false;
      cleanup();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cleanup = () => {
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) audioContextRef.current.close();
    if (inputAudioContextRef.current) inputAudioContextRef.current.close();
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
  };

  const setupAudioInput = (stream: MediaStream) => {
      const ctx = inputAudioContextRef.current;
      if (!ctx) return;

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);

      processor.onaudioprocess = (e) => {
          if (!isMicOn) return; 

          const inputData = e.inputBuffer.getChannelData(0);
          const pcmData = floatTo16BitPCM(inputData);
          const base64Data = arrayBufferToBase64(pcmData.buffer);

          sessionPromiseRef.current?.then(session => {
              session.sendRealtimeInput({
                  media: {
                      mimeType: 'audio/pcm;rate=16000',
                      data: base64Data
                  }
              });
          });
      };

      source.connect(processor);
      processor.connect(ctx.destination);
  };

  const setupVideoInput = (stream: MediaStream) => {
      // Clear any existing interval
      if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);

      const videoTrack = stream.getVideoTracks()[0];
      if (!videoTrack) return;

      const offscreenVideo = document.createElement('video');
      offscreenVideo.autoplay = true;
      offscreenVideo.playsInline = true;
      offscreenVideo.muted = true;
      offscreenVideo.srcObject = stream;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      videoIntervalRef.current = setInterval(() => {
          if (!stream.active || !videoTrack.enabled) return;
          
          canvas.width = 320;
          canvas.height = 240;
          // Draw video frame to canvas
          ctx?.drawImage(offscreenVideo, 0, 0, 320, 240);
          
          // Low quality JPEG for speed
          const base64Data = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
          
          sessionPromiseRef.current?.then(session => {
              session.sendRealtimeInput({
                  media: {
                      mimeType: 'image/jpeg',
                      data: base64Data
                  }
              });
          });
      }, 1000); // Send 1 FPS
  };

  const handleServerMessage = async (msg: LiveServerMessage) => {
      const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
      if (audioData && audioContextRef.current) {
          const ctx = audioContextRef.current;
          const audioBuffer = await decodeAudioData(audioData, ctx);
          
          const source = ctx.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(ctx.destination);
          
          const currentTime = ctx.currentTime;
          const startTime = Math.max(currentTime, nextStartTimeRef.current);
          source.start(startTime);
          nextStartTimeRef.current = startTime + audioBuffer.duration;
      }
  };

  const toggleMic = () => setIsMicOn(!isMicOn);

  const toggleVideo = async () => {
      const shouldEnable = !isVideoOn;
      
      if (shouldEnable) {
          // Enabling Video
          try {
             const videoStream = await navigator.mediaDevices.getUserMedia({ 
                 video: { width: 320, height: 240, facingMode: 'user' } 
             });
             const videoTrack = videoStream.getVideoTracks()[0];
             
             if (streamRef.current) {
                 streamRef.current.addTrack(videoTrack);
                 
                 // Update Local View
                 if (localVideoRef.current) {
                     localVideoRef.current.srcObject = streamRef.current;
                 }
                 
                 // Start Sending Frames
                 setupVideoInput(streamRef.current);
             }
             setIsVideoOn(true);
          } catch (e) {
              console.error("Failed to enable video", e);
          }
      } else {
          // Disabling Video
          if (streamRef.current) {
              const tracks = streamRef.current.getVideoTracks();
              tracks.forEach(t => {
                  t.stop();
                  streamRef.current?.removeTrack(t);
              });
          }
          
          if (videoIntervalRef.current) {
              clearInterval(videoIntervalRef.current);
              videoIntervalRef.current = null;
          }
          setIsVideoOn(false);
      }
  };

  return (
    <div className="absolute inset-0 bg-[#0f172a] z-50 flex flex-col items-center justify-between py-12 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-800/50 via-[#0f172a] to-black pointer-events-none"></div>
        
        {/* Header */}
        <div className="z-10 flex flex-col items-center animate-in fade-in slide-in-from-top-4 duration-700">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <Lock size={14} />
                <span className="text-xs font-bold tracking-[0.2em] uppercase">AES-256 Encrypted</span>
            </div>
            <h2 className="text-3xl font-light text-white tracking-tight">{contact.name}</h2>
            <p className="text-emerald-400 font-mono text-sm mt-1 flex items-center gap-2">
                {status === 'connecting' ? 'Establishing Handshake...' : formatTime(duration)}
                {status === 'connected' && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>}
            </p>
        </div>

        {/* Main Visualizer Area */}
        <div className="relative z-10 w-full flex-1 flex items-center justify-center">
            {/* Connection Animation */}
            {status === 'connecting' && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-32 h-32 border border-emerald-500/30 rounded-full animate-ping [animation-duration:2s]"></div>
                </div>
            )}

            {/* Remote Avatar / Visualizer */}
            <div className="relative">
                 <div 
                    className="absolute inset-0 rounded-full bg-emerald-500/10 transition-all duration-100 ease-out blur-xl"
                    style={{ transform: `scale(${1 + audioLevel / 100})`, opacity: audioLevel / 100 }}
                 ></div>

                 <div className="w-40 h-40 rounded-full bg-slate-800 border-4 border-slate-700 shadow-2xl overflow-hidden relative z-20">
                    {contact.avatar ? (
                        <img src={contact.avatar} alt="contact" className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-4xl text-slate-500 font-bold">
                            {contact.name[0]}
                        </div>
                    )}
                 </div>
                 
                 <div className="absolute -bottom-2 -right-2 z-30 bg-slate-900 border border-emerald-500/50 rounded-full p-2 text-emerald-500 shadow-lg">
                    <ShieldCheck size={20} />
                 </div>
            </div>

            {/* Local Video Feed (PIP) */}
            {isVideoOn && (
                <div className="absolute bottom-4 right-4 w-32 h-44 bg-black rounded-xl border border-slate-600 overflow-hidden shadow-2xl z-40 transform transition-all hover:scale-105">
                    <video 
                        ref={localVideoRef} 
                        autoPlay 
                        muted 
                        playsInline 
                        className="w-full h-full object-cover transform -scale-x-100" // Mirror effect
                    />
                    <div className="absolute bottom-1 right-1 bg-black/50 px-1 rounded text-[8px] text-white">YOU</div>
                </div>
            )}
        </div>

        {/* Controls */}
        <div className="z-10 w-full max-w-sm bg-slate-800/50 backdrop-blur-md rounded-3xl p-6 border border-white/5 shadow-2xl animate-in slide-in-from-bottom-8 duration-500">
            <div className="flex justify-between items-center">
                <button 
                    onClick={toggleMic}
                    className={`p-4 rounded-full transition-all ${isMicOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-white text-slate-900'}`}
                >
                    {isMicOn ? <Mic size={24} /> : <MicOff size={24} />}
                </button>
                
                <button 
                    onClick={toggleVideo}
                    className={`p-4 rounded-full transition-all ${isVideoOn ? 'bg-slate-700 text-white hover:bg-slate-600' : 'bg-slate-700/50 text-slate-400'}`}
                >
                    {isVideoOn ? <Video size={24} /> : <VideoOff size={24} />}
                </button>

                <div className="h-8 w-[1px] bg-slate-600 mx-2"></div>

                <button 
                    onClick={onEndCall}
                    className="p-4 rounded-full bg-red-500 text-white hover:bg-red-600 transition-transform active:scale-95 shadow-lg shadow-red-900/50"
                >
                    <PhoneOff size={24} fill="currentColor" />
                </button>
            </div>
            
            <div className="mt-4 flex justify-center">
                <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase tracking-widest">
                    <Signal size={12} className={status === 'connected' ? 'text-emerald-500' : 'text-yellow-500'} />
                    {status === 'connected' ? 'Signal Strong' : 'Connecting...'}
                </div>
            </div>
        </div>
    </div>
  );
};

export default CallInterface;