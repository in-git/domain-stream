<template>
	<xn-panel>
		<a-form ref="searchFormRef" :model="searchFormState">
			<a-row :gutter="10">
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="网页名称" name="name">
						<a-input v-model:value="searchFormState.name" placeholder="请输入网页名称" @pressEnter="handleSearch" />
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="描述" name="des">
						<a-input v-model:value="searchFormState.des" placeholder="请输入描述" @pressEnter="handleSearch" />
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="链接" name="link">
						<a-input v-model:value="searchFormState.link" placeholder="请输入链接" @pressEnter="handleSearch" />
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6">
					<a-form-item label="分类" name="categoryIds">
						<site-category-select
							v-model:value="searchFormState.categoryIds"
							placeholder="请选择分类筛选"
							style="width: 100%"
							@change="handleSearch"
						/>
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6" v-show="advanced">
					<a-form-item label="是否可见(Y|N)" name="visible">
						<a-input v-model:value="searchFormState.visible" placeholder="请输入是否可见(Y|N)" @pressEnter="handleSearch" />
					</a-form-item>
				</a-col>
				<a-col :xs="24" :sm="6" :md="6" :lg="6" :xl="6" v-show="advanced">
					<a-form-item label="是否推荐(Y|N)" name="isRecommend">
						<a-radio-group v-model:value="searchFormState.isRecommend">
							<a-radio value="Y">是</a-radio>
							<a-radio value="N">否</a-radio>
						</a-radio-group>
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
                            <a @click="toggleAdvanced">
                                {{ advanced ? '收起' : '展开' }}
                                <component :is="advanced ? 'up-outlined' : 'down-outlined'"/>
                            </a>
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
					<a-button type="primary" @click="formRef.onOpen()" v-if="hasPerm('bizSiteAdd')">
						<template #icon><plus-outlined /></template>
						新增
					</a-button>
					<a-button @click="importModelRef.onOpen()" v-if="hasPerm('bizSiteImport')">
                        <template #icon><import-outlined /></template>
                        <span>导入</span>
                    </a-button>
                    <a-button @click="exportData" v-if="hasPerm('bizSiteExport')">
                        <template #icon><export-outlined /></template>
                        <span>导出</span>
                    </a-button>
					<xn-batch-button
						v-if="hasPerm('bizSiteBatchDelete')"
						buttonName="批量删除"
						icon="DeleteOutlined"
						buttonDanger
						:id-key="'id'"
						:selectedRowKeys="selectedRowKeys"
						@batchCallBack="deleteBatchBizSite"
					/>
				</a-space>
			</template>
			<template #bodyCell="{ column, record }">
				<template v-if="column.dataIndex === 'logo'">
					<img
						v-if="record.logo"
						:src="record.logo"
						alt="logo"
						style="height: 60px; background-color: #000; object-fit: contain"
					/>
					<span v-else>-</span>
				</template>
				<template v-else-if="column.dataIndex === 'cover'">
					<img
						v-if="record.cover"
						:src="record.cover"
						alt="cover"
						style="height: 60px; object-fit: cover"
					/>
					<span v-else>-</span>
				</template>
				<template v-else-if="column.dataIndex === 'des'">
					<a-tooltip v-if="record.des" :title="record.des">
						<span class="site-des-ellipsis">{{ record.des }}</span>
					</a-tooltip>
					<span v-else>-</span>
				</template>
				<template v-else-if="column.dataIndex === 'visible'">
					<a-switch
						:checked="record.visible === 'Y'"
						:loading="switchLoading[`${record.id}-visible`]"
						checked-children="是"
						un-checked-children="否"
						:disabled="!hasPerm('bizSiteEdit')"
						@change="(checked) => updateFlag(record, 'visible', checked)"
					/>
				</template>
				<template v-else-if="column.dataIndex === 'isRecommend'">
					<a-switch
						:checked="record.isRecommend === 'Y'"
						:loading="switchLoading[`${record.id}-isRecommend`]"
						checked-children="是"
						un-checked-children="否"
						:disabled="!hasPerm('bizSiteEdit')"
						@change="(checked) => updateFlag(record, 'isRecommend', checked)"
					/>
				</template>
				<template v-else-if="column.dataIndex === 'device'">
					{{ DEVICE_LABEL[record.device] || record.device || '-' }}
				</template>
				<template v-else-if="column.dataIndex === 'action'">
					<a-space>
						<a @click="detailRef.onOpen(record)" v-if="hasPerm('bizSiteDetail')">详情</a>
						<a-divider type="vertical" v-if="hasPerm(['bizSiteDetail', 'bizSiteEdit'], 'and')" />
						<a @click="formRef.onOpen(record)" v-if="hasPerm('bizSiteEdit')">编辑</a>
						<a-divider type="vertical" v-if="hasPerm(['bizSiteEdit', 'bizSiteDelete'], 'and')" />
						<a-popconfirm title="确定要删除吗？" @confirm="deleteBizSite(record)">
							<a-button type="link" danger size="small" v-if="hasPerm('bizSiteDelete')">删除</a-button>
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

<script setup name="site">
	import { cloneDeep } from 'lodash-es'
	import Form from './form.vue'
	import Detail from './detail.vue'
	import ImportModel from './importModel.vue'
	import downloadUtil from '@/utils/downloadUtil'
	import bizSiteApi from '@/api/biz/bizSiteApi'
	import SiteCategorySelect from './components/SiteCategorySelect.vue'
	const DEVICE_LABEL = {
		PC: '仅PC',
		MOBILE: '仅移动端',
		COMPATIBLE: '兼容'
	}
	const searchFormState = ref({
		categoryIds: []
	})
	const searchFormRef = ref()
	const tableRef = ref()
	const importModelRef = ref()
	const formRef = ref()
	const detailRef = ref()
	const toolConfig = { refresh: true, height: true, columnSetting: true, striped: false }
	// 查询区域显示更多控制
	const advanced = ref(false)
	const toggleAdvanced = () => {
		advanced.value = !advanced.value
	}
	const columns = [
		{
			title: '网页名称',
			dataIndex: 'name'
		},
		{
			title: 'LOGO',
			dataIndex: 'logo'
		},
		{
			title: '描述',
			dataIndex: 'des',
			width: 120
		},
		{
			title: '链接',
			dataIndex: 'link'
		},
		{
			title: '点击量',
			dataIndex: 'count'
		},
		{
			title: '是否可见',
			dataIndex: 'visible',
			width: 90,
			align: 'center'
		},
		{
			title: '背景颜色',
			dataIndex: 'background'
		},
		{
			title: '是否推荐',
			dataIndex: 'isRecommend',
			width: 90,
			align: 'center'
		},
		{
			title: '封面',
			dataIndex: 'cover'
		},
		{
			title: '排序号',
			dataIndex: 'orderNum'
		},
		{
			title: '终端类型',
			dataIndex: 'device'
		},
	{
		title: '信号值',
		dataIndex: 'signal'
	},
	{
		title: '创建时间',
		dataIndex: 'createTime',
		// 显示表头排序按钮；首次点击降序(最新在前)，再次点击升序
		sorter: true,
		sortDirections: ['descend', 'ascend']
	}
]
	// 操作栏通过权限判断是否显示
	if (hasPerm(['bizSiteEdit', 'bizSiteDelete', 'bizSiteDetail'])) {
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
		const searchFormParam = cloneDeep(searchFormState.value)
		return bizSiteApi.bizSitePage(Object.assign(parameter, searchFormParam)).then((data) => {
			return data
		})
	}
	// 搜索（与"查询"按钮一致，供搜索框回车触发）
	const handleSearch = () => {
		tableRef.value.refresh(true)
	}
	// 重置
	const reset = () => {
		searchFormRef.value.resetFields()
		searchFormState.value.categoryIds = []
		tableRef.value.refresh(true)
	}
	// 删除
	const deleteBizSite = (record) => {
		let params = [
			{
				id: record.id
			}
		]
		bizSiteApi.bizSiteDelete(params).then(() => {
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
            bizSiteApi.bizSiteExport(params).then((res) => {
                downloadUtil.resultDownload(res)
            })
        } else {
            bizSiteApi.bizSiteExport([]).then((res) => {
                downloadUtil.resultDownload(res)
            })
        }
    }
	// 开关加载态：key 为 `${id}-${field}`
	const switchLoading = ref({})
	// 切换是否可见 / 是否推荐（走单字段更新接口，避免使用 edit 影响图片与分类关联）
	const updateFlag = (record, field, checked) => {
		const value = checked ? 'Y' : 'N'
		const key = `${record.id}-${field}`
		switchLoading.value[key] = true
		bizSiteApi
			.bizSiteUpdateField({ id: record.id, field, value })
			.then(() => {
				record[field] = value
			})
			.catch(() => {
				record[field] = value === 'Y' ? 'N' : 'Y'
			})
			.finally(() => {
				switchLoading.value[key] = false
			})
	}
	// 批量删除
	const deleteBatchBizSite = (params) => {
		bizSiteApi.bizSiteDelete(params).then(() => {
			tableRef.value.clearRefreshSelected()
		})
	}
</script>

<style scoped>
	.site-des-ellipsis {
		display: inline-block;
		max-width: 100px;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
		vertical-align: bottom;
	}
</style>
