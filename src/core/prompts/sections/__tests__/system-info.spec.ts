import os from "os"

// Mock the modules - must be hoisted before imports
vi.mock("os-name", () => ({
	default: vi.fn(),
}))

vi.mock("../../../../utils/shell", () => ({
	getShell: vi.fn(() => "/bin/bash"),
}))

import { getSystemInfoSection } from "../system-info"
import osName from "os-name"

const mockOsName = osName as unknown as ReturnType<typeof vi.fn>

describe("getSystemInfoSection", () => {
	const mockCwd = "/test/workspace"
	const mockHomeDir = "/home/user"

	beforeEach(() => {
		vi.spyOn(os, "homedir").mockReturnValue(mockHomeDir)
		vi.spyOn(os, "platform").mockReturnValue("linux" as any)
		vi.spyOn(os, "release").mockReturnValue("5.15.0")
	})

	afterEach(() => {
		vi.clearAllMocks()
	})

	it("should return system info with os-name when available", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd)

		expect(result).toContain("Operating System: Ubuntu 22.04")
		expect(result).toContain("Default Shell: /bin/bash")
		expect(result).toContain(`Home Directory: ${mockHomeDir}`)
		expect(result).toContain(`Current Workspace Directory: ${mockCwd}`)
	})

	it("should fallback to platform and release when os-name throws error", () => {
		mockOsName.mockImplementation(() => {
			throw new Error("Command failed with ENOENT: powershell")
		})

		const result = getSystemInfoSection(mockCwd)

		expect(result).toContain("Operating System: linux 5.15.0")
		expect(result).toContain("Default Shell: /bin/bash")
		expect(result).toContain(`Home Directory: ${mockHomeDir}`)
		expect(result).toContain(`Current Workspace Directory: ${mockCwd}`)
	})

	it("should handle Windows platform in fallback", () => {
		mockOsName.mockImplementation(() => {
			throw new Error("Command failed with ENOENT: powershell")
		})
		vi.spyOn(os, "platform").mockReturnValue("win32" as any)
		vi.spyOn(os, "release").mockReturnValue("10.0.19043")

		const result = getSystemInfoSection(mockCwd)

		expect(result).toContain("Operating System: win32 10.0.19043")
	})

	it("should not include additional workspace folders section when none provided", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, [])

		expect(result).not.toContain("Additional Workspace Folders")
		expect(result).not.toContain("Additional workspace folders")
	})

	it("should include additional workspace folders when provided", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, ["/extra/folder"])

		expect(result).toContain("Additional Workspace Folders:")
		expect(result).toContain("/extra/folder")
	})

	it("should include multiple additional workspace folders", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, ["/extra/folder1", "/extra/folder2"])

		expect(result).toContain("Additional Workspace Folders:")
		expect(result).toContain("/extra/folder1")
		expect(result).toContain("/extra/folder2")
	})

	it("should append note about additional folders in description when folders present", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, ["/extra/folder"])

		expect(result).toContain("Additional workspace folders are also available")
	})

	it("should apply override text when provided", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, [], "Custom: {{cwd}}")

		expect(result).toContain("Custom:")
		expect(result).toContain(mockCwd)
		expect(result).not.toContain("Operating System")
		expect(result).not.toContain("SYSTEM INFORMATION")
	})

	it("should fall back to default when override is empty string", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, [], "")

		expect(result).toContain("Operating System: Ubuntu 22.04")
	})

	it("should fall back to default when override is whitespace-only", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, [], "   ")

		expect(result).toContain("Operating System: Ubuntu 22.04")
	})

	it("should replace {{cwd}} template variable in override", () => {
		mockOsName.mockReturnValue("Ubuntu 22.04")

		const result = getSystemInfoSection(mockCwd, [], "Workspace: {{cwd}}")

		expect(result).toBe(`Workspace: ${mockCwd}`)
	})
})
