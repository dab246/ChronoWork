import React, { useRef } from 'react';
import { Upload, X } from 'lucide-react';
import { useI18n } from '../../i18n';
import { useFeedback } from '../../ui/feedback';
import { MAX_LOGO_CHARS } from '../../utils/storage';
import { FieldGroup } from './fields';
import type { SettingsSectionProps } from './settingsModel';

const MAX_LOGO_FILE_BYTES = 2 * 1024 * 1024;
const LOGO_MAX_WIDTH = 800;

/**
 * Decodes the image and re-encodes it as PNG through a canvas, so only plain
 * pixels are stored (no SVG scripts, no metadata) and the size stays small.
 */
async function processLogo(file: File): Promise<string> {
  if (!['image/png', 'image/jpeg'].includes(file.type)) throw new Error('invalid');
  if (file.size > MAX_LOGO_FILE_BYTES) throw new Error('too_large');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, LOGO_MAX_WIDTH / bitmap.width);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/png');
  if (dataUrl.length > MAX_LOGO_CHARS) throw new Error('too_large');
  return dataUrl;
}

const LogoPicker: React.FC<{ value?: string; onChange: (logo: string | undefined) => void }> = ({ value, onChange }) => {
  const { t } = useI18n();
  const { notify } = useFeedback();
  const s = t.settings;
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      onChange(await processLogo(file));
    } catch (err) {
      notify((err as Error).message === 'too_large' ? s.logoTooLarge : s.logoInvalid, { tone: 'error' });
    }
  };

  const pick = () => inputRef.current?.click();

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {value && (
        <div className="h-16 px-3 py-2 bg-white border border-slate-200 rounded-xl flex items-center">
          <img src={value} alt="" className="h-full w-auto object-contain" />
        </div>
      )}
      <button type="button" onClick={pick} className="btn-tonal">
        <Upload className="w-3.5 h-3.5" />
        {value ? s.logoReplace : s.logoUpload}
      </button>
      {value && (
        <button type="button" onClick={() => onChange(undefined)} className="btn-text text-rose-600 hover:bg-rose-50">
          <X className="w-3.5 h-3.5" />
          {s.logoRemove}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/png,image/jpeg" onChange={handleFile} className="hidden" />
    </div>
  );
};

/** Logo placed in cell A1 of every exported report. */
export const ReportSection: React.FC<SettingsSectionProps> = ({ settings, update }) => {
  const { t } = useI18n();
  return (
    <FieldGroup title={t.settings.sectionBranding} description={t.settings.logoHint}>
      <LogoPicker value={settings.logoDataUrl} onChange={(logoDataUrl) => update({ logoDataUrl })} />
    </FieldGroup>
  );
};
