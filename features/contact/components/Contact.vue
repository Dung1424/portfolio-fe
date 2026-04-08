<template>
    <div
        class="min-h-screen bg-[#f7f8fa] font-sans text-zinc-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]"
    >
        <div class="mx-auto w-full max-w-7xl px-4 pb-16 pt-10 sm:px-6 lg:px-8">
            <div class="mb-10 max-w-xl">
                <h2 class="text-2xl font-bold tracking-tight text-[#222] sm:text-3xl">Contact</h2>
                <p class="mt-2 text-zinc-600">
                    Lorem ipsum dolor sit amet consectetur adipisicing elit. Quisquam necessitatibus incidunt ut officiis
                    explicabo inventore.
                </p>
            </div>

            <div class="grid grid-cols-1 gap-10 lg:grid-cols-12 lg:gap-12">
                <div class="lg:col-span-7">
                    <form class="space-y-4" @submit.prevent="sendMessage">
                        <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            <div class="space-y-1.5 text-left">
                                <label for="name" class="block text-sm font-medium text-zinc-700">Name</label>
                                <input
                                    id="name"
                                    v-model="contactForm.name"
                                    type="text"
                                    required
                                    class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div class="space-y-1.5 text-left">
                                <label for="email" class="block text-sm font-medium text-zinc-700">Email</label>
                                <input
                                    id="email"
                                    v-model="contactForm.email"
                                    type="email"
                                    required
                                    class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                        </div>
                        <div class="space-y-1.5 text-left">
                            <label for="subject" class="block text-sm font-medium text-zinc-700">Subject</label>
                            <input
                                id="subject"
                                v-model="contactForm.subject"
                                type="text"
                                required
                                class="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div class="space-y-1.5 text-left">
                            <label for="message" class="block text-sm font-medium text-zinc-700">Message</label>
                            <textarea
                                id="message"
                                v-model="contactForm.message"
                                rows="5"
                                required
                                class="w-full resize-y rounded-lg border border-neutral-200 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>
                        <div>
                            <input
                                type="submit"
                                value="Send Message"
                                class="w-full cursor-pointer rounded-xl bg-blue-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:px-10"
                            />
                        </div>
                    </form>
                </div>

                <div class="lg:col-span-5">
                    <div class="overflow-hidden rounded-2xl border border-neutral-200/80 bg-white shadow-[0_2px_16px_rgba(0,0,0,0.08)] ring-1 ring-black/5">
                        <div class="aspect-[16/9] w-full bg-neutral-200">
                            <iframe
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3724.132612701002!2d105.7833101!3d21.027379200000002!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab4d3c4db5a5%3A0xdbd331a7a71119d5!2zOCBUw7RuIFRo4bqldCBUaHV54bq_dCwgTeG7uSDEkMOsbmgsIE5hbSBU4burIExpw6ptLCBIw6AgTuG7mWk!5e0!3m2!1svi!2s!4v1741779889105!5m2!1svi!2s"
                                class="h-full min-h-[200px] w-full border-0"
                                allowfullscreen=""
                                loading="lazy"
                                referrerpolicy="no-referrer-when-downgrade"
                                title="Map"
                            />
                        </div>
                        <div class="space-y-4 border-t border-neutral-100 bg-neutral-50/80 p-5">
                            <div class="border-b border-neutral-200 pb-4 last:border-0 last:pb-0">
                                <div class="text-base font-bold text-zinc-800">📍 Address</div>
                                <p class="mt-1 text-sm text-zinc-600">So 8 ton that thuyet , nam tu liem , ha noi</p>
                            </div>
                            <div class="border-b border-neutral-200 pb-4 last:border-0 last:pb-0">
                                <div class="text-base font-bold text-zinc-800">📞 Phone</div>
                                <p class="mt-1 text-sm text-zinc-600">+1 232 3235 324</p>
                            </div>
                            <div>
                                <div class="text-base font-bold text-zinc-800">📧 Email</div>
                                <p class="mt-1 text-sm text-zinc-600">MyPortfolio@gmail.com</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import { notification } from 'ant-design-vue'
import { contactService } from '~/features/contact/services/contact.api.js'

export default {
    name: "SiteContact",
    components: {
    },
    data() {
        return {
            contactForm: {
                name: '',
                email: '',
                subject: '',
                message: ''
            }
        };
    },
    methods: {
        async sendMessage() {
            try {
                await contactService.send(this.contactForm);
                notification.success({
                    message: "Success",
                    description: "Your message has been sent successfully!",
                });

                this.contactForm = { name: '', email: '', subject: '', message: '' };
            } catch (error) {
                notification.error({
                    message: "Error",
                    description: "An error occurred, please try again!",
                });
                console.error("Error while sending contact message:", error);
            }
        }
    }
};
</script>
