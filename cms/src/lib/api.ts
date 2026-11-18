import type {
  ArticleItem,
  DashboardPayload,
  ImageTextItem,
  LoginActivity,
  UserProfile,
  VideoItem,
} from '../types/cms.ts';

const TOKEN_STORAGE_KEY = 'cuestudio_auth_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
    }
  } catch {
    // ignore storage restriction
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `请求失败 (${res.status})`);
  }
  return data as T;
}

export function uploadFileWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<{ url: string; filename: string; size: number; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload');
    const token = getStoredToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }
    xhr.setRequestHeader('X-File-Name', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) {
        onProgress(Math.min(99, Math.round((evt.loaded / evt.total) * 100)));
      }
    };

    xhr.onload = () => {
      try {
        const parsed = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          onProgress?.(100);
          resolve(parsed);
        } else {
          reject(new Error(parsed.error || '上传失败'));
        }
      } catch {
        reject(new Error('解析上传响应失败'));
      }
    };

    xhr.onerror = () => reject(new Error('网络异常，上传中断'));
    xhr.send(file);
  });
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: UserProfile }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: UserProfile; logs: LoginActivity[] }>('/api/auth/me'),
  logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  updateProfile: (payload: Partial<UserProfile>) =>
    request<{ user: UserProfile }>('/api/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  updatePassword: (currentPassword: string, newPassword: string) =>
    request<{ ok: boolean }>('/api/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    }),

  getDashboard: () => request<DashboardPayload>('/api/dashboard'),
  trackView: (type: 'video' | 'imagetext' | 'article', id: string) =>
    request<{ todayPV: number }>('/api/visitors/track', {
      method: 'POST',
      body: JSON.stringify({ type, id }),
    }),

  getVideos: () => request<{ items: VideoItem[] }>('/api/videos'),
  createVideo: (payload: Partial<VideoItem>) =>
    request<{ item: VideoItem }>('/api/videos', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateVideo: (id: string, payload: Partial<VideoItem>) =>
    request<{ item: VideoItem }>(`/api/videos/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteVideo: (id: string) =>
    request<{ ok: boolean }>(`/api/videos/${id}`, { method: 'DELETE' }),

  getImageTexts: () => request<{ items: ImageTextItem[] }>('/api/imagetexts'),
  createImageText: (payload: Partial<ImageTextItem>) =>
    request<{ item: ImageTextItem }>('/api/imagetexts', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateImageText: (id: string, payload: Partial<ImageTextItem>) =>
    request<{ item: ImageTextItem }>(`/api/imagetexts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteImageText: (id: string) =>
    request<{ ok: boolean }>(`/api/imagetexts/${id}`, { method: 'DELETE' }),

  getArticles: () => request<{ items: ArticleItem[] }>('/api/articles'),
  createArticle: (payload: Partial<ArticleItem>) =>
    request<{ item: ArticleItem }>('/api/articles', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateArticle: (id: string, payload: Partial<ArticleItem>) =>
    request<{ item: ArticleItem }>(`/api/articles/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteArticle: (id: string) =>
    request<{ ok: boolean }>(`/api/articles/${id}`, { method: 'DELETE' }),
};
