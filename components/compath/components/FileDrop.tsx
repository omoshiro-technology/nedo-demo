"use client"
import { useRef, useState } from "react";

const ACCEPTED_TYPES = ".pdf,.docx,.xlsx,.pptx,.txt";

type FileDropProps = {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
};

export default function FileDrop({ onFileSelected, disabled }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    onFileSelected(file);
  };

  return (
    <div
      className={`file-drop ${isDragging ? "is-dragging" : ""} ${disabled ? "is-disabled" : ""}`}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (disabled) return;
        handleFile(event.dataTransfer.files?.[0]);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES}
        onChange={(event) => handleFile(event.target.files?.[0])}
        disabled={disabled}
        hidden
      />
      <div className="file-drop__content">
        <p className="file-drop__title">ファイルをドロップ</p>
        <p className="file-drop__subtitle">PDF / Word / Excel / PowerPoint / TXT (最大50MB)</p>
        <button
          type="button"
          className="file-drop__button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
        >
          ファイルを選択
        </button>
      </div>
    </div>
  );
}
