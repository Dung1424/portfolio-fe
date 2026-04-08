<template>
    <div class="grid w-full grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5">
        <button
            type="button"
            class="group flex min-h-[260px] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-zinc-200 bg-gradient-to-b from-white to-zinc-50/90 p-6 text-center shadow-sm transition hover:border-[#0870d1]/35 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0870d1]/35 focus-visible:ring-offset-2"
            @click="$emit('create-gallery')"
        >
            <span
                class="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-[#0870d1] shadow-sm ring-1 ring-zinc-200/90 transition group-hover:ring-[#0870d1]/25"
            >
                <i class="fa-regular fa-square-plus text-2xl" aria-hidden="true" />
            </span>
            <span class="text-[15px] font-semibold tracking-tight text-zinc-900">New gallery</span>
            <span class="mt-1 max-w-[12rem] text-xs leading-relaxed text-zinc-500">
                Group photos into a collection
            </span>
            <span
                class="mt-5 inline-flex items-center justify-center rounded-full bg-[#0870d1] px-5 py-2 text-xs font-semibold text-white shadow-sm transition group-hover:bg-[#0658b0]"
            >
                Create gallery
            </span>
        </button>

        <div
            v-for="gallery in galleries"
            :key="gallery.id"
            class="group flex cursor-pointer flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-zinc-900/5 transition hover:shadow-md hover:ring-zinc-900/10"
            :data-visibility="gallery.visibility"
            role="button"
            tabindex="0"
            @click="$emit('go-to-gallery-details', gallery.galleries_code)"
            @keydown.enter="$emit('go-to-gallery-details', gallery.galleries_code)"
            @keydown.space.prevent="$emit('go-to-gallery-details', gallery.galleries_code)"
        >
            <div class="flex items-start justify-between gap-2.5 px-3.5 pb-0 pt-3.5">
                <h4
                    class="m-0 min-h-[2.75rem] min-w-0 flex-1 text-left text-sm font-semibold leading-snug text-zinc-900 line-clamp-2"
                >
                    {{ gallery.galleries_name }}
                </h4>
                <div
                    class="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#0870d1] px-2 py-1 text-white shadow-sm"
                    title="Photos in gallery"
                >
                    <i class="fa-solid fa-images text-[11px] opacity-95" aria-hidden="true" />
                    <span class="text-xs font-semibold tabular-nums">{{ gallery.photo.length }}</span>
                </div>
            </div>

            <div class="relative mt-3 px-2">
                <div
                    v-if="gallery.photo.length === 0"
                    class="flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-zinc-100 ring-1 ring-inset ring-zinc-200/80"
                >
                    <i class="fa-regular fa-image text-3xl text-zinc-300" aria-hidden="true" />
                    <p class="m-0 mt-2 text-xs font-medium text-zinc-400">No photos yet</p>
                </div>
                <div
                    v-else-if="gallery.photo.length === 1"
                    class="aspect-square w-full overflow-hidden rounded-xl bg-zinc-100 ring-1 ring-inset ring-black/5"
                >
                    <img
                        :src="gallery.photo[0].image_url"
                        :alt="gallery.photo[0].title"
                        class="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                    />
                </div>
                <div v-else class="aspect-square w-full overflow-hidden rounded-xl bg-zinc-200 p-0.5 ring-1 ring-inset ring-black/5">
                    <div class="grid h-full grid-cols-2 grid-rows-2 gap-0.5">
                        <img
                            v-for="photo in gallery.photo.slice(0, 4)"
                            :key="photo.id"
                            :src="photo.image_url"
                            :alt="photo.title"
                            class="h-full w-full object-cover"
                        />
                    </div>
                </div>

                <button
                    type="button"
                    class="absolute bottom-2.5 right-2.5 z-20 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-200/90 bg-white/95 text-zinc-600 shadow-md backdrop-blur-sm transition hover:bg-white hover:text-zinc-900"
                    :class="activeDropdown === 'dropdown-' + gallery.id ? 'text-[#0870d1] ring-2 ring-[#0870d1]/30' : ''"
                    :aria-expanded="activeDropdown === 'dropdown-' + gallery.id"
                    aria-label="Gallery actions"
                    @click.stop="$emit('toggle-dropdown', 'dropdown-' + gallery.id)"
                >
                    <i class="fa-solid fa-ellipsis text-sm" />
                </button>
                <div
                    v-if="activeDropdown === 'dropdown-' + gallery.id"
                    class="absolute bottom-11 right-2 z-50 min-w-[180px] overflow-hidden rounded-xl border border-zinc-200 bg-white py-1 shadow-xl ring-1 ring-black/5"
                    @click.stop
                >
                    <ul class="m-0 list-none p-0">
                        <li
                            class="cursor-pointer px-4 py-2.5 text-sm text-zinc-800 transition hover:bg-zinc-50"
                            @click.stop="$emit('edit-gallery', gallery.galleries_code)"
                        >
                            <i class="fas fa-edit mr-2 w-4 text-zinc-400" aria-hidden="true" /> Edit
                        </li>
                        <li
                            class="cursor-pointer px-4 py-2.5 text-sm text-red-600 transition hover:bg-red-50"
                            @click.stop="$emit('delete-gallery', gallery)"
                        >
                            <i class="fas fa-trash-alt mr-2 w-4" aria-hidden="true" /> Delete
                        </li>
                    </ul>
                </div>
            </div>

            <div
                class="mt-auto flex min-h-[3rem] items-center justify-between gap-2 border-t border-zinc-100 px-3 py-2.5"
                @click.stop
            >
                <div class="flex min-w-0 flex-1 items-center gap-2.5">
                    <img
                        class="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                        :src="gallery.user?.profile_picture || '/default-avatar.jpg'"
                        alt=""
                    />
                    <span class="truncate text-sm font-medium text-zinc-900">{{ gallery.user?.username || 'Anonymous' }}</span>
                </div>
                <span
                    class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-100 text-zinc-500"
                    :title="gallery.visibility === 0 ? 'Public' : 'Private'"
                >
                    <i
                        :class="gallery.visibility === 0 ? 'fa-regular fa-eye text-sm' : 'fa-solid fa-lock text-sm'"
                        aria-hidden="true"
                    />
                </span>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'GalleryAccountGrid',
    emits: [
        'create-gallery',
        'go-to-gallery-details',
        'toggle-dropdown',
        'edit-gallery',
        'delete-gallery',
    ],
    props: {
        galleries: {
            type: Array,
            required: true,
        },
        activeDropdown: {
            type: String,
            default: null,
        },
    },
};
</script>
