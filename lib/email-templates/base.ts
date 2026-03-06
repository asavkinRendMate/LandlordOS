// Unified email template — all LetSorted emails use this base wrapper.

interface BaseEmailTemplateOptions {
  previewText: string
  content: string
  subtitle?: string
  footerExtra?: string
}

/**
 * Returns a complete HTML email string with LetSorted branding.
 * All emails in the app should use this as their outer wrapper.
 */
export function baseEmailTemplate({
  previewText,
  content,
  subtitle = 'LetSorted',
  footerExtra,
}: BaseEmailTemplateOptions): string {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${previewText}</title>
  <!--[if mso]>
  <noscript><xml>
    <o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
  </xml></noscript>
  <![endif]-->
  <style>
    @media only screen and (max-width: 620px) {
      .ls-card { padding: 32px 24px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#F7F8F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#1a1a1a;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
  <!-- Preview text (hidden, shown in email client inbox) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${previewText}&#8204;&zwnj;&#160;&#8204;&zwnj;&#160;&#8204;&zwnj;&#160;&#8204;&zwnj;&#160;&#8204;&zwnj;&#160;</div>

  <!-- Top spacer -->
  <div style="height:48px;line-height:48px;font-size:1px;">&nbsp;</div>

  <!-- Card wrapper -->
  <div style="max-width:600px;margin:0 auto;padding:0 16px;">
    <div class="ls-card" style="background:#ffffff;border-radius:8px;padding:40px 48px;">
      <!-- Header -->
      <div style="margin-bottom:0;">
        <img src="https://letsorted.co.uk/logo.png" alt="LetSorted" width="160" height="50" style="display:block;width:160px;height:auto;margin:0 0 2px;" />
        <p style="font-size:13px;color:#6b7280;margin:0;">${subtitle}</p>
      </div>

      <!-- Divider -->
      <div style="border-bottom:1px solid #F0F0F0;margin:24px 0;"></div>

      <!-- Content -->
      ${content}
    </div>

    <!-- Footer -->
    <div style="text-align:center;padding:24px 0 0;">
      <p style="font-size:12px;color:#9ca3af;margin:0;">&copy; ${new Date().getFullYear()} LetSorted &middot; letsorted.co.uk</p>
      ${footerExtra ? `<p style="font-size:12px;color:#9ca3af;margin:8px 0 0;">${footerExtra}</p>` : ''}
    </div>
  </div>

  <!-- Bottom spacer -->
  <div style="height:48px;line-height:48px;font-size:1px;">&nbsp;</div>
</body>
</html>`
}

/** Branded CTA button — table-based for Outlook compatibility. */
export function ctaButton(text: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:24px 0;">
  <tr>
    <td style="background:#16a34a;border-radius:8px;">
      <a href="${href}" style="display:inline-block;padding:12px 28px;color:#ffffff;font-weight:600;font-size:15px;text-decoration:none;border-radius:8px;">${text}</a>
    </td>
  </tr>
</table>`
}

/** Green info/address highlight box. */
export function infoBox(text: string): string {
  return `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px 16px;margin:0 0 16px;">
  <p style="color:#166534;font-size:14px;font-weight:600;margin:0;">${text}</p>
</div>`
}

/** Grey callout box (for quotes, stats, etc). */
export function greyBox(innerHtml: string): string {
  return `<div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:0 0 16px;">
  ${innerHtml}
</div>`
}

/** Paragraph — shorthand for consistent email body text. */
export function p(text: string): string {
  return `<p style="font-size:15px;line-height:1.6;color:#444;margin:0 0 16px;">${text}</p>`
}

/** Muted small text (expiry notices, disclaimers). */
export function muted(text: string): string {
  return `<p style="font-size:13px;color:#9ca3af;line-height:1.5;margin:0;">${text}</p>`
}
