import { createClient } from "@supabase/supabase-js";

/**
 * SQL Migration Helper - Run SQL queries on Supabase
 * This helper uses admin access to run migrations
 */

const SUPABASE_URL = "https://degfdhoxmuzmccsouxnk.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Note: SERVICE_ROLE_KEY should be stored in .env.local for local testing
// In production, use environment variables from your deployment platform

export async function runSQLMigration(sql: string): Promise<void> {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Cannot run SQL migrations. " +
      "Please set the environment variable or run migrations directly in Supabase dashboard."
    );
    return;
  }

  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // Execute raw SQL
    const { data, error } = await adminClient.rpc("execute_sql", {
      sql_query: sql,
    });

    if (error) {
      console.error("SQL Migration Error:", error);
      throw error;
    }

    console.log("SQL Migration executed successfully:", data);
  } catch (error) {
    console.error("Failed to run SQL migration:", error);
    throw error;
  }
}

/**
 * Fix debt_receivable RLS policy to allow leaders
 */
export async function fixDebtReceivableRLS(): Promise<void> {
  const sql = `
    -- Drop existing policies
    DROP POLICY IF EXISTS "Everyone can view debt_receivable" ON public.debt_receivable;
    DROP POLICY IF EXISTS "Superadmin and Admin can manage debt_receivable" ON public.debt_receivable;

    -- Create new policies
    CREATE POLICY "Everyone can view debt_receivable" ON public.debt_receivable FOR SELECT USING (true);

    CREATE POLICY "Superadmin, Leader and Admin can manage debt_receivable" ON public.debt_receivable FOR ALL USING (
      EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader', 'admin'))
    );
  `;

  await runSQLMigration(sql);
}
