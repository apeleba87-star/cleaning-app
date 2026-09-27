enum JobState { pending, uploading, failed }

class UploadJob {
  const UploadJob({
    required this.assetId,
    required this.companyId,
    required this.projectId,
    required this.pairId,
    required this.role,
    required this.fullFile,
    required this.thumbFile,
    required this.width,
    required this.height,
    required this.capturedAt,
    this.rowInserted = false,
    this.state = JobState.pending,
    this.attempts = 0,
    this.nextAttemptAt = 0,
    this.lastError,
  });

  final String assetId;
  final String companyId;
  final String projectId;
  final String pairId;
  final String role;
  final String fullFile;
  final String thumbFile;
  final int width;
  final int height;
  final DateTime capturedAt;
  final bool rowInserted;
  final JobState state;
  final int attempts;
  final int nextAttemptAt;
  final String? lastError;

  String get pairRoleKey => '$pairId:$role';

  UploadJob copyWith({
    bool? rowInserted,
    JobState? state,
    int? attempts,
    int? nextAttemptAt,
    String? lastError,
  }) =>
      UploadJob(
        assetId: assetId,
        companyId: companyId,
        projectId: projectId,
        pairId: pairId,
        role: role,
        fullFile: fullFile,
        thumbFile: thumbFile,
        width: width,
        height: height,
        capturedAt: capturedAt,
        rowInserted: rowInserted ?? this.rowInserted,
        state: state ?? this.state,
        attempts: attempts ?? this.attempts,
        nextAttemptAt: nextAttemptAt ?? this.nextAttemptAt,
        lastError: lastError ?? this.lastError,
      );

  Map<String, Object?> toRow() => {
        'asset_id': assetId,
        'company_id': companyId,
        'project_id': projectId,
        'pair_id': pairId,
        'role': role,
        'full_file': fullFile,
        'thumb_file': thumbFile,
        'width': width,
        'height': height,
        'captured_at': capturedAt.millisecondsSinceEpoch,
        'row_inserted': rowInserted ? 1 : 0,
        'state': state.name,
        'attempts': attempts,
        'next_attempt_at': nextAttemptAt,
        'last_error': lastError,
      };

  factory UploadJob.fromRow(Map<String, Object?> r) => UploadJob(
        assetId: r['asset_id'] as String,
        companyId: r['company_id'] as String,
        projectId: r['project_id'] as String,
        pairId: r['pair_id'] as String,
        role: r['role'] as String,
        fullFile: r['full_file'] as String,
        thumbFile: r['thumb_file'] as String,
        width: r['width'] as int,
        height: r['height'] as int,
        capturedAt: DateTime.fromMillisecondsSinceEpoch(r['captured_at'] as int),
        rowInserted: r['row_inserted'] == 1,
        state: JobState.values.byName(r['state'] as String),
        attempts: r['attempts'] as int,
        nextAttemptAt: r['next_attempt_at'] as int,
        lastError: r['last_error'] as String?,
      );
}
