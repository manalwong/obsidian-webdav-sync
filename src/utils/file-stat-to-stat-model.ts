import { FileStat } from 'webdav'
import { StatModel } from '~/model/stat.model'

export function fileStatToStatModel(from: FileStat): StatModel {
	const isDir = from.type === 'directory'
	return {
		path: from.filename,
		basename: from.basename,
		isDir,
		isDeleted: false,
		mtime: new Date(from.lastmod).valueOf(),
		size: from.size,
	}
}
