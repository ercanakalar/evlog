import { ConfigService } from '@nestjs/config';
import { SahibindenProvider } from './sahibinden.provider';

describe('SahibindenProvider.parseReference', () => {
  const provider = new SahibindenProvider(
    new ConfigService({ SAHIBINDEN_API_URL: '', SAHIBINDEN_API_KEY: '' }) as never,
  );

  it('accepts a bare listing number', () => {
    expect(provider.parseReference('1234567890')).toEqual({
      externalId: '1234567890',
      url: 'https://www.sahibinden.com/ilan/1234567890',
    });
  });

  it('extracts the id from a listing link and drops the query string', () => {
    expect(
      provider.parseReference(
        'https://www.sahibinden.com/ilan/emlak-konut-kiralik-daire-1234567890/detay?utm=x',
      ),
    ).toEqual({
      externalId: '1234567890',
      url: 'https://www.sahibinden.com/ilan/emlak-konut-kiralik-daire-1234567890/detay',
    });
  });

  it.each([
    'http://www.sahibinden.com/ilan/x-1234567890/detay',
    'https://sahibinden.com.evil.io/ilan/x-1234567890/detay',
    'https://www.sahibinden.com/kategori/emlak',
    'not a link',
  ])('rejects %s', (input) => {
    expect(provider.parseReference(input)).toBeNull();
  });

  it('runs in link-only mode without credentials', () => {
    expect(provider.canSync).toBe(false);
  });
});
