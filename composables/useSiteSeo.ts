type PublicSiteConfig = {
  siteName?: string
  siteDescription?: string
  siteUrl?: string
}

/**
 * SEO mặc định + helper cho từng route (mục 4).
 */
export function useSiteSeo(overrides?: {
  title?: string
  description?: string
  ogImage?: string
  noindex?: boolean
}) {
  const config = useRuntimeConfig()
  const pub = config.public as PublicSiteConfig
  const siteName = pub.siteName || 'MyPortfolio'
  const defaultDesc = pub.siteDescription
    || 'Discover photography, galleries, and photographers on MyPortfolio.'
  const siteUrl = pub.siteUrl || ''

  const title = overrides?.title
    ? `${overrides.title} · ${siteName}`
    : siteName
  const description = overrides?.description ?? defaultDesc

  useSeoMeta({
    title,
    description,
    ogTitle: title,
    ogDescription: description,
    ...(overrides?.ogImage ? { ogImage: overrides.ogImage } : {}),
    ...(siteUrl ? { ogUrl: siteUrl } : {}),
    robots: overrides?.noindex ? 'noindex, nofollow' : 'index, follow'
  })
}
