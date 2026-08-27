let db = JSON.parse(localStorage.getItem('biblioteca_ceep')) || {
    livros: [],
    reservas: {}
};

function salvarNoBanco() {
    localStorage.setItem('biblioteca_ceep', JSON.stringify(db));
}

let abaAtual = 'catalogacao';

function switchTab(tabId) {
    abaAtual = tabId ? tabId.toLowerCase() : 'catalogacao';
    renderizarAba();
}

function renderizarAba() {
    document.querySelectorAll('#menu .nav-item').forEach(function(b) {
        b.classList.remove('active');
        var onclickAttr = b.getAttribute('onclick');
        if (onclickAttr && onclickAttr.toLowerCase().indexOf(abaAtual) !== -1) {
            b.classList.add('active');
        }
    });

    const content = document.getElementById('content');
    if (!content) return;

    const titles = {
        'catalogacao': '1. Catalogação de Livros (' + db.livros.length + ' Cadastrados)',
        'emprestimo': '2. Registro Manual de Empréstimos',
        'opac': '3. Pesquisa OPAC (Consulta Online)',
        'reservasfila': '4. Fila de Espera e Reservas'
    };

    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.innerText = titles[abaAtual] || 'Sistema de Biblioteca';
    }

    if (abaAtual === 'catalogacao') {
        content.innerHTML = `
            <div class="card">
                <h3>Cadastrar Novo Livro</h3>
                <input type="text" id="catTitulo" placeholder="Título do Livro">
                <input type="text" id="catAutor" placeholder="Nome do Autor">
                <button class="btn btn-success" onclick="cadastrarLivro()">Cadastrar no Acervo</button>
            </div>
            <div class="card">
                <h3>Acervo da Biblioteca CEEP</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Cód</th>
                            <th>Título / Autor</th>
                            <th>Status</th>
                            <th>Emprestado Para</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaAcervo"></tbody>
                </table>
            </div>
        `;
        atualizarAcervo();
    } else if (abaAtual === 'emprestimo') {
        let opcoesLivros = '<option value="">Selecione o Livro Disponível</option>';
        db.livros.filter(l => l.status === 'disponivel').forEach(l => {
            opcoesLivros += '<option value="' + l.id + '">' + l.id + ' - ' + l.titulo + ' (' + l.autor + ')</option>';
        });

        content.innerHTML = `
            <div class="card">
                <h3>Registrar Empréstimo Manual (Prazo de 14 dias)</h3>
                <label>Selecione o Livro:</label>
                <select id="circLivro">${opcoesLivros}</select>

                <label>Nome do Aluno:</label>
                <input type="text" id="circNomePessoa" placeholder="Digite o nome completo do aluno">

                <label>Série:</label>
                <select id="circSerie">
                    <option value="1º Ano">1º Ano</option>
                    <option value="2º Ano">2º Ano</option>
                    <option value="3º Ano">3º Ano</option>
                </select>

                <label>Curso:</label>
                <select id="circCurso">
                    <option value="Administração">Administração</option>
                    <option value="Agricultura">Agricultura</option>
                    <option value="Desenvolvimento de Sistemas">Desenvolvimento de Sistemas</option>
                    <option value="Enfermagem">Enfermagem</option>
                </select>

                <label>Data de Retirada:</label>
                <input type="text" id="circData" placeholder="Ex: 25/08/2026" value="${new Date().toLocaleDateString('pt-BR')}">

                <button class="btn btn-success" style="margin-top: 10px;" onclick="realizarEmprestimoManual()">Concluir Empréstimo</button>
            </div>
            <div class="card">
                <h3>Livros Atualmente Emprestados</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Livro (Autor)</th>
                            <th>Aluno / Série e Curso</th>
                            <th>Retirada / Limite</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaEmprestados"></tbody>
                </table>
            </div>
        `;
        atualizarCirculation();
    } else if (abaAtual === 'opac') {
        content.innerHTML = `
            <div class="card">
                <h3>Vitrine Online da Biblioteca CEEP</h3>
                <input type="text" id="opacBusca" placeholder="Digite o título ou autor para pesquisar..." onkeyup="buscarOpac()">
                <div id="opacResultados" style="margin-top: 15px;"></div>
            </div>
        `;
        buscarOpac();
    } else if (abaAtual === 'reservasfila') {
        content.innerHTML = `
            <div class="card">
                <h3>Fila de Espera</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Livro Indisponível</th>
                            <th>Pessoas na Fila</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaFila"></tbody>
                </table>
            </div>
        `;
        atualizarFila();
    }
}

function cadastrarLivro() {
    const tituloEl = document.getElementById('catTitulo');
    const autorEl = document.getElementById('catAutor');

    let titulo = tituloEl ? tituloEl.value.trim() : '';
    let autor = autorEl ? autorEl.value.trim() : '';

    if (!titulo || !autor) { alert("Preencha todos os campos!"); return; }

    let novoId = "LIV-" + String(db.livros.length + 1).padStart(3, '0');
    db.livros.push({
        id: novoId,
        titulo: titulo,
        autor: autor,
        status: "disponivel",
        emprestadoPara: null,
        dataEmprestimo: null,
        dataLimite: null
    });

    salvarNoBanco();
    alert("Livro catalogado com sucesso!");
    renderizarAba();
}

function excluirLivro(livroId) {
    if (confirm("Excluir o livro " + livroId + "?")) {
        db.livros = db.livros.filter(l => l.id !== livroId);
        delete db.reservas[livroId];
        salvarNoBanco();
        renderizarAba();
    }
}

function realizarEmprestimoManual() {
    let livroId = document.getElementById('circLivro').value;
    let nomePessoa = document.getElementById('circNomePessoa').value.trim();
    let serie = document.getElementById('circSerie').value;
    let curso = document.getElementById('circCurso').value;
    let dataEmprestimoStr = document.getElementById('circData').value.trim();

    if (!livroId || !nomePessoa) { alert("Preencha todos os campos!"); return; }

    let partes = dataEmprestimoStr.split('/');
    let dataObj = partes.length === 3 ? new Date(partes[2], partes[1] - 1, partes[0]) : new Date();
    dataObj.setDate(dataObj.getDate() + 14);
    let dataLimiteStr = dataObj.toLocaleDateString('pt-BR');

    let l = db.livros.find(item => item.id === livroId);
    if (l) {
        l.status = "emprestado";
        l.emprestadoPara = nomePessoa + " (" + serie + " - " + curso + ")";
        l.dataEmprestimo = dataEmprestimoStr;
        l.dataLimite = dataLimiteStr;
    }

    salvarNoBanco();
    alert("Empréstimo registrado!");
    renderizarAba();
}

function realizarDevolucao(livroId) {
    let l = db.livros.find(item => item.id === livroId);
    let filaAtual = db.reservas[livroId] || [];

    if (filaAtual.length > 0) {
        let proximoNome = filaAtual.shift();
        let hojeStr = new Date().toLocaleDateString('pt-BR');
        let hojeObj = new Date();
        hojeObj.setDate(hojeObj.getDate() + 14);
        let proximoLimiteStr = hojeObj.toLocaleDateString('pt-BR');

        if (l) {
            l.status = "emprestado";
            l.emprestadoPara = proximoNome;
            l.dataEmprestimo = hojeStr;
            l.dataLimite = proximoLimiteStr;
        }
        alert("Livro devolvido e repassado para: " + proximoNome);
    } else {
        if (l) {
            l.status = "disponivel";
            l.emprestadoPara = null;
            l.dataEmprestimo = null;
            l.dataLimite = null;
        }
        alert("Devolução concluída!");
    }
    salvarNoBanco();
    renderizarAba();
}

function entrarNaFilaOPAC(livroId) {
    let nome = prompt("Seu nome completo:");
    let serie = prompt("Série:");
    let curso = prompt("Curso:");

    if (!nome || !serie || !curso) return;

    let alunoInfo = nome + " (" + serie + " - " + curso + ")";
    
    if (!db.reservas[livroId]) {
        db.reservas[livroId] = [];
    }

    if (!db.reservas[livroId].includes(alunoInfo)) {
        db.reservas[livroId].push(alunoInfo);
        salvarNoBanco();
        alert("Reserva registrada na fila!");
    } else {
        alert("Você já está na fila deste livro!");
    }
    renderizarAba();
}

function atualizarAcervo() {
    let tAcervo = document.getElementById('tabelaAcervo');
    if (!tAcervo) return;

    if (db.livros.length === 0) {
        tAcervo.innerHTML = '<tr><td colspan="5" style="text-align:center;">Nenhum livro cadastrado.</td></tr>';
        return;
    }

    let html = '';
    db.livros.forEach(l => {
        let badgeClass = l.status === 'disponivel' ? 'badge-success' : 'badge-danger';
        let infoEmprestimo = l.emprestadoPara ? l.emprestadoPara + ' (Limite: ' + l.dataLimite + ')' : '-';
        html += '<tr>' +
            '<td><code>' + l.id + '</code></td>' +
            '<td><strong>' + l.titulo + '</strong><br><small>' + l.autor + '</small></td>' +
            '<td><span class="badge ' + badgeClass + '">' + l.status + '</span></td>' +
            '<td>' + infoEmprestimo + '</td>' +
            '<td><button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="excluirLivro(\'' + l.id + '\')">Excluir</button></td>' +
            '</tr>';
    });
    tAcervo.innerHTML = html;
}

function atualizarCirculation() {
    let tEmp = document.getElementById('tabelaEmprestados');
    if (!tEmp) return;

    let emprestados = db.livros.filter(l => l.status === 'emprestado');
    if (emprestados.length === 0) {
        tEmp.innerHTML = '<tr><td colspan="4" style="text-align:center;">Nenhum empréstimo ativo.</td></tr>';
        return;
    }

    let html = '';
    emprestados.forEach(l => {
        html += '<tr>' +
            '<td><strong>' + l.titulo + '</strong><br><small>' + l.autor + '</small></td>' +
            '<td>' + l.emprestadoPara + '</td>' +
            '<td>Retirada: ' + l.dataEmprestimo + '<br><small>Limite: ' + l.dataLimite + '</small></td>' +
            '<td><button class="btn btn-success" style="padding:6px 12px; font-size:0.8rem;" onclick="realizarDevolucao(\'' + l.id + '\')">Devolver</button></td>' +
            '</tr>';
    });
    tEmp.innerHTML = html;
}

function buscarOpac() {
    let buscaInput = document.getElementById('opacBusca');
    let termo = buscaInput ? buscaInput.value.toLowerCase() : '';
    let resDiv = document.getElementById('opacResultados');
    if (!resDiv) return;

    let encontrados = db.livros.filter(l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo));
    if (encontrados.length === 0) {
        resDiv.innerHTML = '<p>Nenhum livro encontrado.</p>';
        return;
    }

    let html = '';
    encontrados.forEach(l => {
        let acao = l.status === 'disponivel' 
            ? '<small style="color:var(--success);">Disponível</small>' 
            : '<button class="btn btn-warning" onclick="entrarNaFilaOPAC(\'' + l.id + '\')">Entrar na Fila</button>';

        html += '<div style="background:var(--bg-main); padding:12px; margin-bottom:8px; border-radius:var(--radius-sm); border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">' +
            '<div><strong>' + l.titulo + '</strong> - ' + l.autor + '</div>' +
            '<div>' + acao + '</div>' +
            '</div>';
    });
    resDiv.innerHTML = html;
}

function atualizarFila() {
    let tFila = document.getElementById('tabelaFila');
    if (!tFila) return;

    let chavesFila = Object.keys(db.reservas);
    if (chavesFila.length === 0) {
        tFila.innerHTML = '<tr><td colspan="2" style="text-align:center;">Nenhuma fila de espera ativa.</td></tr>';
        return;
    }

    let html = '';
    chavesFila.forEach(lid => {
        let livro = db.livros.find(l => l.id === lid);
        let filaNomes = db.reservas[lid].map((n, idx) => (idx + 1) + 'º ' + n).join(' ➔ ');
        html += '<tr>' +
            '<td><strong>' + (livro ? livro.titulo : lid) + '</strong></td>' +
            '<td>' + (filaNomes || 'Fila vazia') + '</td>' +
            '</tr>';
    });
    tFila.innerHTML = html;
}

renderizarAba();