import adminHttp from '~/features/admin/services/adminClient'
import { getAdminPaths } from '~/services/getUrlList.js'

const p = getAdminPaths()

/**
 * Body sau khi axios unwrap envelope: { tags: Tag[] } hoặc { tags: { data, ... } } (paginator).
 */
export function tagsListFromAdminBody(inner) {
  return tagsTablePayloadFromAdminBody(inner).data
}

/** Payload cho bảng + AdminPager (luôn có .data là mảng bản ghi). */
export function tagsTablePayloadFromAdminBody(inner) {
  if (inner == null || typeof inner !== 'object') {
    return { data: [], current_page: 1, last_page: 1, per_page: 15, total: 0 }
  }
  const bucket = inner.tags ?? inner
  if (Array.isArray(bucket)) {
    const n = bucket.length
    return {
      data: bucket,
      current_page: 1,
      last_page: 1,
      per_page: n || 15,
      total: n
    }
  }
  if (bucket && typeof bucket === 'object' && Array.isArray(bucket.data)) {
    return bucket
  }
  return { data: [], current_page: 1, last_page: 1, per_page: 15, total: 0 }
}

export const tagsAdminApi = {
  tags: query => adminHttp.get(p.tags, { params: query }),
  tag: id => adminHttp.get(p.tag(id)),
  createTag: body => adminHttp.post(p.createTag, body),
  updateTag: (id, body) => adminHttp.put(p.updateTag(id), body),
  deleteTag: id => adminHttp.delete(p.deleteTag(id))
}
