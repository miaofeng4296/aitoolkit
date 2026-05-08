/**
 * AI润色工具 - 前端逻辑
 * 调用后端API实现文本润色功能
 */

// 状态管理
let state = {
    inputText: '',
    polishMode: 'academic',
    quota: 20,
    isGenerating: false
};

// API地址
const API_URL = 'https://aitoolkit-six.vercel.app/api/text-polish';

/**
 * 初始化
 */
document.addEventListener('DOMContentLoaded', function() {
    initInputHandler();
    initModeSelector();
    initPolishButton();
    initOperations();
    initThemeToggle();
    initMobileMenu();
    restoreQuota();
});

/**
 * 初始化输入处理
 */
function initInputHandler() {
    const inputText = document.getElementById('input-text');
    const charCount = document.getElementById('char-count');
    
    inputText.addEventListener('input', () => {
        const text = inputText.value;
        charCount.textContent = text.length;
        state.inputText = text;
        
        // 限制字数
        if (text.length > 2000) {
            inputText.value = text.slice(0, 2000);
            charCount.textContent = 2000;
        }
    });
}

/**
 * 初始化模式选择
 */
function initModeSelector() {
    const modeRadios = document.querySelectorAll('input[name="polish-mode"]');
    
    modeRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            state.polishMode = e.target.value;
        });
    });
}

/**
 * 初始化润色按钮
 */
function initPolishButton() {
    document.getElementById('btn-polish').addEventListener('click', polishText);
}

/**
 * 润色文本
 */
async function polishText() {
    if (state.isGenerating) return;
    
    const text = state.inputText.trim();
    
    if (!text) {
        showToast('请输入需要润色的文本', 'error');
        return;
    }
    
    if (state.quota <= 0) {
        showToast('今日免费次数已用完，请明天再来', 'error');
        return;
    }
    
    // 显示加载状态
    state.isGenerating = true;
    document.getElementById('loading-section').classList.remove('hidden');
    document.getElementById('result-placeholder').classList.add('hidden');
    document.getElementById('result-content').classList.add('hidden');
    document.getElementById('btn-polish').disabled = true;
    
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: text,
                mode: state.polishMode
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || '润色失败');
        }
        
        const data = await response.json();
        
        // 显示结果
        document.getElementById('result-text').textContent = data.result;
        document.getElementById('loading-section').classList.add('hidden');
        document.getElementById('result-content').classList.remove('hidden');
        document.getElementById('btn-copy').classList.remove('hidden');
        
        // 扣除额度
        state.quota--;
        saveQuota();
        updateQuotaDisplay();
        
        showToast('润色成功！', 'success');
        
    } catch (error) {
        console.error('润色错误:', error);
        showToast(error.message || '润色失败，请重试', 'error');
        document.getElementById('loading-section').classList.add('hidden');
        document.getElementById('result-placeholder').classList.remove('hidden');
    } finally {
        state.isGenerating = false;
        document.getElementById('btn-polish').disabled = false;
    }
}

/**
 * 初始化操作按钮
 */
function initOperations() {
    document.getElementById('btn-copy').addEventListener('click', copyResult);
}

/**
 * 复制结果
 */
function copyResult() {
    const resultText = document.getElementById('result-text').textContent;
    
    if (!resultText) {
        showToast('没有可复制的内容', 'error');
        return;
    }
    
    navigator.clipboard.writeText(resultText).then(() => {
        showToast('结果已复制到剪贴板', 'success');
    }).catch(() => {
        showToast('复制失败，请手动复制', 'error');
    });
}

/**
 * 保存额度
 */
function saveQuota() {
    const today = new Date().toDateString();
    localStorage.setItem('polish-quota-date', today);
    localStorage.setItem('polish-quota', state.quota);
}

/**
 * 恢复额度
 */
function restoreQuota() {
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('polish-quota-date');
    
    if (savedDate !== today) {
        state.quota = 20;
        saveQuota();
    } else {
        state.quota = parseInt(localStorage.getItem('polish-quota')) || 20;
    }
    
    updateQuotaDisplay();
}

/**
 * 更新额度显示
 */
function updateQuotaDisplay() {
    const quotaElement = document.querySelector('.bg-green-100 .strong');
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
