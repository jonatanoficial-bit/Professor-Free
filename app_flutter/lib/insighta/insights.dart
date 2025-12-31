class InsightResult {
  final double trend;
  final double projectionNext;
  final String recommendation;
  InsightResult({required this.trend, required this.projectionNext, required this.recommendation});
}

class InsightsEngine {
  InsightResult compute(List<int> evolutions) {
    if (evolutions.isEmpty) {
      return InsightResult(
        trend: 0,
        projectionNext: 0,
        recommendation: 'Sem dados ainda. Registre 2–3 aulas para gerar projeções.',
      );
    }

    const alpha = 0.45;
    double s = evolutions.first.toDouble();
    for (int i = 1; i < evolutions.length; i++) {
      s = alpha * evolutions[i] + (1 - alpha) * s;
    }

    final recent = evolutions.length >= 6 ? evolutions.sublist(evolutions.length - 6) : evolutions;
    final avgRecent = recent.reduce((a, b) => a + b) / recent.length;

    final trend = s - avgRecent;
    final proj = s;

    String rec;
    if (proj >= 1.2) {
      rec = 'Tendência forte de melhora. Aumente gradualmente a complexidade e mantenha reforço positivo.';
    } else if (proj >= 0.4) {
      rec = 'Melhora consistente. Mantenha rotina e registre necessidades específicas para acelerar.';
    } else if (proj > -0.4) {
      rec = 'Oscilação normal. Ajuste o plano: 1 objetivo principal + 1 exercício de reforço por aula.';
    } else {
      rec = 'Tendência de dificuldade. Reduza carga, revise base, e foque em 1–2 necessidades prioritárias.';
    }

    return InsightResult(trend: trend, projectionNext: proj, recommendation: rec);
  }
}
