import * as vscode from "vscode"

import { type ModeConfig, type PromptComponent, type CustomModePrompts, type TodoItem } from "@roo-code/types"

import { Mode, modes, defaultModeSlug, getModeBySlug, getGroupName, getModeSelection } from "../../shared/modes"
import { DiffStrategy } from "../../shared/tools"
import { formatLanguage } from "../../shared/language"
import { isEmpty } from "../../utils/object"
import { arePathsEqual } from "../../utils/path"

import { McpHub } from "../../services/mcp/McpHub"
import { CodeIndexManager } from "../../services/code-index/manager"
import { SkillsManager } from "../../services/skills/SkillsManager"

import type { SystemPromptSettings } from "./types"
import {
	getRulesSection,
	getSystemInfoSection,
	getObjectiveSection,
	getSharedToolUseSection,
	getToolUseGuidelinesSection,
	getCapabilitiesSection,
	getModesSection,
	addCustomInstructions,
	markdownFormattingSection,
	getSkillsSection,
} from "./sections"

export const DEFAULT_ROLE_PLACEHOLDER =
	"IMPORTANT: Pay close attention to role and instruction sections that will appear " +
	"in the conversation. When you see a [ROLE AND INSTRUCTIONS] block, treat it as " +
	"your active persona and follow it precisely."

// Helper function to get prompt component, filtering out empty objects
export function getPromptComponent(
	customModePrompts: CustomModePrompts | undefined,
	mode: string,
): PromptComponent | undefined {
	const component = customModePrompts?.[mode]
	// Return undefined if component is empty
	if (isEmpty(component)) {
		return undefined
	}
	return component
}

async function generatePrompt(
	context: vscode.ExtensionContext,
	cwd: string,
	supportsComputerUse: boolean,
	mode: Mode,
	mcpHub?: McpHub,
	diffStrategy?: DiffStrategy,
	promptComponent?: PromptComponent,
	customModeConfigs?: ModeConfig[],
	globalCustomInstructions?: string,
	experiments?: Record<string, boolean>,
	language?: string,
	rooIgnoreInstructions?: string,
	settings?: SystemPromptSettings,
	todoList?: TodoItem[],
	modelId?: string,
	skillsManager?: SkillsManager,
): Promise<string> {
	if (!context) {
		throw new Error("Extension context is required for generating system prompt")
	}

	// Get the full mode config to ensure we have the role definition (used for groups, etc.)
	const modeConfig = getModeBySlug(mode, customModeConfigs) || modes.find((m) => m.slug === mode) || modes[0]
	const { roleDefinition, baseInstructions } = getModeSelection(mode, promptComponent, customModeConfigs)

	// Check if MCP functionality should be included
	const hasMcpGroup = modeConfig.groups.some((groupEntry) => getGroupName(groupEntry) === "mcp")
	const hasMcpServers = mcpHub && mcpHub.getServers().length > 0
	const shouldIncludeMcp = hasMcpGroup && hasMcpServers

	const codeIndexManager = CodeIndexManager.getInstance(context, cwd)

	// Tool calling is native-only.
	const effectiveProtocol = "native"

	const sec = settings?.sections ?? {}

	const [modesSection, skillsSection] = await Promise.all([
		getModesSection(context, mode), // pass current mode slug for modesExcluded filtering
		// When moveRoleToConversation=true, omit skills from system prompt so it stays constant
		// across mode switches (preserving the prompt cache). Skills are injected into the
		// conversation instead via buildRoleInjectionBlock.
		getSkillsSection(skillsManager, mode as string, sec.moveRoleToConversation === true),
	])

	// Tools catalog is not included in the system prompt.
	const toolsCatalog = ""

	// Compute additional workspace folders (all folders except the primary cwd)
	const allFolders = vscode.workspace.workspaceFolders?.map((f) => f.uri.fsPath) ?? []
	const additionalWorkspaceFolders = allFolders.filter((f) => !arePathsEqual(f, cwd))

	// Role content
	let roleContent: string
	if (sec.roleEnabled === false) {
		roleContent = ""
	} else if (sec.moveRoleToConversation === true) {
		roleContent = sec.roleDisabledPlaceholder?.trim() || DEFAULT_ROLE_PLACEHOLDER
	} else {
		roleContent = roleDefinition
	}

	// Build prompt parts
	const promptParts: string[] = []

	if (roleContent) promptParts.push(roleContent)

	if (sec.markdownRulesEnabled !== false) promptParts.push(markdownFormattingSection(sec.markdownRulesOverride))

	if (sec.toolUseEnabled !== false) {
		const toolUseText = getSharedToolUseSection(sec.toolUseOverride)
		const guidelinesText = getToolUseGuidelinesSection(sec.toolUseGuidelinesOverride)
		promptParts.push(`${toolUseText}${toolsCatalog}\n\n\t${guidelinesText}`)
	}

	if (sec.capabilitiesEnabled !== false)
		promptParts.push(
			getCapabilitiesSection(
				cwd,
				shouldIncludeMcp ? mcpHub : undefined,
				sec.capabilitiesOverride,
				additionalWorkspaceFolders,
			),
		)

	// MODES always included (content filtered by modesExcluded per-mode)
	promptParts.push(modesSection)

	if (skillsSection) promptParts.push(skillsSection)

	if (sec.rulesEnabled !== false)
		promptParts.push(getRulesSection(cwd, settings, sec.rulesOverride, additionalWorkspaceFolders))

	if (sec.systemInfoEnabled !== false)
		promptParts.push(getSystemInfoSection(cwd, additionalWorkspaceFolders, sec.systemInfoOverride))

	if (sec.objectiveEnabled !== false) promptParts.push(getObjectiveSection(sec.objectiveOverride))

	// Custom instructions: only when role is in system prompt
	const includeCustomInstructions =
		sec.roleEnabled !== false && sec.customInstructionsEnabled !== false && sec.moveRoleToConversation !== true

	if (includeCustomInstructions) {
		const customInstructionsText = await addCustomInstructions(
			baseInstructions,
			globalCustomInstructions || "",
			cwd,
			mode,
			{
				language: language ?? formatLanguage(vscode.env.language),
				rooIgnoreInstructions,
				settings,
			},
		)
		if (customInstructionsText) promptParts.push(customInstructionsText)
	}

	const basePrompt = promptParts.filter(Boolean).join("\n\n")
	return basePrompt
}

export const SYSTEM_PROMPT = async (
	context: vscode.ExtensionContext,
	cwd: string,
	supportsComputerUse: boolean,
	mcpHub?: McpHub,
	diffStrategy?: DiffStrategy,
	mode: Mode = defaultModeSlug,
	customModePrompts?: CustomModePrompts,
	customModes?: ModeConfig[],
	globalCustomInstructions?: string,
	experiments?: Record<string, boolean>,
	language?: string,
	rooIgnoreInstructions?: string,
	settings?: SystemPromptSettings,
	todoList?: TodoItem[],
	modelId?: string,
	skillsManager?: SkillsManager,
): Promise<string> => {
	if (!context) {
		throw new Error("Extension context is required for generating system prompt")
	}

	// Check if it's a custom mode
	const promptComponent = getPromptComponent(customModePrompts, mode)

	// Get full mode config from custom modes or fall back to built-in modes
	const currentMode = getModeBySlug(mode, customModes) || modes.find((m) => m.slug === mode) || modes[0]

	return generatePrompt(
		context,
		cwd,
		supportsComputerUse,
		currentMode.slug,
		mcpHub,
		diffStrategy,
		promptComponent,
		customModes,
		globalCustomInstructions,
		experiments,
		language,
		rooIgnoreInstructions,
		settings,
		todoList,
		modelId,
		skillsManager,
	)
}
