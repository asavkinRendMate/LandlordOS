import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const GUIDES_DIR = path.join(process.cwd(), 'content', 'guides')

export interface GuideFrontmatter {
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  slug: string
  tags: string[]
  readingTime: number
  featured: boolean
}

export interface Guide {
  frontmatter: GuideFrontmatter
  content: string
}

export function getAllGuides(): Guide[] {
  if (!fs.existsSync(GUIDES_DIR)) return []

  const files = fs.readdirSync(GUIDES_DIR).filter((f) => f.endsWith('.mdx'))

  const guides = files.map((fileName) => {
    const filePath = path.join(GUIDES_DIR, fileName)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)

    // Calculate reading time if not in frontmatter
    const rt = data.readingTime ?? Math.ceil(readingTime(content).minutes)

    const frontmatter: GuideFrontmatter = {
      title: data.title ?? '',
      description: data.description ?? '',
      publishedAt: data.publishedAt ?? '',
      updatedAt: data.updatedAt ?? data.publishedAt ?? '',
      slug: data.slug ?? fileName.replace(/\.mdx$/, ''),
      tags: data.tags ?? [],
      readingTime: rt,
      featured: data.featured ?? false,
    }

    return { frontmatter, content }
  })

  // Sort by publishedAt descending
  return guides.sort(
    (a, b) => new Date(b.frontmatter.publishedAt).getTime() - new Date(a.frontmatter.publishedAt).getTime(),
  )
}

export function getGuideBySlug(slug: string): Guide | null {
  const guides = getAllGuides()
  return guides.find((g) => g.frontmatter.slug === slug) ?? null
}

export function getAllGuideSlugs(): string[] {
  return getAllGuides().map((g) => g.frontmatter.slug)
}
