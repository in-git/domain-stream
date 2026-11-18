<template>
	<xn-panel>
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
					<a-button type="primary" @click="formRef.onOpen()" v-if="hasPerm('bizCategoryAdd')">
						<template #icon><plus-outlined /></template>
						新增
					</a-button>
					<a-button @click="importModelRef.onOpen()" v-if="hasPerm('bizCategoryImport')">
                        <template #icon><import-outlined /></template>
                        <span>导入</span>
                    </a-button>
                    <a-button @click="exportData" v-if="hasPerm('bizCategoryExport')">
                        <template #icon><export-outlined /></template>
                        <span>导出</span>
                    </a-button>
					<xn-batch-button
						v-if="hasPerm('bizCategoryBatchDelete')"
						buttonName="批量删除"
						icon="DeleteOutlined"
						buttonDanger
						:id-key="'id'"
						:selectedRowKeys="selectedRowKeys"
						@batchCallBack="deleteBatchBizCategory"
					/>
				</a-space>
			</template>
			<template #bodyCell="{ column, record }">
				<template v-if="column.dataIndex === 'action'">
					<a-space>
						<a @click="detailRef.onOpen(record)" v-if="hasPerm('bizCategoryDetail')">详情</a>
						<a-divider type="vertical" v-if="hasPerm(['bizCategoryDetail', 'bizCategoryEdit'], 'and')" />
						<a @click="formRef.onOpen(record)" v-if="hasPerm('bizCategoryEdit')">编辑</a>
						<a-divider type="vertical" v-if="hasPerm(['bizCategoryEdit', 'bizCategoryDelete'], 'and')" />
						<a-popconfirm title="确定要删除吗？" @confirm="deleteBizCategory(record)">
							<a-button type="link" danger size="small" v-if="hasPerm('bizCategoryDelete')">删除</a-button>
						</a-popconfirm>
					</a-space>
				</template>
			</template>
		</s-table>
	</xn-panel>
	<ImportModel ref="importModelRef" />
	<Form ref="formRef" @successful="tableRef.refresh()" />
	<Detail ref="detailRef" />
</template>

<script setup name="category">
	import { cloneDeep } from 'lodash-es'
	import Form from './form.vue'
	import Detail from './detail.vue'
	import ImportModel from './importModel.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import bizCategoryApi from '@/api/biz/bizCategoryApi'
	const tableRef = ref()
	const importModelRef = ref()
	const formRef = ref()
	const detailRef = ref()
	const toolConfig = { refresh: true, height: true, columnSetting: true, striped: false }
	const columns = [
		{
			title: '父级ID，顶级为0',
			dataIndex: 'parentId'
		},
		{
			title: '分类名称',
			dataIndex: 'name'
		},
		{
			title: '分类编码，业务表CATEGORY字段关联此编码',
			dataIndex: 'code'
		},
		{
			title: '分类图片',
			dataIndex: 'image'
		},
		{
			title: '分类图标',
			dataIndex: 'icon'
		},
		{
			title: '适用模块：ARTICLE文章/VIDEO视频/GRAPHIC图文/IMAGE图片/COMMON通用',
			dataIndex: 'module'
		},
		{
			title: '分类描述',
			dataIndex: 'description'
		},
		{
			title: '状态：ENABLE启用/DISABLE禁用',
			dataIndex: 'status'
		},
		{
			title: '排序',
			dataIndex: 'sortCode'
		},
		{
			title: '备注',
			dataIndex: 'remark'
		},
		{
			title: '扩展信息',
			dataIndex: 'extJson'
		},
	]
	// 操作栏通过权限判断是否显示
	if (hasPerm(['bizCategoryEdit', 'bizCategoryDelete', 'bizCategoryDetail'])) {
		columns.push({
			title: '操作',
			dataIndex: 'action',
			align: 'center',
			fixed: 'right'
		})
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
		return bizCategoryApi.bizCategoryPage(parameter).then((data) => {
			return data
		})
	}
	// 重置
	const reset = () => {
		searchFormRef.value.resetFields()
		tableRef.value.refresh(true)
	}
	// 删除
	const deleteBizCategory = (record) => {
		let params = [
			{
				id: record.id
			}
		]
		bizCategoryApi.bizCategoryDelete(params).then(() => {
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
            bizCategoryApi.bizCategoryExport(params).then((res) => {
                downloadUtil.resultDownload(res)
            })
        } else {
            bizCategoryApi.bizCategoryExport([]).then((res) => {
                downloadUtil.resultDownload(res)
            })
        }
    }
	// 批量删除
	const deleteBatchBizCategory = (params) => {
		bizCategoryApi.bizCategoryDelete(params).then(() => {
			tableRef.value.clearRefreshSelected()
		})
	}
</script>
