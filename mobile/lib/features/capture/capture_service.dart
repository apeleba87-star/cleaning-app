import 'dart:io';

import 'package:image_picker/image_picker.dart';
import 'package:path/path.dart' as p;
import 'package:path_provider/path_provider.dart';
import 'package:uuid/uuid.dart';

import '../upload_queue/upload_queue.dart';
import 'photo_processor.dart';

class CaptureService {
  CaptureService(this._queue);

  final UploadQueue _queue;
  final _picker = ImagePicker();
  static const _uuid = Uuid();

  /// 촬영(또는 앨범 선택) → 압축 → Queue 등록. 취소하면 false.
  Future<bool> capture({
    required ImageSource source,
    required String companyId,
    required String projectId,
    required String pairId,
    required String role,
  }) async {
    final picked = await _picker.pickImage(source: source, requestFullMetadata: false);
    if (picked == null) return false;
    try {
      final photo = await PhotoProcessor.process(picked.path);
      await _queue.enqueue(
        assetId: _uuid.v4(),
        companyId: companyId,
        projectId: projectId,
        pairId: pairId,
        role: role,
        photo: photo,
      );
      return true;
    } finally {
      // picker 가 앱 임시 폴더에 만든 사본(EXIF 포함)만 지운다. 앨범 원본은 건드리지 않는다.
      final temp = (await getTemporaryDirectory()).path;
      final file = File(picked.path);
      if (p.isWithin(temp, file.path) && await file.exists()) await file.delete();
    }
  }
}
