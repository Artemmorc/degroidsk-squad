// Используем ключи из config.js (который создаст GitHub Actions)
const supabase = window.supabase.createClient(
    window.SUPABASE_URL, 
    window.SUPABASE_ANON_KEY
);

let isEditMode = false;

window.onload = async function() {
    await loadSections();
    await loadParentSections();
};

function toggleEditMode() {
    isEditMode = !isEditMode;
    const password = prompt('Введите пароль администратора:');
    if (password === window.ADMIN_PASSWORD) {
        document.getElementById('adminActions').style.display = 'flex';
        alert('Режим редактирования активирован');
    } else {
        isEditMode = false;
        alert('Неверный пароль');
    }
    loadSections();
}

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
}

async function loadSections() {
    const { data } = await supabase
        .from('constitution_sections')
        .select('*')
        .order('sort_order');
    
    const container = document.getElementById('sectionsList');
    if (!container) return;
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p>Нет разделов</p>';
        return;
    }
    
    let html = '';
    data.filter(s => !s.parent_id).forEach(s => {
        html += renderSection(s, data, 0);
    });
    container.innerHTML = html;
}

function renderSection(section, allSections, level) {
    const children = allSections.filter(s => s.parent_id === section.id);
    let html = `
        <div class="section-item" style="margin-left: ${level * 30}px">
            <div class="section-title" onclick="showSectionContent(${section.id})">
                <i class="fas fa-file-alt"></i> ${section.title}
            </div>
    `;
    
    if (isEditMode) {
        html += `
            <div class="admin-controls">
                <button onclick="editSection(${section.id}, event)"><i class="fas fa-edit"></i></button>
                <button onclick="deleteSection(${section.id}, event)"><i class="fas fa-trash"></i></button>
            </div>
        `;
    }
    html += '</div>';
    
    children.forEach(child => {
        html += renderSection(child, allSections, level + 1);
    });
    return html;
}

async function showSectionContent(id) {
    const { data } = await supabase
        .from('constitution_sections')
        .select('*')
        .eq('id', id)
        .single();
    
    if (data) {
        document.getElementById('sectionsList').innerHTML = `
            <button onclick="loadSections()" class="btn btn-outline">← Назад</button>
            <h2>${data.title}</h2>
            <div class="section-content">${data.content || ''}</div>
        `;
    }
}

async function loadParentSections() {
    const { data } = await supabase
        .from('constitution_sections')
        .select('id, title');
    
    const select = document.getElementById('parentSection');
    if (select && data) {
        select.innerHTML = '<option value="">Корневой раздел</option>';
        data.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.title}</option>`;
        });
    }
}

function showAddForm() {
    document.getElementById('formTitle').textContent = 'Добавить раздел';
    document.getElementById('sectionTitle').value = '';
    document.getElementById('sectionContent').value = '';
    document.getElementById('sectionForm').style.display = 'block';
}

function hideForm() {
    document.getElementById('sectionForm').style.display = 'none';
}

async function saveSection() {
    const title = document.getElementById('sectionTitle').value;
    const content = document.getElementById('sectionContent').value;
    const parentId = document.getElementById('parentSection').value || null;
    
    if (!title) return alert('Введите название');
    
    await supabase
        .from('constitution_sections')
        .insert([{ title, content, parent_id: parentId, sort_order: 0 }]);
    
    hideForm();
    loadSections();
    loadParentSections();
}

async function deleteSection(id, event) {
    event.stopPropagation();
    if (confirm('Удалить раздел?')) {
        await supabase.from('constitution_sections').delete().eq('id', id);
        loadSections();
        loadParentSections();
    }
}

async function editSection(id, event) {
    event.stopPropagation();
    const { data } = await supabase
        .from('constitution_sections')
        .select('*')
        .eq('id', id)
        .single();
    
    if (data) {
        document.getElementById('formTitle').textContent = 'Редактировать';
        document.getElementById('sectionTitle').value = data.title;
        document.getElementById('sectionContent').value = data.content || '';
        document.getElementById('parentSection').value = data.parent_id || '';
        document.getElementById('sectionForm').style.display = 'block';
    }
}
