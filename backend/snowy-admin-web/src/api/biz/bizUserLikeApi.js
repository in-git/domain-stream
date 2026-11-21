import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/biz/userlike/` + url, ...arg)

/**
 * 用户喜欢/点赞记录Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/11/21 19:55
 **/
export default {
	// 获取用户喜欢/点赞记录分页
	bizUserLikePage(data) {
		return request('page', data, 'get')
	},
	// 提交用户喜欢/点赞记录表单 edit为true时为编辑，默认为新增
	bizUserLikeSubmitForm(data, edit = false) {
		return request(edit ? 'edit' : 'add', data)
	},
	// 删除用户喜欢/点赞记录
	bizUserLikeDelete(data) {
		return request('delete', data)
	},
	// 获取用户喜欢/点赞记录详情
	bizUserLikeDetail(data) {
		return request('detail', data, 'get')
	},
	// 下载用户喜欢/点赞记录导入模板
    bizUserLikeDownloadTemplate(data) {
		return request('downloadImportTemplate', data, 'get', {
			responseType: 'blob'
		})
    },
	// 导入用户喜欢/点赞记录
	bizUserLikeImport(data) {
		return request('importData', data)
	},
	// 导出用户喜欢/点赞记录
	bizUserLikeExport(data) {
		return request('exportData', data, 'post', {
			responseType: 'blob'
		})
	},
}
