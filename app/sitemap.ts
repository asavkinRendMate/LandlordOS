import type { MetadataRoute } from 'next'
import { getAllGuides } from '@/lib/guides'
import { getAllUpdates } from '@/lib/updates'
import { getAllRraArticles } from '@/lib/rra'
import { getAllChecklistArticles } from '@/lib/checklist'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  const guides = getAllGuides()
  const guideEntries: MetadataRoute.Sitemap = [
    {
      url: `${BASE_URL}/guides`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...guides.map((g) => ({
      url: `${BASE_URL}/guides/${g.frontmatter.slug}`,
      lastModified: new Date(g.frontmatter.updatedAt || g.frontmatter.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]

  return [
    // ── Core ──────────────────────────────────────────────────────────────────
    {
      url: BASE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/screening`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/screening/packages`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // ── Informational ─────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/renters-rights-act`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },

    // ── Features ──────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/features/tenant-screening`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/features/move-in`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/features/property-management`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/features/issue-management`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${BASE_URL}/features/tenancy-renewal`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },

    // ── Updates ────────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/updates`,
      lastModified: (() => {
        const latest = getAllUpdates()[0]
        return latest ? new Date(latest.date) : now
      })(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },

    // ── Guides ─────────────────────────────────────────────────────────────────
    ...guideEntries,

    // ── RRA Articles ─────────────────────────────────────────────────────────
    ...getAllRraArticles().map((a) => ({
      url: `${BASE_URL}/renters-rights-act/${a.frontmatter.slug}`,
      lastModified: new Date(a.frontmatter.updatedAt || a.frontmatter.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),

    // ── Landlord Checklist ───────────────────────────────────────────────────
    {
      url: `${BASE_URL}/landlord-checklist`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    ...getAllChecklistArticles().map((a) => ({
      url: `${BASE_URL}/landlord-checklist/${a.frontmatter.slug}`,
      lastModified: new Date(a.frontmatter.updatedAt || a.frontmatter.publishedAt),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),

    // ── Legal ─────────────────────────────────────────────────────────────────
    {
      url: `${BASE_URL}/privacy`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
