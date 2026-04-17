import { syncRecordKV } from '~/storage'
import { SyncRecord } from '~/storage/sync-record'
import { GenericWebDAVSync, SyncStartMode } from '~/sync'
import TwoWaySyncDecider from '~/sync/decision/two-way.decider'
import { getDBKey } from '~/utils/get-db-key'
import waitUntil from '~/utils/wait-until'
import type GenericWebDAVPlugin from '..'

export interface SyncOptions {
	mode: SyncStartMode
}

export default class SyncExecutorService {
	constructor(private plugin: GenericWebDAVPlugin) {}

	async executeSync(options: SyncOptions) {
		if (this.plugin.isSyncing) {
			return false
		}

		if (!this.plugin.isAccountConfigured()) {
			return false
		}

		await waitUntil(() => this.plugin.isSyncing === false, 500)

		const configDir = this.plugin.app.vault.configDir
		const hasConfigDirRule =
			this.plugin.settings.filterRules.exclusionRules.some(
				(rule) => rule.expr === configDir,
			)
		if (!hasConfigDirRule) {
			this.plugin.settings.filterRules.exclusionRules.push({
				expr: configDir,
				options: { caseSensitive: false },
			})
			await this.plugin.saveSettings()
		}

		const sync = new GenericWebDAVSync(this.plugin, {
			vault: this.plugin.app.vault,
			remoteBaseDir: this.plugin.remoteBaseDir,
			webdav: await this.plugin.webDAVService.createWebDAVClient(),
		})

		const syncRecord = new SyncRecord(
			getDBKey(this.plugin.app.vault.getName(), this.plugin.remoteBaseDir),
			syncRecordKV,
		)

		const decider = new TwoWaySyncDecider(sync, syncRecord)
		const decided = await decider.decide()

		if (decided.length === 0) {
			return false
		}

		await sync.start({
			mode: options.mode,
		})

		return true
	}
}
