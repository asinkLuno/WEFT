"use client";

import { ExternalLink } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { openUrl } from "@/lib/platform";

type Language = "zh-CN" | "en";

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  language: Language;
  onLanguageChange: (next: Language) => void;
}

const DOCS_URL = "https://asinkluno.github.io/WEFT/mcp/";

const COPY: Record<
  Language,
  {
    title: string;
    language: string;
    mcpStatus: string;
    mcpHint: string;
    mcpDocs: string;
    close: string;
  }
> = {
  "zh-CN": {
    title: "偏好设置",
    language: "界面语言",
    mcpStatus: "MCP 服务",
    mcpHint:
      "MCP server 由你的 Agent（Claude Code、Codex 等）自动启停，桌面端不参与。配置方法见文档。",
    mcpDocs: "查看 MCP 配置文档",
    close: "完成",
  },
  en: {
    title: "Preferences",
    language: "Language",
    mcpStatus: "MCP server",
    mcpHint:
      "The MCP server is spawned and stopped by your Agent (Claude Code, Codex, …); the desktop app is not involved. See the docs for setup.",
    mcpDocs: "Open MCP setup docs",
    close: "Done",
  },
};

export function SettingsDialog({
  open,
  onClose,
  language,
  onLanguageChange,
}: SettingsDialogProps) {
  const copy = COPY[language];

  return (
    <Modal open={open} onClose={onClose} label={copy.title}>
      <div className="border-b border-border px-6 py-4">
        <h2 className="text-lg font-semibold tracking-tight">{copy.title}</h2>
      </div>
      <div className="space-y-6 px-6 py-5">
        <section className="space-y-2">
          <label className="block text-sm font-medium">{copy.language}</label>
          <select
            className="h-9 w-full rounded-md border bg-background px-3 text-sm"
            value={language}
            onChange={(event) =>
              onLanguageChange(event.target.value as Language)
            }
          >
            <option value="zh-CN">中文</option>
            <option value="en">English</option>
          </select>
        </section>
        <section className="space-y-2">
          <label className="block text-sm font-medium">{copy.mcpStatus}</label>
          <p className="text-xs text-muted-foreground">{copy.mcpHint}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void openUrl(DOCS_URL)}
          >
            <ExternalLink data-icon="inline-start" />
            {copy.mcpDocs}
          </Button>
        </section>
      </div>
      <div className="flex justify-end border-t border-border px-6 py-3">
        <Button type="button" variant="outline" onClick={onClose}>
          {copy.close}
        </Button>
      </div>
    </Modal>
  );
}
