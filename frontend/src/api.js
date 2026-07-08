const BASE_URL = "http://192.168.0.109:8000";

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, { method = "GET", token, body, form } = {}) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let payload;
  if (form) {
    payload = new URLSearchParams(form);
    headers["Content-Type"] = "application/x-www-form-urlencoded";
  } else if (body) {
    payload = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { method, headers, body: payload });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // no JSON body
    }
    throw new ApiError(detail, res.status);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const authApi = {
  register: (email, password, full_name) =>
    request("/auth/register", { method: "POST", body: { email, password, full_name } }),
  login: (email, password) =>
    request("/auth/login", { method: "POST", form: { username: email, password } }),
  me: (token) => request("/auth/me", { token }),
};

export const contactsApi = {
  list: (token) => request("/contacts", { token }),
  create: (token, contact) => request("/contacts", { method: "POST", token, body: contact }),
  update: (token, id, contact) =>
    request(`/contacts/${id}`, { method: "PUT", token, body: contact }),
  remove: (token, id) => request(`/contacts/${id}`, { method: "DELETE", token }),
};

export const usersApi = {
  list: (token) => request("/users", { token }),
  update: (token, id, update) => request(`/users/${id}`, { method: "PUT", token, body: update }),
  remove: (token, id) => request(`/users/${id}`, { method: "DELETE", token }),
};

export { ApiError };
