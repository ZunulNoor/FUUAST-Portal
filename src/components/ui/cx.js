export const panel =
  'rounded-lg border border-line bg-paper shadow-[var(--shadow)]';

export const portalMain =
  'min-h-screen bg-surface transition-[margin-left] duration-200 ease-linear max-md:ml-0 md:ml-[252px] md:peer-data-[collapsed=true]:ml-[76px]';

export const portalHeader =
  'flex min-h-[76px] items-center justify-between border-b border-line bg-paper px-[42px] max-md:px-[20px] max-md:pl-[72px]';

export const portalContent =
  'mx-auto max-w-[1280px] px-[42px] pt-[32px] pb-[56px] max-md:px-[18px] max-md:pt-[24px] max-md:pb-[40px]';

export const portalContentWide =
  'mx-auto max-w-[1800px] px-[42px] pt-[32px] pb-[56px] max-md:px-[18px] max-md:pt-[24px] max-md:pb-[40px]';

export const headerTitle = 'text-[23px] font-semibold text-brand-dark';

export const headerSub = 'mt-1 text-[13px] text-muted';

export const headerUser =
  'inline-flex items-center gap-2 text-[13px] font-semibold text-brand';

export const eyebrow =
  'block text-[10px] font-bold uppercase tracking-[0.18em] text-[#b9c89a]';

export const kicker =
  'mb-4 block text-[11px] font-bold uppercase tracking-[0.18em] text-action';

export const sectionHeading =
  'flex flex-wrap items-end justify-between gap-3 border-b border-line pb-[18px]';

export const sectionHeadingTitle = 'mt-[6px] text-xl font-semibold text-brand-dark';

export const emptyState = 'px-4 py-[35px] text-center text-sm text-muted';

export const successMessage =
  'mt-[18px] rounded-[5px] bg-[#edf7ef] px-3 py-[10px] text-xs text-success';

export const formError =
  'rounded-[4px] bg-[#fff0f0] px-3 py-[10px] text-xs text-danger [overflow-wrap:anywhere]';

export const errorTop = 'mt-[20px]';

export const attendanceKey = 'text-xs font-semibold text-muted';

export const btnPrimary =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-white transition hover:bg-action-hover disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-paper px-4 text-sm font-semibold text-ink transition hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50';

export const filterInputClass =
  'h-auto min-w-[145px] w-full rounded-md border border-line bg-paper px-[10px] py-2 text-xs text-ink outline-none transition focus:border-action focus:ring-2 focus:ring-action/20 max-md:flex-1';

export function statusBadge(status) {
  const tones = {
    present: 'bg-[#edf7ef] text-success',
    absent: 'bg-[#fff0f0] text-danger',
    late: 'bg-[#fff5e8] text-warning',
  };
  return `w-max rounded-[4px] px-2 py-[5px] text-[10px] font-bold capitalize ${
    tones[status] || 'bg-brand-soft text-brand'
  }`;
}