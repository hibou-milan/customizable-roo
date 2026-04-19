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
})
