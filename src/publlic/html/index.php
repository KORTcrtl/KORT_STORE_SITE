<?php
// Segurança básica: headers
header('X-Frame-Options: DENY');
header('X-Content-Type-Options: nosniff');
header('X-XSS-Protection: 1; mode=block');
header('Referrer-Policy: no-referrer');
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>KORT Store - Sua Loja Gamer</title>
    <link rel="stylesheet" href="../css/style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <img src="../../assets/imgs/LOGO_LOJA.png" alt="Logo KORT Store" class="logo">
            <nav class="menu">
                <a href="#beneficios">Benefícios</a>
                <a href="#planos">Planos</a>
                <a href="#faq">FAQ</a>
            </nav>
        </div>
    </header>
    <main>
        <section class="hero">
            <h1>Bem-vindo à KORT Store</h1>
            <p>A melhor experiência para gamers, com segurança e performance!</p>
            <a href="#planos" class="btn-cta">Ver Planos</a>
        </section>
        <section id="beneficios" class="beneficios">
            <!-- Benefícios serão adicionados depois -->
        </section>
        <section id="planos" class="planos">
            <!-- Planos serão adicionados depois -->
        </section>
        <section id="faq" class="faq">
            <!-- FAQ será adicionado depois -->
        </section>
    </main>
    <footer class="footer">
        <div class="container">
            <p>&copy; <?php echo date('Y'); ?> KORT Store. Todos os direitos reservados.</p>
        </div>
    </footer>
</body>
</html> 