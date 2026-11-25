<template>
	<a-card title="数据导出与导入" :bordered="false">
		<a-space wrap>
			<a-button type="primary" :disabled="!!exporting || importing" @click="openImport">
				<template #icon><import-outlined /></template>
				导入数据
			</a-button>
			<a-button type="primary" :loading="exporting === 'fullDirectory'" :disabled="!!exporting || importing" @click="startExport('fullDirectory')">
				<template #icon><folder-open-outlined /></template>
				导出完整目录
			</a-button>
			<a-button :loading="exporting === 'database'" :disabled="!!exporting || importing" @click="startExport('database')">
				<template #icon><database-outlined /></template>
				导出数据库
			</a-button>
			<a-button :loading="exporting === 'userFiles'" :disabled="!!exporting || importing" @click="startExport('userFiles')">
				<template #icon><cloud-download-outlined /></template>
				导出用户文件
			</a-button>
		</a-space>
		<div class="transfer-hint">导出由浏览器直接下载，导入文件不会写入文件中心</div>

		<a-modal
			v-model:open="importVisible"
			title="数据导入"
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
				<a-form-item label="选择导入文件">
					<a-upload :show-upload-list="false" :before-upload="chooseFile" accept=".zip,.sql">
						<a-button :disabled="importing">
							<template #icon><upload-outlined /></template>
							选择文件
						</a-button>
					</a-upload>
					<div v-if="selectedFile" class="file-name">{{ selectedFile.name }}（{{ formatSize(selectedFile.size) }}）</div>
					<div class="field-hint">仅支持 .sql 数据库备份或 .zip 文件资源包，按 8MB 分片上传</div>
				</a-form-item>

				<a-form-item v-if="isZip" label="导入模式">
					<a-radio-group v-model:value="importMode" :disabled="importing">
						<a-radio value="OVERWRITE">覆盖：导入后删除原有的用户文件</a-radio>
						<a-radio value="APPEND">追加：保留原有文件，仅添加包内文件</a-radio>
					</a-radio-group>
				</a-form-item>

				<a-alert
					v-if="isSql"
					type="warning"
					message="SQL 恢复：完全覆盖"
					description="将按备份脚本重建数据库，现有全部表和数据会被替换，此操作不可撤销。"
					show-icon
					class="mb-3"
				/>

				<div v-if="importing" class="import-progress">
					<div class="progress-text">
						{{ uploadPercent < 100 ? `分片上传中 ${uploadPercent}%` : '文件已上传，导入执行中' }}
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
				<a-button type="primary" :loading="importing" :disabled="!selectedFile || !!importResult" @click="doImport">
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

	const exporting = ref(null)
	const importVisible = ref(false)
	const importing = ref(false)
	const selectedFile = ref(null)
	const importMode = ref('APPEND')
	const uploadPercent = ref(0)
	const importError = ref(null)
	const importResult = ref(null)

	const isZip = computed(() => (selectedFile.value?.name || '').toLowerCase().endsWith('.zip'))
	const isSql = computed(() => (selectedFile.value?.name || '').toLowerCase().endsWith('.sql'))

	const exportTasks = {
		database: {
			run: () => bizDataTransferApi.exportDatabase(),
			label: '数据库备份'
		},
		fullDirectory: {
			run: () => bizDataTransferApi.exportFullDirectory(),
			label: '完整目录包'
		},
		userFiles: {
			run: () => bizDataTransferApi.exportUserFiles(),
			label: '用户文件包'
		}
	}

	const startExport = async (kind) => {
		if (exporting.value || importing.value) return
		exporting.value = kind
		try {
			await exportTasks[kind].run()
			message.success(`${exportTasks[kind].label}已导出，浏览器开始下载`)
		} catch (error) {
			message.error(error?.message || '导出失败')
		} finally {
			exporting.value = null
		}
	}

	const openImport = () => {
		selectedFile.value = null
		importMode.value = 'APPEND'
		uploadPercent.value = 0
		importError.value = null
		importResult.value = null
		importVisible.value = true
	}

	const closeImport = () => {
		if (importing.value) return
		importVisible.value = false
	}

	const chooseFile = (file) => {
		const name = (file.name || '').toLowerCase()
		if (!name.endsWith('.zip') && !name.endsWith('.sql')) {
			message.warning('仅支持 .sql 数据库备份或 .zip 文件资源包')
			return false
		}
		if (!file.size) {
			message.warning('导入文件不能为空')
			return false
		}
		selectedFile.value = file
		importMode.value = 'APPEND'
		uploadPercent.value = 0
		importError.value = null
		importResult.value = null
		return false
	}

	const formatSize = (size) => `${(size / 1024 / 1024).toFixed(2)} MB`

	const delay = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms))

	const doImport = async () => {
		if (!selectedFile.value || importing.value || importResult.value) return
		importing.value = true
		importError.value = null
		importResult.value = null
		uploadPercent.value = 0
		try {
			const ticket = await uploadImportFile(
				selectedFile.value,
				isSql.value ? 'APPEND' : importMode.value,
				(percent) => {
					uploadPercent.value = percent
				}
			)

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
				if (!status.done) continue
				importResult.value = {
					success: status.success,
					message: status.message
				}
				message[status.success ? 'success' : 'error'](status.message)
				return
			}
			throw new Error('导入超时，请稍后查看导入结果')
		} catch (error) {
			importError.value = error?.message || '导入失败'
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
