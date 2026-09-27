import 'package:mupl_field/core/media_storage/media_storage.dart';
import 'package:mupl_field/features/projects/address_parser.dart';
import 'package:mupl_field/features/projects/format.dart';
import 'package:mupl_field/features/upload_queue/retry_policy.dart';
import 'package:mupl_field/features/upload_queue/upload_job.dart';
import 'package:test/test.dart';

void main() {
  group('storage paths (migrations/field_001_initial.sql tg_check_media_asset 와 동일 규칙)', () {
    const c = '11111111-1111-4111-8111-111111111111';
    const p = '22222222-2222-4222-8222-222222222222';
    const a = '33333333-3333-4333-8333-333333333333';

    test('full / thumb', () {
      expect(fullPath(c, p, a), 'companies/$c/projects/$p/$a.jpg');
      expect(thumbPath(c, p, a), 'companies/$c/projects/$p/${a}_t.webp');
    });
  });

  group('backoff', () {
    test('5s → 30s → 2m → 10m, 이후 10m 유지', () {
      expect(backoffFor(1), const Duration(seconds: 5));
      expect(backoffFor(2), const Duration(seconds: 30));
      expect(backoffFor(3), const Duration(minutes: 2));
      expect(backoffFor(4), const Duration(minutes: 10));
      expect(backoffFor(9), const Duration(minutes: 10));
    });
  });

  group('UploadJob', () {
    test('SQLite row 왕복', () {
      final job = UploadJob(
        assetId: 'a',
        companyId: 'c',
        projectId: 'p',
        pairId: 'pp',
        role: 'before',
        fullFile: '/x/a.jpg',
        thumbFile: '/x/a_t.webp',
        width: 1600,
        height: 1200,
        capturedAt: DateTime.fromMillisecondsSinceEpoch(1700000000000),
        rowInserted: true,
        state: JobState.failed,
        attempts: 3,
        nextAttemptAt: 42,
        lastError: 'e',
      );
      final back = UploadJob.fromRow(job.toRow());
      expect(back.toRow(), job.toRow());
      expect(back.pairRoleKey, 'pp:before');
    });
  });

  group('parsePostcodeResult', () {
    test('도로명 주소 → 시/도, 시/군/구 코드', () {
      final r = parsePostcodeResult({
        'bcode': '1168010100',
        'sigunguCode': '11680',
        'sido': '서울',
        'sigungu': '강남구',
        'roadAddress': '서울 강남구 테헤란로 1',
      })!;
      expect(r.roadAddress, '서울 강남구 테헤란로 1');
      expect(r.region!.sidoCode, '11');
      expect(r.region!.sigunguCode, '11680');
      expect(r.region!.label, '서울 강남구');
    });

    test('세종: 시/군/구 이름 없음', () {
      final r = parsePostcodeResult({
        'bcode': '3611011000',
        'sigunguCode': '36110',
        'sido': '세종특별자치시',
        'sigungu': '',
        'roadAddress': '세종특별자치시 한누리대로 1',
      })!;
      expect(r.region!.sigunguCode, '36110');
      expect(r.region!.sigunguName, isNull);
      expect(r.region!.label, '세종특별자치시');
    });

    test('시/도와 맞지 않는 sigunguCode 는 버린다 (DB region_code_consistent)', () {
      final r = parsePostcodeResult({
        'bcode': '1168010100',
        'sigunguCode': '41135',
        'sido': '서울',
        'sigungu': '강남구',
        'roadAddress': '서울 강남구 테헤란로 1',
      })!;
      expect(r.region!.sigunguCode, isNull);
    });

    test('도로명 없으면 지번, 둘 다 없으면 null', () {
      expect(
        parsePostcodeResult({'bcode': '1168010100', 'jibunAddress': '서울 강남구 역삼동 1'})!.roadAddress,
        '서울 강남구 역삼동 1',
      );
      expect(parsePostcodeResult({'bcode': '1168010100'}), isNull);
    });
  });

  test('toDateColumn', () {
    expect(toDateColumn(DateTime(2026, 9, 7)), '2026-09-07');
  });
}
