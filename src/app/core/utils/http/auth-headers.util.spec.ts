import { authHeadersIfPresent } from './auth-headers.util';

describe('authHeadersIfPresent', () => {
  it('should return empty object when token is missing', () => {
    const headers = authHeadersIfPresent(() => null);
    expect(headers).toEqual({});
  });

  it('should return authorization header when token exists', () => {
    const headers = authHeadersIfPresent(() => 'jwt-token');
    expect(headers).toEqual({
      Authorization: 'Bearer jwt-token'
    });
  });
});
