class RealtimeMicProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const inputData = input[0];

    if (inputData.length > 0) {
      // Convert to 16-bit PCM
      const pcm16 = new Int16Array(inputData.length);
      for (let i = 0; i < inputData.length; i++) {
        const s = Math.max(-1, Math.min(1, inputData[i]));
        pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      const pcmUint8 = new Uint8Array(pcm16.buffer);
      this.port.postMessage(pcmUint8.buffer, [pcmUint8.buffer]);
    }

    return true;
  }
}

registerProcessor('realtime-mic-processor', RealtimeMicProcessor);