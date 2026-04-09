import React, { useEffect, useMemo, useState } from 'react';
import { Send } from 'lucide-react';
import FileUploader from './FileUploader';
import AudioRecorder from './AudioRecorder';
import AttachmentPreview from './AttachmentPreview';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const DOC_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
]);
const VALID_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.pdf', '.txt', '.docx'];

const isValidFile = (file) => {
  if (IMAGE_TYPES.has(file.type) || DOC_TYPES.has(file.type)) {
    return true;
  }

  const lowerName = file.name.toLowerCase();
  return VALID_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
};

const detectKind = (file) => {
  return file.type.startsWith('image/') ? 'image' : 'document';
};

export default function ChatInput({ onSend, isTyping, disabled, prefillText = '', onTextChange }) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [audioBlob, setAudioBlob] = useState(null);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState('');

  const canSend = useMemo(() => {
    const hasText = text.trim().length > 0;
    const hasFiles = attachments.length > 0;
    const hasAudio = Boolean(audioBlob);
    return !disabled && !isTyping && (hasText || hasFiles || hasAudio);
  }, [attachments.length, audioBlob, disabled, isTyping, text]);

  useEffect(() => {
    if (prefillText !== text) {
      setText(prefillText);
    }
  }, [prefillText]);

  const handleFilesSelected = (selectedFiles) => {
    const nextItems = selectedFiles
      .filter(isValidFile)
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        file,
        kind: detectKind(file),
        name: file.name,
        previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
      }));

    if (nextItems.length > 0) {
      setAttachments((previous) => [...previous, ...nextItems]);
    }
  };

  const handleRemoveAttachment = (id) => {
    setAttachments((previous) => {
      const item = previous.find((entry) => entry.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return previous.filter((entry) => entry.id !== id);
    });
  };

  const handleAudioReady = (blob) => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    setAudioBlob(blob);
    setAudioPreviewUrl(URL.createObjectURL(blob));
  };

  const handleRemoveAudio = () => {
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }

    setAudioBlob(null);
    setAudioPreviewUrl('');
  };

  const resetInput = () => {
    setText('');
    onTextChange?.('');
    attachments.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
    setAttachments([]);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
    }
    setAudioBlob(null);
    setAudioPreviewUrl('');
  };

  const submitPayload = async () => {
    if (!canSend) {
      return;
    }

    await onSend({
      message: text.trim(),
      attachments,
      audioBlob
    });

    resetInput();
  };

  return (
    <div className="relative flex flex-col gap-3 glass-card rounded-xl p-2">
      <AttachmentPreview
        attachments={attachments}
        audioPreviewUrl={audioPreviewUrl}
        onRemoveAttachment={handleRemoveAttachment}
        onRemoveAudio={handleRemoveAudio}
      />

      <div className="flex items-end gap-2">
        <FileUploader onFilesSelected={handleFilesSelected} disabled={disabled || isTyping} />
        <AudioRecorder onAudioReady={handleAudioReady} disabled={disabled || isTyping} />

        <textarea
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            onTextChange?.(event.target.value);
          }}
          placeholder={isTyping ? 'Yukti AI is typing...' : 'Message Yukti AI...'}
          disabled={disabled || isTyping}
          className="w-full max-h-32 min-h-[44px] bg-transparent text-white placeholder-gray-500 px-3 py-2 focus:outline-none resize-none leading-relaxed disabled:opacity-50"
          rows={1}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submitPayload();
            }
          }}
        />

        <button
          type="button"
          onClick={submitPayload}
          disabled={!canSend}
          aria-label="Send message"
          title="Send message"
          className="metal-button disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors flex-shrink-0"
        >
          <Send className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
