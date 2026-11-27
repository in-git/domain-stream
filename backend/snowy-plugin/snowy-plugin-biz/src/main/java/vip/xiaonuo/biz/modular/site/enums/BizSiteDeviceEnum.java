package vip.xiaonuo.biz.modular.site.enums;

import lombok.Getter;

/**
 * 网页终端类型枚举
 * <p>
 * 仅PC / 仅移动端 / 兼容 三个取值, 用于区分网页卡片在不同终端下的展示。
 *
 * @author wuwenlong
 * @date 2026/09/16
 **/
@Getter
public enum BizSiteDeviceEnum {

	/** 仅PC */
	PC("PC", "仅PC"),

	/** 仅移动端 */
	MOBILE("MOBILE", "仅移动端"),

	/** 兼容 */
	COMPATIBLE("COMPATIBLE", "兼容");

	private final String value;
	private final String text;

	BizSiteDeviceEnum(String value, String text) {
		this.value = value;
		this.text = text;
	}
}
