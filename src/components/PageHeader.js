'use client';

import PortalHeaderUser from './PortalHeaderUser';
import { portalHeader, headerTitle, headerSub, eyebrow } from '@/components/ui/cx';

export default function PageHeader({ title, description, eyebrowText, portal = 'staff' }) {
  return (
    <header className={portalHeader}>
      <div>
        {eyebrowText ? <span className={eyebrow}>{eyebrowText}</span> : null}
        <h1 className={headerTitle}>{title}</h1>
        {description ? <p className={headerSub}>{description}</p> : null}
      </div>
      <PortalHeaderUser portal={portal} />
    </header>
  );
}