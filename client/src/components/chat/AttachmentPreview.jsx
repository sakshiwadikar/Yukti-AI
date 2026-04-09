import React from 'react';
import { FileText, X } from 'lucide-react';

export default function AttachmentPreview({
  attachments,
  audioPreviewUrl,
  onRemoveAttachment,
  onRemoveAudio
}) {
  if (attachments.length === 0 && !audioPreviewUrl) {
    return null;
  }

  return (
    <div className="space-y-3 p-3 rounded-xl glass-card">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((item) => (
            <div
              key={item.id}
              className="relative rounded-lg border border-white/20 bg-black/20 backdrop-blur-sm overflow-hidden"
            >
              {item.kind === 'image' ? (
                <div className="w-24 h-24">
                  <img src={item.previewUrl} alt={item.name} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 pr-9 max-w-56">
                  <FileText className="w-4 h-4 text-cyan-300 flex-shrink-0" />
                  <span className="text-xs text-gray-200 truncate" title={item.name}>
                    {item.name}
                  </span>
                </div>
              )}

              <button
                type="button"
                onClick={() => onRemoveAttachment(item.id)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
                aria-label={`Remove ${item.name}`}
                title={`Remove ${item.name}`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {audioPreviewUrl && (
        <div className="flex items-center gap-2 rounded-lg border border-white/20 bg-black/25 px-3 py-2">
          <audio controls src={audioPreviewUrl} className="w-full h-9" />
          <button
            type="button"
            onClick={onRemoveAudio}
            className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center"
            aria-label="Remove audio"
            title="Remove audio"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
