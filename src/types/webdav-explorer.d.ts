declare module 'webdav-explorer' {
	interface StatItem {
		filename: string
		basename: string
		type: string
		[key: string]: unknown
	}

	export function mount(el: HTMLElement, options: {
		fs: {
			ls: (path: string) => Promise<StatItem[]>
			mkdirs: (path: string) => Promise<void>
		}
		onClose: () => void
		onConfirm: (path: string) => Promise<void>
	}): void
}

