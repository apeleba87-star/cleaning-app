import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../../app.dart';
import '../../core/errors.dart';
import '../projects/format.dart';
import '../projects/models.dart';
import 'share_repository.dart';

class SharePage extends StatefulWidget {
  const SharePage({super.key, required this.project});

  final Project project;

  @override
  State<SharePage> createState() => _SharePageState();
}

class _SharePageState extends State<SharePage> {
  late Future<List<ReportShare>> _shares = shareRepository.list(widget.project.id);
  bool _busy = false;

  void _reload() => setState(() => _shares = shareRepository.list(widget.project.id));

  Future<void> _send(String url) => SharePlus.instance.share(
        ShareParams(text: '${widget.project.title} 작업 보고서\n$url', subject: '작업 보고서'),
      );

  Future<void> _create() async {
    final pending = ServicesScope.of(context).queue.jobsFor(widget.project.id).length;
    if (pending > 0) {
      final ok = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text('업로드 중인 사진 $pending장이 있습니다.\n업로드가 끝난 사진만 보고서에 보입니다. 링크를 만들까요?'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('기다리기')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('만들기')),
          ],
        ),
      );
      if (ok != true) return;
    }
    setState(() => _busy = true);
    try {
      final url = await shareRepository.create(widget.project.id);
      _reload();
      await _send(url);
    } catch (e) {
      _snack(friendlyError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _resend(ReportShare share) async {
    final url = await shareRepository.savedUrl(share.id);
    if (url == null) {
      _snack('이 기기에서 만든 링크가 아니라 다시 보낼 수 없습니다. 새 링크를 만들어 주세요.');
      return;
    }
    await _send(url);
  }

  Future<void> _revoke(ReportShare share) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        content: const Text('이 링크를 폐기할까요? 고객이 더 이상 보고서를 열 수 없습니다.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
          FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('폐기')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await shareRepository.revoke(share.id);
      _reload();
    } catch (e) {
      _snack(friendlyError(e));
    }
  }

  void _snack(String message) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('보고서 링크')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('링크를 받은 고객은 로그인 없이 작업 전·후 사진을 볼 수 있습니다. '
              '고객 이름, 연락처, 상세 주소, 메모는 보고서에 표시되지 않습니다.'),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: _busy ? null : _create,
            icon: const Icon(Icons.link),
            label: const Text('새 링크 만들고 보내기'),
          ),
          const SizedBox(height: 24),
          FutureBuilder<List<ReportShare>>(
            future: _shares,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) {
                return const Center(child: CircularProgressIndicator());
              }
              if (snap.hasError) {
                return TextButton(onPressed: _reload, child: Text('${friendlyError(snap.error!)} 다시 시도'));
              }
              final shares = snap.data!;
              if (shares.isEmpty) return const Text('아직 만든 링크가 없습니다.');
              return Column(children: [
                for (final s in shares)
                  ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(s.active ? Icons.link : Icons.link_off),
                    title: Text('${formatDateTime(s.createdAt)} 생성'),
                    subtitle: Text([
                      s.active ? '사용 중' : '폐기됨',
                      '열람 ${s.viewCount}회',
                      if (s.lastViewedAt != null) '최근 ${formatDateTime(s.lastViewedAt!)}',
                    ].join(' · ')),
                    trailing: s.active
                        ? Row(mainAxisSize: MainAxisSize.min, children: [
                            IconButton(tooltip: '다시 보내기', icon: const Icon(Icons.send), onPressed: () => _resend(s)),
                            IconButton(tooltip: '폐기', icon: const Icon(Icons.block), onPressed: () => _revoke(s)),
                          ])
                        : null,
                  ),
              ]);
            },
          ),
        ],
      ),
    );
  }
}
