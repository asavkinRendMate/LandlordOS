import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import readingTime from 'reading-time'

const CHECKLIST_DIR = path.join(process.cwd(), 'content', 'checklist')

export interface ChecklistFrontmatter {
  title: string
  description: string
  publishedAt: string
  updatedAt: string
  slug: string
  tags: string[]
  readingTime: number
  featured: boolean
}

export interface ChecklistArticle {
  frontmatter: ChecklistFrontmatter
  content: string
}

export function getAllChecklistArticles(): ChecklistArticle[] {
  if (!fs.existsSync(CHECKLIST_DIR)) return []

  const files = fs.readdirSync(CHECKLIST_DIR).filter((f) => f.endsWith('.mdx'))

  const articles = files.map((fileName) => {
    const filePath = path.join(CHECKLIST_DIR, fileName)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)

    const rt = data.readingTime ?? Math.ceil(readingTime(content).minutes)

    const frontmatter: ChecklistFrontmatter = {
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

export function getChecklistArticleBySlug(slug: string): ChecklistArticle | null {
  const articles = getAllChecklistArticles()
  return articles.find((a) => a.frontmatter.slug === slug) ?? null
}

export function getAllChecklistSlugs(): string[] {
  return getAllChecklistArticles().map((a) => a.frontmatter.slug)
}
