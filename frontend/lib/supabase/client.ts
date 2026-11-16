import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Validates that the required Supabase environment variables are present.
 * Throws a descriptive error if either is missing or empty.
 */
function validateSupabaseConfig(): { url: string; key: string } {
  const missing: string[] = [];
  const url = supabaseUrl?.trim();
  const key = supabasePublishableKey?.trim();

  if (!url) {
    missing.push('NEXT_PUBLIC_SUPABASE_URL');
  }

  if (!key) {
    missing.push('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  }

  if (missing.length > 0 || !url || !key) {
    throw new Error(
      `[Supabase Configuration Error] Missing required environment variable(s): ${missing.join(
        ', '
      )}. Please verify your .env.local configuration.`
    );
  }

  return {
    url,
    key,
  };
}

/**
 * Factory function to create a new Supabase client instance with validated credentials.
 */
export function createSupabaseClient(): SupabaseClient {
  const { url, key } = validateSupabaseConfig();
  return createClient(url, key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

/**
 * Cached singleton instance for client-side reuse across components.
 */
let clientInstance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!clientInstance) {
    clientInstance = createSupabaseClient();
  }
  return clientInstance;
}

/**
 * Reusable Supabase client.
 * If credentials are present at module evaluation time, initializes immediately.
 * Otherwise, defers via proxy to throw a clear configuration error on first access.
 */
export const supabase: SupabaseClient = (() => {
  if (supabaseUrl && supabaseUrl.trim() && supabasePublishableKey && supabasePublishableKey.trim()) {
    clientInstance = createClient(supabaseUrl.trim(), supabasePublishableKey.trim(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    return clientInstance;
  }

  return new Proxy({} as SupabaseClient, {
    get(_target, prop) {
      const client = getSupabaseClient();
      const val = Reflect.get(client, prop);
      return typeof val === 'function' ? val.bind(client) : val;
    },
  });
})();

export default supabase;
