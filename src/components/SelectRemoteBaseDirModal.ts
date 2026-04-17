import { App, Modal } from 'obsidian'
import GenericWebDAVPlugin from '..'

import { mount as mountWebDAVExplorer } from 'webdav-explorer'
import { getDirectoryContents } from '~/api/webdav'
import { fileStatToStatModel } from '~/utils/file-stat-to-stat-model'
import { mkdirsWebDAV } from '~/utils/mkdirs-webdav'
import { stdRemotePath } from '~/utils/std-remote-path'

export default class SelectRemoteBaseDirModal extends Modal {
	constructor(
		app: App,
		private plugin: GenericWebDAVPlugin,
		private onConfirm: (path: string) => void,
	) {
		super(app)
	}

	async onOpen() {
		const { contentEl } = this

		const explorer = document.createElement('div')
		contentEl.appendChild(explorer)

		const webdav = await this.plugin.webDAVService.createWebDAVClient()

		mountWebDAVExplorer(explorer, {
			fs: {
				ls: async (target) => {
					const items = await getDirectoryContents(
						this.plugin.settings.webdavUrl,
						this.plugin.settings.account,
						this.plugin.settings.credential,
						target,
					)
					return items.map(fileStatToStatModel) as any
				},
				mkdirs: async (path) => {
					await mkdirsWebDAV(webdav, path)
				},
			},
			onClose: () => {
				explorer.remove()
				this.close()
			},
			onConfirm: async (path) => {
				await Promise.resolve(this.onConfirm(stdRemotePath(path)))
				explorer.remove()
				this.close()
			},
		})
	}

	onClose() {
		const { contentEl } = this
		contentEl.empty()
	}
}