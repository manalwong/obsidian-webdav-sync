import { Platform, requireApiVersion } from 'obsidian'

export const PLUGIN_VERSION = process.env.PLUGIN_VERSION!

export const API_VER_STAT_FOLDER = '0.13.27'
export const API_VER_REQURL = '0.13.26'
export const API_VER_REQURL_ANDROID = '0.14.6'
export const API_VER_ENSURE_REQURL_OK = '1.0.0'

export const VALID_REQURL =
	(!Platform.isAndroidApp && requireApiVersion(API_VER_REQURL)) ||
	(Platform.isAndroidApp && requireApiVersion(API_VER_REQURL_ANDROID))

export const IN_DEV = process.env.NODE_ENV === 'development'
