'use client';

import PortalHeaderUser from './PortalHeaderUser';
import { portalHeader, headerTitle } from '@/components/ui/cx';

export default function PageHeader({ title, portal = 'staff' }) {
  return (
    <header className={portalHeader}>
      <div>
        <h1 className={headerTitle}>{title}</h1>
      </div>
      <PortalHeaderUser portal={portal} />
    </header>
  );
}
