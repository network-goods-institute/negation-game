import { Diamond } from 'lucide-react'

interface StakeIndicatorProps {
  percentage: number
}

export function StakeIndicator({ percentage }: StakeIndicatorProps) {
  return (
    <div className="flex items-center gap-1">
      <Diamond className="w-4 h-4 text-blue-600" />
      <span className="text-sm text-gray-600">{percentage}%</span>
    </div>
  )
} 