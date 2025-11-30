import React from "react";
import { render, screen, fireEvent, act } from "@testing-library/react";

import { InlineBuyControls } from "@/components/experiment/multiplayer/market/InlineBuyControls";

jest.mock("@/utils/market/marketContextMenu", () => ({
  buyAmount: jest.fn().mockResolvedValue(undefined),
}));

describe("InlineBuyControls submit flow", () => {
  it("closes on submit and shows both notifications", async () => {
    const onDismiss = jest.fn();

    render(
      <InlineBuyControls
        entityId="edge:1"
        price={0.5}
        initialOpen
        onDismiss={onDismiss}
      />
    );

    const submit = screen.getByRole("button", { name: /Buy \(\$\d+\)/i });
    await act(async () => {
      fireEvent.click(submit);
    });

    expect(onDismiss).toHaveBeenCalled();

    const { toast } = require("sonner");
    expect(toast.info).toHaveBeenCalledWith("Order placed ✅");

    await act(async () => {
      await Promise.resolve();
    });
    expect(toast.success).toHaveBeenCalledWith(expect.stringMatching(/^Order complete/));
  });
});




