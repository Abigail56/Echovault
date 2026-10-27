import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "@/lib/api/client";

const replace = vi.fn();
const login = vi.fn();
let query: Record<string, string> = {};

vi.mock("next/router", () => ({
  useRouter: () => ({ query, replace, push: vi.fn(), isReady: true }),
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ login, status: "anonymous" }),
}));

const { default: LoginPage } = await import("@/pages/login");

describe("LoginPage", () => {
  beforeEach(() => {
    replace.mockReset();
    login.mockReset();
    query = {};
  });

  it("validates before calling the API", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter your email")).toBeInTheDocument();
    expect(screen.getByText("Enter your password")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(login).not.toHaveBeenCalled();
  });

  it("signs in and goes to the requested internal page", async () => {
    query = { next: "/vault" };
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "correct horse battery");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(login).toHaveBeenCalledWith("ada@example.com", "correct horse battery");
    expect(replace).toHaveBeenCalledWith("/vault");
  });

  it("never redirects to another site", async () => {
    query = { next: "https://evil.example" };
    login.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "pw");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(replace).toHaveBeenCalledWith("/dashboard");
  });

  it("shows the server's error message", async () => {
    login.mockRejectedValue(new ApiError(401, "Invalid email or password"));
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(screen.getByLabelText("Email"), "ada@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(replace).not.toHaveBeenCalled();
  });
});
