'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { staffApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { canAccessStaffResource } from '@/lib/staffAccess';
import { getConfig } from '@/configs';
import { useConfirm } from '@/components/providers/ConfirmProvider';
import { useToastStore, stashPendingToast } from '@/store/toastStore';

export default function useResourceData(resource) {
  const user = useAuthStore((state) => state.user);
  const hydrated = useAuthStore((state) => state.hydrated);
  const router = useRouter();
  const config = getConfig(resource);
  const confirm = useConfirm();
  const fileRef = useRef(null);
  const toast = useToastStore((state) => state.toast);

  const notifyAndReload = (notification) => {
    stashPendingToast(notification);
    window.location.reload();
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [form, setForm] = useState(null);
  const [fieldOptions, setFieldOptions] = useState({});
  const [credentialNotice, setCredentialNotice] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [filters, setFilters] = useState({ department_id: '', semester_id: '' });
  const [filterDepartments, setFilterDepartments] = useState([]);
  const [filterSemesters, setFilterSemesters] = useState([]);
  const [filterBatches, setFilterBatches] = useState([]);
  const [filterClasses, setFilterClasses] = useState([]);
  const [teacherOfferings, setTeacherOfferings] = useState([]);
  const [detailStudent, setDetailStudent] = useState(null);
  const [detailCourses, setDetailCourses] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [batchSemesters, setBatchSemesters] = useState([]);
  const [originalBatchClasses, setOriginalBatchClasses] = useState([]);
  const [importReport, setImportReport] = useState(null);

  const roleConfig =
    user?.role === 'admin' && ['teachers', 'students', 'timetable'].includes(resource)
      ? {
          ...config,
          create: resource === 'timetable' ? config.create : false,
          remove: resource === 'timetable',
          edit: resource === 'students' || resource === 'timetable',
          templateEndpoint: null,
          exportEndpoint: resource === 'students' ? config.exportEndpoint : null,
          importEndpoint: null,
        }
      : user?.role === 'admin' && resource === 'subjects'
        ? {
            ...config,
            fields: config.fields.map((field) =>
              field.name === 'department_id' ? { ...field, readOnly: true } : field,
            ),
          }
        : config;
  const canCreate = !roleConfig?.createRoles || roleConfig.createRoles.includes(user?.role);
  const canEdit = !roleConfig?.editRoles || roleConfig.editRoles.includes(user?.role);
  const canImport = !roleConfig?.importRoles || roleConfig.importRoles.includes(user?.role);
  const canDownloadTemplate =
    !roleConfig?.templateRoles || roleConfig.templateRoles.includes(user?.role);
  const canExport = !roleConfig?.exportRoles || roleConfig.exportRoles.includes(user?.role);
  const columns =
    user?.role === 'admin' && roleConfig.adminColumns
      ? roleConfig.adminColumns
      : roleConfig.columns;

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const params = roleConfig.searchable
        ? {
            search: search || undefined,
            page,
            limit: 25,
            department_id:
              (resource === 'students' || resource === 'batches' || resource === 'timetable') &&
              filters.department_id
                ? filters.department_id
                : undefined,
            semester_id:
              (resource === 'students' || resource === 'timetable') && filters.semester_id
                ? filters.semester_id
                : undefined,
            batch_id: resource === 'students' && filters.batch_id ? filters.batch_id : undefined,
            class_id: resource === 'students' && filters.class_id ? filters.class_id : undefined,
          }
        : resource === 'teachers'
          ? { search: search || undefined }
          : resource === 'batches'
            ? { department_id: filters.department_id || undefined }
            : resource === 'timetable'
              ? {
                  department_id: filters.department_id || undefined,
                  semester_id: filters.semester_id || undefined,
                  batch_id: filters.batch_id || undefined,
                  class_id: filters.class_id || undefined,
                }
              : undefined;
      const response = await staffApi.get(roleConfig.endpoint, params ? { params } : undefined);
      const data = response.data?.data || response.data || [];
      setRows(Array.isArray(data) ? data : []);
      setPagination(response.data?.pagination || null);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load this workspace.');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (row) => {
    setDetailStudent(row);
    setDetailLoading(true);
    setDetailCourses([]);
    setError('');
    try {
      const response = await staffApi.get(`/students/${row.id}/courses`, {
        params: filters.semester_id ? { semester_id: filters.semester_id } : undefined,
      });
      setDetailCourses(response.data?.courses || []);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to load course attendance.');
    } finally {
      setDetailLoading(false);
    }
  };

  const closeForm = () => {
    setForm(null);
    setBatchSemesters([]);
    setOriginalBatchClasses([]);
  };

  const openForm = (row) => {
    setError('');
    setCredentialNotice('');
    const base = row || {};
    if (resource === 'timetable' && base.id) {
      base.class_subject_teacher_label =
        base.batch_name || base.subject_name
          ? `${base.batch_name || ''}${base.semester_number ? ` | Semester ${base.semester_number}` : ''} | ${base.subject_name || ''} | ${base.teacher_name || 'No teacher'}`
          : '';
      base.teacher_label = base.teacher_name || '';
      staffApi
        .get('/timetable', { params: { class_id: base.class_id } })
        .then((response) => {
          const allEntries = response.data?.data || response.data || [];
          const siblings = allEntries.filter(
            (entry) =>
              Number(entry.class_subject_teacher_id) === Number(base.class_subject_teacher_id),
          );
          const entriesByDay = new Map();
          for (const entry of siblings) entriesByDay.set(entry.day_of_week, entry);
          if (!entriesByDay.has(base.day_of_week)) entriesByDay.set(base.day_of_week, base);
          const days = {};
          const dayEntryIds = {};
          for (const [day, entry] of entriesByDay) {
            days[day] = {
              enabled: true,
              start_time: entry.start_time,
              end_time: entry.end_time,
            };
            dayEntryIds[day] = entry.id;
          }
          setForm((current) => ({ ...(current || {}), days, dayEntryIds }));
        })
        .catch(() => {
          setForm((current) => ({
            ...(current || {}),
            days: {
              [base.day_of_week]: {
                enabled: true,
                start_time: base.start_time,
                end_time: base.end_time,
              },
            },
            dayEntryIds: { [base.day_of_week]: base.id },
          }));
        });
    }
    if (user?.role === 'admin' && !base.id && resource === 'subjects') {
      base.department_id = user.departmentId;
    }
    if (user?.role === 'admin' && resource === 'batches') {
      if (!base.id) base.department_id = user.departmentId;
      if (user.departmentId) {
        staffApi
          .get('/departments')
          .then((response) => {
            const departments = response.data?.data || response.data || [];
            const department = departments.find(
              (entry) => Number(entry.id) === Number(user.departmentId),
            );
            if (department)
              setForm((current) => ({ ...(current || {}), department_name: department.name }));
          })
          .catch(() => {});
      }
    }
    setForm(base);
    if (resource === 'batches' && !base.id) {
      setBatchSemesters([{ id: null, number: 1, start_date: '', end_date: '', is_active: 1 }]);
    } else {
      setBatchSemesters([]);
    }
    if (row?.id && resource === 'batches') {
      staffApi
        .get('/semesters', { params: { batch_id: row.id } })
        .then((response) => setBatchSemesters(response.data?.data || response.data || []))
        .catch(() => setBatchSemesters([]));
      staffApi
        .get('/classes', { params: { batch_id: row.id } })
        .then((response) => {
          const classes = response.data?.data || response.data || [];
          setOriginalBatchClasses(classes);
          setForm((current) => ({
            ...(current || {}),
            sections: classes.map((classRow) => classRow.section_name),
          }));
        })
        .catch(() => setOriginalBatchClasses([]));
    }
  };

  const toDateInputValue = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
      date.getDate(),
    ).padStart(2, '0')}`;
  };

  const addBatchSemester = () =>
    setBatchSemesters((list) => [
      ...list,
      {
        id: null,
        number: list.length
          ? Math.max(...list.map((semester) => Number(semester.number) || 0)) + 1
          : 1,
        start_date: '',
        end_date: '',
        is_active: list.length === 0 ? 1 : 0,
      },
    ]);
  const updateBatchSemester = (index, patch) =>
    setBatchSemesters((list) =>
      list.map((semester, semesterIndex) =>
        semesterIndex === index ? { ...semester, ...patch } : semester,
      ),
    );
  const removeBatchSemester = (index) =>
    setBatchSemesters((list) => list.filter((_, semesterIndex) => semesterIndex !== index));

  useEffect(() => {
    if (!hydrated) return;
    if (!user) router.push('/staff/login');
    else if (canAccessStaffResource(user.role, resource, user.pageAccess)) load();
    else router.replace('/staff');
  }, [hydrated, user, router, resource, search, page, filters.department_id, filters.semester_id, filters.batch_id, filters.class_id]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (resource === 'students' && user.role === 'teacher') {
      let active = true;
      staffApi
        .get('/attendance/offerings')
        .then((response) => {
          if (!active) return;
          const offerings = response.data?.data || response.data || [];
          setTeacherOfferings(offerings);
          const semesters = [];
          const seen = new Set();
          for (const offering of offerings) {
            if (!offering.semester_id) continue;
            const key = String(offering.semester_id);
            if (seen.has(key)) continue;
            seen.add(key);
            semesters.push({
              id: offering.semester_id,
              number: offering.semester_number,
              semester: `Semester ${offering.semester_number} (${offering.batch_name || ''})`,
              batch_name: offering.batch_name,
            });
          }
          semesters.sort((a, b) => Number(b.number) - Number(a.number));
          setFilterSemesters(semesters);
        })
        .catch(() => setError('Unable to load filter options.'));
      return () => {
        active = false;
      };
    }
    const adminRoles = ['super_admin', 'keen_admin', 'admin'];
    const needsDepartments =
      resource === 'batches' || resource === 'timetable'
        ? ['super_admin', 'keen_admin'].includes(user.role)
        : resource === 'students' && user.role !== 'admin';
    const needsSemesters =
      resource === 'students' || (resource === 'timetable' && adminRoles.includes(user.role));
    const needsBatches =
      resource === 'students' || (resource === 'timetable' && adminRoles.includes(user.role));
    if (!needsDepartments && !needsSemesters && !needsBatches) return;
    let active = true;
    const loadOptions = async () => {
      try {
        const requests = [];
        if (needsDepartments) requests.push(staffApi.get('/departments'));
        if (needsSemesters) requests.push(staffApi.get('/semesters'));
        if (needsBatches) requests.push(staffApi.get('/batches'));
        const responses = await Promise.all(requests);
        if (!active) return;
        let offset = 0;
        if (needsDepartments) {
          const deptResponse = responses[offset];
          offset += 1;
          setFilterDepartments(deptResponse.data?.data || deptResponse.data || []);
        }
        if (needsSemesters) {
          const semResponse = responses[offset];
          offset += 1;
          setFilterSemesters(semResponse.data?.data || semResponse.data || []);
        }
        if (needsBatches) {
          const batchResponse = responses[offset];
          offset += 1;
          setFilterBatches(batchResponse.data?.data || batchResponse.data || []);
        }
      } catch {
        setError('Unable to load filter options.');
      }
    };
    loadOptions();
    return () => {
      active = false;
    };
  }, [hydrated, resource, user]);

  useEffect(() => {
    if (!hydrated || !user) return;
    if (resource === 'students' && user.role === 'teacher') {
      const classes = [];
      const seen = new Set();
      for (const offering of teacherOfferings) {
        if (!offering.class_id) continue;
        if (
          filters.semester_id &&
          String(offering.semester_id) !== String(filters.semester_id)
        )
          continue;
        const key = String(offering.class_id);
        if (seen.has(key)) continue;
        seen.add(key);
        classes.push({
          id: offering.class_id,
          class_code: offering.class_code,
          section_name: offering.section_name,
        });
      }
      classes.sort((a, b) => String(a.class_code).localeCompare(String(b.class_code)));
      setFilterClasses(classes);
      return;
    }
    if (!['students', 'timetable'].includes(resource) || !filters.batch_id) {
      setFilterClasses([]);
      return;
    }
    let active = true;
    staffApi
      .get('/classes', { params: { batch_id: filters.batch_id } })
      .then((response) => {
        if (!active) return;
        setFilterClasses(response.data?.data || response.data || []);
      })
      .catch(() => setFilterClasses([]));
    return () => {
      active = false;
    };
  }, [hydrated, resource, user, filters.batch_id, filters.semester_id, teacherOfferings]);

  useEffect(() => {
    if (!form || !roleConfig?.fields?.some((field) => field.optionsEndpoint)) return;
    Promise.all(
      roleConfig.fields
        .filter((field) => field.optionsEndpoint)
        .map(async (field) => {
          const response = await staffApi.get(field.optionsEndpoint);
          return [field.name, response.data?.data || response.data || []];
        }),
    )
      .then((entries) =>
        setFieldOptions((previous) => ({ ...previous, ...Object.fromEntries(entries) })),
      )
      .catch(() => setError('Unable to load options.'));
  }, [form, resource, user?.role]);

  const prevBatchSemesterRef = useRef({ batch_id: null, semester_id: null });
  useEffect(() => {
    if (resource !== 'attendance' || !form) return;
    const semesters = fieldOptions.semester_id || [];
    if (!semesters.length) return;
    const prev = prevBatchSemesterRef.current;
    const batchChanged = String(prev.batch_id ?? '') !== String(form.batch_id ?? '');
    const semesterChanged = String(prev.semester_id ?? '') !== String(form.semester_id ?? '');

    if (batchChanged && form.batch_id) {
      const match = semesters.find((semester) => Number(semester.batch_id) === Number(form.batch_id));
      if (match && String(match.id) !== String(form.semester_id)) {
        prevBatchSemesterRef.current = { batch_id: form.batch_id, semester_id: match.id };
        setForm((current) => ({ ...(current || {}), semester_id: match.id }));
        return;
      }
    }
    if (semesterChanged && form.semester_id) {
      const match = semesters.find((semester) => Number(semester.id) === Number(form.semester_id));
      if (match && String(match.batch_id) !== String(form.batch_id)) {
        prevBatchSemesterRef.current = { batch_id: match.batch_id, semester_id: form.semester_id };
        setForm((current) => ({ ...(current || {}), batch_id: match.batch_id }));
        return;
      }
    }
    prevBatchSemesterRef.current = {
      batch_id: form.batch_id ?? null,
      semester_id: form.semester_id ?? null,
    };
  }, [resource, form, fieldOptions]);

  const submit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    const isUpdate = Boolean(form.id) || resource === 'assignments';
    if (isUpdate) {
      const proceed = await confirm({
        title: 'Save changes?',
        message: 'This will update the existing record.',
        confirmLabel: 'Save',
      });
      if (!proceed) return;
    }
    try {
      if (resource === 'timetable') {
        const selected = Object.entries(form.days || {}).filter(([, value]) => value.enabled);
        if (!selected.length) throw new Error('Select at least one day.');
        for (const [day, value] of selected) {
          if (!value.start_time || !value.end_time || value.start_time >= value.end_time)
            throw new Error(`Enter valid times for ${day}.`);
        }
        const previousIds = form.dayEntryIds || {};
        for (const [day, value] of selected) {
          const payload = {
            class_subject_teacher_id: form.class_subject_teacher_id,
            class_id: form.class_id,
            teacher_id: form.teacher_id || undefined,
            room: form.room || undefined,
            color: form.color || undefined,
            day_of_week: day,
            start_time: value.start_time,
            end_time: value.end_time,
          };
          if (previousIds[day]) {
            await staffApi.put(`/timetable/${previousIds[day]}`, payload);
          } else {
            await staffApi.post('/timetable', payload);
          }
        }
        for (const [day, id] of Object.entries(previousIds)) {
          if (!selected.some(([selectedDay]) => selectedDay === day)) {
            await staffApi.delete(`/timetable/${id}`);
          }
        }
        setForm(null);
        notifyAndReload(form.id ? 'Timetable updated successfully.' : 'Timetable saved successfully.');
        return;
      }
      if (resource === 'attendance') {
        if (!form.batch_id) throw new Error('Select a batch.');
        if (!form.semester_id) throw new Error('Select a semester.');
        if (!form.subject_id && !form.subject_name) throw new Error('Select a subject.');
        await staffApi.post(roleConfig.endpoint, {
          batch_id: form.batch_id,
          semester_id: form.semester_id,
          subject_id: form.subject_id,
          subject_name: form.subject_name,
          teacher_id: form.teacher_id,
          course_type: form.course_type,
          shift: form.shift,
        });
        setForm(null);
        notifyAndReload('Course allocation saved successfully.');
        return;
      }
      if (resource === 'assignments') {
        await staffApi.put(`${roleConfig.endpoint}/${form.class_subject_teacher_id}`, {
          teacher_id: form.teacher_id,
        });
        setForm(null);
        notifyAndReload('Teacher assigned successfully.');
        return;
      }
      if (resource === 'batches') {
        let batchId = form.id;
        const batchPayload = form.id
          ? {
              name: form.name,
              start_year: form.start_year,
              end_year: form.end_year,
            }
          : {
              department_id: user.role === 'admin' ? user.departmentId : form.department_id,
              name: form.name,
              start_year: form.start_year,
              end_year: form.end_year,
            };
        if (batchId) {
          await staffApi.put(`/batches/${batchId}`, batchPayload);
        } else {
          const created = await staffApi.post('/batches', batchPayload);
          batchId = created.data?.id;
        }
        let newSemesterId = null;
        for (const semester of batchSemesters) {
          const semesterPayload = {
            number: semester.number,
            start_date: semester.start_date || null,
            end_date: semester.end_date || null,
            is_active: semester.is_active ? 1 : 0,
          };
          if (semester.id) {
            await staffApi.put(`/semesters/${semester.id}`, semesterPayload);
          } else {
            const createdSemester = await staffApi.post('/semesters', {
              ...semesterPayload,
              batch_id: batchId,
            });
            newSemesterId = createdSemester.data?.id || null;
          }
        }
        if (!form.id && newSemesterId) {
          const sections = Array.isArray(form.sections)
            ? form.sections.filter((section) => section && section.trim())
            : [];
          for (const section of sections) {
            await staffApi.post('/classes', {
              department_id: user.role === 'admin' ? user.departmentId : form.department_id,
              batch_id: batchId,
              semester_id: newSemesterId,
              section_name: section,
              class_code: `${form.name || 'Batch'} ${section}`.trim(),
            });
          }
        }
        if (form.id) {
          const existingSections = originalBatchClasses.map((classRow) => classRow.section_name);
          const requestedSections = Array.isArray(form.sections)
            ? form.sections.filter((section) => section && section.trim())
            : [];
          const addedSections = requestedSections.filter(
            (section) => !existingSections.includes(section),
          );
          const removedSections = existingSections.filter(
            (section) => !requestedSections.includes(section),
          );
          const targetSemesterId =
            batchSemesters.find((semester) => semester.is_active)?.id || batchSemesters[0]?.id || null;
          for (const section of addedSections) {
            if (!targetSemesterId) {
              throw new Error('No semester is available to add the new section to.');
            }
            await staffApi.post('/classes', {
              department_id: user.role === 'admin' ? user.departmentId : form.department_id,
              batch_id: batchId,
              semester_id: targetSemesterId,
              section_name: section,
              class_code: `${form.name || 'Batch'} ${section}`.trim(),
            });
          }
          for (const section of removedSections) {
            const classRow = originalBatchClasses.find(
              (entry) => entry.section_name === section,
            );
            if (!classRow?.id) continue;
            await staffApi.delete(`/classes/${classRow.id}`);
          }
        }
        closeForm();
        notifyAndReload('Batch saved successfully.');
        return;
      }
      const payload =
        user.role === 'admin' && resource === 'students'
          ? { status: form.status }
          : Object.fromEntries(
              roleConfig.fields.map((field) => [field.name, form[field.name] || null]),
            );
      const response = form.id
        ? await staffApi.put(`${roleConfig.endpoint}/${form.id}`, payload)
        : await staffApi.post(roleConfig.endpoint, payload);
      const temporaryPassword =
        ['teachers', 'users'].includes(resource) &&
        !form.id &&
        response.data?.temporaryPassword
          ? response.data.temporaryPassword
          : null;
      setForm(null);
      if (temporaryPassword) {
        setCredentialNotice(`Temporary password: ${temporaryPassword}`);
        setMessage('Saved successfully.');
        load();
      } else {
        notifyAndReload('Saved successfully.');
      }
    } catch (requestError) {
      setError(
        requestError.response?.data?.error?.message ||
          requestError.message ||
          'Unable to save this record.',
      );
    }
  };

  const remove = async (id) => {
    const proceed = await confirm({
      title: 'Delete this record?',
      message: `Delete record #${id}? This action cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!proceed) return;
    try {
      await staffApi.delete(`${roleConfig.endpoint}/${id}`);
      notifyAndReload('Deleted successfully.');
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to delete this record.');
    }
  };

  const download = async (endpoint) => {
    try {
      if (resource === 'students' && endpoint.includes('template') && !filters.batch_id) {
        setError('Select a batch (and its section) first, then download the template.');
        return;
      }
      const params =
        resource === 'students'
          ? {
              department_id: filters.department_id || undefined,
              batch_id: filters.batch_id || undefined,
              class_id: filters.class_id || undefined,
            }
          : {};
      const hasParams = Object.values(params).some((value) => value);
      const response = await staffApi.get(endpoint, {
        params: hasParams ? params : undefined,
        responseType: 'blob',
      });
      const url = URL.createObjectURL(response.data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = endpoint.includes('template')
        ? `${resource}_import_template.xlsx`
        : `${resource}_export.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to download this file.');
    }
  };

  const importFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (resource === 'students' && !filters.batch_id) {
      setError('Select a batch (and its section) first, then import students.');
      return;
    }
    const data = new FormData();
    data.append('file', file);
    try {
      const params =
        resource === 'students'
          ? {
              batch_id: filters.batch_id || undefined,
              class_id: filters.class_id || undefined,
            }
          : {};
      const hasParams = Object.values(params).some((value) => value);
      const response = await staffApi.post(roleConfig.importEndpoint, data, {
        params: hasParams ? params : undefined,
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const importData = response.data || {};
      const skipped = Number(importData.skippedCount || 0);
      const summary = `${Number(importData.insertedCount || 0)} new student(s) imported${
        skipped ? `, ${skipped} duplicate(s) skipped` : ''
      }.`;
      if ((importData.duplicates || []).length) {
        setImportReport(importData);
        toast.success(summary);
        load();
      } else {
        stashPendingToast(summary);
        window.location.reload();
      }
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || 'Unable to import this file.');
    }
    event.target.value = '';
  };

  const togglePassword = (name) => {
    setVisiblePasswords((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  return {
    user,
    hydrated,
    router,
    config,
    fileRef,
    rows,
    loading,
    error,
    setError,
    message,
    setMessage,
    credentialNotice,
    setCredentialNotice,
    form,
    setForm,
    fieldOptions,
    search,
    setSearch,
    page,
    setPage,
    pagination,
    visiblePasswords,
    filters,
    setFilters,
    filterDepartments,
    filterSemesters,
    filterBatches,
    filterClasses,
    detailStudent,
    detailCourses,
    detailLoading,
    batchSemesters,
    roleConfig,
    canCreate,
    canEdit,
    canImport,
    canDownloadTemplate,
    canExport,
    columns,
    load,
    openDetail,
    openForm,
    closeForm,
    submit,
    remove,
    download,
    importFile,
    togglePassword,
    toDateInputValue,
    setDetailStudent,
    importReport,
    setImportReport,
    addBatchSemester,
    updateBatchSemester,
    removeBatchSemester,
  };
}
