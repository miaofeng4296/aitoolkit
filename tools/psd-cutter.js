/**
 * PSD在线切图工具 - 前端逻辑
 * 处理文件上传、图层解析、切图等功能
 */

// PSD数据结构
let psdData = {
    name: '',
    width: 0,
    height: 0,
    layers: [],
    thumbnail: null,
    rawData: null
};

// 已选择的图层
let selectedLayers = new Set();

// DOM元素
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const previewSection = document.getElementById('preview-section');
const layerTree = document.getElementById('layer-tree');
const btnStartCut = document.getElementById('btn-start-cut');

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initUploadZone();
    initSettings();
    initLayerControls();
    initThemeToggle();
    initMobileMenu();
});

/**
 * 初始化上传区域
 */
function initUploadZone() {
    // 点击上传
    uploadZone.addEventListener('click', () => fileInput.click());
    
    // 文件选择
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
    // 拖拽上传
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });
    
    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });
    
    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileUpload(files[0]);
        }
    });
    
    // 重新上传按钮
    document.getElementById('btn-reset').addEventListener('click', resetUploader);
}

/**
 * 处理文件上传
 * @param {File} file - 上传的文件
 */
async function handleFileUpload(file) {
    // 验证文件类型
    if (!validateFileType(file, ['.psd'])) {
        return;
    }
    
    // 验证文件大小 (50MB限制)
    if (!validateFileSize(file, 50)) {
        return;
    }
    
    // 显示加载状态
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    updateLoadingProgress(0, '正在读取文件...');
    
    try {
        // 读取文件
        const arrayBuffer = await readFileAsArrayBuffer(file);
        updateLoadingProgress(30, '解析PSD结构...');
        
        // 发送到后端解析
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('https://aitoolkit-six.vercel.app/api/psd-parse', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error('PSD解析失败');
        }
        
        const result = await response.json();
        updateLoadingProgress(80, '生成预览...');
        
        // 更新PSD数据
        psdData = {
            name: file.name,
            width: result.width,
            height: result.height,
            layers: result.layers,
            thumbnail: result.thumbnail,
            rawData: arrayBuffer
        };
        
        // 更新UI
        document.getElementById('psd-name').textContent = file.name;
        document.getElementById('psd-info').textContent = 
            `${result.layerCount} 图层 | ${result.width}x${result.height} 像素`;
        
        if (result.thumbnail) {
            document.getElementById('preview-image').src = result.thumbnail;
        }
        
        updateLoadingProgress(100, '完成');
        
        // 延迟显示预览
        setTimeout(() => {
            loadingSection.classList.add('hidden');
            previewSection.classList.remove('hidden');
            
            // 渲染图层树
            renderLayerTree(result.layers);
            
            // 启用切图按钮
            btnStartCut.disabled = false;
        }, 500);
        
    } catch (error) {
        console.error('PSD解析错误:', error);
        showToast('PSD解析失败，请确保文件格式正确', 'error');
        resetUploader();
    }
}

/**
 * 读取文件为ArrayBuffer
 * @param {File} file - 文件对象
 * @returns {Promise<ArrayBuffer>}
 */
function readFileAsArrayBuffer(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

/**
 * 更新加载进度
 * @param {number} percent - 进度百分比
 * @param {string} status - 状态文本
 */
function updateLoadingProgress(percent, status) {
    document.getElementById('loading-progress').style.width = `${percent}%`;
    document.getElementById('loading-status').textContent = status;
}

/**
 * 重置上传器
 */
function resetUploader() {
    uploadSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    previewSection.classList.add('hidden');
    fileInput.value = '';
    btnStartCut.disabled = true;
    psdData = { name: '', width: 0, height: 0, layers: [], thumbnail: null, rawData: null };
    selectedLayers.clear();
}

/**
 * 渲染图层树
 * @param {Array} layers - 图层数据
 */
function renderLayerTree(layers) {
    layerTree.innerHTML = '';
    selectedLayers.clear();
    
    if (!layers || layers.length === 0) {
        layerTree.innerHTML = '<p class="text-gray-500 text-center py-8">该PSD文件没有图层</p>';
        return;
    }
    
    const container = document.createElement('div');
    container.className = 'layer-list';
    
    layers.forEach(layer => {
        const item = createLayerItem(layer, 0);
        container.appendChild(item);
    });
    
    layerTree.appendChild(container);
    updateSelectedCount();
}

/**
 * 创建图层项
 * @param {Object} layer - 图层数据
 * @param {number} depth - 层级深度
 * @returns {HTMLElement}
 */
function createLayerItem(layer, depth) {
    const item = document.createElement('div');
    item.className = `layer-item ${layer.visible === false ? 'hidden' : ''}`;
    item.dataset.layerId = layer.id;
    item.style.marginLeft = `${depth * 20}px`;
    
    // 根据图层类型选择图标
    let iconClass = 'fa-square';
    let iconColor = '#a0a0a0';
    
    if (layer.type === 'group') {
        iconClass = 'fa-folder';
        iconColor = '#fbbf24';
    } else if (layer.type === 'text') {
        iconClass = 'fa-font';
        iconColor = '#60a5fa';
    } else if (layer.type === 'image') {
        iconClass = 'fa-image';
        iconColor = '#34d399';
    }
    
    // 检查是否应该跳过（文本图层）
    const shouldSkip = layer.type === 'text' && !document.getElementById('include-text-layers')?.checked;
    
    // 默认选中非隐藏图层
    if (layer.visible !== false && !shouldSkip && layer.type !== 'group') {
        selectedLayers.add(layer.id);
    }
    
    item.innerHTML = `
        <span class="layer-icon">
            <i class="fas ${iconClass}" style="color: ${iconColor}"></i>
        </span>
        <span class="layer-name" title="${layer.name}">${layer.name}</span>
        ${layer.type === 'group' ? '<i class="fas fa-chevron-down layer-expand text-xs"></i>' : ''}
    `;
    
    // 点击事件
    item.addEventListener('click', (e) => {
        if (e.target.closest('.layer-expand')) {
            toggleLayerGroup(item, layer);
        } else {
            toggleLayerSelection(layer.id, item);
        }
    });
    
    // 子图层
    if (layer.children && layer.children.length > 0) {
        const childContainer = document.createElement('div');
        childContainer.className = 'layer-children hidden';
        
        layer.children.forEach(child => {
            const childItem = createLayerItem(child, depth + 1);
            childContainer.appendChild(childItem);
        });
        
        item.appendChild(childContainer);
    }
    
    // 更新选中样式
    if (selectedLayers.has(layer.id)) {
        item.classList.add('selected');
    }
    
    return item;
}

/**
 * 切换图层组展开/折叠
 */
function toggleLayerGroup(item, layer) {
    const children = item.querySelector('.layer-children');
    const expandIcon = item.querySelector('.layer-expand');
    
    if (children) {
        children.classList.toggle('hidden');
        if (expandIcon) {
            expandIcon.classList.toggle('fa-chevron-down');
            expandIcon.classList.toggle('fa-chevron-right');
        }
    }
}

/**
 * 切换图层选中状态
 * @param {string} layerId - 图层ID
 * @param {HTMLElement} item - 图层项元素
 */
function toggleLayerSelection(layerId, item) {
    if (selectedLayers.has(layerId)) {
        selectedLayers.delete(layerId);
        item.classList.remove('selected');
    } else {
        selectedLayers.add(layerId);
        item.classList.add('selected');
    }
    updateSelectedCount();
}

/**
 * 更新选中数量
 */
function updateSelectedCount() {
    const count = selectedLayers.size;
    document.getElementById('selected-count').textContent = `已选择: ${count} 个`;
    document.getElementById('select-all-layers').checked = count === getTotalLayerCount();
}

/**
 * 获取总图层数
 */
function getTotalLayerCount() {
    let count = 0;
    
    function countLayers(layers) {
        layers.forEach(layer => {
            if (layer.type !== 'group') count++;
            if (layer.children) countLayers(layer.children);
        });
    }
    
    countLayers(psdData.layers);
    return count;
}

/**
 * 初始化设置面板
 */
function initSettings() {
    // 全选控制
    document.getElementById('select-all-layers').addEventListener('change', (e) => {
        const checked = e.target.checked;
        
        if (checked) {
            selectAllLayers(psdData.layers);
        } else {
            selectedLayers.clear();
        }
        
        updateAllLayerStyles();
        updateSelectedCount();
    });
    
    // 展开全部
    document.getElementById('btn-expand-all').addEventListener('click', () => {
        document.querySelectorAll('.layer-children').forEach(el => el.classList.remove('hidden'));
        document.querySelectorAll('.layer-expand').forEach(el => {
            el.classList.remove('fa-chevron-right');
            el.classList.add('fa-chevron-down');
        });
    });
    
    // 折叠全部
    document.getElementById('btn-collapse-all').addEventListener('click', () => {
        document.querySelectorAll('.layer-children').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.layer-expand').forEach(el => {
            el.classList.remove('fa-chevron-down');
            el.classList.add('fa-chevron-right');
        });
    });
    
    // 开始切图
    btnStartCut.addEventListener('click', startCutting);
}

/**
 * 初始化图层控制
 */
function initLayerControls() {
    // 这些功能可以后续扩展
}

/**
 * 选中所有图层
 * @param {Array} layers - 图层数组
 */
function selectAllLayers(layers) {
    layers.forEach(layer => {
        if (layer.visible !== false && layer.type !== 'group') {
            selectedLayers.add(layer.id);
        }
        if (layer.children) {
            selectAllLayers(layer.children);
        }
    });
}

/**
 * 更新所有图层样式
 */
function updateAllLayerStyles() {
    document.querySelectorAll('.layer-item').forEach(item => {
        const layerId = item.dataset.layerId;
        if (selectedLayers.has(layerId)) {
            item.classList.add('selected');
        } else {
            item.classList.remove('selected');
        }
    });
}

/**
 * 开始切图
 */
async function startCutting() {
    if (selectedLayers.size === 0) {
        showToast('请至少选择一个图层', 'error');
        return;
    }
    
    // 获取设置
    const settings = {
        format: document.getElementById('output-format').value,
        jpgQuality: parseFloat(document.getElementById('jpg-quality').value),
        autoCrop: document.getElementById('auto-crop').checked,
        includeHidden: document.getElementById('include-hidden').checked,
        usePrefix: document.getElementById('use-prefix').checked,
        groupSubdir: document.getElementById('group-subdir').checked,
        minSizeFilter: document.getElementById('min-size-filter').checked,
        padding: parseInt(document.getElementById('padding').value) || 0
    };
    
    // 显示进度
    const progressSection = document.getElementById('cutting-progress');
    const progressBar = document.getElementById('cutting-progress-bar');
    const progressStatus = document.getElementById('cutting-status');
    
    progressSection.classList.remove('hidden');
    btnStartCut.disabled = true;
    btnStartCut.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>切图中...';
    
    try {
        // 准备请求数据
        const selectedLayerIds = Array.from(selectedLayers);
        
        // 发送切图请求
        const response = await fetch('https://aitoolkit-six.vercel.app/api/psd-parse', {
            method: 'POST',
            body: JSON.stringify({
                action: 'cut',
                fileName: psdData.name,
                selectedLayers: selectedLayerIds,
                settings: settings
            }),
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('切图失败');
        }
        
        // 获取ZIP文件
        const blob = await response.blob();
        
        // 下载文件
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = psdData.name.replace('.psd', '_sliced.zip');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        showToast('切图完成，已开始下载', 'success');
        
    } catch (error) {
        console.error('切图错误:', error);
        showToast('切图失败，请重试', 'error');
    } finally {
        progressSection.classList.add('hidden');
        btnStartCut.disabled = false;
        btnStartCut.innerHTML = '<i class="fas fa-cut mr-2"></i>开始切图';
    }
}

/**
 * 获取所有图层ID（扁平化）
 * @param {Array} layers - 图层数组
 * @returns {Array} 图层ID数组
 */
function flattenLayerIds(layers) {
    let ids = [];
    layers.forEach(layer => {
        if (layer.type !== 'group') {
            ids.push(layer.id);
        }
        if (layer.children) {
            ids = ids.concat(flattenLayerIds(layer.children));
        }
    });
    return ids;
}

/**
 * 查找图层通过ID
 * @param {Array} layers - 图层数组
 * @param {string} id - 图层ID
 * @returns {Object|null}
 */
function findLayerById(layers, id) {
    for (const layer of layers) {
        if (layer.id === id) return layer;
        if (layer.children) {
            const found = findLayerById(layer.children, id);
            if (found) return found;
        }
    }
    return null;
}

// 导出函数供全局使用
window.psdData = psdData;
window.selectedLayers = selectedLayers;
