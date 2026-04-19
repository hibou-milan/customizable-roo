import type { SystemPromptSections } from "@roo-code/types"

/**
 * Per-section settings for system prompt generation.
 * Re-exported from @roo-code/types for convenience.
 */
export type SystemPromptSectionSettings = SystemPromptSections

/**
 * Settings passed to system prompt generation functions
 */
export interface SystemPromptSettings {
	todoListEnabled: boolean
	useAgentRules: boolean
	/** When true, recursively discover and load .roo/rules from subdirectories */
	enableSubfolderRules?: boolean
	newTaskRequireTodos: boolean
	/** When true, model should hide vendor/company identity in responses */
	isStealthModel?: boolean
	/** Per-section configuration for the system prompt */
	sections?: SystemPromptSectionSettings
}
