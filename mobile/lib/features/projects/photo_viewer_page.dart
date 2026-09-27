import 'dart:io';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';

import '../../app.dart';
import '../../core/errors.dart';
import 'models.dart';

/// 크게 보기. Full 이미지는 이 화면을 열 때만 한 장 서명해서 받는다.
class PhotoViewerPage extends StatefulWidget {
  const PhotoViewerPage({super.key, this.asset, this.localFile, required this.title});

  final MediaAsset? asset;
  final String? localFile;
  final String title;

  @override
  State<PhotoViewerPage> createState() => _PhotoViewerPageState();
}

class _PhotoViewerPageState extends State<PhotoViewerPage> {
  Future<String?>? _url;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final asset = widget.asset;
    if (_url == null && widget.localFile == null && asset != null) {
      final storage = ServicesScope.of(context).storage;
      _url = storage.signedUrls([asset.storagePath]).then((m) => m[asset.storagePath]);
    }
  }

  @override
  Widget build(BuildContext context) {
    Widget image;
    if (widget.localFile != null) {
      image = Image.file(File(widget.localFile!));
    } else {
      image = FutureBuilder<String?>(
        future: _url,
        builder: (context, snap) {
          if (snap.hasError) {
            return Text(friendlyError(snap.error!), style: const TextStyle(color: Colors.white));
          }
          final url = snap.data;
          if (url == null) return const CircularProgressIndicator();
          return CachedNetworkImage(
            imageUrl: url,
            cacheKey: '${widget.asset!.id}_f',
            placeholder: (_, _) => const CircularProgressIndicator(),
          );
        },
      );
    }
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        title: Text(widget.title),
      ),
      body: InteractiveViewer(maxScale: 4, child: Center(child: image)),
    );
  }
}
