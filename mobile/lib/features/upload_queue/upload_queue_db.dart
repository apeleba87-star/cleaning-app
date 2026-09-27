import 'package:path/path.dart' as p;
import 'package:sqflite/sqflite.dart';

import 'upload_job.dart';

class UploadQueueDb {
  UploadQueueDb._(this._db);

  final Database _db;

  static Future<UploadQueueDb> open() async {
    final db = await openDatabase(
      p.join(await getDatabasesPath(), 'upload_queue.db'),
      version: 1,
      onCreate: (db, _) => db.execute('''
        CREATE TABLE jobs (
          asset_id TEXT PRIMARY KEY,
          company_id TEXT NOT NULL,
          project_id TEXT NOT NULL,
          pair_id TEXT NOT NULL,
          role TEXT NOT NULL,
          full_file TEXT NOT NULL,
          thumb_file TEXT NOT NULL,
          width INTEGER NOT NULL,
          height INTEGER NOT NULL,
          captured_at INTEGER NOT NULL,
          row_inserted INTEGER NOT NULL DEFAULT 0,
          state TEXT NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0,
          next_attempt_at INTEGER NOT NULL DEFAULT 0,
          last_error TEXT
        )'''),
    );
    // 앱이 업로드 도중 종료됐다면 다시 대기 상태로 돌린다.
    await db.update('jobs', {'state': JobState.pending.name},
        where: 'state = ?', whereArgs: [JobState.uploading.name]);
    return UploadQueueDb._(db);
  }

  Future<void> insert(UploadJob job) =>
      _db.insert('jobs', job.toRow(), conflictAlgorithm: ConflictAlgorithm.ignore);

  Future<void> update(UploadJob job) =>
      _db.update('jobs', job.toRow(), where: 'asset_id = ?', whereArgs: [job.assetId]);

  Future<void> delete(String assetId) =>
      _db.delete('jobs', where: 'asset_id = ?', whereArgs: [assetId]);

  Future<List<UploadJob>> all() async =>
      (await _db.query('jobs', orderBy: 'captured_at')).map(UploadJob.fromRow).toList();

  Future<List<UploadJob>> byPairRole(String pairId, String role) async =>
      (await _db.query('jobs', where: 'pair_id = ? AND role = ?', whereArgs: [pairId, role]))
          .map(UploadJob.fromRow)
          .toList();
}
