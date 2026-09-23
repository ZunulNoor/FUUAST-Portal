import attendance from './attendance';
import students from './students';
import reports from './reports';
import activityLogs from './activityLogs';
import departments from './departments';
import users from './users';
import teachers from './teachers';
import permissions from './permissions';
import batches from './batches';
import semesters from './semesters';
import classes from './classes';
import subjects from './subjects';
import assignments from './assignments';
import timetable from './timetable';

export const configs = {
  attendance,
  students,
  reports,
  'activity-logs': activityLogs,
  departments,
  users,
  teachers,
  permissions,
  batches,
  semesters,
  classes,
  subjects,
  assignments,
  timetable,
};

export function getConfig(resource) {
  return configs[resource] || null;
}
