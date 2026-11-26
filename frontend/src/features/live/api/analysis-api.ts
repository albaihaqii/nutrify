import { api } from '@/lib/api'
import { type AnalysisResponse, type LiveAnalysis } from '../data/live-analysis'
import { toLiveAnalysis } from '../lib/analysis'

export async function fetchAnalysis(): Promise<LiveAnalysis> {
  const { data } = await api.get<AnalysisResponse>('/camera/analysis')
  return toLiveAnalysis(data)
}
