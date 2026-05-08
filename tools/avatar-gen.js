/**
 * AI头像生成工具 - 前端逻辑
 * 使用 Pollinations.ai 免费API 生成头像
 */

// 状态管理
let state = {
    currentStyle: 'realistic',
    currentPrompt: '',
    currentStyleText: '写实',
    generatedImage: null
};

// Pollinations API URL
const POLLINATIONS_API = 'https://image.pollinations.ai/prompt';

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initStyleSelector();
    initGenerateButton();
    initTemplateButtons();
    initOperations();
    initThemeToggle();
    initMobileMenu();
});

/**
 * 初始化风格选择器
 */
function initStyleSelector() {
    const styleOptions = document.querySelectorAll('.style-option');
    
    styleOptions.forEach(option => {
        option.addEventListener('click', () => {
            state.currentStyle = option.dataset.style;
            state.currentPrompt = option.dataset.prompt || '';
            
            // 更新选中状态
            styleOptions.forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            
            // 更新描述输入
            if (state.currentPrompt) {
                document.getElementById('prompt-input').value = state.currentPrompt;
            }
        });
    });
}

/**
 * 初始化生成按钮
 */
function initGenerateButton() {
    document.getElementById('btn-generate').addEventListener('click', generateAvatar);
}

/**
 * 初始化模板按钮
 */
function initTemplateButtons() {
    const templateBtns = document.querySelectorAll('.template-btn');
    
    templateBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            const prompt = btn.dataset.prompt;
            
            // 更新选择
            document.querySelectorAll('.style-option').forEach(o => {
                o.classList.remove('selected');
                if (o.dataset.style === style) {
                    o.classList.add('selected');
                }
            });
            
            state.currentStyle = style;
            state.currentPrompt = prompt;
            document.getElementById('prompt-input').value = prompt;
            
            // 自动生成
            generateAvatar();
        });
    });
}

/**
 * 生成头像
 */
function generateAvatar() {
    const prompt = document.getElementById('prompt-input').value.trim();
    
    if (!prompt) {
        showToast('请输入头像描述', 'error');
        return;
    }
    
    // 获取风格提示词
    const styleOption = document.querySelector(`.style-option[data-style="${state.currentStyle}"]`);
    const stylePrompt = styleOption ? styleOption.dataset.prompt : '';
    
    // 组合完整提示词
    const fullPrompt = `${prompt}, ${stylePrompt}, high quality, detailed`;
    
    // 显示加载状态
    document.getElementById('loading-section').classList.remove('hidden');
    document.getElementById('result-section').classList.add('hidden');
    
    // 构建 API URL
    const encodedPrompt = encodeURIComponent(fullPrompt);
    const apiUrl = `${POLLINATIONS_API}/${encodedPrompt}?width=512&height=512&nologo=true`;
    
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
        document.getElementById('result-style').textContent = getStyleText(state.currentStyle);
        
        document.getElementById('loading-section').classList.add('hidden');
        document.getElementById('result-section').classList.remove('hidden');
        
        showToast('头像生成成功！', 'success');
    };
    
    img.onerror = () => {
        clearTimeout(timeout);
        showToast('生成失败，请重试', 'error');
        document.getElementById('loading-section').classList.add('hidden');
    };
    
    img.src = apiUrl;
}

/**
 * 获取风格文本
 */
function getStyleText(style) {
    const styleTexts = {
        'realistic': '写实风格',
        'anime': '动漫风格',
        '3d': '3D风格',
        'pixel': '像素风格',
        'watercolor': '水彩风格',
        'oil': '油画风格',
        'cyberpunk': '赛博朋克风格',
        'fantasy': '奇幻风格',
        'minimalist': '极简风格',
        'vintage': '复古风格'
    };
    return styleTexts[style] || style;
}

/**
 * 初始化操作按钮
 */
function initOperations() {
    document.getElementById('btn-download').addEventListener('click', downloadImage);
    document.getElementById('btn-regenerate').addEventListener('click', generateAvatar);
    document.getElementById('btn-new').addEventListener('click', resetForm);
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
        link.download = `ai-avatar-${state.currentStyle}-${Date.now()}.png`;
        link.click();
        
        showToast('头像已下载', 'success');
    };
    
    img.onerror = () => {
        // 降级处理：直接下载原图
        const link = document.createElement('a');
        link.href = state.generatedImage;
        link.download = `ai-avatar-${state.currentStyle}-${Date.now()}.png`;
        link.target = '_blank';
        link.click();
        
        showToast('已开始下载，请在浏览器中查看', 'info');
    };
    
    img.src = state.generatedImage;
}

/**
 * 重置表单
 */
function resetForm() {
    document.getElementById('prompt-input').value = '';
    document.getElementById('result-section').classList.add('hidden');
    state.generatedImage = null;
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
