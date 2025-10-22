export function authHeadersIfPresent(getToken: () => string | null): HeadersInit {
  const token = typeof getToken === 'function' ? getToken() : null;
  if (token && token.trim().length > 0) {
    return {
      Authorization: `Bearer ${token}`
    };
  }
  return {};
}

