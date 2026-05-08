/**
 * AI表情包生成工具 - 前端逻辑
 * 使用 Pollinations.ai 免费API 生成表情包
 */

// 状态管理
let state = {
    currentPrompt: '',
    selectedSize: 512,
    generatedImage: null
};

// Pollinations API URL
const POLLINATIONS_API = 'https://image.pollinations.ai/prompt';

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initTemplateButtons();
    initGenerateButton();
    initSizeSelector();
    initOperations();
    initThemeToggle();
    initMobileMenu();
});

/**
 * 初始化模板按钮
 */
function initTemplateButtons() {
    const templateBtns = document.querySelectorAll('.template-btn');
    
    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const prompt = btn.dataset.prompt;
            
            // 更新选中状态
            templateBtns.forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            
            // 更新输入框
            state.currentPrompt = prompt;
            document.getElementById('prompt-input').value = prompt;
        });
    });
    
    // 输入框变化时清除模板选中
    document.getElementById('prompt-input').addEventListener('input', (e) => {
        if (e.target.value.trim()) {
            templateBtns.forEach(b => b.classList.remove('selected'));
            state.currentPrompt = e.target.value.trim();
        }
    });
}

/**
 * 初始化尺寸选择
 */
function initSizeSelector() {
    const sizeRadios = document.querySelectorAll('input[name="size"]');
    
    sizeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.selectedSize = parseInt(e.target.value);
        });
    });
}

/**
 * 初始化生成按钮
 */
function initGenerateButton() {
    document.getElementById('btn-generate').addEventListener('click', generateEmoji);
}

/**
 * 生成表情包
 */
function generateEmoji() {
    const prompt = document.getElementById('prompt-input').value.trim();
    
    if (!prompt) {
        showToast('请选择模板或输入描述', 'error');
        return;
    }
    
    state.currentPrompt = prompt;
    
    // 显示加载状态
    document.getElementById('loading-section').classList.remove('hidden');
    document.getElementById('result-section').classList.add('hidden');
    
    // 构建 API URL
    const encodedPrompt = encodeURIComponent(prompt);
    const apiUrl = `${POLLINATIONS_API}/${encodedPrompt}?width=${state.selectedSize}&height=${state.selectedSize}&nologo=true`;
    
    // 预加载图片
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    // 超时处理
    const timeout = setTimeout(() => {
        showToast('生成超时，请重试', 'error');
        document.getElementById('loading-section').classList.add('hidden');
    }, 60000);
    
    img.onload = () => {
        clearTimeout(timeout);
        state.generatedImage = apiUrl;
        
        document.getElementById('result-image').src = apiUrl;
        document.getElementById('result-size').textContent = `${state.selectedSize}×${state.selectedSize}`;
        
        document.getElementById('loading-section').classList.add('hidden');
        document.getElementById('result-section').classList.remove('hidden');
        
        showToast('表情包生成成功！', 'success');
    };
    
    img.onerror = () => {
        clearTimeout(timeout);
        showToast('生成失败，请重试', 'error');
        document.getElementById('loading-section').classList.add('hidden');
    };
    
    img.src = apiUrl;
}

/**
 * 初始化操作按钮
 */
function initOperations() {
    document.getElementById('btn-download').addEventListener('click', downloadImage);
    document.getElementById('btn-share').addEventListener('click', copyLink);
    document.getElementById('btn-regenerate').addEventListener('click', generateEmoji);
}

/**
 * 下载图片
 */
function downloadImage() {
    if (!state.generatedImage) {
        showToast('没有可下载的图片', 'error');
        return;
    }
    
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `ai-emoji-${Date.now()}.png`;
        link.click();
        
        showToast('表情包已下载', 'success');
    };
    
    img.onerror = () => {
        // 降级处理
        const link = document.createElement('a');
        link.href = state.generatedImage;
        link.download = `ai-emoji-${Date.now()}.png`;
        link.target = '_blank';
        link.click();
        
        showToast('已开始下载', 'info');
    };
    
    img.src = state.generatedImage;
}

/**
 * 复制链接
 */
function copyLink() {
    if (!state.generatedImage) {
        showToast('没有可分享的链接', 'error');
        return;
    }
    
    // 复制生成链接（包含prompt的链接可以复现）
    const textArea = document.createElement('textarea');
    textArea.value = state.generatedImage;
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
        document.execCommand('copy');
        showToast('链接已复制到剪贴板', 'success');
    } catch (err) {
        showToast('复制失败，请手动复制', 'error');
    }
    
    document.body.removeChild(textArea);
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
