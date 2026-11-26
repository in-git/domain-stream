<template>
	<a-card title="系统数据迁移" :bordered="false">
		<a-space wrap>
			<a-button type="primary" :loading="exporting" :disabled="importing" @click="exportMigration">
				<template #icon><download-outlined /></template>
				导出迁移数据
			</a-button>
			<a-button :disabled="exporting || importing" @click="openImport">
				<template #icon><import-outlined /></template>
				导入迁移数据
			</a-button>
		</a-space>
		<div class="transfer-hint">迁移数据包含数据库 SQL 和完整文件目录包，导入会覆盖目标系统数据</div>

		<a-modal
			v-model:open="importVisible"
			title="导入迁移数据"
			:width="560"
			:footer="null"
			:destroy-on-close="true"
			:keyboard="!importing"
			:mask-closable="!importing"
			:closable="!importing"
			@cancel="closeImport"
		>
			<a-alert v-if="importError" type="error" :message="importError" show-icon class="mb-3" />

			<a-form layout="vertical">
				<a-form-item label="数据库备份（.sql）">
					<a-upload :show-upload-list="false" :before-upload="chooseSql" accept=".sql">
						<a-button :disabled="importing">
							<template #icon><upload-outlined /></template>
							选择 SQL
						</a-button>
					</a-upload>
					<div v-if="sqlFile" class="file-name">{{ sqlFile.name }}（{{ formatSize(sqlFile.size) }}）</div>
					<div class="field-hint">恢复数据库会完全覆盖目标系统现有数据</div>
				</a-form-item>

				<a-form-item label="文件资源包（.zip）">
					<a-upload :show-upload-list="false" :before-upload="chooseZip" accept=".zip">
						<a-button :disabled="importing">
							<template #icon><upload-outlined /></template>
							选择 ZIP
						</a-button>
					</a-upload>
					<div v-if="zipFile" class="file-name">{{ zipFile.name }}（{{ formatSize(zipFile.size) }}）</div>
					<div class="field-hint">文件包按完整目录结构覆盖，按 8MB 分片上传</div>
				</a-form-item>

				<a-alert
					type="warning"
					message="请先导出源系统迁移数据，再导入到目标系统"
					description="建议同时导入数据库 SQL 和文件资源包；导入过程中请勿刷新页面或关闭浏览器。"
					show-icon
					class="mb-3"
				/>

				<div v-if="importing" class="import-progress">
					<div class="progress-text">
						{{ importStage }}：{{ uploadPercent < 100 ? `上传中 ${uploadPercent}%` : '后台导入中' }}
					</div>
					<a-progress :percent="uploadPercent" :show-info="false" />
				</div>

				<a-alert
					v-if="importResult"
					:type="importResult.success ? 'success' : 'error'"
					:message="importResult.success ? '导入完成' : '导入失败'"
					:description="importResult.message"
					show-icon
				/>
			</a-form>

			<a-space class="modal-footer">
				<a-button :disabled="importing" @click="closeImport">关闭</a-button>
				<a-button type="primary" :loading="importing" :disabled="!canImport || !!importResult" @click="doImport">
					开始导入
				</a-button>
			</a-space>
		</a-modal>
	</a-card>
</template>

<script setup name="bizDataTransferCard">
	import { computed, ref } from 'vue'
	import { message } from 'ant-design-vue'
	import bizDataTransferApi from '@/api/biz/bizDataTransferApi'
	import { uploadImportFile } from '@/utils/dataImportUpload'

	const exporting = ref(false)
	const importVisible = ref(false)
	const importing = ref(false)
	const sqlFile = ref(null)
	const zipFile = ref(null)
	const uploadPercent = ref(0)
	const importStage = ref('')
	const importError = ref(null)
	const importResult = ref(null)

	const canImport = computed(() => !!(sqlFile.value || zipFile.value))

	const exportMigration = async () => {
		if (exporting.value || importing.value) return
		exporting.value = true
		try {
			await bizDataTransferApi.exportDatabase()
			message.success('数据库备份已下载，继续导出文件资源包')
			await bizDataTransferApi.exportFullDirectory()
			message.success('迁移数据导出完成')
		} catch (error) {
			message.error(error?.message || '导出迁移数据失败')
		} finally {
			exporting.value = false
		}
	}

	const openImport = () => {
		sqlFile.value = null
		zipFile.value = null
		uploadPercent.value = 0
		importStage.value = ''
		importError.value = null
		importResult.value = null
		importVisible.value = true
	}

	const closeImport = () => {
		if (importing.value) return
		importVisible.value = false
	}

	const chooseSql = (file) => {
		if (!(file.name || '').toLowerCase().endsWith('.sql')) {
			message.warning('数据库备份仅支持 .sql 文件')
			return false
		}
		if (!file.size) {
			message.warning('导入文件不能为空')
			return false
		}
		sqlFile.value = file
		importError.value = null
		importResult.value = null
		return false
	}

	const chooseZip = (file) => {
		if (!(file.name || '').toLowerCase().endsWith('.zip')) {
			message.warning('文件资源包仅支持 .zip 文件')
			return false
		}
		if (!file.size) {
			message.warning('导入文件不能为空')
			return false
		}
		zipFile.value = file
		importError.value = null
		importResult.value = null
		return false
	}

	const formatSize = (size) => `${(size / 1024 / 1024).toFixed(2)} MB`

	const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

	const waitImport = async (ticket) => {
		const deadline = Date.now() + 30 * 60 * 1000
		let failures = 0
		while (Date.now() < deadline) {
			await delay(600)
			let status
			try {
				status = await bizDataTransferApi.importStatus(ticket)
			} catch (error) {
				if (++failures >= 50) throw new Error('无法获取导入进度，任务可能仍在后台执行')
				continue
			}
			failures = 0
			if (status.done) return status
		}
		throw new Error('导入超时，请稍后查看导入结果')
	}

	const importOne = async (file, stage) => {
		importStage.value = stage
		uploadPercent.value = 0
		const ticket = await uploadImportFile(file, 'OVERWRITE', (percent) => {
			uploadPercent.value = percent
		})
		const status = await waitImport(ticket)
		if (!status.success) throw new Error(status.message || `${stage}失败`)
	}

	const doImport = async () => {
		if (!canImport.value || importing.value || importResult.value) return
		importing.value = true
		importError.value = null
		importResult.value = null
		try {
			if (sqlFile.value) await importOne(sqlFile.value, '导入数据库备份')
			if (zipFile.value) await importOne(zipFile.value, '导入文件资源包')
			importResult.value = { success: true, message: '数据库与文件资源导入完成' }
			message.success(importResult.value.message)
		} catch (error) {
			importError.value = error?.message || '导入迁移数据失败'
			message.error(importError.value)
		} finally {
			importing.value = false
		}
	}
</script>

<style scoped lang="less">
	.transfer-hint {
		margin-top: 8px;
		font-size: 12px;
		color: #999;
	}
	.file-name {
		margin-top: 6px;
		font-size: 12px;
	}
	.field-hint {
		margin-top: 4px;
		font-size: 12px;
		color: #999;
	}
	.import-progress {
		margin: 4px 0 12px;
	}
	.progress-text {
		margin-bottom: 4px;
		font-size: 12px;
	}
	.modal-footer {
		display: flex;
		justify-content: flex-end;
		width: 100%;
	}
</style>
