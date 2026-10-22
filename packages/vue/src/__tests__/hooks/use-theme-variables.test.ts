import { describe, expect, it } from 'vite-plus/test';
import { collectThemeVariables, invalidateThemeVariableCache } from '../../theme/useThemeVariables';
import { getOwnerDocument, getOwnerWindow } from '../../utils/dom';

describe('useThemeVariables', () => {
  it('collects built-in and custom s-table variables', () => {
    const source = document.createElement('div');
    source.style.setProperty('--s-primary-color', '#0f766e');
    source.style.setProperty('--s-custom-demo-token', 'custom-value');

    const variables = collectThemeVariables(source);

    expect(variables['--s-primary-color']).toBe('#0f766e');
    expect(variables['--s-custom-demo-token']).toBe('custom-value');
  });

  it('discovers inline variables added after the first collection', () => {
    const source = document.createElement('div');
    source.style.setProperty('--s-initial-token', 'initial');

    expect(collectThemeVariables(source)['--s-initial-token']).toBe('initial');

    source.style.setProperty('--s-late-token', 'late');
    expect(collectThemeVariables(source)['--s-late-token']).toBe('late');
  });

  it('can explicitly invalidate cached variable names', () => {
    const source = document.createElement('div');
    source.style.setProperty('--s-cache-token', 'before');
    collectThemeVariables(source);

    source.style.removeProperty('--s-cache-token');
    invalidateThemeVariableCache(source);

    expect(collectThemeVariables(source)['--s-cache-token']).toBeUndefined();
  });

  it('preserves the owner document and window for document nodes', () => {
    expect(getOwnerDocument(document)).toBe(document);
    expect(getOwnerWindow(document)).toBe(window);
  });
});
