import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/site/` + url, ...arg)

/**
 * 网页数据Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/08/08 16:42
 **/
export default {
	// 获取网页数据分页
	bizSitePage(data) {
		return request('page', data, 'get')
	},
	// 提交网页数据表单 edit为true时为编辑，默认为新增
	bizSiteSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 更新网页数据单个字段（是否可见 / 是否推荐）
	bizSiteUpdateField(data) {
		return request('updateField', data, 'post', { skipSuccessMessage: true })
	},
	// 删除网页数据
	bizSiteDelete(data) {
		return request('delete', data)
	},
	// 获取网页数据详情
	bizSiteDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载网页数据导入模板
    bizSiteDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入网页数据
	bizSiteImport(data) {
		return request('importData', data)
	},
	// 导出网页数据
	bizSiteExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
