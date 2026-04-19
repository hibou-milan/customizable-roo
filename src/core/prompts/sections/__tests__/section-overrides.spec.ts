// Tests for section override functionality added in system-prompt-configuration plan

import { getObjectiveSection, DEFAULT_OBJECTIVE_TEXT } from "../objective"
import { getSharedToolUseSection, DEFAULT_TOOL_USE_TEXT } from "../tool-use"
import { markdownFormattingSection, DEFAULT_MARKDOWN_RULES_TEXT } from "../markdown-formatting"
import { getToolUseGuidelinesSection, DEFAULT_TOOL_USE_GUIDELINES_TEXT } from "../tool-use-guidelines"
import { getCapabilitiesSection } from "../capabilities"
import { getRulesSection } from "../rules"
import { applyTemplateVars, buildTemplateVars } from "../template"

// ─── getObjectiveSection ────────────────────────────────────────────────────

describe("getObjectiveSection", () => {
	it("returns default text when no override is provided", () => {
		const result = getObjectiveSection()
		expect(result).toContain("OBJECTIVE")
		expect(result).toContain(DEFAULT_OBJECTIVE_TEXT)
	})

	it("returns default text when override is undefined", () => {
		const result = getObjectiveSection(undefined)
		expect(result).toContain(DEFAULT_OBJECTIVE_TEXT)
	})

	it("returns override text when a non-empty override is provided", () => {
		const override = "My custom objective text"
		const result = getObjectiveSection(override)
		expect(result).toContain("OBJECTIVE")
		expect(result).toContain(override)
		expect(result).not.toContain(DEFAULT_OBJECTIVE_TEXT)
	})

	it("falls back to default when override is an empty string", () => {
		const result = getObjectiveSection("")
		expect(result).toContain(DEFAULT_OBJECTIVE_TEXT)
	})

	it("falls back to default when override is whitespace-only", () => {
		const result = getObjectiveSection("   \n  ")
		expect(result).toContain(DEFAULT_OBJECTIVE_TEXT)
	})

	it("trims leading/trailing whitespace from override", () => {
		const override = "  trimmed objective  "
		const result = getObjectiveSection(override)
		expect(result).toContain("trimmed objective")
		// Should not contain the raw padded version
		expect(result).not.toContain("  trimmed objective  ")
	})
})

// ─── getSharedToolUseSection ────────────────────────────────────────────────

describe("getSharedToolUseSection", () => {
	it("returns default text when no override is provided", () => {
		const result = getSharedToolUseSection()
		expect(result).toContain("TOOL USE")
		expect(result).toContain(DEFAULT_TOOL_USE_TEXT)
	})

	it("returns override text when a non-empty override is provided", () => {
		const override = "Custom tool use instructions"
		const result = getSharedToolUseSection(override)
		expect(result).toContain("TOOL USE")
		expect(result).toContain(override)
		expect(result).not.toContain(DEFAULT_TOOL_USE_TEXT)
	})

	it("falls back to default when override is an empty string", () => {
		const result = getSharedToolUseSection("")
		expect(result).toContain(DEFAULT_TOOL_USE_TEXT)
	})

	it("falls back to default when override is whitespace-only", () => {
		const result = getSharedToolUseSection("   ")
		expect(result).toContain(DEFAULT_TOOL_USE_TEXT)
	})

	it("trims leading/trailing whitespace from override", () => {
		const override = "  custom tool use  "
		const result = getSharedToolUseSection(override)
		expect(result).toContain("custom tool use")
		expect(result).not.toContain("  custom tool use  ")
	})
})

// ─── markdownFormattingSection ──────────────────────────────────────────────

describe("markdownFormattingSection", () => {
	it("returns default text when no override is provided", () => {
		const result = markdownFormattingSection()
		expect(result).toContain("MARKDOWN RULES")
		expect(result).toContain(DEFAULT_MARKDOWN_RULES_TEXT)
	})

	it("returns override text when a non-empty override is provided", () => {
		const override = "Custom markdown rules"
		const result = markdownFormattingSection(override)
		expect(result).toContain("MARKDOWN RULES")
		expect(result).toContain(override)
		expect(result).not.toContain(DEFAULT_MARKDOWN_RULES_TEXT)
	})

	it("falls back to default when override is an empty string", () => {
		const result = markdownFormattingSection("")
		expect(result).toContain(DEFAULT_MARKDOWN_RULES_TEXT)
	})

	it("falls back to default when override is whitespace-only", () => {
		const result = markdownFormattingSection("  \t  ")
		expect(result).toContain(DEFAULT_MARKDOWN_RULES_TEXT)
	})

	it("trims leading/trailing whitespace from override", () => {
		const override = "  custom markdown  "
		const result = markdownFormattingSection(override)
		expect(result).toContain("custom markdown")
		expect(result).not.toContain("  custom markdown  ")
	})
})

// ─── getToolUseGuidelinesSection ────────────────────────────────────────────

describe("getToolUseGuidelinesSection", () => {
	it("returns default text when no override is provided", () => {
		const result = getToolUseGuidelinesSection()
		expect(result).toContain("Tool Use Guidelines")
		expect(result).toBe(DEFAULT_TOOL_USE_GUIDELINES_TEXT)
	})

	it("returns override text when a non-empty override is provided", () => {
		const override = "Custom guidelines text"
		const result = getToolUseGuidelinesSection(override)
		expect(result).toBe(override)
		expect(result).not.toContain(DEFAULT_TOOL_USE_GUIDELINES_TEXT)
	})

	it("falls back to default when override is an empty string", () => {
		const result = getToolUseGuidelinesSection("")
		expect(result).toBe(DEFAULT_TOOL_USE_GUIDELINES_TEXT)
	})

	it("falls back to default when override is whitespace-only", () => {
		const result = getToolUseGuidelinesSection("   ")
		expect(result).toBe(DEFAULT_TOOL_USE_GUIDELINES_TEXT)
	})

	it("trims leading/trailing whitespace from override", () => {
		const override = "  custom guidelines  "
		const result = getToolUseGuidelinesSection(override)
		expect(result).toBe("custom guidelines")
	})
})

// ─── Template variable substitution ─────────────────────────────────────────

describe("applyTemplateVars", () => {
	const vars = {
		cwd: "/home/user/project",
		shell: "/bin/bash",
		os: "linux",
		homeDir: "/home/user",
		chainOp: "&&",
	}

	it("replaces {{cwd}} with the cwd value", () => {
		const result = applyTemplateVars("The project is at {{cwd}}", vars)
		expect(result).toBe("The project is at /home/user/project")
	})

	it("replaces {{shell}} with the shell value", () => {
		const result = applyTemplateVars("Shell: {{shell}}", vars)
		expect(result).toBe("Shell: /bin/bash")
	})

	it("replaces {{os}} with the os value", () => {
		const result = applyTemplateVars("OS: {{os}}", vars)
		expect(result).toBe("OS: linux")
	})

	it("replaces {{homeDir}} with the homeDir value", () => {
		const result = applyTemplateVars("Home: {{homeDir}}", vars)
		expect(result).toBe("Home: /home/user")
	})

	it("replaces {{chainOp}} with the chainOp value", () => {
		const result = applyTemplateVars("Use {{chainOp}} to chain commands", vars)
		expect(result).toBe("Use && to chain commands")
	})

	it("replaces multiple occurrences of the same variable", () => {
		const result = applyTemplateVars("{{cwd}} and {{cwd}}", vars)
		expect(result).toBe("/home/user/project and /home/user/project")
	})

	it("replaces multiple different variables in one string", () => {
		const result = applyTemplateVars("cd {{cwd}} {{chainOp}} echo {{shell}}", vars)
		expect(result).toBe("cd /home/user/project && echo /bin/bash")
	})

	it("returns the template unchanged when no variables are present", () => {
		const result = applyTemplateVars("No variables here", vars)
		expect(result).toBe("No variables here")
	})

	it("leaves unknown template variables unchanged", () => {
		const result = applyTemplateVars("{{unknown}} stays", vars)
		expect(result).toBe("{{unknown}} stays")
	})
})

// ─── getCapabilitiesSection with template vars ───────────────────────────────

describe("getCapabilitiesSection override with template vars", () => {
	it("applies template vars to override text", () => {
		const override = "Working in {{cwd}} with shell {{shell}}"
		const result = getCapabilitiesSection("/my/project", undefined, override)
		expect(result).toContain("CAPABILITIES")
		expect(result).toContain("Working in /my/project")
		expect(result).not.toContain("{{cwd}}")
	})

	it("falls back to default when override is empty", () => {
		const result = getCapabilitiesSection("/my/project", undefined, "")
		expect(result).toContain("CAPABILITIES")
		expect(result).toContain("/my/project")
	})

	it("includes additionalWorkspaceFolders in default output", () => {
		const result = getCapabilitiesSection("/primary", undefined, undefined, ["/extra/folder"])
		expect(result).toContain("primary workspace directory")
		expect(result).toContain("/extra/folder")
	})

	it("uses single-workspace description when no additional folders", () => {
		const result = getCapabilitiesSection("/primary", undefined, undefined, [])
		expect(result).toContain("current workspace directory")
		expect(result).not.toContain("primary workspace directory")
	})
})

// ─── getRulesSection with template vars ─────────────────────────────────────

describe("getRulesSection override with template vars", () => {
	it("applies template vars to override text", () => {
		const override = "Base dir: {{cwd}}, chain with {{chainOp}}"
		const result = getRulesSection("/my/project", undefined, override)
		expect(result).toContain("RULES")
		expect(result).toContain("Base dir: /my/project")
		expect(result).not.toContain("{{cwd}}")
		expect(result).not.toContain("{{chainOp}}")
	})

	it("falls back to default when override is empty", () => {
		const result = getRulesSection("/my/project", undefined, "")
		expect(result).toContain("RULES")
		expect(result).toContain("/my/project")
	})

	it("appends additional workspace folders to default output", () => {
		const result = getRulesSection("/primary", undefined, undefined, ["/extra/folder"])
		expect(result).toContain("Additional workspace folders")
		expect(result).toContain("/extra/folder")
	})

	it("does not mention additional folders when none provided", () => {
		const result = getRulesSection("/primary", undefined, undefined, [])
		expect(result).not.toContain("Additional workspace folders")
	})
})
