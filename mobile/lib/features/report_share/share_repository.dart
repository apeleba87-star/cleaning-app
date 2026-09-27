import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import '../../core/config.dart';
import '../../core/db.dart';
import '../projects/models.dart';

/// 서버에는 token 의 sha256 만 저장된다. 원문 링크는 생성 직후 한 번만 받으므로
/// 이 기기의 secure storage 에 보관해 다시 보내기에 쓴다.
class ShareRepository {
  ShareRepository([FlutterSecureStorage? storage]) : _secure = storage ?? const FlutterSecureStorage();

  final FlutterSecureStorage _secure;

  static String _key(String shareId) => 'report_share_token:$shareId';

  Future<List<ReportShare>> list(String projectId) async {
    final rows = await fieldDb
        .from('report_shares')
        .select('id,status,created_at,view_count,last_viewed_at')
        .eq('project_id', projectId)
        .order('created_at', ascending: false)
        .limit(20);
    return rows.map(ReportShare.fromJson).toList();
  }

  Future<String> create(String projectId) async {
    final rows = await fieldDb.rpc('create_report_share', params: {'p_project_id': projectId}) as List;
    final row = rows.first as Map<String, dynamic>;
    final shareId = row['share_id'] as String;
    final token = row['token'] as String;
    await _secure.write(key: _key(shareId), value: token);
    return AppConfig.reportUrl(token);
  }

  /// 이 기기에서 만든 링크만 다시 보낼 수 있다. 없으면 null.
  Future<String?> savedUrl(String shareId) async {
    final token = await _secure.read(key: _key(shareId));
    return token == null ? null : AppConfig.reportUrl(token);
  }

  Future<void> revoke(String shareId) async {
    await fieldDb.from('report_shares').update({'status': 'revoked'}).eq('id', shareId);
    await _secure.delete(key: _key(shareId));
  }
}

final shareRepository = ShareRepository();
