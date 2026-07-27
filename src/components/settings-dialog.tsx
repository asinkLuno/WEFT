"use client";

import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { openUrl } from "@/lib/platform";
import { COPY, type Language } from "@/lib/i18n";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (next: Language) => void;
}

const DOCS_URL = "https://asinkluno.github.io/WEFT/mcp/";

export function SettingsDialog({
  open,
  onClose,
  language,
  onLanguageChange,
}: SettingsDialogProps) {
  const copy = COPY[language];

  return (
    <Modal open={open} onClose={onClose} label={copy.settings_title} closeLabel={copy.event_dismiss}>
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">{copy.settings_title}</h2>
      </div>
      <div className="space-y-6 px-6 py-5">
        <section className="space-y-2">
          <label className="block text-sm font-medium">{copy.settings_language}</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as Language)
            }
          >
            <option value="zh-CN">简体中文</option>
            <option value="zh-TW">繁體中文</option>
            <option value="lzh">文言文</option>
            <option value="en">English</option>
            <option value="eo">Esperanto</option>
            <option value="ja">日本語</option>
          </select>
        </section>
        <section className="space-y-2">
          <label className="block text-sm font-medium">{copy.settings_mcp_status}</label>
          <p className="text-xs text-muted-foreground">{copy.settings_mcp_hint}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void openUrl(DOCS_URL)}
          >
            <ExternalLink data-icon="inline-start" />
            {copy.settings_mcp_docs}
          </Button>
        </section>
      </div>
      <div className="flex justify-end border-t border-border px-6 py-3">
        <Button type="button" variant="outline" onClick={onClose}>
          {copy.settings_done}
        </Button>
      </div>
    </Modal>
  );
}
