import { describe, it, expect, vi, beforeEach } from "vitest"
import type { ModeConfig } from "@roo-code/types"

// Mock CodeIndexManager to avoid vscode EventEmitter dependency.
// Path is relative from src/core/task/__tests__/ to src/services/code-index/manager.ts
vi.mock("../../../services/code-index/manager", () => ({
	CodeIndexManager: {
		getInstance: vi.fn(() => ({
			isFeatureEnabled: true,
			isFeatureConfigured: true,
			isInitialized: true,
		})),
	},
}))

describe("Native Tools Filtering by Mode", () => {
	describe("attemptApiRequest native tool filtering", () => {
		it("should filter native tools based on mode restrictions", async () => {
			// This test verifies that native tools are filtered by mode restrictions
			// before being sent to the API.

			const architectMode: ModeConfig = {
				slug: "architect",
				name: "Architect",
				roleDefinition: "Test architect",
				groups: ["read", "mcp"] as const,
			}

			const codeMode: ModeConfig = {
				slug: "code",
				name: "Code",
				roleDefinition: "Test code",
				groups: ["read", "edit", "command", "mcp"] as const,
			}

			// Import the functions we need to test
			const { isToolAllowedForMode } = await import("../../tools/validateToolUse")
			const { TOOL_GROUPS, ALWAYS_AVAILABLE_TOOLS } = await import("../../../shared/tools")

			// Test architect mode - should NOT have edit tools
			const architectAllowedTools = new Set<string>()
			architectMode.groups.forEach((groupEntry) => {
				const groupName = typeof groupEntry === "string" ? groupEntry : groupEntry[0]
				const toolGroup = TOOL_GROUPS[groupName]
				if (toolGroup) {
					toolGroup.tools.forEach((tool) => {
						if (isToolAllowedForMode(tool as any, "architect", [architectMode])) {
							architectAllowedTools.add(tool)
						}
					})
				}
			})
			ALWAYS_AVAILABLE_TOOLS.forEach((tool) => architectAllowedTools.add(tool))

			// Architect should NOT have edit tools
			expect(architectAllowedTools.has("write_to_file")).toBe(false)
			expect(architectAllowedTools.has("apply_diff")).toBe(false)

			// Architect SHOULD have read tools
			expect(architectAllowedTools.has("read_file")).toBe(true)
			expect(architectAllowedTools.has("list_files")).toBe(true)

			// Architect SHOULD have always-available tools
			expect(architectAllowedTools.has("ask_followup_question")).toBe(true)
			expect(architectAllowedTools.has("attempt_completion")).toBe(true)

			// Test code mode - SHOULD have edit tools
			const codeAllowedTools = new Set<string>()
			codeMode.groups.forEach((groupEntry) => {
				const groupName = typeof groupEntry === "string" ? groupEntry : groupEntry[0]
				const toolGroup = TOOL_GROUPS[groupName]
				if (toolGroup) {
					toolGroup.tools.forEach((tool) => {
						if (isToolAllowedForMode(tool as any, "code", [codeMode])) {
							codeAllowedTools.add(tool)
						}
					})
				}
			})
			ALWAYS_AVAILABLE_TOOLS.forEach((tool) => codeAllowedTools.add(tool))

			// Code SHOULD have edit tools
			expect(codeAllowedTools.has("write_to_file")).toBe(true)
			expect(codeAllowedTools.has("apply_diff")).toBe(true)

			// Code SHOULD have read tools
			expect(codeAllowedTools.has("read_file")).toBe(true)
			expect(codeAllowedTools.has("list_files")).toBe(true)

			// Code SHOULD have command tools
			expect(codeAllowedTools.has("execute_command")).toBe(true)
		})

		it("should filter MCP tools based on use_mcp_tool permission", async () => {
			const modeWithMcp: ModeConfig = {
				slug: "test-mode-with-mcp",
				name: "Test Mode",
				roleDefinition: "Test",
				groups: ["read", "mcp"] as const,
			}

			const modeWithoutMcp: ModeConfig = {
				slug: "test-mode-no-mcp",
				name: "Test Mode No MCP",
				roleDefinition: "Test",
				groups: ["read"] as const,
			}

			const { isToolAllowedForMode } = await import("../../tools/validateToolUse")

			// Mode with MCP group should allow use_mcp_tool
			expect(isToolAllowedForMode("use_mcp_tool", "test-mode-with-mcp", [modeWithMcp])).toBe(true)

			// Mode without MCP group should NOT allow use_mcp_tool
			expect(isToolAllowedForMode("use_mcp_tool", "test-mode-no-mcp", [modeWithoutMcp])).toBe(false)
		})

		it("should always include always-available tools regardless of mode", async () => {
			const restrictiveMode: ModeConfig = {
				slug: "restrictive",
				name: "Restrictive",
				roleDefinition: "Test",
				groups: [] as const, // No groups at all
			}

			const { isToolAllowedForMode } = await import("../../tools/validateToolUse")
			const { ALWAYS_AVAILABLE_TOOLS } = await import("../../../shared/tools")

			// Always-available tools should work even with no groups
			ALWAYS_AVAILABLE_TOOLS.forEach((tool) => {
				expect(isToolAllowedForMode(tool as any, "restrictive", [restrictiveMode])).toBe(true)
			})
		})

		it("should return only current mode tools when mode is excluded from context switching", async () => {
			const excludedMode: ModeConfig = {
				slug: "excluded-mode",
				name: "Excluded Mode",
				roleDefinition: "Test",
				groups: ["read", "edit", "command"] as const,
				modesExcluded: true,
			}

			const normalMode: ModeConfig = {
				slug: "normal-mode",
				name: "Normal Mode",
				roleDefinition: "Test",
				groups: ["read", "mcp"] as const,
			}

			const { buildNativeToolsArrayWithRestrictions } = await import("../build-tools")

			const mockProvider = {
				getMcpHub: vi.fn(() => ({ getServers: vi.fn(() => []) })),
				context: {} as any,
			}

			// When in excluded mode with includeAllToolsWithRestrictions=true,
			// should only return excluded mode's own tools
			const result = await buildNativeToolsArrayWithRestrictions({
				provider: mockProvider as any,
				cwd: "/test",
				mode: "excluded-mode",
				customModes: [excludedMode, normalMode],
				experiments: {},
				apiConfiguration: {} as any,
				includeAllToolsWithRestrictions: true,
			})

			const toolNames = result.tools.map((t: any) => t.function?.name).filter(Boolean)

			// Excluded mode has read, edit, command groups
			expect(toolNames).toContain("read_file")
			expect(toolNames).toContain("write_to_file")
			expect(toolNames).toContain("apply_diff")
			expect(toolNames).toContain("execute_command")
			expect(toolNames).toContain("read_command_output")

			// But should NOT have tools exclusive to other modes (mcp tools)
			expect(toolNames).not.toContain("use_mcp_tool")
			expect(toolNames).not.toContain("access_mcp_resource")
		})

		it("should return union of switchable mode tools when current mode is not excluded", async () => {
			const normalModeA: ModeConfig = {
				slug: "normal-a",
				name: "Normal A",
				roleDefinition: "Test",
				groups: ["read", "edit"] as const,
			}

			const normalModeB: ModeConfig = {
				slug: "normal-b",
				name: "Normal B",
				roleDefinition: "Test",
				groups: ["read", "command"] as const,
			}

			// Excluded mode with mcp group - its mcp tools should not be added
			// to the union beyond what built-in modes already provide.
			const excludedMode: ModeConfig = {
				slug: "excluded-mode",
				name: "Excluded Mode",
				roleDefinition: "Test",
				groups: ["read", "mcp"] as const,
				modesExcluded: true,
			}

			const { buildNativeToolsArrayWithRestrictions } = await import("../build-tools")

			const mockProvider = {
				getMcpHub: vi.fn(() => ({ getServers: vi.fn(() => []) })),
				context: {} as any,
			}

			const result = await buildNativeToolsArrayWithRestrictions({
				provider: mockProvider as any,
				cwd: "/test",
				mode: "normal-a",
				customModes: [normalModeA, normalModeB, excludedMode],
				experiments: {},
				apiConfiguration: {} as any,
				includeAllToolsWithRestrictions: true,
			})

			const toolNames = result.tools.map((t: any) => t.function?.name).filter(Boolean)

			// Should have tools from both normal-a and normal-b (switchable modes)
			expect(toolNames).toContain("read_file")
			expect(toolNames).toContain("write_to_file")
			expect(toolNames).toContain("apply_diff")
			expect(toolNames).toContain("execute_command")
			expect(toolNames).toContain("read_command_output")

			// allowedFunctionNames should restrict to current mode's allowed tools
			expect(result.allowedFunctionNames).toBeDefined()
			expect(result.allowedFunctionNames).toContain("read_file")
			expect(result.allowedFunctionNames).toContain("write_to_file")
			expect(result.allowedFunctionNames).toContain("apply_diff")
			// normal-a does not have command group
			expect(result.allowedFunctionNames).not.toContain("execute_command")
		})

		it("should return only filtered tools when includeAllToolsWithRestrictions is false", async () => {
			const codeMode: ModeConfig = {
				slug: "code",
				name: "Code",
				roleDefinition: "Test",
				groups: ["read", "edit", "command"] as const,
			}

			const { buildNativeToolsArrayWithRestrictions } = await import("../build-tools")

			const mockProvider = {
				getMcpHub: vi.fn(() => ({ getServers: vi.fn(() => []) })),
				context: {} as any,
			}

			const result = await buildNativeToolsArrayWithRestrictions({
				provider: mockProvider as any,
				cwd: "/test",
				mode: "code",
				customModes: [codeMode],
				experiments: {},
				apiConfiguration: {} as any,
				includeAllToolsWithRestrictions: false,
			})

			const toolNames = result.tools.map((t: any) => t.function?.name).filter(Boolean)

			// Code mode has read, edit, command groups
			expect(toolNames).toContain("read_file")
			expect(toolNames).toContain("write_to_file")
			expect(toolNames).toContain("apply_diff")
			expect(toolNames).toContain("execute_command")

			// allowedFunctionNames should be undefined when includeAllToolsWithRestrictions is false
			expect(result.allowedFunctionNames).toBeUndefined()
		})

		it("should exclude disabled tools from allTools when includeAllToolsWithRestrictions is true", async () => {
			const codeMode: ModeConfig = {
				slug: "code",
				name: "Code",
				roleDefinition: "Test",
				groups: ["read", "edit", "command"] as const,
			}

			const { buildNativeToolsArrayWithRestrictions } = await import("../build-tools")

			const mockProvider = {
				getMcpHub: vi.fn(() => ({ getServers: vi.fn(() => []) })),
				context: {} as any,
			}

			const result = await buildNativeToolsArrayWithRestrictions({
				provider: mockProvider as any,
				cwd: "/test",
				mode: "code",
				customModes: [codeMode],
				experiments: {},
				apiConfiguration: {} as any,
				includeAllToolsWithRestrictions: true,
				disabledTools: ["execute_command", "codebase_search"],
			})

			const toolNames = result.tools.map((t: any) => t.function?.name).filter(Boolean)

			// Disabled tools should NOT appear even in includeAllToolsWithRestrictions mode
			expect(toolNames).not.toContain("execute_command")
			expect(toolNames).not.toContain("codebase_search")

			// Other tools should still be present
			expect(toolNames).toContain("read_file")
			expect(toolNames).toContain("write_to_file")
			expect(toolNames).toContain("apply_diff")

			// allowedFunctionNames should also exclude disabled tools
			expect(result.allowedFunctionNames).toBeDefined()
			expect(result.allowedFunctionNames).not.toContain("execute_command")
			expect(result.allowedFunctionNames).not.toContain("codebase_search")
		})

		it("should exclude codebase_search from allTools when code indexing is not available and includeAllToolsWithRestrictions is true", async () => {
			const codeMode: ModeConfig = {
				slug: "code",
				name: "Code",
				roleDefinition: "Test",
				groups: ["read", "edit", "command"] as const,
			}

			// Override the CodeIndexManager mock for this test
			const { CodeIndexManager } = await import("../../../services/code-index/manager")
			vi.mocked(CodeIndexManager.getInstance).mockReturnValue({
				isFeatureEnabled: false,
				isFeatureConfigured: false,
				isInitialized: false,
			} as any)

			const { buildNativeToolsArrayWithRestrictions } = await import("../build-tools")

			const mockProvider = {
				getMcpHub: vi.fn(() => ({ getServers: vi.fn(() => []) })),
				context: {} as any,
			}

			const result = await buildNativeToolsArrayWithRestrictions({
				provider: mockProvider as any,
				cwd: "/test",
				mode: "code",
				customModes: [codeMode],
				experiments: {},
				apiConfiguration: {} as any,
				includeAllToolsWithRestrictions: true,
			})

			const toolNames = result.tools.map((t: any) => t.function?.name).filter(Boolean)

			// codebase_search should NOT appear when indexing is unavailable
			expect(toolNames).not.toContain("codebase_search")

			// Other tools should still be present
			expect(toolNames).toContain("read_file")
			expect(toolNames).toContain("write_to_file")
			expect(toolNames).toContain("apply_diff")
			expect(toolNames).toContain("execute_command")

			// allowedFunctionNames should also exclude codebase_search
			expect(result.allowedFunctionNames).toBeDefined()
			expect(result.allowedFunctionNames).not.toContain("codebase_search")
		})
	})
})
