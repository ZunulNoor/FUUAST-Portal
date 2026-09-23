'use client';

import { LogOut, UserRound } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { headerUser } from '@/components/ui/cx';

export default function PortalHeaderUser({ portal = 'staff' }) {
  const user = useAuthStore((state) => state.user);
  const clearSession = useAuthStore((state) => state.clearSession);
  const router = useRouter();

  const logout = () => {
    clearSession();
    router.push(`/${portal}/login`);
  };

  return (
    <div className="flex shrink-0 items-center gap-3 max-xl:gap-2">
      <div className={headerUser}>
        <UserRound size={17} />
        <span className="max-w-[150px] truncate max-md:max-w-[90px]">
          {user?.name || (portal === 'student' ? 'Student' : 'Staff')}
        </span>
      </div>
      <button
        type="button"
        onClick={logout}
        title="Log out"
        aria-label="Log out"
        className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-line bg-paper px-3 text-[13px] font-semibold text-ink transition hover:bg-surface max-sm:px-2"
      >
        <LogOut size={16} />
        <span className="max-sm:hidden">Logout</span>
      </button>
    </div>
  );
}