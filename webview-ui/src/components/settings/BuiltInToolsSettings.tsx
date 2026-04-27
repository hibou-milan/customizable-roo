import React, { useState, useCallback } from "react"

import { toolNames, type ToolName } from "@roo-code/types"
import { VSCodeCheckbox } from "@vscode/webview-ui-toolkit/react"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { Button, StandardTooltip } from "@src/components/ui"
import { SectionHeader } from "./SectionHeader"
import { SetCachedStateField } from "./types"

// ─── Default tool descriptions ───────────────────────────────────────────────
// These MUST stay in sync with src/core/prompts/tools/native-tools/*.ts

const DEFAULT_DESCRIPTIONS: Record<ToolName, string> = {
	execute_command: `Request to execute a CLI command on the system. Use this when you need to perform system operations or run specific commands to accomplish any step in the user's task. You must tailor your command to the user's system and provide a clear explanation of what the command does. For command chaining, use the appropriate chaining syntax for the user's shell. Prefer to execute complex CLI commands over creating executable scripts, as they are more flexible and easier to run. Prefer relative commands and paths that avoid location sensitivity for terminal consistency.

Parameters:
- command: (required) The CLI command to execute. This should be valid for the current operating system. Ensure the command is properly formatted and does not contain any harmful instructions.
- cwd: (optional) The working directory to execute the command in
- timeout: (optional) Timeout in seconds. When exceeded, the command keeps running in the background and you receive the output so far. Set this for commands that may run indefinitely, such as dev servers or file watchers, so you can proceed without waiting for them to exit.

Example: Executing npm run dev
{ "command": "npm run dev", "cwd": null, "timeout": null }`,

	read_file: `Read a file and return its contents with line numbers for diffing or discussion. IMPORTANT: This tool reads exactly one file per call. If you need multiple files, issue multiple parallel read_file calls. Supports two modes: 'slice' (default) reads lines sequentially with offset/limit; 'indentation' extracts complete semantic code blocks around an anchor line based on indentation hierarchy. Slice mode is ideal for initial file exploration, understanding overall structure, reading configuration/data files, or when you need a specific line range. Use it when you don't have a target line number. PREFER indentation mode when you have a specific line number from search results, error messages, or definition lookups - it guarantees complete, syntactically valid code blocks without mid-function truncation. IMPORTANT: Indentation mode requires anchor_line to be useful. Without it, only header content (imports) is returned. By default, returns up to 2000 lines per file. Lines longer than 2000 characters are truncated. Supports text extraction from PDF and DOCX files, but may not handle other binary files properly. Example: { path: 'src/app.ts' } Example (indentation mode): { path: 'src/app.ts', mode: 'indentation', indentation: { anchor_line: 42 } }`,

	read_command_output: `Retrieve the full output from a command that was truncated in execute_command. Use this tool when:
1. The execute_command result shows "[OUTPUT TRUNCATED - Full output saved to artifact: cmd-XXXX.txt]"
2. You need to see more of the command output beyond the preview
3. You want to search for specific content in large command output

The tool supports two modes:
- **Read mode**: Read output starting from a byte offset with optional limit
- **Search mode**: Filter lines matching a regex or literal pattern (like grep)

Parameters:
- artifact_id: (required) The artifact filename from the truncated output message (e.g., "cmd-1706119234567.txt")
- search: (optional) Pattern to filter lines. Supports regex or literal strings. Case-insensitive. **Omit this parameter entirely if you don't need to filter - do not pass null or empty string.**
- offset: (optional) Byte offset to start reading from. Default: 0. Use for pagination.
- limit: (optional) Maximum bytes to return. Default: 40KB.

Example: Reading truncated command output
{ "artifact_id": "cmd-1706119234567.txt" }`,

	write_to_file: `Request to write content to a file. This tool is primarily used for creating new files or for scenarios where a complete rewrite of an existing file is intentionally required. If the file exists, it will be overwritten. If it doesn't exist, it will be created. This tool will automatically create any directories needed to write the file.

**Important:** You should prefer using other editing tools over write_to_file when making changes to existing files, since write_to_file is slower and cannot handle large files. Use write_to_file primarily for new file creation.

When using this tool, use it directly with the desired content. You do not need to display the content before using the tool. ALWAYS provide the COMPLETE file content in your response. This is NON-NEGOTIABLE. Partial updates or placeholders like '// rest of code unchanged' are STRICTLY FORBIDDEN. Failure to do so will result in incomplete or broken code.

When creating a new project, organize all new files within a dedicated project directory unless the user specifies otherwise. Structure the project logically, adhering to best practices for the specific type of project being created.

Example: Writing a configuration file
{ "path": "frontend-config.json", "content": "{\\n  \\"apiEndpoint\\": \\"https://api.example.com\\",\\n  \\"theme\\": {\\n    \\"primaryColor\\": \\"#007bff\\"\\n  }\\n}" }`,

	apply_diff: `Apply precise, targeted modifications to an existing file using one or more search/replace blocks. This tool is for surgical edits only; the 'SEARCH' block must exactly match the existing content, including whitespace and indentation. To make multiple targeted changes, provide multiple SEARCH/REPLACE blocks in the 'diff' parameter. Use the 'read_file' tool first if you are not confident in the exact content to search for.`,

	list_files: `Request to list files and directories within the specified directory. If recursive is true, it will list all files and directories recursively. If recursive is false or not provided, it will only list the top-level contents. Do not use this tool to confirm the existence of files you may have created, as the user will let you know if the files were created successfully or not.

Symlinked directories are shown with an \`@\` suffix (e.g. \`linked-repo@/\`). By default, one level of their contents is shown in environment details so you can discover symlinked repositories without any configuration. To traverse symlinks fully, enable the 'Follow symbolic links when listing files' setting.

Parameters:
- path: (required) The path of the directory to list contents for (relative to the current workspace directory)
- recursive: (required) Whether to list files recursively. Use true for recursive listing, false for top-level only.

Example: Listing all files in the current directory (top-level only)
{ "path": ".", "recursive": false }`,

	search_files: `Request to perform a regex search across files in a specified directory, providing context-rich results. This tool searches for patterns or specific content across multiple files, displaying each match with encapsulating context.

Craft your regex patterns carefully to balance specificity and flexibility. Use this tool to find code patterns, TODO comments, function definitions, or any text-based information across the project. The results include surrounding context, so analyze the surrounding code to better understand the matches. Leverage this tool in combination with other tools for more comprehensive analysis.

Parameters:
- path: (required) The path of the directory to search in (relative to the current workspace directory). This directory will be recursively searched.
- regex: (required) The regular expression pattern to search for. Uses Rust regex syntax.
- file_pattern: (optional) Glob pattern to filter files (e.g., '*.ts' for TypeScript files). If not provided, it will search all files (*).

Example: Searching for all .ts files in the current directory
{ "path": ".", "regex": ".*", "file_pattern": "*.ts" }`,

	codebase_search: `Find files most relevant to the search query using semantic search. Searches based on meaning rather than exact text matches. By default searches entire workspace. Reuse the user's exact wording unless there's a clear reason not to - their phrasing often helps semantic search. Queries MUST be in English (translate if needed).

**CRITICAL: For ANY exploration of code you haven't examined yet in this conversation, you MUST use this tool FIRST before any other search or file exploration tools.** This applies throughout the entire conversation, not just at the beginning. This tool uses semantic search to find relevant code based on meaning rather than just keywords, making it far more effective than regex-based search_files for understanding implementations. Even if you've already explored some code, any new area of exploration requires codebase_search first.

Parameters:
- query: (required) The search query. Reuse the user's exact wording/question format unless there's a clear reason not to.
- path: (optional) Limit search to specific subdirectory (relative to the current workspace directory). Leave empty for entire workspace.

Example: Searching for user authentication code
{ "query": "User login and password hashing", "path": "src/auth" }`,

	edit: `Performs exact string replacements in files.

Usage:
- You must use your \`Read\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`,

	search_replace: `Use this tool to propose a search and replace operation on an existing file.

The tool will replace ONE occurrence of old_string with new_string in the specified file.

CRITICAL REQUIREMENTS FOR USING THIS TOOL:

1. UNIQUENESS: The old_string MUST uniquely identify the specific instance you want to change. This means:
   - Include AT LEAST 3-5 lines of context BEFORE the change point
   - Include AT LEAST 3-5 lines of context AFTER the change point
   - Include all whitespace, indentation, and surrounding code exactly as it appears in the file

2. SINGLE INSTANCE: This tool can only change ONE instance at a time. If you need to change multiple instances:
   - Make separate calls to this tool for each instance
   - Each call must uniquely identify its specific instance using extensive context

3. VERIFICATION: Before using this tool:
   - If multiple instances exist, gather enough context to uniquely identify each one
   - Plan separate tool calls for each instance`,

	search_and_replace: `Performs exact string replacements in files.

Usage:
- You must use your \`Read\` tool at least once in the conversation before editing. This tool will error if you attempt an edit without reading the file.
- When editing text from Read tool output, ensure you preserve the exact indentation (tabs/spaces) as it appears AFTER the line number prefix. The line number prefix format is: spaces + line number + tab. Everything after that tab is the actual file content to match. Never include any part of the line number prefix in the old_string or new_string.
- ALWAYS prefer editing existing files in the codebase. NEVER write new files unless explicitly required.
- Only use emojis if the user explicitly requests it. Avoid adding emojis to files unless asked.
- The edit will FAIL if \`old_string\` is not unique in the file. Either provide a larger string with more surrounding context to make it unique or use \`replace_all\` to change every instance of \`old_string\`.
- Use \`replace_all\` for replacing and renaming strings across the file. This parameter is useful if you want to rename a variable for instance.`,

	edit_file: `Use this tool to replace text in an existing file, or create a new file.

This tool performs literal string replacement with support for multiple occurrences.

To be resilient to minor formatting drift, the tool normalizes line endings (CRLF/LF) for matching and may fall back to deterministic matching strategies when an exact literal match fails (exact → whitespace-tolerant match → token-based match). The original file's line endings are preserved when writing.

USAGE PATTERNS:

1. MODIFY EXISTING FILE (default):
   - Provide file_path, old_string (text to find), and new_string (replacement)
   - By default, expects exactly 1 occurrence of old_string
   - Use expected_replacements to replace multiple occurrences

2. CREATE NEW FILE:
   - Set old_string to empty string ""
   - new_string becomes the entire file content
   - File must not already exist

CRITICAL REQUIREMENTS:

1. EXACT MATCHING (BEST): The old_string should match the file contents EXACTLY, including:
    - All whitespace (spaces, tabs, newlines)
    - All indentation
    - All punctuation and special characters

2. CONTEXT FOR UNIQUENESS: For single replacements (default), include at least 3 lines of context BEFORE and AFTER the target text to ensure uniqueness.

3. MULTIPLE REPLACEMENTS: If you need to replace multiple identical occurrences:
   - Set expected_replacements to the exact count you expect to replace
   - ALL occurrences will be replaced

4. NO ESCAPING: Provide the literal text - do not escape special characters.`,

	apply_patch: `Apply patches to files using a stripped-down, file-oriented diff format. This tool supports creating new files, deleting files, and updating existing files with precise changes.

The patch format uses a simple, human-readable structure:

*** Begin Patch
[ one or more file sections ]
*** End Patch

Each file section starts with one of three headers:
- *** Add File: <path> - Create a new file. Every following line is a + line (the initial contents).
- *** Delete File: <path> - Remove an existing file. Nothing follows.
- *** Update File: <path> - Patch an existing file in place.

For Update File operations:
- May be immediately followed by *** Move to: <new path> if you want to rename the file.
- Then one or more "hunks", each introduced by @@ (optionally followed by context like a class or function name).
- Within a hunk each line starts with:
  - ' ' (space) for context lines (unchanged)
  - '-' for lines to remove
  - '+' for lines to add

Context guidelines:
- Show 3 lines of code above and below each change.
- Use @@ with a class/function name if 3 lines of context is insufficient to uniquely identify the location.
- Multiple @@ statements can be used for deeply nested code.

Example patch:
*** Begin Patch
*** Add File: hello.txt
+Hello world
*** Update File: src/app.py
*** Move to: src/main.py
@@ def greet():
-print("Hi")
+print("Hello, world!")
*** Delete File: obsolete.txt
*** End Patch`,

	ask_followup_question: `Ask the user a question to gather additional information needed to complete the task. Use when you need clarification or more details to proceed effectively.

Parameters:
- question: (required) A clear, specific question addressing the information needed
- follow_up: (required) A list of 2-4 suggested answers. Suggestions must be complete, actionable answers without placeholders. Optionally include mode to switch modes (code/architect/etc.)

Example: Asking for file path
{ "question": "What is the path to the frontend-config.json file?", "follow_up": [{ "text": "./src/frontend-config.json", "mode": null }, { "text": "./config/frontend-config.json", "mode": null }, { "text": "./frontend-config.json", "mode": null }] }`,

	attempt_completion: `After each tool use, the user will respond with the result of that tool use, i.e. if it succeeded or failed, along with any reasons for failure. Once you've received the results of tool uses and can confirm that the task is complete, use this tool to present the result of your work to the user. The user may respond with feedback if they are not satisfied with the result, which you can use to make improvements and try again.

IMPORTANT NOTE: This tool CANNOT be used until you've confirmed from the user that any previous tool uses were successful. Failure to do so will result in code corruption and system failure. Before using this tool, you must confirm that you've received successful results from the user for any previous tool uses. If not, then DO NOT use this tool.

Parameters:
- result: (required) The result of the task. Formulate this result in a way that is final and does not require further input from the user. Don't end your result with questions or offers for further assistance.

Example: Completing after updating CSS
{ "result": "I've updated the CSS to use flexbox layout for better responsiveness" }`,

	switch_mode: `Request to switch to a different mode. This tool allows modes to request switching to another mode when needed, such as switching to Code mode to make code changes. The user must approve the mode switch.`,

	new_task: `Create a new task instance in the chosen mode using your provided message and initial todo list (if required).

CRITICAL: This tool MUST be called alone. Do NOT call this tool alongside other tools in the same message turn. If you need to gather information before delegating, use other tools in a separate turn first, then call new_task by itself in the next turn.`,

	access_mcp_resource: `Request to access a resource provided by a connected MCP server. Resources represent data sources that can be used as context, such as files, API responses, or system information.

Parameters:
- server_name: (required) The name of the MCP server providing the resource
- uri: (required) The URI identifying the specific resource to access

Example: Accessing a weather resource
{ "server_name": "weather-server", "uri": "weather://san-francisco/current" }`,

	use_mcp_tool: `Execute a tool provided by a connected MCP server. Each server may provide different capabilities that you can use to accomplish tasks more effectively.

Parameters:
- server_name: (required) The name of the MCP server providing the tool
- tool_name: (required) The name of the tool to execute
- arguments: (optional) Arguments to pass to the tool, as a JSON object

Example: Using a tool from an MCP server
{ "server_name": "weather-server", "tool_name": "get_current_weather", "arguments": { "location": "San Francisco" } }`,

	update_todo_list: `Replace the entire TODO list with an updated checklist reflecting the current state. Always provide the full list; the system will overwrite the previous one. This tool is designed for step-by-step task tracking, allowing you to confirm completion of each step before updating, update multiple task statuses at once (e.g., mark one as completed and start the next), and dynamically add new todos discovered during long or complex tasks.

Checklist Format:
- Use a single-level markdown checklist (no nesting or subtasks)
- List todos in the intended execution order
- Status options: [ ] (pending), [x] (completed), [-] (in progress)

Core Principles:
- Before updating, always confirm which todos have been completed
- You may update multiple statuses in a single update
- Add new actionable items as they're discovered
- Only mark a task as completed when fully accomplished
- Keep all unfinished tasks unless explicitly instructed to remove

Example: Initial task list
{ "todos": "[x] Analyze requirements\\n[x] Design architecture\\n[-] Implement core logic\\n[ ] Write tests\\n[ ] Update documentation" }`,

	run_slash_command: `Execute a slash command to get specific instructions or content. Slash commands are predefined templates that provide detailed guidance for common tasks.`,

	skill: `Load and execute a skill by name. Skills provide specialized instructions for common tasks like creating MCP servers or custom modes.

Use this tool when you need to follow specific procedures documented in a skill. Available skills are listed in the AVAILABLE SKILLS section of the system prompt.`,

	generate_image: `Request to generate or edit an image using AI models through OpenRouter API. This tool can create new images from text prompts or modify existing images based on your instructions. When an input image is provided, the AI will apply the requested edits, transformations, or enhancements to that image.

Parameters:
- prompt: (required) The text prompt describing what to generate or how to edit the image
- path: (required) The file path where the generated/edited image should be saved (relative to the current workspace directory). The tool will automatically add the appropriate image extension if not provided.
- image: (optional) The file path to an input image to edit or transform (relative to the current workspace directory). Supported formats: PNG, JPG, JPEG, GIF, WEBP.

Example: Generating a sunset image
{ "prompt": "A beautiful sunset over mountains with vibrant orange and purple colors", "path": "images/sunset.png", "image": null }`,

	custom_tool: "Use custom tools defined in the workspace.",
}

// ─── Display names ───────────────────────────────────────────────────────────

const TOOL_DISPLAY_NAMES: Record<ToolName, string> = {
	execute_command: "Execute Command",
	read_file: "Read File",
	read_command_output: "Read Command Output",
	write_to_file: "Write to File",
	apply_diff: "Apply Diff",
	edit: "Edit",
	search_and_replace: "Search and Replace",
	search_replace: "Search Replace",
	edit_file: "Edit File",
	apply_patch: "Apply Patch",
	search_files: "Search Files",
	list_files: "List Files",
	use_mcp_tool: "Use MCP Tool",
	access_mcp_resource: "Access MCP Resource",
	ask_followup_question: "Ask Follow-up Question",
	attempt_completion: "Attempt Completion",
	switch_mode: "Switch Mode",
	new_task: "New Task",
	codebase_search: "Codebase Search",
	update_todo_list: "Update Todo List",
	run_slash_command: "Run Slash Command",
	skill: "Skill",
	generate_image: "Generate Image",
	custom_tool: "Custom Tool",
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface BuiltInToolsSettingsProps {
	disabledTools: string[]
	toolDescriptionOverrides: Record<string, string>
	setCachedStateField: SetCachedStateField<any>
}

// ─── Component ───────────────────────────────────────────────────────────────

export const BuiltInToolsSettings: React.FC<BuiltInToolsSettingsProps> = ({
	disabledTools,
	toolDescriptionOverrides,
	setCachedStateField,
}) => {
	const { t } = useAppTranslation()
	const [expandedTool, setExpandedTool] = useState<string | null>(null)

	const isToolEnabled = useCallback((toolName: string) => !disabledTools.includes(toolName), [disabledTools])

	const toggleTool = useCallback(
		(toolName: string) => {
			const newDisabled = isToolEnabled(toolName)
				? [...disabledTools, toolName]
				: disabledTools.filter((t) => t !== toolName)
			setCachedStateField("disabledTools", newDisabled)
		},
		[disabledTools, isToolEnabled, setCachedStateField],
	)

	const updateOverride = useCallback(
		(toolName: string, value: string) => {
			setCachedStateField("toolDescriptionOverrides", {
				...toolDescriptionOverrides,
				[toolName]: value,
			})
		},
		[toolDescriptionOverrides, setCachedStateField],
	)

	const resetOverride = useCallback(
		(toolName: string) => {
			const defaultDesc = DEFAULT_DESCRIPTIONS[toolName as ToolName] ?? ""
			setCachedStateField("toolDescriptionOverrides", {
				...toolDescriptionOverrides,
				[toolName]: defaultDesc,
			})
		},
		[toolDescriptionOverrides, setCachedStateField],
	)

	const toggleExpanded = useCallback((toolName: string) => {
		setExpandedTool((prev) => (prev === toolName ? null : toolName))
	}, [])

	return (
		<div>
			<SectionHeader description={t("settings:builtInTools.description")}>
				{t("settings:builtInTools.title")}
			</SectionHeader>

			<div className="px-5 pb-6 space-y-4">
				{toolNames.map((toolName) => {
					const enabled = isToolEnabled(toolName)
					const override = toolDescriptionOverrides[toolName] ?? ""
					const defaultDesc = DEFAULT_DESCRIPTIONS[toolName]
					const hasOverride = override.trim() !== "" && override.trim() !== defaultDesc.trim()
					const isExpanded = expandedTool === toolName

					return (
						<div
							key={toolName}
							data-setting-id={`built-in-tool-${toolName}`}
							className="border border-vscode-panel-border rounded-md overflow-hidden">
							{/* Header row: checkbox + name + expand toggle */}
							<div className="flex items-center gap-3 px-4 py-3 bg-vscode-editor-background">
								<VSCodeCheckbox
									checked={enabled}
									onChange={() => toggleTool(toolName)}
									data-testid={`tool-enable-${toolName}`}
								/>
								<div className="flex-1 min-w-0">
									<div className="font-medium text-vscode-foreground text-sm">
										{TOOL_DISPLAY_NAMES[toolName]}
									</div>
									<div className="text-xs text-vscode-descriptionForeground font-mono">
										{toolName}
									</div>
								</div>
								<button
									onClick={() => toggleExpanded(toolName)}
									className="text-xs text-vscode-descriptionForeground hover:text-vscode-foreground transition-colors"
									data-testid={`tool-expand-${toolName}`}>
									{isExpanded
										? t("settings:builtInTools.collapseParameters")
										: t("settings:builtInTools.expandParameters")}
								</button>
							</div>

							{/* Description override textarea */}
							<div className="px-4 py-3 border-t border-vscode-panel-border">
								<div className="flex items-center justify-between mb-2">
									<label className="text-xs font-medium text-vscode-foreground">
										{t("settings:builtInTools.descriptionOverride")}
									</label>
									{hasOverride && (
										<StandardTooltip content={t("settings:builtInTools.resetDescriptionTooltip")}>
											<Button
												variant="ghost"
												size="sm"
												className="h-6 px-2 text-xs"
												onClick={() => resetOverride(toolName)}
												data-testid={`tool-reset-${toolName}`}>
												{t("settings:builtInTools.resetDescription")}
											</Button>
										</StandardTooltip>
									)}
								</div>
								<textarea
									value={override}
									placeholder={defaultDesc.slice(0, 120) + "..."}
									onChange={(e) => updateOverride(toolName, e.target.value)}
									rows={4}
									className="w-full text-xs font-mono bg-vscode-input-background text-vscode-input-foreground border border-vscode-panel-border rounded px-2 py-1 resize-y focus:outline-none focus:ring-1 focus:ring-vscode-focusBorder"
									data-testid={`tool-description-${toolName}`}
								/>
								<div className="text-xs text-vscode-descriptionForeground mt-1">
									{override.trim() === ""
										? t("settings:builtInTools.fallbackToDefault")
										: hasOverride
											? t("settings:builtInTools.overrideActive")
											: t("settings:builtInTools.usingDefault")}
								</div>
							</div>

							{/* Collapsible parameter signature */}
							{isExpanded && (
								<div className="px-4 py-3 border-t border-vscode-panel-border bg-vscode-editor-background">
									<div className="text-xs font-medium text-vscode-foreground mb-2">
										{t("settings:builtInTools.parameters")}
									</div>
									<pre className="text-xs font-mono text-vscode-descriptionForeground whitespace-pre-wrap overflow-auto max-h-60">
										{defaultDesc}
									</pre>
								</div>
							)}
						</div>
					)
				})}
			</div>
		</div>
	)
}
