import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { getAllChecklistSlugs, getChecklistArticleBySlug, getAllChecklistArticles } from '@/lib/checklist'
import { mdxComponents } from '@/components/guides/MDXComponents'
import ShareButtons from '@/components/ShareButtons'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://letsorted.co.uk'

export function generateStaticParams() {
  return getAllChecklistSlugs().map((slug) => ({ slug }))
}

export function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Metadata {
  const article = getChecklistArticleBySlug(params.slug)
  if (!article) return {}

  const { title, description, slug, publishedAt, updatedAt } = article.frontmatter

  return {
    title,
    description,
    alternates: { canonical: `/landlord-checklist/${slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${BASE_URL}/landlord-checklist/${slug}`,
      publishedTime: publishedAt,
      modifiedTime: updatedAt,
      authors: ['LetSorted'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ChecklistArticlePage({
  params,
}: {
  params: { slug: string }
}) {
  const article = getChecklistArticleBySlug(params.slug)
  if (!article) notFound()

  const { frontmatter, content } = article
  const allArticles = getAllChecklistArticles()
  const otherArticles = allArticles.filter((a) => a.frontmatter.slug !== frontmatter.slug)

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: frontmatter.title,
    description: frontmatter.description,
    datePublished: frontmatter.publishedAt,
    dateModified: frontmatter.updatedAt,
    author: { '@type': 'Organization', name: 'LetSorted' },
    publisher: {
      '@type': 'Organization',
      name: 'LetSorted',
      url: BASE_URL,
    },
    mainEntityOfPage: `${BASE_URL}/landlord-checklist/${frontmatter.slug}`,
  }

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-4 py-3 md:px-6 md:py-0 md:h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-icon.svg" alt="LetSorted" width={32} height={32} className="md:hidden" priority />
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} className="hidden md:block" priority />
          </Link>
          <div className="flex items-center gap-1.5 md:gap-2.5">
            <Link
              href="/landlord-checklist"
              className="text-green-700 font-semibold px-3 py-2 md:px-4 md:py-2.5 text-xs md:text-sm"
            >
              Checklist
            </Link>
            <Link
              href="/screening"
              className="inline-flex items-center gap-1 md:gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-3 py-2 md:px-5 md:py-2.5 rounded-lg text-xs md:text-sm transition-colors duration-150"
            >
              <span className="md:hidden">Screening</span>
              <span className="hidden md:inline">Tenant Screening</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="hidden md:block"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── JSON-LD ─────────────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      {/* ── Article ─────────────────────────────────────────────────────── */}
      <article className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
        {/* Breadcrumb */}
        <nav className="mb-8 text-sm text-gray-400">
          <Link href="/landlord-checklist" className="hover:text-green-600 transition-colors">
            Landlord Checklist
          </Link>
          <span className="mx-2">/</span>
          <span className="text-gray-600">{frontmatter.title}</span>
        </nav>

        {/* Header */}
        <header className="mb-10">
          <div className="flex flex-wrap gap-1.5 mb-4">
            {frontmatter.tags.map((tag) => (
              <span
                key={tag}
                className="inline-block bg-green-50 text-green-700 text-xs font-medium px-2.5 py-0.5 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mb-4">
            {frontmatter.title}
          </h1>
          <p className="text-lg text-gray-500 leading-relaxed mb-4">
            {frontmatter.description}
          </p>
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span>{frontmatter.readingTime} min read</span>
            <span>Published {formatDate(frontmatter.publishedAt)}</span>
            {frontmatter.updatedAt !== frontmatter.publishedAt && (
              <span>Updated {formatDate(frontmatter.updatedAt)}</span>
            )}
          </div>
        </header>

        {/* Divider */}
        <hr className="border-gray-200 mb-10" />

        {/* MDX Content */}
        <div className="prose-custom">
          <MDXRemote
            source={content}
            components={mdxComponents}
            options={{
              mdxOptions: {
                remarkPlugins: [remarkGfm],
                rehypePlugins: [rehypeSlug, rehypeAutolinkHeadings],
              },
            }}
          />
        </div>

        {/* Share */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <p className="text-sm text-gray-500 mb-3">Found this useful? Share with other landlords:</p>
          <ShareButtons
            url={`${BASE_URL}/landlord-checklist/${frontmatter.slug}`}
            title={frontmatter.title}
          />
        </div>
      </article>

      {/* ── Related Articles ──────────────────────────────────────────── */}
      {otherArticles.length > 0 && (
        <section className="bg-gray-50 py-12 px-6">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              More compliance guides
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {otherArticles.map((a) => (
                <Link
                  key={a.frontmatter.slug}
                  href={`/landlord-checklist/${a.frontmatter.slug}`}
                  className="group block border border-gray-200 bg-white rounded-xl p-5 hover:border-green-300 hover:shadow-md transition-all duration-200"
                >
                  <h3 className="text-sm font-bold text-gray-900 group-hover:text-green-700 transition-colors mb-1">
                    {a.frontmatter.title}
                  </h3>
                  <p className="text-xs text-gray-400">{a.frontmatter.readingTime} min read</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── Bottom CTA ──────────────────────────────────────────────────── */}
      <section className="bg-green-50 py-16 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Screen your tenants with confidence
          </h2>
          <p className="text-gray-500 mb-6">
            AI-powered financial checks that take minutes, not days. No subscription required.
          </p>
          <Link
            href="/screening"
            className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg text-sm transition-colors"
          >
            Start Screening
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
          </Link>
        </div>
      </section>
    </>
  )
}
