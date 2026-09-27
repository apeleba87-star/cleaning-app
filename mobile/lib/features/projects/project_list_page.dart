import 'package:flutter/material.dart';

import '../../app.dart';
import '../../core/db.dart';
import '../../core/errors.dart';
import '../upload_queue/upload_status_page.dart';
import 'format.dart';
import 'models.dart';
import 'project_detail_page.dart';
import 'project_form_page.dart';
import 'project_repository.dart';

class ProjectListPage extends StatefulWidget {
  const ProjectListPage({super.key, required this.company});

  final Company company;

  @override
  State<ProjectListPage> createState() => _ProjectListPageState();
}

class _ProjectListPageState extends State<ProjectListPage> {
  final _items = <Project>[];
  final _scroll = ScrollController();
  Map<String, String> _serviceLabels = {};
  bool _loading = false;
  bool _hasMore = true;
  Object? _error;

  @override
  void initState() {
    super.initState();
    _scroll.addListener(() {
      if (_scroll.position.extentAfter < 400) _loadMore();
    });
    _refresh();
  }

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _refresh() async {
    _items.clear();
    _hasMore = true;
    await _loadMore();
  }

  Future<void> _loadMore() async {
    if (_loading || !_hasMore) return;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      if (_serviceLabels.isEmpty) {
        final types = await projectRepository.serviceTypes();
        _serviceLabels = {for (final t in types) t.code: t.labelKo};
      }
      final page = await projectRepository.listProjects(after: _items.isEmpty ? null : _items.last);
      _items.addAll(page.items);
      _hasMore = page.hasMore;
    } catch (e) {
      _error = e;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _create() async {
    final id = await Navigator.of(context).push<String>(
      MaterialPageRoute(builder: (_) => ProjectFormPage(companyId: widget.company.id)),
    );
    if (id == null || !mounted) return;
    await _refresh();
    if (!mounted) return;
    await _open(id);
  }

  Future<void> _open(String projectId) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => ProjectDetailPage(projectId: projectId)),
    );
    if (mounted) await _refresh();
  }

  @override
  Widget build(BuildContext context) {
    final queue = ServicesScope.of(context).queue;
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.company.name),
        actions: [
          ListenableBuilder(
            listenable: queue,
            builder: (context, _) {
              final count = queue.jobs.length;
              if (count == 0) return const SizedBox.shrink();
              return IconButton(
                tooltip: '업로드 대기',
                icon: Badge(label: Text('$count'), child: const Icon(Icons.cloud_upload_outlined)),
                onPressed: () => Navigator.of(context)
                    .push(MaterialPageRoute(builder: (_) => const UploadStatusPage())),
              );
            },
          ),
          PopupMenuButton<String>(
            onSelected: (v) {
              if (v == 'logout') supabase.auth.signOut();
            },
            itemBuilder: (_) => const [PopupMenuItem(value: 'logout', child: Text('로그아웃'))],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _create,
        icon: const Icon(Icons.add),
        label: const Text('새 현장'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: _buildList(),
      ),
    );
  }

  Widget _buildList() {
    if (_items.isEmpty && _error != null) {
      return ListView(children: [
        const SizedBox(height: 120),
        Center(child: Text(friendlyError(_error!))),
        Center(child: TextButton(onPressed: _refresh, child: const Text('다시 시도'))),
      ]);
    }
    if (_items.isEmpty && !_loading) {
      return ListView(children: const [
        SizedBox(height: 120),
        Center(child: Text('아직 현장이 없습니다.\n아래 "새 현장" 버튼으로 시작하세요.', textAlign: TextAlign.center)),
      ]);
    }
    return ListView.separated(
      controller: _scroll,
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 96),
      itemCount: _items.length + (_hasMore || _loading ? 1 : 0),
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, i) {
        if (i >= _items.length) {
          return const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: CircularProgressIndicator()),
          );
        }
        final p = _items[i];
        final subtitle = [
          _serviceLabels[p.serviceTypeCode] ?? p.serviceTypeCode,
          if (p.region != null) p.region!.label,
          if (p.workDate != null) formatDate(p.workDate!),
        ].join(' · ');
        return ListTile(
          title: Text(p.title),
          subtitle: Text(subtitle),
          trailing: _StatusChip(status: p.status),
          onTap: () => _open(p.id),
        );
      },
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.status});

  final ProjectStatus status;

  @override
  Widget build(BuildContext context) {
    final done = status == ProjectStatus.completed;
    final scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: done ? scheme.secondaryContainer : scheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Text(status.label, style: Theme.of(context).textTheme.labelSmall),
    );
  }
}
