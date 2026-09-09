"use client";

import { DefaultChatTransport } from "@repo/ai";
import { Message } from "@repo/ai/components/message";
import { Thread } from "@repo/ai/components/thread";
import { useChat } from "@repo/ai/lib/react";
import { Button } from "@repo/design-system/components/ui/button";
import { Textarea } from "@repo/design-system/components/ui/textarea";
import { type FormEvent, useState } from "react";

const QUICK_COMMANDS = ["/bomdia", "/agora", "/estado", "/fechardia"] as const;

/**
 * /copilot chat UI (M06-T04). Client component: useChat streams from
 * apps/app/app/api/chat/route.ts, which routes the 5 fixed commands
 * deterministically (no model call) and everything else through the
 * real Vercel AI SDK tool-calling pipeline (agent-runtime/src/tools.ts).
 * /replanejamento isn't a quick-command button — it needs a structured
 * proposal the model builds from conversation, not a bare slash word.
 */
export const CopilotChat = () => {
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });
  const [input, setInput] = useState("");

  const send = (text: string) => {
    if (!text.trim()) {
      return;
    }
    sendMessage({ text });
    setInput("");
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    send(input);
  };

  return (
    <div className="flex h-[calc(100dvh-2rem)] flex-col gap-4 p-8">
      <div>
        <h1 className="font-semibold text-2xl">Copiloto</h1>
        <p className="text-muted-foreground">
          /bomdia · /agora · /estado · /fechardia · /replanejamento
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {QUICK_COMMANDS.map((command) => (
          <Button
            disabled={status === "streaming" || status === "submitted"}
            key={command}
            onClick={() => send(command)}
            size="sm"
            type="button"
            variant="outline"
          >
            {command}
          </Button>
        ))}
      </div>

      <Thread className="flex-1 rounded-lg border">
        {messages.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Use um comando acima ou escreva livremente.
          </p>
        ) : (
          messages.map((message) => <Message data={message} key={message.id} />)
        )}
      </Thread>

      <form className="flex gap-2" onSubmit={onSubmit}>
        <Textarea
          className="min-h-0 flex-1 resize-none"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              send(input);
            }
          }}
          placeholder="Pergunte algo ou digite um comando…"
          rows={1}
          value={input}
        />
        <Button
          disabled={status === "streaming" || status === "submitted"}
          type="submit"
        >
          Enviar
        </Button>
      </form>
    </div>
  );
};
