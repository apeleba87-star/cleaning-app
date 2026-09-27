import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../upload_queue/upload_job.dart';
import 'models.dart';

/// Before / After 한 칸. 업로드 전이면 로컬 썸네일, 끝났으면 서버 썸네일(Signed URL)을 보여준다.
class PhotoSlot extends StatelessWidget {
  const PhotoSlot({
    super.key,
    required this.role,
    this.asset,
    this.job,
    this.thumbUrl,
    this.busy = false,
    required this.onTap,
  });

  final MediaRole role;
  final MediaAsset? asset;
  final UploadJob? job;
  final String? thumbUrl;
  final bool busy;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final scheme = Theme.of(context).colorScheme;
    final decodeWidth = (160 * MediaQuery.devicePixelRatioOf(context)).round();

    Widget content;
    if (busy) {
      content = const Center(child: CircularProgressIndicator());
    } else if (job != null) {
      content = Stack(fit: StackFit.expand, children: [
        Image.file(File(job!.thumbFile), fit: BoxFit.cover, cacheWidth: decodeWidth),
        Positioned(right: 4, bottom: 4, child: _JobBadge(job: job!)),
      ]);
    } else if (asset != null && asset!.uploaded && thumbUrl != null) {
      content = CachedNetworkImage(
        imageUrl: thumbUrl!,
        cacheKey: '${asset!.id}_t',
        fit: BoxFit.cover,
        memCacheWidth: decodeWidth,
        errorWidget: (_, _, _) => const Icon(Icons.broken_image_outlined),
      );
    } else if (asset != null) {
      content = const Center(child: Icon(Icons.hourglass_empty));
    } else {
      content = Column(mainAxisAlignment: MainAxisAlignment.center, children: [
        Icon(Icons.add_a_photo_outlined, color: scheme.primary),
        const SizedBox(height: 4),
        Text(role.label, style: Theme.of(context).textTheme.labelMedium),
      ]);
    }

    return AspectRatio(
      aspectRatio: 1,
      child: Material(
        color: scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(8),
        clipBehavior: Clip.antiAlias,
        child: InkWell(onTap: busy ? null : onTap, child: content),
      ),
    );
  }
}

class _JobBadge extends StatelessWidget {
  const _JobBadge({required this.job});

  final UploadJob job;

  @override
  Widget build(BuildContext context) {
    final (icon, color) = switch (job.state) {
      JobState.uploading => (Icons.cloud_upload, Colors.blue),
      JobState.pending => (Icons.schedule, Colors.orange),
      JobState.failed => (Icons.error, Colors.red),
    };
    return DecoratedBox(
      decoration: const BoxDecoration(color: Colors.white, shape: BoxShape.circle),
      child: Padding(padding: const EdgeInsets.all(2), child: Icon(icon, size: 18, color: color)),
    );
  }
}
