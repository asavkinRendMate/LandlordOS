import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { MDXRemote } from 'next-mdx-remote/rsc'
import remarkGfm from 'remark-gfm'
import rehypeSlug from 'rehype-slug'
import rehypeAutolinkHeadings from 'rehype-autolink-headings'
import { getAllGuideSlugs, getGuideBySlug } from '@/lib/guides'
import { mdxComponents } from '@/components/guides/MDXComponents'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://letsorted.co.uk'

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }))
}

export function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Metadata {
  const guide = getGuideBySlug(params.slug)
  if (!guide) return {}

  const { title, description, slug, publishedAt, updatedAt } = guide.frontmatter

  return {
    title,
    description,
    alternates: { canonical: `/guides/${slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      url: `${BASE_URL}/guides/${slug}`,
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

export default function GuideArticlePage({
  params,
}: {
  params: { slug: string }
}) {
  const guide = getGuideBySlug(params.slug)
  if (!guide) notFound()

  const { frontmatter, content } = guide

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
    mainEntityOfPage: `${BASE_URL}/guides/${frontmatter.slug}`,
  }

  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-[1280px] mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo.svg" alt="LetSorted" width={150} height={50} priority />
          </Link>
          <div className="flex items-center gap-2.5">
            <Link
              href="/guides"
              className="text-green-700 font-semibold px-4 py-2.5 text-sm"
            >
              Guides
            </Link>
            <Link
              href="/screening"
              className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-colors duration-150"
            >
              Tenant Screening
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17L17 7M17 7H7M17 7v10" /></svg>
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
          <Link href="/guides" className="hover:text-green-600 transition-colors">
            Guides
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
      </article>

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
