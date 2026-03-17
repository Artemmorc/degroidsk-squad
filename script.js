// ==================== Supabase инициализация ====================
const SUPABASE_URL = 'https://твой-проект.supabase.co'
const SUPABASE_ANON_KEY = 'твой-anon-ключ'

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ==================== Глобальные переменные ====================
let isAdmin = false
const ADMIN_PASSWORD = 'admin123' // Простой пароль, можешь изменить

// ==================== Инициализация ====================
window.onload = async function() {
    await loadSections()
    setupNavigation()
    
    // Загружаем родительские разделы для формы
    if (document.getElementById('parentSection')) {
        loadParentSections()
    }
}

// ==================== Навигация ====================
function setupNavigation() {
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'))
            this.classList.add('active')
        })
    })
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'))
    document.getElementById(sectionId).classList.add('active')
    
    // Если открыли конституцию, перезагружаем разделы
    if (sectionId === 'constitution') {
        loadSections()
    }
}

// ==================== Админка ====================
function checkAdmin() {
    const password = document.getElementById('adminPassword').value
    if (password === ADMIN_PASSWORD) {
        isAdmin = true
        document.getElementById('adminControls').style.display = 'block'
        document.getElementById('adminError').textContent = ''
        showSection('constitution')
        alert('Вы вошли как администратор!')
    } else {
        document.getElementById('adminError').textContent = 'Неверный пароль'
    }
}

// ==================== Конституция ====================
async function loadSections() {
    const { data: sections, error } = await supabase
        .from('constitution_sections')
        .select('*')
        .order('sort_order')
    
    if (error) {
        console.error('Ошибка загрузки:', error)
        return
    }
    
    displaySections(sections || [])
}

function displaySections(sections) {
    const container = document.getElementById('sectionsList')
    if (!container) return
    
    if (sections.length === 0) {
        container.innerHTML = '<p>Разделы отсутствуют</p>'
        return
    }
    
    // Строим дерево
    const rootSections = sections.filter(s => !s.parent_id)
    let html = '<div class="sections-tree">'
    
    rootSections.forEach(section => {
        html += renderSection(section, sections, 0)
    })
    
    html += '</div>'
    container.innerHTML = html
}

function renderSection(section, allSections, level) {
    const children = allSections.filter(s => s.parent_id === section.id)
    const margin = level * 20
    
    let html = `
        <div class="section-item" style="margin-left: ${margin}px">
            <div class="section-title" onclick="showSectionContent(${section.id})">${section.title}</div>
    `
    
    if (isAdmin) {
        html += `
            <div class="admin-controls">
                <button onclick="editSection(${section.id}, event)" class="btn btn-primary">✎</button>
                <button onclick="deleteSection(${section.id}, event)" class="btn btn-danger">🗑</button>
            </div>
        `
    }
    
    html += '</div>'
    
    children.forEach(child => {
        html += renderSection(child, allSections, level + 1)
    })
    
    return html
}

async function showSectionContent(sectionId) {
    const { data: section, error } = await supabase
        .from('constitution_sections')
        .select('*')
        .eq('id', sectionId)
        .single()
    
    if (section) {
        const content = `
            <h2>${section.title}</h2>
            <div class="section-content">${section.content || 'Нет содержимого'}</div>
            <button onclick="loadSections()" class="btn btn-primary" style="margin-top:20px;">← Назад к разделам</button>
        `
        document.getElementById('sectionsList').innerHTML = content
    }
}

async function loadParentSections() {
    const { data: sections } = await supabase
        .from('constitution_sections')
        .select('id, title')
    
    const select = document.getElementById('parentSection')
    if (select && sections) {
        select.innerHTML = '<option value="">Корневой раздел</option>'
        sections.forEach(s => {
            const option = document.createElement('option')
            option.value = s.id
            option.textContent = s.title
            select.appendChild(option)
        })
    }
}

function showAddForm() {
    document.getElementById('formTitle').textContent = 'Добавить раздел'
    document.getElementById('sectionTitle').value = ''
    document.getElementById('sectionContent').value = ''
    document.getElementById('sectionForm').style.display = 'block'
}

function hideForm() {
    document.getElementById('sectionForm').style.display = 'none'
}

async function saveSection() {
    const title = document.getElementById('sectionTitle').value
    const content = document.getElementById('sectionContent').value
    const parentId = document.getElementById('parentSection').value || null
    
    if (!title) {
        alert('Введите название раздела')
        return
    }
    
    const { error } = await supabase
        .from('constitution_sections')
        .insert([{ 
            title, 
            content, 
            parent_id: parentId, 
            sort_order: 0 
        }])
    
    if (error) {
        alert('Ошибка: ' + error.message)
    } else {
        hideForm()
        await loadSections()
        await loadParentSections()
    }
}

async function editSection(id, event) {
    event.stopPropagation()
    
    const { data: section } = await supabase
        .from('constitution_sections')
        .select('*')
        .eq('id', id)
        .single()
    
    if (section) {
        document.getElementById('formTitle').textContent = 'Редактировать раздел'
        document.getElementById('sectionTitle').value = section.title
        document.getElementById('sectionContent').value = section.content || ''
        document.getElementById('parentSection').value = section.parent_id || ''
        document.getElementById('sectionForm').style.display = 'block'
        
        // Сохраняем ID для редактирования
        window.currentEditId = id
    }
}

async function deleteSection(id, event) {
    event.stopPropagation()
    
    if (confirm('Удалить раздел? Все дочерние разделы тоже удалятся!')) {
        const { error } = await supabase
            .from('constitution_sections')
            .delete()
            .eq('id', id)
        
        if (error) {
            alert('Ошибка: ' + error.message)
        } else {
            await loadSections()
            await loadParentSections()
        }
    }
}
