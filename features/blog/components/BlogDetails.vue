<template>
    <div
        v-if="blogDetails"
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <section class="relative h-[min(50vh,500px)] w-full overflow-hidden">
            <img :src="coverImageUrl" alt="" class="absolute inset-0 h-full w-full object-cover" />
            <div
                class="absolute inset-0 flex flex-col items-center justify-center bg-black/50 px-4 text-center text-white"
            >
                <h1 class="max-w-4xl text-2xl font-bold tracking-tight sm:text-3xl md:text-4xl">
                    {{ blogDetails.title }}
                </h1>
                <p class="mt-3 text-sm text-white/90 sm:text-base">
                    Published by MyPortfolio Blog — {{ timeAgo(blogDetails.created_at) }}
                </p>
                <p class="mt-2 max-w-2xl text-sm text-white/85 sm:text-base">
                    Architectural photography goes beyond capturing buildings...
                </p>
            </div>
        </section>

        <article class="mx-auto max-w-3xl px-4 py-12 text-left sm:px-6 lg:px-8 lg:py-16">
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                Photography often emphasizes the rule of thirds as a foundational guideline for composition, helping
                photographers create balanced and aesthetically pleasing images. However, breaking this rule can lead to
                more dynamic, thought-provoking, and innovative photographs.
            </p>
            <img
                v-if="blogDetails.image"
                :src="inlineImageUrl(blogDetails.image)"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />

            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Understanding the rule of thirds</h2>
            <!-- eslint-disable vue/no-v-html -- HTML is sanitized with DOMPurify in sanitizedBlogContent -->
            <div
                class="max-w-none text-lg leading-relaxed text-zinc-800 [&_a]:text-blue-600 [&_a]:underline [&_blockquote]:border-l-4 [&_blockquote]:border-zinc-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_h2]:mb-3 [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-6 [&_h3]:text-lg [&_h3]:font-semibold [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_li]:mb-2 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-4 [&_p]:text-justify [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-zinc-100 [&_pre]:p-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6"
                v-html="sanitizedBlogContent"
            />
            <!-- eslint-enable vue/no-v-html -->

            <h2 class="mb-3 mt-10 text-xl font-bold text-zinc-900 sm:text-2xl">Why break the rule?</h2>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">Breaking the rule of thirds allows you to:</p>
            <ul class="mb-8 list-disc space-y-2 pl-6 text-lg leading-relaxed text-zinc-700">
                <li>Create tension or unease for dramatic effect.</li>
                <li>
                    Draw attention to the center or edges of the frame, emphasizing unconventional focal points.
                </li>
                <li>
                    Challenge visual expectations, making your photos stand out in a sea of traditionally composed images.
                </li>
            </ul>

            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Placing the subject in the center</h2>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                Centering your subject can evoke a sense of symmetry and balance, particularly in minimalist or graphic
                compositions. A portrait shot with the subject staring directly into the camera can feel confrontational and
                powerful.
            </p>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                For example, in architectural photography, placing a symmetrical building in the center accentuates its
                structure and geometry, creating a striking and orderly composition.
            </p>
            <img
                src="/images/covers/covers_3.jpeg"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />
            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Exploring negative space</h2>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                By shifting your subject far to the edge of the frame, you can make negative space the focal point of your
                composition. This approach is particularly effective in minimalist photography or when you want to emphasize
                isolation, emptiness, or scale.
            </p>
            <img
                src="/images/covers/covers_4.jpeg"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                For example, capturing a lone figure on a vast snowy field creates emotional resonance and amplifies the
                feeling of solitude.
            </p>
            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Dynamic tilts and angles</h2>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                Tilting the camera to introduce a Dutch angle can create a sense of unease or movement, especially in
                street photography or action shots. This subtle departure from the norm adds energy and tension to the
                composition.
            </p>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                Consider photographing a skateboarder mid-jump using a tilted frame to emphasize the motion and the dynamic
                lines of the trajectory.
            </p>
            <img
                src="/images/covers/covers_5.jpeg"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />
            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Layering for complexity</h2>
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                Breaking the rule of thirds doesn’t mean ignoring composition entirely—it means experimenting with layering
                elements in the foreground, midground, and background to create visual complexity. This approach draws the
                viewer’s eye through the frame, uncovering details as they explore.
            </p>
            <img
                src="/images/covers/covers_6.jpeg"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />
            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Creative examples of rule-breaking</h2>
            <ul class="mb-8 list-disc space-y-2 pl-6 text-lg leading-relaxed text-zinc-700">
                <li>
                    <strong>Portraits:</strong> Center the subject to create symmetry or exaggerate asymmetry by placing them
                    far to one side.
                </li>
                <li>
                    <strong>Landscapes:</strong> Position the horizon line at the very top or bottom of the frame to
                    emphasize the sky or the foreground.
                </li>
                <li>
                    <strong>Abstracts:</strong> Place textures, patterns, or reflections arbitrarily within the frame to
                    challenge the viewer’s perception.
                </li>
            </ul>
            <img
                src="/images/covers/covers_7.jpeg"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />
            <h2 class="mb-3 mt-8 text-xl font-bold text-zinc-900 sm:text-2xl">Practical tips for breaking the rule of thirds</h2>
            <ul class="mb-8 list-disc space-y-2 pl-6 text-lg leading-relaxed text-zinc-700">
                <li>
                    <strong>Experiment first, edit later:</strong> Capture multiple versions of a scene using different
                    compositions. Compare the standard rule of thirds shot with more experimental approaches to see which
                    one resonates.
                </li>
                <li>
                    <strong>Start simple:</strong> Gradually introduce rule-breaking elements into your work. For instance,
                    experiment with a centered subject or exaggerated negative space before venturing into more complex
                    compositions.
                </li>
                <li>
                    <strong>Observe and analyze:</strong> Study images from master photographers who regularly break the rule
                    of thirds, such as Henri Cartier-Bresson or Cindy Sherman, to understand how they use unconventional
                    composition to create impact.
                </li>
            </ul>
            <img
                src="/images/covers/covers_8.jpeg"
                alt=""
                class="mx-auto my-5 block h-auto w-full max-w-4xl rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5"
            />
            <p class="mb-5 text-lg leading-relaxed text-justify text-zinc-700">
                Breaking the rule of thirds is not about rejecting composition principles altogether but rather using them
                as a springboard for creativity. By understanding when and how to break the rules, you can create images
                that are not only visually striking but also uniquely yours. Push boundaries, take risks, and embrace the
                unexpected—your photography will be better for it.
            </p>
        </article>
    </div>
</template>

<script>
import DOMPurify from 'isomorphic-dompurify'
import { blogService } from '~/features/blog/services/blog.api.js'

export default {
    name: "BlogDetailsView",
    components: {
    },
    data() {
        return {
            blogDetails: null,
        };
    },
    computed: {
        sanitizedBlogContent() {
            const raw = this.blogDetails?.content
            if (!raw || typeof raw !== 'string') {
                return ''
            }
            return DOMPurify.sanitize(raw)
        },
        coverImageUrl() {
            const c = this.blogDetails?.cover_image
            if (!c) return ''
            if (typeof c === 'string' && c.startsWith('http')) return c
            return c.startsWith('/') ? c : `/${c}`
        },
    },
    async created() {
        const slug = this.$route.params.slug;
        await this.fetchBlogDetails(slug);
    },
    methods: {
        inlineImageUrl(path) {
            if (!path) return ''
            if (typeof path === 'string' && path.startsWith('http')) return path
            return path.startsWith('/') ? path : `/${path}`
        },
        timeAgo(date) {
            if (!date) return 'Recently'
            const now = new Date()
            const past = new Date(date)
            const diffTime = Math.abs(now - past)
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
            return diffDays === 0 ? 'Today' : `${diffDays} days ago`
        },
        async fetchBlogDetails(slug) {
            try {
                const response = await blogService.fetchBySlug(slug);
                const d = response.data;
                this.blogDetails = d.blog ?? d;
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu blog:", error);
            }
        },
    },
};
</script>
