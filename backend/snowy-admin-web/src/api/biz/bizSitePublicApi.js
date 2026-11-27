import { baseRequest } from '@/utils/request'

const request = (url, ...arg) => baseRequest(`/public/site/` + url, ...arg)

/**
 * 网页数据(公开/免登录) Api接口管理器
 *
 * @author wuwenlong
 * @date  2026/08/08
 **/
export default {
	// 获取分类树(公开)
	bizSiteCategoryTree(data) {
		return request('categoryTree', data, 'get')
	},
	// 获取某身份下的分类树(公开)
	bizSiteCategoryTreeByIdentity(data) {
		return request('identityCategoryTree', data, 'get')
	},
	// 获取身份列表(公开)
	bizSiteIdentityList(data) {
		return request('identityList', data, 'get')
	},
	// 获取网页分页(公开)
	bizSitePublicPage(data) {
		return request('page', data, 'get')
	},
	// 获取网页详情(公开)
	bizSitePublicDetail(data) {
		return request('detail', data, 'get')
	},
	// 首页聚合查询(公开): 最新发布 / 最高访问 / 全部推荐
	// recommend 为三态: true 只看推荐, false 只看非推荐, 不传不过滤(仅对 bizSitePublicPage 生效)
	bizSiteHomeAggregate(data) {
		return request('homeAggregate', data, 'get')
	},
	// 网页点击量+1(公开)
	bizSitePublicClick(data) {
		return request('click', data, 'post')
	},
	// 一键获取卡片信息(公开)
	// 后端为 @PostMapping + @RequestParam link, 因此 link 必须放在 query 上
	bizSitePublicFetch(data) {
		return request(`fetch?link=${encodeURIComponent(data?.link || '')}`, {}, 'post')
	}
}
