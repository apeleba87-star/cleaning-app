import 'package:flutter/material.dart';

import 'core/media_storage/media_storage.dart';
import 'features/auth/auth_gate.dart';
import 'features/upload_queue/upload_queue.dart';

class AppServices {
  const AppServices({required this.storage, required this.queue});

  final MediaStorage storage;
  final UploadQueue queue;
}

class ServicesScope extends InheritedWidget {
  const ServicesScope({super.key, required this.services, required super.child});

  final AppServices services;

  static AppServices of(BuildContext context) =>
      context.getInheritedWidgetOfExactType<ServicesScope>()!.services;

  @override
  bool updateShouldNotify(ServicesScope oldWidget) => services != oldWidget.services;
}

ThemeData _theme() {
  final scheme = ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB));
  return ThemeData(
    colorScheme: scheme,
    useMaterial3: true,
    inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
  );
}

class MuplFieldApp extends StatefulWidget {
  const MuplFieldApp({super.key, required this.services});

  final AppServices services;

  @override
  State<MuplFieldApp> createState() => _MuplFieldAppState();
}

class _MuplFieldAppState extends State<MuplFieldApp> {
  late final AppLifecycleListener _lifecycle;

  @override
  void initState() {
    super.initState();
    _lifecycle = AppLifecycleListener(onResume: widget.services.queue.retryNow);
    widget.services.queue.kick();
  }

  @override
  void dispose() {
    _lifecycle.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return ServicesScope(
      services: widget.services,
      child: MaterialApp(
        title: '무플 현장',
        theme: _theme(),
        debugShowCheckedModeBanner: false,
        home: const AuthGate(),
      ),
    );
  }
}

class ConfigErrorApp extends StatelessWidget {
  const ConfigErrorApp({super.key, required this.missing});

  final List<String> missing;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      home: Scaffold(
        body: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text('빌드 설정이 없습니다: ${missing.join(', ')}\n'
                '--dart-define 으로 값을 넣어 다시 실행하세요.'),
          ),
        ),
      ),
    );
  }
}
