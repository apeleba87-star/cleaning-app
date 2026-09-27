import 'dart:async';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../app.dart';
import '../../core/errors.dart';
import '../capture/capture_service.dart';
import '../capture/photo_processor.dart';
import '../report_share/share_page.dart';
import '../upload_queue/upload_job.dart';
import 'format.dart';
import 'models.dart';
import 'photo_slot.dart';
import 'photo_viewer_page.dart';
import 'project_form_page.dart';
import 'project_repository.dart';

class ProjectDetailPage extends StatefulWidget {
  const ProjectDetailPage({super.key, required this.projectId});

  final String projectId;

  @override
  State<ProjectDetailPage> createState() => _ProjectDetailPageState();
}

class _ProjectDetailPageState extends State<ProjectDetailPage> {
  ProjectDetail? _detail;
  Object? _error;
  bool _loading = true;
  final _expanded = <String>{};
  final _thumbUrls = <String, String>{};
  final _busySlots = <String>{};
  Map<String, String> _serviceLabels = {};
  StreamSubscription<String>? _completedSub;
  Timer? _reloadDebounce;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    if (_completedSub != null) return;
    _completedSub = ServicesScope.of(context).queue.completedProjects.listen((projectId) {
      if (projectId != widget.projectId) return;
      _reloadDebounce?.cancel();
      _reloadDebounce = Timer(const Duration(milliseconds: 800), _load);
    });
    _load();
  }

  @override
  void dispose() {
    _completedSub?.cancel();
    _reloadDebounce?.cancel();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final types = await projectRepository.serviceTypes();
      final detail = await projectRepository.projectDetail(widget.projectId);
      if (!mounted) return;
      final firstLoad = _detail == null;
      setState(() {
        _serviceLabels = {for (final t in types) t.code: t.labelKo};
        _detail = detail;
        _error = null;
        if (firstLoad && detail.areas.isNotEmpty) _expanded.add(detail.areas.first.id);
      });
      await _signVisibleThumbs();
    } catch (e) {
      if (mounted) setState(() => _error = e);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  /// 펼쳐진 공간의 업로드 완료 썸네일만 서명한다 (Storage 가 20개 단위 batch + 만료 전 재사용).
  Future<void> _signVisibleThumbs() async {
    final detail = _detail;
    if (detail == null) return;
    final pairIds = detail.pairs.where((p) => _expanded.contains(p.areaId)).map((p) => p.id).toSet();
    final paths = detail.assets
        .where((a) => a.uploaded && pairIds.contains(a.pairId) && !_thumbUrls.containsKey(a.thumbPath))
        .map((a) => a.thumbPath)
        .toList();
    if (paths.isEmpty) return;
    try {
      final urls = await ServicesScope.of(context).storage.signedUrls(paths);
      if (mounted) setState(() => _thumbUrls.addAll(urls));
    } catch (e) {
      debugPrint('sign thumbs: $e');
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    try {
      await action();
      await _load();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(e))));
      }
    }
  }

  Future<String?> _askText(String title, {String initial = '', int maxLength = 50}) {
    final controller = TextEditingController(text: initial);
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: TextField(controller: controller, autofocus: true, maxLength: maxLength),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('취소')),
          FilledButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('확인'),
          ),
        ],
      ),
    ).whenComplete(controller.dispose);
  }

  Future<bool> _confirm(String message) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          content: Text(message),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('취소')),
            FilledButton(onPressed: () => Navigator.pop(context, true), child: const Text('확인')),
          ],
        ),
      ) ??
      false;

  Future<void> _addArea() async {
    final name = await _askText('공간 이름 (예: 거실, 주방)');
    if (name == null || name.isEmpty) return;
    final detail = _detail!;
    final order = detail.areas.fold<int>(0, (m, a) => a.sortOrder > m ? a.sortOrder : m) + 1;
    await _run(() => projectRepository.addArea(detail.project, name, order));
  }

  Future<void> _addPair(Area area) async {
    final detail = _detail!;
    final order = detail.pairs
            .where((p) => p.areaId == area.id)
            .fold<int>(0, (m, p) => p.sortOrder > m ? p.sortOrder : m) +
        1;
    _expanded.add(area.id);
    await _run(() => projectRepository.addPair(detail.project, area.id, order));
  }

  Future<void> _capture(PhotoPair pair, MediaRole role, ImageSource source) async {
    final key = '${pair.id}:${role.value}';
    final project = _detail!.project;
    final queue = ServicesScope.of(context).queue;
    setState(() => _busySlots.add(key));
    try {
      await CaptureService(queue).capture(
        source: source,
        companyId: project.companyId,
        projectId: project.id,
        pairId: pair.id,
        role: role.value,
      );
    } on PhotoTooLargeException {
      _snack('사진을 줄이지 못했습니다. 다시 촬영해 주세요.');
    } catch (e) {
      _snack(friendlyError(e));
    } finally {
      if (mounted) setState(() => _busySlots.remove(key));
    }
  }

  void _snack(String message) {
    if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _onSlotTap(PhotoPair pair, MediaRole role, MediaAsset? asset, UploadJob? job) async {
    final hasPhoto = asset != null || job != null;
    final choice = await showModalBottomSheet<String>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          if (hasPhoto)
            ListTile(
              leading: const Icon(Icons.zoom_in),
              title: const Text('크게 보기'),
              onTap: () => Navigator.pop(context, 'view'),
            ),
          ListTile(
            leading: const Icon(Icons.photo_camera_outlined),
            title: Text(hasPhoto ? '다시 촬영' : '촬영'),
            onTap: () => Navigator.pop(context, 'camera'),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library_outlined),
            title: const Text('앨범에서 선택'),
            onTap: () => Navigator.pop(context, 'gallery'),
          ),
          if (job?.state == JobState.failed)
            ListTile(
              leading: const Icon(Icons.refresh),
              title: Text('업로드 다시 시도 (${job!.lastError ?? '실패'})'),
              onTap: () => Navigator.pop(context, 'retry'),
            ),
          if (hasPhoto)
            ListTile(
              leading: const Icon(Icons.delete_outline),
              title: const Text('사진 삭제'),
              onTap: () => Navigator.pop(context, 'delete'),
            ),
        ]),
      ),
    );
    if (!mounted || choice == null) return;
    final queue = ServicesScope.of(context).queue;
    switch (choice) {
      case 'view':
        await Navigator.of(context).push(MaterialPageRoute(
          builder: (_) => PhotoViewerPage(
            title: role.label,
            asset: job == null ? asset : null,
            localFile: job?.fullFile,
          ),
        ));
      case 'camera':
        await _capture(pair, role, ImageSource.camera);
      case 'gallery':
        await _capture(pair, role, ImageSource.gallery);
      case 'retry':
        await queue.retry(job!);
      case 'delete':
        if (!await _confirm('이 사진을 삭제할까요?')) return;
        if (job != null) await queue.discard(job);
        if (asset != null) await _run(() => projectRepository.deleteAsset(asset.id));
    }
  }

  Future<void> _onPairMenu(PhotoPair pair, String action) async {
    switch (action) {
      case 'caption':
        final text = await _askText('설명', initial: pair.caption ?? '', maxLength: 200);
        if (text == null) return;
        await _run(() => projectRepository.updatePair(pair.id, caption: text));
      case 'toggle':
        await _run(() => projectRepository.updatePair(pair.id, includeInReport: !pair.includeInReport));
      case 'delete':
        if (!await _confirm('사진 쌍을 삭제할까요?')) return;
        await _run(() => projectRepository.deletePair(pair.id));
    }
  }

  Future<void> _onAreaMenu(Area area, String action) async {
    switch (action) {
      case 'rename':
        final name = await _askText('공간 이름', initial: area.name);
        if (name == null || name.isEmpty) return;
        await _run(() => projectRepository.renameArea(area.id, name));
      case 'delete':
        if (!await _confirm('"${area.name}" 공간과 사진을 삭제할까요?')) return;
        await _run(() => projectRepository.deleteArea(area.id));
    }
  }

  Future<void> _onProjectMenu(String action) async {
    final project = _detail!.project;
    switch (action) {
      case 'edit':
        final saved = await Navigator.of(context).push<String>(MaterialPageRoute(
          builder: (_) => ProjectFormPage(companyId: project.companyId, project: project),
        ));
        if (saved != null) await _load();
      case 'status':
        final next = project.status == ProjectStatus.completed
            ? ProjectStatus.inProgress
            : ProjectStatus.completed;
        await _run(() => projectRepository.setStatus(project.id, next));
      case 'delete':
        if (!await _confirm('현장을 삭제할까요? 보고서 링크도 더 이상 열리지 않습니다.')) return;
        try {
          await projectRepository.deleteProject(project.id);
          if (mounted) Navigator.of(context).pop();
        } catch (e) {
          _snack(friendlyError(e));
        }
    }
  }

  void _openShare() {
    final detail = _detail!;
    Navigator.of(context).push(MaterialPageRoute(
      builder: (_) => SharePage(project: detail.project),
    ));
  }

  @override
  Widget build(BuildContext context) {
    final detail = _detail;
    return Scaffold(
      appBar: AppBar(
        title: Text(detail?.project.title ?? '현장'),
        actions: [
          if (detail != null) ...[
            IconButton(tooltip: '고객에게 보내기', icon: const Icon(Icons.share_outlined), onPressed: _openShare),
            PopupMenuButton<String>(
              onSelected: _onProjectMenu,
              itemBuilder: (_) => [
                const PopupMenuItem(value: 'edit', child: Text('현장 정보 수정')),
                PopupMenuItem(
                  value: 'status',
                  child: Text(detail.project.status == ProjectStatus.completed ? '작업 중으로 변경' : '작업 완료로 변경'),
                ),
                const PopupMenuItem(value: 'delete', child: Text('현장 삭제')),
              ],
            ),
          ],
        ],
      ),
      floatingActionButton: detail == null
          ? null
          : FloatingActionButton.extended(
              onPressed: _addArea,
              icon: const Icon(Icons.add),
              label: const Text('공간 추가'),
            ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    final detail = _detail;
    if (detail == null) {
      if (_loading) return const Center(child: CircularProgressIndicator());
      return Center(
        child: TextButton(
          onPressed: _load,
          child: Text('${friendlyError(_error ?? '')} 다시 시도'),
        ),
      );
    }
    final queue = ServicesScope.of(context).queue;
    return ListenableBuilder(
      listenable: queue,
      builder: (context, _) {
        final pending = queue.jobsFor(detail.project.id).length;
        return RefreshIndicator(
          onRefresh: _load,
          child: ListView(
            padding: const EdgeInsets.only(bottom: 96),
            children: [
              _Header(
                project: detail.project,
                serviceLabel: _serviceLabels[detail.project.serviceTypeCode] ?? detail.project.serviceTypeCode,
                photoCount: detail.assets.length,
                pendingUploads: pending,
              ),
              if (detail.areas.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(32),
                  child: Text('"공간 추가" 로 거실, 주방처럼 사진을 나눌 공간을 만드세요.', textAlign: TextAlign.center),
                ),
              for (final area in detail.areas) _buildArea(detail, area),
            ],
          ),
        );
      },
    );
  }

  Widget _buildArea(ProjectDetail detail, Area area) {
    final queue = ServicesScope.of(context).queue;
    final pairs = detail.pairs.where((p) => p.areaId == area.id).toList()
      ..sort((a, b) => a.sortOrder.compareTo(b.sortOrder));
    final assetsByKey = {for (final a in detail.assets) '${a.pairId}:${a.role.value}': a};

    return ExpansionTile(
      key: PageStorageKey(area.id),
      initiallyExpanded: _expanded.contains(area.id),
      onExpansionChanged: (open) {
        open ? _expanded.add(area.id) : _expanded.remove(area.id);
        if (open) _signVisibleThumbs();
      },
      title: Text(area.name),
      subtitle: Text('사진 쌍 ${pairs.length}개'),
      trailing: PopupMenuButton<String>(
        onSelected: (v) => _onAreaMenu(area, v),
        itemBuilder: (_) => const [
          PopupMenuItem(value: 'rename', child: Text('이름 변경')),
          PopupMenuItem(value: 'delete', child: Text('공간 삭제')),
        ],
      ),
      childrenPadding: const EdgeInsets.fromLTRB(12, 0, 12, 12),
      children: [
        for (final pair in pairs)
          _PairRow(
            pair: pair,
            slots: [
              for (final role in MediaRole.values)
                Builder(builder: (context) {
                  final asset = assetsByKey['${pair.id}:${role.value}'];
                  final job = queue.jobFor(pair.id, role.value);
                  return PhotoSlot(
                    role: role,
                    asset: asset,
                    job: job,
                    thumbUrl: asset == null ? null : _thumbUrls[asset.thumbPath],
                    busy: _busySlots.contains('${pair.id}:${role.value}'),
                    onTap: () => _onSlotTap(pair, role, asset, job),
                  );
                }),
            ],
            onMenu: (action) => _onPairMenu(pair, action),
          ),
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: () => _addPair(area),
            icon: const Icon(Icons.add),
            label: const Text('사진 쌍 추가'),
          ),
        ),
      ],
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.project,
    required this.serviceLabel,
    required this.photoCount,
    required this.pendingUploads,
  });

  final Project project;
  final String serviceLabel;
  final int photoCount;
  final int pendingUploads;

  @override
  Widget build(BuildContext context) {
    final chips = [
      serviceLabel,
      if (project.serviceTypeNote != null) project.serviceTypeNote!,
      if (project.region != null) project.region!.label,
      if (project.workDate != null) formatDate(project.workDate!),
      project.status.label,
    ];
    return Padding(
      padding: const EdgeInsets.all(16),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Wrap(spacing: 6, runSpacing: 6, children: [for (final c in chips) Chip(label: Text(c))]),
        const SizedBox(height: 8),
        Text(pendingUploads > 0 ? '사진 $photoCount장 · 업로드 대기 $pendingUploads장' : '사진 $photoCount장'),
      ]),
    );
  }
}

class _PairRow extends StatelessWidget {
  const _PairRow({required this.pair, required this.slots, required this.onMenu});

  final PhotoPair pair;
  final List<Widget> slots;
  final ValueChanged<String> onMenu;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.outline;
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Expanded(child: slots[0]),
          const SizedBox(width: 8),
          Expanded(child: slots[1]),
        ]),
        Row(children: [
          if (!pair.includeInReport)
            Padding(
              padding: const EdgeInsets.only(right: 6),
              child: Icon(Icons.visibility_off_outlined, size: 16, color: muted),
            ),
          Expanded(
            child: Text(
              pair.caption ?? (pair.includeInReport ? '' : '보고서에서 숨김'),
              style: TextStyle(color: pair.caption == null ? muted : null),
            ),
          ),
          PopupMenuButton<String>(
            onSelected: onMenu,
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'caption', child: Text('설명 입력')),
              PopupMenuItem(
                value: 'toggle',
                child: Text(pair.includeInReport ? '보고서에서 숨기기' : '보고서에 표시'),
              ),
              const PopupMenuItem(value: 'delete', child: Text('사진 쌍 삭제')),
            ],
          ),
        ]),
      ]),
    );
  }
}
