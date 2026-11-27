import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/siteCategory/` + url, ...arg)

/**
 * 网页分类中间表Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/08/08 16:44
 **/
export default {
	// 获取网页分类中间表分页
	bizSiteCategoryPage(data) {
		return request('page', data, 'get')
	},
	// 提交网页分类中间表表单 edit为true时为编辑，默认为新增
	bizSiteCategorySubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除网页分类中间表
	bizSiteCategoryDelete(data) {
		return request('delete', data)
	},
	// 获取网页分类中间表详情
	bizSiteCategoryDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载网页分类中间表导入模板
    bizSiteCategoryDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入网页分类中间表
	bizSiteCategoryImport(data) {
		return request('importData', data)
	},
	// 导出网页分类中间表
	bizSiteCategoryExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
