/**
 * API client – all requests go through here.
 * Credentials: 'include' sends the httpOnly cookie automatically.
 * On 401, redirects to /login (unless already there).
 */

const BASE = '/api';

class ApiError extends Error {
  constructor(status, message, errors) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

async function request(method, path, { body, formData } = {}) {
  const headers = {};
  let reqBody;

  if (formData) {
    reqBody = formData; // multipart/form-data, let browser set Content-Type
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: reqBody,
    credentials: 'include',
  });

  let data;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(res.status, 'Unexpected server response.');
  }

  if (res.status === 401 && !window.location.pathname.startsWith('/login')) {
    window.location.href = '/login';
    throw new ApiError(401, data?.message || 'Session expired. Please log in.');
  }

  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.message || `Request failed with status ${res.status}`,
      data?.errors
    );
  }

  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  delete: (path, body) => request('DELETE', path, body !== undefined ? { body } : {}),
  upload: (path, formData) => request('POST', path, { formData }),
};

export { ApiError };
