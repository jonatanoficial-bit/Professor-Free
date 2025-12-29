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
}

class LessonLog {
  final String id;
  final String teacherId;
  final String classId;
  final String studentId; // "" = registro da turma (coletivo)
  final int evolution; // -2..+2
  final String needsCsv; // tags separadas por vírgula
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
}
