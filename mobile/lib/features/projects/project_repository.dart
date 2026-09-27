import 'package:uuid/uuid.dart';

import '../../core/db.dart';
import 'models.dart';

class ProjectPage {
  const ProjectPage(this.items, this.hasMore);
  final List<Project> items;
  final bool hasMore;
}

class ProjectDetail {
  const ProjectDetail({
    required this.project,
    required this.areas,
    required this.pairs,
    required this.assets,
  });

  final Project project;
  final List<Area> areas;
  final List<PhotoPair> pairs;
  final List<MediaAsset> assets;
}

class ProjectRepository {
  static const pageSize = 20;
  static const _uuid = Uuid();

  List<ServiceType>? _serviceTypes;

  Future<List<ServiceType>> serviceTypes() async {
    final cached = _serviceTypes;
    if (cached != null) return cached;
    final rows = await fieldDb
        .from('service_types')
        .select('code,label_ko')
        .eq('is_active', true)
        .order('sort_order');
    return _serviceTypes = rows.map(ServiceType.fromJson).toList();
  }

  /// (created_at, id) keyset pagination. offset 을 쓰지 않아 뒤 페이지도 index 로 바로 찾는다.
  Future<ProjectPage> listProjects({Project? after}) async {
    var query = fieldDb.from('projects').select(Project.columns).isFilter('deleted_at', null);
    if (after != null) {
      final ts = after.createdAt;
      query = query.or('created_at.lt."$ts",and(created_at.eq."$ts",id.lt.${after.id})');
    }
    final rows = await query
        .order('created_at', ascending: false)
        .order('id', ascending: false)
        .limit(pageSize + 1);
    final items = rows.take(pageSize).map(Project.fromJson).toList();
    return ProjectPage(items, rows.length > pageSize);
  }

  Future<String> createProject({
    required String companyId,
    required Map<String, dynamic> fields,
    required PrivateDetails details,
  }) async {
    final id = _uuid.v4();
    await fieldDb.from('projects').insert({'id': id, 'company_id': companyId, ...fields});
    await fieldDb.from('project_private_details').insert({
      'project_id': id,
      'company_id': companyId,
      ...details.toJson(),
    });
    return id;
  }

  Future<void> updateProject({
    required Project project,
    required Map<String, dynamic> fields,
    required PrivateDetails details,
  }) async {
    await fieldDb.from('projects').update(fields).eq('id', project.id);
    // upsert 는 company_id / project_id 까지 UPDATE 하려 해서 컬럼 권한에 막힌다.
    final updated = await fieldDb
        .from('project_private_details')
        .update(details.toJson())
        .eq('project_id', project.id)
        .select('project_id');
    if (updated.isEmpty) {
      await fieldDb.from('project_private_details').insert({
        'project_id': project.id,
        'company_id': project.companyId,
        ...details.toJson(),
      });
    }
  }

  Future<PrivateDetails> privateDetails(String projectId) async {
    final row = await fieldDb
        .from('project_private_details')
        .select('customer_name,customer_phone,address_road,address_detail,memo')
        .eq('project_id', projectId)
        .maybeSingle();
    return row == null ? const PrivateDetails() : PrivateDetails.fromJson(row);
  }

  Future<void> setStatus(String projectId, ProjectStatus status) =>
      fieldDb.from('projects').update({'status': status.value}).eq('id', projectId);

  Future<void> deleteProject(String projectId) => fieldDb
      .from('projects')
      .update({'deleted_at': DateTime.now().toUtc().toIso8601String()}).eq('id', projectId);

  /// 현장 상세에 필요한 행을 테이블별 쿼리 한 번씩으로 가져온다 (N+1 없음).
  Future<ProjectDetail> projectDetail(String projectId) async {
    final (project, areas, pairs, assets) = await (
      fieldDb.from('projects').select(Project.columns).eq('id', projectId).single(),
      fieldDb
          .from('areas')
          .select('id,name,sort_order')
          .eq('project_id', projectId)
          .isFilter('deleted_at', null)
          .order('sort_order')
          .order('created_at'),
      _fetchAll('photo_pairs', 'id,area_id,caption,include_in_report,sort_order', projectId),
      _fetchAll('media_assets', 'id,photo_pair_id,role,storage_path,thumb_path,status', projectId),
    ).wait;
    return ProjectDetail(
      project: Project.fromJson(project),
      areas: areas.map(Area.fromJson).toList(),
      pairs: pairs.map(PhotoPair.fromJson).toList(),
      assets: assets.map(MediaAsset.fromJson).toList(),
    );
  }

  /// PostgREST 기본 max rows(1000) 를 넘는 현장도 끊기지 않도록 range 로 나눠 읽는다.
  Future<List<Map<String, dynamic>>> _fetchAll(String table, String columns, String projectId) async {
    const chunk = 1000;
    final all = <Map<String, dynamic>>[];
    for (var from = 0;; from += chunk) {
      final rows = await fieldDb
          .from(table)
          .select(columns)
          .eq('project_id', projectId)
          .isFilter('deleted_at', null)
          .order('created_at')
          .order('id')
          .range(from, from + chunk - 1);
      all.addAll(rows);
      if (rows.length < chunk) return all;
    }
  }

  Future<void> addArea(Project project, String name, int sortOrder) =>
      fieldDb.from('areas').insert({
        'company_id': project.companyId,
        'project_id': project.id,
        'name': name,
        'sort_order': sortOrder,
      });

  Future<void> renameArea(String areaId, String name) =>
      fieldDb.from('areas').update({'name': name}).eq('id', areaId);

  Future<void> deleteArea(String areaId) => fieldDb
      .from('areas')
      .update({'deleted_at': DateTime.now().toUtc().toIso8601String()}).eq('id', areaId);

  Future<String> addPair(Project project, String areaId, int sortOrder) async {
    final id = _uuid.v4();
    await fieldDb.from('photo_pairs').insert({
      'id': id,
      'company_id': project.companyId,
      'project_id': project.id,
      'area_id': areaId,
      'sort_order': sortOrder,
    });
    return id;
  }

  Future<void> updatePair(String pairId, {String? caption, bool? includeInReport}) =>
      fieldDb.from('photo_pairs').update({
        if (caption != null) 'caption': caption.isEmpty ? null : caption,
        'include_in_report': ?includeInReport,
      }).eq('id', pairId);

  Future<void> deleteAsset(String assetId) => fieldDb
      .from('media_assets')
      .update({'deleted_at': DateTime.now().toUtc().toIso8601String()}).eq('id', assetId);

  Future<void> deletePair(String pairId) => fieldDb
      .from('photo_pairs')
      .update({'deleted_at': DateTime.now().toUtc().toIso8601String()}).eq('id', pairId);
}

final projectRepository = ProjectRepository();
