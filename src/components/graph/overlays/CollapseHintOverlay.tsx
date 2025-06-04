"use client";

import React from "react";
import { createPortal } from "react-dom";
import { useAtom } from "jotai";
import { collapseHintAtom } from "@/atoms/graphSettingsAtom";

export default function CollapseHintOverlay() {
    const [hintPosition] = useAtom(collapseHintAtom);
    if (!hintPosition) return null;
    const { x, y } = hintPosition;
    const mount = document.querySelector('.react-flow__viewport');
    if (!mount) return null;
    return createPortal(
        <div
            style={{
                position: "absolute",
                left: x,
                top: y,
                transform: "translate(-50%, -100%)",
                pointerEvents: "none",
            }}
        >
            <div className="bg-primary text-primary-foreground px-3 py-1 rounded shadow-sm text-sm">
                {navigator.platform.includes("Mac") ? "⌘ + Z to undo" : "Ctrl + Z to undo"}
            </div>
        </div>,
        mount
    );
} 