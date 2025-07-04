"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronDown, ChevronRight, Expand, Shrink } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface CardDeckGroup {
  id: string;
  title: string;
  description?: string;
  count: number;
  unreadCount?: number;
  icon?: string;
  items: any[];
  priority?: number;
}

interface CollapsibleCardDeckProps {
  groups: CardDeckGroup[];
  renderItem: (item: any) => React.ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  emptyMessage?: string;
  showGroupStats?: boolean;
  expandedGroups?: Set<string>;
  onExpandedChange?: (expanded: Set<string>) => void;
}

export function CollapsibleCardDeck({
  groups,
  renderItem,
  defaultExpanded = false,
  className,
  emptyMessage = "No items to display",
  showGroupStats = true,
  expandedGroups: controlledExpanded,
  onExpandedChange,
}: CollapsibleCardDeckProps) {
  const [internalExpanded, setInternalExpanded] = useState<Set<string>>(
    new Set(defaultExpanded ? groups.map(g => g.id) : [])
  );

  const expandedGroups = controlledExpanded ?? internalExpanded;
  const setExpandedGroups = onExpandedChange ?? setInternalExpanded;

  const toggleGroup = (groupId: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      // eslint-disable-next-line drizzle/enforce-delete-with-where
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  if (groups.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="text-center py-12">
          <div className="text-muted-foreground">{emptyMessage}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {groups.map((group) => {
        const isExpanded = expandedGroups.has(group.id);

        return (
          <div key={group.id} className="border rounded-lg overflow-hidden bg-card">
            <button
              onClick={() => toggleGroup(group.id)}
              className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}

                {group.icon && (
                  <span className="text-base" role="img" aria-label={group.title}>
                    {group.icon}
                  </span>
                )}

                <div className="text-left">
                  <h3 className="font-medium text-sm">{group.title}</h3>
                  {group.description && (
                    <p className="text-xs text-muted-foreground">{group.description}</p>
                  )}
                </div>
              </div>

              {showGroupStats && (
                <div className="flex items-center space-x-2">
                  {group.unreadCount !== undefined && group.unreadCount > 0 && (
                    <Badge variant="destructive" className="text-xs h-5">
                      {group.unreadCount}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs h-5">
                    {group.count}
                  </Badge>
                </div>
              )}
            </button>

            {isExpanded && (
              <div className="border-t bg-muted/20">
                <div className="p-3 space-y-2">
                  {group.items.map((item, index) => (
                    <div key={item.id || index}>
                      {renderItem(item)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface CardDeckControlsProps {
  groups: CardDeckGroup[];
  expandedGroups: Set<string>;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onGroupingChange?: (grouping: string) => void;
  currentGrouping?: string;
  groupingOptions?: Array<{ value: string; label: string }>;
}

export function CardDeckControls({
  groups,
  expandedGroups,
  onExpandAll,
  onCollapseAll,
  onGroupingChange,
  currentGrouping,
  groupingOptions,
}: CardDeckControlsProps) {
  const totalCount = groups.reduce((sum, group) => sum + group.count, 0);
  const unreadCount = groups.reduce((sum, group) => sum + (group.unreadCount || 0), 0);
  const allExpanded = groups.length > 0 && groups.every(g => expandedGroups.has(g.id));
  const allCollapsed = groups.length > 0 && groups.every(g => !expandedGroups.has(g.id));

  return (
    <div className="flex items-center justify-between mb-3 p-3 bg-muted/30 rounded-lg border">
      <div className="flex items-center space-x-3">
        <div className="text-sm font-medium">
          {totalCount} items • {groups.length} groups
        </div>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="text-xs">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      <div className="flex items-center space-x-2">
        {groupingOptions && onGroupingChange && (
          <Select value={currentGrouping} onValueChange={onGroupingChange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {groupingOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="sm"
            onClick={onExpandAll}
            disabled={allExpanded}
            className="h-8 px-2 rounded-r-none border-r"
          >
            <Expand className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapseAll}
            disabled={allCollapsed}
            className="h-8 px-2 rounded-l-none"
          >
            <Shrink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}