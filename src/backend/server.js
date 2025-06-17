const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const app = express();
app.use(express.json());
app.use(cors());

const mongoUri = 'mongodb+srv://KORTEX:cauadias11@kortex.ofrnm.mongodb.net/kortex_db?retryWrites=true&w=majority';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  password: { type: String, required: true },
  key: { type: String, default: '' },
  hwid: { type: String, default: '' },
  location: { type: String, default: '' },
  latitude: { type: String, default: '' },
  longitude: { type: String, default: '' },
  account_admin: { type: String, default: 'false' },
  key_expiry: { type: Date, default: null },
  cargo: { type: String, default: '' },
  status: { type: String, default: 'Offline' }
}, { collection: 'KORTEX5_USERS' });
const User = mongoose.model('KORTEX5_USERS', userSchema);

const JWT_SECRET = 'KORTEX_SUPER_SECRET';

// Registro
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
    const userExists = await User.findOne({ $or: [{ email }, { username }] });
    if (userExists) return res.status(400).json({ error: 'E-mail ou usuário já cadastrado.' });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, password: hash });
    return res.status(201).json({ message: 'Conta criada com sucesso!' });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

// Login por email ou username
app.post('/api/login', async (req, res) => {
  try {
    const { email, username, password } = req.body;
    if ((!email && !username) || !password) return res.status(400).json({ error: 'Preencha todos os campos.' });
    const user = await User.findOne(email ? { email } : { username });
    if (!user) return res.status(400).json({ error: 'Usuário não encontrado.' });
    // Compatibilidade: aceita senha em texto puro ou hash
    let valid = false;
    if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      valid = user.password === password;
    }
    if (!valid) return res.status(400).json({ error: 'Senha incorreta.' });
    const token = jwt.sign({
      id: user._id,
      username: user.username,
      email: user.email,
      key: user.key,
      hwid: user.hwid,
      location: user.location,
      latitude: user.latitude,
      longitude: user.longitude,
      account_admin: user.account_admin,
      key_expiry: user.key_expiry,
      cargo: user.cargo,
      status: user.status
    }, JWT_SECRET, { expiresIn: '7d' });
    return res.json({ token, user });
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

// Middleware para rotas protegidas
function auth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Token não fornecido.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

// Exemplo de rota protegida
app.get('/api/me', auth, (req, res) => {
  res.json({ user: req.user });
});

const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Mapeia conexões WebSocket por userId
const userSockets = new Map();

wss.on('connection', (ws, req) => {
  // Espera o frontend enviar o token JWT logo após conectar
  ws.on('message', (msg) => {
    try {
      const { token } = JSON.parse(msg);
      if (!token) return;
      const decoded = jwt.verify(token, JWT_SECRET);
      const userId = decoded.id;
      userSockets.set(userId, ws);
      ws.userId = userId;
    } catch {}
  });
  ws.on('close', () => {
    if (ws.userId) userSockets.delete(ws.userId);
  });
});

// Change Stream para monitorar alterações na coleção de usuários
User.watch().on('change', (change) => {
  if (change.operationType === 'update' || change.operationType === 'replace') {
    const userId = change.documentKey._id.toString();
    const ws = userSockets.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'user_update' }));
    }
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log('Servidor rodando na porta', PORT)); 