import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/article/` + url, ...arg)

/**
 * 文章Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/11/19 02:04
 **/
export default {
	// 获取文章分页
	bizArticlePage(data) {
		return request('page', data, 'get')
	},
	// 提交文章表单 edit为true时为编辑，默认为新增
	bizArticleSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除文章
	bizArticleDelete(data) {
		return request('delete', data)
	},
	// 获取文章详情
	bizArticleDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载文章导入模板
    bizArticleDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入文章
	bizArticleImport(data) {
		return request('importData', data)
	},
	// 导出文章
	bizArticleExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
