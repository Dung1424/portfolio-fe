<template>
    <div class="relative rounded-2xl border border-[#eee] bg-white px-2 py-3 shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
        <div class="flex items-center justify-evenly gap-1">
            <button
                type="button"
                class="rounded-lg p-2.5 text-lg text-[#444] transition duration-200 ease-out hover:bg-[#f7f8fa] hover:text-[#ff5a5f]"
                @click="pd.handleClick('toggleLike', pd.photoDetail)"
            >
                <i :class="['fa-heart', pd.photoDetail.liked ? 'fas text-[#ff5a5f]' : 'far']"></i>
            </button>
            <button
                type="button"
                class="rounded-lg p-2.5 text-lg text-[#444] transition duration-200 ease-out hover:bg-[#f7f8fa]"
                @click="pd.copyUrlToClipboard"
            >
                <i class="fa-solid fa-share-nodes"></i>
            </button>
            <button
                type="button"
                class="rounded-lg p-2.5 text-lg text-[#444] transition duration-200 ease-out hover:bg-[#f7f8fa]"
                @click="pd.handleClick('addToGallery', pd.photoDetail.id)"
            >
                <i class="fas fa-plus"></i>
            </button>
            <button
                v-if="pd.photoDetail.user.id !== pd.userStore.user.id"
                type="button"
                class="rounded-lg p-2.5 text-lg text-[#444] transition duration-200 ease-out hover:bg-[#f7f8fa]"
                @click.stop="pd.toggleDropdown('dropdown-' + pd.photoDetail.id, $event)"
                :class="{ 'ring-2 ring-zinc-200': pd.activeDropdown === 'dropdown-' + pd.photoDetail.id }"
            >
                <i class="fa-solid fa-ellipsis"></i>
            </button>
        </div>
        <div
            v-if="pd.activeDropdown === 'dropdown-' + pd.photoDetail.id"
            class="absolute left-2 right-2 z-[1000] overflow-hidden rounded-lg border border-zinc-200 bg-white py-0.5 shadow-lg"
            :class="dropdownUp ? 'bottom-full mb-1' : 'top-full mt-1'"
            @click.stop
        >
            <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-[#1890ff] hover:text-white"
                @click="pd.handleClick('reportPhoto', pd.photoDetail.id, pd.photoDetail.user.id)"
            >
                <i class="fa-regular fa-flag w-5"></i> Report this photo
            </button>
            <button
                type="button"
                class="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-800 transition hover:bg-[#1890ff] hover:text-white"
                @click="pd.toggleBlockUser(pd.photoDetail.user)"
            >
                <i class="fas fa-user-slash w-5"></i> Block User
            </button>
        </div>
    </div>
</template>

<script>
export default {
    name: 'PhotoDetailActionsBar',
    inject: ['pd'],
    props: {
        dropdownUp: {
            type: Boolean,
            default: false,
        },
    },
}
</script>
