import { beforeEach, describe, expect, it } from 'vitest';
import { parseHash, navigate, currentRoute } from '@/router/router';

beforeEach(() => {
  location.hash = '';
});

describe('parseHash', () => {
  it('defaults to home for an empty hash', () => {
    expect(parseHash('')).toEqual({ name: 'home', params: {} });
    expect(parseHash('#')).toEqual({ name: 'home', params: {} });
  });

  it('falls back to home for an unknown route name', () => {
    expect(parseHash('#not-a-real-route')).toEqual({ name: 'home', params: {} });
  });

  it('parses a path segment as params.param', () => {
    expect(parseHash('#read/42')).toEqual({ name: 'read', params: { param: '42' } });
  });

  it('parses query params, decoding keys and values', () => {
    expect(parseHash('#contents?filter=favourites%20only')).toEqual({
      name: 'contents',
      params: { filter: 'favourites only' },
    });
  });

  it('parses both a path segment and query params together', () => {
    expect(parseHash('#read/5?from=home')).toEqual({
      name: 'read',
      params: { param: '5', from: 'home' },
    });
  });
});

describe('navigate', () => {
  it('updates location.hash and currentRoute for a bare route', () => {
    navigate('quiz');
    expect(location.hash).toBe('#quiz');
    expect(currentRoute.value).toEqual({ name: 'quiz', params: {} });
  });

  it('serializes a numeric param as a path segment', () => {
    navigate('read', { param: 7 });
    expect(location.hash).toBe('#read/7');
    expect(currentRoute.value.params.param).toBe('7');
  });

  it('serializes extra params as an encoded query string', () => {
    navigate('contents', { filter: 'my favourites' });
    expect(location.hash).toBe('#contents?filter=my%20favourites');
  });
});
