import 'dart:convert';
import 'package:crypto/crypto.dart';
import '../domain/models.dart';
import 'storage.dart';

String isoNow() => DateTime.now().toUtc().toIso8601String();

String newId(String seed) {
  final raw = '$seed|${DateTime.now().microsecondsSinceEpoch}';
  return sha1.convert(utf8.encode(raw)).toString();
}

class Repositories {
  final Storage storage;
  Repositories(this.storage);

  TeacherProfile? get teacher => storage.getTeacher();

  Future<bool> hasTeacher() async => storage.getTeacher() != null;
  Future<String?> getTeacherId() async => storage.getTeacher()?.id;

  Future<void> upsertTeacher({
    required String name,
    required String email,
    required String phone,
  }) async {
    final now = isoNow();
    final existing = storage.getTeacher();
    final id = existing?.id ?? newId('teacher');

    final profile = TeacherProfile(
      id: id,
      name: name,
      email: email,
      phone: phone,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    );

    await storage.setTeacher(profile);

    await _outboxUpsert('teacher', id, profile.toJson());
  }

  // Schools
  List<School> listSchools(String teacherId) =>
      storage.listAll(storage.schools, School.fromJson).where((s) => s.teacherId == teacherId).toList()
        ..sort((a,b)=>b.updatedAt.compareTo(a.updatedAt));

  Future<String> addSchool(String teacherId, String name, String city) async {
    final id = newId('school');
    final now = isoNow();
    final s = School(id: id, teacherId: teacherId, name: name, city: city, createdAt: now, updatedAt: now);
    await storage.put(storage.schools, id, s.toJson());
    await _outboxUpsert('school', id, s.toJson());
    return id;
  }

  // Classes
  List<ClassGroup> listClasses(String teacherId) =>
      storage.listAll(storage.classes, ClassGroup.fromJson).where((c) => c.teacherId == teacherId).toList()
        ..sort((a,b)=>b.updatedAt.compareTo(a.updatedAt));

  Future<String> addClass(String teacherId, String schoolId, String name, String schedule) async {
    final id = newId('class');
    final now = isoNow();
    final c = ClassGroup(
      id: id, teacherId: teacherId, schoolId: schoolId, name: name, schedule: schedule,
      createdAt: now, updatedAt: now,
    );
    await storage.put(storage.classes, id, c.toJson());
    await _outboxUpsert('class', id, c.toJson());
    return id;
  }

  // Students
  List<Student> listStudents(String classId) =>
      storage.listAll(storage.students, Student.fromJson).where((s) => s.classId == classId).toList()
        ..sort((a,b)=>a.name.toLowerCase().compareTo(b.name.toLowerCase()));

  Future<String> addStudent(String teacherId, String classId, String name) async {
    final id = newId('student');
    final now = isoNow();
    final s = Student(
      id: id, teacherId: teacherId, classId: classId, name: name, notes: '', overall: 50,
      createdAt: now, updatedAt: now,
    );
    await storage.put(storage.students, id, s.toJson());
    await _outboxUpsert('student', id, s.toJson());
    return id;
  }

  // Logs
  List<LessonLog> listLogsForClass(String classId) =>
      storage.listAll(storage.logs, LessonLog.fromJson).where((l) => l.classId == classId).toList()
        ..sort((a,b)=>b.happenedAt.compareTo(a.happenedAt));

  Future<String> quickLog({
    required String teacherId,
    required String classId,
    required String studentId,
    required int evolution,
    required List<String> needs,
    required List<String> repertoire,
    required List<String> plan,
    required String comment,
  }) async {
    final id = newId('log');
    final now = isoNow();
    final l = LessonLog(
      id: id,
      teacherId: teacherId,
      classId: classId,
      studentId: studentId,
      evolution: evolution,
      needsCsv: needs.join(','),
      repertoireCsv: repertoire.join(','),
      planCsv: plan.join(','),
      comment: comment,
      happenedAt: now,
      createdAt: now,
      updatedAt: now,
    );
    await storage.put(storage.logs, id, l.toJson());
    await _outboxUpsert('log', id, l.toJson());
    return id;
  }

  // Outbox
  List<OutboxEvent> takeOutboxBatch(int limit) {
    final all = storage.listOutbox().toList()
      ..sort((a,b)=>a.createdAt.compareTo(b.createdAt));
    return all.take(limit).toList();
  }

  Future<void> deleteOutboxIds(List<String> ids) => storage.deleteOutbox(ids);

  Future<void> _outboxUpsert(String entity, String entityId, Map<String, dynamic> payload) async {
    final ev = OutboxEvent(
      id: newId('outbox'),
      entity: entity,
      entityId: entityId,
      op: 'upsert',
      payload: payload,
      createdAt: isoNow(),
    );
    await storage.putOutbox(ev);
  }

  // Apply changes from server (pull)
  Future<void> applyServerChanges(List<Map<String, dynamic>> changes) async {
    for (final c in changes) {
      final entity = c['entity'] as String;
      final payload = (c['payload'] as Map).cast<String, dynamic>();
      final id = payload['id'] as String?;
      if (id == null) continue;

      if (entity == 'teacher') {
        await storage.setTeacher(TeacherProfile.fromJson(payload));
      } else if (entity == 'school') {
        await storage.put(storage.schools, id, payload);
      } else if (entity == 'class') {
        await storage.put(storage.classes, id, payload);
      } else if (entity == 'student') {
        await storage.put(storage.students, id, payload);
      } else if (entity == 'log') {
        await storage.put(storage.logs, id, payload);
      }
    }
  }
}
