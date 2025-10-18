import { supabase } from '@/integrations/supabase/client'
import { monitorRpcCall } from './errorMonitoring'

export type RpcOptions = { 
  timeoutMs?: number
  retries?: number 
  baseDelayMs?: number 
}

export type RpcResult<T> =
  | { ok: true; data: T; error: null; meta: { attempts: number; durationMs: number; source: 'rpc' } }
  | { ok: false; data: null; error: any; meta: { attempts: number; durationMs: number; source: 'rpc' | 'circuit_open' } }

// Simple circuit breaker state
const CB: Record<string, { failures: number; openUntil: number }> = {}
const THRESHOLD = 3
const COOLDOWN = 15_000

const isOpen = (proc: string) => {
  const st = CB[proc]
  return !!st && Date.now() < st.openUntil
}

const recordFailure = (proc: string) => {
  const st = CB[proc] || { failures: 0, openUntil: 0 }
  st.failures += 1
  if (st.failures >= THRESHOLD) {
    st.openUntil = Date.now() + COOLDOWN
  }
  CB[proc] = st
}

const recordSuccess = (proc: string) => {
  CB[proc] = { failures: 0, openUntil: 0 }
}

const sleep = (ms: number) => new Promise(res => setTimeout(res, ms))
const jitter = (ms: number) => ms + Math.floor(Math.random() * ms * 0.4) - ms * 0.2

export async function callRpc<T = any>(
  proc: string, 
  args?: Record<string, any>, 
  options?: RpcOptions
): Promise<RpcResult<T>> {
  const timeoutMs = options?.timeoutMs ?? 3000
  const baseDelayMs = options?.baseDelayMs ?? 250
  let retries = Math.max(0, options?.retries ?? 1)
  
  const start = performance.now()
  
  if (isOpen(proc)) {
    const durationMs = performance.now() - start
    console.warn(`[rpc] Circuit open for ${proc}`)
    return { 
      ok: false, 
      data: null, 
      error: new Error('circuit_open'), 
      meta: { attempts: 0, durationMs, source: 'circuit_open' } 
    }
  }

  let attempts = 0
  while (true) {
    attempts += 1
    try {
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      )
      
      const rpcPromise = (async () => {
        const { data, error } = await supabase.rpc(proc, args)
        if (error) throw error
        return data as T
      })()

      const data = await Promise.race([rpcPromise, timeoutPromise])
      
      recordSuccess(proc)
      const durationMs = performance.now() - start
      
      console.log(`[rpc] ${proc} succeeded in ${durationMs.toFixed(1)}ms (${attempts} attempts)`)
      
      // Monitor RPC performance
      monitorRpcCall(proc, durationMs, true)
      
      return { 
        ok: true, 
        data, 
        error: null, 
        meta: { attempts, durationMs, source: 'rpc' } 
      }
      
    } catch (error) {
      const durationMs = performance.now() - start
      
      if (retries > 0) {
        retries -= 1
        const delay = jitter(baseDelayMs * Math.pow(2, attempts - 1))
        console.warn(`[rpc] ${proc} failed, retrying in ${delay}ms (${retries} retries left)`)
        await sleep(delay)
        continue
      }
      
      recordFailure(proc)
      console.error(`[rpc] ${proc} failed after ${attempts} attempts in ${durationMs.toFixed(1)}ms:`, error)
      
      // Monitor RPC failure
      monitorRpcCall(proc, durationMs, false)
      
      return { 
        ok: false, 
        data: null, 
        error, 
        meta: { attempts, durationMs, source: 'rpc' } 
      }
    }
  }
}
