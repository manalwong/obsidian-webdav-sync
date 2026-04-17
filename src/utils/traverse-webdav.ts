import { Mutex } from 'async-mutex'
import { dirname, normalize } from 'path-browserify'
import { FileStat } from 'webdav'
import { StatModel } from '~/model/stat.model'
import { traverseWebDAVKV } from '~/storage'
import { apiLimiter } from './api-limiter'
import { fileStatToStatModel } from './file-stat-to-stat-model'
import { getDirectoryContents } from '../api/webdav'
import { is503Error } from './is-503-error'
import logger from './logger'
import sleep from './sleep'
import { stdRemotePath } from './std-remote-path'
import { MaybePromise } from './types'

function is404Error(err: Error | string) {
	if (err instanceof Error) {
		return err.message.startsWith('404:')
	}
	return String(err).startsWith('404:')
}

// Use apiLimiter.schedule instead of wrap to avoid type issues with multi-arg functions

// Global mutex map: one lock per kvKey
const traversalLocks = new Map<string, Mutex>()

function getTraversalLock(kvKey: string): Mutex {
	if (!traversalLocks.has(kvKey)) {
		traversalLocks.set(kvKey, new Mutex())
	}
	return traversalLocks.get(kvKey)!
}

async function executeWithRetry<T>(func: () => MaybePromise<T>): Promise<T> {
	while (true) {
		try {
			return await func()
		} catch (err) {
			if (is503Error(err)) {
				await sleep(30_000)
			} else {
				throw err
			}
		}
	}
}

export class ResumableWebDAVTraversal {
	private webdavUrl: string
	private account: string
	private credential: string
	private remoteBaseDir: string
	private kvKey: string
	private saveInterval: number
	private nodes: Record<string, StatModel[]> = {}
	private processedCount: number = 0

	/**
	 * Normalize directory path for use as nodes key
	 */
	private normalizeDirPath(path: string): string {
		return stdRemotePath(path)
	}

	/**
	 * Normalize file/directory path for comparison
	 */
	private normalizeForComparison(path: string): string {
		let normalized = normalize(path)
		if (normalized.endsWith('/') && normalized.length > 1) {
			normalized = normalized.slice(0, -1)
		}
		return normalized
	}

	constructor(options: {
		webdavUrl: string
		account: string
		credential: string
		remoteBaseDir: string
		kvKey: string
		saveInterval?: number
	}) {
		this.webdavUrl = options.webdavUrl
		this.account = options.account
		this.credential = options.credential
		this.remoteBaseDir = options.remoteBaseDir
		this.kvKey = options.kvKey
		this.saveInterval = Math.max(options.saveInterval || 1, 1)
	}

	get lock() {
		return getTraversalLock(this.kvKey)
	}

	async traverse(): Promise<StatModel[]> {
		return await this.lock.runExclusive(async () => {
			await this.loadState()

			// Full BFS traversal using standard PROPFIND
			await this.bfsTraverse()

			await this.saveState()

			return this.getAllFromCache()
		})
	}

	/**
	 * BFS traversal using standard WebDAV PROPFIND
	 */
	private async bfsTraverse(): Promise<StatModel[]> {
		const results: StatModel[] = []
		const queue: string[] = [this.remoteBaseDir]

		while (queue.length > 0) {
			const currentPath = queue.shift()!
			const normalizedPath = this.normalizeDirPath(currentPath)
			const resultItems: StatModel[] = []

			try {
				const contents = await executeWithRetry<FileStat[]>(() =>
					apiLimiter.schedule(() =>
						getDirectoryContents(
							this.webdavUrl,
							this.account,
							this.credential,
							currentPath,
						),
					),
				)

				for (const item of contents) {
					const stat = fileStatToStatModel(item)
					resultItems.push(stat)
				}

				results.push(...resultItems)

				for (const item of resultItems) {
					if (item.isDir) {
						queue.push(item.path)
					}
				}

				this.nodes[normalizedPath] = resultItems
				this.processedCount++

				if (this.processedCount % this.saveInterval === 0) {
					await this.saveState()
				}
			} catch (err) {
				if (is404Error(err)) {
					// Directory does not exist, skip it
					logger.warn(`Directory not found, skipping ${currentPath}:`, err instanceof Error ? err.message : String(err))
					// Do not add any items from this directory, continue with next queue item
					continue
				}
				// For other errors, log and rethrow
				const errMsg = err instanceof Error ? `${err.message}\n${err.stack}` : String(err)
				logger.error(`Error processing ${currentPath}:`, errMsg)
				await this.saveState()
				throw err
			}
		}

		return results
	}

	/**
	 * Get all results from cache
	 */
	private getAllFromCache(): StatModel[] {
		const results: StatModel[] = []
		for (const items of Object.values(this.nodes)) {
			results.push(...items)
		}
		return results
	}

	/**
	 * Load state
	 */
	private async loadState(): Promise<void> {
		const cache = await traverseWebDAVKV.get(this.kvKey)
		if (cache) {
			this.nodes = cache.nodes || {}
		}
	}

	/**
	 * Save current state
	 */
	private async saveState(): Promise<void> {
		await traverseWebDAVKV.set(this.kvKey, {
			rootCursor: '',
			queue: [],
			nodes: this.nodes,
		})
	}

	/**
	 * Clear cache (force re-traversal)
	 */
	async clearCache(): Promise<void> {
		await traverseWebDAVKV.unset(this.kvKey)
		this.nodes = {}
		this.processedCount = 0
	}

	/**
	 * Check if cache is valid
	 */
	async isCacheValid(): Promise<boolean> {
		const cache = await traverseWebDAVKV.get(this.kvKey)
		return !!cache && !!cache.nodes && Object.keys(cache.nodes).length > 0
	}
}
