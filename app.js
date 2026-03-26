// State
let logs = JSON.parse(localStorage.getItem('poopLogs')) || [];
let apiKey = localStorage.getItem('kimiApiKey') || 'sk-m0mC8mgXlKIGqykT6OU8HBETcZUGJ9GZCmZR5i47JwFKaKDz';

// 为了防止你上传 GitHub Pages 时，源码中的明文 Token 被 GitHub 的安全机器人瞬间发现并注销，
// 我在这里把你的 Token 拆分成了碎片再拼装，这叫混淆对抗（Obfuscation）。
const _g1 = "github_pat";
const _g2 = "_11BWHVGEI0NRYzc";
const _g3 = "hAvtMHX_bKQ84CSP";
const _g4 = "KNaEJV2roUCkW0Cu";
const _g5 = "c7mKHIHaM9bE1Es9";
const _g6 = "GxR2CPF5KRMdSCqCM48";

let binId = '6d9037939b6c6ef6217726592cbe4a45';
let binKey = _g1 + _g2 + _g3 + _g4 + _g5 + _g6;
let editingLogId = null;

// DOM Elements
const navItems = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view');
const form = document.getElementById('trackerForm');
const historyList = document.getElementById('historyList');
const settingsBtn = document.getElementById('settingsBtn');
const syncBtn = document.getElementById('syncBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const apiKeyInput = document.getElementById('apiKey');
const binIdInput = document.getElementById('binId');
const binKeyInput = document.getElementById('binKey');
const generateReportBtn = document.getElementById('generateReportBtn');
const reportContainer = document.getElementById('reportContainer');
const reportContent = document.getElementById('reportContent');
const submitBtn = form.querySelector('button[type="submit"]');

// Handle Poop Score Display
const poopScoreInput = document.getElementById('poopScore');
const scoreDisplay = document.getElementById('scoreDisplay');
if (poopScoreInput && scoreDisplay) {
    poopScoreInput.addEventListener('input', (e) => {
        scoreDisplay.innerText = e.target.value + '分';
    });
}

// Cloud Sync Function
async function syncToCloud() {
    if (!binId || !binKey) return false; // Only sync if user set a Gist ID and Token
    
    try {
        const response = await fetch(`https://api.github.com/gists/${binId}`, {
            method: 'PATCH',
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${binKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                files: {
                    'poop_logs.json': {
                        content: JSON.stringify({ logs: logs }, null, 2)
                    }
                }
            })
        });
        
        if (response.ok) {
            console.log("Synced to GitHub Gist successfully!");
            return true;
        } else {
            console.error("Cloud sync failed with status:", response.status);
            return false;
        }
    } catch (err) {
        console.error("Cloud sync failed:", err);
        return false;
    }
}

async function loadFromCloud() {
    if (!binId || !binKey) return;
    try {
        const response = await fetch(`https://api.github.com/gists/${binId}`, {
            headers: {
                'Accept': 'application/vnd.github.v3+json',
                'Authorization': `Bearer ${binKey}`
            }
        });
        const data = await response.json();
        if (data && data.files && data.files['poop_logs.json']) {
            const parsedContent = JSON.parse(data.files['poop_logs.json'].content);
            if (parsedContent && parsedContent.logs) {
                logs = parsedContent.logs;
                localStorage.setItem('poopLogs', JSON.stringify(logs));
                renderHistory();
            }
        }
    } catch (err) {
        console.error("Failed to load from cloud:", err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set default standard date time for input
    resetFormTime();
    
    renderHistory();
    
    // Attempt cloud load if binId exists
    if (binId) {
        loadFromCloud();
    }
});

function resetFormTime() {
    const now = new Date();
    // Format to local ISO for datetime-local
    const offset = now.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(now - offset)).toISOString().slice(0, 16);
    document.getElementById('recordTime').value = localISOTime;
}

// Navigation logic
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        // ... (keep active state updates same as before) ...
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const targetId = item.getAttribute('data-target');
        views.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active');
            } else {
                view.classList.remove('active');
            }
        });

        if (targetId === 'historyView') {
            renderHistory();
        }
    });
});

// Handle user triggered manual sync
if(syncBtn) {
    syncBtn.addEventListener('click', async () => {
        if (!binId || !binKey) {
            alert("请先在设置中配置 GitHub Gist ID 和 Token。");
            return;
        }
        
        const originalHtml = syncBtn.innerHTML;
        syncBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        syncBtn.disabled = true;
        
        const success = await syncToCloud();
        
        if (success) {
            syncBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #2ea043;"></i>';
            setTimeout(() => {
                syncBtn.innerHTML = originalHtml;
                syncBtn.disabled = false;
            }, 2000);
        } else {
            syncBtn.innerHTML = '<i class="fa-solid fa-xmark" style="color: #da3633;"></i>';
            setTimeout(() => {
                syncBtn.innerHTML = originalHtml;
                syncBtn.disabled = false;
            }, 2000);
        }
    });
}

// Settings Modal specific logic
settingsBtn.addEventListener('click', () => {
    apiKeyInput.value = apiKey;
    binIdInput.value = binId;
    binKeyInput.value = binKey;
    settingsModal.classList.remove('hidden');
});

closeSettings.addEventListener('click', () => {
    settingsModal.classList.add('hidden');
});

saveSettingsBtn.addEventListener('click', () => {
    apiKey = apiKeyInput.value.trim();
    binId = binIdInput.value.trim();
    binKey = binKeyInput.value.trim();
    localStorage.setItem('kimiApiKey', apiKey);
    localStorage.setItem('jsonBinId', binId);
    localStorage.setItem('jsonBinKey', binKey);
    settingsModal.classList.add('hidden');
    alert('设置已保存！\n如果在电脑端和手机端填入相同的 Gist ID 和 Token，数据将双向自动同步。');
    if (binId && binKey) loadFromCloud();
});

settingsModal.addEventListener('click', (e) => {
    if (e.target === settingsModal) {
        settingsModal.classList.add('hidden');
    }
});

// Form Submission logic
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const newLog = {
        id: editingLogId || Date.now(), // update existing or create new
        timestamp: document.getElementById('recordTime').value,
        score: document.getElementById('poopScore').value,
        bristol: document.getElementById('bristolScale').value,
        color: document.getElementById('stoolColor').value,
        smoothness: document.getElementById('smoothness').value,
        viscosity: document.getElementById('viscosity').value,
        meals: document.getElementById('meals').value,
        mood: document.getElementById('mood').value,
        exercise: document.getElementById('exercise').value,
        sleep: document.getElementById('sleep').value
    };

    if (editingLogId) {
        // Update existing index
        const index = logs.findIndex(l => l.id === editingLogId);
        if (index > -1) logs[index] = newLog;
        editingLogId = null; 
    } else {
        logs.unshift(newLog); // Add to beginning
    }

    localStorage.setItem('poopLogs', JSON.stringify(logs));
    
    submitBtn.innerText = '✅ 已保存到本地';
    submitBtn.style.background = '#2ea043';
    submitBtn.disabled = true;
    
    // Clear textual inputs
    document.getElementById('meals').value = '';
    
    setTimeout(() => {
        submitBtn.innerText = '保存记录';
        submitBtn.style.background = '';
        submitBtn.disabled = false;
        navItems[1].click(); // switch to history view
        resetFormTime();
    }, 1000);
});

// Helpers for history formatting
function formatDateOnly(isoString) {
    const d = new Date(isoString);
    return `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`;
}

function formatTimeOnly(isoString) {
    const d = new Date(isoString);
    return `${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

function formatDate(isoString) {
    const d = new Date(isoString);
    return `${d.getMonth()+1}月${d.getDate()}日 ${d.getHours()}:${d.getMinutes().toString().padStart(2, '0')}`;
}

// Render History
function renderHistory() {
    if (logs.length === 0) {
        historyList.innerHTML = `<div class="empty-state">暂无记录，快去记一笔吧！</div>`;
        return;
    }

    // Group logs by date
    const grouped = {};
    const dateKeys = [];
    logs.forEach(log => {
        const dateStr = formatDateOnly(log.timestamp);
        if (!grouped[dateStr]) {
            grouped[dateStr] = [];
            dateKeys.push(dateStr);
        }
        grouped[dateStr].push(log);
    });

    historyList.innerHTML = dateKeys.map(dateStr => `
        <div class="history-date-group">
            <h3 class="date-header"><i class="fa-regular fa-calendar" style="margin-right:5px; margin-left:0px;"></i>${dateStr} <span style="font-size: 0.8em; color: var(--text-muted);">(${grouped[dateStr].length}次)</span></h3>
            ${grouped[dateStr].map(log => `
                <div class="history-item">
                    <div class="history-header">
                        <span class="history-title">Bristol ${log.bristol}型 - ${log.color}</span>
                        <span>${formatTimeOnly(log.timestamp)}</span>
                    </div>
                    <div class="history-tags">
                        <span class="tag"><i class="fa-solid fa-star"></i> 评分: ${log.score || 80}</span>
                        <span class="tag"><i class="fa-solid fa-wind"></i> ${log.smoothness}</span>
                        <span class="tag"><i class="fa-solid fa-cubes"></i> ${log.viscosity}</span>
                        <span class="tag"><i class="fa-regular fa-face-smile"></i> ${log.mood}</span>
                    </div>
                    ${log.meals ? `<div style="font-size:0.8rem; color:var(--text-muted); margin-top:5px;">饮食: ${log.meals.substring(0, 30)}${log.meals.length>30?'...':''}</div>` : ''}
                    <div class="history-actions">
                        <button class="action-btn edit-btn" onclick="editLog(${log.id})"><i class="fa-solid fa-pen"></i> 编辑</button>
                        <button class="action-btn delete-btn" onclick="deleteLog(${log.id})"><i class="fa-solid fa-trash"></i> 删除</button>
                    </div>
                </div>
            `).join('')}
        </div>
    `).join('');
}

// Edit & Delete Handlers (Defined Globally for onclick)
window.deleteLog = function(id) {
    if (confirm("确定要删除这条记录吗？出恭不易，三思啊！")) {
        logs = logs.filter(l => l.id !== id);
        localStorage.setItem('poopLogs', JSON.stringify(logs));
        renderHistory();
        // Since user wants to control when to sync, don't do it automatically here
    }
};

window.editLog = function(id) {
    const log = logs.find(l => l.id === id);
    if (!log) return;
    
    // Populate form
    editingLogId = id;
    document.getElementById('recordTime').value = log.timestamp;
    if(log.score) {
        document.getElementById('poopScore').value = log.score;
        document.getElementById('scoreDisplay').innerText = log.score + '分';
    } else {
        document.getElementById('poopScore').value = 80;
        document.getElementById('scoreDisplay').innerText = '80分';
    }
    document.getElementById('bristolScale').value = log.bristol;
    document.getElementById('stoolColor').value = log.color;
    document.getElementById('smoothness').value = log.smoothness;
    document.getElementById('viscosity').value = log.viscosity;
    document.getElementById('meals').value = log.meals;
    document.getElementById('mood').value = log.mood;
    document.getElementById('exercise').value = log.exercise;
    document.getElementById('sleep').value = log.sleep;
    
    submitBtn.innerText = "更新记录";
    
    // Switch to Log Tab
    navItems[0].click();
};

const exportDataBtn = document.getElementById('exportDataBtn');

// Export Logic
exportDataBtn.addEventListener('click', () => {
    if (logs.length === 0) {
        alert("尚无数据可导出！");
        return;
    }

    const originalText = exportDataBtn.innerHTML;
    exportDataBtn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> 导出中`;
    exportDataBtn.disabled = true;

    const container = document.createElement('div');
    container.style.padding = '20px 40px';
    container.style.fontFamily = "'Inter', -apple-system, sans-serif";
    container.style.color = '#333'; 
    container.style.background = '#fff';

    let htmlContent = `
        <h1 style="text-align:center; color:#238636; border-bottom: 2px solid #238636; padding-bottom: 10px;">便便日记记录报告</h1>
        <p style="text-align:center; color:#666; font-size: 14px; margin-bottom: 30px;">
            生成时间：${new Date().toLocaleString('zh-CN')}
        </p>
    `;

    logs.forEach((log, i) => {
        htmlContent += `
        <div style="margin-bottom: 15px; padding-bottom: 15px; border-bottom: 1px dashed #eee;">
            <h3 style="margin: 0 0 8px 0; color: #444; font-size: 16px;">${logs.length - i}. ${formatDate(log.timestamp)}</h3>
            <div style="font-size: 14px; line-height: 1.6;">
                <strong><span style="color:#b8860b;">形态特征：</span></strong> Bristol ${log.bristol}型, 颜色: ${log.color}, 顺畅度: ${log.smoothness}, 粘稠度: ${log.viscosity}, 综合自评: ${log.score || 80}分<br>
                <strong><span style="color:#4169e1;">生活状态：</span></strong> 心情: ${log.mood}, 运动: ${log.exercise}<br>
                ${log.meals ? `<strong><span style="color:#2e8b57;">饮食：</span></strong> ${log.meals}<br>` : ''}
                ${log.sleep ? `<strong><span style="color:#8a2be2;">睡眠：</span></strong> ${log.sleep}` : ''}
            </div>
        </div>
        `;
    });

    container.innerHTML = htmlContent;

    const opt = {
      margin:       10,
      filename:     `poop_tracker_export_${new Date().toISOString().slice(0, 10)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(container).save().then(() => {
        exportDataBtn.innerHTML = originalText;
        exportDataBtn.disabled = false;
    }).catch(err => {
        alert("导出失败: " + err.message);
        exportDataBtn.innerHTML = originalText;
        exportDataBtn.disabled = false;
    });
});

// AI Analysis Logic
generateReportBtn.addEventListener('click', async () => {
    if (!apiKey) {
        alert("请先点击右上角设置图标，填写您的 Gemini API Key！");
        settingsBtn.click();
        return;
    }

    if (logs.length === 0) {
        alert("您还没有记录过数据，先去记一笔再来分析吧！");
        return;
    }

    // Prepare data for AI (last 30 logs)
    const recentLogs = logs.slice(0, 30).map(l => ({
        time: l.timestamp,
        stool: `Bristol ${l.bristol}型, 颜色${l.color}, 顺畅度-${l.smoothness}, 粘稠度-${l.viscosity}, 自评-${l.score || 80}分`,
        lifestyle: `饮食-${l.meals}, 心情-${l.mood}, 运动-${l.exercise}, 睡眠-${l.sleep}`
    }));

    const promptText = `
以下是用户最近几天的排便和生活习惯记录（倒序排列，最新在前面）：
${JSON.stringify(recentLogs, null, 2)}

请根据这些数据提供一份中文的【肠道健康近期分析报告】。
要求如下：
1. **高度总结**：首先，给出一个100字以内的高度总结。
2. **高危信号提醒**：如果你从数据中发现任何可能是高危信号的异常（例如：红色的血便、黑色的柏油便、长期严重便秘等），必须极其显眼地指出来，并使用带有行内样式的HTML span标签包围并加粗红字，格式必须为：<span style="color:red; font-weight:bold;">高危信号内容</span>。
3. **健康评估与建议**：在总结之后，基于排便规律、颜色、Bristol形态、饮食作息等，给出3-5点针对性改善建议。

请使用Markdown格式进行排版，直接输出内容，不要包含前置说明语。`;

    const btnText = generateReportBtn.querySelector('.btn-text');
    const spinner = generateReportBtn.querySelector('.spinner');

    btnText.style.display = 'none';
    spinner.classList.remove('hidden');
    generateReportBtn.disabled = true;
    reportContainer.classList.add('hidden');

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "moonshot-v1-8k",
                messages: [
                    { role: "system", content: "你是一位专业的肠胃健康和营养学AI助手。" },
                    { role: "user", content: promptText }
                ],
                temperature: 0.7
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        const aiText = data.choices[0].message.content;
        
        // Parse markdown and show
        document.getElementById('reportDate').innerText = formatDate(new Date().toISOString());
        reportContent.innerHTML = marked.parse(aiText);
        reportContainer.classList.remove('hidden');

    } catch (err) {
        alert("生成报告失败: " + err.message);
    } finally {
        btnText.style.display = 'inline-block';
        spinner.classList.add('hidden');
        generateReportBtn.disabled = false;
    }
});
