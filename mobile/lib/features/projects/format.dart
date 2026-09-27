String _two(int n) => n.toString().padLeft(2, '0');

String formatDate(DateTime d) => '${d.year}.${_two(d.month)}.${_two(d.day)}';

String formatDateTime(DateTime d) {
  final l = d.toLocal();
  return '${formatDate(l)} ${_two(l.hour)}:${_two(l.minute)}';
}

/// Postgres date 컬럼 값 (YYYY-MM-DD)
String toDateColumn(DateTime d) => '${d.year}-${_two(d.month)}-${_two(d.day)}';
