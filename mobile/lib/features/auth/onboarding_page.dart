import 'package:flutter/material.dart';

import '../../core/db.dart';
import '../../core/errors.dart';

class OnboardingPage extends StatefulWidget {
  const OnboardingPage({super.key, required this.onCreated});

  final VoidCallback onCreated;

  @override
  State<OnboardingPage> createState() => _OnboardingPageState();
}

class _OnboardingPageState extends State<OnboardingPage> {
  final _form = GlobalKey<FormState>();
  final _name = TextEditingController();
  bool _busy = false;

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    try {
      await fieldDb.rpc('create_company', params: {'p_name': _name.text.trim()});
      widget.onCreated();
    } catch (e) {
      if (serverErrorCode(e) == 'company_already_exists') {
        widget.onCreated();
        return;
      }
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(friendlyError(e))));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('업체 등록'),
        actions: [
          TextButton(onPressed: () => supabase.auth.signOut(), child: const Text('로그아웃')),
        ],
      ),
      body: Form(
        key: _form,
        child: ListView(
          padding: const EdgeInsets.all(24),
          children: [
            const Text('고객 보고서에 표시될 업체 이름을 입력해 주세요.'),
            const SizedBox(height: 16),
            TextFormField(
              controller: _name,
              maxLength: 100,
              decoration: const InputDecoration(labelText: '업체 이름'),
              validator: (v) => (v == null || v.trim().isEmpty) ? '업체 이름을 입력해 주세요.' : null,
            ),
            const SizedBox(height: 16),
            FilledButton(onPressed: _busy ? null : _submit, child: const Text('시작하기')),
          ],
        ),
      ),
    );
  }
}
