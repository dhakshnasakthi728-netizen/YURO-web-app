import { useRef, useState } from 'react';
import { ImagePlus, LoaderCircle, Link2, X } from 'lucide-react';
import { ApiError, uploadImage } from '../lib/api';
import { SafeImage } from './SafeImage';

type ImageUploadFieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  shape?: 'logo' | 'banner' | 'product';
};

export function ImageUploadField({
  id,
  label,
  value,
  onChange,
  hint,
  shape = 'logo',
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [showUrl, setShowUrl] = useState(false);

  const chooseFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError('');
    try {
      const url = await uploadImage(file);
      onChange(url);
    } catch (cause) {
      setError(
        cause instanceof ApiError ? cause.message : 'Could not upload that image.',
      );
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className={`image-field image-field-${shape}`}>
      <div className="image-field-label">
        <label htmlFor={id}>{label}</label>
        <span>Optional</span>
      </div>

      <div className="image-field-body">
        <div className="image-preview">
          {value ? (
            <>
              <SafeImage
                src={value}
                alt={`${label} preview`}
                className="image-preview-img"
                sizes="180px"
              />
              <button
                type="button"
                className="image-remove"
                onClick={() => onChange('')}
                aria-label={`Remove ${label.toLowerCase()}`}
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <span className="image-placeholder" aria-hidden="true">
              <ImagePlus size={22} />
            </span>
          )}
        </div>

        <div className="image-field-controls">
          <div className="image-field-actions">
            <button
              type="button"
              className="btn btn-ghost btn-small"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <LoaderCircle size={14} className="spin" />
              ) : (
                <ImagePlus size={14} />
              )}
              {uploading ? 'Uploading…' : 'Upload image'}
            </button>
            <button
              type="button"
              className="text-link"
              onClick={() => setShowUrl((current) => !current)}
              aria-expanded={showUrl}
            >
              <Link2 size={13} />
              Use URL
            </button>
          </div>

          {showUrl && (
            <>
              <label className="sr-only" htmlFor={id}>
                {label} URL
              </label>
              <input
                id={id}
                type="url"
                value={value.startsWith('/uploads/') ? '' : value}
                onChange={(event) => onChange(event.target.value)}
                placeholder="https://example.com/image.jpg"
                autoComplete="off"
              />
            </>
          )}

          <p className="field-hint">
            {hint || 'PNG, JPG or WebP, up to 1.5 MB.'}
          </p>
          {error && (
            <p className="field-error" role="alert">
              {error}
            </p>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        hidden
        onChange={(event) => void chooseFile(event.target.files?.[0] || null)}
      />
    </div>
  );
}
