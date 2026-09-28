export const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

export const selectOptions = (optionsEndpoint, optionLabel, optionValue = 'id') => ({
  type: 'select',
  optionsEndpoint,
  optionLabel,
  optionValue,
});

export const searchableOptions = (optionsEndpoint, optionLabel, optionValue = 'id') => ({
  type: 'searchable-select',
  optionsEndpoint,
  optionLabel,
  optionValue,
});

export const creatableOptions = (optionsEndpoint, optionLabel, textField, optionValue = 'id') => ({
  type: 'creatable-select',
  optionsEndpoint,
  optionLabel,
  optionValue,
  textField,
});

// "Semester 2 (FALL 2026 23 Evening)" — batch names carry the shift, so every
// semester dropdown across the app disambiguates itself the same way.
export const semesterLabel = (row) =>
  row.semester || `Semester ${row.number}${row.batch_name ? ` (${row.batch_name})` : ''}`;
