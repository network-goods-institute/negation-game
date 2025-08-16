"use client";

import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { MemoizedMarkdown } from "@/components/editor/MemoizedMarkdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

interface ConsilienceEditorProps {
  value: string;
  onChange: (next: string) => void;
}

export function ConsilienceEditor({ value, onChange }: ConsilienceEditorProps) {
  return (
    <Tabs defaultValue="preview" className="w-full flex flex-col h-[70vh] md:h-[75vh] lg:h-[80vh] min-h-[540px] border rounded-md">
      <div className="flex items-center justify-between gap-2 border-b p-2">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="preview">Preview</TabsTrigger>
          <TabsTrigger value="edit">Edit</TabsTrigger>
        </TabsList>
        <div className="flex gap-2">
          <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(value); } catch { } }}>Copy</Button>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-3">
        <TabsContent value="preview" className="h-full m-0">
          <div className="h-full overflow-auto">
            <div className="prose dark:prose-invert max-w-none">
              <MemoizedMarkdown content={value} id="consilience-editor-preview" space="" discourseUrl="" storedMessages={[]} />
            </div>
          </div>
        </TabsContent>
        <TabsContent value="edit" className="h-full m-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-full w-full resize-none font-mono"
            placeholder="Edit the merged proposal (markdown). Preserve sections you don't intend to change."
          />
        </TabsContent>
      </div>
    </Tabs>
  );
}