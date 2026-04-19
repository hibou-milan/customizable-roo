export const DEFAULT_TOOL_USE_TEXT = `You have access to a set of tools that are executed upon the user's approval. Use the provider-native tool-calling mechanism. Do not include XML markup or examples. You must call at least one tool per assistant response. Prefer calling as many tools as are reasonably needed in a single response to reduce back-and-forth and complete tasks faster.`

export function getSharedToolUseSection(override?: string): string {
	const content = override?.trim() || DEFAULT_TOOL_USE_TEXT
	return `====

TOOL USE

${content}`
}
