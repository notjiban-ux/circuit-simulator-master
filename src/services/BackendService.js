const API_URL = 'http://localhost:5000/api';

class BackendService {
  constructor() {
    this.token = localStorage.getItem('token');
  }

  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  logout() {
    this.token = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }

  register(username, email, password) {
    return fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    }).then(response => {
      return response.json().then(data => {
        if (response.ok) {
          this.setToken(data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
      });
    });
  }

  login(email, password) {
    return fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(response => {
      return response.json().then(data => {
        if (response.ok) {
          this.setToken(data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
        }
        return data;
      });
    });
  }

  saveCircuit(name, circuitData, id = null) {
    return fetch(`${API_URL}/circuits/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ name, data: circuitData, id })
    }).then(response => response.json());
  }

  getMyCircuits() {
    return fetch(`${API_URL}/circuits/my-circuits`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    }).then(response => response.json());
  }

  deleteCircuit(id) {
    return fetch(`${API_URL}/circuits/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    }).then(response => response.json());
  }
}

export default new BackendService();
