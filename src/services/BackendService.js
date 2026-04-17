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

  async register(username, email, password) {
    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });
    const data = await response.json();
    if (response.ok) {
      this.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async login(email, password) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await response.json();
    if (response.ok) {
      this.setToken(data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  }

  async saveCircuit(name, circuitData, id = null) {
    const response = await fetch(`${API_URL}/circuits/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({ name, data: circuitData, id })
    });
    return await response.json();
  }

  async getMyCircuits() {
    const response = await fetch(`${API_URL}/circuits/my-circuits`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }

  async deleteCircuit(id) {
    const response = await fetch(`${API_URL}/circuits/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }
}

export default new BackendService();
