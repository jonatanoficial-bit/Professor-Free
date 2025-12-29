import 'package:flutter/material.dart';
import 'theme.dart';
import 'data/db.dart';
import 'data/repositories.dart';
import 'routes.dart';
import 'sync/sync_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  final db = AppDatabase();
  final repo = Repositories(db);
  final sync = SyncService(repo, db);

  final hasTeacher = await repo.hasTeacher();
  runApp(TeacherAssistApp(
    repo: repo,
    sync: sync,
    initialRoute: hasTeacher ? '/home' : '/onboarding',
  ));
}

class TeacherAssistApp extends StatelessWidget {
  final Repositories repo;
  final SyncService sync;
  final String initialRoute;

  const TeacherAssistApp({
    required this.repo,
    required this.sync,
    required this.initialRoute,
    super.key,
  });

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Teacher Assist',
      theme: AppTheme.dark(),
      initialRoute: initialRoute,
      routes: AppRoutes.build(repo, sync),
    );
  }
}