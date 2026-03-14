import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

const UPDATES_DIR = path.join(process.cwd(), 'content', 'updates')

export type UpdateTag = 'New feature' | 'Improvement' | 'Fix'

export interface Update {
  title: string
  date: string
  tag: UpdateTag
  summary: string
  slug: string
  content: string
}

export function getAllUpdates(): Update[] {
  if (!fs.existsSync(UPDATES_DIR)) return []

  const files = fs.readdirSync(UPDATES_DIR).filter((f) => f.endsWith('.mdx'))

  const updates = files.map((fileName) => {
    const filePath = path.join(UPDATES_DIR, fileName)
    const raw = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = matter(raw)

    return {
      title: data.title ?? '',
      date: data.date ? new Date(data.date).toISOString().split('T')[0] : '',
      tag: (data.tag ?? 'New feature') as UpdateTag,
      summary: data.summary ?? '',
      slug: fileName.replace(/\.mdx$/, ''),
      content,
    }
  })

  return updates.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  )
}
