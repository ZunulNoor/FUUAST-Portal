'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen,
  Building2,
  CalendarCheck,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  Layers3,
  Menu,
  Settings,
  Shield,
  SlidersHorizontal,
  Users,
  GraduationCap,
  User,
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import PortalBrand from './PortalBrand';
import { isAdministrator, isSuperAdmin, canAccessStaffResource } from '@/lib/staffAccess';

const studentLinks = [
  { label: 'Attendance record', href: '/student/attendance', icon: CalendarCheck },
  { label: 'Profile', href: '/student/profile', icon: User },
];

const staffLinks = [
  { label: 'Dashboard', href: '/staff', icon: LayoutDashboard },
  { label: 'Students', href: '/staff/students', icon: Users },
  { label: 'Courses', href: '/staff/attendance', icon: BookOpen },
  { label: 'Timetable', href: '/staff/timetable', icon: CalendarCheck },
];

const adminLinks = [
  { label: 'Departments', href: '/staff/departments', icon: Building2 },
  { label: 'Users', href: '/staff/users', icon: Shield },
  { label: 'Teachers', href: '/staff/teachers', icon: Users },
  { label: 'Permissions', href: '/staff/permissions', icon: Settings },
];

const academicLinks = [
  { label: 'Batches', href: '/staff/batches', icon: GraduationCap },
  { label: 'Classes', href: '/staff/classes', icon: Building2 },
  { label: 'Subjects', href: '/staff/subjects', icon: BookOpen },
  { label: 'Teacher Allocations', href: '/staff/assignments', icon: Layers3 },
];

export default function PortalSidebar({ portal = 'student' }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [groups, setGroups] = useState({
    operations: true,
    hr: true,
    administration: true,
    academic: false,
    configuration: false,
  });
  const user = useAuthStore((state) => state.user);
  const isAdmin = isAdministrator(user?.role);
  const isSuper = isSuperAdmin(user?.role);
  const visibleStaffLinks =
    user?.role === 'assistant' || user?.role === 'teacher' || user?.role === 'staff'
      ? staffLinks.filter((link) =>
          canAccessStaffResource(
            user.role,
            link.href === '/staff' ? 'workspace' : link.href.split('/').pop(),
            user.pageAccess,
          ),
        )
      : staffLinks;
  const staffOperations = [
    ...visibleStaffLinks,
    ...(user?.role === 'teacher'
      ? [
          { label: 'Mark attendance', href: '/staff/mark-attendance', icon: CalendarCheck },
          ...(user?.isCoordinator
            ? [{ label: 'Coordinator', href: '/staff/coordinator', icon: Shield }]
            : []),
        ]
      : []),
    // ...(isAdmin
    //   ? [
    //       { label: 'Batches', href: '/staff/batches', icon: GraduationCap },
    //       { label: 'Subjects', href: '/staff/subjects', icon: BookOpen },
    //     ]
    //   : []),
    ...(user?.role === 'admin' ||
    (user?.role === 'assistant' &&
      canAccessStaffResource(user.role, 'teachers', user.pageAccess)) ||
    (user?.role === 'teacher' && user?.isCoordinator)
      ? [{ label: 'Teachers', href: '/staff/teachers', icon: Users }]
      : []),
    ...(user?.role === 'admin'
      ? [{ label: 'Classes and rooms', href: '/staff/classes', icon: Building2 }]
      : []),
    { label: 'Profile', href: '/staff/profile', icon: User },
  ];
  const staffAdministration = isSuper ? adminLinks : [];

  const hrLinksAll = [
    { key: 'hr-my-leaves', label: 'My Leaves', href: '/staff/hr/my-leaves', icon: CalendarCheck },
    {
      key: 'hr-approvals',
      label: 'Leave Approvals',
      href: '/staff/hr/approvals',
      icon: CheckSquare,
    },
    {
      key: 'hr-attendance',
      label: 'Staff Attendance',
      href: '/staff/hr/attendance',
      icon: ClipboardList,
    },
    { key: 'hr-staff', label: 'Staff Directory', href: '/staff/hr/staff', icon: Users },
    { key: 'hr-rules', label: 'Leave Rules', href: '/staff/hr/rules', icon: SlidersHorizontal },
  ];
  const hrLinks =
    user?.role === 'assistant'
      ? hrLinksAll.filter((link) => canAccessStaffResource(user.role, link.key, user.pageAccess))
      : hrLinksAll.filter((link) => canAccessStaffResource(user?.role, link.key, []));

  const navLinkClass = `flex w-full items-center gap-3 rounded-md px-[14px] py-3 text-left text-[13px] text-[#e8ecdf] transition hover:bg-white/15 hover:text-white [&.active]:bg-white/15 [&.active]:text-white ${
    collapsed ? 'md:justify-center md:px-[10px]' : ''
  }`;
  const labelClass = collapsed ? 'md:hidden' : '';

  const renderLinks = (links) =>
    links.map(({ label, href, icon: Icon }) => (
      <Link
        key={label}
        href={href}
        onClick={() => setOpen(false)}
        title={collapsed && !open ? label : undefined}
        className={`${navLinkClass} ${pathname === href ? 'active' : ''}`}
      >
        <Icon size={18} />
        <span className={labelClass}>{label}</span>
      </Link>
    ));

  const renderGroup = (key, label, links) =>
    links.length ? (
      <div className="mb-[7px] grid gap-1" key={key}>
        <button
          type="button"
          className={`flex w-full items-center ${
            collapsed ? 'md:justify-center md:px-0' : 'justify-between md:justify-between'
          } text-left text-[10px] font-bold uppercase tracking-[0.14em] text-[#b9c89a] transition hover:text-white ${
            collapsed ? 'md:pt-2 md:pb-[5px]' : ''
          } px-3 pb-[5px] pt-2`}
          onClick={() => setGroups((current) => ({ ...current, [key]: !current[key] }))}
        >
          <span className={labelClass}>{label}</span>
          <ChevronRight
            size={15}
            className={`transition-transform duration-200 ${
              groups[key] ? 'rotate-90' : ''
            } ${collapsed ? 'md:hidden' : ''}`}
          />
        </button>
        {groups[key] ? <div className="grid gap-1">{renderLinks(links)}</div> : null}
      </div>
    ) : null;

  const rootWidth = collapsed ? 'w-[252px] px-4 md:w-[76px] md:px-3' : 'w-[252px] px-4';

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-30 hidden h-[42px] w-[42px] place-items-center rounded-md bg-brand text-white max-md:grid"
        onClick={() => setOpen(true)}
        aria-label="Open navigation"
      >
        <Menu size={20} />
      </button>
      <aside
        data-collapsed={collapsed ? 'true' : 'false'}
        className={`group peer fixed inset-y-0 left-0 z-40 flex max-h-screen flex-col overflow-y-auto bg-brand text-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden transition-[width,transform] duration-200 ease-linear ${
          open ? 'max-md:translate-x-0' : 'max-md:-translate-x-full'
        } ${rootWidth} max-md:py-[18px] py-[24px]`}
      >
        <div
          className={`flex items-center ${
            collapsed ? 'md:justify-center md:px-0' : 'justify-between md:justify-between'
          } gap-2 px-2 pb-7`}
        >
          <PortalBrand size="sidebar" hideText={collapsed && !open} />
          <div className={collapsed ? 'hidden md:block' : ''}>
            <button
              type="button"
              className="grid h-7 w-7 place-items-center rounded-[5px] text-[#e8ecdf] transition hover:bg-white/15 hover:text-white max-md:hidden"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            </button>
          </div>
        </div>
        <nav
          className={`grid gap-[5px] ${collapsed ? 'md:[&_span]:hidden' : ''}`}
          aria-label={`${portal} navigation`}
        >
          {portal === 'student' ? (
            renderLinks(studentLinks)
          ) : (
            <>
              {renderGroup('operations', 'Operations', staffOperations)}
              {/* {renderGroup('hr', 'HR & Leave', hrLinks)} */}
              {renderGroup('administration', 'Administration', staffAdministration)}
              {renderGroup('academic', 'Academic setup', isSuper ? academicLinks : [])}
            </>
          )}
        </nav>
      </aside>
      {open ? (
        <button
          type="button"
          className="hidden max-md:block fixed inset-0 z-[35] border-0 bg-black/35"
          onClick={() => setOpen(false)}
          aria-label="Close navigation"
        />
      ) : null}
    </>
  );
}
