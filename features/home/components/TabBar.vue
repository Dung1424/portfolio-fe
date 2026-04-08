<template>
  <div
    class="sticky top-[52px] z-40 flex justify-center border-b border-zinc-100 bg-white py-5 shadow-[0_1px_0_0_rgba(0,0,0,0.04)] backdrop-blur-sm supports-[backdrop-filter]:bg-white/90 sm:py-6"
  >
    <div class="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
      <button
        v-if="isLoggedIn"
        type="button"
        class="rounded-full px-4 py-2 text-[15px] transition"
        :class="activeItem === 'following'
          ? 'bg-sky-100 font-bold text-zinc-900'
          : 'font-medium text-zinc-600 hover:text-zinc-900'"
        @click="setActive('following')"
      >
        Following
      </button>
      <button
        type="button"
        class="rounded-full px-4 py-2 text-[15px] transition"
        :class="activeItem === 'forYou'
          ? 'bg-sky-100 font-bold text-zinc-900'
          : 'font-medium text-zinc-600 hover:text-zinc-900'"
        @click="setActive('forYou')"
      >
        For You
      </button>
      <button
        type="button"
        class="rounded-full px-4 py-2 text-[15px] transition"
        :class="activeItem === 'explore'
          ? 'bg-sky-100 font-bold text-zinc-900'
          : 'font-medium text-zinc-600 hover:text-zinc-900'"
        @click="setActive('explore')"
      >
        Explore
      </button>
    </div>
  </div>
</template>

<script>
export default {
    props: {
        activeItem: String,
        setActive: Function,
        isLoggedIn: Boolean,
    },

};
</script>
