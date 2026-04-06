/**
 * Laravel API URL builder. Base host from NUXT_PUBLIC_API_BASE (no trailing slash).
 */
export function getUrlList() {
  const raw = import.meta.env?.NUXT_PUBLIC_API_BASE || 'http://127.0.0.1:8000'
  const base = String(raw).replace(/\/$/, '')
  const baseUrl = `${base}/api`
  return {
    getPhotoData: `${baseUrl}/getPhotoData`,
    getFollowData: `${baseUrl}/getFollowData`,
    getTopLikedPhotos: `${baseUrl}/top-liked-photos`,
    getTopUsersWithPhotos: `${baseUrl}/top-users-with-photos`,
    getTopCategories: `${baseUrl}/top-categories`,
    getTopLikedGalleries: `${baseUrl}/top-liked-galleries`,
    getRecentFollowedPhotos: `${baseUrl}/recent-followed-photos`,
    getRecentFollowedGalleries: `${baseUrl}/recent-followed-galleries`,
    getLikedPhotos: `${baseUrl}/liked-photos`,
    getLikedGalleries: `${baseUrl}/liked-galleries`,
    likePhoto: `${baseUrl}/like-photo`,
    deleteLike: like_id => `${baseUrl}/like/${like_id}`,
    unlikePhoto: `${baseUrl}/unlike-photo`,
    likeGallery: `${baseUrl}/like-gallery`,
    unlikeGallery: `${baseUrl}/unlike-gallery`,
    getUserNotifications: `${baseUrl}/notifications`,
    markNotificationAsRead: `${baseUrl}/notifications/mark-as-read`,

    // auth user
    login: `${baseUrl}/login`,
    register: `${baseUrl}/register`,
    logout: `${baseUrl}/logout`,
    refreshToken: `${baseUrl}/refresh-token`,
    getUser: `${baseUrl}/user`,

    updateProfile: `${baseUrl}/update-profile`,
    changePassword: `${baseUrl}/change-password`,
    getApprovedPhotos: `${baseUrl}/approved-photos`,
    deletePhoto: photo_id => `${baseUrl}/photos/${photo_id}`,

    // gallery
    getGallery: `${baseUrl}/galleries`,
    addPhotoToGallery: `${baseUrl}/gallery/add-photo`,
    getGalleryDetails: `${baseUrl}/gallery-details`,
    addGallery: `${baseUrl}/add-gallery`,
    editGallery: `${baseUrl}/update-gallery`,
    deleteGallery: `${baseUrl}/delete-gallery`,
    deletePhotoFromGallery: (galleries_code, photo_id) =>
      `${baseUrl}/gallery/${galleries_code}/photo/${photo_id}`,

    // photo details
    getPhotoDetail: `${baseUrl}/getPhotoDetail`,
    getCommentsByPhotoToken: `${baseUrl}/comments`,
    getPhotoLikes: token => `${baseUrl}/photo-likes/${token}`,
    // comment
    postComment: `${baseUrl}/comments`,
    deleteComment: commentId => `${baseUrl}/comments/${commentId}`,

    // related photos and galleries
    getRelatedPhotos: token => `${baseUrl}/related-photos/${token}`,
    getRelatedGalleries: token => `${baseUrl}/related-galleries/${token}`,
    addPhoto: `${baseUrl}/add-photos`,
    getPhoto: photo_id => `${baseUrl}/photo/${photo_id}`,
    editPhoto: photo_id => `${baseUrl}/edit-photo/${photo_id}`,
    getCategories: `${baseUrl}/categories`,
    getTags: `${baseUrl}/tags`,
    getUserByUserName: username => `${baseUrl}/user-by-username/${username}`,
    getPhotosByUserName: username => `${baseUrl}/photos-by-username/${username}`,
    getGalleriesByUserName: username => `${baseUrl}/galleries-by-username/${username}`,
    getGalleryDetailUser: galleries_code => `${baseUrl}/gallery-details-user/${galleries_code}`,
    getTotalLikes: username => `${baseUrl}/total-likes/${username}`,
    getPhotosByCategorySlugs: slugs => `${baseUrl}/categories/photos?slugs=${slugs}`,
    searchPhotos: `${baseUrl}/search-photos`,

    // follow/unfollow
    followUser: `${baseUrl}/follow`,
    unfollowUser: following_id => `${baseUrl}/unfollow/${following_id}`,
    getFollowingList: `${baseUrl}/following-list`,
    getFollowersList: `${baseUrl}/followers-list`,
    getFollowingUser: username => `${baseUrl}/getFollowingUser/${username}`,
    getFollowersUser: username => `${baseUrl}/getFollowersUser/${username}`,
    blockUser: `${baseUrl}/block`,
    unblockUser: `${baseUrl}/unblock`,
    getBlockedUsers: `${baseUrl}/blocked-users`,
    reportViolation: `${baseUrl}/report`,
    sendContact: `${baseUrl}/contact`,

    // blog
    getLatestBlogs: `${baseUrl}/blogs/latest`,
    getOlderBlogs: `${baseUrl}/blogs/older`,
    getBlogDetails: slug => `${baseUrl}/blog/details/${slug}`
  }
}

export default getUrlList
