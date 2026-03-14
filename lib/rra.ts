import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const RRA_DIR = path.join(process.cwd(), 'content', 'rra')

export interface RraFrontmatter {
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  slug: string
  tags: string[]
  readingTime: number
  featured: boolean
}

export interface RraArticle {
  frontmatter: RraFrontmatter
  content: string
}

export function getAllRraArticles(): RraArticle[] {
  if (!fs.existsSync(RRA_DIR)) return []

  const files = fs.readdirSync(RRA_DIR).filter((f) => f.endsWith('.mdx'))

  const articles = files.map((fileName) => {
    const filePath = path.join(RRA_DIR, fileName)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)

    const rt = data.readingTime ?? Math.ceil(readingTime(content).minutes)

    const frontmatter: RraFrontmatter = {
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

  return articles.sort(
    (a, b) => new Date(b.frontmatter.publishedAt).getTime() - new Date(a.frontmatter.publishedAt).getTime(),
  )
}

export function getRraArticleBySlug(slug: string): RraArticle | null {
  const articles = getAllRraArticles()
  return articles.find((a) => a.frontmatter.slug === slug) ?? null
}

export function getAllRraSlugs(): string[] {
  return getAllRraArticles().map((a) => a.frontmatter.slug)
}
