// Stub for webdav-explorer - Provides a functional directory browser using Obsidian's native UI
// This allows the plugin to work without the actual webdav-explorer package.

import { App, Modal, Setting, normalizePath } from 'obsidian'
import { getDirectoryContents } from '~/api/webdav'
import { FileStat } from 'webdav'
import logger from '~/utils/logger'

interface ExplorerOptions {
	fs: {
		ls: (target: string) => Promise<FileStat[]>
		mkdirs?: (path: string) => Promise<void>
	}
	onClose?: () => void
	onConfirm: (path: string) => void
}

class SimpleWebDAVExplorer extends Modal {
	private currentPath: string = '/'
	private items: FileStat[] = []
	private loading: boolean = false
	private options: ExplorerOptions

	constructor(app: App, options: ExplorerOptions) {
		super(app)
		this.options = options
	}

	async onOpen() {
		const { contentEl } = this
		contentEl.empty()
		contentEl.addClass('webdav-explorer-modal')
		contentEl.style.padding = '20px'
		contentEl.style.minWidth = '400px'
		contentEl.style.maxWidth = '600px'

		// Header
		const header = contentEl.createEl('h3', { text: '选择远程目录' })
		header.style.marginTop = '0'

		// Current path display
		const pathContainer = contentEl.createDiv()
		pathContainer.style.marginBottom = '15px'
		pathContainer.style.padding = '10px'
		pathContainer.style.backgroundColor = 'var(--background-secondary)'
		pathContainer.style.borderRadius = '5px'
		pathContainer.style.wordBreak = 'break-all'

		const pathLabel = pathContainer.createEl('div', { text: '当前路径:' })
		pathLabel.style.fontSize = '12px'
		pathLabel.style.color = 'var(--text-muted)'
		pathLabel.style.marginBottom = '5px'

		this.pathDisplay = pathContainer.createEl('div', { text: this.currentPath })
		this.pathDisplay.style.fontFamily = 'monospace'
		this.pathDisplay.style.fontSize = '14px'

		// Item list
		this.listContainer = contentEl.createDiv()
		this.listContainer.style.maxHeight = '300px'
		this.listContainer.style.overflowY = 'auto'
		this.listContainer.style.border = '1px solid var(--background-modifier-border)'
		this.listContainer.style.borderRadius = '5px'

		// Buttons
		const buttonContainer = contentEl.createDiv()
		buttonContainer.style.marginTop = '20px'
		buttonContainer.style.display = 'flex'
		buttonContainer.style.justifyContent = 'flex-end'
		buttonContainer.style.gap = '10px'

		const cancelBtn = buttonContainer.createEl('button', { text: '取消' })
		cancelBtn.addEventListener('click', () => {
			this.close()
			this.options.onClose?.()
		})

		const confirmBtn = buttonContainer.createEl('button', { text: '确认选择此目录' })
		confirmBtn.style.backgroundColor = 'var(--interactive-accent)'
		confirmBtn.style.color = 'var(--text-on-accent)'
		confirmBtn.addEventListener('click', () => {
			this.options.onConfirm(this.currentPath)
			this.close()
		})

		// Load initial directory
		await this.loadDirectory('/')
	}

	private pathDisplay!: HTMLElement
	private listContainer!: HTMLElement

	private async loadDirectory(path: string) {
		this.loading = true
		this.listContainer.empty()
		this.listContainer.createEl('div', { text: '加载中...', cls: 'setting-item-description' })
			.style.padding = '20px'

		try {
			this.items = await this.options.fs.ls(path)
			this.currentPath = path
			this.pathDisplay.textContent = path || '/'
			this.renderList()
		} catch (error) {
			logger.error('Failed to load directory:', error)
			this.listContainer.empty()
			const errorDiv = this.listContainer.createDiv()
			errorDiv.style.padding = '20px'
			errorDiv.style.color = 'var(--text-error)'
			errorDiv.textContent = `加载失败: ${error instanceof Error ? error.message : String(error)}`
		} finally {
			this.loading = false
		}
	}

	private renderList() {
		this.listContainer.empty()

		// Parent directory link (if not root)
		if (this.currentPath !== '/' && this.currentPath !== '') {
			const parentItem = this.listContainer.createDiv()
			parentItem.style.padding = '10px 15px'
			parentItem.style.cursor = 'pointer'
			parentItem.style.display = 'flex'
			parentItem.style.alignItems = 'center'
			parentItem.style.gap = '10px'
			parentItem.addEventListener('mouseenter', () => {
				parentItem.style.backgroundColor = 'var(--background-modifier-hover)'
			})
			parentItem.addEventListener('mouseleave', () => {
				parentItem.style.backgroundColor = ''
			})
			parentItem.addEventListener('click', () => {
				const parentPath = this.currentPath.split('/').slice(0, -1).join('/') || '/'
				this.loadDirectory(parentPath)
			})

			const icon = parentItem.createSpan()
			icon.textContent = '📁'
			const text = parentItem.createSpan()
			text.textContent = '.. (上级目录)'
			text.style.fontWeight = 'bold'
		}

		// Sort: directories first, then files
		const sortedItems = [...this.items].sort((a, b) => {
			if (a.type === b.type) return a.basename.localeCompare(b.basename)
			return a.type === 'directory' ? -1 : 1
		})

		if (sortedItems.length === 0) {
			const emptyMsg = this.listContainer.createEl('div', { text: '空目录' })
			emptyMsg.style.padding = '20px'
			emptyMsg.style.color = 'var(--text-muted)'
			emptyMsg.style.textAlign = 'center'
			return
		}

		for (const item of sortedItems) {
			const itemEl = this.listContainer.createDiv()
			itemEl.style.padding = '10px 15px'
			itemEl.style.cursor = 'pointer'
			itemEl.style.display = 'flex'
			itemEl.style.alignItems = 'center'
			itemEl.style.gap = '10px'
			itemEl.addEventListener('mouseenter', () => {
				itemEl.style.backgroundColor = 'var(--background-modifier-hover)'
			})
			itemEl.addEventListener('mouseleave', () => {
				itemEl.style.backgroundColor = ''
			})

			const icon = itemEl.createSpan()
			icon.textContent = item.type === 'directory' ? '📁' : '📄'

			const text = itemEl.createSpan()
			text.textContent = item.basename

			if (item.type === 'directory') {
				itemEl.addEventListener('click', () => {
					const newPath = normalizePath(`${this.currentPath}/${item.basename}`)
					this.loadDirectory(newPath)
				})
			} else {
				// Files are not selectable in this context
				itemEl.style.opacity = '0.5'
				itemEl.style.cursor = 'not-allowed'
			}
		}
	}

	onClose() {
		const { contentEl } = this
		contentEl.empty()
	}
}

export function mount(el: HTMLElement, options: ExplorerOptions): void {
	// Use Obsidian's Modal instead of the original webdav-explorer component
	const app = (window as any).app as App
	const modal = new SimpleWebDAVExplorer(app, options)
	modal.open()
}
