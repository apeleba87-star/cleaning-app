import 'package:flutter/material.dart';

import '../../core/db.dart';
import '../../core/errors.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _form = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _signUp = false;
  bool _busy = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_form.currentState!.validate()) return;
    setState(() => _busy = true);
    final messenger = ScaffoldMessenger.of(context);
    try {
      final email = _email.text.trim();
      if (_signUp) {
        final res = await supabase.auth.signUp(email: email, password: _password.text);
        if (res.session == null) {
          messenger.showSnackBar(const SnackBar(content: Text('인증 메일을 보냈습니다. 메일 확인 후 로그인해 주세요.')));
          setState(() => _signUp = false);
        }
      } else {
        await supabase.auth.signInWithPassword(email: email, password: _password.text);
      }
    } catch (e) {
      messenger.showSnackBar(SnackBar(content: Text(friendlyError(e))));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Form(
              key: _form,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text('무플 현장', style: Theme.of(context).textTheme.headlineMedium),
                  const SizedBox(height: 8),
                  const Text('작업 전·후 사진을 찍고 고객에게 보고서 링크를 보내세요.'),
                  const SizedBox(height: 32),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    autofillHints: const [AutofillHints.email],
                    decoration: const InputDecoration(labelText: '이메일'),
                    validator: (v) => (v == null || !v.contains('@')) ? '이메일을 입력해 주세요.' : null,
                  ),
                  const SizedBox(height: 12),
                  TextFormField(
                    controller: _password,
                    obscureText: true,
                    autofillHints: const [AutofillHints.password],
                    decoration: const InputDecoration(labelText: '비밀번호'),
                    validator: (v) => (v == null || v.length < 8) ? '8자 이상 입력해 주세요.' : null,
                  ),
                  const SizedBox(height: 24),
                  FilledButton(
                    onPressed: _busy ? null : _submit,
                    child: Text(_signUp ? '가입하기' : '로그인'),
                  ),
                  TextButton(
                    onPressed: _busy ? null : () => setState(() => _signUp = !_signUp),
                    child: Text(_signUp ? '이미 계정이 있어요' : '처음이에요 (가입)'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
