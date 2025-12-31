import 'package:flutter/material.dart';
import '../../data/repositories.dart';
import '../widgets.dart';
import '../../insights/insights.dart';

class StudentsScreen extends StatefulWidget {
  final Repositories repo;
  const StudentsScreen({required this.repo, super.key});

  @override
  State<StudentsScreen> createState() => _StudentsScreenState();
}

class _StudentsScreenState extends State<StudentsScreen> {
  Future<void> _addStudent(String teacherId, String classId) async {
    final name = TextEditingController();
    final ok = await showDialog<bool>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Novo aluno'),
        content: TextField(controller: name, decoration: const InputDecoration(labelText: 'Nome do aluno')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancelar')),
          ElevatedButton(onPressed: () => Navigator.pop(context, true), child: const Text('Salvar')),
        ],
      ),
    );
    if (ok == true) {
      await widget.repo.addStudent(teacherId, classId, name.text.trim());
      setState(() {});
    }
  }

  @override
  Widget build(BuildContext context) {
    final classId = ModalRoute.of(context)!.settings.arguments as String;

    return FutureBuilder<String?>(
      future: widget.repo.getTeacherId(),
      builder: (context, snap) {
        final teacherId = snap.data;
        if (teacherId == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        final students = widget.repo.listStudents(classId);
        final logs = widget.repo.listLogsForClass(classId);
        final evol = logs.where((l) => l.studentId.isNotEmpty).map((l) => l.evolution).toList().reversed.toList();
        final ins = InsightsEngine().compute(evol);

        return Scaffold(
          appBar: AppBar(title: const Text('Alunos')),
          body: ListView(
            children: [
              SectionTitle('Turma: $classId', subtitle: 'Registro rápido e insights offline.'),
              if (students.isEmpty)
                const Padding(
                  padding: EdgeInsets.all(16),
                  child: Text('Nenhum aluno ainda. Toque em “Adicionar aluno”.'),
                )
              else
                ...students.map((s) => Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
                      child: PrimaryCard(
                        child: Row(
                          children: [
                            const Icon(Icons.person),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(s.name, style: const TextStyle(fontWeight: FontWeight.w800)),
                                  Text('Overall: ${s.overall}',
                                      style: TextStyle(color: Colors.white.withOpacity(0.7))),
                                ],
                              ),
                            ),
                            IconButton(
                              onPressed: () => Navigator.pushNamed(context, '/quick_log', arguments: {
                                'classId': classId,
                                'studentId': s.id,
                              }).then((_) => setState(() {})),
                              icon: const Icon(Icons.bolt),
                            ),
                          ],
                        ),
                      ),
                    )),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                child: PrimaryCard(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Insights (offline)', style: TextStyle(fontWeight: FontWeight.w800)),
                      const SizedBox(height: 8),
                      Text('Tendência: ${ins.trend.toStringAsFixed(2)} | Projeção próxima: ${ins.projectionNext.toStringAsFixed(2)}'),
                      const SizedBox(height: 8),
                      Text(ins.recommendation, style: TextStyle(color: Colors.white.withOpacity(0.8))),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 90),
            ],
          ),
          floatingActionButton: FloatingActionButton.extended(
            onPressed: () => _addStudent(teacherId, classId),
            icon: const Icon(Icons.add),
            label: const Text('Adicionar aluno'),
          ),
        );
      },
    );
  }
}
