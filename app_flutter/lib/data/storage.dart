import 'dart:convert';
import 'package:hive/hive.dart';
import '../domain/models.dart';

class Storage {
  static const _boxMeta = 'meta';
  static const _boxTeacher = 'teacher';
  static const _boxSchools = 'schools';
  static const _boxClasses = 'classes';
  static const _boxStudents = 'students';
  static const _boxLogs = 'logs';
  static const _boxOutbox = 'outbox';

  late final Box meta;
  late final Box teacher;
  late final Box schools;
  late final Box classes;
  late final Box students;
  late final Box logs;
  late final Box outbox;

  Future<void> init() async {
    meta = await Hive.openBox(_boxMeta);
    teacher = await Hive.openBox(_boxTeacher);
    schools = await Hive.openBox(_boxSchools);
    classes = await Hive.openBox(_boxClasses);
    students = await Hive.openBox(_boxStudents);
    logs = await Hive.openBox(_boxLogs);
    outbox = await Hive.openBox(_boxOutbox);
  }

  // meta helpers
  String? getString(String key) => meta.get(key) as String?;
  Future<void> setString(String key, String value) => meta.put(key, value);

  // Teacher
  TeacherProfile? getTeacher() {
    final raw = teacher.get('profile') as String?;
    if (raw == null) return null;
    return TeacherProfile.fromJson(jsonDecode(raw));
  }

  Future<void> setTeacher(TeacherProfile p) => teacher.put('profile', jsonEncode(p.toJson()));

  // Generic map stores (id -> json string)
  Map<String, dynamic> _decodeMap(Box box, dynamic value) {
    if (value is String) return jsonDecode(value) as Map<String, dynamic>;
    return (value as Map).cast<String, dynamic>();
  }

  Iterable<T> listAll<T>(Box box, T Function(Map<String, dynamic>) fromJson) sync* {
    for (final k in box.keys) {
      final v = box.get(k);
      if (v == null) continue;
      yield fromJson(_decodeMap(box, v));
    }
  }

  Future<void> put(Box box, String id, Map<String, dynamic> json) => box.put(id, jsonEncode(json));
  Future<void> delete(Box box, String id) => box.delete(id);

  // Outbox
  Iterable<OutboxEvent> listOutbox() sync* {
    for (final k in outbox.keys) {
      final v = outbox.get(k);
      if (v == null) continue;
      final m = _decodeMap(outbox, v);
      yield OutboxEvent.fromJson(m);
    }
  }

  Future<void> putOutbox(OutboxEvent ev) => outbox.put(ev.id, jsonEncode(ev.toJson()));
  Future<void> deleteOutbox(List<String> ids) async {
    for (final id in ids) {
      await outbox.delete(id);
    }
  }
}
