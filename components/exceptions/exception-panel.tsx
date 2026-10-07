"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { humanise } from "@/components/ui/status-badge";
import { allowedExceptionTransitions } from "@/lib/transitions";
import { EXCEPTION_STATUSES, SEVERITIES, type Exception } from "@/types/domain";
import { updateExceptionAction } from "@/lib/actions/exceptions";

export function ExceptionPanel({
  exception,
  owners,
}: {
  exception: Exception;
  owners: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState(exception.status);
  const [severity, setSeverity] = useState(exception.severity);
  const [ownerId, setOwnerId] = useState(exception.ownerId ?? "none");
  const [resolution, setResolution] = useState(exception.resolution ?? "");
  const [error, setError] = useState<string | null>(null);

  const transitions = allowedExceptionTransitions(exception.status);
  const dirty =
    status !== exception.status ||
    severity !== exception.severity ||
    (ownerId === "none" ? "" : ownerId) !== (exception.ownerId ?? "") ||
    resolution !== (exception.resolution ?? "");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const payload = await updateExceptionAction({
        exceptionId: exception.id,
        status,
        severity,
        ownerId: ownerId === "none" ? "" : ownerId,
        resolution: resolution.trim() || undefined,
        expectedVersion: exception.version,
      });

      if (!payload.ok) {
        if (payload.conflict) {
          setError(
            "Someone else updated this exception while you were working. The page will refresh with the latest state.",
          );
          setTimeout(() => router.refresh(), 1200);
          return;
        }
        setError(payload.error);
        return;
      }

      toast.success(`Exception moved to ${humanise(payload.data.status)}`);
      router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="exception-status">Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as Exception["status"])} disabled={pending}>
            <SelectTrigger id="exception-status" className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[exception.status, ...transitions].map((value) => (
                <SelectItem key={value} value={value}>
                  {humanise(value)}
                  {value === exception.status ? " (current)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-[11px] text-muted-foreground">
            Only canonical transitions are offered — the state machine is enforced on the server.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="exception-severity">Severity</Label>
          <Select value={severity} onValueChange={(value) => setSeverity(value as Exception["severity"])} disabled={pending}>
            <SelectTrigger id="exception-severity" className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SEVERITIES.map((value) => (
                <SelectItem key={value} value={value}>
                  {humanise(value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="exception-owner">Owner</Label>
          <Select value={ownerId} onValueChange={setOwnerId} disabled={pending}>
            <SelectTrigger id="exception-owner" className="w-full bg-card">
              <SelectValue placeholder="Unowned" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Unowned</SelectItem>
              {owners.map((owner) => (
                <SelectItem key={owner.id} value={owner.id}>
                  {owner.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <Label htmlFor="exception-resolution">Resolution note</Label>
          <Textarea
            id="exception-resolution"
            value={resolution}
            onChange={(event) => setResolution(event.target.value)}
            rows={4}
            disabled={pending}
            placeholder="What was done, who confirmed it, and what prevents a repeat. Required to resolve."
          />
        </div>
      </div>

      {error ? (
        <p role="alert" className="rounded-md border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={submit} disabled={pending || !dirty}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Save className="size-4" aria-hidden />}
          Save changes
        </Button>
        <span className="text-xs text-muted-foreground">
          Version {exception.version} · status changes are written to the audit log
        </span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Valid moves from <span className="font-medium">{humanise(exception.status)}</span>:
        {transitions.length === 0
          ? " none — this is a terminal state."
          : ` ${transitions.map((value) => humanise(value)).join(", ")}.`}
        {" "}Sealed states: {EXCEPTION_STATUSES.filter((value) => value === "resolved" || value === "closed").map(humanise).join(", ")}.
      </p>
    </div>
  );
}
