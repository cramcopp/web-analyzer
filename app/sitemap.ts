import { MetadataRoute } from 'next'
import { TOOL_CATEGORIES, TOOL_PAGES } from '@/lib/tool-pages'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()
  const baseUrl = 'https://website-analyzer.pro'

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${baseUrl}/tools`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.95,
    },
    {
      url: `${baseUrl}/preise`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    ...TOOL_CATEGORIES.map((category) => ({
      url: `${baseUrl}/tools/${category.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: category.priority,
    })),
    ...TOOL_PAGES.map((tool) => ({
      url: `${baseUrl}/tools/${tool.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: tool.slug === 'seo-checker' ? 0.92 : 0.86,
    })),
    {
      url: `${baseUrl}/impressum`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/datenschutz`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
    {
      url: `${baseUrl}/agb`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.4,
    },
  ]
}
