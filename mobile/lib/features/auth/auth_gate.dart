import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../../app.dart';
import '../../core/db.dart';
import '../../core/errors.dart';
import '../projects/models.dart';
import '../projects/project_list_page.dart';
import 'login_page.dart';
import 'onboarding_page.dart';

class AuthGate extends StatelessWidget {
  const AuthGate({super.key});

  @override
  Widget build(BuildContext context) {
    return StreamBuilder<AuthState>(
      stream: supabase.auth.onAuthStateChange,
      builder: (context, _) {
        final session = supabase.auth.currentSession;
        if (session == null) return const LoginPage();
        return _CompanyGate(key: ValueKey(session.user.id));
      },
    );
  }
}

class _CompanyGate extends StatefulWidget {
  const _CompanyGate({super.key});

  @override
  State<_CompanyGate> createState() => _CompanyGateState();
}

class _CompanyGateState extends State<_CompanyGate> {
  late Future<Company?> _company = _load();

  Future<Company?> _load() async {
    final row = await fieldDb.from('companies').select('id,name').limit(1).maybeSingle();
    return row == null ? null : Company.fromJson(row);
  }

  @override
  void initState() {
    super.initState();
    ServicesScope.of(context).queue.kick();
  }

  void _reload() => setState(() => _company = _load());

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<Company?>(
      future: _company,
      builder: (context, snap) {
        if (snap.connectionState != ConnectionState.done) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }
        if (snap.hasError) {
          return Scaffold(
            body: Center(
              child: Column(mainAxisSize: MainAxisSize.min, children: [
                Text(friendlyError(snap.error!)),
                const SizedBox(height: 12),
                FilledButton(onPressed: _reload, child: const Text('다시 시도')),
              ]),
            ),
          );
        }
        final company = snap.data;
        if (company == null) return OnboardingPage(onCreated: _reload);
        return ProjectListPage(company: company);
      },
    );
  }
}
