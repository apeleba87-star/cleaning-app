import 'dart:async';
import 'dart:io';

import 'package:supabase_flutter/supabase_flutter.dart';

const _messages = {
  'company_already_exists': '이미 등록된 업체가 있습니다.',
  'photo_limit_exceeded': '이 현장에 올릴 수 있는 사진 수를 넘었습니다.',
  'project_not_found': '현장을 찾을 수 없습니다.',
  'asset_not_found': '사진 정보를 찾을 수 없습니다.',
  'asset_deleted': '삭제된 사진입니다.',
  'file_missing': '사진 파일 업로드가 끝나지 않았습니다.',
  'file_invalid': '사진 파일 형식이나 크기가 올바르지 않습니다.',
  'company_mismatch': '권한이 없는 요청입니다.',
  'invalid_storage_path': '사진 경로가 올바르지 않습니다.',
  'not_authenticated': '다시 로그인해 주세요.',
  'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
  'Email not confirmed': '이메일 인증을 먼저 완료해 주세요.',
};

/// 서버가 RAISE 한 코드(예: photo_limit_exceeded)를 꺼낸다.
String? serverErrorCode(Object error) {
  final message = switch (error) {
    PostgrestException e => e.message,
    AuthException e => e.message,
    StorageException e => e.message,
    _ => null,
  };
  if (message == null) return null;
  for (final key in _messages.keys) {
    if (message.contains(key)) return key;
  }
  return null;
}

bool isNetworkError(Object error) =>
    error is SocketException ||
    error is TimeoutException ||
    error is HttpException ||
    (error is AuthRetryableFetchException);

String friendlyError(Object error) {
  if (isNetworkError(error)) return '네트워크 연결을 확인해 주세요.';
  final code = serverErrorCode(error);
  if (code != null) return _messages[code]!;
  return '문제가 발생했습니다. 잠시 후 다시 시도해 주세요.';
}
