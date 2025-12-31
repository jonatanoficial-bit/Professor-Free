import 'package:flutter/material.dart';
import '../../data/repositories.dart';
import '../widgets.dart';

class QuickLogScreen extends StatefulWidget {
  final Repositories repo;
  const QuickLogScreen({required this.repo, super.key});

  @override
  State<QuickLogScreen> createState() => _QuickLogScreenState();
}

class _QuickLogScreenState extends State<QuickLogScreen> {
  int evo = 0;
  final comment = TextEditingController();

  final needs = <String>{
    'Atenção', 'Ritmo', 'Coordenação', 'Leitura', 'Afinação', 'Postura', 'Memória', 'Confiança'
  };
  final selectedNeeds = <String>{};

  final repertoirePresets = <String>{'Exercício 1', 'Exercício 2', 'Peça A', 'Peça B'};
  final selectedRep = <String>{};

  final planPresets = <String>{'Aquecimento', 'Técnica', 'Repertório', 'Jogo/Atividade', 'Feedback final'};
  final selectedPlan = <String>{};

  bool saving = false;

  @override
  void dispose() {
    comment.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final args = ModalRoute.of(context)!.settings.arguments;
    final map = (args is Map) ? args.cast<String, dynamic>() : <String, dynamic>{};
    final classId = (map['classId'] as String?) ?? '';
    final studentId = (map['studentId'] as String?) ?? '';

    return FutureBuilder<String?>(
      future: widget.repo.getTeacherId(),
      builder: (context, snap) {
        final teacherId = snap.data;
        if (teacherId == null) {
          return const Scaffold(body: Center(child: CircularProgressIndicator()));
        }

        Future<void> doSave() async {
          if (classId.isEmpty) {
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Abra pelo menu da turma/aluno (MVP).')),
            );
            return;
          }
          setState(() => saving = true);
          try {
            await widget.repo.quickLog(
              teacherId: teacherId,
              classId: classId,
              studentId: studentId,
              evolution: evo,
              needs: selectedNeeds.toList(),
              repertoire: selectedRep.toList(),
              plan: selectedPlan.toList(),
              comment: comment.text.trim(),
            );
            if (mounted) Navigator.pop(context);
          } finally {
            if (mounted) setState(() => saving = false);
          }
        }

        return Scaffold(
          appBar: AppBar(title: const Text('Registro rápido')),
          body: ListView(
            padding: const EdgeInsets.all(16),
            children: [
              PrimaryCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Evolução', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        for (final v in [-2, -1, 0, 1, 2])
                          QuickChip(
                            label: v == -2 ? 'Piorou' : v == -1 ? 'Caiu' : v == 0 ? 'Estável' : v == 1 ? 'Melhorou' : 'Excelente',
                            selected: evo == v,
                            onTap: () => setState(() => evo = v),
                          )
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              PrimaryCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Necessidades (toques rápidos)', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: needs.map((n) => QuickChip(
                        label: n,
                        selected: selectedNeeds.contains(n),
                        onTap: () => setState(() {
                          if (selectedNeeds.contains(n)) selectedNeeds.remove(n); else selectedNeeds.add(n);
                        }),
                      )).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              PrimaryCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Repertório de ensaio', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: repertoirePresets.map((r) => QuickChip(
                        label: r,
                        selected: selectedRep.contains(r),
                        onTap: () => setState(() {
                          if (selectedRep.contains(r)) selectedRep.remove(r); else selectedRep.add(r);
                        }),
                      )).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              PrimaryCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Plano de aula (checklist)', style: TextStyle(fontWeight: FontWeight.w800)),
                    const SizedBox(height: 10),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: planPresets.map((p) => QuickChip(
                        label: p,
                        selected: selectedPlan.contains(p),
                        onTap: () => setState(() {
                          if (selectedPlan.contains(p)) selectedPlan.remove(p); else selectedPlan.add(p);
                        }),
                      )).toList(),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: comment,
                decoration: const InputDecoration(labelText: 'Observação rápida (opcional)'),
                maxLines: 3,
              ),
              const SizedBox(height: 14),
              ElevatedButton.icon(
                onPressed: saving ? null : doSave,
                icon: const Icon(Icons.save),
                label: Text(saving ? 'Salvando...' : 'Salvar registro'),
              ),
            ],
          ),
        );
      },
    );
  }
}
