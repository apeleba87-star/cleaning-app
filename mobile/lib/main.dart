import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import 'app.dart';
import 'core/config.dart';
import 'core/media_storage/supabase_media_storage.dart';
import 'features/upload_queue/upload_queue.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  final missing = AppConfig.missingKeys();
  if (missing.isNotEmpty) {
    runApp(ConfigErrorApp(missing: missing));
    return;
  }

  await Supabase.initialize(url: AppConfig.supabaseUrl, publishableKey: AppConfig.supabaseAnonKey);
  final storage = SupabaseMediaStorage(Supabase.instance.client);
  final queue = await UploadQueue.open(storage);
  runApp(MuplFieldApp(services: AppServices(storage: storage, queue: queue)));
}
