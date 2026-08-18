// Banco de Dados Simples (Carrega do localStorage ou inicia vazio)
let db = JSON.parse(localStorage.getItem('biblioteca_ceep_db')) || {
    livros: [],
    reservas: {}
};

// Função para salvar o estado atual no navegador
function salvarBanco() {
    localStorage.setItem('biblioteca_ceep_db', JSON.stringify(db));
}

// Navegação de Abas (Apenas 4 tópicos)
function switchTab(tabId) {
    document.querySelectorAll('#menu button').forEach(b => b.classList.remove('active'));
    event.target.classList.add('active');
    
    const content = document.getElementById('content');
    const titles = {
        'catalogacao': `1. Catalogação de Livros (${db.livros.length} Cadastrados)`,
        'circulacao': '2. Registro Manual de Empréstimos e Multas',
        'opac': '3. Pesquisa OPAC (Consulta Online)',
        'reservasFila': '4. Fila de Espera e Reservas'
    };
    document.getElementById('headerTitle').innerText = titles[tabId];

    if(tabId === 'catalogacao') {
        content.innerHTML = `
            <div class="card">
                <h3>Cadastrar Novo Livro</h3>
                <input type="text" id="catTitulo" placeholder="Título do Livro">
                <input type="text" id="catAutor" placeholder="Nome do Autor">
                <button class="btn btn-success" onclick="cadastrarLivro()">Cadastrar no Acervo</button>
            </div>
            <div class="card">
                <h3>Acervo da Biblioteca Ceep (${db.livros.length} Livros)</h3>
                <table>
                    <thead><tr><th>Cód</th><th>Título / Autor</th><th>Status</th><th>Emprestado Para</th></tr></thead>
                    <tbody id="tabelaAcervo"></tbody>
                </table>
            </div>
        `;
        atualizarAcervo();
    } else if(tabId === 'circulacao') {
        content.innerHTML = `
            <div class="card">
                <h3>Registrar Empréstimo Manual (Prazo de 14 dias)</h3>
                
                <label>Selecione o Livro:</label>
                <select id="circLivro">
                    <option value="">Selecione o Livro Disponível</option>
                    ${db.livros.filter(l => l.status === 'disponivel').map(l => `<option value="${l.id}">${l.id} - ${l.titulo} (${l.autor})</option>`).join('')}
                </select>

                <label>Nome da Pessoa:</label>
                <input type="text" id="circNomePessoa" placeholder="Digite o nome completo da pessoa">

                <label>Data em que foi pego:</label>
                <input type="text" id="circData" placeholder="Ex: 18/08/2026" value="${new Date().toLocaleDateString('pt-BR')}">

                <button class="btn btn-success" style="margin-top: 10px;" onclick="realizarEmprestimoManual()">Concluir Empréstimo (Prazo: 2 Semanas)</button>
            </div>
            <div class="card">
                <h3>Livros Atualmente Emprestados (Controle de Atrasos e Multas)</h3>
                <table>
                    <thead><tr><th>Livro (Autor)</th><th>Pessoa</th><th>Retirada / Limite (14 dias)</th><th>Multa Atual</th><th>Ação</th></tr></thead>
                    <tbody id="tabelaEmprestados"></tbody>
                </table>
            </div>
        `;
        atualizarCirculation();
    } else if(tabId === 'opac') {
        content.innerHTML = `
            <div class="card">
                <h3>Vitrine Online da Biblioteca Ceep</h3>
                <input type="text" id="opacBusca" placeholder="Digite o título ou autor para pesquisar..." onkeyup="buscarOpac()">
                <div id="opacResultados" style="margin-top: 15px;"></div>
            </div>
        `;
        buscarOpac();
    } else if(tabId === 'reservasFila') {
        content.innerHTML = `
            <div class="card">
                <h3>Fila de Espera</h3>
                <table>
                    <thead><tr><th>Livro Indisponível</th><th>Pessoas na Fila</th></tr></thead>
                    <tbody id="tabelaFila"></tbody>
                </table>
            </div>
        `;
        atualizarFila();
    }
}

// --- Funções Auxiliares de Data ---
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

// --- MÓDULO 1: Catalogação ---
function cadastrarLivro() {
    let titulo = document.getElementById('catTitulo').value.trim();
    let autor = document.getElementById('catAutor').value.trim();
    if(!titulo || !autor) { alert("Preencha todos os campos!"); return; }
    
    let novoId = "LIV-" + String(db.livros.length + 1).padStart(3, '0');
    db.livros.push({ id: novoId, titulo, autor, status: "disponivel", emprestadoPara: null, dataEmprestimo: null, dataLimite: null, multaPaga: false });
    
    salvarBanco();
    alert("Livro catalogado com sucesso!");
    switchTab('catalogacao');
}

function atualizarAcervo() {
    let tAcervo = document.getElementById('tabelaAcervo');
    tAcervo.innerHTML = db.livros.map(l => `
        <tr>
            <td><code>${l.id}</code></td>
            <td><strong>${l.titulo}</strong><br><small>${l.autor}</small></td>
            <td><span class="badge ${l.status === 'disponivel' ? 'badge-success' : 'badge-danger'}">${l.status}</span></td>
            <td>${l.emprestadoPara ? `${l.emprestadoPara} (Limite: ${l.dataLimite})` : '-'}</td>
        </tr>
    `).join('') || `<tr><td colspan="4" style="text-align:center; color:#7f8c8d;">Nenhum livro cadastrado no acervo.</td></tr>`;
}

// --- MÓDULO 2: Circulação Manual ---
function realizarEmprestimoManual() {
    let livroId = document.getElementById('circLivro').value;
    let nomePessoa = document.getElementById('circNomePessoa').value.trim();
    let dataEmprestimoStr = document.getElementById('circData').value.trim();

    let livro = db.livros.find(l => l.id === livroId);

    if(!livro) { alert("Selecione um livro válido!"); return; }
    if(!nomePessoa) { alert("Digite o nome da pessoa!"); return; }
    if(!dataEmprestimoStr) { alert("Informe a data!"); return; }

    let dataObj = converterDataParaObjeto(dataEmprestimoStr);
    if (!dataObj) { alert("Formato de data inválido! Use DD/MM/AAAA."); return; }

    let dataLimiteObj = somarDias(dataObj, 14); 
    let dataLimiteStr = dataLimiteObj.toLocaleDateString('pt-BR');

    livro.status = "emprestado";
    livro.emprestadoPara = nomePessoa;
    livro.dataEmprestimo = dataEmprestimoStr;
    livro.dataLimite = dataLimiteStr;
    livro.multaPaga = false;

    salvarBanco();
    alert(`Empréstimo registrado com sucesso para ${nomePessoa}!\nPrazo de devolução (2 semanas): ${dataLimiteStr}`);
    switchTab('circulacao');
}

function realizarDevolucao(livroId) {
    let livro = db.livros.find(l => l.id === livroId);
    if(!livro) { alert("Livro não encontrado!"); return; }

    let infoMulta = calcularMultaEDiasAtraso(livro.dataLimite);

    if (infoMulta.emAtraso && !livro.multaPaga) {
        let confirmar = confirm(`O aluno está com ${infoMulta.diasAtraso} dia(s) de atraso.\nMulta total a pagar: R$ ${infoMulta.valorMulta.toFixed(2)}.\n\nA multa foi paga para prosseguir com a devolução?`);
        if (!confirmar) {
            alert("A devolução não pode ser concluída sem o pagamento da multa pendente.");
            return;
        }
    }

    if(db.reservas[livroId] && db.reservas[livroId].length > 0) {
        let proximoNome = db.reservas[livroId].shift(); 
        let hojeStr = new Date().toLocaleDateString('pt-BR');
        let hojeObj = new Date();
        let proximoLimiteStr = somarDias(hojeObj, 14).toLocaleDateString('pt-BR');

        livro.status = "emprestado";
        livro.emprestadoPara = proximoNome;
        livro.dataEmprestimo = hojeStr;
        livro.dataLimite = proximoLimiteStr;
        livro.multaPaga = false;
        alert(`Livro devolvido, mas repassado automaticamente para a próxima pessoa da fila: ${proximoNome} (Prazo: ${proximoLimiteStr})!`);
    } else {
        livro.status = "disponivel";
        livro.emprestadoPara = null;
        livro.dataEmprestimo = null;
        livro.dataLimite = null;
        livro.multaPaga = false;
        alert("Devolução registrada com sucesso! Livro disponível novamente.");
    }
    
    salvarBanco();
    switchTab('circulacao');
}

function atualizarCirculation() {
    let tEmp = document.getElementById('tabelaEmprestados');
    tEmp.innerHTML = db.livros.filter(l => l.status === 'emprestado').map(l => {
        let infoMulta = calcularMultaEDiasAtraso(l.dataLimite);
        let estiloNome = infoMulta.emAtraso ? 'color: red; font-weight: bold;' : '';
        let textoMulta = infoMulta.emAtraso ? `R$ ${infoMulta.valorMulta.toFixed(2)} (${infoMulta.diasAtraso}d atraso)` : 'Sem multa';

        return `
            <tr>
                <td><strong>${l.titulo}</strong><br><small>Autor: ${l.autor}</small></td>
                <td><span style="${estiloNome}">${l.emprestadoPara}</span></td>
                <td>Retirada: ${l.dataEmprestimo}<br><small>Limite: ${l.dataLimite}</small></td>
                <td><span style="${infoMulta.emAtraso ? 'color: red; font-weight: bold;' : ''}">${textoMulta}</span></td>
                <td>
                    <button class="btn btn-success" style="padding:4px 8px; font-size:0.8rem;" onclick="realizarDevolucao('${l.id}')">Registrar Devolução</button>
                </td>
            </tr>
        `;
    }).join('') || `<tr><td colspan="5" style="text-align:center; color:#7f8c8d;">Nenhum empréstimo ativo no momento.</td></tr>`;
}

// --- MÓDULO 3: OPAC ---
function buscarOpac() {
    let termo = (document.getElementById('opacBusca')?.value || "").toLowerCase();
    let resDiv = document.getElementById('opacResultados');
    
    let encontrados = db.livros.filter(l => l.titulo.toLowerCase().includes(termo) || l.autor.toLowerCase().includes(termo));
    
    resDiv.innerHTML = encontrados.map(l => `
        <div style="background:#f8f9fa; padding:12px; margin-bottom:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center;">
            <div>
                <strong>${l.titulo}</strong> - ${l.autor}<br>
                <span class="badge ${l.status === 'disponivel' ? 'badge-success' : 'badge-danger'}">${l.status.toUpperCase()}</span>
            </div>
            <div>
                ${l.status === 'disponivel' ? '<small style="color:green">Disponível na Estante</small>' : `<button class="btn btn-warning" onclick="entrarNaFilaOPAC('${l.id}')">Entrar na Fila</button>`}
            </div>
        </div>
    `).join('') || '<p style="color:#7f8c8d;">Nenhum livro encontrado.</p>';
}

function entrarNaFilaOPAC(livroId) {
    let nome = prompt("Digite seu nome completo para entrar na fila de espera:");
    if(!nome) return;

    if(!db.reservas[livroId]) db.reservas[livroId] = [];
    if(db.reservas[livroId].includes(nome)) {
        alert("Você já está na fila deste livro!");
        return;
    }

    db.reservas[livroId].push(nome);
    salvarBanco();
    alert(`Reserva efetuada com sucesso! Você é o nº ${db.reservas[livroId].length} na fila.`);
}

// --- MÓDULO 4: Fila de Espera ---
function atualizarFila() {
    let tFila = document.getElementById('tabelaFila');
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

// Inicializar na primeira aba
window.onload = () => switchTab('catalogacao');