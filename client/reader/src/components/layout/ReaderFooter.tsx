const FOOTER_LINKS = [
  { href: '#guide', label: 'Hướng dẫn sử dụng' },
  { href: '#rules', label: 'Quy định thư viện' },
  { href: '#faq', label: 'FAQ' },
  { href: 'mailto:support@library.edu', label: 'Liên hệ' },
];

export function ReaderFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white">
      <div className="mx-auto flex min-h-[64px] w-full max-w-[1480px] flex-col items-center justify-between gap-3 px-4 py-4 text-sm text-slate-500 sm:px-6 md:flex-row lg:px-8">
        <span>© 2025 LIBERO – Hệ thống quản lý thư viện</span>
        <div className="flex flex-wrap items-center justify-center gap-6">
          {FOOTER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="hover:text-brand-600 transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>
        <span>Hỗ trợ: 1900 1234</span>
      </div>
    </footer>
  );
}
