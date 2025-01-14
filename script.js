/**
 * 存储资源数据
 */
const resources = {
    icons: [],
    backgrounds: [],
    characters: []
};

/**
 * 全局变量存储拖拽状态
 */
let selectedElement = null;
let initialX = 0;
let initialY = 0;
let currentX = 0;
let currentY = 0;

/**
 * 存储元素位置信息
 */
const elementPositions = {
    icons: [],
    texts: {}
};

/**
 * 存储模板数据
 */
const templates = {
    items: []
};

/**
 * 初始化应用
 */
document.addEventListener('DOMContentLoaded', () => {
    try {
        initializeIconSelectors();
        setupEventListeners();
        loadStoredResources();
        loadStoredTemplates();
        initializeTextControls();
        initializePreview();
    } catch (error) {
        console.error('初始化失败:', error);
    }
});

/**
 * 加载存储的资源
 */
function loadStoredResources() {
    try {
        const stored = localStorage.getItem('coverResources');
        if (stored) {
            Object.assign(resources, JSON.parse(stored));
            updateAllPreviews();
        }
    } catch (error) {
        console.error('加载存储资源失败:', error);
    }
}

/**
 * 保存资源到本地存储
 */
function saveResources() {
    localStorage.setItem('coverResources', JSON.stringify(resources));
}

/**
 * 初始化图标选择器
 */
function initializeIconSelectors() {
    const iconCount = document.getElementById('iconCountSelect');
    iconCount.addEventListener('change', updateIconSelectors);
    updateIconSelectors();
}

/**
 * 更新图标选择器数量
 */
function updateIconSelectors() {
    const count = parseInt(document.getElementById('iconCountSelect').value);
    const container = document.getElementById('iconSelectorsContainer');
    container.innerHTML = '';

    for (let i = 0; i < count; i++) {
        const select = document.createElement('select');
        select.id = `icon-${i + 1}`;
        select.innerHTML = `
            <option value="">选择图标 ${i + 1}</option>
            ${resources.icons.map(item => `
                <option value="${item.id}">${item.name}</option>
            `).join('')}
        `;
        select.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            if (selectedId) {
                const selectedIcon = resources.icons.find(item => item.id.toString() === selectedId);
                if (selectedIcon) {
                    addIconToPreview(selectedIcon, i);
                }
            }
        });
        container.appendChild(select);
    }
}

/**
 * 添加图标到预览区域
 * @param {Object} icon - 图标对象
 * @param {number} index - 图标索引
 */
function addIconToPreview(icon, index) {
    const iconLayer = document.getElementById('iconLayer');
    // 检查是否已存在该位置的图标
    const existingIcon = document.querySelector(`#icon-preview-${index}`);
    if (existingIcon) {
        existingIcon.remove();
    }

    const element = document.createElement('div');
    element.id = `icon-preview-${index}`;
    element.className = 'preview-element';
    element.setAttribute('data-type', 'icons');
    element.style.position = 'absolute';
    element.style.zIndex = '3';  // 确保图标始终在正确的层级
    
    // 使用保存的位置或默认位置
    const savedPosition = elementPositions.icons[index];
    if (savedPosition) {
        element.style.left = savedPosition.left;
        element.style.top = savedPosition.top;
        element.style.width = savedPosition.width;
        element.style.height = savedPosition.height;
    } else {
        element.style.left = `${20 + (index * 120)}px`;
        element.style.top = '20px';
        element.style.width = '100px';
        element.style.height = '100px';
    }

    const img = document.createElement('img');
    img.src = icon.image;
    img.alt = icon.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = 'contain';
    img.style.pointerEvents = 'none';  // 防止图片干扰拖拽
    element.appendChild(img);

    // 添加缩放手柄
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        element.appendChild(handle);
    });

    iconLayer.appendChild(element);
    makeElementDraggable(element);
    makeElementResizable(element);

    // 监听位置变化
    const observer = new MutationObserver(() => {
        elementPositions.icons[index] = {
            left: element.style.left,
            top: element.style.top,
            width: element.style.width,
            height: element.style.height
        };
    });
    observer.observe(element, { attributes: true, attributeFilter: ['style'] });

    return element;  // 返回创建的元素
}

/**
 * 设置事件监听器
 */
function setupEventListeners() {
    const elements = {
        generateBtn: document.getElementById('generateBtn'),
        downloadBtn: document.getElementById('downloadBtn'),
        addIcon: document.getElementById('addIcon'),
        addBackground: document.getElementById('addBackground'),
        addCharacter: document.getElementById('addCharacter'),
        saveTemplate: document.getElementById('saveTemplate')
    };

    // 检查所有必需的元素是否存在
    for (const [key, element] of Object.entries(elements)) {
        if (!element) {
            console.error(`找不到元素: ${key}`);
            return;
        }
    }

    elements.generateBtn.addEventListener('click', generateCover);
    elements.downloadBtn.addEventListener('click', downloadCover);
    elements.addIcon.addEventListener('click', () => addResource('icons'));
    elements.addBackground.addEventListener('click', () => addResource('backgrounds'));
    elements.addCharacter.addEventListener('click', () => addResource('characters'));
    elements.saveTemplate.addEventListener('click', saveAsTemplate);
}

/**
 * 生成封面
 */
function generateCover() {
    const previewCanvas = document.getElementById('previewCanvas');
    if (!previewCanvas) return;

    // 创建一个新的canvas元素
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // 设置canvas尺寸
    const ratio = document.getElementById('coverRatio').value;
    const [width, height] = ratio.split(':').map(Number);
    canvas.width = 1920;  // 基准宽度
    canvas.height = (height / width) * canvas.width;

    // 获取预览区域的实际尺寸和比例
    const previewRect = previewCanvas.getBoundingClientRect();
    const scaleX = canvas.width / previewRect.width;
    const scaleY = canvas.height / previewRect.height;

    // 绘制背景
    const backgroundLayer = document.getElementById('backgroundLayer');
    if (backgroundLayer.firstChild) {
        const bgImg = backgroundLayer.querySelector('img');
        if (bgImg) {
            // 保持背景图片的原始比例
            const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let drawX = 0;
            let drawY = 0;
            
            if (canvas.width / canvas.height > imgRatio) {
                drawHeight = canvas.width / imgRatio;
                drawY = (canvas.height - drawHeight) / 2;
            } else {
                drawWidth = canvas.height * imgRatio;
                drawX = (canvas.width - drawWidth) / 2;
            }
            ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
        }
    }

    // 绘制其他元素
    const layers = ['iconLayer', 'characterLayer', 'textLayer'];
    layers.forEach(layerId => {
        const layer = document.getElementById(layerId);
        if (layer) {
            layer.querySelectorAll('.preview-element, .text-element').forEach(element => {
                // 获取元素相对于预览区域的实际位置
                const rect = element.getBoundingClientRect();
                const layerRect = previewCanvas.getBoundingClientRect();
                const left = rect.left - layerRect.left;
                const top = rect.top - layerRect.top;
                const width = parseFloat(element.style.width);
                const height = parseFloat(element.style.height);

                // 计算实际绘制位置和尺寸
                const x = left * scaleX;
                const y = top * scaleY;
                const w = width * scaleX;
                const h = height * scaleX;  // 使用 scaleX 保持比例

                if (element.querySelector('img')) {
                    // 绘制图片元素
                    const img = element.querySelector('img');
                    // 保持图片原始比例
                    const imgRatio = img.naturalWidth / img.naturalHeight;
                    let drawWidth = w;
                    let drawHeight = h;
                    let drawX = x;
                    let drawY = y;
                    
                    if (w / h > imgRatio) {
                        drawWidth = h * imgRatio;
                        drawX = x + (w - drawWidth) / 2;
                    } else {
                        drawHeight = w / imgRatio;
                        drawY = y + (h - drawHeight) / 2;
                    }
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                } else {
                    // 绘制文字元素
                    const style = window.getComputedStyle(element);
                    const fontSize = parseFloat(style.fontSize) * scaleX;
                    ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
                    ctx.fillStyle = style.color;
                    ctx.textAlign = style.textAlign || 'center';
                    
                    if (element.style.webkitTextStroke) {
                        const strokeWidth = parseInt(element.style.webkitTextStrokeWidth) * scaleX;
                        const strokeColor = element.style.webkitTextStrokeColor;
                        ctx.strokeStyle = strokeColor;
                        ctx.lineWidth = strokeWidth;
                        ctx.strokeText(element.textContent, x + w/2, y + fontSize);
                    }
                    
                    ctx.fillText(element.textContent, x + w/2, y + fontSize);
                }
            });
        }
    });

    // 转换为图片并下载
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = '封面.png';
    link.href = dataUrl;
    link.click();
}

/**
 * 下载封面
 */
async function downloadCover() {
    try {
        const previewCanvas = document.getElementById('previewCanvas');
        if (!previewCanvas) return;
        
        // 先生成封面
        await generateCover();
        
        // 获取canvas数据
        const canvas = document.createElement('canvas');
        const ratio = document.getElementById('coverRatio').value;
        const [width, height] = ratio.split(':').map(Number);
        canvas.width = 1920;
        canvas.height = (height / width) * canvas.width;
        
        // 绘制封面
        await generatePreview(canvas);
        
        // 创建下载链接
        const link = document.createElement('a');
        link.download = '封面.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    } catch (error) {
        console.error('下载封面失败:', error);
        alert('下载失败，请重试');
    }
}

/**
 * 添加新资源
 * @param {string} type - 资源类型：'icons', 'backgrounds', 'characters'
 */
async function addResource(type) {
    const nameInput = document.getElementById(`${type.slice(0, -1)}Name`);
    const fileInput = document.getElementById(`${type.slice(0, -1)}File`);
    
    if (!nameInput || !fileInput) {
        console.error(`找不到输入元素: ${type}`);
        return;
    }
    
    if (!nameInput.value || !fileInput.files[0]) {
        alert('请输入名称并选择图片');
        return;
    }

    try {
        const base64 = await fileToBase64(fileInput.files[0]);
        resources[type].push({
            id: Date.now(),
            name: nameInput.value,
            image: base64
        });

        saveResources();
        updatePreview(type);
        updateSelect(type);

        // 清空输入
        nameInput.value = '';
        fileInput.value = '';
    } catch (error) {
        console.error('添加资源失败:', error);
        alert('添加资源失败，请重试');
    }
}

/**
 * 将文件转换为Base64
 * @param {File} file - 文件对象
 * @returns {Promise<string>} Base64字符串
 */
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * 更新预览区域
 * @param {string} type - 资源类型
 */
function updatePreview(type) {
    if (typeof type !== 'string') {
        console.error('类型必须是字符串');
        return;
    }
    const container = document.getElementById(`${type.slice(0, -1)}Preview`);
    if (!container) {
        console.error(`找不到预览容器: ${type.slice(0, -1)}Preview`);
        return;
    }
    container.innerHTML = resources[type].map(item => `
        <div class="preview-item" data-id="${item.id}">
            <img src="${item.image}" alt="${item.name}">
            <div class="name">${item.name}</div>
        </div>
    `).join('');
}

/**
 * 更新选择器选项
 * @param {string} type - 资源类型
 */
function updateSelect(type) {
    let selectId;
    switch(type) {
        case 'icons':
            // 对于图标，我们需要更新所有的图标选择器
            updateIconSelectors();
            return;
        case 'backgrounds':
            selectId = 'backgroundSelect';
            break;
        case 'characters':
            selectId = 'characterSelect';
            break;
    }
    const select = document.getElementById(selectId);
    if (select) {
        select.innerHTML = `
            <option value="">选择${type === 'icons' ? '图标' : type === 'backgrounds' ? '背景' : '人物'}</option>
            ${resources[type].map(item => `
                <option value="${item.id}">${item.name}</option>
            `).join('')}
        `;
        // 添加change事件监听
        select.addEventListener('change', (e) => {
            const selectedId = e.target.value;
            if (selectedId) {
                const selectedResource = resources[type].find(item => item.id.toString() === selectedId);
                if (selectedResource) {
                    updatePreviewElement(type, selectedResource);
                }
            }
        });
    }
}

/**
 * 更新预览元素
 * @param {string} type - 资源类型
 * @param {Object} resource - 资源对象
 */
function updatePreviewElement(type, resource) {
    const layerId = type === 'icons' ? 'iconLayer' : 
                   type === 'backgrounds' ? 'backgroundLayer' : 
                   'characterLayer';
    const layer = document.getElementById(layerId);
    if (!layer) return;

    // 清除现有内容
    layer.innerHTML = '';

    // 如果是背景，直接设置为覆盖整个预览区域
    if (type === 'backgrounds') {
        layer.innerHTML = `
            <img src="${resource.image}" 
                 alt="${resource.name}" 
                 style="width: 100%; height: 100%; object-fit: cover;">
        `;
        return;
    }

    // 创建新元素（用于图标和人物）
    const element = document.createElement('div');
    element.className = 'preview-element';
    element.setAttribute('data-type', type);
    element.style.position = 'absolute';
    element.style.left = '50%';
    element.style.top = '50%';
    element.style.transform = 'translate(-50%, -50%)';
    element.style.width = type === 'icons' ? '100px' : '300px';  // 图标默认小一点
    element.style.height = type === 'icons' ? '100px' : '300px';
    element.style.zIndex = type === 'icons' ? '3' : '2';  // 图标在最上层

    const img = document.createElement('img');
    img.src = resource.image;
    img.alt = resource.name;
    img.style.width = '100%';
    img.style.height = '100%';
    img.style.objectFit = type === 'characters' ? 'contain' : 'cover';  // 人物图片保持比例
    element.appendChild(img);

    // 添加缩放手柄
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        element.appendChild(handle);
    });

    layer.appendChild(element);
    makeElementDraggable(element);
    makeElementResizable(element);
}

/**
 * 更新所有预览和选择器
 */
function updateAllPreviews() {
    try {
        // 更新预览区域的内容
        const previewCanvas = document.getElementById('previewCanvas');
        if (previewCanvas) {
            // 清空现有内容
            document.getElementById('backgroundLayer').innerHTML = '';
            document.getElementById('iconLayer').innerHTML = '';
            document.getElementById('characterLayer').innerHTML = '';
            document.getElementById('textLayer').innerHTML = '';
        }

        // 更新资源预览
        updatePreview('icons');
        updatePreview('backgrounds');
        updatePreview('characters');
        
        // 更新选择器
        updateSelect('icons');
        updateSelect('backgrounds');
        updateSelect('characters');

        // 更新文字预览
        updateTextPreview();
    } catch (error) {
        console.error('更新预览失败:', error);
    }
}

/**
 * 更新文字预览
 */
function updateTextPreview() {
    const titleStyle = getTextStyle('title');
    const subtitleStyle = getTextStyle('subtitle');
    
    const titleElement = document.getElementById('titleElement');
    const subtitleElement = document.getElementById('subtitleElement');
    
    if (titleElement) {
        updateTextElementStyle(titleElement, titleStyle);
        // 保存当前尺寸信息
        if (!titleElement.dataset.initialWidth) {
            titleElement.dataset.initialWidth = titleElement.offsetWidth;
            titleElement.dataset.initialHeight = titleElement.offsetHeight;
            titleElement.dataset.initialFontSize = parseFloat(getComputedStyle(titleElement).fontSize);
        }
    }
    
    if (subtitleElement) {
        updateTextElementStyle(subtitleElement, subtitleStyle);
        // 保存当前尺寸信息
        if (!subtitleElement.dataset.initialWidth) {
            subtitleElement.dataset.initialWidth = subtitleElement.offsetWidth;
            subtitleElement.dataset.initialHeight = subtitleElement.offsetHeight;
            subtitleElement.dataset.initialFontSize = parseFloat(getComputedStyle(subtitleElement).fontSize);
        }
    }
}

/**
 * 添加文字到预览区域
 */
function addTextToPreview(type) {
    const textLayer = document.getElementById('textLayer');
    // 移除已存在的同类型文字元素
    const existingText = document.getElementById(`${type}Element`);
    if (existingText) {
        existingText.remove();
    }

    const textElement = document.createElement('div');
    textElement.className = 'text-element';
    textElement.id = `${type}Element`;
    
    // 设置初始样式或使用保存的位置
    const savedPosition = elementPositions.texts[type];
    if (savedPosition) {
        Object.assign(textElement.style, savedPosition);
    } else {
        textElement.style.position = 'absolute';
        textElement.style.left = '50%';
        textElement.style.top = type === 'title' ? '30%' : '45%';
        textElement.style.transform = 'translate(-50%, -50%)';
        textElement.style.width = type === 'title' ? '80%' : '60%';
        textElement.style.fontSize = type === 'title' ? '36px' : '24px';
        textElement.style.zIndex = '4';  // 确保文字在最上层
    }

    textElement.style.textAlign = 'center';
    const style = getTextStyle(type);
    textElement.textContent = style.text || (type === 'title' ? '输入标题文字' : '输入副标题文字');
    updateTextElementStyle(textElement, style);

    // 添加缩放手柄
    ['nw', 'ne', 'sw', 'se'].forEach(pos => {
        const handle = document.createElement('div');
        handle.className = `resize-handle ${pos}`;
        textElement.appendChild(handle);
    });

    textLayer.appendChild(textElement);
    makeElementDraggable(textElement);
    makeElementResizable(textElement);

    // 监听位置变化
    const observer = new MutationObserver(() => {
        elementPositions.texts[type] = {
            left: textElement.style.left,
            top: textElement.style.top,
            width: textElement.style.width,
            height: textElement.style.height,
            transform: textElement.style.transform,
            fontSize: textElement.style.fontSize
        };
    });
    observer.observe(textElement, { attributes: true, attributeFilter: ['style'] });
}

/**
 * 初始化文字控件
 */
function initializeTextControls() {
    // 统一的字体列表
    const fontOptions = `
        <option value="默认">默认字体</option>
        <option value="阿里巴巴普惠体">阿里巴巴普惠体</option>
        <option value="阿里巴巴普惠体黑体">阿里巴巴普惠体黑体</option>
        <option value="站酷清刻黄油体">站酷清刻黄油体</option>
        <option value="阿里妈妈东方大楷">阿里妈妈东方大楷</option>
        <option value="阿里妈妈刀隶体">阿里妈妈刀隶体</option>
        <option value="淘宝买菜体">淘宝买菜体</option>
        <option value="阿里妈妈数黑体">阿里妈妈数黑体</option>
        <option value="优设标题黑">优设标题黑</option>
    `;

    // 更新字体选择框
    document.getElementById('titleFont').innerHTML = fontOptions;
    document.getElementById('subtitleFont').innerHTML = fontOptions;

    // 添加文字按钮事件
    document.getElementById('addTitleBtn').addEventListener('click', () => {
        addTextToPreview('title');
    });
    document.getElementById('addSubtitleBtn').addEventListener('click', () => {
        addTextToPreview('subtitle');
    });

    // 处理所有输入变化
    document.querySelectorAll('.text-controls input, .text-controls select').forEach(input => {
        input.addEventListener('change', () => {
            const type = input.id.startsWith('title') ? 'title' : 'subtitle';
            const textElement = document.getElementById(`${type}Element`);
            if (textElement) {
                const style = getTextStyle(type);
                updateTextElementStyle(textElement, style);
            }
        });
    });

    // 监听文字输入
    ['title', 'subtitle'].forEach(type => {
        document.getElementById(`${type}Text`).addEventListener('input', (e) => {
            const textElement = document.getElementById(`${type}Element`);
            if (textElement) {
                textElement.textContent = e.target.value || `输入${type === 'title' ? '标题' : '副标题'}文字`;
            }
        });
    });

    // 处理滑块值显示
    document.querySelectorAll('input[type="range"]').forEach(range => {
        const display = range.parentElement.querySelector('.value-display');
        if (display) {
            // 初始化显示值
            const unit = range.id.includes('Opacity') ? '%' : 'px';
            display.textContent = `${range.value}${unit}`;
            
            range.addEventListener('input', () => {
                const unit = range.id.includes('Opacity') ? '%' : 'px';
                display.textContent = `${range.value}${unit}`;
                updateTextPreview();
            });
        }
    });
}

/**
 * 更新文字元素样式
 */
function updateTextElementStyle(element, style) {
    if (!element || !style) return;
    
    // 根据选择的字体设置正确的font-family
    switch(style.font) {
        case 'Impact':
            element.style.fontFamily = 'Impact, sans-serif';
            break;
        case 'Bebas Neue':
            element.style.fontFamily = '"Bebas Neue", sans-serif';
            break;
        case '站酷快乐体':
            element.style.fontFamily = '"站酷快乐体", sans-serif';
            break;
        case '阿里巴巴普惠体':
            element.style.fontFamily = '"阿里巴巴普惠体", sans-serif';
            break;
        case '思源黑体':
            element.style.fontFamily = '"思源黑体", sans-serif';
            break;
        case '站酷高端黑':
            element.style.fontFamily = '"站酷高端黑", sans-serif';
            break;
        case '荷包鼓鼓':
            element.style.fontFamily = '"荷包鼓鼓", sans-serif';
            break;
        case '优设标题黑':
            element.style.fontFamily = '"优设标题黑", sans-serif';
            break;
        case '华文行楷':
            element.style.fontFamily = '"华文行楷", sans-serif';
            break;
        default:
            element.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
    
    element.style.fontSize = style.size;
    element.style.color = style.color;
    element.style.opacity = style.opacity;
    
    if (parseInt(style.strokeWidth) > 0) {
        element.style.webkitTextStroke = `${style.strokeWidth}px ${style.strokeColor}`;
    } else {
        element.style.webkitTextStroke = 'none';
    }
    
    if (parseInt(style.shadowSize) > 0) {
        element.style.textShadow = `0 0 ${style.shadowSize}px rgba(0,0,0,0.5)`;
    } else {
        element.style.textShadow = 'none';
    }
}

/**
 * 获取文字样式
 */
function getTextStyle(prefix) {
    return {
        text: document.getElementById(`${prefix}Text`).value,
        font: document.getElementById(`${prefix}Font`).value,
        size: document.getElementById(`${prefix}Size`).value + 'px',
        color: document.getElementById(`${prefix}Color`).value,
        opacity: document.getElementById(`${prefix}Opacity`).value + '%',
        strokeWidth: document.getElementById(`${prefix}StrokeWidth`).value,
        strokeColor: document.getElementById(`${prefix}StrokeColor`).value,
        shadowSize: document.getElementById(`${prefix}ShadowSize`).value
    };
}

/**
 * 初始化预览区域
 */
function initializePreview() {
    const previewArea = document.getElementById('previewArea');
    const coverRatio = document.getElementById('coverRatio');

    if (!previewArea || !coverRatio) {
        console.error('找不到预览区域或比例选择器');
        return;
    }

    // 设置初始比例
    updatePreviewRatio(coverRatio.value);

    // 监听比例变化
    coverRatio.addEventListener('change', (e) => {
        updatePreviewRatio(e.target.value);
    });

    // 初始化拖拽功能
    initializeDragAndDrop();
}

/**
 * 更新预览区域比例
 * @param {string} ratio - 比例值（如 "16:9"）
 */
function updatePreviewRatio(ratio) {
    const previewArea = document.getElementById('previewArea');
    previewArea.setAttribute('data-ratio', ratio);
    updateAllPreviews(); // 使用updateAllPreviews替代updatePreview
}

/**
 * 使元素可拖动
 * @param {HTMLElement} element - 要使可拖动的元素
 */
function makeElementDraggable(element) {
    element.addEventListener('mousedown', startDragging);
    element.addEventListener('touchstart', startDragging);
    element.addEventListener('click', function(e) {
        // 选中当前文字元素
        document.querySelectorAll('.text-element').forEach(el => {
            el.classList.remove('selected');
        });
        element.classList.add('selected');
    });
}

/**
 * 使元素可缩放
 * @param {HTMLElement} element - 要使可缩放的元素
 */
function makeElementResizable(element) {
    const handles = element.querySelectorAll('.resize-handle');
    handles.forEach(handle => {
        handle.addEventListener('mousedown', startResizing);
        handle.addEventListener('touchstart', startResizing);
    });
}

/**
 * 开始拖动
 * @param {Event} e - 事件对象
 */
function startDragging(e) {
    if (e.target.classList.contains('resize-handle')) return;
    e.preventDefault();
    selectedElement = this;
    
    // 选中当前元素
    document.querySelectorAll('.preview-element, .text-element').forEach(el => {
        el.classList.remove('selected');
    });
    selectedElement.classList.add('selected');

    const event = e.type === 'mousedown' ? e : e.touches[0];
    
    // 获取鼠标在元素内的相对位置
    const elementRect = selectedElement.getBoundingClientRect();
    initialX = event.clientX - elementRect.left;
    initialY = event.clientY - elementRect.top;
    
    document.addEventListener('mousemove', drag);
    document.addEventListener('touchmove', drag);
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);
}

/**
 * 拖动中
 * @param {Event} e - 事件对象
 */
function drag(e) {
    if (!selectedElement) return;
    e.preventDefault();

    const event = e.type === 'mousemove' ? e : e.touches[0];
    
    // 获取预览区域
    const previewArea = document.getElementById('previewArea');
    const previewRect = previewArea.getBoundingClientRect();
    
    // 计算新位置（相对于预览区域）
    const newX = event.clientX - previewRect.left - initialX;
    const newY = event.clientY - previewRect.top - initialY;
    
    // 所有元素都可以自由移动
    selectedElement.style.left = newX + 'px';
    selectedElement.style.top = newY + 'px';
}

/**
 * 停止拖动
 */
function stopDragging() {
    selectedElement = null;
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('touchmove', drag);
    document.removeEventListener('mouseup', stopDragging);
    document.removeEventListener('touchend', stopDragging);
}

/**
 * 开始缩放
 * @param {Event} e - 事件对象
 */
function startResizing(e) {
    e.stopPropagation();
    const handle = this;
    const element = handle.parentElement;
    const pos = handle.className.split(' ')[1];
    
    element.classList.add('resizing');
    
    const startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
    const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
    const startWidth = element.offsetWidth;
    const startHeight = element.offsetHeight;
    const startLeft = element.offsetLeft;
    const startTop = element.offsetTop;
    const startFontSize = element.dataset.initialFontSize || parseFloat(window.getComputedStyle(element).fontSize);

    function resize(e) {
        const currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
        const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
        const deltaX = currentX - startX;
        const deltaY = currentY - startY;

        let newWidth = startWidth;
        let newHeight = startHeight;
        let newLeft = startLeft;
        let newTop = startTop;
        let scale = 1;

        switch (pos) {
            case 'se':
                newWidth = startWidth + deltaX;
                newHeight = startHeight + deltaY;
                scale = newWidth / (element.dataset.initialWidth || startWidth);
                break;
            case 'sw':
                newWidth = startWidth - deltaX;
                newHeight = startHeight + deltaY;
                newLeft = startLeft + deltaX;
                scale = newWidth / (element.dataset.initialWidth || startWidth);
                break;
            case 'ne':
                newWidth = startWidth + deltaX;
                newHeight = startHeight - deltaY;
                newTop = startTop + deltaY;
                scale = newWidth / (element.dataset.initialWidth || startWidth);
                break;
            case 'nw':
                newWidth = startWidth - deltaX;
                newHeight = startHeight - deltaY;
                newLeft = startLeft + deltaX;
                newTop = startTop + deltaY;
                scale = newWidth / (element.dataset.initialWidth || startWidth);
                break;
        }

        const minSize = 50;
        if (newWidth >= minSize && newHeight >= minSize) {
            element.style.width = newWidth + 'px';
            element.style.height = newHeight + 'px';
            element.style.left = newLeft + 'px';
            element.style.top = newTop + 'px';
            
            // 使用初始字体大小计算新的字体大小
            const initialFontSize = parseFloat(element.dataset.initialFontSize) || startFontSize;
            const newFontSize = Math.max(12, Math.min(200, initialFontSize * scale));
            element.style.fontSize = `${newFontSize}px`;
        }
    }

    function stopResizing() {
        element.classList.remove('resizing');
        document.removeEventListener('mousemove', resize);
        document.removeEventListener('touchmove', resize);
        document.removeEventListener('mouseup', stopResizing);
        document.removeEventListener('touchend', stopResizing);
    }

    document.addEventListener('mousemove', resize);
    document.addEventListener('touchmove', resize);
    document.addEventListener('mouseup', stopResizing);
    document.addEventListener('touchend', stopResizing);
}

/**
 * 初始化拖拽功能
 */
function initializeDragAndDrop() {
    // 使元素可拖动
    function makeElementDraggable(element) {
        element.addEventListener('mousedown', startDragging);
        element.addEventListener('touchstart', startDragging);
    }

    // 开始拖动
    function startDragging(e) {
        if (e.target.classList.contains('resize-handle')) return;
        
        selectedElement = this;
        const event = e.type === 'mousedown' ? e : e.touches[0];
        
        initialX = event.clientX - selectedElement.offsetLeft;
        initialY = event.clientY - selectedElement.offsetTop;

        document.addEventListener('mousemove', drag);
        document.addEventListener('touchmove', drag);
        document.addEventListener('mouseup', stopDragging);
        document.addEventListener('touchend', stopDragging);
    }

    // 拖动中
    function drag(e) {
        if (!selectedElement) return;
        e.preventDefault();

        const event = e.type === 'mousemove' ? e : e.touches[0];
        
        currentX = event.clientX - initialX;
        currentY = event.clientY - initialY;

        // 限制在预览区域内
        const bounds = selectedElement.parentElement.getBoundingClientRect();
        currentX = Math.max(0, Math.min(currentX, bounds.width - selectedElement.offsetWidth));
        currentY = Math.max(0, Math.min(currentY, bounds.height - selectedElement.offsetHeight));

        selectedElement.style.left = currentX + 'px';
        selectedElement.style.top = currentY + 'px';
    }

    // 停止拖动
    function stopDragging() {
        selectedElement = null;
        document.removeEventListener('mousemove', drag);
        document.removeEventListener('touchmove', drag);
        document.removeEventListener('mouseup', stopDragging);
        document.removeEventListener('touchend', stopDragging);
    }

    // 使元素可缩放
    function makeElementResizable(element) {
        const handles = element.querySelectorAll('.resize-handle');
        handles.forEach(handle => {
            handle.addEventListener('mousedown', startResizing);
            handle.addEventListener('touchstart', startResizing);
        });
    }

    // 开始缩放
    function startResizing(e) {
        e.stopPropagation();
        const handle = this;
        const element = handle.parentElement;
        const pos = handle.className.split(' ')[1];
        
        element.classList.add('resizing');
        
        const startX = e.type === 'mousedown' ? e.clientX : e.touches[0].clientX;
        const startY = e.type === 'mousedown' ? e.clientY : e.touches[0].clientY;
        const startWidth = element.offsetWidth;
        const startHeight = element.offsetHeight;
        const startLeft = element.offsetLeft;
        const startTop = element.offsetTop;
        const startFontSize = element.dataset.initialFontSize || parseFloat(window.getComputedStyle(element).fontSize);

        function resize(e) {
            const currentX = e.type === 'mousemove' ? e.clientX : e.touches[0].clientX;
            const currentY = e.type === 'mousemove' ? e.clientY : e.touches[0].clientY;
            const deltaX = currentX - startX;
            const deltaY = currentY - startY;

            let newWidth = startWidth;
            let newHeight = startHeight;
            let newLeft = startLeft;
            let newTop = startTop;
            let scale = 1;

            switch (pos) {
                case 'se':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight + deltaY;
                    scale = newWidth / (element.dataset.initialWidth || startWidth);
                    break;
                case 'sw':
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight + deltaY;
                    newLeft = startLeft + deltaX;
                    scale = newWidth / (element.dataset.initialWidth || startWidth);
                    break;
                case 'ne':
                    newWidth = startWidth + deltaX;
                    newHeight = startHeight - deltaY;
                    newTop = startTop + deltaY;
                    scale = newWidth / (element.dataset.initialWidth || startWidth);
                    break;
                case 'nw':
                    newWidth = startWidth - deltaX;
                    newHeight = startHeight - deltaY;
                    newLeft = startLeft + deltaX;
                    newTop = startTop + deltaY;
                    scale = newWidth / (element.dataset.initialWidth || startWidth);
                    break;
            }

            const minSize = 50;
            if (newWidth >= minSize && newHeight >= minSize) {
                element.style.width = newWidth + 'px';
                element.style.height = newHeight + 'px';
                element.style.left = newLeft + 'px';
                element.style.top = newTop + 'px';
                
                // 使用初始字体大小计算新的字体大小
                const initialFontSize = parseFloat(element.dataset.initialFontSize) || startFontSize;
                const newFontSize = Math.max(12, Math.min(200, initialFontSize * scale));
                element.style.fontSize = `${newFontSize}px`;
            }
        }

        function stopResizing() {
            element.classList.remove('resizing');
            document.removeEventListener('mousemove', resize);
            document.removeEventListener('touchmove', resize);
            document.removeEventListener('mouseup', stopResizing);
            document.removeEventListener('touchend', stopResizing);
        }

        document.addEventListener('mousemove', resize);
        document.addEventListener('touchmove', resize);
        document.addEventListener('mouseup', stopResizing);
        document.addEventListener('touchend', stopResizing);
    }
}

/**
 * 加载存储的模板
 */
function loadStoredTemplates() {
    try {
        const stored = localStorage.getItem('coverTemplates');
        if (stored) {
            templates.items = JSON.parse(stored);
            updateTemplateGrid();
        }
    } catch (error) {
        console.error('加载模板失败:', error);
    }
}

/**
 * 保存当前设计为模板
 */
async function saveAsTemplate() {
    try {
        const previewCanvas = document.getElementById('previewCanvas');
        if (!previewCanvas) return;
        
        // 获取模板名称
        const templateName = document.getElementById('templateName').value.trim();
        if (!templateName) {
            alert('请输入模板名称');
            return;
        }
        
        // 创建临时canvas获取预览图
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 获取当前预览区域的比例
        const ratio = document.getElementById('coverRatio').value;
        const [width, height] = ratio.split(':').map(Number);
        // 减小预览图尺寸
        canvas.width = 150;
        canvas.height = (height / width) * 150;
        
        // 绘制当前设计的缩略图
        await generatePreview(canvas);
        
        // 压缩预览图质量
        const preview = canvas.toDataURL('image/jpeg', 0.6);
        
        // 清理旧模板
        if (templates.items.length >= 10) {
            templates.items = templates.items.slice(-9);
        }
        
        // 保存模板数据
        const template = {
            id: Date.now(),
            name: templateName,
            preview: preview,
            data: {
                background: getCurrentBackground(),
                icons: getCurrentIcons(),
                character: getCurrentCharacter(),
                texts: getCurrentTexts()
            }
        };
        
        try {
            // 尝试清理localStorage
            const oldTemplates = localStorage.getItem('coverTemplates');
            if (oldTemplates) {
                localStorage.removeItem('coverTemplates');
            }
            
            templates.items.push(template);
            localStorage.setItem('coverTemplates', JSON.stringify(templates.items));
        } catch (storageError) {
            // 如果仍然超出配额，删除最旧的模板
            while (templates.items.length > 0) {
                templates.items.shift();  // 删除最旧的模板
                try {
                    templates.items.push(template);
                    localStorage.setItem('coverTemplates', JSON.stringify(templates.items));
                    break;
                } catch (e) {
                    continue;
                }
            }
        }
        
        // 清空输入框
        document.getElementById('templateName').value = '';
        
        // 更新模板显示
        updateTemplateGrid();
        alert('模板保存成功！');
    } catch (error) {
        console.error('保存模板失败:', error);
        alert('保存模板失败：存储空间不足，请删除一些旧模板后重试');
    }
}

/**
 * 更新模板网格显示
 */
function updateTemplateGrid() {
    const grid = document.getElementById('templateGrid');
    if (!grid) return;
    
    grid.innerHTML = templates.items.map(template => `
        <div class="template-item" data-id="${template.id}">
            <img src="${template.preview}" alt="${template.name}">
            <div class="template-info">${template.name}</div>
            <button class="delete-btn" data-id="${template.id}">×</button>
        </div>
    `).join('');
    
    // 添加事件监听
    grid.querySelectorAll('.template-item').forEach(item => {
        item.addEventListener('click', async () => {
            const id = item.dataset.id;
            if (id) {
                await loadTemplate(id);
            }
        });
    });
    
    grid.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            deleteTemplate(btn.dataset.id);
        });
    });
}

/**
 * 加载模板
 */
async function loadTemplate(id) {
    const template = templates.items.find(t => t.id.toString() === id);
    if (!template) return;
    
    // 清空当前设计
    clearCurrentDesign();
    
    // 应用模板数据
    applyBackground(template.data.background);
    applyIcons(template.data.icons);
    applyCharacter(template.data.character);
    await applyTexts(template.data.texts);
}

/**
 * 删除模板
 */
function deleteTemplate(id) {
    if (!confirm('确定要删除这个模板吗？')) return;
    
    templates.items = templates.items.filter(t => t.id.toString() !== id);
    localStorage.setItem('coverTemplates', JSON.stringify(templates.items));
    updateTemplateGrid();
}

/**
 * 获取当前设计的各个元素数据
 */
function getCurrentBackground() {
    const backgroundLayer = document.getElementById('backgroundLayer');
    const img = backgroundLayer.querySelector('img');
    return img ? { 
        // 只存储文件名而不是完整URL
        src: img.src.split('/').pop() 
    } : null;
}

function getCurrentIcons() {
    const iconLayer = document.getElementById('iconLayer');
    return Array.from(iconLayer.querySelectorAll('.preview-element')).map(el => ({
        src: el.querySelector('img').src.split('/').pop(),
        style: {
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.height
        }
    }));
}

function getCurrentCharacter() {
    const characterLayer = document.getElementById('characterLayer');
    const el = characterLayer.querySelector('.preview-element');
    return el ? {
        src: el.querySelector('img').src.split('/').pop(),
        style: {
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            height: el.style.height
        }
    } : null;
}

function getCurrentTexts() {
    return {
        title: getTextElementData('titleElement'),
        subtitle: getTextElementData('subtitleElement')
    };
}

function getTextElementData(id) {
    const el = document.getElementById(id);
    return el ? {
        text: el.textContent || '',  // 确保保存文字内容
        style: {
            left: el.style.left,
            top: el.style.top,
            width: el.style.width,
            fontSize: el.style.fontSize,
            color: el.style.color,
            fontFamily: el.style.fontFamily,
            textAlign: el.style.textAlign,
            webkitTextStroke: el.style.webkitTextStroke,
            opacity: el.style.opacity
        }
    } : null;
}

/**
 * 生成预览图
 * @param {HTMLCanvasElement} canvas - 目标画布
 */
async function generatePreview(canvas) {
    const ctx = canvas.getContext('2d');
    const previewCanvas = document.getElementById('previewCanvas');
    if (!previewCanvas) return;

    // 获取预览区域的实际尺寸
    const previewRect = previewCanvas.getBoundingClientRect();
    const scaleX = canvas.width / previewRect.width;
    const scaleY = canvas.height / previewRect.height;

    // 绘制背景
    const backgroundLayer = document.getElementById('backgroundLayer');
    if (backgroundLayer.firstChild) {
        const bgImg = backgroundLayer.querySelector('img');
        if (bgImg) {
            await new Promise((resolve) => {
                if (bgImg.complete) resolve();
                else bgImg.onload = resolve;
            });
            const imgRatio = bgImg.naturalWidth / bgImg.naturalHeight;
            let drawWidth = canvas.width;
            let drawHeight = canvas.height;
            let drawX = 0;
            let drawY = 0;
            
            if (canvas.width / canvas.height > imgRatio) {
                drawHeight = canvas.width / imgRatio;
                drawY = (canvas.height - drawHeight) / 2;
            } else {
                drawWidth = canvas.height * imgRatio;
                drawX = (canvas.width - drawWidth) / 2;
            }
            ctx.drawImage(bgImg, drawX, drawY, drawWidth, drawHeight);
        }
    }

    // 绘制其他元素
    const layers = ['iconLayer', 'characterLayer', 'textLayer'];
    for (const layerId of layers) {
        const layer = document.getElementById(layerId);
        if (!layer) continue;

        const elements = layer.querySelectorAll('.preview-element, .text-element');
        for (const element of elements) {
            const rect = element.getBoundingClientRect();
            const layerRect = previewCanvas.getBoundingClientRect();
            const left = rect.left - layerRect.left;
            const top = rect.top - layerRect.top;
            const width = parseFloat(element.style.width);
            const height = parseFloat(element.style.height);

            const x = left * scaleX;
            const y = top * scaleY;
            const w = width * scaleX;
            const h = height * scaleX;

            if (element.querySelector('img')) {
                const img = element.querySelector('img');
                await new Promise((resolve) => {
                    if (img.complete) resolve();
                    else img.onload = resolve;
                });

                const imgRatio = img.naturalWidth / img.naturalHeight;
                let drawWidth = w;
                let drawHeight = h;
                let drawX = x;
                let drawY = y;

                if (w / h > imgRatio) {
                    drawWidth = h * imgRatio;
                    drawX = x + (w - drawWidth) / 2;
                } else {
                    drawHeight = w / imgRatio;
                    drawY = y + (h - drawHeight) / 2;
                }
                ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
            } else {
                const style = window.getComputedStyle(element);
                const fontSize = parseFloat(style.fontSize) * scaleX;
                ctx.font = `${style.fontWeight} ${fontSize}px ${style.fontFamily}`;
                ctx.fillStyle = style.color;
                ctx.textAlign = style.textAlign || 'center';

                if (element.style.webkitTextStroke) {
                    const strokeWidth = parseInt(element.style.webkitTextStrokeWidth) * scaleX;
                    const strokeColor = element.style.webkitTextStrokeColor;
                    ctx.strokeStyle = strokeColor;
                    ctx.lineWidth = strokeWidth;
                    ctx.strokeText(element.textContent, x + w/2, y + fontSize);
                }

                ctx.fillText(element.textContent, x + w/2, y + fontSize);
            }
        }
    }
}

/**
 * 应用背景数据
 */
function applyBackground(background) {
    if (!background) return;
    const backgroundLayer = document.getElementById('backgroundLayer');
    const backgroundSelect = document.getElementById('backgroundSelect');
    
    // 查找对应的背景资源
    const resource = resources.backgrounds.find(item => item.image.includes(background.src));
    if (resource) {
        backgroundLayer.innerHTML = `<img src="${resource.image}" alt="背景">`;
        backgroundSelect.value = resource.id;
    }
}

/**
 * 应用图标数据
 */
function applyIcons(icons) {
    if (!icons || !icons.length) return;
    
    // 设置图标数量
    const iconCountSelect = document.getElementById('iconCountSelect');
    iconCountSelect.value = icons.length;
    updateIconSelectors();
    
    // 应用每个图标
    icons.forEach((icon, index) => {
        const resource = resources.icons.find(item => item.image.includes(icon.src));
        if (resource) {
            const select = document.getElementById(`icon-${index + 1}`);
            if (select) {
                select.value = resource.id;
                const element = addIconToPreview(resource, index);
                
                // 应用位置和尺寸
                if (icon.style) {
                    Object.assign(element.style, icon.style);
                }
            }
        }
    });
}

/**
 * 应用人物形象数据
 */
function applyCharacter(character) {
    if (!character) return;
    const characterLayer = document.getElementById('characterLayer');
    const characterSelect = document.getElementById('characterSelect');
    
    // 查找对应的人物资源
    const resource = resources.characters.find(item => item.image.includes(character.src));
    if (resource) {
        const element = document.createElement('div');
        element.className = 'preview-element';
        element.setAttribute('data-type', 'characters');
        element.style.position = 'absolute';  // 确保设置了position
        
        const img = document.createElement('img');
        img.src = resource.image;
        img.alt = resource.name;
        img.style.width = '100%';
        img.style.height = '100%';
        img.style.objectFit = 'contain';
        img.style.pointerEvents = 'none';
        element.appendChild(img);
        
        // 添加缩放手柄
        ['nw', 'ne', 'sw', 'se'].forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `resize-handle ${pos}`;
            element.appendChild(handle);
        });
        
        // 设置默认尺寸和位置（如果没有保存的样式）
        if (!character.style) {
            element.style.width = '200px';
            element.style.height = '200px';
            element.style.left = '50%';
            element.style.top = '50%';
            element.style.transform = 'translate(-50%, -50%)';
        }
        
        // 应用位置和尺寸
        if (character.style) {
            Object.assign(element.style, character.style);
        }
        
        characterLayer.innerHTML = '';
        characterLayer.appendChild(element);
        characterSelect.value = resource.id;
        
        makeElementDraggable(element);
        makeElementResizable(element);
    }
}

/**
 * 应用文字数据
 */
async function applyTexts(texts) {
    if (!texts) return;
    
    // 应用标题
    if (texts.title) {
        const titleElement = document.getElementById('titleElement');
        const titleText = document.getElementById('titleText');
        if (titleElement && titleText) {
            // 设置文字内容
            titleText.value = texts.title.text;
            titleElement.textContent = texts.title.text;
            // 设置样式
            if (texts.title.style) {
                // 等待字体加载完成
                if (texts.title.style.fontFamily) {
                    await waitForFont(texts.title.style.fontFamily);
                }
                Object.assign(titleElement.style, texts.title.style);
                titleElement.style.display = 'block';
            }
            updateTextControls('title', texts.title.style);
        }
    }
    
    // 应用副标题
    if (texts.subtitle) {
        const subtitleElement = document.getElementById('subtitleElement');
        const subtitleText = document.getElementById('subtitleText');
        if (subtitleElement && subtitleText) {
            // 设置文字内容
            subtitleText.value = texts.subtitle.text;
            subtitleElement.textContent = texts.subtitle.text;
            // 设置样式
            if (texts.subtitle.style) {
                // 等待字体加载完成
                if (texts.subtitle.style.fontFamily) {
                    await waitForFont(texts.subtitle.style.fontFamily);
                }
                Object.assign(subtitleElement.style, texts.subtitle.style);
                subtitleElement.style.display = 'block';
            }
            updateTextControls('subtitle', texts.subtitle.style);
        }
    }
}

/**
 * 更新文字控件状态
 */
function updateTextControls(type, style) {
    if (!style) return;
    
    // 更新字体选择
    const fontSelect = document.getElementById(`${type}Font`);
    if (fontSelect && style.fontFamily) {
        fontSelect.value = style.fontFamily.replace(/['"]/g, '');
    }
    
    // 更新字号
    const sizeInput = document.getElementById(`${type}Size`);
    if (sizeInput && style.fontSize) {
        const size = parseInt(style.fontSize);
        sizeInput.value = size;
        sizeInput.nextElementSibling.textContent = `${size}px`;
    }
    
    // 更新颜色
    const colorInput = document.getElementById(`${type}Color`);
    if (colorInput && style.color) {
        colorInput.value = rgbToHex(style.color);
    }
    
    // 更新描边
    if (style.webkitTextStroke) {
        const [width, color] = style.webkitTextStroke.split(' ');
        const strokeWidthInput = document.getElementById(`${type}StrokeWidth`);
        const strokeColorInput = document.getElementById(`${type}StrokeColor`);
        
        if (strokeWidthInput) {
            const strokeWidth = parseInt(width);
            strokeWidthInput.value = strokeWidth;
            strokeWidthInput.nextElementSibling.textContent = `${strokeWidth}px`;
        }
        
        if (strokeColorInput) {
            strokeColorInput.value = rgbToHex(color);
        }
    }
}

/**
 * 将RGB颜色转换为十六进制格式
 * @param {string} rgb - RGB颜色字符串
 * @returns {string} 十六进制颜色字符串
 */
function rgbToHex(rgb) {
    // 如果已经是十六进制格式，直接返回
    if (rgb.startsWith('#')) {
        return rgb;
    }
    
    // 提取RGB值
    const rgbValues = rgb.match(/\d+/g);
    if (!rgbValues || rgbValues.length < 3) {
        return '#000000';  // 默认返回黑色
    }
    
    // 转换为十六进制
    const r = parseInt(rgbValues[0]);
    const g = parseInt(rgbValues[1]);
    const b = parseInt(rgbValues[2]);
    
    return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
} 

// 添加比例切换事件监听
document.getElementById('coverRatio').addEventListener('change', (e) => {
    const previewArea = document.getElementById('previewArea');
    previewArea.setAttribute('data-ratio', e.target.value);
}); 

/**
 * 清空当前设计
 */
function clearCurrentDesign() {
    // 清空背景
    document.getElementById('backgroundLayer').innerHTML = '';
    document.getElementById('backgroundSelect').value = '';
    
    // 清空图标
    document.getElementById('iconLayer').innerHTML = '';
    document.getElementById('iconCountSelect').value = '2';
    updateIconSelectors();
    
    // 清空人物
    document.getElementById('characterLayer').innerHTML = '';
    document.getElementById('characterSelect').value = '';
    
    // 清空文字
    const titleElement = document.getElementById('titleElement');
    const subtitleElement = document.getElementById('subtitleElement');
    if (titleElement) {
        titleElement.textContent = '';
        titleElement.style.display = 'none';
    }
    if (subtitleElement) {
        subtitleElement.textContent = '';
        subtitleElement.style.display = 'none';
    }
    
    // 重置文字输入框
    document.getElementById('titleText').value = '';
    document.getElementById('subtitleText').value = '';
} 

/**
 * 检查字体是否已加载
 * @param {string} fontFamily - 字体名称
 * @returns {Promise} 字体加载完成的Promise
 */
function waitForFont(fontFamily) {
    return document.fonts.ready.then(() => {
        return new Promise((resolve) => {
            if (document.fonts.check(`12px "${fontFamily}"`)) {
                resolve();
            } else {
                // 如果字体还没加载，等待字体加载事件
                document.fonts.addEventListener('loadingdone', () => {
                    if (document.fonts.check(`12px "${fontFamily}"`)) {
                        resolve();
                    }
                }, { once: true });
            }
        });
    });
} 