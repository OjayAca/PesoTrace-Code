import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ConfirmationModal } from "./ConfirmationModal";

afterEach(() => {
  cleanup();
});

describe("ConfirmationModal", () => {
  it("renders dialog with title and focuses primary action", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();

    render(
      <ConfirmationModal
        dialog={{
          title: "Remove item?",
          description: "This cannot be undone.",
          onConfirm: async () => {},
        }}
        submitting={false}
        onCancel={onCancel}
        onConfirm={onConfirm}
      />,
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("Remove item?")).toBeInTheDocument();

    const confirm = screen.getByRole("button", { name: /^confirm$/i });
    await waitFor(() => {
      expect(document.activeElement).toBe(confirm);
    });
  });
});
