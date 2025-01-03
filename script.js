let userId = null; // 사용자 고유 ID
let nickname = null; // 사용자 닉네임
let clickDisabled = false; // "Click Me!" 버튼 비활성화 상태
const ws = new WebSocket('ws://' + window.location.host); // WebSocket 연결
let currentRank = null; // 현재 표시된 순위를 저장



document.getElementById("close-admin-panel").addEventListener("click", function () {
    document.getElementById("admin-panel").classList.add("hidden");
    toggleActionButton(true); // "Click Me!" 버튼 표시
});

document.getElementById("close-admin-login").addEventListener("click", function () {
    document.getElementById("admin-login").classList.add("hidden");
    toggleActionButton(true); // "Click Me!" 버튼 표시
});

document.addEventListener('DOMContentLoaded', () => {
    // 닉네임 버튼 이벤트 연결
    const nicknameButton = document.querySelector('#nickname-container button');
    if (nicknameButton) {
        nicknameButton.addEventListener('click', setNickname);
    }

    // "Click Me!" 버튼 이벤트 연결
    const actionButton = document.getElementById('action-button');
    if (actionButton) {
        actionButton.addEventListener('click', () => {
            if (!nickname || !userId) {
                showTemporaryMessage('이름을 먼저 입력해주세요.', 'error');
                return;
            }

            if (!clickDisabled) {
                handleButtonClick();
            } else {
                showTemporaryMessage('잠시만 기다리세요!', 'error');
            }
        });
    }

    // Admin 버튼 이벤트 연결
    const adminButton = document.getElementById('admin-button');
    if (adminButton) {
        adminButton.addEventListener('click', showAdminLogin);
    }

    // Admin 로그인 버튼 이벤트 연결
    const adminLoginButton = document.getElementById('admin-login-button');
    if (adminLoginButton) {
        adminLoginButton.addEventListener('click', loginAdmin);
    }

    // Reset Ranking 버튼 이벤트 연결
    const resetRankingButton = document.getElementById('reset-ranking-button');
    if (resetRankingButton) {
        resetRankingButton.addEventListener('click', resetRanking);
    }

    // Start Ranking 버튼 이벤트 연결
    const startRankingButton = document.getElementById('start-ranking-button');
    if (startRankingButton) {
        startRankingButton.addEventListener('click', startRanking);
    }
    
    // 키보드 이벤트 연결
    document.addEventListener('keydown', (event) => {
        if (isAdminLoggedIn && event.key === 'u') {
            resetRanking();
        }
    });

     // 키보드 이벤트 연결
     document.addEventListener('keydown', (event) => {
        if (isAdminLoggedIn && event.key === 'y') {
            startRanking();
        }
    });
});

// "Click Me!" 버튼 숨김/표시 함수
function toggleActionButton(shouldShow) {
    const actionButton = document.getElementById('action-button');
    if (actionButton) {
        actionButton.style.display = shouldShow ? 'block' : 'none';
    }
}

function showRankMessage(rank) {
    // 이미 표시된 순위와 같으면 처리하지 않음
    if (currentRank === rank) {
        return;
    }

    // 현재 순위를 업데이트
    currentRank = rank;

    const existingMessage = document.getElementById('rank-message');
    if (existingMessage) {
        existingMessage.remove(); // 이전 메시지 제거
    }

    // 순위 메시지 생성
    const messageDiv = document.createElement('div');
    messageDiv.id = 'rank-message';

    if (rank === 1) {
        messageDiv.innerText = '1등!';
        messageDiv.style.backgroundColor = '#be1300'; // 빨간색 배경
        launchConfetti(); // 컨페티 효과 실행
    } else {
        messageDiv.innerText = `${rank}위`;
        messageDiv.style.backgroundColor = '#000000'; // 검정색 배경
    }

    document.body.appendChild(messageDiv);
}

function hideRankMessage() {
    const rankMessage = document.getElementById('rank-message');
    if (rankMessage) {
        rankMessage.remove(); // 메시지 제거
    }
    currentRank = null; // 순위 상태 초기화
}


ws.onmessage = (event) => {
    try {
        const data = JSON.parse(event.data);

        if (data.type === 'ranking-update') {
            const liveRankingList = document.getElementById('live-ranking-list');
            liveRankingList.innerHTML = ''; // 기존 순위 목록 초기화

            let userRank = -1; // 사용자 순위를 초기화

            data.data.forEach((entry, index) => {
                const li = document.createElement('li');
                li.textContent = `${index + 1}위: ${entry.nickname}`;
                liveRankingList.appendChild(li);

                // 사용자 순위 확인
                if (entry.nickname === nickname) {
                    userRank = index + 1; // 순위는 1부터 시작
                }
            });

            // 순위에 따라 메시지 표시
            if (userRank > 0) {
                showRankMessage(userRank);
            } else {
                hideRankMessage();
            }
        } else if (data.type === 'ranking-reset') {
            const liveRankingList = document.getElementById('live-ranking-list');
            liveRankingList.innerHTML = ''; // 순위 초기화
            showTemporaryMessage('초기화 됐어요!', 'success');

            // 초기화 시 순위 메시지 제거
            hideRankMessage();

            // 초기 순위 가져오기
            fetchCurrentRank();
        } else {
            console.warn('Unknown WebSocket message type:', data.type);
        }
    } catch (error) {
        console.error('Error parsing WebSocket message:', error);
    }
};

function hideFirstPlaceMessage() {
    const firstPlaceMessage = document.getElementById('first-place-message');
    if (firstPlaceMessage) {
        firstPlaceMessage.remove(); // 메시지 제거
    }
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
                    document.getElementById('welcome-message').innerText = `${data.nickname}`;
                } else {
                    messageDiv.innerText = `Error: ${data.error}`;
                }
            })
            .catch(() => {
                messageDiv.innerText = '이름을 다시 입력하세요!';
            });
    } else {
        messageDiv.innerText = '이름을 다시 입력하세요!';
    }
}

// "Click Me!" 버튼 클릭 이벤트 처리
function handleButtonClick() {
    if (ws.readyState !== WebSocket.OPEN) {
        showTemporaryMessage('WebSocket is not connected. Please refresh the page.', 'error');
        return;
    }

    ws.send(JSON.stringify({ userId, nickname }));
    console.log('Button clicked and data sent:', { userId, nickname });

    // 버튼 비활성화 처리
    disableClickButton();
}

// "Click Me!" 버튼 비활성화 함수
function disableClickButton() {
    const actionButton = document.getElementById('action-button');
    if (!actionButton) {
        console.error('"Click Me!" button not found in the DOM');
        return;
    }

    if (clickDisabled) return; // 이미 비활성화된 경우 처리하지 않음

    clickDisabled = true; // 버튼 비활성화 상태 설정
    actionButton.disabled = true; // 버튼 비활성화
    actionButton.style.opacity = '0.5'; // 시각적 효과 추가

    // 경고 메시지 표시
    showTemporaryMessage('You cannot click the button until ranking starts!', 'error');

    // 3초 후 버튼 활성화
    setTimeout(() => {
        clickDisabled = false; // 비활성화 상태 해제
        actionButton.disabled = false; // 버튼 활성화
        actionButton.style.opacity = '1'; // 시각적 효과 복구
    }, 2000);
}

function showAdminLogin() {
    const adminLogin = document.getElementById('admin-login');
    if (adminLogin) {
        adminLogin.classList.remove('hidden'); // 숨김 클래스 제거
        toggleActionButton(false); // "Click Me!" 버튼 숨김
    } else {
        console.error('Admin login element not found');
    }
}

// Admin 로그인 처리 함수
function loginAdmin() {
    const password = document.getElementById('admin-password').value.trim();
    const adminMessage = document.getElementById('admin-message');

    fetch('/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                document.getElementById('admin-login').classList.add('hidden'); // 로그인 창 숨김
                document.getElementById('admin-panel').classList.remove('hidden'); // Admin 패널 표시
                isAdminLoggedIn = true; // 어드민 로그인 상태 설정
            } else {
                adminMessage.innerText = '비밀번호를 다시 입력해주세요';
            }
        })
        .catch(() => {
            adminMessage.innerText = '로그인 실패';
        });
}

// Start Ranking 함수
function startRanking() {
    fetch('/start-ranking', { method: 'POST' })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                document.getElementById('admin-status-message').innerText = '시작 됐습니다.';
                showTemporaryMessage('시작!', 'success');
            } else {
                console.error('Failed to start ranking:', data.error);
                showTemporaryMessage('Failed to start ranking.', 'error');
            }
        })
        .catch(() => {
            document.getElementById('admin-status-message').innerText = '아직 시작하지 않았어요';
            showTemporaryMessage('Failed to start ranking. Please try again.', 'error');
        });
}

function resetRanking() {
    fetch('/reset-ranking', { method: 'POST' })
        .then((response) => response.json())
        .then((data) => {
            if (data.success) {
                // 순위 리스트 초기화
                const liveRankingList = document.getElementById('live-ranking-list');
                liveRankingList.innerHTML = '';

                // 상태 초기화
                currentRank = null; // 현재 순위 초기화
                clickDisabled = false; // 버튼 상태 초기화

                // 메시지 제거
                hideRankMessage();

                // 클릭미 버튼 활성화
                const actionButton = document.getElementById('action-button');
                if (actionButton) {
                    actionButton.disabled = false; // 버튼 활성화
                    actionButton.style.opacity = '1'; // 시각적 효과 복구
                }

                // 초기 데이터 요청
                fetchCurrentRank();

                // 상태 메시지 업데이트
                document.getElementById('admin-status-message').innerText = '초기화 완료!';
                showTemporaryMessage('초기화 됐어요!', 'success');
            } else {
                console.error('Failed to reset ranking:', data.error);
                document.getElementById('admin-status-message').innerText = '초기화 실패!';
            }
        })
        .catch((error) => {
            console.error('Error resetting ranking:', error);
            document.getElementById('admin-status-message').innerText = '초기화 실패!';
        });
}

function fetchCurrentRank() {
    fetch('/current-ranking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
    })
        .then((response) => response.json())
        .then((data) => {
            if (data.success && data.rank > 0) {
                showRankMessage(data.rank); // 현재 순위를 화면에 표시
            } else {
                showTemporaryMessage('순위에 포함되지 않았습니다.', 'error');
            }
        })
        .catch((error) => {
            console.error('Error fetching rank:', error);
            showTemporaryMessage('초기화 됐습니다.', 'error');
        });
}


// 경고 메시지 표시 함수
function showTemporaryMessage(message, type) {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
        console.error('Message container not found in the DOM');
        return;
    }

    messageContainer.innerText = message;
    messageContainer.className = `message ${type}`; // 메시지 유형에 따라 클래스 설정

    // 3초 후 메시지 제거
    setTimeout(() => {
        messageContainer.innerText = '';
        messageContainer.className = 'message';
    }, 2000);
}



// 컨페티

function launchConfetti() {
    const confettiContainer = document.createElement('div');
    confettiContainer.id = 'confetti-container';
    document.body.appendChild(confettiContainer);

    // 컨페티 100개 생성
    for (let i = 0; i < 100; i++) {
        const confetti = document.createElement('div');
        confetti.className = 'confetti';
        confetti.style.left = Math.random() * 100 + 'vw'; // 화면 가로 랜덤 위치
        confetti.style.animationDelay = Math.random() * 3 + 's'; // 랜덤 딜레이
        confetti.style.backgroundColor = getRandomColor(); // 랜덤 색상
        confettiContainer.appendChild(confetti);
    }

    // 5초 후 컨페티 제거
    setTimeout(() => {
        confettiContainer.remove();
    }, 5000);
}

function getRandomColor() {
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    return colors[Math.floor(Math.random() * colors.length)];
}