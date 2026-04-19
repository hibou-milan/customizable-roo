import os from "os"

import { getShell } from "../../../utils/shell"
import { getCommandChainOperator } from "./rules"

export interface TemplateVars {
	cwd: string
	shell: string
	os: string
	homeDir: string
	chainOp: string
}

export function buildTemplateVars(cwd: string): TemplateVars {
	return {
		cwd: cwd.toPosix(),
		shell: getShell(),
		os: os.platform(),
		homeDir: os.homedir().toPosix(),
		chainOp: getCommandChainOperator(),
	}
}

export function applyTemplateVars(template: string, vars: TemplateVars): string {
	return template
		.replace(/\{\{cwd\}\}/g, vars.cwd)
		.replace(/\{\{shell\}\}/g, vars.shell)
		.replace(/\{\{os\}\}/g, vars.os)
		.replace(/\{\{homeDir\}\}/g, vars.homeDir)
		.replace(/\{\{chainOp\}\}/g, vars.chainOp)
}
