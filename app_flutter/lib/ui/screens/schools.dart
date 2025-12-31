import 'package:flutter/material.dart';
import '../../data/repositories.dart';
import '../widgets.dart';

class SchoolsScreen extends StatefulWidget {
  final Repositories repo;
  const SchoolsScreen({required this.repo, super.key});

  @override
  State<SchoolsScreen> createState() => _SchoolsScreenState();
}

class _SchoolsScreenState extends State<SchoolsScreen> {
  Future<void> _addSchool(String teacherId) async {
    final name = TextEditingController();
    final city = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Nova escola'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome')),
            const SizedBox(height: 10),
            TextField(controller: city, decoration: const InputDecoration(labelText: 'Cidade')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
        ],
      ),
    );
    if (ok == true) {
      await widget.repo.addSchool(teacherId, name.text.trim(), city.text.trim());
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<String?>(
      future: widget.repo.getTeacherId(),
      builder: (context, snap) {
        final teacherId = snap.data;
        if (teacherId == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final schools = widget.repo.listSchools(teacherId);

        return Scaffold(
          appBar: AppBar(title: const Text('Escolas')),
          body: ListView(
            children: [
              const SectionTitle('Suas escolas'),
              ...schools.map((s) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: PrimaryCard(
                      child: Row(
                        children: [
                          const Icon(Icons.apartment),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(s.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                if (s.city.isNotEmpty)
                                  Text(s.city, style: TextStyle(color: Colors.white.withOpacity(0.7))),
                                Text('ID: ${s.id}',
                                    style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  )),
              const SizedBox(height: 90),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _addSchool(teacherId),
            icon: const Icon(Icons.add),
            label: const Text('Adicionar escola'),
          ),
        );
      },
    );
  }
}
