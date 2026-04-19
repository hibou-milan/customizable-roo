// Tests for system prompt section toggles and overrides
// Added as part of the system-prompt-configuration plan

vi.mock("os", () => ({
	default: {
		homedir: () => "/home/user",
		platform: () => "linux",
		arch: () => "x64",
		type: () => "Linux",
		release: () => "5.4.0",
		hostname: () => "test-host",
		tmpdir: () => "/tmp",
		endianness: () => "LE",
		loadavg: () => [0, 0, 0],
		totalmem: () => 8589934592,
		freemem: () => 4294967296,
		cpus: () => [],
		networkInterfaces: () => ({}),
		userInfo: () => ({ username: "test", uid: 1000, gid: 1000, shell: "/bin/bash", homedir: "/home/user" }),
	},
	homedir: () => "/home/user",
	platform: () => "linux",
	arch: () => "x64",
	type: () => "Linux",
	release: () => "5.4.0",
	hostname: () => "test-host",
	tmpdir: () => "/tmp",
	endianness: () => "LE",
	loadavg: () => [0, 0, 0],
	totalmem: () => 8589934592,
	freemem: () => 4294967296,
	cpus: () => [],
	networkInterfaces: () => ({}),
	userInfo: () => ({ username: "test", uid: 1000, gid: 1000, shell: "/bin/bash", homedir: "/home/user" }),
}))

vi.mock("default-shell", () => ({
	default: "/bin/zsh",
}))

vi.mock("os-name", () => ({
	default: () => "Linux",
}))

vi.mock("fs/promises")

import * as vscode from "vscode"

import { SYSTEM_PROMPT } from "../system"
import { defaultModeSlug, modes } from "../../../shared/modes"
import "../../../utils/path"

// Mock the modes section
vi.mock("../sections/modes", () => ({
	getModesSection: vi.fn().mockImplementation(async () => `====\n\nMODES\n\n- Test modes section`),
}))

// Mock the custom instructions
vi.mock("../sections/custom-instructions", () => {
	const addCustomInstructions = vi.fn().mockResolvedValue("")
	return { addCustomInstructions }
})

vi.mock("vscode", () => ({
	env: {
		language: "en",
	},
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/test/path" } }],
		getWorkspaceFolder: vi.fn().mockReturnValue({ uri: { fsPath: "/test/path" } }),
	},
	window: {
		activeTextEditor: undefined,
	},
	EventEmitter: vi.fn().mockImplementation(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
}))

vi.mock("../../../utils/shell", () => ({
	getShell: () => "/bin/zsh",
}))

const mockContext = {
	extensionPath: "/mock/extension/path",
	globalStoragePath: "/mock/storage/path",
	storagePath: "/mock/storage/path",
	logPath: "/mock/log/path",
	subscriptions: [],
	workspaceState: {
		get: () => undefined,
		update: () => Promise.resolve(),
	},
	globalState: {
		get: () => undefined,
		update: () => Promise.resolve(),
		setKeysForSync: () => {},
	},
	extensionUri: { fsPath: "/mock/extension/path" },
	globalStorageUri: { fsPath: "/mock/settings/path" },
	asAbsolutePath: (relativePath: string) => `/mock/extension/path/${relativePath}`,
	extension: {
		packageJSON: {
			version: "1.0.0",
		},
	},
} as unknown as vscode.ExtensionContext

const baseSettings = {
	todoListEnabled: true,
	useAgentRules: false,
	newTaskRequireTodos: false,
}

async function buildPrompt(sections: Record<string, any> = {}) {
	return SYSTEM_PROMPT(
		mockContext,
		"/test/path",
		false,
		undefined, // mcpHub
		undefined, // diffStrategy
		defaultModeSlug,
		undefined, // customModePrompts
		undefined, // customModes
		undefined, // globalCustomInstructions
		{}, // experiments
		undefined, // language
		undefined, // rooIgnoreInstructions
		{ ...baseSettings, sections },
	)
}

describe("SYSTEM_PROMPT section toggles", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	// ─── Role section ──────────────────────────────────────────────────────────

	describe("role section", () => {
		it("includes role definition by default", async () => {
			const prompt = await buildPrompt()
			expect(prompt).toContain(modes[0].roleDefinition)
		})

		it("omits role definition when roleEnabled=false", async () => {
			const prompt = await buildPrompt({ roleEnabled: false })
			expect(prompt).not.toContain(modes[0].roleDefinition)
		})

		it("replaces role with placeholder when roleInSystemPrompt=false", async () => {
			const prompt = await buildPrompt({ roleInSystemPrompt: false })
			// Should NOT contain the actual role definition
			expect(prompt).not.toContain(modes[0].roleDefinition)
			// Should contain the placeholder text
			expect(prompt).toContain("[ROLE AND INSTRUCTIONS]")
		})

		it("uses custom placeholder when roleInSystemPrompt=false and roleDisabledPlaceholder is set", async () => {
			const customPlaceholder = "Custom role placeholder text"
			const prompt = await buildPrompt({
				roleInSystemPrompt: false,
				roleDisabledPlaceholder: customPlaceholder,
			})
			expect(prompt).toContain(customPlaceholder)
			expect(prompt).not.toContain(modes[0].roleDefinition)
		})

		it("falls back to default placeholder when roleDisabledPlaceholder is empty", async () => {
			const prompt = await buildPrompt({
				roleInSystemPrompt: false,
				roleDisabledPlaceholder: "",
			})
			// Should use the default placeholder
			expect(prompt).toContain("IMPORTANT: Pay close attention to role and instruction sections")
		})
	})

	// ─── Markdown rules section ────────────────────────────────────────────────

	describe("markdownRules section", () => {
		it("includes MARKDOWN RULES by default", async () => {
			const prompt = await buildPrompt()
			expect(prompt).toContain("MARKDOWN RULES")
		})

		it("omits MARKDOWN RULES when markdownRulesEnabled=false", async () => {
			const prompt = await buildPrompt({ markdownRulesEnabled: false })
			expect(prompt).not.toContain("MARKDOWN RULES")
		})

		it("uses override text when markdownRulesOverride is set", async () => {
			const override = "Custom markdown rules override"
			const prompt = await buildPrompt({ markdownRulesOverride: override })
			expect(prompt).toContain("MARKDOWN RULES")
			expect(prompt).toContain(override)
		})
	})

	// ─── Tool use section ──────────────────────────────────────────────────────

	describe("toolUse section", () => {
		it("includes TOOL USE by default", async () => {
			const prompt = await buildPrompt()
			expect(prompt).toContain("TOOL USE")
		})

		it("omits TOOL USE when toolUseEnabled=false", async () => {
			const prompt = await buildPrompt({ toolUseEnabled: false })
			expect(prompt).not.toContain("TOOL USE")
		})

		it("uses override text when toolUseOverride is set", async () => {
			const override = "Custom tool use override text"
			const prompt = await buildPrompt({ toolUseOverride: override })
			expect(prompt).toContain("TOOL USE")
			expect(prompt).toContain(override)
		})

		it("uses guidelines override when toolUseGuidelinesOverride is set", async () => {
			const override = "Custom tool use guidelines override"
			const prompt = await buildPrompt({ toolUseGuidelinesOverride: override })
			expect(prompt).toContain(override)
		})
	})

	// ─── Capabilities section ──────────────────────────────────────────────────

	describe("capabilities section", () => {
		it("includes CAPABILITIES by default", async () => {
			const prompt = await buildPrompt()
			expect(prompt).toContain("CAPABILITIES")
		})

		it("omits CAPABILITIES when capabilitiesEnabled=false", async () => {
			const prompt = await buildPrompt({ capabilitiesEnabled: false })
			expect(prompt).not.toContain("CAPABILITIES")
		})

		it("uses override text when capabilitiesOverride is set", async () => {
			const override = "Custom capabilities override text"
			const prompt = await buildPrompt({ capabilitiesOverride: override })
			expect(prompt).toContain("CAPABILITIES")
			expect(prompt).toContain(override)
		})
	})

	// ─── Rules section ─────────────────────────────────────────────────────────

	describe("rules section", () => {
		it("includes RULES section by default", async () => {
			const prompt = await buildPrompt()
			// The RULES section header is preceded by ====
			expect(prompt).toContain("====\n\nRULES\n\n")
		})

		it("omits RULES section when rulesEnabled=false", async () => {
			const prompt = await buildPrompt({ rulesEnabled: false })
			// The RULES section header should not appear
			expect(prompt).not.toContain("====\n\nRULES\n\n")
		})

		it("uses override text when rulesOverride is set", async () => {
			const override = "Custom rules override text"
			const prompt = await buildPrompt({ rulesOverride: override })
			expect(prompt).toContain("====\n\nRULES\n\n")
			expect(prompt).toContain(override)
		})
	})

	// ─── Objective section ─────────────────────────────────────────────────────

	describe("objective section", () => {
		it("includes OBJECTIVE by default", async () => {
			const prompt = await buildPrompt()
			expect(prompt).toContain("OBJECTIVE")
		})

		it("omits OBJECTIVE when objectiveEnabled=false", async () => {
			const prompt = await buildPrompt({ objectiveEnabled: false })
			expect(prompt).not.toContain("OBJECTIVE")
		})

		it("uses override text when objectiveOverride is set", async () => {
			const override = "Custom objective override text"
			const prompt = await buildPrompt({ objectiveOverride: override })
			expect(prompt).toContain("OBJECTIVE")
			expect(prompt).toContain(override)
		})
	})

	// ─── MODES section always included ─────────────────────────────────────────

	describe("modes section", () => {
		it("always includes MODES section regardless of other toggles", async () => {
			const prompt = await buildPrompt({
				markdownRulesEnabled: false,
				toolUseEnabled: false,
				capabilitiesEnabled: false,
				rulesEnabled: false,
				objectiveEnabled: false,
			})
			expect(prompt).toContain("MODES")
		})
	})

	// ─── Custom instructions excluded when roleInSystemPrompt=false ────────────

	describe("custom instructions exclusion", () => {
		it("excludes custom instructions when roleInSystemPrompt=false", async () => {
			const { addCustomInstructions } = await import("../sections/custom-instructions")
			const mockAddCustomInstructions = vi.mocked(addCustomInstructions)

			await buildPrompt({ roleInSystemPrompt: false })

			// addCustomInstructions should NOT be called when roleInSystemPrompt=false
			expect(mockAddCustomInstructions).not.toHaveBeenCalled()
		})

		it("excludes custom instructions when roleEnabled=false", async () => {
			const { addCustomInstructions } = await import("../sections/custom-instructions")
			const mockAddCustomInstructions = vi.mocked(addCustomInstructions)

			await buildPrompt({ roleEnabled: false })

			expect(mockAddCustomInstructions).not.toHaveBeenCalled()
		})
	})
})
