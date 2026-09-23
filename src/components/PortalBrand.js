const TITLE_CLASS = {
  full: 'max-w-[480px] text-[15px]',
  sidebar: 'max-w-[178px] text-[11px] leading-tight',
  auth: 'max-w-[360px] text-[13px]',
};

export default function PortalBrand({ compact = false, light = false, size = 'full', hideText = false }) {
  const mark = compact ? 'h-[30px] w-[30px]' : 'h-[38px] w-[38px]';
  return (
    <div className={`flex items-center gap-[10px] ${light ? 'text-brand-dark' : 'text-white'}`}>
      <span
        className={`grid shrink-0 place-items-center overflow-hidden rounded-full ${
          light ? 'bg-brand-soft' : 'bg-white/15'
        } ${mark}`}
      >
        <img
          src="/logo.png"
          alt="FUUAST logo"
          className={`h-[27px] w-[27px] object-contain ${
            light ? '' : 'brightness-0 invert'
          }`}
        />
      </span>
      <span className={`min-w-0 ${hideText ? 'hidden' : ''}`}>
        <strong
          className={`block font-extrabold leading-[1.25] tracking-[0.01em] ${
            TITLE_CLASS[size] || TITLE_CLASS.full
          }`}
        >
          Federal Urdu University Of Arts, Science &amp; Technology
        </strong>
        {!compact ? (
          <small className={`mt-[2px] block text-[11px] ${light ? 'text-muted' : 'text-[#d6dcc6]'}`}>
            Attendance Portal
          </small>
        ) : null}
      </span>
    </div>
  );
}