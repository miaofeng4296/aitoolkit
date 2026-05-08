/**
 * AI换背景工具 - 前端逻辑
 * 处理图片上传、AI去背景、背景合成等功能
 */

// 状态管理
let state = {
    originalImage: null,
    removedBgImage: null,
    currentBgType: 'solid',
    currentBgColor: '#FF6B6B',
    currentBgImage: null,
    quota: 50
};

// DOM元素
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const bgFileInput = document.getElementById('bg-file-input');
const bgUploadZone = document.getElementById('bg-upload-zone');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const resultSection = document.getElementById('result-section');

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initUploadZone();
    initBgUploadZone();
    initBgSelector();
    initOperations();
    initThemeToggle();
    initMobileMenu();
    restoreQuota();
});

/**
 * 初始化上传区域
 */
function initUploadZone() {
    uploadZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });
    
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
 * 初始化背景图上传区域
 */
function initBgUploadZone() {
    bgUploadZone.addEventListener('click', () => bgFileInput.click());
    
    bgFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleBgImageUpload(e.target.files[0]);
        }
    });
}

/**
 * 处理背景图上传
 */
async function handleBgImageUpload(file) {
    try {
        const dataUrl = await readFileAsDataURL(file);
        state.currentBgType = 'image';
        state.currentBgImage = dataUrl;
        updatePreview();
        showToast('背景图已应用', 'success');
    } catch (error) {
        showToast('背景图上传失败', 'error');
    }
}

/**
 * 处理文件上传
 */
async function handleFileUpload(file) {
    if (!validateFileType(file, ['.jpg', '.jpeg', '.png', '.webp'])) {
        return;
    }
    
    if (!validateFileSize(file, 10)) {
        return;
    }
    
    if (state.quota <= 0) {
        showToast('本月免费额度已用完，请下月再试', 'error');
        return;
    }
    
    uploadSection.classList.add('hidden');
    loadingSection.classList.remove('hidden');
    
    try {
        const originalDataUrl = await readFileAsDataURL(file);
        state.originalImage = originalDataUrl;
        document.getElementById('original-image').src = originalDataUrl;
        
        // 调用去背景API
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch('https://aitoolkit-six.vercel.app/api/remove-bg', {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '处理失败');
        }
        
        const blob = await response.blob();
        const resultDataUrl = await blobToDataURL(blob);
        state.removedBgImage = resultDataUrl;
        
        // 初始化背景色
        updatePreview();
        
        loadingSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
        
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
 * 更新预览
 */
function updatePreview() {
    if (!state.removedBgImage) return;
    
    const resultPreview = document.getElementById('result-preview');
    const resultImage = document.getElementById('result-image');
    
    // 创建Canvas合成图片
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // 绘制背景
        if (state.currentBgType === 'solid') {
            ctx.fillStyle = state.currentBgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (state.currentBgType === 'gradient') {
            const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
            gradient.addColorStop(0, '#667eea');
            gradient.addColorStop(1, '#764ba2');
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        } else if (state.currentBgType === 'image' && state.currentBgImage) {
            const bgImg = new Image();
            bgImg.onload = () => {
                ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                resultImage.src = canvas.toDataURL('image/png');
            };
            bgImg.src = state.currentBgImage;
            return;
        }
        
        // 绘制主体图片
        ctx.drawImage(img, 0, 0);
        resultImage.src = canvas.toDataURL('image/png');
    };
    
    img.src = state.removedBgImage;
}

/**
 * 初始化背景选择器
 */
function initBgSelector() {
    const colorOptions = document.querySelectorAll('.color-option');
    
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            const bgType = option.dataset.bgType;
            const color = option.dataset.color;
            
            state.currentBgType = bgType;
            state.currentBgColor = color;
            state.currentBgImage = null;
            
            // 更新选中状态
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            
            updatePreview();
        });
    });
    
    // 自定义颜色
    document.getElementById('custom-color').addEventListener('input', (e) => {
        document.getElementById('custom-color-text').value = e.target.value;
    });
    
    document.getElementById('custom-color-text').addEventListener('input', (e) => {
        const color = e.target.value;
        if (/^#[0-9A-Fa-f]{6}$/.test(color)) {
            document.getElementById('custom-color').value = color;
        }
    });
    
    document.getElementById('btn-apply-color').addEventListener('click', () => {
        const color = document.getElementById('custom-color').value;
        state.currentBgType = 'solid';
        state.currentBgColor = color;
        state.currentBgImage = null;
        
        document.querySelectorAll('.color-option').forEach(o => o.classList.remove('selected'));
        updatePreview();
    });
}

/**
 * 初始化操作按钮
 */
function initOperations() {
    document.getElementById('btn-download').addEventListener('click', downloadImage);
    document.getElementById('btn-new-image').addEventListener('click', resetUploader);
}

/**
 * 下载图片
 */
function downloadImage() {
    const resultImage = document.getElementById('result-image');
    if (!resultImage.src) {
        showToast('没有可下载的图片', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = 'ai-change-bg-result.png';
    link.click();
    
    showToast('图片已下载', 'success');
}

/**
 * 重置上传器
 */
function resetUploader() {
    uploadSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    fileInput.value = '';
    bgFileInput.value = '';
    state.originalImage = null;
    state.removedBgImage = null;
    state.currentBgImage = null;
    state.currentBgType = 'solid';
    state.currentBgColor = '#FF6B6B';
}

/**
 * 读取文件为DataURL
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
 * 验证文件类型
 */
function validateFileType(file, allowedTypes) {
    const fileName = file.name.toLowerCase();
    const isValid = allowedTypes.some(type => fileName.endsWith(type));
    
    if (!isValid) {
        showToast(`不支持的文件格式，请上传 ${allowedTypes.join(', ')} 格式`, 'error');
    }
    
    return isValid;
}

/**
 * 验证文件大小
 */
function validateFileSize(file, maxSizeMB) {
    const isValid = file.size <= maxSizeMB * 1024 * 1024;
    
    if (!isValid) {
        showToast(`文件大小不能超过 ${maxSizeMB}MB`, 'error');
    }
    
    return isValid;
}

/**
 * 保存额度
 */
function saveQuota() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    localStorage.setItem('change-bg-quota-month', monthKey);
    localStorage.setItem('change-bg-quota', state.quota);
}

/**
 * 恢复额度
 */
function restoreQuota() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const savedMonth = localStorage.getItem('change-bg-quota-month');
    
    if (savedMonth !== monthKey) {
        state.quota = 50;
        saveQuota();
    } else {
        state.quota = parseInt(localStorage.getItem('change-bg-quota')) || 50;
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

/**
 * 显示Toast消息
 */
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

/**
 * 初始化主题切换
 */
function initThemeToggle() {
    const toggleBtn = document.getElementById('theme-toggle');
    
    if (localStorage.theme === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
    
    toggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        localStorage.theme = document.documentElement.classList.contains('dark') ? 'dark' : 'light';
    });
}

/**
 * 初始化移动端菜单
 */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    menuBtn.addEventListener('click', () => {
        mobileMenu.classList.toggle('hidden');
    });
}
