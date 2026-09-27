import 'dart:typed_data';

import 'package:supabase_flutter/supabase_flutter.dart';

import 'media_storage.dart';

class SupabaseMediaStorage implements MediaStorage {
  SupabaseMediaStorage(this._client);

  final SupabaseClient _client;

  static const _ttlSeconds = 3600;
  static const _reuseMargin = Duration(minutes: 5);
  static const _batchSize = 20;

  final _cache = <String, ({String url, DateTime expiresAt})>{};

  @override
  String get provider => 'supabase';

  @override
  String get bucket => 'project-media';

  @override
  Future<void> upload(String path, Uint8List bytes, {required String contentType}) async {
    try {
      await _client.storage.from(bucket).uploadBinary(
            path,
            bytes,
            fileOptions: FileOptions(contentType: contentType, upsert: false),
          );
    } on StorageException catch (e) {
      if (_isDuplicate(e)) return;
      rethrow;
    }
  }

  static bool _isDuplicate(StorageException e) =>
      e.statusCode == '409' ||
      e.error == 'Duplicate' ||
      e.message.toLowerCase().contains('already exists');

  @override
  Future<Map<String, String>> signedUrls(List<String> paths) async {
    final now = DateTime.now();
    final result = <String, String>{};
    final missing = <String>[];
    for (final path in paths.toSet()) {
      final cached = _cache[path];
      if (cached != null && cached.expiresAt.isAfter(now)) {
        result[path] = cached.url;
      } else {
        missing.add(path);
      }
    }

    for (var i = 0; i < missing.length; i += _batchSize) {
      final batch = missing.sublist(i, (i + _batchSize).clamp(0, missing.length));
      final signed = await _client.storage.from(bucket).createSignedUrlsResult(batch, _ttlSeconds);
      final expiresAt = now.add(const Duration(seconds: _ttlSeconds) - _reuseMargin);
      for (final item in signed) {
        if (item is SignedUrlSuccess) {
          _cache[item.path] = (url: item.signedUrl, expiresAt: expiresAt);
          result[item.path] = item.signedUrl;
        }
      }
    }
    return result;
  }
}
