'use client'

import { Filter, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { TopicsSidebar } from '@/components/space/TopicsSidebar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils/cn'
import { Separator } from '@/components/ui/separator'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { SortOrder } from '@/app/s/[space]/SpacePageClient'
import { SearchInput } from '@/components/search/SearchInput'
import { PointFilterSelector } from '@/components/inputs/PointFilterSelector'

interface MobileFilterDrawerProps {
  space: string
  topicFilters: string[]
  onTopicFiltersChange: (filters: string[]) => void
  sortOrder: SortOrder
  onSortOrderChange: (order: SortOrder) => void
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  searchQuery: string
  onSearchQueryChange: (query: string) => void
  className?: string
  // Point filtering
  points?: any[]
  selectedPointIds?: number[]
  onPointSelect?: (pointId: number) => void
  onPointDeselect?: (pointId: number) => void
  onClearAllPoints?: () => void
  matchType?: "any" | "all"
  onMatchTypeChange?: (type: "any" | "all") => void
  selectedTab?: string
}

export function MobileFilterDrawer({
  space,
  topicFilters,
  onTopicFiltersChange,
  sortOrder,
  onSortOrderChange,
  isOpen,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  className,
  // Point filtering
  points = [],
  selectedPointIds = [],
  onPointSelect,
  onPointDeselect,
  onClearAllPoints,
  matchType = "any",
  onMatchTypeChange,
  selectedTab
}: MobileFilterDrawerProps) {
  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 focus:outline-none focus:ring-0 focus-visible:ring-0",
            isOpen
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            className
          )}
        >
          <Filter className="h-4 w-4" />
        </button>
      </SheetTrigger>
      <SheetContent
        side="right"
        className="w-[320px] p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle>Filters & Sort</SheetTitle>
        </SheetHeader>
        
        <ScrollArea className="h-full">
          <div className="flex flex-col">
            {/* Search Section */}
            <div className="p-4">
              <SearchInput
                value={searchQuery}
                onChange={onSearchQueryChange}
                placeholder="Search..."
                onEnter={() => onOpenChange(false)}
              />
            </div>
            
            <Separator />
            
            {/* Sort Order Section */}
            <div className="p-4 space-y-3">
              <Label className="text-sm font-medium">Sort by</Label>
              <RadioGroup value={sortOrder} onValueChange={onSortOrderChange}>
                <div className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value="recent" id="recent" />
                  <Label htmlFor="recent" className="font-normal cursor-pointer">
                    Most Recent
                  </Label>
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value="favor" id="favor" />
                  <Label htmlFor="favor" className="font-normal cursor-pointer">
                    Highest Favor
                  </Label>
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value="cred" id="cred" />
                  <Label htmlFor="cred" className="font-normal cursor-pointer">
                    Most Cred
                  </Label>
                </div>
                <div className="flex items-center space-x-2 py-2">
                  <RadioGroupItem value="activity" id="activity" />
                  <Label htmlFor="activity" className="font-normal cursor-pointer">
                    Most Active
                  </Label>
                </div>
              </RadioGroup>
            </div>
            
            <Separator />
            
            {/* Point Filter Section - only show for rationales and all tabs */}
            {(selectedTab === "rationales" || selectedTab === "all") && onPointSelect && onPointDeselect && onClearAllPoints && onMatchTypeChange && (
              <>
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Filter by Points</Label>
                    {selectedPointIds.length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClearAllPoints}
                        className="h-auto py-1 px-2.5 text-xs"
                      >
                        Clear all
                      </Button>
                    )}
                  </div>
                  <PointFilterSelector
                    points={points}
                    selectedPointIds={selectedPointIds}
                    onPointSelect={onPointSelect}
                    onPointDeselect={onPointDeselect}
                    onClearAll={onClearAllPoints}
                    matchType={matchType}
                    onMatchTypeChange={onMatchTypeChange}
                  />
                </div>
                <Separator />
              </>
            )}
            
            {/* Topics Section */}
            <div className="py-4">
              <div className="px-4 pb-3">
                <Label className="text-sm font-medium">Topics</Label>
              </div>
              <div className="px-4">
                <TopicsSidebar
                  space={space}
                  topicFilters={topicFilters}
                  onTopicFiltersChange={onTopicFiltersChange}
                  isOpen={true}
                  onClose={() => onOpenChange(false)}
                />
              </div>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}