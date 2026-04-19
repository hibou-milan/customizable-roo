// Tests for section override functionality added in system-prompt-configuration plan

import { getObjectiveSection, DEFAULT_OBJECTIVE_TEXT } from "../objective"
import { getSharedToolUseSection, DEFAULT_TOOL_USE_TEXT } from "../tool-use"
import { markdownFormattingSection, DEFAULT_MARKDOWN_RULES_TEXT } from "../markdown-formatting"
import { getToolUseGuidelinesSection, DEFAULT_TOOL_USE_GUIDELINES_TEXT } from "../tool-use-guidelines"

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
