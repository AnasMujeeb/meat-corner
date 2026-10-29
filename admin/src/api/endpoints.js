import { api } from './client.js';

export const authApi = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};

export const statsApi = {
  getStats: () => api.get('/admin/stats'),
};

export const categoriesApi = {
  list: () => api.get('/admin/categories'),
  get: (id) => api.get(`/admin/categories/${id}`),
  create: (data) => api.post('/admin/categories', data),
  update: (id, data) => api.put(`/admin/categories/${id}`, data),
  delete: (id) => api.delete(`/admin/categories/${id}`),
  reorder: (ids) => api.patch('/admin/categories/reorder', { ids }),
};

export const menuApi = {
  list: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'))
    ).toString();
    return api.get(`/admin/menu${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/admin/menu/${id}`),
  create: (data) => api.post('/admin/menu', data),
  update: (id, data) => api.put(`/admin/menu/${id}`, data),
  delete: (id) => api.delete(`/admin/menu/${id}`),
  toggleAvailability: (id) => api.patch(`/admin/menu/${id}/availability`),
};

export const branchesApi = {
  list: () => api.get('/admin/branches'),
  get: (id) => api.get(`/admin/branches/${id}`),
  create: (data) => api.post('/admin/branches', data),
  update: (id, data) => api.put(`/admin/branches/${id}`, data),
  delete: (id) => api.delete(`/admin/branches/${id}`),
  reorder: (ids) => api.patch('/admin/branches/reorder', { ids }),
};

export const settingsApi = {
  get: () => api.get('/admin/settings'),
  update: (data) => api.put('/admin/settings', data),
};

export const submissionsApi = {
  list: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'))
    ).toString();
    return api.get(`/admin/submissions${qs ? `?${qs}` : ''}`);
  },
  updateStatus: (id, status) => api.patch(`/admin/submissions/${id}/status`, { status }),
  delete: (id) => api.delete(`/admin/submissions/${id}`),
};

export const uploadApi = {
  upload: async (file, onProgress) => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('image', file);

      xhr.open('POST', '/api/admin/upload');
      xhr.withCredentials = true;

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data.data);
          } else {
            reject(new Error(data?.message || 'Upload failed'));
          }
        } catch {
          reject(new Error('Upload failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(form);
    });
  },
  delete: (url) => api.delete('/admin/upload', { url }),
};

export const importApi = {
  downloadTemplate: () => fetch('/api/admin/menu/import/template', { credentials: 'include' }),
  uploadFile: (file, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', file);

      xhr.open('POST', '/api/admin/menu/import');
      xhr.withCredentials = true;

      if (onProgress) {
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100));
          }
        });
      }

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(data);
          } else {
            reject(new Error(data?.message || 'Import failed'));
          }
        } catch {
          reject(new Error('Import failed'));
        }
      };

      xhr.onerror = () => reject(new Error('Network error during import'));
      xhr.send(form);
    }),
};

export const optionsLibraryApi = {
  list: (params) => {
    const qs = new URLSearchParams(
      Object.fromEntries(Object.entries(params || {}).filter(([, v]) => v !== undefined && v !== '' && v !== 'all'))
    ).toString();
    return api.get(`/admin/options-library${qs ? `?${qs}` : ''}`);
  },
  get: (id) => api.get(`/admin/options-library/${id}`),
  create: (data) => api.post('/admin/options-library', data),
  update: (id, data) => api.put(`/admin/options-library/${id}`, data),
  delete: (id) => api.delete(`/admin/options-library/${id}`),
};

