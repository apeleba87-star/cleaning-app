import 'dart:async';
import 'dart:io';

import 'package:flutter/foundation.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../core/db.dart';
import '../../core/errors.dart';
import '../../core/media_storage/media_storage.dart';
import '../capture/photo_processor.dart';
import 'retry_policy.dart';
import 'upload_job.dart';
import 'upload_queue_db.dart';

/// 재시도해도 결과가 같은 오류. 자동 재시도하지 않고 사용자에게 보여준다.
const _permanentCodes = {
  'photo_limit_exceeded',
  'company_mismatch',
  'invalid_storage_path',
  'asset_not_found',
  'file_invalid',
};

class _Permanent implements Exception {
  _Permanent(this.message);
  final String message;
}

class _Dropped implements Exception {}

/// 촬영 → 로컬 저장 → (DB pending 행 → Thumb → Full → mark_asset_uploaded) 를 순서대로 처리한다.
class UploadQueue extends ChangeNotifier {
  UploadQueue(this._db, this._storage, this._dir);

  static const concurrency = 2;

  final UploadQueueDb _db;
  final MediaStorage _storage;
  final Directory _dir;

  List<UploadJob> _jobs = [];
  final _inFlight = <String>{};
  final _inFlightKeys = <String>{};
  Timer? _timer;
  final _completed = StreamController<String>.broadcast();

  List<UploadJob> get jobs => _jobs;

  /// 업로드가 끝난 사진의 project_id. 화면이 서버 데이터를 다시 읽는 신호로 쓴다.
  Stream<String> get completedProjects => _completed.stream;

  static Future<UploadQueue> open(MediaStorage storage) async {
    final dir = Directory(p.join((await getApplicationDocumentsDirectory()).path, 'upload_queue'));
    await dir.create(recursive: true);
    final queue = UploadQueue(await UploadQueueDb.open(), storage, dir);
    await queue._reload();
    return queue;
  }

  List<UploadJob> jobsFor(String projectId) =>
      _jobs.where((j) => j.projectId == projectId).toList();

  /// 같은 pair+role 에 여러 작업이 있으면 가장 최근 촬영본.
  UploadJob? jobFor(String pairId, String role) {
    UploadJob? latest;
    for (final j in _jobs) {
      if (j.pairId == pairId && j.role == role) latest = j;
    }
    return latest;
  }

  Future<void> enqueue({
    required String assetId,
    required String companyId,
    required String projectId,
    required String pairId,
    required String role,
    required ProcessedPhoto photo,
  }) async {
    final fullFile = p.join(_dir.path, '$assetId.jpg');
    final thumbFile = p.join(_dir.path, '${assetId}_t.webp');
    await File(fullFile).writeAsBytes(photo.full, flush: true);
    await File(thumbFile).writeAsBytes(photo.thumb, flush: true);

    for (final previous in await _db.byPairRole(pairId, role)) {
      if (!_inFlight.contains(previous.assetId)) await _discard(previous);
    }

    await _db.insert(UploadJob(
      assetId: assetId,
      companyId: companyId,
      projectId: projectId,
      pairId: pairId,
      role: role,
      fullFile: fullFile,
      thumbFile: thumbFile,
      width: photo.width,
      height: photo.height,
      capturedAt: DateTime.now(),
    ));
    await _reload();
    kick();
  }

  Future<void> retry(UploadJob job) async {
    await _db.update(job.copyWith(state: JobState.pending, nextAttemptAt: 0, attempts: 0));
    await _reload();
    kick();
  }

  Future<void> discard(UploadJob job) async {
    if (_inFlight.contains(job.assetId)) return;
    await _discard(job);
    await _reload();
  }

  /// 대기 중인 작업을 지금 바로 다시 시도한다 (앱 복귀, 사용자 요청 시).
  Future<void> retryNow() async {
    for (final job in _jobs.where((j) => j.state == JobState.pending && j.nextAttemptAt > 0)) {
      await _db.update(job.copyWith(nextAttemptAt: 0));
    }
    await _reload();
    kick();
  }

  void kick() {
    _timer?.cancel();
    if (supabase.auth.currentSession == null) return;

    final now = DateTime.now().millisecondsSinceEpoch;
    for (final job in _jobs) {
      if (_inFlight.length >= concurrency) break;
      if (job.state != JobState.pending || job.nextAttemptAt > now) continue;
      if (_inFlight.contains(job.assetId) || _inFlightKeys.contains(job.pairRoleKey)) continue;
      _start(job);
    }

    final waiting = _jobs
        .where((j) => j.state == JobState.pending && j.nextAttemptAt > now)
        .map((j) => j.nextAttemptAt);
    if (waiting.isNotEmpty) {
      final next = waiting.reduce((a, b) => a < b ? a : b);
      _timer = Timer(Duration(milliseconds: next - now), kick);
    }
  }

  void _start(UploadJob job) {
    _inFlight.add(job.assetId);
    _inFlightKeys.add(job.pairRoleKey);
    _setState(job.copyWith(state: JobState.uploading));
    unawaited(_run(job).whenComplete(() {
      _inFlight.remove(job.assetId);
      _inFlightKeys.remove(job.pairRoleKey);
      kick();
    }));
  }

  Future<void> _run(UploadJob job) async {
    try {
      var current = job;
      if (!current.rowInserted) {
        await _insertRow(current);
        current = current.copyWith(rowInserted: true, state: JobState.uploading);
        await _db.update(current);
      }
      await _uploadFile(current.thumbFile, thumbPath(job.companyId, job.projectId, job.assetId), 'image/webp');
      await _uploadFile(current.fullFile, fullPath(job.companyId, job.projectId, job.assetId), 'image/jpeg');
      await _mark(current);
      await _discard(current);
      await _reload();
      _completed.add(job.projectId);
    } on _Dropped {
      await _discard(job);
      await _reload();
      _completed.add(job.projectId);
    } on _Permanent catch (e) {
      await _saveFailure(job, JobState.failed, e.message, 0);
    } catch (e) {
      debugPrint('upload retry ${job.assetId}: $e');
      final attempts = job.attempts + 1;
      final next = DateTime.now().add(backoffFor(attempts)).millisecondsSinceEpoch;
      await _saveFailure(job.copyWith(attempts: attempts), JobState.pending, friendlyError(e), next);
    }
  }

  Future<void> _insertRow(UploadJob job) async {
    try {
      // pair+role 에는 사진 1장만 허용된다. 다시 찍은 경우 이전 사진을 먼저 내린다.
      await fieldDb
          .from('media_assets')
          .update({'deleted_at': DateTime.now().toUtc().toIso8601String()})
          .eq('photo_pair_id', job.pairId)
          .eq('role', job.role)
          .neq('id', job.assetId)
          .isFilter('deleted_at', null);

      await fieldDb.from('media_assets').upsert({
        'id': job.assetId,
        'company_id': job.companyId,
        'project_id': job.projectId,
        'photo_pair_id': job.pairId,
        'role': job.role,
        'storage_path': fullPath(job.companyId, job.projectId, job.assetId),
        'thumb_path': thumbPath(job.companyId, job.projectId, job.assetId),
        'mime_type': 'image/jpeg',
        'width': job.width,
        'height': job.height,
        'captured_at': job.capturedAt.toUtc().toIso8601String(),
      }, onConflict: 'id', ignoreDuplicates: true);
    } on PostgrestException catch (e) {
      final code = serverErrorCode(e);
      if (code == 'photo_limit_exceeded' && await _rowExists(job.assetId)) return;
      if (code != null && _permanentCodes.contains(code)) throw _Permanent(friendlyError(e));
      if (e.code == '42501' || e.code == '23503') throw _Permanent(friendlyError(e));
      rethrow;
    }
  }

  Future<bool> _rowExists(String assetId) async =>
      (await fieldDb.from('media_assets').select('id').eq('id', assetId).maybeSingle()) != null;

  Future<void> _uploadFile(String localPath, String remotePath, String contentType) async {
    final file = File(localPath);
    if (!await file.exists()) throw _Permanent('사진 파일이 기기에 없습니다. 다시 촬영해 주세요.');
    await _storage.upload(remotePath, await file.readAsBytes(), contentType: contentType);
  }

  Future<void> _mark(UploadJob job) async {
    try {
      await fieldDb.rpc('mark_asset_uploaded', params: {'p_asset_id': job.assetId});
    } on PostgrestException catch (e) {
      final code = serverErrorCode(e);
      if (code == 'asset_deleted') throw _Dropped();
      if (code != null && _permanentCodes.contains(code)) throw _Permanent(friendlyError(e));
      rethrow;
    }
  }

  Future<void> _saveFailure(UploadJob job, JobState state, String message, int nextAttemptAt) async {
    if (!_jobs.any((j) => j.assetId == job.assetId)) return;
    await _db.update(job.copyWith(state: state, lastError: message, nextAttemptAt: nextAttemptAt));
    await _reload();
  }

  Future<void> _discard(UploadJob job) async {
    await _db.delete(job.assetId);
    for (final path in [job.fullFile, job.thumbFile]) {
      final file = File(path);
      if (await file.exists()) await file.delete();
    }
  }

  void _setState(UploadJob job) {
    _jobs = [for (final j in _jobs) j.assetId == job.assetId ? job : j];
    notifyListeners();
  }

  Future<void> _reload() async {
    final inFlight = _inFlight;
    _jobs = [
      for (final j in await _db.all())
        inFlight.contains(j.assetId) ? j.copyWith(state: JobState.uploading) : j,
    ];
    notifyListeners();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _completed.close();
    super.dispose();
  }
}
