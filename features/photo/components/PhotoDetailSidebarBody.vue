<template>
    <div class="w-full space-y-4">
        <!-- Chi tiết ảnh -->
        <div class="rounded-2xl border border-[#eee] bg-white px-4 py-4 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
            <h3 class="text-lg font-bold leading-snug text-[#222] sm:text-xl">{{ pd.photoDetail.title }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-[#666]">{{ pd.photoDetail.description }}</p>
            <ul class="mt-4 space-y-2 border-t border-[#eee] pt-4 text-sm text-[#444]">
                <li class="flex items-start gap-2">
                    <i class="fa-solid fa-location-dot mt-0.5 w-4 shrink-0 text-center text-[#999]"></i>
                    <span>{{ pd.photoDetail.location }}</span>
                </li>
                <li class="flex items-start gap-2">
                    <i class="fa-solid fa-calendar-days mt-0.5 w-4 shrink-0 text-center text-[#999]"></i>
                    <span>{{ pd.formatDate(pd.photoDetail.upload_date) }}</span>
                </li>
                <li class="flex cursor-pointer items-center gap-2 rounded-md px-0.5 py-0.5 transition duration-200 hover:bg-[#f7f8fa]" @click="pd.showLikesPopup">
                    <i class="fa-regular fa-heart w-4 shrink-0 text-center text-[#999]"></i>
                    <span>{{ pd.formattedPhotoLikes }} Likes</span>
                    <span class="text-[#bbb]">&gt;</span>
                </li>
                <li class="flex items-start gap-2">
                    <i class="fa-regular fa-eye mt-0.5 w-4 shrink-0 text-center text-[#999]"></i>
                    <span>{{ pd.formattedViews }} Impressions</span>
                </li>
                <li class="flex items-start gap-2 text-[#888]">
                    <i class="fa-solid fa-arrow-up mt-0.5 w-4 shrink-0 text-center"></i>
                    <span>{{ pd.getTimeAgo(pd.photoDetail.upload_date) }}</span>
                </li>
            </ul>
        </div>

        <!-- Tác giả — 500px-style -->
        <div class="flex flex-col items-center rounded-2xl bg-white px-5 py-6 text-center shadow-[0_2px_12px_rgba(15,23,42,0.07)]">
            <NuxtLink
                :to="{ name: 'MyProfile', params: { username: pd.photoDetail.user.username || 'defaultUsername' } }"
                class="block shrink-0 no-underline decoration-transparent transition-colors duration-200 hover:!no-underline focus:!no-underline visited:text-inherit"
            >
                <span class="inline-block rounded-full bg-white p-[3px] ring-2 ring-[#40c1df] [box-shadow:0_0_0_2px_#fff]">
                    <img
                        :src="pd.photoDetail.user.profile_picture ? pd.apiOrigin + pd.photoDetail.user.profile_picture : '/images/imageUserDefault.png'"
                        alt=""
                        class="block h-16 w-16 rounded-full object-cover"
                    />
                </span>
            </NuxtLink>
            <NuxtLink
                :to="{ name: 'MyProfile', params: { username: pd.photoDetail.user.username || 'defaultUsername' } }"
                class="mt-4 block max-w-full no-underline decoration-transparent transition-colors duration-200 hover:!no-underline hover:text-[#3470d1] focus:!no-underline visited:text-gray-900"
            >
                <h3 class="truncate text-base font-bold leading-snug text-gray-900">
                    {{ pd.photoDetail.user.username }}
                </h3>
            </NuxtLink>
            <p v-if="pd.photoDetail.user.location" class="mt-1 text-sm lowercase leading-snug text-gray-600">
                {{ pd.photoDetail.user.location }}
            </p>
            <button
                v-if="pd.photoDetail.user.id !== pd.userStore.user?.id"
                type="button"
                class="mt-5 rounded-full px-8 py-2 text-sm font-bold no-underline transition-colors duration-200 hover:!no-underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3470d1]/35 focus-visible:ring-offset-2 active:scale-[0.99]"
                :class="
                    pd.isFollowing
                        ? 'border-2 border-[#3470d1] bg-white text-[#3470d1] hover:border-[#2859a8] hover:bg-[#eef4fb] hover:text-[#2859a8]'
                        : 'bg-[#3470d1] text-white hover:bg-[#2859a8]'
                "
                @click="pd.toggleFollow"
            >
                {{ pd.isFollowing ? 'Unfollow' : 'Follow' }}
            </button>
        </div>

        <!-- Bình luận -->
        <div class="rounded-2xl bg-white px-4 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
            <p class="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#9ca3af]">Comments</p>

            <div class="flex flex-col items-center gap-3">
                <div class="h-14 w-14 shrink-0 overflow-hidden rounded-full bg-[#d1d5db] ring-2 ring-white ring-offset-1 ring-offset-[#f3f4f6]">
                    <img
                        v-if="pd.userStore.user?.profile_picture"
                        :src="pd.apiOrigin + pd.userStore.user.profile_picture"
                        alt=""
                        class="h-full w-full object-cover"
                    />
                    <div v-else class="flex h-full w-full items-center justify-center">
                        <i class="fa-solid fa-user text-2xl text-white"></i>
                    </div>
                </div>
                <input
                    ref="commentInput"
                    v-model="pd.newComment"
                    type="text"
                    class="w-full rounded-md border border-[#d1d5db] bg-white px-3 py-2.5 text-sm leading-snug text-[#222] placeholder:text-[#9ca3af] transition-colors duration-200 focus:border-[#38bdf8] focus:outline-none focus:ring-2 focus:ring-[#38bdf8]/20"
                    placeholder="Write your comment here"
                    @focus="pd.showButtons = true"
                    @keydown.enter.prevent
                />
                <div v-if="pd.showButtons" class="flex w-full justify-end gap-2">
                    <button
                        type="button"
                        class="rounded-full px-4 py-1.5 text-sm font-medium text-[#6b7280] no-underline transition-colors duration-200 hover:!no-underline hover:bg-[#f3f4f6]"
                        @click="pd.cancelComment"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        class="rounded-full bg-[#0ea5e9] px-5 py-1.5 text-sm font-semibold text-white no-underline shadow-sm transition-colors duration-200 hover:!no-underline hover:bg-[#0284c7] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                        :disabled="!pd.newComment.trim()"
                        @click="pd.postComment"
                    >
                        Post
                    </button>
                </div>
            </div>

            <div v-if="pd.comments.length === 0" class="mt-5 rounded-lg border border-dashed border-[#e5e7eb] bg-[#fafafa] px-3 py-5 text-center">
                <i class="fa-regular fa-comment mb-2 text-2xl text-[#0ea5e9]/80"></i>
                <p class="text-sm font-medium text-[#374151]">No comments yet</p>
                <p class="mt-0.5 text-xs text-[#9ca3af]">Be the first to share your thoughts.</p>
            </div>

            <template v-else>
                <p class="mb-3 mt-5 text-sm font-bold text-[#374151]">
                    {{ pd.total }} {{ pd.total === 1 ? 'Comment' : 'Comments' }}
                </p>
                <ul class="divide-y divide-[#eee]">
                    <li v-for="comment in pd.comments" :key="comment.id" class="py-3 first:pt-0">
                        <div class="flex gap-2.5">
                            <img
                                :src="comment?.user?.profile_picture ? pd.apiOrigin + comment.user.profile_picture : '/images/imageUserDefault.png'"
                                alt=""
                                class="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-[#eee]"
                            />
                            <div class="min-w-0 flex-1">
                                <div class="flex items-start justify-between gap-2">
                                    <span class="text-sm font-bold text-[#222]">{{
                                        comment?.user?.name || comment?.user?.username || 'Unknown User'
                                    }}</span>
                                    <div class="relative shrink-0">
                                        <button
                                            type="button"
                                            class="rounded p-1 text-[#9ca3af] transition-colors duration-200 hover:bg-[#f3f4f6] hover:text-[#4b5563]"
                                            aria-label="Comment options"
                                            @click.stop="pd.toggleDropdown('dropdown-' + comment.id)"
                                        >
                                            <i class="fa-solid fa-ellipsis text-sm"></i>
                                        </button>
                                        <div
                                            v-if="pd.activeDropdown === 'dropdown-' + comment.id"
                                            class="absolute right-0 top-full z-[1000] mt-1 w-44 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 shadow-lg"
                                            @click.stop
                                        >
                                            <button
                                                v-if="comment.user.id !== pd.userStore.user.id"
                                                type="button"
                                                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-800 hover:bg-[#1890ff] hover:text-white"
                                                @click="pd.handleClick('reportComment', comment.id, comment.user.id)"
                                            >
                                                <i class="fa-regular fa-flag w-4"></i> Report
                                            </button>
                                            <button
                                                v-if="comment.user.id === pd.userStore.user.id"
                                                type="button"
                                                class="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-zinc-800 hover:bg-[#1890ff] hover:text-white"
                                                @click="pd.showDeleteConfirm(comment)"
                                            >
                                                <i class="fa-solid fa-trash-can w-4"></i> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="mt-1.5 border-l-2 border-[#bae6fd] pl-3">
                                    <p class="text-sm leading-relaxed text-[#555]">{{ comment.comment_text }}</p>
                                    <div class="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                                        <span class="text-xs text-[#9ca3af]">{{ pd.getTimeAgo(comment.created_at) }}</span>
                                        <button
                                            type="button"
                                            class="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0ea5e9] no-underline transition-colors duration-200 hover:!no-underline hover:text-[#0284c7]"
                                            @click="pd.focusCommentInput"
                                        >
                                            <i class="fa-regular fa-comment"></i>
                                            Reply
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                </ul>
                <div v-if="pd.total > 0" class="mt-4 flex flex-col items-center gap-2 border-t border-[#eee] pt-3">
                    <button
                        v-if="pd.currentPage < pd.lastPage"
                        type="button"
                        class="text-sm font-medium text-[#0ea5e9] no-underline transition-colors duration-200 hover:!no-underline hover:text-[#0284c7]"
                        @click="pd.loadMoreComments"
                    >
                        Read more
                    </button>
                    <button
                        v-if="pd.currentPage >= pd.lastPage && pd.total > 3"
                        type="button"
                        class="text-sm font-medium text-[#6b7280] no-underline transition-colors duration-200 hover:!no-underline hover:text-[#374151]"
                        @click="pd.readLessComments"
                    >
                        Show less
                    </button>
                </div>
            </template>
        </div>

        <!-- Danh mục -->
        <div class="rounded-2xl bg-white px-4 py-4 shadow-[0_2px_12px_rgba(15,23,42,0.06)]">
            <h5 class="mb-3 text-sm leading-snug text-gray-600">
                <span class="font-normal">Category :</span>
                <span v-if="pd.photoDetail.category" class="ml-1 font-bold text-gray-900">{{ pd.photoDetail.category.category_name }}</span>
            </h5>
            <div class="flex flex-wrap gap-2">
                <NuxtLink
                    v-for="category in pd.categories"
                    :key="category.id"
                    :to="{ name: 'DetailsCategory', query: { slugs: category.slug } }"
                    class="inline-block rounded-full border border-[#cfd8e3] !bg-[#e8f1f8] px-4 py-2 text-sm font-bold text-[#4b5563] no-underline transition-colors duration-200 hover:!no-underline hover:border-[#3b82f6] hover:!bg-white hover:text-[#2563eb] visited:!bg-[#e8f1f8] visited:text-[#4b5563]"
                >
                    {{ category.category_name }}
                </NuxtLink>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PhotoDetailSidebarBody',
    inject: ['pd'],
}
</script>
