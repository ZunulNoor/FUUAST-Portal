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