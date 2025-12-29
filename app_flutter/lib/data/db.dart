import 'dart:io';
import 'package:drift/drift.dart';
import 'package:drift_flutter/drift_flutter.dart';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

part 'db.g.dart';

class TeacherProfiles extends Table {
  TextColumn get id => text()();
  TextColumn get name => text()();
  TextColumn get email => text()();
  TextColumn get phone => text()();
  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class Schools extends Table {
  TextColumn get id => text()();
  TextColumn get teacherId => text()();
  TextColumn get name => text()();
  TextColumn get city => text().withDefault(const Constant(''))();
  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class ClassGroups extends Table {
  TextColumn get id => text()();
  TextColumn get teacherId => text()();
  TextColumn get schoolId => text()();
  TextColumn get name => text()();
  TextColumn get schedule => text().withDefault(const Constant(''))();
  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class Students extends Table {
  TextColumn get id => text()();
  TextColumn get teacherId => text()();
  TextColumn get classId => text()();
  TextColumn get name => text()();
  TextColumn get notes => text().withDefault(const Constant(''))();
  IntColumn get overall => integer().withDefault(const Constant(50))();
  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class LessonLogs extends Table {
  TextColumn get id => text()();
  TextColumn get teacherId => text()();
  TextColumn get classId => text()();
  TextColumn get studentId => text().withDefault(const Constant(''))();
  IntColumn get evolution => integer().withDefault(const Constant(0))();
  TextColumn get needsCsv => text().withDefault(const Constant(''))();
  TextColumn get repertoireCsv => text().withDefault(const Constant(''))();
  TextColumn get planCsv => text().withDefault(const Constant(''))();
  TextColumn get comment => text().withDefault(const Constant(''))();
  TextColumn get happenedAt => text()(); // ISO
  TextColumn get createdAt => text()();
  TextColumn get updatedAt => text()();
  @override
  Set<Column> get primaryKey => {id};
}

class Outbox extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get entity => text()(); // teacher/school/class/student/log
  TextColumn get entityId => text()();
  TextColumn get op => text()(); // upsert/delete
  TextColumn get payloadJson => text()();
  TextColumn get createdAt => text()();
}

@DriftDatabase(tables: [TeacherProfiles, Schools, ClassGroups, Students, LessonLogs, Outbox])
class AppDatabase extends _$AppDatabase {
  AppDatabase() : super(_openConnection());
  @override
  int get schemaVersion => 1;

  static QueryExecutor _openConnection() {
    return driftDatabase(
      name: 'teacher_assist.db',
      web: DriftWebOptions(
        sqlite3Wasm: Uri.parse('sqlite3.wasm'),
        driftWorker: Uri.parse('drift_worker.js'),
      ),
      native: DriftNativeOptions(
        databaseDirectory: () async {
          final dir = await getApplicationDocumentsDirectory();
          return dir;
        },
        setup: (database) {
          database.execute('PRAGMA foreign_keys = ON;');
        },
      ),
    );
  }
}