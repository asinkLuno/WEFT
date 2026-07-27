"use client";

import type { ReactElement } from "react";
import { CalendarRangeIcon, UsersIcon } from "lucide-react";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface EventHoverCardProps {
  title: string;
  start: string;
  end: string | null;
  description: string | null;
  moais: Array<{
    name: string;
    offset: [string, string | null] | null;
  }>;
  trigger: ReactElement;
}

export function EventHoverCard({
  title,
  start,
  end,
  description,
  moais,
  trigger,
}: EventHoverCardProps) {
  return (
    <HoverCard>
      <HoverCardTrigger delay={250} closeDelay={150} render={trigger} />
      <HoverCardContent
        align="start"
        className="max-h-[min(32rem,var(--available-height))] w-[min(28rem,calc(100vw-2rem))] overflow-y-auto"
      >
        <div className="space-y-3">
          <div>
            <h3 className="text-base leading-snug font-semibold">{title}</h3>
            <div className="mt-1.5 flex items-start gap-2 font-mono text-xs text-muted-foreground">
              <CalendarRangeIcon className="mt-0.5 size-3.5 shrink-0" />
              <span>
                {start}
                {end ? ` — ${end}` : ""}
              </span>
            </div>
          </div>

          {description && (
            <p className="whitespace-pre-wrap break-words border-t pt-3 text-sm leading-relaxed">
              {description}
            </p>
          )}

          {moais.length > 0 && (
            <div className="flex items-start gap-2 border-t pt-3">
              <UsersIcon className="mt-1 size-3.5 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1 space-y-1.5">
                {moais.map(({ name, offset }) => (
                  <div
                    key={name}
                    className="flex items-baseline justify-between gap-3 rounded-md bg-muted px-2 py-1 text-xs"
                  >
                    <span className="font-medium">{name}</span>
                    <span className="text-right font-mono text-muted-foreground">
                      {offset ? (
                        <>
                          Δ {offset[0]}
                          {offset[1] ? ` — ${offset[1]}` : ""}
                        </>
                      ) : (
                        "No base time"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
