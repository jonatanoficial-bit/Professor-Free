import 'dart:convert';
import 'package:http/http.dart' as http;
import '../data/repositories.dart';
import '../data/db.dart';

class SyncConfig {
  final String baseUrl; // ex: http://localhost:8000
  final String teacherToken; // JWT (MVP simples)
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
  final AppDatabase db;
  SyncService(this.repo, this.db);

  Future<void> push(SyncConfig cfg) async {
    final batch = await repo.takeOutboxBatch(200);
    if (batch.isEmpty) return;

    final body = {
      'teacherId': cfg.teacherId,
      'deviceId': cfg.deviceId,
      'events': batch.map((e) => {
        'id': e.id,
        'entity': e.entity,
        'entityId': e.entityId,
        'op': e.op,
        'payload': jsonDecode(e.payloadJson),
        'createdAt': e.createdAt,
      }).toList(),
    };

    final res = await http.post(
      Uri.parse('${cfg.baseUrl}/sync/push'),
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
      Uri.parse('${cfg.baseUrl}/sync/pull?since=$sinceIso'),
      headers: {'Authorization': 'Bearer ${cfg.teacherToken}'},
    );
    if (res.statusCode != 200) {
      throw Exception('Pull failed: ${res.statusCode} ${res.body}');
    }
    final data = jsonDecode(res.body) as Map<String, dynamic>;
    final changes = (data['changes'] as List).cast<Map<String, dynamic>>();

    // MVP: aplica upsert local (sem criar outbox)
    await db.transaction(() async {
      for (final c in changes) {
        final entity = c['entity'] as String;
        final payload = (c['payload'] as Map).cast<String, dynamic>();

        if (entity == 'teacher') {
          await db.into(db.teacherProfiles).insertOnConflictUpdate(
            TeacherProfilesCompanion.insert(
              id: payload['id'],
              name: payload['name'],
              email: payload['email'],
              phone: payload['phone'],
              createdAt: payload['createdAt'],
              updatedAt: payload['updatedAt'],
            ),
          );
        } else if (entity == 'school') {
          await db.into(db.schools).insertOnConflictUpdate(
            SchoolsCompanion.insert(
              id: payload['id'],
              teacherId: payload['teacherId'],
              name: payload['name'],
              city: payload['city'] ?? '',
              createdAt: payload['createdAt'],
              updatedAt: payload['updatedAt'],
            ),
          );
        } else if (entity == 'class') {
          await db.into(db.classGroups).insertOnConflictUpdate(
            ClassGroupsCompanion.insert(
              id: payload['id'],
              teacherId: payload['teacherId'],
              schoolId: payload['schoolId'],
              name: payload['name'],
              schedule: payload['schedule'] ?? '',
              createdAt: payload['createdAt'],
              updatedAt: payload['updatedAt'],
            ),
          );
        } else if (entity == 'student') {
          await db.into(db.students).insertOnConflictUpdate(
            StudentsCompanion.insert(
              id: payload['id'],
              teacherId: payload['teacherId'],
              classId: payload['classId'],
              name: payload['name'],
              notes: payload['notes'] ?? '',
              overall: payload['overall'] ?? 50,
              createdAt: payload['createdAt'],
              updatedAt: payload['updatedAt'],
            ),
          );
        } else if (entity == 'log') {
          await db.into(db.lessonLogs).insertOnConflictUpdate(
            LessonLogsCompanion.insert(
              id: payload['id'],
              teacherId: payload['teacherId'],
              classId: payload['classId'],
              studentId: payload['studentId'] ?? '',
              evolution: payload['evolution'] ?? 0,
              needsCsv: payload['needsCsv'] ?? '',
              repertoireCsv: payload['repertoireCsv'] ?? '',
              planCsv: payload['planCsv'] ?? '',
              comment: payload['comment'] ?? '',
              happenedAt: payload['happenedAt'],
              createdAt: payload['createdAt'],
              updatedAt: payload['updatedAt'],
            ),
          );
        }
      }
    });
  }
}