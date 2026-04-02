// State
let logs = JSON.parse(localStorage.getItem('poopLogs')) || [];
let apiKey = localStorage.getItem('kimiApiKey') || 'sk-m0mC8mgXlKIGqykT6OU8HBETcZUGJ9GZCmZR5i47JwFKaKDz';

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
const submitBtn = document.getElementById('saveBtn');
const poopsContainer = document.getElementById('poopsContainer');
const addPoopBtn = document.getElementById('addPoopBtn');
const poopEntryTemplate = document.getElementById('poopEntryTemplate');
const recordDateInput = document.getElementById('recordDate');

// Data Migration Script to support single day structure
function migrateData() {
    let migratedLogs = [];
    let grouped = {};
    let needsMigration = false;

    logs.forEach(log => {
        if (log.timestamp && !log.date) {
            needsMigration = true;
            const d = new Date(log.timestamp);
            const offset = d.getTimezoneOffset() * 60000;
            const dateStr = (new Date(d - offset)).toISOString().split('T')[0];
            const timeStr = (new Date(d - offset)).toISOString().slice(11, 16);

            if (!grouped[dateStr]) {
                grouped[dateStr] = {
                    id: dateStr,
                    date: dateStr,
                    meals: log.meals || "",
                    mood: log.mood || "开心平和",
                    exercise: log.exercise || "轻度",
                    sleep: log.sleep || "",
                    poops: []
                };
            } else {
                if (log.meals && !grouped[dateStr].meals) grouped[dateStr].meals = log.meals;
                if (log.sleep && !grouped[dateStr].sleep) grouped[dateStr].sleep = log.sleep;
            }

            grouped[dateStr].poops.push({
                time: timeStr,
                score: log.score || 80,
                bristol: log.bristol || 4,
                color: log.color || "棕色",
                smoothness: log.smoothness || "一般",
                viscosity: log.viscosity || "不粘"
            });
        } else {
            migratedLogs.push(log);
        }
    });

    if (needsMigration) {
        Object.values(grouped).forEach(g => migratedLogs.push(g));
        migratedLogs.sort((a, b) => new Date(b.date) - new Date(a.date));
        logs = migratedLogs;
        localStorage.setItem('poopLogs', JSON.stringify(logs));
    }
}

function setSelectValue(container, targetName, value) {
    if (!container) return;
    const select = container.querySelector(`select[data-target="${targetName}"]`);
    if (select && value) {
        select.value = value;
    }
}

function getSelectValue(container, targetName) {
    const select = container.querySelector(`select[data-target="${targetName}"]`);
    return select ? select.value : '';
}


// Cloud Sync Function
async function syncToCloud() {
    if (!binId || !binKey) return false;
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
        return response.ok;
    } catch (err) {
        console.error("Cloud sync failed:", err);
        return false;
    }
}

async function loadFromCloud() {
    if (!binId || !binKey) return;
    try {
        const response = await fetch(`https://api.github.com/gists/${binId}`, {
            headers: { 'Accept': 'application/vnd.github.v3+json', 'Authorization': `Bearer ${binKey}` }
        });
        const data = await response.json();
        if (data && data.files && data.files['poop_logs.json']) {
            const parsedContent = JSON.parse(data.files['poop_logs.json'].content);
            if (parsedContent && parsedContent.logs) {
                logs = parsedContent.logs;
                migrateData();
                localStorage.setItem('poopLogs', JSON.stringify(logs));
                renderHistory();
                loadLogForDate(recordDateInput.value);
            }
        }
    } catch (err) {
        console.error("Failed to load from cloud:", err);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    migrateData();
    resetFormDate();
    renderHistory();
    if (binId) loadFromCloud();
});

function addPoopEntry(data = null) {
    const clone = poopEntryTemplate.content.cloneNode(true);
    const wrapper = clone.querySelector('.poop-entry-card');

    // Add remove logic
    clone.querySelector('.remove-poop-btn').addEventListener('click', () => wrapper.remove());

    const scoreInput = clone.querySelector('.poop-score');

    if (data) {
        clone.querySelector('.poop-time').value = data.time;
        scoreInput.value = data.score;
        clone.querySelector('.poop-bristol').value = data.bristol || 4;
        
        // Use new Fluent Chip system
        setSelectValue(wrapper, 'poop-color', data.color);
        setSelectValue(wrapper, 'poop-smoothness', data.smoothness);
        setSelectValue(wrapper, 'poop-viscosity', data.viscosity);
    } else {
        const now = new Date();
        const offset = now.getTimezoneOffset() * 60000;
        clone.querySelector('.poop-time').value = (new Date(now - offset)).toISOString().slice(11, 16);
    }

    poopsContainer.appendChild(clone);
}

addPoopBtn.addEventListener('click', () => addPoopEntry());

function loadLogForDate(dateStr) {
    poopsContainer.innerHTML = '';
    const existing = logs.find(l => l.date === dateStr);
    const formContainer = document.getElementById('trackerForm');

    if (existing) {
        editingLogId = existing.id || existing.date;
        document.getElementById('meals').value = existing.meals || '';
        document.getElementById('sleep').value = existing.sleep || '';
        
        setSelectValue(formContainer, 'mood', existing.mood);
        setSelectValue(formContainer, 'exercise', existing.exercise || '轻度');

        if (existing.poops && existing.poops.length > 0) {
            existing.poops.forEach(p => addPoopEntry(p));
        } else {
            addPoopEntry();
        }
    } else {
        editingLogId = null;
        document.getElementById('meals').value = '';
        document.getElementById('sleep').value = '';
        setSelectValue(formContainer, 'mood', '开心平和');
        setSelectValue(formContainer, 'exercise', '轻度');
        addPoopEntry(); // Load one blank poop entry
    }
    submitBtn.innerText = '提交';
}

function resetFormDate() {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    const localDateStr = (new Date(now - offset)).toISOString().split('T')[0];
    recordDateInput.value = localDateStr;
    loadLogForDate(localDateStr);
}

recordDateInput.addEventListener('change', (e) => {
    loadLogForDate(e.target.value);
});

// Navigation logic
navItems.forEach(item => {
    item.addEventListener('click', (e) => {
        navItems.forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');

        const targetId = item.getAttribute('data-target');
        views.forEach(view => {
            if (view.id === targetId) view.classList.add('active');
            else view.classList.remove('active');
        });

        if (targetId === 'historyView') renderHistory();
    });
});

// Settings Modal
settingsBtn.addEventListener('click', () => {
    apiKeyInput.value = apiKey;
    binIdInput.value = binId;
    binKeyInput.value = binKey;
    settingsModal.classList.remove('hidden');
});
closeSettings.addEventListener('click', () => settingsModal.classList.add('hidden'));
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
    if (e.target === settingsModal) settingsModal.classList.add('hidden');
});

// Sync Btn
if (syncBtn) {
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
            syncBtn.innerHTML = '<i class="fa-solid fa-check" style="color: #69a80f;"></i>';
            setTimeout(() => { syncBtn.innerHTML = originalHtml; syncBtn.disabled = false; }, 2000);
        } else {
            syncBtn.innerHTML = '<i class="fa-solid fa-xmark" style="color: #FF99A4;"></i>';
            setTimeout(() => { syncBtn.innerHTML = originalHtml; syncBtn.disabled = false; }, 2000);
        }
    });
}

// Form Submission logic
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const dateVal = recordDateInput.value;
    const poopsNodes = poopsContainer.querySelectorAll('.poop-entry-card');
    const poops = [];

    poopsNodes.forEach(node => {
        poops.push({
            time: node.querySelector('.poop-time').value,
            score: node.querySelector('.poop-score').value,
            bristol: node.querySelector('.poop-bristol').value,
            color: getSelectValue(node, 'poop-color'),
            smoothness: getSelectValue(node, 'poop-smoothness'),
            viscosity: getSelectValue(node, 'poop-viscosity')
        });
    });

    // Sort poops by time (oldest to newest)
    poops.sort((a, b) => a.time.localeCompare(b.time));

    const dailyLog = {
        id: dateVal,
        date: dateVal,
        meals: document.getElementById('meals').value,
        mood: getSelectValue(document.getElementById('trackerForm'), 'mood'),
        exercise: getSelectValue(document.getElementById('trackerForm'), 'exercise'),
        sleep: document.getElementById('sleep').value,
        poops: poops
    };

    const index = logs.findIndex(l => l.date === dailyLog.date);
    if (index > -1) logs[index] = dailyLog;
    else logs.unshift(dailyLog);

    logs.sort((a, b) => new Date(b.date) - new Date(a.date));
    localStorage.setItem('poopLogs', JSON.stringify(logs));

    submitBtn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px;border-top-color:#000;"></div> 提交中...';
    submitBtn.disabled = true;

    const premiumSuccessHtml = '<span style="display:flex; align-items:center; justify-content:center; gap:6px;"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg> 提交成功</span>';

    if (binId && binKey) {
        const success = await syncToCloud();
        if (success) {
            submitBtn.innerHTML = premiumSuccessHtml;
            submitBtn.classList.add('premium-success');
        } else {
            submitBtn.innerText = '⚠️ 本地保存(同步失败)';
            submitBtn.style.background = '#FF9F0A';
        }
    } else {
        submitBtn.innerHTML = premiumSuccessHtml;
        submitBtn.classList.add('premium-success');
    }

    setTimeout(() => {
        submitBtn.innerText = '提交';
        submitBtn.style.background = '';
        submitBtn.classList.remove('premium-success');
        submitBtn.disabled = false;
        navItems[1].click(); // switch to history view
    }, 1500);
});

// Render History (Fluent Native layout)
function renderHistory() {
    if (logs.length === 0) {
        historyList.innerHTML = `<div class="empty-state">暂无记录，快去记一笔吧！</div>`;
        return;
    }

    historyList.innerHTML = logs.map(log => `
        <div class="history-card">
            <div class="history-header-flex">
                <div class="history-date">${log.date} <span>共排便 ${log.poops.length} 次</span></div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="icon-btn" onclick="editLog('${log.date}')"><i class="fa-solid fa-pen" style="font-size:0.9rem;"></i></button>
                    <button class="icon-btn" onclick="deleteLog('${log.date}')"><i class="fa-solid fa-trash" style="font-size:0.9rem;"></i></button>
                </div>
            </div>
            
            <div class="record-tags">
                <span class="rc-tag">心情: ${log.mood}</span>
                <span class="rc-tag">运动: ${log.exercise}</span>
                ${log.sleep ? `<span class="rc-tag">睡眠: ${log.sleep}</span>` : ''}
            </div>
            ${log.meals ? `<div class="history-diet">${log.meals}</div>` : ''}
            
            <div style="display:flex; flex-direction:column;">
                ${log.poops.map(p => `
                    <div class="poop-min-card">
                        <div style="display:flex; justify-content:space-between; margin-bottom:8px; align-items:flex-end;">
                            <span style="color:var(--text-main); font-weight:600; font-size: 0.95rem;">Bristol ${p.bristol} - ${p.color}</span>
                            <span style="color:var(--text-sec); font-size:0.8rem;">${p.time}</span>
                        </div>
                        <div class="record-tags" style="margin-bottom:0; gap:0.3rem;">
                            <span class="rc-tag" style="background:transparent; border:none; padding:0; color:var(--text-sec);">综合 <span style="color:var(--accent); font-weight:600;">${p.score}</span> 分</span>
                            <span class="rc-tag" style="background:transparent; border:none; padding:0; color:var(--text-sec);">| ${p.smoothness}</span>
                            <span class="rc-tag" style="background:transparent; border:none; padding:0; color:var(--text-sec);">| ${p.viscosity}</span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');
}

window.deleteLog = function (dateStr) {
    if (confirm(`确定要彻底删除 ${dateStr} 这一天的所有记录吗？`)) {
        logs = logs.filter(l => l.date !== dateStr);
        localStorage.setItem('poopLogs', JSON.stringify(logs));
        renderHistory();
    }
};

window.editLog = function (dateStr) {
    loadLogForDate(dateStr);
    recordDateInput.value = dateStr;
    navItems[0].click(); // Goto log tab
};

const exportDataBtn = document.getElementById('exportDataBtn');
exportDataBtn.addEventListener('click', () => {
    if (logs.length === 0) return alert("尚无数据可导出！");
    const originalText = exportDataBtn.innerHTML;
    exportDataBtn.innerHTML = `<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div>`;
    exportDataBtn.disabled = true;

    const container = document.createElement('div');
    container.style.padding = '20px 40px';
    container.style.fontFamily = "'Segoe UI', sans-serif";
    container.style.color = '#333';
    container.style.background = '#fff';

    let htmlContent = `<h1 style="text-align:center; color:#005A9E; border-bottom: 2px solid #005A9E; padding-bottom: 10px;">便便日记记录报告</h1>
        <p style="text-align:center; color:#666; font-size: 14px; margin-bottom: 30px;">生成时间：${new Date().toLocaleString('zh-CN')}</p>`;

    logs.forEach((log, i) => {
        htmlContent += `<div style="margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px dashed #eee;">
            <h3 style="margin: 0 0 8px 0; color: #444; font-size: 16px;">${log.date} (排便 ${log.poops.length} 次)</h3>
            <div style="font-size: 14px; line-height: 1.6; margin-bottom: 10px; background:#f9f9f9; padding:8px; border-radius:4px;">
                <strong><span style="color:#005A9E;">整体状态：</span></strong> 心情: ${log.mood}, 运动: ${log.exercise}<br>
                ${log.meals ? `<strong><span style="color:#2e8b57;">饮食：</span></strong> ${log.meals}<br>` : ''}
                ${log.sleep ? `<strong><span style="color:#8a2be2;">睡眠：</span></strong> ${log.sleep}` : ''}
            </div>
            ${log.poops.map(p => `
                <div style="margin-left: 10px; font-size: 13px; line-height: 1.5; padding: 4px 0;">
                    <span style="color:#888;">[${p.time}]</span> Bristol ${p.bristol}型 - ${p.color}, 顺畅度: ${p.smoothness}, 粘稠度: ${p.viscosity}, 评分: ${p.score}
                </div>
            `).join('')}
        </div>`;
    });
    container.innerHTML = htmlContent;

    html2pdf().set({
        margin: 10, filename: `poop_tracker_export_${new Date().toISOString().slice(0, 10)}.pdf`,
        image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(container).save().finally(() => {
        exportDataBtn.innerHTML = originalText;
        exportDataBtn.disabled = false;
    });
});

generateReportBtn.addEventListener('click', async () => {
    if (!apiKey) {
        alert("请先填写 Gemini / Moonshot API Key！");
        settingsBtn.click();
        return;
    }
    if (logs.length === 0) return alert("尚无数据可分析！");

    const recentLogs = logs.slice(0, 30).map(l => ({
        date: l.date,
        lifestyle: `饮食-${l.meals}, 心情-${l.mood}, 运动-${l.exercise}, 睡眠-${l.sleep}`,
        poops: l.poops.map(p => `【${p.time}】Bristol ${p.bristol}型, ${p.color}, 顺畅度-${p.smoothness}, 粘稠度-${p.viscosity}, 评分${p.score}`).join(' | ')
    }));

    const promptText = `以下是用户最近的排便和生活习惯记录：\n${JSON.stringify(recentLogs, null, 2)}\n
请提供一份中文的【肠道健康近期分析报告】。要求：
1. **高度总结**：100字以内。
2. **高危信号提醒**：如有血便、黑便、长期严重便秘，必须极显眼使用<span style="color:red; font-weight:bold;">高危信号内容</span>标注。
3. **健康评估与建议**：给出3-5点针对性改善建议。直接输出内容，不要包含前置语。`;

    const btnText = generateReportBtn.querySelector('.btn-text');
    const spinner = generateReportBtn.querySelector('.spinner');
    btnText.style.display = 'none'; spinner.classList.remove('hidden');
    generateReportBtn.disabled = true; reportContainer.classList.add('hidden');

    try {
        const response = await fetch('https://api.moonshot.cn/v1/chat/completions', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({ model: "moonshot-v1-8k", messages: [{ role: "system", content: "你是一位专业的肠胃健康和营养学AI助手。" }, { role: "user", content: promptText }], temperature: 0.7 })
        });
        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        document.getElementById('reportDate').innerText = (new Date()).toLocaleDateString();
        reportContent.innerHTML = marked.parse(data.choices[0].message.content);
        reportContainer.classList.remove('hidden');
    } catch (err) {
        alert("生成报告失败: " + err.message);
    } finally {
        btnText.style.display = 'inline-block'; spinner.classList.add('hidden');
        generateReportBtn.disabled = false;
    }
});
