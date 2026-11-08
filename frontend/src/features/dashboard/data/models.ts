export type ModelAccuracy = {
  name: string
  /** 0 to 1, or null until the model has been evaluated. */
  accuracy: number | null
}

// Placeholder: real values come from the Model & Evaluasi page.
export const modelAccuracies: ModelAccuracy[] = [
  { name: 'C4.5', accuracy: null },
  { name: 'SVM', accuracy: null },
  { name: 'Naive Bayes', accuracy: null },
  { name: 'Random Forest', accuracy: null },
]
