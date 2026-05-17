"use client";

import { useEffect, useRef } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView as CodeMirrorEditorView } from "@codemirror/view";

import { createEditorExtensions } from "../extensions/custom-setup";

interface CodeEditorProps {
  fileName: string;
  initialValue?: string;
  onChange(content: string): void;
}

export function CodeEditor({
  fileName,
  initialValue,
  onChange,
}: CodeEditorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const view = new CodeMirrorEditorView({
      state: EditorState.create({
        doc: initialValue ?? "",
        extensions: createEditorExtensions(fileName, content => {
          onChangeRef.current(content);
        }),
      }),
      parent: container,
    });

    return () => {
      view.destroy();
    };
  }, [fileName]);

  return <div ref={containerRef} className="h-full min-h-0 w-full" />;
}
