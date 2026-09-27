import 'models.dart';

class AddressResult {
  const AddressResult({required this.region, required this.roadAddress});

  final Region? region;
  final String roadAddress;
}

/// Daum 우편번호 서비스 결과를 해석한다.
/// 법정동코드(bcode) 앞 2자리 = 시/도, sigunguCode 5자리 = 시/군/구.
AddressResult? parsePostcodeResult(Map<String, dynamic> data) {
  final bcode = (data['bcode'] as String?) ?? '';
  final sigunguCode = (data['sigunguCode'] as String?) ?? '';
  final road = ((data['roadAddress'] as String?) ?? '').trim();
  final jibun = ((data['jibunAddress'] as String?) ?? (data['autoJibunAddress'] as String?) ?? '').trim();
  final address = road.isNotEmpty ? road : jibun;
  if (address.isEmpty) return null;

  final sidoCode = bcode.length >= 2 ? bcode.substring(0, 2) : '';
  if (!RegExp(r'^\d{2}$').hasMatch(sidoCode)) {
    return AddressResult(region: null, roadAddress: address);
  }
  final validSigungu = RegExp(r'^\d{5}$').hasMatch(sigunguCode) && sigunguCode.startsWith(sidoCode);
  final sigunguName = ((data['sigungu'] as String?) ?? '').trim();
  return AddressResult(
    region: Region(
      sidoCode: sidoCode,
      sidoName: ((data['sido'] as String?) ?? '').trim(),
      sigunguCode: validSigungu ? sigunguCode : null,
      sigunguName: validSigungu && sigunguName.isNotEmpty ? sigunguName : null,
    ),
    roadAddress: address,
  );
}
