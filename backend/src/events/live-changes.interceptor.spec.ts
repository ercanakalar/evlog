import { touchedBy } from './live-changes.interceptor';

describe('what a change touches', () => {
  it('is nothing for reads', () => {
    expect(touchedBy('GET', '/api/v1/receipts')).toBeNull();
  });

  it('follows the part of the API that was changed', () => {
    expect(touchedBy('PATCH', '/api/v1/home-items/abc')).toEqual(['HomeItem', 'List']);
    expect(touchedBy('POST', '/api/v1/receipts/abc/confirm')).toContain('HomeItem');
    expect(touchedBy('DELETE', '/api/v1/lists/abc/items/def')).toEqual(['List']);
  });

  it('leaves out personal settings, sign-in and household changes', () => {
    expect(touchedBy('PATCH', '/api/v1/me/settings')).toBeNull();
    expect(touchedBy('POST', '/api/v1/auth/refresh')).toBeNull();
    expect(touchedBy('POST', '/api/v1/household/join')).toBeNull();
  });
});
