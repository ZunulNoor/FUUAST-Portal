export default {
  title: 'Activity logs',
  description: 'Trace changes made across the attendance system.',
  endpoint: '/activity-logs',
  columns: [
    ['actor_type', 'Actor'],
    ['action', 'Action'],
    ['entity_type', 'Entity'],
    ['created_at', 'Date'],
  ],
};