import { createClient, WebDAVClient } from 'webdav'
import GenericWebDAVPlugin from '../index'
import { createRateLimitedWebDAVClient } from '../utils/rate-limited-client'

export class WebDAVService {
	constructor(private plugin: GenericWebDAVPlugin) {}

	async createWebDAVClient(): Promise<WebDAVClient> {
		const client = createClient(this.plugin.settings.webdavUrl, {
			username: this.plugin.settings.account,
			password: this.plugin.settings.credential,
		})
		return createRateLimitedWebDAVClient(client)
	}

	async checkWebDAVConnection(): Promise<{ error?: Error; success: boolean }> {
		try {
			const client = await this.createWebDAVClient()
			return { success: await client.exists('/') }
		} catch (error) {
			return {
				error: error as Error,
				success: false,
			}
		}
	}
}
