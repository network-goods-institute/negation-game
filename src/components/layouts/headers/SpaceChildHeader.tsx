'use client'

import React from 'react'
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface SpaceChildHeaderProps {
  title: string
  subtitle?: string | React.ReactNode
  backUrl?: string
  onBack?: () => void
  rightActions?: React.ReactNode
  className?: string
}

export function SpaceChildHeader({
  title,
  subtitle,
  backUrl,
  onBack,
  rightActions,
  className
}: SpaceChildHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (backUrl) {
      router.push(backUrl)
    } else {
      router.back()
    }
  }

  return (
    <div className={cn(
      "sticky top-[var(--header-height)] z-40 border-b border-border/50 bg-background",
      className
    )}>
      <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        {/* Left side - Back button and title */}
        <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBack}
            className="flex-shrink-0 h-8 w-8 sm:h-9 sm:w-9"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="sr-only">Go back</span>
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl font-semibold truncate">
              {title}
            </h1>
            {subtitle && (
              typeof subtitle === 'string' ? (
                <p className="text-sm text-muted-foreground truncate">
                  {subtitle}
                </p>
              ) : (
                <div className="text-sm text-muted-foreground">
                  {subtitle}
                </div>
              )
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        {rightActions && (
          <div className="flex items-center gap-2 ml-4 flex-shrink-0">
            {rightActions}
          </div>
        )}
      </div>
    </div>
  )
}