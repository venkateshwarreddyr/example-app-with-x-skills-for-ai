import React, { useState, useRef, useCallback, useEffect } from 'react';
import io from 'socket.io-client';
import { getXSkillsRuntime } from '@x-skills-for-ai/core';
import TurndownService from 'turndown';

const Realtime: React.FC = () => {
  type State = 'disconnected' | 'connecting' | 'connected' | 'error';

  const [state, setState] = useState<State>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const [monitorMic, setMonitorMic] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<any>(null);
  const monitorGainRef = useRef<GainNode | null>(null);
  const socketRef = useRef<any>(null);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const nextPlayTimeRef = useRef<number>(0);
  const workletNodeRef = useRef<any>(null);
  const isWorkletLoadedRef = useRef<boolean>(false);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);



  const playPCM = useCallback((base64Audio: string, audioCtx: AudioContext) => {
    try {
      const binaryString = atob(base64Audio);
      const len = binaryString.length / 2;
      const pcm16 = new Int16Array(len);
      for (let i = 0; i < len; i++) {
        const offset = i * 2;
        pcm16[i] = (binaryString.charCodeAt(offset) | (binaryString.charCodeAt(offset + 1) << 8));
      }
      const float32 = new Float32Array(pcm16.length);
      for (let i = 0; i < pcm16.length; i++) {
        float32[i] = pcm16[i] / 32768.0;
      }
      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      const startTime = Math.max(audioCtx.currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
      source.connect(audioCtx.destination);
      activeSourcesRef.current.push(source);
      source.onended = () => {
        const idx = activeSourcesRef.current.indexOf(source);
        if (idx > -1) {
          activeSourcesRef.current.splice(idx, 1);
        }
      };
    } catch (e) {
      console.error('Play PCM error:', e);
    }
  }, []);

  const connect = useCallback(async () => {
    if (state === 'connecting' || state === 'connected') return;

    try {
      setState('connecting');
      addLog('Connecting to backend Socket.IO proxy...');
      const socket = io('http://localhost:3001');
      socketRef.current = socket;

      socket.on('connect', () => {
        addLog('✅ Connected to backend Socket.IO');
        socket.emit('init_realtime');
        try {
          const runtime = getXSkillsRuntime();
          const skills = runtime.inspect();
          const turndownService = new TurndownService();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = document.body.innerHTML;
          tempDiv.querySelectorAll('.chat').forEach(el => el.remove());
          const contextMarkdown = turndownService.turndown(tempDiv.innerHTML);
          socket.emit('runtime_details', { skills, context_markdown: contextMarkdown });
          addLog('📋 Sent initial runtime details and page markdown to backend');
          addLog(`📋 Skills (${skills.length}): ${skills.map((s: any) => s.id).join(', ')}`);
        } catch (error: any) {
          addLog(`❌ Failed to send initial runtime details: ${error.message}`);
        }
      });

      socket.on('realtime_status', (s: string) => {
        const stateVal = s as State;
        setState(stateVal);
        if (stateVal === 'connected') {
          addLog('✅ Backend connected to xAI');
        } else if (stateVal === 'error') {
          addLog('❌ xAI connection error');
        } else if (stateVal === 'disconnected') {
          addLog('🔌 xAI connection closed');
        }
      });

      socket.on('bot_audio', (audioBase64: string) => {
        if (audioBase64 && audioCtxRef.current) {
          playPCM(audioBase64, audioCtxRef.current);
          addLog('🔊 Playing bot audio chunk');
        }
      });

      socket.on('tool_request', async (data: any) => {
        const { call_id, name, args = {} } = data;
        addLog(`🛠️ Tool request: ${name} ${JSON.stringify(args)}`);
        let result = '';
        try {
          let runtime = getXSkillsRuntime();
          const currentSkills = runtime.inspect();
          addLog(`🔍 Skills before tool call (${currentSkills.length}): ${currentSkills.map((s: any) => s.id).join(', ')}`);
          if (name === 'execute_skill') {
            const { skill_id, params = {} } = args;
            let effective_skill_id = skill_id;
            let effective_params = params;
            if (!currentSkills.find((s: any) => s.id === skill_id)) {
              if (skill_id === 'counter_app') {
                effective_skill_id = 'switch_app';
                effective_params = { session: 'counter', ...params };
              } else if (skill_id === 'todo_app') {
                effective_skill_id = 'switch_app';
                effective_params = { session: 'todo', ...params };
              } else {
                addLog(`❌ Skill "${skill_id}" not found!`);
                throw new Error(`Skill ${skill_id} not registered`);
              }
              addLog(`🔄 Mapped "${skill_id}" to "${effective_skill_id}"`);
            }
            addLog(`⚡ Executing skill_id: "${effective_skill_id}"`);
            await runtime.execute(effective_skill_id, effective_params);
            addLog(`✅ Skill "${effective_skill_id}" executed successfully`);
            const executed_skill = skill_id === effective_skill_id ? skill_id : `${skill_id} -> ${effective_skill_id}`;
            result = `✅ Executed ${executed_skill === skill_id ? 'skill' : 'mapped skill'} "${executed_skill}" with params: ${JSON.stringify(effective_params)}`;
          } else {
            result = `Unknown tool: ${name}`;
          }
          // Wait some time after executing tool before inspecting runtime
          await new Promise((resolve) => setTimeout(resolve, 200));
          runtime = getXSkillsRuntime();
          const skills = runtime.inspect();
          const turndownService = new TurndownService();
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = document.body.innerHTML;
          tempDiv.querySelectorAll('.chat').forEach(el => el.remove());
          const contextMarkdown = turndownService.turndown(tempDiv.innerHTML);
          socketRef.current.emit('tool_result', { call_id, result, runtime_details: { skills, context_markdown: contextMarkdown } });
          addLog(`✅ Sent tool_result for ${call_id} with runtime details`);
        } catch (error: any) {
          result = `❌ Error: ${error.message}`;
          socketRef.current.emit('tool_result', { call_id, result });
          addLog(`✅ Sent tool_result for ${call_id}`);
        }
      });

      socket.on('disconnect', () => {
        addLog('🔌 Disconnected from backend');
        setState('disconnected');
        socketRef.current = null;
      });

      socket.on('realtime_log', (msg: string) => {
        addLog(msg);
      });
      socket.on('interrupt_audio', () => {
        addLog('🛑 User interrupted - clearing audio queue');
        activeSourcesRef.current.forEach(source => source.stop());
        activeSourcesRef.current = [];
        if (audioCtxRef.current) {
          nextPlayTimeRef.current = audioCtxRef.current.currentTime;
        }
      });
    } catch (error) {
      const msg = (error as Error).message;
      addLog(`❌ Error: ${msg}`);
      setState('error');
    }
  }, [state, addLog]);

  const startListening = useCallback(async () => {
    try {
      if (!socketRef.current || !socketRef.current.connected) {
        addLog('❌ Socket not connected');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setHasMicPermission(true);

      let audioCtx = audioCtxRef.current;
      if (!audioCtx) {
        audioCtx = new AudioContext({ sampleRate: 24000 });
        audioCtxRef.current = audioCtx;
      }

      if (audioCtx.state === 'suspended') {
        await audioCtx.resume();
      }

      const source = audioCtx.createMediaStreamSource(stream);
      sourceRef.current = source;

      const workletEndpoint = new URL('../audio-processor-worklet.js', import.meta.url);
      if (!isWorkletLoadedRef.current) {
        await audioCtx.audioWorklet.addModule(workletEndpoint);
        isWorkletLoadedRef.current = true;
      }
      const processor = new AudioWorkletNode(audioCtx, 'realtime-mic-processor');
      workletNodeRef.current = processor;
      processor.port.onmessage = (event) => {
        const audioData = event.data;
        const uint8 = new Uint8Array(audioData);
        const base64 = btoa(String.fromCharCode(...Array.from(uint8)));
        socketRef.current?.emit('user_audio', base64);
      };

      const monitorGain = audioCtx.createGain();
      monitorGain.gain.value = 0.0;
      monitorGainRef.current = monitorGain;

      source.connect(processor);
      processor.connect(monitorGain);
      monitorGain.connect(audioCtx.destination);

      addLog('🎤 Started listening and sending audio');
      setIsListening(true);
    } catch (err) {
      addLog(`❌ Mic error: ${(err as Error).message}`);
    }
  }, [addLog]);

  const stopListening = useCallback(() => {
    setIsListening(false);



    if (workletNodeRef.current) {
      workletNodeRef.current.disconnect();
      workletNodeRef.current = null;
    }

    if (monitorGainRef.current) {
      monitorGainRef.current.disconnect();
      monitorGainRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    activeSourcesRef.current.forEach(source => source.stop());
    activeSourcesRef.current = [];
    nextPlayTimeRef.current = 0;

    addLog('🔇 Stopped listening');
  }, [addLog]);

  const disconnect = useCallback(() => {
    stopListening();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setState('disconnected');
  }, [stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
      socketRef.current?.disconnect();
    };
  }, [stopListening]);

  useEffect(() => {
    if (monitorGainRef.current) {
      monitorGainRef.current.gain.value = monitorMic ? 0.3 : 0.0;
    }
  }, [monitorMic]);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px' }}>
      <h2>Grok Realtime Voice Agent</h2>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={state === 'connected' || state === 'connecting' ? disconnect : connect}
          disabled={false}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: state === 'connected' ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {state === 'connecting' ? 'Connecting...' :
            state === 'connected' ? 'Disconnect' : 'Connect to Realtime'}
        </button>
      </div>
      <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={state !== 'connected'}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: isListening ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: state !== 'connected' ? 'not-allowed' : 'pointer',
            opacity: state !== 'connected' ? 0.5 : 1,
          }}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
        {isListening && (
          <label style={{ fontSize: '14px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={monitorMic}
              onChange={(e) => setMonitorMic(e.target.checked)}
              style={{ marginRight: '5px' }}
            />
            Monitor mic (low vol)
          </label>
        )}
      </div>
      <p><strong>Status:</strong> {state}</p>
      <p><strong>Mic:</strong> {hasMicPermission ? (isListening ? 'Listening' : 'Ready') : 'Not granted'}</p>
      {/* {!hasMicPermission && (
        <p style={{ color: 'orange', fontSize: '14px', marginTop: '5px' }}>
          Trigger Event \"Start Listening\" to request permission. Allow microphone access in the runtime prompt.
          <br />
          If previously denied: Chrome &gt; Settings &gt; Privacy and security &gt; Site settings &gt; Microphone &gt; Add this site (localhost).
        </p>
      )} */}
      {/* <div style={{
        height: '400px',
        overflow: 'auto',
        border: '1px solid #ddd',
        padding: '12px',
        background: '#f9f9f9',
        fontSize: '13px',
        fontFamily: 'monospace',
        lineHeight: '1.4',
      }}>
        {logs.length === 0 ? (
          <p style={{ color: '#666', fontStyle: 'italic' }}>Trigger \"Connect\" to start realtime session...</p>
        ) : (
          logs.map((log, i) => <div key={i} style={{ marginBottom: '4px' }}>{log}</div>)
        )}
      </div> */}
    </div>
  );
};

export default Realtime;

