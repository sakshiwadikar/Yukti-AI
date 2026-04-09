import React, { useEffect, useRef, useState } from 'react';
import { Mic, Square } from 'lucide-react';

const formatSeconds = (seconds) => {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
};

export default function AudioRecorder({ onAudioReady, disabled = false }) {
  const [isRecording, setIsRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setIsRecording(false);
    setSeconds(0);
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        onAudioReady(audioBlob);

        if (streamRef.current) {
          streamRef.current.getTracks().forEach((track) => track.stop());
          streamRef.current = null;
        }
      };

      recorder.start();
      setIsRecording(true);
      setSeconds(0);
      timerRef.current = window.setInterval(() => {
        setSeconds((previous) => previous + 1);
      }, 1000);
    } catch (error) {
      console.error('Failed to access microphone', error);
    }
  };

  const toggleRecording = async () => {
    if (disabled) {
      return;
    }

    if (isRecording) {
      stopRecording();
      return;
    }

    await startRecording();
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggleRecording}
        disabled={disabled}
        aria-label={isRecording ? 'Stop recording' : 'Start audio recording'}
        title={isRecording ? 'Stop recording' : 'Start audio recording'}
        className="metal-button disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors flex-shrink-0"
      >
        {isRecording ? <Square className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
      </button>

      {isRecording && (
        <div className="glass-input flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-red-200 border border-red-500/40">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span>Recording {formatSeconds(seconds)}</span>
        </div>
      )}
    </div>
  );
}
