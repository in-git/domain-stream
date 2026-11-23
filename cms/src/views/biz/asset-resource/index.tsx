/**
 * 素材资源库
 * ------------------------------------------------------------------
 * 素材来自 Iconify / Bing / Lorem Picsum 等公开源，浏览时只读取元数据与远程 URL，
 * 图片经后端 /biz/asset-resource/media 按需代理预览。
 * 用户勾选后点「加入素材中心」会下载素材并写入系统本地文件库。
 *
 * 页面风格与素材中心、文件中心、留言管理等模块保持一致。
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  X,
} from 'lucide-react';
import { assetResourceApi, proxyUrl, type AssetTypeSite, type AssetResource } from '../../../lib/assetResource.ts';
import { showToast } from '../../../components/AppToast.tsx';
import { SelectField } from '../../../components/SelectField.tsx';

const ICON_PAGE_SIZE = 50;
const WALLPAPER_PAGE_SIZE = 20;
const COLLECT_COOLDOWN_MS = 5 * 60 * 1000;
const COLLECT_LAST_AT_KEY = 'asset-resource:last-collect-at';

type ViewMode = 'grid' | 'list';

/** React 本地存储状态：值持久化到 localStorage，刷新页面后仍保留 */
function useLocalStorageState<T>(key: string, initialValue: T): readonly [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? initialValue : (JSON.parse(raw) as T);
    } catch {
      return initialValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // 本地存储不可用时只保留内存状态
    }
  }, [key, value]);

  return [value, setValue] as const;
}

function formatRemain(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : '操作失败，请稍后重试';
}

/** 素材统一使用灰白背景，不显示透明棋盘格 */
const ASSET_BG_STYLE: CSSProperties = {
  backgroundColor: '#F2F2F7',
  backgroundImage: 'linear-gradient(135deg, #F7F7F9 0%, #EDEDF1 100%)',
};

/** 所有 ICON 图片统一按 84×84 实际渲染，不依赖 SVG 自带尺寸 */
const ICON_84_STYLE: CSSProperties = {
  width: '84px',
  height: '84px',
};

function typeLabel(type: string): string {
  if (type === 'ICON') return '图标';
  if (type === 'WALLPAPER') return '壁纸';
  return type || '其他';
}

export default function AssetResourceView({ permissions }: { permissions?: string[] }) {
  const canAdd = !!permissions?.includes('bizAssetResourceAdd');

  const [lastCollectAt, setLastCollectAt] = useLocalStorageState<number>(COLLECT_LAST_AT_KEY, 0);
  const [now, setNow] = useState(() => Date.now());
  const [collecting, setCollecting] = useState(false);
  const [collectConfirmOpen, setCollectConfirmOpen] = useState(false);

  const [type, setType] = useState('WALLPAPER');
  const [source, setSource] = useState('');
  const [inMaterial, setInMaterial] = useState('');
  const [search, setSearch] = useState('');
  const [keyword, setKeyword] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [page, setPage] = useState(1);

  const [items, setItems] = useState<AssetResource[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [counts, setCounts] = useState({ icon: 0, wallpaper: 0, added: 0 });
  const [siteTree, setSiteTree] = useState<AssetTypeSite[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<AssetResource | null>(null);
  const [imageFailed, setImageFailed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const searchTimerRef = useRef<number | null>(null);

  const pageSize = type === 'WALLPAPER' ? WALLPAPER_PAGE_SIZE : ICON_PAGE_SIZE;

  /** 代理优先，失败后回退远程直链，避免后端代理偶发超时导致空白图 */
  function assetSrc(item: AssetResource, full = false): string {
    const remote = full ? item.remoteImageUrl : item.remotePreviewUrl;
    if (imageFailed.has(item.id) && remote) return remote;
    return proxyUrl(full ? item.imageUrl : item.previewUrl);
  }

  function handleImageError(item: AssetResource) {
    setImageFailed((prev) => (prev.has(item.id) ? prev : new Set(prev).add(item.id)));
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const data = await assetResourceApi.page({
        current: page,
        size: pageSize,
        type: type || undefined,
        source: source || undefined,
        inMaterial: inMaterial || undefined,
        keyword: keyword || undefined,
      });
      setItems(data.records || []);
      setTotal(Number(data.total || 0));
      setPages(Math.max(1, Number(data.pages || 1)));
      setSelected(new Set());
      setImageFailed(new Set());
    } catch (err) {
      setLoadError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, type, source, inMaterial, keyword]);

  const loadCounts = useCallback(async () => {
    try {
      const [icon, wallpaper, added] = await Promise.all([
        assetResourceApi.page({ current: 1, size: 1, type: 'ICON' }),
        assetResourceApi.page({ current: 1, size: 1, type: 'WALLPAPER' }),
        assetResourceApi.page({ current: 1, size: 1, inMaterial: 'YES' }),
      ]);
      setCounts({
        icon: Number(icon.total || 0),
        wallpaper: Number(wallpaper.total || 0),
        added: Number(added.total || 0),
      });
    } catch {
      // 统计失败不影响主列表
    }
  }, []);

  const loadSites = useCallback(async () => {
    try {
      setSiteTree(await assetResourceApi.sites());
    } catch {
      // 站点统计失败不影响主列表
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCounts();
    void loadSites();
  }, [loadCounts, loadSites]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    searchTimerRef.current = window.setTimeout(() => {
      setKeyword(search.trim());
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) window.clearTimeout(searchTimerRef.current);
    };
  }, [search]);

  const sourceNodes = useMemo(() => {
    if (type) {
      return siteTree.find((node) => node.value === type)?.sites || [];
    }
    const merged = new Map<string, AssetTypeSite['sites'][number]>();
    siteTree.forEach((node) => node.sites.forEach((item) => {
      const existing = merged.get(item.value);
      if (!existing) {
        merged.set(item.value, { ...item });
        return;
      }
      existing.assetCount += item.assetCount;
    }));
    return [...merged.values()];
  }, [siteTree, type]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const allPageSelected = items.length > 0 && items.every((item) => selected.has(item.id));
  const somePageSelected = items.some((item) => selected.has(item.id));

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectPage() {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPageSelected) items.forEach((item) => next.delete(item.id));
      else items.forEach((item) => next.add(item.id));
      return next;
    });
  }

  const collectRemainMs = Math.max(0, lastCollectAt + COLLECT_COOLDOWN_MS - now);
  const collectDisabled = collecting || collectRemainMs > 0;

  const hasFilter = !!keyword || !!source || !!inMaterial;

  function clearFilters() {
    setSearch('');
    setKeyword('');
    setSource('');
    setInMaterial('');
    setPage(1);
  }

  async function collectAssets() {
    if (collectRemainMs > 0) {
      showToast(`请 ${formatRemain(collectRemainMs)} 后再采集`, 'warning');
      return;
    }
    setCollecting(true);
    try {
      const summary = await assetResourceApi.collect();
      showToast(summary || '素材采集完成', 'success');
      await Promise.all([load(), loadCounts(), loadSites()]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      // 无论成功失败都进入冷却，避免连续请求公开数据源
      setLastCollectAt(Date.now());
      setCollecting(false);
    }
  }

  async function addToMaterial(ids: string[]) {
    if (!ids.length) {
      showToast('请先选择素材', 'warning');
      return;
    }
    setBusy(true);
    try {
      await assetResourceApi.addToMaterial(ids);
      showToast('已加入素材中心', 'success');
      setPreview(null);
      await Promise.all([load(), loadCounts(), loadSites()]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const statCards = [
    { key: 'ICON', label: '图标', value: counts.icon, icon: ImageIcon, active: type === 'ICON' && inMaterial !== 'YES' },
    { key: 'WALLPAPER', label: '壁纸', value: counts.wallpaper, icon: ImageIcon, active: type === 'WALLPAPER' && inMaterial !== 'YES' },
    { key: 'ADDED', label: '已加入素材', value: counts.added, icon: Check, active: inMaterial === 'YES' },
  ];

  const typeTabs = [
    { value: 'ICON', label: '图标' },
    { value: 'WALLPAPER', label: '壁纸' },
  ];

  return (
    <div className="space-y-5">
      {/* 概览 */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {statCards.map((stat) => (
          <button
            key={stat.key}
            type="button"
            onClick={() => {
              if (stat.key === 'ADDED') {
                setInMaterial(inMaterial === 'YES' ? '' : 'YES');
                setSource('');
              } else {
                setType(stat.key);
                setSource('');
                setInMaterial('');
              }
              setPage(1);
            }}
            className={`text-left bg-white rounded-2xl border px-4 py-3.5 flex items-center gap-3 transition-colors ${
              stat.active
                ? 'border-[#0071E3]/40 ring-1 ring-[#0071E3]/20'
                : 'border-[#E5E5EA] hover:border-[#D1D1D6]'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-[#0071E3]/8 flex items-center justify-center shrink-0">
              <stat.icon className="w-4 h-4 text-[#0071E3]" strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
              <div className="text-[20px] font-semibold tabular-nums text-[#1D1D1F] leading-none">
                {stat.value}
              </div>
              <div className="text-[12px] text-[#86868B] mt-1">{stat.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* 工具栏 */}
      <div className="bg-white rounded-[18px] border border-[#E5E5EA] p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-[320px] min-w-[180px]">
              <Search className="w-4 h-4 text-[#86868B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索名称、标签或来源..."
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 transition-all"
              />
            </div>

            <SelectField
              ariaLabel="按加入状态筛选"
              value={inMaterial}
              onChange={(value) => { setInMaterial(value); setPage(1); }}
              options={[
                { value: '', label: '全部状态' },
                { value: 'NO', label: '未加入' },
                { value: 'YES', label: '已加入' },
              ]}
              className="w-36"
            />

            {hasFilter && (
              <button
                type="button"
                onClick={clearFilters}
                className="h-9 px-2.5 rounded-xl text-[12px] text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F2F2F7] inline-flex items-center gap-1 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                清除筛选
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-xl bg-[#F5F5F7] p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="网格视图"
                aria-pressed={viewMode === 'grid'}
                className={`h-8 w-8 rounded-[10px] flex items-center justify-center transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="列表视图"
                aria-pressed={viewMode === 'list'}
                className={`h-8 w-8 rounded-[10px] flex items-center justify-center transition-colors ${
                  viewMode === 'list'
                    ? 'bg-white text-[#1D1D1F] shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              type="button"
              onClick={() => void Promise.all([load(), loadCounts(), loadSites()])}
              disabled={loading}
              title="刷新列表"
              className="h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              disabled={collectDisabled}
              onClick={() => setCollectConfirmOpen(true)}
              title={collectRemainMs > 0 ? `冷却中，${formatRemain(collectRemainMs)} 后可再次采集` : '从公开数据源发现新素材'}
              className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] transition-colors disabled:opacity-50 disabled:hover:bg-white"
            >
              {collecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {collecting
                ? '采集中...'
                : collectRemainMs > 0
                  ? `${formatRemain(collectRemainMs)} 后重试`
                  : '采集素材'}
            </button>

            {canAdd && (
              <button
                type="button"
                disabled={busy || !selected.size}
                onClick={() => void addToMaterial([...selected])}
                className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                <Images className="w-4 h-4" />
                加入素材中心{selected.size ? ` (${selected.size})` : ''}
              </button>
            )}
          </div>
        </div>

        {/* 类型 Tab */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#F2F2F7]">
          {typeTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setType(tab.value); setSource(''); setInMaterial(''); setPage(1); }}
              className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
                type === tab.value
                  ? 'bg-[#0071E3]/10 text-[#0071E3]'
                  : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 站点分类 */}
        <div className="flex flex-wrap items-center pt-2 border-t border-[#F2F2F7]">
          <div className="flex flex-wrap items-center gap-1">
            <button
              type="button"
              onClick={() => { setSource(''); setPage(1); }}
              className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
                source === '' ? 'bg-[#0071E3]/10 text-[#0071E3]' : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
              }`}
            >
              全部站点
            </button>
            {sourceNodes.map((node) => (
              <button
                key={node.value}
                type="button"
                onClick={() => { setSource(node.value); setPage(1); }}
                title={node.assetCount === 0 ? '该站点暂无资源，可点击「采集素材」后刷新' : undefined}
                className={`h-8 px-3 rounded-[10px] text-[12px] font-medium transition-colors ${
                  node.assetCount === 0 ? 'opacity-45' : ''
                } ${
                  source === node.value
                    ? 'bg-[#0071E3]/10 text-[#0071E3]'
                    : 'text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]'
                }`}
              >
                {node.label} <span className="text-[11px] tabular-nums opacity-60">{node.assetCount}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 批量选择 */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#F2F2F7]">
          <div className="flex flex-wrap items-center gap-1 ml-auto">
            <button
              type="button"
              role="checkbox"
              aria-checked={allPageSelected ? true : somePageSelected ? 'mixed' : false}
              aria-label="全选本页素材"
              disabled={!items.length}
              onClick={toggleSelectPage}
              className="h-8 pl-1.5 pr-2.5 rounded-[10px] inline-flex items-center gap-1.5 text-[12px] font-medium text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
            >
              <span
                className={`w-4 h-4 rounded-[5px] border flex items-center justify-center transition-colors ${
                  allPageSelected
                    ? 'bg-[#0071E3] border-[#0071E3] text-white'
                    : somePageSelected
                      ? 'bg-[#0071E3]/12 border-[#0071E3]'
                      : 'bg-white border-[#C7C7CC]'
                }`}
              >
                {allPageSelected ? (
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                ) : somePageSelected ? (
                  <span className="w-2 h-0.5 rounded-full bg-[#0071E3]" />
                ) : null}
              </span>
              全选本页
            </button>
            {selected.size > 0 && (
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="h-8 px-2 rounded-[10px] text-[12px] font-medium text-[#6E6E73] hover:bg-[#F5F5F7] transition-colors"
              >
                取消选择
              </button>
            )}
          </div>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl bg-[#FF3B30]/8 border border-[#FF3B30]/20 px-4 py-3 flex items-center justify-between gap-3 text-[13px] text-[#D70015]">
          <span>素材资源加载失败：{loadError}</span>
          <button type="button" onClick={() => void load()} className="shrink-0 font-medium underline underline-offset-2">
            重试
          </button>
        </div>
      )}

      {busy && (
        <div className="rounded-xl bg-[#0071E3]/8 border border-[#0071E3]/20 px-4 py-2.5 text-[12px] text-[#0071E3] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          正在加入素材中心...
        </div>
      )}

      {/* 内容区 */}
      {loading ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-20 flex flex-col items-center justify-center gap-3 text-[#86868B]">
          <Loader2 className="w-6 h-6 animate-spin text-[#0071E3]" />
          <span className="text-[13px]">正在加载素材资源...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] py-20 px-6 text-center">
          <Images className="w-10 h-10 text-[#C7C7CC] mx-auto mb-3" strokeWidth={1.5} />
          <h3 className="text-[16px] font-semibold text-[#1D1D1F]">
            {hasFilter ? '没有匹配的素材资源' : '素材资源库还是空的'}
          </h3>
          <p className="text-[13px] text-[#6E6E73] mt-1">
            {hasFilter
              ? '试试调整搜索词或切换筛选条件'
              : '点击右上角「采集素材」从公开数据源发现新资源'}
          </p>
          {hasFilter && (
            <button
              type="button"
              onClick={clearFilters}
              className="mt-5 h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium"
            >
              清除筛选
            </button>
          )}
        </div>
      ) : type === 'ICON' ? (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] px-5 py-7">
          <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 xl:grid-cols-10 2xl:grid-cols-12 gap-x-2 gap-y-6">
            {items.map((item) => {
              const isSelected = selected.has(item.id);
              const added = item.inMaterial === 'YES';
              return (
                <div
                  key={item.id}
                  className="group relative flex flex-col items-center min-w-0"
                >
                  <button
                    type="button"
                    aria-label={`选择 ${item.title}`}
                    onClick={() => toggleSelect(item.id)}
                    className={`absolute left-1 top-1 z-10 w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all ${
                      isSelected
                        ? 'bg-[#0071E3] border-[#0071E3] text-white'
                        : 'bg-white border-[#D2D2D7] text-transparent opacity-0 group-hover:opacity-100'
                    }`}
                  >
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                  </button>
                  {added && (
                    <span className="absolute right-1 top-1 z-10 w-2 h-2 rounded-full bg-[#30D158]" title="已加入素材中心" />
                  )}
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className="w-[84px] h-[84px] flex items-center justify-center rounded-xl bg-[#F2F2F7] hover:bg-[#E8E8ED] transition-colors"
                    title={item.title}
                  >
                    <img
                      src={assetSrc(item)}
                      alt={item.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="object-contain"
                      style={ICON_84_STYLE}
                      onError={() => handleImageError(item)}
                    />
                  </button>
                  <div
                    className="mt-2 w-full text-center text-[12px] leading-4 text-[#6E6E73] truncate"
                    title={item.title}
                  >
                    {item.title || '未命名图标'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-x-1.5 gap-y-3">
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            const added = item.inMaterial === 'YES';
            return (
              <div
                key={item.id}
                className={`relative group bg-white rounded-[14px] border overflow-hidden transition-colors ${
                  isSelected ? 'border-[#0071E3]/60 ring-1 ring-[#0071E3]/30' : 'border-[#E5E5EA] hover:border-[#D1D1D6]'
                }`}
              >
                <button
                  type="button"
                  aria-label={`选择 ${item.title}`}
                  onClick={() => toggleSelect(item.id)}
                  className={`absolute top-1.5 left-1.5 z-10 w-5 h-5 rounded-[6px] border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-[#0071E3] border-[#0071E3] text-white'
                      : 'bg-white/85 border-black/10 text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </button>

                {added && (
                  <span className="absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-full bg-[#30D158]/90 text-white text-[10px]">
                    已加入
                  </span>
                )}

                <button type="button" className="block w-full" onClick={() => setPreview(item)}>
                  <div
                    className="aspect-[4/3] flex items-center justify-center overflow-hidden"
                    style={ASSET_BG_STYLE}
                  >
                    {item.type === 'ICON' ? (
                      <div className="w-[84px] h-[84px] flex items-center justify-center shrink-0" style={ASSET_BG_STYLE}>
                        <img
                          src={assetSrc(item)}
                          alt={item.title}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="object-contain"
                          style={ICON_84_STYLE}
                          onError={() => handleImageError(item)}
                        />
                      </div>
                    ) : (
                      <img
                        src={assetSrc(item)}
                        alt={item.title}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                        onError={() => handleImageError(item)}
                      />
                    )}
                  </div>
                </button>

                <div className="mt-1.5 px-0.5 min-w-0 pb-2">
                  <div className="text-[12px] font-medium text-[#1D1D1F] truncate" title={item.title}>
                    {item.title || '未命名素材'}
                  </div>
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-[#86868B]">
                    <span className="truncate">{item.source}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-[#C7C7CC] shrink-0" />
                    <span className="shrink-0">{typeLabel(item.type)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[32px_minmax(0,3fr)_100px_110px_140px] gap-3 px-4 py-2.5 border-b border-[#F2F2F7] text-[11px] font-medium text-[#86868B]">
            <span />
            <span>素材名称</span>
            <span>来源</span>
            <span>加入状态</span>
            <span className="text-right">操作</span>
          </div>
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            const added = item.inMaterial === 'YES';
            return (
              <div
                key={item.id}
                className="grid grid-cols-[32px_minmax(0,1fr)] sm:grid-cols-[32px_minmax(0,3fr)_100px_110px_140px] gap-3 items-center px-4 py-2.5 border-b border-[#F5F5F7] last:border-b-0 hover:bg-[#FAFAFC] transition-colors"
              >
                <button
                  type="button"
                  aria-label={`选择 ${item.title}`}
                  onClick={() => toggleSelect(item.id)}
                  className={`w-4 h-4 rounded-[5px] border flex items-center justify-center ${
                    isSelected ? 'bg-[#0071E3] border-[#0071E3] text-white' : 'bg-white border-[#C7C7CC] text-transparent'
                  }`}
                >
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </button>
                <button type="button" onClick={() => setPreview(item)} className="flex items-center gap-2.5 min-w-0 text-left">
                  <span
                    className={`${item.type === 'ICON' ? 'w-[84px] h-[84px]' : 'w-8 h-8'} rounded-lg flex items-center justify-center shrink-0 overflow-hidden`}
                    style={ASSET_BG_STYLE}
                  >
                    <img
                      src={assetSrc(item)}
                      alt={item.title}
                      className={`${item.type === 'ICON' ? 'object-contain' : 'w-8 h-8 object-cover'} rounded-lg`}
                      style={item.type === 'ICON' ? ICON_84_STYLE : undefined}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(item)}
                    />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-[#1D1D1F] truncate">{item.title || '未命名素材'}</span>
                    <span className="block text-[11px] text-[#86868B] truncate sm:hidden">
                      {item.source} · {typeLabel(item.type)}
                    </span>
                  </span>
                </button>
                <span className="hidden sm:block text-[12px] text-[#6E6E73] truncate">{item.source}</span>
                <span className="hidden sm:block text-[12px] text-[#6E6E73]">
                  {added ? <span className="text-[#248A3D]">已加入</span> : <span className="text-[#86868B]">未加入</span>}
                </span>
                <span className="hidden sm:flex items-center justify-end gap-1">
                  <button
                    type="button"
                    onClick={() => setPreview(item)}
                    className="p-1.5 rounded-lg text-[#6E6E73] hover:text-[#0071E3] hover:bg-[#F5F5F7] transition-colors"
                    title="预览"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                  </button>
                  {canAdd && !added && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void addToMaterial([item.id])}
                      className="h-8 px-2.5 rounded-lg bg-[#0071E3]/8 text-[#0071E3] text-[12px] font-medium hover:bg-[#0071E3]/12 disabled:opacity-50 transition-colors"
                    >
                      加入素材中心
                    </button>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* 分页 */}
      {!loading && total > 0 && (
        <div className="bg-white rounded-[18px] border border-[#E5E5EA] px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-[#86868B]">
          <span>
            共 {total} 个资源{selected.size ? ` · 已选 ${selected.size} 个` : ''} · 第 {currentPage}/{totalPages} 页
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="上一页"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 tabular-nums text-[#3A3A3C]">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 w-8 rounded-lg border border-[#E5E5EA] flex items-center justify-center text-[#3A3A3C] hover:bg-[#F5F5F7] disabled:opacity-40 transition-colors"
              aria-label="下一页"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 采集确认弹窗 */}
      {collectConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => setCollectConfirmOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#0071E3]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-[#1D1D1F]">确认开始采集素材？</h3>
                <p className="mt-1.5 text-[13px] leading-5 text-[#6E6E73]">
                  点击确认后，系统将自动从公开数据源搜索最新素材。整个过程需要一些时间，请耐心等待，期间请勿关闭页面。
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCollectConfirmOpen(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] shrink-0"
                aria-label="关闭采集提示"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mt-4 rounded-xl bg-[#F5F5F7] px-3.5 py-2.5 text-[12px] leading-5 text-[#6E6E73]">
              采集完成后会自动刷新列表；为避免频繁请求公开数据源，5 分钟内无法重复采集。
            </div>
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setCollectConfirmOpen(false)}
                className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium hover:bg-[#F5F5F7] transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => { setCollectConfirmOpen(false); void collectAssets(); }}
                className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                确认采集
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 预览弹窗：沿用暗色遮罩，与其他模块预览体验一致 */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => setPreview(null)}>
          <button className="absolute top-5 right-5 text-white/80" onClick={() => setPreview(null)} aria-label="关闭预览">
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-6xl w-full" onClick={(e) => e.stopPropagation()}>
            <div className="rounded-2xl overflow-hidden bg-white flex flex-col md:flex-row min-h-[600px] md:min-h-[70vh]">
              <div className="flex-1 flex items-center justify-center min-h-[380px] md:min-h-[70vh] p-8" style={ASSET_BG_STYLE}>
                {preview.type === 'ICON' ? (
                  <div className="w-[84px] h-[84px] flex items-center justify-center shrink-0" style={ASSET_BG_STYLE}>
                    <img
                      src={assetSrc(preview, true)}
                      alt={preview.title}
                      className="object-contain"
                      style={ICON_84_STYLE}
                      referrerPolicy="no-referrer"
                      onError={() => handleImageError(preview)}
                    />
                  </div>
                ) : (
                  <img
                    src={assetSrc(preview, true)}
                    alt={preview.title}
                    className="max-h-[70vh] max-w-full object-contain"
                    referrerPolicy="no-referrer"
                    onError={() => handleImageError(preview)}
                  />
                )}
              </div>
              <div className="w-full md:w-80 p-5 space-y-3">
                <ImageIcon className="w-5 h-5 text-[#0071E3]" />
                <h3 className="text-[17px] font-semibold text-[#1D1D1F] break-words">{preview.title}</h3>
                <p className="text-[12px] text-[#86868B] leading-5">{preview.description}</p>
                <dl className="text-[12px] space-y-1.5 text-[#6E6E73]">
                  <div className="flex justify-between gap-3"><dt>来源</dt><dd className="text-right text-[#1D1D1F]">{preview.source}</dd></div>
                  <div className="flex justify-between gap-3"><dt>作者</dt><dd className="text-right text-[#1D1D1F] truncate max-w-[180px]">{preview.author || '未知'}</dd></div>
                  <div className="flex justify-between gap-3"><dt>许可</dt><dd className="text-right text-[#1D1D1F] truncate max-w-[180px]">{preview.license || '未知'}</dd></div>
                </dl>
                {canAdd && preview.inMaterial !== 'YES' && (
                  <button
                    disabled={busy}
                    onClick={() => void addToMaterial([preview.id])}
                    className="w-full h-9 rounded-lg bg-[#0071E3] text-white text-[13px] disabled:opacity-50"
                  >
                    加入素材中心
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
