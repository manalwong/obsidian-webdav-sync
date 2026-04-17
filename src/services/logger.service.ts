import { moment } from 'obsidian'
import { IN_DEV } from '~/consts'
import logger from '~/utils/logger'
import GenericWebDAVPlugin from '..'

export default class LoggerService {
	logs: any[] = []

	constructor(private plugin: GenericWebDAVPlugin) {
		if (IN_DEV) {
			logger.addReporter({
				log: (logObj) => {
					const log = [
						moment(logObj.date).format('YYYY-MM-DD HH:mm:ss'),
						logObj.type,
						logObj.args,
					]
					this.logs.push(log)
				},
			})
		} else {
			logger.setReporters([
				{
					log: (logObj) => {
						this.logs.push(logObj)
					},
				},
			])
		}
	}

	clear() {
		this.logs = []
	}
}
