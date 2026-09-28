'use client';

import Link from 'next/link';
import PortalBrand from './PortalBrand';
import StudentLookupForm from './StudentLookupForm';
import { kicker } from '@/components/ui/cx';

export default function StudentLookup() {
  return (
    <main className="min-h-screen bg-surface">
      <header className="flex min-h-[72px] items-center justify-between bg-brand px-[max(28px,calc((100vw-1180px)/2))]">
        <Link href="/" className="text-[13px] text-[#e1e8d7] transition hover:text-white">
          Back to portal
        </Link>
        <PortalBrand compact size="auth" />
      </header>
      <section className="mx-auto grid min-h-[calc(100vh-72px)] max-w-[1050px] grid-cols-[0.8fr_1fr] items-start gap-[75px] px-[28px] py-[55px] [@media(max-width:800px)]:grid-cols-1">
        <div className="pt-[40px]">
          <span className={kicker}>No password needed</span>
          <h1 className="m-0 text-[45px] font-semibold leading-[1.08] text-brand-dark [@media(max-width:800px)]:text-[38px]">
            Check attendance
          </h1>
          <p className="my-[18px] max-w-[370px] text-base leading-[1.65] text-muted">
            Enter your seat number and solve the captcha. Each seat number can be viewed once every
            10 minutes.
          </p>
          <p className="text-xs text-muted">
            Need full details?{' '}
            <Link href="/student/login" className="font-semibold text-action">
              Sign in with password
            </Link>
          </p>
        </div>
        <div className="max-w-[500px] rounded-lg border border-line bg-paper p-[35px] shadow-[var(--shadow)]">
          <StudentLookupForm mode="view" />
        </div>
      </section>
    </main>
  );
}
