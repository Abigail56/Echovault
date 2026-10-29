import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { TERMS_VERSION } from "@/lib/legal";

let pathname = "/dashboard";
const setUser = vi.fn();
let user: { terms_version: string | null } | null = null;
const acceptTerms = vi.fn();

vi.mock("next/router", () => ({ useRouter: () => ({ pathname }) }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user, setUser, logout: vi.fn() }) }));
vi.mock("@/lib/api/services", () => ({ authApi: { acceptTerms: (v: string) => acceptTerms(v) } }));

// jsdom has no <dialog> modal support; emulate showModal/close.
HTMLDialogElement.prototype.showModal = function () {
  this.setAttribute("open", "");
};
HTMLDialogElement.prototype.close = function () {
  this.removeAttribute("open");
};

const { TermsUpdateGate } = await import("@/components/layout/TermsUpdateGate");

describe("TermsUpdateGate", () => {
  beforeEach(() => {
    pathname = "/dashboard";
    setUser.mockReset();
    acceptTerms.mockReset();
  });

  it("stays closed when the user accepted the current Terms", () => {
    user = { terms_version: TERMS_VERSION };
    render(<TermsUpdateGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("asks for acceptance after the Terms change, with an unticked box", async () => {
    user = { terms_version: "2000-01-01" };
    acceptTerms.mockResolvedValue({ terms_version: TERMS_VERSION });
    render(<TermsUpdateGate />);
    expect(screen.getByRole("dialog", { name: "We've updated our Terms" })).toBeInTheDocument();
    const accept = screen.getByRole("button", { name: "Accept and continue" });
    expect(screen.getByRole("checkbox")).not.toBeChecked();
    expect(accept).toBeDisabled();

    await userEvent.click(screen.getByRole("checkbox"));
    await userEvent.click(accept);
    expect(acceptTerms).toHaveBeenCalledWith(TERMS_VERSION);
    expect(setUser).toHaveBeenCalledWith({ terms_version: TERMS_VERSION });
  });

  it("does not block Settings, so users can export or delete instead", () => {
    user = { terms_version: "2000-01-01" };
    pathname = "/settings";
    render(<TermsUpdateGate />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
