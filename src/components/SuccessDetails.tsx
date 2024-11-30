import { CheckCircle } from 'lucide-react'

interface SuccessDetailsProps {
  favorEarned: number
  restakeAmount: number
  restakePercentage: number
  totalStaked: number
  maxStakeable: number
}

export function SuccessDetails({
  favorEarned,
  restakeAmount,
  restakePercentage,
  totalStaked,
  maxStakeable,
}: SuccessDetailsProps) {
  const totalStakePercentage = (totalStaked / maxStakeable) * 100

  return (
    <div className="flex flex-col items-center gap-6 p-6 bg-gray-50 rounded-lg">
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-6 h-6" />
        <span className="text-lg font-medium">Success!</span>
      </div>

      <div className="space-y-4 w-full">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Additional Favor Earned</span>
          <span className="font-medium">+{favorEarned}</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Negation Restake</span>
            <span className="font-medium">{restakeAmount} ({restakePercentage}%)</span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${restakePercentage}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Total Cred Staked</span>
            <span className="font-medium">
              {totalStaked}/{maxStakeable} ({totalStakePercentage.toFixed(1)}%)
            </span>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ width: `${totalStakePercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  )
} 