import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/category/` + url, ...arg)

/**
 * 通用分类（文章/视频/图文）Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
export default {
	// 获取通用分类（文章/视频/图文）分页
	bizCategoryPage(data) {
		return request('page', data, 'get')
	},
	// 提交通用分类（文章/视频/图文）表单 edit为true时为编辑，默认为新增
	bizCategorySubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除通用分类（文章/视频/图文）
	bizCategoryDelete(data) {
		return request('delete', data)
	},
	// 获取通用分类（文章/视频/图文）详情
	bizCategoryDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载通用分类（文章/视频/图文）导入模板
    bizCategoryDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入通用分类（文章/视频/图文）
	bizCategoryImport(data) {
		return request('importData', data)
	},
	// 导出通用分类（文章/视频/图文）
	bizCategoryExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
