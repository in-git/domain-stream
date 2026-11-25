import bizDataTransferApi from '@/api/biz/bizDataTransferApi'

/** 与后端 /biz/import/upload/init 的限制保持一致 */
export const IMPORT_CHUNK_SIZE = 8 * 1024 * 1024

function suffixOf(file) {
	const name = (file.name || '').toLowerCase()
	if (name.endsWith('.zip')) return 'zip'
	if (name.endsWith('.sql')) return 'sql'
	throw new Error('仅支持 .sql 数据库备份或 .zip 文件资源包')
}

function chunkSize(totalSize, index) {
	return Math.min(IMPORT_CHUNK_SIZE, totalSize - index * IMPORT_CHUNK_SIZE)
}

/**
 * 分片上传导入文件：分片只进系统临时目录，不写入文件中心。
 * 上传完成后由后端合并并返回导入任务票据。
 */
export async function uploadImportFile(file, mode, onProgress) {
	const suffix = suffixOf(file)
	if (!file.size) throw new Error('导入文件不能为空')

	const totalChunks = Math.ceil(file.size / IMPORT_CHUNK_SIZE)
	const init = await bizDataTransferApi.importInit({
		fileName: file.name,
		fileSize: file.size,
		lastModified: file.lastModified,
		chunkSize: IMPORT_CHUNK_SIZE,
		mode
	})

	const uploaded = new Set(init.uploaded || [])
	let doneBytes = 0
	uploaded.forEach((index) => {
		if (index >= 0 && index < totalChunks) doneBytes += chunkSize(file.size, index)
	})
	onProgress(Math.round((doneBytes / file.size) * 100))

	for (let index = 0; index < totalChunks; index++) {
		if (uploaded.has(index)) continue
		const start = index * IMPORT_CHUNK_SIZE
		const end = Math.min(file.size, start + IMPORT_CHUNK_SIZE)
		await bizDataTransferApi.importChunk(
			init.uploadId,
			index,
			file.slice(start, end),
			(loaded) => onProgress(Math.min(100, Math.round(((doneBytes + loaded) / file.size) * 100)))
		)
		doneBytes = end
		onProgress(Math.round((doneBytes / file.size) * 100))
	}

	return bizDataTransferApi.importComplete(init.uploadId)
}
