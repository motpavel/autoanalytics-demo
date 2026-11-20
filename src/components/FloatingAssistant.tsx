import { Bot, Minus } from "lucide-react";
import { useEffect, useState } from "react";
import { AssistantPanel } from "./AssistantPanel";
import type { PeriodId } from "../lib/view";

const STORAGE_KEY = "aa-assistant-open";

/** ИИ-ассистент поверх любого раздела: кнопка справа снизу раскрывает окно. */
export function FloatingAssistant({ period }: { period: PeriodId }) {
  const [open, setOpen] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, open ? "1" : "0");
    } catch {
      /* хранилище недоступно — не страшно */
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className={`floating-assistant ${open ? "is-open" : ""}`}>
      {open ? (
        <div className="floating-assistant__window" role="dialog" aria-label="ИИ-ассистент">
          <button type="button" className="floating-assistant__close" onClick={() => setOpen(false)} aria-label="Свернуть ассистента">
            <Minus size={18} />
          </button>
          <AssistantPanel period={period} />
        </div>
      ) : null}
      {!open ? (
        <button type="button" className="floating-assistant__launcher" onClick={() => setOpen(true)}>
          <span className="floating-assistant__icon" aria-hidden="true">
            <Bot size={20} />
          </span>
          Спросить ИИ
        </button>
      ) : null}
    </div>
  );
}
