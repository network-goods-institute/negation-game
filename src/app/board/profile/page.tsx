"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Upload, RefreshCw, ArrowLeft } from "lucide-react";
import { fetchUser } from "@/actions/users/fetchUser";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { uploadAvatar } from "@/actions/users/uploadAvatar";
import { voterCache } from "@/lib/voterCache";

type ProfileData = {
  id: string;
  username: string;
  createdAt: string;
  avatarUrl?: string | null;
  avatarUpdatedAt?: string | null;
};

const MAX_UPLOAD_BYTES = 1_000_000;
const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const formatDate = (value: string | Date) =>
  new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const relativeTime = (value: string | Date) => {
  const now = Date.now();
  const ts = new Date(value).getTime();
  const diff = now - ts;
  const minutes = Math.floor(diff / (1000 * 60));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export default function ProfilePage() {
  const router = useRouter();
  const { ready, authenticated, user, login } = usePrivy();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [avatarVersion, setAvatarVersion] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user?.id) {
      setLoadingProfile(false);
      return;
    }

    const load = async () => {
      try {
        setLoadingProfile(true);
        const data = await fetchUser(user.id);
        if (data) {
          setProfile(data as ProfileData);
        }
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoadingProfile(false);
      }
    };

    load();
  }, [ready, authenticated, user?.id]);

  const initials = useMemo(() => {
    if (profile?.username) {
      return profile.username.slice(0, 2).toUpperCase();
    }
    if (user?.email?.address) {
      return user.email.address.slice(0, 2).toUpperCase();
    }
    return "U";
  }, [profile?.username, user?.email?.address]);

  const avatarSrc = useMemo(() => {
    if (!profile?.avatarUrl) return undefined;
    const version =
      avatarVersion ??
      (profile.avatarUpdatedAt ? new Date(profile.avatarUpdatedAt).getTime() : 0);
    return version ? `${profile.avatarUrl}?v=${version}` : profile.avatarUrl;
  }, [avatarVersion, profile?.avatarUrl, profile?.avatarUpdatedAt]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Use PNG, JPEG, or WEBP");
      return;
    }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) {
      toast.error("Avatar must be under 1MB");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const result = await uploadAvatar(form);
      if (!result?.success) {
        throw new Error(result?.error || "Upload failed");
      }
      setAvatarVersion(Date.now());
      if (profile?.id) {
        voterCache.set(profile.id, {
          id: profile.id,
          username: profile.username,
          avatarUrl: result.avatarUrl ?? null,
          avatarUpdatedAt: result.updatedAt ?? new Date().toISOString(),
        });
      }
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              avatarUrl: result.avatarUrl ?? prev.avatarUrl,
              avatarUpdatedAt: result.updatedAt ?? new Date().toISOString(),
            }
          : prev
      );
      toast.success("Avatar updated");
    } catch (error: any) {
      toast.error(error?.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (!authenticated || !user?.id) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-4">
        <h1 className="text-3xl font-semibold">Profile</h1>
        <Card className="p-6 flex flex-col gap-4">
          <p className="text-muted-foreground">
            Please sign in to view your profile.
          </p>
          <div className="flex gap-2">
            <Button onClick={() => login?.()}>Sign in</Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/experiment/rationale/multiplayer")}
              data-interactive="true"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to boards
            </Button>
            <div>
              <h1 className="text-3xl font-semibold">Profile</h1>
              <p className="text-muted-foreground">Manage your avatar.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setAvatarVersion((v) => (v ? v + 1 : Date.now()));
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        <Card className="p-6 grid grid-cols-1 md:grid-cols-[220px,1fr] gap-6 items-start">
          <div className="flex flex-col items-center gap-3">
            <Avatar className="h-24 w-24">
              {avatarSrc ? <AvatarImage src={avatarSrc} alt="Avatar" /> : null}
              <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleFileSelect}
                disabled={uploading}
                data-interactive="true"
              >
                <Upload className="w-4 h-4 mr-2" />
                {uploading ? "Uploading..." : "Change avatar"}
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleUpload(file);
              }}
            />
          </div>

          <div className="flex flex-col gap-4">
            {loadingProfile ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-4 w-52" />
              </div>
            ) : profile ? (
              <>
                <div>
                  <h2 className="text-xl font-semibold">{profile.username}</h2>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    Joined
                  </p>
                  <p className="text-sm">{formatDate(profile.createdAt)}</p>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">Profile not available.</p>
            )}
          </div>
        </Card>

      </div>
    </TooltipProvider>
  );
}
