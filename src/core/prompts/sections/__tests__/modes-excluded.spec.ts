// Tests for getModesSection modesExcluded filtering
// Added as part of the system-prompt-configuration plan

import * as vscode from "vscode"
import type { ModeConfig } from "@roo-code/types"

vi.mock("vscode", () => ({
	env: { language: "en" },
	workspace: {
		workspaceFolders: [{ uri: { fsPath: "/test/path" } }],
	},
	window: { activeTextEditor: undefined },
	EventEmitter: vi.fn().mockImplementation(() => ({
		event: vi.fn(),
		fire: vi.fn(),
		dispose: vi.fn(),
	})),
}))

// Mock ensureSettingsDirectoryExists so it doesn't try to touch the filesystem
vi.mock("../../../../utils/globalContext", () => ({
	ensureSettingsDirectoryExists: vi.fn().mockResolvedValue(undefined),
}))

// We'll control what getAllModesWithPrompts returns per test
vi.mock("../../../../shared/modes", () => ({
	getAllModesWithPrompts: vi.fn(),
}))

import { getModesSection } from "../modes"
import { getAllModesWithPrompts } from "../../../../shared/modes"

const mockGetAllModes = vi.mocked(getAllModesWithPrompts)

const mockContext = {
	extensionPath: "/mock/extension/path",
	globalStoragePath: "/mock/storage/path",
	storagePath: "/mock/storage/path",
	logPath: "/mock/log/path",
	subscriptions: [],
	workspaceState: { get: () => undefined, update: () => Promise.resolve() },
	globalState: {
		get: () => undefined,
		update: () => Promise.resolve(),
		setKeysForSync: () => {},
	},
	extensionUri: { fsPath: "/mock/extension/path" },
	globalStorageUri: { fsPath: "/mock/settings/path" },
	asAbsolutePath: (p: string) => `/mock/extension/path/${p}`,
	extension: { packageJSON: { version: "1.0.0" } },
} as unknown as vscode.ExtensionContext

// Helper to build a minimal ModeConfig
function makeMode(slug: string, name: string, modesExcluded?: boolean): ModeConfig {
	return {
		slug,
		name,
		roleDefinition: `${name} role definition.`,
		groups: ["read"] as const,
		...(modesExcluded !== undefined ? { modesExcluded } : {}),
	}
}

describe("getModesSection — modesExcluded filtering", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("shows all modes when none have modesExcluded set", async () => {
		const modes = [makeMode("code", "Code"), makeMode("ask", "Ask"), makeMode("debug", "Debug")]
		mockGetAllModes.mockResolvedValue(modes)

		const result = await getModesSection(mockContext)

		expect(result).toContain('"Code" mode (code)')
		expect(result).toContain('"Ask" mode (ask)')
		expect(result).toContain('"Debug" mode (debug)')
	})

	it("hides modes with modesExcluded=true from the list when current mode is not excluded", async () => {
		const modes = [
			makeMode("code", "Code"),
			makeMode("secret", "Secret", true), // excluded
			makeMode("ask", "Ask"),
		]
		mockGetAllModes.mockResolvedValue(modes)

		// Current mode is "code" which is NOT excluded
		const result = await getModesSection(mockContext, "code")

		expect(result).toContain('"Code" mode (code)')
		expect(result).toContain('"Ask" mode (ask)')
		expect(result).not.toContain('"Secret" mode (secret)')
	})

	it("shows only the current mode when the current mode has modesExcluded=true", async () => {
		const modes = [
			makeMode("code", "Code"),
			makeMode("secret", "Secret", true), // excluded — this is the current mode
			makeMode("ask", "Ask"),
		]
		mockGetAllModes.mockResolvedValue(modes)

		// Current mode is "secret" which IS excluded
		const result = await getModesSection(mockContext, "secret")

		// Only the current mode should appear
		expect(result).toContain('"Secret" mode (secret)')
		expect(result).not.toContain('"Code" mode (code)')
		expect(result).not.toContain('"Ask" mode (ask)')
	})

	it("shows all non-excluded modes when currentModeSlug is undefined", async () => {
		const modes = [
			makeMode("code", "Code"),
			makeMode("hidden", "Hidden", true), // excluded
			makeMode("ask", "Ask"),
		]
		mockGetAllModes.mockResolvedValue(modes)

		const result = await getModesSection(mockContext, undefined)

		expect(result).toContain('"Code" mode (code)')
		expect(result).toContain('"Ask" mode (ask)')
		expect(result).not.toContain('"Hidden" mode (hidden)')
	})

	it("shows all non-excluded modes when currentModeSlug is a non-excluded mode", async () => {
		const modes = [
			makeMode("code", "Code"),
			makeMode("hidden", "Hidden", true), // excluded
			makeMode("ask", "Ask"),
		]
		mockGetAllModes.mockResolvedValue(modes)

		const result = await getModesSection(mockContext, "ask")

		expect(result).toContain('"Code" mode (code)')
		expect(result).toContain('"Ask" mode (ask)')
		expect(result).not.toContain('"Hidden" mode (hidden)')
	})

	it("uses whenToUse as description when available", async () => {
		const modes = [
			{
				...makeMode("code", "Code"),
				whenToUse: "Use this when writing code",
			},
		]
		mockGetAllModes.mockResolvedValue(modes)

		const result = await getModesSection(mockContext)

		expect(result).toContain("Use this when writing code")
	})

	it("falls back to first sentence of roleDefinition when whenToUse is absent", async () => {
		const modes = [makeMode("code", "Code")]
		mockGetAllModes.mockResolvedValue(modes)

		const result = await getModesSection(mockContext)

		// roleDefinition is "Code role definition." — first sentence before "."
		expect(result).toContain("Code role definition")
	})

	it("includes the MODES header", async () => {
		mockGetAllModes.mockResolvedValue([makeMode("code", "Code")])

		const result = await getModesSection(mockContext)

		expect(result).toContain("MODES")
		expect(result).toContain("currently available modes")
	})
})
