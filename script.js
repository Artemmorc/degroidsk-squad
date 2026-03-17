const supabase = window.supabase.createClient(
    window.SUPABASE_URL, 
    window.SUPABASE_ANON_KEY
);

let isAdmin = false;

window.onload = async function() {
    await loadSections();
    await loadParentSections();
};

function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    event.target.classList.add('active');
    
    if (sectionId === 'constitution') loadSections();
}

function checkAdmin() {
    const password = document.getElementById('adminPassword').value;
    if (password === window.ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('adminControls').style.display = 'block';
        showSection('constitution');
    } else {
        document.getElementById('adminError').textContent = 'Неверный пароль';
    }
}

async function loadSections() {
    const { data } = await supabase
        .from('constitution_sections')
        .select('*')
        .order('sort_order');
    displaySections(data || []);
}

function displaySections(sections) {
    const container = document.getElementById('sectionsList');
    if (!container) return;
    
    if (sections.length === 0) {
        container.innerHTML = '<p>Нет разделов</p>';
        return;
    }
    
    let html = '<div class="sections-tree">';
    sections.filter(s => !s.parent_id).forEach(s => {
        html += renderSection(s, sections, 0);
    });
    html += '</div>';
    container.innerHTML = html;
}

function renderSection(section, allSections, level) {
    const children = allSections.filter(s => s.parent_id === section.id);
    let html = `
        <div class="section-item" style="margin-left: ${level * 20}px">
            <div class="section-title" onclick="showSectionContent(${section.id})">${section.title}</div>
    `;
    
    if (isAdmin) {
        html += `
            <div class="admin-controls">
                <button onclick="editSection(${section.id}, event)">✎</button>
                <button onclick="deleteSection(${section.id}, event)">🗑</button>
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
            <h2>${data.title}</h2>
            <div class="section-content">${data.content || ''}</div>
            <button onclick="loadSections()" class="btn btn-primary">← Назад</button>
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
    if (confirm('Удалить?')) {
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
