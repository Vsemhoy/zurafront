export const departmentColors = [
  ['#c9f1d5', 'Мятный'], ['#d4e8fc', 'Голубой'],
  ['#e5dcfa', 'Лавандовый'], ['#f9dce5', 'Розовый'],
  ['#fce4cd', 'Персиковый'], ['#f7efc6', 'Кремовый'],
  ['#cdeee9', 'Бирюзовый'], ['#e3e8ef', 'Серый'],
];
export const departmentColor = (department) => departmentColors.some(([color]) => color === department?.color) ? department.color : '#c9f1d5';
