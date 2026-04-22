import React, { useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';
import { useVoiceRecorder } from '@/src/hooks/useVoiceRecorder';
import { api } from '@/src/lib/api';
import { cn } from '@/src/lib/utils';

interface Props {
  /** Called with the transcribed text once the recording is stopped and transcribed. */
  onTranscribed: (text: string, meta: { durationSec: number }) => void;
  /** Optional topical hint to help transcription accuracy. */
  hint?: string;
  /** Render as a compact icon-only button (e.g. inside inputs). */
  compact?: boolean;
  /** Accessible label / tooltip. */
  label?: string;
  className?: string;
  disabled?: boolean;
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

export function VoiceButton({
  onTranscribed,
  hint,
  compact = false,
  label = 'Dictate',
  className,
  disabled,
}: Props) {
  const rec = useVoiceRecorder();
  const [transcribing, setTranscribing] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const error = rec.error || localError;

  const handleClick = async () => {
    setLocalError(null);
    if (transcribing) return;
    if (rec.isRecording) {
      try {
        const result = await rec.stop();
        setTranscribing(true);
        const { text } = await api.transcribe({
          audioBase64: result.base64,
          mimeType: result.mimeType,
          hint,
        });
        onTranscribed(text, { durationSec: result.durationSec });
      } catch (err: any) {
        setLocalError(err?.message || 'Transcription failed.');
      } finally {
        setTranscribing(false);
      }
    } else {
      await rec.start();
    }
  };

  if (compact) {
    return (
      <div className={cn('relative inline-flex items-center gap-2', className)}>
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || transcribing}
          aria-label={rec.isRecording ? 'Stop dictation' : label}
          title={rec.isRecording ? 'Stop dictation' : label}
          className={cn(
            'w-8 h-8 flex items-center justify-center rounded-md transition-colors',
            rec.isRecording
              ? 'bg-red-100 text-red-600 hover:bg-red-200'
              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100',
            (disabled || transcribing) && 'opacity-50 cursor-not-allowed',
          )}
        >
          {transcribing ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : rec.isRecording ? (
            <Square className="w-4 h-4 fill-current" />
          ) : (
            <Mic className="w-4 h-4" />
          )}
        </button>
        {rec.isRecording && (
          <span className="text-xs tabular-nums text-red-600 font-medium">
            {formatElapsed(rec.elapsedMs)}
          </span>
        )}
        {error && (
          <span className="absolute top-full mt-1 left-0 text-xs text-red-600 whitespace-nowrap">
            {error}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col items-center gap-2', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || transcribing}
        className={cn(
          'relative w-20 h-20 rounded-full flex items-center justify-center transition-all',
          'shadow-md focus:outline-none focus:ring-4 focus:ring-indigo-200',
          rec.isRecording
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-700',
          (disabled || transcribing) && 'opacity-50 cursor-not-allowed',
        )}
      >
        {rec.isRecording && (
          <span
            className="absolute inset-0 rounded-full bg-red-500/30"
            style={{
              transform: `scale(${1 + rec.level * 0.6})`,
              transition: 'transform 80ms linear',
            }}
          />
        )}
        {transcribing ? (
          <Loader2 className="w-8 h-8 animate-spin relative z-10" />
        ) : rec.isRecording ? (
          <Square className="w-7 h-7 fill-current relative z-10" />
        ) : (
          <Mic className="w-8 h-8 relative z-10" />
        )}
      </button>
      <div className="text-sm text-slate-600 min-h-[1.25rem]">
        {transcribing ? (
          'Transcribing…'
        ) : rec.isRecording ? (
          <span className="tabular-nums font-medium text-red-600">
            Recording — {formatElapsed(rec.elapsedMs)}
          </span>
        ) : (
          <span className="text-slate-500">{label}</span>
        )}
      </div>
      {error && <div className="text-xs text-red-600 text-center max-w-xs">{error}</div>}
    </div>
  );
}
