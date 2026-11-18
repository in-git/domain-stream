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
					<a-button type="primary" @click="formRef.onOpen()" v-if="hasPerm('bizVideoAdd')">
						<template #icon><plus-outlined /></template>
						新增
					</a-button>
					<a-button @click="importModelRef.onOpen()" v-if="hasPerm('bizVideoImport')">
                        <template #icon><import-outlined /></template>
                        <span>导入</span>
                    </a-button>
                    <a-button @click="exportData" v-if="hasPerm('bizVideoExport')">
                        <template #icon><export-outlined /></template>
                        <span>导出</span>
                    </a-button>
					<xn-batch-button
						v-if="hasPerm('bizVideoBatchDelete')"
						buttonName="批量删除"
						icon="DeleteOutlined"
						buttonDanger
						:id-key="'id'"
						:selectedRowKeys="selectedRowKeys"
						@batchCallBack="deleteBatchBizVideo"
					/>
				</a-space>
			</template>
			<template #bodyCell="{ column, record }">
				<template v-if="column.dataIndex === 'action'">
					<a-space>
						<a @click="detailRef.onOpen(record)" v-if="hasPerm('bizVideoDetail')">详情</a>
						<a-divider type="vertical" v-if="hasPerm(['bizVideoDetail', 'bizVideoEdit'], 'and')" />
						<a @click="formRef.onOpen(record)" v-if="hasPerm('bizVideoEdit')">编辑</a>
						<a-divider type="vertical" v-if="hasPerm(['bizVideoEdit', 'bizVideoDelete'], 'and')" />
						<a-popconfirm title="确定要删除吗？" @confirm="deleteBizVideo(record)">
							<a-button type="link" danger size="small" v-if="hasPerm('bizVideoDelete')">删除</a-button>
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

<script setup name="video">
	import { cloneDeep } from 'lodash-es'
	import Form from './form.vue'
	import Detail from './detail.vue'
	import ImportModel from './importModel.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import bizVideoApi from '@/api/biz/bizVideoApi'
	const tableRef = ref()
	const importModelRef = ref()
	const formRef = ref()
	const detailRef = ref()
	const toolConfig = { refresh: true, height: true, columnSetting: true, striped: false }
	const columns = [
		{
			title: '标题',
			dataIndex: 'title'
		},
		{
			title: '封面图',
			dataIndex: 'cover'
		},
		{
			title: '视频地址',
			dataIndex: 'videoUrl'
		},
		{
			title: '时长',
			dataIndex: 'duration'
		},
		{
			title: '简介',
			dataIndex: 'summary'
		},
		{
			title: '分类编码，关联 BIZ_CATEGORY.CODE',
			dataIndex: 'category'
		},
		{
			title: '标签，多个以逗号分隔',
			dataIndex: 'tags'
		},
		{
			title: '状态：DRAFT草稿/PUBLISHED已发布/OFFLINE已下架',
			dataIndex: 'status'
		},
		{
			title: '发布时间',
			dataIndex: 'publishTime'
		},
		{
			title: '播放量',
			dataIndex: 'viewCount'
		},
		{
			title: '点赞量',
			dataIndex: 'likeCount'
		},
		{
			title: '评论量',
			dataIndex: 'commentCount'
		},
		{
			title: '是否置顶：Y是/N否',
			dataIndex: 'isTop'
		},
		{
			title: '是否推荐：Y是/N否',
			dataIndex: 'isRecommend'
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
	if (hasPerm(['bizVideoEdit', 'bizVideoDelete', 'bizVideoDetail'])) {
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
		return bizVideoApi.bizVideoPage(parameter).then((data) => {
			return data
		})
	}
	// 重置
	const reset = () => {
		searchFormRef.value.resetFields()
		tableRef.value.refresh(true)
	}
	// 删除
	const deleteBizVideo = (record) => {
		let params = [
			{
				id: record.id
			}
		]
		bizVideoApi.bizVideoDelete(params).then(() => {
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
            bizVideoApi.bizVideoExport(params).then((res) => {
                downloadUtil.resultDownload(res)
            })
        } else {
            bizVideoApi.bizVideoExport([]).then((res) => {
                downloadUtil.resultDownload(res)
            })
        }
    }
	// 批量删除
	const deleteBatchBizVideo = (params) => {
		bizVideoApi.bizVideoDelete(params).then(() => {
			tableRef.value.clearRefreshSelected()
		})
	}
</script>
