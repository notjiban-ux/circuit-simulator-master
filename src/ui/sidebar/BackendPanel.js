import React from 'react';
import BackendService from '../../services/BackendService';
import Button from '../components/Button';

const styles = {
  container: {
    padding: '10px',
    borderTop: '1px solid #444',
    marginTop: '10px',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  header: {
    fontSize: '0.9em',
    fontWeight: 'bold',
    marginBottom: '5px',
    color: '#aaa'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '5px'
  },
  input: {
    padding: '5px',
    borderRadius: '3px',
    border: '1px solid #555',
    backgroundColor: '#333',
    color: '#fff',
    fontSize: '0.8em'
  },
  circuitList: {
    maxHeight: '150px',
    overflowY: 'auto',
    fontSize: '0.8em',
    marginTop: '5px'
  },
  circuitItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '3px 0',
    borderBottom: '1px solid #333',
    cursor: 'pointer'
  },
  error: {
    color: '#ff6666',
    fontSize: '0.7em'
  }
};

export default class BackendPanel extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      user: JSON.parse(localStorage.getItem('user')),
      email: '',
      password: '',
      username: '',
      isRegistering: false,
      circuits: [],
      circuitName: 'New Circuit',
      error: '',
      loading: false
    };
  }

  componentDidMount() {
    if (this.state.user) {
      this.fetchCircuits();
    }
  }

  fetchCircuits = () => {
    BackendService.getMyCircuits()
      .then(circuits => {
        if (Array.isArray(circuits)) {
          this.setState({ circuits });
        }
      })
      .catch(err => {
        console.error('Failed to fetch circuits', err);
      });
  };

  handleAuth = (e) => {
    e.preventDefault();
    this.setState({ loading: true, error: '' });
    
    let authPromise;
    if (this.state.isRegistering) {
      authPromise = BackendService.register(this.state.username, this.state.email, this.state.password);
    } else {
      authPromise = BackendService.login(this.state.email, this.state.password);
    }

    authPromise
      .then(result => {
        if (result && result.user) {
          this.setState({ user: result.user, loading: false });
          this.fetchCircuits();
        } else {
          this.setState({ error: (result && result.message) || 'Auth failed', loading: false });
        }
      })
      .catch(err => {
        this.setState({ error: 'Connection failed', loading: false });
      });
  };

  handleLogout = () => {
    BackendService.logout();
    this.setState({ user: null, circuits: [] });
  };

  handleSave = () => {
    const { circuitName } = this.state;
    const { currentCircuit } = this.props;
    BackendService.saveCircuit(circuitName, currentCircuit)
      .then(result => {
        if (result && result._id) {
          this.fetchCircuits();
          alert('Circuit saved!');
        }
      })
      .catch(err => {
        this.setState({ error: 'Failed to save circuit' });
      });
  };

  render() {
    const { user, isRegistering, circuits, error, loading } = this.state;

    if (!user) {
      return (
        <div style={styles.container}>
          <div style={styles.header}>ACCOUNT</div>
          <form style={styles.form} onSubmit={this.handleAuth}>
            {isRegistering && (
              <input
                style={styles.input}
                placeholder="Username"
                value={this.state.username}
                onChange={(e) => this.setState({ username: e.target.value })}
              />
            )}
            <input
              style={styles.input}
              placeholder="Email"
              type="email"
              value={this.state.email}
              onChange={(e) => this.setState({ email: e.target.value })}
            />
            <input
              style={styles.input}
              placeholder="Password"
              type="password"
              value={this.state.password}
              onChange={(e) => this.setState({ password: e.target.value })}
            />
            <Button disabled={loading} onClick={this.handleAuth}>
              {loading ? '...' : (isRegistering ? 'Sign Up' : 'Login')}
            </Button>
            {error && <div style={styles.error}>{error}</div>}
            <div 
              style={{ fontSize: '0.7em', textAlign: 'center', cursor: 'pointer', color: '#888' }}
              onClick={() => this.setState({ isRegistering: !isRegistering })}
            >
              {isRegistering ? 'Already have an account? Login' : 'Need an account? Sign Up'}
            </div>
          </form>
        </div>
      );
    }

    return (
      <div style={styles.container}>
        <div style={styles.header}>WELCOME, {user.username.toUpperCase()}</div>
        <div style={styles.form}>
          <input
            style={styles.input}
            placeholder="Circuit Name"
            value={this.state.circuitName}
            onChange={(e) => this.setState({ circuitName: e.target.value })}
          />
          <Button onClick={this.handleSave}>Save Circuit</Button>
        </div>
        
        <div style={styles.header}>MY CIRCUITS</div>
        <div style={styles.circuitList}>
          {circuits.map(c => (
            <div key={c._id} style={styles.circuitItem} onClick={() => this.props.onLoadCircuit(c.data)}>
              <span>{c.name}</span>
              <span style={{ color: '#666' }}>{new Date(c.updatedAt).toLocaleDateString()}</span>
            </div>
          ))}
          {circuits.length === 0 && <div style={{ color: '#666' }}>No circuits saved yet.</div>}
        </div>

        <Button onClick={this.handleLogout} style={{ marginTop: '10px', backgroundColor: '#442222' }}>Logout</Button>
      </div>
    );
  }
}
