import React from "react";
import { renderHook, act } from "@testing-library/react";
import { useEditableNode } from "../useEditableNode";

jest.mock("../../GraphContext", () => ({
  useGraphActions: () => ({
    connectMode: false,
    updateNodePosition: jest.fn(),
  }),
}));

jest.mock("../useCursorState", () => ({
  useCursorState: () => "",
}));

describe("useEditableNode onInput behavior", () => {
  it("calls updateNodeContent with the latest text on each input", () => {
    const updateNodeContent = jest.fn();

    const { result } = renderHook(() =>
      useEditableNode({
        id: "p1",
        content: "",
        updateNodeContent,
        startEditingNode: jest.fn(),
        stopEditingNode: jest.fn(),
        isSelected: true,
      })
    );

    const div = document.createElement("div");
    div.innerText = "H";

    act(() => {
      result.current.contentRef.current = div;
      result.current.onClick({
        detail: 1,
        clientX: 0,
        clientY: 0,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as any);
    });

    act(() => {
      result.current.onInput({ target: div } as any);
    });

    expect(updateNodeContent).toHaveBeenCalledWith("p1", "H");

    div.innerText = "Hi";
    act(() => {
      result.current.onInput({ target: div } as any);
    });

    expect(updateNodeContent).toHaveBeenLastCalledWith("p1", "Hi");
  });
});
