import { Notice } from 'obsidian'
import SyncConfirmModal from '~/components/SyncConfirmModal'
import { emitCancelSync } from '~/events'
import i18n from '~/i18n'
import { GenericWebDAVSync, SyncStartMode } from '~/sync'
import logger from '~/utils/logger'
import GenericWebDAVPlugin from '..'

export default class CommandService {
	constructor(plugin: GenericWebDAVPlugin) {
		plugin.addCommand({
			id: 'start-sync',
			name: i18n.t('sync.startButton'),
			checkCallback: (checking) => {
				if (plugin.isSyncing) {
					return false
				}
				if (checking) {
					return true
				}

				// 检查账号配置
				if (!plugin.isAccountConfigured()) {
					new Notice(i18n.t('sync.error.accountNotConfigured'))
					// 打开设置页面，引导用户配置账号
					try {
						const setting = plugin.app.setting
						if (setting) {
							setting.open()
							setting.openTabById(plugin.manifest.id)
						}
					} catch (error) {
						logger.error('Failed to open settings:', error)
					}
					return
				}

				const startSync = async () => {
					const sync = new GenericWebDAVSync(plugin, {
						webdav: await plugin.webDAVService.createWebDAVClient(),
						vault: plugin.app.vault,
						remoteBaseDir: plugin.remoteBaseDir,
					})
					await sync.start({
						mode: SyncStartMode.MANUAL_SYNC,
					})
				}
				if (plugin.settings.confirmBeforeSync) {
					new SyncConfirmModal(plugin.app, startSync).open()
				} else {
					startSync()
				}
			},
		})

		plugin.addCommand({
			id: 'stop-sync',
			name: i18n.t('sync.stopButton'),
			checkCallback: (checking) => {
				if (plugin.isSyncing) {
					if (!checking) {
						emitCancelSync()
					}
					return true
				}
				return false
			},
		})

		plugin.addCommand({
			id: 'show-sync-progress',
			name: i18n.t('sync.showProgressButton'),
			callback: () => {
				plugin.progressService.showProgressModal()
			},
		})
	}
}
