import * as vscode from "vscode"

import type { ModeConfig } from "@roo-code/types"

import { getAllModesWithPrompts } from "../../../shared/modes"
import { ensureSettingsDirectoryExists } from "../../../utils/globalContext"

export async function getModesSection(context: vscode.ExtensionContext, currentModeSlug?: string): Promise<string> {
	// Make sure path gets created
	await ensureSettingsDirectoryExists(context)

	// Get all modes with their overrides from extension state
	const allModes = await getAllModesWithPrompts(context)

	const currentMode = allModes.find((m) => m.slug === currentModeSlug)
	const isCurrentModeExcluded = currentMode?.modesExcluded === true

	let visibleModes: ModeConfig[]
	if (isCurrentModeExcluded) {
		// Show only the current mode to itself — prevents hallucinating other modes
		visibleModes = currentMode ? [currentMode] : []
	} else {
		// Show all modes that are not excluded from the list
		visibleModes = allModes.filter((m) => !m.modesExcluded)
	}

	const modesContent = `====

MODES

- These are the currently available modes:
${visibleModes
	.map((mode: ModeConfig) => {
		let description: string
		if (mode.whenToUse && mode.whenToUse.trim() !== "") {
			// Use whenToUse as the primary description, indenting subsequent lines for readability
			description = mode.whenToUse.replace(/\n/g, "\n    ")
		} else {
			// Fallback to the first sentence of roleDefinition if whenToUse is not available
			description = mode.roleDefinition.split(".")[0]
		}
		return `  * "${mode.name}" mode (${mode.slug}) - ${description}`
	})
	.join("\n")}`

	return modesContent
}
