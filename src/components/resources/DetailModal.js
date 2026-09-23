'use client';

import Modal from '@/components/ui/Modal';
import EmptyState from '@/components/ui/EmptyState';

export default function DetailModal({ student, courses, loading, onClose }) {
  return (
    <Modal size="lg" eyebrow="STUDENT COURSES" title={`${student.name} (${student.student_id})`} onClose={onClose}>
      <div className="min-w-0 overflow-hidden">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-5 py-3 sm:px-6">
          <h3 className="text-sm font-bold text-ink">Course-wise attendance</h3>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
            Total / Attended
          </span>
        </div>
        <div className="min-w-0 overflow-hidden">
          {loading ? (
            <EmptyState>Loading courses...</EmptyState>
          ) : courses.length ? (
            <div className="divide-y divide-line">
              {courses.map((course) => (
                <div
                  key={course.class_subject_teacher_id}
                  className="flex items-center justify-between gap-3 px-5 py-3 sm:px-6"
                >
                  <div className="min-w-0">
                    <strong className="block truncate text-sm text-ink">
                      {course.subject_name} {course.subject_code ? `(${course.subject_code})` : ''}
                    </strong>
                    <small className="block truncate text-xs text-muted">
                      {course.class_code} · {course.teacher_name || 'Teacher pending'} · {course.semester}
                    </small>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-sm font-bold text-ink">
                      {course.total_classes}/{course.attended_classes}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                        course.percentage >= 75
                          ? 'bg-success/10 text-success'
                          : 'bg-danger/10 text-danger'
                      }`}
                    >
                      {course.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState>No courses allocated to this student.</EmptyState>
          )}
        </div>
      </div>
    </Modal>
  );
}