export type EdgeLike = {
  id?: string | number
  type?: string
  data?: any
}

export const shouldRenderMindchangeBadge = (edge: EdgeLike, featureEnabled: boolean = true): boolean => {
  if (!featureEnabled) return false
  const t = String(edge?.type || '')
  if (t === 'objection') return false
  const mc = edge?.data?.mindchange
  const fCount = Number(mc?.forward?.count || 0)
  const bCount = Number(mc?.backward?.count || 0)
  return fCount > 0 || bCount > 0
}

