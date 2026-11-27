<template>
	<xn-panel>
		<a-form ref="searchFormRef" :model="searchFormState">
			<a-row :gutter="10">
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="壁纸标题" name="title">
						<a-input v-model:value="searchFormState.title" placeholder="请输入壁纸标题" />
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="标签" name="tag">
						<a-input v-model:value="searchFormState.tag" placeholder="请输入标签" />
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="分类" name="categoryTag">
						<a-select
							v-model:value="searchFormState.categoryTag"
							placeholder="请选择分类"
							allow-clear
							@change="tableRef.refresh(true)"
						>
							<a-select-option v-for="cat in categoryOptions" :key="cat.value" :value="cat.value">
								{{ cat.label }}
							</a-select-option>
						</a-select>
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
				    <a-form-item>
				        <a-space>
				            <a-button type="primary" @click="tableRef.refresh(true)">
				                <template #icon><SearchOutlined /></template>
				                查询
				            </a-button>
				            <a-button @click="reset">
				                <template #icon><redo-outlined /></template>
				                 重置
				            </a-button>
                        </a-space>
                    </a-form-item>
                </a-col>
            </a-row>
		</a-form>
		<s-table
			ref="tableRef"
			:columns="columns"
			:data="loadData"
			:alert="options.alert.show"
			bordered
			:row-key="(record) => record.id"
			:tool-config="toolConfig"
			:row-selection="options.rowSelection"
			:scroll="{ x: 'max-content' }"
		>
			<template #operator>
				<a-space>
					<a-button type="primary" @click="uploadModalRef.onOpen()">
						<template #icon><upload-outlined /></template>
						上传壁纸
					</a-button>
					<a-button type="primary" @click="formRef.onOpen()" v-if="hasPerm('bizWallpaperAdd')">
						<template #icon><plus-outlined /></template>
						新增
					</a-button>
					<a-button @click="importModelRef.onOpen()" v-if="hasPerm('bizWallpaperImport')">
                        <template #icon><import-outlined /></template>
                        <span>导入</span>
                    </a-button>
                    <a-button @click="exportData" v-if="hasPerm('bizWallpaperExport')">
                        <template #icon><export-outlined /></template>
                        <span>导出</span>
                    </a-button>
					<xn-batch-button
						v-if="hasPerm('bizWallpaperBatchDelete')"
						buttonName="批量删除"
						icon="DeleteOutlined"
						buttonDanger
						:id-key="'id'"
						:selectedRowKeys="selectedRowKeys"
						@batchCallBack="deleteBatchBizWallpaper"
					/>
				</a-space>
			</template>
			<template #bodyCell="{ column, record }">
			<template v-if="column.dataIndex === 'imageUrl'">
				<img v-if="record.thumbnailUrl" :src="record.thumbnailUrl" style="height: 80px; object-fit: cover; border-radius: 4px" @click="detailRef.onOpen(record)" />
				<img v-else-if="record.imageUrl" :src="record.imageUrl" style="height: 80px; object-fit: cover; border-radius: 4px" @click="detailRef.onOpen(record)" />
				<span v-else>-</span>
			</template>
				<template v-if="column.dataIndex === 'action'">
					<a-space>
						<a @click="detailRef.onOpen(record)" v-if="hasPerm('bizWallpaperDetail')">详情</a>
						<a-divider type="vertical" v-if="hasPerm(['bizWallpaperDetail', 'bizWallpaperEdit'], 'and')" />
						<a @click="formRef.onOpen(record)" v-if="hasPerm('bizWallpaperEdit')">编辑</a>
						<a-divider type="vertical" v-if="hasPerm(['bizWallpaperEdit', 'bizWallpaperDelete'], 'and')" />
						<a-popconfirm title="确定要删除吗？" @confirm="deleteBizWallpaper(record)">
							<a-button type="link" danger size="small" v-if="hasPerm('bizWallpaperDelete')">删除</a-button>
						</a-popconfirm>
					</a-space>
				</template>
			</template>
		</s-table>
	</xn-panel>
	<ImportModel ref="importModelRef" />
	<Form ref="formRef" @successful="tableRef.refresh()" />
	<Detail ref="detailRef" />
	<UploadModal ref="uploadModalRef" @successful="uploadSuccessful" />
</template>

<script setup name="wallpaper">
	import { cloneDeep } from 'lodash-es'
	import Form from './form.vue'
	import Detail from './detail.vue'
	import ImportModel from './importModel.vue'
	import UploadModal from './uploadModal.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import bizWallpaperApi from '@/api/biz/bizWallpaperApi'
	// 壁纸分类(从业务字典动态加载, 不写死)
	const categoryOptions = ref([])
	const loadCategoryOptions = () => {
		bizWallpaperApi.bizWallpaperCategoryList().then((data) => {
			categoryOptions.value = data || []
		})
	}
	loadCategoryOptions()
	const searchFormState = ref({})
	const searchFormRef = ref()
	const tableRef = ref()
	const importModelRef = ref()
	const formRef = ref()
	const detailRef = ref()
	const uploadModalRef = ref()
	const toolConfig = { refresh: true, height: true, columnSetting: true, striped: false }
	const columns = [
		{
			title: '壁纸标题',
			dataIndex: 'title'
		},
		{
			title: '分辨率',
			dataIndex: 'resolution'
		},
		{
			title: '宽高比',
			dataIndex: 'aspectRatio'
		},
		{
			title: '壁纸图片',
			dataIndex: 'imageUrl',
			width: 120
		},
		{
			title: '标签',
			dataIndex: 'tag'
		},
		{
			title: '文件大小',
			dataIndex: 'fileSize'
		},
		{
			title: '配色数组',
			dataIndex: 'colorPalette'
		},
		{
			title: '适配设备数组(JSON)',
			dataIndex: 'deviceCompat'
		},
		{
			title: '分类标签',
			dataIndex: 'categoryTag'
		},
		{
			title: '下载次数',
			dataIndex: 'downloadsCount'
		},
		{
			title: '点赞次数',
			dataIndex: 'likesCount'
		},
	]
	// 操作栏通过权限判断是否显示
	if (hasPerm(['bizWallpaperEdit', 'bizWallpaperDelete', 'bizWallpaperDetail'])) {
		columns.push({
			title: '操作',
			dataIndex: 'action',
			align: 'center',
			fixed: 'right'
		})
	}
	// 壁纸上传成功回调, 刷新列表
	const uploadSuccessful = () => {
		tableRef.value.refresh(true)
	}
	const selectedRowKeys = ref([])
	// 列表选择配置
	const options = {
		alert: {
			show: true,
			clear: () => {
				selectedRowKeys.value = ref([])
			}
		},
		rowSelection: {
			onChange: (selectedRowKey, selectedRows) => {
				selectedRowKeys.value = selectedRowKey
			}
		}
	}
	const loadData = (parameter) => {
		const searchFormParam = cloneDeep(searchFormState.value)
		return bizWallpaperApi.bizWallpaperPage(Object.assign(parameter, searchFormParam)).then((data) => {
			return data
		})
	}
	// 重置
	const reset = () => {
		searchFormRef.value.resetFields()
		tableRef.value.refresh(true)
	}
	// 删除
	const deleteBizWallpaper = (record) => {
		let params = [
			{
				id: record.id
			}
		]
		bizWallpaperApi.bizWallpaperDelete(params).then(() => {
			tableRef.value.refresh(true)
		})
	}
	// 导出
    const exportData = () => {
        if (selectedRowKeys.value.length > 0) {
            const params = selectedRowKeys.value.map((m) => {
                return {
                    id: m
                }
            })
            bizWallpaperApi.bizWallpaperExport(params).then((res) => {
                downloadUtil.resultDownload(res)
            })
        } else {
            bizWallpaperApi.bizWallpaperExport([]).then((res) => {
                downloadUtil.resultDownload(res)
            })
        }
    }
	// 批量删除
	const deleteBatchBizWallpaper = (params) => {
		bizWallpaperApi.bizWallpaperDelete(params).then(() => {
			tableRef.value.clearRefreshSelected()
		})
	}
</script>
