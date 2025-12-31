import 'dart:convert';
import 'package:http/http.dart' as http;
import '../data/repositories.dart';

class SyncConfig {
  final String baseUrl;      // ex: https://seuapp.vercel.app
  final String teacherToken; // dev-token no MVP
  final String teacherId;
  final String deviceId;

  const SyncConfig({
    required this.baseUrl,
    required this.teacherToken,
    required this.teacherId,
    required this.deviceId,
  });
}

class SyncService {
  final Repositories repo;
  SyncService(this.repo);

  Future<void> push(SyncConfig cfg) async {
    final batch = repo.takeOutboxBatch(200);
    if (batch.isEmpty) return;

    final body = {
      'teacherId': cfg.teacherId,
      'deviceId': cfg.deviceId,
      'events': batch.map((e) => e.toJson()).toList(),
    };

    final res = await http.post(
      Uri.parse('${cfg.baseUrl}/api/sync/push'),
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ${cfg.teacherToken}',
      },
      body: jsonEncode(body),
    );

    if (res.statusCode == 200) {
      await repo.deleteOutboxIds(batch.map((e) => e.id).toList());
    } else {
      throw Exception('Push failed: ${res.statusCode} ${res.body}');
    }
  }

  Future<void> pullAndApply(SyncConfig cfg, {required String sinceIso}) async {
    final res = await http.get(
      Uri.parse('${cfg.baseUrl}/api/sync/pull?since=$sinceIso'),
      headers: {'Authorization': 'Bearer ${cfg.teacherToken}'},
    );

    if (res.statusCode != 200) {
      throw Exception('Pull failed: ${res.statusCode} ${res.body}');
    }

    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final changes = (data['changes'] as List).cast<Map<String, dynamic>>();
    await repo.applyServerChanges(changes);
  }
}
