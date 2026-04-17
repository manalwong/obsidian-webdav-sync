import { App } from 'obsidian'
import { GenericWebDAVSettingTab } from '.'
import GenericWebDAVPlugin from '..'

export default abstract class BaseSettings {
	constructor(
		protected app: App,
		protected plugin: GenericWebDAVPlugin,
		protected settings: GenericWebDAVSettingTab,
		protected containerEl: HTMLElement,
	) {}

	abstract display(): void
}
