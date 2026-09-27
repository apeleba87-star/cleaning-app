import 'package:supabase_flutter/supabase_flutter.dart';

SupabaseClient get supabase => Supabase.instance.client;

/// 무플 Field 테이블은 모두 `field` schema 에 있다.
SupabaseQuerySchema get fieldDb => supabase.schema('field');
