-- 사용자 세션 관리 테이블 생성
CREATE TABLE IF NOT EXISTS public.user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL, -- Supabase 세션 ID 또는 고유 세션 식별자
  role TEXT NOT NULL, -- 사용자 역할
  ip_address TEXT,
  user_agent TEXT,
  login_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE, -- 세션 만료 시간
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 중복 세션 방지
  UNIQUE(user_id, session_id)
);

-- 인덱스 생성 (조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_role ON public.user_sessions(role);
CREATE INDEX IF NOT EXISTS idx_user_sessions_last_activity ON public.user_sessions(last_activity_at);
CREATE INDEX IF NOT EXISTS idx_user_sessions_active ON public.user_sessions(user_id, last_activity_at) WHERE expires_at IS NULL OR expires_at > NOW();

-- RLS 정책 설정
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 세션만 조회 가능
CREATE POLICY "Users can view their own sessions"
  ON public.user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

-- 서비스 역할로 모든 작업 가능 (API에서 사용)
-- 실제로는 서비스 역할을 사용하므로 별도 정책 불필요

-- 만료된 세션 자동 정리 함수 (선택사항)
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- 30분 이상 비활성 세션 삭제
  DELETE FROM public.user_sessions
  WHERE last_activity_at < NOW() - INTERVAL '30 minutes';
END;
$$;

-- 주기적으로 만료된 세션 정리 (선택사항 - pg_cron이 활성화된 경우)
-- SELECT cron.schedule('cleanup-sessions', '*/5 * * * *', 'SELECT public.cleanup_expired_sessions()');
