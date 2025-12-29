import 'package:flutter/material.dart';
import 'data/repositories.dart';
import 'sync/sync_service.dart';

import 'ui/screens/onboarding.dart';
import 'ui/screens/home.dart';
import 'ui/screens/schools.dart';
import 'ui/screens/classes.dart';
import 'ui/screens/students.dart';
import 'ui/screens/quick_log.dart';
import 'ui/screens/settings.dart';

class AppRoutes {
  static Map<String, WidgetBuilder> build(Repositories repo, SyncService sync) {
    return {
      '/onboarding': (_) => OnboardingScreen(repo: repo),
      '/home': (_) => HomeScreen(repo: repo),
      '/schools': (_) => SchoolsScreen(repo: repo),
      '/classes': (_) => ClassesScreen(repo: repo),
      '/students': (_) => StudentsScreen(repo: repo),
      '/quick_log': (_) => QuickLogScreen(repo: repo),
      '/settings': (_) => SettingsScreen(repo: repo, sync: sync),
    };
  }
}