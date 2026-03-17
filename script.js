// ==================== Supabase инициализация ====================
const SUPABASE_URL = 'https://твой-проект.supabase.co'
const SUPABASE_ANON_KEY = 'твой-anon-ключ'

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// ==================== Глобальные переменные ====================
let currentUser = null
let currentUserRole = null

// ==================== Инициализация ====================
window.onload = async function() {
    await checkUser()
    await loadSections()
    setupNavigation()
    
    // Загружаем разделы для выпадающего списка
    if (document.getElementById('parentSection')) {
        loadParentSections()
    }
    
    // Если мы на admin.html, загружаем админ-данные
    if (window.location.pathname.includes('admin.html')) {
        loadUsers()
        loadVerifications()
    }
}

// ==================== Навигация ====================
function setupNavigation() {
    // Подсветка активной ссылки
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
}

// ==================== Авторизация ====================
async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser()
    currentUser = user
    
    if (user) {
        // Получаем роль пользователя
        const { data: profile } = await supabase
            .from('profiles')
            .select('role, verified')
            .eq('id', user.id)
            .single()
        
        currentUserRole = profile?.role
        
        // Обновляем интерфейс
        document.getElementById('userInfo').innerHTML = `
            ${profile?.username} ${profile?.verified ? '✅' : '⏳'}
        `
        document.getElementById('loginLink').style.display = 'none'
        document.getElementById('registerLink').style.display = 'none'
        document.getElementById('logoutLink').style.display = 'block'
        
        // Показываем админ-контролы если нужно
        if (profile?.role === 'admin') {
            document.getElementById('adminControls').style.display = 'block'
        }
    } else {
        document.getElementById('userInfo').innerHTML = 'Не авторизован'
        document.getElementById('loginLink').style.display = 'block'
        document.getElementById('registerLink').style.display = 'block'
        document.getElementById('logoutLink').style.display = 'none'
    }
}

async function handleLogin(e) {
    e.preventDefault()
    const email = document.getElementById('loginEmail').value
    const password = document.getElementById('loginPassword').value
    
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
        document.getElementById('loginError').textContent = error.message
    } else {
        window.location.href = '/'
    }
}

async function handleRegister(e) {
    e.preventDefault()
    const email = document.getElementById('regEmail').value
    const password = document.getElementById('regPassword').value
    const username = document.getElementById('regUsername').value
    const minecraft = document.getElementById('regMinecraft').value
    
    const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { username, minecraft_nick: minecraft }
        }
    })
    
    if (error) {
        document.getElementById('regError').textContent = error.message
    } else {
        alert('Регистрация успешна! Ожидайте верификации.')
        showSection('login')
    }
}

async function logout() {
    await supabase.auth.signOut()
    window.location.href = '/'
}

// ==================== Конституция ====================
async function loadSections() {
    const { data: sections } = await supabase
        .from('constitution_sections')
        .select('*')
        .order('sort_order')
    
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
        <div class="section-item" style="margin-left: ${margin}px" onclick="showSectionContent(${section.id})">
            <div class="section-title">${section.title}</div>
    `
    
    if (currentUserRole === 'admin') {
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
    const { data: section } = await supabase
        .from('constitution_sections')
        .select('*')
        .eq('id', sectionId)
        .single()
    
    if (section) {
        const content = `
            <h2>${section.title}</h2>
            <div class="section-content">${section.content || 'Нет содержимого'}</div>
        `
        document.getElementById('sectionsList').innerHTML = content + '<button onclick="loadSections()" class="btn btn-primary">← Назад</button>'
    }
}

// ==================== Админ-функции ====================
async function loadParentSections() {
    const { data: sections } = await supabase
        .from('constitution_sections')
        .select('id, title')
    
    const select = document.getElementById('parentSection')
    if (select && sections) {
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
    
    const { error } = await supabase
        .from('constitution_sections')
        .insert([{ title, content, parent_id: parentId, sort_order: 0 }])
    
    if (error) {
        alert('Ошибка: ' + error.message)
    } else {
        hideForm()
        loadSections()
        loadParentSections()
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
        
        // Удаляем старый и создаём новый при сохранении
        window.currentEditId = id
    }
}

async function deleteSection(id, event) {
    event.stopPropagation()
    
    if (confirm('Удалить раздел?')) {
        const { error } = await supabase
            .from('constitution_sections')
            .delete()
            .eq('id', id)
        
        if (!error) {
            loadSections()
            loadParentSections()
        }
    }
}

// ==================== Админ-панель ====================
function showAdminTab(tabId) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'))
    document.querySelectorAll('.admin-tab').forEach(tab => tab.classList.remove('active'))
    
    document.querySelector(`[onclick="showAdminTab('${tabId}')"]`).classList.add('active')
    document.getElementById(`${tabId}Tab`).classList.add('active')
}

async function loadUsers() {
    const { data: users } = await supabase
        .from('profiles')
        .select('*')
    
    const container = document.getElementById('usersList')
    if (!container) return
    
    let html = ''
    users?.forEach(user => {
        html += `
            <div class="user-card">
                <div><strong>${user.username}</strong> (MC: ${user.minecraft_nick})</div>
                <div>Email: ${user.id}</div>
                <div>Роль: ${user.role} | Верифицирован: ${user.verified ? '✅' : '❌'}</div>
                <div>
                    <button onclick="setUserRole('${user.id}', 'admin')" class="btn btn-primary">Сделать админом</button>
                    <button onclick="setUserRole('${user.id}', 'user')" class="btn btn-success">Сделать юзером</button>
                </div>
            </div>
        `
    })
    
    container.innerHTML = html || '<p>Нет пользователей</p>'
}

async function loadVerifications() {
    const { data: requests } = await supabase
        .from('verification_requests')
        .select('*, profiles(username, minecraft_nick)')
        .eq('status', 'pending')
    
    const container = document.getElementById('verificationsList')
    if (!container) return
    
    let html = ''
    requests?.forEach(req => {
        html += `
            <div class="verification-card">
                <div><strong>${req.profiles?.username}</strong> (MC: ${req.profiles?.minecraft_nick})</div>
                <div style="margin:10px 0; padding:10px; background:#404249">${req.message}</div>
                <div>
                    <button onclick="handleVerification(${req.id}, '${req.user_id}', 'approved')" class="btn btn-success">Одобрить</button>
                    <button onclick="handleVerification(${req.id}, '${req.user_id}', 'rejected')" class="btn btn-danger">Отклонить</button>
                </div>
            </div>
        `
    })
    
    container.innerHTML = html || '<p>Нет заявок</p>'
}

async function setUserRole(userId, role) {
    const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', userId)
    
    if (!error) loadUsers()
}

async function handleVerification(requestId, userId, status) {
    await supabase
        .from('verification_requests')
        .update({ status, reviewed_at: new Date() })
        .eq('id', requestId)
    
    if (status === 'approved') {
        await supabase
            .from('profiles')
            .update({ verified: true })
            .eq('id', userId)
    }
    
    loadVerifications()
}
