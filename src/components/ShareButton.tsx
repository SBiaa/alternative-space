"use client";

import { useState } from "react";

export function ShareButton({ title, text, className = "" }: { title: string; text: string; className?: string }) {
  const [msg, setMsg] = useState("");

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setMsg("Link copiado! Cola onde quiser.");
    } catch {
      setMsg(url);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={share} className={`btn cursor-pointer ${className}`}>Compartilhar resultado</button>
      <p role="status" aria-live="polite" className="min-h-5 font-ficha text-[13px]">{msg}</p>
    </div>
  );
}
