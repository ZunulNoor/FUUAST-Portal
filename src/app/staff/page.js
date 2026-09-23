'use client';

import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  ClipboardList,
  FileText,
  Plus,
  Settings,
  Shield,
  Users,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import PortalSidebar from '@/components/PortalSidebar';
import PortalHeaderUser from '@/components/PortalHeaderUser';
import { canAccessStaffResource, isSuperAdmin } from '@/lib/staffAccess';
import {
  portalMain,
  portalHeader,
  portalContent,
  headerTitle,
  eyebrow,
  btnPrimary,
  btnSecondary,
} from '@/components/ui/cx';

const baseLinks = [
  {
    label: 'Attendance',
    href: '/staff/attendance',
    icon: CalendarCheck,
    description: 'Create sessions and manage rosters.',
  },
  {
    label: 'Students',
    href: '/staff/students',
    icon: Users,
    description: 'Add, update, and review student records.',
  },
];

const reportsLink = {
  label: 'Reports',
  href: '/staff/reports',
  icon: BarChart3,
  description: 'Review and export attendance reports.',
};

const adminLinksExtra = [
  {
    label: 'Teachers',
    href: '/staff/teachers',
    icon: Users,
    description: 'Browse all teachers.',
  },
];

const adminLinks = [
  {
    label: 'Departments',
    href: '/staff/departments',
    icon: ClipboardList,
    description: 'Manage academic departments.',
  },
  {
    label: 'System users',
    href: '/staff/users',
    icon: Shield,
    description: 'Manage administrator accounts.',
  },
  {
    label: 'Teachers',
    href: '/staff/teachers',
    icon: Users,
    description: 'Manage teacher accounts and imports.',
  },
  {
    label: 'Permissions',
    href: '/staff/permissions',
    icon: Settings,
    description: 'Control teacher permissions.',
  },
  {
    label: 'Activity logs',
    href: '/staff/activity-logs',
    icon: FileText,
    description: 'Trace system changes.',
  },
];

export default function StaffDashboard() {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const links =
    isSuperAdmin(user?.role) || user?.role === 'keen_admin'
      ? [...baseLinks, reportsLink, ...adminLinks]
      : user?.role === 'admin'
        ? [...baseLinks, ...adminLinksExtra]
        : baseLinks.filter((link) =>
            canAccessStaffResource(user?.role, link.href.split('/').pop(), user?.pageAccess),
          );

  useEffect(() => {
    if (hydrated && !user) router.push('/staff/login');
  }, [hydrated, user, router]);

  if (!hydrated || !user) return null;

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={`${portalMain} pb-[55px]`}>
        <header className={portalHeader}>
          <div>
            <span className={eyebrow}>STAFF DASHBOARD</span>
            <h1 className={headerTitle}>Welcome, {user.name || 'Staff'}</h1>
          </div>
          <PortalHeaderUser portal="staff" />
        </header>
        <div className={portalContent}>
          <section className="flex items-center justify-between gap-[30px] rounded-lg border border-line bg-gradient-to-br from-paper to-[#f0f3e9] p-[25px] max-md:flex-col max-md:items-start">
            <div>
              <span className={eyebrow}>TODAY'S WORKSPACE</span>
              <h2 className="mt-[7px] mb-[6px] text-2xl font-semibold text-brand-dark">
                Keep campus attendance moving.
              </h2>
              <p className="m-0 text-[13px] text-muted">
                Every action now lives on its related page, with access controlled by your account
                role.
              </p>
            </div>
            <div className="grid min-w-[150px] gap-[5px] border-l border-line pl-[25px] text-[11px] text-muted max-md:w-full max-md:border-l-0 max-md:border-t max-md:pt-3 max-md:pl-0">
              <span>Signed in as</span>
              <strong className="text-[15px] capitalize text-brand">
                {user.role?.replace('_', ' ')}
              </strong>
            </div>
          </section>
          <section className="mt-[22px] grid grid-cols-3 gap-[15px] max-md:grid-cols-1">
            {links.map(({ label, href, icon: Icon, description }) => (
              <Link
                href={href}
                key={href}
                className="flex min-h-[94px] items-center gap-[13px] rounded-lg border border-line bg-paper p-[17px] text-brand-dark shadow-[var(--shadow)] transition duration-200 hover:-translate-y-[3px] hover:border-[#b8c49c] hover:shadow-[0_14px_30px_rgba(48,56,32,0.12)]"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-brand-soft text-brand">
                  <Icon size={20} />
                </span>
                <span className="grid min-w-0 gap-[5px]">
                  <strong className="text-sm">{label}</strong>
                  <small className="text-[11px] leading-[1.4] text-muted">{description}</small>
                </span>
                <ArrowRight size={18} className="ml-auto shrink-0 text-action" />
              </Link>
            ))}
          </section>
          {!isSuperAdmin(user?.role) ? (
            <section className="mt-6 rounded-lg border border-line bg-paper p-[20px]">
              <span className={eyebrow}>QUICK ACTIONS</span>
              <div className="mt-3 flex flex-wrap gap-[10px] max-md:flex-col">
                <Link href="/staff/attendance" className={btnPrimary}>
                  <Plus size={16} /> Create attendance session
                </Link>
                <Link href="/staff/students" className={`${btnSecondary} max-md:w-full`}>
                  <Users size={16} /> Manage students
                </Link>
                {user?.role === 'keen_admin' ? (
                  <Link href="/staff/reports" className={`${btnSecondary} max-md:w-full`}>
                    <BarChart3 size={16} /> Review reports
                  </Link>
                ) : null}
              </div>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
