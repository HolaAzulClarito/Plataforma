/* Asistente de preguntas frecuentes flotante (#bot), global en todas las páginas. Bilingüe por datos, no por t(). */
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Icon } from "../../components/Icon";
import { useI18n } from "../../i18n";
import { answer, FAQ_GREETING, FAQ_SUGGESTIONS } from "./faq";

type Msg = { who: "mine" | "bot"; text: string };

export function Chatbot() {
  const { lang } = useI18n();
  const en = lang === "en";
  const [open, setOpen] = useState(false);
  const [log, setLog] = useState<Msg[]>([]);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const m = msgsRef.current;
    if (m) m.scrollTop = m.scrollHeight;
  }, [log, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const ask = (q: string) => {
    const text = q.trim();
    if (!text) return;
    setLog((l) => [...l, { who: "mine", text }, { who: "bot", text: answer(text, lang) }]);
  };

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = inputRef.current;
    if (!input) return;
    ask(input.value);
    input.value = "";
  };

  return (
    <div
      id="bot"
      className={open ? "open" : undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          setOpen(false);
          fabRef.current?.focus();
        }
      }}
    >
      <button
        ref={fabRef}
        className="bot-fab"
        type="button"
        aria-label={open ? (en ? "Close assistant" : "Cerrar asistente") : en ? "Open assistant" : "Abrir asistente"}
        aria-expanded={open}
        aria-controls="bot-panel"
        onClick={() => setOpen((o) => !o)}
      >
        <Icon name={open ? "x" : "message-circle"} />
        <span>{en ? "Questions?" : "¿Dudas?"}</span>
      </button>
      <div className="bot-panel" id="bot-panel" role="dialog" aria-label={en ? "Academy assistant" : "Asistente de la Academia"} hidden={!open}>
        <div className="bot-h">
          <span className="bot-av">
            <Icon name="sparkles" />
          </span>
          <div>
            <b>{en ? "Academy assistant" : "Asistente de la Academia"}</b>
            <small>{en ? "Answers in seconds · demo" : "Responde al momento · demo"}</small>
          </div>
        </div>
        <div className="bot-msgs" ref={msgsRef} aria-live="polite">
          <div className="bm bot">{FAQ_GREETING[lang]}</div>
          {log.map((m, i) => (
            <div key={i} className={`bm ${m.who}`}>
              {m.text}
            </div>
          ))}
        </div>
        <div className="bot-chips">
          {FAQ_SUGGESTIONS[lang].map((q) => (
            <button key={q} type="button" onClick={() => ask(q)}>
              {q}
            </button>
          ))}
        </div>
        <form className="bot-in" onSubmit={onSubmit}>
          <input ref={inputRef} name="q" placeholder={en ? "Type your question" : "Escribe tu pregunta"} aria-label={en ? "Your question" : "Tu pregunta"} autoComplete="off" />
          <button type="submit" aria-label={en ? "Send" : "Enviar"}>
            <Icon name="send" />
          </button>
        </form>
      </div>
    </div>
  );
}
