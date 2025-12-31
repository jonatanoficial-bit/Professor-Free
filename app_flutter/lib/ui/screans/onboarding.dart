import 'package:flutter/material.dart';
import '../../data/repositories.dart';

class OnboardingScreen extends StatefulWidget {
  final Repositories repo;
  const OnboardingScreen({required this.repo, super.key});

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  bool _saving = false;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await widget.repo.upsertTeacher(
        name: _name.text.trim(),
        email: _email.text.trim(),
        phone: _phone.text.trim(),
      );
      if (mounted) Navigator.of(context).pushReplacementNamed('/home');
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Cadastro do Professor')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Bem-vindo!', style: t.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
          const SizedBox(height: 8),
          Text('Cadastre seus dados. Offline-first com sync opcional.',
              style: t.bodyMedium?.copyWith(color: Colors.white.withOpacity(0.7))),
          const SizedBox(height: 18),
          TextField(controller: _name, decoration: const InputDecoration(labelText: 'Nome')),
          const SizedBox(height: 12),
          TextField(controller: _email, decoration: const InputDecoration(labelText: 'Email')),
          const SizedBox(height: 12),
          TextField(controller: _phone, decoration: const InputDecoration(labelText: 'Telefone/WhatsApp')),
          const SizedBox(height: 18),
          ElevatedButton(
            onPressed: _saving ? null : _save,
            child: Text(_saving ? 'Salvando...' : 'Continuar'),
          ),
        ],
      ),
    );
  }
}
