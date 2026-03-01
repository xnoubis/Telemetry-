import React, { useState, useEffect, useRef } from 'react';
import { Activity, Radio, Cpu, Eye, MousePointer2, Database, Zap, ShieldAlert, Waves, Mic, Minus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { AvatarState, AnchorSnapshot, GestureEvent, ServerPhaseEvent, SigilSynthesis, AvatarStateEnum } from './types';

const generateId = () => Math.random().toString(36).substring(2, 9);

const Tooltip = ({ children, content }: { children: React.ReactNode, content: string }) => (
  <div className="group relative flex items-center">
    {children}
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-max max-w-xs bg-[#222] text-[#ccc] text-[10px] px-2 py-1 rounded border border-[#444] z-50 shadow-lg font-sans normal-case tracking-normal">
      {content}
      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[#444]"></div>
    </div>
  </div>
);

export default function App() {
  const [avatarState, setAvatarState] = useState<AvatarState>({
    state: 'line',
    trigger: 'mutation_observer',
    timestamp: new Date().toISOString()
  });
  
  const [snapshots, setSnapshots] = useState<(AnchorSnapshot & { id: string, timestamp: string })[]>([]);
  const [gestures, setGestures] = useState<GestureEvent[]>([]);
  const [serverPhases, setServerPhases] = useState<ServerPhaseEvent[]>([]);
  const [sigil, setSigil] = useState<SigilSynthesis | null>(null);
  
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<number | null>(null);

  const [insight, setInsight] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeTelemetry = async () => {
    setIsAnalyzing(true);
    setInsight(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Analyze the following telemetry data from the Morphic Tutor system.
      The system uses sub-Nyquist change detection.
      Provide a brief, highly technical assessment of the user's cognitive engagement and system performance.
      
      Snapshots: ${JSON.stringify(snapshots.slice(0, 5))}
      Gestures: ${JSON.stringify(gestures.slice(0, 10))}
      Server Phases: ${JSON.stringify(serverPhases)}
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }
        }
      });
      
      setInsight(response.text || "No insights generated.");
    } catch (error) {
      console.error("Analysis failed:", error);
      setInsight("Analysis failed. Please check API key and network.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const startSimulation = () => {
    setIsSimulating(true);
    
    // Initial server phase
    setServerPhases(prev => [{
      phase: 'warm_in',
      start_time: new Date().toISOString(),
      status: 'success'
    }, ...prev].slice(0, 10));

    simulationIntervalRef.current = window.setInterval(() => {
      const now = new Date().toISOString();
      const rand = Math.random();

      // Simulate Avatar State changes
      if (rand > 0.8) {
        const states: AvatarStateEnum[] = ['spiral', 'mouth', 'line'];
        const newState = states[Math.floor(Math.random() * states.length)];
        setAvatarState({
          state: newState,
          trigger: newState === 'spiral' ? 'fastapi_retrieval' : newState === 'mouth' ? 'web_tts' : 'pointer_event',
          timestamp: now
        });
      }

      // Simulate Gestures
      if (rand > 0.6) {
        const gestureTypes: GestureEvent['gesture'][] = ['tap', 'double_tap', 'triple_tap', 'hold', 'hold_drag', 'wheel_scroll'];
        const newGesture: GestureEvent = {
          gesture: gestureTypes[Math.floor(Math.random() * gestureTypes.length)],
          timestamp: now,
          target: `div.content-block-${Math.floor(Math.random() * 5)}`,
          metadata: { x: Math.floor(Math.random() * 100), y: Math.floor(Math.random() * 100) }
        };
        setGestures(prev => [newGesture, ...prev].slice(0, 20));
      }

      // Simulate Anchor Snapshots
      if (rand > 0.9) {
        const newSnapshot: AnchorSnapshot & { id: string, timestamp: string } = {
          id: generateId(),
          timestamp: now,
          text_selection: "Sub-Nyquist Change Detection",
          css_path: "body > main > article > p:nth-child(3)",
          offsets: [120, 148],
          page_url: "https://morphic.tutor/lesson/42",
          visual_focus_box: {
            x: 45.5,
            y: 120.2,
            width: 300.0,
            height: 40.0
          }
        };
        setSnapshots(prev => [newSnapshot, ...prev].slice(0, 10));
      }

      // Simulate Server Phases
      if (rand > 0.95) {
        const phases: ServerPhaseEvent['phase'][] = ['dive', 'reflect', 'failover'];
        const statuses: ServerPhaseEvent['status'][] = ['success', 'failover', 'error'];
        const newPhase: ServerPhaseEvent = {
          phase: phases[Math.floor(Math.random() * phases.length)],
          start_time: now,
          duration_seconds: Math.floor(Math.random() * 120),
          status: statuses[Math.floor(Math.random() * statuses.length)]
        };
        setServerPhases(prev => [newPhase, ...prev].slice(0, 5));
      }

    }, 2000);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
    }
    
    // Generate Sigil on stop
    setSigil({
      gesture_history: gestures.slice(0, 5),
      semantic_seed: "sub-nyquist-detection-0x" + Math.random().toString(16).slice(2, 8),
      difficulty_level: 2,
      canvas_signature: "svg-hash-" + generateId()
    });
  };

  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e5e5e5] font-mono p-4 md:p-8 selection:bg-[#00FF00] selection:text-black">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 border-b border-[#333]">
          <div>
            <h1 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-3">
              <Tooltip content="System Telemetry & Status">
                <Activity className="w-6 h-6 text-[#00FF00]" />
              </Tooltip>
              Morphic Tutor <span className="text-[#666] font-normal">/ Telemetry</span>
            </h1>
            <p className="text-sm text-[#888] mt-1">Sub-Nyquist Change Detection & Epistemic Grounding</p>
          </div>
          <div className="mt-4 md:mt-0 flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest">
              <Tooltip content="Real-time data processing and throughput">
                <Zap className={`w-4 h-4 ${isSimulating ? 'text-[#00FF00]' : 'text-[#444]'}`} />
              </Tooltip>
              <span className={`w-2 h-2 rounded-full ${isSimulating ? 'bg-[#00FF00] animate-pulse' : 'bg-[#444]'}`}></span>
              {isSimulating ? 'Live Sync' : 'Offline'}
            </div>
            <button
              onClick={analyzeTelemetry}
              disabled={isAnalyzing || (snapshots.length === 0 && gestures.length === 0)}
              className="px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors border-[#00BFFF] text-[#00BFFF] hover:bg-[#00BFFF]/10 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAnalyzing ? 'Analyzing...' : 'Analyze Telemetry'}
            </button>
            <button
              onClick={isSimulating ? stopSimulation : startSimulation}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-wider border transition-colors ${
                isSimulating 
                  ? 'border-[#ff4444] text-[#ff4444] hover:bg-[#ff4444]/10' 
                  : 'border-[#00FF00] text-[#00FF00] hover:bg-[#00FF00]/10'
              }`}
            >
              {isSimulating ? 'Halt Telemetry' : 'Initialize Anchor'}
            </button>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Avatar & Server */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Avatar State Widget */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00FF00] to-transparent opacity-20"></div>
              <h2 className="text-xs uppercase tracking-widest text-[#888] mb-4 flex items-center gap-2">
                <Tooltip content="Real-time state of the Morphic Avatar">
                  <Radio className="w-4 h-4" />
                </Tooltip>
                 Avatar Orb State
              </h2>
              
              <div className="flex items-center justify-center py-8">
                <AnimatePresence mode="wait">
                  {avatarState.state === 'spiral' && (
                    <motion.div
                      key="spiral"
                      initial={{ opacity: 0, scale: 0.8, rotate: -90 }}
                      animate={{ opacity: 1, scale: 1, rotate: 0 }}
                      exit={{ opacity: 0, scale: 0.8, rotate: 90 }}
                      className="w-24 h-24 rounded-full border-2 border-dashed border-[#00FF00] flex items-center justify-center animate-spin-slow"
                    >
                      <Tooltip content="Avatar state: Spiral (Retrieval)">
                        <Waves className="w-8 h-8 text-[#00FF00]" />
                      </Tooltip>
                    </motion.div>
                  )}
                  {avatarState.state === 'mouth' && (
                    <motion.div
                      key="mouth"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="w-24 h-24 rounded-full border-2 border-[#00FF00] flex items-center justify-center shadow-[0_0_20px_rgba(0,255,0,0.2)]"
                    >
                      <Tooltip content="Avatar state: Mouth (Audio)">
                        <Mic className="w-8 h-8 text-[#00FF00] animate-pulse" />
                      </Tooltip>
                    </motion.div>
                  )}
                  {avatarState.state === 'line' && (
                    <motion.div
                      key="line"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-24 h-24 flex items-center justify-center"
                    >
                      <Tooltip content="Avatar state: Line (Idle)">
                        <Minus className="w-16 h-16 text-[#666]" />
                      </Tooltip>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4 text-xs">
                <div>
                  <div className="text-[#555] uppercase">Current State</div>
                  <div className="text-[#00FF00] font-bold">{avatarState.state}</div>
                </div>
                <div>
                  <div className="text-[#555] uppercase">Trigger</div>
                  <div className="text-[#ccc] truncate" title={avatarState.trigger}>{avatarState.trigger}</div>
                </div>
              </div>
            </div>

            {/* Server Phase Widget */}
            <div className="bg-[#111] border border-[#222] rounded-lg p-5">
              <h2 className="text-xs uppercase tracking-widest text-[#888] mb-4 flex items-center gap-2">
                <Tooltip content="Backend lesson pod phases and failover status">
                  <Database className="w-4 h-4" />
                </Tooltip>
                 Server Orchestration
              </h2>
              <div className="space-y-3">
                {serverPhases.length === 0 ? (
                  <div className="text-xs text-[#555] italic">Awaiting phase transition...</div>
                ) : (
                  serverPhases.map((phase, i) => (
                    <div key={i} className={`p-3 border-l-2 text-xs ${
                      phase.status === 'success' ? 'border-[#00FF00] bg-[#00FF00]/5' : 
                      phase.status === 'failover' ? 'border-[#FFA500] bg-[#FFA500]/5' : 
                      'border-[#FF4444] bg-[#FF4444]/5'
                    }`}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold uppercase">{phase.phase}</span>
                        <span className="text-[#666]">{new Date(phase.start_time).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-[#888]">
                        <span>Status: <span className={
                          phase.status === 'success' ? 'text-[#00FF00]' : 
                          phase.status === 'failover' ? 'text-[#FFA500]' : 'text-[#FF4444]'
                        }>{phase.status}</span></span>
                        {phase.duration_seconds && <span>{phase.duration_seconds}s</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sigil Synthesis */}
            {sigil && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-[#111] border border-[#00FF00]/30 rounded-lg p-5"
              >
                <h2 className="text-xs uppercase tracking-widest text-[#00FF00] mb-4 flex items-center gap-2">
                  <Tooltip content="Cryptographic hash of session history and semantic seed">
                    <ShieldAlert className="w-4 h-4" />
                  </Tooltip>
                   Sigil Synthesis
                </h2>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-[#222] pb-2">
                    <span className="text-[#666]">Semantic Seed</span>
                    <span className="text-[#ccc] truncate max-w-[150px]">{sigil.semantic_seed}</span>
                  </div>
                  <div className="flex justify-between border-b border-[#222] pb-2">
                    <span className="text-[#666]">Difficulty</span>
                    <span className="text-[#ccc]">Level {sigil.difficulty_level}</span>
                  </div>
                  <div className="flex justify-between pb-2">
                    <span className="text-[#666]">Signature</span>
                    <span className="text-[#ccc] truncate max-w-[150px]">{sigil.canvas_signature}</span>
                  </div>
                </div>
              </motion.div>
            )}

          </div>

          {/* Middle Column: Anchor Snapshots */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-[#111] border border-[#222] rounded-lg p-5 h-full min-h-[600px]">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xs uppercase tracking-widest text-[#888] flex items-center gap-2">
                  <Tooltip content="Sub-Nyquist captured DOM state and visual focus">
                    <Eye className="w-4 h-4" />
                  </Tooltip>
                   Anchor Snapshots
                </h2>
                <span className="text-[10px] text-[#00FF00] bg-[#00FF00]/10 px-2 py-1 rounded">EDSD ACTIVE</span>
              </div>
              
              <div className="space-y-4">
                <AnimatePresence>
                  {snapshots.length === 0 ? (
                    <div className="text-xs text-[#555] italic text-center py-10">Waiting for sub-nyquist detection...</div>
                  ) : (
                    snapshots.map((snap) => (
                      <motion.div
                        key={snap.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="border border-[#333] bg-[#1a1a1a] p-4 text-xs relative group"
                      >
                        <div className="absolute top-0 left-0 w-1 h-full bg-[#00FF00] opacity-50 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="flex justify-between items-start mb-3">
                          <div className="text-[#888]">{new Date(snap.timestamp).toLocaleTimeString()}</div>
                          <div className="text-[#444] font-mono">{snap.id}</div>
                        </div>

                        {snap.error ? (
                          <div className="text-[#FF4444] bg-[#FF4444]/10 p-2 rounded border border-[#FF4444]/20">
                            {snap.error}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            <div>
                              <div className="text-[#555] uppercase mb-1 text-[10px]">Text Selection</div>
                              <div className="text-[#e5e5e5] bg-[#000] p-2 rounded border border-[#222] italic">
                                "{snap.text_selection}"
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[#555] uppercase mb-1 text-[10px]">CSS Path</div>
                                <div className="text-[#00FF00] truncate" title={snap.css_path || ''}>
                                  {snap.css_path}
                                </div>
                              </div>
                              <div>
                                <div className="text-[#555] uppercase mb-1 text-[10px]">Offsets</div>
                                <div className="text-[#ccc]">
                                  [{snap.offsets?.[0]}, {snap.offsets?.[1]}]
                                </div>
                              </div>
                            </div>

                            {snap.visual_focus_box && (
                              <div>
                                <div className="text-[#555] uppercase mb-1 text-[10px]">Visual Focus Box</div>
                                <div className="flex gap-4 text-[#888] font-mono text-[10px]">
                                  <span>X: {snap.visual_focus_box.x.toFixed(1)}</span>
                                  <span>Y: {snap.visual_focus_box.y.toFixed(1)}</span>
                                  <span>W: {snap.visual_focus_box.width.toFixed(1)}</span>
                                  <span>H: {snap.visual_focus_box.height.toFixed(1)}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Right Column: Gestures */}
          <div className="lg:col-span-3 space-y-6">
            <div className="bg-[#111] border border-[#222] rounded-lg p-5 h-full">
              <h2 className="text-xs uppercase tracking-widest text-[#888] mb-4 flex items-center gap-2">
                <Tooltip content="User interaction events and behavioral sensing">
                  <MousePointer2 className="w-4 h-4" />
                </Tooltip>
                 Gesture Grammar
              </h2>
              
              <div className="space-y-2">
                <AnimatePresence>
                  {gestures.length === 0 ? (
                    <div className="text-xs text-[#555] italic text-center py-10">No gestures detected...</div>
                  ) : (
                    gestures.map((gesture, i) => (
                      <motion.div
                        key={i + gesture.timestamp}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-between p-2 border-b border-[#222] text-xs hover:bg-[#1a1a1a] transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${
                            gesture.gesture.includes('tap') ? 'bg-[#00FF00]' :
                            gesture.gesture.includes('hold') ? 'bg-[#FFA500]' : 'bg-[#00BFFF]'
                          }`}></div>
                          <span className="uppercase text-[#ccc]">{gesture.gesture.replace('_', ' ')}</span>
                        </div>
                        <span className="text-[#666]">{new Date(gesture.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit', fractionalSecondDigits: 2 })}</span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* AI Insights Panel */}
          <div className="lg:col-span-12 space-y-6">
            <div className="bg-[#111] border border-[#222] rounded-lg p-5">
              <h2 className="text-xs uppercase tracking-widest text-[#00BFFF] mb-4 flex items-center gap-2">
                <Tooltip content="Gemini 3.1 Pro Analysis of Telemetry Data">
                  <Cpu className="w-4 h-4" />
                </Tooltip>
                Epistemic Grounding Analysis
              </h2>
              <div className="text-xs text-[#ccc] leading-relaxed whitespace-pre-wrap font-sans">
                {isAnalyzing ? (
                  <span className="animate-pulse text-[#888]">Synthesizing telemetry data...</span>
                ) : insight ? (
                  insight
                ) : (
                  <span className="text-[#555] italic">Awaiting telemetry analysis...</span>
                )}
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
