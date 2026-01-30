import React, { useState, useRef, useCallback, useEffect } from 'react';
import io from 'socket.io-client';

const Realtime: React.FC = () => {
  type Status = 'disconnected' | 'connecting' | 'connected' | 'error';

  const [status, setStatus] = useState<Status>('disconnected');
  const [logs, setLogs] = useState<string[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [hasMicPermission, setHasMicPermission] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<any>(null);
  const processorRef = useRef<any>(null);
  const socketRef = useRef<any>(null);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  }, []);

  const floatTo16BitPCM = useCallback((input: Float32Array): ArrayBuffer => {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    return buffer;
  }, []);

  const connect = useCallback(async () => {
    if (status === 'connecting' || status === 'connected') return;

    try {
      setStatus('connecting');
      addLog('Connecting to backend Socket.IO proxy...');
      const socket = io('http://localhost:3001');
      socketRef.current = socket;

      socket.on('connect', () => {
        addLog('✅ Connected to backend Socket.IO');
        socket.emit('init_realtime');
      });

      socket.on('realtime_status', (s: string) => {
        const statusVal = s as Status;
        setStatus(statusVal);
        if (statusVal === 'connected') {
          addLog('✅ Backend connected to xAI');
          const sessionConfig = {
            type: 'session.update' as const,
            session: {
              instructions: 'You are a helpful assistant.',
              voice: 'Ara',
              turn_detection: { type: 'server_vad' },
              audio: {
                input: { format: { type: 'audio/pcm', rate: 24000 } },
                output: { format: { type: 'audio/pcm', rate: 24000 } },
              },
            },
          };
          setTimeout(() => {
            socket.emit('to_xai', JSON.stringify(sessionConfig));
            addLog('📡 Sent session configuration');
          }, 500);
        } else if (statusVal === 'error') {
          addLog('❌ xAI connection error');
        } else if (statusVal === 'disconnected') {
          addLog('🔌 xAI connection closed');
        }
      });

      socket.on('from_xai', (dataStr: string) => {
        try {
          const data = JSON.parse(dataStr);
          if (data.type === 'output.audio.buffer.append') {
            const audioContent = data.audio?.content;
            if (audioContent && audioCtxRef.current) {
              const byteString = atob(audioContent);
              const ab = new ArrayBuffer(byteString.length);
              const ia = new Uint8Array(ab);
              for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
              }
              audioCtxRef.current.decodeAudioData(ab).then((audioBuffer) => {
                const source = audioCtxRef.current!.createBufferSource();
                source.buffer = audioBuffer;
                source.connect(audioCtxRef.current!.destination);
                source.start();
              }).catch((e) => console.error('Decode error', e));
              addLog('🔊 Playing audio chunk');
            }
          } else {
            addLog(`📨 Server event: ${JSON.stringify(data).slice(0, 200)}...`);
          }
        } catch (e) {
          addLog(`📨 Raw: ${dataStr.slice(0, 100)}...`);
        }
      });

      socket.on('disconnect', () => {
        addLog('🔌 Disconnected from backend');
        setStatus('disconnected');
        socketRef.current = null;
      });

      socket.on('realtime_log', (msg: string) => {
        addLog(msg);
      });
    } catch (error) {
      const msg = (error as Error).message;
      addLog(`❌ Error: ${msg}`);
      setStatus('error');
    }
  }, [status, addLog]);

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

      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioCtx.destination); // Optional: monitor input

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmBuffer = floatTo16BitPCM(inputData);
        const uint8 = new Uint8Array(pcmBuffer);
        const base64 = btoa(String.fromCharCode(...Array.from(uint8)));
        socketRef.current?.emit('to_xai', JSON.stringify({
          type: 'input.audio.buffer.append',
          audio: {
            content: base64
          }
        }));
      };

      addLog('🎤 Started listening and sending audio');
      setIsListening(true);
    } catch (err) {
      addLog(`❌ Mic error: ${(err as Error).message}`);
    }
  }, [addLog, floatTo16BitPCM]);

  const stopListening = useCallback(() => {
    setIsListening(false);

    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }

    if (sourceRef.current) {
      sourceRef.current.disconnect();
      sourceRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (socketRef.current?.connected) {
      socketRef.current.emit('to_xai', JSON.stringify({
        type: 'input.audio.buffer.commit'
      }));
    }

    addLog('🔇 Stopped listening');
  }, [addLog]);

  const disconnect = useCallback(() => {
    stopListening();
    socketRef.current?.disconnect();
    socketRef.current = null;
    setStatus('disconnected');
  }, [stopListening]);

  useEffect(() => {
    return () => {
      stopListening();
      socketRef.current?.disconnect();
    };
  }, [stopListening]);

  return (
    <div style={{ padding: '20px', fontFamily: 'system-ui, sans-serif', maxWidth: '600px' }}>
      <h2>Grok Realtime Voice Agent</h2>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={status === 'connected' || status === 'connecting' ? disconnect : connect}
          disabled={false}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: status === 'connected' ? '#10b981' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          {status === 'connecting' ? 'Connecting...' :
           status === 'connected' ? 'Disconnect' : 'Connect to Realtime'}
        </button>
      </div>
      <div style={{ marginBottom: '10px' }}>
        <button
          onClick={isListening ? stopListening : startListening}
          disabled={status !== 'connected'}
          style={{
            padding: '12px 24px',
            fontSize: '16px',
            background: isListening ? '#ef4444' : '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: status !== 'connected' ? 'not-allowed' : 'pointer',
            opacity: status !== 'connected' ? 0.5 : 1,
          }}
        >
          {isListening ? 'Stop Listening' : 'Start Listening'}
        </button>
      </div>
      <p><strong>Status:</strong> {status}</p>
      <p><strong>Mic:</strong> {hasMicPermission ? (isListening ? 'Listening' : 'Ready') : 'Not granted'}</p>
      {!hasMicPermission && (
        <p style={{ color: 'orange', fontSize: '14px', marginTop: '5px' }}>
          Click "Start Listening" to request permission. Allow microphone access in the browser prompt.
          <br />
          If previously denied: Chrome &gt; Settings &gt; Privacy and security &gt; Site settings &gt; Microphone &gt; Add this site (localhost).
        </p>
      )}
      <div style={{
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
          <p style={{ color: '#666', fontStyle: 'italic' }}>Click Connect to start realtime session...</p>
        ) : (
          logs.map((log, i) => <div key={i} style={{ marginBottom: '4px' }}>{log}</div>)
        )}
      </div>
    </div>
  );
};

export default Realtime;

