<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $nome = htmlspecialchars(trim($_POST['nome'] ?? ''));
    $email = filter_var(trim($_POST['email'] ?? ''), FILTER_VALIDATE_EMAIL);
    $mensagem = htmlspecialchars(trim($_POST['mensagem'] ?? ''));
    if (!$nome || !$email || !$mensagem) {
        header('Location: ../publlic/html/index.html?status=erro');
        exit;
    }
    $to = 'contato@kortstore.com';
    $subject = 'Nova mensagem de contato';
    $body = "Nome: $nome\nEmail: $email\nMensagem: $mensagem";
    $headers = "From: $email\r\nReply-To: $email\r\nContent-Type: text/plain; charset=UTF-8";
    if (mail($to, $subject, $body, $headers)) {
        header('Location: ../publlic/html/index.html?status=sucesso');
        exit;
    } else {
        header('Location: ../publlic/html/index.html?status=erro');
        exit;
    }
} else {
    header('Location: ../publlic/html/index.html');
    exit;
} 