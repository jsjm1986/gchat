// 登录验证相关
const loginContainer = document.getElementById('loginContainer');
const appWrapper = document.getElementById('appWrapper');
const projectName = document.getElementById('projectName');
const projectUrl = document.getElementById('projectUrl');
const loginButton = document.getElementById('loginButton');
const loginError = document.getElementById('loginError');

// 验证信息
const validProjectName = '全民潮AI创至联盟';
const validProjectUrl = 'cy.waryts.com';

// 检查是否已登录
function checkLogin() {
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    if (isLoggedIn === 'true') {
        showApp();
    }
}

// 显示应用界面
function showApp() {
    loginContainer.style.display = 'none';
    appWrapper.style.display = 'block';
}

// 登录验证
function handleLogin() {
    const name = projectName.value.trim().replace(/\s+/g, '');
    let url = projectUrl.value.trim().toLowerCase();
    
    url = url.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');

    if (!name || !url) {
        loginError.textContent = '请填写完整信息';
        return;
    }

    if (name !== validProjectName.replace(/\s+/g, '') || url !== validProjectUrl) {
        loginError.textContent = '项目信息验证失败';
        // 添加输入框晃动效果
        projectName.classList.add('shake');
        projectUrl.classList.add('shake');
        setTimeout(() => {
            projectName.classList.remove('shake');
            projectUrl.classList.remove('shake');
        }, 500);
        return;
    }

    // 登录成功
    localStorage.setItem('isLoggedIn', 'true');
    showApp();
}

// 添加登录事件监听
loginButton.addEventListener('click', handleLogin);
projectName.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        projectUrl.focus();
    }
});
projectUrl.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleLogin();
    }
});

// 添加输入框晃动动画样式
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
    }
    .shake {
        animation: shake 0.3s ease-in-out;
    }
`;
document.head.appendChild(shakeStyle);

// 页面加载时检查登录状态
checkLogin();

// 使用ES模块导入
import { GoogleGenerativeAI } from '@google/generative-ai';

// 状态变量
let genAI;
let model;
let chatSession;
let selectedText = null;
let currentChatId = null;
let chats = [];

// 从localStorage加载聊天记录
const savedChats = JSON.parse(localStorage.getItem('chats')) || [];

// 获取DOM元素
const chatMessages = document.getElementById('chatMessages');
const userInput = document.getElementById('userInput');
const sendButton = document.getElementById('sendButton');
const settingsButton = document.getElementById('settingsButton');
const settingsPanel = document.getElementById('settingsPanel');
const clearButton = document.getElementById('clearButton');
const exportButton = document.getElementById('exportButton');
const importButton = document.getElementById('importButton');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileContent = document.getElementById('fileContent');
const confirmImport = document.getElementById('confirmImport');
const cancelImport = document.getElementById('cancelImport');
const temperatureInput = document.getElementById('temperatureInput');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokensInput = document.getElementById('maxTokensInput');
const themeSelect = document.getElementById('themeSelect');
const saveSettings = document.getElementById('saveSettings');
const closeSettings = document.getElementById('closeSettings');
const newChatButton = document.getElementById('newChatButton');
const chatList = document.getElementById('chatList');
const chatTitle = document.getElementById('chatTitle');
const editTitleButton = document.getElementById('editTitleButton');
const titleEditDialog = document.getElementById('titleEditDialog');
const titleInput = document.getElementById('titleInput');
const saveTitleButton = document.getElementById('saveTitleButton');
const cancelTitleButton = document.getElementById('cancelTitleButton');
const menuButton = document.getElementById('menuButton');
const sidebar = document.querySelector('.sidebar');
const overlay = document.getElementById('overlay');

// 从localStorage加载设置
const settings = {
    temperature: parseFloat(localStorage.getItem('temperature')) || 0.9,
    maxTokens: parseInt(localStorage.getItem('maxTokens')) || 8192,
    theme: localStorage.getItem('theme') || 'auto'
};

// 配置生成参数
const getGenerationConfig = () => ({
    temperature: settings.temperature,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: settings.maxTokens,
});

// 主题设置
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
}

// 初始化主题
setTheme(settings.theme);
themeSelect.value = settings.theme;

// 生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// 创建新的聊天
function createNewChat() {
    const chatId = generateId();
    const chat = {
        id: chatId,
        title: '新的对话',
        messages: [],
        createdAt: new Date().toISOString()
    };
    chats.unshift(chat);
    saveChats();
    renderChatList();
    switchToChat(chatId);
}

// 保存聊天记录到localStorage
function saveChats() {
    localStorage.setItem('chats', JSON.stringify(chats));
}

// 渲染聊天列表
function renderChatList() {
    chatList.innerHTML = '';
    chats.forEach(chat => {
        const chatItem = document.createElement('div');
        chatItem.className = `chat-item ${chat.id === currentChatId ? 'active' : ''}`;
        chatItem.innerHTML = `
            <div class="chat-item-title">${chat.title}</div>
            <div class="chat-item-actions">
                <button onclick="deleteChat('${chat.id}')" title="删除">🗑️</button>
            </div>
        `;
        chatItem.addEventListener('click', () => switchToChat(chat.id));
        chatList.appendChild(chatItem);
    });
}

// 切换到指定聊天
function switchToChat(chatId) {
    currentChatId = chatId;
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
        chatTitle.textContent = chat.title;
        chatMessages.innerHTML = '';
        chat.messages.forEach(msg => addMessage(msg.text, msg.isUser, msg.isError));
        renderChatList();
        
        // 在移动端自动关闭侧边栏
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    }
}

// 删除聊天
function deleteChat(chatId) {
    if (confirm('确定要删除这个对话吗？')) {
        const index = chats.findIndex(c => c.id === chatId);
        if (index !== -1) {
            chats.splice(index, 1);
            saveChats();
            if (chatId === currentChatId) {
                if (chats.length > 0) {
                    switchToChat(chats[0].id);
                } else {
                    createNewChat();
                }
            } else {
                renderChatList();
            }
        }
    }
}

// 编辑聊天标题
function editTitle() {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        titleInput.value = chat.title;
        titleEditDialog.classList.add('active');
    }
}

// 保存聊天标题
function saveTitle() {
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.title = titleInput.value.trim() || '新的对话';
        chatTitle.textContent = chat.title;
        saveChats();
        renderChatList();
    }
    titleEditDialog.classList.remove('active');
}

// 添加消息到当前聊天
function addMessage(text, isUser, isError = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'ai-message'} ${isError ? 'error-message' : ''}`;
    
    if (typeof text === 'string') {
        if (isUser) {
            // 用户消息直接显示
            const formattedText = text.replace(/\n/g, '<br>');
            messageDiv.innerHTML = formattedText;
        } else {
            // AI消息流式显示
            messageDiv.textContent = '';
            chatMessages.appendChild(messageDiv);
            streamText(text, messageDiv, false);
        }
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 保存消息到当前聊天记录
    const chat = chats.find(c => c.id === currentChatId);
    if (chat) {
        chat.messages.push({ text, isUser, isError });
        saveChats();
    }
}

// 初始化API
function initializeAPI() {
    try {
        // 使用固定的API密钥
        const API_KEY = 'AIzaSyCKaip6ZqpieBp-9LelZZJ-1WXTUPZi3H0';
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({
            model: "gemini-2.0-flash-exp"
        });
        chatSession = model.startChat({
            generationConfig: getGenerationConfig(),
            history: [],
        });
        return true;
    } catch (error) {
        console.error('初始化API失败:', error);
        return false;
    }
}

// 显示加载动画
function showLoading() {
    sendButton.disabled = true;
    sendButton.innerHTML = '<span class="loading">发送中...</span>';
}

// 隐藏加载动画
function hideLoading() {
    sendButton.disabled = false;
    sendButton.textContent = '发送';
}

// 请求API密钥
function promptForApiKey() {
    settingsPanel.classList.add('active');
    return new Promise((resolve) => {
        saveSettings.addEventListener('click', function handler() {
            const apiKey = apiKeyInput.value.trim();
            if (apiKey && initializeAPI(apiKey)) {
                settingsPanel.classList.remove('active');
                addMessage('API密钥设置成功！', false);
                saveSettings.removeEventListener('click', handler);
                resolve(true);
            } else {
                addMessage('API密钥设置失败，请检查密钥是否正确。', false, true);
                resolve(false);
            }
        }, { once: true });
    });
}

// 处理文件导入
function handleFileImport(file) {
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            fileContent.textContent = e.target.result;
            selectedText = e.target.result;
            filePreview.classList.add('active');
        };
        reader.readAsText(file);
    }
}

// 统一的流式输出函数
async function streamText(text, element, isTextarea = false) {
    const chars = text.split('');
    if (isTextarea) {
        element.value = '';
    } else {
        element.textContent = '';
        element.classList.add('typing');
    }
    
    for (let i = 0; i < chars.length; i++) {
        if (isTextarea) {
            element.value += chars[i];
            autoResizeTextarea(element);
        } else {
            element.textContent += chars[i];
        }
        // 调整滚动位置
        element.scrollTop = element.scrollHeight;
        await new Promise(resolve => setTimeout(resolve, 30)); // 调整速度
    }
    
    if (!isTextarea) {
        element.classList.remove('typing');
    }
}

// 修改handleSend函数
async function handleSend() {
    const message = userInput.value.trim();
    if (!message) {
        addMessage('请输入消息内容', false, true);
        return;
    }

    try {
        showLoading();
        // 显示用户消息
        addMessage(message, true);
        userInput.value = '';

        // 创建AI消息元素
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message ai-message';
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        // 发送消息到Gemini
        const result = await chatSession.sendMessage(message);
        const response = await result.response;
        const text = response.text();

        // 流式输出AI回复
        await streamText(text, messageDiv, false);

        // 保存消息到当前聊天记录
        const chat = chats.find(c => c.id === currentChatId);
        if (chat) {
            chat.messages.push({ text, isUser: false, isError: false });
            saveChats();
        }
    } catch (error) {
        console.error('Error:', error);
        addMessage('抱歉，发生了错误：' + error.message, false, true);
    } finally {
        hideLoading();
    }
}

// 导出聊天记录
function exportChat() {
    const messages = Array.from(chatMessages.children).map(msg => {
        const isUser = msg.classList.contains('user-message');
        const text = msg.innerHTML;
        return `${isUser ? '用户' : 'AI'}: ${text}`;
    }).join('\n\n');

    const blob = new Blob([messages], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 清除聊天记录
function clearChat() {
    if (confirm('确定要清除所有聊天记录吗？')) {
        chatMessages.innerHTML = '';
        chatSession = model.startChat({
            generationConfig: getGenerationConfig(),
            history: [],
        });
        addMessage('聊天记录已清除。', false);
    }
}

// 事件监听器
sendButton.addEventListener('click', handleSend);

userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
    } else if (e.key === 'Escape') {
        userInput.value = '';
    }
});

settingsButton.addEventListener('click', () => {
    temperatureInput.value = settings.temperature;
    maxTokensInput.value = settings.maxTokens;
    settingsPanel.classList.add('active');
});

closeSettings.addEventListener('click', () => {
    settingsPanel.classList.remove('active');
});

saveSettings.addEventListener('click', () => {
    settings.temperature = parseFloat(temperatureInput.value);
    settings.maxTokens = parseInt(maxTokensInput.value);
    settings.theme = themeSelect.value;
    
    localStorage.setItem('temperature', settings.temperature);
    localStorage.setItem('maxTokens', settings.maxTokens);
    
    setTheme(settings.theme);
    
    settingsPanel.classList.remove('active');
    addMessage('设置已保存。', false);
});

temperatureInput.addEventListener('input', () => {
    temperatureValue.textContent = temperatureInput.value;
});

clearButton.addEventListener('click', clearChat);
exportButton.addEventListener('click', exportChat);

importButton.addEventListener('click', () => {
    fileInput.click();
});

fileInput.addEventListener('change', (e) => {
    handleFileImport(e.target.files[0]);
});

confirmImport.addEventListener('click', () => {
    if (selectedText) {
        userInput.value = selectedText;
    }
    filePreview.classList.remove('active');
    selectedText = null;
    fileContent.textContent = '';
});

cancelImport.addEventListener('click', () => {
    filePreview.classList.remove('active');
    selectedText = null;
    fileContent.textContent = '';
});

// 新增事件监听器
newChatButton.addEventListener('click', createNewChat);
editTitleButton.addEventListener('click', editTitle);
saveTitleButton.addEventListener('click', saveTitle);
cancelTitleButton.addEventListener('click', () => titleEditDialog.classList.remove('active'));

// 初始化
if (savedChats.length > 0) {
    chats = savedChats;
    switchToChat(chats[0].id);
} else {
    createNewChat();
}

// 初始化API并显示欢迎消息
if (initializeAPI()) {
    // 检查是否是第一次访问
    const hasVisited = localStorage.getItem('hasVisited');
    if (!hasVisited) {
        addMessage('欢迎使用由全民潮AI创至联盟（http://cy.waryts.com/）由Gemini 2.0 Flash Experimental最新版模型提供服务，有什么我可以帮你的吗？', false);
        localStorage.setItem('hasVisited', 'true');
    }
} else {
    addMessage('API初始化失败，请检查网络连接。', false, true);
}

// 导出deleteChat函数到全局作用域
window.deleteChat = deleteChat;

// 移动端菜单控制
function toggleSidebar() {
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

menuButton.addEventListener('click', toggleSidebar);
overlay.addEventListener('click', toggleSidebar);

// Canvas相关DOM元素
const canvasButton = document.getElementById('canvasButton');
const canvasContainer = document.getElementById('canvasContainer');
const addBlockButton = document.getElementById('addBlockButton');
const saveCanvasButton = document.getElementById('saveCanvasButton');
const closeCanvasButton = document.getElementById('closeCanvasButton');
const blockMenu = document.getElementById('blockMenu');
const canvasWorkspace = document.getElementById('canvasWorkspace');

// Canvas状态
let canvasBlocks = [];
let currentBlockId = null;

// 切换Canvas显示
function toggleCanvas() {
    canvasContainer.classList.toggle('active');
    if (canvasContainer.classList.contains('active')) {
        loadCanvas();
    }
}

// 显示块菜单
function showBlockMenu(event) {
    const rect = event.target.getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;
    
    blockMenu.style.top = `${rect.bottom + scrollTop}px`;
    blockMenu.style.left = `${rect.left + scrollLeft}px`;
    blockMenu.classList.add('active');
}

// 隐藏块菜单
function hideBlockMenu() {
    blockMenu.classList.remove('active');
}

// 创建新块
function createBlock(type) {
    const blockId = Date.now().toString();
    const block = {
        id: blockId,
        type: type,
        content: '',
        createdAt: new Date().toISOString()
    };
    
    canvasBlocks.push(block);
    renderBlock(block);
    hideBlockMenu();
    // 自动保存
    localStorage.setItem(`canvas_${currentChatId}`, JSON.stringify(canvasBlocks));
}

// 自动调整文本框高度
function autoResizeTextarea(textarea) {
    // 保存当前滚动位置
    const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
    
    // 重置高度以获取正确的scrollHeight
    textarea.style.height = 'auto';
    
    // 设置新高度
    const newHeight = Math.max(textarea.scrollHeight, 100); // 最小高度100px
    textarea.style.height = newHeight + 'px';
    
    // 恢复滚动位置
    window.scrollTo(0, scrollPos);
}

// 渲染块
function renderBlock(block) {
    const blockElement = document.createElement('div');
    blockElement.className = 'content-block';
    blockElement.dataset.id = block.id;
    
    const header = document.createElement('div');
    header.className = 'block-header';
    
    const typeLabel = document.createElement('span');
    typeLabel.className = 'block-type';
    typeLabel.textContent = getBlockTypeLabel(block.type);
    
    const actions = document.createElement('div');
    actions.className = 'block-actions';
    actions.innerHTML = `
        <button onclick="moveBlockUp('${block.id}')" title="上移">⬆️</button>
        <button onclick="moveBlockDown('${block.id}')" title="下移">⬇️</button>
        <button onclick="deleteBlock('${block.id}')" title="删除">🗑️</button>
    `;
    
    header.appendChild(typeLabel);
    header.appendChild(actions);
    blockElement.appendChild(header);
    
    const content = document.createElement('div');
    content.className = 'block-content';
    
    switch (block.type) {
        case 'text':
            content.innerHTML = `<textarea placeholder="输入文本...">${block.content}</textarea>`;
            const textarea = content.querySelector('textarea');
            textarea.addEventListener('input', (e) => {
                updateBlockContent(block.id, e.target.value);
                autoResizeTextarea(e.target);
            });
            // 初始调整高度（使用requestAnimationFrame确保DOM已更新）
            requestAnimationFrame(() => autoResizeTextarea(textarea));
            break;
            
        case 'prompt':
            content.innerHTML = `<textarea placeholder="输入提示...">${block.content}</textarea>
                               <button onclick="sendToChat('${block.id}')">发送到聊天</button>`;
            const promptTextarea = content.querySelector('textarea');
            promptTextarea.addEventListener('input', (e) => {
                updateBlockContent(block.id, e.target.value);
                autoResizeTextarea(e.target);
            });
            // 初始调整高度
            requestAnimationFrame(() => autoResizeTextarea(promptTextarea));
            break;
            
        case 'code':
            content.innerHTML = `<textarea class="code-editor" placeholder="输入代码...">${block.content}</textarea>`;
            const codeTextarea = content.querySelector('textarea');
            codeTextarea.addEventListener('input', (e) => {
                updateBlockContent(block.id, e.target.value);
                autoResizeTextarea(e.target);
            });
            // 初始调整高度
            requestAnimationFrame(() => autoResizeTextarea(codeTextarea));
            break;
            
        case 'image':
            content.innerHTML = block.content ? 
                `<img src="${block.content}" alt="上传的图片">` :
                `<input type="file" accept="image/*" onchange="handleImageUpload(event, '${block.id}')">`;
            break;
    }
    
    blockElement.appendChild(content);
    canvasWorkspace.appendChild(blockElement);
}

// 获取块类型标签
function getBlockTypeLabel(type) {
    const labels = {
        text: '📝 文本',
        prompt: '💡 提示',
        code: '💻 代码',
        image: '🖼️ 图片'
    };
    return labels[type] || type;
}

// 更新块内容
function updateBlockContent(blockId, content) {
    const block = canvasBlocks.find(b => b.id === blockId);
    if (block) {
        block.content = content;
        // 自动保存
        localStorage.setItem(`canvas_${currentChatId}`, JSON.stringify(canvasBlocks));
    }
}

// 移动块
function moveBlockUp(blockId) {
    const index = canvasBlocks.findIndex(b => b.id === blockId);
    if (index > 0) {
        [canvasBlocks[index], canvasBlocks[index - 1]] = [canvasBlocks[index - 1], canvasBlocks[index]];
        // 自动保存
        localStorage.setItem(`canvas_${currentChatId}`, JSON.stringify(canvasBlocks));
        renderCanvas();
    }
}

function moveBlockDown(blockId) {
    const index = canvasBlocks.findIndex(b => b.id === blockId);
    if (index < canvasBlocks.length - 1) {
        [canvasBlocks[index], canvasBlocks[index + 1]] = [canvasBlocks[index + 1], canvasBlocks[index]];
        // 自动保存
        localStorage.setItem(`canvas_${currentChatId}`, JSON.stringify(canvasBlocks));
        renderCanvas();
    }
}

// 删除块
function deleteBlock(blockId) {
    if (confirm('确定要删除这个内容块吗？')) {
        canvasBlocks = canvasBlocks.filter(b => b.id !== blockId);
        // 自动保存
        localStorage.setItem(`canvas_${currentChatId}`, JSON.stringify(canvasBlocks));
        renderCanvas();
    }
}

// 发送到聊天
function sendToChat(blockId) {
    const block = canvasBlocks.find(b => b.id === blockId);
    if (block) {
        userInput.value = block.content;
        toggleCanvas();
    }
}

// 处理图片上传
async function handleImageUpload(event, blockId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            updateBlockContent(blockId, e.target.result);
            renderCanvas();
        };
        reader.readAsDataURL(file);
    }
}

// 加载Canvas
function loadCanvas() {
    const saved = localStorage.getItem(`canvas_${currentChatId}`);
    canvasBlocks = saved ? JSON.parse(saved) : [];
    renderCanvas();
}

// 渲染Canvas
function renderCanvas() {
    canvasWorkspace.innerHTML = '';
    canvasBlocks.forEach(block => renderBlock(block));
}

// Canvas事件监听器
canvasButton.addEventListener('click', toggleCanvas);
closeCanvasButton.addEventListener('click', toggleCanvas);
addBlockButton.addEventListener('click', (event) => {
    event.stopPropagation(); // 阻止事件冒泡
    showBlockMenu(event);
});

// 点击其他区域时隐藏块菜单
document.addEventListener('click', (e) => {
    if (!blockMenu.contains(e.target) && e.target !== addBlockButton) {
        hideBlockMenu();
    }
});

// 块菜单按钮事件监听
blockMenu.querySelectorAll('button').forEach(button => {
    button.addEventListener('click', (event) => {
        event.stopPropagation(); // 阻止事件冒泡
        createBlock(button.dataset.type);
    });
});

// 导出Canvas相关函数到全局作用域
window.moveBlockUp = moveBlockUp;
window.moveBlockDown = moveBlockDown;
window.deleteBlock = deleteBlock;
window.sendToChat = sendToChat;
window.handleImageUpload = handleImageUpload;

// AI助手相关DOM元素
const aiAssistButton = document.getElementById('aiAssistButton');
const aiAssistDialog = document.getElementById('aiAssistDialog');
const aiAssistInput = document.getElementById('aiAssistInput');
const aiAssistSubmit = document.getElementById('aiAssistSubmit');
const aiAssistCancel = document.getElementById('aiAssistCancel');
const aiAssistOptions = document.querySelector('.ai-assist-options');

let selectedAction = null;
let selectedBlock = null;

// 显示AI助手对话框
function showAiAssistDialog(blockId = null) {
    selectedBlock = blockId;
    aiAssistDialog.classList.add('active');
    if (blockId) {
        const block = canvasBlocks.find(b => b.id === blockId);
        if (block) {
            aiAssistInput.value = block.content;
        }
    }
}

// 隐藏AI助手对话框
function hideAiAssistDialog() {
    aiAssistDialog.classList.remove('active');
    aiAssistInput.value = '';
    selectedAction = null;
    selectedBlock = null;
    aiAssistOptions.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
}

// 处理AI助手选项点击
aiAssistOptions.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') {
        aiAssistOptions.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
        e.target.classList.add('active');
        selectedAction = e.target.dataset.action;
        
        // 根据不同操作设置不同的输入提示
        switch (selectedAction) {
            case 'generate':
                aiAssistInput.placeholder = '请描述您想要生成的内容...';
                break;
            case 'improve':
                aiAssistInput.placeholder = '请输入需要改进的内容...';
                break;
            case 'translate':
                aiAssistInput.placeholder = '请输入需要翻译的内容...';
                break;
            case 'summarize':
                aiAssistInput.placeholder = '请输入需要总结的内容...';
                break;
        }
    }
});

// 流式输出到文本框
async function streamToTextarea(text, textarea) {
    const chars = text.split('');
    textarea.value = '';
    
    for (let i = 0; i < chars.length; i++) {
        textarea.value += chars[i];
        autoResizeTextarea(textarea);
        await new Promise(resolve => setTimeout(resolve, 20)); // 调整速度
    }
}

// 保存Canvas内容
function saveCanvas() {
    localStorage.setItem(`canvas_${currentChatId}`, JSON.stringify(canvasBlocks));
}

// 修改handleAiAssist函数
async function handleAiAssist() {
    if (!selectedAction) {
        alert('请选择一个操作类型');
        return;
    }

    const input = aiAssistInput.value.trim();
    if (!input) {
        alert('请输入内容');
        return;
    }

    try {
        let prompt = '';
        switch (selectedAction) {
            case 'generate':
                prompt = `请根据以下描述生成内容：\n${input}`;
                break;
            case 'improve':
                prompt = `请改进以下内容，使其更加专业和流畅：\n${input}`;
                break;
            case 'translate':
                prompt = `请将以下内容翻译成中文：\n${input}`;
                break;
            case 'summarize':
                prompt = `请总结以下内容的要点：\n${input}`;
                break;
        }

        // 保存当前状态
        const currentSelectedBlock = selectedBlock;
        
        // 立即隐藏对话框
        hideAiAssistDialog();
        
        // 创建一个空的文本块或获取现有块
        let blockId;
        if (!currentSelectedBlock) {
            // 创建新的文本块
            const block = {
                id: Date.now().toString(),
                type: 'text',
                content: '正在生成内容...',
                createdAt: new Date().toISOString()
            };
            canvasBlocks.push(block);
            renderBlock(block);
            blockId = block.id;
            // 保存新创建的块
            saveCanvas();
        } else {
            blockId = currentSelectedBlock;
            const blockElement = document.querySelector(`[data-id="${blockId}"]`);
            if (blockElement) {
                const textarea = blockElement.querySelector('textarea');
                if (textarea) {
                    textarea.value = '正在生成内容...';
                    autoResizeTextarea(textarea);
                }
            }
        }

        // 调用AI接口
        const result = await chatSession.sendMessage(prompt);
        const response = await result.response;
        const text = response.text();

        // 更新内容块
        const blockElement = document.querySelector(`[data-id="${blockId}"]`);
        if (blockElement) {
            const textarea = blockElement.querySelector('textarea');
            if (textarea) {
                // 使用流式输出
                await streamToTextarea(text, textarea);
                // 更新内容
                updateBlockContent(blockId, text);
            }
        }
    } catch (error) {
        console.error('AI处理错误:', error);
        alert('处理失败，请重试');
    }
}

// AI助手事件监听器
aiAssistButton.addEventListener('click', () => showAiAssistDialog());
aiAssistSubmit.addEventListener('click', handleAiAssist);
aiAssistCancel.addEventListener('click', hideAiAssistDialog);

// 为内容块添加AI助手功能
function addAiAssistToBlock(blockElement, blockId) {
    const actions = blockElement.querySelector('.block-actions');
    const aiButton = document.createElement('button');
    aiButton.title = 'AI助手';
    aiButton.textContent = '🤖';
    aiButton.onclick = () => showAiAssistDialog(blockId);
    actions.insertBefore(aiButton, actions.firstChild);
}

// 修改renderBlock函数，添加AI助手按钮
const originalRenderBlock = renderBlock;
renderBlock = function(block) {
    originalRenderBlock(block);
    const blockElement = document.querySelector(`[data-id="${block.id}"]`);
    if (blockElement) {
        addAiAssistToBlock(blockElement, block.id);
    }
};

// 新手提示系统
const tutorialOverlay = document.getElementById('tutorialOverlay');
const tutorialTip = document.getElementById('tutorialTip');
const tipText = tutorialTip.querySelector('.tip-text');
const nextButton = tutorialTip.querySelector('.tip-next');
const skipButton = tutorialTip.querySelector('.tip-skip');

// 教程步骤配置
const tutorialSteps = [
    {
        target: '#newChatButton',
        title: '创建新对话',
        text: '点击这里可以创建一个新的对话。每个对话都会保存在侧边栏中，方便您随时切换。',
        position: 'bottom'
    },
    {
        target: '#canvasButton',
        title: 'Canvas编辑器',
        text: 'Canvas编辑器是一个强大的工具，可以帮助您组织和编辑内容。您可以创建文本、代码、提示等多种类型的内容块。',
        position: 'top'
    },
    {
        target: '#userInput',
        title: '开始对话',
        text: '在这里输入您的问题或需求，AI助手会为您提供专业的回答。支持多行输入，按Shift+Enter换行。',
        position: 'top'
    },
    {
        target: '#settingsButton',
        title: '个性化设置',
        text: '在设置中可以调整AI的行为参数，比如创造性程度，以及切换深色/浅色主题。',
        position: 'bottom'
    }
];

let currentStepIndex = 0;

// 显示教程提示
function showTutorialTip(step) {
    const target = document.querySelector(step.target);
    if (!target) return;

    // 移除之前的高亮
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });

    // 添加高亮
    target.classList.add('tutorial-highlight');

    // 更新提示内容
    tutorialTip.querySelector('.tip-title').textContent = step.title;
    tipText.textContent = step.text;

    // 计算提示框位置
    const targetRect = target.getBoundingClientRect();
    const tipRect = tutorialTip.getBoundingClientRect();

    // 根据配置的位置调整提示框
    let top, left;
    switch (step.position) {
        case 'top':
            top = targetRect.top - tipRect.height - 20;
            left = targetRect.left + (targetRect.width - tipRect.width) / 2;
            tutorialTip.querySelector('.tip-arrow').style.cssText = 
                'bottom: -6px; left: 50%; transform: translateX(-50%) rotate(45deg);';
            break;
        case 'bottom':
            top = targetRect.bottom + 20;
            left = targetRect.left + (targetRect.width - tipRect.width) / 2;
            tutorialTip.querySelector('.tip-arrow').style.cssText = 
                'top: -6px; left: 50%; transform: translateX(-50%) rotate(45deg);';
            break;
        case 'left':
            top = targetRect.top + (targetRect.height - tipRect.height) / 2;
            left = targetRect.left - tipRect.width - 20;
            tutorialTip.querySelector('.tip-arrow').style.cssText = 
                'right: -6px; top: 50%; transform: translateY(-50%) rotate(45deg);';
            break;
        case 'right':
            top = targetRect.top + (targetRect.height - tipRect.height) / 2;
            left = targetRect.right + 20;
            tutorialTip.querySelector('.tip-arrow').style.cssText = 
                'left: -6px; top: 50%; transform: translateY(-50%) rotate(45deg);';
            break;
    }

    // 确保提示框在视口内
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
    };

    if (left < 20) left = 20;
    if (left + tipRect.width > viewport.width - 20) {
        left = viewport.width - tipRect.width - 20;
    }
    if (top < 20) top = 20;
    if (top + tipRect.height > viewport.height - 20) {
        top = viewport.height - tipRect.height - 20;
    }

    // 设置提示框位置
    tutorialTip.style.top = `${top}px`;
    tutorialTip.style.left = `${left}px`;

    // 显示遮罩和提示
    tutorialOverlay.classList.add('active');

    // 更新按钮文本
    nextButton.textContent = currentStepIndex === tutorialSteps.length - 1 ? '完成' : '下一步';
}

// 下一步
function nextTutorialStep() {
    currentStepIndex++;
    if (currentStepIndex < tutorialSteps.length) {
        showTutorialTip(tutorialSteps[currentStepIndex]);
    } else {
        endTutorial();
    }
}

// 结束教程
function endTutorial() {
    tutorialOverlay.classList.remove('active');
    document.querySelectorAll('.tutorial-highlight').forEach(el => {
        el.classList.remove('tutorial-highlight');
    });
    localStorage.setItem('tutorialCompleted', 'true');
}

// 开始教程
function startTutorial() {
    currentStepIndex = 0;
    showTutorialTip(tutorialSteps[0]);
}

// 事件监听
nextButton.addEventListener('click', nextTutorialStep);
skipButton.addEventListener('click', endTutorial);

// 检查是否需要显示教程
if (!localStorage.getItem('tutorialCompleted') && !localStorage.getItem('hasVisited')) {
    // 延迟显示教程，等待页面完全加载
    setTimeout(startTutorial, 1000);
}

// 移动端手势支持
let touchStartX = 0;
let touchStartY = 0;
let isSwiping = false;

// 添加触摸事件监听
document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    isSwiping = true;
});

document.addEventListener('touchmove', (e) => {
    if (!isSwiping) return;
    
    const touchEndX = e.touches[0].clientX;
    const touchEndY = e.touches[0].clientY;
    
    const deltaX = touchEndX - touchStartX;
    const deltaY = touchEndY - touchStartY;
    
    // 如果垂直滑动距离大于水平滑动距离，则不处理侧滑
    if (Math.abs(deltaY) > Math.abs(deltaX)) {
        isSwiping = false;
        return;
    }
    
    // 防止滑动时页面跟随滚动
    e.preventDefault();
    
    // 处理侧边栏滑动
    if (window.innerWidth <= 768) {
        if (deltaX > 50 && !sidebar.classList.contains('active')) {
            // 从左向右滑动，打开侧边栏
            toggleSidebar();
            isSwiping = false;
        } else if (deltaX < -50 && sidebar.classList.contains('active')) {
            // 从右向左滑动，关闭侧边栏
            toggleSidebar();
            isSwiping = false;
        }
    }
    
    // 处理Canvas编辑器滑动
    if (deltaX < -50 && !canvasContainer.classList.contains('active')) {
        // 从右向左滑动，打开Canvas编辑器
        toggleCanvas();
        isSwiping = false;
    } else if (deltaX > 50 && canvasContainer.classList.contains('active')) {
        // 从左向右滑动，关闭Canvas编辑器
        toggleCanvas();
        isSwiping = false;
    }
});

document.addEventListener('touchend', () => {
    isSwiping = false;
});

// 优化移动端双击处理
let lastTapTime = 0;
chatMessages.addEventListener('touchend', (e) => {
    const currentTime = new Date().getTime();
    const tapLength = currentTime - lastTapTime;
    const target = e.target;
    
    if (tapLength < 500 && tapLength > 0) {
        // 双击消息复制内容
        if (target.closest('.message')) {
            const message = target.closest('.message');
            const text = message.textContent;
            
            // 创建临时输入框
            const textarea = document.createElement('textarea');
            textarea.value = text;
            document.body.appendChild(textarea);
            textarea.select();
            
            try {
                document.execCommand('copy');
                // 显示复制成功提示
                const toast = document.createElement('div');
                toast.className = 'toast';
                toast.textContent = '已复制到剪贴板';
                document.body.appendChild(toast);
                
                setTimeout(() => {
                    toast.remove();
                }, 2000);
            } catch (err) {
                console.error('复制失败:', err);
            }
            
            document.body.removeChild(textarea);
        }
    }
    lastTapTime = currentTime;
});

// 添加Toast样式
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 100px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 10px 20px;
        border-radius: 20px;
        font-size: 14px;
        z-index: 10000;
        animation: fadeInOut 2s ease-in-out;
    }
    
    @keyframes fadeInOut {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        20% { opacity: 1; transform: translate(-50%, 0); }
        80% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, -20px); }
    }
`;
document.head.appendChild(style);

// 优化移动端键盘处理
userInput.addEventListener('focus', () => {
    if (window.innerWidth <= 768) {
        // 滚动到底部，确保输入框可见
        setTimeout(() => {
            window.scrollTo(0, document.body.scrollHeight);
        }, 300);
    }
});

// 监听窗口大小变化，处理横竖屏切换
window.addEventListener('resize', () => {
    // 更新UI布局
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
        overlay.classList.remove('active');
    }
    
    // 重新计算新手提示位置
    if (tutorialOverlay.classList.contains('active')) {
        showTutorialTip(tutorialSteps[currentStepIndex]);
    }
});
  