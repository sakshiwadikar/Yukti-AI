import React, { useRef } from 'react';
import { Paperclip } from 'lucide-react';

const ACCEPTED_TYPES = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.pdf',
  '.txt',
  '.docx'
].join(',');

export default function FileUploader({ onFilesSelected, disabled = false }) {
  const inputRef = useRef(null);

  const handleChange = (event) => {
    const selectedFiles = Array.from(event.target.files || []);
    if (selectedFiles.length > 0) {
      onFilesSelected(selectedFiles);
    }

    // Reset value so the same file can be selected again after removal.
    event.target.value = '';
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        accept={ACCEPTED_TYPES}
        multiple
        onChange={handleChange}
        disabled={disabled}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        aria-label="Add files or images"
        title="Add files or images"
        className="metal-button disabled:opacity-50 text-white p-2.5 rounded-lg transition-colors flex-shrink-0"
      >
        <Paperclip className="w-5 h-5" />
      </button>
    </>
  );
}
