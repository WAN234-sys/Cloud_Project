/** SCE v0.2.11 - MINIBOX & RECOVERY **/
let mbClicks = 0;
let mbTimer;

function handleMiniboxClick() {
    mbClicks++;
    clearTimeout(mbTimer);
    mbTimer = setTimeout(() => mbClicks = 0, 800);

    if (mbClicks === 3) {
        const ui = document.getElementById('minibox-ui');
        const isHidden = ui.style.display === 'none' || ui.style.display === '';
        
        ui.style.display = isHidden ? 'block' : 'none';
        if (isHidden) {
            renderMiniboxContent();
            document.getElementById('notif-dot').style.display = 'none';
        }
        mbClicks = 0;
    }
}

async function renderMiniboxContent() {
    const container = document.getElementById('minibox-content');
    if (currentUser.isAdmin) {
        container.innerHTML = `<h4 style="color:var(--gold); font-size:11px;">INCOMING TICKETS</h4><div id="ticket-list">Syncing...</div>`;
        const res = await fetch('/api/admin/tickets');
        const tickets = await res.json();
        const list = document.getElementById('ticket-list');
        list.innerHTML = tickets.length ? '' : '<p style="font-size:10px; color:#555;">No pending requests.</p>';
        tickets.forEach(t => {
            list.innerHTML += `<div class="ticket-item" style="border-bottom:1px solid #222; padding:5px 0;">
                <strong style="color:var(--gold); font-size:10px;">${t.username}</strong><br>
                <span style="font-size:10px;">REQ: ${t.filename}</span>
            </div>`;
        });
    } else {
        container.innerHTML = `
            <h4 style="font-size:11px;">RECOVERY TICKET</h4>
            <input type="text" id="req_file" placeholder="filename.c" style="width:100%; background:#000; border:1px solid #333; color:white; margin:10px 0; padding:5px; font-size:11px;">
            <button onclick="submitRecovery()" class="btn-transmit" style="width:100%; font-size:10px;">SEND TO ADMIN</button>`;
    }
}

function startRecoveryPolling() {
    recoveryCheckInterval = setInterval(async () => {
        const res = await fetch('/api/user/check-recovery');
        const data = await res.json();
        if (data.ready && !data.claimed) {
            document.getElementById('notif-dot').style.display = 'block';
            document.getElementById('key-display').innerText = data.key;
            document.getElementById('claim-popup').style.display = 'flex';
            clearInterval(recoveryCheckInterval);
        }
    }, 10000);
}

async function submitRecovery() {
    const filename = document.getElementById('req_file').value;
    if(!filename) return alert("Please specify the missing file name.");
    await fetch('/api/admin/mail/send', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username: currentUser.username, filename })
    });
    alert("Ticket Transmitted. Monitor your Minibox for the claim key.");
    document.getElementById('minibox-ui').style.display = 'none';
}