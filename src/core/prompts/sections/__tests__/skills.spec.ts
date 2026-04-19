import { getSkillsSection, buildSkillsSectionContent } from "../skills"

describe("getSkillsSection", () => {
	it("should emit <available_skills> XML with name, description, and location", async () => {
		const mockSkillsManager = {
			getSkillsForMode: vi.fn().mockReturnValue([
				{
					name: "pdf-processing",
					description: "Extracts text & tables from PDFs",
					path: "/abs/path/pdf-processing/SKILL.md",
					source: "global" as const,
				},
			]),
		}

		const result = await getSkillsSection(mockSkillsManager, "code")

		expect(result).toContain("<available_skills>")
		expect(result).toContain("</available_skills>")
		expect(result).toContain("<skill>")
		expect(result).toContain("<name>pdf-processing</name>")
		// Ensure XML escaping for '&'
		expect(result).toContain("<description>Extracts text &amp; tables from PDFs</description>")
		// For filesystem-based agents, location should be the absolute path to SKILL.md
		expect(result).toContain("<location>/abs/path/pdf-processing/SKILL.md</location>")
	})

	it("should return empty string when skillsManager or currentMode is missing", async () => {
		await expect(getSkillsSection(undefined, "code")).resolves.toBe("")
		await expect(getSkillsSection({ getSkillsForMode: vi.fn() }, undefined)).resolves.toBe("")
	})

	it("should return empty string when omitFromSystemPrompt=true (cache-stability mode)", async () => {
		const mockSkillsManager = {
			getSkillsForMode: vi.fn().mockReturnValue([
				{
					name: "some-skill",
					description: "A skill",
					path: "/path/SKILL.md",
					source: "global" as const,
				},
			]),
		}
		// Even with a valid manager and mode, omitFromSystemPrompt=true must return ""
		const result = await getSkillsSection(mockSkillsManager, "code", true)
		expect(result).toBe("")
		// getSkillsForMode should NOT be called — we bail out before filtering
		expect(mockSkillsManager.getSkillsForMode).not.toHaveBeenCalled()
	})
})

describe("buildSkillsSectionContent", () => {
	it("should return empty string for empty skills array", () => {
		expect(buildSkillsSectionContent([], "code")).toBe("")
	})

	it("should produce the same output as getSkillsSection for the same skills", async () => {
		const skills = [
			{
				name: "my-skill",
				description: "Does something",
				path: "/path/SKILL.md",
				source: "global" as const,
			},
		]
		const mockSkillsManager = { getSkillsForMode: vi.fn().mockReturnValue(skills) }

		const fromSection = await getSkillsSection(mockSkillsManager, "code")
		const fromContent = buildSkillsSectionContent(skills, "code")

		expect(fromContent).toBe(fromSection)
	})

	it("should embed currentMode in context_notes", () => {
		const skills = [{ name: "s", description: "d", path: "/p/SKILL.md", source: "global" as const }]
		const result = buildSkillsSectionContent(skills, "architect")
		expect(result).toContain("architect")
	})
})
