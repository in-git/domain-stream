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
					<a-button type="primary" @click="formRef.onOpen()" v-if="hasPerm('bizMessageAdd')">
						<template #icon><plus-outlined /></template>
						新增
					</a-button>
					<a-button @click="importModelRef.onOpen()" v-if="hasPerm('bizMessageImport')">
                        <template #icon><import-outlined /></template>
                        <span>导入</span>
                    </a-button>
                    <a-button @click="exportData" v-if="hasPerm('bizMessageExport')">
                        <template #icon><export-outlined /></template>
                        <span>导出</span>
                    </a-button>
					<xn-batch-button
						v-if="hasPerm('bizMessageBatchDelete')"
						buttonName="批量删除"
						icon="DeleteOutlined"
						buttonDanger
						:id-key="'id'"
						:selectedRowKeys="selectedRowKeys"
						@batchCallBack="deleteBatchBizMessage"
					/>
				</a-space>
			</template>
			<template #bodyCell="{ column, record }">
				<template v-if="column.dataIndex === 'action'">
					<a-space>
						<a @click="detailRef.onOpen(record)" v-if="hasPerm('bizMessageDetail')">详情</a>
						<a-divider type="vertical" v-if="hasPerm(['bizMessageDetail', 'bizMessageEdit'], 'and')" />
						<a @click="formRef.onOpen(record)" v-if="hasPerm('bizMessageEdit')">编辑</a>
						<a-divider type="vertical" v-if="hasPerm(['bizMessageEdit', 'bizMessageDelete'], 'and')" />
						<a-popconfirm title="确定要删除吗？" @confirm="deleteBizMessage(record)">
							<a-button type="link" danger size="small" v-if="hasPerm('bizMessageDelete')">删除</a-button>
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

<script setup name="message">
	import { cloneDeep } from 'lodash-es'
	import Form from './form.vue'
	import Detail from './detail.vue'
	import ImportModel from './importModel.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import bizMessageApi from '@/api/biz/bizMessageApi'
	const tableRef = ref()
	const importModelRef = ref()
	const formRef = ref()
	const detailRef = ref()
	const toolConfig = { refresh: true, height: true, columnSetting: true, striped: false }
	const columns = [
		{
			title: '用户ID',
			dataIndex: 'userId'
		},
		{
			title: '留言内容',
			dataIndex: 'content'
		},
		{
			title: '状态：PENDING待审核/APPROVED已通过/REJECTED已拒绝',
			dataIndex: 'status'
		},
		{
			title: '管理员回复内容',
			dataIndex: 'reply'
		},
		{
			title: '回复时间',
			dataIndex: 'replyTime'
		},
		{
			title: '回复人',
			dataIndex: 'replyUser'
		},
		{
			title: '留言IP',
			dataIndex: 'ip'
		},
		{
			title: '浏览器UA',
			dataIndex: 'userAgent'
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
	if (hasPerm(['bizMessageEdit', 'bizMessageDelete', 'bizMessageDetail'])) {
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
		return bizMessageApi.bizMessagePage(parameter).then((data) => {
			return data
		})
	}
	// 重置
	const reset = () => {
		searchFormRef.value.resetFields()
		tableRef.value.refresh(true)
	}
	// 删除
	const deleteBizMessage = (record) => {
		let params = [
			{
				id: record.id
			}
		]
		bizMessageApi.bizMessageDelete(params).then(() => {
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
            bizMessageApi.bizMessageExport(params).then((res) => {
                downloadUtil.resultDownload(res)
            })
        } else {
            bizMessageApi.bizMessageExport([]).then((res) => {
                downloadUtil.resultDownload(res)
            })
        }
    }
	// 批量删除
	const deleteBatchBizMessage = (params) => {
		bizMessageApi.bizMessageDelete(params).then(() => {
			tableRef.value.clearRefreshSelected()
		})
	}
</script>
