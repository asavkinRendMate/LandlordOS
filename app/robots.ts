import type { MetadataRoute } from 'next'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://letsorted.co.uk'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: [
        '/',
        '/screening',
        '/screening/packages',
        '/renters-rights-act',
        '/features/',
        '/privacy',
        '/cookies',
        '/terms',
      ],
      disallow: [
        '/dashboard',
        '/tenant',
        '/apply',
        '/admin',
        '/api',
        '/login',
        '/screening/apply',
        '/screening/report',
        '/screening/invites',
        '/screening/sent',
        '/screening/use',
        '/verify',
      ],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  }
}
