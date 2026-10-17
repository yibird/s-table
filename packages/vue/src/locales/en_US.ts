import type { STableLocale } from './types';

/**
 * English (US) language pack.
 */
const en_US: STableLocale = {
  localeName: 'en_US',
  empty: {
    title: 'No Data',
    description: 'No data available to display',
  },
  filter: {
    reset: 'Reset',
    confirm: 'OK',
  },
  search: {
    reset: 'Reset',
    confirm: 'Search',
    placeholder: 'Search...',
  },
  selection: {
    selectAll: 'Select All',
    clearAll: 'Clear All',
    selectOddRows: 'Select Odd Rows',
    selectEvenRows: 'Select Even Rows',
    selectCurrentPage: 'Select Current Page',
  },
  pagination: {
    jumpTo: 'Go to',
    page: 'Page',
    itemsPerPage: 'items/page',
  },
  select: {
    placeholder: 'Please select',
    noData: 'No data',
  },
  table: {
    sequence: 'No.',
  },
  accessibility: {
    table: 'Data table',
    filterColumn: 'Filter column',
    searchColumn: 'Search column',
    contextMenu: 'Row actions',
    expandTrigger: 'Expand or collapse row',
    selectionDropdown: 'Selection actions menu',
    resizeColumn: 'Resize column',
    loading: 'Loading',
  },
};

export default en_US;
