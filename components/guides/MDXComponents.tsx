import type { MDXComponents } from 'mdx/types'

export const mdxComponents: MDXComponents = {
  h1: (props) => (
    <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 tracking-tight mt-10 mb-4" {...props} />
  ),
  h2: (props) => (
    <h2 className="text-2xl font-bold text-green-800 mt-10 mb-4 scroll-mt-20" {...props} />
  ),
  h3: (props) => (
    <h3 className="text-xl font-semibold text-gray-800 mt-8 mb-3 scroll-mt-20" {...props} />
  ),
  p: (props) => (
    <p className="text-gray-600 leading-relaxed mb-4 max-w-[680px]" {...props} />
  ),
  ul: (props) => (
    <ul className="list-disc list-outside pl-5 mb-4 space-y-1.5 text-gray-600 max-w-[680px]" {...props} />
  ),
  ol: (props) => (
    <ol className="list-decimal list-outside pl-5 mb-4 space-y-1.5 text-gray-600 max-w-[680px]" {...props} />
  ),
  li: (props) => (
    <li className="leading-relaxed" {...props} />
  ),
  blockquote: (props) => (
    <blockquote className="border-l-4 border-green-400 bg-green-50 px-5 py-4 my-6 rounded-r-lg text-gray-700 italic max-w-[680px] [&>p]:mb-0" {...props} />
  ),
  code: (props) => (
    <code className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-sm font-mono" {...props} />
  ),
  pre: (props) => (
    <pre className="bg-gray-900 text-gray-100 rounded-lg p-4 overflow-x-auto my-4 text-sm" {...props} />
  ),
  strong: (props) => (
    <strong className="font-semibold text-gray-800" {...props} />
  ),
  a: (props) => (
    <a className="text-green-600 hover:text-green-700 underline underline-offset-2 decoration-green-300 hover:decoration-green-500 transition-colors" {...props} />
  ),
  hr: () => (
    <hr className="border-gray-200 my-8" />
  ),
  table: (props) => (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border border-gray-200 rounded-lg text-sm" {...props} />
    </div>
  ),
  th: (props) => (
    <th className="bg-gray-50 px-4 py-2 text-left font-semibold text-gray-700 border-b border-gray-200" {...props} />
  ),
  td: (props) => (
    <td className="px-4 py-2 text-gray-600 border-b border-gray-100" {...props} />
  ),
}
