let db = JSON.parse(localStorage.getItem('biblioteca_ceep_db')) || {
    livros: [],
    reservas: {}
};

function salvarBanco() {
    localStorage.setItem('biblioteca_ceep_db', JSON.stringify(db));
}

function switchTab(tabId) {
    const abaChave = tabId ? tabId.toLowerCase() : 'catalogacao';

    document.querySelectorAll('#menu .nav-item').forEach(b => {
        b.classList.remove('active');
        if (b.getAttribute('onclick') && b.getAttribute('onclick').toLowerCase().includes(abaChave)) {
            b.classList.add('active');
        }
    });

    const content = document.getElementById('content');
    const titles = {
        'catalogacao': `1. Catalogação de Livros (${db.livros.length} Cadastrados)`,
        'emprestimo': '2. Registro Manual de Empréstimos e Multas',
        'opac': '3. Pesquisa OPAC (Consulta Online)',
        'reservasfila': '4. Fila de Espera e Reservas'
    };

    const headerTitle = document.getElementById('headerTitle');
    if (headerTitle) {
        headerTitle.innerText = titles[abaChave] || 'Sistema de Biblioteca';
    }

    if (abaChave === 'catalogacao') {
        content.innerHTML = `
            <div class="card">
                <h3>Cadastrar Novo Livro</h3>
                <input type="text" id="catTitulo" placeholder="Título do Livro">
                <input type="text" id="catAutor" placeholder="Nome do Autor">
                <button class="btn btn-success" onclick="cadastrarLivro()">Cadastrar no Acervo</button>
            </div>
            <div class="card">
                <h3>Acervo da Biblioteca CEEP (${db.livros.length} Livros)</h3>
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
    } else if (abaChave === 'emprestimo') {
        content.innerHTML = `
            <div class="card">
                <h3>Registrar Empréstimo Manual (Prazo de 14 dias)</h3>
                <label>Selecione o Livro:</label>
                <select id="circLivro">
                    <option value="">Selecione o Livro Disponível</option>
                    ${db.livros.filter(l => l.status === 'disponivel').map(l => `<option value="${l.id}">${l.id} - ${l.titulo} (${l.autor})</option>`).join('')}
                </select>

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

                <button class="btn btn-success" style="margin-top: 10px;" onclick="realizarEmprestimoManual()">Concluir Empréstimo (Prazo: 2 Semanas)</button>
            </div>
            <div class="card">
                <h3>Livros Atualmente Emprestados (Controle de Atrasos e Multas)</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Livro (Autor)</th>
                            <th>Aluno / Série e Curso</th>
                            <th>Retirada / Limite (14 dias)</th>
                            <th>Multa Atual</th>
                            <th>Ação</th>
                        </tr>
                    </thead>
                    <tbody id="tabelaEmprestados"></tbody>
                </table>
            </div>
        `;
        atualizarCirculation();
    } else if (abaChave === 'opac') {
        content.innerHTML = `
            <div class="card">
                <h3>Vitrine Online da Biblioteca CEEP</h3>
                <input type="text" id="opacBusca" placeholder="Digite o título ou autor para pesquisar..." onkeyup="buscarOpac()">
                <div id="opacResultados" style="margin-top: 15px;"></div>
            </div>
        `;
        buscarOpac();
    } else if (abaChave === 'reservasfila') {
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

function converterDataParaObjeto(dataStr) {
    if (!dataStr) return null;
    let partes = dataStr.split('/');
    if (partes.length !== 3) return null;
    return new Date(partes[2], partes[1] - 1, partes[0]);
}

function somarDias(dataObj, dias) {
    let novaData = new Date(dataObj);
    novaData.setDate(novaData.getDate() + dias);
    return novaData;
}

function calcularDiferencaDias(dataInicio, dataFim) {
    let diffTempo = dataFim.getTime() - dataInicio.getTime();
    return Math.floor(diffTempo / (1000 * 3600 * 24));
}

function calcularMultaEDiasAtraso(dataLimiteStr) {
    let hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    let dataLimite = converterDataParaObjeto(dataLimiteStr);
    if (!dataLimite) return { diasAtraso: 0, valorMulta: 0, emAtraso: false };
    dataLimite.setHours(0, 0, 0, 0);

    if (hoje > dataLimite) {
        let diasAtraso = calcularDiferencaDias(dataLimite, hoje);
        let valorMulta = 2.00 + (diasAtraso - 1) * 1.00;
        if (valorMulta < 2.00) valorMulta = 2.00;
        return { diasAtraso, valorMulta, emAtraso: true };
    }
    return { diasAtraso: 0, valorMulta: 0, emAtraso: false };
}

function cadastrarLivro() {
    let titulo = document.getElementById('catTitulo').value.trim();
    let autor = document.getElementById('catAutor').value.trim();
    if (!titulo || !autor) { alert("Preencha todos os campos!"); return; }
    
    let novoId = "LIV-" + String(db.livros.length + 1).padStart(3, '0');
    db.livros.push({ id: novoId, titulo, autor, status: "disponivel", emprestadoPara: null, dataEmprestimo: null, dataLimite: null, multaPaga: false });
    
    salvarBanco();
    alert("Livro catalogado com sucesso!");
    switchTab('catalogacao');
}

function excluirLivro(livroId) {
    let livro = db.livros.find(l => l.id === livroId);
    if (!livro) return;

    let confirmar = confirm(`Tem certeza que deseja excluir o livro "${livro.titulo}" do acervo?`);
    if (confirmar) {
        db.livros = db.livros.filter(l => l.id !== livroId);
        if (db.reservas[livroId]) delete db.reservas[livroId];
        salvarBanco();
        alert("Livro excluído com sucesso!");
        switchTab('catalogacao');
    }
}

function atualizarAcervo() {
    let tAcervo = document.getElementById('tabelaAcervo');
    if (!tAcervo) return;

    tAcervo.innerHTML = db.livros.map(l => `
        <tr>
            <td><code>${l.id}</code></td>
            <td><strong>${l.titulo}</strong><br><small>${l.autor}</small></td>
            <td><span class="badge ${l.status === 'disponivel' ? 'badge-success' : 'badge-danger'}">${l.status}</span></td>
            <td>${l.emprestadoPara ? `${l.emprestadoPara} (Limite: ${l.dataLimite})` : '-'}</td>
            <td>
                <button class="btn btn-danger" style="padding:4px 8px; font-size:0.8rem;" onclick="excluirLivro('${l.id}')">Excluir</button>
            </td>
        </tr>
    `).join('') || `<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Nenhum livro cadastrado no acervo.</td></tr>`;
}

function realizarEmprestimoManual() {
    let livroId = document.getElementById('circLivro').value;
    let nomePessoa = document.getElementById('circNomePessoa').value.trim();
    let serie = document.getElementById('circSerie').value;
    let curso = document.getElementById('circCurso').value;
    let dataEmprestimoStr = document.getElementById('circData').value.trim();

    let livro = db.livros.find(l => l.id === livroId);
    if (!livro) { alert("Selecione um livro válido!"); return; }
    if (!nomePessoa) { alert("Digite o nome da pessoa!"); return; }

    let dataObj = converterDataParaObjeto(dataEmprestimoStr);
    if (!dataObj) { alert("Formato de data inválido! Use DD/MM/AAAA."); return; }

    let dataLimiteObj = somarDias(dataObj, 14); 
    let dataLimiteStr = dataLimiteObj.toLocaleDateString('pt-BR');

    livro.status = "emprestado";
    livro.emprestadoPara = `${nomePessoa} (${serie} - ${curso})`;
    livro.dataEmprestimo = dataEmprestimoStr;
    livro.dataLimite = dataLimiteStr;
    livro.multaPaga = false;

    salvarBanco();
    alert(`Empréstimo registrado com sucesso!\nAluno: ${nomePessoa}\nTurma: ${serie} - ${curso}\nPrazo: ${dataLimiteStr}`);
    switchTab('emprestimo');
}

function realizarDevolucao(livroId) {
    let livro = db.livros.find(l => l.id === livroId);
    if (!livro) { alert("Livro não encontrado!"); return; }

    let infoMulta = calcularMultaEDiasAtraso(livro.dataLimite);

    if (infoMulta.emAtraso && !livro.multaPaga) {
        let confirmar = confirm(`O aluno está com ${infoMulta.diasAtraso} dia(s) de atraso.\nMulta total a pagar: R$ ${infoMulta.valorMulta.toFixed(2)}.\n\nA multa foi paga para prosseguir com a devolução?`);
        if (!confirmar) {
            alert("A devolução não pode ser concluída sem o pagamento da multa pendente.");
            return;
        }
    }

    if (db.reservas[livroId] && db.reservas[livroId].length > 0) {
        let proximoNome = db.reservas[livroId].shift(); 
        let hojeStr = new Date().toLocaleDateString('pt-BR');
        let hojeObj = new Date();
        let proximoLimiteStr = somarDias(hojeObj, 14).toLocaleDateString('pt-BR');

        livro.status = "emprestado";
        livro.emprestadoPara = proximoNome;
        livro.dataEmprestimo = hojeStr;
        livro.dataLimite = proximoLimiteStr;
        livro.multaPaga = false;
        alert(`Livro devolvido e repassado para: ${proximoNome} (Prazo: ${proximoLimiteStr})!`);
    } else {
        livro.status = "disponivel";
        livro.emprestadoPara = null;
        livro.dataEmprestimo = null;
        livro.dataLimite = null;
        livro.multaPaga = false;
        alert("Devolução registrada com sucesso!");
    }
    
    salvarBanco();
    switchTab('emprestimo');
}

function atualizarCirculation() {
    let tEmp = document.getElementById('tabelaEmprestados');
    if (!tEmp) return;

    tEmp.innerHTML = db.livros.filter(l => l.status === 'emprestado').map(l => {
        let infoMulta = calcularMultaEDiasAtraso(l.dataLimite);
        let estiloNome = infoMulta.emAtraso ? 'color: var(--danger); font-weight: bold;' : '';
        let textoMulta = infoMulta.emAtraso ? `R$ ${infoMulta.valorMulta.toFixed(2)} (${infoMulta.diasAtraso}d atraso)` : 'Sem multa';

        return `
            <tr>
                <td><strong>${l.titulo}</strong><br><small>Autor: ${l.autor}</small></td>
                <td><span style="${estiloNome}">${l.emprestadoPara}</span></td>
                <td>Retirada: ${l.dataEmprestimo}<br><small>Limite: ${l.dataLimite}</small></td>
                <td><span style="${infoMulta.emAtraso ? 'color: var(--danger); font-weight: bold;' : ''}">${textoMulta}</span></td>
                <td>
                    <button class="btn btn-success" style="padding:6px 12px; font-size:0.8rem;" onclick="realizarDevolucao('${l.id}')">Registrar Devolução</button>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Nenhum empréstimo ativo no momento.</td></tr>`;
}

function buscarOpac() {
    let termo = (document.getElementById('opacBusca')?.value || "").toLowerCase();
    let resDiv = document.getElementById('opacResultados');
    if (!resDiv) return;
    
    let encontrados = db.livros.filter(l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo));
    
    resDiv.innerHTML = encontrados.map(l => `
        <div style="background:var(--bg-main); padding:12px; margin-bottom:8px; border-radius:var(--radius-sm); border: 1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${l.titulo}</strong> - ${l.autor}<br>
                <span class="badge ${l.status === 'disponivel' ? 'badge-success' : 'badge-danger'}">${l.status.toUpperCase()}</span>
            </div>
            <div>
                ${l.status === 'disponivel' ? '<small style="color:var(--success); font-weight: 600;">Disponível na Estante</small>' : `<button class="btn btn-warning" onclick="entrarNaFilaOPAC('${l.id}')">Entrar na Fila</button>`}
            </div>
        </div>
    `).join('') || '<p style="color:#7f8c8d;">Nenhum livro encontrado.</p>';
}

function entrarNaFilaOPAC(livroId) {
    let nome = prompt("Digite seu nome completo:");
    let serie = prompt("Digite sua série (1º Ano, 2º Ano, 3º Ano):");
    let curso = prompt("Digite seu curso (Administração, Agricultura, Desenvolvimento de Sistemas, Enfermagem):");

    if (!nome || !serie || !curso) {
        alert("Preencha todas as informações!");
        return;
    }

    let informacaoCompleta = `${nome} (${serie} - ${curso})`;

    if (!db.reservas[livroId]) db.reservas[livroId] = [];
    if (db.reservas[livroId].includes(informacaoCompleta)) {
        alert("Você já está na fila deste livro!");
        return;
    }

    db.reservas[livroId].push(informacaoCompleta);
    salvarBanco();
    alert(`Reserva efetuada com sucesso! Posição na fila: ${db.reservas[livroId].length}`);
}

function atualizarFila() {
    let tFila = document.getElementById('tabelaFila');
    if (!tFila) return;

    tFila.innerHTML = Object.keys(db.reservas).map(lid => {
        let livro = db.livros.find(l => l.id === lid);
        let filaNomes = db.reservas[lid].map((n, idx) => `${idx+1}º ${n}`).join(' ➔ ');
        return `
            <tr>
                <td><strong>${livro ? livro.titulo : lid}</strong></td>
                <td>${filaNomes || 'Fila vazia'}</td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="2" style="text-align:center; color:#7f8c8d;">Nenhuma fila de espera ativa.</td></tr>`;
}

window.onload = () => switchTab('catalogacao');