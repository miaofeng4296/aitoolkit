/**
 * AI去背景工具 - 前端逻辑
 * 处理图片上传、AI去背景、背景色更换等功能
 */

// 状态管理
let state = {
    originalImage: null,
    resultImage: null,
    currentView: 'compare', // compare | single
    currentBgColor: 'transparent',
    quota: 50 // 本月剩余额度
};

// DOM元素
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');
const bgColorPanel = document.getElementById('bg-color-panel');

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initUploadZone();
    initOperations();
    initBgColorPanel();
    initThemeToggle();
    initMobileMenu();
    
    // 从本地存储恢复额度
    restoreQuota();
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
}

/**
 * 处理文件上传
 * @param {File} file - 上传的文件
 */
async function handleFileUpload(file) {
    // 验证文件类型
    if (!validateFileType(file, ['.jpg', '.jpeg', '.png', '.webp'])) {
        return;
    }
    
    // 验证文件大小 (10MB限制)
    if (!validateFileSize(file, 10)) {
        return;
    }
    
    // 检查额度
    if (state.quota <= 0) {
        showToast('本月免费额度已用完，请下月再试或升级服务', 'error');
        return;
    }
    
    // 显示加载状态
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    try {
        // 读取原图
        const originalDataUrl = await readFileAsDataURL(file);
        state.originalImage = originalDataUrl;
        
        // 显示原图
        document.getElementById('original-image').src = originalDataUrl;
        
        // 发送到后端处理
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('/api/remove-bg', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '处理失败');
        }
        
        // 获取结果图片
        const blob = await response.blob();
        const resultDataUrl = await blobToDataURL(blob);
        state.resultImage = resultDataUrl;
        
        // 显示结果
        document.getElementById('result-image').src = resultDataUrl;
        document.getElementById('single-result-image').src = resultDataUrl;
        
        // 隐藏加载，显示结果
        loadingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        
        // 扣除额度
        state.quota--;
        saveQuota();
        updateQuotaDisplay();
        
        showToast('处理成功！', 'success');
        
    } catch (error) {
        console.error('处理错误:', error);
        showToast(error.message || '处理失败，请重试', 'error');
        resetUploader();
    }
}

/**
 * 读取文件为DataURL
 * @param {File} file - 文件对象
 * @returns {Promise<string>}
 */
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Blob转DataURL
 * @param {Blob} blob - Blob对象
 * @returns {Promise<string>}
 */
function blobToDataURL(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * 重置上传器
 */
function resetUploader() {
    uploadSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    bgColorPanel.classList.add('hidden');
    fileInput.value = '';
    state.originalImage = null;
    state.resultImage = null;
}

/**
 * 初始化操作按钮
 */
function initOperations() {
    // 下载按钮
    document.getElementById('btn-download').addEventListener('click', downloadImage);
    
    // 更换背景色按钮
    document.getElementById('btn-change-bg').addEventListener('click', toggleBgColorPanel);
    
    // 对比视图按钮
    document.getElementById('btn-compare').addEventListener('click', () => {
        state.currentView = 'compare';
        updateView();
    });
    
    // 处理新图片按钮
    document.getElementById('btn-new-image').addEventListener('click', resetUploader);
}

/**
 * 下载图片
 */
function downloadImage() {
    if (!state.resultImage) {
        showToast('没有可下载的图片', 'error');
        return;
    }
    
    // 如果有背景色，先合成再下载
    if (state.currentBgColor !== 'transparent') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            
            // 绘制背景
            if (state.currentBgColor === 'gradient') {
                const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
                gradient.addColorStop(0, '#3b82f6');
                gradient.addColorStop(1, '#a855f7');
                ctx.fillStyle = gradient;
            } else {
                ctx.fillStyle = state.currentBgColor;
            }
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 绘制图片
            ctx.drawImage(img, 0, 0);
            
            // 下载
            const link = document.createElement('a');
            link.href = canvas.toDataURL('image/png');
            link.download = 'remove-bg-result.png';
            link.click();
            
            showToast('图片已下载', 'success');
        };
        
        img.src = state.resultImage;
    } else {
        // 直接下载透明PNG
        const link = document.createElement('a');
        link.href = state.resultImage;
        link.download = 'remove-bg-result.png';
        link.click();
        
        showToast('图片已下载', 'success');
    }
}

/**
 * 切换背景色面板
 */
function toggleBgColorPanel() {
    bgColorPanel.classList.toggle('hidden');
}

/**
 * 初始化背景色面板
 */
function initBgColorPanel() {
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const color = option.dataset.color;
            applyBgColor(color);
            
            // 更新选中状态
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
        });
    });
    
    // 自定义颜色文本输入
    document.getElementById('custom-color-text').addEventListener('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            document.getElementById('custom-color').value = color;
        }
    });
    
    // 自定义颜色选择器
    document.getElementById('custom-color').addEventListener('input', (e) => {
        document.getElementById('custom-color-text').value = e.target.value;
    });
    
    // 应用自定义颜色
    document.getElementById('btn-apply-color').addEventListener('click', () => {
        const color = document.getElementById('custom-color').value;
        applyBgColor(color);
        
        // 更新选中状态
        colorOptions.forEach(o => o.classList.remove('selected'));
    });
}

/**
 * 应用背景色
 * @param {string} color - 颜色值
 */
function applyBgColor(color) {
    state.currentBgColor = color;
    
    const resultImage = document.getElementById('result-image');
    const singleResultImage = document.getElementById('single-result-image');
    const previewBox = document.getElementById('result-preview-box');
    
    if (color === 'transparent') {
        // 透明背景（通过棋盘格显示）
        resultImage.style.background = 'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)';
        resultImage.style.backgroundSize = '20px 20px';
        resultImage.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        
        singleResultImage.style.background = 'linear-gradient(45deg, #ddd 25%, transparent 25%), linear-gradient(-45deg, #ddd 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ddd 75%), linear-gradient(-45deg, transparent 75%, #ddd 75%)';
        singleResultImage.style.backgroundSize = '20px 20px';
        singleResultImage.style.backgroundPosition = '0 0, 0 10px, 10px -10px, -10px 0px';
        
        previewBox.style.background = 'transparent';
    } else if (color === 'gradient') {
        // 渐变背景
        resultImage.style.background = 'linear-gradient(135deg, #3b82f6, #a855f7)';
        resultImage.style.backgroundSize = 'cover';
        
        singleResultImage.style.background = 'linear-gradient(135deg, #3b82f6, #a855f7)';
        singleResultImage.style.backgroundSize = 'cover';
        
        previewBox.style.background = 'transparent';
    } else {
        // 纯色背景
        resultImage.style.background = color;
        singleResultImage.style.background = color;
        previewBox.style.background = 'transparent';
    }
    
    showToast(`已应用背景色`, 'success');
}

/**
 * 更新视图模式
 */
function updateView() {
    const previewContainer = document.getElementById('preview-container');
    const singlePreviewContainer = document.getElementById('single-preview-container');
    
    if (state.currentView === 'compare') {
        previewContainer.classList.remove('hidden');
        singlePreviewContainer.classList.add('hidden');
    } else {
        previewContainer.classList.add('hidden');
        singlePreviewContainer.classList.remove('hidden');
    }
}

/**
 * 保存额度到本地存储
 */
function saveQuota() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    localStorage.setItem('remove-bg-quota-month', monthKey);
    localStorage.setItem('remove-bg-quota', state.quota);
}

/**
 * 从本地存储恢复额度
 */
function restoreQuota() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const savedMonth = localStorage.getItem('remove-bg-quota-month');
    
    if (savedMonth !== monthKey) {
        // 新月份，重置额度
        state.quota = 50;
        saveQuota();
    } else {
        state.quota = parseInt(localStorage.getItem('remove-bg-quota')) || 50;
    }
    
    updateQuotaDisplay();
}

/**
 * 更新额度显示
 */
function updateQuotaDisplay() {
    const quotaElement = document.getElementById('quota-count');
    if (quotaElement) {
        quotaElement.textContent = state.quota;
    }
}

// 导出状态供全局使用
window.state = state;
