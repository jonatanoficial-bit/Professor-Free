import 'package:flutter/material.dart';
import '../../data/repositories.dart';
import '../widgets.dart';

class HomeScreen extends StatelessWidget {
  final Repositories repo;
  const HomeScreen({required this.repo, super.key});

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: repo.getTeacherId(),
      builder: (context, snap) {
        final teacherId = snap.data;
        if (teacherId == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        return Scaffold(
          appBar: AppBar(title: const Text('Teacher Assist')),
          body: ListView(
            children: const [
              SectionTitle('Acesso rápido', subtitle: 'Cadastre e registre aulas em poucos toques.'),
              Padding(
                padding: EdgeInsets.symmetric(horizontal: 16),
                child: Text('Use o menu para escolas/turmas e o botão para registro rápido.'),
              ),
            ],
          ),
          bottomNavigationBar: NavigationBar(
            selectedIndex: 0,
            onDestinationSelected: (i) {
              if (i == 0) Navigator.pushNamed(context, '/home');
              if (i == 1) Navigator.pushNamed(context, '/schools');
              if (i == 2) Navigator.pushNamed(context, '/classes');
              if (i == 3) Navigator.pushNamed(context, '/settings');
            },
            destinations: const [
              NavigationDestination(icon: Icon(Icons.home), label: 'Início'),
              NavigationDestination(icon: Icon(Icons.apartment), label: 'Escolas'),
              NavigationDestination(icon: Icon(Icons.groups), label: 'Turmas'),
              NavigationDestination(icon: Icon(Icons.settings), label: 'Config'),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => Navigator.pushNamed(context, '/quick_log'),
            icon: const Icon(Icons.bolt),
            label: const Text('Registro rápido'),
          ),
        );
      },
    );
  }
}
