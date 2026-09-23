'use client';

import { useState } from 'react';
import { Plus, RefreshCw, Download, FileDown, Upload, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { canAccessStaffResource } from '@/lib/staffAccess';
import PortalSidebar from './PortalSidebar';
import PortalHeaderUser from './PortalHeaderUser';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import useResourceData from '@/hooks/useResourceData';
import ResourceToolbar from '@/components/resources/ResourceToolbar';
import ResourceTable from '@/components/resources/ResourceTable';
import ResourceFormModal from '@/components/resources/ResourceFormModal';
import DetailModal from '@/components/resources/DetailModal';
import TimetableGrid from '@/components/resources/TimetableGrid';
import {
  panel,
  portalMain,
  portalHeader,
  portalContent,
  portalContentWide,
  headerTitle,
  headerSub,
  eyebrow,
} from '@/components/ui/cx';

export default function StaffResourcePage({ resource }) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const data = useResourceData(resource);
  const [timetableView, setTimetableView] = useState('grid');

  const {
    roleConfig,
    columns,
    rows,
    loading,
    error,
    message,
    credentialNotice,
    form,
    fieldOptions,
    visiblePasswords,
    search,
    setSearch,
    page,
    setPage,
    pagination,
    filters,
    setFilters,
    filterDepartments,
    filterSemesters,
    filterBatches,
    filterClasses,
    fileRef,
    load,
    openForm,
    openDetail,
    closeForm,
    submit,
    remove,
    download,
    importFile,
    togglePassword,
    canCreate,
    canEdit,
    canImport,
    canDownloadTemplate,
    canExport,
    batchSemesters,
    addBatchSemester,
    updateBatchSemester,
    removeBatchSemester,
    toDateInputValue,
    detailStudent,
    detailCourses,
    detailLoading,
    setDetailStudent,
    importReport,
    setImportReport,
  } = data;

  if (
    !hydrated ||
    !user ||
    !roleConfig ||
    !canAccessStaffResource(user.role, resource, user.pageAccess)
  )
    return null;

  const showToolbar =
    roleConfig.searchable || ['teachers', 'batches', 'timetable'].includes(resource);

  return (
    <>
      <PortalSidebar portal="staff" />
      <main className={portalMain}>
        <header className={portalHeader}>
          <div>
            <h1 className={headerTitle}>{roleConfig.title}</h1>
            <p className={headerSub}>{roleConfig.description}</p>
          </div>
          <PortalHeaderUser portal="staff" />
        </header>
        <div className={resource === 'students' ? portalContentWide : portalContent}>
          <section className={`${panel} p-6`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <span className={eyebrow}>STAFF WORKSPACE</span>
                <h2 className="text-xl font-bold text-ink">{roleConfig.title}</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="icon" onClick={load} title="Refresh" aria-label="Refresh">
                  <RefreshCw size={17} />
                </Button>
                {roleConfig.create && canCreate ? (
                  <Button variant="primary" onClick={() => openForm({})}>
                    <Plus size={16} /> Add new
                  </Button>
                ) : null}
                {roleConfig.templateEndpoint && canDownloadTemplate ? (
                  <Button variant="secondary" onClick={() => download(roleConfig.templateEndpoint)}>
                    <Download size={16} /> Template
                  </Button>
                ) : null}
                {roleConfig.exportEndpoint && canExport ? (
                  <Button variant="secondary" onClick={() => download(roleConfig.exportEndpoint)}>
                    <FileDown size={16} /> Export
                  </Button>
                ) : null}
                {roleConfig.importEndpoint && canImport ? (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept=".xlsx,.csv"
                      hidden
                      onChange={importFile}
                    />
                    <Button variant="secondary" onClick={() => fileRef.current?.click()}>
                      <Upload size={16} /> Import
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
            {showToolbar ? (
              <ResourceToolbar
                resource={resource}
                user={user}
                roleConfig={roleConfig}
                filters={filters}
                setFilters={setFilters}
                setPage={setPage}
                filterDepartments={filterDepartments}
                filterSemesters={filterSemesters}
                filterBatches={filterBatches}
                filterClasses={filterClasses}
                search={search}
                setSearch={setSearch}
              />
            ) : null}
            {credentialNotice ? (
              <p className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {credentialNotice}
              </p>
            ) : null}
            {message ? (
              <p className="mt-4 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                {message}
              </p>
            ) : null}
            {error && !form ? (
              <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-danger">{error}</p>
            ) : null}
            {resource === 'timetable' ? (
              <div className="mt-4 flex items-center gap-1 rounded-lg border border-line bg-surface p-1 text-xs font-semibold">
                {['grid', 'table'].map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setTimetableView(view)}
                    className={`rounded-md px-3 py-1.5 capitalize transition ${
                      timetableView === view
                        ? 'bg-white text-brand shadow-sm'
                        : 'text-muted hover:text-ink'
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            ) : null}
            <div className="mt-4">
              {loading ? (
                <p className="py-10 text-center text-sm text-muted">Loading workspace...</p>
              ) : resource === 'timetable' && timetableView === 'grid' ? (
                <TimetableGrid entries={rows} canEdit={canEdit} onEdit={openForm} onDelete={remove} />
              ) : (
                <ResourceTable
                  resource={resource}
                  columns={columns}
                  rows={rows}
                  roleConfig={roleConfig}
                  canEdit={canEdit}
                  onView={openDetail}
                  onEdit={openForm}
                  onDelete={remove}
                  page={page}
                  pagination={pagination}
                  onChangePage={setPage}
                />
              )}
            </div>
          </section>
        </div>
      </main>
      {form ? (
        <ResourceFormModal
          resource={resource}
          config={roleConfig}
          user={data.user}
          form={form}
          setForm={data.setForm}
          fieldOptions={fieldOptions}
          visiblePasswords={visiblePasswords}
          togglePassword={togglePassword}
          error={error}
          onSubmit={submit}
          onClose={closeForm}
          batchSemesters={batchSemesters}
          addBatchSemester={addBatchSemester}
          updateBatchSemester={updateBatchSemester}
          removeBatchSemester={removeBatchSemester}
          toDateInputValue={toDateInputValue}
        />
      ) : null}
      {detailStudent ? (
        <DetailModal
          student={detailStudent}
          courses={detailCourses}
          loading={detailLoading}
          onClose={() => setDetailStudent(null)}
        />
      ) : null}
      {importReport ? (
        <Modal
          size="xl"
          eyebrow="IMPORT CHECKLIST"
          title={`${importReport.skippedCount || 0} duplicate row(s) skipped`}
          onClose={() => setImportReport(null)}
        >
          <div className="min-w-0 overflow-y-auto p-5 sm:px-6">
            <p className="mb-4 text-sm text-muted">
              The following rows already exist and were not imported. Seat numbers are unique per
              batch; enrollment numbers are unique across all students.
            </p>
            <div className="overflow-x-auto rounded-md border border-line">
              <table className="w-full min-w-[560px] text-left text-xs">
                <thead className="bg-surface text-[10px] uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Seat</th>
                    <th className="px-3 py-2 font-semibold">Name</th>
                    <th className="px-3 py-2 font-semibold">Enrollment</th>
                    <th className="px-3 py-2 font-semibold">Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line bg-paper">
                  {(importReport.duplicates || []).map((entry, index) => (
                    <tr key={`${entry.row}-${index}`}>
                      <td className="px-3 py-2.5 text-muted">{entry.row}</td>
                      <td className="px-3 py-2.5 font-semibold text-ink">{entry.seat_number}</td>
                      <td className="px-3 py-2.5 text-ink">{entry.name}</td>
                      <td className="px-3 py-2.5 text-muted">{entry.enrollment_no || '—'}</td>
                      <td className="px-3 py-2.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-1 text-[10px] font-bold ${
                            entry.status === 'duplicate-seat'
                              ? 'bg-[#fff5e8] text-warning'
                              : 'bg-[#fff0f0] text-danger'
                          }`}
                        >
                          <AlertTriangle size={12} />
                          {entry.status === 'duplicate-seat'
                            ? 'Seat already in batch'
                            : 'Enrollment already used'}
                        </span>
                        <span className="mt-1 block text-muted">{entry.detail}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
