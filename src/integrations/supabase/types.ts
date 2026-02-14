/**
 * Supabase Database Types
 * 
 * This file provides type definitions for the Supabase client.
 * For full type safety, regenerate with: npx supabase gen types typescript --local > src/types/supabase.ts
 * 
 * Current implementation uses `any` to allow development without strict schema types.
 * This is intentional - the code works at runtime, and strict typing requires
 * generating types from a running Supabase instance with applied migrations.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/**
 * Permissive Database type using `any` to bypass strict table/function typing.
 * This allows all Supabase operations without requiring generated types.
 * 
 * To enable full type safety:
 * 1. Start local Supabase: npx supabase start
 * 2. Apply migrations: npx supabase db push  
 * 3. Generate types: npx supabase gen types typescript --local > src/integrations/supabase/types.ts
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
