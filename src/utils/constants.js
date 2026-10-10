// Общие константы предметной области.
export const ELEMENT_TYPES = [
  'background',
  'play_button',
  'pause_button',
  'next_button',
  'prev_button',
  'volume',
  'progress_bar',
  'album_art',
  'menu_icon',
  'text_label',
];

export const THEME_STATUSES = ['draft', 'pending', 'approved', 'rejected'];

// Статусы, в которых автор ещё может править тему.
export const EDITABLE_STATUSES = ['draft', 'rejected'];

export const ROLE_NAMES = ['user', 'moderator', 'admin'];
