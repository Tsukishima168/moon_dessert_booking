-- Add points column to profiles if it doesn't exist
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Add line_user_id column to profiles for linking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS line_user_id TEXT;

-- Create index on line_user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON public.profiles(line_user_id);

-- Create point_logs table to track history
CREATE TABLE IF NOT EXISTS public.point_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    reason TEXT NOT NULL, -- e.g., 'order_reward', 'redeem', 'manual_adjustment'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

-- Policies for point_logs
CREATE POLICY "Users can view their own point logs" 
ON public.point_logs FOR SELECT 
USING (auth.uid() = user_id);

-- Only service role or admin should be able to insert/update point logs directly
-- (For now, we might rely on RPC functions to handle point changes safely)

-- RPC function to add/deduct points safely
CREATE OR REPLACE FUNCTION public.manage_user_points(
    p_user_id UUID,
    p_amount INTEGER,
    p_reason TEXT,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_balance INTEGER;
    current_balance INTEGER;
BEGIN
    -- Get current balance (lock the row to prevent race conditions)
    SELECT points INTO current_balance FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found';
    END IF;

    -- Calculate new balance
    new_balance := current_balance + p_amount;

    -- Prevent negative balance if deducting (optional, depends on business logic)
    IF new_balance < 0 THEN
        RAISE EXCEPTION 'Insufficient points';
    END IF;

    -- Update profile
    UPDATE public.profiles SET points = new_balance WHERE id = p_user_id;

    -- Log the transaction
    INSERT INTO public.point_logs (user_id, amount, reason, metadata)
    VALUES (p_user_id, p_amount, p_reason, p_metadata);

    RETURN jsonb_build_object(
        'success', true,
        'new_balance', new_balance,
        'amount_changed', p_amount
    );
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'error', SQLERRM
    );
END;
$$;
