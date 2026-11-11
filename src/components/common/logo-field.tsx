"use client";

import * as React from "react";
import { ImageUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/form-controls";
import type { MessageKey } from "@/lib/i18n";
import { ALLOWED_LOGO_CONTENT_TYPES, MAX_LOGO_BYTES, type LogoContentType } from "@/lib/logo";

export interface LogoValue {
  readonly data: string;
  readonly contentType: LogoContentType;
  readonly previewUrl: string;
}

function readLogoFile(file: File): Promise<{ data: string; contentType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve({ data: result.slice(comma + 1), contentType: file.type });
    };
    reader.onerror = () => reject(new Error("Could not read the file."));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload / change / remove control for a logo, shared by the championship
 * creation wizard and a championship's own settings screen. Reads the file
 * into a base64 data URL entirely client-side (for the preview and to hand
 * the service layer's shape), so nothing uploads until the surrounding form
 * actually saves.
 */
export function LogoField({
  id,
  label,
  value,
  onChange,
  t,
}: {
  id: string;
  label: string;
  value: LogoValue | null;
  onChange: (value: LogoValue | null) => void;
  t: (key: MessageKey) => string;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    if (!(ALLOWED_LOGO_CONTENT_TYPES as readonly string[]).includes(file.type)) {
      setError(t("championships.logoInvalidType"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError(t("championships.logoTooLarge"));
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const { data, contentType } = await readLogoFile(file);
    onChange({
      data,
      contentType: contentType as LogoContentType,
      previewUrl: `data:${contentType};base64,${data}`,
    });
  }

  function remove() {
    onChange(null);
    setError(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <Field label={label} htmlFor={id} hint={error ? undefined : t("championships.logoHint")} error={error}>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value.previewUrl}
            alt=""
            className="size-12 shrink-0 rounded-md border border-border bg-surface-raised object-contain p-1"
          />
        ) : null}
        <Button type="button" variant="secondary" size="sm" onClick={() => inputRef.current?.click()}>
          <ImageUp aria-hidden />
          {value ? t("championships.changeLogo") : t("championships.uploadLogo")}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="iconSm"
            onClick={remove}
            aria-label={t("championships.removeLogo")}
          >
            <X aria-hidden />
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        id={id}
        type="file"
        accept={ALLOWED_LOGO_CONTENT_TYPES.join(",")}
        className="hidden"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
        }}
      />
    </Field>
  );
}
