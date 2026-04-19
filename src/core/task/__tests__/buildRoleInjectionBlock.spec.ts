// Tests for buildRoleInjectionBlock exported from Task.ts

import { buildRoleInjectionBlock } from "../Task"

describe("buildRoleInjectionBlock", () => {
	it("includes the mode name in the block header", () => {
		const result = buildRoleInjectionBlock("Code Mode", "You are a coding assistant.", "")
		expect(result).toContain("You are now operating as: Code Mode")
	})

	it("includes the role definition in the block", () => {
		const roleDefinition = "You are an expert software engineer."
		const result = buildRoleInjectionBlock("Code", roleDefinition, "")
		expect(result).toContain(roleDefinition)
	})

	it("includes the [ROLE AND INSTRUCTIONS] header", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "")
		expect(result).toContain("[ROLE AND INSTRUCTIONS]")
	})

	it("does NOT include custom instructions section when customInstructions is empty", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "")
		expect(result).not.toContain("USER'S CUSTOM INSTRUCTIONS")
	})

	it("does NOT include custom instructions section when customInstructions is whitespace-only", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "   \n  ")
		expect(result).not.toContain("USER'S CUSTOM INSTRUCTIONS")
	})

	it("includes custom instructions section when customInstructions is non-empty", () => {
		const customInstructions = "Always use TypeScript."
		const result = buildRoleInjectionBlock("Code", "Role text.", customInstructions)
		expect(result).toContain("USER'S CUSTOM INSTRUCTIONS")
		expect(result).toContain(customInstructions)
	})

	it("trims custom instructions before including them", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "  trimmed instructions  ")
		expect(result).toContain("trimmed instructions")
		// Should not contain the raw padded version
		expect(result).not.toContain("  trimmed instructions  ")
	})

	it("returns a single block when no custom instructions", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "")
		// Should only have one ==== separator block
		const separatorCount = (result.match(/====/g) || []).length
		expect(separatorCount).toBe(1)
	})

	it("returns two blocks when custom instructions are provided", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "Custom instructions.")
		// Should have two ==== separator blocks
		const separatorCount = (result.match(/====/g) || []).length
		expect(separatorCount).toBe(2)
	})

	it("places role definition before custom instructions", () => {
		const roleDefinition = "Role definition text."
		const customInstructions = "Custom instructions text."
		const result = buildRoleInjectionBlock("Code", roleDefinition, customInstructions)
		expect(result.indexOf(roleDefinition)).toBeLessThan(result.indexOf(customInstructions))
	})

	it("includes allowed tools section when allowedTools provided", () => {
		const result = buildRoleInjectionBlock("Code", "You are a code assistant.", "", ["read_file", "write_to_file"])
		expect(result).toContain("TOOL USE")
		expect(result).toContain("- read_file")
		expect(result).toContain("- write_to_file")
		expect(result).toContain("you may ONLY use the following tools")
	})

	it("omits tool use section when allowedTools is undefined", () => {
		const result = buildRoleInjectionBlock("Code", "You are a code assistant.", "")
		expect(result).not.toContain("TOOL USE")
		expect(result).not.toContain("you may ONLY use the following tools")
	})

	it("omits tool use section when allowedTools is empty array", () => {
		const result = buildRoleInjectionBlock("Code", "You are a code assistant.", "", [])
		expect(result).not.toContain("TOOL USE")
	})

	it("places tool use section between role definition and custom instructions", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "Custom instructions.", ["read_file"])
		const roleIdx = result.indexOf("Role text.")
		const toolIdx = result.indexOf("TOOL USE")
		const customIdx = result.indexOf("Custom instructions.")
		expect(roleIdx).toBeLessThan(toolIdx)
		expect(toolIdx).toBeLessThan(customIdx)
	})

	it("returns two blocks when allowedTools provided but no custom instructions", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "", ["read_file"])
		// Should have two ==== separator blocks: role + tool use
		const separatorCount = (result.match(/====/g) || []).length
		expect(separatorCount).toBe(2)
	})

	it("returns three blocks when allowedTools and custom instructions both provided", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "Custom instructions.", ["read_file"])
		// Should have three ==== separator blocks: role + tool use + custom instructions
		const separatorCount = (result.match(/====/g) || []).length
		expect(separatorCount).toBe(3)
	})

	// ─── skillsSection parameter ────────────────────────────────────────────────

	it("includes skills section when skillsSection is provided", () => {
		const skillsSection =
			"====\n\nAVAILABLE SKILLS\n\n<available_skills>\n  <skill><name>my-skill</name></skill>\n</available_skills>"
		const result = buildRoleInjectionBlock("Code", "Role text.", "", undefined, skillsSection)
		expect(result).toContain("AVAILABLE SKILLS")
		expect(result).toContain("my-skill")
	})

	it("omits skills section when skillsSection is undefined", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "")
		expect(result).not.toContain("AVAILABLE SKILLS")
	})

	it("omits skills section when skillsSection is empty string", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "", undefined, "")
		expect(result).not.toContain("AVAILABLE SKILLS")
	})

	it("omits skills section when skillsSection is whitespace-only", () => {
		const result = buildRoleInjectionBlock("Code", "Role text.", "", undefined, "   \n  ")
		expect(result).not.toContain("AVAILABLE SKILLS")
	})

	it("places skills section after custom instructions", () => {
		const skillsSection = "====\n\nAVAILABLE SKILLS\n\nskill content"
		const result = buildRoleInjectionBlock("Code", "Role text.", "Custom instructions.", undefined, skillsSection)
		const customIdx = result.indexOf("Custom instructions.")
		const skillsIdx = result.indexOf("AVAILABLE SKILLS")
		expect(customIdx).toBeLessThan(skillsIdx)
	})

	it("places skills section after tool use when no custom instructions", () => {
		const skillsSection = "====\n\nAVAILABLE SKILLS\n\nskill content"
		const result = buildRoleInjectionBlock("Code", "Role text.", "", ["read_file"], skillsSection)
		const toolIdx = result.indexOf("TOOL USE")
		const skillsIdx = result.indexOf("AVAILABLE SKILLS")
		expect(toolIdx).toBeLessThan(skillsIdx)
	})

	it("returns four blocks when allowedTools, custom instructions, and skillsSection all provided", () => {
		const skillsSection = "====\n\nAVAILABLE SKILLS\n\nskill content"
		const result = buildRoleInjectionBlock(
			"Code",
			"Role text.",
			"Custom instructions.",
			["read_file"],
			skillsSection,
		)
		// role + tool use + custom instructions + skills = 4 ==== blocks
		const separatorCount = (result.match(/====/g) || []).length
		expect(separatorCount).toBe(4)
	})
})
