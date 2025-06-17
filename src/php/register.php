<?php
// Configuração do banco
$host = 'localhost';
$user = 'root'; // Altere para seu usuário
$pass = '';
$db = 'kort_store';

header('Content-Type: application/json');

$conn = new mysqli($host, $user, $pass, $db);
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao conectar ao banco de dados.']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$username = trim($data['username'] ?? '');
$email = trim($data['email'] ?? '');
$password = $data['password'] ?? '';

if (!$username || !$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Preencha todos os campos.']);
    exit;
}

// Verifica se já existe
$stmt = $conn->prepare('SELECT id FROM users WHERE email = ? OR username = ?');
$stmt->bind_param('ss', $email, $username);
$stmt->execute();
$stmt->store_result();
if ($stmt->num_rows > 0) {
    http_response_code(400);
    echo json_encode(['error' => 'E-mail ou usuário já cadastrado.']);
    exit;
}
$stmt->close();

$hash = password_hash($password, PASSWORD_DEFAULT);
$stmt = $conn->prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
$stmt->bind_param('sss', $username, $email, $hash);
if ($stmt->execute()) {
    echo json_encode(['message' => 'Conta criada com sucesso!']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Erro ao criar conta.']);
}
$stmt->close();
$conn->close(); 