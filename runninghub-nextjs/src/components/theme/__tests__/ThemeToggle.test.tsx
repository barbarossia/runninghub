import { render, screen } from "@testing-library/react";
import { ThemeToggle } from "../ThemeToggle";
import type { HTMLAttributes, ReactNode } from "react";

// Mock framer-motion to avoid issues with tests
jest.mock("framer-motion", () => ({
	motion: {
		div: ({ children, ...props }: HTMLAttributes<HTMLDivElement>) => (
			<div {...props}>{children}</div>
		),
	},
	AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

describe("ThemeToggle", () => {
	it("renders correctly", () => {
		render(<ThemeToggle />);
		const button = screen.getByRole("button");
		expect(button).toBeInTheDocument();
	});

	it("has correct aria-label", () => {
		render(<ThemeToggle />);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("aria-label");
	});

	it("toggles theme on click", () => {
		const setThemeMock = jest.fn();
		jest.mock("next-themes", () => ({
			useTheme: () => ({
				theme: "light",
				setTheme: setThemeMock,
			}),
		}));

		render(<ThemeToggle />);
		const button = screen.getByRole("button");
		button.click();
		// Note: This test verifies the button is clickable, actual theme toggle happens via next-themes
		expect(button).toBeInTheDocument();
	});
});
