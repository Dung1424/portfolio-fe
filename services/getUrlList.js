/**
 * Admin API. Paths are relative to `root` = `NUXT_PUBLIC_API_BASE` + `/api/v1/admin`
 * (same as axios `baseURL` in `adminClient.ts`). Khớp `routes/admin.php`.
**/
export function getAdminPaths() {
  const raw = import.meta.env?.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
  const base = String(raw).replace(/\/$/, '')
  const root = `${base}/api/v1/admin`
  const enc = encodeURIComponent
  return {
    root,
    /** Public admin auth trong `api.php`: `/admin/Login` → base URL đã có `/admin` → `/Login` */
    login: '/Login',
    logout: '/Logout',
    dashboard: '/Dashboard/Get',
    statisticsPhotoStatus: '/Statistics/PhotoStatus',
    statisticsUserRegistrations: '/Statistics/UserRegistrations',
    statisticsPhotoUploads: '/Statistics/PhotoUploads',
    statisticsReports: '/Statistics/Reports',
    statisticsTopPhotosByLikes: '/Statistics/TopPhotosByLikes',
    statisticsTopPhotosByViews: '/Statistics/TopPhotosByViews',
    photos: '/Photo/List',
    photo: id => `/Photo/Detail/${id}`,
    photoComments: id => `/Photo/Comments/${id}`,
    createPhoto: '/Photo/Create',
    updatePhoto: id => `/Photo/Update/${id}`,
    deletePhoto: id => `/Photo/Delete/${id}`,
    patchPhotoStatus: (id, status) =>
      `/Photo/UpdateStatus/${id}/${enc(status)}`,
    pendingPhotos: '/Photo/ListPending',
    rejectedPhotos: '/Photo/ListRejected',
    categories: '/Category/List',
    category: id => `/Category/Detail/${id}`,
    createCategory: '/Category/Create',
    updateCategory: id => `/Category/Update/${id}`,
    deleteCategory: id => `/Category/Delete/${id}`,
    tags: '/Tag/List',
    tag: id => `/Tag/Detail/${id}`,
    createTag: '/Tag/Create',
    updateTag: id => `/Tag/Update/${id}`,
    deleteTag: id => `/Tag/Delete/${id}`,
    reportsPhotos: '/Report/ListPhotos',
    reportsComments: '/Report/ListComments',
    reportsGalleries: '/Report/ListGalleries',
    resolveReport: (id, action) =>
      `/Report/UpdateStatus/${id}/${enc(action)}`,
    users: '/User/List',
    usersInactive: '/User/ListInactive',
    unlockUser: id => `/User/Unlock/${id}`,
    userPhotos: id => `/User/Photos/${id}`,
    userGalleries: id => `/User/Galleries/${id}`,
    galleryPhotos: id => `/Gallery/Photos/${id}`,
    profile: '/Account/GetProfile',
    updateProfile: '/Account/UpdateProfile',
    changePassword: '/Account/UpdatePassword',
    contacts: '/Contact/List',
    replyContact: id => `/Contact/Reply/${id}`,
    blogs: '/Blog/List',
    blog: id => `/Blog/Detail/${id}`,
    createBlog: '/Blog/Create',
    updateBlog: id => `/Blog/Update/${id}`,
    deleteBlog: id => `/Blog/Delete/${id}`
  }
}

/**
 * Laravel API URL builder. Base host from NUXT_PUBLIC_API_BASE (no trailing slash).
 * Public routes: `routes/api.php` (prefix `api/v1`).
 */
export function getUrlList() {
  const raw = import.meta.env?.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
  const base = String(raw).replace(/\/$/, '')
  const baseUrl = `${base}/api/v1`
  /** Chat service (Node). `NUXT_PUBLIC_CHAT_API` ví dụ `http://localhost:3010` — REST dùng `/api/v1`, Socket.IO dùng gốc host (không path). */
  const chatRaw = import.meta.env?.NUXT_PUBLIC_CHAT_API || 'http://localhost:3010'
  const chatServerOrigin = String(chatRaw).replace(/\/$/, '')
  const chatApi = `${chatServerOrigin}/api/v1`
  const adminPaths = getAdminPaths()
  const enc = encodeURIComponent
  return {
    getPhotoData: `${baseUrl}/Photo/ListForYou`,
    getFollowData: `${baseUrl}/Follow/ListForYou`,
    getTopLikedPhotos: `${baseUrl}/Photo/ListTopLiked`,
    getTopUsersWithPhotos: `${baseUrl}/User/ListTopWithPhotos`,
    getTopCategories: `${baseUrl}/Category/ListTop`,
    getTopLikedGalleries: `${baseUrl}/Gallery/ListTopLiked`,
    getRecentFollowedPhotos: `${baseUrl}/Photo/ListRecentFollowed`,
    getRecentFollowedGalleries: `${baseUrl}/Gallery/ListRecentFollowed`,
    getLikedPhotos: `${baseUrl}/Like/ListPhotos`,
    getLikedGalleries: `${baseUrl}/Like/ListGalleries`,
    likePhoto: `${baseUrl}/Like/CreatePhoto`,
    deleteLike: like_id => `${baseUrl}/Like/Delete/${like_id}`,
    unlikePhoto: `${baseUrl}/Like/RemovePhoto`,
    likeGallery: `${baseUrl}/Like/CreateGallery`,
    unlikeGallery: `${baseUrl}/Like/RemoveGallery`,
    getUserNotifications: `${baseUrl}/Notification/List`,
    markNotificationAsRead: `${baseUrl}/Notification/MarkAsRead`,

    // auth user
    login: `${baseUrl}/User/Login`,
    register: `${baseUrl}/User/Register`,
    forgotPassword: `${baseUrl}/Auth/ForgotPassword`,
    resetPassword: `${baseUrl}/Auth/ResetPassword`,
    logout: `${baseUrl}/User/Logout`,
    refreshToken: `${baseUrl}/Auth/RefreshToken`,
    getUser: `${baseUrl}/User/Me`,

    updateProfile: `${baseUrl}/User/UpdateProfile`,
    changePassword: `${baseUrl}/User/ChangePassword`,
    getApprovedPhotos: `${baseUrl}/Photo/ListApproved`,
    deletePhoto: photo_id => `${baseUrl}/Photo/Delete/${photo_id}`,

    // gallery
    getGallery: `${baseUrl}/Gallery/List`,
    addPhotoToGallery: `${baseUrl}/Gallery/AddPhoto`,
    getGalleryDetails: galleries_code => `${baseUrl}/Gallery/Detail/${galleries_code}`,
    addGallery: `${baseUrl}/Gallery/Create`,
    editGallery: galleries_code => `${baseUrl}/Gallery/Update/${galleries_code}`,
    deleteGallery: galleries_code => `${baseUrl}/Gallery/Delete/${galleries_code}`,
    deletePhotoFromGallery: (galleries_code, photo_id) =>
      `${baseUrl}/Gallery/RemovePhoto/${galleries_code}/${photo_id}`,

    // photo details
    getPhotoDetail: token => `${baseUrl}/Photo/DetailByToken/${token}`,
    getCommentsByPhotoToken: token => `${baseUrl}/Comment/ListByPhotoToken/${token}`,
    getPhotoLikes: token => `${baseUrl}/Like/ListByPhotoToken/${token}`,
    // comment
    postComment: `${baseUrl}/Comment/Create`,
    deleteComment: commentId => `${baseUrl}/Comment/Delete/${commentId}`,

    // related photos and galleries
    getRelatedPhotos: token => `${baseUrl}/Photo/ListRelated/${token}`,
    getRelatedGalleries: token => `${baseUrl}/Gallery/ListRelated/${token}`,
    addPhoto: `${baseUrl}/Photo/Create`,
    getPhoto: photo_id => `${baseUrl}/Photo/Detail/${photo_id}`,
    editPhoto: photo_id => `${baseUrl}/Photo/Update/${photo_id}`,
    getCategories: `${baseUrl}/Category/List`,
    getTags: `${baseUrl}/Tag/List`,
    getUserByUserName: username => `${baseUrl}/User/DetailByUsername/${enc(username)}`,
    /** UUID / id user — chat peer, v.v. */
    getUserById: userId => `${baseUrl}/User/DetailById/${enc(String(userId))}`,
    getPhotosByUserName: username => `${baseUrl}/Photo/ListByUsername/${enc(username)}`,
    getGalleriesByUserName: username => `${baseUrl}/Gallery/ListByUsername/${enc(username)}`,
    getGalleryDetailUser: galleries_code => `${baseUrl}/Gallery/DetailByCode/${galleries_code}`,
    getTotalLikes: username => `${baseUrl}/User/TotalLikes/${enc(username)}`,
    getPhotosByCategorySlugs: slugs => `${baseUrl}/Category/ListPhotos?slugs=${slugs}`,
    searchPhotos: `${baseUrl}/Search/Photos`,
    searchGalleries: `${baseUrl}/Search/Galleries`,
    searchUsers: `${baseUrl}/Search/Users`,

    // follow/unfollow
    followUser: `${baseUrl}/Follow/Create`,
    unfollowUser: following_id => `${baseUrl}/Follow/Delete/${following_id}`,
    getFollowingList: `${baseUrl}/Follow/ListFollowing`,
    getFollowersList: `${baseUrl}/Follow/ListFollowers`,
    getFollowingUser: username => `${baseUrl}/Follow/ListFollowingByUsername/${enc(username)}`,
    getFollowersUser: username => `${baseUrl}/Follow/ListFollowersByUsername/${enc(username)}`,
    blockUser: `${baseUrl}/Block/Create`,
    unblockUser: `${baseUrl}/Block/Delete`,
    getBlockedUsers: `${baseUrl}/Block/List`,
    reportViolation: `${baseUrl}/Report/Create`,
    sendContact: `${baseUrl}/Contact/Create`,

    // blog
    getLatestBlogs: `${baseUrl}/Blog/ListLatest`,
    getOlderBlogs: `${baseUrl}/Blog/ListOlder`,
    getBlogDetails: slug => `${baseUrl}/Blog/Detail/${enc(slug)}`,

    // chat (Node + Mongo) — Bearer JWT; GET /health không cần Bearer
    /** Gốc `http://host:port` — socket.io-client kết nối tới đây */
    chatServerOrigin,
    chatApiRoot: chatApi,
    chatHealth: `${chatApi}/health`,
    /** Query: page, limit, folder (all | inbox | pending) */
    chatConversations: `${chatApi}/conversations`,
    chatConversationsUnreadSummary: `${chatApi}/conversations/unread-summary`,
    /** Body: { otherUserId } — profile / nút Chat */
    chatConversationEnsure: `${chatApi}/conversations/ensure`,
    /** Body direct: { type: "direct", peerUserId } hoặc group: { type: "group", participantIds[] } */
    chatConversationCreate: `${chatApi}/conversations`,
    chatConversation: conversationId =>
      `${chatApi}/conversations/${enc(String(conversationId))}`,
    /** Query: limit, before (ObjectId) */
    chatConversationMessages: conversationId =>
      `${chatApi}/conversations/${enc(String(conversationId))}/messages`,
    chatConversationRead: conversationId =>
      `${chatApi}/conversations/${enc(String(conversationId))}/read`,
    chatPresenceQuery: `${chatApi}/presence/query`,

    /** Base URL `.../api/admin` — alias của `getAdminPaths().root` */
    adminBase: adminPaths.root,
    /** Toàn bộ path admin (đồng bộ với `getAdminPaths()`) */
    adminPaths: adminPaths
  }
}

export default getUrlList
