/**
 * Obsidian WebDAV Sync - WebDAV API Module
 * Copyright (C) 2024-2025 坚果云 (Nutstore)
 * Copyright (C) 2025 Manal Wong
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */

import { XMLParser } from 'fast-xml-parser'
import { isNil, partial } from 'lodash-es'
import { basename, join } from 'path-browserify'
import { FileStat } from 'webdav'
import { is503Error } from '~/utils/is-503-error'
import logger from '~/utils/logger'
import requestUrl from '~/utils/request-url'

interface WebDAVResponse {
	multistatus: {
		response: Array<{
			href: string
			propstat: {
				prop: {
					displayname: string
					resourcetype: { collection?: any }
					getlastmodified?: string
					getcontentlength?: string
					getcontenttype?: string
				}
				status: string
			}
		}>
	}
}

function extractNextLink(linkHeader: string): string | null {
	const matches = linkHeader.match(/<([^>]+)>;\s*rel="next"/)
	return matches ? matches[1] : null
}

function convertToFileStat(
	serverBase: string,
	item: WebDAVResponse['multistatus']['response'][number],
): FileStat {
	// Helper to find the first propstat with 200 OK status
	const getValidPropstat = (): WebDAVResponse['multistatus']['response'][number]['propstat'] | null => {
		const propstats = Array.isArray(item.propstat) ? item.propstat : [item.propstat]
		for (const ps of propstats) {
			if (ps && ps.status && ps.status.includes('200')) {
				return ps
			}
		}
		// If no 200 status, return the first non-undefined propstat
		for (const ps of propstats) {
			if (ps) {
				return ps
			}
		}
		return null
	}

	const propstat = getValidPropstat()
	if (!propstat) {
		logger.warn(`Missing propstat for item ${item.href}`)
		// Return a fallback FileStat with minimal info
		const href = decodeURIComponent(item.href)
		const filename = serverBase === '/' ? href : join('/', href.replace(serverBase, ''))
		return {
			filename,
			basename: basename(filename),
			lastmod: '',
			size: 0,
			type: 'file',
			etag: null,
			mime: undefined,
		}
	}

	const props = propstat.prop
	if (!props) {
		logger.warn(`Missing prop for item ${item.href}`)
		// Return a fallback FileStat with minimal info
		const href = decodeURIComponent(item.href)
		const filename = serverBase === '/' ? href : join('/', href.replace(serverBase, ''))
		return {
			filename,
			basename: basename(filename),
			lastmod: '',
			size: 0,
			type: 'file',
			etag: null,
			mime: undefined,
		}
	}

	// Enhanced directory detection for different WebDAV servers
	// 1. Standard: resourcetype.collection exists
	// 2. Some servers: resourcetype is an empty object for directories
	// 3. Fallback: check if getcontenttype is 'httpd/unix-directory' or similar
	let isDir = false
	
	if (!isNil(props.resourcetype?.collection)) {
		// Standard WebDAV: collection property indicates directory
		isDir = true
	} else if (props.resourcetype && typeof props.resourcetype === 'object') {
		// Check if resourcetype has any keys (some servers use different property names)
		const rtKeys = Object.keys(props.resourcetype)
		if (rtKeys.length > 0) {
			isDir = true
		}
	}
	
	// Additional fallback: check content type for directory indicators
	if (!isDir && props.getcontenttype) {
		const dirContentTypes = [
			'httpd/unix-directory',
			'inode/directory',
			'application/x-directory',
			'text/directory',
		]
		if (dirContentTypes.some(ct => props.getcontenttype?.includes(ct))) {
			isDir = true
		}
	}
	
	// Final fallback: if no content length and no content type, likely a directory
	if (!isDir && !props.getcontentlength && !props.getcontenttype) {
		isDir = true
	}

	const href = decodeURIComponent(item.href)
	const filename =
		serverBase === '/' ? href : join('/', href.replace(serverBase, ''))

	return {
		filename,
		basename: basename(filename),
		lastmod: props.getlastmodified || '',
		size: props.getcontentlength ? parseInt(props.getcontentlength, 10) : 0,
		type: isDir ? 'directory' : 'file',
		etag: null,
		mime: props.getcontenttype,
	}
}

/**
 * 获取 WebDAV 目录内容（通用版本）
 * 使用标准 PROPFIND 方法，兼容所有 WebDAV 服务器
 */
export async function getDirectoryContents(
	webdavUrl: string,
	account: string,
	credential: string,
	path: string,
): Promise<FileStat[]> {
	const contents: FileStat[] = []
	path = path.split('/').map(encodeURIComponent).join('/')
	if (!path.startsWith('/')) {
		path = '/' + path
	}

	// Build the basic auth token
	const token = btoa(`${account}:${credential}`)

	// Determine server base URL for path extraction
	const serverUrl = new URL(webdavUrl)
	const serverBase = decodeURIComponent(serverUrl.pathname.replace(/\/$/, '') || '/')

	let currentUrl = `${webdavUrl.replace(/\/$/, '')}${path}`

	while (true) {
		try {
			const response = await requestUrl({
				url: currentUrl,
				method: 'PROPFIND',
				headers: {
					Authorization: `Basic ${token}`,
					'Content-Type': 'application/xml',
					Depth: '1',
				},
				body: `<?xml version="1.0" encoding="utf-8"?>
        <propfind xmlns="DAV:">
          <prop>
            <displayname/>
            <resourcetype/>
            <getlastmodified/>
            <getcontentlength/>
            <getcontenttype/>
          </prop>
        </propfind>`,
			})
			const parseXml = new XMLParser({
				attributeNamePrefix: '',
				removeNSPrefix: true,
				parseTagValue: false,
				numberParseOptions: {
					eNotation: false,
					hex: true,
					leadingZeros: true,
				},
				processEntities: false,
			})
			const result: WebDAVResponse = parseXml.parse(response.text)
			const items = Array.isArray(result.multistatus.response)
				? result.multistatus.response
				: [result.multistatus.response]

			// Skip the first entry (current directory)
			contents.push(...items.slice(1).map(partial(convertToFileStat, serverBase)))

			const linkHeader = response.headers['link'] || response.headers['Link']
			if (!linkHeader) {
				break
			}

			const nextLink = extractNextLink(linkHeader)
			if (!nextLink) {
				break
			}
			const nextUrl = new URL(nextLink)
			nextUrl.pathname = decodeURI(nextUrl.pathname)
			currentUrl = nextUrl.toString()
		} catch (e) {
			if (is503Error(e as Error)) {
				logger.error('503 error, retrying...')
				await sleep(60_000)
				continue
			}
			throw e
		}
	}

	return contents
}

async function sleep(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms))
}
