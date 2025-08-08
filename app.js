import * as db from './db.js'
import { checkAuth, login, logout } from './auth.js'

const { jsPDF } = window.jspdf

let vendasProdutoChart
let currentEscolaId = null

// Funções de Renderização
function renderClients(escolaId = null, filtro = '') {
  let clients
  if (escolaId) {
    clients = db.getClientesByEscola(escolaId)
    currentEscolaId = escolaId
    const escola = db.getEscolaById(escolaId)
    document.getElementById(
      'escola-title'
    ).textContent = `Clientes da ${escola.nome}`
  } else {
    clients = db.getAll('clientes')
  }

  clients = clients.filter(c =>
    c.nome.toLowerCase().includes(filtro.toLowerCase())
  )

  const tableBody = document.getElementById('clientes-table')
  tableBody.innerHTML = ''
  clients.forEach(client => {
    const statusBadge =
      client.status === 'Pago' ? 'badge-success' : 'badge-warning'
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
        `
  })
}

function renderProducts(filtro = '') {
  const products = db
    .getAll('produtos')
    .filter(p => p.nome.toLowerCase().includes(filtro.toLowerCase()))

  const tableBody = document.getElementById('produtos-table')
  tableBody.innerHTML = ''
  products.forEach(product => {
    tableBody.innerHTML += `
            <tr>
                <td>${product.nome}</td>
                <td>${product.codigo}</td>
                <td>${product.descricao}</td>
                <td>${product.preco.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}</td>
                <td>${product.estoque}</td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-product-btn" data-id="${
                      product.id
                    }"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-product-btn" data-id="${
                      product.id
                    }"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `
  })
}

function renderSuppliers() {
  const suppliers = db.getAll('fornecedores')
  const tableBody = document.getElementById('fornecedores-table')
  tableBody.innerHTML = ''
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
        `
  })
}

function renderSales(statusFilter = 'all', clientNameFilter = '') {
  const sales = db.getAll('vendas')
  console.log(
    'Vendas encontradas:',
    sales.map(s => ({ id: s.id, status: s.status }))
  )
  console.log('Filtro de status aplicado:', statusFilter)
  console.log('Filtro de cliente aplicado:', clientNameFilter)

  const clients = db.getAll('clientes')
  const products = db.getAll('produtos')
  const tableBody = document.getElementById('vendas-table')
  tableBody.innerHTML = ''

  const clientMap = new Map(clients.map(c => [c.id, c.nome]))
  const productMap = new Map(products.map(p => [p.id, p.nome]))

  // Filtrar vendas por status e nome do cliente
  let filteredSales = sales

  // Filtro por status
  if (statusFilter !== 'all') {
    filteredSales = filteredSales.filter(sale => {
      if (statusFilter === 'A Pagar') {
        return sale.status === 'A Pagar' || sale.status === 'A pagar'
      }
      return sale.status === statusFilter
    })
  }

  // Filtro por nome do cliente
  if (clientNameFilter.trim() !== '') {
    filteredSales = filteredSales.filter(sale => {
      const clientName = clientMap.get(sale.clienteId) || ''
      return clientName.toLowerCase().includes(clientNameFilter.toLowerCase())
    })
  }

  // Atualizar contador
  const counter = document.getElementById('vendas-counter')
  if (counter) {
    const totalSales = sales.length
    const filteredCount = filteredSales.length
    let counterText = ''

    if (statusFilter === 'all' && clientNameFilter.trim() === '') {
      counterText = `${totalSales} vendas`
    } else if (clientNameFilter.trim() !== '') {
      counterText = `${filteredCount} de ${totalSales} vendas ${
        clientNameFilter.trim() ? `(cliente: "${clientNameFilter}")` : ''
      }`
    } else {
      counterText = `${filteredCount} de ${totalSales} vendas`
    }

    counter.textContent = counterText
  }

  filteredSales.forEach(sale => {
    let statusBadge = 'badge-warning' // Default
    if (sale.status === 'Pago') statusBadge = 'badge-success'
    else if (sale.status === 'Pago Parcialmente') statusBadge = 'badge-warning'
    else if (sale.status === 'A Pagar' || sale.status === 'A pagar')
      statusBadge = 'badge-error'

    const clientName = clientMap.get(sale.clienteId) || 'Cliente não encontrado'
    const productName =
      productMap.get(sale.produtoId) || 'Produto não encontrado'
    const saleDate = new Date(sale.data).toLocaleDateString('pt-BR', {
      timeZone: 'UTC'
    })

    tableBody.innerHTML += `
             <tr class="vendas-table-row show">
                <td>${saleDate}</td>
                <td>${clientName}</td>
                <td>${productName}</td>
                <td>${sale.quantidade}</td>
                <td>${sale.valorTotal.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL'
                })}</td>
                <td>${sale.formaPagamento}</td>
                <td><span class="badge ${statusBadge} badge-ghost">${
      sale.status
    }</span></td>
                <td class="space-x-2">
                    <button class="btn btn-xs btn-outline btn-info edit-sale-btn" data-id="${
                      sale.id
                    }"><i class="fa-solid fa-pencil"></i></button>
                    <button class="btn btn-xs btn-outline btn-error delete-sale-btn" data-id="${
                      sale.id
                    }"><i class="fa-solid fa-trash"></i></button>
                </td>
            </tr>
        `
  })
}

function renderDashboard() {
  const vendas = db.getAll('vendas')
  const produtos = db.getAll('produtos')
  const clientes = db.getAll('clientes')

  const totalRecebido = vendas
    .filter(v => v.status === 'Pago')
    .reduce((sum, v) => sum + v.valorTotal, 0)
  const totalAReceber = vendas
    .filter(v => v.status === 'A Pagar' || v.status === 'A pagar')
    .reduce((sum, v) => sum + v.valorTotal, 0)

  document.getElementById('total-recebido').textContent =
    totalRecebido.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  document.getElementById('total-a-receber').textContent =
    totalAReceber.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    })
  document.getElementById('n-vendas').textContent = vendas.length

  const clientesAPagarTable = document.querySelector(
    '#clientes-a-pagar-table tbody'
  )
  clientesAPagarTable.innerHTML = ''
  clientes
    .filter(c => c.status === 'A Pagar' || c.status === 'A pagar')
    .forEach(c => {
      clientesAPagarTable.innerHTML += `<tr><td>${c.nome}</td><td>${c.telefone}</td></tr>`
    })

  const vendasPorProduto = vendas.reduce((acc, venda) => {
    const produto = produtos.find(p => p.id === venda.produtoId)
    if (produto) {
      acc[produto.nome] = (acc[produto.nome] || 0) + venda.valorTotal
    }
    return acc
  }, {})

  const chartLabels = Object.keys(vendasPorProduto)
  const chartData = Object.values(vendasPorProduto)

  const ctx = document.getElementById('vendas-produto-chart').getContext('2d')
  if (vendasProdutoChart) {
    vendasProdutoChart.destroy()
  }
  vendasProdutoChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: chartLabels,
      datasets: [
        {
          label: 'Total Vendido',
          data: chartData,
          backgroundColor: [
            '#2563eb',
            '#f97316',
            '#16a34a',
            '#facc15',
            '#9333ea',
            '#db2777'
          ],
          hoverOffset: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  })
}

// Navegação
function showPage(pageId) {
  document.querySelectorAll('.page-section').forEach(section => {
    section.classList.add('hidden')
  })
  document.getElementById(pageId)?.classList.remove('hidden')

  document.querySelectorAll('.nav-link').forEach(link => {
    link.classList.remove('active')
    if (link.getAttribute('href') === `#${pageId}`) {
      link.classList.add('active')
    }
  })
}

function handleNavigation() {
  const hash = window.location.hash.substring(1)
  const pageId = hash.split('-')[0] || 'dashboard'

  showPage(pageId)

  if (pageId === 'dashboard') renderDashboard()
  if (pageId === 'escola') {
    const escolaId = hash.split('-')[1]
    renderClients(escolaId ? parseInt(escolaId) : null)
  }
  if (pageId === 'produtos') renderProducts()
  if (pageId === 'fornecedores') renderSuppliers()
  if (pageId === 'vendas') {
    renderSales()
    setupSalesFilters()
  }
}

// Lógica de Formulários
function setupClientForm() {
  const form = document.getElementById('client-form')
  const modal = document.getElementById('client_modal')
  const saveBtn = document.getElementById('save-client-btn')
  const idField = document.getElementById('client-id')

  saveBtn.onclick = () => {
    if (form.checkValidity()) {
      const clientData = {
        id: idField.value ? parseInt(idField.value) : undefined,
        nome: document.getElementById('client-name').value,
        email: document.getElementById('client-email').value,
        telefone: document.getElementById('client-phone').value,
        escolaId: parseInt(document.getElementById('client-escola').value),
        status: document.getElementById('client-status').value
      }
      db.save('clientes', clientData)
      renderClients(currentEscolaId)
      modal.close()
    } else {
      form.reportValidity()
    }
  }
}

function populateClientFormForNew() {
  document.getElementById('client-form').reset()
  document.getElementById('client-id').value = ''
  document.getElementById('client-modal-title').textContent = 'Novo Cliente'
  const escolaSelect = document.getElementById('client-escola')
  escolaSelect.innerHTML =
    '<option disabled selected>Selecione uma escola</option>'
  db.getAllEscolas().forEach(escola => {
    escolaSelect.innerHTML += `<option value="${escola.id}">${escola.nome}</option>`
  })
  if (currentEscolaId) {
    escolaSelect.value = currentEscolaId
  }
}

function populateClientFormForEdit(clientId) {
  const client = db.getById('clientes', clientId)
  if (!client) return

  document.getElementById('client-form').reset()
  document.getElementById('client-modal-title').textContent = 'Editar Cliente'
  document.getElementById('client-id').value = client.id
  document.getElementById('client-name').value = client.nome
  document.getElementById('client-email').value = client.email
  document.getElementById('client-phone').value = client.telefone
  document.getElementById('client-status').value = client.status

  const escolaSelect = document.getElementById('client-escola')
  escolaSelect.innerHTML = ''
  db.getAllEscolas().forEach(escola => {
    escolaSelect.innerHTML += `<option value="${escola.id}">${escola.nome}</option>`
  })
  escolaSelect.value = client.escolaId
}

function setupSaleForm() {
  const form = document.getElementById('sale-form')
  const modal = document.getElementById('sale_modal')
  const saveBtn = document.getElementById('save-sale-btn')
  const idField = document.getElementById('sale-id')
  const productSelect = document.getElementById('sale-product')
  const quantityInput = document.getElementById('sale-quantity')
  const totalInput = document.getElementById('sale-total')

  const calculateTotal = () => {
    const productId = productSelect.value
    const quantity = quantityInput.value
    if (productId && quantity > 0) {
      const product = db.getById('produtos', parseInt(productId))
      if (product) {
        totalInput.value = (product.preco * quantity).toLocaleString('pt-BR', {
          style: 'currency',
          currency: 'BRL'
        })
      }
    } else {
      totalInput.value = 'R$ 0,00'
    }
  }

  productSelect.addEventListener('change', calculateTotal)
  quantityInput.addEventListener('input', calculateTotal)

  saveBtn.onclick = () => {
    if (form.checkValidity()) {
      const product = db.getById('produtos', parseInt(productSelect.value))
      const saleData = {
        id: idField.value ? parseInt(idField.value) : undefined,
        clienteId: parseInt(document.getElementById('sale-client').value),
        produtoId: parseInt(productSelect.value),
        quantidade: parseInt(quantityInput.value),
        valorTotal: product.preco * parseInt(quantityInput.value),
        formaPagamento: document.getElementById('sale-payment').value,
        status: document.getElementById('sale-status').value
      }
      db.save('vendas', saleData)
      renderSales()
      renderDashboard()
      modal.close()
    } else {
      form.reportValidity()
    }
  }
}

function populateSaleFormForNew() {
  document.getElementById('sale-form').reset()
  document.getElementById('sale-id').value = ''
  document.getElementById('sale-modal-title').textContent = 'Nova Venda'
  document.getElementById('sale-total').value = 'R$ 0,00'

  const clientSelect = document.getElementById('sale-client')
  clientSelect.innerHTML =
    '<option disabled selected>Selecione um cliente</option>'
  db.getAll('clientes').forEach(
    c =>
      (clientSelect.innerHTML += `<option value="${c.id}">${c.nome}</option>`)
  )

  const productSelect = document.getElementById('sale-product')
  productSelect.innerHTML =
    '<option disabled selected>Selecione um produto</option>'
  db.getAll('produtos').forEach(
    p =>
      (productSelect.innerHTML += `<option value="${p.id}">${p.nome}</option>`)
  )
}

function populateSaleFormForEdit(saleId) {
  const sale = db.getById('vendas', saleId)
  if (!sale) return

  populateSaleFormForNew() // Preenche os selects primeiro
  document.getElementById('sale-modal-title').textContent = 'Editar Venda'
  document.getElementById('sale-id').value = sale.id
  document.getElementById('sale-client').value = sale.clienteId
  document.getElementById('sale-product').value = sale.produtoId
  document.getElementById('sale-quantity').value = sale.quantidade
  document.getElementById('sale-payment').value = sale.formaPagamento
  document.getElementById('sale-status').value = sale.status
  document.getElementById('sale-total').value = sale.valorTotal.toLocaleString(
    'pt-BR',
    { style: 'currency', currency: 'BRL' }
  )
}

function setupProductForm() {
  const form = document.getElementById('produto-form')
  const modal = document.getElementById('produto_modal')
  const saveBtn = document.getElementById('save-produto-btn')
  const idField = document.getElementById('produto-id')

  saveBtn.onclick = () => {
    if (form.checkValidity()) {
      const productData = {
        id: idField.value ? parseInt(idField.value) : undefined,
        nome: document.getElementById('produto-nome').value,
        codigo: document.getElementById('produto-codigo').value,
        descricao: document.getElementById('produto-descricao').value,
        preco: parseFloat(document.getElementById('produto-preco').value),
        estoque: parseInt(document.getElementById('produto-estoque').value)
      }
      db.save('produtos', productData)
      renderProducts()
      modal.close()
    } else {
      form.reportValidity()
    }
  }
}

function populateProductFormForNew() {
  document.getElementById('produto-form').reset()
  document.getElementById('produto-id').value = ''
  document.getElementById('produto-modal-title').textContent = 'Novo Produto'
}

function populateProductFormForEdit(productId) {
  const product = db.getById('produtos', productId)
  if (!product) return

  document.getElementById('produto-form').reset()
  document.getElementById('produto-modal-title').textContent = 'Editar Produto'
  document.getElementById('produto-id').value = product.id
  document.getElementById('produto-nome').value = product.nome
  document.getElementById('produto-codigo').value = product.codigo
  document.getElementById('produto-descricao').value = product.descricao
  document.getElementById('produto-preco').value = product.preco
  document.getElementById('produto-estoque').value = product.estoque
}

function setupSupplierForm() {
  const form = document.getElementById('fornecedor-form')
  const modal = document.getElementById('fornecedor_modal')
  const saveBtn = document.getElementById('save-fornecedor-btn')
  const idField = document.getElementById('fornecedor-id')

  saveBtn.onclick = () => {
    if (form.checkValidity()) {
      const supplierData = {
        id: idField.value ? parseInt(idField.value) : undefined,
        nome: document.getElementById('fornecedor-nome').value,
        cnpj: document.getElementById('fornecedor-cnpj').value,
        contato: document.getElementById('fornecedor-contato').value,
        produtos: document.getElementById('fornecedor-produtos').value
      }
      db.save('fornecedores', supplierData)
      renderSuppliers()
      modal.close()
    } else {
      form.reportValidity()
    }
  }
}

function populateSupplierFormForNew() {
  document.getElementById('fornecedor-form').reset()
  document.getElementById('fornecedor-id').value = ''
  document.getElementById('fornecedor-modal-title').textContent =
    'Novo Fornecedor'
}

function populateSupplierFormForEdit(supplierId) {
  const supplier = db.getById('fornecedores', supplierId)
  if (!supplier) return

  document.getElementById('fornecedor-form').reset()
  document.getElementById('fornecedor-modal-title').textContent =
    'Editar Fornecedor'
  document.getElementById('fornecedor-id').value = supplier.id
  document.getElementById('fornecedor-nome').value = supplier.nome
  document.getElementById('fornecedor-cnpj').value = supplier.cnpj
  document.getElementById('fornecedor-contato').value = supplier.contato
  document.getElementById('fornecedor-produtos').value = supplier.produtos
}

function generateSalesReportPDF(clientId = null) {
  const doc = new jsPDF()
  const sales = db.getAll('vendas')
  const clients = db.getAll('clientes')
  const products = db.getAll('produtos')
  const productMap = new Map(products.map(p => [p.id, p.nome]))

  if (clientId) {
    const client = clients.find(c => c.id === clientId)
    if (!client) {
      alert('Cliente não encontrado!')
      return
    }
    const clientSales = sales.filter(sale => sale.clienteId === clientId)

    doc.text(`Relatório de Vendas - ${client.nome}`, 10, 10)
    doc.autoTable({
      head: [['Data', 'Produto', 'Qtd', 'Valor Total', 'Pagamento', 'Status']],
      body: clientSales.map(s => [
        new Date(s.data).toLocaleDateString('pt-BR'),
        productMap.get(s.produtoId) || 'Produto',
        s.quantidade,
        `R$ ${s.valorTotal.toFixed(2)}`,
        s.formaPagamento,
        s.status
      ]),
      startY: 20
    })

    doc.save(`relatorio_${client.nome.replace(/\s/g, '_')}.pdf`)
  } else {
    doc.text('Relatório Geral de Vendas', 10, 10)
    doc.autoTable({
      head: [
        [
          'Cliente',
          'Produto',
          'Qtd',
          'Valor Total',
          'Data',
          'Pagamento',
          'Status'
        ]
      ],
      body: sales.map(s => [
        clients.find(c => c.id === s.clienteId)?.nome || 'Cliente',
        productMap.get(s.produtoId) || 'Produto',
        s.quantidade,
        `R$ ${s.valorTotal.toFixed(2)}`,
        new Date(s.data).toLocaleDateString('pt-BR'),
        s.formaPagamento,
        s.status
      ]),
      startY: 20
    })

    doc.save('relatorio_detalhado_vendas.pdf')
  }
}

function setupEventListeners() {
  // Delegação de eventos para todo o documento
  document.addEventListener('click', e => {
    const target = e.target.closest('button')
    if (!target) return

    const id = parseInt(target.dataset.id)

    // Clientes
    if (target.classList.contains('edit-client-btn')) {
      populateClientFormForEdit(id)
      document.getElementById('client_modal').showModal()
    }
    if (target.classList.contains('delete-client-btn')) {
      if (confirm('Tem certeza que deseja excluir este cliente?')) {
        db.remove('clientes', id)
        renderClients(currentEscolaId)
      }
    }

    // Produtos
    if (target.classList.contains('edit-product-btn')) {
      populateProductFormForEdit(id)
      document.getElementById('produto_modal').showModal()
    }
    if (target.classList.contains('delete-product-btn')) {
      if (confirm('Tem certeza que deseja excluir este produto?')) {
        db.remove('produtos', id)
        renderProducts()
      }
    }

    // Fornecedores
    if (target.classList.contains('edit-supplier-btn')) {
      populateSupplierFormForEdit(id)
      document.getElementById('fornecedor_modal').showModal()
    }
    if (target.classList.contains('delete-supplier-btn')) {
      if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
        db.remove('fornecedores', id)
        renderSuppliers()
      }
    }

    // Vendas
    if (target.classList.contains('edit-sale-btn')) {
      populateSaleFormForEdit(id)
      document.getElementById('sale_modal').showModal()
    }
    if (target.classList.contains('delete-sale-btn')) {
      if (confirm('Tem certeza que deseja excluir esta venda?')) {
        db.remove('vendas', id)
        renderSales()
        renderDashboard()
      }
    }
  })

  document
    .getElementById('download-sales-excel')
    .addEventListener('click', () => {
      const sales = db.getAll('vendas')
      const clients = db.getAll('clientes')
      const products = db.getAll('produtos')

      const clientMap = new Map(clients.map(c => [c.id, c.nome]))
      const productMap = new Map(products.map(p => [p.id, p.nome]))

      const worksheetData = sales.map(s => ({
        Data: new Date(s.data).toLocaleDateString('pt-BR'),
        Cliente: clientMap.get(s.clienteId) || 'Desconhecido',
        Produto: productMap.get(s.produtoId) || 'Desconhecido',
        Quantidade: s.quantidade,
        ValorTotal: s.valorTotal,
        Pagamento: s.formaPagamento,
        Status: s.status
      }))

      const ws = XLSX.utils.json_to_sheet(worksheetData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Vendas')

      XLSX.writeFile(wb, 'relatorio_vendas.xlsx')
    })

  document.getElementById('produto-search').addEventListener('input', e => {
    renderProducts(e.target.value)
  })
  document.getElementById('cliente-search').addEventListener('input', e => {
    renderClients(currentEscolaId, e.target.value)
  })

  // Botões para abrir modais de "Novo"
  document
    .querySelector('button[onclick="client_modal.showModal()"]')
    .addEventListener('click', populateClientFormForNew)
  document
    .querySelector('button[onclick="produto_modal.showModal()"]')
    .addEventListener('click', populateProductFormForNew)
  document
    .querySelector('button[onclick="fornecedor_modal.showModal()"]')
    .addEventListener('click', populateSupplierFormForNew)
  document
    .querySelector('button[onclick="sale_modal.showModal()"]')
    .addEventListener('click', populateSaleFormForNew)

  // Outros botões
  document.getElementById('clear-sales-btn').addEventListener('click', () => {
    if (
      confirm(
        'ATENÇÃO: Isso apagará TODAS as vendas permanentemente. Deseja continuar?'
      )
    ) {
      db._dangerouslyClearTable('vendas')
      renderSales()
      renderDashboard()
    }
  })

  document
    .getElementById('download-sales-pdf')
    .addEventListener('click', () => generateSalesReportPDF())

  // Adicionar lógica para Excel se necessário
}

// Função separada para configurar filtros de vendas
function setupSalesFilters() {
  let currentStatusFilter = 'all'
  let currentClientFilter = ''

  // Função para aplicar filtros combinados
  function applyFilters() {
    renderSales(currentStatusFilter, currentClientFilter)
  }

  // Event listeners para filtros de status
  const filterButtons = document.querySelectorAll('.filter-btn')

  // Remover listeners antigos (se existirem)
  filterButtons.forEach(button => {
    const newButton = button.cloneNode(true)
    button.parentNode.replaceChild(newButton, button)
  })

  // Adicionar novos listeners para filtros de status
  const newFilterButtons = document.querySelectorAll('.filter-btn')
  newFilterButtons.forEach(button => {
    button.addEventListener('click', e => {
      currentStatusFilter = e.target.getAttribute('data-status')
      console.log('Filtro de status clicado:', currentStatusFilter)

      // Atualizar visual dos botões
      newFilterButtons.forEach(btn => btn.classList.remove('active'))
      e.target.classList.add('active')

      // Aplicar filtros
      applyFilters()
    })
  })

  // Event listener para filtro de nome do cliente
  const clientSearchInput = document.getElementById('cliente-vendas-search')
  const clearClientSearch = document.getElementById('clear-cliente-search')

  if (clientSearchInput) {
    // Filtro em tempo real com debounce
    let searchTimeout
    clientSearchInput.addEventListener('input', e => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => {
        currentClientFilter = e.target.value.trim()
        console.log('Filtro de cliente aplicado:', currentClientFilter)

        // Mostrar/esconder botão de limpar
        if (currentClientFilter) {
          clearClientSearch.classList.remove('hidden')
        } else {
          clearClientSearch.classList.add('hidden')
        }

        applyFilters()
      }, 300) // Delay de 300ms para evitar muitas chamadas
    })
  }

  // Botão para limpar busca de cliente
  if (clearClientSearch) {
    clearClientSearch.addEventListener('click', () => {
      clientSearchInput.value = ''
      currentClientFilter = ''
      clearClientSearch.classList.add('hidden')
      applyFilters()
    })
  }

  // Inicializar contador na primeira renderização
  setTimeout(() => {
    const counter = document.getElementById('vendas-counter')
    if (counter && !counter.textContent.trim()) {
      const totalSales = db.getAll('vendas').length
      counter.textContent = `${totalSales} vendas`
    }
  }, 100)
}

function showLoginPage() {
  document.getElementById('login-page').classList.remove('hidden')
  document.getElementById('main-app').classList.add('hidden')
}

function showMainApp() {
  document.getElementById('login-page').classList.add('hidden')
  document.getElementById('main-app').classList.remove('hidden')
}

document.getElementById('login-form').addEventListener('submit', e => {
  e.preventDefault()
  const user = document.getElementById('username').value
  const pass = document.getElementById('password').value
  if (login(user, pass)) {
    initApp()
  } else {
    alert('Usuário ou senha inválidos!')
  }
})

document.getElementById('logout-btn').addEventListener('click', () => {
  logout()
  window.location.reload()
})

function setupMobileMenu() {
  const menuToggle = document.getElementById('menu-toggle')
  const sidebar = document.getElementById('sidebar')
  const overlay = document.getElementById('sidebar-overlay')

  menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('show')
    overlay.classList.toggle('show')
  })

  overlay.addEventListener('click', () => {
    sidebar.classList.remove('show')
    overlay.classList.remove('show')
  })
}

function renderEscolasMenu() {
  const escolasSubmenu = document.getElementById('escolas-submenu')
  escolasSubmenu.innerHTML = ''
  db.getAllEscolas().forEach(escola => {
    escolasSubmenu.innerHTML += `<li><a href="#escola-${escola.id}" class="escola-link" data-escola-id="${escola.id}"><i class="fa-solid fa-users w-4"></i> ${escola.nome}</a></li>`
  })
}

function initApp() {
  showMainApp()
  renderEscolasMenu()
  setupClientForm()
  setupSaleForm()
  setupProductForm()
  setupSupplierForm()
  setupMobileMenu()
  setupEventListeners()

  window.addEventListener('hashchange', handleNavigation)
  handleNavigation() // Chamada inicial
}

// Inicialização Geral
function init() {
  db.init()
  if (checkAuth()) {
    initApp()
  } else {
    showLoginPage()
  }
}

init()
