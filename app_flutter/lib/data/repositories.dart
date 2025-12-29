import 'dart:convert';
import 'package:crypto/crypto.dart';
import 'package:drift/drift.dart';
import '../data/db.dart';

String isoNow() => DateTime.now().toUtc().toIso8601String();

String newId(String seed) {
  final raw = '$seed|${DateTime.now().microsecondsSinceEpoch}';
  return sha1.convert(utf8.encode(raw)).toString();
}

class Repositories {
  final AppDatabase db;
  Repositories(this.db);

  Future<bool> hasTeacher() async {
    final rows = await db.select(db.teacherProfiles).get();
    return rows.isNotEmpty;
  }

  Future<String?> getTeacherId() async {
    final row = await db.select(db.teacherProfiles).getSingleOrNull();
    return row?.id;
  }

  Future<void> upsertTeacher({
    required String name,
    required String email,
    required String phone,
  }) async {
    final now = isoNow();
    final existing = await db.select(db.teacherProfiles).getSingleOrNull();
    final id = existing?.id ?? newId('teacher');
    await db.into(db.teacherProfiles).insertOnConflictUpdate(
      TeacherProfilesCompanion.insert(
        id: id,
        name: name,
        email: email,
        phone: phone,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      ),
    );
    await _outboxUpsert('teacher', id, {
      'id': id, 'name': name, 'email': email, 'phone': phone,
      'createdAt': existing?.createdAt ?? now, 'updatedAt': now,
    });
  }

  Stream<List<School>> watchSchools(String teacherId) {
    final q = db.select(db.schools)..where((t) => t.teacherId.equals(teacherId));
    return q.watch().map((rows) => rows.map((r) => School(
      id: r.id, teacherId: r.teacherId, name: r.name, city: r.city,
      createdAt: r.createdAt, updatedAt: r.updatedAt,
    )).toList());
  }

  Future<String> addSchool(String teacherId, String name, String city) async {
    final id = newId('school');
    final now = isoNow();
    await db.into(db.schools).insert(SchoolsCompanion.insert(
      id: id, teacherId: teacherId, name: name, city: city, createdAt: now, updatedAt: now,
    ));
    await _outboxUpsert('school', id, {
      'id': id, 'teacherId': teacherId, 'name': name, 'city': city,
      'createdAt': now, 'updatedAt': now,
    });
    return id;
  }

  Stream<List<ClassGroup>> watchClasses(String teacherId) {
    final q = db.select(db.classGroups)..where((t) => t.teacherId.equals(teacherId));
    return q.watch().map((rows) => rows.map((r) => ClassGroup(
      id: r.id, teacherId: r.teacherId, schoolId: r.schoolId,
      name: r.name, schedule: r.schedule, createdAt: r.createdAt, updatedAt: r.updatedAt,
    )).toList());
  }

  Future<String> addClass(String teacherId, String schoolId, String name, String schedule) async {
    final id = newId('class');
    final now = isoNow();
    await db.into(db.classGroups).insert(ClassGroupsCompanion.insert(
      id: id, teacherId: teacherId, schoolId: schoolId, name: name, schedule: schedule,
      createdAt: now, updatedAt: now,
    ));
    await _outboxUpsert('class', id, {
      'id': id, 'teacherId': teacherId, 'schoolId': schoolId, 'name': name, 'schedule': schedule,
      'createdAt': now, 'updatedAt': now,
    });
    return id;
  }

  Stream<List<Student>> watchStudents(String classId) {
    final q = db.select(db.students)..where((t) => t.classId.equals(classId));
    return q.watch().map((rows) => rows.map((r) => Student(
      id: r.id, teacherId: r.teacherId, classId: r.classId, name: r.name,
      notes: r.notes, overall: r.overall, createdAt: r.createdAt, updatedAt: r.updatedAt,
    )).toList());
  }

  Future<String> addStudent(String teacherId, String classId, String name) async {
    final id = newId('student');
    final now = isoNow();
    await db.into(db.students).insert(StudentsCompanion.insert(
      id: id, teacherId: teacherId, classId: classId, name: name,
      createdAt: now, updatedAt: now,
    ));
    await _outboxUpsert('student', id, {
      'id': id, 'teacherId': teacherId, 'classId': classId, 'name': name,
      'notes': '', 'overall': 50, 'createdAt': now, 'updatedAt': now,
    });
    return id;
  }

  Future<String> quickLog({
    required String teacherId,
    required String classId,
    required String studentId, // "" para turma toda
    required int evolution,
    required List<String> needs,
    required List<String> repertoire,
    required List<String> plan,
    required String comment,
  }) async {
    final id = newId('log');
    final now = isoNow();
    final payload = {
      'id': id,
      'teacherId': teacherId,
      'classId': classId,
      'studentId': studentId,
      'evolution': evolution,
      'needsCsv': needs.join(','),
      'repertoireCsv': repertoire.join(','),
      'planCsv': plan.join(','),
      'comment': comment,
      'happenedAt': now,
      'createdAt': now,
      'updatedAt': now,
    };
    await db.into(db.lessonLogs).insert(LessonLogsCompanion.insert(
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
    ));
    await _outboxUpsert('log', id, payload);
    return id;
  }

  Stream<List<LessonLogRow>> watchLogsForClass(String classId) {
    final q = db.select(db.lessonLogs)..where((t) => t.classId.equals(classId));
    q.orderBy([(t) => OrderingTerm(expression: t.happenedAt, mode: OrderingMode.desc)]);
    return q.watch();
  }

  Future<void> _outboxUpsert(String entity, String entityId, Map<String, dynamic> payload) async {
    await db.into(db.outbox).insert(OutboxCompanion.insert(
      entity: entity,
      entityId: entityId,
      op: 'upsert',
      payloadJson: jsonEncode(payload),
      createdAt: isoNow(),
    ));
  }

  Future<List<OutboxData>> takeOutboxBatch(int limit) async {
    final q = db.select(db.outbox)..limit(limit);
    return q.get();
  }

  Future<void> deleteOutboxIds(List<int> ids) async {
    await (db.delete(db.outbox)..where((t) => t.id.isIn(ids))).go();
  }
}