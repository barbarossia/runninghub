import "@testing-library/jest-dom";

// Mock next/image
jest.mock("next/image", () => ({
	__esModule: true,
	default: (props) => {
		// eslint-disable-next-line @next/next/no-img-element
		return <img {...props} />;
	},
}));

// Mock next/navigation
jest.mock("next/navigation", () => ({
	useRouter: () => ({
		push: jest.fn(),
		replace: jest.fn(),
		prefetch: jest.fn(),
		back: jest.fn(),
	}),
	usePathname: () => "/",
	useSearchParams: () => new URLSearchParams(),
}));

// Mock next-themes
jest.mock("next-themes", () => ({
	useTheme: () => ({
		theme: "light",
		setTheme: jest.fn(),
	}),
	ThemeProvider: ({ children }) => <>{children}</>,
}));

// Mock File System Access API
global.showDirectoryPicker = jest.fn();

// Mock window.matchMedia for dark mode
Object.defineProperty(window, "matchMedia", {
	writable: true,
	value: jest.fn().mockImplementation((query) => ({
		matches: false,
		media: query,
		onchange: null,
		addListener: jest.fn(),
		removeListener: jest.fn(),
		addEventListener: jest.fn(),
		removeEventListener: jest.fn(),
		dispatchEvent: jest.fn(),
	})),
});
