class Company {
  const Company({required this.id, required this.name});

  final String id;
  final String name;

  factory Company.fromJson(Map<String, dynamic> j) =>
      Company(id: j['id'] as String, name: j['name'] as String);
}

class ServiceType {
  const ServiceType({required this.code, required this.labelKo});

  final String code;
  final String labelKo;

  factory ServiceType.fromJson(Map<String, dynamic> j) =>
      ServiceType(code: j['code'] as String, labelKo: j['label_ko'] as String);
}

/// 공개 가능한 지역 정보 (시/도, 시/군/구). 상세 주소는 [PrivateDetails] 에만 둔다.
class Region {
  const Region({
    required this.sidoCode,
    required this.sidoName,
    this.sigunguCode,
    this.sigunguName,
  });

  final String sidoCode;
  final String sidoName;
  final String? sigunguCode;
  final String? sigunguName;

  String get label => [sidoName, if (sigunguName != null) sigunguName].join(' ');
}

enum ProjectStatus {
  inProgress('in_progress', '작업 중'),
  completed('completed', '작업 완료');

  const ProjectStatus(this.value, this.label);
  final String value;
  final String label;

  static ProjectStatus parse(String v) =>
      values.firstWhere((s) => s.value == v, orElse: () => inProgress);
}

class Project {
  const Project({
    required this.id,
    required this.companyId,
    required this.title,
    required this.serviceTypeCode,
    this.serviceTypeNote,
    this.region,
    this.workDate,
    required this.status,
    required this.createdAt,
  });

  final String id;
  final String companyId;
  final String title;
  final String serviceTypeCode;
  final String? serviceTypeNote;
  final Region? region;
  final DateTime? workDate;
  final ProjectStatus status;
  final String createdAt;

  static const columns =
      'id,company_id,title,service_type_code,service_type_note,region_sido_code,region_sigungu_code,'
      'region_sido_name,region_sigungu_name,work_date,status,created_at';

  factory Project.fromJson(Map<String, dynamic> j) {
    final sidoCode = j['region_sido_code'] as String?;
    return Project(
      id: j['id'] as String,
      companyId: j['company_id'] as String,
      title: j['title'] as String,
      serviceTypeCode: j['service_type_code'] as String,
      serviceTypeNote: j['service_type_note'] as String?,
      region: sidoCode == null
          ? null
          : Region(
              sidoCode: sidoCode,
              sidoName: (j['region_sido_name'] as String?) ?? '',
              sigunguCode: j['region_sigungu_code'] as String?,
              sigunguName: j['region_sigungu_name'] as String?,
            ),
      workDate: j['work_date'] == null ? null : DateTime.parse(j['work_date'] as String),
      status: ProjectStatus.parse(j['status'] as String),
      createdAt: j['created_at'] as String,
    );
  }
}

class PrivateDetails {
  const PrivateDetails({
    this.customerName,
    this.customerPhone,
    this.addressRoad,
    this.addressDetail,
    this.memo,
  });

  final String? customerName;
  final String? customerPhone;
  final String? addressRoad;
  final String? addressDetail;
  final String? memo;

  factory PrivateDetails.fromJson(Map<String, dynamic> j) => PrivateDetails(
        customerName: j['customer_name'] as String?,
        customerPhone: j['customer_phone'] as String?,
        addressRoad: j['address_road'] as String?,
        addressDetail: j['address_detail'] as String?,
        memo: j['memo'] as String?,
      );

  Map<String, dynamic> toJson() => {
        'customer_name': customerName,
        'customer_phone': customerPhone,
        'address_road': addressRoad,
        'address_detail': addressDetail,
        'memo': memo,
      };
}

class Area {
  const Area({required this.id, required this.name, required this.sortOrder});

  final String id;
  final String name;
  final int sortOrder;

  factory Area.fromJson(Map<String, dynamic> j) => Area(
        id: j['id'] as String,
        name: j['name'] as String,
        sortOrder: j['sort_order'] as int,
      );
}

class PhotoPair {
  const PhotoPair({
    required this.id,
    required this.areaId,
    this.caption,
    required this.includeInReport,
    required this.sortOrder,
  });

  final String id;
  final String areaId;
  final String? caption;
  final bool includeInReport;
  final int sortOrder;

  factory PhotoPair.fromJson(Map<String, dynamic> j) => PhotoPair(
        id: j['id'] as String,
        areaId: j['area_id'] as String,
        caption: j['caption'] as String?,
        includeInReport: j['include_in_report'] as bool,
        sortOrder: j['sort_order'] as int,
      );
}

enum MediaRole {
  before('before', '작업 전'),
  after('after', '작업 후');

  const MediaRole(this.value, this.label);
  final String value;
  final String label;

  static MediaRole parse(String v) => v == 'after' ? after : before;
}

class MediaAsset {
  const MediaAsset({
    required this.id,
    required this.pairId,
    required this.role,
    required this.storagePath,
    required this.thumbPath,
    required this.uploaded,
  });

  final String id;
  final String pairId;
  final MediaRole role;
  final String storagePath;
  final String thumbPath;
  final bool uploaded;

  factory MediaAsset.fromJson(Map<String, dynamic> j) => MediaAsset(
        id: j['id'] as String,
        pairId: j['photo_pair_id'] as String,
        role: MediaRole.parse(j['role'] as String),
        storagePath: j['storage_path'] as String,
        thumbPath: j['thumb_path'] as String,
        uploaded: j['status'] == 'uploaded',
      );
}

class ReportShare {
  const ReportShare({
    required this.id,
    required this.active,
    required this.createdAt,
    required this.viewCount,
    this.lastViewedAt,
  });

  final String id;
  final bool active;
  final DateTime createdAt;
  final int viewCount;
  final DateTime? lastViewedAt;

  factory ReportShare.fromJson(Map<String, dynamic> j) => ReportShare(
        id: j['id'] as String,
        active: j['status'] == 'active',
        createdAt: DateTime.parse(j['created_at'] as String),
        viewCount: j['view_count'] as int,
        lastViewedAt:
            j['last_viewed_at'] == null ? null : DateTime.parse(j['last_viewed_at'] as String),
      );
}
