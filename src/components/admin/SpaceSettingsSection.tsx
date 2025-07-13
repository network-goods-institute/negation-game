"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useSpaceTopicCreationPermission } from "@/hooks/spaces/useSpaceTopicCreationPermission";
import { updateSpaceSettings } from "@/actions/spaces/updateSpaceSettings";

interface SpaceSettingsSectionProps {
  spaceId: string;
}

export function SpaceSettingsSection({ spaceId }: SpaceSettingsSectionProps) {
  const queryClient = useQueryClient();
  const { data: allowPublicTopicCreation, isLoading } = useSpaceTopicCreationPermission(spaceId);
  const [isUpdating, setIsUpdating] = useState(false);

  const updateSettingsMutation = useMutation({
    mutationFn: updateSpaceSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["space-topic-creation-permission", spaceId] });
      toast.success("Space settings updated successfully");
    },
    onError: () => {
      toast.error("Failed to update space settings");
    },
    onSettled: () => {
      setIsUpdating(false);
    },
  });

  const handleToggleTopicCreation = async (enabled: boolean) => {
    setIsUpdating(true);
    updateSettingsMutation.mutate({
      spaceId,
      allowPublicTopicCreation: enabled,
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Space Settings</CardTitle>
          <CardDescription>Configure space-level permissions and features</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
            <div className="h-6 bg-gray-200 rounded w-12"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Space Settings</CardTitle>
        <CardDescription>Configure space-level permissions and features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="topic-creation" className="text-base">
              Allow Public Topic Creation
            </Label>
            <p className="text-sm text-muted-foreground">
              Allow non-admin users to create new topics in this space
            </p>
          </div>
          <Switch
            id="topic-creation"
            checked={allowPublicTopicCreation || false}
            onCheckedChange={handleToggleTopicCreation}
            disabled={isUpdating}
          />
        </div>
      </CardContent>
    </Card>
  );
}