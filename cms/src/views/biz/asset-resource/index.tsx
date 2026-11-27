/**
 * 素材资源库
 * ------------------------------------------------------------------
 * 素材通过「网址采集」录入：用户输入网址并选择图片/视频/SVG/图标类型，
 * 后端下载后写入素材中心，同时在资源库登记元数据。
 * 图片等资源经 /biz/asset-resource/media 按需代理预览。
 *
 * 页面风格与素材中心、文件中心、留言管理等模块保持一致。
 */
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { assetResourceApi, proxyUrl, type AssetResource } from '../../../lib/assetResource.ts';
import { showToast } from '../../../components/AppToast.tsx';
import { SelectField } from '../../../components/SelectField.tsx';

const PAGE_SIZE = 20;

type ViewMode = 'grid' | 'list';
type CollectPhase = 'idle' | 'running' | 'done' | 'error';

/** 资源类型选项：用于采集表单、统计卡片和类型筛选 */
const TYPE_OPTIONS = [
  { value: 'IMAGE', label: '图片' },
  { value: 'VIDEO', label: '视频' },
  { value: 'SVG', label: 'SVG' },
  { value: 'ICON', label: '图标' },
];

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
  return TYPE_OPTIONS.find((item) => item.value === type)?.label || type || '其他';
}

export default function AssetResourceView() {
  const canAdd = true;

  const [collecting, setCollecting] = useState(false);
  const [collectUrlOpen, setCollectUrlOpen] = useState(false);
  const [collectUrl, setCollectUrl] = useState('');
  const [collectType, setCollectType] = useState('IMAGE');
  const [deepSearch, setDeepSearch] = useState(false);

  const [collectPanelOpen, setCollectPanelOpen] = useState(false);
  const [collectPanelCollapsed, setCollectPanelCollapsed] = useState(false);
  const [collectPhase, setCollectPhase] = useState<CollectPhase>('idle');
  const [collectedResources, setCollectedResources] = useState<AssetResource[]>([]);
  const [collectProgress, setCollectProgress] = useState({ index: 0, total: 0, message: '' });

  const [type, setType] = useState('IMAGE');
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
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [preview, setPreview] = useState<AssetResource | null>(null);
  const [imageFailed, setImageFailed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTargets, setDeleteTargets] = useState<AssetResource[]>([]);
  const searchTimerRef = useRef<number | null>(null);

  const pageSize = PAGE_SIZE;

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
  }, [page, pageSize, type, inMaterial, keyword]);

  const loadCounts = useCallback(async () => {
    try {
      const [typeResults, added] = await Promise.all([
        Promise.all(TYPE_OPTIONS.map((option) =>
          assetResourceApi.page({ current: 1, size: 1, type: option.value }))),
        assetResourceApi.page({ current: 1, size: 1, inMaterial: 'YES' }),
      ]);
      const next: Record<string, number> = { ADDED: Number(added.total || 0) };
      TYPE_OPTIONS.forEach((option, index) => {
        next[option.value] = Number(typeResults[index].total || 0);
      });
      setCounts(next);
    } catch {
      // 统计失败不影响主列表
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void loadCounts();
  }, [loadCounts]);

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

  const hasFilter = !!keyword || !!inMaterial;

  function clearFilters() {
    setSearch('');
    setKeyword('');
    setInMaterial('');
    setPage(1);
  }

  async function collectByUrl() {
    const url = collectUrl.trim();
    if (!url) {
      showToast('请输入资源网址', 'warning');
      return;
    }
    if (!/^https?:\/\//i.test(url)) {
      showToast('网址需以 http:// 或 https:// 开头', 'warning');
      return;
    }
    setCollecting(true);
    setCollectUrlOpen(false);
    setCollectPanelOpen(true);
    setCollectPanelCollapsed(false);
    setCollectPhase('running');
    setCollectedResources([]);
    setCollectProgress({
      index: 0,
      total: 0,
      message: deepSearch ? '正在深度搜索整站内链并采集资源...' : '正在解析网址并采集资源...',
    });
    try {
      await assetResourceApi.collectUrlStream(
        { url, type: collectType, limit: deepSearch ? undefined : 20, deepSearch },
        (event) => {
          setCollectProgress({ index: event.index, total: event.total, message: event.message });
          const resource = event.resource;
          if (event.phase === 'progress' && resource) {
            setCollectedResources((prev) => prev.some((item) => item.id === resource.id) ? prev : [...prev, resource]);
          } else if (event.phase === 'done') {
            setCollectPhase('done');
            setCollectUrl('');
            setCollectUrlOpen(false);
            showToast(event.message || '采集完成', 'success');
          } else if (event.phase === 'error') {
            setCollectPhase('error');
            setCollectUrlOpen(false);
            showToast(event.message || '采集失败', 'error');
          }
        }
      );
      setType(collectType);
      setInMaterial('');
      setPage(1);
      await Promise.all([load(), loadCounts()]);
    } catch (err) {
      setCollectPhase('error');
      setCollectUrlOpen(false);
      setCollectProgress((prev) => ({ ...prev, message: errorMessage(err) }));
      showToast(errorMessage(err), 'error');
    } finally {
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
      await Promise.all([load(), loadCounts()]);
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function removeResources(ids: string[]) {
    if (!ids.length) return;
    setDeleting(true);
    try {
      await assetResourceApi.remove(ids);
      const removed = new Set(ids);
      setDeleteTargets([]);
      setSelected(new Set());
      setCollectedResources((prev) => prev.filter((item) => !removed.has(item.id)));
      setPreview((prev) => (prev && removed.has(prev.id) ? null : prev));
      setImageFailed((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      showToast(`已删除 ${ids.length} 个资源`, 'success');

      // 当前页被删空时退回上一页，避免停在空白页
      if (items.every((item) => removed.has(item.id)) && page > 1) {
        setPage((p) => Math.max(1, p - 1));
      } else {
        await load();
      }
      await loadCounts();
    } catch (err) {
      showToast(errorMessage(err), 'error');
    } finally {
      setDeleting(false);
    }
  }

  const statCards = [
    ...TYPE_OPTIONS.map((option) => ({
      key: option.value,
      label: option.label,
      value: counts[option.value] || 0,
      icon: ImageIcon,
      active: type === option.value && inMaterial !== 'YES',
    })),
    { key: 'ADDED', label: '已加入素材', value: counts.ADDED || 0, icon: Check, active: inMaterial === 'YES' },
  ];

  const typeTabs = TYPE_OPTIONS;

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
              } else {
                setType(stat.key);
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
                placeholder="搜索名称、标签或描述..."
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
              onClick={() => void Promise.all([load(), loadCounts()])}
              disabled={loading}
              title="刷新列表"
              className="h-9 w-9 rounded-xl bg-white border border-[#E5E5EA] flex items-center justify-center text-[#6E6E73] hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>

            <button
              type="button"
              disabled={collecting}
              onClick={() => setCollectUrlOpen(true)}
              title="输入网址并选择资源类型进行采集"
              className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-[#F5F5F7] transition-colors disabled:opacity-50 disabled:hover:bg-white"
            >
              {collecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {collecting ? '采集中...' : '网址采集'}
            </button>

            <button
              type="button"
              onClick={() => setCollectPanelOpen((open) => !open)}
              title="打开采集结果模态框"
              className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium inline-flex items-center gap-2 hover:bg-[#F5F5F7] transition-colors"
            >
              <ChevronDown className={`w-4 h-4 transition-transform ${collectPanelOpen ? 'rotate-180' : ''}`} />
              采集结果{collectedResources.length ? ` (${collectedResources.length})` : ''}
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

            <button
              type="button"
              disabled={busy || deleting || !selected.size}
              onClick={() => setDeleteTargets(items.filter((item) => selected.has(item.id)))}
              className="h-9 px-3.5 rounded-xl border border-[#FF3B30]/30 bg-white text-[#D70015] text-[13px] font-medium inline-flex items-center gap-2 hover:bg-[#FF3B30]/8 transition-colors disabled:opacity-50"
              title="删除选中的资源库记录"
            >
              <Trash2 className="w-4 h-4" />
              删除{selected.size ? ` (${selected.size})` : ''}
            </button>
          </div>
        </div>

        {/* 类型 Tab */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-[#F2F2F7]">
          {typeTabs.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => { setType(tab.value); setInMaterial(''); setPage(1); }}
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

      {(busy || deleting) && (
        <div className="rounded-xl bg-[#0071E3]/8 border border-[#0071E3]/20 px-4 py-2.5 text-[12px] text-[#0071E3] flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          {deleting ? '正在删除资源库记录...' : '正在加入素材中心...'}
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
              : '点击右上角「网址采集」，输入资源网址并选择类型'}
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
      ) : type === 'ICON' || type === 'SVG' ? (
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
                    aria-label={`删除 ${item.title}`}
                    title="删除"
                    disabled={deleting}
                    onClick={() => setDeleteTargets([item])}
                    className="absolute right-1 bottom-1 z-10 w-5 h-5 rounded-[6px] border border-[#FF3B30]/20 bg-white/90 text-[#D70015] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white transition-opacity disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
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
                    {item.title || '未命名素材'}
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

                <button
                  type="button"
                  aria-label={`删除 ${item.title}`}
                  title="删除"
                  disabled={deleting}
                  onClick={() => setDeleteTargets([item])}
                  className="absolute bottom-1.5 right-1.5 z-10 w-6 h-6 rounded-[8px] border border-[#FF3B30]/20 bg-white/90 text-[#D70015] flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-white transition-opacity disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                <button type="button" className="block w-full" onClick={() => setPreview(item)}>
                  <div
                    className="aspect-[4/3] flex items-center justify-center overflow-hidden"
                    style={ASSET_BG_STYLE}
                  >
                    {item.type === 'ICON' || item.type === 'SVG' ? (
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
                    ) : item.type === 'VIDEO' ? (
                      <video
                        src={assetSrc(item)}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-full h-full object-cover"
                      />
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
                  <div className="mt-0.5 text-[10px] text-[#86868B]">
                    {typeLabel(item.type)}
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
            <span>类型</span>
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
                    className={`${item.type === 'ICON' || item.type === 'SVG' ? 'w-[84px] h-[84px]' : 'w-8 h-8'} rounded-lg flex items-center justify-center shrink-0 overflow-hidden`}
                    style={ASSET_BG_STYLE}
                  >
                    {item.type === 'VIDEO' ? (
                      <video
                        src={assetSrc(item)}
                        muted
                        playsInline
                        preload="metadata"
                        className="w-8 h-8 object-cover rounded-lg"
                      />
                    ) : (
                      <img
                        src={assetSrc(item)}
                        alt={item.title}
                        className={`${item.type === 'ICON' || item.type === 'SVG' ? 'object-contain' : 'w-8 h-8 object-cover'} rounded-lg`}
                        style={item.type === 'ICON' || item.type === 'SVG' ? ICON_84_STYLE : undefined}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        onError={() => handleImageError(item)}
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] text-[#1D1D1F] truncate">{item.title || '未命名素材'}</span>
                    <span className="block text-[11px] text-[#86868B] truncate sm:hidden">
                      {typeLabel(item.type)}
                    </span>
                  </span>
                </button>
                <span className="hidden sm:block text-[12px] text-[#6E6E73] truncate">{typeLabel(item.type)}</span>
                <span className="hidden sm:block text-[12px] text-[#6E6E73]">
                  {added ? <span className="text-[#248A3D]">已加入</span> : <span className="text-[#86868B]">未加入</span>}
                </span>
                <span className="hidden sm:flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={deleting}
                    onClick={() => setDeleteTargets([item])}
                    className="p-1.5 rounded-lg text-[#D70015] hover:bg-[#FF3B30]/8 transition-colors disabled:opacity-50"
                    title="删除"
                    aria-label={`删除 ${item.title}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
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

      {/* 网址采集弹窗 */}
      {collectUrlOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => { if (!collecting) setCollectUrlOpen(false); }}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[0_24px_60px_rgba(0,0,0,0.24)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0071E3]/10 flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5 text-[#0071E3]" strokeWidth={1.8} />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-semibold text-[#1D1D1F]">按网址采集素材</h3>
             
              </div>
              <button
                type="button"
                disabled={collecting}
                onClick={() => setCollectUrlOpen(false)}
                className="text-[#86868B] hover:text-[#1D1D1F] shrink-0 disabled:opacity-50"
                aria-label="关闭采集弹窗"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#3A3A3C]">
                  资源网址 <span className="text-[#D70015]">*</span>
                </label>
                <input
                  type="url"
                  value={collectUrl}
                  onChange={(e) => setCollectUrl(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !collecting) void collectByUrl(); }}
                  placeholder="https://bing.wdbyte.com/zh-cn/ 或图片直链"
                  disabled={collecting}
                  className="w-full h-10 px-3 rounded-xl border border-[#E5E5EA] bg-[#F5F5F7] text-[13px] text-[#1D1D1F] placeholder:text-[#86868B] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/25 disabled:opacity-60 transition-all"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[12px] font-medium text-[#3A3A3C]">
                  资源类型 <span className="text-[#D70015]">*</span>
                </label>
                <SelectField
                  ariaLabel="选择资源类型"
                  value={collectType}
                  onChange={setCollectType}
                  options={TYPE_OPTIONS}
                  className="w-full"
                />
              </div>
              <label className="flex items-start gap-2 rounded-xl border border-[#E5E5EA] px-3.5 py-3 cursor-pointer hover:bg-[#F5F5F7] transition-colors">
                <input
                  type="checkbox"
                  checked={deepSearch}
                  onChange={(e) => setDeepSearch(e.target.checked)}
                  disabled={collecting}
                  className="mt-0.5 w-4 h-4 accent-[#0071E3] disabled:opacity-50"
                />
                <span className="min-w-0">
                  <span className="block text-[13px] font-medium text-[#1D1D1F]">深度搜索</span>
                
                </span>
              </label>
              <div className="rounded-xl bg-[#F5F5F7] px-3.5 py-2.5 text-[12px] leading-5 text-[#6E6E73]">
                未勾选深度搜索时，网页地址默认采集前 20 张；图片与 SVG 单张最大 50MB，视频最大 500MB。相同图片按资源 ID 去重，重复采集会更新已有记录。
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={collecting}
                onClick={() => setCollectUrlOpen(false)}
                className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#1D1D1F] text-[13px] font-medium hover:bg-[#F5F5F7] transition-colors disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                disabled={collecting}
                onClick={() => void collectByUrl()}
                className="h-9 px-4 rounded-xl bg-[#0071E3] hover:bg-[#0077ED] text-white text-[13px] font-medium inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {collecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {collecting ? '采集中...' : '开始采集'}
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
                {preview.type === 'ICON' || preview.type === 'SVG' ? (
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
                ) : preview.type === 'VIDEO' ? (
                  <video
                    src={assetSrc(preview, true)}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[70vh] max-w-full"
                  />
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
                  <div className="flex justify-between gap-3"><dt>资源类型</dt><dd className="text-right text-[#1D1D1F]">{typeLabel(preview.type)}</dd></div>
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

      {/* 采集结果模态框：点击开始采集后自动打开，随 SSE 事件实时追加，可收起，也可由工具栏按钮重新打开 */}
      {collectPanelOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4"
          onClick={() => { if (!collecting) setCollectPanelOpen(false); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="采集结果"
            className={`w-full bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.24)] overflow-hidden transition-all ${
              collectPanelCollapsed ? 'max-w-lg' : 'max-w-2xl'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-12 px-5 flex items-center gap-2 border-b border-[#F2F2F7]">
              <button
                type="button"
                onClick={() => setCollectPanelCollapsed((collapsed) => !collapsed)}
                aria-label={collectPanelCollapsed ? '展开采集结果' : '收起采集结果'}
                className="text-[#6E6E73] hover:text-[#1D1D1F] shrink-0"
              >
                {collectPanelCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <span className="text-[14px] font-semibold text-[#1D1D1F]">采集结果</span>
              {collecting && <Loader2 className="w-3.5 h-3.5 animate-spin text-[#0071E3]" />}
              <span className="text-[11px] text-[#86868B] tabular-nums">
                {collectedResources.length}/{collectProgress.total || 0}
              </span>
              <button
                type="button"
                onClick={() => setCollectPanelOpen(false)}
                aria-label="关闭采集结果模态框"
                className="ml-auto text-[#86868B] hover:text-[#1D1D1F] shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {!collectPanelCollapsed && (
              <div className="p-5 space-y-3">
                {collectPhase === 'running' && (
                  <div className="h-1.5 rounded-full bg-[#F2F2F7] overflow-hidden">
                    <div
                      className="h-full bg-[#0071E3] transition-all"
                      style={{ width: `${collectProgress.total ? Math.round(collectProgress.index / collectProgress.total * 100) : 0}%` }}
                    />
                  </div>
                )}
                <p className="text-[12px] text-[#6E6E73]">
                  {collectProgress.message || '采集结果会在这里实时更新'}
                </p>
                <div className="max-h-[55vh] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {collectedResources.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-[12px] text-[#86868B]">
                      {collectPhase === 'running' ? '正在采集，资源入库后会立即显示' : '暂无采集结果'}
                    </div>
                  ) : collectedResources.map((resource) => (
                    <button
                      key={resource.id}
                      type="button"
                      onClick={() => setPreview(resource)}
                      className="w-full min-w-0 flex items-center gap-2 p-2 rounded-xl bg-[#F5F5F7] hover:bg-[#EDEDF1] text-left transition-colors"
                    >
                      <span className="w-10 h-10 rounded-lg bg-[#E5E5EA] overflow-hidden shrink-0 flex items-center justify-center">
                        {resource.type === 'VIDEO' ? (
                          <video src={assetSrc(resource)} muted playsInline preload="metadata" className="w-full h-full object-cover" />
                        ) : (
                          <img
                            src={assetSrc(resource)}
                            alt={resource.title}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className={`w-full h-full ${resource.type === 'ICON' || resource.type === 'SVG' ? 'object-contain' : 'object-cover'}`}
                            onError={() => handleImageError(resource)}
                          />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-medium text-[#1D1D1F] truncate">{resource.title || '未命名素材'}</span>
                        <span className="block text-[11px] text-[#86868B]">{typeLabel(resource.type)} · 已入库</span>
                      </span>
                      <Check className="w-3.5 h-3.5 text-[#248A3D] shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 删除确认：只删资源库记录，不触碰素材中心文件 */}
      {deleteTargets.length > 0 && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 px-4"
          onClick={() => { if (!deleting) setDeleteTargets([]); }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="删除确认"
            className="w-full max-w-md bg-white rounded-2xl shadow-[0_24px_60px_rgba(0,0,0,0.24)] p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-[#FF3B30]/10 text-[#D70015] flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-[#1D1D1F]">
                  删除 {deleteTargets.length} 个资源？
                </h3>
                <p className="mt-1 text-[12px] text-[#6E6E73]">
                  仅删除资源库记录，不会删除已加入素材中心的文件。
                </p>
              </div>
            </div>
            <div className="max-h-32 overflow-y-auto rounded-xl bg-[#F5F5F7] p-3 text-[12px] text-[#3A3A3C] space-y-1">
              {deleteTargets.slice(0, 8).map((item) => (
                <div key={item.id} className="truncate" title={item.title}>
                  {item.title || '未命名素材'}
                </div>
              ))}
              {deleteTargets.length > 8 && (
                <div className="text-[#86868B]">还有 {deleteTargets.length - 8} 个...</div>
              )}
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeleteTargets([])}
                className="h-9 px-4 rounded-xl border border-[#D2D2D7] bg-white text-[#3A3A3C] text-[13px] font-medium hover:bg-[#F5F5F7] disabled:opacity-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={() => void removeResources(deleteTargets.map((item) => item.id))}
                className="h-9 px-4 rounded-xl bg-[#D70015] hover:bg-[#FF3B30] text-white text-[13px] font-medium inline-flex items-center gap-2 disabled:opacity-50 transition-colors"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
