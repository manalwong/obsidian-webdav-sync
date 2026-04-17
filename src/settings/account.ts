import { Notice, Setting } from 'obsidian'
import i18n from '~/i18n'
import { is503Error } from '~/utils/is-503-error'
import BaseSettings from './settings.base'

export default class AccountSettings extends BaseSettings {
	async display() {
		this.containerEl.empty()
		new Setting(this.containerEl)
			.setName(i18n.t('settings.sections.account'))
			.setHeading()

		// WebDAV 服务器地址
		new Setting(this.containerEl)
			.setName(i18n.t('settings.webdavUrl.name') || 'WebDAV Server URL')
			.setDesc(i18n.t('settings.webdavUrl.desc') || 'The URL of your WebDAV server (e.g., https://dav.example.com/dav/)')
			.addText((text) =>
				text
					.setPlaceholder('https://dav.jianguoyun.com/dav/')
					.setValue(this.plugin.settings.webdavUrl)
					.onChange(async (value) => {
						this.plugin.settings.webdavUrl = value.trim()
						await this.plugin.saveSettings()
					}),
			)

		// 账号（用户名）
		new Setting(this.containerEl)
			.setName(i18n.t('settings.account.name'))
			.setDesc(i18n.t('settings.account.desc'))
			.addText((text) =>
				text
					.setPlaceholder(i18n.t('settings.account.placeholder'))
					.setValue(this.plugin.settings.account)
					.onChange(async (value) => {
						this.plugin.settings.account = value
						await this.plugin.saveSettings()
					}),
			)

		// 凭证（密码/应用专用密码）
		new Setting(this.containerEl)
			.setName(i18n.t('settings.credential.name'))
			.setDesc(i18n.t('settings.credential.desc'))
			.addText((text) => {
				text
					.setPlaceholder(i18n.t('settings.credential.placeholder'))
					.setValue(this.plugin.settings.credential)
					.onChange(async (value) => {
						this.plugin.settings.credential = value
						await this.plugin.saveSettings()
					})
				text.inputEl.type = 'password'
			})

		// 连接测试
		this.displayCheckConnection()
	}

	async hide() {
		// no-op
	}

	private displayCheckConnection() {
		new Setting(this.containerEl)
			.setName(i18n.t('settings.checkConnection.name'))
			.setDesc(i18n.t('settings.checkConnection.desc'))
			.addButton((button) => {
				button
					.setButtonText(i18n.t('settings.checkConnection.name'))
					.onClick(async (e) => {
						const buttonEl = e.target as HTMLElement
						buttonEl.classList.add('connection-button', 'loading')
						buttonEl.classList.remove('success', 'error')
						buttonEl.textContent = i18n.t('settings.checkConnection.name')
						try {
							const { success, error } =
								await this.plugin.webDAVService.checkWebDAVConnection()
							buttonEl.classList.remove('loading')
							if (success) {
								buttonEl.classList.add('success')
								buttonEl.textContent = i18n.t(
									'settings.checkConnection.successButton',
								)
								new Notice(i18n.t('settings.checkConnection.success'))
							} else if (error && is503Error(error)) {
								buttonEl.classList.add('error')
								buttonEl.textContent = i18n.t('sync.error.requestsTooFrequent')
								new Notice(i18n.t('sync.error.requestsTooFrequent'))
							} else {
								buttonEl.classList.add('error')
								buttonEl.textContent = i18n.t(
									'settings.checkConnection.failureButton',
								)
								new Notice(i18n.t('settings.checkConnection.failure'))
							}
						} catch {
							buttonEl.classList.remove('loading')
							buttonEl.classList.add('error')
							buttonEl.textContent = i18n.t(
								'settings.checkConnection.failureButton',
							)
							new Notice(i18n.t('settings.checkConnection.failure'))
						}
					})
			})
	}
}
