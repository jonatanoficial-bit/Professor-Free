class TeacherProfile {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String createdAt;
  final String updatedAt;

  TeacherProfile({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'name': name,
        'email': email,
        'phone': phone,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static TeacherProfile fromJson(Map<String, dynamic> j) => TeacherProfile(
        id: j['id'],
        name: j['name'],
        email: j['email'],
        phone: j['phone'],
        createdAt: j['createdAt'],
        updatedAt: j['updatedAt'],
      );
}

class School {
  final String id;
  final String teacherId;
  final String name;
  final String city;
  final String createdAt;
  final String updatedAt;

  School({
    required this.id,
    required this.teacherId,
    required this.name,
    required this.city,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'teacherId': teacherId,
        'name': name,
        'city': city,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static School fromJson(Map<String, dynamic> j) => School(
        id: j['id'],
        teacherId: j['teacherId'],
        name: j['name'],
        city: j['city'] ?? '',
        createdAt: j['createdAt'],
        updatedAt: j['updatedAt'],
      );
}

class ClassGroup {
  final String id;
  final String teacherId;
  final String schoolId;
  final String name;
  final String schedule;
  final String createdAt;
  final String updatedAt;

  ClassGroup({
    required this.id,
    required this.teacherId,
    required this.schoolId,
    required this.name,
    required this.schedule,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'teacherId': teacherId,
        'schoolId': schoolId,
        'name': name,
        'schedule': schedule,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static ClassGroup fromJson(Map<String, dynamic> j) => ClassGroup(
        id: j['id'],
        teacherId: j['teacherId'],
        schoolId: j['schoolId'],
        name: j['name'],
        schedule: j['schedule'] ?? '',
        createdAt: j['createdAt'],
        updatedAt: j['updatedAt'],
      );
}

class Student {
  final String id;
  final String teacherId;
  final String classId;
  final String name;
  final String notes;
  final int overall;
  final String createdAt;
  final String updatedAt;

  Student({
    required this.id,
    required this.teacherId,
    required this.classId,
    required this.name,
    required this.notes,
    required this.overall,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'teacherId': teacherId,
        'classId': classId,
        'name': name,
        'notes': notes,
        'overall': overall,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static Student fromJson(Map<String, dynamic> j) => Student(
        id: j['id'],
        teacherId: j['teacherId'],
        classId: j['classId'],
        name: j['name'],
        notes: j['notes'] ?? '',
        overall: (j['overall'] ?? 50) as int,
        createdAt: j['createdAt'],
        updatedAt: j['updatedAt'],
      );
}

class LessonLog {
  final String id;
  final String teacherId;
  final String classId;
  final String studentId; // "" coletivo
  final int evolution; // -2..+2
  final String needsCsv;
  final String repertoireCsv;
  final String planCsv;
  final String comment;
  final String happenedAt;
  final String createdAt;
  final String updatedAt;

  LessonLog({
    required this.id,
    required this.teacherId,
    required this.classId,
    required this.studentId,
    required this.evolution,
    required this.needsCsv,
    required this.repertoireCsv,
    required this.planCsv,
    required this.comment,
    required this.happenedAt,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'teacherId': teacherId,
        'classId': classId,
        'studentId': studentId,
        'evolution': evolution,
        'needsCsv': needsCsv,
        'repertoireCsv': repertoireCsv,
        'planCsv': planCsv,
        'comment': comment,
        'happenedAt': happenedAt,
        'createdAt': createdAt,
        'updatedAt': updatedAt,
      };

  static LessonLog fromJson(Map<String, dynamic> j) => LessonLog(
        id: j['id'],
        teacherId: j['teacherId'],
        classId: j['classId'],
        studentId: j['studentId'] ?? '',
        evolution: (j['evolution'] ?? 0) as int,
        needsCsv: j['needsCsv'] ?? '',
        repertoireCsv: j['repertoireCsv'] ?? '',
        planCsv: j['planCsv'] ?? '',
        comment: j['comment'] ?? '',
        happenedAt: j['happenedAt'],
        createdAt: j['createdAt'],
        updatedAt: j['updatedAt'],
      );
}

class OutboxEvent {
  final String id;
  final String entity;
  final String entityId;
  final String op; // upsert/delete
  final Map<String, dynamic> payload;
  final String createdAt;

  OutboxEvent({
    required this.id,
    required this.entity,
    required this.entityId,
    required this.op,
    required this.payload,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'entity': entity,
        'entityId': entityId,
        'op': op,
        'payload': payload,
        'createdAt': createdAt,
      };

  static OutboxEvent fromJson(Map<String, dynamic> j) => OutboxEvent(
        id: j['id'],
        entity: j['entity'],
        entityId: j['entityId'],
        op: j['op'],
        payload: (j['payload'] as Map).cast<String, dynamic>(),
        createdAt: j['createdAt'],
      );
}
