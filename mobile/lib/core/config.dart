/// 빌드 시 `--dart-define` 으로 주입한다. Service Role Key는 앱에 절대 넣지 않는다.
class AppConfig {
  static const supabaseUrl = String.fromEnvironment('SUPABASE_URL');
  static const supabaseAnonKey = String.fromEnvironment('SUPABASE_ANON_KEY');

  /// 고객 Report 링크의 origin. 예: https://example.com (끝에 / 없음)
  static const reportBaseUrl = String.fromEnvironment('REPORT_BASE_URL');

  static List<String> missingKeys() => [
        if (supabaseUrl.isEmpty) 'SUPABASE_URL',
        if (supabaseAnonKey.isEmpty) 'SUPABASE_ANON_KEY',
        if (reportBaseUrl.isEmpty) 'REPORT_BASE_URL',
      ];

  static String reportUrl(String token) => '$reportBaseUrl/r/$token';
}
