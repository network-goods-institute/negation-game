"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Tldraw, createTLStore, useEditor, track, loadSnapshot, getSnapshot, createShapeId, toRichText } from "@tldraw/tldraw";
import { useTheme } from "next-themes";
import "@tldraw/tldraw/tldraw.css";
import { saveExperimentalDoc } from "@/actions/experimental/rationale/saveDoc";

type Props = { docId: string; space: string };

export default function ExperimentalCanvas({ docId }: Props) {
    const [store] = useState(() => {
        const newStore = createTLStore({});
        newStore.clear();
        return newStore;
    });
    const [isReady, setIsReady] = useState(false);
    const savingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { theme, resolvedTheme } = useTheme();

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const res = await fetch(`/api/experimental/rationale/doc?id=${encodeURIComponent(docId)}`);
                const doc = res.ok ? await res.json() : null;
                if (cancelled) return;
                if (doc?.doc) {
                    try {
                        if (doc.doc.shapes && Array.isArray(doc.doc.shapes)) {
                            loadSnapshot(store, doc.doc as any);
                        }
                    } catch (error) {
                        console.warn('Failed to load snapshot, using empty document:', error);
                        store.clear();
                    }
                }
            } finally {
                if (!cancelled) setIsReady(true);
            }
        })();
        return () => { cancelled = true; };
    }, [docId, store]);

    const handlePersist = useCallback(async () => {
        const snapshot = getSnapshot(store);
        await saveExperimentalDoc(docId, snapshot as any);
    }, [docId, store]);

    useEffect(() => {
        if (!isReady) return;
        const unsub = store.listen(() => {
            if (savingRef.current) clearTimeout(savingRef.current);
            savingRef.current = setTimeout(() => {
                handlePersist();
            }, 600);
        }, { scope: "document" });
        return () => unsub();
    }, [isReady, store, handlePersist]);

    const onMount = useCallback((editor: any) => {
    }, []);

    return (
        <div className="h-[calc(100dvh-var(--header-height))] w-full bg-background">
            <style jsx global>{`
                :root {
                    --shadow: 0 0 0;
                }
                .dark {
                    --shadow: 255 255 255;
                }
                .tl-note__content, .tl-text-shape__content {
                    font-family: 'Roboto Slab', serif !important;
                    font-size: 18px !important;
                    line-height: 1.35 !important;
                }
                .tl-note-shape {
                    border-radius: 8px !important;
                    border: 1px solid hsl(var(--border)) !important;
                    background: hsl(var(--card)) !important;
                    color: hsl(var(--card-foreground)) !important;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05) !important;
                    padding: 16px !important;
                    outline: none !important;
                }
                .tl-note__content {
                    font-family: system-ui, -apple-system, sans-serif !important;
                    font-size: 14px !important;
                    line-height: 1.5 !important;
                    color: hsl(var(--card-foreground)) !important;
                }
                .tl-note-shape.tl-shape-selected {
                    border: 2px solid hsl(var(--primary)) !important;
                    box-shadow: 0 0 0 2px hsl(var(--primary) / 0.3) !important;
                }
                .tl-note-shape:hover {
                    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) !important;
                }
            `}</style>
            {isReady && (
                <Tldraw
                    store={store}
                    onMount={onMount}
                >
                    <CanvasClickHandler />
                    <GlobalHotkeys />
                    <ContainerTypeOverlay />
                </Tldraw>
            )}
        </div>
    );
}

const CanvasClickHandler = track(function CanvasClickHandler() {
    const editor = useEditor();

    useEffect(() => {
        const onCanvasRightClick = (e: MouseEvent) => {
            e.preventDefault();
            const target = e.target as HTMLElement;
            if (target.closest('.tl-shape')) return; // don't show context menu on shapes

            const point = editor.screenToPage({ x: e.clientX, y: e.clientY });

            const contextMenu = document.createElement('div');
            contextMenu.className = 'fixed z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg py-1 min-w-[120px]';
            contextMenu.style.left = `${e.clientX}px`;
            contextMenu.style.top = `${e.clientY}px`;

            const addNodeOption = document.createElement('div');
            addNodeOption.className = 'px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer';
            addNodeOption.textContent = 'Add point';
            addNodeOption.onclick = () => {
                createNote(editor, point.x, point.y, "New point", "point");
                document.body.removeChild(contextMenu);
            };

            contextMenu.appendChild(addNodeOption);
            document.body.appendChild(contextMenu);

            const removeMenu = (event: MouseEvent) => {
                if (!contextMenu.contains(event.target as Node)) {
                    if (document.body.contains(contextMenu)) {
                        document.body.removeChild(contextMenu);
                    }
                    document.removeEventListener('click', removeMenu);
                }
            };

            const existingMenus = document.querySelectorAll('[data-context-menu]');
            existingMenus.forEach(menu => menu.remove());

            contextMenu.setAttribute('data-context-menu', 'true');
            setTimeout(() => document.addEventListener('click', removeMenu), 0);
        };

        const container = editor.getContainer();
        container.addEventListener("contextmenu", onCanvasRightClick);

        return () => {
            container.removeEventListener("contextmenu", onCanvasRightClick);
        };
    }, [editor]);

    return null;
});

const GlobalHotkeys = track(function GlobalHotkeys() {
    const editor = useEditor();
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (editor.getEditingShapeId()) {
                return;
            }

            if ((e.key === "Backspace" || e.key === "Delete") && editor.getSelectedShapeIds().length > 0) {
                editor.deleteShapes(editor.getSelectedShapeIds());
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
                e.preventDefault();
                editor.undo();
            }
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
                e.preventDefault();
                editor.redo();
            }
        };

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [editor]);
    return null;
});

const ContainerTypeOverlay = track(function ContainerTypeOverlay() {
    const editor = useEditor();
    const selectedShapeIds = editor.getSelectedShapeIds();
    const selectedShape = selectedShapeIds.length === 1 ? editor.getShape(selectedShapeIds[0]) : null;

    if (!selectedShape || selectedShape.type !== 'note') return null;

    const bounds = editor.getShapePageBounds(selectedShape);
    if (!bounds) return null;

    const containerType = (selectedShape.meta as any)?.containerType || 'point';

    const topLeft = editor.pageToScreen({ x: bounds.minX, y: bounds.minY });
    const bottomRight = editor.pageToScreen({ x: bounds.maxX, y: bounds.maxY });

    const screenWidth = bottomRight.x - topLeft.x;
    const screenCenterX = topLeft.x + (screenWidth / 2);
    const screenTop = topLeft.y;

    const typeOptions = [
        { value: 'point', label: 'Point', color: 'bg-blue-500', textColor: 'text-blue-600' },
        { value: 'statement', label: 'Statement', color: 'bg-green-500', textColor: 'text-green-600' },
        { value: 'comment', label: 'Comment', color: 'bg-orange-500', textColor: 'text-orange-600' }
    ];

    const handleTypeChange = (newType: string) => {
        const colorMap = {
            point: 'blue',
            statement: 'green',
            comment: 'orange'
        };

        editor.updateShape({
            id: selectedShape.id,
            type: 'note',
            props: {
                ...selectedShape.props,
                color: colorMap[newType as keyof typeof colorMap] || 'blue'
            },
            meta: { ...selectedShape.meta, containerType: newType }
        });
    };

    return (
        <div
            className="absolute z-10 flex gap-1 p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg"
            style={{
                left: screenCenterX, // Use the calculated screen center X
                top: screenTop - 50, // Position 50px above the top of the node
                transform: 'translateX(-50%)', // Center the selector on the X position
            }}
        >
            {typeOptions.map((option) => (
                <button
                    key={option.value}
                    onClick={() => handleTypeChange(option.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${containerType === option.value
                        ? `${option.color} text-white shadow-md`
                        : `bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 ${option.textColor} dark:text-gray-300`
                        }`}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
});

function createNote(editor: any, x: number, y: number, text: string, containerType: string = 'point') {
    const id = createShapeId();
    const colorMap = {
        point: 'blue',
        statement: 'green',
        comment: 'orange'
    };

    editor.createShape({
        id,
        type: 'note',
        x: x - 400,
        y: y - 100,
        props: {
            richText: toRichText(text),
            size: 'l',
            color: colorMap[containerType as keyof typeof colorMap] || 'blue',
        },
        meta: { containerType, originalText: text }
    });
    editor.select(id);
}