/*
 * Copyright [2022] [https://www.xiaonuo.vip]
 *
 * Snowy采用APACHE LICENSE 2.0开源协议，您在使用过程中，需要注意以下几点：
 *
 * 1.请不要删除和修改根目录下的LICENSE文件。
 * 2.请不要删除和修改Snowy源码头部的版权声明。
 * 3.本项目代码可免费商业使用，商业使用请保留源码和相关描述文件的项目出处，作者声明等。
 * 4.分发源码时候，请注明软件出处 https://www.xiaonuo.vip
 * 5.不可二次分发开源参与同类竞品，如有想法可联系团队xiaonuobase@qq.com商议合作。
 * 6.若您的项目无法满足以上几点，需要更多功能代码，获取Snowy商业授权许可，请在官网购买授权，地址为 https://www.xiaonuo.vip
 */
package vip.xiaonuo.biz.modular.graphic.service.impl;

import cn.hutool.core.util.StrUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import vip.xiaonuo.biz.modular.graphic.param.BizGraphicPosterParam;
import vip.xiaonuo.biz.modular.graphic.service.BizGraphicPosterService;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Font;
import java.awt.Graphics2D;
import java.awt.GraphicsEnvironment;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 图文海报渲染实现
 *
 * 纯 JDK 绘制（BufferedImage + Graphics2D），不依赖前端截图或外部服务：
 * 1. 1080×1440 竖版卡片，圆角摘要条 + 自动换行正文 + 页码/署名；
 * 2. 内容超出一页时自动分页，最多 {@link #MAX_PAGES} 页；
 * 3. 只把图片字节转成 data URI 返回，不调用文件服务落盘，
 *    避免预览阶段产生大量临时文件；真正保存时由前端上传。
 *
 * 注意：Linux 服务器需安装中文字体（如 fonts-wqy-zenhei），否则中文会渲染为方框。
 *
 * @author domain-stream
 * @date 2026/11/21
 **/
@Slf4j
@Service
public class BizGraphicPosterServiceImpl implements BizGraphicPosterService {

    /** 画布宽度（竖版 3:4，与小红书笔记一致） */
    private static final int WIDTH = 1080;

    /** 画布高度 */
    private static final int HEIGHT = 1440;

    /** 统一安全边距：上下左右一致，尽可能让文本占满画布 */
    private static final int PADDING = 72;

    /** 左右安全边距，与上下保持一致 */
    private static final int PADDING_X = 72;

    /** 字符间距：比默认字距放宽 1px */
    private static final int LETTER_SPACING = 1;

    /** 折行时额外预留的余量，抵消字体度量与实际字形宽度的误差 */
    private static final int WRAP_TOLERANCE = 8;

    /** 分页上限，防止超长文本生成过多图片 */
    private static final int MAX_PAGES = 9;

    /** 正文字号：64px，手机端一屏阅读舒适 */
    private static final float BODY_SIZE = 64f;

    /** 标题字号：明显大于正文，形成层级 */
    private static final float TITLE_SIZE = 100f;

    /** 页脚字号 */
    private static final float FOOTER_SIZE = 32f;

    /** 正文行高 = 字号 × 倍数 */
    private static final float LINE_HEIGHT_RATIO = 1.58f;

    /** 标题区高度估算（含与正文的间距），封面页使用 */
    private static final int TITLE_BLOCK_HEIGHT = 210;

    /** 内页正文额外顶部留白 */
    private static final int INNER_TOP_EXTRA = 28;

    /** 页脚保留高度 */
    private static final int FOOTER_AREA = 64;

    /** 可选主题：背景渐变 + 文字色 + 强调色，风格参考小红书卡片 */
    private static final Map<String, Theme> THEMES = new LinkedHashMap<>();

    static {
        THEMES.put("warm", new Theme(new Color(255, 245, 238), new Color(255, 226, 214), new Color(38, 32, 30), new Color(255, 109, 90)));
        THEMES.put("mint", new Theme(new Color(238, 250, 246), new Color(214, 240, 232), new Color(28, 42, 38), new Color(24, 168, 138)));
        THEMES.put("sky", new Theme(new Color(240, 246, 255), new Color(214, 230, 252), new Color(28, 35, 48), new Color(0, 113, 227)));
        THEMES.put("lilac", new Theme(new Color(247, 243, 255), new Color(231, 219, 252), new Color(38, 32, 48), new Color(140, 92, 236)));
        THEMES.put("cream", new Theme(new Color(255, 252, 244), new Color(246, 236, 214), new Color(48, 42, 30), new Color(214, 158, 46)));
    }

    @Override
    public List<String> render(BizGraphicPosterParam param, String author) {
        String content = StrUtil.trim(param.getContent());
        if (StrUtil.isBlank(content)) {
            throw new IllegalArgumentException("内容不能为空");
        }
        String title = StrUtil.isBlank(param.getTitle()) ? firstLine(content) : StrUtil.trim(param.getTitle());
        String nickname = StrUtil.isBlank(param.getNickname()) ? author : StrUtil.trim(param.getNickname());
        Theme theme = THEMES.getOrDefault(StrUtil.nullToDefault(param.getTheme(), "warm"), THEMES.get("warm"));

        Font titleFont = font(Font.BOLD, TITLE_SIZE);
        Font bodyFont = font(Font.PLAIN, BODY_SIZE);
        Font footerFont = font(Font.PLAIN, FOOTER_SIZE);

        // 文字可用宽度：左右各留安全边距，再扣掉折行余量，确保字形不越界
        int contentWidth = WIDTH - PADDING_X * 2 - WRAP_TOLERANCE;
        int lineHeight = Math.round(BODY_SIZE * LINE_HEIGHT_RATIO);
        // 正文可用高度：顶部留白 + 标题区 + 底部页脚区
        int bodyTop = PADDING + TITLE_BLOCK_HEIGHT;
        int bodyBottom = HEIGHT - PADDING - FOOTER_AREA;
        // 每页能容纳的正文行数（字号变大后行数减少，靠分页保证不溢出）
        int linesPerPage = Math.max(1, (bodyBottom - bodyTop) / lineHeight);

        // 先按字号折行，再按行数切页：放不下就生成新图继续
        List<String> lines = wrap(content, bodyFont, contentWidth);
        List<String> urls = new ArrayList<>();
        int pageCount = Math.min(MAX_PAGES, (int) Math.ceil((double) lines.size() / linesPerPage));
        for (int pageIndex = 0; pageIndex < pageCount; pageIndex++) {
            int from = pageIndex * linesPerPage;
            int to = Math.min(lines.size(), from + linesPerPage);
            List<String> pageLines = new ArrayList<>(lines.subList(from, to));
            // 封面页显示标题，内页不重复大标题，保持卡片简洁
            String pageTitle = pageIndex == 0 ? title : "";
            // 封面预留标题高度，内页从顶部留白开始排正文
            int textTop = pageIndex == 0 ? bodyTop : PADDING + INNER_TOP_EXTRA;
            BufferedImage image = drawPage(theme, pageTitle, pageLines, nickname,
                    pageIndex + 1, pageCount, textTop, titleFont, bodyFont, footerFont);
            urls.add(toDataUri(image));
        }
        return urls;
    }

    /** 绘制单页卡片（textTop 为正文起始基线，封面会下移让出标题区） */
    private BufferedImage drawPage(Theme theme, String title, List<String> lines, String nickname,
                                   int pageNo, int pageCount, int textTop,
                                   Font titleFont, Font bodyFont, Font footerFont) {
        BufferedImage image = new BufferedImage(WIDTH, HEIGHT, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = image.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setRenderingHint(RenderingHints.KEY_TEXT_ANTIALIASING, RenderingHints.VALUE_TEXT_ANTIALIAS_ON);

            // 背景：上下渐变，模拟纸质感
            g.setPaint(new java.awt.GradientPaint(0, 0, theme.bgTop, 0, HEIGHT, theme.bgBottom));
            g.fillRect(0, 0, WIDTH, HEIGHT);

            // 左上角装饰色块，呼应小红书卡片的视觉锚点
            g.setColor(theme.accent);
            g.fillRoundRect(PADDING_X, PADDING - 24, 96, 10, 10, 10);

            g.setColor(theme.text);
            if (StrUtil.isNotBlank(title)) {
                // 标题最多两行，避免吃掉正文空间
                int cursorY = PADDING + 92;
                g.setFont(titleFont);
                for (String line : wrap(title, titleFont, WIDTH - PADDING_X * 2 - WRAP_TOLERANCE)) {
                    if (cursorY > PADDING + TITLE_BLOCK_HEIGHT - 40) break;
                    drawTracked(g, line, PADDING_X, cursorY);
                    cursorY += Math.round(TITLE_SIZE * 1.28f);
                }
            }

            // 正文：64px，行数由分页保证放得下
            g.setFont(bodyFont);
            int lineHeight = Math.round(BODY_SIZE * LINE_HEIGHT_RATIO);
            int y = textTop;
            for (String line : lines) {
                drawTracked(g, line, PADDING_X, y);
                y += lineHeight;
            }

            // 页脚：署名 + 页码
            g.setFont(footerFont);
            g.setColor(theme.footer);
            String authorText = StrUtil.isBlank(nickname) ? "" : StrUtil.sub(nickname, 0, 20);
            drawTracked(g, authorText, PADDING_X, HEIGHT - PADDING);
            String pageText = pageCount > 1 ? pageNo + " / " + pageCount : dateText();
            int pageWidth = trackedWidth(g, pageText);
            drawTracked(g, pageText, WIDTH - PADDING_X - pageWidth, HEIGHT - PADDING);

            // 页码指示条
            if (pageCount > 1) {
                int barWidth = 120;
                int filled = Math.max(12, barWidth * pageNo / pageCount);
                g.setColor(new Color(theme.text.getRed(), theme.text.getGreen(), theme.text.getBlue(), 30));
                g.fillRoundRect(WIDTH - PADDING_X - barWidth, HEIGHT - PADDING - 62, barWidth, 6, 6, 6);
                g.setColor(theme.accent);
                g.fillRoundRect(WIDTH - PADDING_X - barWidth, HEIGHT - PADDING - 62, filled, 6, 6, 6);
            }
        } finally {
            g.dispose();
        }
        return image;
    }

    /**
     * 图片转 data URI 返回，不落盘。
     * 前端可直接作为 img src 预览；用户确认后再由前端走上传接口保存，
     * 避免预览阶段每次生成都在文件服务里堆积冗余文件。
     */
    private String toDataUri(BufferedImage image) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            ImageIO.write(image, "jpg", out);
            return "data:image/jpeg;base64," + Base64.getEncoder().encodeToString(out.toByteArray());
        } catch (IOException e) {
            log.error(">>> 图文海报渲染失败：", e);
            throw new IllegalStateException("图片生成失败", e);
        }
    }

    /* ------------------------------------------------------------------ */
    /* 文本排版                                                            */
    /* ------------------------------------------------------------------ */

    /** 按像素宽度折行，保留原有换行；过长的英文单词强制截断 */
    private List<String> wrap(String text, Font font, int maxWidth) {
        BufferedImage scratch = new BufferedImage(1, 1, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = scratch.createGraphics();
        List<String> lines = new ArrayList<>();
        try {
            g.setFont(font);
            var metrics = g.getFontMetrics();
            for (String paragraph : text.split("\n")) {
                StringBuilder current = new StringBuilder();
                for (char ch : paragraph.toCharArray()) {
                    // 用「当前行 + 新字符」的宽度判断，而不是先加后减，
                    // 避免单个宽字符被推到新行后仍然越界
                    int width = metrics.stringWidth(current.toString() + ch)
                            + current.length() * LETTER_SPACING;
                    if (width > maxWidth && current.length() > 0) {
                        lines.add(current.toString());
                        current.setLength(0);
                    }
                    current.append(ch);
                }
                lines.add(current.toString());
            }
        } finally {
            g.dispose();
        }
        // 去掉尾部空行
        while (!lines.isEmpty() && StrUtil.isBlank(lines.get(lines.size() - 1))) {
            lines.remove(lines.size() - 1);
        }
        return lines.isEmpty() ? java.util.Collections.singletonList("") : lines;
    }

    /** 按 1px 字距逐字绘制 */
    private void drawTracked(Graphics2D g, String text, int x, int y) {
        if (StrUtil.isBlank(text)) return;
        java.awt.FontMetrics metrics = g.getFontMetrics();
        int cursor = x;
        for (char ch : text.toCharArray()) {
            g.drawString(String.valueOf(ch), cursor, y);
            cursor += metrics.charWidth(ch) + LETTER_SPACING;
        }
    }

    /** 计算按 1px 字距绘制后的总宽度，用于右对齐 */
    private int trackedWidth(Graphics2D g, String text) {
        if (StrUtil.isBlank(text)) return 0;
        java.awt.FontMetrics metrics = g.getFontMetrics();
        int width = 0;
        for (char ch : text.toCharArray()) {
            width += metrics.charWidth(ch) + LETTER_SPACING;
        }
        return Math.max(0, width - LETTER_SPACING);
    }

    /** 取首个非空行作为标题，超长时截断 */
    private String firstLine(String content) {
        for (String line : content.split("\n")) {
            String trimmed = StrUtil.trim(line);
            if (StrUtil.isNotBlank(trimmed)) {
                return StrUtil.sub(trimmed, 0, 40);
            }
        }
        return StrUtil.sub(content, 0, 40);
    }

    private String dateText() {
        return LocalDate.now().toString();
    }

    /**
     * 选择可用中文字体：优先思源/苹方/雅黑，服务器缺失时退回逻辑字体。
     * 未安装中文字体时中文会显示为方框，需在部署环境安装字体。
     */
    private Font font(int style, float size) {
        String[] preferred = {"PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "Source Han Sans CN", "WenQuanYi Zen Hei"};
        List<String> available = java.util.Arrays.asList(GraphicsEnvironment.getLocalGraphicsEnvironment().getAvailableFontFamilyNames());
        for (String name : preferred) {
            if (available.contains(name)) {
                return new Font(name, style, Math.round(size));
            }
        }
        return new Font(Font.SANS_SERIF, style, Math.round(size));
    }

    /** 卡片主题配色 */
    private static final class Theme {
        private final Color bgTop;
        private final Color bgBottom;
        private final Color text;
        private final Color accent;
        private final Color footer;

        private Theme(Color bgTop, Color bgBottom, Color text, Color accent) {
            this.bgTop = bgTop;
            this.bgBottom = bgBottom;
            this.text = text;
            this.accent = accent;
            this.footer = new Color(text.getRed(), text.getGreen(), text.getBlue(), 110);
        }
    }
}
