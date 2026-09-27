import 'package:flutter/material.dart';

import '../../core/errors.dart';
import 'address_search_page.dart';
import 'format.dart';
import 'models.dart';
import 'project_repository.dart';

/// 새 현장 만들기 / 수정. 저장되면 project id 를 돌려준다.
class ProjectFormPage extends StatefulWidget {
  const ProjectFormPage({super.key, required this.companyId, this.project});

  final String companyId;
  final Project? project;

  @override
  State<ProjectFormPage> createState() => _ProjectFormPageState();
}

class _ProjectFormPageState extends State<ProjectFormPage> {
  final _form = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _note = TextEditingController();
  final _addressDetail = TextEditingController();
  final _customerName = TextEditingController();
  final _customerPhone = TextEditingController();
  final _memo = TextEditingController();

  List<ServiceType> _types = [];
  String? _serviceCode;
  Region? _region;
  String? _addressRoad;
  DateTime? _workDate;
  bool _loading = true;
  bool _saving = false;
  Object? _loadError;

  bool get _editing => widget.project != null;

  @override
  void initState() {
    super.initState();
    final p = widget.project;
    if (p != null) {
      _title.text = p.title;
      _note.text = p.serviceTypeNote ?? '';
      _serviceCode = p.serviceTypeCode;
      _region = p.region;
      _workDate = p.workDate;
    } else {
      _workDate = DateTime.now();
    }
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _loadError = null;
    });
    try {
      _types = await projectRepository.serviceTypes();
      _serviceCode ??= _types.isEmpty ? null : _types.first.code;
      final p = widget.project;
      if (p != null) {
        final d = await projectRepository.privateDetails(p.id);
        _addressRoad = d.addressRoad;
        _addressDetail.text = d.addressDetail ?? '';
        _customerName.text = d.customerName ?? '';
        _customerPhone.text = d.customerPhone ?? '';
        _memo.text = d.memo ?? '';
      }
    } catch (e) {
      _loadError = e;
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  void dispose() {
    for (final c in [_title, _note, _addressDetail, _customerName, _customerPhone, _memo]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _searchAddress() async {
    final result = await Navigator.of(context).push<AddressResult>(
      MaterialPageRoute(builder: (_) => const AddressSearchPage()),
    );
    if (result == null) return;
    setState(() {
      _region = result.region;
      _addressRoad = result.roadAddress;
    });
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _workDate ?? now,
      firstDate: DateTime(now.year - 5),
      lastDate: DateTime(now.year + 2),
    );
    if (picked != null) setState(() => _workDate = picked);
  }

  String? _nullIfEmpty(String v) => v.trim().isEmpty ? null : v.trim();

  Future<void> _save() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _saving = true);
    final fields = <String, dynamic>{
      'title': _title.text.trim(),
      'service_type_code': _serviceCode,
      'service_type_note': _nullIfEmpty(_note.text),
      'region_sido_code': _region?.sidoCode,
      'region_sido_name': _region?.sidoName,
      'region_sigungu_code': _region?.sigunguCode,
      'region_sigungu_name': _region?.sigunguName,
      'work_date': _workDate == null ? null : toDateColumn(_workDate!),
    };
    final details = PrivateDetails(
      customerName: _nullIfEmpty(_customerName.text),
      customerPhone: _nullIfEmpty(_customerPhone.text),
      addressRoad: _addressRoad,
      addressDetail: _nullIfEmpty(_addressDetail.text),
      memo: _nullIfEmpty(_memo.text),
    );
    try {
      final String id;
      if (_editing) {
        await projectRepository.updateProject(project: widget.project!, fields: fields, details: details);
        id = widget.project!.id;
      } else {
        id = await projectRepository.createProject(
            companyId: widget.companyId, fields: fields, details: details);
      }
      if (mounted) Navigator.of(context).pop(id);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(e))));
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_editing ? '현장 수정' : '새 현장'),
        actions: [
          TextButton(onPressed: _loading || _saving ? null : _save, child: const Text('저장')),
        ],
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _loadError != null
              ? Center(child: TextButton(onPressed: _load, child: Text('${friendlyError(_loadError!)} 다시 시도')))
              : _buildForm(context),
    );
  }

  Widget _buildForm(BuildContext context) {
    final labelStyle = Theme.of(context).textTheme.titleSmall;
    return Form(
      key: _form,
      child: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('보고서에 표시되는 정보', style: labelStyle),
          const SizedBox(height: 12),
          TextFormField(
            controller: _title,
            maxLength: 100,
            decoration: const InputDecoration(labelText: '현장 이름', hintText: '예: 래미안 34평 입주청소'),
            validator: (v) => (v == null || v.trim().isEmpty) ? '현장 이름을 입력해 주세요.' : null,
          ),
          const SizedBox(height: 8),
          DropdownButtonFormField<String>(
            initialValue: _serviceCode,
            decoration: const InputDecoration(labelText: '서비스 종류'),
            items: [
              for (final t in _types) DropdownMenuItem(value: t.code, child: Text(t.labelKo)),
            ],
            onChanged: (v) => setState(() => _serviceCode = v),
            validator: (v) => v == null ? '서비스 종류를 선택해 주세요.' : null,
          ),
          const SizedBox(height: 12),
          TextFormField(
            controller: _note,
            maxLength: 50,
            decoration: const InputDecoration(labelText: '서비스 설명 (선택)', hintText: '예: 에어컨 분해청소'),
          ),
          const SizedBox(height: 8),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.calendar_today_outlined),
            title: Text(_workDate == null ? '작업일 선택' : '작업일 ${formatDate(_workDate!)}'),
            onTap: _pickDate,
          ),
          ListTile(
            contentPadding: EdgeInsets.zero,
            leading: const Icon(Icons.place_outlined),
            title: Text(_region?.label ?? '지역 (주소 검색으로 자동 입력)'),
            subtitle: const Text('고객 보고서에는 시/군/구까지만 표시됩니다.'),
            trailing: TextButton(onPressed: _searchAddress, child: const Text('주소 검색')),
          ),
          const Divider(height: 32),
          Text('업체만 보는 정보 (보고서에 표시되지 않음)', style: labelStyle),
          const SizedBox(height: 12),
          if (_addressRoad != null)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_addressRoad!),
            ),
          TextFormField(
            controller: _addressDetail,
            maxLength: 100,
            decoration: const InputDecoration(labelText: '상세 주소', hintText: '동/호수'),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _customerName,
            maxLength: 50,
            decoration: const InputDecoration(labelText: '고객 이름'),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _customerPhone,
            maxLength: 20,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(labelText: '고객 연락처'),
          ),
          const SizedBox(height: 8),
          TextFormField(
            controller: _memo,
            maxLength: 1000,
            maxLines: 4,
            decoration: const InputDecoration(labelText: '메모'),
          ),
        ],
      ),
    );
  }
}
