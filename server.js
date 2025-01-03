let userId = null; // 사용자 고유 ID
let nickname = null; // 사용자 닉네임
let rankingStarted = false; // 랭킹 시작 여부
let clickDisabled = false; // "Click Me!" 버튼 비활성화 상태
const ws = new WebSocket('ws://' + window.location.host); // WebSocket 연결

document.addEventListener('DOMContentLoaded', () => {
    const actionButton = document.getElementById('action-button');
    if (actionButton) {
        actionButton.addEventListener('click', () => {
            if (!rankingStarted) {
                // 랭킹이 시작되지 않은 경우 3초간 버튼 비활성화
                disableClickButton();
                return;
            }
            console.log('"Click Me!" button clicked');
            handleButtonClick();
        });
    }

    const startRankingButton = document.getElementById('start-ranking-button');
    if (startRankingButton) {
        startRankingButton.addEventListener('click', () => {
            console.log('"Start Ranking" button clicked');
            rankingStarted = true; // 랭킹 시작 상태 설정
            document.getElementById('admin-status-message').innerText = 'Ranking has started!';
            alert('Ranking has started!');
        });
    }
});

// "Click Me!" 버튼 비활성화 함수
function disableClickButton() {
    const actionButton = document.getElementById('action-button');
    if (clickDisabled) return; // 이미 비활성화된 경우 처리하지 않음

    clickDisabled = true; // 버튼 비활성화 상태 설정
    actionButton.disabled = true; // 버튼 비활성화
    actionButton.style.opacity = '0.5'; // 시각적 효과 추가

    // 3초 후 버튼 활성화
    setTimeout(() => {
        clickDisabled = false; // 비활성화 상태 해제
        actionButton.disabled = false; // 버튼 활성화
        actionButton.style.opacity = '1'; // 시각적 효과 복구
    }, 3000);

    alert('You cannot click the button until ranking starts!');
}

// 닉네임 설정 함수
function setNickname() {
    const nicknameInput = document.getElementById('nickname').value.trim();
    const messageDiv = document.getElementById('message');

    if (nicknameInput) {
        fetch('/set-nickname', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nickname: nicknameInput }),
        })
            .then((response) => response.json())
            .then((data) => {
                if (data.success) {
                    userId = data.userId;
                    nickname = data.nickname;

                    document.getElementById('nickname-container').classList.add('hidden');
                    document.getElementById('button-container').classList.remove('hidden');
                    document.getElementById('welcome-message').innerText = `Welcome, ${data.nickname}!`;
                } else {
                    messageDiv.innerText = `Error: ${data.error}`;
                }
            })
            .catch(() => {
                messageDiv.innerText = 'Failed to set nickname. Try again!';
            });
    } else {
        messageDiv.innerText = 'Please enter a valid nickname.';
    }
}

// "Click Me!" 버튼 클릭 이벤트 처리
function handleButtonClick() {
    if (!nickname || !userId) {
        alert('Please set your nickname first!');
        return;
    }

    if (ws.readyState !== WebSocket.OPEN) {
        alert('WebSocket is not connected. Please refresh the page.');
        return;
    }

    ws.send(JSON.stringify({ userId, nickname }));
    console.log('Button clicked and data sent:', { userId, nickname });
}

// WebSocket 메시지 처리
ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        if (data.type === 'ranking-update') {
            const rankingList = document.getElementById('ranking-list');
            rankingList.innerHTML = ''; // 기존 순위 목록 초기화

            data.data.forEach((entry, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}위: ${entry.nickname}`;
                rankingList.appendChild(li);
            });
        } else if (data.type === 'ranking-reset') {
            const rankingList = document.getElementById('ranking-list');
            rankingList.innerHTML = ''; // 순위 초기화
            alert('The ranking has been reset!');
        } else {
            console.warn('Unknown WebSocket message type:', data.type);
        }
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
    }
};