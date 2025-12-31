import 'package:flutter/material.dart';
import '../../data/repositories.dart';
import '../widgets.dart';

class ClassesScreen extends StatefulWidget {
  final Repositories repo;
  const ClassesScreen({required this.repo, super.key});

  @override
  State<ClassesScreen> createState() => _ClassesScreenState();
}

class _ClassesScreenState extends State<ClassesScreen> {
  Future<void> _addClass(String teacherId) async {
    final schoolId = TextEditingController();
    final name = TextEditingController();
    final schedule = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Nova turma'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(controller: schoolId, decoration: const InputDecoration(labelText: 'ID da escola')),
            const SizedBox(height: 10),
            TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome da turma')),
            const SizedBox(height: 10),
            TextField(controller: schedule, decoration: const InputDecoration(labelText: 'Horário (opcional)')),
          ],
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
        ],
      ),
    );
    if (ok == true) {
      await widget.repo.addClass(teacherId, schoolId.text.trim(), name.text.trim(), schedule.text.trim());
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

        final classes = widget.repo.listClasses(teacherId);

        return Scaffold(
          appBar: AppBar(title: const Text('Turmas')),
          body: ListView(
            children: [
              const SectionTitle('Suas turmas', subtitle: 'Toque para ver alunos.'),
              ...classes.map((c) => Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(16),
                      onTap: () => Navigator.pushNamed(context, '/students', arguments: c.id),
                      child: PrimaryCard(
                        child: Row(
                          children: [
                            const Icon(Icons.groups),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(c.name, style: const TextStyle(fontWeight: FontWeight.w700)),
                                  if (c.schedule.isNotEmpty)
                                    Text(c.schedule, style: TextStyle(color: Colors.white.withOpacity(0.7))),
                                  Text('SchoolID: ${c.schoolId}',
                                      style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  )),
              const SizedBox(height: 90),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _addClass(teacherId),
            icon: const Icon(Icons.add),
            label: const Text('Adicionar turma'),
          ),
        );
      },
    );
  }
}
