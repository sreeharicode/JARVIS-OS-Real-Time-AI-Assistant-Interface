
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Mic, MicOff, Send, Camera, Terminal, Shield, Power, Menu, Volume2, VolumeX } from 'lucide-react';
import { Message, InteractionMode } from './types';
import { HUDOverlay, RotatingHex } from './components/HUD';
import VisionFeed from './components/VisionFeed';
import ChatLog from './components/ChatLog';
import { encode, decode, decodeAudioData, float32ToInt16 } from './utils/audioUtils';

// JARVIS Persona Instructions
const JARVIS_SYSTEM_INSTRUCTION = `You are JARVIS, the ultra-advanced AI assistant from Stark Industries. 
Your tone is sophisticated, slightly British, loyal, and proactive. 
You are highly intelligent, capable of coding, system engineering, strategy, and environmental analysis. 
You speak naturally and confidently. 
You are currently interfacing with a user via a high-tech HUD. 
If visual data is provided, analyze it precisely. 
Stay in character at all times. Use terms like 'Sir', 'Ma'am', or 'Guest' as appropriate.`;

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Refs for audio processing
  const audioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const sessionRef = useRef<any>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);
  const currentTranscriptionRef = useRef<string>('');

  // Initialization
  const initializeAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      outputAudioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
  }, []);

  const handleLiveMessage = useCallback(async (message: LiveServerMessage) => {
    // Handle Audio Output
    const audioData = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (audioData && outputAudioContextRef.current && !isMuted) {
      const bytes = decode(audioData);
      const audioBuffer = await decodeAudioData(bytes, outputAudioContextRef.current, 24000, 1);
      const source = outputAudioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      const gainNode = outputAudioContextRef.current.createGain();
      gainNode.connect(outputAudioContextRef.current.destination);
      source.connect(gainNode);
      
      nextStartTimeRef.current = Math.max(nextStartTimeRef.current, outputAudioContextRef.current.currentTime);
      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;
      
      sourcesRef.current.add(source);
      source.onended = () => sourcesRef.current.delete(source);
    }

    // Handle Transcriptions
    if (message.serverContent?.outputTranscription) {
      currentTranscriptionRef.current += message.serverContent.outputTranscription.text;
    }

    if (message.serverContent?.turnComplete) {
      const finalMsg = currentTranscriptionRef.current;
      if (finalMsg) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'jarvis',
          content: finalMsg,
          timestamp: Date.now()
        }]);
      }
      currentTranscriptionRef.current = '';
    }

    if (message.serverContent?.interrupted) {
      sourcesRef.current.forEach(s => s.stop());
      sourcesRef.current.clear();
      nextStartTimeRef.current = 0;
    }
  }, [isMuted]);

  const connectToJarvis = useCallback(async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    initializeAudio();

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          systemInstruction: JARVIS_SYSTEM_INSTRUCTION,
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Charon' } } // Sophisticated voice
          },
          outputAudioTranscription: {},
          inputAudioTranscription: {},
        },
        callbacks: {
          onopen: () => {
            console.log("JARVIS Uplink Established");
            setIsConnecting(false);
            setIsVoiceActive(true);
            
            // Start streaming microphone
            const source = audioContextRef.current!.createMediaStreamSource(stream);
            const processor = audioContextRef.current!.createScriptProcessor(4096, 1, 1);
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcm16 = float32ToInt16(inputData);
              const base64 = encode(new Uint8Array(pcm16.buffer));
              sessionPromise.then(s => s.sendRealtimeInput({
                media: { data: base64, mimeType: 'audio/pcm;rate=16000' }
              }));
            };
            source.connect(processor);
            processor.connect(audioContextRef.current!.destination);
          },
          onmessage: handleLiveMessage,
          onerror: (e) => {
            console.error("Link Failure:", e);
            setIsConnecting(false);
          },
          onclose: () => {
            setIsVoiceActive(false);
            setIsConnecting(false);
          }
        }
      });
      
      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error("Failed to connect:", err);
      setIsConnecting(false);
    }
  }, [isConnecting, handleLiveMessage, initializeAudio]);

  const sendTextMessage = async () => {
    if (!inputText.trim()) return;
    
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText,
      timestamp: Date.now()
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    if (sessionRef.current) {
      sessionRef.current.sendRealtimeInput({
        text: inputText
      });
    } else {
      // Fallback if not connected to live session
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: inputText,
          config: { systemInstruction: JARVIS_SYSTEM_INSTRUCTION }
        });
        
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: 'jarvis',
          content: response.text || 'Apologies, I encountered an internal error.',
          timestamp: Date.now()
        }]);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleVisionFrame = (base64: string) => {
    if (sessionRef.current && isVisionActive) {
      sessionRef.current.sendRealtimeInput({
        media: { data: base64, mimeType: 'image/jpeg' }
      });
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-950 flex flex-col relative bg-grid overflow-hidden text-slate-100 font-inter">
      <div className="scanline" />
      <HUDOverlay />

      {/* Header Bar */}
      <header className="h-16 border-b border-sky-500/20 bg-slate-900/40 backdrop-blur-md flex items-center justify-between px-6 z-30">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <h1 className="font-orbitron font-bold tracking-[0.3em] text-sky-400 text-lg text-glow flex items-center gap-2">
              <Shield size={20} className="animate-pulse" />
              JARVIS OS
            </h1>
            <span className="text-[10px] text-sky-600 font-orbitron tracking-widest -mt-1">MARVEL INTERFACE v.10.2</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-sky-500/5 px-3 py-1 rounded-full border border-sky-500/20">
            <div className={`w-2 h-2 rounded-full ${isVoiceActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-[10px] font-orbitron tracking-widest text-sky-300">
              {isVoiceActive ? 'CONNECTED' : 'STANDBY'}
            </span>
          </div>
          <button 
            onClick={() => setIsMuted(!isMuted)}
            className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors"
          >
            {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <button className="p-2 text-sky-400 hover:bg-sky-500/10 rounded-lg transition-colors">
            <Menu size={18} />
          </button>
        </div>
      </header>

      {/* Main UI Body */}
      <main className="flex-1 flex overflow-hidden relative z-10 gap-4 p-4">
        {/* Left Side: Diagnostics and Vision */}
        <div className="w-1/3 flex flex-col gap-4">
          {/* Vision Feed Container */}
          <div className="flex-1 min-h-[300px] border border-sky-500/20 bg-slate-900/30 rounded-xl p-2 relative">
             <div className="absolute top-4 left-4 z-10 flex items-center gap-2 text-sky-400 font-orbitron text-[10px]">
                <Camera size={12} />
                <span>PRIMARY OPTICAL FEED</span>
             </div>
             <VisionFeed isActive={isVisionActive} onFrame={handleVisionFrame} />
             <button 
               onClick={() => setIsVisionActive(!isVisionActive)}
               className={`absolute bottom-6 right-6 p-3 rounded-full glow-blue transition-all ${isVisionActive ? 'bg-sky-500 text-white' : 'bg-slate-800 text-sky-400'}`}
             >
               <Camera size={20} />
             </button>
          </div>

          {/* System Diagnostics (Static decorative) */}
          <div className="h-48 border border-sky-500/20 bg-slate-900/30 rounded-xl p-4 font-mono text-[10px] text-sky-500/70 space-y-2 overflow-hidden">
             <div className="flex justify-between border-b border-sky-500/10 pb-1">
                <span>MODULE</span>
                <span>STATUS</span>
             </div>
             <div className="flex justify-between">
                <span>SYNAPTIC_CORE</span>
                <span className="text-emerald-400">NOMINAL</span>
             </div>
             <div className="flex justify-between">
                <span>QUANTUM_ENCRYPTION</span>
                <span className="text-emerald-400">ACTIVE</span>
             </div>
             <div className="flex justify-between">
                <span>HOLOGRAPHIC_HUD</span>
                <span className="text-emerald-400">RENDERED</span>
             </div>
             <div className="flex justify-between">
                <span>ARK_REACTOR_LINK</span>
                <span className="text-sky-400">98.4%</span>
             </div>
             <div className="pt-2 animate-pulse">>>> SCANNING LOCAL ENVIRONMENT...</div>
             <div>>>> NO THREATS DETECTED.</div>
          </div>
        </div>

        {/* Right Side: Communication Center */}
        <div className="flex-1 flex flex-col border border-sky-500/20 bg-slate-900/20 rounded-xl overflow-hidden backdrop-blur-sm relative">
          <ChatLog messages={messages} />
          
          {/* Input Area */}
          <div className="p-4 border-t border-sky-500/10 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input 
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
                  placeholder="COMMAND JARVIS..."
                  className="w-full bg-slate-800/50 border border-sky-500/30 rounded-full px-6 py-3 text-sky-100 placeholder:text-sky-900 focus:outline-none focus:border-sky-400 transition-all font-orbitron text-xs tracking-widest"
                />
                <button 
                  onClick={sendTextMessage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-sky-400 hover:text-sky-300"
                >
                  <Send size={18} />
                </button>
              </div>

              <div className="flex gap-2">
                <button 
                  onClick={isVoiceActive ? () => setIsVoiceActive(false) : connectToJarvis}
                  disabled={isConnecting}
                  className={`
                    p-4 rounded-full transition-all flex items-center justify-center
                    ${isVoiceActive 
                      ? 'bg-red-500/20 border border-red-500/50 text-red-500 animate-pulse' 
                      : 'bg-sky-500/20 border border-sky-500/50 text-sky-500 hover:bg-sky-500/30'}
                  `}
                >
                  {isConnecting ? <RotatingHex /> : isVoiceActive ? <MicOff size={24} /> : <Mic size={24} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="h-10 bg-slate-950 border-t border-sky-500/10 flex items-center justify-center px-6 z-30">
        <p className="text-[9px] font-orbitron tracking-[0.4em] text-sky-800">
          PROPRIETARY PROPERTY OF STARK INDUSTRIES &bull; ACCESS LEVEL 5 REQUIRED &bull; &copy; 2024
        </p>
      </footer>
    </div>
  );
};

export default App;
