// 전역 변수 정의
let userId = null; // 사용자 고유 ID
let nickname = null; // 사용자 닉네임
let clickDisabled = false; // "Click Me!" 버튼 비활성화 상태
let isAdminLoggedIn = false; // 관리자 로그인 상태
let currentRank = null; // 현재 표시된 순위를 저장

const ws = new WebSocket('ws://' + window.location.host); // WebSocket 연결

// WebSocket 이벤트 처리
ws.onopen = () => console.log('WebSocket connected');
ws.onerror = (error) => console.error('WebSocket error:', error);
ws.onclose = () => console.log('WebSocket closed');
ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        showTemporaryMessage('서버에서 받은 메시지를 처리할 수 없습니다.', 'error');
    }
};

// WebSocket 메시지 처리
function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'ranking-update':
            updateRankingUI(data.data);
            break;
        case 'ranking-reset':
            resetRankingUI();
            break;
        case 'error':
            showTemporaryMessage(data.message, 'error');
            break;
        case 'connection':
            showTemporaryMessage(data.message, 'info');
            break;
        default:
            console.warn('Unknown message type:', data.type);
    }
}

// 랭킹 초기화 (서버와 통신)
function resetRanking() {
    fetch('/reset-ranking', { method: 'POST' })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) resetRankingUI();
            else showTemporaryMessage('랭킹 초기화에 실패했습니다.', 'error');
        })
        .catch((error) => {
            console.error('Error during ranking reset:', error);
            showTemporaryMessage('랭킹 초기화 중 오류가 발생했습니다.', 'error');
        });
}

// 랭킹 시작 (서버와 통신)
function startRanking() {
    fetch('/start-ranking', { method: 'POST' })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                showTemporaryMessage('랭킹이 시작되었습니다!', 'success');
            } else {
                showTemporaryMessage('랭킹 시작에 실패했습니다.', 'error');
            }
        })
        .catch((error) => {
            console.error('Error during ranking start:', error);
            showTemporaryMessage('랭킹 시작 중 오류가 발생했습니다.', 'error');
        });
}


function handleClickMe() {
    if (!isWebSocketConnected()) {
        showTemporaryMessage('WebSocket is not connected. Please refresh the page.', 'error');
        return;
    }

    if (!userId || !nickname) {
        showTemporaryMessage('닉네임을 먼저 설정해주세요.', 'error');
        return;
    }

    const message = { userId, nickname };
    console.log('Sending WebSocket message:', message);
    ws.send(JSON.stringify(message));

    disableClickButton();
}

ws.onmessage = (event) => {
    console.log('Received message from server:', event.data); // 서버에서 받은 메시지 로그 출력
    try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
        showTemporaryMessage('서버에서 받은 메시지를 처리할 수 없습니다.', 'error');
    }
};


// DOMContentLoaded: 이벤트 리스너 등록 및 UI 초기화
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    initializeUI();
});

// UI 초기화
function initializeUI() {
    const liveRanking = document.getElementById('live-ranking');
    if (liveRanking) liveRanking.style.display = 'none';
}

// 이벤트 리스너 설정
function setupEventListeners() {
    document.querySelector('#nickname-container button')?.addEventListener('click', setNickname);
    document.getElementById('action-button')?.addEventListener('click', handleClickMe);
    document.getElementById('admin-button')?.addEventListener('click', showAdminLogin);
    document.getElementById('admin-login-button')?.addEventListener('click', loginAdmin);
    document.getElementById('reset-ranking-button')?.addEventListener('click', resetRanking);
    document.getElementById('start-ranking-button')?.addEventListener('click', startRanking);
    document.getElementById('close-admin-panel')?.addEventListener('click', closeAdminPanel);

     // 닫기 버튼 이벤트 리스너
    const closeButton = document.getElementById('close-admin-panel');
    if (closeButton) {
        closeButton.addEventListener('click', closeAdminPanel);
    } else {
        console.warn('Close button (#close-admin-panel) not found!');
    }


    document.addEventListener('keydown', (event) => {
        if (isAdminLoggedIn) {
            if (event.key === 'u') resetRanking();
            if (event.key === 'y') startRanking();
        }
    });
}

// 닉네임 설정
function setNickname() {
    const nicknameInput = document.getElementById('nickname').value.trim();
    if (!nicknameInput) {
        showTemporaryMessage('닉네임을 입력해주세요!', 'error');
        return;
    }

    fetch('/set-nickname', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname: nicknameInput }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                userId = data.userId; // 서버에서 제공한 사용자 ID
                nickname = data.nickname; // 입력된 닉네임

                // 닉네임 입력 필드 숨기기
                document.getElementById('nickname').style.display = 'none';
                document.getElementById('nickname-confirm-button').style.display = 'none';

                // h1 태그에 닉네임 표시
                const welcomeMessage = document.querySelector('#nickname-container h1');
                welcomeMessage.textContent = `환영합니다, ${nickname}님!`;

                // 다음 화면 표시
                document.getElementById('button-container').classList.remove('hidden');

                console.log('Nickname set successfully:', nickname);
            } else {
                showTemporaryMessage(`오류 발생: ${data.error}`, 'error');
            }
        })
        .catch((error) => {
            console.error('Error during nickname setup:', error);
            showTemporaryMessage('서버와 연결할 수 없습니다. 다시 시도해주세요.', 'error');
        });
}

// "Click Me!" 버튼 클릭 처리
function handleClickMe() {
    if (!isWebSocketConnected()) {
        showTemporaryMessage('WebSocket is not connected. Please refresh the page.', 'error');
        return;
    }

    if (!userId || !nickname) {
        showTemporaryMessage('닉네임을 먼저 설정해주세요.', 'error');
        return;
    }

    const message = { userId, nickname };
    console.log('Sending WebSocket message:', message);
    ws.send(JSON.stringify(message));

    disableClickButton();
}

// 버튼 비활성화 처리
function disableClickButton() {
    const actionButton = document.getElementById('action-button');
    if (!actionButton || clickDisabled) return;

    clickDisabled = true;
    actionButton.disabled = true;
    actionButton.style.opacity = '0.5';

    setTimeout(() => {
        clickDisabled = false;
        actionButton.disabled = false;
        actionButton.style.opacity = '1';
    }, 2000);
}

// 관리자 로그인
function showAdminLogin() {
    document.getElementById('admin-login')?.classList.remove('hidden');
}

function loginAdmin() {
    const password = document.getElementById('admin-password').value.trim();

    fetch('/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                document.getElementById('admin-login').classList.add('hidden');
                document.getElementById('admin-panel').classList.remove('hidden');
                isAdminLoggedIn = true;
                showTemporaryMessage('관리자 로그인이 완료되었습니다!', 'success');
            } else {
                showTemporaryMessage('비밀번호를 다시 입력해주세요.', 'error');
            }
        })
        .catch((error) => {
            console.error('Error during admin login:', error);
            showTemporaryMessage('로그인 중 오류가 발생했습니다.', 'error');
        });
}

// 관리자 패널 닫기
function updateRankingUI(rankingData) {
    console.log('Updating ranking UI with data:', rankingData);

    const liveRanking = document.getElementById('live-ranking');
    const liveRankingList = document.getElementById('live-ranking-list');

    if (!liveRanking || !liveRankingList) {
        console.warn('live-ranking 또는 live-ranking-list 요소를 찾을 수 없습니다.');
        return;
    }

    if (rankingData.length === 0) {
        liveRanking.style.display = 'block';
        liveRankingList.innerHTML = '<li>현재 표시할 순위가 없습니다.</li>';
        return;
    }

    liveRanking.style.display = 'block';
    liveRankingList.innerHTML = '';

    rankingData.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.rank}위: ${entry.nickname}`;
        liveRankingList.appendChild(li);
    });

    // 현재 사용자의 순위를 화면에 표시
    const currentUser = rankingData.find((entry) => entry.nickname === nickname);
    if (currentUser) {
        showRankMessage(currentUser.rank);
    } else {
        showTemporaryMessage('현재 순위 정보가 없습니다.', 'error');
    }


    // 관리자가 아닌 경우 순위 숨김
    if (!isAdminLoggedIn) {
        liveRanking.style.display = 'none';
        console.log('Only admin can view the ranking.');
        return;
    }

    if (rankingData.length === 0) {
        liveRanking.style.display = 'block';
        liveRankingList.innerHTML = '<li>현재 표시할 순위가 없습니다.</li>'; // 빈 데이터 메시지
        return;
    }

    liveRanking.style.display = 'block';
    liveRankingList.innerHTML = ''; // 기존 목록 초기화

    rankingData.forEach((entry) => {
        const li = document.createElement('li');
        li.textContent = `${entry.rank}위: ${entry.nickname}`; // 클릭 수 제거
        liveRankingList.appendChild(li);
    });
}

// 관리자 패널 닫기
function closeAdminPanel() {
    const adminPanel = document.getElementById('admin-panel');
    const liveRanking = document.getElementById('live-ranking');

    if (adminPanel) adminPanel.classList.add('hidden'); // 관리자 패널 숨김
    isAdminLoggedIn = false; // 관리자 로그인 상태 해제

    if (liveRanking) liveRanking.style.display = 'none'; // 순위 숨김
    console.log('Admin panel closed, and ranking is hidden.');
}

function showRankMessage(rank) {
    const existingMessage = document.getElementById('rank-message');
    if (existingMessage) existingMessage.remove(); // 기존 메시지 제거

    const messageDiv = document.createElement('div');
    messageDiv.id = 'rank-message';
    messageDiv.style.position = 'fixed';
    messageDiv.style.top = '50%';
    messageDiv.style.left = '50%';
    messageDiv.style.transform = 'translate(-50%, -50%)';
    messageDiv.style.zIndex = '1000';
    messageDiv.style.color = '#fff';
    messageDiv.style.backgroundColor = rank === 1 ? '#be1300' : '#333';
    messageDiv.style.fontSize = '6rem';
    messageDiv.style.fontWeight = 'bold';
    messageDiv.style.textAlign = 'center';
    messageDiv.style.padding = '30px';
    messageDiv.style.borderRadius = '20px';
    messageDiv.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.5)';

    messageDiv.innerText = rank === 1 ? '축하합니다! 1등입니다!' : `현재 순위: ${rank}위`;
    document.body.appendChild(messageDiv);



    // 3초 후 메시지 자동 제거
    setTimeout(() => {
        if (messageDiv) messageDiv.remove();
    }, 3000);
}

// 순위 메시지 표시
function showRankMessage(rank) {
    
    if (currentRank === rank) return;

    hideRankMessage();

    currentRank = rank;
    const messageDiv = document.createElement('div');
    messageDiv.id = 'rank-message';
    messageDiv.textContent = rank === 1 ? '1등!' : `${rank}위`;
    messageDiv.style.cssText = `
        position: fixed;
        top: 50%; left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        color: white;
        background-color: ${rank === 1 ? '#be1300' : '#333'};
        font-size: 5rem;
        font-weight: bold;
        text-align: center;
        padding: 20px;
        border-radius: 10px;
    `;

    document.body.appendChild(messageDiv);
    if (rank === 1) launchConfetti();
}

// 순위 메시지 숨기기
function hideRankMessage() {
    const rankMessage = document.getElementById('rank-message');
    if (rankMessage) rankMessage.remove();
    currentRank = null;
}

// WebSocket 연결 상태 확인
function isWebSocketConnected() {
    return ws.readyState === WebSocket.OPEN;
}

// 임시 메시지 표시
function showTemporaryMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (messageContainer) {
        messageContainer.textContent = message;
        messageContainer.className = `message ${type}`;
        setTimeout(() => {
            messageContainer.textContent = '';
            messageContainer.className = 'message';
        }, 2000);
    }
}

// 컨페티 효과
function launchConfetti() {
    let confettiContainer = document.getElementById('confetti-container');

    // 컨테이너가 없으면 생성
    if (!confettiContainer) {
        confettiContainer = document.createElement('div');
        confettiContainer.id = 'confetti-container';
        document.body.appendChild(confettiContainer);
    }

    // 컨페티 생성
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';

        // 컨페티 속성 설정
        confetti.style.setProperty('--confetti-color', getRandomColor());
        confetti.style.setProperty('--fall-duration', `${Math.random() * 2 + 3}s`); // 3~5초
        confetti.style.setProperty('--drift-duration', `${Math.random() * 2 + 2}s`); // 2~4초
        confetti.style.left = `${Math.random() * 100}vw`; // 랜덤 수평 위치
        confetti.style.top = `${Math.random() * -10}vh`; // 화면 위에서 시작

        confettiContainer.appendChild(confetti);
    }

    // 5초 후 컨페티 제거
    setTimeout(() => {
        confettiContainer.innerHTML = ''; // 컨테이너 내부 요소 제거
    }, 6000);
}

function getRandomColor() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[Math.floor(Math.random() * colors.length)];
}

// 순위 초기화
function resetRankingUI() {
    const liveRankingList = document.getElementById('live-ranking-list');
    if (liveRankingList) liveRankingList.innerHTML = '';
    hideRankMessage();
    showTemporaryMessage('랭킹이 초기화되었습니다!', 'success');
}

