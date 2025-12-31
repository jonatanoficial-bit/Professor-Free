import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';

import 'theme.dart';
import 'routes.dart';
import 'data/storage.dart';
import 'data/repositories.dart';
import 'sync/sync_service.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();

  final storage = Storage();
  await storage.init();

  final repo = Repositories(storage);
  final sync = SyncService(repo);

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
