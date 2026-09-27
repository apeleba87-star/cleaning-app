import 'dart:typed_data';

/// 사진 파일 저장소의 교체 지점. DB에는 provider / bucket / storage_path 만 저장하고
/// URL 생성과 업로드는 이 인터페이스로만 한다 (R2/S3 이전 시 구현만 교체).
abstract class MediaStorage {
  String get provider;
  String get bucket;

  /// 같은 경로에 이미 파일이 있으면 성공으로 본다 (재시도 idempotent).
  Future<void> upload(String path, Uint8List bytes, {required String contentType});

  /// 여러 경로를 한 번에 서명한다. 결과는 경로 → URL.
  Future<Map<String, String>> signedUrls(List<String> paths);
}

String mediaPrefix(String companyId, String projectId, String assetId) =>
    'companies/$companyId/projects/$projectId/$assetId';

String fullPath(String companyId, String projectId, String assetId) =>
    '${mediaPrefix(companyId, projectId, assetId)}.jpg';

String thumbPath(String companyId, String projectId, String assetId) =>
    '${mediaPrefix(companyId, projectId, assetId)}_t.webp';
