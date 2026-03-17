const supabase = window.supabase.createClient(
    window.SUPABASE_URL, 
    window.SUPABASE_ANON_KEY
);

let isEditMode = false;
let currentEditId = null;

window.onload = async function() {
    await loadSections();
    await loadParentSections();
    setupEditor();
};

// Режим редактирования (карандашик)
function toggleEditMode() {
    isEditMode = !isEditMode;
    const editBtn = document.getElementById('editToggle');
    
    if (isEditMode) {
        editBtn.style.background = 'var(--success)';
        editBtn.innerHTML = '<i class="fas fa-check"></i><span class="tooltip">Режим редактирования активен</span>';
        checkAdminAccess();
    } else {
        editBtn.style.background = 'var(--accent)';
        editBtn.innerHTML = '<i class="fas fa-pencil-alt"></i><span class="tooltip">Режим редактирования</span>';
        document.getElementById('adminActions').style.display = 'none';
    }
    
    loadSections(); // Перезагружаем с кнопками или без
}

// Проверка пароля при включении режима
function checkAdminAccess() {
    const password = prompt('Введите пароль администратора:');
    if (password === window.ADMIN_PASSWORD) {
        document.getElementById('adminActions').style.display = 'flex';
        alert('✅ Режим редактирования активирован!');
    } else {
        alert('❌ Неверный пароль');
        toggleEditMode(); // Выключаем режим
    }
}

// Настройка редактора
function setupEditor() {
    const editor = document.getElementById('richEditor');
    if (editor) {
        editor.addEventListener('paste', function(e) {
            e.preventDefault();
            const text = e.clipboardData.getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    }
}

// Форматирование текста
function formatText(command) {
    const editor = document.getElementById('richEditor');
    editor.focus();
    
    switch(command) {
        case 'h1':
            document.execCommand('formatBlock', false, 'h1');
            break;
        case 'h2':
            document.execCommand('formatBlock', false, 'h2');
            break;
        case 'h3':
            document.execCommand('formatBlock', false, 'h3');
            break;
        case 'bold':
            document.execCommand('bold', false, null);
            break;
        case 'italic':
            document.execCommand('italic', false, null);
            break;
        case 'underline':
            document.execCommand('underline', false, null);
            break;
        case 'ul':
            document.execCommand('insertUnorderedList', false, null);
            break;
        case 'ol':
            document.execCommand('insertOrderedList', false, null);
            break;
        case 'quote':
            document.execCommand('formatBlock', false, 'blockquote');
            break;
        case 'code':
            document.execCommand('formatBlock', false, 'pre');
            break;
    }
    syncContent();
}

// Размер текста
function increaseFontSize() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const span = document.createElement('span');
        span.style.fontSize = 'larger';
        span.appendChild(selection.getRangeAt(0).cloneContents());
        selection.getRangeAt(0).deleteContents();
        selection.getRangeAt(0).insertNode(span);
    }
    syncContent();
}

function decreaseFontSize() {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
        const span = document.createElement('span');
        span.style.fontSize = 'smaller';
        span.appendChild(selection.getRangeAt(0).cloneContents());
        selection.getRangeAt(0).deleteContents();
        selection.getRangeAt(0).insertNode(span);
    }
    syncContent();
}

// Вставка изображения
function insertImage() {
    document.getElementById('imageModal').style.display = 'flex';
}

function closeImageModal() {
    document.getElementById('imageModal').style.display = 'none';
    document.getElementById('imageUrl').value = '';
    document.getElementById('imageAlt').value = '';
}

function insertImageUrl() {
    const url = document.getElementById('imageUrl').value;
    const alt = document.getElementById('imageAlt').value || 'image';
    
    if (url) {
        const editor = document.getElementById('richEditor');
        editor.focus();
        document.execCommand('insertHTML', false, `<img src="${url}" alt="${alt}" style="max-width:100%; border-radius:8px; margin:10px 0;">`);
        syncContent();
    }
    closeImageModal();
}

// Вставка ссылки
function insertLink() {
    const url = prompt('Введите URL:');
    if (url) {
        const editor = document.getElementById('richEditor');
        editor.focus();
        document.execCommand('createLink', false, url);
        syncContent();
    }
}

// Синхронизация с текстовым полем
function syncContent() {
    const editor = document.getElementById('richEditor');
    const hiddenContent = document.getElementById('sectionContent');
    hiddenContent.value = editor.innerHTML;
}

// Загрузка разделов
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
        container.innerHTML = '<div class="empty-state"><i class="fas fa-scroll"></i><p>Разделы отсутствуют</p></div>';
        return;
    }
    
    let html = '';
    sections.filter(s => !s.parent_id).forEach(s => {
        html += renderSection(s, sections, 0);
    });
    container.innerHTML = html;
}

function renderSection(section, allSections, level) {
    const children = allSections.filter(s => s.parent_id === section.id);
    let html = `
        <div class="section-item" style="margin-left: ${level * 30}px">
            <div class="section-title" onclick="showSectionContent(${section.id})">
                <i class="fas fa-file-alt" style="margin-right:10px; color:var(--accent);"></i>
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
            <div class="section-content-card">
                <button onclick="loadSections()" class="btn btn-outline" style="margin-bottom:20px;">
                    <i class="fas fa-arrow-left"></i> Назад к разделам
                </button>
                <h2>${data.title}</h2>
                <div class="section-content">${data.content || ''}</div>
            </div>
        `;
    }
}

// Остальные функции (loadParentSections, showAddForm, hideForm, saveSection и т.д.)
// ... (они такие же как в прошлом коде, но с синхронизацией editor)
