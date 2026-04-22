import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wrap MediaRecorder so callers don't have to juggle streams, blobs, and base64.
 *
 *   const recorder = useVoiceRecorder();
 *   recorder.start();
 *   recorder.stop();            // returns Promise<{ text: string }> if you pass an onStop
 *
 * UI cares about:
 *   - isRecording   → show "recording" state
 *   - elapsedMs     → live timer
 *   - level         → 0..1, normalized RMS for a bouncing mic icon
 *   - error         → permission denied / unsupported browser
 */

export interface RecordingResult {
  blob: Blob;
  base64: string;
  mimeType: string;
  durationSec: number;
}

// Prefer formats Gemini accepts directly without transcoding.
function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4;codecs=mp4a.40.2',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/ogg',
  ];
  for (const mt of candidates) {
    // @ts-ignore - isTypeSupported exists on MediaRecorder
    if (MediaRecorder.isTypeSupported?.(mt)) return mt;
  }
  return '';
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
  }
  return typeof btoa !== 'undefined' ? btoa(binary) : Buffer.from(binary, 'binary').toString('base64');
}

export function useVoiceRecorder() {
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const resolveRef = useRef<((r: RecordingResult) => void) | null>(null);
  const rejectRef = useRef<((err: Error) => void) | null>(null);

  const cleanupStream = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    try { audioCtxRef.current?.close(); } catch { /* ignore */ }
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setLevel(0);
    setIsRecording(false);
  }, []);

  useEffect(() => () => cleanupStream(), [cleanupStream]);

  const start = useCallback(async () => {
    setError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setError('Microphone is not supported in this browser.');
      return false;
    }
    if (typeof MediaRecorder === 'undefined') {
      setError('MediaRecorder is not supported in this browser.');
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
      });
      streamRef.current = stream;

      const mimeType = pickMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        const durationSec = (Date.now() - startTsRef.current) / 1000;
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        chunksRef.current = [];
        try {
          const base64 = await blobToBase64(blob);
          resolveRef.current?.({
            blob,
            base64,
            mimeType: recorder.mimeType || 'audio/webm',
            durationSec,
          });
        } catch (err: any) {
          rejectRef.current?.(err);
        } finally {
          resolveRef.current = null;
          rejectRef.current = null;
          cleanupStream();
        }
      };

      // Level meter — cheap, only runs while recording.
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx: AudioContext = new AudioCtx();
          audioCtxRef.current = ctx;
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          source.connect(analyser);
          analyserRef.current = analyser;
          const buf = new Uint8Array(analyser.fftSize);
          const loop = () => {
            if (!analyserRef.current) return;
            analyser.getByteTimeDomainData(buf);
            let sum = 0;
            for (let i = 0; i < buf.length; i++) {
              const v = (buf[i] - 128) / 128;
              sum += v * v;
            }
            const rms = Math.sqrt(sum / buf.length);
            setLevel(Math.min(1, rms * 3));
            rafRef.current = requestAnimationFrame(loop);
          };
          rafRef.current = requestAnimationFrame(loop);
        }
      } catch {
        // Audio level meter is nice-to-have; never block recording on it.
      }

      startTsRef.current = Date.now();
      setElapsedMs(0);
      timerRef.current = window.setInterval(() => {
        setElapsedMs(Date.now() - startTsRef.current);
      }, 100);

      recorder.start(200); // emit data every 200ms
      setIsRecording(true);
      return true;
    } catch (err: any) {
      setError(err?.message || 'Could not start recording. Did you allow microphone access?');
      cleanupStream();
      return false;
    }
  }, [cleanupStream]);

  const stop = useCallback((): Promise<RecordingResult> => {
    return new Promise((resolve, reject) => {
      const rec = recorderRef.current;
      if (!rec || rec.state === 'inactive') {
        reject(new Error('Not currently recording.'));
        return;
      }
      resolveRef.current = resolve;
      rejectRef.current = reject;
      try {
        rec.stop();
      } catch (err: any) {
        resolveRef.current = null;
        rejectRef.current = null;
        reject(err);
      }
    });
  }, []);

  const cancel = useCallback(() => {
    try {
      recorderRef.current?.stop();
    } catch { /* ignore */ }
    resolveRef.current = null;
    rejectRef.current = null;
    cleanupStream();
  }, [cleanupStream]);

  return { isRecording, elapsedMs, level, error, start, stop, cancel };
}
