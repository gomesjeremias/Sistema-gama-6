// ui-enhancements.js - Melhorias visuais e de interação

// Aguarda o DOM estar carregado
document.addEventListener('DOMContentLoaded', function () {
  // Adiciona efeito de ripple aos botões
  function addRippleEffect() {
    const buttons = document.querySelectorAll('.btn')
    buttons.forEach(button => {
      button.classList.add('ripple')
    })
  }

  // Adiciona animação de contagem nos números do dashboard
  function animateCounters() {
    const counters = document.querySelectorAll(
      '#total-recebido, #total-a-receber, #n-vendas'
    )

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('counter-animation')
        }
      })
    })

    counters.forEach(counter => {
      observer.observe(counter)
    })
  }

  // Adiciona efeito de loading nos botões ao clicar
  function addLoadingEffect() {
    document.addEventListener('click', function (e) {
      const button = e.target.closest('.btn')
      if (button && (button.type === 'submit' || button.onclick)) {
        button.classList.add('loading')

        // Remove o loading após 2 segundos (pode ser ajustado conforme necessário)
        setTimeout(() => {
          button.classList.remove('loading')
        }, 2000)
      }
    })
  }

  // Melhora o feedback visual dos inputs
  function enhanceInputs() {
    const inputs = document.querySelectorAll('.input, .textarea, .select')

    inputs.forEach(input => {
      input.addEventListener('focus', function () {
        this.parentElement.classList.add('input-focused')
      })

      input.addEventListener('blur', function () {
        this.parentElement.classList.remove('input-focused')
      })
    })
  }

  // Adiciona indicadores de progresso aos cards do dashboard
  function addProgressIndicators() {
    const dashboardCards = document.querySelectorAll('#dashboard .card')

    dashboardCards.forEach((card, index) => {
      card.classList.add('dashboard-card')

      // Adiciona um pequeno atraso para cada card
      setTimeout(() => {
        card.style.animation = `fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1) ${
          index * 0.1
        }s both`
      }, 100)
    })
  }

  // Adiciona efeito de hover suave nas linhas da tabela
  function enhanceTableRows() {
    const tables = document.querySelectorAll('.table tbody tr')

    tables.forEach(row => {
      row.addEventListener('mouseenter', function () {
        this.style.transform = 'translateX(4px)'
      })

      row.addEventListener('mouseleave', function () {
        this.style.transform = 'translateX(0)'
      })
    })
  }

  // Adiciona animação suave ao mostrar/esconder seções
  function enhancePageTransitions() {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1'
            entry.target.style.transform = 'translateY(0)'
          }
        })
      },
      {
        threshold: 0.1
      }
    )

    const sections = document.querySelectorAll('.page-section')
    sections.forEach(section => {
      section.style.opacity = '0'
      section.style.transform = 'translateY(30px)'
      section.style.transition = 'opacity 0.6s ease, transform 0.6s ease'
      observer.observe(section)
    })
  }

  // Sistema de notificações toast (para uso futuro)
  function createToastSystem() {
    window.showToast = function (message, type = 'info', duration = 5000) {
      const toast = document.createElement('div')
      toast.className = `toast ${type}`

      const icon = getToastIcon(type)
      toast.innerHTML = `
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <i class="${icon}"></i>
                    <span>${message}</span>
                </div>
            `

      document.body.appendChild(toast)

      // Remove automaticamente após o tempo especificado
      setTimeout(() => {
        toast.style.animation = 'slideOutRight 0.3s ease-out'
        setTimeout(() => {
          document.body.removeChild(toast)
        }, 300)
      }, duration)
    }

    function getToastIcon(type) {
      const icons = {
        success: 'fa-solid fa-check-circle',
        error: 'fa-solid fa-exclamation-circle',
        warning: 'fa-solid fa-exclamation-triangle',
        info: 'fa-solid fa-info-circle'
      }
      return icons[type] || icons.info
    }
  }

  // Melhora a responsividade do menu mobile
  function enhanceMobileMenu() {
    const menuToggle = document.getElementById('menu-toggle')
    const sidebar = document.getElementById('sidebar')

    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', function () {
        this.classList.add('loading')
        setTimeout(() => {
          this.classList.remove('loading')
        }, 300)
      })
    }
  }

  // Adiciona efeitos visuais aos badges de status
  function enhanceBadges() {
    const badges = document.querySelectorAll('.badge')
    badges.forEach(badge => {
      badge.addEventListener('mouseenter', function () {
        this.style.transform = 'scale(1.05)'
      })

      badge.addEventListener('mouseleave', function () {
        this.style.transform = 'scale(1)'
      })
    })
  }

  // Inicialização de todos os enhancements
  function initializeEnhancements() {
    addRippleEffect()
    animateCounters()
    addLoadingEffect()
    enhanceInputs()
    addProgressIndicators()
    enhanceTableRows()
    enhancePageTransitions()
    createToastSystem()
    enhanceMobileMenu()
    enhanceBadges()

    console.log('🎨 UI Enhancements carregados com sucesso!')
  }

  // Executa as melhorias
  initializeEnhancements()

  // Re-inicializa algumas funcionalidades quando o conteúdo muda
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        // Re-aplica efeitos em novos elementos
        setTimeout(() => {
          enhanceTableRows()
          enhanceBadges()
          addRippleEffect()
        }, 100)
      }
    })
  })

  // Observa mudanças no DOM
  observer.observe(document.body, {
    childList: true,
    subtree: true
  })
})

// Animações CSS adicionais via JavaScript
const additionalStyles = `
@keyframes slideOutRight {
    to {
        transform: translateX(100%);
        opacity: 0;
    }
}

.input-focused .label-text {
    color: var(--primary-color);
    transform: scale(0.9) translateY(-2px);
}

.loading-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(255, 255, 255, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    backdrop-filter: blur(4px);
}

.spinner {
    width: 40px;
    height: 40px;
    border: 4px solid var(--gray-200);
    border-top: 4px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}
`

// Adiciona os estilos adicionais ao documento
const styleSheet = document.createElement('style')
styleSheet.textContent = additionalStyles
document.head.appendChild(styleSheet)
