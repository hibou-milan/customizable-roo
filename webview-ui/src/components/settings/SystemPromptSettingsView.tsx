import React from "react"
import { VSCodeCheckbox, VSCodeTextArea } from "@vscode/webview-ui-toolkit/react"

import type { SystemPromptSections, ProviderSettings } from "@roo-code/types"
import {
	DEFAULT_MARKDOWN_RULES_TEXT,
	DEFAULT_TOOL_USE_TEXT,
	DEFAULT_OBJECTIVE_TEXT,
	DEFAULT_ROLE_PLACEHOLDER,
	DEFAULT_CAPABILITIES_TEXT,
	DEFAULT_RULES_TEXT,
	DEFAULT_SYSTEM_INFO_TEXT,
} from "@roo-code/types"

import { useAppTranslation } from "@src/i18n/TranslationContext"
import { SectionHeader } from "./SectionHeader"
import { Section } from "./Section"
import { Button } from "@src/components/ui"

interface SystemPromptSettingsViewProps {
	systemPromptSections: SystemPromptSections
	setSystemPromptSections: (val: SystemPromptSections) => void
	apiConfiguration?: ProviderSettings
}

interface SectionRowProps {
	label: string
	enabled: boolean
	onToggle: (enabled: boolean) => void
	overrideValue: string | undefined
	onOverrideChange: (val: string) => void
	onReset: () => void
	onSetToDefault?: () => void
	isDynamic?: boolean
	overrideLabel: string
	resetLabel: string
	defaultPlaceholder: string
	children?: React.ReactNode
}

const SectionRow: React.FC<SectionRowProps> = ({
	label,
	enabled,
	onToggle,
	overrideValue,
	onOverrideChange,
	onReset,
	onSetToDefault,
	isDynamic,
	overrideLabel,
	resetLabel,
	defaultPlaceholder,
	children,
}) => {
	const { t } = useAppTranslation()

	return (
		<div className="mb-4 pb-4 border-b border-vscode-input-border last:border-b-0">
			<div className="flex items-center gap-2 mb-2">
				<VSCodeCheckbox checked={enabled} onChange={(e) => onToggle((e.target as HTMLInputElement).checked)}>
					<span className="font-medium">{label}</span>
				</VSCodeCheckbox>
			</div>
			{enabled && (
				<div className="ml-6">
					{children}
					<div className="text-xs text-vscode-descriptionForeground mb-1">{overrideLabel}</div>
					{isDynamic && (
						<div className="text-xs text-vscode-descriptionForeground mb-1 italic">
							{t("settings:systemPrompt.dynamicSectionNote")}
						</div>
					)}
					<div className="flex gap-2 items-start">
						<VSCodeTextArea
							resize="vertical"
							value={overrideValue ?? ""}
							placeholder={defaultPlaceholder}
							onChange={(e) => onOverrideChange((e.target as HTMLTextAreaElement).value)}
							rows={3}
							className="w-full"
						/>
						<div className="flex gap-1 items-start flex-shrink-0 mt-0.5">
							{onSetToDefault && (
								<Button
									variant="ghost"
									size="icon"
									onClick={onSetToDefault}
									title={t("settings:systemPrompt.setToDefault")}>
									<span className="codicon codicon-refresh"></span>
								</Button>
							)}
							<Button variant="ghost" size="icon" onClick={onReset} title={resetLabel}>
								<span className="codicon codicon-discard"></span>
							</Button>
						</div>
					</div>
				</div>
			)}
		</div>
	)
}

export const SystemPromptSettingsView: React.FC<SystemPromptSettingsViewProps> = ({
	systemPromptSections,
	setSystemPromptSections,
	apiConfiguration,
}) => {
	const { t } = useAppTranslation()

	const update = (patch: Partial<SystemPromptSections>) => {
		setSystemPromptSections({ ...systemPromptSections, ...patch })
	}

	const roleEnabled = systemPromptSections.roleEnabled !== false
	const moveRoleToConversation = apiConfiguration?.moveRoleToConversation === true

	return (
		<div>
			<SectionHeader>{t("settings:systemPrompt.title")}</SectionHeader>
			<Section>
				<div className="text-sm text-vscode-descriptionForeground mb-4">
					{t("settings:systemPrompt.description")}
				</div>

				{/* Role & Custom Instructions */}
				<div className="mb-4 pb-4 border-b border-vscode-input-border">
					<div className="flex items-center gap-2 mb-2">
						<VSCodeCheckbox
							checked={roleEnabled}
							onChange={(e) => update({ roleEnabled: (e.target as HTMLInputElement).checked })}>
							<span className="font-medium">{t("settings:systemPrompt.roleSection")}</span>
						</VSCodeCheckbox>
					</div>
					{roleEnabled && (
						<div className="ml-6">
							<div
								className={`text-xs mb-2 ${moveRoleToConversation ? "text-vscode-foreground font-medium" : "text-vscode-descriptionForeground"}`}>
								{moveRoleToConversation
									? t("settings:systemPrompt.placeholderActiveNote")
									: t("settings:systemPrompt.placeholderInactiveNote")}
							</div>
							<div className="text-xs text-vscode-descriptionForeground mb-1">
								{t("settings:systemPrompt.rolePlaceholderLabel")}
							</div>
							<div className="flex gap-2 items-start">
								<VSCodeTextArea
									resize="vertical"
									value={systemPromptSections.roleDisabledPlaceholder ?? ""}
									placeholder="IMPORTANT: Pay close attention to role and instruction sections that will appear in the conversation..."
									onChange={(e) =>
										update({
											roleDisabledPlaceholder: (e.target as HTMLTextAreaElement).value,
										})
									}
									rows={3}
									className="w-full"
								/>
								<div className="flex gap-1 items-start flex-shrink-0 mt-0.5">
									<Button
										variant="ghost"
										size="icon"
										onClick={() => update({ roleDisabledPlaceholder: DEFAULT_ROLE_PLACEHOLDER })}
										title={t("settings:systemPrompt.setToDefault")}>
										<span className="codicon codicon-refresh"></span>
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={() => update({ roleDisabledPlaceholder: undefined })}
										title={t("settings:systemPrompt.clearOverride")}>
										<span className="codicon codicon-discard"></span>
									</Button>
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Markdown Rules */}
				<SectionRow
					label={t("settings:systemPrompt.markdownRules")}
					enabled={systemPromptSections.markdownRulesEnabled !== false}
					onToggle={(enabled) => update({ markdownRulesEnabled: enabled })}
					overrideValue={systemPromptSections.markdownRulesOverride}
					onOverrideChange={(val) => update({ markdownRulesOverride: val || undefined })}
					onReset={() => update({ markdownRulesOverride: undefined })}
					onSetToDefault={() => update({ markdownRulesOverride: DEFAULT_MARKDOWN_RULES_TEXT })}
					overrideLabel={t("settings:systemPrompt.overrideLabel")}
					resetLabel={t("settings:systemPrompt.clearOverride")}
					defaultPlaceholder="ALL responses MUST show ANY `language construct` OR filename reference as clickable..."
				/>

				{/* Tool Use */}
				<SectionRow
					label={t("settings:systemPrompt.toolUse")}
					enabled={systemPromptSections.toolUseEnabled !== false}
					onToggle={(enabled) => update({ toolUseEnabled: enabled })}
					overrideValue={systemPromptSections.toolUseOverride}
					onOverrideChange={(val) => update({ toolUseOverride: val || undefined })}
					onReset={() => update({ toolUseOverride: undefined })}
					onSetToDefault={() => update({ toolUseOverride: DEFAULT_TOOL_USE_TEXT })}
					overrideLabel={t("settings:systemPrompt.overrideLabel")}
					resetLabel={t("settings:systemPrompt.clearOverride")}
					defaultPlaceholder="You have access to a set of tools that are executed upon the user's approval..."
				/>

				{/* Capabilities */}
				<SectionRow
					label={t("settings:systemPrompt.capabilities")}
					enabled={systemPromptSections.capabilitiesEnabled !== false}
					onToggle={(enabled) => update({ capabilitiesEnabled: enabled })}
					overrideValue={systemPromptSections.capabilitiesOverride}
					onOverrideChange={(val) => update({ capabilitiesOverride: val || undefined })}
					onReset={() => update({ capabilitiesOverride: undefined })}
					onSetToDefault={() => update({ capabilitiesOverride: DEFAULT_CAPABILITIES_TEXT })}
					isDynamic={true}
					overrideLabel={t("settings:systemPrompt.overrideLabelDynamic")}
					resetLabel={t("settings:systemPrompt.clearOverride")}
					defaultPlaceholder="- You have access to tools that let you execute CLI commands..."
				/>

				{/* Modes note */}
				<div className="mb-4 pb-4 border-b border-vscode-input-border">
					<div className="text-sm text-vscode-descriptionForeground italic">
						{t("settings:systemPrompt.modesNote")}
					</div>
				</div>

				{/* Rules */}
				<SectionRow
					label={t("settings:systemPrompt.rules")}
					enabled={systemPromptSections.rulesEnabled !== false}
					onToggle={(enabled) => update({ rulesEnabled: enabled })}
					overrideValue={systemPromptSections.rulesOverride}
					onOverrideChange={(val) => update({ rulesOverride: val || undefined })}
					onReset={() => update({ rulesOverride: undefined })}
					onSetToDefault={() => update({ rulesOverride: DEFAULT_RULES_TEXT })}
					isDynamic={true}
					overrideLabel={t("settings:systemPrompt.overrideLabelDynamic")}
					resetLabel={t("settings:systemPrompt.clearOverride")}
					defaultPlaceholder="- The project base directory is: ..."
				/>

				{/* System Info */}
				<SectionRow
					label={t("settings:systemPrompt.systemInfo")}
					enabled={systemPromptSections.systemInfoEnabled !== false}
					onToggle={(enabled) => update({ systemInfoEnabled: enabled })}
					overrideValue={systemPromptSections.systemInfoOverride}
					onOverrideChange={(val) => update({ systemInfoOverride: val || undefined })}
					onReset={() => update({ systemInfoOverride: undefined })}
					onSetToDefault={() => update({ systemInfoOverride: DEFAULT_SYSTEM_INFO_TEXT })}
					isDynamic={true}
					overrideLabel={t("settings:systemPrompt.overrideLabelDynamic")}
					resetLabel={t("settings:systemPrompt.clearOverride")}
					defaultPlaceholder="Operating System: ...\nDefault Shell: ...\nHome Directory: ...\nCurrent Workspace Directory: ..."
				/>

				{/* Objective */}
				<SectionRow
					label={t("settings:systemPrompt.objective")}
					enabled={systemPromptSections.objectiveEnabled !== false}
					onToggle={(enabled) => update({ objectiveEnabled: enabled })}
					overrideValue={systemPromptSections.objectiveOverride}
					onOverrideChange={(val) => update({ objectiveOverride: val || undefined })}
					onReset={() => update({ objectiveOverride: undefined })}
					onSetToDefault={() => update({ objectiveOverride: DEFAULT_OBJECTIVE_TEXT })}
					overrideLabel={t("settings:systemPrompt.overrideLabel")}
					resetLabel={t("settings:systemPrompt.clearOverride")}
					defaultPlaceholder="You accomplish a given task iteratively, breaking it down into clear steps..."
				/>
			</Section>
		</div>
	)
}
