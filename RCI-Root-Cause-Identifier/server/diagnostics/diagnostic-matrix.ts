export function buildDiagnosticMatrix(signals: { category: string }[]) {

  const matrix: Record<string, number> = {
    Money: 0,
    Manpower: 0,
    Machinery: 0,
    Materials: 0
  };

  for (const signal of signals) {

    const category = signal.category;

    if (matrix[category] !== undefined) {

      matrix[category]++;

    }

  }

  return matrix;

}
