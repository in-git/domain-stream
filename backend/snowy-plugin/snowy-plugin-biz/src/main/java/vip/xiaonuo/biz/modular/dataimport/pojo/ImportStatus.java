package vip.xiaonuo.biz.modular.dataimport.pojo;

/**
 * 数据导入任务状态。
 *
 * @author domain-stream
 * @date 2026/11/24
 */
public record ImportStatus(boolean done, boolean success, String message, int count) {

    public static ImportStatus running() {
        return new ImportStatus(false, false, "", 0);
    }

    public static ImportStatus success(String message, int count) {
        return new ImportStatus(true, true, message, count);
    }

    public static ImportStatus failure(String message) {
        return new ImportStatus(true, false, message, 0);
    }
}
