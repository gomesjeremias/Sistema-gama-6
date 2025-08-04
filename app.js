import * as db from './db.js';
import { checkAuth, login, logout } from './auth.js';
import { escolasNavegantes } from './escolas.js';
const { jsPDF } = window.jspdf;
const autoTable = window.jspdf.autoTable;

let vendasProdutoChart;
let currentEscolaId = null;

// Funções de Renderização
function renderClients(escolaId = null) {
    let clients;
    if (escolaId) {
        clients = db.getClientesByEscola(escolaId);
        currentEscolaId = escolaId;
        const escola = db.getEscolaById(escolaId);
        document.getElementById('escola-title').textContent = `Clientes da ${escola.nome}`;
    } else {
        clients = db.getAll('clientes');
    }
    
    const tableBody = document.getElementById('clientes-table');
    tableBody.innerHTML = '';
    clients.forEach(client => {
        const statusBadge = client.status === 'Pago' ? 'badge-success' : 'badge-warning';
        tableBody.innerHTML += `
            <tr>
                <td>${client.nome}</td>
                <td>${client.email}</td>
                <td>${client.telefone}</td>
                <td><span class="badge ${statusBadge} badge-ghost">${client.status}</span></td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-client-btn" data-id="${client.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-client-btn" data-id="${client.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderProducts() {
    const products = db.getAll('produtos');
    const tableBody = document.getElementById('produtos-table');
    tableBody.innerHTML = '';
    products.forEach(product => {
        tableBody.innerHTML += `
            <tr>
                <td>${product.nome}</td>
                <td>${product.codigo}</td>
                <td>${product.descricao}</td>
                <td>${product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${product.estoque}</td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-product-btn" data-id="${product.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-product-btn" data-id="${product.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderSuppliers() {
    const suppliers = db.getAll('fornecedores');
    const tableBody = document.getElementById('fornecedores-table');
    tableBody.innerHTML = '';
    suppliers.forEach(supplier => {
        tableBody.innerHTML += `
            <tr>
                <td>${supplier.nome}</td>
                <td>${supplier.cnpj}</td>
                <td>${supplier.contato}</td>
                <td>${supplier.produtos}</td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-supplier-btn" data-id="${supplier.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-supplier-btn" data-id="${supplier.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderSales() {
    const sales = db.getAll('vendas');
    const clients = db.getAll('clientes');
    const products = db.getAll('produtos');
    const tableBody = document.getElementById('vendas-table');
    tableBody.innerHTML = '';

    // Criar mapas para acesso rápido
    const clientMap = new Map(clients.map(c => [c.id, c.nome]));
    const productMap = new Map(products.map(p => [p.id, p.nome]));

    sales.forEach(sale => {
        const statusBadge = sale.status === 'Pago' ? 'badge-success' : 'badge-warning';
        const clientName = clientMap.get(sale.clienteId) || 'Cliente não encontrado';
        const productName = productMap.get(sale.produtoId) || 'Produto não encontrado';
        const saleDate = new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

        tableBody.innerHTML += `
             <tr>
                <td>${saleDate}</td>
                <td>${clientName}</td>
                <td>${productName}</td>
                <td>${sale.quantidade}</td>
                <td>${sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                <td>${sale.formaPagamento}</td>
                <td><span class="badge ${statusBadge} badge-ghost">${sale.status}</span></td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-sale-btn" data-id="${sale.id}"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-sale-btn" data-id="${sale.id}"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderDashboard() {
    const vendas = db.getAll('vendas');
    const produtos = db.getAll('produtos');
    const clientes = db.getAll('clientes');

    const totalRecebido = vendas.filter(v => v.status === 'Pago').reduce((sum, v) => sum + v.valorTotal, 0);
    const totalAReceber = vendas.filter(v => v.status === 'A pagar').reduce((sum, v) => sum + v.valorTotal, 0);

    document.getElementById('total-recebido').textContent = totalRecebido.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('total-a-receber').textContent = totalAReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    document.getElementById('n-vendas').textContent = vendas.length;

    // Tabela de clientes a pagar
    const clientesAPagarTable = document.querySelector('#clientes-a-pagar-table tbody');
    clientesAPagarTable.innerHTML = '';
    clientes.filter(c => c.status === 'A pagar').forEach(c => {
        clientesAPagarTable.innerHTML += `<tr><td>${c.nome}</td><td>${c.telefone}</td></tr>`
    });

    // Gráfico de Vendas por Produto
    const vendasPorProduto = vendas.reduce((acc, venda) => {
        const produto = produtos.find(p => p.id === venda.produtoId);
        if (produto) {
            acc[produto.nome] = (acc[produto.nome] || 0) + venda.valorTotal;
        }
        return acc;
    }, {});

    const chartLabels = Object.keys(vendasPorProduto);
    const chartData = Object.values(vendasPorProduto);

    const ctx = document.getElementById('vendas-produto-chart').getContext('2d');
    if (vendasProdutoChart) {
        vendasProdutoChart.destroy();
    }
    vendasProdutoChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Total Vendido',
                data: chartData,
                backgroundColor: [
                    '#2563eb', '#f97316', '#16a34a', '#facc15', '#9333ea', '#db2777'
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
        }
    });
}


// Navegação
function showPage(pageId) {
    document.querySelectorAll('.page-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(pageId)?.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${pageId}`) {
            link.classList.add('active');
        }
    });
}

function handleNavigation() {
    const hash = window.location.hash.substring(1);
    const pageId = hash.split('-')[0] || 'dashboard';
    
    showPage(pageId);

    if (pageId === 'dashboard') renderDashboard();
    if (pageId === 'escola') {
        const escolaId = hash.split('-')[1];
        if (escolaId) {
            renderClients(parseInt(escolaId));
        }
    }
    if (pageId === 'produtos') renderProducts();
    if (pageId === 'fornecedores') renderSuppliers();
    if (pageId === 'vendas') renderSales();
}

// Lógica de Formulários
function setupClientForm() {
    const form = document.getElementById('client-form');
    const modal = document.getElementById('client_modal');
    const modalTitle = document.getElementById('client-modal-title');
    const saveBtn = document.getElementById('save-client-btn');
    const idField = document.getElementById('client-id');
    const escolaSelect = document.getElementById('client-escola');

    // Preencher select de escolas
    function populateEscolaSelect() {
        escolaSelect.innerHTML = '<option disabled selected>Selecione uma escola</option>';
        const escolas = db.getAllEscolas();
        escolas.forEach(escola => {
            escolaSelect.innerHTML += `<option value="${escola.id}">${escola.nome}</option>`;
        });
        
        // Se estamos em uma escola específica, pré-selecionar
        if (currentEscolaId) {
            escolaSelect.value = currentEscolaId;
        }
    }

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const clientData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                nome: document.getElementById('client-name').value,
                email: document.getElementById('client-email').value,
                telefone: document.getElementById('client-phone').value,
                escolaId: parseInt(document.getElementById('client-escola').value),
                status: document.getElementById('client-status').value,
            };
            db.save('clientes', clientData);
            
            // Renderizar clientes da escola atual se estivermos em uma escola específica
            if (currentEscolaId) {
                renderClients(currentEscolaId);
            } else {
                renderClients();
            }
            
            modal.close();
            form.reset();
        } else {
            form.reportValidity();
        }
    };

    // Resetar formulário ao abrir para "Novo Cliente"
    const novoClienteBtn = document.querySelector('button[onclick="client_modal.showModal()"]');
    novoClienteBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Novo Cliente';
        populateEscolaSelect();
    });
}

function setupSaleForm() {
    const form = document.getElementById('sale-form');
    const modal = document.getElementById('sale_modal');
    const modalTitle = document.getElementById('sale-modal-title');
    const saveBtn = document.getElementById('save-sale-btn');
    const idField = document.getElementById('sale-id');
    const clientSelect = document.getElementById('sale-client');
    const productSelect = document.getElementById('sale-product');
    const quantityInput = document.getElementById('sale-quantity');
    const totalInput = document.getElementById('sale-total');

    const products = db.getAll('produtos');

    function populateSelects() {
        const clients = db.getAll('clientes');
        clientSelect.innerHTML = '<option disabled selected>Selecione um cliente</option>';
        clients.forEach(c => clientSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`);

        productSelect.innerHTML = '<option disabled selected>Selecione um produto</option>';
        products.forEach(p => productSelect.innerHTML += `<option value="${p.id}">${p.nome}</option>`);
    }

    function calculateTotal() {
        const productId = productSelect.value;
        const quantity = quantityInput.value;
        if (productId && quantity > 0) {
            const product = products.find(p => p.id == productId);
            if (product) {
                const total = product.preco * quantity;
                totalInput.value = total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            }
        } else {
            totalInput.value = 'R$ 0,00';
        }
    }

    productSelect.addEventListener('change', calculateTotal);
    quantityInput.addEventListener('input', calculateTotal);

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const productId = parseInt(productSelect.value);
            const product = products.find(p => p.id === productId);
            const totalValue = product.preco * parseInt(quantityInput.value);

            const saleData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                clienteId: parseInt(document.getElementById('sale-client').value),
                produtoId: productId,
                quantidade: parseInt(document.getElementById('sale-quantity').value),
                valorTotal: totalValue,
                formaPagamento: document.getElementById('sale-payment').value,
                status: document.getElementById('sale-status').value,
            };

            const existingSale = idField.value ? db.getById('vendas', parseInt(idField.value)) : null;
            if (existingSale) {
                saleData.data = existingSale.data;
            }

            db.save('vendas', saleData);
            renderSales();
            renderDashboard();
            modal.close();
        } else {
            form.reportValidity();
        }
    };

    const novoVendaBtn = document.querySelector('button[onclick="sale_modal.showModal()"]');
    novoVendaBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Nova Venda';
        totalInput.value = 'R$ 0,00';
        populateSelects();
    });

    document.getElementById('close-sale-modal-btn').addEventListener('click', () => form.reset());
}

function setupProductForm() {
    const form = document.getElementById('produto-form');
    const modal = document.getElementById('produto_modal');
    const modalTitle = document.getElementById('produto-modal-title');
    const saveBtn = document.getElementById('save-produto-btn');
    const idField = document.getElementById('produto-id');

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const productData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                nome: document.getElementById('produto-nome').value,
                codigo: document.getElementById('produto-codigo').value,
                descricao: document.getElementById('produto-descricao').value,
                preco: parseFloat(document.getElementById('produto-preco').value),
                estoque: parseInt(document.getElementById('produto-estoque').value),
            };
            db.save('produtos', productData);
            renderProducts();
            modal.close();
            form.reset();
        } else {
            form.reportValidity();
        }
    };

    // Resetar formulário ao abrir para "Novo Produto"
    const novoProdutoBtn = document.querySelector('button[onclick="produto_modal.showModal()"]');
    novoProdutoBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Novo Produto';
    });
}

function setupSupplierForm() {
    const form = document.getElementById('fornecedor-form');
    const modal = document.getElementById('fornecedor_modal');
    const modalTitle = document.getElementById('fornecedor-modal-title');
    const saveBtn = document.getElementById('save-fornecedor-btn');
    const idField = document.getElementById('fornecedor-id');

    saveBtn.onclick = () => {
        if (form.checkValidity()) {
            const supplierData = {
                id: idField.value ? parseInt(idField.value) : undefined,
                nome: document.getElementById('fornecedor-nome').value,
                cnpj: document.getElementById('fornecedor-cnpj').value,
                contato: document.getElementById('fornecedor-contato').value,
                produtos: document.getElementById('fornecedor-produtos').value,
            };
            db.save('fornecedores', supplierData);
            renderSuppliers();
            modal.close();
            form.reset();
        } else {
            form.reportValidity();
        }
    };

    // Resetar formulário ao abrir para "Novo Fornecedor"
    const novoFornecedorBtn = document.querySelector('button[onclick="fornecedor_modal.showModal()"]');
    novoFornecedorBtn.addEventListener('click', () => {
        form.reset();
        idField.value = '';
        modalTitle.textContent = 'Novo Fornecedor';
    });
}

function generateSalesReportPDF(clientId = null) {
    const doc = new jsPDF();
    const sales = db.getAll("vendas");
    const clients = db.getAll("clientes");
    const products = db.getAll("produtos");
    const productMap = new Map(products.map(p => [p.id, p.nome]));

    // Se um ID de cliente foi fornecido, gera o relatório específico
    if (clientId) {
        const client = clients.find(c => c.id === clientId);
        if (!client) {
            alert('Cliente não encontrado!');
            return;
        }

        const clientSales = sales.filter(sale => sale.clienteId === clientId);
        const totalPaid = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
        const totalDue = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);

        doc.setFontSize(18);
        doc.text(`Relatório de Vendas - ${client.nome}`, 14, 22);
        doc.setFontSize(11);
        doc.text(`Email: ${client.email || 'N/A'}`, 14, 30);
        doc.text(`Telefone: ${client.telefone || 'N/A'}`, 14, 36);

        const tableColumn = ["Data", "Produto", "Qtd", "Valor Unit.", "Valor Total", "Status"];
        const tableRows = clientSales.map(sale => [
            new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
            productMap.get(sale.produtoId) || 'Produto não encontrado',
            sale.quantidade,
            (sale.valorTotal / sale.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            sale.status
        ]);

        doc.autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] },
        });

        let finalY = doc.lastAutoTable.finalY || 60;
        doc.setFontSize(12);
        doc.text(`Total Pago: ${totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 10);
        doc.text(`Total a Pagar: ${totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, finalY + 17);
        
        doc.save(`relatorio_${client.nome.replace(/\s/g, '_')}.pdf`);

    } else {
        // Relatório geral com detalhes de produtos por cliente
        doc.setFontSize(18);
        doc.text('Relatório Detalhado de Vendas', 14, 22);

        let yPosition = 35;
        
        clients.forEach(client => {
            const clientSales = sales.filter(sale => sale.clienteId === client.id);
            if (clientSales.length === 0) return;

            // Cabeçalho do cliente
            doc.setFontSize(14);
            doc.text(`Cliente: ${client.nome}`, 14, yPosition);
            yPosition += 7;
            doc.setFontSize(10);
            doc.text(`Email: ${client.email || 'N/A'} | Telefone: ${client.telefone || 'N/A'}`, 14, yPosition);
            yPosition += 10;

            // Tabela de vendas do cliente
            const tableColumn = ["Data", "Produto", "Qtd", "Valor Unit.", "Valor Total", "Status"];
            const tableRows = clientSales.map(sale => [
                new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                productMap.get(sale.produtoId) || 'Produto não encontrado',
                sale.quantidade,
                (sale.valorTotal / sale.quantidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
                sale.status
            ]);

            doc.autoTable({
                head: [tableColumn],
                body: tableRows,
                startY: yPosition,
                theme: 'striped',
                headStyles: { fillColor: [37, 99, 235] },
                margin: { left: 14, right: 14 }
            });

            yPosition = doc.lastAutoTable.finalY + 15;

            // Totais do cliente
            const totalPaid = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
            const totalDue = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);
            
            doc.setFontSize(10);
            doc.text(`Total Pago: ${totalPaid.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} | Total a Pagar: ${totalDue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 14, yPosition);
            yPosition += 15;

            // Nova página se necessário
            if (yPosition > 250) {
                doc.addPage();
                yPosition = 20;
            }
        });

        doc.save('relatorio_detalhado_vendas.pdf');
    }
}

function generateSalesReportExcel(clientId = null) {
    const sales = db.getAll("vendas");
    const clients = db.getAll("clientes");
    const products = db.getAll("produtos");
    const productMap = new Map(products.map(p => [p.id, p.nome]));

    let workbook = XLSX.utils.book_new();

    if (clientId) {
        // Relatório específico de um cliente
        const client = clients.find(c => c.id === clientId);
        if (!client) {
            alert('Cliente não encontrado!');
            return;
        }

        const clientSales = sales.filter(sale => sale.clienteId === clientId);
        
        // Dados do cliente
        const clientData = [
            ['RELATÓRIO DE VENDAS'],
            [''],
            ['Cliente:', client.nome],
            ['Email:', client.email || 'N/A'],
            ['Telefone:', client.telefone || 'N/A'],
            [''],
            ['Data', 'Produto', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Status']
        ];

        // Dados das vendas
        clientSales.forEach(sale => {
            clientData.push([
                new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                productMap.get(sale.produtoId) || 'Produto não encontrado',
                sale.quantidade,
                sale.valorTotal / sale.quantidade,
                sale.valorTotal,
                sale.status
            ]);
        });

        // Totais
        const totalPaid = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
        const totalDue = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);
        
        clientData.push(['']);
        clientData.push(['Total Pago:', totalPaid]);
        clientData.push(['Total a Pagar:', totalDue]);

        const worksheet = XLSX.utils.aoa_to_sheet(clientData);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Cliente');
        XLSX.writeFile(workbook, `relatorio_${client.nome.replace(/\s/g, '_')}.xlsx`);

    } else {
        // Relatório geral - uma aba por cliente
        clients.forEach(client => {
            const clientSales = sales.filter(sale => sale.clienteId === client.id);
            if (clientSales.length === 0) return;

            const clientData = [
                [`Cliente: ${client.nome}`],
                [`Email: ${client.email || 'N/A'} | Telefone: ${client.telefone || 'N/A'}`],
                [''],
                ['Data', 'Produto', 'Quantidade', 'Valor Unitário', 'Valor Total', 'Status']
            ];

            clientSales.forEach(sale => {
                clientData.push([
                    new Date(sale.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' }),
                    productMap.get(sale.produtoId) || 'Produto não encontrado',
                    sale.quantidade,
                    sale.valorTotal / sale.quantidade,
                    sale.valorTotal,
                    sale.status
                ]);
            });

            const totalPaid = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
            const totalDue = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);
            
            clientData.push(['']);
            clientData.push(['Total Pago:', totalPaid]);
            clientData.push(['Total a Pagar:', totalDue]);

            const worksheet = XLSX.utils.aoa_to_sheet(clientData);
            XLSX.utils.book_append_sheet(workbook, worksheet, client.nome.substring(0, 31)); // Excel limita nomes de abas a 31 caracteres
        });

        // Aba resumo
        const summaryData = [
            ['RESUMO GERAL DE VENDAS'],
            [''],
            ['Cliente', 'Total Pago', 'Total a Pagar', 'Total Geral']
        ];

        clients.forEach(client => {
            const clientSales = sales.filter(sale => sale.clienteId === client.id);
            if (clientSales.length === 0) return;

            const totalPaid = clientSales.filter(s => s.status === 'Pago').reduce((sum, s) => sum + s.valorTotal, 0);
            const totalDue = clientSales.filter(s => s.status === 'A pagar').reduce((sum, s) => sum + s.valorTotal, 0);
            
            summaryData.push([
                client.nome,
                totalPaid,
                totalDue,
                totalPaid + totalDue
            ]);
        });

        const summaryWorksheet = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(workbook, summaryWorksheet, 'Resumo');

        XLSX.writeFile(workbook, 'relatorio_detalhado_vendas.xlsx');
    }
}

function setupEventListeners() {
    // Event listener para expandir o menu Escolas
    document.getElementById("escolas-menu").addEventListener("toggle", (event) => {
        if (event.target.open) {
            renderEscolasMenu();
        }
    });

    // Event Listeners para botões de ação principais
    document.getElementById('download-sales-pdf').addEventListener('click', () => {
        const clients = db.getAll('clientes');
        const select = document.getElementById('report-client-select');
        
        // Limpa opções antigas, mantendo a primeira
        select.innerHTML = '<option disabled selected value="">Escolha um cliente</option>';

        // Popula o select com os clientes
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.nome;
            select.appendChild(option);
        });

        // Abre o modal
        report_client_modal.showModal();
    });

    // Event listener para Excel
    document.getElementById('download-sales-excel').addEventListener('click', () => {
        const clients = db.getAll('clientes');
        const select = document.getElementById('report-client-select');
        
        // Limpa opções antigas, mantendo a primeira
        select.innerHTML = '<option disabled selected value="">Escolha um cliente</option>';

        // Popula o select com os clientes
        clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.nome;
            select.appendChild(option);
        });

        // Abre o modal
        report_client_modal.showModal();
        
        // Marca que é para Excel
        document.getElementById('report-client-modal').setAttribute('data-format', 'excel');
    });

    // Listener para o botão "Gerar PDF" dentro do modal
    document.getElementById('generate-selected-client-report-btn').addEventListener('click', () => {
        const select = document.getElementById('report-client-select');
        const selectedClientId = parseInt(select.value);
        const format = document.getElementById('report-client-modal').getAttribute('data-format');

        if (selectedClientId) {
            if (format === 'excel') {
                generateSalesReportExcel(selectedClientId);
            } else {
                generateSalesReportPDF(selectedClientId);
            }
            report_client_modal.close(); // Fecha o modal após gerar
        } else {
            // Se nenhum cliente específico foi selecionado, gera relatório geral
            if (format === 'excel') {
                generateSalesReportExcel();
            } else {
                generateSalesReportPDF();
            }
            report_client_modal.close();
        }
        
        // Remove o atributo data-format
        document.getElementById('report-client-modal').removeAttribute('data-format');
    });

    document.getElementById('clientes-table').addEventListener('click', (e) => {
        // Removido - agora gerenciado por setupClientEvents()
    });

    // Event Listeners para botões de Produtos (Editar/Deletar)
    document.getElementById('produtos-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-product-btn')) {
            if (confirm('Tem certeza que deseja excluir este produto?')) {
                db.remove('produtos', id);
                renderProducts();
            }
        } else if (btn.classList.contains('edit-product-btn')) {
            const product = db.getById('produtos', id);
            document.getElementById('produto-id').value = product.id;
            document.getElementById('produto-nome').value = product.nome;
            document.getElementById('produto-codigo').value = product.codigo;
            document.getElementById('produto-descricao').value = product.descricao;
            document.getElementById('produto-preco').value = product.preco;
            document.getElementById('produto-estoque').value = product.estoque;
            document.getElementById('produto-modal-title').textContent = 'Editar Produto';
            document.getElementById('produto_modal').showModal();
        }
    });

    // Event Listeners para botões de Fornecedores (Editar/Deletar)
    document.getElementById('fornecedores-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-supplier-btn')) {
            if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
                db.remove('fornecedores', id);
                renderSuppliers();
            }
        } else if (btn.classList.contains('edit-supplier-btn')) {
            const supplier = db.getById('fornecedores', id);
            document.getElementById('fornecedor-id').value = supplier.id;
            document.getElementById('fornecedor-nome').value = supplier.nome;
            document.getElementById('fornecedor-cnpj').value = supplier.cnpj;
            document.getElementById('fornecedor-contato').value = supplier.contato;
            document.getElementById('fornecedor-produtos').value = supplier.produtos;
            document.getElementById('fornecedor-modal-title').textContent = 'Editar Fornecedor';
            document.getElementById('fornecedor_modal').showModal();
        }
    });

    // Event Listeners para botões de Vendas (Editar/Deletar/Limpar/PDF)
    document.getElementById('vendas-table').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = parseInt(btn.dataset.id);
        if (btn.classList.contains('delete-sale-btn')) {
            if (confirm('Tem certeza que deseja excluir esta venda?')) {
                db.remove('vendas', id);
                renderSales();
                renderDashboard();
            }
        } else if (btn.classList.contains('edit-sale-btn')) {
            const sale = db.getById('vendas', id);
            setupSaleForm(); // Popula os selects
            document.getElementById('sale-id').value = sale.id;
            document.getElementById('sale-client').value = sale.clienteId;
            document.getElementById('sale-product').value = sale.produtoId;
            document.getElementById('sale-quantity').value = sale.quantidade;
            document.getElementById('sale-payment').value = sale.formaPagamento;
            document.getElementById('sale-status').value = sale.status;
            document.getElementById('sale-total').value = sale.valorTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            document.getElementById('sale-modal-title').textContent = 'Editar Venda';
            document.getElementById('sale_modal').showModal();
        }
    });

    document.getElementById('clear-sales-btn').addEventListener('click', () => {
        if (confirm('ATENÇÃO: Isso apagará TODAS as vendas permanentemente. Deseja continuar?')) {
            db._dangerouslyClearTable('vendas');
            renderSales();
            renderDashboard();
        }
    });

    document.getElementById('download-sales-pdf').addEventListener('click', generateSalesReportPDF);
}

function showLoginPage() {
    document.getElementById('login-page').classList.remove('hidden');
    document.getElementById('signup-page').classList.add('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showSignupPage() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('signup-page').classList.remove('hidden');
    document.getElementById('main-app').classList.add('hidden');
}

function showMainApp() {
    document.getElementById('login-page').classList.add('hidden');
    document.getElementById('signup-page').classList.add('hidden');
    document.getElementById('main-app').classList.remove('hidden');
}

document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    if (login(user, pass)) {
        db.init(); // Garante que o DB seja inicializado primeiro
        showMainApp();
        renderEscolasMenu();
        setupClientEvents();
        setupClientForm();
        setupSaleForm();
        setupProductForm();
        setupSupplierForm();
        setupMobileMenu();
        handleNavigation();
        
        // Event listeners
        window.addEventListener("hashchange", handleNavigation);
        
        // Event listeners para botões de ação
        document.getElementById("download-sales-pdf").addEventListener("click", () => generateSalesReportPDF());
        document.getElementById("download-sales-excel").addEventListener("click", () => generateSalesReportExcel());
        document.getElementById("clear-sales-btn").addEventListener("click", clearAllSales);
        
        // Configurar outros event listeners
        setupEventListeners();
    } else {
        alert('Usuário ou senha inválidos!');
    }
});

document.getElementById('logout-btn').addEventListener('click', () => {
    logout();
    init();
});

document.getElementById('show-signup-btn').addEventListener('click', showSignupPage);
document.getElementById('show-login-btn').addEventListener('click', showLoginPage);

// Função para configurar o menu hambúrguer
function setupMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    
    if (!menuToggle || !sidebar || !overlay) return;
    
    // Toggle do menu
    menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('show');
        overlay.classList.toggle('show');
    });
    
    // Fechar menu ao clicar no overlay
    overlay.addEventListener('click', function() {
        sidebar.classList.remove('show');
        overlay.classList.remove('show');
    });
    
    // Fechar menu ao clicar em um link de navegação (mobile)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function() {
            if (window.innerWidth < 1024) { // lg breakpoint
                sidebar.classList.remove('show');
                overlay.classList.remove('show');
            }
        });
    });
    
    // Fechar menu ao redimensionar para desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth >= 1024) {
            sidebar.classList.remove('show');
            overlay.classList.remove('show');
        }
    });
}

// Função para renderizar o menu de escolas
function renderEscolasMenu() {
    const escolasSubmenu = document.getElementById('escolas-submenu');
    escolasSubmenu.innerHTML = '';
    
    const escolas = db.getAllEscolas();
    escolas.forEach(escola => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#escola-${escola.id}" class="escola-link" data-escola-id="${escola.id}">
            <i class="fa-solid fa-users w-4"></i> ${escola.nome}
        </a>`;
        escolasSubmenu.appendChild(li);
    });
}

// Função para configurar eventos de edição e exclusão de clientes
function setupClientEvents() {
    document.addEventListener('click', function(e) {
        if (e.target.closest('.edit-client-btn')) {
            const clientId = parseInt(e.target.closest('.edit-client-btn').dataset.id);
            const client = db.getById('clientes', clientId);
            if (client) {
                document.getElementById('client-id').value = client.id;
                document.getElementById('client-name').value = client.nome;
                document.getElementById('client-email').value = client.email;
                document.getElementById('client-phone').value = client.telefone;
                document.getElementById('client-status').value = client.status;

                
                
                // Preencher select de escolas e selecionar a escola do cliente
                const escolaSelect = document.getElementById('client-escola');
                escolaSelect.innerHTML = '<option disabled>Selecione uma escola</option>';
                const escolas = db.getAllEscolas();
                escolas.forEach(escola => {
                    escolaSelect.innerHTML += `<option value="${escola.id}">${escola.nome}</option>`;
                });
                escolaSelect.value = client.escolaId;
                
                document.getElementById('client-modal-title').textContent = 'Editar Cliente';
                document.getElementById('client_modal').showModal();
            }
        }
        
        if (e.target.closest('.delete-client-btn')) {
            const clientId = parseInt(e.target.closest('.delete-client-btn').dataset.id);
            if (confirm('Tem certeza que deseja excluir este cliente?')) {
                db.remove('clientes', clientId);
                if (currentEscolaId) {
                    renderClients(currentEscolaId);
                } else {
                    renderClients();
                }
            }
        }
    });
}

function init() {
    db.init();
    
    if (checkAuth()) {
        showMainApp();
        renderEscolasMenu();
        setupClientEvents();
        setupClientForm();
        setupSaleForm();
        setupProductForm();
        setupSupplierForm();
        setupMobileMenu();
        handleNavigation();
        
        // Event listeners
        window.addEventListener('hashchange', handleNavigation);
        
        // Event listeners para botões de ação
        document.getElementById('download-sales-pdf').addEventListener('click', () => generateSalesReportPDF());
        document.getElementById('clear-sales-btn').addEventListener('click', clearAllSales);
        
        // Configurar outros event listeners
        setupEventListeners();
    } else {
        showLoginPage();
    }
}

init();