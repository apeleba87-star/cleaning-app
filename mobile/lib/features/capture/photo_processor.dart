import 'dart:io';
import 'dart:typed_data';
import 'dart:ui' as ui;

import 'package:flutter_image_compress/flutter_image_compress.dart';

class ProcessedPhoto {
  const ProcessedPhoto({
    required this.full,
    required this.thumb,
    required this.width,
    required this.height,
  });

  final Uint8List full;
  final Uint8List thumb;
  final int width;
  final int height;
}

class PhotoTooLargeException implements Exception {}

/// 원본은 업로드하지 않는다. 재인코딩(keepExif: false)으로 GPS 등 EXIF 가 제거된다.
class PhotoProcessor {
  static const fullLongEdge = 1600;
  static const thumbShortEdge = 320;
  static const maxFullBytes = 1024 * 1024;
  static const maxThumbBytes = 100 * 1024;
  static const _fullQualities = [80, 70, 60, 50];
  static const _thumbQualities = [70, 55, 40];

  static Future<ProcessedPhoto> process(String sourcePath) async {
    final (srcW, srcH) = await _dimensions(await File(sourcePath).readAsBytes());

    final scale = _max(1.0, _max(srcW, srcH) / fullLongEdge);
    final fullMin = (_min(srcW, srcH) / scale).round();

    Uint8List? full;
    for (final q in _fullQualities) {
      full = await _compress(sourcePath, fullMin, q, CompressFormat.jpeg);
      if (full.length <= maxFullBytes) break;
    }
    if (full == null || full.length > maxFullBytes) throw PhotoTooLargeException();

    Uint8List? thumb;
    for (final q in _thumbQualities) {
      thumb = await _compress(sourcePath, thumbShortEdge, q, CompressFormat.webp);
      if (thumb.length <= maxThumbBytes) break;
    }
    if (thumb == null || thumb.length > maxThumbBytes) throw PhotoTooLargeException();

    final (w, h) = await _dimensions(full);
    return ProcessedPhoto(full: full, thumb: thumb, width: w, height: h);
  }

  /// flutter_image_compress 는 min(w/minW, h/minH) 로 축소 비율을 정한다.
  /// minW = minH = m 이면 짧은 변이 m 이 되고, 방향(EXIF 회전)과 무관하게 같은 결과가 나온다.
  static Future<Uint8List> _compress(String path, int shortEdge, int quality, CompressFormat format) async {
    final bytes = await FlutterImageCompress.compressWithFile(
      path,
      minWidth: shortEdge,
      minHeight: shortEdge,
      quality: quality,
      format: format,
      keepExif: false,
      autoCorrectionAngle: true,
    );
    if (bytes == null) throw const FileSystemException('compress_failed');
    return bytes;
  }

  static Future<(int, int)> _dimensions(Uint8List bytes) async {
    final buffer = await ui.ImmutableBuffer.fromUint8List(bytes);
    final descriptor = await ui.ImageDescriptor.encoded(buffer);
    final size = (descriptor.width, descriptor.height);
    descriptor.dispose();
    buffer.dispose();
    return size;
  }

  static num _max(num a, num b) => a > b ? a : b;
  static num _min(num a, num b) => a < b ? a : b;
}
