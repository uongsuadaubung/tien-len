import type {
  GithubUser,
  Gist,
  GistListItem,
  SyncResponse,
  TienLenSaveData,
  GistHistoryItem
} from './types';
import { compressSaveData, parseGistContent } from './compression';

export const GITHUB_API_BASE = 'https://api.github.com';
export const GIST_DESCRIPTION = 'Tien Len Mien Nam - Cloud Save Data';
export const GIST_FILE_NAME = 'tienlen_save.json';

/**
 * Thực hiện request đến GitHub API v3
 */
async function githubRequest<T = unknown>(
  token: string,
  path: string,
  options: RequestInit = {}
): Promise<T> {
  if (!token) {
    throw new Error('Chưa cấu hình GitHub Token');
  }

  const response = await fetch(`${GITHUB_API_BASE}${path}`, {
    ...options,
    cache: 'no-store',
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    let errorMsg = `GitHub API Error (${response.status})`;
    try {
      const errorJson = await response.json();
      if (errorJson && typeof errorJson === 'object' && 'message' in errorJson) {
        errorMsg = String(errorJson.message);
      }
    } catch {}

    if (response.status === 401) {
      throw new Error('GitHub Token không hợp lệ hoặc đã hết hạn.');
    }
    if (response.status === 404) {
      throw new Error('Không tìm thấy tài nguyên trên GitHub.');
    }
    throw new Error(errorMsg);
  }

  const data: T = await response.json();
  return data;
}

/**
 * Xác thực GitHub Token và lấy thông tin Profile người dùng
 */
export async function validateToken(token: string): Promise<SyncResponse<{ user: GithubUser }>> {
  try {
    const trimmed = token.trim();
    if (!trimmed) {
      return { success: false, error: 'Token không được để trống.' };
    }

    const raw = await githubRequest<{
      login: string;
      name: string | null;
      bio: string | null;
      avatar_url: string;
    }>(trimmed, '/user');

    const user: GithubUser = {
      login: raw.login,
      name: raw.name || null,
      bio: raw.bio || null,
      avatar_url: raw.avatar_url
    };

    return { success: true, user };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

/**
 * Tìm Gist ID đã tồn tại chứa file lưu của game
 */
export async function findGistId(token: string): Promise<string> {
  try {
    const gists = await githubRequest<GistListItem[]>(token, '/gists');
    const target = gists.find(
      (g) => g.description === GIST_DESCRIPTION && GIST_FILE_NAME in g.files
    );
    return target ? target.id : '';
  } catch {
    return '';
  }
}

/**
 * Lấy Gist ID đã lưu hoặc tìm kiếm trên tài khoản GitHub
 */
export async function getOrFindGistId(token: string, cachedId: string | null = null): Promise<string> {
  if (cachedId) return cachedId;
  const found = await findGistId(token);
  return found;
}

/**
 * Lấy chi tiết Gist theo ID
 */
export async function getGist(token: string, gistId: string): Promise<Gist> {
  return await githubRequest<Gist>(token, `/gists/${gistId}`);
}

/**
 * Tạo một Gist bí mật mới để lưu game data
 */
async function createGist(token: string, content: string): Promise<Gist> {
  return await githubRequest<Gist>(token, '/gists', {
    method: 'POST',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      public: false,
      files: {
        [GIST_FILE_NAME]: {
          content
        }
      }
    })
  });
}

/**
 * Cập nhật Gist hiện có
 */
async function updateGist(token: string, gistId: string, content: string): Promise<Gist> {
  return await githubRequest<Gist>(token, `/gists/${gistId}`, {
    method: 'PATCH',
    body: JSON.stringify({
      description: GIST_DESCRIPTION,
      files: {
        [GIST_FILE_NAME]: {
          content
        }
      }
    })
  });
}

/**
 * Đẩy dữ liệu Save Data lên GitHub Gist
 */
export async function uploadToGist(
  token: string,
  data: TienLenSaveData,
  cachedGistId: string | null = null
): Promise<SyncResponse<{ gistId: string }>> {
  try {
    let gistId = cachedGistId || (await findGistId(token));
    const content = await compressSaveData(data);

    if (gistId) {
      await updateGist(token, gistId, content);
    } else {
      const created = await createGist(token, content);
      gistId = created.id;
    }

    return { success: true, gistId };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Tải dữ liệu Save Data từ GitHub Gist về
 */
export async function downloadFromGist(
  token: string,
  cachedGistId: string | null = null
): Promise<SyncResponse<{ data: TienLenSaveData; gistId: string; updatedAt: number }>> {
  try {
    const gistId = cachedGistId || (await findGistId(token));
    if (!gistId) {
      return { success: false, error: 'Chưa tìm thấy bản lưu nào trên GitHub Gist của bạn.' };
    }

    const gist = await getGist(token, gistId);
    const file = gist.files[GIST_FILE_NAME];
    if (!file) {
      return { success: false, error: 'Không tìm thấy file lưu trữ trong Gist.' };
    }

    // Xử lý trường hợp file bị cắt (truncated) khi dung lượng lớn
    const rawContent =
      file.content ||
      (file.raw_url
        ? await fetch(file.raw_url, { cache: 'no-store' }).then((r) => r.text())
        : '');

    const data = await parseGistContent(rawContent || '');
    const updatedAt = new Date(gist.updated_at).getTime();

    return { success: true, data, gistId, updatedAt };
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Tải danh sách lịch sử sao lưu (5 commits gần nhất) từ Gist
 */
export async function fetchGistHistory(
  token: string,
  cachedGistId: string | null = null
): Promise<GistHistoryItem[]> {
  const gistId = cachedGistId || (await findGistId(token));
  if (!gistId) return [];

  try {
    const commits = await githubRequest<Array<{ version: string; committed_at: string }>>(
      token,
      `/gists/${gistId}/commits`
    );

    const latestCommits = commits.slice(0, 5);

    const items: GistHistoryItem[] = await Promise.all(
      latestCommits.map(async (commit) => {
        try {
          const detail = await githubRequest<Gist>(token, `/gists/${gistId}/${commit.version}`);
          const file = detail.files[GIST_FILE_NAME];
          if (!file) {
            return {
              success: false,
              version: commit.version,
              committedAt: commit.committed_at,
              error: 'Không có file dữ liệu'
            };
          }

          const rawContent =
            file.content ||
            (file.raw_url
              ? await fetch(file.raw_url, { cache: 'no-store' }).then((r) => r.text())
              : '');

          const saveData = await parseGistContent(rawContent || '');
          if (!saveData) {
            return {
              success: false,
              version: commit.version,
              committedAt: commit.committed_at,
              error: 'Dữ liệu không thể giải mã'
            };
          }

          return {
            success: true,
            version: commit.version,
            committedAt: commit.committed_at,
            saveData
          };
        } catch (err: unknown) {
          return {
            success: false,
            version: commit.version,
            committedAt: commit.committed_at,
            error: err instanceof Error ? err.message : String(err)
          };
        }
      })
    );

    return items;
  } catch {
    return [];
  }
}
