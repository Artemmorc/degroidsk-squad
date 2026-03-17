// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let isEditMode = false;
let currentEditId = null;

// Проверяем, не создан ли уже supabase
if (typeof window.supabaseClient === 'undefined') {
    window.supabaseClient = window.supabase.createClient(
        window.SUPABASE_URL, 
        window.SUPABASE_ANON_KEY
    );
}
const supabase = window.supabaseClient;

// ========== ЗАГРУЗКА ПРИ СТАРТЕ ==========
window.onload = async function() {
    console.log('Сайт загружен');
    await loadSections();
    await loadParentSections();
};

// ========== РЕЖИМ РЕДАКТИРОВАНИЯ ==========
window.toggleEditMode = function() {
    console.log('Клик по карандашу');
    const password = prompt('Введите пароль администратора:');
    
    if (password === window.ADMIN_PASSWORD) {
        isEditMode = !isEditMode;
        document.getElementById('adminActions').style.display = isEditMode ? 'flex' : 'none';
        alert(isEditMode ? '✅ Режим редактирования включен' : 'Режим редактирования выключен');
        loadSections(); // Перезагружаем с кнопками или без
    } else if (password !== null) {
        alert('❌ Неверный пароль');
    }
};

// ========== НАВИГАЦИЯ ==========
window.showSection = function(sectionId) {
    document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
    document.getElementById(sectionId).classList.add('active');
    
    document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
};

// ========== ЗАГРУЗКА РАЗДЕЛОВ ==========
async function loadSections() {
    try {
        const { data, error } = await supabase
            .from('constitution_sections')
            .select('*')
            .order('sort_order');
        
        if (error) throw error;
        displaySections(data || []);
    } catch (err) {
        console.error('Ошибка загрузки:', err);
        document.getElementById('sectionsList').innerHTML = '<p style="color:red">Ошибка загрузки разделов</p>';
    }
}

function displaySections(sections) {
    const container = document.getElementById('sectionsList');
    if (!container) return;
    
    if (!sections || sections.length === 0) {
        container.innerHTML = '<p>Нет разделов</p>';
        return;
    }
    
    // Корневые разделы (без parent_id)
    const rootSections = sections.filter(s => !s.parent_id);
    
    let html = '<div class="sections-tree">';
    rootSections.forEach(section => {
        html += renderSection(section, sections, 0);
    });
    html += '</div>';
    
    container.innerHTML = html;
}

function renderSection(section, allSections, level) {
    const children = allSections.filter(s => s.parent_id === section.id);
    
    let html = `
        <div class="section-item" style="margin-left: ${level * 30}px">
            <div class="section-title" onclick="showSectionContent(${section.id})">
                <i class="fas fa-file-alt" style="margin-right:10px; color:#6a5acd;"></i>
                ${section.title}
            </div>
    `;
    
    if (isEditMode) {
        html += `
            <div class="admin-controls">
                <button onclick="editSection(${section.id}, event)" title="Редактировать">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="deleteSection(${section.id}, event)" title="Удалить">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }
    
    html += '</div>';
    
    // Добавляем дочерние разделы
    children.forEach(child => {
        html += renderSection(child, allSections, level + 1);
    });
    
    return html;
}

// ========== ПРОСМОТР РАЗДЕЛА ==========
window.showSectionContent = async function(id) {
    try {
        const { data, error } = await supabase
            .from('constitution_sections')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (data) {
            document.getElementById('sectionsList').innerHTML = `
                <div class="section-content-view">
                    <button onclick="loadSections()" class="btn btn-outline" style="margin-bottom:20px;">
                        <i class="fas fa-arrow-left"></i> Назад к разделам
                    </button>
                    <h2>${data.title}</h2>
                    <div class="section-content">${data.content || 'Нет содержимого'}</div>
                </div>
            `;
        }
    } catch (err) {
        console.error('Ошибка:', err);
        alert('Не удалось загрузить раздел');
    }
};

// ========== ЗАГРУЗКА РОДИТЕЛЬСКИХ РАЗДЕЛОВ ==========
async function loadParentSections() {
    try {
        const { data, error } = await supabase
            .from('constitution_sections')
            .select('id, title');
        
        if (error) throw error;
        
        const select = document.getElementById('parentSection');
        if (select && data) {
            select.innerHTML = '<option value="">Корневой раздел</option>';
            data.forEach(s => {
                select.innerHTML += `<option value="${s.id}">${s.title}</option>`;
            });
        }
    } catch (err) {
        console.error('Ошибка загрузки родительских разделов:', err);
    }
}

// ========== ФОРМА ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ ==========
window.showAddForm = function() {
    document.getElementById('formTitle').textContent = 'Добавить раздел';
    document.getElementById('sectionTitle').value = '';
    document.getElementById('sectionContent').value = '';
    document.getElementById('parentSection').value = '';
    document.getElementById('sectionForm').style.display = 'block';
    currentEditId = null;
};

window.hideForm = function() {
    document.getElementById('sectionForm').style.display = 'none';
    currentEditId = null;
};

window.saveSection = async function() {
    const title = document.getElementById('sectionTitle').value;
    const content = document.getElementById('sectionContent').value;
    const parentId = document.getElementById('parentSection').value || null;
    
    if (!title) {
        alert('Введите название раздела');
        return;
    }
    
    try {
        if (currentEditId) {
            // Обновляем существующий раздел
            await supabase
                .from('constitution_sections')
                .update({ title, content, parent_id: parentId })
                .eq('id', currentEditId);
        } else {
            // Создаём новый
            await supabase
                .from('constitution_sections')
                .insert([{ title, content, parent_id: parentId, sort_order: 0 }]);
        }
        
        hideForm();
        await loadSections();
        await loadParentSections();
    } catch (err) {
        console.error('Ошибка сохранения:', err);
        alert('Ошибка при сохранении');
    }
};

window.editSection = async function(id, event) {
    event.stopPropagation();
    
    try {
        const { data, error } = await supabase
            .from('constitution_sections')
            .select('*')
            .eq('id', id)
            .single();
        
        if (error) throw error;
        
        if (data) {
            document.getElementById('formTitle').textContent = 'Редактировать раздел';
            document.getElementById('sectionTitle').value = data.title;
            document.getElementById('sectionContent').value = data.content || '';
            document.getElementById('parentSection').value = data.parent_id || '';
            document.getElementById('sectionForm').style.display = 'block';
            currentEditId = id;
        }
    } catch (err) {
        console.error('Ошибка загрузки раздела:', err);
        alert('Не удалось загрузить данные раздела');
    }
};

window.deleteSection = async function(id, event) {
    event.stopPropagation();
    
    if (!confirm('Удалить раздел? Все дочерние разделы тоже удалятся!')) return;
    
    try {
        await supabase
            .from('constitution_sections')
            .delete()
            .eq('id', id);
        
        await loadSections();
        await loadParentSections();
    } catch (err) {
        console.error('Ошибка удаления:', err);
        alert('Ошибка при удалении');
    }
};
