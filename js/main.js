/**
 * AI智能工具箱 - 主脚本
 * 处理首页的交互逻辑
 */

// DOM 加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化主题切换
    initThemeToggle();
    
    // 初始化移动端菜单
    initMobileMenu();
    
    // 初始化搜索功能
    initSearch();
    
    // 初始化滚动动画
    initScrollAnimations();
    
    // 初始化平滑滚动
    initSmoothScroll();
});

/**
 * 主题切换功能
 */
function initThemeToggle() {
    const themeToggle = document.getElementById('theme-toggle');
    const html = document.documentElement;
    
    // 检查本地存储或系统偏好
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
        html.classList.add('dark');
    }
    
    // 切换主题
    themeToggle.addEventListener('click', function() {
        html.classList.toggle('dark');
        const isDark = html.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
}

/**
 * 移动端菜单
 */
function initMobileMenu() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    menuBtn.addEventListener('click', function() {
        mobileMenu.classList.toggle('hidden');
        mobileMenu.classList.toggle('show');
        
        // 切换图标
        const icon = menuBtn.querySelector('i');
        if (mobileMenu.classList.contains('show')) {
            icon.classList.remove('fa-bars');
            icon.classList.add('fa-times');
        } else {
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        }
    });
    
    // 点击菜单项后关闭菜单
    mobileMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.add('hidden');
            mobileMenu.classList.remove('show');
            const icon = menuBtn.querySelector('i');
            icon.classList.remove('fa-times');
            icon.classList.add('fa-bars');
        });
    });
}

/**
 * 搜索功能
 */
function initSearch() {
    const searchInput = document.getElementById('search-input');
    const toolCards = document.querySelectorAll('.tool-card');
    
    searchInput.addEventListener('input', function() {
        const query = this.value.toLowerCase().trim();
        
        toolCards.forEach(card => {
            const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
            const desc = card.querySelector('p')?.textContent.toLowerCase() || '';
            const section = card.closest('section');
            const sectionTitle = section?.querySelector('h2')?.textContent.toLowerCase() || '';
            
            // 检查是否匹配搜索词
            const matches = title.includes(query) || 
                           desc.includes(query) || 
                           sectionTitle.includes(query);
            
            // 显示/隐藏卡片
            if (matches || query === '') {
                card.style.display = '';
                card.style.animation = 'fadeIn 0.3s ease';
            } else {
                card.style.display = 'none';
            }
        });
        
        // 显示/隐藏分类区块
        document.querySelectorAll('section[id]').forEach(section => {
            const visibleCards = section.querySelectorAll('.tool-card:not([style*="display: none"])');
            const adPlaceholder = section.querySelector('.ad-placeholder');
            
            if (visibleCards.length > 0) {
                section.style.display = '';
            } else {
                section.style.display = 'none';
            }
            
            // 同步隐藏/显示广告位
            if (adPlaceholder) {
                adPlaceholder.style.display = section.style.display;
            }
        });
    });
}

/**
 * 滚动动画
 */
function initScrollAnimations() {
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-fadeInUp');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);
    
    // 观察工具卡片
    document.querySelectorAll('.tool-card').forEach(card => {
        card.style.opacity = '0';
        observer.observe(card);
    });
    
    // 添加淡入上移动画
    const style = document.createElement('style');
    style.textContent = `
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(20px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        .animate-fadeInUp {
            animation: fadeInUp 0.5s ease forwards;
        }
    `;
    document.head.appendChild(style);
}

/**
 * 平滑滚动到锚点
 */
function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const target = document.querySelector(targetId);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                
                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });
}

/**
 * 显示Toast通知
 * @param {string} message - 通知消息
 * @param {string} type - 通知类型：success, error, info
 * @param {number} duration - 显示时长（毫秒）
 */
function showToast(message, type = 'info', duration = 3000) {
    // 移除已存在的toast
    const existingToast = document.querySelector('.toast');
    if (existingToast) {
        existingToast.remove();
    }
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// 添加滑出动画
const toastStyle = document.createElement('style');
toastStyle.textContent = `
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(toastStyle);

/**
 * 文件大小格式化
 * @param {number} bytes - 字节数
 * @returns {string} 格式化后的大小
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * 复制文本到剪贴板
 * @param {string} text - 要复制的文本
 * @returns {Promise<boolean>} 是否成功
 */
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        showToast('已复制到剪贴板', 'success');
        return true;
    } catch (err) {
        showToast('复制失败，请手动复制', 'error');
        return false;
    }
}

/**
 * 下载文件
 * @param {string} url - 文件URL
 * @param {string} filename - 文件名
 */
function downloadFile(url, filename) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

/**
 * 限制文件大小
 * @param {File} file - 文件对象
 * @param {number} maxSizeMB - 最大大小（MB）
 * @returns {boolean} 是否通过验证
 */
function validateFileSize(file, maxSizeMB) {
    const maxSize = maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
        showToast(`文件大小不能超过 ${maxSizeMB}MB`, 'error');
        return false;
    }
    return true;
}

/**
 * 限制文件类型
 * @param {File} file - 文件对象
 * @param {string[]} allowedTypes - 允许的类型数组
 * @returns {boolean} 是否通过验证
 */
function validateFileType(file, allowedTypes) {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();
    
    const isValidType = allowedTypes.some(type => {
        if (type.startsWith('.')) {
            return fileName.endsWith(type);
        }
        return fileType === type || fileType.startsWith(type);
    });
    
    if (!isValidType) {
        showToast(`不支持的文件类型，请上传 ${allowedTypes.join(', ')} 格式`, 'error');
        return false;
    }
    return true;
}

// 导出公共函数
window.showToast = showToast;
window.formatFileSize = formatFileSize;
window.copyToClipboard = copyToClipboard;
window.downloadFile = downloadFile;
window.validateFileSize = validateFileSize;
window.validateFileType = validateFileType;
