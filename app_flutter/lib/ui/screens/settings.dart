import 'package:flutter/material.dart';
import '../../data/repositories.dart';
import '../../sync/sync_service.dart';

class SettingsScreen extends StatefulWidget {
  final Repositories repo;
  final SyncService sync;
  const SettingsScreen({required this.repo, required this.sync, super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  final baseUrl = TextEditingController(text: 'http://localhost:3000'); // troque para seu domínio Vercel
  final token = TextEditingController(text: 'dev-token');
  final deviceId = TextEditingController(text: 'device-001');
  final sinceIso = TextEditingController(text: '1970-01-01T00:00:00Z');
  bool running = false;

  @override
  void dispose() {
    baseUrl.dispose();
    token.dispose();
    deviceId.dispose();
    sinceIso.dispose();
    super.dispose();
  }

  Future<void> doSync() async {
    final teacherId = await widget.repo.getTeacherId();
    if (teacherId == null) return;

    setState(() => running = true);
    try {
      final cfg = SyncConfig(
        baseUrl: baseUrl.text.trim(),
        teacherToken: token.text.trim(),
        teacherId: teacherId,
        deviceId: deviceId.text.trim(),
      );
      await widget.sync.push(cfg);
      await widget.sync.pullAndApply(cfg, sinceIso: sinceIso.text.trim());
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sincronização concluída.')));
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Falha no sync: $e')));
      }
    } finally {
      if (mounted) setState(() => running = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Configurações')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          const Text('Sincronização (MVP)', style: TextStyle(fontWeight: FontWeight.w800)),
          const SizedBox(height: 10),
          TextField(controller: baseUrl, decoration: const InputDecoration(labelText: 'Base URL (Vercel)')),
          const SizedBox(height: 10),
          TextField(controller: token, decoration: const InputDecoration(labelText: 'Token (dev-token)')),
          const SizedBox(height: 10),
          TextField(controller: deviceId, decoration: const InputDecoration(labelText: 'Device ID')),
          const SizedBox(height: 10),
          TextField(controller: sinceIso, decoration: const InputDecoration(labelText: 'Pull since (ISO)')),
          const SizedBox(height: 14),
          ElevatedButton(
            onPressed: running ? null : doSync,
            child: Text(running ? 'Sincronizando...' : 'Sincronizar agora'),
          ),
        ],
      ),
    );
  }
}
