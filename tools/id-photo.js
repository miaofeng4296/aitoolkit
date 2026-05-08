/**
 * AI证件照工具 - 前端逻辑
 * 处理照片上传、AI去背景、证件照裁剪和底色替换
 */

// 证件照尺寸规格 (单位: px, 300dpi)
const PHOTO_SIZES = {
    '1寸': { width: 295, height: 413, mm: '25×35mm' },
    '2寸': { width: 413, height: 579, mm: '35×49mm' },
    '小2寸': { width: 390, height: 567, mm: '33×48mm' },
    '签证': { width: 390, height: 567, mm: '33×48mm' },
    '驾照': { width: 260, height: 378, mm: '22×32mm' }
};

// 状态管理
let state = {
    originalImage: null,
    removedBgImage: null,
    currentSize: '1寸',
    currentColor: '#FFFFFF',
    quota: 50
};

// DOM元素
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const uploadSection = document.getElementById('upload-section');
const loadingSection = document.getElementById('loading-section');
const settingsSection = document.getElementById('settings-section');
const resultSection = document.getElementById('result-section');

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initUploadZone();
    initSettings();
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
        
        loadingSection.classList.add('hidden');
        settingsSection.classList.remove('hidden');
        
        // 自动应用设置并生成
        generateIdPhoto();
        
        state.quota--;
        saveQuota();
        updateQuotaDisplay();
        
        showToast('照片处理成功！', 'success');
        
    } catch (error) {
        console.error('处理错误:', error);
        showToast(error.message || '处理失败，请重试', 'error');
        resetUploader();
    }
}

/**
 * 初始化设置面板
 */
function initSettings() {
    // 尺寸选择
    document.getElementById('photo-size').addEventListener('change', (e) => {
        state.currentSize = e.target.value;
        generateIdPhoto();
    });
    
    // 底色选择
    const colorOptions = document.querySelectorAll('.color-option');
    colorOptions.forEach(option => {
        option.addEventListener('click', () => {
            state.currentColor = option.dataset.color;
            
            colorOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            
            generateIdPhoto();
        });
    });
    
    // 应用设置按钮
    document.getElementById('btn-apply-settings').addEventListener('click', generateIdPhoto);
}

/**
 * 生成证件照
 */
function generateIdPhoto() {
    if (!state.removedBgImage) return;
    
    const sizeSpec = PHOTO_SIZES[state.currentSize];
    const resultImage = document.getElementById('result-image');
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
        canvas.width = sizeSpec.width;
        canvas.height = sizeSpec.height;
        
        // 绘制背景色
        ctx.fillStyle = state.currentColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 计算居中裁剪
        // 人像通常在图片的中间偏上位置
        const imgAspect = img.width / img.height;
        const canvasAspect = canvas.width / canvas.height;
        
        let drawWidth, drawHeight, drawX, drawY;
        
        if (imgAspect > canvasAspect) {
            // 图片更宽，以高度为准
            drawHeight = img.height;
            drawWidth = img.height * canvasAspect;
            drawX = (img.width - drawWidth) / 2;
            drawY = 0;
        } else {
            // 图片更高，以宽度为准，适当裁剪头部区域
            drawWidth = img.width;
            drawHeight = img.width / canvasAspect;
            // 优先显示头部，占据上2/3
            drawX = 0;
            drawY = img.height * 0.15; // 从头部稍下位置开始
        }
        
        // 绘制主体（去背景后的图片）
        ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
        
        // 如果有透明区域，用背景色填充
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        const bgR = parseInt(state.currentColor.slice(1, 3), 16);
        const bgG = parseInt(state.currentColor.slice(3, 5), 16);
        const bgB = parseInt(state.currentColor.slice(5, 7), 16);
        
        for (let i = 0; i < data.length; i += 4) {
            // 检测透明或接近白色的像素
            if (data[i + 3] < 128) {
                data[i] = bgR;
                data[i + 1] = bgG;
                data[i + 2] = bgB;
                data[i + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        resultImage.src = canvas.toDataURL('image/png');
        
        // 更新显示信息
        document.getElementById('result-size-text').textContent = state.currentSize;
        document.getElementById('result-color-text').textContent = getColorName(state.currentColor);
        
        settingsSection.classList.add('hidden');
        resultSection.classList.remove('hidden');
    };
    
    img.src = state.removedBgImage;
}

/**
 * 获取颜色名称
 */
function getColorName(hex) {
    const colors = {
        '#FFFFFF': '白底',
        '#E53935': '红底',
        '#1E88E5': '蓝底',
        '#43A047': '绿底',
        '#8E24AA': '紫底',
        '#FFB300': '黄底'
    };
    return colors[hex] || '自定义底';
}

/**
 * 初始化操作按钮
 */
function initOperations() {
    document.getElementById('btn-download').addEventListener('click', downloadPhoto);
    document.getElementById('btn-download-pack').addEventListener('click', downloadPhotoPack);
    document.getElementById('btn-new-image').addEventListener('click', resetUploader);
}

/**
 * 下载证件照
 */
function downloadPhoto() {
    const resultImage = document.getElementById('result-image');
    if (!resultImage.src) {
        showToast('没有可下载的图片', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.href = resultImage.src;
    link.download = `证件照_${state.currentSize}_${getColorName(state.currentColor)}.png`;
    link.click();
    
    showToast('证件照已下载', 'success');
}

/**
 * 下载一寸排版（4张）
 */
function downloadPhotoPack() {
    const resultImage = document.getElementById('result-image');
    if (!resultImage.src) {
        showToast('没有可下载的图片', 'error');
        return;
    }
    
    // 创建排版画布（一寸照片排版通常是6寸纸，300dpi下是1800x1200px）
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    // 6寸照片纸尺寸 (6×4英寸, 300dpi)
    canvas.width = 1800;
    canvas.height = 1200;
    
    // 白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    const img = new Image();
    img.onload = () => {
        // 一寸: 295×413px，排列成2×2
        const photoW = 295;
        const photoH = 413;
        const cols = 2;
        const rows = 2;
        const padding = 30;
        
        // 计算每张照片的位置（留边距）
        const startX = (canvas.width - (cols * photoW + (cols - 1) * padding)) / 2;
        const startY = (canvas.height - (rows * photoH + (rows - 1) * padding)) / 2;
        
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const x = startX + col * (photoW + padding);
                const y = startY + row * (photoH + padding);
                ctx.drawImage(img, x, y, photoW, photoH);
            }
        }
        
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `证件照_${state.currentSize}_排版.png`;
        link.click();
        
        showToast('排版证件照已下载', 'success');
    };
    
    img.src = resultImage.src;
}

/**
 * 重置上传器
 */
function resetUploader() {
    uploadSection.classList.remove('hidden');
    loadingSection.classList.add('hidden');
    settingsSection.classList.add('hidden');
    resultSection.classList.add('hidden');
    fileInput.value = '';
    state.originalImage = null;
    state.removedBgImage = null;
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
    localStorage.setItem('id-photo-quota-month', monthKey);
    localStorage.setItem('id-photo-quota', state.quota);
}

/**
 * 恢复额度
 */
function restoreQuota() {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${now.getMonth()}`;
    const savedMonth = localStorage.getItem('id-photo-quota-month');
    
    if (savedMonth !== monthKey) {
        state.quota = 50;
        saveQuota();
    } else {
        state.quota = parseInt(localStorage.getItem('id-photo-quota')) || 50;
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
