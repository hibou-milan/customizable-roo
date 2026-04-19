export const DEFAULT_MARKDOWN_RULES_TEXT = `ALL responses MUST show ANY \`language construct\` OR filename reference as clickable, exactly as [\`filename OR language.declaration()\`](relative/file/path.ext:line); line is required for \`syntax\` and optional for filename links. This applies to ALL markdown responses and ALSO those in attempt_completion`

export function markdownFormattingSection(override?: string): string {
	const content = override?.trim() || DEFAULT_MARKDOWN_RULES_TEXT
	return `====

MARKDOWN RULES

${content}`
}
