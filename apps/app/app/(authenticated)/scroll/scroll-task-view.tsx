"use client";

import { Badge } from "@repo/design-system/components/ui/badge";
import { Button } from "@repo/design-system/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@repo/design-system/components/ui/card";
import { canTransitionScrollTask, onTimerElapsed } from "@repo/domain";
import type {
  ScrollTaskState,
  ScrollTaskTimerMinutes,
  ScrollTaskUnit,
} from "@repo/schemas";
import { useEffect, useState } from "react";

interface ScrollTaskViewProperties {
  readonly units: readonly ScrollTaskUnit[];
}

const STATE_LABEL_PT: Record<ScrollTaskState, string> = {
  idle: "Parado",
  running: "Em execução",
  expanded: "Detalhado",
  completed: "Concluído",
  deferred: "Adiado",
  timer_elapsed: "Tempo esgotado",
};

const TIMER_OPTIONS: readonly ScrollTaskTimerMinutes[] = [15, 30, 45];

/**
 * Fase 7 (APP-SCR-001) — layout "33/33/33": três linhas de altura
 * igual, unidade ativa na linha central. Interação real (não mock):
 * `canTransitionScrollTask`/`onTimerElapsed` (`@repo/domain`) decidem
 * toda transição — nenhuma lógica de estado duplicada aqui.
 *
 * "Auto-scroll nunca marca conclusão automaticamente": o único caller
 * que produz `completed` é `advance("completed")`, disparado por um
 * clique explícito no botão "Concluir" — o timer (`tick`, abaixo) só
 * chama `onTimerElapsed`, que no máximo produz `timer_elapsed`, nunca
 * `completed` (ver o teste dessa garantia em
 * packages/domain/__tests__/scroll-task-state.test.ts).
 *
 * "Usuário inicia execução em ≤2 interações": idle → running é um
 * único clique no botão "Iniciar" (1 interação).
 *
 * Fora de escopo v1 (disclosurado no plano): timer adaptativo por IA,
 * reordenação completa das unidades, conclusão automática por tempo —
 * nenhum dos três está implementado aqui, de propósito.
 */
export const ScrollTaskView = ({ units }: ScrollTaskViewProperties) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [state, setState] = useState<ScrollTaskState>("idle");
  const [timerMinutes, setTimerMinutes] =
    useState<ScrollTaskTimerMinutes | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const current = units[activeIndex];
  const previous = activeIndex > 0 ? units[activeIndex - 1] : null;
  const next = activeIndex < units.length - 1 ? units[activeIndex + 1] : null;

  // Countdown — the only thing a running timer is allowed to do on
  // reaching zero is call onTimerElapsed(), never advance() directly.
  useEffect(() => {
    if (state !== "running" || remainingSeconds === null) {
      return;
    }
    if (remainingSeconds <= 0) {
      const nextState = onTimerElapsed(state);
      if (nextState) {
        setState(nextState);
      }
      return;
    }
    const id = setTimeout(() => {
      setRemainingSeconds((seconds) => (seconds === null ? null : seconds - 1));
    }, 1000);
    return () => clearTimeout(id);
  }, [state, remainingSeconds]);

  const advance = (to: ScrollTaskState) => {
    if (!canTransitionScrollTask(state, to)) {
      return;
    }
    setState(to);
    if (to === "completed" || to === "deferred") {
      setTimerMinutes(null);
      setRemainingSeconds(null);
      if (activeIndex < units.length - 1) {
        setActiveIndex((index) => index + 1);
      }
      setState("idle");
    }
  };

  const startWithTimer = (minutes: ScrollTaskTimerMinutes) => {
    if (!canTransitionScrollTask(state, "running")) {
      return;
    }
    setTimerMinutes(minutes);
    setRemainingSeconds(minutes * 60);
    setState("running");
  };

  if (!current) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
        <h1 className="font-semibold text-2xl">Scroll Task</h1>
        <p className="text-muted-foreground">
          Nada elegível agora — sem unidades para exibir.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[80vh] max-w-2xl flex-col">
      {/* Linha 1/3 — anterior, esmaecida */}
      <div className="flex flex-1 items-center justify-center opacity-40">
        {previous ? (
          <p className="text-sm">{previous.titulo}</p>
        ) : (
          <p className="text-muted-foreground text-sm">— início —</p>
        )}
      </div>

      {/* Linha 2/3 — unidade ativa, central */}
      <div className="flex flex-1 items-center justify-center">
        <Card className="w-full" onDoubleClick={() => advance("expanded")}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{current.titulo}</CardTitle>
              <Badge variant="secondary">{STATE_LABEL_PT[state]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {state === "idle" && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => advance("running")}>Iniciar</Button>
                {TIMER_OPTIONS.map((minutes) => (
                  <Button
                    key={minutes}
                    onClick={() => startWithTimer(minutes)}
                    variant="outline"
                  >
                    Iniciar com timer {minutes}min
                  </Button>
                ))}
              </div>
            )}

            {(state === "running" ||
              state === "expanded" ||
              state === "timer_elapsed") && (
              <>
                {remainingSeconds !== null && state === "running" && (
                  <p className="text-muted-foreground text-sm">
                    Tempo restante: {Math.floor(remainingSeconds / 60)}:
                    {String(remainingSeconds % 60).padStart(2, "0")}
                  </p>
                )}
                {state === "timer_elapsed" && (
                  <p className="text-sm">
                    Timer de {timerMinutes}min esgotado — concluir, adiar ou
                    continuar?
                  </p>
                )}
                {state === "expanded" && (
                  <p className="text-muted-foreground text-sm">
                    Escopo: {current.scope} · refId: {current.refId}
                  </p>
                )}
                <div className="flex flex-wrap gap-2">
                  {state === "timer_elapsed" && (
                    <Button onClick={() => advance("running")}>
                      Continuar
                    </Button>
                  )}
                  {state !== "expanded" && (
                    <Button
                      onClick={() => advance("expanded")}
                      variant="outline"
                    >
                      Ver detalhe
                    </Button>
                  )}
                  <Button onClick={() => advance("completed")}>Concluir</Button>
                  <Button onClick={() => advance("deferred")} variant="ghost">
                    Adiar
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Linha 3/3 — próxima, esmaecida */}
      <div className="flex flex-1 items-center justify-center opacity-40">
        {next ? (
          <p className="text-sm">{next.titulo}</p>
        ) : (
          <p className="text-muted-foreground text-sm">— fim —</p>
        )}
      </div>
    </div>
  );
};
