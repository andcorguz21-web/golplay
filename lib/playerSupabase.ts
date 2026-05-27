// lib/playerSupabase.ts
import { supabase } from "@/lib/supabase";

type InvokeResult<T = any> = { data: T | null; error: string | null };

/**
 * Llama a la Edge Function "manage-player" y devuelve {data, error}.
 * Importante: cuando la función responde con un status != 2xx, supabase-js
 * envuelve el error en un FunctionsHttpError con mensaje genérico
 * ("Edge Function returned a non-2xx status code"). El mensaje real está
 * en error.context (Response). Acá lo destapamos para que llegue al cliente.
 */
export async function invokeManagePlayer<T = any>(
  payload: Record<string, any>
): Promise<InvokeResult<T>> {
  const { data, error } = await supabase.functions.invoke("manage-player", {
    body: payload,
  });

  if (error) {
    let msg = error.message;
    const ctx: any = (error as any).context;

    if (ctx && typeof ctx.clone === "function") {
      try {
        const body = await ctx.clone().json();
        if (body && typeof body === "object" && body.error) {
          msg = body.error;
        } else if (body) {
          msg = JSON.stringify(body);
        }
      } catch {
        try {
          const text = await ctx.clone().text();
          if (text) msg = text;
        } catch {}
      }
    }

    return { data: null, error: msg };
  }

  return { data: data as T, error: null };
}