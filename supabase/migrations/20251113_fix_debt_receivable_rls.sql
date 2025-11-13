-- Fix RLS Policy for debt_receivable table
-- Allow superadmin, leader, and admin to manage debt_receivable

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can view debt_receivable" ON public.debt_receivable;
DROP POLICY IF EXISTS "Superadmin and Admin can manage debt_receivable" ON public.debt_receivable;

-- Create new policies
CREATE POLICY "Everyone can view debt_receivable" ON public.debt_receivable FOR SELECT USING (true);

CREATE POLICY "Superadmin, Leader and Admin can manage debt_receivable" ON public.debt_receivable FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE user_id = auth.uid() AND role IN ('superadmin', 'leader', 'admin'))
);
