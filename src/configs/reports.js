export default {
  title: 'Attendance reports',
  description: 'Review attendance summaries and export the current report.',
  endpoint: '/reports',
  exportEndpoint: '/reports/export',
  columns: [
    ['student_id', 'Student ID'],
    ['student_name', 'Student'],
    ['subject_name', 'Subject'],
    ['attendance_percentage', 'Percentage'],
  ],
};